/**
 * =========================================================================
 * GOOGLE APPS SCRIPT - HỆ THỐNG THỐNG KÊ & THEO DÕI HÀNH VI KHÁCH HÀNG (PHƯƠNG ÁN 2)
 * =========================================================================
 * ĐÂY LÀ SCRIPT HOÀN TOÀN TÁCH BIỆT ĐỘC LẬP DÀNH RIÊNG CHO THỐNG KÊ.
 * KHÔNG DÙNG CHUNG VỚI FILE NẠP TIỀN / THU NGÂN / ĐƠN MMO ĐỂ ĐẢM BẢO:
 * 1. Sheet nạp tiền / thanh toán luôn chạy với tốc độ tối đa, không sợ nghẽn lệnh.
 * 2. Lưu trữ không giới hạn nhật ký xem và tải IPA của hàng ngàn khách.
 * 
 * HƯỚNG DẪN CÀI ĐẶT NHANH (MẤT 1 PHÚT):
 * 1. Truy cập https://sheets.new để tạo một trang tính Google Sheet mới.
 *    (Đặt tên trang tính: "IPAViet - Thống Kê & Hành Vi Khách")
 * 2. Trên thanh menu, chọn: Tiện ích mở rộng (Extensions) -> Apps Script.
 * 3. Xóa hết mã mặc định, DÁN TOÀN BỘ NỘI DUNG FILE NÀY VÀO.
 * 4. Bấm nút Lưu (hình chiếc đĩa mềm).
 * 5. Bấm nút Triển khai (Deploy) ở góc trên bên phải -> Chọn "Triển khai mới" (New deployment).
 *    - Chọn loại: "Ứng dụng web" (Web App).
 *    - Mô tả: "IPAViet Analytics v1"
 *    - Thực thi dưới dạng (Execute as): "Tôi" (Me)
 *    - Người có quyền truy cập (Who has access): "Bất kỳ ai" (Anyone)  <-- BẮT BUỘC CHỌN CÁI NÀY!
 * 6. Bấm "Triển khai" và sao chép Web App URL (dạng: https://script.google.com/macros/s/.../exec).
 * 7. Vào trang Quản trị Admin (tab Thống Kê -> Cài Đặt Sheet Riêng) dán URL này vào là xong!
 * =========================================================================
 */

/**
 * =========================================================================
 * BƯỚC KHỞI ĐỘNG NHANH: CHỌN HÀM NÀY VÀ BẤM NÚT "CHẠY" (RUN) TRÊN THANH CÔNG CỤ
 * =========================================================================
 * Sẽ tự động cấp quyền (Review Permissions) và tạo ngay 4 bảng:
 * 1. Daily_Summary (Thống kê theo ngày & thiết bị)
 * 2. App_Stats (Thống kê lượt xem & tải từng ứng dụng)
 * 3. Recent_Downloads (Nhật ký 500 lượt tải gần nhất)
 * 4. Search_Queries (Xu hướng tìm kiếm)
 */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  getOrCreateSheet(ss, "Daily_Summary", [
    "Ngày", "Lượt xem trang", "Khách riêng biệt", "Lượt tải IPA", "iOS", "Android", "Mac", "Windows", "Khác", "Cập nhật lúc"
  ]);
  getOrCreateSheet(ss, "App_Stats", [
    "App ID", "Tên Ứng Dụng", "Bundle ID", "Danh Mục", "Loại", "Icon URL", "Lượt Xem", "Lượt Tải", "Cập Nhật Lúc"
  ]);
  getOrCreateSheet(ss, "Recent_Downloads", [
    "Thời Gian", "Tên Ứng Dụng", "Bundle ID", "Loại Tải", "Khách Hàng", "Loại App", "Icon URL"
  ]);
  getOrCreateSheet(ss, "Search_Queries", [
    "Từ Khóa", "Số Lần Tìm", "Tìm Lần Cuối"
  ]);
  Logger.log(">>> KHỞI TẠO THÀNH CÔNG TOÀN BỘ CÁC BẢNG TRÊN GOOGLE SHEET! <<<");
}

function doGet(e) {
  var output = ContentService.createTextOutput().setMimeType(ContentService.MimeType.JSON);
  
  try {
    var action = e ? e.parameter.action : null;
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // -------------------------------------------------------------
    // ACTION 1: KIỂM TRA KẾT NỐI (PING TEST)
    // -------------------------------------------------------------
    if (action === 'ping' || action === 'test_connection') {
      return output.setContent(JSON.stringify({
        success: true,
        message: "Kết nối thành công với Google Sheet Thống Kê IPAViet!",
        timestamp: new Date().toISOString()
      }));
    }

    // -------------------------------------------------------------
    // ACTION 2: GHI NHẬN HÀNH VI (PAGEVIEW, APP VIEW, DOWNLOAD, SEARCH)
    // -------------------------------------------------------------
    if (action === 'record_analytics') {
      var type = e.parameter.type;
      var today = e.parameter.date || Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd");
      var nowIso = Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd HH:mm:ss");

      // A. LƯỢT XEM TRANG (PAGEVIEW)
      if (type === 'pageview') {
        var sheetDaily = getOrCreateSheet(ss, "Daily_Summary", [
          "Ngày", "Lượt xem trang", "Khách riêng biệt", "Lượt tải IPA", "iOS", "Android", "Mac", "Windows", "Khác", "Cập nhật lúc"
        ]);
        var device = (e.parameter.device || "other").toLowerCase();
        var isUnique = e.parameter.isUnique === 'true' || e.parameter.isUnique === true;

        var data = sheetDaily.getDataRange().getValues();
        var foundRow = -1;
        for (var i = 1; i < data.length; i++) {
          if (isSameDate(data[i][0], today)) {
            foundRow = i + 1;
            break;
          }
        }

        if (foundRow > 0) {
          var curViews = Number(sheetDaily.getRange(foundRow, 2).getValue()) || 0;
          var curUniques = Number(sheetDaily.getRange(foundRow, 3).getValue()) || 0;
          var colDev = 9; // Khác
          if (device === 'ios') colDev = 5;
          else if (device === 'android') colDev = 6;
          else if (device === 'mac') colDev = 7;
          else if (device === 'windows') colDev = 8;
          var curDev = Number(sheetDaily.getRange(foundRow, colDev).getValue()) || 0;

          // CHUẨN XÁC: Chỉ tăng lượt xem khi là IP truy cập mới (1 IP = 1 lượt xem chuẩn, không đếm trùng khi F5)
          if (isUnique) {
            sheetDaily.getRange(foundRow, 2).setValue(curViews + 1);
            sheetDaily.getRange(foundRow, 3).setValue(curUniques + 1);
            sheetDaily.getRange(foundRow, colDev).setValue(curDev + 1);
          }
          sheetDaily.getRange(foundRow, 10).setValue(nowIso);
        } else {
          var ios = (device === 'ios' ? 1 : 0);
          var android = (device === 'android' ? 1 : 0);
          var mac = (device === 'mac' ? 1 : 0);
          var win = (device === 'windows' ? 1 : 0);
          var oth = (!['ios', 'android', 'mac', 'windows'].includes(device) ? 1 : 0);
          sheetDaily.appendRow([today, 1, 1, 0, ios, android, mac, win, oth, nowIso]);
        }
        return output.setContent(JSON.stringify({ success: true, recorded: 'pageview' }));
      }

      // B. XEM CHI TIẾT ỨNG DỤNG (APP VIEW)
      if (type === 'app_view') {
        var sheetApps = getOrCreateSheet(ss, "App_Stats", [
          "App ID", "Tên Ứng Dụng", "Bundle ID", "Danh Mục", "Loại", "Icon URL", "Lượt Xem", "Lượt Tải", "Cập Nhật Lúc"
        ]);
        var appKey = e.parameter.appKey || e.parameter.appName || 'unknown';
        var appName = e.parameter.appName || 'Ứng dụng';
        var bundleId = e.parameter.bundleId || '';
        var category = e.parameter.category || 'Tiện ích';
        var isMod = e.parameter.isMod === 'true';
        var isVip = e.parameter.isVip === 'true';
        var appTypeStr = isMod ? 'MOD VIP' : (isVip ? 'VIP' : 'Gốc');
        var icon = e.parameter.icon || '';

        var appsData = sheetApps.getDataRange().getValues();
        var appRow = -1;
        for (var a = 1; a < appsData.length; a++) {
          if (String(appsData[a][0]) === appKey || (bundleId && String(appsData[a][2]) === bundleId)) {
            appRow = a + 1;
            break;
          }
        }

        if (appRow > 0) {
          var curAppViews = Number(sheetApps.getRange(appRow, 7).getValue()) || 0;
          sheetApps.getRange(appRow, 7).setValue(curAppViews + 1);
          sheetApps.getRange(appRow, 9).setValue(nowIso);
          if (icon && !sheetApps.getRange(appRow, 6).getValue()) {
            sheetApps.getRange(appRow, 6).setValue(icon);
          }
        } else {
          sheetApps.appendRow([appKey, appName, bundleId, category, appTypeStr, icon, 1, 0, nowIso]);
        }
        return output.setContent(JSON.stringify({ success: true, recorded: 'app_view' }));
      }

      // C. LƯỢT TẢI ỨNG DỤNG (APP DOWNLOAD)
      if (type === 'app_download') {
        var sheetRecent = getOrCreateSheet(ss, "Recent_Downloads", [
          "Thời Gian", "Tên Ứng Dụng", "Bundle ID", "Loại Tải", "Khách Hàng", "Loại App", "Icon URL"
        ]);
        var dlName = e.parameter.appName || 'Ứng dụng';
        var dlBundle = e.parameter.bundleId || '';
        var dlType = e.parameter.dlType || 'Free';
        var dlUser = e.parameter.user || 'Khách vãng lai';
        var dlMod = e.parameter.isMod === 'true';
        var dlVip = e.parameter.isVip === 'true';
        var dlTypeStr = dlMod ? 'MOD' : (dlVip ? 'VIP' : 'Gốc');
        var dlIcon = e.parameter.icon || '';
        var dlAppKey = e.parameter.appKey || dlName;

        // 1. Thêm vào nhật ký tải gần đây (giữ tối đa 500 dòng mới nhất)
        sheetRecent.appendRow([nowIso, dlName, dlBundle, dlType, dlUser, dlTypeStr, dlIcon]);
        if (sheetRecent.getLastRow() > 500) {
          try { sheetRecent.deleteRow(2); } catch(e){}
        }

        // 2. Tăng số lượt tải trong App_Stats
        var sApps = getOrCreateSheet(ss, "App_Stats", [
          "App ID", "Tên Ứng Dụng", "Bundle ID", "Danh Mục", "Loại", "Icon URL", "Lượt Xem", "Lượt Tải", "Cập Nhật Lúc"
        ]);
        var aData = sApps.getDataRange().getValues();
        var targetRow = -1;
        for (var k = 1; k < aData.length; k++) {
          if (String(aData[k][0]) === dlAppKey || (dlBundle && String(aData[k][2]) === dlBundle)) {
            targetRow = k + 1;
            break;
          }
        }
        if (targetRow > 0) {
          var curDownloads = Number(sApps.getRange(targetRow, 8).getValue()) || 0;
          sApps.getRange(targetRow, 8).setValue(curDownloads + 1);
          sApps.getRange(targetRow, 9).setValue(nowIso);
        } else {
          sApps.appendRow([dlAppKey, dlName, dlBundle, e.parameter.category || 'Tiện ích', dlTypeStr, dlIcon, 1, 1, nowIso]);
        }

        // 3. Tăng tổng lượt tải trong Daily_Summary
        var sDaily = getOrCreateSheet(ss, "Daily_Summary", [
          "Ngày", "Lượt xem trang", "Khách riêng biệt", "Lượt tải IPA", "iOS", "Android", "Mac", "Windows", "Khác", "Cập nhật lúc"
        ]);
        var dData = sDaily.getDataRange().getValues();
        var dRow = -1;
        for (var j = 1; j < dData.length; j++) {
          if (isSameDate(dData[j][0], today)) {
            dRow = j + 1;
            break;
          }
        }
        if (dRow > 0) {
          var curDailyDl = Number(sDaily.getRange(dRow, 4).getValue()) || 0;
          sDaily.getRange(dRow, 4).setValue(curDailyDl + 1);
          sDaily.getRange(dRow, 10).setValue(nowIso);
        } else {
          sDaily.appendRow([today, 1, 1, 1, 0, 0, 0, 0, 1, nowIso]);
        }

        return output.setContent(JSON.stringify({ success: true, recorded: 'app_download' }));
      }

      // D. TỪ KHÓA TÌM KIẾM (SEARCH QUERY)
      if (type === 'search') {
        var query = (e.parameter.query || "").trim();
        if (query.length >= 2) {
          var sheetSearch = getOrCreateSheet(ss, "Search_Queries", [
            "Từ Khóa", "Số Lần Tìm", "Tìm Lần Cuối"
          ]);
          var qData = sheetSearch.getDataRange().getValues();
          var qRow = -1;
          for (var s = 1; s < qData.length; s++) {
            if (String(qData[s][0]).toLowerCase() === query.toLowerCase()) {
              qRow = s + 1;
              break;
            }
          }
          if (qRow > 0) {
            var curQCount = Number(sheetSearch.getRange(qRow, 2).getValue()) || 0;
            sheetSearch.getRange(qRow, 2).setValue(curQCount + 1);
            sheetSearch.getRange(qRow, 3).setValue(nowIso);
          } else {
            sheetSearch.appendRow([query, 1, nowIso]);
          }
        }
        return output.setContent(JSON.stringify({ success: true, recorded: 'search' }));
      }

      // E. GHI NHẬN THÔNG TIN NGƯỜI XEM & IP (VISITOR LOGS) - GỘP THEO IP & TÀI KHOẢN
      if (type === 'visitor') {
        var sheetVis = getOrCreateSheet(ss, "Visitor_Logs", [
          "Thời Gian", "Địa Chỉ IP", "Tài Khoản / Email", "Số Lần Xem", "Quốc Gia", "Thành Phố", "Nhà Mạng / ISP", "Thiết Bị", "Model Máy", "Trình Duyệt", "Trang Xem", "Nguồn Referrer"
        ]);

        // Cố định định dạng cột B (IP) luôn luôn là Plain Text để Google Sheet không bao giờ nuốt dấu chấm
        try {
          sheetVis.getRange(1, 2, sheetVis.getMaxRows(), 1).setNumberFormat("@");
        } catch (e) {}

        // Tự động nâng cấp cấu trúc cột nếu là sheet cũ (10 cột)
        var lastCol = sheetVis.getLastColumn();
        if (lastCol === 10) {
          var headerCol3 = String(sheetVis.getRange(1, 3).getValue() || '');
          if (headerCol3.indexOf('Quốc Gia') !== -1) {
            sheetVis.insertColumnsAfter(2, 2);
            sheetVis.getRange(1, 3, 1, 2).setValues([["Tài Khoản / Email", "Số Lần Xem"]]);
            sheetVis.getRange(1, 3, 1, 2).setFontWeight("bold").setBackground("#f1f5f9");
          }
        }

        var rawIp = String(e.parameter.ip || 'Unknown').trim();
        var ip = restoreIpDots(rawIp);
        var userEmail = String(e.parameter.userEmail || '').trim();
        var userName = String(e.parameter.userName || '').trim();
        var isMember = e.parameter.isMember === 'true';
        var userDisplay = '';
        if (userEmail) {
          userDisplay = userName ? (userName + ' (' + userEmail + ')') : userEmail;
        } else if (userName) {
          userDisplay = userName;
        }

        var country = e.parameter.country || 'Việt Nam';
        var city = e.parameter.city || '';
        var isp = e.parameter.isp || '';
        var dev = e.parameter.device || 'other';
        var devModel = e.parameter.deviceModel || '';
        var browser = e.parameter.browser || '';
        var page = e.parameter.page || '';
        var ref = e.parameter.referrer || '';

        var lastRow = sheetVis.getLastRow();
        var foundRow = -1;
        var existingVisits = 0;
        var existingUser = '';

        if (lastRow > 1 && ip !== 'Unknown') {
          var ipColValues = sheetVis.getRange(2, 2, lastRow - 1, 1).getValues();
          for (var r = 0; r < ipColValues.length; r++) {
            var rowIpClean = restoreIpDots(ipColValues[r][0]);
            var rawCell = String(ipColValues[r][0] || '').trim().replace(/^'/, '');
            if (rowIpClean === ip || rawCell === ip || rawCell === rawIp) {
              foundRow = r + 2;
              break;
            }
          }
        }

        if (foundRow > 1) {
          // IP đã tồn tại: Cập nhật in-place, gộp vào 1 dòng duy nhất
          existingUser = String(sheetVis.getRange(foundRow, 3).getValue() || '');
          existingVisits = Number(sheetVis.getRange(foundRow, 4).getValue()) || 1;
          
          sheetVis.getRange(foundRow, 1).setValue(nowIso); // Cập nhật giờ hoạt động gần nhất
          // Luôn chuẩn hóa lại IP có dấu chấm đầy đủ và định dạng text
          sheetVis.getRange(foundRow, 2).setNumberFormat("@").setValue("'" + ip);
          if (userDisplay && (!existingUser || existingUser === 'Khách vãng lai' || isMember)) {
            sheetVis.getRange(foundRow, 3).setValue(userDisplay);
          }
          sheetVis.getRange(foundRow, 4).setValue(existingVisits + 1); // Tăng lượt xem của IP này
          if (country) sheetVis.getRange(foundRow, 5).setValue(country);
          if (city) sheetVis.getRange(foundRow, 6).setValue(city);
          if (isp) sheetVis.getRange(foundRow, 7).setValue(isp);
          if (dev) sheetVis.getRange(foundRow, 8).setValue(dev);
          if (devModel) sheetVis.getRange(foundRow, 9).setValue(devModel);
          if (browser) sheetVis.getRange(foundRow, 10).setValue(browser);
          if (page) sheetVis.getRange(foundRow, 11).setValue(page); // Trang xem mới nhất
          if (ref) sheetVis.getRange(foundRow, 12).setValue(ref);
        } else {
          // IP mới: Thêm dòng mới (thêm tiền tố nháy đơn ' để ép Google Sheet hiểu là chuỗi Text thuần túy)
          var finalUser = userDisplay || 'Khách vãng lai';
          sheetVis.appendRow([nowIso, "'" + ip, finalUser, 1, country, city, isp, dev, devModel, browser, page, ref]);
        }

        return output.setContent(JSON.stringify({ success: true, recorded: 'visitor', ip: ip, isExisting: foundRow > 1 }));
      }

      // F. NHỊP TIM DUY TRÌ TRẠNG THÁI ONLINE (HEARTBEAT)
      if (type === 'heartbeat') {
        var hbRawIp = String(e.parameter.ip || '').trim();
        var hbIp = restoreIpDots(hbRawIp);
        if (hbIp && hbIp !== 'Unknown') {
          var sVisHb = ss.getSheetByName("Visitor_Logs");
          if (sVisHb && sVisHb.getLastRow() > 1) {
            var lr = sVisHb.getLastRow();
            var ipVals = sVisHb.getRange(2, 2, lr - 1, 1).getValues();
            for (var hbi = 0; hbi < ipVals.length; hbi++) {
              var cIp = restoreIpDots(ipVals[hbi][0]);
              var rCell = String(ipVals[hbi][0] || '').trim().replace(/^'/, '');
              if (cIp === hbIp || rCell === hbIp || rCell === hbRawIp) {
                sVisHb.getRange(hbi + 2, 1).setValue(nowIso); // Cập nhật thời gian hoạt động mới nhất
                break;
              }
            }
          }
        }
        return output.setContent(JSON.stringify({ success: true, heartbeat: true, ip: hbIp }));
      }
    }

    // -------------------------------------------------------------
    // ACTION 3: LẤY TOÀN BỘ SỐ LIỆU THỐNG KÊ ĐỂ HIỂN THỊ LÊN ADMIN DASHBOARD
    // -------------------------------------------------------------
    if (action === 'get_analytics') {
      var queryDate = e.parameter.date || Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd");

      // 1. Daily Summary
      var sDaily = ss.getSheetByName("Daily_Summary");
      var todayStat = {
        date: queryDate,
        pageviews: 0,
        uniqueVisitors: 0,
        downloads: 0,
        devices: { ios: 0, android: 0, mac: 0, windows: 0, other: 0 }
      };
      if (sDaily) {
        var dVals = sDaily.getDataRange().getValues();
        for (var i = 1; i < dVals.length; i++) {
          if (isSameDate(dVals[i][0], queryDate)) {
            todayStat.pageviews = Number(dVals[i][1]) || 0;
            todayStat.uniqueVisitors = Number(dVals[i][2]) || 0;
            todayStat.downloads = Number(dVals[i][3]) || 0;
            todayStat.devices.ios = Number(dVals[i][4]) || 0;
            todayStat.devices.android = Number(dVals[i][5]) || 0;
            todayStat.devices.mac = Number(dVals[i][6]) || 0;
            todayStat.devices.windows = Number(dVals[i][7]) || 0;
            todayStat.devices.other = Number(dVals[i][8]) || 0;
            break;
          }
        }
      }

      // 2. Apps Statistics
      var sApps = ss.getSheetByName("App_Stats");
      var appsList = [];
      if (sApps) {
        var aVals = sApps.getDataRange().getValues();
        for (var a = 1; a < aVals.length; a++) {
          if (aVals[a][0] || aVals[a][1]) {
            appsList.push({
              id: String(aVals[a][0]),
              name: String(aVals[a][1]),
              bundleId: String(aVals[a][2] || ''),
              category: String(aVals[a][3] || 'Tiện ích'),
              type: String(aVals[a][4] || ''),
              isMod: String(aVals[a][4]).indexOf('MOD') !== -1,
              isVip: String(aVals[a][4]).indexOf('VIP') !== -1,
              icon: String(aVals[a][5] || ''),
              views: Number(aVals[a][6]) || 0,
              downloads: Number(aVals[a][7]) || 0,
              lastUpdated: String(aVals[a][8] || '')
            });
          }
        }
      }

      // 3. Recent Downloads (Top 50 mới nhất)
      var sRecent = ss.getSheetByName("Recent_Downloads");
      var recentList = [];
      if (sRecent) {
        var rVals = sRecent.getDataRange().getValues();
        // Duyệt từ dưới lên để lấy mới nhất
        for (var r = rVals.length - 1; r >= 1 && recentList.length < 50; r--) {
          if (rVals[r][1]) {
            recentList.push({
              timestamp: String(rVals[r][0] || ''),
              appName: String(rVals[r][1]),
              bundleId: String(rVals[r][2] || ''),
              type: String(rVals[r][3] || 'Free'),
              userEmail: String(rVals[r][4] || 'Khách vãng lai'),
              isMod: String(rVals[r][5]).indexOf('MOD') !== -1,
              isVip: String(rVals[r][5]).indexOf('VIP') !== -1,
              icon: String(rVals[r][6] || '')
            });
          }
        }
      }

      // 4. Search Queries (Top 50)
      var sSearch = ss.getSheetByName("Search_Queries");
      var searchList = [];
      if (sSearch) {
        var qVals = sSearch.getDataRange().getValues();
        for (var q = 1; q < qVals.length; q++) {
          if (qVals[q][0]) {
            searchList.push({
              query: String(qVals[q][0]),
              count: Number(qVals[q][1]) || 0,
              lastSearchedAt: String(qVals[q][2] || '')
            });
          }
        }
        searchList.sort(function(x, y) { return y.count - x.count; });
        if (searchList.length > 50) searchList = searchList.slice(0, 50);
      }

      // 5. Visitor Logs (Đọc và tính toán số liệu THẬT 100% dựa trên danh sách IP thực tế)
      var sVis = ss.getSheetByName("Visitor_Logs");
      var visitorsList = [];
      var realUniqueIpsToday = 0;
      var realDevicesToday = { ios: 0, android: 0, mac: 0, windows: 0, other: 0 };

      if (sVis && sVis.getLastRow() > 1) {
        var vVals = sVis.getDataRange().getValues();
        var headers = vVals[0] || [];
        var hasUserCol = String(headers[2] || '').indexOf('Tài Khoản') !== -1;

        // Quét toàn bộ bảng để đếm số IP thực tế đã truy cập hôm nay
        for (var vi = 1; vi < vVals.length; vi++) {
          var vRow = vVals[vi];
          if (vRow[1]) {
            if (isSameDate(vRow[0], queryDate)) {
              realUniqueIpsToday++;
              var dType = String(vRow[hasUserCol ? 7 : 5] || 'other').toLowerCase();
              if (dType === 'ios') realDevicesToday.ios++;
              else if (dType === 'android') realDevicesToday.android++;
              else if (dType === 'mac') realDevicesToday.mac++;
              else if (dType === 'windows') realDevicesToday.windows++;
              else realDevicesToday.other++;
            }
          }
        }

        // Lấy danh sách khách mới nhất để hiển thị bảng (tối đa 60 khách)
        var startV = Math.max(1, vVals.length - 60);
        for (var vi = vVals.length - 1; vi >= startV; vi--) {
          var vRow = vVals[vi];
          if (vRow[1]) {
            var timeVal = vRow[0];
            var timeIso = '';
            var timeStampMs = 0;
            if (timeVal instanceof Date) {
              timeIso = Utilities.formatDate(timeVal, "GMT+7", "yyyy-MM-dd HH:mm:ss");
              timeStampMs = timeVal.getTime();
            } else if (timeVal) {
              timeIso = String(timeVal).replace(/\s*\([^)]*\)/g, '').trim();
              var pDate = new Date(timeIso);
              timeStampMs = isNaN(pDate.getTime()) ? 0 : pDate.getTime();
            }

            var cleanIp = restoreIpDots(vRow[1]);

            if (hasUserCol) {
              var uAcc = String(vRow[2] || '');
              visitorsList.push({
                time: timeIso,
                timestamp: timeStampMs,
                lastActive: timeStampMs,
                ip: cleanIp,
                userEmail: uAcc,
                isMember: uAcc !== '' && uAcc !== 'Khách vãng lai',
                visits: Number(vRow[3]) || 1,
                country: String(vRow[4] || 'Việt Nam'),
                city: String(vRow[5] || ''),
                isp: String(vRow[6] || ''),
                deviceType: String(vRow[7] || 'other'),
                deviceModel: String(vRow[8] || ''),
                browser: String(vRow[9] || ''),
                page: String(vRow[10] || 'Trang Chủ'),
                referrer: String(vRow[11] || 'Trực tiếp')
              });
            } else {
              visitorsList.push({
                time: timeIso,
                timestamp: timeStampMs,
                lastActive: timeStampMs,
                ip: cleanIp,
                userEmail: '',
                isMember: false,
                visits: 1,
                country: String(vRow[2] || 'Việt Nam'),
                city: String(vRow[3] || ''),
                isp: String(vRow[4] || ''),
                deviceType: String(vRow[5] || 'other'),
                deviceModel: String(vRow[6] || ''),
                browser: String(vRow[7] || ''),
                page: String(vRow[8] || 'Trang Chủ'),
                referrer: String(vRow[9] || 'Trực tiếp')
              });
            }
          }
        }
      }

      // ĐỒNG BỘ CHUẨN XÁC:
      // Nếu số liệu trong Daily_Summary bị ảo (ví dụ 90 do F5 cũ) trong khi số IP thật là ít hơn,
      // tự động đồng bộ theo số IP thật 100%, xóa bỏ hoàn toàn số ảo!
      if (realUniqueIpsToday > 0) {
        todayStat.uniqueVisitors = realUniqueIpsToday;
        todayStat.pageviews = realUniqueIpsToday; // Cùng 1 IP = 1 lượt xem chuẩn
        todayStat.devices = realDevicesToday;

        // Cập nhật lại vào sheet Daily_Summary để lưu số thật
        if (sDaily) {
          var dData = sDaily.getDataRange().getValues();
          for (var di = 1; di < dData.length; di++) {
            if (isSameDate(dData[di][0], queryDate)) {
              sDaily.getRange(di + 1, 2).setValue(realUniqueIpsToday);
              sDaily.getRange(di + 1, 3).setValue(realUniqueIpsToday);
              sDaily.getRange(di + 1, 5).setValue(realDevicesToday.ios);
              sDaily.getRange(di + 1, 6).setValue(realDevicesToday.android);
              sDaily.getRange(di + 1, 7).setValue(realDevicesToday.mac);
              sDaily.getRange(di + 1, 8).setValue(realDevicesToday.windows);
              sDaily.getRange(di + 1, 9).setValue(realDevicesToday.other);
              break;
            }
          }
        }
      }

      return output.setContent(JSON.stringify({
        success: true,
        today: todayStat,
        apps: appsList,
        recentDownloads: recentList,
        searches: searchList,
        visitors: visitorsList,
        serverTime: new Date().toISOString()
      }));
    }

    // -------------------------------------------------------------
    // ACTION 4: RÚT GỌN LINK TẢI FREE (HỖ TRỢ YEUMONEY, LINK4M, V.V.)
    // -------------------------------------------------------------
    if (action === 'get_free_link' || action === 'shorten_link' || action === 'shorten_link4m') {
      var rawTargetUrl = e.parameter.url || '';
      if (!rawTargetUrl) {
        return output.setContent(JSON.stringify({ success: false, message: "Thiếu URL cần rút gọn" }));
      }
      var targetUrl = rawTargetUrl;
      try {
        if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
          targetUrl = Utilities.newBlob(Utilities.base64Decode(targetUrl)).getDataAsString();
        }
      } catch (e) {}

      var provider = String(e.parameter.provider || 'yeumoney').toLowerCase().trim();
      var apiToken = e.parameter.token || '';
      var shortened = null;

      if (provider === 'site2s') {
        apiToken = apiToken || "9c105d1f5c6c770dcdf75101509cfba77b9ee5bd";
        var s2sApiUrl = "https://site2s.com/api?api=" + encodeURIComponent(apiToken) + "&url=" + encodeURIComponent(targetUrl) + "&type=1";
        try {
          var response = UrlFetchApp.fetch(s2sApiUrl, {
            method: "GET",
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            },
            muteHttpExceptions: true
          });
          var resText = response.getContentText();
          var json = JSON.parse(resText);
          if (json && (json.status === "success" || json.shortenedUrl) && json.shortenedUrl) {
            shortened = json.shortenedUrl;
          }
        } catch (err) {}

        if (!shortened) {
          shortened = "https://site2s.com/st?api=" + encodeURIComponent(apiToken) + "&url=" + encodeURIComponent(targetUrl);
        }
      } else if (provider === 'yeumoney') {
        apiToken = apiToken || "f8b2659e3643d645e69b9332c3ced1084b7bb2b85e44764426ac03775c2b3bcb";
        var ymApiUrl = "https://yeumoney.com/QL_api.php?token=" + encodeURIComponent(apiToken) + "&format=json&url=" + encodeURIComponent(targetUrl);
        try {
          var response = UrlFetchApp.fetch(ymApiUrl, {
            method: "GET",
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            },
            muteHttpExceptions: true
          });
          var resText = response.getContentText();
          var json = JSON.parse(resText);
          if (json && json.status === "success" && json.shortenedUrl) {
            shortened = json.shortenedUrl;
          }
        } catch (err) {}

        if (!shortened) {
          shortened = "https://yeumoney.com/QL_api.php?token=" + encodeURIComponent(apiToken) + "&url=" + encodeURIComponent(targetUrl);
        }
      } else {
        // Link4m
        apiToken = apiToken || "691eb05d63b1b86d4a3bca1e";
        var l4mApiUrl = "https://link4m.co/api-shorten/v2?api=" + encodeURIComponent(apiToken) + "&url=" + encodeURIComponent(targetUrl);
        try {
          var response = UrlFetchApp.fetch(l4mApiUrl, {
            method: "GET",
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            },
            muteHttpExceptions: true
          });
          var resText = response.getContentText();
          var json = JSON.parse(resText);
          if (json && json.status === "success" && json.shortenedUrl) {
            shortened = json.shortenedUrl;
          }
        } catch (err) {}

        if (!shortened) {
          shortened = "https://link4m.co/st?api=" + encodeURIComponent(apiToken) + "&url=" + encodeURIComponent(targetUrl);
        }
      }

      return output.setContent(JSON.stringify({
        success: true,
        provider: provider,
        shortenedUrl: shortened,
        link: shortened
      }));
    }

    return output.setContent(JSON.stringify({ success: false, message: "Hành động không hợp lệ: " + action }));
  } catch (err) {
    return output.setContent(JSON.stringify({ success: false, error: err.toString() }));
  }
}

/**
 * Hàm tiện ích tự động tạo sheet và thêm dòng tiêu đề nếu chưa có
 */
function getOrCreateSheet(ss, sheetName, headers) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    var defaultSheet = ss.getSheetByName("Sheet1") || ss.getSheetByName("Trang tính1");
    if (defaultSheet && defaultSheet.getLastRow() === 0 && ss.getSheets().length === 1) {
      defaultSheet.setName(sheetName);
      sheet = defaultSheet;
    } else {
      sheet = ss.insertSheet(sheetName);
    }
    if (headers && headers.length > 0) {
      sheet.appendRow(headers);
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#f1f5f9");
    }
  }
  return sheet;
}

/**
 * Hàm so khớp ngày an toàn (xử lý cả kiểu Date của Google Sheet lẫn chuỗi YYYY-MM-DD)
 */
function isSameDate(val, targetStr) {
  if (!val || !targetStr) return false;
  if (val instanceof Date) {
    try {
      var dStr = Utilities.formatDate(val, "GMT+7", "yyyy-MM-dd");
      return dStr === targetStr;
    } catch(e) {}
  }
  var s = String(val).trim();
  return s === targetStr || s.indexOf(targetStr) === 0;
}

/**
 * Phục hồi dấu chấm IP nếu bị Google Sheet (locale VN) tự ý nuốt dấu chấm biến thành số
 * Ví dụ: 113161194193 -> 113.161.194.193
 *        14175157129  -> 14.175.157.129
 */
function restoreIpDots(rawIp) {
  if (!rawIp) return 'Unknown';
  var s = String(rawIp).trim().replace(/^'/, '');
  if (s.indexOf(':') !== -1 || s.indexOf('.') !== -1) return s;
  if (/^\d{10,12}$/.test(s)) {
    var last3Part = s.slice(-9);
    var octet1 = s.slice(0, -9);
    var octet2 = last3Part.slice(0, 3);
    var octet3 = last3Part.slice(3, 6);
    var octet4 = last3Part.slice(6, 9);
    return octet1 + '.' + octet2 + '.' + octet3 + '.' + octet4;
  }
  return s;
}
