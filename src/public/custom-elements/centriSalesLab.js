/* ═══════════════════════════════════════════════════════════════════════════
 * CENTRIMERCA — CENTRI SALES · Banco de pruebas (Wix Custom Element)
 * Archivo:  public/custom-elements/centriSalesLab.js
 * Tag name: centri-sales-lab
 * VERSION:  1.0.2
 * FECHA:    21 Octubre 2026
 *
 * ───────────────────────────────────────────────────────────────────────────
 * CAMBIOS v1.0.1 → v1.0.2 — GRABAR Y TRANSCRIBIR EN SERVIDOR
 * ───────────────────────────────────────────────────────────────────────────
 *   Resultado de las pruebas en Android (20-oct-2026):
 *     · «Largo por frases»: texto correcto, pero el motor se cierra en cada
 *       pausa (5 cortes en 56 s) y Android pita al cerrar y al abrir. Los
 *       comerciales lo tomarían por un error. La página no puede quitar los
 *       pitidos ni alargar la pausa: la Web Speech API no tiene esa opción y
 *       el reconocimiento en el dispositivo (processLocally), que la cambiaría,
 *       no existe en Android.
 *     · «Largo continuo»: 1 corte en 51 s, pero cada resultado repite la
 *       frase entera desde el principio (1.881 palabras para ~90). Es el
 *       fallo que ya resolvieron AKIRA y EGAEL +50: en Android, NUNCA
 *       continuous = true.
 *   Cambios:
 *   1. FUERA «Largo continuo» y _unirFinales(). El dictado largo vuelve a
 *      unir los resultados como v1.0.0.
 *   2. collapseRepetitions() y stripAccents(): COPIA LITERAL de
 *      egaelConsole50.js v1.1.1 (EGAEL +50, motor de voz de AKIRA v0.6.4).
 *      Se aplican como allí: solo en la sesión estándar (iPhone y
 *      ordenador), al cerrar cada sesión del motor. Android no lo necesita.
 *   3. MODO NUEVO «Grabar y transcribir» (sale marcado al abrir). Graba con
 *      MediaRecorder a AUDIO_BPS, sin dictado del navegador: sin cortes ni
 *      pitidos. Al pulsar Terminar envía el audio a
 *      /_functions/centriSalesLabTranscribir (Google Speech-to-Text V1,
 *      backend/centriSalesLab.web.js) y muestra el texto, la espera y los
 *      segundos facturados.
 *      La transcripción síncrona de Google admite como máximo 1 minuto por
 *      petición: la grabación se parte sola en segmentos de SEGMENTO_MS y
 *      cada segmento se transcribe por separado (en paralelo).
 *      ⚠️ En iPhone, Safari graba en audio/mp4 (AAC) y Google V1 no lo
 *      admite. El backend lo rechaza con un mensaje claro: para iPhone hará
 *      falta convertir el audio antes de enviarlo (trabajo aparte).
 *   4. «Largo por frases» pasa a llamarse «Dictado por frases».
 *   Ya NO es cierto que el banco no tenga backend: el modo 3 sí lo usa. Los
 *   demás modos siguen sin enviar nada fuera del móvil.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * CAMBIOS v1.0.0 → v1.0.1 (primeras pruebas en Android)
 * ───────────────────────────────────────────────────────────────────────────
 *   1. BOTÓN TERMINAR APARTE. En v1.0.0 el mismo micrófono terminaba el
 *      dictado largo. Durante cada relanzamiento el botón pasaba a verde y
 *      parecía apagado: el comercial lo tocaba para «volver a encenderlo» y
 *      eso era Terminar (dos pruebas acabaron así). Ahora, en los modos
 *      largos, tocar el micrófono con la prueba abierta NO hace nada: se
 *      cuenta como «toque ignorado» y solo para el botón Terminar.
 *      El modo «Como CENTRI hoy» conserva su comportamiento literal (el
 *      micrófono también para) y además muestra Terminar.
 *   2. BOTÓN ESTABLE. En los modos largos el micrófono queda en rojo, con el
 *      icono de micrófono y un pulso, desde que empieza a escuchar hasta
 *      Terminar. Los cortes del motor ya no cambian el botón ni el texto de
 *      estado: se ven en las métricas.
 *   3. TERCER MODO «Largo continuo». En Android, «Largo por frases» (el de
 *      v1.0.0) usa continuous = false como CENTRI: el motor se cierra en cada
 *      pausa y Android pita al cerrar y al abrir. «Largo continuo» pide
 *      continuous = true también en Android, para medir si corta menos y,
 *      por tanto, pita menos. En iPhone y ordenador los dos modos largos son
 *      iguales (allí ya era continuo).
 *   4. UNIÓN DE RESULTADOS CON CONTROL DE DUPLICADOS (_unirFinales). Al
 *      pedir continuo en Android no está comprobado cómo llegan los
 *      resultados finales; si un final repite o contiene al anterior, no se
 *      duplica el texto y se cuenta en «duplicados corregidos». Así la prueba
 *      dice si ese caso existe.
 *   5. MÉTRICAS EN VIVO. El contador de palabras de los modos largos solo
 *      sumaba el texto ya consolidado (0 hasta el primer corte). Ahora cuenta
 *      también la sesión abierta (L.enCurso).
 *   6. Plurales en el informe y en la lista de pruebas («1 palabra»).
 *   Pitidos: los emite el propio Android al abrir y cerrar el motor. La Web
 *   Speech API no tiene ninguna opción para quitarlos.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * QUÉ ES
 * ───────────────────────────────────────────────────────────────────────────
 * Prototipo de PRUEBA, no de producto. Sirve para medir en el móvil real de
 * cada comercial lo que Centri Sales necesita del navegador, antes de
 * construir nada de backend:
 *
 *   1. REPORTE POR VOZ, en tres modos (v1.0.2): «Como CENTRI hoy» y
 *      «Dictado por frases» sobre la Web Speech API, y «Grabar y transcribir»
 *      (ver CAMBIOS v1.0.2):
 *      · «Como CENTRI hoy»: COPIA LITERAL del micrófono de centriConsole.js
 *        v1.0.4 (portado de EGAEL +50). Envía tras SILENCE_MS de silencio y
 *        en Android trabaja frase a frase (continuous = false).
 *      · «Largo por frases» (en v1.0.0, «Dictado largo»): NUEVO. No envía por silencio: acumula hasta que el
 *        comercial pulsa Terminar. Cuando el motor corta por su cuenta (en
 *        Android, a cada pausa), se relanza solo y se mide el tiempo sordo
 *        entre una sesión y la siguiente.
 *      Opción «Grabar audio a la vez»: comprueba si el móvil deja dictar y
 *      grabar al mismo tiempo (texto en vivo + audio de respaldo).
 *   2. GRABACIÓN de audio con MediaRecorder: formato que da cada móvil,
 *      tamaño y duración. El formato decide cómo se configura después la
 *      transcripción en servidor.
 *   3. UBICACIÓN: precisión y tiempo de respuesta del GPS.
 *   4. FOTO DEL TICKET: cámara, tamaño original y tamaño tras reducirla a
 *      FOTO_MAX_LADO px (lo que se enviaría a la IA).
 *   5. INFORME: todo lo anterior + registro de eventos, en un texto que se
 *      copia y se pega por WhatsApp o email.
 *
 * NO escribe en ninguna colección. Solo el modo «Grabar y transcribir»
 * (v1.0.2) envía audio fuera del móvil, al endpoint de transcripción. Todo lo
 * demás queda en memoria de la página y se pierde al recargar.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * PROCEDENCIA DEL CÓDIGO
 * ───────────────────────────────────────────────────────────────────────────
 *   · DEFAULT_COLORS, ACCENT_2, ACCENT_SOFT, FOCUS, RADIUS, FONT_BODY,
 *     ensureFonts() y _escape(): copia literal de centriConsole.js v1.0.4.
 *   · :host anclado a 100dvh: copia literal de centriConsole.js v1.0.4.
 *     PRECONDICIÓN: la página contiene SOLO este custom element.
 *   · Modo «Como CENTRI hoy» (_setupMic … _startStandardSession): copia
 *     literal de centriConsole.js v1.0.4. Único cambio, instrumental: el
 *     temporizador de silencio anota la causa (this._causaFin = 'silencio')
 *     antes de parar, como hace CATHOVIA con _micStoppingForSend. El campo
 *     de texto se sustituye por un adaptador (_crearAdaptadorInput) con la
 *     misma interfaz value/placeholder, y _sendQuery por _finCentri.
 *   · copiarAlPortapapeles(): copia literal de widgetAnalizador 1.0.3
 *     (CATHOVIA), pasada a método.
 *   · collapseRepetitions() y stripAccents(): copia literal de
 *     egaelConsole50.js v1.1.1 (v1.0.2).
 *   · Llamada al endpoint: mismo patrón que _fetchTts / _functionsUrl de
 *     centriConsole.js v1.0.4 (fetch POST JSON a ruta absoluta /_functions/).
 *   · Dictado largo, grabación, transcripción, ubicación, foto e informe:
 *     código nuevo.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * MONTAJE
 * ───────────────────────────────────────────────────────────────────────────
 *   Página de prueba oculta (fuera del menú), con SOLO este elemento.
 *   Custom element → archivo public/custom-elements/centriSalesLab.js,
 *   tag name centri-sales-lab. No necesita page code.
 *   El modo «Grabar y transcribir» necesita además (v1.0.2):
 *     backend/centriSalesLab.web.js v1.0.0 y http-functions.js v1.0.3.
 *   ⚠️ Probarlo como custom element, NUNCA dentro de un HtmlComponent
 *      (iframe): el micrófono de CENTRI está probado así y un iframe puede
 *      no tener permiso de micrófono ni de ubicación.
 * ═══════════════════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  if (customElements.get('centri-sales-lab')) {
    console.log('[CENTRI SALES LAB] Ya registrado.');
    return;
  }

  const VERSION = '1.0.2';
  const TAG = `[CENTRI SALES LAB v${VERSION}]`;

  // ── Micrófono, modo «Como CENTRI hoy» — mismos valores que centriConsole v1.0.4 ──
  const SILENCE_MS = 2200;
  const SAFETY_MS  = 12000;
  const SILENCIO_TXT = (SILENCE_MS / 1000).toLocaleString('es-ES') + ' s';

  // ── Dictado largo ──
  const RELANZAR_MS    = 150;           // pausa antes de relanzar el motor cuando corta
  const MAX_DICTADO_MS = 10 * 60000;    // tope de seguridad: 10 minutos

  // ── Grabar y transcribir (v1.0.2) ──
  // Ruta absoluta, como CENTRI: functionsBase vacío = '/_functions/...'.
  const ENDPOINT_TRANSCRIBIR = '/_functions/centriSalesLabTranscribir';
  // Google V1 síncrono: máximo 1 minuto por petición. Margen de 5 s.
  const SEGMENTO_MS = 55000;
  // Opus a 32 kbps sobra para voz y deja ~220 KB por segmento (la prueba de
  // v1.0.0 grabó a 127 kbps sin fijarlo).
  const AUDIO_BPS = 32000;

  // ── Grabación ── (orden de preferencia; el móvil dice cuáles admite)
  const MIME_CANDIDATOS = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/aac'
  ];

  // ── Foto del ticket ──
  const FOTO_MAX_LADO = 1600;           // px del lado mayor tras reducir
  const FOTO_CALIDAD  = 0.8;            // JPEG

  // ── Ubicación ──
  const GEO_TIMEOUT_MS = 20000;

  // ── Registro ──
  const LOG_MAX = 80;

  const UA = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
  const IS_ANDROID = /Android/.test(UA);
  const IS_IOS = /iPhone|iPad|iPod/.test(UA) ||
    (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  // ═════════════════════════════════════════════════════════════════════════
  // TEMA — copia literal de centriConsole.js v1.0.4
  // ═════════════════════════════════════════════════════════════════════════

  const DEFAULT_COLORS = {
    bg:        '#F2F5F4',   // fondo general, gris muy frío con toque verde
    surface:   '#FFFFFF',   // barra superior, laterales
    card:      '#E9EFEE',   // burbujas, superficies elevadas
    ink:       '#12201F',   // texto principal
    inkSoft:   '#3A4B49',   // texto secundario
    muted:     '#6B7A78',   // metadatos, timestamps
    hairline:  '#D3DEDC',   // separadores
    accent:    '#006166',   // MARCA
    accentInk: '#FFFFFF'    // texto sobre el acento
  };

  const ACCENT_2    = '#00494D';   // hover / pressed
  const ACCENT_SOFT = '#DCEBEB';   // chip activo, badges
  const FOCUS       = '#4D9296';   // anillo de foco
  const RADIUS      = '12px';

  const FONT_BODY = '"Bai Jamjuree", ui-sans-serif, system-ui, sans-serif';

  // Estados (no son colores de marca: solo para avisos del banco de pruebas)
  const OK_COLOR   = '#2E7D4F';
  const WARN_COLOR = '#A86A12';
  const ERR_COLOR  = '#B03A2E';

  /**
   * Carga Bai Jamjuree con <link> en el head del documento padre.
   * Copia literal de centriConsole.js v1.0.4 (mismo id: si las dos piezas
   * conviven en una página, la fuente se carga una vez).
   */
  const FONTS_LINK_ID = 'centri-fonts';
  function ensureFonts() {
    try {
      if (document.getElementById(FONTS_LINK_ID)) return;
      const link = document.createElement('link');
      link.id = FONTS_LINK_ID;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Bai+Jamjuree:wght@400;500;600;700&display=swap';
      document.head.appendChild(link);
    } catch (_) { /* si falla, cae a la fuente de sistema */ }
  }

  const PLACEHOLDER = 'Pulsa el micrófono y cuenta la visita';

  // ═════════════════════════════════════════════════════════════════════════
  // UTILIDADES PURAS
  // ═════════════════════════════════════════════════════════════════════════

  function mmss(ms) {
    const s = Math.max(0, Math.round(ms / 1000));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  function segundos(ms) {
    return (Math.round(ms / 100) / 10).toLocaleString('es-ES') + ' s';
  }

  function kb(bytes) {
    if (!bytes && bytes !== 0) return '—';
    if (bytes >= 1048576) return (Math.round(bytes / 104857.6) / 10).toLocaleString('es-ES') + ' MB';
    return Math.round(bytes / 1024).toLocaleString('es-ES') + ' KB';
  }

  function contarPalabras(t) {
    const s = String(t || '').trim();
    return s ? s.split(/\s+/).length : 0;
  }

  function textoPalabras(t) {
    const n = contarPalabras(t);
    return n + (n === 1 ? ' palabra' : ' palabras');
  }

  function horaLog(d) {
    const p = (n, l) => String(n).padStart(l || 2, '0');
    return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds()) + '.' + p(d.getMilliseconds(), 3);
  }

  function extensionDe(mime) {
    const m = String(mime || '');
    if (m.indexOf('webm') >= 0) return 'webm';
    if (m.indexOf('mp4') >= 0) return 'm4a';
    if (m.indexOf('ogg') >= 0) return 'ogg';
    if (m.indexOf('aac') >= 0) return 'aac';
    return 'audio';
  }

  function dispositivo() {
    if (IS_ANDROID) return 'Android';
    if (IS_IOS) return 'iPhone / iPad';
    return 'Otro (ordenador u otro sistema)';
  }

  const NOMBRE_MODO = {
    centri:      'CENTRI hoy',
    largo:       'Dictado por frases',
    transcribir: 'Grabar y transcribir'
  };
  function textoModo(m) { return NOMBRE_MODO[m] || m; }

  function ayudaModo(m) {
    if (m === 'centri') {
      return `Igual que la consola de CENTRI: se corta tras ${SILENCIO_TXT} de silencio${IS_ANDROID ? ' y, en Android, en la primera pausa' : ''}.`;
    }
    const comun = ' Tocar el micrófono no lo para: usa Terminar.';
    if (m === 'largo') {
      return (IS_ANDROID
        ? 'Dictado del navegador: en Android el motor se cierra en cada pausa y se relanza solo (con su pitido). Acumula hasta Terminar.'
        : 'Dictado del navegador: no se corta con las pausas, acumula hasta Terminar. Si el motor corta, se relanza solo.') + comun;
    }
    return 'Graba sin dictado del navegador: sin cortes ni pitidos. Al pulsar Terminar, el audio se envía al servidor y el texto llega unos segundos después.' + comun;
  }

  // ── COPIA LITERAL de egaelConsole50.js v1.1.1 (EGAEL +50) — v1.0.2 ──
  function stripAccents(s) {
    return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }
  function collapseRepetitions(text) {
    if (!text) return text;
    const words = text.split(/\s+/); if (words.length < 2) return text;
    const out = []; let prev = '';
    for (const w of words) { const key = stripAccents(w); if (key && key === prev) continue; out.push(w); prev = key; }
    let result = out.join(' ');
    for (let n = 5; n >= 2; n--) { result = result.replace(new RegExp(`(\\b(?:\\S+\\s+){${n-1}}\\S+\\b)(?:\\s+\\1)+`,'gi'), '$1'); }
    return result.trim();
  }
  // ── fin de la copia literal ──

  function blobABase64(blob) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => {
        const s = String(fr.result || '');
        const i = s.indexOf(',');
        resolve(i >= 0 ? s.slice(i + 1) : s);
      };
      fr.onerror = () => reject(fr.error || new Error('No se pudo leer el audio'));
      fr.readAsDataURL(blob);
    });
  }

  const ERRORES_DICTADO = {
    'not-allowed':            'Permiso de micrófono denegado',
    'service-not-allowed':    'El navegador no permite el dictado',
    'audio-capture':          'Micrófono ocupado o no disponible',
    'no-speech':              'No se detectó voz',
    'network':                'Fallo de red del servicio de dictado',
    'aborted':                'Dictado interrumpido',
    'language-not-supported': 'Idioma no admitido',
    'bad-grammar':            'Error de gramática del motor'
  };
  const ERRORES_FATALES = ['not-allowed', 'service-not-allowed', 'audio-capture', 'language-not-supported'];

  const ERRORES_GEO = {
    1: 'Permiso de ubicación denegado',
    2: 'Ubicación no disponible',
    3: 'Tiempo agotado sin ubicación'
  };

  // ═════════════════════════════════════════════════════════════════════════
  // ELEMENTO
  // ═════════════════════════════════════════════════════════════════════════

  class CentriSalesLab extends HTMLElement {

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._colors = { ...DEFAULT_COLORS };
      this._brand  = { placeholder: PLACEHOLDER };   // lo usa el código literal de CENTRI
      this._pending = false;                          // ídem (en CENTRI: consulta en curso)

      // Micrófono (nombres de centriConsole v1.0.4)
      this._SR = null;
      this._recognition = null;
      this._isListening = false;
      this._silenceTimer = null;
      this._safetyTimer = null;
      this._androidFinalBuffer = '';
      this._lastFinalTranscript = '';

      // Banco de pruebas
      this._modoDictado = 'transcribir'; // 'centri' | 'largo' | 'transcribir'
      this._grabarALaVez = false;
      this._dictado = null;              // prueba en curso
      this._pruebasDictado = [];         // pruebas terminadas
      this._causaFin = '';
      this._largo = null;
      this._trans = null;                // grabación en curso del modo «Grabar y transcribir»

      this._grab = null;                 // grabación en curso
      this._grabaciones = [];            // grabaciones terminadas
      this._urlsAudio = [];

      this._ubicaciones = [];
      this._fotos = [];
      this._urlFoto = null;

      this._entorno = {};
      this._log = [];
      this._tick = null;
    }

    connectedCallback() {
      ensureFonts();
      this._render();
      this._bindEvents();
      this._setupMic();
      if (!this._SR) {
        // _setupMic (literal de CENTRI) oculta el micrófono si no hay dictado.
        // «Grabar y transcribir» no lo necesita: se vuelve a mostrar y se
        // desactivan solo los modos de dictado.
        const b = this.shadowRoot.getElementById('micBtn');
        if (b) b.style.display = '';
        this.shadowRoot.querySelectorAll('[data-modo="centri"], [data-modo="largo"]').forEach((x) => { x.disabled = true; x.dataset.sinDictado = '1'; });
        this._registrar('warn', 'Este navegador no tiene dictado: solo se puede probar «Grabar y transcribir»');
      }
      this._pintarModo();
      this._diagnostico();
      this._registrar('info', `Banco de pruebas v${VERSION} listo`);
    }

    disconnectedCallback() {
      try { if (this._largo) this._largo.activo = false; } catch (_) {}
      try { this._stopMic(); } catch (_) {}
      try {
        if (this._trans) {
          this._trans.activo = false;
          clearTimeout(this._trans.timer);
          if (this._trans.rec && this._trans.rec.state !== 'inactive') this._trans.rec.stop();
          this._trans.stream.getTracks().forEach((t) => t.stop());
        }
      } catch (_) {}
      try { if (this._grab && this._grab.rec.state !== 'inactive') this._grab.rec.stop(); } catch (_) {}
      try { if (this._grab && this._grab.stream) this._grab.stream.getTracks().forEach((t) => t.stop()); } catch (_) {}
      this._pararTick();
      this._urlsAudio.forEach((u) => { try { URL.revokeObjectURL(u); } catch (_) {} });
      if (this._urlFoto) { try { URL.revokeObjectURL(this._urlFoto); } catch (_) {} }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // REGISTRO
    // ═══════════════════════════════════════════════════════════════════════

    _registrar(tipo, msg) {
      const ahora = new Date();
      this._log.push({ t: ahora, tipo, msg });
      if (this._log.length > LOG_MAX) this._log.shift();
      if (tipo === 'error') console.warn(`${TAG} ${msg}`);
      else console.log(`${TAG} ${msg}`);
      this._pintarLog();
    }

    _pintarLog() {
      const box = this.shadowRoot && this.shadowRoot.getElementById('logList');
      if (!box) return;
      box.innerHTML = this._log.slice().reverse().map((l) =>
        `<div class="log-row log-${this._escape(l.tipo)}"><span class="log-t">${horaLog(l.t)}</span><span>${this._escape(l.msg)}</span></div>`
      ).join('') || '<div class="muted">Sin eventos todavía.</div>';
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ENTORNO
    // ═══════════════════════════════════════════════════════════════════════

    async _diagnostico() {
      const e = this._entorno;
      e.dispositivo = dispositivo();
      e.navegador = UA;
      e.seguro = !!window.isSecureContext;
      e.enMarco = (() => { try { return window.self !== window.top; } catch (_) { return true; } })();
      e.dictado = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
      e.grabacion = !!(window.MediaRecorder && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      e.formatos = [];
      if (window.MediaRecorder && typeof MediaRecorder.isTypeSupported === 'function') {
        e.formatos = MIME_CANDIDATOS.filter((t) => { try { return MediaRecorder.isTypeSupported(t); } catch (_) { return false; } });
      }
      e.ubicacion = !!navigator.geolocation;
      e.permMicro = 'desconocido';
      e.permGeo = 'desconocido';
      this._pintarEntorno();

      if (navigator.permissions && navigator.permissions.query) {
        const consultar = async (nombre) => {
          try { const r = await navigator.permissions.query({ name: nombre }); return r.state; }
          catch (_) { return 'no consultable'; }
        };
        e.permMicro = await consultar('microphone');
        e.permGeo = await consultar('geolocation');
        this._pintarEntorno();
      }
    }

    _pintarEntorno() {
      const e = this._entorno;
      const box = this.shadowRoot.getElementById('entorno');
      if (!box) return;
      const fila = (k, v, estado) =>
        `<div class="kv"><span class="k">${this._escape(k)}</span><span class="v ${estado || ''}">${this._escape(v)}</span></div>`;
      const si = (b) => b ? 'sí' : 'no';
      box.innerHTML =
        fila('Dispositivo', e.dispositivo) +
        fila('Conexión segura', si(e.seguro), e.seguro ? 'ok' : 'err') +
        fila('Dentro de un marco', si(e.enMarco), e.enMarco ? 'warn' : 'ok') +
        fila('Dictado del navegador', e.dictado ? 'disponible' : 'no disponible', e.dictado ? 'ok' : 'err') +
        fila('Grabación de audio', e.grabacion ? 'disponible' : 'no disponible', e.grabacion ? 'ok' : 'err') +
        fila('Formatos de audio', e.formatos.length ? e.formatos.join(' · ') : 'ninguno de la lista', e.formatos.length ? '' : 'warn') +
        fila('Ubicación', e.ubicacion ? 'disponible' : 'no disponible', e.ubicacion ? 'ok' : 'err') +
        fila('Permiso micrófono', this._textoPermiso(e.permMicro), this._clasePermiso(e.permMicro)) +
        fila('Permiso ubicación', this._textoPermiso(e.permGeo), this._clasePermiso(e.permGeo)) +
        `<div class="ua">${this._escape(e.navegador)}</div>`;
    }

    _textoPermiso(s) {
      return ({ granted: 'concedido', denied: 'denegado', prompt: 'lo pedirá al usarlo' })[s] || s;
    }

    _clasePermiso(s) {
      return s === 'granted' ? 'ok' : s === 'denied' ? 'err' : '';
    }

    // ═══════════════════════════════════════════════════════════════════════
    // DICTADO — control común
    // ═══════════════════════════════════════════════════════════════════════

    _crearAdaptadorInput() {
      // Misma interfaz que el <textarea> de CENTRI: value y placeholder.
      const self = this;
      return {
        _v: '',
        get value() { return this._v; },
        set value(v) {
          this._v = String(v == null ? '' : v);
          self._pintarTextoDictado(this._v, '');
        },
        set placeholder(p) { self._pintarEstadoDictado(p); },
        get placeholder() { return ''; }
      };
    }

    _pintarTextoDictado(fijo, provisional) {
      const box = this.shadowRoot.getElementById('dictadoTexto');
      if (!box) return;
      if (!fijo && !provisional) { box.innerHTML = '<span class="muted">El texto dictado aparecerá aquí.</span>'; return; }
      box.innerHTML = this._escape(fijo) +
        (provisional ? ` <span class="interim">${this._escape(provisional)}</span>` : '');
      box.scrollTop = box.scrollHeight;
    }

    _pintarEstadoDictado(texto) {
      const el = this.shadowRoot.getElementById('dictadoEstado');
      if (el) el.textContent = texto || '';
    }

    _onMicClick() {
      if (this._modoDictado === 'transcribir') {
        // v1.0.2: igual que los modos largos, con la prueba abierta el micrófono no termina.
        if (this._dictado || this._trans) {
          if (this._dictado) this._dictado.toquesIgnorados++;
          this._registrar('warn', 'Toque en el micrófono ignorado (para terminar, usa Terminar)');
          return;
        }
        this._empezarPruebaDictado();
        this._empezarTranscribir();
        return;
      }
      if (!this._SR) {
        this._registrar('error', 'Este navegador no tiene dictado (Web Speech API)');
        return;
      }
      if (this._modoDictado === 'centri') {
        // Con prueba abierta, el botón para (aunque el motor aún no haya avisado de que escucha)
        if (this._dictado) { this._causaFin = 'usuario'; this._stopMic(); return; }
        this._empezarPruebaDictado();
        this._startMic();
      } else {
        // v1.0.1: con la prueba abierta, el micrófono NO termina. Solo Terminar.
        if (this._dictado || this._largo) {
          if (this._dictado) this._dictado.toquesIgnorados++;
          this._registrar('warn', 'Toque en el micrófono ignorado (para terminar, usa Terminar)');
          return;
        }
        this._empezarPruebaDictado();
        this._empezarLargo();
      }
    }

    _onTerminarClick() {
      if (!this._dictado) return;
      if (this._modoDictado === 'centri') {
        this._causaFin = 'usuario';
        this._stopMic();
        return;
      }
      if (this._modoDictado === 'transcribir') {
        this._terminarTranscribir();
        return;
      }
      this._terminarLargo('usuario');
    }

    /** Marca el modo activo, su ayuda y si la casilla «Grabar a la vez» tiene sentido. */
    _pintarModo() {
      const r = this.shadowRoot;
      r.querySelectorAll('[data-modo]').forEach((x) => {
        const on = x.dataset.modo === this._modoDictado;
        x.classList.toggle('on', on);
        x.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      const ay = r.getElementById('modoAyuda');
      if (ay) ay.textContent = ayudaModo(this._modoDictado);
      const chk = r.getElementById('chkALaVez');
      const fila = r.getElementById('filaALaVez');
      const transcribir = this._modoDictado === 'transcribir';
      if (chk) {
        if (transcribir) { chk.checked = false; this._grabarALaVez = false; }
        chk.disabled = transcribir || !!this._dictado;
      }
      if (fila) fila.classList.toggle('apagada', transcribir);
    }

    _mostrarTerminar(b) {
      const t = this.shadowRoot.getElementById('btnTerminar');
      if (t) t.hidden = !b;
    }

    _empezarPruebaDictado() {
      this._clearSilenceTimer();
      this._clearSafetyTimer();
      this._causaFin = '';
      this._dictado = {
        modo: this._modoDictado,
        grabarALaVez: this._grabarALaVez,
        inicio: Date.now(),
        fin: null,
        texto: '',
        cortes: 0,
        relanzamientos: 0,
        sordoTotal: 0,
        sordoMax: 0,
        sinVoz: 0,
        toquesIgnorados: 0,
        // «Grabar y transcribir» (v1.0.2)
        segmentos: 0,
        bytes: 0,
        formato: '',
        msAudio: 0,
        esperaMs: 0,
        facturadoS: 0,
        modelo: '',
        errores: [],
        causa: ''
      };
      this._pintarTextoDictado('', '');
      this._bloquearOpcionesDictado(true);
      this._mostrarTerminar(true);
      this._arrancarTick();
      this._registrar('info', `Dictado: empieza (modo ${textoModo(this._modoDictado)}${this._grabarALaVez ? ', grabando a la vez' : ''})`);
      if (this._grabarALaVez && this._modoDictado !== 'transcribir') this._grabarEmpezar('respaldo del dictado');
    }

    _cerrarPruebaDictado(texto, causa) {
      const d = this._dictado;
      if (!d) return;
      d.fin = Date.now();
      d.texto = String(texto || '').trim();
      d.causa = causa || 'motor';
      this._pruebasDictado.push(d);
      this._dictado = null;
      this._bloquearOpcionesDictado(false);
      this._mostrarTerminar(false);
      if (this._grab && this._grab.origen === 'respaldo del dictado') this._grabarParar();
      this._registrar('info', `Dictado: termina por ${this._textoCausa(d.causa)} · ${mmss(d.fin - d.inicio)} · ${textoPalabras(d.texto)}`);
      this._pintarModo();   // _bloquearOpcionesDictado(false) reactiva la casilla también en «Grabar y transcribir»
      this._pintarTextoDictado(d.texto, '');
      this._pintarEstadoDictado(d.texto ? 'Prueba guardada. Puedes repetirla o cambiar de modo.' : (d.errores.length ? 'La prueba terminó con errores: mira el registro.' : 'No se recogió texto.'));
      this._pintarMetricasDictado();
      this._pintarPruebasDictado();
      this._pararTickSiInactivo();
    }

    _textoCausa(c) {
      return ({
        usuario:  'el usuario (Terminar)',
        silencio: `silencio de ${SILENCIO_TXT}`,
        motor:    'el propio motor de dictado',
        error:    'error',
        tope:     'tope de 10 minutos'
      })[c] || c;
    }

    _bloquearOpcionesDictado(b) {
      this.shadowRoot.querySelectorAll('[data-modo], #chkALaVez').forEach((el) => {
        // Los modos de dictado siguen apagados si el navegador no tiene dictado
        el.disabled = b || el.dataset.sinDictado === '1';
      });
    }

    _pintarMetricasDictado() {
      const box = this.shadowRoot.getElementById('dictadoMetricas');
      if (!box) return;
      const d = this._dictado || this._pruebasDictado[this._pruebasDictado.length - 1];
      if (!d) { box.innerHTML = ''; return; }
      const fin = d.fin || Date.now();
      const texto = d.fin ? d.texto : (this._textoEnCurso() || '');
      const m = (v, l) => `<div class="met"><div class="mv">${this._escape(v)}</div><div class="ml">${this._escape(l)}</div></div>`;
      if (d.modo === 'transcribir') {
        const tr = this._trans;
        const msAudio = d.msAudio || (tr && tr.inicio ? Date.now() - tr.inicio : 0);
        box.innerHTML =
          m(mmss(msAudio), 'audio') +
          m(contarPalabras(texto), 'palabras') +
          m(d.segmentos || (tr ? tr.nSeg : 0), 'segmentos') +
          m(d.esperaMs ? segundos(d.esperaMs) : '—', 'espera del texto') +
          m(d.bytes ? kb(d.bytes) : (tr ? kb(tr.bytes) : '—'), 'enviado') +
          m(d.errores.length, 'errores');
        return;
      }
      box.innerHTML =
        m(mmss(fin - d.inicio), 'duración') +
        m(contarPalabras(texto), 'palabras') +
        m(d.modo !== 'centri' ? d.cortes : '—', 'cortes del motor') +
        m(d.modo !== 'centri' ? segundos(d.sordoTotal) : '—', 'tiempo sordo') +
        m(d.modo !== 'centri' ? segundos(d.sordoMax) : '—', 'hueco mayor') +
        m(d.errores.length, 'errores');
    }

    _textoEnCurso() {
      if (this._modoDictado !== 'centri' && this._largo) {
        return [this._largo.texto, this._largo.enCurso || ''].join(' ').trim();
      }
      return this._androidFinalBuffer || this._lastFinalTranscript || '';
    }

    _pintarPruebasDictado() {
      const box = this.shadowRoot.getElementById('dictadoPruebas');
      if (!box) return;
      if (!this._pruebasDictado.length) { box.innerHTML = ''; return; }
      box.innerHTML = '<div class="sub-h">Pruebas de esta sesión</div>' +
        this._pruebasDictado.map((d, i) =>
          `<div class="prueba">
             <div class="prueba-h">#${i + 1} · ${this._escape(textoModo(d.modo))}${d.grabarALaVez ? ' + grabación' : ''}</div>
             <div class="prueba-d">${d.modo === 'transcribir'
               ? `${mmss(d.msAudio)} de audio · ${textoPalabras(d.texto)} · ${d.segmentos} ${d.segmentos === 1 ? 'segmento' : 'segmentos'} · texto en ${segundos(d.esperaMs)} · ${kb(d.bytes)}`
               : `${mmss(d.fin - d.inicio)} · ${textoPalabras(d.texto)} · terminó por ${this._escape(this._textoCausa(d.causa))}${d.modo !== 'centri' ? ` · ${d.cortes} cortes · ${segundos(d.sordoTotal)} sordo` : ''}`}${d.toquesIgnorados ? ` · ${d.toquesIgnorados} ${d.toquesIgnorados === 1 ? 'toque ignorado' : 'toques ignorados'}` : ''}${d.errores.length ? ` · errores: ${this._escape(d.errores.join(', '))}` : ''}</div>
           </div>`
        ).join('');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // DICTADO — modo «Como CENTRI hoy»
    // COPIA LITERAL de centriConsole.js v1.0.4 (MICRÓFONO, Web Speech API —
    // portado de EGAEL +50). Cambios marcados con [LAB].
    // ═══════════════════════════════════════════════════════════════════════

    _setupMic() {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) {
        const b = this.shadowRoot.getElementById('micBtn');
        if (b) b.style.display = 'none';
        return;
      }
      this._SR = SR;
    }

    _clearSilenceTimer() { if (this._silenceTimer) { clearTimeout(this._silenceTimer); this._silenceTimer = null; } }
    _clearSafetyTimer()  { if (this._safetyTimer)  { clearTimeout(this._safetyTimer);  this._safetyTimer  = null; } }
    _armSilenceTimer() {
      this._clearSilenceTimer();
      // [LAB] se anota la causa antes de parar (patrón _micStoppingForSend de CATHOVIA)
      this._silenceTimer = setTimeout(() => { this._causaFin = 'silencio'; this._stopMic(); }, SILENCE_MS);
    }
    _armSafetyTimer() {
      this._clearSafetyTimer();
      this._safetyTimer = setTimeout(() => this._stopMic(), SAFETY_MS);
    }

    _toggleMic() { if (this._isListening) this._stopMic(); else this._startMic(); }

    _stopMic() {
      this._clearSilenceTimer();
      this._clearSafetyTimer();
      if (this._recognition) { try { this._recognition.stop(); } catch (_) {} }
    }

    _setMicState(state) {
      const btn = this.shadowRoot.getElementById('micBtn');
      if (!btn) return;
      btn.classList.remove('listening', 'idle', 'preparing');
      btn.classList.add(state);
    }

    _startMic() {
      if (!this._SR || this._pending) return;
      this._stopTts();
      const input = this._crearAdaptadorInput();   // [LAB] en CENTRI: getElementById('chatInput')
      input.value = '';
      if (IS_ANDROID) {
        this._androidFinalBuffer = '';
        this._startAndroidSession(input);
      } else {
        this._startStandardSession(input);
      }
    }

    _startAndroidSession(input) {
      try { this._recognition = new this._SR(); } catch (e) { return; }
      this._recognition.lang = 'es-ES';
      this._recognition.interimResults = false;
      this._recognition.continuous = false;
      this._recognition.maxAlternatives = 1;

      this._recognition.onstart = () => {
        this._isListening = true;
        this._setMicState('preparing');
        input.placeholder = 'Preparando micrófono…';
        this._armSafetyTimer();
      };
      this._recognition.onaudiostart = () => {
        this._setMicState('listening');
        input.placeholder = 'Te escucho…';
        if (navigator.vibrate) { try { navigator.vibrate(50); } catch (_) {} }
      };
      this._recognition.onresult = (event) => {
        this._clearSafetyTimer();
        const result = event.results[0];
        if (result && result.isFinal) {
          const transcript = result[0].transcript.trim();
          if (transcript) {
            this._androidFinalBuffer += (this._androidFinalBuffer ? ' ' : '') + transcript;
            input.value = this._androidFinalBuffer;
            this._armSilenceTimer();
          }
        }
      };
      this._recognition.onerror = (event) => {
        this._clearSilenceTimer(); this._clearSafetyTimer();
        this._isListening = false; this._setMicState('idle');
        input.placeholder = this._brand.placeholder;
        this._anotarErrorDictado(event.error);   // [LAB]
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          this._appendError('Permiso de micrófono denegado. Actívalo en los ajustes del navegador.');
        }
      };
      this._recognition.onend = () => {
        this._clearSafetyTimer();
        this._isListening = false; this._setMicState('idle');
        const text = this._androidFinalBuffer.trim();
        this._androidFinalBuffer = '';
        if (!text) { input.placeholder = this._brand.placeholder; this._finCentri(''); return; }   // [LAB] cierra la prueba vacía
        input.value = '';
        this._sendQuery(text);
      };
      try { this._recognition.start(); }
      catch (e) { this._setMicState('idle'); input.placeholder = this._brand.placeholder; }
    }

    _startStandardSession(input) {
      try { this._recognition = new this._SR(); } catch (e) { return; }
      this._recognition.lang = 'es-ES';
      this._recognition.interimResults = true;
      this._recognition.continuous = true;
      this._recognition.maxAlternatives = 1;
      this._lastFinalTranscript = '';

      this._recognition.onstart = () => {
        this._isListening = true; this._setMicState('preparing');
        input.placeholder = 'Preparando micrófono…'; this._armSafetyTimer();
      };
      this._recognition.onaudiostart = () => {
        this._setMicState('listening');
        input.placeholder = 'Te escucho…';
        if (navigator.vibrate) { try { navigator.vibrate(50); } catch (_) {} }
      };
      this._recognition.onresult = (event) => {
        this._clearSafetyTimer();
        let finalText = '', interimText = '';
        for (let i = 0; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) finalText += transcript;
          else interimText += transcript;
        }
        input.value = (finalText + interimText).trim();
        const hadNewFinal = finalText !== this._lastFinalTranscript;
        if (hadNewFinal && finalText) { this._lastFinalTranscript = finalText; this._armSilenceTimer(); }
        else if (!hadNewFinal && interimText) { this._clearSilenceTimer(); }
      };
      this._recognition.onerror = (event) => {
        this._clearSilenceTimer(); this._clearSafetyTimer();
        this._isListening = false; this._setMicState('idle');
        input.placeholder = this._brand.placeholder;
        this._anotarErrorDictado(event.error);   // [LAB]
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          this._appendError('Permiso de micrófono denegado. Actívalo en los ajustes del navegador.');
        }
      };
      this._recognition.onend = () => {
        this._clearSafetyTimer();
        this._isListening = false; this._setMicState('idle');
        const text = (input.value || '').trim();
        if (!text) { input.placeholder = this._brand.placeholder; this._finCentri(''); return; }   // [LAB] cierra la prueba vacía
        input.value = '';
        this._sendQuery(text);
      };
      try { this._recognition.start(); }
      catch (e) { this._setMicState('idle'); input.placeholder = this._brand.placeholder; }
    }

    // [LAB] Adaptadores de lo que el código literal espera encontrar en CENTRI
    _stopTts() { /* el banco de pruebas no tiene voz de salida */ }
    _sendQuery(text) { this._finCentri(text); }
    _appendError(text) { this._registrar('error', text); }

    _finCentri(text) {
      // En CENTRI aquí se enviaría la consulta. En el banco se cierra la prueba.
      // ⚠️ El código literal NO limpia el temporizador de silencio en onend:
      // en Android, si el motor corta antes de los 2,2 s, el temporizador
      // sigue vivo y llama a _stopMic() después. En CENTRI es inofensivo
      // (_pending bloquea un dictado nuevo mientras llega la respuesta). Aquí
      // pararía la prueba siguiente, así que se limpia al cerrar.
      this._clearSilenceTimer();
      this._clearSafetyTimer();
      const causa = this._causaFin || (this._dictado && this._dictado.errores.length ? 'error' : 'motor');
      this._causaFin = '';
      this._cerrarPruebaDictado(text, causa);
    }

    _anotarErrorDictado(codigo) {
      if (this._dictado) this._dictado.errores.push(codigo);
      this._registrar(codigo === 'no-speech' || codigo === 'aborted' ? 'warn' : 'error',
        `Dictado: ${ERRORES_DICTADO[codigo] || 'error'} (${codigo})`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // DICTADO — «Dictado por frases» (NUEVO)
    //
    // Mismos ajustes del motor que CENTRI y EGAEL +50 por plataforma
    // (Android: frase a frase y sin provisionales; resto: continuo con
    // provisionales). ⛔ NUNCA continuous = true en Android: probado en v1.0.1
    // («Largo continuo»), cada resultado repite la frase entera. Además:
    //   · sin temporizador de silencio: solo termina con Terminar, un error
    //     fatal o el tope de MAX_DICTADO_MS;
    //   · cuando el motor corta por su cuenta, se consolida el texto de esa
    //     sesión y se relanza tras RELANZAR_MS;
    //   · se mide el tiempo sordo: desde que el motor corta hasta que vuelve
    //     a escuchar (onaudiostart de la sesión siguiente).
    // ═══════════════════════════════════════════════════════════════════════

    _empezarLargo() {
      this._largo = {
        activo: true,
        texto: '',
        sesiones: 0,
        sordoDesde: 0,
        tope: setTimeout(() => this._terminarLargo('tope'), MAX_DICTADO_MS)
      };
      // v1.0.1: icono de micrófono con pulso mientras dure la prueba (el botón no termina)
      const b = this.shadowRoot.getElementById('micBtn');
      if (b) b.classList.add('largo');
      this._largoSesion();
    }

    _largoSesion() {
      const L = this._largo;
      if (!L || !L.activo) return;
      let rec;
      try { rec = new this._SR(); }
      catch (e) {
        this._registrar('error', `Dictado largo: no se pudo crear el motor (${e && e.message})`);
        this._terminarLargo('error');
        this._cerrarLargo();
        return;
      }
      this._recognition = rec;
      rec.lang = 'es-ES';
      rec.interimResults = !IS_ANDROID;
      rec.continuous = !IS_ANDROID;
      rec.maxAlternatives = 1;

      let finalSesion = '';
      let errorFatal = false;

      // Una sesión que arranca cuando la prueba ya se cerró (Terminar pulsado
      // entre start() y onstart) se aborta: no debe quedar el micrófono abierto.
      const huerfana = () => this._largo !== L || !L.activo;

      rec.onstart = () => {
        if (huerfana()) { try { rec.abort(); } catch (_) {} return; }
        L.sesiones++;
        this._isListening = true;
        if (L.sesiones === 1) {
          this._setMicState('preparing');
          this._pintarEstadoDictado('Preparando micrófono…');
        }
      };
      rec.onaudiostart = () => {
        if (this._largo !== L) return;
        if (L.sordoDesde) {
          const hueco = Date.now() - L.sordoDesde;
          L.sordoDesde = 0;
          if (this._dictado) {
            this._dictado.sordoTotal += hueco;
            if (hueco > this._dictado.sordoMax) this._dictado.sordoMax = hueco;
          }
        }
        if (L.sesiones === 1) {
          this._setMicState('listening');
          this._pintarEstadoDictado('Te escucho. Habla con pausas, como en el coche. Pulsa Terminar al acabar.');
          if (navigator.vibrate) { try { navigator.vibrate(50); } catch (_) {} }
        }
      };
      rec.onresult = (event) => {
        if (this._largo !== L) return;
        // v1.0.2: unión de resultados de v1.0.0 (la de EGAEL +50 / CENTRI).
        let fin = '', provisional = '';
        for (let i = 0; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) fin += t;
          else provisional += t;
        }
        finalSesion = fin.trim();
        L.enCurso = finalSesion;   // para que las métricas cuenten la sesión abierta
        const base = L.texto + (L.texto && finalSesion ? ' ' : '') + finalSesion;
        this._pintarTextoDictado(base, provisional.trim());
      };
      rec.onerror = (event) => {
        if (this._largo !== L) return;
        const codigo = event.error;
        if (codigo === 'no-speech') {
          // En dictado largo es lo esperable cuando el comercial piensa: se
          // cuenta aparte y no se registra cada vez para no tapar el resto.
          if (this._dictado) this._dictado.sinVoz++;
          return;
        }
        this._anotarErrorDictado(codigo);
        if (ERRORES_FATALES.indexOf(codigo) >= 0) {
          errorFatal = true;
          L.activo = false;
          this._causaFin = 'error';
          if (codigo === 'audio-capture' && this._grab) {
            this._registrar('error', 'El micrófono ya está en uso por la grabación: este móvil no deja dictar y grabar a la vez');
          }
        }
      };
      rec.onend = () => {
        if (this._largo !== L) return;
        this._isListening = false;
        // v1.0.2: como EGAEL +50, collapseRepetitions solo en la sesión
        // estándar (iPhone y ordenador), al cerrar cada sesión del motor.
        if (finalSesion && !IS_ANDROID) finalSesion = collapseRepetitions(finalSesion);
        if (finalSesion) L.texto += (L.texto ? ' ' : '') + finalSesion;
        finalSesion = '';
        L.enCurso = '';
        this._pintarTextoDictado(L.texto, '');
        if (L.activo && !errorFatal) {
          if (this._dictado) { this._dictado.cortes++; this._dictado.relanzamientos++; }
          L.sordoDesde = Date.now();
          // v1.0.1: el botón y el estado NO cambian al relanzar (antes pasaba
          // a verde y parecía apagado). Los cortes se ven en las métricas.
          setTimeout(() => { if (this._largo === L && L.activo) this._largoSesion(); }, RELANZAR_MS);
          return;
        }
        this._cerrarLargo();
      };

      try { rec.start(); }
      catch (e) {
        this._registrar('error', `Dictado largo: el motor no arrancó (${e && e.message})`);
        L.activo = false;
        this._causaFin = 'error';
        this._cerrarLargo();
      }
    }

    _terminarLargo(causa) {
      const L = this._largo;
      if (!L) return;
      if (!this._causaFin) this._causaFin = causa;
      const estabaActivo = L.activo;
      L.activo = false;
      this._pintarEstadoDictado('Terminando…');
      if (!estabaActivo) return;
      if (this._isListening && this._recognition) {
        try { this._recognition.stop(); } catch (_) { this._cerrarLargo(); }
      } else {
        // Estaba entre una sesión y la siguiente: no habrá onend.
        this._cerrarLargo();
      }
    }

    _cerrarLargo() {
      const L = this._largo;
      if (!L) return;
      clearTimeout(L.tope);
      this._largo = null;
      this._isListening = false;
      this._setMicState('idle');
      const b = this.shadowRoot.getElementById('micBtn');
      if (b) b.classList.remove('largo');
      if (this._dictado && L.sordoDesde) {
        // El último hueco (corte sin relanzamiento) no cuenta como tiempo sordo.
        L.sordoDesde = 0;
      }
      const causa = this._causaFin || 'motor';
      this._causaFin = '';
      this._cerrarPruebaDictado(L.texto, causa);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // «GRABAR Y TRANSCRIBIR» (v1.0.2)
    //
    // Graba con MediaRecorder (sin dictado del navegador: sin cortes ni
    // pitidos) y, al pulsar Terminar, envía el audio al servidor.
    //
    // SEGMENTOS: Google V1 síncrono acepta 1 minuto como máximo por petición.
    // A los SEGMENTO_MS se abre un grabador nuevo sobre el mismo micrófono
    // ANTES de cerrar el anterior, para no perder palabras en el cambio (el
    // solape es de milisegundos). Cada segmento es un archivo completo y se
    // transcribe por separado; los textos se unen en orden.
    // ═══════════════════════════════════════════════════════════════════════

    async _empezarTranscribir() {
      if (!(window.MediaRecorder && navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
        this._registrar('error', 'Grabar y transcribir: este navegador no permite grabar audio');
        if (this._dictado) this._dictado.errores.push('el navegador no permite grabar');
        this._cerrarPruebaDictado('', 'error');
        return;
      }
      const T = {
        activo: true, stream: null, rec: null, timer: null, mime: '',
        inicio: 0, nSeg: 0, abiertos: 0, segmentos: [], bytes: 0
      };
      this._trans = T;
      const b = this.shadowRoot.getElementById('micBtn');
      if (b) b.classList.add('largo');
      this._setMicState('preparing');
      this._pintarEstadoDictado('Preparando micrófono…');

      let stream;
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
      catch (e) {
        this._transFallo(T, `no se pudo abrir el micrófono (${(e && e.name) || 'error'})`);
        return;
      }
      if (this._trans !== T || !T.activo) {
        // Terminar pulsado mientras se pedía el permiso
        try { stream.getTracks().forEach((t) => t.stop()); } catch (_) {}
        this._transFallo(T, 'terminado antes de empezar a grabar');
        return;
      }
      T.stream = stream;
      try { T.mime = MIME_CANDIDATOS.find((t) => MediaRecorder.isTypeSupported(t)) || ''; } catch (_) { T.mime = ''; }
      T.inicio = Date.now();
      if (!this._transSegmento(T)) return;
      this._setMicState('listening');
      this._pintarEstadoDictado('Grabando. Habla con normalidad, con tus pausas. Pulsa Terminar al acabar.');
      if (navigator.vibrate) { try { navigator.vibrate(50); } catch (_) {} }
      this._registrar('info', `Grabar y transcribir: grabando · formato ${T.mime || 'por defecto del navegador'} · ${AUDIO_BPS / 1000} kbps pedidos`);
    }

    /** Abre un segmento nuevo. Devuelve false si no se pudo crear el grabador. */
    _transSegmento(T) {
      const opts = { audioBitsPerSecond: AUDIO_BPS };
      if (T.mime) opts.mimeType = T.mime;
      let rec;
      try { rec = new MediaRecorder(T.stream, opts); }
      catch (e) {
        try { rec = new MediaRecorder(T.stream); }
        catch (e2) { this._transFallo(T, `no se pudo crear el grabador (${(e2 && e2.name) || 'error'})`); return false; }
      }
      const seg = { n: T.nSeg++, trozos: [], inicio: Date.now(), mime: rec.mimeType || T.mime || '' };
      T.rec = rec;
      T.abiertos++;
      rec.ondataavailable = (ev) => {
        if (ev.data && ev.data.size) { seg.trozos.push(ev.data); T.bytes += ev.data.size; }
      };
      rec.onerror = (ev) => {
        this._registrar('error', `Grabar y transcribir: error del grabador (${(ev && ev.error && ev.error.name) || 'desconocido'})`);
      };
      rec.onstop = () => {
        T.abiertos--;
        const blob = new Blob(seg.trozos, { type: seg.mime || 'audio/webm' });
        T.segmentos[seg.n] = { blob, ms: Date.now() - seg.inicio, mime: blob.type };
        if (!T.activo && T.abiertos === 0) this._transEnviar(T);
      };
      try { rec.start(1000); }
      catch (e) {
        T.abiertos--;
        this._transFallo(T, `el grabador no arrancó (${(e && e.name) || 'error'})`);
        return false;
      }
      T.timer = setTimeout(() => {
        if (!T.activo || T.rec !== rec) return;
        this._registrar('info', `Grabar y transcribir: segmento ${seg.n + 1} cerrado a los ${SEGMENTO_MS / 1000} s, sigue en el ${seg.n + 2}`);
        // El siguiente empieza ANTES de cerrar este: sin hueco en el cambio.
        if (!this._transSegmento(T)) return;
        try { rec.stop(); } catch (_) {}
      }, SEGMENTO_MS);
      return true;
    }

    _terminarTranscribir() {
      const T = this._trans;
      if (!T || !T.activo) return;
      T.activo = false;
      clearTimeout(T.timer);
      this._pintarEstadoDictado('Terminando…');
      if (!T.rec) return;   // aún pidiendo permiso: lo cierra _empezarTranscribir
      try {
        if (T.rec.state !== 'inactive') T.rec.stop();
        else if (T.abiertos === 0) this._transEnviar(T);
      } catch (_) {
        if (T.abiertos === 0) this._transEnviar(T);
      }
    }

    _transFallo(T, msg) {
      T.activo = false;
      clearTimeout(T.timer);
      try { if (T.stream) T.stream.getTracks().forEach((t) => t.stop()); } catch (_) {}
      if (this._trans === T) this._trans = null;
      this._setMicState('idle');
      const b = this.shadowRoot.getElementById('micBtn');
      if (b) b.classList.remove('largo');
      this._registrar('error', `Grabar y transcribir: ${msg}`);
      if (this._dictado) {
        this._dictado.errores.push(msg);
        this._cerrarPruebaDictado('', 'error');
      }
    }

    async _transEnviar(T) {
      if (T.enviado) return;
      T.enviado = true;
      try { T.stream.getTracks().forEach((t) => t.stop()); } catch (_) {}
      this._setMicState('idle');
      const b = this.shadowRoot.getElementById('micBtn');
      if (b) b.classList.remove('largo');
      this._mostrarTerminar(false);

      const d = this._dictado;
      const segs = T.segmentos.filter(Boolean);
      if (d) {
        d.segmentos = segs.length;
        d.bytes = segs.reduce((a, s) => a + s.blob.size, 0);
        d.msAudio = segs.reduce((a, s) => a + s.ms, 0);
        d.formato = segs.length ? segs[0].mime : '';
      }
      segs.forEach((s, i) => this._anadirGrabacion(`grabar y transcribir · segmento ${i + 1}`, s.blob, s.ms));

      if (!segs.length || !segs.some((s) => s.blob.size > 0)) {
        this._trans = null;
        if (d) d.errores.push('no se grabó audio');
        this._registrar('error', 'Grabar y transcribir: no se grabó audio');
        this._cerrarPruebaDictado('', 'error');
        return;
      }

      this._pintarEstadoDictado(`Transcribiendo ${segs.length === 1 ? 'el audio' : 'los ' + segs.length + ' segmentos'}…`);
      this._pintarMetricasDictado();
      this._registrar('info', `Grabar y transcribir: envío ${segs.length} ${segs.length === 1 ? 'segmento' : 'segmentos'} · ${kb(d ? d.bytes : 0)} · ${(d && d.formato) || 'formato desconocido'}`);

      const t0 = Date.now();
      const res = await Promise.all(segs.map((s, i) => this._transcribirSegmento(s, i)));
      if (d) {
        d.esperaMs = Date.now() - t0;
        d.facturadoS = res.reduce((a, r) => a + (r.facturadoS || 0), 0);
        d.modelo = (res.find((r) => r.modelo) || {}).modelo || '';
      }
      const texto = res.map((r) => r.texto).filter(Boolean).join(' ');
      this._trans = null;
      this._cerrarPruebaDictado(texto, texto ? 'usuario' : 'error');
    }

    async _transcribirSegmento(s, i) {
      const d = this._dictado;
      const anotar = (msg) => {
        if (d) d.errores.push(`segmento ${i + 1}: ${msg}`);
        this._registrar('error', `Transcripción, segmento ${i + 1}: ${msg}`);
        return { texto: '' };
      };
      try {
        const audio = await blobABase64(s.blob);
        const t0 = Date.now();
        // Mismo patrón que _fetchTts de centriConsole.js v1.0.4
        const res = await fetch(ENDPOINT_TRANSCRIBIR, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audio, mime: s.mime, ms: s.ms })
        });
        const ms = Date.now() - t0;
        if (!res.ok) {
          let detalle = '';
          try { const j = await res.json(); detalle = (j && j.error) || ''; } catch (_) {}
          if (res.status === 404) return anotar('el endpoint no existe (404): ¿está publicado http-functions.js v1.0.3?');
          if (res.status === 504) return anotar(`corte de conexión (504) a los ${segundos(ms)}: el servidor tardó más de ~14 s`);
          return anotar(`HTTP ${res.status}${detalle ? ' · ' + detalle : ''}`);
        }
        const data = await res.json();
        if (!data || !data.ok) return anotar((data && data.error) || 'respuesta sin texto');
        this._registrar('info', `Transcripción, segmento ${i + 1}: ${segundos(ms)} · modelo ${data.modelo || '?'} · facturado ${data.facturadoS || 0} s · ${textoPalabras(data.texto)}`);
        return { texto: String(data.texto || '').trim(), facturadoS: Number(data.facturadoS) || 0, modelo: data.modelo || '' };
      } catch (e) {
        return anotar((e && e.message) || 'error de red');
      }
    }

    _anadirGrabacion(origen, blob, ms) {
      const url = URL.createObjectURL(blob);
      this._urlsAudio.push(url);
      const tipo = blob.type || 'audio/webm';
      this._grabaciones.push({
        origen,
        formato: tipo,
        ms,
        bytes: blob.size,
        kbps: ms > 0 ? Math.round((blob.size * 8) / ms) : 0,
        url,
        ext: extensionDe(tipo)
      });
      this._pintarGrabaciones();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // GRABACIÓN (MediaRecorder)
    // ═══════════════════════════════════════════════════════════════════════

    _onGrabarClick() {
      if (this._grab) { this._grabarParar(); return; }
      this._grabarEmpezar('prueba de grabación');
    }

    async _grabarEmpezar(origen) {
      if (this._grab) return false;
      if (!(window.MediaRecorder && navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
        this._registrar('error', 'Grabación: este navegador no permite grabar audio');
        return false;
      }
      let stream;
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
      catch (e) {
        this._registrar('error', `Grabación: no se pudo abrir el micrófono (${e && e.name})`);
        return false;
      }
      let mime = '';
      try { mime = MIME_CANDIDATOS.find((t) => MediaRecorder.isTypeSupported(t)) || ''; } catch (_) { mime = ''; }
      let rec;
      try { rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream); }
      catch (e) {
        stream.getTracks().forEach((t) => t.stop());
        this._registrar('error', `Grabación: no se pudo crear el grabador (${e && e.name})`);
        return false;
      }
      const g = { rec, stream, origen, trozos: [], bytes: 0, inicio: Date.now(), mime: rec.mimeType || mime || '' };
      this._grab = g;
      rec.ondataavailable = (ev) => {
        if (ev.data && ev.data.size) { g.trozos.push(ev.data); g.bytes += ev.data.size; }
      };
      rec.onerror = (ev) => {
        this._registrar('error', `Grabación: error del grabador (${(ev && ev.error && ev.error.name) || 'desconocido'})`);
      };
      rec.onstop = () => this._grabarCerrar(g);
      try { rec.start(1000); }
      catch (e) {
        stream.getTracks().forEach((t) => t.stop());
        this._grab = null;
        this._registrar('error', `Grabación: no arrancó (${e && e.name})`);
        return false;
      }
      this._pintarBotonGrabar();
      this._arrancarTick();
      this._registrar('info', `Grabación: empieza (${origen}) · formato ${g.mime || 'por defecto del navegador'}`);
      return true;
    }

    _grabarParar() {
      const g = this._grab;
      if (!g) return;
      try { if (g.rec.state !== 'inactive') g.rec.stop(); else this._grabarCerrar(g); }
      catch (_) { this._grabarCerrar(g); }
    }

    _grabarCerrar(g) {
      if (this._grab !== g) return;
      this._grab = null;
      try { g.stream.getTracks().forEach((t) => t.stop()); } catch (_) {}
      const ms = Date.now() - g.inicio;
      const tipo = g.rec.mimeType || g.mime || 'audio/webm';
      const blob = new Blob(g.trozos, { type: tipo });
      const url = URL.createObjectURL(blob);
      this._urlsAudio.push(url);
      const r = {
        origen: g.origen,
        formato: tipo,
        ms,
        bytes: blob.size,
        kbps: ms > 0 ? Math.round((blob.size * 8) / ms) : 0,
        url,
        ext: extensionDe(tipo)
      };
      this._grabaciones.push(r);
      this._registrar(blob.size ? 'info' : 'error',
        `Grabación: termina · ${mmss(ms)} · ${kb(blob.size)} · ${tipo}`);
      this._pintarBotonGrabar();
      this._pintarGrabaciones();
      this._pararTickSiInactivo();
    }

    _pintarBotonGrabar() {
      const b = this.shadowRoot.getElementById('btnGrabar');
      if (!b) return;
      const grabando = !!this._grab;
      b.textContent = grabando ? 'Parar' : 'Grabar';
      b.classList.toggle('rec', grabando);
      const est = this.shadowRoot.getElementById('grabEstado');
      if (est) est.textContent = grabando ? `Grabando · ${mmss(Date.now() - this._grab.inicio)} · ${kb(this._grab.bytes)}` : '';
    }

    _pintarGrabaciones() {
      const box = this.shadowRoot.getElementById('grabLista');
      if (!box) return;
      if (!this._grabaciones.length) { box.innerHTML = ''; return; }
      box.innerHTML = this._grabaciones.slice().reverse().map((r, i) => {
        const n = this._grabaciones.length - i;
        return `<div class="prueba">
          <div class="prueba-h">#${n} · ${this._escape(r.origen)}</div>
          <div class="prueba-d">${mmss(r.ms)} · ${kb(r.bytes)} · ${r.kbps} kbps · ${this._escape(r.formato)}</div>
          <audio controls preload="metadata" src="${r.url}"></audio>
          <a class="btn small" href="${r.url}" download="centri-sales-prueba-${n}.${r.ext}">Descargar audio</a>
        </div>`;
      }).join('');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // UBICACIÓN
    // ═══════════════════════════════════════════════════════════════════════

    _ubicar() {
      if (!navigator.geolocation) { this._registrar('error', 'Ubicación: no disponible en este navegador'); return; }
      const b = this.shadowRoot.getElementById('btnUbicar');
      const est = this.shadowRoot.getElementById('geoEstado');
      if (b) b.disabled = true;
      if (est) est.textContent = 'Buscando ubicación…';
      const t0 = Date.now();
      this._registrar('info', 'Ubicación: pidiendo posición (alta precisión)');
      navigator.geolocation.getCurrentPosition((pos) => {
        const c = pos.coords;
        const r = {
          ok: true,
          lat: c.latitude,
          lon: c.longitude,
          precision: Math.round(c.accuracy),
          ms: Date.now() - t0
        };
        this._ubicaciones.push(r);
        this._registrar('info', `Ubicación: ±${r.precision} m en ${segundos(r.ms)}`);
        if (b) b.disabled = false;
        if (est) est.textContent = '';
        this._pintarUbicaciones();
      }, (err) => {
        const r = { ok: false, error: ERRORES_GEO[err && err.code] || (err && err.message) || 'error', ms: Date.now() - t0 };
        this._ubicaciones.push(r);
        this._registrar('error', `Ubicación: ${r.error}`);
        if (b) b.disabled = false;
        if (est) est.textContent = '';
        this._pintarUbicaciones();
      }, { enableHighAccuracy: true, timeout: GEO_TIMEOUT_MS, maximumAge: 0 });
    }

    _pintarUbicaciones() {
      const box = this.shadowRoot.getElementById('geoLista');
      if (!box) return;
      box.innerHTML = this._ubicaciones.slice().reverse().map((r, i) => {
        const n = this._ubicaciones.length - i;
        if (!r.ok) return `<div class="prueba"><div class="prueba-h">#${n}</div><div class="prueba-d err-t">${this._escape(r.error)} · ${segundos(r.ms)}</div></div>`;
        const clase = r.precision <= 30 ? 'ok-t' : r.precision <= 100 ? 'warn-t' : 'err-t';
        const mapa = `https://www.google.com/maps?q=${r.lat},${r.lon}`;
        return `<div class="prueba">
          <div class="prueba-h">#${n} · <span class="${clase}">±${r.precision} m</span> en ${segundos(r.ms)}</div>
          <div class="prueba-d">${r.lat.toFixed(6)}, ${r.lon.toFixed(6)}</div>
          <a class="btn small" href="${mapa}" target="_blank" rel="noopener">Ver en el mapa</a>
        </div>`;
      }).join('');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // FOTO DEL TICKET
    // ═══════════════════════════════════════════════════════════════════════

    _onFoto(file) {
      if (!file) return;
      const r = { nombre: file.name || '', tipo: file.type || 'desconocido', bytes: file.size, ancho: 0, alto: 0, redBytes: 0, redAncho: 0, redAlto: 0, error: '' };
      this._registrar('info', `Foto: recibida · ${r.tipo} · ${kb(r.bytes)}`);
      if (this._urlFoto) { try { URL.revokeObjectURL(this._urlFoto); } catch (_) {} }
      const url = URL.createObjectURL(file);
      this._urlFoto = url;
      const img = new Image();
      img.onload = () => {
        r.ancho = img.naturalWidth; r.alto = img.naturalHeight;
        const escala = Math.min(1, FOTO_MAX_LADO / Math.max(r.ancho, r.alto));
        const w = Math.round(r.ancho * escala), h = Math.round(r.alto * escala);
        try {
          const cv = document.createElement('canvas');
          cv.width = w; cv.height = h;
          cv.getContext('2d').drawImage(img, 0, 0, w, h);
          cv.toBlob((blob) => {
            r.redBytes = blob ? blob.size : 0; r.redAncho = w; r.redAlto = h;
            this._fotos.push(r);
            this._registrar('info', `Foto: ${r.ancho}×${r.alto} → ${w}×${h} · ${kb(r.redBytes)}`);
            this._pintarFoto(url);
          }, 'image/jpeg', FOTO_CALIDAD);
        } catch (e) {
          r.error = 'no se pudo reducir';
          this._fotos.push(r);
          this._registrar('error', `Foto: no se pudo reducir (${e && e.message})`);
          this._pintarFoto(url);
        }
      };
      img.onerror = () => {
        r.error = `este navegador no puede leer el formato ${r.tipo}`;
        this._fotos.push(r);
        this._registrar('error', `Foto: ${r.error}`);
        this._pintarFoto(null);
      };
      img.src = url;
    }

    _pintarFoto(url) {
      const box = this.shadowRoot.getElementById('fotoRes');
      if (!box) return;
      const r = this._fotos[this._fotos.length - 1];
      if (!r) { box.innerHTML = ''; return; }
      box.innerHTML =
        (url ? `<img class="foto" src="${url}" alt="Foto del ticket">` : '') +
        `<div class="kv"><span class="k">Formato</span><span class="v">${this._escape(r.tipo)}</span></div>` +
        `<div class="kv"><span class="k">Original</span><span class="v">${r.ancho ? `${r.ancho}×${r.alto} · ` : ''}${kb(r.bytes)}</span></div>` +
        (r.redBytes ? `<div class="kv"><span class="k">Reducida para la IA</span><span class="v ok">${r.redAncho}×${r.redAlto} · ${kb(r.redBytes)}</span></div>` : '') +
        (r.error ? `<div class="kv"><span class="k">Aviso</span><span class="v err">${this._escape(r.error)}</span></div>` : '');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // INFORME
    // ═══════════════════════════════════════════════════════════════════════

    _textoInforme() {
      const e = this._entorno;
      const si = (b) => b ? 'sí' : 'no';
      const out = [];
      out.push(`CENTRI SALES · BANCO DE PRUEBAS v${VERSION}`);
      out.push(`Fecha: ${new Date().toLocaleString('es-ES')}`);
      out.push('');
      out.push('ENTORNO');
      out.push(`- Dispositivo: ${e.dispositivo}`);
      out.push(`- Navegador: ${e.navegador}`);
      out.push(`- Conexión segura: ${si(e.seguro)} · dentro de un marco: ${si(e.enMarco)}`);
      out.push(`- Dictado: ${e.dictado ? 'disponible' : 'NO disponible'} · grabación: ${e.grabacion ? 'disponible' : 'NO disponible'} · ubicación: ${e.ubicacion ? 'disponible' : 'NO disponible'}`);
      out.push(`- Formatos de audio: ${e.formatos && e.formatos.length ? e.formatos.join(', ') : 'ninguno de la lista'}`);
      out.push(`- Permisos: micrófono ${this._textoPermiso(e.permMicro)} · ubicación ${this._textoPermiso(e.permGeo)}`);

      out.push('');
      out.push('DICTADO');
      if (!this._pruebasDictado.length) out.push('- Sin pruebas');
      this._pruebasDictado.forEach((d, i) => {
        out.push(`#${i + 1} ${textoModo(d.modo)}${d.grabarALaVez ? ' + grabación a la vez' : ''}`);
        if (d.modo === 'transcribir') {
          out.push(`  audio: ${mmss(d.msAudio)} · ${d.segmentos} ${d.segmentos === 1 ? 'segmento' : 'segmentos'} · enviado ${kb(d.bytes)} · ${d.formato || 'formato desconocido'}`);
          out.push(`  texto en ${segundos(d.esperaMs)} desde Terminar · modelo ${d.modelo || '—'} · facturado ${d.facturadoS} s · ${textoPalabras(d.texto)} · ${d.texto.length} caracteres`);
        } else {
          out.push(`  ${mmss(d.fin - d.inicio)} · ${textoPalabras(d.texto)} · ${d.texto.length} caracteres · terminó por ${this._textoCausa(d.causa)}`);
        }
        if (d.modo === 'largo') out.push(`  cortes del motor: ${d.cortes} · tiempo sordo: ${segundos(d.sordoTotal)} · hueco mayor: ${segundos(d.sordoMax)} · silencios sin voz: ${d.sinVoz}`);
        out.push(`  toques ignorados en el micrófono: ${d.toquesIgnorados || 0}`);
        if (d.errores.length) out.push(`  errores: ${d.errores.join(', ')}`);
        out.push(`  texto: «${d.texto}»`);
      });

      out.push('');
      out.push('GRABACIÓN');
      if (!this._grabaciones.length) out.push('- Sin pruebas');
      this._grabaciones.forEach((r, i) => {
        out.push(`#${i + 1} ${r.origen}: ${mmss(r.ms)} · ${kb(r.bytes)} · ${r.kbps} kbps · ${r.formato}`);
      });

      out.push('');
      out.push('UBICACIÓN');
      if (!this._ubicaciones.length) out.push('- Sin pruebas');
      this._ubicaciones.forEach((r, i) => {
        out.push(r.ok
          ? `#${i + 1} ±${r.precision} m en ${segundos(r.ms)}`
          : `#${i + 1} ${r.error} (${segundos(r.ms)})`);
      });

      out.push('');
      out.push('FOTO DEL TICKET');
      if (!this._fotos.length) out.push('- Sin pruebas');
      this._fotos.forEach((r, i) => {
        out.push(`#${i + 1} ${r.tipo} · original ${r.ancho ? r.ancho + '×' + r.alto + ' · ' : ''}${kb(r.bytes)}` +
          (r.redBytes ? ` · reducida ${r.redAncho}×${r.redAlto} · ${kb(r.redBytes)}` : '') +
          (r.error ? ` · aviso: ${r.error}` : ''));
      });

      out.push('');
      out.push('REGISTRO');
      this._log.forEach((l) => out.push(`${horaLog(l.t)} ${l.tipo.toUpperCase()} ${l.msg}`));
      return out.join('\n');
    }

    // Copia literal de copiarAlPortapapeles() — widgetAnalizador 1.0.3 (CATHOVIA)
    _copiarAlPortapapeles(texto) {
      return new Promise(function (resolve) {
        var viaAntigua = function () {
          var ta = document.createElement('textarea');
          ta.value = texto; ta.setAttribute('readonly', '');
          ta.style.position = 'absolute'; ta.style.left = '-9999px';
          document.body.appendChild(ta); ta.select();
          var ok = false;
          try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
          document.body.removeChild(ta);
          resolve(ok);
        };
        try {
          if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(texto).then(function () { resolve(true); }, viaAntigua);
            return;
          }
        } catch (e) { /* el iframe puede no tener permiso: vía antigua */ }
        viaAntigua();
      });
    }

    _copiarInforme() {
      const texto = this._textoInforme();
      const aviso = this.shadowRoot.getElementById('copiarOk');
      const manual = this.shadowRoot.getElementById('copiarManual');
      this._copiarAlPortapapeles(texto).then((ok) => {
        if (ok) {
          manual.innerHTML = '';
          aviso.textContent = 'Informe copiado. Pégalo en WhatsApp o en un email.';
          clearTimeout(this._tCopiar);
          this._tCopiar = setTimeout(() => { aviso.textContent = ''; }, 4000);
          return;
        }
        aviso.textContent = 'El navegador no deja copiar aquí. Selecciona el texto y cópialo.';
        manual.innerHTML = `<textarea class="copiar-manual" readonly>${this._escape(texto)}</textarea>`;
        const ta = manual.querySelector('textarea'); ta.focus(); ta.select();
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // RELOJ (duraciones en vivo)
    // ═══════════════════════════════════════════════════════════════════════

    _arrancarTick() {
      if (this._tick) return;
      this._tick = setInterval(() => {
        if (this._dictado) this._pintarMetricasDictado();
        if (this._grab) this._pintarBotonGrabar();
      }, 250);
    }

    _pararTickSiInactivo() {
      if (!this._dictado && !this._grab) this._pararTick();
    }

    _pararTick() {
      if (this._tick) { clearInterval(this._tick); this._tick = null; }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // UTILIDADES — copia literal de centriConsole.js v1.0.4
    // ═══════════════════════════════════════════════════════════════════════

    _escape(s) {
      return String(s == null ? '' : s)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // EVENTOS
    // ═══════════════════════════════════════════════════════════════════════

    _bindEvents() {
      const $ = (id) => this.shadowRoot.getElementById(id);

      $('micBtn').addEventListener('click', () => this._onMicClick());

      this.shadowRoot.querySelectorAll('[data-modo]').forEach((b) => {
        b.addEventListener('click', () => {
          if (this._dictado) return;
          this._modoDictado = b.dataset.modo;
          this._pintarModo();
          this._pintarEstadoDictado(PLACEHOLDER);
        });
      });

      $('btnTerminar').addEventListener('click', () => this._onTerminarClick());

      $('chkALaVez').addEventListener('change', (ev) => { this._grabarALaVez = !!ev.target.checked; });

      $('btnGrabar').addEventListener('click', () => this._onGrabarClick());
      $('btnUbicar').addEventListener('click', () => this._ubicar());

      const inputFoto = $('inputFoto');
      $('btnFoto').addEventListener('click', () => inputFoto.click());
      inputFoto.addEventListener('change', () => {
        const f = inputFoto.files && inputFoto.files[0];
        this._onFoto(f);
        inputFoto.value = '';
      });

      $('btnCopiar').addEventListener('click', () => this._copiarInforme());
    }

    // ═══════════════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════════════

    _render() {
      const c = this._colors;
      this.shadowRoot.innerHTML = `
<style>
  /* Fuentes: cargadas por <link> en el head (ensureFonts).
     NUNCA @import aquí — regla Manual Técnico §13. */

  :host {
    display: block;
    width: 100%;
    /* Copia literal de centriConsole.js v1.0.4: anclado a la VENTANA.
       PRECONDICIÓN: la página contiene SOLO el custom element. */
    height: 100vh;
    height: 100dvh;
    max-height: 100vh;
    max-height: 100dvh;
    min-height: 0;
    font-family: ${FONT_BODY};
    color: ${c.ink};
    background: ${c.bg};
    --bg: ${c.bg};
    --surface: ${c.surface};
    --card: ${c.card};
    --ink: ${c.ink};
    --ink-soft: ${c.inkSoft};
    --muted: ${c.muted};
    --hairline: ${c.hairline};
    --accent: ${c.accent};
    --accent-ink: ${c.accentInk};
    --accent-2: ${ACCENT_2};
    --accent-soft: ${ACCENT_SOFT};
    --focus: ${FOCUS};
    --radius: ${RADIUS};
    --font-body: ${FONT_BODY};
    --ok: ${OK_COLOR};
    --warn: ${WARN_COLOR};
    --err: ${ERR_COLOR};
  }
  * { box-sizing: border-box; }
  ::selection { background: var(--accent); color: var(--accent-ink); }

  .scroll {
    height: 100%;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
  .wrap {
    max-width: 640px;
    margin: 0 auto;
    padding: 16px 16px 48px;
  }

  header { padding: 8px 2px 16px; }
  .eyebrow {
    font-size: 11.5px; font-weight: 600; letter-spacing: .08em;
    text-transform: uppercase; color: var(--accent);
  }
  h1 { font-size: 22px; font-weight: 700; margin: 4px 0 6px; line-height: 1.2; }
  .lead { font-size: 14px; color: var(--ink-soft); line-height: 1.5; margin: 0; }

  .card {
    background: var(--surface);
    border: 1px solid var(--hairline);
    border-radius: var(--radius);
    padding: 16px;
    margin-bottom: 14px;
  }
  .card h2 {
    font-size: 16px; font-weight: 700; margin: 0 0 4px;
    display: flex; align-items: center; gap: 8px;
  }
  .num {
    width: 22px; height: 22px; border-radius: 50%;
    background: var(--accent-soft); color: var(--accent);
    font-size: 12px; font-weight: 700;
    display: inline-flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .card .sub { font-size: 13px; color: var(--muted); margin: 0 0 14px; line-height: 1.45; }
  .sub-h { font-size: 12px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; margin: 16px 0 8px; }
  .muted { color: var(--muted); }

  .kv {
    display: flex; justify-content: space-between; gap: 12px;
    padding: 7px 0; border-bottom: 1px solid var(--hairline);
    font-size: 13.5px;
  }
  .kv:last-of-type { border-bottom: none; }
  .kv .k { color: var(--ink-soft); }
  .kv .v { font-weight: 600; text-align: right; overflow-wrap: anywhere; }
  .v.ok, .ok-t { color: var(--ok); }
  .v.warn, .warn-t { color: var(--warn); }
  .v.err, .err-t { color: var(--err); }
  .ua { font-size: 11px; color: var(--muted); margin-top: 10px; overflow-wrap: anywhere; line-height: 1.4; }

  .seg {
    display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px;
    background: var(--card); border-radius: 10px; padding: 4px;
  }
  .seg button {
    font-family: var(--font-body); font-size: 13px; font-weight: 600; line-height: 1.25;
    border: none; border-radius: 8px; padding: 9px 6px;
    background: transparent; color: var(--ink-soft); cursor: pointer;
  }
  .seg button.on { background: var(--surface); color: var(--accent); box-shadow: 0 1px 2px rgba(0,0,0,.08); }
  .seg button:disabled { cursor: not-allowed; opacity: .6; }
  .ayuda { font-size: 12.5px; color: var(--muted); margin: 8px 2px 12px; line-height: 1.45; }

  .check {
    display: flex; align-items: center; gap: 8px;
    font-size: 13.5px; color: var(--ink-soft); margin-bottom: 14px; cursor: pointer;
  }
  .check input { width: 18px; height: 18px; accent-color: var(--accent); }
  .check.apagada { opacity: .45; cursor: default; }

  .mic-row { display: flex; align-items: center; gap: 14px; }
  .mic-btn {
    width: 64px; height: 64px; border-radius: 50%;
    border: none; cursor: pointer; flex-shrink: 0;
    background: var(--accent); color: var(--accent-ink);
    display: inline-flex; align-items: center; justify-content: center;
    transition: background .15s, box-shadow .15s;
  }
  .mic-btn svg { width: 26px; height: 26px; }
  .mic-btn:hover { background: var(--accent-2); }
  .mic-btn.preparing { opacity: .7; }
  .mic-btn.listening {
    background: var(--err);
    box-shadow: 0 0 0 6px rgba(176,58,46,.15);
  }
  .mic-btn.listening .ico-mic, .mic-btn.preparing .ico-mic { display: none; }
  .mic-btn .ico-stop { display: none; }
  .mic-btn.listening .ico-stop, .mic-btn.preparing .ico-stop { display: block; }
  /* v1.0.1 — modos largos: el micrófono no termina, así que no lleva icono de
     parar; queda en rojo con un pulso hasta Terminar. */
  .mic-btn.largo.listening .ico-mic, .mic-btn.largo.preparing .ico-mic { display: block; }
  .mic-btn.largo.listening .ico-stop, .mic-btn.largo.preparing .ico-stop { display: none; }
  .mic-btn.largo.listening { animation: pulso 1.6s ease-in-out infinite; }
  @keyframes pulso {
    0%, 100% { box-shadow: 0 0 0 4px rgba(176,58,46,.18); }
    50%      { box-shadow: 0 0 0 12px rgba(176,58,46,.06); }
  }
  @media (prefers-reduced-motion: reduce) {
    .mic-btn.largo.listening { animation: none; }
  }
  .estado { font-size: 13.5px; color: var(--ink-soft); line-height: 1.45; }
  .btn.terminar {
    width: 100%; margin-top: 14px;
    background: transparent; color: var(--err); border-color: var(--err);
  }
  .btn.terminar:hover { background: rgba(176,58,46,.08); border-color: var(--err); }
  .btn[hidden] { display: none; }

  .texto {
    margin-top: 14px; min-height: 110px; max-height: 260px; overflow-y: auto;
    background: var(--bg); border: 1px solid var(--hairline); border-radius: 10px;
    padding: 12px; font-size: 15px; line-height: 1.55; white-space: pre-wrap;
  }
  .interim { color: var(--muted); }

  .mets {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 12px;
  }
  .met { background: var(--bg); border-radius: 10px; padding: 10px 8px; text-align: center; }
  .mv { font-size: 18px; font-weight: 700; }
  .ml { font-size: 11px; color: var(--muted); margin-top: 2px; }

  .btn {
    font-family: var(--font-body); font-size: 14px; font-weight: 600;
    border: 1px solid var(--accent); background: var(--accent); color: var(--accent-ink);
    border-radius: 10px; padding: 10px 16px; cursor: pointer;
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    text-decoration: none;
  }
  .btn:hover { background: var(--accent-2); border-color: var(--accent-2); }
  .btn:disabled { opacity: .55; cursor: not-allowed; }
  .btn.ghost { background: transparent; color: var(--accent); }
  .btn.ghost:hover { background: var(--accent-soft); }
  .btn.small { font-size: 12.5px; padding: 6px 10px; margin-top: 8px; background: transparent; color: var(--accent); }
  .btn.small:hover { background: var(--accent-soft); }
  .btn.rec { background: var(--err); border-color: var(--err); }
  .btn-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .btn:focus-visible, .mic-btn:focus-visible, .seg button:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }

  .prueba { border-top: 1px solid var(--hairline); padding: 10px 0; }
  .prueba:first-child { border-top: none; }
  .prueba-h { font-size: 13.5px; font-weight: 600; }
  .prueba-d { font-size: 12.5px; color: var(--ink-soft); margin-top: 2px; line-height: 1.45; }
  audio { width: 100%; margin-top: 8px; }

  .foto { width: 100%; max-height: 320px; object-fit: contain; border-radius: 10px; background: var(--bg); margin: 12px 0 6px; }

  .log {
    margin-top: 12px; max-height: 220px; overflow-y: auto;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11.5px;
    background: var(--bg); border-radius: 10px; padding: 8px 10px;
  }
  .log-row { display: flex; gap: 8px; padding: 2px 0; line-height: 1.4; }
  .log-t { color: var(--muted); flex-shrink: 0; }
  .log-error { color: var(--err); }
  .log-warn { color: var(--warn); }
  .aviso { font-size: 13px; color: var(--ok); margin-top: 8px; min-height: 1em; }
  .copiar-manual {
    width: 100%; min-height: 160px; margin-top: 8px; font-family: ui-monospace, monospace; font-size: 11.5px;
    border: 1px solid var(--hairline); border-radius: 10px; padding: 8px;
  }
  .oculto { display: none; }

  @media (max-width: 380px) {
    .mets { grid-template-columns: repeat(2, 1fr); }
  }
</style>

<div class="scroll">
  <div class="wrap">

    <header>
      <div class="eyebrow">Centri Sales · Banco de pruebas</div>
      <h1>¿Qué permite este móvil?</h1>
      <p class="lead">Prueba el dictado, la grabación, la ubicación y la foto del ticket. Al final, copia el informe y envíalo. No se guarda nada fuera del móvil.</p>
    </header>

    <section class="card">
      <h2><span class="num">0</span>Este dispositivo</h2>
      <p class="sub">Se comprueba solo al abrir la página.</p>
      <div id="entorno"></div>
    </section>

    <section class="card">
      <h2><span class="num">1</span>Dictado del reporte</h2>
      <p class="sub">Cuenta una visita de uno o dos minutos, con las pausas normales de quien piensa mientras habla.</p>
      <div class="seg" role="group" aria-label="Modo de dictado">
        <button type="button" data-modo="centri" aria-pressed="false">CENTRI hoy</button>
        <button type="button" data-modo="largo" aria-pressed="false">Dictado por frases</button>
        <button type="button" data-modo="transcribir" class="on" aria-pressed="true">Grabar y transcribir</button>
      </div>
      <div class="ayuda" id="modoAyuda">${this._escape(ayudaModo(this._modoDictado))}</div>
      <label class="check" id="filaALaVez"><input type="checkbox" id="chkALaVez"> Grabar audio a la vez (respaldo)</label>
      <div class="mic-row">
        <button type="button" class="mic-btn idle" id="micBtn" aria-label="Empezar o terminar el dictado">
          <svg class="ico-mic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><path d="M12 17v5"/></svg>
          <svg class="ico-stop" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
        </button>
        <div class="estado" id="dictadoEstado">${PLACEHOLDER}</div>
      </div>
      <button type="button" class="btn terminar" id="btnTerminar" hidden>Terminar</button>
      <div class="texto" id="dictadoTexto"><span class="muted">El texto dictado aparecerá aquí.</span></div>
      <div class="mets" id="dictadoMetricas"></div>
      <div id="dictadoPruebas"></div>
    </section>

    <section class="card">
      <h2><span class="num">2</span>Grabación de audio</h2>
      <p class="sub">Graba 30 segundos hablando y escúchalo. El formato que dé este móvil decide cómo se transcribirá en el servidor.</p>
      <div class="btn-row">
        <button type="button" class="btn" id="btnGrabar">Grabar</button>
        <span class="estado" id="grabEstado"></span>
      </div>
      <div id="grabLista"></div>
    </section>

    <section class="card">
      <h2><span class="num">3</span>Ubicación</h2>
      <p class="sub">Pruébala dentro y fuera de un local. Por debajo de 30 m es una buena precisión.</p>
      <div class="btn-row">
        <button type="button" class="btn" id="btnUbicar">Obtener ubicación</button>
        <span class="estado" id="geoEstado"></span>
      </div>
      <div id="geoLista"></div>
    </section>

    <section class="card">
      <h2><span class="num">4</span>Foto del ticket</h2>
      <p class="sub">Haz la foto a un ticket real. Se muestra el tamaño original y el reducido que se enviaría a la IA.</p>
      <button type="button" class="btn" id="btnFoto">Hacer foto</button>
      <input type="file" id="inputFoto" class="oculto" accept="image/*" capture="environment">
      <div id="fotoRes"></div>
    </section>

    <section class="card">
      <h2><span class="num">5</span>Informe</h2>
      <p class="sub">Copia el resultado de todas las pruebas y pégalo en WhatsApp o en un email.</p>
      <button type="button" class="btn" id="btnCopiar">Copiar informe</button>
      <div class="aviso" id="copiarOk"></div>
      <div id="copiarManual"></div>
      <div class="sub-h">Registro</div>
      <div class="log" id="logList"><div class="muted">Sin eventos todavía.</div></div>
    </section>

  </div>
</div>`;
    }
  }

  customElements.define('centri-sales-lab', CentriSalesLab);
})();
