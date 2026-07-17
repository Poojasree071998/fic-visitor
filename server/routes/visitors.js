const express = require('express');
const router = express.Router();
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const Visitor = require('../models/Visitor');
const VisitorProfile = require('../models/VisitorProfile');
const Notification = require('../models/Notification');
const authMiddleware = require('../middleware/authMiddleware');
const logAction = require('../utils/auditLogger');

router.use((req, res, next) => {
  if (req.path.startsWith('/pass/')) {
    return next();
  }
  authMiddleware(req, res, next);
});

// Configure Multer storage to use Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: (req, file) => {
      const company = req.companyId || 'UNKNOWN_COMPANY';
      const branch = req.branchId || req.headers['x-branch-id'] || 'General';
      const cleanBranch = branch.replace(/[^a-zA-Z0-9]/g, '_');
      return `fic-vms/${company}/${cleanBranch}`;
    },
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 500, height: 500, crop: 'limit' }]
  },
});
const upload = multer({ storage: storage });

// Upload Visitor Photo Endpoint
router.post('/upload', upload.single('photo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    // Return the Cloudinary URL
    res.json({ url: req.file.path });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get today's summary (counts by team)
router.get('/todays-summary', async (req, res) => {
  try {
    const { branchId, date } = req.query;

    const targetDateStr = date ? date : new Date().toISOString().split('T')[0];

    const matchStage = {
      companyId: req.companyId,
      visitDate: targetDateStr
    };

    if (req.userRole === 'Security' || req.userRole === 'Admin' || req.userRole === 'MD') {
       matchStage.branch = req.branchId;
    } else if (branchId && branchId !== 'All Branches') {
      const branchUpper = branchId.toUpperCase();
      const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      let searchRegexStr = escapeRegExp(branchId);
      
      if (branchUpper.includes('THIRUPATTUR')) {
        searchRegexStr = `${searchRegexStr}|Tirupattur`;
      } else if (branchUpper.includes('KRISHNAGIRI')) {
        searchRegexStr = `${searchRegexStr}|Salem`;
      } else if (branchUpper === 'BANGALORE') {
        searchRegexStr = `${searchRegexStr}|Bangalore`;
      }
      matchStage.branch = { $regex: new RegExp(`^(${searchRegexStr})$`, 'i') };
    }

    const totalAggregation = await Visitor.aggregate([
      { $match: matchStage },
      { $group: { _id: null, total: { $sum: { $ifNull: ["$visitorCount", 1] } } } }
    ]);
    const totalVisitorsToday = totalAggregation.length > 0 ? totalAggregation[0].total : 0;

    const hostCounts = await Visitor.aggregate([
      { $match: matchStage },
      { 
        $group: {
          _id: "$hostName",
          count: { $sum: { $ifNull: ["$visitorCount", 1] } }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const teamBreakdown = hostCounts.map(t => ({
      hostName: t._id || 'Unknown',
      count: t.count
    }));

    res.json({ totalVisitorsToday, teamBreakdown });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all visitors
router.get('/', async (req, res) => {
  try {
    let query = { companyId: req.companyId };
    
    // Enforce strict branch isolation based on role
    if (req.userRole === 'Security' || req.userRole === 'Admin' || req.userRole === 'MD') {
       query.branch = req.branchId;
    } else if (req.query.branch && req.query.branch !== 'All Branches') {
       // Super Admins can filter by branch
       const branchUpper = req.query.branch.toUpperCase();
       const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
       let searchRegexStr = escapeRegExp(req.query.branch);
       
       if (branchUpper.includes('THIRUPATTUR')) {
         searchRegexStr = `${searchRegexStr}|Tirupattur`;
       } else if (branchUpper.includes('KRISHNAGIRI')) {
         searchRegexStr = `${searchRegexStr}|Salem`;
       } else if (branchUpper === 'BANGALORE') {
         searchRegexStr = `${searchRegexStr}|Bangalore`;
       }
       query.branch = { $regex: new RegExp(`^(${searchRegexStr})$`, 'i') };
    }
    
    const visitors = await Visitor.find(query).sort({ createdAt: -1 });
    res.json(visitors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add a new visitor
router.post('/', async (req, res) => {
  try {
    const { visitorName, mobileNumber, email, companyName, photoUrl } = req.body;

    // Check Blacklist
    const Blacklist = require('../models/Blacklist');
    const isBlacklisted = await Blacklist.findOne({ companyId: req.companyId, mobileNumber });
    if (isBlacklisted) {
      // Force status to Rejected for security audit logs
      req.body.status = 'Rejected';
    }

    // Enforce Monthly Visitor Limits based on Plan
    const Company = require('../models/Company');
    const planLimits = require('../config/plans');
    const company = await Company.findOne({ code: req.companyId });
    if (company && company.subscription) {
      const limits = planLimits[company.subscription];
      if (limits && limits.visitors !== -1) {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const count = await Visitor.countDocuments({
          companyId: req.companyId,
          createdAt: { $gte: startOfMonth }
        });

        if (count >= limits.visitors) {
          return res.status(403).json({ 
            message: `Visitor limit reached. Your current plan (${company.subscription}) only allows up to ${limits.visitors} visitors per month. Please upgrade your subscription.` 
          });
        }
      }
    }

    // 1. Upsert Visitor Profile
    let profile = await VisitorProfile.findOne({ companyId: req.companyId, mobileNumber });
    let profileId;
    if (!profile) {
      const lastProfile = await VisitorProfile.findOne({ companyId: req.companyId }).sort({ createdAt: -1 });
      let pNum = 1;
      if (lastProfile && lastProfile.profileId && lastProfile.profileId.startsWith('VIS')) {
        const match = lastProfile.profileId.match(/\d+$/);
        if (match) pNum = parseInt(match[0], 10) + 1;
      }
      profileId = `VIS${pNum.toString().padStart(3, '0')}`;
      profile = new VisitorProfile({
        companyId: req.companyId,
        profileId,
        mobileNumber,
        visitorName,
        email,
        companyName,
        photoUrl
      });
      await profile.save();
    } else {
      profileId = profile.profileId;
      // Update existing profile with latest details
      if (visitorName) profile.visitorName = visitorName;
      if (email) profile.email = email;
      if (companyName) profile.companyName = companyName;
      if (photoUrl) profile.photoUrl = photoUrl;
      await profile.save();
    }

    // 2. Generate unique Visit ID reliably
    const lastVisitor = await Visitor.findOne().sort({ createdAt: -1 });
    let vNum = 1;
    if (lastVisitor && lastVisitor.visitId && lastVisitor.visitId.startsWith('VISIT')) {
      const match = lastVisitor.visitId.match(/\d+$/);
      if (match) vNum = parseInt(match[0], 10) + 1;
    }
    const visitId = `VISIT${vNum.toString().padStart(4, '0')}`;
    
    // 3. Generate QR Code URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const qrCode = `${frontendUrl}/pass/${visitId}`;
    
    // 4. Save the Visit Record
    const visitor = new Visitor({
      ...req.body,
      companyId: req.companyId,
      visitorProfileId: profile._id,
      profileId,
      visitId,
      qrCode,
      status: req.body.status || 'Pending'
    });
    const newVisitor = await visitor.save();

    const notification = await Notification.create({
      companyId: req.companyId,
      branchId: newVisitor.branch,
      type: 'Visitor',
      title: '👥 Visitor Registered',
      message: `${newVisitor.visitorName} has been registered for ${newVisitor.hostName || 'a visit'}.`,
      createdBy: req.user ? req.user.name : 'Security'
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('new_notification', notification);
    }
    
    // Audit log
    await logAction(req, `Visitor Registered: ${newVisitor.visitorName}`, 'Visitor');

    res.status(201).json(newVisitor);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});



// Get a single visitor by visitId (for public pass page)
router.get('/pass/:visitId', async (req, res) => {
  try {
    const isValidObjectId = require('mongoose').isValidObjectId(req.params.visitId);
    let query = { visitId: req.params.visitId };
    if (isValidObjectId) {
      query = { $or: [{ visitId: req.params.visitId }, { _id: req.params.visitId }] };
    }
    const visitor = await Visitor.findOne(query);
    if (!visitor) return res.status(404).json({ message: 'Visitor not found' });
    res.json(visitor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update visitor status/tracking
router.patch('/:id', async (req, res) => {
  try {
    const oldVisitor = await Visitor.findOne({ _id: req.params.id, companyId: req.companyId });
    const updatedVisitor = await Visitor.findOneAndUpdate(
      { _id: req.params.id, companyId: req.companyId },
      req.body,
      { new: true }
    );
    
    // Check if status changed to Approved or Rejected
    if (req.body.status && oldVisitor && oldVisitor.status !== req.body.status) {
      if (req.body.status === 'Approved' || req.body.status === 'Rejected') {
        const action = req.body.status === 'Approved' ? 'approved' : 'rejected';
        const notification = await Notification.create({
          companyId: req.companyId,
          branchId: updatedVisitor.branch,
          type: 'Visitor',
          title: `👥 Visitor ${req.body.status}`,
          message: `${updatedVisitor.visitorName} has been ${action} by ${req.body.approvedBy || 'Admin'}.`,
          createdBy: req.body.approvedBy || 'System'
        });
        
        const io = req.app.get('io');
        if (io) {
          io.emit('new_notification', notification);
        }
      }
    }
    
    // Audit Log for any status change
    if (req.body.status && oldVisitor && oldVisitor.status !== req.body.status) {
      await logAction(req, `Visitor Status changed to ${req.body.status}`, 'Visitor');
    }

    if (req.body.status === 'Inside' && oldVisitor && oldVisitor.status !== 'Inside') {
       const notification = await Notification.create({
          companyId: req.companyId,
          branchId: updatedVisitor.branch,
          type: 'Visitor',
          title: '✅ Visitor Checked In',
          message: `${updatedVisitor.visitorName} checked in at ${updatedVisitor.branch} Branch.`,
          createdBy: req.user ? req.user.name : 'System'
        });
        const io = req.app.get('io');
        if (io) {
          io.emit('new_notification', notification);
        }
    }

    res.json(updatedVisitor);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update visitor zone and log history
router.patch('/:id/zone', async (req, res) => {
  try {
    const { status, currentZone, entryTime, exitTime, checkedIn, remarks, purpose } = req.body;
    const visitor = await Visitor.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!visitor) return res.status(404).json({ message: 'Visitor not found' });

    // Initialize zoneLogs if undefined (for backwards compatibility)
    if (!visitor.zoneLogs) {
      visitor.zoneLogs = [];
    }

    // If leaving a zone (moving to a new one or exiting building entirely)
    if (visitor.currentZone && visitor.status === 'Inside') {
      const lastLogIndex = visitor.zoneLogs.length - 1;
      
      // We need to close the last log if it exists and hasn't been closed
      if (lastLogIndex >= 0 && !visitor.zoneLogs[lastLogIndex].exitTime) {
        visitor.zoneLogs[lastLogIndex].exitTime = new Date();
        const entry = visitor.zoneLogs[lastLogIndex].entryTime;
        const durationMs = new Date() - entry;
        visitor.zoneLogs[lastLogIndex].durationMinutes = Math.round(durationMs / 60000);
      } else if (lastLogIndex === -1 || visitor.zoneLogs[lastLogIndex].exitTime) {
         // Create a synthetic log if there isn't one open, based on previous entryTime
         visitor.zoneLogs.push({
           zoneName: visitor.currentZone,
           entryTime: new Date(), // fallback
           exitTime: new Date(),
           durationMinutes: 0
         });
      }
    }

    // Update main fields
    visitor.status = status || visitor.status;
    if (entryTime) visitor.entryTime = entryTime;
    if (exitTime) visitor.exitTime = exitTime;
    if (checkedIn !== undefined) visitor.checkedIn = checkedIn;
    if (remarks !== undefined) visitor.remarks = remarks;
    if (purpose !== undefined) visitor.purpose = purpose;

    if (status === 'Inside' && currentZone) {
      visitor.currentZone = currentZone;
      visitor.checkedIn = true;
      // Start a new log
      visitor.zoneLogs.push({
        zoneName: currentZone,
        entryTime: new Date()
      });
    } else if (status === 'Exited') {
      visitor.currentZone = null;
    }

    await visitor.save();
    
    // Check if visitor has checked out
    if (status === 'Exited') {
      const notification = await Notification.create({
        companyId: req.companyId,
        branchId: visitor.branch,
        type: 'Visitor',
        title: '🚪 Visitor Checked Out',
        message: `${visitor.visitorName} checked out successfully.`,
        createdBy: req.user ? req.user.name : 'System'
      });
      
      const io = req.app.get('io');
      if (io) {
        io.emit('new_notification', notification);
      }
    }

    res.json(visitor);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});
// Get Visitor Profile by Mobile Number or Name
router.get('/profile/:query', async (req, res) => {
  try {
    const query = req.params.query;
    let profile = await VisitorProfile.findOne({
      companyId: req.companyId,
      $or: [
        { mobileNumber: query },
        { visitorName: { $regex: new RegExp(query, 'i') } }
      ]
    });

    if (!profile) {
      const pastVisit = await Visitor.findOne({
        companyId: req.companyId,
        $or: [
          { mobileNumber: query },
          { visitorName: { $regex: new RegExp(query, 'i') } }
        ]
      }).sort({ createdAt: -1 });

      if (pastVisit) {
        profile = {
          profileId: pastVisit.profileId,
          mobileNumber: pastVisit.mobileNumber,
          visitorName: pastVisit.visitorName,
          email: pastVisit.email,
          companyName: pastVisit.companyName,
          photoUrl: pastVisit.photoUrl || ''
        };
      }
    }

    if (!profile) return res.json({ exists: false });
    
    // Ensure profileId is always returned (even if it's from the Profile document)
    res.json({ 
      exists: true, 
      profile: {
        profileId: profile.profileId,
        mobileNumber: profile.mobileNumber,
        visitorName: profile.visitorName,
        email: profile.email,
        companyName: profile.companyName,
        photoUrl: profile.photoUrl || ''
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
