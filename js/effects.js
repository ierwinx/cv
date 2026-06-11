(() => {
  const EFFECTS = {
    muertos: {
      dates: [[11, 1], [11, 2]],
      emojis: ['💀', '☠️', '👻', '🦇', '🕯️', '💐', '🎃'],
      count: 30
    },
    independencia: {
      dates: [[9, 16]],
      colors: ['#006847', '#ffffff', '#ce1126'],
      type: 'confetti',
      count: 80
    },
    navidad: {
      dates: [[12, 15], [12, 16], [12, 17], [12, 18], [12, 19], [12, 20], [12, 21], [12, 22], [12, 23], [12, 24], [12, 25]],
      type: 'snow',
      emojis: ['🎄', '🎅', '🎁', '🌟', '⭐'],
      count: 50
    },
    anionuevo: {
      dates: [[1, 1]],
      colors: ['#ffd700', '#ff6b6b', '#48dbfb', '#ff9ff3', '#54a0ff'],
      type: 'confetti',
      count: 100
    },
    halloween: {
      dates: [[10, 31]],
      emojis: ['🦇', '🕷️', '👻', '🕸️', '🎃'],
      count: 25
    }
  };

  function createParticle(container, content, style) {
    const el = document.createElement('div');
    el.textContent = content;
    el.style.cssText = `
      position: fixed;
      top: -40px;
      left: ${Math.random() * 100}vw;
      font-size: ${14 + Math.random() * 20}px;
      pointer-events: none;
      z-index: 9999;
      animation: particleFall ${4 + Math.random() * 6}s linear forwards;
      opacity: ${0.7 + Math.random() * 0.3};
      ${style || ''}
    `;
    container.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }

  function createConfettiPiece(container, color) {
    const el = document.createElement('div');
    const size = 6 + Math.random() * 8;
    el.style.cssText = `
      position: fixed;
      top: -20px;
      left: ${Math.random() * 100}vw;
      width: ${size}px;
      height: ${size * 1.5}px;
      background: ${color};
      pointer-events: none;
      z-index: 9999;
      border-radius: 2px;
      animation: confettiFall ${3 + Math.random() * 4}s linear forwards;
      transform: rotate(${Math.random() * 360}deg);
    `;
    container.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }

  function createSnowflake(container) {
    const el = document.createElement('div');
    el.textContent = '❄';
    const size = 10 + Math.random() * 16;
    el.style.cssText = `
      position: fixed;
      top: -20px;
      left: ${Math.random() * 100}vw;
      font-size: ${size}px;
      color: white;
      text-shadow: 0 0 4px rgba(255,255,255,0.8);
      pointer-events: none;
      z-index: 9999;
      animation: snowFall ${5 + Math.random() * 8}s linear forwards;
      opacity: ${0.5 + Math.random() * 0.5};
    `;
    container.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }

  function injectStyles() {
    if (document.getElementById('effect-styles')) return;
    const style = document.createElement('style');
    style.id = 'effect-styles';
    style.textContent = `
      @keyframes particleFall {
        0% { transform: translateY(0) rotate(0deg); opacity: 1; }
        100% { transform: translateY(110vh) rotate(${360 + Math.random() * 360}deg); opacity: 0; }
      }
      @keyframes confettiFall {
        0% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
        50% { transform: translateY(50vh) rotate(${180 + Math.random() * 180}deg) scale(0.8); opacity: 0.8; }
        100% { transform: translateY(110vh) rotate(${360 + Math.random() * 720}deg) scale(0.5); opacity: 0; }
      }
      @keyframes snowFall {
        0% { transform: translateY(0) translateX(0); opacity: 1; }
        25% { transform: translateY(25vh) translateX(${-20 + Math.random() * 40}px); }
        50% { transform: translateY(50vh) translateX(${-20 + Math.random() * 40}px); }
        75% { transform: translateY(75vh) translateX(${-20 + Math.random() * 40}px); }
        100% { transform: translateY(110vh) translateX(${-20 + Math.random() * 40}px); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  function runEffect(name) {
    const effect = EFFECTS[name];
    if (!effect) {
      console.log('Efectos disponibles: ' + Object.keys(EFFECTS).join(', '));
      return;
    }

    injectStyles();

    const container = document.createElement('div');
    container.id = 'effects-container';
    document.body.appendChild(container);

    let spawned = 0;
    const interval = setInterval(() => {
      if (spawned >= effect.count) {
        clearInterval(interval);
        setTimeout(() => container.remove(), 12000);
        return;
      }

      if (effect.type === 'confetti') {
        const color = effect.colors[Math.floor(Math.random() * effect.colors.length)];
        createConfettiPiece(container, color);
      } else if (effect.type === 'snow') {
        if (effect.emojis && Math.random() > 0.6) {
          const emoji = effect.emojis[Math.floor(Math.random() * effect.emojis.length)];
          createParticle(container, emoji);
        } else {
          createSnowflake(container);
        }
      } else if (effect.emojis) {
        const emoji = effect.emojis[Math.floor(Math.random() * effect.emojis.length)];
        createParticle(container, emoji);
      }

      spawned++;
    }, 100);
  }

  function checkDate() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();

    for (const [name, effect] of Object.entries(EFFECTS)) {
      for (const [m, d] of effect.dates) {
        if (month === m && day === d) {
          setTimeout(() => runEffect(name), 1500);
          return;
        }
      }
    }
  }

  // Konami Code
  const konamiSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let konamiIndex = 0;

  function initKonami() {
    document.addEventListener('keydown', (e) => {
      if (e.key === konamiSequence[konamiIndex]) {
        konamiIndex++;
        if (konamiIndex === konamiSequence.length) {
          konamiIndex = 0;
          activateRetroMode();
        }
      } else {
        konamiIndex = 0;
      }
    });
  }

  function playKonamiSound() {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.value = 0.08;
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15 + i * 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(audioCtx.currentTime + i * 0.12);
      osc.stop(audioCtx.currentTime + 0.15 + i * 0.12);
    });
  }

  function activateRetroMode() {
    playKonamiSound();
    document.body.style.transition = 'all 0.5s';
    document.body.classList.toggle('retro-mode');

    if (!document.getElementById('retro-styles')) {
      const style = document.createElement('style');
      style.id = 'retro-styles';
      style.textContent = `
        .retro-mode {
          font-family: 'Courier New', monospace !important;
          image-rendering: pixelated;
        }
        .retro-mode * {
          font-family: 'Courier New', monospace !important;
          border-radius: 0 !important;
        }
        .retro-mode .card {
          border: 2px solid var(--accent) !important;
          box-shadow: 4px 4px 0 var(--accent) !important;
        }
        .retro-mode .chip {
          border-radius: 0 !important;
          border: 1px solid var(--accent) !important;
        }
        .retro-mode .photo-wrapper img {
          image-rendering: pixelated;
          filter: contrast(1.5) saturate(0.5);
        }
      `;
      document.head.appendChild(style);
    }

    runEffect('anionuevo');
  }

  // Favicon
  const FAVICON_EMOJIS = {
    muertos: '💀',
    halloween: '🎃',
    navidad: '🎄',
    anionuevo: '🎆',
    independencia: '🇲🇽'
  };

  function setEmojiFavicon(emoji) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.font = '52px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 32, 36);
    const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
    link.rel = 'shortcut icon';
    link.href = canvas.toDataURL();
    document.head.appendChild(link);
  }

  function checkFavicon() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();

    for (const [name, effect] of Object.entries(EFFECTS)) {
      for (const [m, d] of effect.dates) {
        if (month === m && day === d) {
          setEmojiFavicon(FAVICON_EMOJIS[name]);
          return;
        }
      }
    }
  }

  // Console message
  function consoleMessage() {
    console.log(
      '%c ¡Hola, dev! 👋 ',
      'background: linear-gradient(135deg, #667eea, #764ba2); color: white; font-size: 16px; padding: 8px 16px; border-radius: 4px; font-weight: bold;'
    );
    console.log(
      '%c¿Curioseando el código? Me gusta tu estilo.\nPrueba: testEffect("muertos") | testEffect("navidad") | testEffect("halloween") | testEffect("independencia") | testEffect("anionuevo")\nO el Konami Code: ↑↑↓↓←→←→BA',
      'color: #667eea; font-size: 12px;'
    );
  }

  // Expose globally for testing
  window.testEffect = runEffect;
  window.testFavicon = setEmojiFavicon;

  // Init
  function init() {
    checkDate();
    checkFavicon();
    initKonami();
    consoleMessage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
