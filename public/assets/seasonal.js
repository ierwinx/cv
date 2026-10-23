/* Efectos de temporada compartidos por todas las páginas (estilos en /assets/seasonal.css).
   En ciertas fechas cae nieve, confeti o calaveritas y el favicon cambia.
   Extras: Konami Code (↑↑↓↓←→←→BA) y testEffect("navidad") en la consola. */
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

  const FAVICON_EMOJIS = {
    muertos: '💀',
    halloween: '🎃',
    navidad: '🎄',
    anionuevo: '🎆',
    independencia: '🇲🇽'
  };

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pick = list => list[Math.floor(Math.random() * list.length)];

  function spawn(container, className, styles, content) {
    const el = document.createElement('div');
    el.className = className;
    if (content) el.textContent = content;
    el.style.left = `${Math.random() * 100}vw`;
    for (const [prop, value] of Object.entries(styles)) el.style.setProperty(prop, value);
    container.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }

  function createParticle(container, emoji) {
    spawn(container, 'fx-particle', {
      'font-size': `${14 + Math.random() * 20}px`,
      'animation-duration': `${4 + Math.random() * 6}s`,
      'opacity': 0.7 + Math.random() * 0.3,
      '--spin': `${360 + Math.random() * 360}deg`
    }, emoji);
  }

  function createConfettiPiece(container, color) {
    const size = 6 + Math.random() * 8;
    spawn(container, 'fx-confetti', {
      'width': `${size}px`,
      'height': `${size * 1.5}px`,
      'background': color,
      'animation-duration': `${3 + Math.random() * 4}s`,
      '--spin': `${360 + Math.random() * 720}deg`
    });
  }

  function createSnowflake(container) {
    spawn(container, 'fx-snow', {
      'font-size': `${10 + Math.random() * 16}px`,
      'animation-duration': `${5 + Math.random() * 8}s`,
      'opacity': 0.5 + Math.random() * 0.5,
      '--drift': `${-20 + Math.random() * 40}px`
    }, '❄');
  }

  function runEffect(name) {
    const effect = EFFECTS[name];
    if (!effect) {
      console.log('Efectos disponibles: ' + Object.keys(EFFECTS).join(', '));
      return;
    }

    const container = document.createElement('div');
    container.id = 'effects-container';
    container.setAttribute('aria-hidden', 'true');
    document.body.appendChild(container);

    let spawned = 0;
    const interval = setInterval(() => {
      if (spawned >= effect.count) {
        clearInterval(interval);
        setTimeout(() => container.remove(), 12000);
        return;
      }

      if (effect.type === 'confetti') {
        createConfettiPiece(container, pick(effect.colors));
      } else if (effect.type === 'snow') {
        if (effect.emojis && Math.random() > 0.6) createParticle(container, pick(effect.emojis));
        else createSnowflake(container);
      } else if (effect.emojis) {
        createParticle(container, pick(effect.emojis));
      }

      spawned++;
    }, 100);
  }

  function todaysEffect() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    for (const [name, effect] of Object.entries(EFFECTS)) {
      if (effect.dates.some(([m, d]) => m === month && d === day)) return name;
    }
    return null;
  }

  function setEmojiFavicon(emoji) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.font = '52px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 32, 36);
    const href = canvas.toDataURL();
    const links = document.querySelectorAll("link[rel~='icon' i]");
    if (links.length) {
      links.forEach(link => { link.href = href; link.removeAttribute('type'); });
    } else {
      const link = document.createElement('link');
      link.rel = 'icon';
      link.href = href;
      document.head.appendChild(link);
    }
  }

  // Konami Code
  const konamiSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let konamiIndex = 0;

  function initKonami() {
    document.addEventListener('keydown', (e) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (key === konamiSequence[konamiIndex]) {
        konamiIndex++;
        if (konamiIndex === konamiSequence.length) {
          konamiIndex = 0;
          activateRetroMode();
        }
      } else {
        konamiIndex = key === konamiSequence[0] ? 1 : 0;
      }
    });
  }

  function playKonamiSound() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const audioCtx = new AudioCtx();
    [523, 659, 784, 1047].forEach((freq, i) => {
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
    document.body.classList.toggle('retro-mode');
    runEffect('anionuevo');
  }

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

  // Para probar desde la consola
  window.testEffect = runEffect;
  window.testFavicon = setEmojiFavicon;

  function init() {
    const name = todaysEffect();
    if (name) {
      setEmojiFavicon(FAVICON_EMOJIS[name]);
      if (!reduceMotion) setTimeout(() => runEffect(name), 1500);
    }
    initKonami();
    consoleMessage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
