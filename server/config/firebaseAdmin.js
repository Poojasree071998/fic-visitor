const { initializeApp, cert } = require("firebase-admin/app");

let serviceAccount;
try {
  serviceAccount = require("./firebase-service-account.json");
} catch (err) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    console.error("Missing FIREBASE_SERVICE_ACCOUNT environment variable");
  }
}

const app = initializeApp({
  credential: cert(serviceAccount),
});

module.exports = app;
