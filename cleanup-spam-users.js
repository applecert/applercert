const admin = require('firebase-admin');
const fs = require('fs');

/**
 * HƯỚNG DẪN SỬ DỤNG:
 * 1. Tải file Service Account Key (.json) từ Firebase Console:
 *    Vào Cài đặt dự án (Project Settings) -> Tài khoản dịch vụ (Service Accounts) -> Bấm "Tạo khóa riêng mới" (Generate New Private Key).
 * 2. Lưu file JSON vừa tải về với tên 'serviceAccountKey.json' đặt cùng thư mục với file script này.
 * 3. Mở Terminal tại thư mục này và chạy các lệnh:
 *    npm install firebase-admin
 *    node cleanup-spam-users.js
 */

const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

// Danh sách email loại trừ (Không bao giờ xóa)
const whitelistEmails = [
  'mquitran@gmail.com', // Admin email
  // Thêm các email của đối tác hoặc admin khác vào đây nếu có
];

async function cleanupSpamUsers() {
  console.log('==================================================================');
  console.log('🔄 BẮT ĐẦU QUÉT VÀ DỌN DẸP TÀI KHOẢN RÁC - IPAVIET');
  console.log('==================================================================');

  // 1. Thu thập danh sách khách hàng thực có số dư > 0
  console.log('🔍 Bước 1: Quét Firestore để tìm khách hàng có số dư > 0...');
  const activeUsersSnap = await db.collection('users').where('coins', '>', 0).get();
  const realUserUids = new Set();
  const realUserEmails = new Set();

  activeUsersSnap.forEach(doc => {
    realUserUids.add(doc.id);
    const data = doc.data();
    if (data.email) {
      realUserEmails.add(data.email.toLowerCase().trim());
    }
  });
  console.log(`✅ Tìm thấy ${realUserUids.size} tài khoản có số dư coins > 0.`);

  // 2. Thu thập danh sách khách hàng VIP còn hạn
  console.log('🔍 Bước 2: Quét Firestore tìm khách hàng còn hạn gói cước VIP...');
  const now = new Date();
  const vipUsersSnap = await db.collection('users').where('vipExpire', '>', now).get();
  let newVipCount = 0;
  vipUsersSnap.forEach(doc => {
    if (!realUserUids.has(doc.id)) {
      realUserUids.add(doc.id);
      newVipCount++;
    }
    const data = doc.data();
    if (data.email) {
      realUserEmails.add(data.email.toLowerCase().trim());
    }
  });
  console.log(`✅ Tìm thấy thêm ${newVipCount} tài khoản VIP còn hạn.`);
  console.log(`👉 Tổng khách hàng cần giữ lại (VIP + Có số dư): ${realUserUids.size}`);

  // 3. Quét toàn bộ danh sách người dùng trong Firebase Authentication
  console.log('🔍 Bước 3: Đang truy xuất danh sách người dùng từ Firebase Authentication...');
  let spamUids = [];
  let nextPageToken;
  let totalScanned = 0;

  do {
    const listUsersResult = await auth.listUsers(1000, nextPageToken);
    totalScanned += listUsersResult.users.length;

    listUsersResult.users.forEach(userRecord => {
      const email = (userRecord.email || '').toLowerCase().trim();
      const uid = userRecord.uid;

      const isWhitelist = whitelistEmails.includes(email);
      const isRealUser = realUserUids.has(uid) || realUserEmails.has(email);

      // Nếu không phải là tài khoản có tiền, không phải VIP, không phải admin whitelist
      if (!isWhitelist && !isRealUser) {
        spamUids.push(uid);
      }
    });

    nextPageToken = listUsersResult.nextPageToken;
  } while (nextPageToken);

  console.log(`📋 Tổng số tài khoản đã đăng ký trong Auth: ${totalScanned}`);
  console.log(`⚠️ Phát hiện ${spamUids.length} tài khoản rác (không phát sinh giao dịch, 0đ, không VIP).`);

  if (spamUids.length === 0) {
    console.log('🎉 Không phát hiện tài khoản rác nào. Hệ thống của bạn hoàn toàn sạch sẽ!');
    return;
  }

  // 4. Tiến hành xóa hàng loạt
  console.log(`🚀 Bắt đầu xóa tài khoản rác khỏi hệ thống...`);

  const batchSize = 100;
  for (let i = 0; i < spamUids.length; i += batchSize) {
    const chunk = spamUids.slice(i, i + batchSize);
    
    // A. Xóa khỏi Firebase Authentication
    try {
      await auth.deleteUsers(chunk);
      console.log(`🗑️ Đã xóa ${chunk.length} tài khoản khỏi Auth (${Math.min(i + batchSize, spamUids.length)}/${spamUids.length})`);
    } catch (err) {
      console.error(`❌ Lỗi khi xóa tài khoản Auth:`, err.message);
    }

    // B. Xóa tài liệu người dùng khỏi Firestore
    const firestoreBatch = db.batch();
    chunk.forEach(uid => {
      const userRef = db.collection('users').doc(uid);
      firestoreBatch.delete(userRef);
    });
    
    try {
      await firestoreBatch.commit();
      console.log(`🗑️ Đã xóa ${chunk.length} tài liệu Firestore tương ứng`);
    } catch (err) {
      console.error(`❌ Lỗi khi xóa tài liệu Firestore:`, err.message);
    }
  }

  console.log('==================================================================');
  console.log('🎉 HOÀN TẤT DỌN DẸP TÀI KHOẢN RÁC THÀNH CÔNG!');
  console.log('==================================================================');
}

cleanupSpamUsers().catch(err => {
  console.error('🔥 Lỗi nghiêm trọng xảy ra trong quá trình chạy script:', err);
});
