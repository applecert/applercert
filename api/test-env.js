module.exports = async function handler(req, res) {
  res.status(200).json({
    hasServiceAccount: !!process.env.FIREBASE_SERVICE_ACCOUNT,
    serviceAccountLength: process.env.FIREBASE_SERVICE_ACCOUNT ? process.env.FIREBASE_SERVICE_ACCOUNT.length : 0,
    hasCaptchaSecret: !!process.env.CAPTCHA_SECRET_KEY,
    captchaSecretLength: process.env.CAPTCHA_SECRET_KEY ? process.env.CAPTCHA_SECRET_KEY.length : 0,
    cwd: process.cwd(),
    nodeVersion: process.version
  });
};
