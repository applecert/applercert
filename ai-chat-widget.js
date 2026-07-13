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
      width: 55px;
      height: 55px;
      transition: width 0.3s ease, height 0.3s ease;
    }

    #floatingUtilityWidget:has(#quickChatToggleCheckbox:checked) {
      width: 320px;
      height: 450px;
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

    .container-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translateX(-50%) translateY(-50%);
      z-index: 9;
      transform-style: preserve-3d;
      cursor: pointer;
      padding: 4px;
      transition: all 0.3s ease;
    }

    .container-wrap:hover {
      padding: 0;
    }

    .container-wrap:active {
      transform: translateX(-50%) translateY(-50%) scale(0.95);
    }

    .container-wrap:after {
      content: "";
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translateX(-50%) translateY(-50%);
      width: 55px;
      height: 55px;
      background-color: #dedfe0;
      border-radius: 16px;
      transition: all 0.3s ease;
      z-index: -20;
    }

    .dark .container-wrap:after {
      background-color: #1e293b;
    }

    .container-wrap:hover:after {
      width: 59px;
      height: 59px;
    }

    .container-wrap:has(input:checked):after {
      opacity: 0;
      pointer-events: none;
    }

    .container-wrap input {
      opacity: 0;
      width: 0;
      height: 0;
      position: absolute;
    }

    .container-wrap input:checked + .card .eyes {
      opacity: 0;
    }

    .container-wrap input:checked + .card .content-card {
      width: 320px;
      height: 450px;
      border-radius: 20px;
    }

    .container-wrap input:checked + .card .background-blur-balls {
      border-radius: 20px;
    }

    .container-wrap input:checked + .card .container-ai-chat {
      opacity: 1;
      visibility: visible;
      z-index: 99999;
      pointer-events: auto;
    }

    .card {
      width: 100%;
      height: 100%;
      transform-style: preserve-3d;
      will-change: transform;
      transition: all 0.6s ease;
      border-radius: 16px;
      display: flex;
      align-items: center;
      transform: translateZ(50px);
      justify-content: center;
    }

    .card:hover {
      box-shadow:
        0 10px 40px rgba(0, 0, 60, 0.25),
        inset 0 0 10px rgba(255, 255, 255, 0.5);
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

    .container-wrap:hover .balls {
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

    .content-card {
      width: 55px;
      height: 55px;
      display: flex;
      border-radius: 16px;
      transition: all 0.3s ease;
      overflow: hidden;
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

    .container-wrap:hover .eyes .eye {
      display: none;
    }

    .container-wrap:hover .eyes.happy {
      display: flex;
    }

    .container-ai-chat {
      position: absolute;
      width: 100%;
      height: 100%;
      padding: 0;
      opacity: 0;
      pointer-events: none;
      border-radius: 20px;
      overflow: hidden;
    }

    .container-wrap:has(input:checked) .card,
    .container-wrap:has(input:checked) .eyes .eye {
      transform: none !important;
    }

    .area:nth-child(15):hover ~ .container-wrap .card,
    .area:nth-child(15):hover ~ .container-wrap .eyes .eye {
      transform: perspective(var(--perspective)) rotateX(-15deg) rotateY(15deg)
        translateZ(var(--translateY)) scale3d(1, 1, 1);
    }
    .area:nth-child(14):hover ~ .container-wrap .card,
    .area:nth-child(14):hover ~ .container-wrap .eyes .eye {
      transform: perspective(var(--perspective)) rotateX(-15deg) rotateY(7deg)
        translateZ(var(--translateY)) scale3d(1, 1, 1);
    }
    .area:nth-child(13):hover ~ .container-wrap .card,
    .area:nth-child(13):hover ~ .container-wrap .eyes .eye {
      transform: perspective(var(--perspective)) rotateX(-15deg) rotateY(0)
        translateZ(var(--translateY)) scale3d(1, 1, 1);
    }
    .area:nth-child(12):hover ~ .container-wrap .card,
    .area:nth-child(12):hover ~ .container-wrap .eyes .eye {
      transform: perspective(var(--perspective)) rotateX(-15deg) rotateY(-7deg)
        translateZ(var(--translateY)) scale3d(1, 1, 1);
    }
    .area:nth-child(11):hover ~ .container-wrap .card,
    .area:nth-child(11):hover ~ .container-wrap .eyes .eye {
      transform: perspective(var(--perspective)) rotateX(-15deg) rotateY(-15deg)
        translateZ(var(--translateY)) scale3d(1, 1, 1);
    }

    .area:nth-child(10):hover ~ .container-wrap .card,
    .area:nth-child(10):hover ~ .container-wrap .eyes .eye {
      transform: perspective(var(--perspective)) rotateX(0) rotateY(15deg)
        translateZ(var(--translateY)) scale3d(1, 1, 1);
    }
    .area:nth-child(9):hover ~ .container-wrap .card,
    .area:nth-child(9):hover ~ .container-wrap .eyes .eye {
      transform: perspective(var(--perspective)) rotateX(0) rotateY(7deg)
        translateZ(var(--translateY)) scale3d(1, 1, 1);
    }
    .area:nth-child(8):hover ~ .container-wrap .card,
    .area:nth-child(8):hover ~ .container-wrap .eyes .eye {
      transform: perspective(var(--perspective)) rotateX(0) rotateY(0)
        translateZ(var(--translateY)) scale3d(1, 1, 1);
    }
    .area:nth-child(7):hover ~ .container-wrap .card,
    .area:nth-child(7):hover ~ .container-wrap .eyes .eye {
      transform: perspective(var(--perspective)) rotateX(0) rotateY(-7deg)
        translateZ(var(--translateY)) scale3d(1, 1, 1);
    }
    .area:nth-child(6):hover ~ .container-wrap .card,
    .area:nth-child(6):hover ~ .container-wrap .eyes .eye {
      transform: perspective(var(--perspective)) rotateX(0) rotateY(-15deg)
        translateZ(var(--translateY)) scale3d(1, 1, 1);
    }

    .area:nth-child(5):hover ~ .container-wrap .card,
    .area:nth-child(5):hover ~ .container-wrap .eyes .eye {
      transform: perspective(var(--perspective)) rotateX(15deg) rotateY(15deg)
        translateZ(var(--translateY)) scale3d(1, 1, 1);
    }
    .area:nth-child(4):hover ~ .container-wrap .card,
    .area:nth-child(4):hover ~ .container-wrap .eyes .eye {
      transform: perspective(var(--perspective)) rotateX(15deg) rotateY(7deg)
        translateZ(var(--translateY)) scale3d(1, 1, 1);
    }
    .area:nth-child(3):hover ~ .container-wrap .card,
    .area:nth-child(3):hover ~ .container-wrap .eyes .eye {
      transform: perspective(var(--perspective)) rotateX(15deg) rotateY(0)
        translateZ(var(--translateY)) scale3d(1, 1, 1);
    }
    .area:nth-child(2):hover ~ .container-wrap .card,
    .area:nth-child(2):hover ~ .container-wrap .eyes .eye {
      transform: perspective(var(--perspective)) rotateX(15deg) rotateY(-7deg)
        translateZ(var(--translateY)) scale3d(1, 1, 1);
    }
    .area:nth-child(1):hover ~ .container-wrap .card,
    .area:nth-child(1):hover ~ .container-wrap .eyes .eye {
      transform: perspective(var(--perspective)) rotateX(15deg) rotateY(-15deg)
        translateZ(var(--translateY)) scale3d(1, 1, 1);
    }

    @keyframes rotate-background-balls {
      from {
        transform: translateX(-50%) translateY(-50%) rotate(360deg);
      }
      to {
        transform: translateX(-50%) translateY(-50%) rotate(0);
      }
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
      <label class="container-wrap">
        <input type="checkbox" id="quickChatToggleCheckbox" />
        <div class="card">
          <div class="background-blur-balls">
            <div class="balls">
              <span class="ball rosa"></span>
              <span class="ball violet"></span>
              <span class="ball green"></span>
              <span class="ball cyan"></span>
            </div>
          </div>
          <div class="content-card">
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
          </div>
          <div class="container-ai-chat">
            <iframe src="${iframeSrc}" style="width: 100%; height: 100%; border: none; border-radius: 20px; background: transparent;"></iframe>
          </div>
        </div>
      </label>
    </div>
  `;
  document.body.appendChild(widget);

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
