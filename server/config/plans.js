const planLimits = {
  'One Day Trial': {
    visitors: 10,
    securityUsers: 1,
    branches: 1,
    reports: false,
    price: 0
  },
  'Basic': {
    visitors: 500,
    securityUsers: 5,
    branches: 2,
    reports: true,
    price: 1999
  },
  'Standard': {
    visitors: -1, // -1 indicates unlimited
    securityUsers: 20,
    branches: 5,
    reports: true,
    price: 4999
  },
  'Enterprise': {
    visitors: -1,
    securityUsers: -1,
    branches: -1,
    reports: true,
    price: 9999
  }
};

module.exports = planLimits;
