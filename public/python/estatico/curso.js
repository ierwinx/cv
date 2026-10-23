/* Comportamiento del sitio: tema, menu, copiar codigo, progreso, buscador
   e indice activo. Todo funciona abriendo los ficheros directamente desde el
   disco, sin necesidad de un servidor. */

(function () {
  'use strict';

  var RAIZ = document.body.dataset.raiz || '';
  var CLAVE_TEMA = 'curso-tema';
  var CLAVE_PROGRESO = 'curso-progreso';
  var CLAVE_ULTIMA = 'curso-ultima-leccion';

  // --- Almacenamiento seguro ------------------------------------------------
  // En algunos navegadores localStorage lanza excepciones con file:// o en
  // modo privado, asi que lo envolvemos y seguimos funcionando sin memoria.

  function leer(clave, porDefecto) {
    try {
      var valor = localStorage.getItem(clave);
      return valor === null ? porDefecto : valor;
    } catch (e) {
      return porDefecto;
    }
  }

  function escribir(clave, valor) {
    try {
      localStorage.setItem(clave, valor);
    } catch (e) {}
  }

  function leerProgreso() {
    try {
      return JSON.parse(leer(CLAVE_PROGRESO, '[]')) || [];
    } catch (e) {
      return [];
    }
  }

  function guardarProgreso(lista) {
    escribir(CLAVE_PROGRESO, JSON.stringify(lista));
  }

  // --- Tema claro / oscuro --------------------------------------------------

  var botonTema = document.querySelector('.boton-tema');
  if (botonTema) {
    botonTema.addEventListener('click', function () {
      var nuevo = document.documentElement.dataset.tema === 'oscuro' ? 'claro' : 'oscuro';
      document.documentElement.dataset.tema = nuevo;
      escribir(CLAVE_TEMA, nuevo);
    });
  }

  // --- Menu lateral en moviles ---------------------------------------------

  var botonMenu = document.querySelector('.boton-menu');
  var velo = document.querySelector('.velo');

  function cerrarMenu() {
    document.body.classList.remove('menu-abierto');
    if (velo) velo.hidden = true;
    if (botonMenu) botonMenu.setAttribute('aria-expanded', 'false');
  }

  if (botonMenu) {
    botonMenu.addEventListener('click', function () {
      var abierto = document.body.classList.toggle('menu-abierto');
      if (velo) velo.hidden = !abierto;
      botonMenu.setAttribute('aria-expanded', abierto ? 'true' : 'false');
    });
  }
  if (velo) velo.addEventListener('click', cerrarMenu);

  // --- Modulos plegables en el indice lateral ------------------------------

  document.querySelectorAll('.titulo-grupo').forEach(function (boton) {
    boton.addEventListener('click', function () {
      var grupo = boton.closest('.grupo-modulo');
      var abierto = grupo.dataset.abierto === 'si';
      grupo.dataset.abierto = abierto ? 'no' : 'si';
      boton.setAttribute('aria-expanded', abierto ? 'false' : 'true');
    });
  });

  // Dejamos a la vista la leccion en la que estamos.
  var enlaceActual = document.querySelector('.enlace-leccion.actual');
  if (enlaceActual) {
    var lateral = document.querySelector('.lateral');
    var arriba = enlaceActual.offsetTop - lateral.clientHeight / 2;
    if (arriba > 0) lateral.scrollTop = arriba;
  }

  // --- Copiar bloques de codigo --------------------------------------------

  document.querySelectorAll('.boton-copiar').forEach(function (boton) {
    boton.addEventListener('click', function () {
      var bloque = boton.closest('.bloque-codigo').querySelector('code');
      var texto = bloque.innerText;
      var aviso = function () {
        boton.textContent = 'Copiado';
        boton.classList.add('copiado');
        setTimeout(function () {
          boton.textContent = 'Copiar';
          boton.classList.remove('copiado');
        }, 1600);
      };

      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(texto).then(aviso);
      } else {
        // Respaldo para cuando la pagina se abre con file://
        var area = document.createElement('textarea');
        area.value = texto;
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        try { document.execCommand('copy'); aviso(); } catch (e) {}
        document.body.removeChild(area);
      }
    });
  });

  // --- Progreso de lecciones ------------------------------------------------

  var articulo = document.querySelector('.leccion');
  var identificador = articulo ? articulo.dataset.leccion : null;
  var botonCompletar = document.getElementById('boton-completar');

  function pintarProgreso() {
    var hechas = leerProgreso();

    var contador = document.getElementById('progreso-hechas');
    var relleno = document.getElementById('relleno-progreso');
    var total = document.querySelectorAll('.enlace-leccion').length;
    if (contador) contador.textContent = hechas.length;
    if (relleno && total) relleno.style.width = (hechas.length / total) * 100 + '%';

    document.querySelectorAll('.enlace-leccion').forEach(function (enlace) {
      enlace.classList.toggle('completada', hechas.indexOf(enlace.dataset.leccion) !== -1);
    });
    document.querySelectorAll('.tarjeta-leccion').forEach(function (tarjeta) {
      tarjeta.classList.toggle('completada', hechas.indexOf(tarjeta.dataset.leccion) !== -1);
    });

    if (botonCompletar && identificador) {
      var hecha = hechas.indexOf(identificador) !== -1;
      botonCompletar.classList.toggle('hecha', hecha);
      botonCompletar.textContent = hecha ? 'Completada' : 'Marcar como completada';
    }
  }

  if (botonCompletar && identificador) {
    botonCompletar.addEventListener('click', function () {
      var hechas = leerProgreso();
      var posicion = hechas.indexOf(identificador);
      if (posicion === -1) hechas.push(identificador);
      else hechas.splice(posicion, 1);
      guardarProgreso(hechas);
      pintarProgreso();
    });
  }

  var botonReiniciar = document.getElementById('reiniciar-progreso');
  if (botonReiniciar) {
    botonReiniciar.addEventListener('click', function () {
      if (confirm('Se borrara tu progreso en todas las lecciones. Continuar?')) {
        guardarProgreso([]);
        pintarProgreso();
      }
    });
  }

  if (identificador) escribir(CLAVE_ULTIMA, identificador);
  pintarProgreso();

  // Enlace "continuar donde lo dejaste" de la portada.
  var continuar = document.getElementById('continuar-curso');
  if (continuar) {
    var ultima = leer(CLAVE_ULTIMA, '');
    if (ultima) {
      continuar.href = RAIZ + ultima + '.html';
      continuar.hidden = false;
    }
  }

  // --- Indice de la pagina: resalta la seccion visible ----------------------

  var enlacesIndice = Array.prototype.slice.call(
    document.querySelectorAll('.indice-pagina a')
  );
  if (enlacesIndice.length && 'IntersectionObserver' in window) {
    var porAncla = {};
    enlacesIndice.forEach(function (enlace) {
      porAncla[enlace.getAttribute('href').slice(1)] = enlace;
    });

    var visibles = new Set();
    var observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (entrada.isIntersecting) visibles.add(entrada.target.id);
        else visibles.delete(entrada.target.id);
      });
      var primera = Object.keys(porAncla).find(function (id) { return visibles.has(id); });
      if (primera) {
        enlacesIndice.forEach(function (e) { e.classList.remove('activo'); });
        porAncla[primera].classList.add('activo');
      }
    }, { rootMargin: '-80px 0px -70% 0px' });

    Object.keys(porAncla).forEach(function (id) {
      var destino = document.getElementById(id);
      if (destino) observador.observe(destino);
    });
  }

  // --- Buscador -------------------------------------------------------------

  var campo = document.getElementById('campo-busqueda');
  var panel = document.getElementById('resultados-busqueda');
  var indice = window.INDICE_BUSQUEDA || [];
  var seleccionado = -1;

  function normalizar(texto) {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function escapar(texto) {
    return texto.replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function extracto(texto, termino) {
    var plano = normalizar(texto);
    var posicion = plano.indexOf(termino);
    if (posicion === -1) return escapar(texto.slice(0, 120)) + '...';
    var desde = Math.max(0, posicion - 45);
    var trozo = texto.slice(desde, desde + 160);
    var inicio = posicion - desde;
    return (
      (desde > 0 ? '...' : '') +
      escapar(trozo.slice(0, inicio)) +
      '<mark>' + escapar(trozo.slice(inicio, inicio + termino.length)) + '</mark>' +
      escapar(trozo.slice(inicio + termino.length)) + '...'
    );
  }

  function buscar(consulta) {
    var termino = normalizar(consulta.trim());
    if (termino.length < 2) return [];
    var palabras = termino.split(/\s+/);

    return indice
      .map(function (entrada) {
        var tituloPlano = normalizar(entrada.t);
        var cuerpoPlano = normalizar(entrada.c);
        var puntos = 0;
        for (var i = 0; i < palabras.length; i++) {
          var palabra = palabras[i];
          if (tituloPlano.indexOf(palabra) !== -1) puntos += 12;
          if (normalizar(entrada.r).indexOf(palabra) !== -1) puntos += 5;
          var apariciones = cuerpoPlano.split(palabra).length - 1;
          if (apariciones) puntos += Math.min(apariciones, 6);
          if (!apariciones && tituloPlano.indexOf(palabra) === -1) puntos -= 20;
        }
        return { entrada: entrada, puntos: puntos };
      })
      .filter(function (x) { return x.puntos > 0; })
      .sort(function (a, b) { return b.puntos - a.puntos; })
      .slice(0, 12)
      .map(function (x) { return x.entrada; });
  }

  function pintarResultados(resultados, termino) {
    seleccionado = -1;
    if (!resultados.length) {
      panel.innerHTML = '<p class="sin-resultados">No hay lecciones que hablen de eso.</p>';
      panel.hidden = false;
      return;
    }
    panel.innerHTML = resultados
      .map(function (entrada) {
        return (
          '<a class="resultado" href="' + RAIZ + entrada.u + '">' +
          '<span class="resultado-titulo">' + escapar(entrada.t) + '</span>' +
          '<span class="resultado-ruta">' + escapar(entrada.m) + '</span>' +
          '<span class="resultado-extracto">' + extracto(entrada.c, termino) + '</span>' +
          '</a>'
        );
      })
      .join('');
    panel.hidden = false;
  }

  if (campo && panel) {
    campo.addEventListener('input', function () {
      var consulta = campo.value;
      if (consulta.trim().length < 2) {
        panel.hidden = true;
        return;
      }
      pintarResultados(buscar(consulta), normalizar(consulta.trim().split(/\s+/)[0]));
    });

    campo.addEventListener('keydown', function (evento) {
      var opciones = panel.querySelectorAll('.resultado');
      if (evento.key === 'Escape') {
        panel.hidden = true;
        campo.blur();
      } else if (evento.key === 'ArrowDown' && opciones.length) {
        evento.preventDefault();
        seleccionado = (seleccionado + 1) % opciones.length;
      } else if (evento.key === 'ArrowUp' && opciones.length) {
        evento.preventDefault();
        seleccionado = (seleccionado - 1 + opciones.length) % opciones.length;
      } else if (evento.key === 'Enter' && opciones.length) {
        evento.preventDefault();
        opciones[seleccionado === -1 ? 0 : seleccionado].click();
        return;
      } else {
        return;
      }
      opciones.forEach(function (opcion, i) {
        opcion.classList.toggle('activo', i === seleccionado);
      });
      if (seleccionado >= 0) opciones[seleccionado].scrollIntoView({ block: 'nearest' });
    });

    document.addEventListener('click', function (evento) {
      if (!evento.target.closest('.caja-busqueda')) panel.hidden = true;
    });
  }

  // --- Atajos de teclado ----------------------------------------------------

  document.addEventListener('keydown', function (evento) {
    var escribiendo = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);

    if (evento.key === '/' && !escribiendo && campo) {
      evento.preventDefault();
      campo.focus();
      return;
    }
    if (escribiendo || evento.metaKey || evento.ctrlKey || evento.altKey) return;

    if (evento.key === 'ArrowRight' || evento.key === 'n') {
      var siguiente = document.querySelector('.tarjeta-navegacion.siguiente');
      if (siguiente) window.location.href = siguiente.href;
    } else if (evento.key === 'ArrowLeft' || evento.key === 'p') {
      var anterior = document.querySelector('.tarjeta-navegacion.anterior');
      if (anterior) window.location.href = anterior.href;
    }
  });
})();
