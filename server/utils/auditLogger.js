const AuditLog = require('../models/AuditLog');

/**
 * Standardized utility to record audit events.
 * @param {Object} req - The Express request object.
 * @param {String} action - The action performed (e.g., 'Added Visitor').
 * @param {String} moduleName - The module where it happened (e.g., 'Visitor').
 * @param {Object} customData - Optional overrides if user is not in req.
 */
const logAction = async (req, action, moduleName, customData = {}) => {
  try {
    const companyId = customData.companyId || req.companyId || 'SYSTEM';
    const companyName = customData.companyName || (req.user ? req.user.companyName : 'Unknown');
    const userName = customData.userName || (req.user ? req.user.name : 'System');
    const role = customData.role || req.userRole || 'System';
    const ipAddress = req.ip || req.connection?.remoteAddress || 'Unknown';

    await AuditLog.create({
      companyId,
      companyName,
      userName,
      role,
      action,
      module: moduleName,
      ipAddress
    });
  } catch (err) {
    console.error('Audit Log Error:', err);
  }
};

module.exports = logAction;
