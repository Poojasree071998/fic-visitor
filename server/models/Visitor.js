const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
  visitorProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'VisitorProfile' },
  profileId: { type: String, required: true },
  visitId: { type: String, unique: true },
  visitorName: { type: String, required: true },
  mobileNumber: { type: String, required: true },
  email: { type: String },
  companyName: { type: String },
  hostName: { type: String, required: true },
  hostTeam: { type: String, default: 'General' },
  purpose: { type: String, required: true },
  visitDate: { type: String, required: true },
  expectedArrivalTime: { type: String },
  hostNotes: { type: String },
  status: { 
    type: String, 
    enum: ["Pending", "Approved", "Rejected", "Inside", "Exited"], 
    default: 'Pending' 
  },
  branch: { type: String, required: true },
  currentZone: { type: String },
  entryTime: { type: String },
  exitTime: { type: String },
  qrCode: { type: String },
  approvedBy: { type: String },
  remarks: { type: String },
  photoUrl: { type: String },
  checkedIn: { type: Boolean, default: false },
  zoneLogs: [{
    zoneName: String,
    entryTime: Date,
    exitTime: Date,
    durationMinutes: Number
  }]
}, { timestamps: true });

visitorSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
  }
});

module.exports = mongoose.model('Visitor', visitorSchema);
