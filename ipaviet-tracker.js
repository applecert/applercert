/**
 * =========================================================================
 * IPAVIET TELEMETRY & ANALYTICS TRACKER (PHIÊN BẢN NÂNG CẤP THÔNG MINH)
 * =========================================================================
 * - Tự động phát hiện IP, vị trí địa lý (City, Country), nhà mạng (ISP).
 * - Gộp các lượt truy cập từ CÙNG 1 ĐỊA CHỈ IP thành 1 dòng hồ sơ duy nhất.
 * - Nhận diện tài khoản: Tự động ghi nhận Email, Tên, UID nếu khách đã đăng nhập.
 * - Tối ưu lượt xem: Mỗi IP chỉ tính 1 khách duy nhất trong ngày, chống spam F5.
 * - Ghi nhận Hành trình trải nghiệm (Customer Journey Flow): Lưu lịch sử các trang đã xem.
 * - Phát hiện Robot/Crawler tự động (Googlebot, Bingbot...).
 * - Đồng bộ đa tầng thời gian thực: BroadcastChannel + LocalStorage + Firestore + Google Sheet.
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

  // 4. Kiểm tra xem người dùng có phải Robot / Web Crawler không
  function isBotUser() {
    const ua = (navigator.userAgent || '').toLowerCase();
    const botPatterns = ['googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider', 'yandexbot', 'facebookexternalhit', 'telegrambot', 'twitterbot', 'ahrefs', 'semrush', 'lighthouse', 'headlesschrome'];
    return botPatterns.some(bot => ua.includes(bot));
  }

  // 5. Nhận diện tài khoản đã đăng nhập (Firebase Auth & Cache)
  function getLoggedInUserInfo() {
    try {
      // A. Kiểm tra trực tiếp từ instance firebase.auth() hoặc auth
      let u = null;
      if (typeof firebase !== 'undefined' && firebase.auth) {
        try { u = firebase.auth().currentUser; } catch (e) {}
      }
      if (!u && typeof auth !== 'undefined' && auth.currentUser) {
        u = auth.currentUser;
      }
      if (u && (u.email || u.uid)) {
        return {
          uid: u.uid || '',
          email: u.email || '',
          name: u.displayName || (u.email ? u.email.split('@')[0] : 'Thành viên'),
          isMember: true
        };
      }

      // B. Kiểm tra Firebase Auth Cache trong localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('firebase:authUser:')) {
          try {
            const val = JSON.parse(localStorage.getItem(key));
            if (val && (val.email || val.uid)) {
              return {
                uid: val.uid || '',
                email: val.email || '',
                name: val.displayName || (val.email ? val.email.split('@')[0] : 'Thành viên'),
                isMember: true
              };
            }
          } catch (e) {}
        }
      }

      // C. Kiểm tra profile cache tùy biến nếu có
      const customCache = localStorage.getItem('ipaviet_user_profile') || localStorage.getItem('user_info');
      if (customCache) {
        try {
          const parsed = JSON.parse(customCache);
          if (parsed && (parsed.email || parsed.username)) {
            return {
              uid: parsed.uid || '',
              email: parsed.email || parsed.username || '',
              name: parsed.displayName || parsed.name || (parsed.email ? parsed.email.split('@')[0] : 'Thành viên'),
              isMember: true
            };
          }
        } catch (e) {}
      }
    } catch (e) {}

    return {
      uid: '',
      email: '',
      name: '',
      isMember: false
    };
  }

  // 6. Phân tích chi tiết Thiết Bị, Hệ Điều Hành & Trình Duyệt
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

    // Nhận diện Trình duyệt & Ứng dụng nguồn
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

  // 7. Xác định tên trang thân thiện
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

  // 8. Làm sạch nguồn giới thiệu (Referrer)
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

  // 9. Lấy địa chỉ IP & Vị Trí Địa Lý (GeoIP) của Khách
  function getVisitorGeo(callback) {
    // Kiểm tra cache trong Session để tránh gọi API nhiều lần trong 1 phiên
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
      .catch(() => fallbackIp(callback));
  }

  function fallbackIp(callback) {
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

  // 10. Ghi nhận lượt xem & Thông tin người dùng (Gộp theo IP & User Identity)
  function trackPageViewAndVisitor() {
    try {
      // Bỏ qua nếu là robot tìm kiếm (không làm sai lệch dữ liệu)
      const isBot = isBotUser();
      const today = getTodayDateStr();
      const devInfo = getDetailedDeviceInfo();
      const devType = devInfo.devType;

      getVisitorGeo(function (geo) {
        const ip = geo.ip;
        const userInfo = getLoggedInUserInfo();
        const now = new Date();
        const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const currentPageName = getPageName();
        const currentPath = window.location.pathname;

        // Chống đếm trùng lượt xem khi F5 liên tục trong vòng 10 giây
        const pageDebounceKey = `ipaviet_debounce_${currentPath}`;
        const lastPageTime = Number(sessionStorage.getItem(pageDebounceKey)) || 0;
        const isRapidReload = (Date.now() - lastPageTime) < 10000;
        sessionStorage.setItem(pageDebounceKey, String(Date.now()));

        // Kiểm tra xem IP này đã từng vào hôm nay chưa (Chỉ tính 1 lượt xem / truy cập cho mỗi IP trong ngày)
        const ipTodayKey = `ipaviet_ip_seen_${today}_${ip}`;
        const isFirstVisitToday = !localStorage.getItem(ipTodayKey);
        if (isFirstVisitToday) {
          try { localStorage.setItem(ipTodayKey, '1'); } catch (e) {}
        }

        // A. Cập nhật Thống Kê Tổng Daily Summary (LocalStorage)
        // Tối ưu thông minh: Cùng 1 IP chỉ tính 1 lượt xem / truy cập duy nhất trong ngày
        if (!isRapidReload && !isBot && isFirstVisitToday) {
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
          dailyMap[today].uniqueVisitors = (dailyMap[today].uniqueVisitors || 0) + 1;
          if (!dailyMap[today].devices) {
            dailyMap[today].devices = { ios: 0, android: 0, mac: 0, windows: 0, other: 0 };
          }
          dailyMap[today].devices[devType] = (dailyMap[today].devices[devType] || 0) + 1;
          setLocalStats('ipaviet_analytics_daily', dailyMap);

          if (trackerBC) {
            try {
              trackerBC.postMessage({ type: 'pageview', date: today, device: devType });
            } catch (e) {}
          }
        }

        // B. GỘP THEO IP: TÌM HỒ SƠ CỦA IP NÀY ĐỂ CẬP NHẬT HOẶC TẠO MỚI
        let visitors = getLocalStats('ipaviet_analytics_visitors', []);
        const existingIdx = visitors.findIndex(v => v.ip === ip);

        let visitorRecord;
        const newHistoryStep = {
          page: currentPageName,
          path: currentPath,
          time: timeStr,
          timestamp: Date.now()
        };

        if (existingIdx >= 0) {
          // IP ĐÃ TỒN TẠI: Cập nhật in-place, không tạo thêm dòng mới
          visitorRecord = visitors[existingIdx];
          visitorRecord.lastActive = Date.now();
          visitorRecord.timeStr = timeStr;
          visitorRecord.page = currentPageName;
          visitorRecord.path = currentPath;
          visitorRecord.online = true;

          // Cập nhật thông tin đăng nhập nếu người dùng vừa đăng nhập
          if (userInfo.isMember) {
            visitorRecord.userEmail = userInfo.email;
            visitorRecord.userName = userInfo.name;
            visitorRecord.userUid = userInfo.uid;
            visitorRecord.isMember = true;
          }

          // Tăng số lần xem của IP này (chống spam F5)
          if (!isRapidReload) {
            visitorRecord.visits = (visitorRecord.visits || 1) + 1;
          }

          // Cập nhật Hành Trình Duyệt Web (Customer Journey Flow)
          let hist = Array.isArray(visitorRecord.history) ? visitorRecord.history : [];
          // Tránh duplicate bước liên tiếp giống nhau
          if (hist.length === 0 || hist[hist.length - 1].path !== currentPath) {
            hist.push(newHistoryStep);
            if (hist.length > 20) hist = hist.slice(-20);
            visitorRecord.history = hist;
          }

          // Đưa IP hoạt động gần nhất lên đầu mảng
          visitors.splice(existingIdx, 1);
          visitors.unshift(visitorRecord);
        } else {
          // IP MỚI TINH: Tạo hồ sơ khách hàng mới
          visitorRecord = {
            id: 'vis_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            ip: ip,
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
            page: currentPageName,
            path: currentPath,
            referrer: getCleanReferrer(),
            timestamp: Date.now(),
            firstSeen: Date.now(),
            timeStr: timeStr,
            firstSeenStr: timeStr,
            dateStr: today,
            lastActive: Date.now(),
            online: true,
            visits: 1,
            userEmail: userInfo.email || '',
            userName: userInfo.name || '',
            userUid: userInfo.uid || '',
            isMember: userInfo.isMember,
            isBot: isBot,
            history: [newHistoryStep]
          };
          visitors.unshift(visitorRecord);
        }

        visitors = visitors.slice(0, 100);
        setLocalStats('ipaviet_analytics_visitors', visitors);

        // C. Phát tín hiệu Real-time cho Admin Dashboard
        if (trackerBC) {
          try {
            trackerBC.postMessage({ type: 'visitor_active', visitor: visitorRecord });
          } catch (e) {}
        }

        // D. Lưu vào Firestore (Sử dụng doc ID theo IP để tự động gộp 1 document duy nhất!)
        try {
          if (typeof db !== 'undefined' && db.collection) {
            const docId = 'ip_' + String(ip).replace(/[^a-zA-Z0-9_]/g, '_');
            db.collection('analytics_visitors').doc(docId).set({
              ...visitorRecord,
              updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true }).catch(function () {});
          }
        } catch (e) {}

        // E. Gửi ngầm tới Google Sheet Thống Kê (GAS)
        if (ANALYTICS_API_URL && !isBot) {
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
            isUnique: isFirstVisitToday ? 'true' : 'false',
            userEmail: visitorRecord.userEmail || '',
            userName: visitorRecord.userName || '',
            userUid: visitorRecord.userUid || '',
            isMember: visitorRecord.isMember ? 'true' : 'false',
            visits: String(visitorRecord.visits || 1)
          });
          fetch(`${ANALYTICS_API_URL}?${params.toString()}`, { mode: 'no-cors', keepalive: true }).catch(function () {});

          // Tối ưu thông minh: Chỉ gửi pageview đếm lượt xem khi là IP truy cập mới trong ngày (1 IP = 1 lượt xem chuẩn)
          if (isFirstVisitToday && !isRapidReload) {
            const gasUrl = `${ANALYTICS_API_URL}?action=record_analytics&type=pageview&date=${today}&device=${devType}&isUnique=true`;
            fetch(gasUrl, { mode: 'no-cors', keepalive: true }).catch(function () {});
          }
        }
      });
    } catch (err) {}
  }

  // 11. Ghi nhận hành vi click quan tâm chuyên mục / dịch vụ
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

  // 12. Tự động gắn bộ lắng nghe click cho các chuyên mục trên Web Tổng
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

  // 13. Lắng nghe sự kiện đăng nhập / đăng xuất để tự động cập nhật danh tính IP
  function setupAuthListener() {
    try {
      const handleAuth = function (user) {
        if (!user) return;
        const cachedGeo = sessionStorage.getItem('ipaviet_geo');
        if (cachedGeo) {
          const g = JSON.parse(cachedGeo);
          if (g && g.ip) {
            let visitors = getLocalStats('ipaviet_analytics_visitors', []);
            const idx = visitors.findIndex(v => v.ip === g.ip);
            if (idx >= 0) {
              visitors[idx].userEmail = user.email || '';
              visitors[idx].userName = user.displayName || (user.email ? user.email.split('@')[0] : 'Thành viên');
              visitors[idx].userUid = user.uid || '';
              visitors[idx].isMember = true;
              setLocalStats('ipaviet_analytics_visitors', visitors);
              if (trackerBC) {
                trackerBC.postMessage({ type: 'visitor_active', visitor: visitors[idx] });
              }
            }
          }
        }
      };

      if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged(handleAuth);
      } else if (typeof auth !== 'undefined' && auth.onAuthStateChanged) {
        auth.onAuthStateChanged(handleAuth);
      }
    } catch (e) {}
  }

  // 14. Heartbeat duy trì trạng thái online mỗi 45 giây
  setInterval(function () {
    try {
      const geoCached = sessionStorage.getItem('ipaviet_geo');
      if (geoCached && trackerBC) {
        const g = JSON.parse(geoCached);
        trackerBC.postMessage({ type: 'heartbeat', ip: g.ip, page: getPageName(), time: Date.now() });
      }
    } catch (e) {}
  }, 45000);

  // 15. Tự khởi chạy
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      trackPageViewAndVisitor();
      setupAutoTrackers();
      setupAuthListener();
    });
  } else {
    trackPageViewAndVisitor();
    setupAutoTrackers();
    setupAuthListener();
  }

  // 16. Xuất hàm ra window
  window.IPAVietTracker = {
    trackPageView: trackPageViewAndVisitor,
    trackServiceInterest: trackServiceInterest,
    getDetailedDeviceInfo: getDetailedDeviceInfo,
    getTodayDateStr: getTodayDateStr,
    getLoggedInUserInfo: getLoggedInUserInfo
  };
})();
