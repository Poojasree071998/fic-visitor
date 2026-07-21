const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    companyId: {
      type: String,
      index: true
    },
    branchId: {
      type: String,
    },
    userId: {
      type: String,
    },
    type: {
      type: String,
      default: 'info',
      // The frontend can map these to icons/colors
      // Keeping original enums just in case of old data, plus new ones
      enum: ['success', 'warning', 'error', 'info', 'Tenant', 'Visitor', 'Security', 'Attendance', 'Subscription', 'System', 'Announcement', 'Branch', 'Admin'],
    },
    module: {
      type: String,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    createdBy: {
      type: String,
    },
    roles: [
      {
        type: String,
      },
    ],
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Notification", notificationSchema);
