/**
 * IPAVIET GLOBAL SEARCH CONTROLLER (Cmd+K / Spotlight Experience)
 * (c) 2026 IPAVIET Ecosystem
 */
(function(window, document) {
  'use strict';

  // Determine root path prefix based on current pathname
  function getPathPrefix() {
    var p = window.location.pathname;
    if (p.includes('/app-library/') || p.includes('/certapple/') || p.includes('/100days/') || p.includes('/store/')) {
      return '../';
    }
    return '';
  }

  var ROOT = getPathPrefix();

  // Core Ecosystem Catalog
  var CORE_SERVICES = [
    {
      title: 'Kho Ứng Dụng IPA & Game Mod',
      desc: 'Hàng ngàn app mod, game crack sẵn bản quyền, cài đặt 1-click.',
      url: ROOT + 'app-library/index.html',
      category: 'Hệ Sinh Thái',
      badge: 'App Store',
      icon: '📱'
    },
    {
      title: 'Chứng Chỉ Apple Developer (Cert iOS)',
      desc: 'Ký app không giới hạn, không lo thu hồi, bảo hành 300 ngày.',
      url: ROOT + 'certapple/index.html',
      category: 'Hệ Sinh Thái',
      badge: 'Cấp Tốc',
      icon: '🛡️'
    },
    {
      title: 'Tra Cứu Đơn Hàng & Chứng Chỉ',
      desc: 'Kiểm tra tình trạng cert theo UDID thiết bị hoặc mã đơn.',
      url: ROOT + 'certapple/tra-cuu.html',
      category: 'Hệ Sinh Thái',
      badge: 'Tra cứu',
      icon: '🔍'
    },
    {
      title: 'Cổng Mua & Thanh Toán VietQR Tự Động',
      desc: 'Đặt mua gói P12 & MobileProvision kích hoạt tức thì.',
      url: ROOT + 'certapple/checkout.html',
      category: 'Hệ Sinh Thái',
      badge: 'VietQR',
      icon: '💳'
    },
    {
      title: 'Chợ Tài Nguyên & Dịch Vụ MMO',
      desc: 'Mua bán tool, tài khoản và tài nguyên MMO tự động 24/7.',
      url: ROOT + 'tap-hoa-mmo.html',
      category: 'Hệ Sinh Thái',
      badge: 'Chợ MMO',
      icon: '🛒'
    },
    {
      title: 'VSign Native — Ứng Dụng Ký IPA Trực Tiếp',
      desc: 'Công cụ ký số IPA trực tuyến trên iPhone không cần máy tính.',
      url: ROOT + 'vsign.html',
      category: 'Công Cụ',
      badge: 'Native',
      icon: '✍️'
    },
    {
      title: 'Kho Phím Tắt iOS & Tự Động Hóa',
      desc: 'Bộ sưu tập Shortcuts tải video TikTok, YouTube, tiện ích iPhone.',
      url: ROOT + 'phim-tat.html',
      category: 'Công Cụ',
      badge: 'Shortcuts',
      icon: '⚡'
    },
    {
      title: 'Nạp Tiền Vào Ví IPAVIET',
      desc: 'Cổng nạp tiền tự động qua ngân hàng BIDV, cộng số dư siêu tốc.',
      url: ROOT + 'naptien.html',
      category: 'Tài Chính',
      badge: 'Ví Tiền',
      icon: '💰'
    },
    {
      title: 'Quản Lý Tài Khoản & Gói Hội Viên',
      desc: 'Xem số dư ví, tủ đồ bản quyền và lịch sử giao dịch cá nhân.',
      url: ROOT + 'account.html',
      category: 'Tài Khoản',
      badge: 'Hội Viên',
      icon: '👤'
    },
    {
      title: 'Dịch Vụ Hệ Thống (VPS, Proxy, SMS)',
      desc: 'Hạ tầng mạng và máy chủ chuyên dụng cho người làm MMO.',
      url: ROOT + 'dichvu.html',
      category: 'Hệ Thống',
      badge: 'Hạ Tầng',
      icon: '🌐'
    }
  ];

  // Popular App Catalog
  var POPULAR_APPS = [
    { title: 'VSign Pro Native', desc: 'Ký số IPA trực tiếp trên iOS, hỗ trợ chứng chỉ P12 cá nhân', url: ROOT + 'vsign.html', category: 'Ứng Dụng Nổi Bật', badge: 'Khuyên Dùng', icon: '✍️' },
    { title: 'ESign iOS No Revoke', desc: 'Trình quản lý chứng chỉ và ký IPA đa năng hàng đầu', url: ROOT + 'app-library/index.html?search=ESign', category: 'Ứng Dụng Nổi Bật', badge: 'Hot', icon: '📝' },
    { title: 'Scarlet App Installer', desc: 'Cài đặt IPA trực tiếp bằng tài khoản Apple ID', url: ROOT + 'app-library/index.html?search=Scarlet', category: 'Ứng Dụng Nổi Bật', badge: 'Free', icon: '⚡' },
    { title: 'TikTok LRD / Dark Mod', desc: 'Tải video không logo watermark, đổi vùng quốc gia', url: ROOT + 'app-library/index.html?search=TikTok', category: 'Ứng Dụng Nổi Bật', badge: 'Mod', icon: '🎵' },
    { title: 'Spotify++ Deluxe Premium', desc: 'Mở khóa âm thanh cao cấp không quảng cáo', url: ROOT + 'app-library/index.html?search=Spotify', category: 'Ứng Dụng Nổi Bật', badge: 'VIP', icon: '🎧' },
    { title: 'YouTube uYouPlus Extra', desc: 'Chặn 100% quảng cáo, phát trong nền và tải video 4K', url: ROOT + 'app-library/index.html?search=YouTube', category: 'Ứng Dụng Nổi Bật', badge: 'Mod', icon: '▶️' }
  ];

  var allSearchItems = CORE_SERVICES.concat(POPULAR_APPS);
  var overlayEl = null;
  var inputEl = null;
  var resultsEl = null;
  var selectedIndex = 0;
  var currentFiltered = [];

  function removeVietnameseTones(str) {
    if (!str) return '';
    return str.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D')
      .toLowerCase();
  }

  function createSearchDOM() {
    if (document.getElementById('ipavietSearchOverlay')) return;

    overlayEl = document.createElement('div');
    overlayEl.id = 'ipavietSearchOverlay';
    overlayEl.className = 'ipaviet-search-overlay';
    overlayEl.innerHTML = [
      '<div class="ipaviet-search-modal" role="dialog" aria-modal="true" aria-label="Tìm kiếm toàn hệ thống">',
      '  <div class="ipaviet-search-header">',
      '    <svg class="ipaviet-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>',
      '    <input type="text" class="ipaviet-search-input" id="ipavietSearchInput" placeholder="Tìm ứng dụng, chứng chỉ, dịch vụ... (hoặc gõ /)" autocomplete="off" spellcheck="false">',
      '    <div class="ipaviet-search-kbd">ESC</div>',
      '  </div>',
      '  <div class="ipaviet-search-body" id="ipavietSearchResults"></div>',
      '  <div class="ipaviet-search-footer">',
      '    <div class="ipaviet-search-shortcuts">',
      '      <span><kbd class="ipaviet-search-kbd">↑</kbd><kbd class="ipaviet-search-kbd">↓</kbd> Di chuyển</span>',
      '      <span><kbd class="ipaviet-search-kbd">↵</kbd> Chọn</span>',
      '      <span><kbd class="ipaviet-search-kbd">ESC</kbd> Đóng</span>',
      '    </div>',
      '    <span>IPAVIET Search Engine 2.0</span>',
      '  </div>',
      '</div>'
    ].join('\n');

    document.body.appendChild(overlayEl);
    inputEl = document.getElementById('ipavietSearchInput');
    resultsEl = document.getElementById('ipavietSearchResults');

    // Click outside to close
    overlayEl.addEventListener('click', function(e) {
      if (e.target === overlayEl) {
        closeSearch();
      }
    });

    // Input typing
    inputEl.addEventListener('input', function() {
      renderResults(inputEl.value.trim());
    });

    // Keyboard navigation
    inputEl.addEventListener('keydown', function(e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (currentFiltered.length > 0) {
          selectedIndex = (selectedIndex + 1) % currentFiltered.length;
          updateSelectedClass();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (currentFiltered.length > 0) {
          selectedIndex = (selectedIndex - 1 + currentFiltered.length) % currentFiltered.length;
          updateSelectedClass();
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (currentFiltered[selectedIndex]) {
          window.location.href = currentFiltered[selectedIndex].url;
        }
      } else if (e.key === 'Escape') {
        closeSearch();
      }
    });
  }

  function updateSelectedClass() {
    var items = resultsEl.querySelectorAll('.ipaviet-search-item');
    items.forEach(function(el, idx) {
      if (idx === selectedIndex) {
        el.classList.add('is-selected');
        el.scrollIntoView({ block: 'nearest' });
      } else {
        el.classList.remove('is-selected');
      }
    });
  }

  function renderResults(query) {
    if (!resultsEl) return;
    var normQuery = removeVietnameseTones(query);

    if (!normQuery) {
      currentFiltered = allSearchItems;
    } else {
      currentFiltered = allSearchItems.filter(function(item) {
        var matchTitle = removeVietnameseTones(item.title).includes(normQuery);
        var matchDesc = removeVietnameseTones(item.desc).includes(normQuery);
        var matchBadge = removeVietnameseTones(item.badge).includes(normQuery);
        return matchTitle || matchDesc || matchBadge;
      });
    }

    selectedIndex = 0;

    if (currentFiltered.length === 0) {
      resultsEl.innerHTML = [
        '<div style="text-align:center;padding:48px 20px;color:#86868b;">',
        '  <div style="font-size:36px;margin-bottom:12px;">🔍</div>',
        '  <div style="font-size:15px;font-weight:700;color:inherit;">Không tìm thấy kết quả phù hợp</div>',
        '  <div style="font-size:13px;margin-top:6px;">Hãy thử tìm từ khóa khác như "Cert", "VSign", "Tiktok", "MMO"...</div>',
        '</div>'
      ].join('\n');
      return;
    }

    var html = '';
    var lastCategory = '';

    currentFiltered.forEach(function(item, idx) {
      if (item.category !== lastCategory) {
        lastCategory = item.category;
        html += '<div class="ipaviet-search-group-title">' + lastCategory + '</div>';
      }

      var isSelected = idx === selectedIndex ? ' is-selected' : '';
      html += [
        '<a href="' + item.url + '" class="ipaviet-search-item' + isSelected + '" data-idx="' + idx + '">',
        '  <div class="ipaviet-search-item-icon">' + item.icon + '</div>',
        '  <div class="ipaviet-search-item-content">',
        '    <div class="ipaviet-search-item-title">' + item.title + ' <span class="ipaviet-search-item-badge">' + item.badge + '</span></div>',
        '    <div class="ipaviet-search-item-desc">' + item.desc + '</div>',
        '  </div>',
        '  <div class="ipaviet-search-item-arrow">→</div>',
        '</a>'
      ].join('\n');
    });

    resultsEl.innerHTML = html;

    // Hover mouse sync
    resultsEl.querySelectorAll('.ipaviet-search-item').forEach(function(el) {
      el.addEventListener('mouseenter', function() {
        var idx = parseInt(el.dataset.idx, 10);
        if (!isNaN(idx)) {
          selectedIndex = idx;
          updateSelectedClass();
        }
      });
    });
  }

  function openSearch(initialQuery) {
    createSearchDOM();
    overlayEl.classList.add('is-active');
    inputEl.value = initialQuery || '';
    renderResults(inputEl.value);
    setTimeout(function() {
      inputEl.focus();
      inputEl.select();
    }, 50);
    if (navigator.vibrate) navigator.vibrate(15);
  }

  function closeSearch() {
    if (overlayEl) {
      overlayEl.classList.remove('is-active');
      if (inputEl) inputEl.blur();
    }
  }

  window.IPAVIET_SEARCH = {
    open: openSearch,
    close: closeSearch,
    toggle: function() {
      if (overlayEl && overlayEl.classList.contains('is-active')) {
        closeSearch();
      } else {
        openSearch();
      }
    }
  };

  // Keyboard shortcut listener: Cmd+K, Ctrl+K, or Slash "/"
  document.addEventListener('keydown', function(e) {
    var isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) || document.activeElement.isContentEditable;

    // Cmd+K or Ctrl+K
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      window.IPAVIET_SEARCH.toggle();
      return;
    }

    // Single slash key "/" when not typing in an input
    if (e.key === '/' && !isInput) {
      e.preventDefault();
      window.IPAVIET_SEARCH.open();
      return;
    }

    // Escape closes
    if (e.key === 'Escape' && overlayEl && overlayEl.classList.contains('is-active')) {
      closeSearch();
    }
  });

  // Also bind to any element with [data-open-search] or .btn-open-search
  document.addEventListener('click', function(e) {
    var trigger = e.target.closest('[data-open-search], .btn-open-search, .search-trigger');
    if (trigger) {
      e.preventDefault();
      window.IPAVIET_SEARCH.open();
    }
  });

})(window, document);

