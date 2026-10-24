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
          if (String(data[i][0]) === today) {
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

          sheetDaily.getRange(foundRow, 2).setValue(curViews + 1);
          if (isUnique) sheetDaily.getRange(foundRow, 3).setValue(curUniques + 1);
          sheetDaily.getRange(foundRow, colDev).setValue(curDev + 1);
          sheetDaily.getRange(foundRow, 10).setValue(nowIso);
        } else {
          var ios = (device === 'ios' ? 1 : 0);
          var android = (device === 'android' ? 1 : 0);
          var mac = (device === 'mac' ? 1 : 0);
          var win = (device === 'windows' ? 1 : 0);
          var oth = (!['ios', 'android', 'mac', 'windows'].includes(device) ? 1 : 0);
          sheetDaily.appendRow([today, 1, (isUnique ? 1 : 1), 0, ios, android, mac, win, oth, nowIso]);
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
          if (String(dData[j][0]) === today) {
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
          if (String(dVals[i][0]) === queryDate) {
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

      return output.setContent(JSON.stringify({
        success: true,
        today: todayStat,
        apps: appsList,
        recentDownloads: recentList,
        searches: searchList,
        serverTime: new Date().toISOString()
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
