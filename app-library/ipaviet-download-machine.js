/**
 * IPAVIET State Machine Download Engine & Zero-CLS Skeletons
 * Complies with Apple HIG & Lucian Tactile Motion standards
 */
(function() {
  'use strict';

  function triggerHaptic(pattern) {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    } catch (e) {}
  }

  const SKELETON_ROW_HTML = `
    <article class="app-row app-skeleton-row" aria-hidden="true">
      <div class="skeleton-shimmer skeleton-icon"></div>
      <div class="skeleton-copy">
        <div class="skeleton-shimmer skeleton-title"></div>
        <div class="skeleton-shimmer skeleton-desc"></div>
      </div>
      <div class="skeleton-shimmer skeleton-pill"></div>
    </article>
  `;

  const DownloadMachine = {
    /**
     * Generate HTML for skeleton rail columns
     */
    getRailSkeletons(columns = 3, rowsPerColumn = 3) {
      let html = '';
      for (let c = 0; c < columns; c++) {
        html += '<div class="app-column app-skeleton-column">';
        for (let r = 0; r < rowsPerColumn; r++) {
          html += SKELETON_ROW_HTML;
        }
        html += '</div>';
      }
      return html;
    },

    /**
     * Generate HTML for skeleton grid
     */
    getGridSkeletons(count = 6) {
      let html = '';
      for (let i = 0; i < count; i++) {
        html += SKELETON_ROW_HTML;
      }
      return html;
    },

    /**
     * 4-Phase State Machine Download Runner
     * @param {HTMLElement} btn - The button element
     * @param {Object} options
     * @param {Function} [options.onAuthorize] - Async function returning boolean or resolving
     * @param {Function} [options.onComplete] - Callback when ready to execute download/link
     * @param {string} [options.successText] - Text on success phase
     */
    async start(btn, options = {}) {
      if (!btn || btn.classList.contains('dl-sm-busy')) return;

      const origHtml = btn.dataset.origContent || btn.innerHTML;
      btn.dataset.origContent = origHtml;
      btn.classList.add('dl-sm-btn', 'dl-sm-busy');

      // ─── Phase 2: Connecting Handshake (350ms) ───
      btn.classList.add('is-connecting');
      btn.innerHTML = `
        <span class="dl-sm-spinner" aria-hidden="true"></span>
        <span>Đang kết nối...</span>
      `;
      triggerHaptic(8);

      try {
        if (typeof options.onAuthorize === 'function') {
          const authOk = await options.onAuthorize();
          if (authOk === false) {
            this.reset(btn);
            return;
          }
        }
      } catch (err) {
        this.reset(btn);
        throw err;
      }

      await new Promise(r => setTimeout(r, 380));

      // ─── Phase 3: Progress Bar (0% -> 100% in ~900ms) ───
      btn.classList.remove('is-connecting');
      btn.classList.add('is-progress');
      btn.innerHTML = `
        <div class="dl-sm-track"><div class="dl-sm-bar" id="dlSmBar"></div></div>
        <span class="dl-sm-label"><span id="dlSmPercent">0</span>% Đang chuẩn bị...</span>
      `;

      const barEl = btn.querySelector('#dlSmBar');
      const pctEl = btn.querySelector('#dlSmPercent');

      const startTime = performance.now();
      const duration = 920; // ms

      await new Promise(resolve => {
        function step(now) {
          const elapsed = now - startTime;
          const progress = Math.min(1, elapsed / duration);
          // Ease-out curve
          const eased = 1 - Math.pow(1 - progress, 2.5);
          const percent = Math.floor(eased * 100);

          if (barEl) barEl.style.width = `${percent}%`;
          if (pctEl) pctEl.textContent = String(percent);

          if (percent === 30 || percent === 65 || percent === 90) {
            triggerHaptic(5);
          }

          if (progress < 1) {
            requestAnimationFrame(step);
          } else {
            resolve();
          }
        }
        requestAnimationFrame(step);
      });

      // ─── Phase 4: Ready / Success State (Emerald Green) ───
      btn.classList.remove('is-progress');
      btn.classList.add('is-success');
      const successText = options.successText || 'Mở trên iOS ✓';

      btn.innerHTML = `
        <svg class="dl-sm-check-svg" viewBox="0 0 24 24" aria-hidden="true">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span>${successText}</span>
      `;

      triggerHaptic([15, 60, 20]);

      // Execute actual download callback
      if (typeof options.onComplete === 'function') {
        try {
          options.onComplete();
        } catch (e) {
          console.error('[DownloadMachine] Completion handler error:', e);
        }
      }

      // Smooth restoration after 4 seconds
      setTimeout(() => {
        this.reset(btn);
      }, 4200);
    },

    /**
     * Restore button to original idle state
     */
    reset(btn) {
      if (!btn) return;
      btn.classList.remove('is-connecting', 'is-progress', 'is-success', 'dl-sm-busy');
      if (btn.dataset.origContent) {
        btn.innerHTML = btn.dataset.origContent;
      }
    }
  };

  /* ══════════════════════════════════════════════════
     RETINA SCREENSHOT GALLERY LIGHTBOX
     ══════════════════════════════════════════════════ */
  let currentGallery = {
    images: [],
    currentIndex: 0,
    dialogEl: null,
    imgEl: null,
    counterEl: null
  };

  function updateLightboxView() {
    if (!currentGallery.imgEl || currentGallery.images.length === 0) return;
    const url = currentGallery.images[currentGallery.currentIndex];
    currentGallery.imgEl.src = url;
    currentGallery.imgEl.classList.remove('is-zoomed');
    if (currentGallery.counterEl) {
      currentGallery.counterEl.textContent = `Ảnh ${currentGallery.currentIndex + 1} / ${currentGallery.images.length}`;
    }
    triggerHaptic(8);
  }

  function nextLightboxImage() {
    if (currentGallery.images.length === 0) return;
    currentGallery.currentIndex = (currentGallery.currentIndex + 1) % currentGallery.images.length;
    updateLightboxView();
  }

  function prevLightboxImage() {
    if (currentGallery.images.length === 0) return;
    currentGallery.currentIndex = (currentGallery.currentIndex - 1 + currentGallery.images.length) % currentGallery.images.length;
    updateLightboxView();
  }

  function setupLightboxKeyboard() {
    window.addEventListener('keydown', (e) => {
      const dlg = currentGallery.dialogEl;
      if (!dlg || !dlg.open) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextLightboxImage();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevLightboxImage();
      } else if (e.key === 'Escape') {
        dlg.close();
      }
    });
  }

  // Expose globally
  window.IPAVIET_DOWNLOAD_MACHINE = DownloadMachine;
  window.IPAVIET_LIGHTBOX = {
    open(images = [], initialIndex = 0) {
      let dlg = document.getElementById('imageDialog');
      if (!dlg) return;

      currentGallery.images = Array.isArray(images) && images.length > 0 ? images : [dlg.querySelector('img')?.src || ''];
      currentGallery.currentIndex = Math.max(0, Math.min(initialIndex, currentGallery.images.length - 1));
      currentGallery.dialogEl = dlg;

      // Construct Apple Glass Lightbox DOM if not already present
      if (!dlg.querySelector('.image-dialog-inner')) {
        dlg.innerHTML = `
          <div class="image-dialog-inner" onclick="if(event.target===this) this.closest('dialog').close();">
            <button type="button" class="image-dialog-close" onclick="document.getElementById('imageDialog').close();" aria-label="Đóng ảnh">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m18 6-12 12M6 6l12 12"/></svg>
            </button>
            <button type="button" class="image-dialog-nav prev" id="imgDlgPrev" aria-label="Ảnh trước">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <div class="image-dialog-view">
              <img id="dialogImage" class="image-dialog-img" src="" alt="Ảnh chụp màn hình phóng to" onclick="this.classList.toggle('is-zoomed');">
              <div class="image-dialog-meta">
                <span class="image-dialog-counter" id="imgDlgCounter">Ảnh 1 / 1</span>
              </div>
            </div>
            <button type="button" class="image-dialog-nav next" id="imgDlgNext" aria-label="Ảnh kế tiếp">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          </div>
        `;
        dlg.querySelector('#imgDlgPrev')?.addEventListener('click', prevLightboxImage);
        dlg.querySelector('#imgDlgNext')?.addEventListener('click', nextLightboxImage);
        setupLightboxKeyboard();
      }

      currentGallery.imgEl = dlg.querySelector('#dialogImage');
      currentGallery.counterEl = dlg.querySelector('#imgDlgCounter');

      // Toggle nav visibility if only 1 image
      const prevBtn = dlg.querySelector('#imgDlgPrev');
      const nextBtn = dlg.querySelector('#imgDlgNext');
      if (prevBtn && nextBtn) {
        prevBtn.style.display = currentGallery.images.length > 1 ? 'grid' : 'none';
        nextBtn.style.display = currentGallery.images.length > 1 ? 'grid' : 'none';
      }

      updateLightboxView();
      dlg.showModal();
    },
    next: nextLightboxImage,
    prev: prevLightboxImage
  };

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupLightboxKeyboard);
  } else {
    setupLightboxKeyboard();
  }
})();
