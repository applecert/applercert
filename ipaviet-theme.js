/**
 * IPAVIET UNIFIED THEME & CERT APPLE SHELL CONTROLLER
 * Đồng bộ toàn bộ 18 trang theo chuẩn giao diện Cert Apple (.ios-root + .thanh-duoi)
 * Hỗ trợ:
 * - Chế độ Sáng / Tối / Theo máy đồng nhất (data-cc-xem="sang|toi", class="light|dark")
 * - Màu nhấn linh hoạt theo ngữ cảnh (data-accent="crimson|amber|blue|emerald")
 * - Thanh điều hướng nổi .thanh-duoi chuẩn Cert Apple xuyên suốt toàn hệ sinh thái
 */
(function (window, document) {
  'use strict';

  function detectContextualAccent() {
    var p = (window.location.pathname || '').toLowerCase();
    if (p.indexOf('dichvu') !== -1 || p.indexOf('naptien') !== -1 || p.indexOf('account') !== -1 || p.indexOf('top-up') !== -1) {
      return 'amber';
    }
    if (p.indexOf('app-library') !== -1 || p.indexOf('sign-app') !== -1 || p.indexOf('vsign') !== -1 || p.indexOf('phim-tat') !== -1) {
      return 'blue';
    }
    if (p.indexOf('tap-hoa-mmo') !== -1 || p.indexOf('mmo-product') !== -1) {
      return 'emerald';
    }
    return 'crimson'; // Cert Apple, Trang chủ, Hỗ trợ
  }

  function getStoredTheme() {
    try {
      var cc = localStorage.getItem('cc-giao-dien');
      if (cc === 'toi') return 'dark';
      if (cc === 'sang') return 'light';
      var saved = localStorage.getItem('ipaviet_theme') ||
                  localStorage.getItem('theme') ||
                  localStorage.getItem('maclife_store_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch (e) {}
    return 'light'; // Chuẩn mặc định Sáng (#f6f7f9) như Cert Apple
  }

  function applyTheme(theme) {
    var isDark = theme === 'dark';
    var doc = document.documentElement;

    if (isDark) {
      doc.classList.add('dark');
      doc.classList.remove('light');
    } else {
      doc.classList.remove('dark');
      doc.classList.add('light');
    }

    doc.dataset.theme = theme;
    doc.setAttribute('data-cc-xem', isDark ? 'toi' : 'sang');
    if (!doc.getAttribute('data-accent')) {
      doc.setAttribute('data-accent', detectContextualAccent());
    }

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', isDark ? '#0b0e14' : '#f6f7f9');
    }

    // Cập nhật icon nút đổi theme trên thanh .thanh-duoi nếu đã render
    var dockThemeBtn = document.getElementById('thanhDuoiThemeBtn');
    if (dockThemeBtn) {
      dockThemeBtn.setAttribute('aria-label', isDark ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối');
      dockThemeBtn.title = isDark ? 'Đang dùng chế độ Tối — bấm để chuyển Sáng' : 'Đang dùng chế độ Sáng — bấm để chuyển Tối';
      dockThemeBtn.innerHTML = isDark
        ? '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="4.2" stroke="currentColor" stroke-width="1.9"/><path d="M12 2.5v2.2M12 19.3v2.2M4.7 4.7l1.6 1.6M17.7 17.7l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.7 19.3l1.6-1.6M17.7 6.3l1.6-1.6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20.2 14.4A8.2 8.2 0 0 1 9.6 3.8a8.2 8.2 0 1 0 10.6 10.6Z" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/></svg>';
    }
  }

  var currentTheme = getStoredTheme();
  applyTheme(currentTheme);

  window.IPAVIET_THEME = {
    get: function () {
      return currentTheme;
    },
    set: function (theme) {
      if (theme !== 'dark' && theme !== 'light') return;
      currentTheme = theme;
      try {
        localStorage.setItem('ipaviet_theme', theme);
        localStorage.setItem('theme', theme);
        localStorage.setItem('maclife_store_theme', theme);
        localStorage.setItem('cc-giao-dien', theme === 'dark' ? 'toi' : 'sang');
      } catch (e) {}
      applyTheme(theme);
      window.dispatchEvent(new CustomEvent('ipavietThemeChange', { detail: { theme: theme, isDark: theme === 'dark' } }));
    },
    toggle: function () {
      var next = currentTheme === 'dark' ? 'light' : 'dark';
      this.set(next);
      return next;
    }
  };

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-theme-toggle], .theme-toggle, .btn-theme-switch, #thanhDuoiThemeBtn');
    if (btn) {
      e.preventDefault();
      var next = window.IPAVIET_THEME.toggle();
      if (window.LucianMotion && window.LucianMotion.showToast) {
        window.LucianMotion.showToast(next === 'dark' ? 'Đã chuyển sang giao diện Tối' : 'Đã chuyển sang giao diện Sáng', 'info');
      }
    }
  });

  // Khởi tạo thanh điều hướng nổi .thanh-duoi đồng bộ toàn hệ sinh thái
  function initUnifiedCertAppleDock() {
    var path = (window.location.pathname || '').toLowerCase();
    // Không chèn trên trang quản trị admin hoặc trang nhận thưởng nhiệm vụ
    if (path.indexOf('admin.html') !== -1 || path.indexOf('claim.html') !== -1) return;

    var inSubdir = path.indexOf('/certapple/') !== -1 ||
                   path.indexOf('/app-library/') !== -1 ||
                   path.indexOf('/sign-app/') !== -1 ||
                   path.indexOf('/store/') !== -1 ||
                   path.indexOf('/top-up/') !== -1;
    var prefix = inSubdir ? '../' : '';

    var activeKey = 'home';
    if (path.indexOf('/app-library/') !== -1 || path.indexOf('ipavip') !== -1) activeKey = 'ipa';
    else if (path.indexOf('/certapple/') !== -1 || path.indexOf('cert.html') !== -1) activeKey = 'cert';
    else if (path.indexOf('/sign-app/') !== -1 || path.indexOf('vsign') !== -1) activeKey = 'sign';
    else if (path.indexOf('account') !== -1 || path.indexOf('dichvu') !== -1 || path.indexOf('naptien') !== -1) activeKey = 'account';

    var items = [
      {
        key: 'home',
        label: 'Trang chủ',
        href: prefix + 'index.html',
        icon: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 9.5V20h13V9.5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      },
      {
        key: 'ipa',
        label: 'Kho IPA',
        href: prefix + 'app-library/index.html',
        icon: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3.5" y="3.5" width="7.5" height="7.5" rx="2" stroke="currentColor" stroke-width="1.9"/><rect x="13" y="3.5" width="7.5" height="7.5" rx="2" stroke="currentColor" stroke-width="1.9"/><rect x="3.5" y="13" width="7.5" height="7.5" rx="2" stroke="currentColor" stroke-width="1.9"/><rect x="13" y="13" width="7.5" height="7.5" rx="2" stroke="currentColor" stroke-width="1.9"/></svg>'
      },
      {
        key: 'cert',
        label: 'Chứng chỉ',
        href: prefix + 'certapple/index.html',
        icon: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3 4.5 6v5.8c0 4.8 3.2 8.7 7.5 9.7 4.3-1 7.5-4.9 7.5-9.7V6L12 3Z" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><path d="m9 12 2.1 2.1L15.2 10" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      },
      {
        key: 'sign',
        label: 'Ký App',
        href: prefix + 'sign-app/index.html',
        icon: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M13 3 5.5 13.5H12L11 21l7.5-10.5H12L13 3Z" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      },
      {
        key: 'account',
        label: 'Tài khoản',
        href: prefix + 'account.html',
        icon: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="8.5" r="3.6" stroke="currentColor" stroke-width="1.9"/><path d="M5 19.5c1.6-3.1 4.1-4.6 7-4.6s5.4 1.5 7 4.6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>'
      }
    ];

    var nav = document.getElementById('bottomNav') || document.querySelector('nav.thanh-duoi');
    if (!nav) {
      nav = document.createElement('nav');
      nav.className = 'thanh-duoi';
      nav.id = 'bottomNav';
      nav.setAttribute('aria-label', 'Điều hướng chính');
      document.body.appendChild(nav);
    }

    var html = '';
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var isCurrent = it.key === activeKey;
      html += '<a class="thanh-duoi-muc" aria-label="' + it.label + '"' + (isCurrent ? ' aria-current="page"' : '') + ' href="' + it.href + '">' +
              it.icon +
              '<span class="thanh-duoi-chu">' + it.label + '</span>' +
              '</a>';
    }
    html += '<button type="button" class="thanh-duoi-muc" id="thanhDuoiThemeBtn" aria-label="Đổi giao diện Sáng / Tối"></button>';
    nav.innerHTML = html;

    // Ẩn các thanh bottom bar cũ bị trùng lặp (nếu có)
    var legacyNavs = document.querySelectorAll('.floating-nav, .mobile-bottom-nav, #mobileBottomNav, .bottom-tabs, nav.fixed.bottom-0, nav.thanh-duoi-cu');
    for (var j = 0; j < legacyNavs.length; j++) {
      if (legacyNavs[j] !== nav) {
        legacyNavs[j].style.setProperty('display', 'none', 'important');
      }
    }

    applyTheme(currentTheme);

    // Hiệu ứng thu gọn thanh .thanh-duoi khi cuộn trang hoặc bật bàn phím
    window.addEventListener('scroll', function () {
      if (window.scrollY > 24) {
        nav.classList.add('thu');
      } else {
        nav.classList.remove('thu');
      }
    }, { passive: true });

    var inputs = document.querySelectorAll('input, textarea, select');
    for (var k = 0; k < inputs.length; k++) {
      inputs[k].addEventListener('focus', function () { nav.classList.add('an-ban-phim'); });
      inputs[k].addEventListener('blur', function () { nav.classList.remove('an-ban-phim'); });
    }

    syncGlobalHeaderAuthPill();
  }

  // Cầu nối nhận diện tài khoản 0ms toàn hệ sinh thái (localStorage + IndexedDB)
  function getCachedAuthUser() {
    try {
      var raw = localStorage.getItem('ipaviet_auth_user');
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && (parsed.uid || parsed.email)) {
          var cachedCoins = localStorage.getItem('cached_coins');
          if (cachedCoins !== null && typeof parsed.coins !== 'number') {
            parsed.coins = parseInt(cachedCoins, 10) || 0;
          }
          return parsed;
        }
      }
    } catch (e) {}
    return null;
  }

  function readNativeFirebaseIndexedDB(callback) {
    if (!window.indexedDB) return callback(null);
    try {
      var req = window.indexedDB.open('firebaseLocalStorageDb');
      req.onerror = function () { callback(null); };
      req.onsuccess = function (e) {
        try {
          var idb = e.target.result;
          if (!idb.objectStoreNames.contains('firebaseLocalStorage')) {
            idb.close();
            return callback(null);
          }
          var tx = idb.transaction(['firebaseLocalStorage'], 'readonly');
          var store = tx.objectStore('firebaseLocalStorage');
          var allReq = store.getAll();
          allReq.onsuccess = function () {
            var rows = allReq.result || [];
            for (var i = 0; i < rows.length; i++) {
              var u = rows[i] && rows[i].value ? rows[i].value : rows[i];
              if (u && (u.uid || u.email)) {
                idb.close();
                return callback(u);
              }
            }
            idb.close();
            callback(null);
          };
          allReq.onerror = function () {
            idb.close();
            callback(null);
          };
        } catch (err) {
          callback(null);
        }
      };
    } catch (err) {
      callback(null);
    }
  }

  function renderHeaderPillWithUser(user) {
    if (!user || (!user.uid && !user.email)) return;
    var shortName = (user.displayName || user.email || 'Thành viên').split(' ').slice(-1)[0] || (user.email ? user.email.split('@')[0] : 'Tôi');
    var av = user.photoURL || ('https://ui-avatars.com/api/?name=' + encodeURIComponent(shortName) + '&background=e10e0e&color=fff&size=64');
    var coinsVal = typeof user.coins === 'number' ? user.coins : (parseInt(localStorage.getItem('cached_coins'), 10) || 0);

    // 1. Nếu trang có sẵn #navUserName & #navAvatar (như naptien.html)
    var navName = document.getElementById('navUserName');
    var navAv = document.getElementById('navAvatar');
    if (navName && navAv) {
      navName.textContent = shortName;
      navAv.innerHTML = '<img src="' + av + '" alt="" class="w-full h-full rounded-full object-cover"/>';
    }

    // 2. Nâng cấp nút tài khoản trên Header của index.html và các trang dùng Header chuẩn
    var headerLinks = document.querySelectorAll('header a[href*="account.html"]');
    for (var i = 0; i < headerLinks.length; i++) {
      var link = headerLinks[i];
      if (link.id === 'navUserLink' || link.querySelector('#navUserName')) continue;
      link.classList.remove('w-8', 'justify-center');
      link.classList.add('px-2', 'pr-3', 'gap-2');
      link.style.width = 'auto';
      var balanceHtml = coinsVal > 0
        ? '<span class="text-[11px] font-bold text-flame hidden sm:inline">· ' + coinsVal.toLocaleString('vi-VN') + 'đ</span>'
        : '';
      link.innerHTML =
        '<img src="' + av + '" alt="" class="h-5 w-5 rounded-full object-cover shrink-0"/>' +
        '<span class="text-xs font-bold text-label truncate max-w-[96px]">' + shortName + '</span>' +
        balanceHtml;
      link.title = (user.email || shortName) + ' — Số dư: ' + coinsVal.toLocaleString('vi-VN') + 'đ';
    }
  }

  function syncGlobalHeaderAuthPill() {
    var cached = getCachedAuthUser();
    if (cached) {
      renderHeaderPillWithUser(cached);
    }
    readNativeFirebaseIndexedDB(function (idbUser) {
      if (idbUser) {
        var existing = getCachedAuthUser() || {};
        var merged = {
          uid: idbUser.uid || existing.uid,
          email: idbUser.email || existing.email || '',
          displayName: existing.displayName || idbUser.displayName || '',
          photoURL: existing.photoURL || idbUser.photoURL || '',
          coins: typeof existing.coins === 'number' ? existing.coins : (parseInt(localStorage.getItem('cached_coins'), 10) || 0),
          bonusCoins: typeof existing.bonusCoins === 'number' ? existing.bonusCoins : 0,
          savedAt: Date.now()
        };
        try {
          localStorage.setItem('ipaviet_auth_user', JSON.stringify(merged));
        } catch (e) {}
        renderHeaderPillWithUser(merged);
      }
    });
  }

  window.IPAVIET_AUTH = {
    getCached: getCachedAuthUser,
    readIndexedDB: readNativeFirebaseIndexedDB,
    refreshHeader: syncGlobalHeaderAuthPill
  };

  window.addEventListener('storage', function (e) {
    if (e.key === 'ipaviet_auth_user' || e.key === 'cached_coins') {
      syncGlobalHeaderAuthPill();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUnifiedCertAppleDock);
  } else {
    initUnifiedCertAppleDock();
  }
})(window, document);
