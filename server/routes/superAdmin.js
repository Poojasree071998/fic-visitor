const express = require('express');
const router = express.Router();
const Company = require('../models/Company');
const User = require('../models/User');
const Visitor = require('../models/Visitor');
const authMiddleware = require('../middleware/authMiddleware');
const logAction = require('../utils/auditLogger');

// Require SaaS Super Admin role for all super-admin endpoints
router.use(authMiddleware);
router.use((req, res, next) => {
  if (req.userRole !== 'SaaS Super Admin') {
    return res.status(403).json({ message: 'Forbidden: SaaS Super Admin access required' });
  }
  next();
});

// GET all companies (with counts)
router.get('/companies', async (req, res) => {
  try {
    const companies = await Company.find().sort({ createdAt: -1 });
    const BranchSetting = require('../models/BranchSetting');
    const planLimits = require('../config/plans');
    
    const enriched = [];
    for (const comp of companies) {
      const userCount = await User.countDocuments({ companyId: comp.code });
      const securityCount = await User.countDocuments({ companyId: comp.code, role: 'Security' });
      const visitorCount = await Visitor.countDocuments({ companyId: comp.code });
      const branchCount = await BranchSetting.countDocuments({ companyId: comp.code });
      const limits = planLimits[comp.subscription] || planLimits['Basic'];

      enriched.push({
        ...comp.toJSON(),
        _id: comp._id.toString(),  // Explicitly include _id for frontend operations
        userCount,
        securityCount,
        visitorCount,
        branchCount,
        limits
      });
    }
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH update company details
router.patch('/companies/:id', async (req, res) => {
  try {
    const { subscription, status, subscriptionExpiresAt, durationDays } = req.body;
    const comp = await Company.findById(req.params.id);
    if (!comp) return res.status(404).json({ message: 'Company not found' });

    let statusChanged = false;
    let subscriptionChanged = false;
    let oldPlan = comp.subscription;
    let newExpiry = subscriptionExpiresAt ? new Date(subscriptionExpiresAt) : comp.subscriptionExpiresAt;

    if (subscription !== undefined && comp.subscription !== subscription) {
      comp.subscription = subscription;
      subscriptionChanged = true;
    }
    
    if (durationDays) {
      newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + parseInt(durationDays, 10));
      comp.subscriptionExpiresAt = newExpiry;
      subscriptionChanged = true;
      
      // If we are extending, ensure status becomes active
      if (comp.status === 'Expired') {
        comp.status = 'Active';
        statusChanged = true;
      }
    } else if (subscriptionExpiresAt !== undefined) {
      comp.subscriptionExpiresAt = newExpiry;
    }

    if (status !== undefined && comp.status !== status) {
      comp.status = status;
      statusChanged = true;
    }

    if (subscriptionChanged) {
      comp.upgradeHistory.push({
        plan: comp.subscription,
        startDate: new Date(),
        endDate: comp.subscriptionExpiresAt,
        updatedBy: req.userRole || 'SaaS Super Admin'
      });
      
      // Calculate amount based on config
      const planLimits = require('../config/plans');
      const planPrice = planLimits[comp.subscription]?.price || 0;
      let durationMultiplier = 1;
      if (durationDays) {
        if (parseInt(durationDays, 10) === 90) durationMultiplier = 3;
        else if (parseInt(durationDays, 10) === 365) durationMultiplier = 12;
      }
      
      const Payment = require('../models/Payment');
      await Payment.create({
        companyId: comp.code,
        companyName: comp.name,
        plan: comp.subscription,
        amount: planPrice * durationMultiplier,
        expiryDate: comp.subscriptionExpiresAt,
        durationDays: parseInt(durationDays || 30, 10),
        processedBy: req.userRole || 'SaaS Super Admin',
        status: 'Paid'
      });
    }

    await comp.save();

    // Trigger Notifications for SaaS Super Admin
    const Notification = require('../models/Notification');
    const io = req.app.get('io');
    
    if (statusChanged) {
      const typeStr = status === 'Active' ? 'Subscription Activated' : 'Subscription Deactivated';
      const icon = status === 'Active' ? '✅' : '❌';
      const newNotif = await Notification.create({
        companyId: 'SYSTEM',
        type: 'Subscription',
        title: `${icon} ${typeStr}`,
        message: `${comp.name} subscription has been ${status.toLowerCase()}.`,
        createdBy: req.userRole || 'System'
      });
      if (io) io.emit('new_notification', newNotif);
    } else if (subscriptionChanged) {
      const newNotif = await Notification.create({
        companyId: 'SYSTEM',
        type: 'Subscription',
        title: '💳 Subscription Updated',
        message: `${comp.name} updated to ${comp.subscription} plan. Payment recorded.`,
        createdBy: req.userRole || 'System'
      });
      if (io) io.emit('new_notification', newNotif);
      
      // Also notify the tenant
      const tenantNotif = await Notification.create({
        companyId: comp.code,
        type: 'Subscription',
        title: '💳 Subscription Renewed',
        message: `Your subscription has been successfully renewed to the ${comp.subscription} plan.`,
        createdBy: 'System'
      });
      if (io) io.emit('new_notification', tenantNotif);
      
      // Audit log
      await logAction(req, `Subscription Upgraded to ${comp.subscription}`, 'Subscription', {
        companyId: comp.code,
        companyName: comp.name
      });
    } else {
      const newNotif = await Notification.create({
        companyId: 'SYSTEM',
        type: 'Tenant',
        title: '🏢 Tenant Updated',
        message: `${comp.name} details have been updated.`,
        createdBy: req.userRole || 'System'
      });
      if (io) io.emit('new_notification', newNotif);
    }

    res.json(comp);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE company and all associated data (cascade delete)
router.delete('/companies/:id', async (req, res) => {
  try {
    const comp = await Company.findById(req.params.id);
    if (!comp) return res.status(404).json({ message: 'Company not found' });

    // Protect system-level companies from deletion
    if (comp.code === 'SYSTEM' || comp.code === 'FIC001') {
      return res.status(403).json({ message: `The '${comp.code}' company cannot be deleted as it is a system-protected tenant.` });
    }

    const Blacklist = require('../models/Blacklist');
    const Zone = require('../models/Zone');
    const Notification = require('../models/Notification');

    // Cascade-delete all data belonging to this tenant
    await Promise.all([
      User.deleteMany({ companyId: comp.code }),
      Visitor.deleteMany({ companyId: comp.code }),
      Blacklist.deleteMany({ companyId: comp.code }).catch(() => {}),
      Zone.deleteMany({ companyId: comp.code }).catch(() => {}),
      Notification.deleteMany({ companyId: comp.code }).catch(() => {}),
    ]);

    await Company.findByIdAndDelete(req.params.id);

    // Trigger Notification for Tenant Deleted
    const newNotification = await Notification.create({
      companyId: 'SYSTEM',
      type: 'Tenant',
      title: '🗑 Tenant Deleted',
      message: `${comp.name} has been deleted.`,
      createdBy: req.userRole || 'System'
    });
    const io = req.app.get('io');
    if (io) {
      io.emit('new_notification', newNotification);
    }
    
    // Audit Log for deletion
    await logAction(req, `Deleted Company: ${comp.name}`, 'Tenant Management', {
      companyId: 'SYSTEM',
      companyName: 'System Administration'
    });

    res.json({ message: `Company '${comp.name}' (${comp.code}) and all its data have been permanently deleted.` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET platform analytics
router.get('/analytics', async (req, res) => {
  try {
    const totalCompanies = await Company.countDocuments();
    const activeCompanies = await Company.countDocuments({ status: 'Active' });
    const inactiveCompanies = await Company.countDocuments({ status: { $ne: 'Active' } });

    // Platform-wide visitor count
    const totalVisitors = await Visitor.countDocuments();

    // Actual revenue from Payments in current month
    const Payment = require('../models/Payment');
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const paymentsThisMonth = await Payment.find({
      paymentDate: { $gte: startOfMonth },
      status: 'Paid'
    });
    const monthlyRevenue = paymentsThisMonth.reduce((sum, p) => sum + (p.amount || 0), 0);
    const annualRevenue = monthlyRevenue * 12; // projection

    res.json({
      totalCompanies,
      activeCompanies,
      inactiveCompanies,
      totalVisitors,
      monthlyRevenue,
      annualRevenue,
      tiers: {
        OneDayTrial: await Company.countDocuments({ subscription: 'One Day Trial' }),
        Basic: await Company.countDocuments({ subscription: 'Basic' }),
        Standard: await Company.countDocuments({ subscription: 'Standard' }),
        Enterprise: await Company.countDocuments({ subscription: 'Enterprise' })
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET all payments
router.get('/payments', async (req, res) => {
  try {
    const Payment = require('../models/Payment');
    const payments = await Payment.find().sort({ paymentDate: -1 });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
