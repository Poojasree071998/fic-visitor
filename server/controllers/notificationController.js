const Notification = require('../models/Notification');

exports.getNotifications = async (req, res) => {
  try {
    let query = {};
    if (req.query.branch) {
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
    const notifications = await Notification.find(query).sort({ createdAt: -1 });
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.status(200).json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
