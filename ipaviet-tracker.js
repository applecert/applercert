/**
 * =========================================================================
 * IPAVIET TELEMETRY & ANALYTICS TRACKER (TOÀN HỆ THỐNG / WEB TỔNG)
 * =========================================================================
 * - Tự động ghi nhận lượt xem trang (Pageview), khách riêng biệt (Unique Visitors)
 * - Tự động phát hiện IP, vị trí địa lý (City, Country), nhà mạng (ISP)
 * - Phân tích chi tiết Thiết bị (iOS, Android, Mac, Windows), Model máy & Trình duyệt
 * - Đồng bộ thời gian thực đa kênh: BroadcastChannel + LocalStorage + Firestore + Google Sheet
 * - Hoàn toàn độc lập, bất đồng bộ, không bao giờ làm chậm hay nghẽn website.
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

  // 2. Lấy chuỗi ngày YYYY-MM-DD theo giờ địa phương
  function getTodayDateStr() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // 3. Tiện ích LocalStorage an toàn
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

  // 4. Phân tích chi tiết Thiết Bị, Hệ Điều Hành & Trình Duyệt
  function getDetailedDeviceInfo() {
    const ua = navigator.userAgent || '';
    let devType = 'other';
    let devModel = 'Thiết Bị Khác';
    let browser = 'Trình Duyệt Web';

    if (/iPad/.test(ua)) {
      devType = 'ios';
      devModel = 'Apple iPad';
    } else if (/iPhone|iPod/.test(ua) && !window.MSStream) {
      devType = 'ios';
      const m = ua.match(/OS (\d+)_?(\d+)?/);
      devModel = m ? `iPhone (iOS ${m[1]}.${m[2] || 0})` : 'Apple iPhone';
    } else if (/Android/i.test(ua)) {
      devType = 'android';
      const m = ua.match(/Android\s([0-9\.]+)/);
      devModel = m ? `Android (${m[1]})` : 'Android Device';
    } else if (/Macintosh|Mac OS X/i.test(ua)) {
      devType = 'mac';
      devModel = 'Apple Mac / MacBook';
    } else if (/Windows/i.test(ua)) {
      devType = 'windows';
      if (/Windows NT 10.0/.test(ua)) devModel = 'Windows 10/11 PC';
      else devModel = 'Windows PC';
    } else if (/Linux/i.test(ua)) {
      devType = 'other';
      devModel = 'Linux';
    }

    // Nhận diện Trình duyệt
    if (/Telegram/i.test(ua)) browser = 'Telegram App';
    else if (/FBAN|FBAV/i.test(ua)) browser = 'Facebook App';
    else if (/Zalo/i.test(ua)) browser = 'Zalo App';
    else if (/Edg/i.test(ua)) browser = 'Microsoft Edge';
    else if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = 'Google Chrome';
    else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Apple Safari';
    else if (/Firefox/i.test(ua)) browser = 'Mozilla Firefox';
    else if (/Opera|OPR/i.test(ua)) browser = 'Opera';

    return { devType, devModel, browser };
  }

  // 5. Xác định tên trang thân thiện
  function getPageName() {
    const p = window.location.pathname.toLowerCase();
    if (p.includes('app-library')) return 'Kho Ứng Dụng (IPA Library)';
    if (p.includes('tap-hoa-mmo')) return 'Chợ Việt MMO';
    if (p.includes('naptien')) return 'Nạp Tiền Ví';
    if (p.includes('dichvu')) return 'Dịch Vụ Số';
    if (p.includes('ipavip')) return 'Cổng VIP IPA';
    if (p.includes('phim-tat')) return 'Kho Phím Tắt iOS';
    if (p.includes('vsign')) return 'VSign Web';
    if (p.includes('account')) return 'Trang Cá Nhân';
    if (p.includes('admin')) return 'Admin OS';
    return document.title ? document.title.split('—')[0].trim() : 'Trang Chủ IPAViet';
  }

  // 6. Làm sạch nguồn giới thiệu (Referrer)
  function getCleanReferrer() {
    const ref = document.referrer || '';
    if (!ref) return 'Truy cập trực tiếp';
    try {
      const u = new URL(ref);
      if (u.hostname.includes('google')) return 'Google Tìm Kiếm';
      if (u.hostname.includes('facebook') || u.hostname.includes('fb.com')) return 'Facebook';
      if (u.hostname.includes('t.me') || u.hostname.includes('telegram')) return 'Telegram';
      if (u.hostname.includes('tiktok')) return 'TikTok';
      if (u.hostname.includes('youtube')) return 'YouTube';
      if (u.hostname.includes('zalo')) return 'Zalo';
      if (u.hostname === window.location.hostname) return 'Nội bộ website';
      return u.hostname;
    } catch (e) {
      return ref.substring(0, 40);
    }
  }

  // 7. Lấy địa chỉ IP & Vị Trí Địa Lý (GeoIP) của Khách
  function getVisitorGeo(callback) {
    // A. Kiểm tra cache trong Session để không gọi API quá nhiều lần trong 1 phiên
    try {
      const cached = sessionStorage.getItem('ipaviet_geo');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.ip && parsed.ip !== 'Unknown') {
          callback(parsed);
          return;
        }
      }
    } catch (e) {}

    // B. Gọi API GeoIP có hỗ trợ CORS và tốc độ cao (ipwho.is)
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3200));
    const fetchGeo = fetch('https://ipwho.is/', { mode: 'cors' }).then(res => res.json());

    Promise.race([fetchGeo, timeout])
      .then(data => {
        if (data && data.success) {
          const geo = {
            ip: data.ip || 'Unknown',
            city: data.city || 'Việt Nam',
            region: data.region || '',
            country: data.country || 'Việt Nam',
            countryCode: data.country_code || 'VN',
            flag: (data.flag && data.flag.emoji) || '🇻🇳',
            isp: (data.connection && data.connection.isp) || data.isp || 'Internet'
          };
          try { sessionStorage.setItem('ipaviet_geo', JSON.stringify(geo)); } catch (e) {}
          callback(geo);
        } else {
          fallbackIp(callback);
        }
      })
      .catch(() => {
        fallbackIp(callback);
      });
  }

  function fallbackIp(callback) {
    // Dự phòng qua ipify
    fetch('https://api.ipify.org?format=json')
      .then(r => r.json())
      .then(data => {
        const geo = {
          ip: (data && data.ip) || 'Unknown',
          city: 'Việt Nam',
          region: '',
          country: 'Việt Nam',
          countryCode: 'VN',
          flag: '🇻🇳',
          isp: 'Internet'
        };
        try { sessionStorage.setItem('ipaviet_geo', JSON.stringify(geo)); } catch (e) {}
        callback(geo);
      })
      .catch(() => {
        callback({
          ip: 'Ẩn danh / VPN',
          city: 'Việt Nam',
          region: '',
          country: 'Việt Nam',
          countryCode: 'VN',
          flag: '🇻🇳',
          isp: 'Internet'
        });
      });
  }

  // 8. Ghi nhận lượt xem & Thông tin người dùng truy cập
  function trackPageViewAndVisitor() {
    try {
      const today = getTodayDateStr();
      const devInfo = getDetailedDeviceInfo();
      const devType = devInfo.devType;
      const uvKey = `ipaviet_uv_${today}`;
      const isNewToday = !localStorage.getItem(uvKey);
      if (isNewToday) {
        try { localStorage.setItem(uvKey, '1'); } catch (e) {}
      }

      // A. Cập nhật Thống Kê Tổng Daily Summary (LocalStorage)
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

      // B. Báo tin realtime tổng hợp cho Admin Dashboard
      if (trackerBC) {
        try {
          trackerBC.postMessage({ type: 'pageview', date: today, device: devType });
        } catch (e) {}
      }

      // C. Lấy IP và ghi nhận chi tiết Người Xem (Visitor Log)
      getVisitorGeo(function (geo) {
        const now = new Date();
        const visitorRecord = {
          id: 'vis_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          ip: geo.ip,
          city: geo.city,
          region: geo.region,
          country: geo.country,
          countryCode: geo.countryCode,
          flag: geo.flag,
          isp: geo.isp,
          deviceType: devInfo.devType,
          deviceModel: devInfo.devModel,
          browser: devInfo.browser,
          screen: `${window.innerWidth}x${window.innerHeight}`,
          page: getPageName(),
          path: window.location.pathname,
          referrer: getCleanReferrer(),
          timestamp: Date.now(),
          timeStr: now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          dateStr: today,
          lastActive: Date.now(),
          online: true
        };

        // Lưu vào LocalStorage (Tối đa 100 khách gần nhất)
        let visitors = getLocalStats('ipaviet_analytics_visitors', []);
        // Nếu cùng 1 IP truy cập trong vòng 5 phút, cập nhật trang xem & thời gian
        const existingIdx = visitors.findIndex(v => v.ip === visitorRecord.ip && (Date.now() - (v.timestamp || 0) < 300000));
        if (existingIdx >= 0) {
          visitors[existingIdx].page = visitorRecord.page;
          visitors[existingIdx].path = visitorRecord.path;
          visitors[existingIdx].lastActive = Date.now();
          visitors[existingIdx].timeStr = visitorRecord.timeStr;
          visitors[existingIdx].visits = (visitors[existingIdx].visits || 1) + 1;
        } else {
          visitors.unshift(visitorRecord);
        }
        visitors = visitors.slice(0, 100);
        setLocalStats('ipaviet_analytics_visitors', visitors);

        // Phát tín hiệu Real-time cho bảng Admin Dashboard
        if (trackerBC) {
          try {
            trackerBC.postMessage({ type: 'visitor_active', visitor: visitorRecord });
          } catch (e) {}
        }

        // Lưu vào Firestore nếu có
        try {
          if (typeof db !== 'undefined' && db.collection) {
            db.collection('analytics_visitors').add({
              ...visitorRecord,
              createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }).catch(function () {});
          }
        } catch (e) {}

        // Gửi ngầm tới Google Sheet Thống Kê Riêng Biệt (GAS)
        if (ANALYTICS_API_URL) {
          const params = new URLSearchParams({
            action: 'record_analytics',
            type: 'visitor',
            ip: visitorRecord.ip,
            city: visitorRecord.city,
            country: visitorRecord.country,
            isp: visitorRecord.isp,
            device: visitorRecord.deviceType,
            deviceModel: visitorRecord.deviceModel,
            browser: visitorRecord.browser,
            page: visitorRecord.page,
            referrer: visitorRecord.referrer,
            date: today,
            isUnique: isNewToday
          });
          fetch(`${ANALYTICS_API_URL}?${params.toString()}`, { mode: 'no-cors', keepalive: true }).catch(function () {});
        }
      });

      // D. Gửi record_analytics pageview tiêu chuẩn lên GAS
      if (ANALYTICS_API_URL) {
        const gasUrl = `${ANALYTICS_API_URL}?action=record_analytics&type=pageview&date=${today}&device=${devType}&isUnique=${isNewToday}`;
        fetch(gasUrl, { mode: 'no-cors', keepalive: true }).catch(function () {});
      }
    } catch (err) {}
  }

  // 9. Ghi nhận hành vi click quan tâm chuyên mục / dịch vụ
  function trackServiceInterest(serviceName, category) {
    if (!serviceName) return;
    try {
      const docId = 'service_' + serviceName.toLowerCase().replace(/[^a-z0-9_-]/g, '_').substring(0, 50);
      const today = getTodayDateStr();

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

  // 10. Tự động gắn bộ lắng nghe click cho các chuyên mục trên Web Tổng
  function setupAutoTrackers() {
    try {
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

  // 11. Heartbeat duy trì trạng thái online mỗi 45 giây
  setInterval(function () {
    try {
      const geoCached = sessionStorage.getItem('ipaviet_geo');
      if (geoCached && trackerBC) {
        const g = JSON.parse(geoCached);
        trackerBC.postMessage({ type: 'heartbeat', ip: g.ip, page: getPageName(), time: Date.now() });
      }
    } catch (e) {}
  }, 45000);

  // 12. Tự khởi chạy
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      trackPageViewAndVisitor();
      setupAutoTrackers();
    });
  } else {
    trackPageViewAndVisitor();
    setupAutoTrackers();
  }

  // 13. Xuất hàm ra window
  window.IPAVietTracker = {
    trackPageView: trackPageViewAndVisitor,
    trackServiceInterest: trackServiceInterest,
    getDetailedDeviceInfo: getDetailedDeviceInfo,
    getTodayDateStr: getTodayDateStr
  };
})();
