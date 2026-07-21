const express = require('express');
const router = express.Router();
const BranchSetting = require('../models/BranchSetting');
const authMiddleware = require('../middleware/authMiddleware');
const logAction = require('../utils/auditLogger');

router.use(authMiddleware);

// GET all branch settings
router.get('/', async (req, res) => {
  try {
    const settings = await BranchSetting.find({ companyId: req.companyId });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET specific branch setting
router.get('/:branchName', async (req, res) => {
  try {
    const setting = await BranchSetting.findOne({
      companyId: req.companyId,
      branchName: { $regex: new RegExp(`^${req.params.branchName}$`, 'i') }
    });
    if (!setting) {
      return res.status(404).json({ message: 'Branch settings not found' });
    }
    res.json(setting);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST/PUT update branch setting
router.post('/', async (req, res) => {
  try {
    const { branchName, latitude, longitude, radius, checkInStart, checkInEnd, checkOutTime } = req.body;

    // Check plan limits
    const Company = require('../models/Company');
    const planLimits = require('../config/plans');
    const company = await Company.findOne({ code: req.companyId });
    if (company && company.subscription) {
      const limits = planLimits[company.subscription];
      if (limits && limits.branches !== -1) {
        const existing = await BranchSetting.findOne({
          companyId: req.companyId,
          branchName: { $regex: new RegExp(`^${branchName}$`, 'i') }
        });
        if (!existing) {
          const count = await BranchSetting.countDocuments({ companyId: req.companyId });
          if (count >= limits.branches) {
            return res.status(403).json({
              message: `Maximum branches reached. Your current plan (${company.subscription}) only allows up to ${limits.branches} branches. Please upgrade your subscription to create more.`
            });
          }
        }
      }
    }

    const existingBefore = await BranchSetting.findOne({
      companyId: req.companyId,
      branchName: { $regex: new RegExp(`^${branchName}$`, 'i') }
    });

    // Upsert the setting
    const setting = await BranchSetting.findOneAndUpdate(
      {
        companyId: req.companyId,
        branchName: { $regex: new RegExp(`^${branchName}$`, 'i') }
      },
      {
        companyId: req.companyId,
        branchName,
        latitude,
        longitude,
        radius,
        checkInStart,
        checkInEnd,
        checkOutTime
      },
      { new: true, upsert: true }
    );

    if (!existingBefore) {
      const Notification = require('../models/Notification');
      const newNotification = await Notification.create({
        companyId: req.companyId,
        branchId: branchName,
        type: 'success',
        module: 'Branch',
        title: '🏢 New Branch Added',
        message: `${branchName} Branch created under your company.`,
        createdBy: req.user ? req.user.name : 'System'
      });
      const io = req.app.get('io');
      if (io) {
        io.emit('new_notification', newNotification);
      }
      // Audit log
      await logAction(req, `Branch Added`, 'Settings', {
        userId: req.user ? req.user._id : undefined,
        description: `Branch ${branchName} was created successfully`,
        status: 'Success'
      });
    } else {
      // Audit log
      await logAction(req, `Branch Settings Updated`, 'Settings', {
        userId: req.user ? req.user._id : undefined,
        description: `Settings for branch ${branchName} were updated`,
        status: 'Success'
      });
    }

    res.json(setting);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
