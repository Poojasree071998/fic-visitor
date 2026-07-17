const express = require('express');
const router = express.Router();
const User = require('../models/User');
const logAction = require('../utils/auditLogger');
const { sendEmail, EmailTemplates } = require('../utils/emailService');

// POST login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user in MongoDB
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      // Special hardcoded bootstrap admin to prevent lockout if DB is wiped/missing users
      if (email === 'saas@fic.com' && password === 'saas123') {
        return res.json({ id: 'bootstrap-saas', name: 'SaaS Platform Owner', email: 'saas@fic.com', role: 'SaaS Super Admin', branch: 'All Branches', companyId: 'SYSTEM', companyName: 'System Administration' });
      }
      if (email === 'sandeep@gmail.com' && password === 'sandeep') {
        return res.json({ id: 'bootstrap-admin', name: 'Sandeep', email: 'sandeep@gmail.com', role: 'Super Admin', branch: 'All Branches', companyId: 'FIC001', companyName: 'FIC Group' });
      }
      if (email === 'vaidee@gmail.com' && password === 'vaidee') {
        return res.json({ id: 'bootstrap-vaidee', name: 'Vaideeswari', email: 'vaidee@gmail.com', role: 'Admin', branch: 'HEAD OFFICE(KRISHNAGIRI)', companyId: 'FIC001', companyName: 'FIC Group' });
      }
      if (email === 'sabari@gmail.com' && password === 'sabari') {
        return res.json({ id: 'bootstrap-sabari', name: 'Sabari', email: 'sabari@gmail.com', role: 'Security', branch: 'HEAD OFFICE(KRISHNAGIRI)', companyId: 'FIC001', companyName: 'FIC Group' });
      }

      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // In a real app, use bcrypt.compare here
    if (user.password !== password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Block inactive and suspended users from logging in
    if (user.status === 'Inactive') {
      return res.status(403).json({ message: 'Your account has been deactivated. Please contact your administrator.' });
    }
    
    if (user.status === 'Blocked') {
      const reasonStr = user.statusReason ? `\n\nReason:\n${user.statusReason}` : '';
      return res.status(403).json({ message: `Your account has been blocked by the Super Admin.${reasonStr}\n\nPlease contact your administrator.` });
    }

    // Check company status
    const Company = require('../models/Company');
    const company = await Company.findOne({ code: user.companyId });
    if (!company && user.role !== 'SaaS Super Admin') {
      return res.status(404).json({ message: 'Company not found' });
    }

    let isExpired = false;
    let subscription = 'Basic';
    let subscriptionExpiresAt = null;

    if (company) {
      if (company.status !== 'Active' && company.status !== 'Expired' && user.role !== 'SaaS Super Admin') {
        return res.status(403).json({ message: `Your company account is currently ${company.status}. Please contact support.` });
      }
      
      if (company.subscriptionExpiresAt && new Date() >= new Date(company.subscriptionExpiresAt)) {
        isExpired = true;
        
        // Auto-expire in database if not already
        if (company.status !== 'Expired') {
          company.status = 'Expired';
          await company.save();
        }
      }
      
      // Do not block login if expired; let the frontend handle the freeze screen and upgrade flow.
      
      subscription = company.subscription;
      subscriptionExpiresAt = company.subscriptionExpiresAt;

      // Automatic Expiration Notifications (Step 4)
      if (!isExpired && company.subscriptionExpiresAt && (user.role === 'Admin' || user.role === 'MD' || user.role === 'Company Admin' || user.role === 'Super Admin')) {
        const diffTime = new Date(company.subscriptionExpiresAt) - new Date();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if ([30, 15, 7, 1].includes(diffDays)) {
          const Notification = require('../models/Notification');
          
          // Only create one notification per day for this company to avoid spam on every login
          const startOfDay = new Date();
          startOfDay.setHours(0, 0, 0, 0);
          
          const existingNotif = await Notification.findOne({
            companyId: company.code,
            type: 'Subscription',
            createdAt: { $gte: startOfDay }
          });

          if (!existingNotif) {
            await Notification.create({
              companyId: company.code,
              type: 'Subscription',
              title: '⚠️ Subscription Expiring Soon',
              message: `Your ${subscription} plan expires in ${diffDays} day${diffDays > 1 ? 's' : ''}. Renew now to avoid service interruption.`,
              createdBy: 'System'
            });
          }
        }
      }
    }

    // Return user data without password
    const u = user.toJSON();
    delete u.password;
    
    // Explicitly construct the response object to ensure properties are added
    const responsePayload = {
      ...u,
      companyName: company ? company.name : (u.companyId === 'SYSTEM' ? 'System Administration' : undefined),
      isExpired,
      subscription,
      subscriptionExpiresAt,
      branding: company?.branding || { logoUrl: '', primaryColor: '#1E1B6E' }
    };

    // Log the action manually since req.user isn't set yet
    await logAction(req, 'Login', 'Authentication', {
      companyId: responsePayload.companyId,
      companyName: responsePayload.companyName,
      userName: responsePayload.name,
      role: responsePayload.role
    });
    
    res.json(responsePayload);
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// POST register-company (SaaS signup)
router.post('/register-company', async (req, res) => {
  try {
    const { companyName, adminName, email, mobileNumber, password, plan } = req.body;

    if (!companyName || !adminName || !email || !password) {
      return res.status(400).json({ message: 'Company name, admin name, email, and password are required' });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'Email address is already registered' });
    }

    // Generate unique company code
    const Company = require('../models/Company');
    const cleanName = companyName.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
    const prefix = cleanName.length >= 3 ? cleanName : 'COM';
    let code = '';
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 10) {
      const rand = Math.floor(100 + Math.random() * 900);
      code = `${prefix}${rand}`;
      const existingCompany = await Company.findOne({ code });
      if (!existingCompany) {
        isUnique = true;
      }
      attempts++;
    }

    // Fallback if loop failed
    if (!isUnique) {
      code = `COM${Date.now().toString().slice(-4)}`;
    }

    // Set expiration date
    const expiry = new Date();
    if (plan === 'One Day Trial') {
      expiry.setDate(expiry.getDate() + 1);
    } else {
      expiry.setDate(expiry.getDate() + 30);
    }

    // Standard or Enterprise starts Inactive until payment succeeds. Free plans start Active.
    const companyStatus = (plan === 'Basic' || plan === 'One Day Trial' || !plan) ? 'Active' : 'Inactive';

    const company = new Company({
      name: companyName,
      code,
      subscription: plan || 'Basic',
      status: companyStatus,
      subscriptionExpiresAt: expiry
    });
    await company.save();

    // Create the Company Admin (Super Admin role in their company context)
    const user = new User({
      companyId: code,
      name: adminName,
      email: email.toLowerCase(),
      mobileNumber,
      password, // Plain text for testing purposes
      role: 'Super Admin',
      branch: 'All Branches',
      status: 'Active',
      createdBy: 'Self-Registration'
    });
    await user.save();

    // Trigger Notification for New Tenant
    const Notification = require('../models/Notification');
    const newNotification = await Notification.create({
      companyId: 'SYSTEM', // System-level notification for SaaS Super Admin
      type: 'Tenant',
      title: '🏢 New Tenant Added',
      message: `${companyName} has been added to the platform.`,
      createdBy: 'System'
    });
    const io = req.app.get('io');
    if (io) {
      io.emit('new_notification', newNotification);
    }

    // Log the action
    await logAction(req, 'Company Created', 'Tenant Management', {
      companyId: 'SYSTEM',
      companyName: 'System Administration',
      userName: adminName,
      role: 'SaaS Super Admin'
    });

    // Send mock email
    await sendEmail(email.toLowerCase(), EmailTemplates.welcome(companyName, adminName).subject, EmailTemplates.welcome(companyName, adminName).body);

    const sanitizedUser = user.toJSON();
    delete sanitizedUser.password;

    res.status(201).json({
      message: 'Company and administrator registered successfully',
      company: {
        name: company.name,
        code: company.code,
        subscription: company.subscription,
        status: company.status,
        subscriptionExpiresAt: company.subscriptionExpiresAt
      },
      user: sanitizedUser
    });
  } catch (err) {
    console.error('Company registration error:', err);
    res.status(500).json({ message: err.message || 'Server error during company registration' });
  }
});

// POST mock payment success (Simulates Razorpay/Stripe success webhook or callback)
router.post('/mock-payment', async (req, res) => {
  try {
    const { companyCode, plan, paymentId } = req.body;

    if (!companyCode || !plan) {
      return res.status(400).json({ message: 'Company code and plan selection are required' });
    }

    const Company = require('../models/Company');
    const company = await Company.findOne({ code: companyCode.toUpperCase() });
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Create Upgrade Request instead of automatically activating
    const UpgradeRequest = require('../models/UpgradeRequest');
    
    // Calculate amount based on plan
    const amount = plan === 'Enterprise' ? 6999 : (plan === 'Standard' ? 2999 : 999);
    
    const upgradeReq = await UpgradeRequest.create({
      companyId: company.code,
      companyName: company.name,
      requestedPlan: plan,
      amount: amount,
      durationDays: 30,
      status: 'Pending',
      requestedBy: 'System Simulator'
    });

    // Trigger Notification for Subscription Requested
    const Notification = require('../models/Notification');
    const newNotification = await Notification.create({
      companyId: 'SYSTEM',
      type: 'Subscription',
      title: '📈 Subscription Upgrade Requested',
      message: `${company.name} requested to upgrade to ${plan} Plan.`,
      createdBy: 'System Simulator'
    });
    
    const companyNotification = await Notification.create({
      companyId: company.code,
      type: 'Subscription',
      title: '📈 Subscription Upgrade Requested',
      message: `Your company requested to upgrade to ${plan} Plan. Pending Approval.`,
      createdBy: 'System Simulator'
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('new_notification', newNotification);
      io.emit('new_notification', companyNotification);
    }

    res.json({
      message: 'Payment simulation successful. Upgrade request created and is pending approval.',
      company: {
        name: company.name,
        code: company.code,
        subscription: company.subscription,
        status: company.status,
        subscriptionExpiresAt: company.subscriptionExpiresAt
      }
    });
  } catch (err) {
    console.error('Mock payment error:', err);
    res.status(500).json({ message: err.message || 'Server error during mock payment' });
  }
});

module.exports = router;
