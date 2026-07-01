const admin = require('firebase-admin');

// Cấu hình khởi tạo Firebase Admin SDK
if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else if (process.env.FIREBASE_PRIVATE_KEY) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        })
      });
    } else {
      // Hỗ trợ chạy thử cục bộ với file serviceAccountKey.json nằm ở thư mục gốc của dự án
      const serviceAccount = require('../serviceAccountKey.json');
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }
  } catch (err) {
    console.error('Lỗi khởi tạo Firebase Admin:', err);
  }
}

const db = admin.firestore();

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const { email, password, username, captchaToken, captchaType } = req.body;

    if (!email || !password || !username || !captchaToken) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin!' });
    }

    // 1. Xác thực Captcha Token phía Server
    const secretKey = process.env.CAPTCHA_SECRET_KEY;
    if (!secretKey) {
      console.warn('⚠️ CẢNH BÁO: Chưa cấu hình CAPTCHA_SECRET_KEY trong biến môi trường!');
    } else {
      let verifyUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'; // Mặc định Cloudflare Turnstile
      
      if (captchaType === 'recaptcha') {
        verifyUrl = 'https://www.google.com/recaptcha/api/siteverify';
      }

      const verifyRes = await fetch(verifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${secretKey}&response=${captchaToken}`
      });

      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        return res.status(400).json({ success: false, message: 'Xác minh chống Bot thất bại! Vui lòng thử lại.' });
      }
    }

    // 2. Tạo tài khoản trong Firebase Authentication thông qua Admin SDK (Bỏ qua cấu hình chặn Client Sign-up)
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: username,
    });

    // 3. Ghi tài liệu người dùng vào Firestore
    await db.collection('users').doc(userRecord.uid).set({
      email: email.toLowerCase().trim(),
      username: username.trim(),
      coins: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return res.status(200).json({
      success: true,
      message: 'Đăng ký tài khoản thành công!',
      uid: userRecord.uid
    });

  } catch (error) {
    console.error('Lỗi trong quá trình đăng ký:', error);
    let message = 'Có lỗi xảy ra trong quá trình đăng ký.';
    
    if (error.code === 'auth/email-already-in-use') {
      message = 'Email này đã được sử dụng!';
    } else if (error.code === 'auth/weak-password') {
      message = 'Mật khẩu quá yếu (phải từ 6 ký tự trở lên)!';
    } else if (error.code === 'auth/invalid-email') {
      message = 'Định dạng email không hợp lệ!';
    }

    return res.status(500).json({ success: false, message });
  }
}
