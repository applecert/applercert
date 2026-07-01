const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

module.exports = async function handler(req, res) {
  let initError = null;
  let getFirestoreError = null;
  let initSuccess = false;
  let getFirestoreSuccess = false;

  const rawValue = process.env.FIREBASE_SERVICE_ACCOUNT;
  let parsedAccount = null;

  try {
    if (rawValue) {
      parsedAccount = JSON.parse(rawValue);
    }
  } catch (err) {
    // Ignore parse error here, we report it later
  }

  // 1. Try to initialize
  try {
    if (!getApps().length) {
      if (parsedAccount) {
        initializeApp({
          credential: cert(parsedAccount)
        });
        initSuccess = true;
      } else {
        throw new Error("No service account JSON string available in process.env");
      }
    } else {
      initSuccess = true; // Already initialized
    }
  } catch (err) {
    initError = { message: err.message, stack: err.stack, code: err.code };
  }

  // 2. Try to call getFirestore
  try {
    const db = getFirestore();
    getFirestoreSuccess = !!db;
  } catch (err) {
    getFirestoreError = { message: err.message, stack: err.stack, code: err.code };
  }

  res.status(200).json({
    initSuccess,
    initError,
    getFirestoreSuccess,
    getFirestoreError
  });
};
