(() => {
  const currentScript = document.currentScript;
  const bottomOffset = currentScript ? (currentScript.getAttribute('data-bottom') || '30px') : '30px';
  const pathPrefix = currentScript ? (currentScript.getAttribute('data-path-prefix') || '') : '';
  const iframeSrc = `${pathPrefix}support.html?embed=true&v=7`;
  const phosphorHref = 'https://cdn.jsdelivr.net/npm/@phosphor-icons/web@2.1.2/src/duotone/style.css';

  const ensureStylesheet = (href) => {
    const hasLink = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).some(link => link.href === href);
    if (hasLink) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    (document.head || document.documentElement).appendChild(link);
  };

  ensureStylesheet(phosphorHref);

  const style = document.createElement('style');
  style.textContent = `
    #floatingWidgetRoot {
      position: fixed;
      right: 20px;
      bottom: ${bottomOffset};
      z-index: 2147483647;
      pointer-events: none;
      isolation: isolate;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color-scheme: light dark;
    }

    #floatingUtilityWidget {
      position: relative;
      width: 182px;
      height: 60px;
      pointer-events: auto;
      overflow: visible;
    }

    #floatingUtilityWidget.widget-expanded {
      width: min(420px, calc(100vw - 24px));
      height: min(720px, calc(100vh - 120px));
    }

    .floating-launcher {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      border: 0;
      border-radius: 20px;
      cursor: pointer;
      background: linear-gradient(135deg, rgba(37, 99, 235, 0.98), rgba(79, 70, 229, 0.95));
      color: #fff;
      box-shadow: 0 18px 40px rgba(37, 99, 235, 0.28), 0 1px 0 rgba(255, 255, 255, 0.16) inset;
      overflow: hidden;
      transition: transform 0.25s ease, opacity 0.25s ease, box-shadow 0.25s ease, filter 0.25s ease;
    }

    .floating-launcher::before {
      content: "";
      position: absolute;
      inset: 1px;
      border-radius: 19px;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0));
      pointer-events: none;
    }

    .floating-launcher:hover {
      transform: translateY(-2px);
      box-shadow: 0 24px 48px rgba(37, 99, 235, 0.34), 0 1px 0 rgba(255, 255, 255, 0.22) inset;
    }

    .launcher-icon {
      width: 38px;
      height: 38px;
      border-radius: 14px;
      display: grid;
      place-items: center;
      flex: 0 0 auto;
      background: rgba(255, 255, 255, 0.14);
      backdrop-filter: blur(10px);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16);
      position: relative;
      z-index: 1;
    }

    .launcher-icon i {
      font-size: 1.25rem;
    }

    .launcher-copy {
      min-width: 0;
      display: flex;
      flex-direction: column;
      text-align: left;
      position: relative;
      z-index: 1;
    }

    .launcher-title {
      font-size: 0.95rem;
      font-weight: 700;
      line-height: 1.1;
      letter-spacing: 0.01em;
    }

    .launcher-subtitle {
      font-size: 0.72rem;
      line-height: 1.2;
      color: rgba(255, 255, 255, 0.8);
    }

    .launcher-badge {
      margin-left: auto;
      width: 28px;
      height: 28px;
      border-radius: 999px;
      display: grid;
      place-items: center;
      background: rgba(255, 255, 255, 0.12);
      position: relative;
      z-index: 1;
    }

    .launcher-badge i {
      font-size: 0.9rem;
    }

    #floatingUtilityWidget.widget-expanded .floating-launcher {
      opacity: 0;
      pointer-events: none;
      transform: translateY(10px) scale(0.98);
    }

    .chat-window-panel {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      border-radius: 28px;
      border: 1px solid rgba(148, 163, 184, 0.2);
      background: rgba(255, 255, 255, 0.92);
      box-shadow: 0 32px 60px rgba(15, 23, 42, 0.24);
      backdrop-filter: blur(26px) saturate(140%);
      overflow: hidden;
      opacity: 0;
      transform: translateY(18px) scale(0.975);
      pointer-events: none;
      transform-origin: bottom right;
      transition: opacity 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease;
    }

    #floatingWidgetRoot.dark .chat-window-panel {
      background: rgba(15, 23, 42, 0.94);
      border-color: rgba(148, 163, 184, 0.16);
      box-shadow: 0 30px 70px rgba(2, 6, 23, 0.52);
    }

    #floatingUtilityWidget.widget-expanded .chat-window-panel {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }

    .chat-window-header {
      padding: 14px 15px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.14);
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(248, 250, 252, 0.68));
    }

    #floatingWidgetRoot.dark .chat-window-header {
      background: linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(15, 23, 42, 0.7));
      border-bottom-color: rgba(148, 163, 184, 0.12);
    }

    .widget-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .widget-brand-icon {
      width: 40px;
      height: 40px;
      border-radius: 14px;
      display: grid;
      place-items: center;
      flex: 0 0 auto;
      background: linear-gradient(135deg, rgba(37, 99, 235, 0.12), rgba(99, 102, 241, 0.14));
      color: #2563eb;
      border: 1px solid rgba(37, 99, 235, 0.14);
    }

    #floatingWidgetRoot.dark .widget-brand-icon {
      color: #93c5fd;
      background: rgba(59, 130, 246, 0.16);
      border-color: rgba(96, 165, 250, 0.14);
    }

    .widget-brand-icon i {
      font-size: 1.1rem;
    }

    .widget-brand-copy {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .widget-brand-title {
      font-size: 0.96rem;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.1;
    }

    #floatingWidgetRoot.dark .widget-brand-title {
      color: #f8fafc;
    }

    .widget-brand-subtitle {
      font-size: 0.74rem;
      color: #64748b;
      line-height: 1.1;
    }

    #floatingWidgetRoot.dark .widget-brand-subtitle {
      color: #94a3b8;
    }

    .widget-header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .widget-status-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      border-radius: 999px;
      font-size: 0.68rem;
      font-weight: 600;
      color: #0f172a;
      background: rgba(148, 163, 184, 0.14);
      white-space: nowrap;
    }

    #floatingWidgetRoot.dark .widget-status-pill {
      color: #e2e8f0;
      background: rgba(148, 163, 184, 0.12);
    }

    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 999px;
      background: #22c55e;
      box-shadow: 0 0 0 5px rgba(34, 197, 94, 0.16);
    }

    .widget-close-btn {
      width: 36px;
      height: 36px;
      border: 0;
      border-radius: 12px;
      display: grid;
      place-items: center;
      cursor: pointer;
      background: rgba(148, 163, 184, 0.14);
      color: #475569;
      transition: transform 0.2s ease, background 0.2s ease, color 0.2s ease;
    }

    #floatingWidgetRoot.dark .widget-close-btn {
      background: rgba(148, 163, 184, 0.12);
      color: #cbd5e1;
    }

    .widget-close-btn:hover {
      transform: translateY(-1px);
      background: rgba(37, 99, 235, 0.12);
      color: #2563eb;
    }

    .chat-window-body {
      position: relative;
      flex: 1;
      min-height: 0;
      background: transparent;
    }

    .chat-window-body iframe {
      width: 100%;
      height: 100%;
      border: 0;
      display: block;
      background: transparent;
    }

    @media (max-width: 640px) {
      #floatingWidgetRoot {
        right: 12px;
      }

      #floatingUtilityWidget {
        width: 60px;
        height: 60px;
      }

      #floatingUtilityWidget.widget-expanded {
        width: calc(100vw - 16px);
        height: calc(100vh - 96px);
      }

      .floating-launcher {
        justify-content: center;
        padding: 10px;
      }

      .launcher-copy,
      .launcher-badge,
      .widget-status-pill {
        display: none;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .floating-launcher,
      .chat-window-panel,
      .widget-close-btn {
        transition: none !important;
      }
    }
  `;
  (document.head || document.documentElement).appendChild(style);

  const widgetRoot = document.createElement('div');
  widgetRoot.id = 'floatingWidgetRoot';
  widgetRoot.innerHTML = `
    <div id="floatingUtilityWidget" aria-live="polite">
      <button
        class="floating-launcher"
        id="openQuickChatBtn"
        type="button"
        aria-label="Mở chat AI"
        aria-expanded="false"
        aria-controls="quickChatPanel"
      >
        <span class="launcher-icon" aria-hidden="true">
          <i class="ph-duotone ph-robot"></i>
        </span>
        <span class="launcher-copy">
          <span class="launcher-title">Chat AI</span>
          <span class="launcher-subtitle">Trợ lý 24/7</span>
        </span>
        <span class="launcher-badge" aria-hidden="true">
          <i class="ph-duotone ph-sparkle"></i>
        </span>
      </button>

      <div class="chat-window-panel" id="quickChatPanel" role="dialog" aria-modal="false" aria-hidden="true" aria-label="Khung chat AI">
        <div class="chat-window-header">
          <div class="widget-brand">
            <div class="widget-brand-icon" aria-hidden="true">
              <i class="ph-duotone ph-robot"></i>
            </div>
            <div class="widget-brand-copy">
              <div class="widget-brand-title">IPAVIET AI</div>
              <div class="widget-brand-subtitle">Đang trực tuyến</div>
            </div>
          </div>
          <div class="widget-header-actions">
            <span class="widget-status-pill">
              <span class="status-dot" aria-hidden="true"></span>
              Online
            </span>
            <button class="widget-close-btn" id="closeQuickChatBtn" type="button" aria-label="Đóng chat">
              <i class="ph-duotone ph-x"></i>
            </button>
          </div>
        </div>
        <div class="chat-window-body">
          <iframe src="${iframeSrc}" title="IPAVIET AI Support" loading="lazy" scrolling="no"></iframe>
        </div>
      </div>
    </div>
  `;
  document.documentElement.appendChild(widgetRoot);

  const widget = document.getElementById('floatingUtilityWidget');
  const toggleButton = document.getElementById('openQuickChatBtn');
  const closeButton = document.getElementById('closeQuickChatBtn');
  const panel = document.getElementById('quickChatPanel');
  const bodyNode = document.body || document.documentElement;
  const htmlNode = document.documentElement;

  if (!widget || !toggleButton || !closeButton || !panel) {
    return;
  }

  let isOpen = false;

  const lockScroll = (locked) => {
    if (locked) {
      bodyNode.style.setProperty('overflow', 'hidden', 'important');
      htmlNode.style.setProperty('overflow', 'hidden', 'important');
      bodyNode.style.setProperty('touch-action', 'none');
    } else {
      bodyNode.style.removeProperty('overflow');
      htmlNode.style.removeProperty('overflow');
      bodyNode.style.removeProperty('touch-action');
    }
  };

  const syncDarkMode = () => {
    const isDark = htmlNode.classList.contains('dark') || bodyNode.classList.contains('dark');
    widgetRoot.classList.toggle('dark', isDark);
  };

  const setChatState = (open) => {
    isOpen = Boolean(open);
    widget.classList.toggle('widget-expanded', isOpen);
    toggleButton.setAttribute('aria-expanded', String(isOpen));
    panel.setAttribute('aria-hidden', String(!isOpen));
    lockScroll(isOpen);
    if (!isOpen) {
      toggleButton.focus({ preventScroll: true });
    }
  };

  toggleButton.addEventListener('click', (event) => {
    event.preventDefault();
    setChatState(!isOpen);
  });

  closeButton.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    setChatState(false);
  });

  document.addEventListener('click', (event) => {
    if (isOpen && !widget.contains(event.target)) {
      setChatState(false);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen) {
      setChatState(false);
    }
  });

  syncDarkMode();
  const darkObserver = new MutationObserver(syncDarkMode);
  darkObserver.observe(htmlNode, { attributes: true, attributeFilter: ['class'] });
  if (document.body) {
    darkObserver.observe(bodyNode, { attributes: true, attributeFilter: ['class'] });
  }

  if (typeof firebase !== 'undefined' && firebase && typeof firebase.auth === 'function') {
    firebase.auth().onAuthStateChanged(user => {
      if (!user) return;
      firebase.firestore().collection('users').doc(user.uid).onSnapshot(doc => {
        if (doc.exists) {
          const data = doc.data();
          if (data.isBlocked === true) {
            alert('⚠️ Tài khoản của bạn đã bị khóa bởi Quản trị viên!');
            firebase.auth().signOut().then(() => {
              window.location.reload();
            });
          }
        }
      });
    });
  }
})();
