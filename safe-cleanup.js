const admin = require('firebase-admin');
const fs = require('fs');

/**
 * HƯỚNG DẪN SỬ DỤNG:
 * 1. Đảm bảo file 'serviceAccountKey.json' (tải từ Firebase Console -> Project Settings -> Service Accounts)
 *    được đặt cùng thư mục với file script này.
 * 2. Cài đặt thư viện: npm install firebase-admin
 * 3. Chạy chế độ chạy thử (Dry Run) để kiểm tra danh sách:
 *    node safe-cleanup.js
 * 4. Kiểm tra file 'spam-users-preview.json' được tạo ra.
 * 5. Khi đã chắc chắn, sửa cấu hình: DRY_RUN = false và chạy lại lệnh trên để xóa thực tế.
 */

// ==================== CẤU HÌNH BẢO VỆ ====================
const DRY_RUN = true; // true: chỉ quét và xuất file preview. false: thực hiện xóa thật khỏi hệ thống!

// Khoanh vùng thời gian cuộc tấn công bắt đầu (Bảo vệ tất cả tài khoản tạo trước mốc này)
// Mặc định: Bảo vệ mọi tài khoản tạo trước ngày 12/05/2026.
const ATTACK_START_DATE = new Date('2026-05-12T00:00:00.000Z'); 

// Danh sách email loại trừ (Tuyệt đối không xóa)
const whitelistEmails = [
  'mquitran@gmail.com', // Admin email
  // Thêm các email của admin/đối tác khác nếu cần
];
// ========================================================

let serviceAccount;
if (fs.existsSync('./serviceAccountKey.json')) {
  serviceAccount = require('./serviceAccountKey.json');
} else if (fs.existsSync('./serviceAccountKey.json.json')) {
  serviceAccount = require('./serviceAccountKey.json.json');
} else {
  throw new Error("Không tìm thấy file serviceAccountKey.json hoặc serviceAccountKey.json.json!");
}

admin.initializeApp({
  credential: admin.cert(serviceAccount)
});

const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const db = getFirestore();
const auth = getAuth();

async function runSafeCleanup() {
  console.log('==================================================================');
  console.log(`🔄 BẮT ĐẦU QUÉT TÀI KHOẢN RÁC - CHẾ ĐỘ: ${DRY_RUN ? 'CHẠY THỬ (DRY RUN - AN TOÀN)' : '⚠️ XÓA THẬT (LIVE DELETE)'}`);
  console.log(`📅 Chỉ xét các tài khoản đăng ký sau: ${ATTACK_START_DATE.toLocaleString('vi-VN')}`);
  console.log('==================================================================\n');

  const realUserUids = new Set();
  const realUserEmails = new Set();

  // 1. Quét Firestore tìm khách hàng có số dư > 0
  console.log('🔍 Bước 1: Tìm người dùng có coins > 0...');
  try {
    const activeUsersSnap = await db.collection('users').where('coins', '>', 0).get();
    activeUsersSnap.forEach(doc => {
      realUserUids.add(doc.id);
      const data = doc.data();
      if (data.email) realUserEmails.add(data.email.toLowerCase().trim());
    });
    console.log(`   👉 Tìm thấy ${activeUsersSnap.size} người dùng có coins > 0.`);
  } catch (err) {
    console.warn('   ⚠️ Không thể truy xuất coins (có thể chưa có collection users). Bỏ qua...');
  }

  // 2. Quét Firestore tìm khách hàng VIP còn hạn
  console.log('🔍 Bước 2: Tìm người dùng VIP còn hạn...');
  try {
    const now = new Date();
    const vipUsersSnap = await db.collection('users').where('vipExpire', '>', now).get();
    let newVips = 0;
    vipUsersSnap.forEach(doc => {
      const data = doc.data();
      if (!realUserUids.has(doc.id)) {
        realUserUids.add(doc.id);
        newVips++;
      }
      if (data.email) realUserEmails.add(data.email.toLowerCase().trim());
    });
    console.log(`   👉 Tìm thấy thêm ${newVips} người dùng VIP còn hạn.`);
  } catch (err) {
    console.warn('   ⚠️ Không thể truy xuất VIP (có thể chưa có collection users). Bỏ qua...');
  }

  // 3. Quét Collection Group "transactions"
  console.log('🔍 Bước 3: Quét lịch sử giao dịch (transactions) của tất cả người dùng...');
  try {
    const txSnap = await db.collectionGroup('transactions').get();
    let newTxUsers = 0;
    txSnap.forEach(doc => {
      // doc.ref.parent.parent chính là document của user
      const userRef = doc.ref.parent.parent;
      if (userRef && userRef.id) {
        if (!realUserUids.has(userRef.id)) {
          realUserUids.add(userRef.id);
          newTxUsers++;
        }
      }
    });
    console.log(`   👉 Tìm thấy thêm ${newTxUsers} người dùng từng phát sinh giao dịch nạp tiền.`);
  } catch (err) {
    console.warn('   ⚠️ Lỗi quét transactions group hoặc chưa có giao dịch nào:', err.message);
  }

  // 4. Quét Collection Group "inventory"
  console.log('🔍 Bước 4: Quét tủ đồ/lịch sử mua hàng (inventory) của tất cả người dùng...');
  try {
    const invSnap = await db.collectionGroup('inventory').get();
    let newInvUsers = 0;
    invSnap.forEach(doc => {
      const userRef = doc.ref.parent.parent;
      if (userRef && userRef.id) {
        if (!realUserUids.has(userRef.id)) {
          realUserUids.add(userRef.id);
          newInvUsers++;
        }
      }
    });
    console.log(`   👉 Tìm thấy thêm ${newInvUsers} người dùng từng mua app/tài khoản (có đồ trong rương).`);
  } catch (err) {
    console.warn('   ⚠️ Lỗi quét inventory group hoặc chưa có tủ đồ nào:', err.message);
  }

  console.log(`\n✅ Tổng số tài khoản khách hàng thực cần bảo vệ: ${realUserUids.size}`);

  // 5. Quét danh sách tài khoản trong Firebase Authentication
  console.log('\n🔍 Bước 5: Truy xuất danh sách người dùng từ Firebase Authentication...');
  const spamUsers = [];
  let nextPageToken;
  let totalAuthScanned = 0;
  let safeByDateCount = 0;
  let safeByActivityCount = 0;

  do {
    const listUsersResult = await auth.listUsers(1000, nextPageToken);
    totalAuthScanned += listUsersResult.users.length;

    listUsersResult.users.forEach(userRecord => {
      const email = (userRecord.email || '').toLowerCase().trim();
      const uid = userRecord.uid;
      const creationTime = new Date(userRecord.metadata.creationTime);

      const isWhitelist = whitelistEmails.includes(email);
      const isRealUser = realUserUids.has(uid) || realUserEmails.has(email);
      const isCreatedBeforeAttack = creationTime < ATTACK_START_DATE;

      if (isWhitelist || isRealUser) {
        safeByActivityCount++;
        return; // Hợp lệ, giữ lại
      }

      if (isCreatedBeforeAttack) {
        safeByDateCount++;
        return; // Hợp lệ vì đăng ký trước ngày bị tấn công, giữ lại
      }

      // Nếu không thỏa mãn bất kỳ điều kiện giữ lại nào -> Đánh dấu là spam
      spamUsers.push({
        uid: uid,
        email: email || '(Không có email)',
        displayName: userRecord.displayName || '',
        createdAt: creationTime.toISOString(),
      });
    });

    nextPageToken = listUsersResult.nextPageToken;
  } while (nextPageToken);

  console.log(`📋 Tổng số tài khoản đăng ký trong Auth: ${totalAuthScanned}`);
  console.log(`🛡️ Số tài khoản an toàn nhờ ngày tạo (trước cuộc tấn công): ${safeByDateCount}`);
  console.log(`🛡️ Số tài khoản an toàn nhờ có hoạt động/ví tiền/VIP: ${safeByActivityCount}`);
  console.log(`⚠️ Phát hiện ${spamUsers.length} tài khoản nghi vấn rác (tạo sau mốc tấn công, coins = 0, không VIP, không mua bán gì).`);

  if (spamUsers.length === 0) {
    console.log('\n🎉 Không phát hiện tài khoản rác nào. Hệ thống của bạn an toàn!');
    return;
  }

  // 6. Ghi file Preview hoặc Thực hiện xóa
  if (DRY_RUN) {
    const previewFile = './spam-users-preview.json';
    fs.writeFileSync(previewFile, JSON.stringify(spamUsers, null, 2), 'utf-8');
    console.log('\n==================================================================');
    console.log(`💾 ĐÃ LƯU DANH SÁCH XEM TRƯỚC VÀO FILE: ${previewFile}`);
    console.log('👉 Vui lòng mở file này để kiểm tra danh sách email rác.');
    console.log('👉 Nếu danh sách chính xác, hãy đổi DRY_RUN = false ở đầu file script này và chạy lại.');
    console.log('==================================================================');
  } else {
    console.log(`\n🚀 Bắt đầu xóa thực tế ${spamUsers.length} tài khoản rác khỏi hệ thống...`);
    const spamUids = spamUsers.map(u => u.uid);
    const batchSize = 100;

    for (let i = 0; i < spamUids.length; i += batchSize) {
      const chunk = spamUids.slice(i, i + batchSize);

      // A. Xóa khỏi Auth
      try {
        await auth.deleteUsers(chunk);
        console.log(`🗑️ Đã xóa ${chunk.length} tài khoản khỏi Authentication (${Math.min(i + batchSize, spamUids.length)}/${spamUids.length})`);
      } catch (err) {
        console.error(`❌ Lỗi khi xóa tài khoản Auth:`, err.message);
      }

      // B. Xóa tài liệu Firestore tương ứng
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

    console.log('\n==================================================================');
    console.log('🎉 HOÀN TẤT DỌN DẸP TÀI KHOẢN RÁC THÀNH CÔNG!');
    console.log('==================================================================');
  }
}

runSafeCleanup().catch(err => {
  console.error('🔥 Lỗi nghiêm trọng xảy ra trong quá trình chạy script:', err);
});
