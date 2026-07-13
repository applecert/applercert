(function() {
  const currentScript = document.currentScript;
  const bottomOffset = currentScript ? (currentScript.getAttribute('data-bottom') || '30px') : '30px';
  const pathPrefix = currentScript ? (currentScript.getAttribute('data-path-prefix') || '') : '';
  const iframeSrc = `${pathPrefix}support.html?embed=true`;

  // Inject Stylesheet
  const style = document.createElement('style');
  style.textContent = `
    #floatingUtilityWidget {
      position: fixed;
      bottom: ${bottomOffset};
      right: 20px;
      z-index: 9999;
      width: 320px;
      height: 450px;
      pointer-events: none;
    }

    .mascot-bubble {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 55px;
      height: 55px;
      border-radius: 16px;
      cursor: pointer;
      pointer-events: auto;
      transition: transform 0.2s cubic-bezier(0.19, 1, 0.22, 1), opacity 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
      overflow: hidden;
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(20px);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    }

    .dark .mascot-bubble {
      background: rgba(15, 23, 42, 0.85);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    }

    .mascot-bubble:hover {
      transform: scale(1.08);
    }

    .mascot-bubble:active {
      transform: scale(0.95);
    }

    .chat-window-panel {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 320px;
      height: 450px;
      border-radius: 20px;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      box-shadow: 0 10px 40px rgba(0, 0, 60, 0.25);
      pointer-events: auto;
      opacity: 0;
      visibility: hidden;
      transform: scale(0.9) translateZ(0);
      transform-origin: bottom right;
      transition: opacity 0.25s cubic-bezier(0.19, 1, 0.22, 1), 
                  transform 0.25s cubic-bezier(0.19, 1, 0.22, 1), 
                  visibility 0.25s;
      overflow: hidden;
      z-index: 20;
    }

    .dark .chat-window-panel {
      background: rgba(15, 23, 42, 0.98);
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
    }

    .chat-close-btn {
      position: absolute;
      top: 10px;
      right: 12px;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.05);
      border: none;
      color: #64748b;
      font-size: 16px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 99999;
      transition: background 0.2s, color 0.2s;
    }

    .dark .chat-close-btn {
      background: rgba(255, 255, 255, 0.1);
      color: #cbd5e1;
    }

    .chat-close-btn:hover {
      background: rgba(0, 0, 0, 0.1);
      color: #0f172a;
    }

    .dark .chat-close-btn:hover {
      background: rgba(255, 255, 255, 0.2);
      color: #fff;
    }

    #quickChatToggleCheckbox:checked ~ .chat-window-panel {
      opacity: 1;
      visibility: visible;
      transform: scale(1) translateZ(0);
    }

    #quickChatToggleCheckbox:checked ~ .mascot-bubble {
      opacity: 0;
      pointer-events: none;
      transform: scale(0.8);
    }

    .container-ai-input {
      --perspective: 1000px;
      --translateY: 8px;
      position: absolute;
      left: 0;
      right: 0;
      top: 0;
      bottom: 0;
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      transform-style: preserve-3d;
    }

    .background-blur-balls {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translateX(-50%) translateY(-50%);
      width: 100%;
      height: 100%;
      z-index: -10;
      border-radius: 16px;
      transition: all 0.3s ease;
      background-color: rgba(255, 255, 255, 0.8);
      overflow: hidden;
    }

    .dark .background-blur-balls {
      background-color: rgba(15, 23, 42, 0.85);
    }

    .balls {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translateX(-50%) translateY(-50%);
      animation: rotate-background-balls 10s linear infinite;
    }

    .mascot-bubble:hover .balls {
      animation-play-state: paused;
    }

    .background-blur-balls .ball {
      width: 2.2rem;
      height: 2.2rem;
      position: absolute;
      border-radius: 50%;
      filter: blur(12px);
    }

    .background-blur-balls .ball.violet {
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      background-color: #9147ff;
    }

    .background-blur-balls .ball.green {
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      background-color: #34d399;
    }

    .background-blur-balls .ball.rosa {
      top: 50%;
      left: 0;
      transform: translateY(-50%);
      background-color: #ec4899;
    }

    .background-blur-balls .ball.cyan {
      top: 50%;
      right: 0;
      transform: translateY(-50%);
      background-color: #05e0f5;
    }

    .background-blur-card {
      width: 100%;
      height: 100%;
      backdrop-filter: blur(50px);
    }

    .eyes {
      position: absolute;
      left: 50%;
      bottom: 50%;
      transform: translateX(-50%) translateY(50%);
      display: flex;
      align-items: center;
      justify-content: center;
      height: 18px;
      gap: 6px;
      transition: all 0.3s ease;
    }

    .eyes .eye {
      width: 9px;
      height: 18px;
      background-color: #1e293b;
      border-radius: 4px;
      animation: animate-eyes 10s infinite linear;
      transition: all 0.3s ease;
    }

    .dark .eyes .eye {
      background-color: #fff;
    }

    .eyes.happy {
      display: none;
      color: #1e293b;
      gap: 0;
    }

    .dark .eyes.happy {
      color: #fff;
    }

    .eyes.happy svg {
      width: 24px;
    }

    .mascot-bubble:hover .eyes .eye {
      display: none;
    }

    .mascot-bubble:hover .eyes.happy {
      display: flex;
    }

    .area:nth-child(15):hover ~ .mascot-bubble,
    .area:nth-child(15):hover ~ .mascot-bubble .eyes .eye {
      transform: perspective(var(--perspective)) rotateX(-15deg) rotateY(15deg)
        translateZ(var(--translateY)) scale3d(1, 1, 1);
    }
    .area:nth-child(14):hover ~ .mascot-bubble,
    .area:nth-child(14):hover ~ .mascot-bubble .eyes .eye {
      transform: perspective(var(--perspective)) rotateX(-15deg) rotateY(7deg)
        translateZ(var(--translateY)) scale3d(1, 1, 1);
    }
    .area:nth-child(13):hover ~ .mascot-bubble,
    .area:nth-child(13):hover ~ .mascot-bubble .eyes .eye {
      transform: perspective(var(--perspective)) rotateX(-15deg) rotateY(0)
        translateZ(var(--translateY)) scale3d(1, 1, 1);
    }
    .area:nth-child(12):hover ~ .mascot-bubble,
    .area:nth-child(12):hover ~ .mascot-bubble .eyes .eye {
      transform: perspective(var(--perspective)) rotateX(-15deg) rotateY(-7deg)
        translateZ(var(--translateY)) scale3d(1, 1, 1);
    }
    .area:nth-child(11):hover ~ .mascot-bubble,
    .area:nth-child(11):hover ~ .mascot-bubble .eyes .eye {
      transform: perspective(var(--perspective)) rotateX(-15deg) rotateY(-15deg)
        translateZ(var(--translateY)) scale3d(1, 1, 1);
    }

    .area:nth-child(10):hover ~ .mascot-bubble,
    .area:nth-child(10):hover ~ .mascot-bubble .eyes .eye {
      transform: perspective(var(--perspective)) rotateX(0) rotateY(15deg)
        translateZ(var(--translateY)) scale3d(1, 1, 1);
    }
    .area:nth-child(9):hover ~ .mascot-bubble,
    .area:nth-child(9):hover ~ .mascot-bubble .eyes .eye {
      transform: perspective(var(--perspective)) rotateX(0) rotateY(7deg)
        translateZ(var(--translateY)) scale3d(1, 1, 1);
    }
    .area:nth-child(8):hover ~ .mascot-bubble,
    .area:nth-child(8):hover ~ .mascot-bubble .eyes .eye {
      transform: perspective(var(--perspective)) rotateX(0) rotateY(0)
        translateZ(var(--translateY)) scale3d(1, 1, 1);
    }
    .area:nth-child(7):hover ~ .mascot-bubble,
    .area:nth-child(7):hover ~ .mascot-bubble .eyes .eye {
      transform: perspective(var(--perspective)) rotateX(0) rotateY(-7deg)
        translateZ(var(--translateY)) scale3d(1, 1, 1);
    }
    .area:nth-child(6):hover ~ .mascot-bubble,
    .area:nth-child(6):hover ~ .mascot-bubble .eyes .eye {
      transform: perspective(var(--perspective)) rotateX(0) rotateY(-15deg)
        translateZ(var(--translateY)) scale3d(1, 1, 1);
    }

    .area:nth-child(5):hover ~ .mascot-bubble,
    .area:nth-child(5):hover ~ .mascot-bubble .eyes .eye {
      transform: perspective(var(--perspective)) rotateX(15deg) rotateY(15deg)
        translateZ(var(--translateY)) scale3d(1, 1, 1);
    }
    .area:nth-child(4):hover ~ .mascot-bubble,
    .area:nth-child(4):hover ~ .mascot-bubble .eyes .eye {
      transform: perspective(var(--perspective)) rotateX(15deg) rotateY(7deg)
        translateZ(var(--translateY)) scale3d(1, 1, 1);
    }
    .area:nth-child(3):hover ~ .mascot-bubble,
    .area:nth-child(3):hover ~ .mascot-bubble .eyes .eye {
      transform: perspective(var(--perspective)) rotateX(15deg) rotateY(0)
        translateZ(var(--translateY)) scale3d(1, 1, 1);
    }
    .area:nth-child(2):hover ~ .mascot-bubble,
    .area:nth-child(2):hover ~ .mascot-bubble .eyes .eye {
      transform: perspective(var(--perspective)) rotateX(15deg) rotateY(-7deg)
        translateZ(var(--translateY)) scale3d(1, 1, 1);
    }
    .area:nth-child(1):hover ~ .mascot-bubble,
    .area:nth-child(1):hover ~ .mascot-bubble .eyes .eye {
      transform: perspective(var(--perspective)) rotateX(15deg) rotateY(-15deg)
        translateZ(var(--translateY)) scale3d(1, 1, 1);
    }

    @keyframes rotate-background-balls {
      from { transform: translateX(-50%) translateY(-50%) rotate(360deg); }
      to { transform: translateX(-50%) translateY(-50%) rotate(0); }
    }

    @keyframes animate-eyes {
      46% { height: 18px; }
      48% { height: 8px; }
      50% { height: 18px; }
      96% { height: 18px; }
      98% { height: 8px; }
      100% { height: 18px; }
    }
  `;
  document.head.appendChild(style);

  // Inject HTML Markup
  const widget = document.createElement('div');
  widget.id = 'floatingUtilityWidget';
  widget.innerHTML = `
    <div class="container-ai-input">
      <div class="area"></div>
      <div class="area"></div>
      <div class="area"></div>
      <div class="area"></div>
      <div class="area"></div>
      <div class="area"></div>
      <div class="area"></div>
      <div class="area"></div>
      <div class="area"></div>
      <div class="area"></div>
      <div class="area"></div>
      <div class="area"></div>
      <div class="area"></div>
      <div class="area"></div>
      <div class="area"></div>
    </div>
    
    <input type="checkbox" id="quickChatToggleCheckbox" style="display: none;" />
    
    <label class="mascot-bubble" for="quickChatToggleCheckbox">
      <div class="background-blur-balls">
        <div class="balls">
          <span class="ball rosa"></span>
          <span class="ball violet"></span>
          <span class="ball green"></span>
          <span class="ball cyan"></span>
        </div>
      </div>
      <div class="background-blur-card">
        <div class="eyes">
          <span class="eye"></span>
          <span class="eye"></span>
        </div>
        <div class="eyes happy">
          <svg fill="none" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M8.28386 16.2843C8.9917 15.7665 9.8765 14.731 12 14.731C14.1235 14.731 15.0083 15.7665 15.7161 16.2843C17.8397 17.8376 18.7542 16.4845 18.9014 15.7665C19.4323 13.1777 17.6627 11.1066 17.3088 10.5888C16.3844 9.23666 14.1235 8 12 8C9.87648 8 7.61556 9.23666 6.69122 10.5888C6.33728 11.1066 4.56771 13.1777 5.09858 15.7665C5.24582 16.4845 6.16034 17.8376 8.28386 16.2843Z"
            ></path>
          </svg>
          <svg fill="none" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M8.28386 16.2843C8.9917 15.7665 9.8765 14.731 12 14.731C14.1235 14.731 15.0083 15.7665 15.7161 16.2843C17.8397 17.8376 18.7542 16.4845 18.9014 15.7665C19.4323 13.1777 17.6627 11.1066 17.3088 10.5888C16.3844 9.23666 14.1235 8 12 8C9.87648 8 7.61556 9.23666 6.69122 10.5888C6.33728 11.1066 4.56771 13.1777 5.09858 15.7665C5.24582 16.4845 6.16034 17.8376 8.28386 16.2843Z"
            ></path>
          </svg>
        </div>
      </div>
    </label>

    <div class="chat-window-panel">
      <button class="chat-close-btn" id="closeQuickChatBtn" type="button">&times;</button>
      <iframe src="${iframeSrc}" style="width: 100%; height: 100%; border: none; border-radius: 20px; background: transparent;"></iframe>
    </div>
  `;
  document.body.appendChild(widget);

  // Close quick chat button click
  document.getElementById('closeQuickChatBtn').addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('quickChatToggleCheckbox').checked = false;
  });

  // Close quick chat when clicking outside
  document.addEventListener('click', function(e) {
    const el = document.getElementById('floatingUtilityWidget');
    if (el && !el.contains(e.target)) {
      const checkbox = document.getElementById('quickChatToggleCheckbox');
      if (checkbox && checkbox.checked) {
        checkbox.checked = false;
      }
    }
  });
})();
