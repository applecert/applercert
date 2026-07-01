module.exports = async function handler(req, res) {
  const rawValue = process.env.FIREBASE_SERVICE_ACCOUNT;
  let first30 = rawValue ? rawValue.substring(0, 30) : 'undefined';
  let last30 = rawValue ? rawValue.substring(rawValue.length - 30) : 'undefined';
  
  let parseError = null;
  let parsedJson = null;
  try {
    if (rawValue) {
      parsedJson = JSON.parse(rawValue);
    }
  } catch (err) {
    parseError = { message: err.message, stack: err.stack };
  }

  res.status(200).json({
    hasServiceAccount: !!rawValue,
    length: rawValue ? rawValue.length : 0,
    first30,
    last30,
    parseError,
    parsedSuccessfully: !!parsedJson,
    parsedKeys: parsedJson ? Object.keys(parsedJson) : null
  });
};
