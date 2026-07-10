const express = require('express');
const router = express.Router();
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const Visitor = require('../models/Visitor');
const VisitorProfile = require('../models/VisitorProfile');
const Notification = require('../models/Notification');

// Configure Multer storage to use Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'zmvms_visitors',
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

// Get all visitors
router.get('/', async (req, res) => {
  try {
    let query = {};
    if (req.query.branch) {
      const branchUpper = req.query.branch.toUpperCase();
      
      // Escape special characters in the branch name for regex
      const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      let searchRegexStr = escapeRegExp(req.query.branch);
      
      // Map new branch names to legacy test data
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

    // 1. Upsert Visitor Profile
    let profile = await VisitorProfile.findOne({ mobileNumber });
    let profileId;
    if (!profile) {
      const profileCount = await VisitorProfile.countDocuments();
      profileId = `VIS${(profileCount + 1).toString().padStart(3, '0')}`;
      profile = new VisitorProfile({
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

    // 2. Generate unique Visit ID: VISIT0001
    const count = await Visitor.countDocuments();
    const nextNum = (count + 1).toString().padStart(4, '0');
    const visitId = `VISIT${nextNum}`;
    
    // 3. Generate QR Code URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const qrCode = `${frontendUrl}/pass/${visitId}`;
    
    // 4. Save the Visit Record
    const visitor = new Visitor({
      ...req.body,
      visitorProfileId: profile._id,
      profileId,
      visitId,
      qrCode,
      status: req.body.status || 'Pending'
    });
    const newVisitor = await visitor.save();

    const notification = await Notification.create({
      title: "New Visitor Registered",
      message: `${newVisitor.visitorName} has been registered by Security.`,
      roles: ["admin", "md", "superadmin", "security"],
      branch: newVisitor.branch
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('newNotification', notification);
    }

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
    const oldVisitor = await Visitor.findById(req.params.id);
    const updatedVisitor = await Visitor.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    
    // Check if status changed to Approved or Rejected
    if (req.body.status && oldVisitor && oldVisitor.status !== req.body.status) {
      if (req.body.status === 'Approved' || req.body.status === 'Rejected') {
        const action = req.body.status === 'Approved' ? 'approved' : 'rejected';
        const notification = await Notification.create({
          title: `Visitor ${req.body.status}`,
          message: `${updatedVisitor.visitorName} has been ${action} by ${req.body.approvedBy || 'Admin'}.`,
          roles: ["admin", "md", "superadmin", "security"],
          branch: updatedVisitor.branch
        });
        
        const io = req.app.get('io');
        if (io) {
          io.emit('newNotification', notification);
        }
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
    const visitor = await Visitor.findById(req.params.id);
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
        title: "Visitor Checked Out",
        message: `${visitor.visitorName} has checked out.`,
        roles: ["admin", "md", "superadmin", "security"],
        branch: visitor.branch
      });
      
      const io = req.app.get('io');
      if (io) {
        io.emit('newNotification', notification);
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
      $or: [
        { mobileNumber: query },
        { visitorName: { $regex: new RegExp(query, 'i') } }
      ]
    });

    if (!profile) {
      const pastVisit = await Visitor.findOne({
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
