/**
 * IPAVIET UNIFIED THEME CONTROLLER (Global Synchronizer)
 * (c) 2026 IPAVIET Ecosystem & Apple HIG Standard
 * 
 * Synchronizes:
 * - documentElement.classList ('dark' / 'light')
 * - documentElement.dataset.theme ('dark' / 'light')
 * - documentElement.setAttribute('data-cc-xem', 'toi' / 'sang')
 * Across all storage keys:
 * - 'ipaviet_theme', 'theme', 'maclife_store_theme', 'cc-giao-dien'
 */
(function(window, document) {
  'use strict';

  function getStoredTheme() {
    try {
      var saved = localStorage.getItem('ipaviet_theme') || 
                  localStorage.getItem('theme') || 
                  localStorage.getItem('maclife_store_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      var cc = localStorage.getItem('cc-giao-dien');
      if (cc === 'toi') return 'dark';
      if (cc === 'sang') return 'light';
    } catch(e) {}
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark'; // Premium OLED Obsidian default
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

    // Update meta theme-color for iOS Safari chrome
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', isDark ? '#07090e' : '#f5f5f7');
    }
  }

  var currentTheme = getStoredTheme();
  // Immediate execution before DOM finishes rendering to prevent FOUC
  applyTheme(currentTheme);

  window.IPAVIET_THEME = {
    get: function() {
      return currentTheme;
    },
    set: function(theme) {
      if (theme !== 'dark' && theme !== 'light') return;
      currentTheme = theme;
      try {
        localStorage.setItem('ipaviet_theme', theme);
        localStorage.setItem('theme', theme);
        localStorage.setItem('maclife_store_theme', theme);
        localStorage.setItem('cc-giao-dien', theme === 'dark' ? 'toi' : 'sang');
      } catch(e) {}
      applyTheme(theme);
      window.dispatchEvent(new CustomEvent('ipavietThemeChange', { detail: { theme: theme, isDark: theme === 'dark' } }));
    },
    toggle: function() {
      var next = currentTheme === 'dark' ? 'light' : 'dark';
      this.set(next);
      return next;
    }
  };

  // Listen to system OS preference changes if no manual preference stored
  if (window.matchMedia) {
    var mql = window.matchMedia('(prefers-color-scheme: dark)');
    var handler = function(e) {
      var hasStored = false;
      try {
        hasStored = !!(localStorage.getItem('ipaviet_theme') || localStorage.getItem('theme') || localStorage.getItem('maclife_store_theme') || localStorage.getItem('cc-giao-dien'));
      } catch(err) {}
      if (!hasStored) {
        var sysTheme = e.matches ? 'dark' : 'light';
        currentTheme = sysTheme;
        applyTheme(sysTheme);
      }
    };
    if (mql.addEventListener) {
      mql.addEventListener('change', handler);
    } else if (mql.addListener) {
      mql.addListener(handler);
    }
  }

  // Also bind to any button with data-theme-toggle or .theme-toggle
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('[data-theme-toggle], .theme-toggle, .btn-theme-switch');
    if (btn) {
      e.preventDefault();
      var next = window.IPAVIET_THEME.toggle();
      if (window.LucianMotion && window.LucianMotion.showToast) {
        window.LucianMotion.showToast(next === 'dark' ? 'Chế độ tối (Dark Mode) kích hoạt' : 'Chế độ sáng (Light Mode) kích hoạt', 'info');
      }
    }
  });

})(window, document);
