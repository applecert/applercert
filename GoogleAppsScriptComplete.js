// =========================================================================
// MÃ NGUỒN TOÀN DIỆN GOOGLE APPS SCRIPT CHO HỆ THỐNG IPAVIET (SYNC MỚI NHẤT)
// =========================================================================
// HƯỚNG DẪN: Sếp chỉ cần copy TOÀN BỘ file này và dán đè (thay thế hoàn toàn)
// vào Trình chỉnh sửa Apps Script của sếp, sau đó Lưu và Triển khai lại là xong!
// =========================================================================

// ================================================================
// CẤU HÌNH HỆ THỐNG IPAVIET (Điền cấu hình của sếp tại đây)
// ================================================================
var SECRET_ADMIN_PASS = "YOUR_SECRET_ADMIN_PASS"; 
var TELEGRAM_TOKEN = "YOUR_TELEGRAM_TOKEN"; 
var ADMIN_CHAT_ID = "YOUR_ADMIN_CHAT_ID"; 
var STC_TOKEN = "YOUR_STC_TOKEN"; 

// --- CẤU HÌNH API MỚI (BESTIESTUDIO / BEARS MARKET) ---
var KINGMMO_API_KEY = "YOUR_KINGMMO_API_KEY";
var KINGMMO_API_SECRET = "YOUR_KINGMMO_API_SECRET";
var KINGMMO_BASE_URL = "https://www.bestiestudio.com/api/v1"; 

// --- CẤU HÌNH FIREBASE ĐỂ TỰ ĐỘNG CẬP NHẬT VIP TỪ BACKEND ---
var FIREBASE_PROJECT_ID = "ipaviet-st"; 
var FIREBASE_API_KEY = "YOUR_FIREBASE_API_KEY"; 

// Hàm hỗ trợ gửi Telegram an toàn
function sendTelegramMsg(msg) {
  try {
    if (!TELEGRAM_TOKEN || !ADMIN_CHAT_ID || TELEGRAM_TOKEN === "YOUR_TELEGRAM_TOKEN") return;
    var url = "https://api.telegram.org/bot" + TELEGRAM_TOKEN + "/sendMessage";
    UrlFetchApp.fetch(url, { 
      "method": "post", 
      "contentType": "application/json", 
      "payload": JSON.stringify({
        "chat_id": ADMIN_CHAT_ID, 
        "text": msg, 
        "parse_mode": "Markdown"
      }), 
      "muteHttpExceptions": true 
    });
  } catch(e) {
    // Bỏ qua lỗi gửi tin nhắn để không làm sập luồng chính
  }
}

/**
 * Hàm cập nhật VIP trực tiếp lên Firestore từ Server-side (REST API)
 */
function updateVipOnFirestore(uid, addedDays) {
  try {
    if (!FIREBASE_PROJECT_ID || FIREBASE_PROJECT_ID === "IPAVIET-PROJECT-ID" || !FIREBASE_API_KEY || FIREBASE_API_KEY === "YOUR_FIREBASE_API_KEY") {
      sendTelegramMsg("⚠️ Lỗi cấu hình Firebase Project ID hoặc API Key trong Apps Script.");
      return false;
    }
    
    // 1. Lấy thông tin user hiện tại từ Firestore
    var getUrl = "https://firestore.googleapis.com/v1/projects/" + FIREBASE_PROJECT_ID + "/databases/(default)/documents/users/" + uid + "?key=" + FIREBASE_API_KEY;
    var getRes = UrlFetchApp.fetch(getUrl, { "method": "get", "muteHttpExceptions": true });
    
    var currentExpiry = Date.now();
    if (getRes.getResponseCode() === 200) {
      var userDoc = JSON.parse(getRes.getContentText());
      if (userDoc.fields && userDoc.fields.vipExpire) {
        var docExpiry = 0;
        if (userDoc.fields.vipExpire.timestampValue) {
          docExpiry = new Date(userDoc.fields.vipExpire.timestampValue).getTime();
        } else if (userDoc.fields.vipExpire.integerValue) {
          docExpiry = parseInt(userDoc.fields.vipExpire.integerValue);
        }
        if (docExpiry > currentExpiry) {
          currentExpiry = docExpiry;
        }
      }
    }
    
    var newExpiry = currentExpiry + (addedDays * 24 * 60 * 60 * 1000);
    var newExpiryIso = new Date(newExpiry).toISOString();
    
    // 2. Gửi lệnh cập nhật ghi đè trường isVip và vipExpire
    var patchUrl = getUrl + "&updateMask.fieldPaths=isVip&updateMask.fieldPaths=vipExpire";
    var patchPayload = {
      "name": "projects/" + FIREBASE_PROJECT_ID + "/databases/(default)/documents/users/" + uid,
      "fields": {
        "isVip": { "booleanValue": true },
        "vipExpire": { "timestampValue": newExpiryIso }
      }
    };
    
    var patchRes = UrlFetchApp.fetch(patchUrl, {
      "method": "PATCH",
      "contentType": "application/json",
      "payload": JSON.stringify(patchPayload),
      "muteHttpExceptions": true
    });
    
    var responseCode = patchRes.getResponseCode();
    if (responseCode !== 200) {
      sendTelegramMsg("⚠️ Lỗi Firestore REST API khi mua VIP cho UID " + uid + " (Code " + responseCode + "): " + patchRes.getContentText());
      return false;
    }
    return true;
  } catch(e) {
    sendTelegramMsg("⚠️ Lỗi khi cập nhật Firestore cho UID " + uid + ": " + e.toString());
    return false;
  }
}

// ===================================================================
// HÀM HỖ TRỢ GỬI THÔNG BÁO PUSH HÀNG LOẠT (EXPO PUSH API V2)
// ===================================================================
function sendPushToAll(title, body, url) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetTokens = ss.getSheetByName("PushTokens");
  if (!sheetTokens) return { success: false, error: "Không tìm thấy bảng PushTokens" };
  
  var dataTokens = sheetTokens.getDataRange().getValues();
  var tokens = [];
  for (var i = 1; i < dataTokens.length; i++) {
    if (dataTokens[i][0]) {
      tokens.push(dataTokens[i][0]);
    }
  }
  
  if (tokens.length === 0) {
    return { success: true, count: 0, total: 0, message: "Không có thiết bị đăng ký" };
  }
  
  var chunkSize = 100;
  var sentCount = 0;
  
  for (var i = 0; i < tokens.length; i += chunkSize) {
    var chunk = tokens.slice(i, i + chunkSize);
    var messages = chunk.map(function(token) {
      return {
        to: token,
        sound: "default",
        title: title,
        body: body,
        data: url ? { installUrl: url } : {}
      };
    });
    
    try {
      var response = UrlFetchApp.fetch("https://exp.host/--/api/v2/push/send", {
        "method": "post",
        "contentType": "application/json",
        "payload": JSON.stringify(messages),
        "muteHttpExceptions": true
      });
      
      if (response.getResponseCode() === 200) {
        try {
          var resJson = JSON.parse(response.getContentText());
          if (resJson && Array.isArray(resJson.data)) {
            for (var k = 0; k < resJson.data.length; k++) {
              if (resJson.data[k] && resJson.data[k].status === "ok") {
                sentCount++;
              }
            }
          } else {
            sentCount += chunk.length;
          }
        } catch(e) {
          sentCount += chunk.length;
        }
      }
    } catch(err) {
      // Bỏ qua lỗi lô này để chạy tiếp
    }
  }
  
  return { success: true, count: sentCount, total: tokens.length };
}

// ===================================================================
// HÀM KHỞI TẠO TRIGGER TỰ ĐỘNG CHẠY MỖI PHÚT (CHẠY 1 LẦN DUY NHẤT)
// ===================================================================
function setupAutoPushTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "checkAndSendScheduledPushes") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger("checkAndSendScheduledPushes")
    .timeBased()
    .everyMinutes(1)
    .create();
  
  sendTelegramMsg("🔔 *HỆ THỐNG VSign PUSH*:\nKhởi tạo thành công Trigger quét gửi thông báo đẩy tự động mỗi phút!");
}

// ===================================================================
// HÀM HỖ TRỢ XỬ LÝ MÚI GIỜ KHI ĐỌC NGÀY GIỜ TỚI GIỜ HẸN
// ===================================================================
function parseDateInTz(dateVal, tz) {
  if (!dateVal) return 0;
  
  if (dateVal instanceof Date) {
    var scriptTz = Session.getScriptTimeZone();
    var calendarStr = Utilities.formatDate(dateVal, scriptTz, "yyyy-MM-dd HH:mm:ss");
    return parseCalendarStrInTz(calendarStr, tz);
  }
  
  var str = String(dateVal).trim();
  
  if (str.indexOf('Z') !== -1 || (str.indexOf('+') !== -1 && str.indexOf('T') !== -1)) {
    var t = new Date(str).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  
  var parts = str.split(/[\s/:-T]+/);
  if (parts.length >= 6) {
    var day, month, year, hour, min, sec;
    if (parts[0].length === 4) { // YYYY/MM/DD
      year = parts[0];
      month = parts[1];
      day = parts[2];
    } else { // DD/MM/YYYY
      day = parts[0];
      month = parts[1];
      year = parts[2];
    }
    hour = parts[3];
    min = parts[4];
    sec = parts[5];
    
    if (sec.indexOf('.') !== -1) {
      sec = sec.split('.')[0];
    }
    
    var calendarStr = year + "-" + month + "-" + day + " " + hour + ":" + min + ":" + sec;
    return parseCalendarStrInTz(calendarStr, tz);
  }
  
  var t = new Date(str).getTime();
  return isNaN(t) ? 0 : t;
}

function parseCalendarStrInTz(calendarStr, tz) {
  try {
    var utcDate = new Date(calendarStr.replace(' ', 'T') + 'Z');
    var utcTime = utcDate.getTime();
    
    var formattedInTz = Utilities.formatDate(utcDate, tz, "yyyy-MM-dd HH:mm:ss");
    var dateInTz = new Date(formattedInTz.replace(' ', 'T') + 'Z');
    var offset = dateInTz.getTime() - utcTime;
    
    return utcTime - offset;
  } catch (e) {
    return 0;
  }
}

// ===================================================================
// TRIGGER HẸN GIỜ: CHẠY ĐỂ QUÉT VÀ GỬI THÔNG BÁO TỚI GIỜ HẸN
// ===================================================================
function checkAndSendScheduledPushes() {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return;
  }
  
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetScheduled = ss.getSheetByName("ScheduledPushes");
    if (!sheetScheduled) return;
    
    var dataScheduled = sheetScheduled.getDataRange().getValues();
    var now = new Date().getTime();
    var tz = ss.getSpreadsheetTimeZone();
    
    for (var i = 1; i < dataScheduled.length; i++) {
      var status = dataScheduled[i][5];
      if (status === "PENDING") {
        var scheduledTimeVal = dataScheduled[i][4];
        var scheduledTime = parseDateInTz(scheduledTimeVal, tz);
        
        if (scheduledTime > 0 && scheduledTime <= now) {
          var row = i + 1;
          sheetScheduled.getRange(row, 6).setValue("SENDING");
          SpreadsheetApp.flush();
          
          var title = dataScheduled[i][1];
          var body = dataScheduled[i][2];
          var url = dataScheduled[i][3];
          
          var result = sendPushToAll(title, body, url);
          if (result.success) {
            var sentCountStr = result.count + "/" + result.total;
            sheetScheduled.getRange(row, 6).setValue("SENT");
            sheetScheduled.getRange(row, 8).setValue(sentCountStr);
            
            sendTelegramMsg("🔔 *THÔNG BÁO HẸN GIỜ ĐÃ GỬI*\n" +
                            "📝 Tiêu đề: *" + title + "*\n" +
                            "💬 Nội dung: " + body + "\n" +
                            "🔗 Link: " + (url || "Không có") + "\n" +
                            "👥 Trạng thái: Đã gửi thành công *" + sentCountStr + "* thiết bị!");
          } else {
            sheetScheduled.getRange(row, 6).setValue("FAILED: " + (result.error || "Lỗi"));
            sheetScheduled.getRange(row, 8).setValue("0");
            
            sendTelegramMsg("⚠️ *THÔNG BÁO HẸN GIỜ GỬI THẤT BẠI*\n" +
                            "📝 Tiêu đề: *" + title + "*\n" +
                            "❌ Lỗi: " + (result.error || "Lỗi không xác định"));
          }
        }
      }
    }
  } finally {
    lock.releaseLock();
  }
}

// ===================================================================
// HÀM doGet(e) - CHỨA CẢ LỆNH QUÉT Q&A AI TỰ HỌC
// ===================================================================
function doGet(e) {
  var output = ContentService.createTextOutput().setMimeType(ContentService.MimeType.JSON);
  
  try {
    var action = e ? e.parameter.action : null;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetThuNgan = ss.getSheetByName("ThuNgan") || ss.getSheets()[0];
    var sheetDonMMO = ss.getSheetByName("DonMMO");
    var sheetConfigMMO = ss.getSheetByName("ConfigMMO");

    // =========================================================
    // NEW ACTION: TẢI BẢNG CÂU HỎI Q&A CHO TRỢ LÝ AI TỰ HỌC
    // =========================================================
    if (action === 'get_ai_qa') {
      var qaSheet = ss.getSheetByName("AI_Knowledge");
      if (!qaSheet) {
        qaSheet = ss.insertSheet("AI_Knowledge");
        qaSheet.appendRow(["Question", "Answer"]);
        qaSheet.appendRow(["lỗi cert", "Nếu gặp lỗi chứng chỉ bị thu hồi hoặc văng ứng dụng, sếp vui lòng gia hạn gói VIP mới để nhận chứng chỉ liên kết thiết bị mới, hoặc nhắn tin Admin t.me/ipaviet để mua Chứng Chỉ riêng (Cert Riêng) bảo hành trọn đời nhé!"]);
        qaSheet.appendRow(["cách cài vsign", "Để cài đặt ứng dụng VSign chính chủ, sếp truy cập trang: vsign.html và bấm 'Cài đặt trực tiếp', sau đó vào Cài đặt iOS > Quản lý VPN & Thiết bị để Tin cậy chứng chỉ là xong ạ."]);
        qaSheet.appendRow(["không tải được app", "Nếu tải app bị lỗi, sếp kiểm tra lại dung lượng trống của máy, hoặc kiểm tra xem tài khoản đã đăng ký VIP chưa nhé. Hội viên VIP sẽ tải được mọi app ở Kho VIP mượt mà."]);
        ss.flush();
      }
      
      var data = qaSheet.getDataRange().getValues();
      var qaList = [];
      for (var i = 1; i < data.length; i++) {
        var question = data[i][0] ? data[i][0].toString().trim() : "";
        var answer = data[i][1] ? data[i][1].toString().trim() : "";
        if (question !== "") {
          qaList.push({
            question: question,
            answer: answer
          });
        }
      }
      return output.setContent(JSON.stringify(qaList)).setHeader('Access-Control-Allow-Origin', '*');
    }

    // =========================================================
    // TỰ ĐỘNG TẠO CÁC SHEET HỆ THỐNG NẾU CHƯA CÓ
    // =========================================================
    var sheetCertApple = ss.getSheetByName("CERTAPPLE");
    if (!sheetCertApple) {
      sheetCertApple = ss.insertSheet("CERTAPPLE");
      sheetCertApple.appendRow(["Mã Đơn", "UID Khách", "Mã Gói", "Số Lượng", "Trạng Thái", "Mã UDID", "Thời Gian", "Tên Gói", "Tổng Tiền", "Thanh Toán"]);
      sheetCertApple.setFrozenRows(1);
      sheetCertApple.getRange("A1:J1").setFontWeight("bold");
    }

    var sheetCoupons = ss.getSheetByName("COUPONS");
    if (!sheetCoupons) {
      sheetCoupons = ss.insertSheet("COUPONS");
      sheetCoupons.appendRow(["Mã Code", "Loại (PERCENT/CASH)", "Giá Trị Giảm", "Trạng Thái (ACTIVE/OFF)", "Mô Tả"]);
      sheetCoupons.appendRow(["KM23", "PERCENT", "10", "ACTIVE", "Giảm 10% tổng đơn"]); 
      sheetCoupons.setFrozenRows(1);
      sheetCoupons.getRange("A1:E1").setFontWeight("bold");
    }
    
    var sheetTokens = ss.getSheetByName("PushTokens");
    if (!sheetTokens) {
      sheetTokens = ss.insertSheet("PushTokens");
      sheetTokens.appendRow(["Token", "UID", "Platform", "Updated At"]);
      sheetTokens.setFrozenRows(1);
      sheetTokens.getRange("A1:D1").setFontWeight("bold");
    }
    
    var sheetScheduled = ss.getSheetByName("ScheduledPushes");
    if (!sheetScheduled) {
      sheetScheduled = ss.insertSheet("ScheduledPushes");
      sheetScheduled.appendRow(["ID", "Title", "Body", "Action URL", "Scheduled Time", "Status", "Created At", "Sent Count"]);
      sheetScheduled.setFrozenRows(1);
      sheetScheduled.getRange("A1:H1").setFontWeight("bold");
    }

    var sheetPhienBan = ss.getSheetByName("PhienBan");
    if (!sheetPhienBan) {
      sheetPhienBan = ss.insertSheet("PhienBan");
      sheetPhienBan.appendRow(["Phiên Bản", "Bảo Trì (TRUE/FALSE)", "Thông Báo", "Tiêu Đề", "Cập Nhật Cuối"]);
      sheetPhienBan.appendRow(["1.0.0", "FALSE", "Hệ thống đang bảo trì phiên bản này để nâng cấp dịch vụ. Vui lòng quay lại sau.", "BẢO TRÌ PHIÊN BẢN", "'" + new Date().toISOString()]);
      sheetPhienBan.setFrozenRows(1);
      sheetPhienBan.getRange("A1:E1").setFontWeight("bold");
    }

    var sheetShortcuts = ss.getSheetByName("Shortcuts");
    if (!sheetShortcuts) {
      sheetShortcuts = ss.insertSheet("Shortcuts");
      sheetShortcuts.appendRow([
        "ID", "Name", "IconUrl", "Icon", "IconColor", 
        "IosVersion", "Category", "Popularity", "IsNew", 
        "Rating", "Downloads", "Description", "MainFunction", 
        "Instructions", "CommonErrors", "Notes", "ShortcutUrl", 
        "VideoUrl", "TutorialImages"
      ]);
      sheetShortcuts.setFrozenRows(1);
      sheetShortcuts.getRange("A1:S1").setFontWeight("bold");
    }

    // =========================================================
    // XỬ LÝ ĐIỀU HƯỚNG ACTIONS (GET)
    // =========================================================
    if (action === 'get_shortcuts') {
      var data = sheetShortcuts.getDataRange().getValues();
      var list = [];
      for (var i = 1; i < data.length; i++) {
        var inst = [];
        var errs = [];
        var imgs = [];
        try { inst = JSON.parse(data[i][13] || "[]"); } catch(e) {}
        try { errs = JSON.parse(data[i][14] || "[]"); } catch(e) {}
        try { imgs = JSON.parse(data[i][18] || "[]"); } catch(e) {}
        
        list.push({
          id: String(data[i][0]),
          name: String(data[i][1]),
          iconUrl: String(data[i][2]),
          icon: String(data[i][3]),
          iconColor: String(data[i][4]),
          iosVersion: String(data[i][5]),
          category: String(data[i][6]),
          popularity: String(data[i][7]),
          isNew: String(data[i][8]).toLowerCase() === "true" || data[i][8] === true,
          rating: parseFloat(data[i][9]) || 5.0,
          downloads: String(data[i][10]),
          description: String(data[i][11]),
          mainFunction: String(data[i][12]),
          instructions: inst,
          commonErrors: errs,
          notes: String(data[i][15]),
          shortcutUrl: String(data[i][16]),
          videoUrl: String(data[i][17]),
          tutorialImages: imgs
        });
      }
      return output.setContent(JSON.stringify({ success: true, data: list })).setHeader('Access-Control-Allow-Origin', '*');
    }

    if (action === 'register_push_token') {
      var token = e.parameter.token;
      var uid = e.parameter.uid || "";
      var platform = e.parameter.platform || "";
      if (!token) return output.setContent(JSON.stringify({ success: false, error: "Thiếu Token" })).setHeader('Access-Control-Allow-Origin', '*');
      
      var dataTokens = sheetTokens.getDataRange().getValues();
      var foundRow = -1;
      for (var i = 1; i < dataTokens.length; i++) {
        if (dataTokens[i][0] === token) {
          foundRow = i + 1;
          break;
        }
      }
      
      var nowStr = new Date().toISOString();
      if (foundRow !== -1) {
        sheetTokens.getRange(foundRow, 2, 1, 3).setValues([[uid, platform, nowStr]]);
      } else {
        sheetTokens.appendRow([token, uid, platform, nowStr]);
      }
      return output.setContent(JSON.stringify({ success: true })).setHeader('Access-Control-Allow-Origin', '*');
    }
    
    if (action === 'get_push_tokens_count') {
      if (String(e.parameter.pin) !== String(SECRET_ADMIN_PASS)) return output.setContent(JSON.stringify({ success: false, error: "Sai PIN" })).setHeader('Access-Control-Allow-Origin', '*');
      var count = Math.max(0, sheetTokens.getLastRow() - 1);
      return output.setContent(JSON.stringify({ success: true, count: count })).setHeader('Access-Control-Allow-Origin', '*');
    }
    
    if (action === 'send_push_now') {
      if (String(e.parameter.pin) !== String(SECRET_ADMIN_PASS)) return output.setContent(JSON.stringify({ success: false, error: "Sai PIN" })).setHeader('Access-Control-Allow-Origin', '*');
      var title = e.parameter.title;
      var body = e.parameter.body;
      var url = e.parameter.url || "";
      var result = sendPushToAll(title, body, url);
      
      try {
        var pushId = "PUSH" + Date.now();
        var status = result.success ? "SENT" : "FAILED: " + (result.error || "Lỗi");
        var countStr = result.success ? (result.count + "/" + result.total) : "0";
        sheetScheduled.appendRow([pushId, title, body, url, "'" + new Date().toISOString(), status, "'" + new Date().toISOString(), countStr]);
        
        if (result.success) {
          sendTelegramMsg("📢 *THÔNG BÁO GỬI NGAY THÀNH CÔNG*\n" +
                          "📝 Tiêu đề: *" + title + "*\n" +
                          "💬 Nội dung: " + body + "\n" +
                          "🔗 Link: " + (url || "Không có") + "\n" +
                          "👥 Trạng thái: Đã gửi thành công *" + countStr + "* thiết bị!");
        } else {
          sendTelegramMsg("⚠️ *THÔNG BÁO GỬI NGAY THẤT BẠI*\n" +
                          "📝 Tiêu đề: *" + title + "*\n" +
                          "❌ Lỗi: " + (result.error || "Lỗi không xác định"));
        }
      } catch (err) {}
      
      return output.setContent(JSON.stringify(result)).setHeader('Access-Control-Allow-Origin', '*');
    }
    
    if (action === 'schedule_push') {
      if (String(e.parameter.pin) !== String(SECRET_ADMIN_PASS)) return output.setContent(JSON.stringify({ success: false, error: "Sai PIN" })).setHeader('Access-Control-Allow-Origin', '*');
      var title = e.parameter.title;
      var body = e.parameter.body;
      var url = e.parameter.url || "";
      var timeStr = e.parameter.time;
      
      if (!title || !body || !timeStr) {
        return output.setContent(JSON.stringify({ success: false, error: "Nhập thiếu tiêu đề, nội dung hoặc thời gian." })).setHeader('Access-Control-Allow-Origin', '*');
      }
      
      var pushId = "PUSH" + Date.now();
      sheetScheduled.appendRow([pushId, title, body, url, "'" + timeStr, "PENDING", "'" + new Date().toISOString()]);
      return output.setContent(JSON.stringify({ success: true })).setHeader('Access-Control-Allow-Origin', '*');
    }
    
    if (action === 'get_scheduled_pushes') {
      if (String(e.parameter.pin) !== String(SECRET_ADMIN_PASS)) return output.setContent(JSON.stringify({ success: false, error: "Sai PIN" })).setHeader('Access-Control-Allow-Origin', '*');
      
      try {
        checkAndSendScheduledPushes();
      } catch(err) {}

      var data = sheetScheduled.getDataRange().getValues();
      var list = [];
      for (var i = 1; i < data.length; i++) {
        list.push({
          row: i + 1,
          id: data[i][0],
          title: data[i][1],
          body: data[i][2],
          url: data[i][3],
          time: data[i][4],
          status: data[i][5],
          createdAt: data[i][6],
          sentCount: data[i][7] !== undefined ? data[i][7] : ""
        });
      }
      return output.setContent(JSON.stringify({ success: true, data: list.reverse() })).setHeader('Access-Control-Allow-Origin', '*');
    }
    
    if (action === 'delete_scheduled_push') {
      if (String(e.parameter.pin) !== String(SECRET_ADMIN_PASS)) return output.setContent(JSON.stringify({ success: false, error: "Sai PIN" })).setHeader('Access-Control-Allow-Origin', '*');
      var row = parseInt(e.parameter.row);
      if (row > 1 && row <= sheetScheduled.getLastRow()) {
        sheetScheduled.deleteRow(row);
        return output.setContent(JSON.stringify({ success: true })).setHeader('Access-Control-Allow-Origin', '*');
      }
      return output.setContent(JSON.stringify({ success: false, error: "Dòng không hợp lệ." })).setHeader('Access-Control-Allow-Origin', '*');
    }

    if (action === 'check_coupon') {
      var codeInput = e.parameter.code ? String(e.parameter.code).trim().toUpperCase() : "";
      if (!codeInput) return output.setContent(JSON.stringify({ success: false, error: "Vui lòng nhập mã" })).setHeader('Access-Control-Allow-Origin', '*');

      var couponData = sheetCoupons.getDataRange().getValues();
      for (var i = 1; i < couponData.length; i++) {
        if (String(couponData[i][0]).trim().toUpperCase() === codeInput) {
          if (String(couponData[i][3]).trim().toUpperCase() !== "ACTIVE") {
            return output.setContent(JSON.stringify({ success: false, error: "Mã giảm giá đã hết hạn hoặc bị tắt" })).setHeader('Access-Control-Allow-Origin', '*');
          }
          return output.setContent(JSON.stringify({
            success: true,
            code: couponData[i][0],
            type: couponData[i][1],
            value: parseFloat(couponData[i][2]) || 0,
            desc: couponData[i][4]
          })).setHeader('Access-Control-Allow-Origin', '*');
        }
      }
      return output.setContent(JSON.stringify({ success: false, error: "Mã giảm giá không tồn tại" })).setHeader('Access-Control-Allow-Origin', '*');
    }

    if (action === 'check_maintenance') {
      var isMaintenance = false;
      if (sheetConfigMMO) {
        var dataCfg = sheetConfigMMO.getDataRange().getValues();
        for (var i = 1; i < dataCfg.length; i++) {
          if (String(dataCfg[i][0]) === 'SYSTEM___MAINTENANCE') {
            isMaintenance = (String(dataCfg[i][4]).toUpperCase() === "TRUE");
            break;
          }
        }
      }
      if (e.parameter.pin && String(e.parameter.pin) === String(SECRET_ADMIN_PASS)) {
        isMaintenance = false;
      }
      return output.setContent(JSON.stringify({ maintenance: isMaintenance })).setHeader('Access-Control-Allow-Origin', '*');
    }

    if (action === 'check_version_maintenance') {
      var version = e.parameter.version || "1.0.0";
      var isMaintenance = false;
      var title = "BẢO TRÌ PHIÊN BẢN";
      var msg = "Hệ thống đang bảo trì phiên bản này để nâng cấp dịch vụ. Vui lòng quay lại sau.";
      
      if (sheetConfigMMO) {
        var dataCfg = sheetConfigMMO.getDataRange().getValues();
        for (var i = 1; i < dataCfg.length; i++) {
          if (String(dataCfg[i][0]) === 'SYSTEM___MAINTENANCE') {
            if (String(dataCfg[i][4]).toUpperCase() === "TRUE") {
              isMaintenance = true;
              msg = "Hệ thống đang bảo trì toàn diện để nâng cấp dịch vụ. Vui lòng quay lại sau.";
              title = "HỆ THỐNG BẢO TRÌ CHUNG";
              break;
            }
          }
        }
      }

      if (!isMaintenance && sheetPhienBan) {
        var dataVersions = sheetPhienBan.getDataRange().getValues();
        var found = false;
        for (var i = 1; i < dataVersions.length; i++) {
          if (String(dataVersions[i][0]).trim() === version.trim()) {
            found = true;
            if (String(dataVersions[i][1]).toUpperCase() === "TRUE") {
              isMaintenance = true;
              msg = dataVersions[i][2] || msg;
              title = dataVersions[i][3] || title;
            }
            break;
          }
        }
        
        if (!found) {
          sheetPhienBan.appendRow([version, "FALSE", msg, title, "'" + new Date().toISOString()]);
        }
      }
      
      if (e.parameter.pin && String(e.parameter.pin) === String(SECRET_ADMIN_PASS)) {
        isMaintenance = false;
      }
      
      return output.setContent(JSON.stringify({ success: true, maintenance: isMaintenance, msg: msg, title: title })).setHeader('Access-Control-Allow-Origin', '*');
    }

    if (action === 'get_versions') {
      if (String(e.parameter.pin) !== String(SECRET_ADMIN_PASS)) return output.setContent(JSON.stringify({ success: false, error: "Sai PIN" })).setHeader('Access-Control-Allow-Origin', '*');
      var list = [];
      if (sheetPhienBan) {
        var dataVersions = sheetPhienBan.getDataRange().getValues();
        for (var i = 1; i < dataVersions.length; i++) {
          list.push({
            version: String(dataVersions[i][0]),
            maintenanceShow: String(dataVersions[i][1]).toUpperCase() === "TRUE",
            maintenanceMsg: String(dataVersions[i][2]),
            maintenanceTitle: String(dataVersions[i][3]),
            updatedAt: String(dataVersions[i][4])
          });
        }
      }
      return output.setContent(JSON.stringify({ success: true, versions: list.reverse() })).setHeader('Access-Control-Allow-Origin', '*');
    }

    if (action === 'get_ipa_data') { 
      return output.setContent(UrlFetchApp.fetch('https://raw.githubusercontent.com/apptesters-org/AppTesters_Repo/main/apps.json', { "muteHttpExceptions": true }).getContentText()).setHeader('Access-Control-Allow-Origin', '*'); 
    }
    
    if (action === 'create_order') {
      var lock = LockService.getScriptLock();
      try {
        lock.waitLock(10000);
        sheetThuNgan.appendRow([e.parameter.orderId, e.parameter.uid, parseInt(e.parameter.amount), parseInt(e.parameter.amount), "PENDING", new Date().toISOString(), e.parameter.coins || "0"]);
        return output.setContent(JSON.stringify({success: true})).setHeader('Access-Control-Allow-Origin', '*');
      } finally { lock.releaseLock(); }
    }

    if (action === 'check_stc_payment') {
      var lock = LockService.getScriptLock();
      try {
        lock.waitLock(10000);
        var orderId = String(e.parameter.orderId).trim().toUpperCase(); 
        var dataSheet = sheetThuNgan.getDataRange().getValues();
        var isPending = false; 
        var rowToUpdate = -1;
        var uid = "";
        var coins = 0;
        
        for (var row = 1; row < dataSheet.length; row++) {
          if (String(dataSheet[row][0]).trim().toUpperCase() === orderId) {
            uid = dataSheet[row][1];
            coins = parseInt(dataSheet[row][6]) || 0;
            
            if (dataSheet[row][4] === "CLAIMED") return output.setContent(JSON.stringify({success: true, amount: dataSheet[row][2], coins: coins})).setHeader('Access-Control-Allow-Origin', '*');
            if (dataSheet[row][4] === "PENDING") { isPending = true; rowToUpdate = row + 1; break; }
          }
        }
        if (!isPending) return output.setContent(JSON.stringify({success: false, error: "Đơn không tồn tại hoặc đã xử lý"})).setHeader('Access-Control-Allow-Origin', '*');
        
        var resApi = UrlFetchApp.fetch("https://api.sieuthicode.net/v1/transactions/list", { 
          "headers": { "Authorization": "Bearer " + STC_TOKEN },
          "muteHttpExceptions": true
        });
        
        if(resApi.getResponseCode() === 200) {
          var res = JSON.parse(resApi.getContentText());
          if (res.status === "success") {
            for (var i = 0; i < res.transactions.length; i++) {
              var tx = res.transactions[i];
              if (tx.type === "IN" && tx.description.toUpperCase().includes(orderId)) {
                var realAmount = parseInt(tx.amount);
                
                sheetThuNgan.getRange(rowToUpdate, 3, 1, 3).setValues([[realAmount, realAmount, "CLAIMED"]]);
                
                var isVipOrder = (orderId.indexOf("IPA") === 0);
                if (isVipOrder) {
                  var firebaseSuccess = updateVipOnFirestore(uid, coins);
                  sendTelegramMsg("👑 *MUA GÓI VIP THÀNH CÔNG!*\n💵 Số tiền: +" + realAmount.toLocaleString('vi-VN') + "đ\n💳 Mã đơn: `" + orderId + "`\n🔄 Firestore VIP: " + (firebaseSuccess ? "Thành công" : "Thất bại"));
                } else {
                  sendTelegramMsg("💰 *NẠP TIỀN VÍ THÀNH CÔNG!*\n💵 Số tiền: +" + realAmount.toLocaleString('vi-VN') + "đ\n💳 Mã đơn: `" + orderId + "`");
                }
                
                return output.setContent(JSON.stringify({success: true, amount: realAmount, coins: coins})).setHeader('Access-Control-Allow-Origin', '*');
              }
            }
          }
        }
        return output.setContent(JSON.stringify({success: false})).setHeader('Access-Control-Allow-Origin', '*');
      } catch (err) {
        return output.setContent(JSON.stringify({success: false, error: "Hệ thống bận, thử lại sau."})).setHeader('Access-Control-Allow-Origin', '*');
      } finally {
        lock.releaseLock();
      }
    }

    if (action === 'get_user_transactions') {
        if (!sheetThuNgan) return output.setContent(JSON.stringify({success: true, data: []})).setHeader('Access-Control-Allow-Origin', '*');
        var data = sheetThuNgan.getDataRange().getValues(); var result = [];
        for (var i = 1; i < data.length; i++) { if (String(data[i][1]) === String(e.parameter.uid)) result.push({ orderId: data[i][0], amount: data[i][2], status: data[i][4], time: data[i][5] }); }
        return output.setContent(JSON.stringify({success: true, data: result.reverse()})).setHeader('Access-Control-Allow-Origin', '*');
    }

    if (action === 'get_kingmmo_products') {
      try {
        var allScannedProducts = []; 
        var seenIds = {};
        var page = 1; var limit = 100; var hasMore = true; var maxPages = 5;

        while(hasMore && page <= maxPages) {
            var urlProducts = KINGMMO_BASE_URL + "/products/list?limit=" + limit + "&page=" + page; 
            var optionsFetch = {
              "method": "GET",
              "headers": {
                "X-API-Key": KINGMMO_API_KEY,
                "X-API-Secret": KINGMMO_API_SECRET
              },
              "muteHttpExceptions": true
            };

            var resApi = UrlFetchApp.fetch(urlProducts, optionsFetch);
            var kingMmoRaw;
            try { kingMmoRaw = JSON.parse(resApi.getContentText()); } catch(e) {
                return output.setContent(JSON.stringify({success: false, error: "Lỗi từ Server: " + resApi.getContentText()})).setHeader('Access-Control-Allow-Origin', '*');
            }

            if (kingMmoRaw.success && kingMmoRaw.data && kingMmoRaw.data.products) {
                var products = kingMmoRaw.data.products;
                for (var i = 0; i < products.length; i++) {
                    var p = products[i];
                    var catName = (p.category && p.category.name) ? p.category.name : "Chưa phân loại";
                    
                    if (p.plans && Array.isArray(p.plans)) {
                        for (var j = 0; j < p.plans.length; j++) {
                            var plan = p.plans[j];
                            var planId = String(plan.id); 

                            if (!seenIds[planId]) {
                                seenIds[planId] = true;
                                var displayName = p.name;
                                if (p.plans.length > 1 && plan.name) {
                                    displayName = p.name + " - " + plan.name;
                                }

                                var baseOriginalPrice = parseInt((plan.final_price !== undefined && plan.final_price !== null) ? plan.final_price : plan.price) || 0;
                                var autoMarkedUpPrice = Math.floor(baseOriginalPrice * 1.23);

                                var stock = 9999;
                                if (plan.stock_count !== undefined && plan.stock_count !== null) {
                                    stock = parseInt(plan.stock_count);
                                } else if (plan.in_stock === false) {
                                    stock = 0;
                                }

                                var planDesc = plan.description || p.description || "Sản phẩm chính hãng.";

                                allScannedProducts.push({ 
                                    id: planId, 
                                    name: String(displayName), 
                                    price: autoMarkedUpPrice,
                                    originalPrice: baseOriginalPrice,
                                    stock: stock, 
                                    cat: String(catName), 
                                    desc: String(planDesc) 
                                });
                            }
                        }
                    }
                }
                if (kingMmoRaw.data.pagination && kingMmoRaw.data.pagination.has_more) { page++; } else { hasMore = false; }
            } else {
                hasMore = false;
                if(page === 1) return output.setContent(JSON.stringify({success: false, error: kingMmoRaw.message || "Lỗi API Server"})).setHeader('Access-Control-Allow-Origin', '*');
            }
        }

        var configs = {}; var customProducts = []; 
        if (sheetConfigMMO) {
            var confData = sheetConfigMMO.getDataRange().getValues();
            for(var i = 1; i < confData.length; i++) {
                var cId = String(confData[i][0]);
                var isHidden = confData[i][4] === true || String(confData[i][4]).toUpperCase() === "TRUE";
                var cCat = confData[i][6] || ""; 
                var cStock = confData[i][7];
                var rawDesc = confData[i][8];
                var safeDesc = Object.prototype.toString.call(rawDesc) === '[object Date]' ? rawDesc.toISOString() : String(rawDesc || "");

                configs[cId] = { price: confData[i][1], fakePrice: confData[i][2], icon: confData[i][3], isHidden: isHidden, name: confData[i][5] || "", cat: cCat, stock: cStock, desc: safeDesc };
                
                if (cId.indexOf('CUSTOM_') === 0) {
                    var parsedStock = (cStock !== "" && cStock !== undefined) ? parseInt(cStock) : 9999;
                    if(isNaN(parsedStock)) parsedStock = 0;
                    customProducts.push({ id: cId, name: confData[i][5] || 'SP Thủ Công', cat: cCat || 'Khác', price: parseInt(confData[i][1]) || 0, fakePrice: parseInt(confData[i][2]) || 0, icon: confData[i][3], isHidden: isHidden, stock: parsedStock, desc: safeDesc, isCustom: true });
                }
            }
        }
        return output.setContent(JSON.stringify({ success: true, kingmmoProducts: allScannedProducts, configs: configs, customProducts: customProducts })).setHeader('Access-Control-Allow-Origin', '*');
      } catch (error) { return output.setContent(JSON.stringify({success: false, error: error.message})).setHeader('Access-Control-Allow-Origin', '*'); }
    }

    if (action === 'buy_cert_pending') {
      if (!sheetCertApple) return output.setContent(JSON.stringify({success: false, error: "Lỗi khởi tạo Sheet CERTAPPLE"})).setHeader('Access-Control-Allow-Origin', '*');
      var lock = LockService.getScriptLock();
      try {
        lock.waitLock(12000);
        var orderId = "CERT" + Date.now();
        var amount = parseInt(e.parameter.amount || 1);
        var pId = String(e.parameter.productId);
        var clientPrice = parseInt(e.parameter.price) || 0;
        var finalPrice = clientPrice; 
        var udid = e.parameter.udid ? String(e.parameter.udid).trim() : "Chưa cung cấp";

        if (sheetConfigMMO) {
            var dataCfg = sheetConfigMMO.getDataRange().getValues();
            for (var i = 1; i < dataCfg.length; i++) {
                if (String(dataCfg[i][0]) === pId) {
                    var serverPrice = parseInt(dataCfg[i][1]);
                    if (!isNaN(serverPrice)) { finalPrice = serverPrice * amount; }
                    var currentStock = dataCfg[i][7];
                    if (currentStock !== "" && !isNaN(currentStock)) {
                        var newStock = Math.max(0, parseInt(currentStock) - amount);
                        sheetConfigMMO.getRange(i + 1, 8).setValue(newStock); 
                    }
                    break;
                }
            }
        }
        sheetCertApple.appendRow([orderId, e.parameter.uid, pId, amount, "PENDING", udid, new Date().toISOString(), e.parameter.productName, finalPrice, "PENDING_PAYMENT"]);
        var teleMsg = "🛒 *KHÁCH VỪA MUA CHỨNG CHỈ*\n📦 SP: *" + e.parameter.productName + "*\n📱 UDID: `" + udid + "`\n💰 Giá trị: " + finalPrice.toLocaleString('vi-VN') + "đ\n💳 Đơn: `" + orderId + "`";
        sendTelegramMsg(teleMsg);
        return output.setContent(JSON.stringify({success: true, orderId: orderId})).setHeader('Access-Control-Allow-Origin', '*');
      } catch(err) { return output.setContent(JSON.stringify({success: false, error: "Lỗi tạo đơn: " + err.message})).setHeader('Access-Control-Allow-Origin', '*'); } finally { lock.releaseLock(); }
    }

    if (action === 'buy_mmo_pending') {
      if (!sheetDonMMO) return output.setContent(JSON.stringify({success: false, error: "Chưa tạo Sheet DonMMO"})).setHeader('Access-Control-Allow-Origin', '*');
      var lock = LockService.getScriptLock();
      try {
        lock.waitLock(12000);
        var orderId = "MMO" + Date.now();
        var amount = parseInt(e.parameter.amount || 1);
        var pId = String(e.parameter.productId);
        var clientPrice = parseInt(e.parameter.price) || 0;
        var finalPrice = clientPrice; 

        if (sheetConfigMMO) {
            var dataCfg = sheetConfigMMO.getDataRange().getValues();
            for (var i = 1; i < dataCfg.length; i++) {
                if (String(dataCfg[i][0]) === pId) {
                    var serverPrice = parseInt(dataCfg[i][1]);
                    if (!isNaN(serverPrice)) { finalPrice = serverPrice * amount; }
                    var currentStock = dataCfg[i][7];
                    if (currentStock !== "" && !isNaN(currentStock)) {
                        var newStock = Math.max(0, parseInt(currentStock) - amount);
                        sheetConfigMMO.getRange(i + 1, 8).setValue(newStock); 
                    }
                    break;
                }
            }
        }
        sheetDonMMO.appendRow([orderId, e.parameter.uid, pId, amount, "PENDING", "", new Date().toISOString(), e.parameter.productName, finalPrice, "PAID"]);
        sendTelegramMsg("🛒 *KHÁCH VỪA MUA MALL*\n📦 SP: " + e.parameter.productName + "\n💳 Đơn: `" + orderId + "`\n💰 Giá trị: " + finalPrice.toLocaleString() + "đ");
        return output.setContent(JSON.stringify({success: true, orderId: orderId})).setHeader('Access-Control-Allow-Origin', '*');
      } catch(err) { return output.setContent(JSON.stringify({success: false, error: "Lỗi tạo đơn: " + err.message})).setHeader('Access-Control-Allow-Origin', '*'); } finally { lock.releaseLock(); }
    }

    if (action === 'get_user_mmo_orders') {
      if (!sheetDonMMO) return output.setContent(JSON.stringify({success: true, data: []})).setHeader('Access-Control-Allow-Origin', '*');
      var data = sheetDonMMO.getDataRange().getValues(); var result = [];
      for(var i = 1; i < data.length; i++) { if(String(data[i][1]) === String(e.parameter.uid)) result.push({ orderId: data[i][0], productId: data[i][2], amount: data[i][3], status: data[i][4], accountData: data[i][5], time: data[i][6], productName: data[i][7], isPaid: data[i][9] === "PAID" }); }
      return output.setContent(JSON.stringify({success: true, data: result.reverse()})).setHeader('Access-Control-Allow-Origin', '*');
    }

    if (action === 'admin_get_all_mmo_orders') {
      if (String(e.parameter.pin) !== String(SECRET_ADMIN_PASS)) return output.setContent(JSON.stringify({success: false, error: "Sai PIN"})).setHeader('Access-Control-Allow-Origin', '*');
      if (!sheetDonMMO) return output.setContent(JSON.stringify({success: true, data: []})).setHeader('Access-Control-Allow-Origin', '*');
      var data = sheetDonMMO.getDataRange().getValues(); var allOrders = [];
      for(var i = 1; i < data.length; i++) { allOrders.push({ row: i + 1, orderId: data[i][0], uid: data[i][1], productId: data[i][2], amount: data[i][3], status: data[i][4], accountData: data[i][5], time: data[i][6], productName: data[i][7], price: data[i][8], isPaid: data[i][9] === "PAID" }); }
      return output.setContent(JSON.stringify({success: true, data: allOrders.reverse()})).setHeader('Access-Control-Allow-Origin', '*');
    }

    if (action === 'admin_fulfill_kingmmo') {
      if (String(e.parameter.pin) !== String(SECRET_ADMIN_PASS)) return output.setContent(JSON.stringify({success: false, error: "Sai PIN"})).setHeader('Access-Control-Allow-Origin', '*');
      var rowToUpdate = parseInt(e.parameter.row);
      try {
        var urlBuy = KINGMMO_BASE_URL + "/orders/create"; 
        var payloadData = {
          "items": [
            { "plan_id": parseInt(e.parameter.productId), "quantity": parseInt(e.parameter.amount) }
          ]
        };
        var optionsBuy = {
          "method": "POST",
          "headers": {
            "X-API-Key": KINGMMO_API_KEY,
            "X-API-Secret": KINGMMO_API_SECRET,
            "Content-Type": "application/json"
          },
          "payload": JSON.stringify(payloadData),
          "muteHttpExceptions": true 
        };
        var res = UrlFetchApp.fetch(urlBuy, optionsBuy);
        var json = JSON.parse(res.getContentText());
        if (json.success === true) {
          var accountInfo = "Tạo đơn API V1 Thành Công!\n(Trans ID: " + json.data.orders[0].trans_id + ")";
          sheetDonMMO.getRange(rowToUpdate, 5, 1, 2).setValues([["COMPLETED", accountInfo]]); 
          return output.setContent(JSON.stringify({success: true})).setHeader('Access-Control-Allow-Origin', '*');
        } else { return output.setContent(JSON.stringify({success: false, error: json.message || "Lỗi giao dịch API"})).setHeader('Access-Control-Allow-Origin', '*'); }
      } catch (err) { return output.setContent(JSON.stringify({success: false, error: "Lỗi kết nối API Server: " + err.message})).setHeader('Access-Control-Allow-Origin', '*'); }
    }

    if (action === 'verify_pin') return output.setContent(JSON.stringify({success: String(e.parameter.pin) === String(SECRET_ADMIN_PASS)})).setHeader('Access-Control-Allow-Origin', '*');
    
    if (action === 'get_admin_data') {
      if (String(e.parameter.pin) !== String(SECRET_ADMIN_PASS)) return output.setContent(JSON.stringify({success: false, error: "Từ chối"})).setHeader('Access-Control-Allow-Origin', '*');
      return output.setContent(JSON.stringify({success: true, dataThuNgan: sheetThuNgan ? sheetThuNgan.getDataRange().getValues() : []})).setHeader('Access-Control-Allow-Origin', '*');
    }

    if (action === 'notify_admin') {
      var msg = e.parameter.message;
      sendTelegramMsg(msg);
      return output.setContent(JSON.stringify({ success: true })).setHeader('Access-Control-Allow-Origin', '*');
    }

    if (action === 'get_account') {
      var type = e.parameter.type;
      var uid = e.parameter.uid;
      var sheetAcc = ss.getSheetByName("Accounts");
      if (!sheetAcc) return output.setContent(JSON.stringify({ success: false, error: "Hết hàng hoặc hệ thống chưa cấu hình Accounts." })).setHeader('Access-Control-Allow-Origin', '*');
      var dataAcc = sheetAcc.getDataRange().getValues();
      for (var i = 1; i < dataAcc.length; i++) {
        if (dataAcc[i][0] === type && dataAcc[i][2] !== "SOLD") {
          var accValue = dataAcc[i][1];
          sheetAcc.getRange(i + 1, 3).setValue("SOLD");
          sheetAcc.getRange(i + 1, 4).setValue(uid);
          sheetAcc.getRange(i + 1, 5).setValue(new Date().toISOString());
          return output.setContent(JSON.stringify({ success: true, account: accValue })).setHeader('Access-Control-Allow-Origin', '*');
        }
      }
      return output.setContent(JSON.stringify({ success: false, error: "Sản phẩm này đã hết hàng!" })).setHeader('Access-Control-Allow-Origin', '*');
    }

    return output.setContent(JSON.stringify({error: "Lệnh GET không hợp lệ!"})).setHeader('Access-Control-Allow-Origin', '*');
  } catch (err) { 
    return output.setContent(JSON.stringify({success: false, error: err.toString()})).setHeader('Access-Control-Allow-Origin', '*'); 
  }
}

// ===================================================================
// HÀM doPost(e) - XỬ LÝ CÁC YÊU CẦU LƯU DỮ LIỆU TỪ ADMIN
// ===================================================================
function doPost(e) {
  var output = ContentService.createTextOutput().setMimeType(ContentService.MimeType.JSON);
  
  try {
    var parameter = e.parameter;
    var action = parameter.action;
    var pin = parameter.pin;
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Bảo mật: Xác thực mã PIN Admin
    if (String(pin) !== String(SECRET_ADMIN_PASS)) {
      return output.setContent(JSON.stringify({ success: false, error: "Sai mã PIN Admin!" }))
        .setHeader('Access-Control-Allow-Origin', '*');
    }
    
    // 1. Phê duyệt bàn giao hàng thủ công
    if (action === 'admin_manual_fulfill') {
      var row = parseInt(parameter.row);
      var accountData = parameter.accountData;
      var sheetDonMMO = ss.getSheetByName("DonMMO");
      if (row > 1 && row <= sheetDonMMO.getLastRow()) {
        sheetDonMMO.getRange(row, 5).setValue("COMPLETED"); 
        sheetDonMMO.getRange(row, 6).setValue(accountData); 
        
        var orderId = sheetDonMMO.getRange(row, 1).getValue();
        var pName = sheetDonMMO.getRange(row, 8).getValue();
        sendTelegramMsg("📦 *BÀN GIAO THỦ CÔNG THÀNH CÔNG*\n💳 Đơn: `" + orderId + "`\n🛍️ SP: *" + pName + "*\n🔑 Tài khoản: " + accountData);
        
        return output.setContent(JSON.stringify({ success: true }))
          .setHeader('Access-Control-Allow-Origin', '*');
      }
      return output.setContent(JSON.stringify({ success: false, error: "Dòng không hợp lệ!" }))
        .setHeader('Access-Control-Allow-Origin', '*');
    }
    
    // 2. Xóa đơn hàng MMO
    if (action === 'admin_delete_mmo_order') {
      var row = parseInt(parameter.row);
      var sheetDonMMO = ss.getSheetByName("DonMMO");
      if (row > 1 && row <= sheetDonMMO.getLastRow()) {
        sheetDonMMO.deleteRow(row);
        return output.setContent(JSON.stringify({ success: true }))
          .setHeader('Access-Control-Allow-Origin', '*');
      }
      return output.setContent(JSON.stringify({ success: false, error: "Dòng không hợp lệ!" }))
        .setHeader('Access-Control-Allow-Origin', '*');
    }
    
    // 3. Đồng bộ và lưu trữ cấu hình sản phẩm MMO
    if (action === 'admin_save_mmo_config') {
      var configsStr = parameter.configs;
      if (!configsStr) {
        return output.setContent(JSON.stringify({ success: false, error: "Thiếu dữ liệu cấu hình" }))
          .setHeader('Access-Control-Allow-Origin', '*');
      }
      
      var configsList = JSON.parse(configsStr);
      var sheetConfigMMO = ss.getSheetByName("ConfigMMO");
      if (!sheetConfigMMO) {
        sheetConfigMMO = ss.insertSheet("ConfigMMO");
      }
      
      sheetConfigMMO.clearContents();
      sheetConfigMMO.appendRow(["ID", "Đơn Giá", "Giá Gốc (Fake)", "Icon/Hình Ảnh", "Trạng Thái Ẩn (TRUE/FALSE)", "Tên Sản Phẩm", "Danh Mục", "Tồn Kho", "Mô Tả"]);
      sheetConfigMMO.setFrozenRows(1);
      sheetConfigMMO.getRange("A1:I1").setFontWeight("bold");
      
      for (var i = 0; i < configsList.length; i++) {
        var item = configsList[i];
        sheetConfigMMO.appendRow([
          item.id,
          item.price,
          item.fakePrice,
          item.icon,
          item.isHidden ? "TRUE" : "FALSE",
          item.name,
          item.cat,
          item.stock,
          item.desc
        ]);
      }
      ss.flush();
      return output.setContent(JSON.stringify({ success: true }))
        .setHeader('Access-Control-Allow-Origin', '*');
    }
    
    // 4. Đồng bộ và lưu trữ kho phím tắt Shortcuts
    if (action === 'admin_save_shortcuts') {
      var shortcutsStr = parameter.shortcuts;
      if (!shortcutsStr) {
        return output.setContent(JSON.stringify({ success: false, error: "Thiếu dữ liệu phím tắt" }))
          .setHeader('Access-Control-Allow-Origin', '*');
      }
      
      var list = JSON.parse(shortcutsStr);
      var sheetShortcuts = ss.getSheetByName("Shortcuts");
      if (!sheetShortcuts) {
        sheetShortcuts = ss.insertSheet("Shortcuts");
      }
      
      sheetShortcuts.clearContents();
      sheetShortcuts.appendRow([
        "ID", "Name", "IconUrl", "Icon", "IconColor", 
        "IosVersion", "Category", "Popularity", "IsNew", 
        "Rating", "Downloads", "Description", "MainFunction", 
        "Instructions", "CommonErrors", "Notes", "ShortcutUrl", 
        "VideoUrl", "TutorialImages"
      ]);
      sheetShortcuts.setFrozenRows(1);
      sheetShortcuts.getRange("A1:S1").setFontWeight("bold");
      
      for (var i = 0; i < list.length; i++) {
        var item = list[i];
        sheetShortcuts.appendRow([
          item.id,
          item.name,
          item.iconUrl,
          item.icon,
          item.iconColor,
          item.iosVersion,
          item.category,
          item.popularity,
          item.isNew ? "TRUE" : "FALSE",
          item.rating,
          item.downloads,
          item.description,
          item.mainFunction,
          JSON.stringify(item.instructions || []),
          JSON.stringify(item.commonErrors || []),
          item.notes,
          item.shortcutUrl,
          item.videoUrl,
          JSON.stringify(item.tutorialImages || [])
        ]);
      }
      ss.flush();
      return output.setContent(JSON.stringify({ success: true }))
        .setHeader('Access-Control-Allow-Origin', '*');
    }
    
    return output.setContent(JSON.stringify({ error: "Lệnh POST không hợp lệ!" }))
      .setHeader('Access-Control-Allow-Origin', '*');
  } catch (err) {
    return output.setContent(JSON.stringify({ success: false, error: err.toString() }))
      .setHeader('Access-Control-Allow-Origin', '*');
  }
}
