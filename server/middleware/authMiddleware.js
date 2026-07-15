const Company = require('../models/Company');

module.exports = async (req, res, next) => {
  try {
    const companyId = req.headers['x-company-id'];
    const userId = req.headers['x-user-id'];
    const userRole = req.headers['x-user-role'];

    // Resolve tenant companyId
    if (companyId) {
      const company = await Company.findOne({ code: companyId.toUpperCase() });
      if (!company) {
        return res.status(404).json({ message: 'Company code is invalid' });
      }

      const isUpgradeRequest = req.path.includes('/request-upgrade') || req.path.includes('/me');

      if (company.status !== 'Active' && userRole !== 'SaaS Super Admin' && !isUpgradeRequest) {
        return res.status(403).json({ 
          message: `Your subscription account status is '${company.status}'. Please contact system administrator.` 
        });
      }

      // Check if subscription has expired
      if (company.subscriptionExpiresAt && new Date() > new Date(company.subscriptionExpiresAt) && userRole !== 'SaaS Super Admin' && !isUpgradeRequest) {
        return res.status(403).json({ 
          message: `Your subscription has expired on ${new Date(company.subscriptionExpiresAt).toLocaleDateString()}. Please renew to continue.` 
        });
      }

      req.companyId = companyId.toUpperCase();
    } else {
      // Default fallback for legacy endpoints or unconfigured requests
      req.companyId = 'FIC001';
    }

    req.userId = userId || null;
    req.userRole = userRole || null;

    if (userId && !userId.startsWith('bootstrap-')) {
      const User = require('../models/User');
      const userObj = await User.findById(userId);
      if (userObj) {
        if (userObj.status === 'Inactive') {
          return res.status(403).json({ message: 'Your account is inactive and has been deactivated.' });
        }
        if (userObj.status === 'Blocked') {
          return res.status(403).json({ message: 'Your account has been blocked.' });
        }
      }
    }

    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(500).json({ message: 'Internal Server Error in authentication' });
  }
};
