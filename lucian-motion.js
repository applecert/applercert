/**
 * LUCIAN MOTION SYSTEM — JS INTERACTION DRIVER (52+ ANIMATIONS)
 * Physics, Tactile Haptics, Spatial Gestures & GPU Micro-Interactions
 * (c) 2026 IPAVIET Ecosystem & Lucian UX/UI
 */

(function (window, document) {
  'use strict';

  const LucianMotion = {
    version: '1.0.0',

    // ─── [A01] Jelly Squish Trigger ───
    triggerJelly(element) {
      if (!element) return;
      element.classList.remove('anim-jelly');
      void element.offsetWidth; // reflow
      element.classList.add('anim-jelly');
      element.animate([
        { transform: 'scale(1, 1)' },
        { transform: 'scale(1.15, 0.85)' },
        { transform: 'scale(0.9, 1.1)' },
        { transform: 'scale(1.05, 0.95)' },
        { transform: 'scale(1, 1)' }
      ], {
        duration: 400,
        easing: 'cubic-bezier(0.34, 1.65, 0.64, 1)'
      });
      if (navigator.vibrate) navigator.vibrate(15);
    },

    // ─── [A03] Magnetic Pull ───
    initMagnetic(selector = '.anim-magnetic', strength = 0.35) {
      const items = document.querySelectorAll(selector);
      items.forEach(el => {
        if (el._hasMagnetic) return;
        el._hasMagnetic = true;

        el.addEventListener('mousemove', (e) => {
          const rect = el.getBoundingClientRect();
          const x = (e.clientX - rect.left - rect.width / 2) * strength;
          const y = (e.clientY - rect.top - rect.height / 2) * strength;
          el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        });

        el.addEventListener('mouseleave', () => {
          el.style.transform = 'translate3d(0, 0, 0)';
        });
      });
    },

    // ─── [A04] Hold-to-Confirm Ring ───
    initHoldToConfirm(selector = '.anim-hold-btn', defaultDuration = 1200) {
      const btns = document.querySelectorAll(selector);
      btns.forEach(btn => {
        if (btn._hasHold) return;
        btn._hasHold = true;

        let fill = btn.querySelector('.anim-hold-fill');
        if (!fill) {
          fill = document.createElement('div');
          fill.className = 'anim-hold-fill';
          btn.prepend(fill);
        }

        let holdTimer = null;
        let startTime = 0;
        const duration = parseInt(btn.dataset.holdDuration || defaultDuration, 10);

        const startHold = (e) => {
          btn.classList.add('is-holding');
          fill.style.transition = `transform ${duration}ms linear`;
          fill.style.transform = 'scaleX(1)';
          startTime = Date.now();
          if (navigator.vibrate) navigator.vibrate(25);

          holdTimer = setTimeout(() => {
            btn.classList.remove('is-holding');
            fill.style.transition = 'none';
            fill.style.transform = 'scaleX(0)';
            if (navigator.vibrate) navigator.vibrate([40, 60, 80]);
            
            const event = new CustomEvent('holdConfirm', { bubbles: true });
            btn.dispatchEvent(event);
            if (typeof btn._onHoldConfirm === 'function') {
              btn._onHoldConfirm();
            }
          }, duration);
        };

        const cancelHold = () => {
          if (holdTimer) {
            clearTimeout(holdTimer);
            holdTimer = null;
          }
          btn.classList.remove('is-holding');
          fill.style.transition = 'transform 0.2s ease-out';
          fill.style.transform = 'scaleX(0)';
        };

        btn.addEventListener('mousedown', startHold);
        btn.addEventListener('touchstart', startHold, { passive: true });
        btn.addEventListener('mouseup', cancelHold);
        btn.addEventListener('mouseleave', cancelHold);
        btn.addEventListener('touchend', cancelHold);
      });
    },

    // ─── [A05] Haptic Ripple Burst ───
    ripple(e, targetEl) {
      const el = targetEl || e.currentTarget;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const dot = document.createElement('span');
      dot.className = 'anim-ripple-dot';
      const x = (e.clientX || (e.touches && e.touches[0].clientX) || (rect.left + rect.width / 2)) - rect.left;
      const y = (e.clientY || (e.touches && e.touches[0].clientY) || (rect.top + rect.height / 2)) - rect.top;
      dot.style.left = `${x}px`;
      dot.style.top = `${y}px`;
      el.appendChild(dot);
      setTimeout(() => dot.remove(), 600);
      if (navigator.vibrate) navigator.vibrate(10);
    },

    // ─── [A06] Download Progress Simulator ───
    simulateDownload(btnEl, onDone) {
      if (!btnEl) return;
      let bar = btnEl.querySelector('.anim-dl-bar');
      if (!bar) {
        bar = document.createElement('div');
        bar.className = 'anim-dl-bar';
        btnEl.prepend(bar);
      }
      bar.style.transform = 'scaleX(0)';
      let p = 0;
      const step = () => {
        p += Math.random() * 25 + 10;
        if (p >= 100) {
          p = 100;
          bar.style.transform = 'scaleX(1)';
          if (onDone) onDone();
          setTimeout(() => {
            bar.style.transform = 'scaleX(0)';
          }, 800);
        } else {
          bar.style.transform = `scaleX(${p / 100})`;
          setTimeout(step, 100);
        }
      };
      step();
    },

    // ─── [A11] 3D Gyro Tilt ───
    initGyroTilt(selector = '.anim-gyro-card', maxTilt = 12) {
      const cards = document.querySelectorAll(selector);
      cards.forEach(card => {
        if (card._hasTilt) return;
        card._hasTilt = true;

        card.addEventListener('mousemove', (e) => {
          const rect = card.getBoundingClientRect();
          const x = (e.clientX - rect.left) / rect.width;
          const y = (e.clientY - rect.top) / rect.height;
          const tiltX = (0.5 - y) * maxTilt * 2;
          const tiltY = (x - 0.5) * maxTilt * 2;
          card.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(1.02, 1.02, 1.02)`;
        });

        card.addEventListener('mouseleave', () => {
          card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
        });
      });
    },

    // ─── [A14] Spotlight Flare Tracking ───
    initSpotlight(selector = '.anim-spotlight') {
      const items = document.querySelectorAll(selector);
      items.forEach(el => {
        if (el._hasSpotlight) return;
        el._hasSpotlight = true;

        let beam = el.querySelector('.anim-spotlight-beam');
        if (!beam) {
          beam = document.createElement('div');
          beam.className = 'anim-spotlight-beam';
          el.prepend(beam);
        }

        el.addEventListener('mousemove', (e) => {
          const rect = el.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          beam.style.left = `${x}px`;
          beam.style.top = `${y}px`;
        });
      });
    },

    // ─── [A29] Scramble Text Decode ───
    scramble(el, targetText, duration = 1000) {
      if (!el) return;
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789!@#$%^&*';
      const original = targetText || el.dataset.scrambleText || el.textContent.trim();
      el.dataset.scrambleText = original;
      const startTime = Date.now();

      const update = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const revealedChars = Math.floor(progress * original.length);

        let result = '';
        for (let i = 0; i < original.length; i++) {
          if (original[i] === ' ') {
            result += ' ';
          } else if (i < revealedChars) {
            result += original[i];
          } else {
            result += chars[Math.floor(Math.random() * chars.length)];
          }
        }
        el.textContent = result;

        if (progress < 1) {
          requestAnimationFrame(update);
        } else {
          el.textContent = original;
        }
      };
      update();
    },

    // ─── [A30] Rolling Odometer Number ───
    odometer(el, targetNumber, duration = 1400, prefix = '', suffix = '') {
      if (!el) return;
      const start = parseFloat(el.dataset.val || '0') || 0;
      const end = parseFloat(targetNumber);
      const startTime = Date.now();
      el.classList.add('anim-odometer');

      const tick = () => {
        const now = Date.now();
        const t = Math.min((now - startTime) / duration, 1);
        // easeOutExpo
        const ease = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
        const current = Math.round(start + (end - start) * ease);
        el.textContent = prefix + current.toLocaleString('vi-VN') + suffix;

        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          el.dataset.val = end;
          el.classList.remove('anim-bump');
          void el.offsetWidth;
          el.classList.add('anim-bump');
        }
      };
      tick();
    },

    // ─── [A32] Typewriter Effect ───
    typewriter(el, text, speed = 45) {
      if (!el) return;
      el.classList.add('anim-typewriter-caret');
      el.textContent = '';
      let idx = 0;
      const timer = setInterval(() => {
        if (idx < text.length) {
          el.textContent += text.charAt(idx);
          idx++;
        } else {
          clearInterval(timer);
        }
      }, speed);
    },

    // ─── [A39] Confetti Burst (Delegates to canvas-confetti or creates fallback particles) ───
    burstConfetti(originX = 0.5, originY = 0.6) {
      if (typeof window.confetti === 'function') {
        window.confetti({
          particleCount: 80,
          spread: 70,
          origin: { x: originX, y: originY },
          colors: ['#0ea5e9', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b']
        });
      } else {
        // Fallback CSS particles
        for (let i = 0; i < 24; i++) {
          const p = document.createElement('div');
          p.style.cssText = `
            position: fixed;
            width: 8px;
            height: 8px;
            border-radius: 2px;
            background: ${['#0ea5e9','#8b5cf6','#ec4899','#f59e0b','#10b981'][i % 5]};
            left: ${originX * 100}vw;
            top: ${originY * 100}vh;
            pointer-events: none;
            z-index: 99999;
            transition: all 0.8s cubic-bezier(0.2, 0.8, 0.4, 1);
          `;
          document.body.appendChild(p);
          const angle = (Math.PI * 2 * i) / 24;
          const dist = 70 + Math.random() * 80;
          requestAnimationFrame(() => {
            p.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist - 30}px) scale(0)`;
            p.style.opacity = '0';
          });
          setTimeout(() => p.remove(), 900);
        }
      }
    },

    // ─── [A40] Parabola Flying Item to Target ───
    flyToTarget(sourceEl, targetEl, icon = '🛍️', callback) {
      if (!sourceEl || !targetEl) return;
      const sRect = sourceEl.getBoundingClientRect();
      const tRect = targetEl.getBoundingClientRect();

      const fly = document.createElement('div');
      fly.className = 'anim-fly-item';
      fly.textContent = icon;
      fly.style.cssText = `
        position: fixed;
        left: ${sRect.left + sRect.width / 2}px;
        top: ${sRect.top + sRect.height / 2}px;
        font-size: 24px;
        z-index: 99999;
        pointer-events: none;
        transition: transform 0.65s cubic-bezier(0.2, 0.8, 0.4, 1), opacity 0.65s ease;
      `;
      document.body.appendChild(fly);

      const dx = (tRect.left + tRect.width / 2) - (sRect.left + sRect.width / 2);
      const dy = (tRect.top + tRect.height / 2) - (sRect.top + sRect.height / 2);

      requestAnimationFrame(() => {
        fly.style.transform = `translate(${dx}px, ${dy}px) scale(0.3)`;
        fly.style.opacity = '0';
      });

      setTimeout(() => {
        fly.remove();
        targetEl.classList.remove('anim-wobble');
        void targetEl.offsetWidth;
        targetEl.classList.add('anim-wobble');
        if (callback) callback();
      }, 650);
    },

    // ─── [A43] Coin Drop & Bounce ───
    dropCoin(container) {
      if (!container) return;
      const coin = document.createElement('div');
      coin.className = 'anim-coin-bounce';
      coin.style.cssText = `
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 38px;
        height: 38px;
        border-radius: 50%;
        background: linear-gradient(135deg, #fcd34d, #d97706);
        box-shadow: 0 4px 12px rgba(217, 119, 6, 0.4);
        font-weight: 800;
        font-size: 18px;
        color: #78350f;
        margin: 4px;
      `;
      coin.textContent = '🪙';
      container.appendChild(coin);
      if (navigator.vibrate) navigator.vibrate(20);
    },

    // ─── [A46] Accordion Smooth Height (CSS Grid) ───
    toggleAccordion(gridEl) {
      if (!gridEl) return;
      gridEl.classList.toggle('is-open');
    },

    // ─── [A47] Toast Spring Slide ───
    showToast(message, type = 'info', duration = 3000) {
      let stack = document.getElementById('lucianToastStack');
      if (!stack) {
        stack = document.createElement('div');
        stack.id = 'lucianToastStack';
        stack.style.cssText = `
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 99999;
          display: flex;
          flex-direction: column-reverse;
          gap: 10px;
          pointer-events: none;
        `;
        document.body.appendChild(stack);
      }

      const toast = document.createElement('div');
      toast.className = 'anim-toast-slide';
      toast.style.cssText = `
        pointer-events: auto;
        padding: 12px 18px;
        border-radius: 16px;
        background: rgba(15, 23, 42, 0.9);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: #fff;
        box-shadow: 0 16px 32px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 13.5px;
        font-weight: 500;
      `;
      
      const icon = type === 'success' ? '✅' : (type === 'error' ? '❌' : '⚡');
      toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
      stack.appendChild(toast);

      requestAnimationFrame(() => {
        toast.classList.add('is-shown');
      });

      setTimeout(() => {
        toast.classList.remove('is-shown');
        setTimeout(() => toast.remove(), 400);
      }, duration);
    },

    // ─── [A52] Checkmark Stroke Trigger ───
    toggleCheckmark(svgEl) {
      if (!svgEl) return;
      svgEl.classList.toggle('is-checked');
      if (svgEl.classList.contains('is-checked') && navigator.vibrate) {
        navigator.vibrate(20);
      }
    },

    // ─── Auto Initialization ───
    init() {
      // Magnetic elements
      this.initMagnetic('.anim-magnetic, [data-magnetic]');

      // Gyro tilt cards
      this.initGyroTilt('.anim-gyro-card, [data-tilt]');

      // Spotlight beams
      this.initSpotlight('.anim-spotlight, [data-spotlight]');

      // Hold to confirm buttons
      this.initHoldToConfirm('.anim-hold-btn, [data-hold]');

      // Auto ripple clicks
      document.addEventListener('click', (e) => {
        const rippleTarget = e.target.closest('.anim-ripple, [data-ripple]');
        if (rippleTarget) {
          LucianMotion.ripple(e, rippleTarget);
        }

        // Bookmark toggle
        const bookmarkBtn = e.target.closest('.anim-ribbon-btn');
        if (bookmarkBtn) {
          bookmarkBtn.classList.toggle('is-active');
          if (navigator.vibrate) navigator.vibrate(15);
        }

        // 3D Flip card toggle
        const flipTrigger = e.target.closest('.anim-flip-wrap, [data-flip]');
        if (flipTrigger) {
          const card = flipTrigger.querySelector('.anim-flip-card') || flipTrigger;
          card.classList.toggle('is-flipped');
        }

        // Accordion toggle
        const accordionBtn = e.target.closest('[data-accordion-toggle]');
        if (accordionBtn) {
          const targetId = accordionBtn.getAttribute('data-accordion-toggle');
          const grid = document.getElementById(targetId);
          if (grid) LucianMotion.toggleAccordion(grid);
        }
      });

      // Scramble text on hover
      document.querySelectorAll('[data-scramble]').forEach(el => {
        el.addEventListener('mouseenter', () => {
          LucianMotion.scramble(el);
        });
      });

      // Odometers on viewport entry
      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting && !entry.target._hasOdometerRun) {
              entry.target._hasOdometerRun = true;
              const val = entry.target.dataset.target || entry.target.textContent.replace(/[^0-9]/g, '');
              const prefix = entry.target.dataset.prefix || '';
              const suffix = entry.target.dataset.suffix || '';
              LucianMotion.odometer(entry.target, val, 1400, prefix, suffix);
            }
          });
        }, { threshold: 0.3 });

        document.querySelectorAll('[data-odometer]').forEach(el => observer.observe(el));
      }

      console.log('✨ [Lucian Motion] 52+ Tactile Motion System Active.');
    }
  };

  window.LucianMotion = LucianMotion;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => LucianMotion.init());
  } else {
    LucianMotion.init();
  }
})(window, document);
