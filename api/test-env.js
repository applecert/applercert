const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

module.exports = async function handler(req, res) {
  let initError = null;
  let parseError = null;
  let parsedAccount = null;

  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      parsedAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    }
  } catch (err) {
    parseError = { message: err.message, stack: err.stack };
  }

  if (!admin.getApps().length) {
    try {
      if (parsedAccount) {
        admin.initializeApp({
          credential: admin.cert(parsedAccount)
        });
      } else {
        throw new Error("No parsed service account available");
      }
    } catch (err) {
      initError = { message: err.message, stack: err.stack };
    }
  }

  let dbOk = false;
  let dbError = null;
  try {
    const db = getFirestore();
    dbOk = !!db;
  } catch (err) {
    dbError = { message: err.message, stack: err.stack };
  }

  res.status(200).json({
    hasServiceAccount: !!process.env.FIREBASE_SERVICE_ACCOUNT,
    parseError,
    initError,
    dbOk,
    dbError,
    parsedKeys: parsedAccount ? Object.keys(parsedAccount) : null
  });
};
