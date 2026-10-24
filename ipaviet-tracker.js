/**
 * =========================================================================
 * IPAVIET TELEMETRY & ANALYTICS TRACKER (TOÀN HỆ THỐNG / WEB TỔNG)
 * =========================================================================
 * Tự động ghi nhận lượt xem trang (Pageviews), khách truy cập riêng biệt (Unique Visitors),
 * loại thiết bị (iOS, Android, Mac, Windows) và xu hướng click dịch vụ trên toàn hệ thống IPAViet.
 * Tách biệt 100% độc lập, không làm chậm hay nghẽn hệ thống thanh toán / nạp tiền.
 */

(function () {
  'use strict';

  // 1. Cấu hình Web App Google Sheet Thống Kê Riêng Biệt (Phương Án 2)
  const ANALYTICS_API_URL =
    localStorage.getItem('ipaviet_analytics_api_url') ||
    'https://script.google.com/macros/s/AKfycbyx3HSoUoQFWBGgPxkPJME_Qj0w8ltzLTmrFhUpkODdnlRK8r_-a45PCy9rU0dlS9SZ/exec';

  // Kênh truyền tin thời gian thực giữa các tab (cho Admin Dashboard)
  let trackerBC = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      trackerBC = new BroadcastChannel('ipaviet_analytics_channel');
    }
  } catch (e) {}

  // 2. Nhận diện thiết bị
  function getDeviceType() {
    const ua = navigator.userAgent || '';
    if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) return 'ios';
    if (/Android/i.test(ua)) return 'android';
    if (/Macintosh|Mac OS X/i.test(ua)) return 'mac';
    if (/Windows/i.test(ua)) return 'windows';
    return 'other';
  }

  // 3. Lấy chuỗi ngày YYYY-MM-DD theo giờ địa phương
  function getTodayDateStr() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // 4. Tiện ích LocalStorage an toàn
  function getLocalStats(key, fallback) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function setLocalStats(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {}
  }

  // 5. Ghi nhận lượt xem trang (Pageview)
  function trackPageView() {
    try {
      const today = getTodayDateStr();
      const devType = getDeviceType();
      const uvKey = `ipaviet_uv_${today}`;
      const isNewToday = !localStorage.getItem(uvKey);
      if (isNewToday) {
        try {
          localStorage.setItem(uvKey, '1');
        } catch (e) {}
      }

      // A. Cập nhật LocalStorage
      const dailyMap = getLocalStats('ipaviet_analytics_daily', {});
      if (!dailyMap[today]) {
        dailyMap[today] = {
          date: today,
          pageviews: 0,
          uniqueVisitors: 0,
          downloads: 0,
          devices: { ios: 0, android: 0, mac: 0, windows: 0, other: 0 }
        };
      }
      dailyMap[today].pageviews = (dailyMap[today].pageviews || 0) + 1;
      if (isNewToday) {
        dailyMap[today].uniqueVisitors = (dailyMap[today].uniqueVisitors || 0) + 1;
      }
      if (!dailyMap[today].devices) {
        dailyMap[today].devices = { ios: 0, android: 0, mac: 0, windows: 0, other: 0 };
      }
      dailyMap[today].devices[devType] = (dailyMap[today].devices[devType] || 0) + 1;
      setLocalStats('ipaviet_analytics_daily', dailyMap);

      // B. Báo tin cho Admin Dashboard nếu đang mở
      if (trackerBC) {
        try {
          trackerBC.postMessage({ type: 'pageview', date: today, device: devType });
        } catch (e) {}
      }

      // C. Gửi ngầm lên Google Sheet Thống Kê Riêng Biệt (Phương Án 2)
      if (ANALYTICS_API_URL) {
        const gasUrl = `${ANALYTICS_API_URL}?action=record_analytics&type=pageview&date=${today}&device=${devType}&isUnique=${isNewToday}`;
        fetch(gasUrl, { mode: 'no-cors', keepalive: true }).catch(function () {});
      }
    } catch (err) {
      // Đảm bảo không bao giờ ảnh hưởng trải nghiệm người dùng
    }
  }

  // 6. Ghi nhận hành vi click quan tâm chuyên mục / dịch vụ
  function trackServiceInterest(serviceName, category) {
    if (!serviceName) return;
    try {
      const docId = 'service_' + serviceName.toLowerCase().replace(/[^a-z0-9_-]/g, '_').substring(0, 50);
      const today = getTodayDateStr();

      // Cập nhật LocalStorage
      const appsMap = getLocalStats('ipaviet_analytics_apps', {});
      if (!appsMap[docId]) {
        appsMap[docId] = {
          id: docId,
          name: serviceName,
          bundleId: 'service.ipaviet.site',
          icon: 'https://ipaviet.site/assets/anime/icon.png',
          category: category || 'Dịch vụ Hệ Thống',
          isMod: false,
          isVip: false,
          views: 0,
          downloads: 0
        };
      }
      appsMap[docId].views = (appsMap[docId].views || 0) + 1;
      appsMap[docId].lastViewedAt = new Date().toISOString();
      setLocalStats('ipaviet_analytics_apps', appsMap);

      if (trackerBC) {
        try {
          trackerBC.postMessage({ type: 'service_click', service: serviceName });
        } catch (e) {}
      }

      // Gửi ngầm tới Google Sheet
      if (ANALYTICS_API_URL) {
        const p = new URLSearchParams({
          action: 'record_analytics',
          type: 'app_view',
          appKey: docId,
          appName: serviceName,
          bundleId: 'service.ipaviet.site',
          category: category || 'Dịch vụ Hệ Thống',
          isMod: 'false',
          isVip: 'false'
        });
        fetch(`${ANALYTICS_API_URL}?${p.toString()}`, { mode: 'no-cors', keepalive: true }).catch(function () {});
      }
    } catch (e) {}
  }

  // 7. Tự động gắn bộ lắng nghe click cho các chuyên mục trên Web Tổng
  function setupAutoTrackers() {
    try {
      // Theo dõi click vào các panel hệ sinh thái (eco-panels)
      document.querySelectorAll('.eco-panel, .header-cta, .cta-btn').forEach(function (el) {
        el.addEventListener('click', function () {
          const title = (el.querySelector('.eco-title') && el.querySelector('.eco-title').textContent.trim()) ||
            (el.textContent && el.textContent.trim()) ||
            'Chuyên mục hệ sinh thái';
          trackServiceInterest(title, 'Hệ Sinh Thái');
        });
      });
    } catch (e) {}
  }

  // 8. Tự khởi chạy
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      trackPageView();
      setupAutoTrackers();
    });
  } else {
    trackPageView();
    setupAutoTrackers();
  }

  // 9. Xuất hàm ra window để các trang khác có thể gọi thủ công khi cần
  window.IPAVietTracker = {
    trackPageView: trackPageView,
    trackServiceInterest: trackServiceInterest,
    getDeviceType: getDeviceType,
    getTodayDateStr: getTodayDateStr
  };
})();
