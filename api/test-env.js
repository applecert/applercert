module.exports = async function handler(req, res) {
  let admin = null;
  let getFirestore = null;
  let importError = null;

  try {
    admin = require('firebase-admin');
    const firestoreModule = require('firebase-admin/firestore');
    getFirestore = firestoreModule.getFirestore;
  } catch (err) {
    importError = { message: err.message, stack: err.stack };
  }

  res.status(200).json({
    hasServiceAccount: !!process.env.FIREBASE_SERVICE_ACCOUNT,
    importError,
    hasAdmin: !!admin,
    nodeVersion: process.version
  });
};
