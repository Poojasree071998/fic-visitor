const express = require('express');
const router = express.Router();
const Company = require('../models/Company');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// GET current company details
router.get('/me', async (req, res) => {
  try {
    if (req.companyId === 'SYSTEM') {
      return res.json({
        _id: 'SYSTEM',
        companyName: 'System Administration',
        subscription: 'Enterprise',
        status: 'Active',
        subscriptionExpiresAt: new Date(2099, 11, 31)
      });
    }

    const company = await Company.findOne({ code: req.companyId });
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    res.json({
      _id: company._id,
      companyId: company.code,
      companyName: company.name,
      subscription: company.subscription,
      status: company.status,
      expiryDate: company.subscriptionExpiresAt,
      createdAt: company.createdAt
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST request an upgrade from the SaaS Super Admin
router.post('/request-upgrade', async (req, res) => {
  try {
    const Company = require('../models/Company');
    const Notification = require('../models/Notification');
    const company = await Company.findOne({ code: req.companyId });
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Send a notification to the SaaS Super Admin (SYSTEM)
    const newNotif = await Notification.create({
      companyId: 'SYSTEM',
      type: 'Tenant',
      title: '📈 Subscription Upgrade Requested',
      message: `${company.name} (${company.code}) has requested a subscription upgrade. Their current plan is ${company.subscription}.`,
      createdBy: req.userRole || 'System'
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('new_notification', newNotif);
    }

    res.json({ success: true, message: 'Upgrade request sent successfully to the SaaS Administrator.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET company usage stats
router.get('/usage', async (req, res) => {
  try {
    const Company = require('../models/Company');
    const User = require('../models/User');
    const Visitor = require('../models/Visitor');
    const BranchSetting = require('../models/BranchSetting');
    const planLimits = require('../config/plans');

    if (req.companyId === 'SYSTEM') {
      return res.json({
        plan: 'Enterprise',
        limits: planLimits['Enterprise'],
        current: { visitors: 0, securityUsers: 0, branches: 0 }
      });
    }

    const company = await Company.findOne({ code: req.companyId });
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    const limits = planLimits[company.subscription] || planLimits['Basic'];

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const visitorCount = await Visitor.countDocuments({
      companyId: req.companyId,
      createdAt: { $gte: startOfMonth }
    });
    
    const securityCount = await User.countDocuments({ companyId: req.companyId, role: 'Security' });
    const branchCount = await BranchSetting.countDocuments({ companyId: req.companyId });

    res.json({
      plan: company.subscription,
      limits,
      current: {
        visitors: visitorCount,
        securityUsers: securityCount,
        branches: branchCount
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
