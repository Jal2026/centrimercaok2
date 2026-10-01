/* ═══════════════════════════════════════════════════════════════════════════
 * CENTRIMERCA — CENTRI Console (Wix Custom Element)
 * Archivo:  public/custom-elements/centriConsole.js
 * Tag name: centri-console
 * VERSION:  1.0.1
 * FECHA:    25 Agosto 2026
 *
 * ───────────────────────────────────────────────────────────────────────────
 * PROCEDENCIA
 * ───────────────────────────────────────────────────────────────────────────
 * Port de akiraConsole.js v1.2.0 (KAMISUITE), que a su vez es port de
 * cathoviaConsole.js v1.6.x (SABIO VALLEY). NO se ha reescrito el motor de
 * la consola: layout, historial, render de conversación, TTS, micrófono,
 * polling del 504 y apertura de sesión previa son COPIA LITERAL.
 *
 * Regla de método aplicada: copiar del original que funciona, no razonar
 * sobre el propio código. Cada "mejora" de un patrón portado ha roto algo
 * antes en este linaje.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * QUÉ CAMBIA RESPECTO A AKIRA v1.2.0 (y por qué)
 * ───────────────────────────────────────────────────────────────────────────
 *
 *   1. CUATRO PLANOS en vez de dos: MERCADO · PRODUCTO · TRABAJAR CON
 *      CENTRIMERCA · DUDAS. Mismo mecanismo de chips: el plano viaja en el
 *      cuerpo de la petición y cambiar de chip ABRE CHAT NUEVO — el historial
 *      viaja entero al modelo y mezclar planos deshace la separación que hace
 *      el backend.
 *
 *   2. TEMA ÚNICO, sin sistema de skins. AKIRA arrastra siete pieles oklch
 *      porque es un producto multi-salón. CENTRI es un cliente, una marca.
 *      Se sustituye por una paleta plana (patrón CATHOVIA) con el color de
 *      marca #006166. Eliminados KR_SKINS, KR_NIEBLA_DEFAULTS, KR_MAP y
 *      resolverSkin(): ~180 líneas de maquinaria que aquí no aplica.
 *
 *   3. TIPOGRAFÍA Bai Jamjuree, cargada con <link> en el head del documento
 *      padre. NUNCA @import dentro del Shadow DOM: CATHOVIA v1.6.8 aún lo
 *      hace (línea 1618 de su consola) y es un fallo, no un patrón.
 *
 *   4. functionsBase — NUEVO, no viene de ninguno de los dos padres.
 *      Ambas consolas llaman a '/_functions/...' en absoluto. Verificado:
 *      cero apariciones de functionsBase en akiraConsole y en cathoviaConsole,
 *      pese a que la Guía Técnica de Cathovia §17.7 lo da por resuelto desde
 *      el 25-jul y afirma que "ese trabajo ya está pagado". No lo está.
 *      Consecuencias de no tenerlo: 404 si el sitio se sirve bajo subcarpeta,
 *      y la consola queda atada a este runtime el día que se saque fuera.
 *      Aquí se resuelve por configuración, con el absoluto como fallback:
 *      si el page code no manda functionsBase, el comportamiento es el de
 *      AKIRA. Degrada sin romper.
 *
 *   5. BARRIDOS los dos desfases de versión documentados como bugs abiertos
 *      en la Guía Técnica de AKIRA §26: el literal '[AKIRA v1.0.4]' de la
 *      guarda de registro, y la divergencia cabecera/constante de runtime.
 *      Aquí VERSION es la única fuente de verdad y el TAG se deriva de ella.
 *
 *   6. brand.disclaimer — mecanismo presente, cadena VACÍA por defecto, no
 *      pinta nada. Patrón CATHOVIA v1.6.7. Se deja montado porque una consola
 *      cara al cliente suele acabar necesitándolo; activarlo es una cadena en
 *      el brand, no tocar este archivo.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * LO QUE SE CONSERVA INTACTO DE AKIRA v1.2.0
 * ───────────────────────────────────────────────────────────────────────────
 *
 *   · SESIÓN ANTES DE PREGUNTAR (_ensureSession). Sin esto el polling de
 *     recuperación del 504 NO cubre la primera pregunta de cada conversación,
 *     que es justo donde vive la pregunta pesada. Además evita que cada
 *     "Reintentar" cree una sesión huérfana con su llamada completa pagada.
 *
 *   · RUTA ÚNICA. El fetch va directo del elemento al endpoint. NO se emite
 *     evento al page code para preguntar: hacer las dos cosas provocó doble
 *     llamada al modelo y doble coste (CATHOVIA v1.6.1).
 *
 *   · observedAttributes DECLARA AMBAS GRAFÍAS. El DOM minusculiza los
 *     nombres: setAttribute('ttsAudio') crea "ttsaudio". Declarar solo
 *     camelCase significa que el callback no se dispara NUNCA y el dato se
 *     descarta en silencio. CATHOVIA v1.6.8 sigue declarando solo camelCase.
 *
 *   · SIN short-circuit oldVal===newVal: al reabrir un chat el JSON puede
 *     llegar idéntico y hay que repintar igualmente.
 *
 *   · height:100dvh anclado a la ventana, no al contenedor.
 *     PRECONDICIÓN: la página contiene SOLO el custom element.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * v1.0.1 — 03 SEP 2026 · EL CHIP SE RESTITUYE AL REABRIR UN CHAT
 * ───────────────────────────────────────────────────────────────────────────
 * Detectado por Jal: al recuperar una conversación del historial, el chip de
 * plano se quedaba en el que estuviera puesto. Viene de origen — la sesión
 * nunca guardó su plano, ni en AKIRA ni en CATHOVIA.
 *
 * No es cosmético. El historial viaja ENTERO al modelo en cada pregunta: una
 * conversación de mercado reabierta con el chip en producto mete turnos de un
 * plano dentro del prompt de otro, y deshace la separación que el backend
 * acaba de hacer. Es el mismo motivo por el que cambiar de chip abre chat
 * nuevo.
 *
 * Circuito completo (cuatro archivos):
 *   · centriLogic.web.js v1.0.4 — `_crearSesion` guarda `modo` en
 *     CentriSessions; `centriAbrirChat` lo devuelve.
 *   · http-functions.js v1.0.1 — `centriNuevaSesion` lo pasa.
 *   · Centri.page.js v1.0.1 — viaja dentro del atributo `history`.
 *   · aquí — `_ensureSession` lo manda al abrir; `_applyHistory` mueve el chip.
 *
 * ⛔ REQUIERE el campo `modo` (Texto) en CentriSessions. Escribir a un campo
 *    inexistente NO falla: wixData ignora la clave en silencio.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * COMUNICACIÓN
 * ───────────────────────────────────────────────────────────────────────────
 *   Page → CE:  el.setAttribute('response', JSON.stringify({...}))
 *   CE → Page:  el.dispatchEvent(new CustomEvent('centri-message', {detail}))
 *
 *   Eventos: centri-ready · centri-load-chats · centri-open-chat ·
 *            centri-delete-chat
 *
 *   Endpoints esperados:
 *     POST <functionsBase>/_functions/centriNuevaSesion
 *     POST <functionsBase>/_functions/centriAsk
 *     POST <functionsBase>/_functions/centriTts
 * ═══════════════════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  if (customElements.get('centri-console')) {
    // El TAG se deriva de VERSION: no puede desfasarse de la cabecera.
    console.log('[CENTRI] Ya registrado.');
    return;
  }

  const VERSION = '1.0.1';
  const TAG = `[CENTRI v${VERSION}]`;

  const LS_SIDEBAR = 'centri-sidebar-open';
  const LS_PANEL   = 'centri-panel-open';
  const LS_TTS_AUTO = 'centri-tts-auto';

  // ── Polling de recuperación del 504 (CATHOVIA v1.6.2) ──
  // Wix corta la conexión cliente↔backend a los ~14s. El backend SIGUE
  // ejecutándose y guarda la respuesta en CentriMessages. Vamos a buscarla.
  const POLL_INTERVAL_MS  = 3000;
  const POLL_MAX_ATTEMPTS = 20;   // 20 × 3s = 60s

  // ── Micrófono ──
  const SILENCE_MS = 2200;
  const SAFETY_MS  = 12000;

  const UA = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
  const IS_ANDROID = /Android/.test(UA);

  // ═════════════════════════════════════════════════════════════════════════
  // TEMA — paleta única de CENTRIMERCA
  //
  // AKIRA trae siete pieles conmutables en oklch porque es un producto
  // multi-salón: cada cuenta elige la suya desde SalonConfig. CENTRI es un
  // cliente y una marca, así que esa maquinaria (KR_SKINS, KR_NIEBLA_DEFAULTS,
  // KR_MAP, resolverSkin) se ha eliminado entera.
  //
  // Formato hex plano, patrón CATHOVIA: nueve colores, legibles de un vistazo
  // y editables sin traducir espacios de color.
  //
  // #006166 es el color de marca facilitado por el cliente.
  // accentInk blanco sobre el acento da 7,24:1 de contraste (AAA).
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

  /**
   * Carga Bai Jamjuree con <link> en el head del documento padre.
   *
   * NUNCA @import dentro del Shadow DOM. CATHOVIA v1.6.8 lo sigue haciendo
   * (línea 1618 de cathoviaConsole.js) — es un fallo heredado, no un patrón
   * a copiar, por mucho que aparezca en un archivo de producción.
   *
   * Si la carga falla, la cascada de FONT_BODY cae a la fuente de sistema y
   * la consola sigue siendo legible. Degrada sin romper.
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

  const DEFAULT_BRAND = {
    name:         'CENTRI',
    sub:          '',
    // Logo. Va AQUÍ, no en el page code — patrón literal de CATHOVIA v1.6.5.
    // Es la marca del producto: no debe poder perderse por un fallo del page
    // code ni depender de ningún backend.
    //
    // ⚠️ URL CRUDA de Media Manager, terminada en ~mv2.png. NUNCA la variante
    // con /v1/fill/w_,h_,al_c,q_85,enc_auto/ — ese pipeline aplana el canal
    // alfa contra blanco y produce un marco blanco alrededor del logo.
    //
    // PENDIENTE: logo de Centrimerca. Vacío = se pinta el nombre en texto,
    // que es degradación aceptable mientras tanto.
    logo:         '',
    welcomeTitle: 'CENTRI',
    welcome:      'Elige arriba sobre qué quieres preguntar.',
    placeholder:  'Escribe tu pregunta…',
    thinking:     'Pensando…',
    // Mecanismo presente, VACÍO por defecto: no pinta nada.
    // Patrón CATHOVIA v1.6.7. Para activarlo basta una cadena no vacía en el
    // brand que manda el page code; este archivo no se toca.
    disclaimer:   ''
  };

  /* Textos por plano. El page code puede sobrescribirlos con `brandPlanes`
     dentro de la config; lo que no venga, se coge de aquí. Se aplican sobre
     _brand cada vez que cambia el chip.

     ⚠️ PROVISIONALES. Se redactan en firme cuando llegue la información
     específica de Centrimerca. No son contenido validado. */
  const BRAND_PLANOS = {
    mercado: {
      sub:          'Mercado',
      welcomeTitle: 'CENTRI · Mercado',
      welcome:      'Pregúntame por la situación del mercado de frutas y hortalizas: temporadas, tendencias, oferta y demanda.',
      placeholder:  'Pregunta por el mercado…',
      thinking:     'Consultando el mercado…'
    },
    producto: {
      sub:          'Producto',
      welcomeTitle: 'CENTRI · Producto',
      welcome:      'Pregúntame por el catálogo: variedades, calibres, orígenes y disponibilidad por temporada.',
      placeholder:  'Pregunta por un producto…',
      thinking:     'Buscando en el catálogo…'
    },
    trabajar: {
      sub:          'Trabajar con Centrimerca',
      welcomeTitle: 'CENTRI · Trabajar con Centrimerca',
      welcome:      'Pregúntame cómo se trabaja con Centrimerca: procedimientos, condiciones y con quién contactar en cada caso.',
      placeholder:  '¿Cómo funciona…?',
      thinking:     'Buscando la respuesta…'
    },
    dudas: {
      sub:          'Dudas',
      welcomeTitle: 'CENTRI · Dudas',
      welcome:      'Pregúntame cualquier duda sobre Centrimerca.',
      placeholder:  'Escribe tu duda…',
      thinking:     'Buscando la respuesta…'
    }
  };

  /* ⚠️ El ORDEN de este array es el orden de los chips en pantalla. El primero
     NO es necesariamente el plano de arranque: eso lo fija PLANO_ARRANQUE.

     ⚠️ NO CONFUNDIR con el plano por defecto DEL BACKEND. Son dos cosas
     distintas y conviene que NO coincidan:
       · PLANO_ARRANQUE          → con qué chip abre la consola.
       · PLANO_DEFECTO (backend) → dónde caen los documentos del corpus a los
         que se les olvidó poner plano (regla "vacío = plano por defecto").

     En AKIRA ambos eran ASESOR, y un manual de 69.838 caracteres sin plano
     acabó dentro del corpus del consultor — que además leía solo su primer
     17 %, en silencio, durante meses.

     Decisión para CENTRI: arranque en MERCADO; el defecto del backend, en
     DUDAS, que es donde menos daño hace el ruido. */
  const PLANOS = [
    { id: 'mercado',  label: 'Mercado',  title: 'Situación y temporadas del mercado' },
    { id: 'producto', label: 'Producto', title: 'Catálogo, variedades y calibres' },
    { id: 'trabajar', label: 'Trabajar con Centrimerca', title: 'Procedimientos, condiciones y contactos' },
    { id: 'dudas',    label: 'Dudas',    title: 'Cualquier otra consulta' }
  ];

  const PLANO_ARRANQUE = 'mercado';

  function isMobileViewport() {
    try { return window.matchMedia('(max-width: 900px)').matches; }
    catch (_) { return window.innerWidth < 900; }
  }

  class CentriConsole extends HTMLElement {

    static get observedAttributes() {
      // ⚠️ EL DOM MINÚSCULIZA LOS NOMBRES DE ATRIBUTO. setAttribute('ttsAudio')
      // crea el atributo "ttsaudio". Si aquí solo se declara 'ttsAudio' en
      // camelCase, NUNCA coincide → attributeChangedCallback no se dispara →
      // el audio no suena y el error no se ve. Bug heredado de CATHOVIA
      // v1.6.5, donde afecta igual a ttsAudio/ttsError/systemError.
      // Se declaran AMBAS grafías: la minúscula es la que el DOM usa de
      // verdad; la camelCase se mantiene por si alguna versión de Wix
      // preservara el case. attributeChangedCallback normaliza.
      return [
        'config', 'response', 'chats', 'history',
        'ttsaudio', 'ttserror', 'systemerror',
        'ttsAudio', 'ttsError', 'systemError'
      ];
    }

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._userId    = '';
      this._userName  = '';
      this._modo      = PLANO_ARRANQUE;   // plano activo (ver PLANOS)
      this._brandBase   = { ...DEFAULT_BRAND };   // marca sin overrides de plano
      this._brandPlanos = JSON.parse(JSON.stringify(BRAND_PLANOS));
      this._sessionId = null;
      this._chats     = [];
      this._pending   = false;
      this._pendingId = null;
      this._msgCounter = 0;
      this._hasMessages = false;
      // Marca efectiva del plano de arranque (ASESOR). _brandBase y
      // _brandPlanos ya están fijados arriba.
      this._brand  = { ...DEFAULT_BRAND, ...(BRAND_PLANOS[this._modo] || {}) };
      this._colors = { ...DEFAULT_COLORS };   // paleta única, sin sistema de skins

      // Dirección base de los endpoints. Vacío = ruta absoluta, que es el
      // comportamiento de AKIRA y de CATHOVIA. Ver _functionsUrl().
      this._functionsBase = '';
      // El botón de voz lo enciende el page code con config.ttsEnabled.
      // Apagado por defecto a propósito: si el endpoint de voz aún no está
      // desplegado, el botón no debe aparecer y prometer algo que no responde.
      this._ttsEnabled = false;

      // Polling de recuperación del 504
      this._lastQuery      = '';
      this._polling        = false;
      this._pollTimer      = null;
      this._pollAttempts   = 0;
      this._lastErrorBlock = null;

      // TTS
      this._ttsAutoPlay = this._readLS(LS_TTS_AUTO, false);
      this._audioEl = null;
      this._playingMessageId = null;

      // Micrófono
      this._SR = null;
      this._recognition = null;
      this._isListening = false;
      this._silenceTimer = null;
      this._safetyTimer = null;
      this._androidFinalBuffer = '';
      this._lastFinalTranscript = '';

      const mobile = isMobileViewport();
      this._sidebarOpen = mobile ? false : this._readLS(LS_SIDEBAR, true);
      this._panelOpen   = false;
    }

    connectedCallback() {
      ensureFonts();
      this._render();
      this._bindEvents();
      this._renderWelcome();
      this._setupMic();
      setTimeout(() => this._emit('centri-ready', {}), 50);
      console.log(`${TAG} Montado. plano=${this._modo} sidebar=${this._sidebarOpen}`);
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!newVal) return;
      // El DOM entrega el nombre en minúsculas. Se normaliza para que dé
      // igual cómo lo escriba el page code. Ver observedAttributes.
      const attr = String(name || '').toLowerCase();
      console.log(`${TAG} attr "${attr}" len=${(newVal || '').length}`);

      // NO se aplica short-circuit oldVal===newVal: al reabrir un chat el
      // JSON puede llegar idéntico y hay que re-renderizar igualmente.
      // (lección CATHOVIA v1.4.2)
      if (attr === 'systemerror') { this._showSystemError(newVal); return; }
      let payload;
      try { payload = JSON.parse(newVal); } catch (e) {
        console.warn(`${TAG} atributo "${attr}" no es JSON válido`);
        return;
      }

      if (attr === 'config')   this._applyConfig(payload);
      if (attr === 'response') this._handleResponse(payload);
      if (attr === 'chats')    this._applyChats(payload);
      if (attr === 'history')  this._applyHistory(payload);
      if (attr === 'ttsaudio') this._applyTtsAudio(payload);
      if (attr === 'ttserror') this._applyTtsError(payload);
    }

    _applyConfig(cfg) {
      console.log(`${TAG} applyConfig`, cfg);
      if (cfg.functionsBase) this._functionsBase = String(cfg.functionsBase);
      if (cfg.userId)     this._userId    = cfg.userId;
      if (cfg.userName)   this._userName  = cfg.userName;
      // El plano que llega de fuera se valida contra la lista cerrada.
      // Cualquier otra cosa se ignora y se conserva el de arranque.
      if (cfg.modo) {
        if (PLANOS.some(p => p.id === cfg.modo)) this._modo = cfg.modo;
        else console.warn(`${TAG} plano "${cfg.modo}" desconocido → ${this._modo}`);
      }
      if (cfg.sessionId)  this._sessionId = cfg.sessionId;
      if (cfg.ttsEnabled === true) this._ttsEnabled = true;

      // Colores: la paleta de marca puede afinarse desde el page code sin
      // tocar este archivo. Lo que no venga, se queda como está — nunca se
      // borra un color por recibir un objeto incompleto.
      if (cfg.colors && typeof cfg.colors === 'object') {
        this._colors = { ...this._colors, ...cfg.colors };
      }

      if (cfg.brand) this._brandBase = { ...DEFAULT_BRAND, ...cfg.brand };
      if (cfg.brandPlanes && typeof cfg.brandPlanes === 'object') {
        Object.keys(cfg.brandPlanes).forEach(k => {
          this._brandPlanos[k] = { ...(this._brandPlanos[k] || {}), ...(cfg.brandPlanes[k] || {}) };
        });
      }
      this._aplicarBrandDelPlano();

      this._render();
      this._bindEvents();
      if (this._sessionId) {
        this._emit('centri-open-chat', { sessionId: this._sessionId });
      } else {
        this._renderWelcome();
      }
      this._emit('centri-load-chats', {});
    }

    /* Marca efectiva = base del page code + overrides del plano activo. */
    _aplicarBrandDelPlano() {
      const overrides = this._brandPlanos[this._modo] || {};
      this._brand = { ...this._brandBase, ...overrides };
    }

    /* Cambio de plano desde los chips. Abre chat nuevo a propósito: el
       historial viaja entero a Anthropic y mezclar planos en una misma
       conversación deshace la separación que hace el backend. */
    _setPlano(plano) {
      if (!plano || plano === this._modo) return;
      if (!PLANOS.some(p => p.id === plano)) return;
      console.log(`${TAG} plano → ${plano}`);
      this._modo = plano;
      this._aplicarBrandDelPlano();
      this._render();
      this._bindEvents();
      this._resetToNewChat();
      this._renderChats();
    }

    _applyChats(payload) {
      this._chats = Array.isArray(payload) ? payload : (payload.chats || []);
      this._renderChats();
    }

    _applyHistory(payload) {
      const sessionId = payload.sessionId || null;
      const mensajes  = payload.mensajes || [];
      if (sessionId) this._sessionId = sessionId;

      // ── POLLING (CATHOVIA v1.6.2) ──
      // Si hay polling activo esperando la respuesta de un 504, solo
      // repintamos si el historial YA trae la respuesta esperada. Si no,
      // mantenemos "pensando…" y programamos el siguiente intento.
      if (this._polling) {
        if (this._historyContainsExpectedAnswer(mensajes)) {
          console.log(`${TAG} polling OK en intento #${this._pollAttempts}`);
          this._stopPolling();
        } else {
          this._scheduleNextPoll();
          return;
        }
      }

      // ── v1.0.1 · RESTITUIR EL CHIP DEL PLANO ──
      //
      // ⚠️ NO se llama a _setPlano(). Ese método abre chat nuevo A PROPÓSITO,
      //    y aquí borraría justo la conversación que estamos restaurando.
      //
      // ⚠️ El re-render va ANTES de pintar los mensajes: _render() reconstruye
      //    el Shadow DOM entero, #messages incluido. Al revés se pintarían
      //    sobre un elemento que deja de existir en la línea siguiente.
      //
      // Se valida contra la lista cerrada, como todo lo que llega de fuera.
      // `modo` null significa sesión anterior al campo: NO se toca el chip.
      // Forzar el plano por defecto sobre una conversación de mercado sería
      // peor que dejar el que hay.
      const modoGuardado = payload.modo;
      if (modoGuardado && modoGuardado !== this._modo &&
          PLANOS.some(p => p.id === modoGuardado)) {
        console.log(`${TAG} plano restituido desde la sesión → ${modoGuardado}`);
        this._modo = modoGuardado;
        this._aplicarBrandDelPlano();
        this._render();
        this._bindEvents();
        this._renderChats();
      }

      const messagesEl = this.shadowRoot.getElementById('messages');
      messagesEl.innerHTML = '';
      this._hasMessages = false;
      this._lastErrorBlock = null;

      if (mensajes.length === 0) {
        this._renderWelcome();
      } else {
        mensajes.forEach(m => {
          if (m.rol === 'user') this._appendUser(m.contenido, false);
          else this._appendAssistant(m.contenido, false);
        });
        this._hasMessages = true;
        this._scrollBottom();
      }
      this._highlightActiveChat();
    }

    /** True si el historial ya contiene la respuesta que esperábamos. */
    _historyContainsExpectedAnswer(mensajes) {
      if (!Array.isArray(mensajes) || mensajes.length === 0) return false;
      if (!this._lastQuery) return false;
      let lastUserIdx = -1;
      for (let i = mensajes.length - 1; i >= 0; i--) {
        if (mensajes[i].rol === 'user') { lastUserIdx = i; break; }
      }
      if (lastUserIdx === -1) return false;
      const lastUserContent = String(mensajes[lastUserIdx].contenido || '').trim();
      if (lastUserContent !== String(this._lastQuery || '').trim()) return false;
      for (let i = lastUserIdx + 1; i < mensajes.length; i++) {
        if (mensajes[i].rol === 'assistant') return true;
      }
      return false;
    }

    _handleResponse(payload) {
      this._hideThinking();
      this._pending = false;

      if (payload.messageId && this._pendingId && payload.messageId !== this._pendingId) return;
      this._pendingId = null;

      if (payload.sessionId && !this._sessionId) {
        this._sessionId = payload.sessionId;
        this._emit('centri-load-chats', {});
      }

      const text = payload.respuesta
                || (typeof payload.error === 'string' ? payload.error : null)
                || (payload.error && payload.error.message) || null;

      if (payload.error && !payload.respuesta) {
        // El fetch falló (típicamente 504 tras los ~14s del gateway de Wix),
        // pero el backend sigue vivo y guardará la respuesta en CentriMessages.
        // Arrancamos polling en vez de mostrar error: el usuario no se entera.
        if (this._sessionId && this._lastQuery) {
          this._startPolling();
          return;
        }
        this._stopPolling();
        this._lastErrorBlock = this._appendErrorWithRetry(text || 'Error de conexión.');
      } else if (text) {
        this._stopPolling();
        this._lastErrorBlock = null;
        this._appendAssistant(text, true);
        this._emit('centri-load-chats', {});
      } else {
        this._appendError('No he recibido respuesta. Inténtalo de nuevo.');
      }
    }

    _startPolling() {
      this._stopPolling();
      this._polling = true;
      this._pollAttempts = 0;
      console.log(`${TAG} startPolling sessionId=${this._sessionId}`);
      this._scheduleNextPoll();
    }

    _scheduleNextPoll() {
      if (!this._polling) return;
      this._pollAttempts++;
      if (this._pollAttempts > POLL_MAX_ATTEMPTS) {
        console.log(`${TAG} polling agotado`);
        this._stopPolling();
        this._hideThinking();
        this._pending = false;
        this._lastErrorBlock = this._appendErrorWithRetry(
          'El análisis está tardando más de lo previsto. Puedes reintentar o esperar unos segundos.'
        );
        return;
      }
      this._pollTimer = setTimeout(() => {
        if (!this._polling) return;
        console.log(`${TAG} polling intento #${this._pollAttempts}/${POLL_MAX_ATTEMPTS}`);
        this._emit('centri-open-chat', { sessionId: this._sessionId });
      }, POLL_INTERVAL_MS);
    }

    _stopPolling() {
      if (this._pollTimer) { clearTimeout(this._pollTimer); this._pollTimer = null; }
      this._polling = false;
      this._pollAttempts = 0;
    }

    _sendQuery(query) {
      if (this._pending || !query.trim()) return;
      this._msgCounter++;
      const messageId = `msg_${this._msgCounter}_${Date.now()}`;
      this._pendingId = messageId;
      this._pending = true;
      this._lastQuery = query.trim();
      this._stopPolling();

      if (this._lastErrorBlock) {
        try { this._lastErrorBlock.remove(); } catch (_) {}
        this._lastErrorBlock = null;
      }

      this._clearWelcome();
      this._appendUser(query, true);
      this._showThinking();
      this._fetchCentriAsk(query, messageId);
    }

    /**
     * Petición HTTP directa a /_functions/centriAsk.
     * NO se emite ningún evento al Page Code para preguntar: en CATHOVIA
     * v1.6.1 hacerlo a la vez que el fetch provocó DOBLE llamada a Anthropic
     * y doble coste. Ruta única. (v1.6.2)
     */
    /**
     * Abre la sesión ANTES de preguntar, si aún no hay ninguna. (v1.2.0)
     *
     * Es la pieza que hace que el polling de recuperación del 504 funcione
     * también en la PRIMERA pregunta de una conversación: sin sessionId,
     * _handleResponse no puede arrancarlo y el usuario ve el error del
     * gateway aunque la respuesta esté ya guardada en CentriMessages.
     *
     * NO bloquea: si la llamada falla, se sigue adelante con _sessionId null
     * y el comportamiento es el de v1.1.0. Peor que ahora no se puede quedar.
     */
    async _ensureSession(query) {
      if (this._sessionId) return;
      try {
        const res = await fetch(this._functionsUrl('/_functions/centriNuevaSesion'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: this._userId,
            userName: this._userName,
            query: query,
            // v1.0.1 — el plano se guarda CON la sesión. Aquí es donde nace:
            // esta llamada abre la conversación antes de la primera pregunta,
            // así que sin `modo` la sesión quedaría sin plano para siempre.
            modo: this._modo
          })
        });
        if (!res.ok) {
          console.warn(`${TAG} centriNuevaSesion HTTP ${res.status} — se pregunta sin sessionId`);
          return;
        }
        const data = await res.json();
        if (data && data.ok && data.sessionId) {
          this._sessionId = data.sessionId;
          console.log(`${TAG} sesión abierta antes de preguntar: ${this._sessionId}`);
          // Que la conversación aparezca ya en la barra lateral: si la
          // respuesta llega por polling, _applyHistory no refresca la lista.
          this._emit('centri-load-chats', {});
        } else {
          console.warn(`${TAG} centriNuevaSesion sin sessionId — se pregunta sin él`);
        }
      } catch (err) {
        console.warn(`${TAG} centriNuevaSesion falló:`, err.message || err);
      }
    }

    async _fetchCentriAsk(query, messageId) {
      try {
        // v1.2.0 — sessionId primero. Un insert, milisegundos: no acerca esta
        // petición al techo de 14s, y da al polling con qué recuperar.
        await this._ensureSession(query);

        const res = await fetch(this._functionsUrl('/_functions/centriAsk'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: this._sessionId,
            query: query,
            userId: this._userId,
            userName: this._userName,
            modo: this._modo
          })
        });

        if (!res.ok) {
          console.warn(`${TAG} centriAsk HTTP ${res.status}`);
          this._handleResponse({
            messageId,
            error: `El servicio respondió con error ${res.status}.`
          });
          return;
        }

        const data = await res.json();
        console.log(`${TAG} centriAsk OK len=${(data.respuesta || '').length}`);
        this._handleResponse({
          messageId,
          ok: data.ok,
          respuesta: data.respuesta,
          sessionId: data.sessionId,
          error: data.ok ? null : (data.error || 'Error desconocido')
        });
      } catch (err) {
        console.error(`${TAG} centriAsk EXCEPTION:`, err.message || err);
        this._handleResponse({
          messageId,
          error: 'No he podido conectar con el servicio.'
        });
      }
    }

    _handleSend() {
      const input = this.shadowRoot.getElementById('chatInput');
      const query = (input.value || '').trim();
      if (!query) return;
      input.value = '';
      input.style.height = 'auto';
      this._sendQuery(query);
      setTimeout(() => input.focus(), 0);
    }

    _bindEvents() {
      const root = this.shadowRoot;
      root.getElementById('sendBtn').addEventListener('click', () => this._handleSend());

      const input = root.getElementById('chatInput');
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this._handleSend(); }
      });
      input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 180) + 'px';
      });

      const inputBox = root.querySelector('.input-box');
      if (inputBox) {
        inputBox.addEventListener('click', (e) => {
          if (e.target !== input && e.target.tagName !== 'BUTTON') input.focus();
        });
      }

      root.getElementById('btnToggleSidebar').addEventListener('click', () => this._toggleSidebar());
      const btnPanel = root.getElementById('btnTogglePanel');
      if (btnPanel) btnPanel.addEventListener('click', () => this._togglePanel());
      root.getElementById('btnNewChat').addEventListener('click', () => this._resetToNewChat());

      const backdrop = root.getElementById('backdrop');
      if (backdrop) backdrop.addEventListener('click', () => this._closeAllPanels());

      const closeSidebar = root.getElementById('btnCloseSidebar');
      if (closeSidebar) closeSidebar.addEventListener('click', () => {
        this._sidebarOpen = false;
        this._writeLS(LS_SIDEBAR, false);
        this._applyLayoutState();
      });

      const closePanel = root.getElementById('btnClosePanel');
      if (closePanel) closePanel.addEventListener('click', () => {
        this._panelOpen = false;
        this._writeLS(LS_PANEL, false);
        this._applyLayoutState();
      });

      const closeErr = root.getElementById('closeErrorBanner');
      if (closeErr) closeErr.addEventListener('click', () => this._hideSystemError());

      const btnTts = root.getElementById('btnToggleTts');
      if (btnTts) btnTts.addEventListener('click', () => this._toggleTtsAutoPlay());

      const micBtn = root.getElementById('micBtn');
      if (micBtn) micBtn.addEventListener('click', () => this._toggleMic());

      const planos = root.getElementById('tbPlanos');
      if (planos) {
        planos.querySelectorAll('.tb-chip').forEach(chip => {
          chip.addEventListener('click', () => this._setPlano(chip.dataset.plano));
        });
      }
    }

    _closeAllPanels() {
      this._sidebarOpen = false;
      this._panelOpen = false;
      this._applyLayoutState();
    }

    _resetToNewChat() {
      this._stopPolling();
      this._sessionId = null;
      this._hasMessages = false;
      this._pending = false;
      this._pendingId = null;
      this._lastQuery = '';
      this._lastErrorBlock = null;
      const m = this.shadowRoot.getElementById('messages');
      if (m) m.innerHTML = '';
      this._renderWelcome();
      this._highlightActiveChat();
      const input = this.shadowRoot.getElementById('chatInput');
      if (input) input.focus();
      if (isMobileViewport()) this._closeAllPanels();
    }

    _toggleSidebar() {
      this._sidebarOpen = !this._sidebarOpen;
      if (isMobileViewport() && this._sidebarOpen) this._panelOpen = false;
      this._writeLS(LS_SIDEBAR, this._sidebarOpen);
      this._applyLayoutState();
    }

    _togglePanel() {
      this._panelOpen = !this._panelOpen;
      if (isMobileViewport() && this._panelOpen) this._sidebarOpen = false;
      this._writeLS(LS_PANEL, this._panelOpen);
      this._applyLayoutState();
    }

    _applyLayoutState() {
      const layout = this.shadowRoot.getElementById('layout');
      layout.classList.toggle('sidebar-open', this._sidebarOpen);
      layout.classList.toggle('panel-open', this._panelOpen);
    }

    _showSystemError(msg) {
      const banner = this.shadowRoot.getElementById('errorBanner');
      const text = this.shadowRoot.getElementById('errorBannerText');
      if (!banner || !text) return;
      text.textContent = msg;
      banner.style.display = 'flex';
    }

    _hideSystemError() {
      const banner = this.shadowRoot.getElementById('errorBanner');
      if (banner) banner.style.display = 'none';
    }

    _appendUser(text, scroll) {
      this._clearWelcome();
      this._hasMessages = true;
      const el = document.createElement('div');
      el.className = 'turn turn-user';
      el.innerHTML = `<div class="bubble">${this._escape(text)}</div>`;
      this.shadowRoot.getElementById('messages').appendChild(el);
      if (scroll) this._scrollBottom();
    }

    _appendAssistant(text, scroll) {
      this._clearWelcome();
      this._hasMessages = true;
      this._msgCounter++;
      const messageId = `ai_${this._msgCounter}_${Date.now()}`;
      const el = document.createElement('div');
      el.className = 'turn turn-ai';
      el.dataset.messageId = messageId;
      el.innerHTML = this._formatEditorial(text) + this._renderTtsButton(messageId);
      this.shadowRoot.getElementById('messages').appendChild(el);

      const ttsBtn = el.querySelector('.tts-btn');
      if (ttsBtn) ttsBtn.addEventListener('click', () => this._onTtsButtonClick(messageId, text, ttsBtn));
      if (scroll) this._scrollBottom();
      if (scroll && this._ttsAutoPlay && ttsBtn) {
        setTimeout(() => this._onTtsButtonClick(messageId, text, ttsBtn), 200);
      }
    }

    _renderTtsButton(messageId) {
      return `<div class="tts-row"><button class="tts-btn" data-mid="${messageId}" data-state="idle" title="Escuchar">
        <span class="tts-icon">🔊</span><span class="tts-label">Escuchar</span>
      </button></div>`;
    }

    _appendError(text) {
      const el = document.createElement('div');
      el.className = 'turn turn-error';
      el.innerHTML = `<div class="err-box"><span class="err-icon">!</span><span>${this._escape(text)}</span></div>`;
      this.shadowRoot.getElementById('messages').appendChild(el);
      this._scrollBottom();
      return el;
    }

    _appendErrorWithRetry(text) {
      const canRetry = !!this._lastQuery;
      const el = document.createElement('div');
      el.className = 'turn turn-error';
      el.innerHTML = `
        <div class="err-box err-box-retry">
          <div class="err-body">
            <span class="err-icon">!</span>
            <span class="err-text">${this._escape(text)}</span>
          </div>
          ${canRetry ? `<button class="err-retry-btn" type="button">↻ Reintentar</button>` : ''}
        </div>
      `;
      this.shadowRoot.getElementById('messages').appendChild(el);
      if (canRetry) {
        const btn = el.querySelector('.err-retry-btn');
        if (btn) btn.addEventListener('click', () => {
          const q = this._lastQuery;
          if (!q) return;
          try { el.remove(); } catch (_) {}
          if (this._lastErrorBlock === el) this._lastErrorBlock = null;
          this._sendQuery(q);
        });
      }
      this._scrollBottom();
      return el;
    }

    _showThinking() {
      const el = document.createElement('div');
      el.className = 'turn turn-thinking';
      el.id = 'thinkingRow';
      el.innerHTML = `<div class="thinking">
                        <div class="thinking-dots"><span></span><span></span><span></span></div>
                        <div class="thinking-label">${this._escape(this._brand.thinking)}</div>
                      </div>`;
      this.shadowRoot.getElementById('messages').appendChild(el);
      this._scrollBottom();
    }

    _hideThinking() {
      const el = this.shadowRoot.getElementById('thinkingRow');
      if (el) el.remove();
    }

    _scrollBottom() {
      const m = this.shadowRoot.getElementById('messages');
      m.scrollTop = m.scrollHeight;
    }

    /**
     * Formato editorial. Soporta negrita **texto** y listas simples, porque
     * un consultor da cifras y desgloses. Si el guardrail grNoMarkdown está
     * activo en CentriAlignment, el modelo no las emitirá y esto no estorba.
     */
    _formatEditorial(text) {
      const paragraphs = String(text || '').split(/\n{2,}/);
      const out = ['<div class="editorial">'];
      for (const raw of paragraphs) {
        const para = raw.trim();
        if (!para) continue;
        let safe = this._escape(para);
        safe = safe.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        safe = safe.replace(/\n/g, '<br>');
        out.push(`<p>${safe}</p>`);
      }
      out.push('</div>');
      return out.join('');
    }

    _renderWelcome() {
      const messages = this.shadowRoot.getElementById('messages');
      if (!messages) return;
      if (this._hasMessages) return;
      if (messages.querySelector('.welcome')) return;
      const el = document.createElement('div');
      el.className = 'welcome';
      el.innerHTML = `
        <div class="welcome-inner">
          <div class="welcome-ornament">— ✦ —</div>
          <div class="welcome-title">${this._escape(this._brand.welcomeTitle || this._brand.name)}</div>
          <div class="welcome-sub">${this._escape(this._brand.welcome)}</div>
        </div>
      `;
      messages.appendChild(el);
    }

    _clearWelcome() {
      const w = this.shadowRoot.querySelector('.welcome');
      if (w) w.remove();
    }

    _renderChats() {
      const list = this.shadowRoot.getElementById('chatsList');
      if (!list) return;
      if (this._chats.length === 0) {
        list.innerHTML = `<div class="empty">Sin consultas previas</div>`;
        return;
      }
      list.innerHTML = this._chats.map(c => {
        const active = (c.id === this._sessionId) ? ' active' : '';
        return `<div class="chat-item-row${active}" data-id="${this._escape(c.id)}">
                  <button class="chat-item" data-id="${this._escape(c.id)}">
                    <div class="chat-title">${this._escape(c.titulo || 'Consulta')}</div>
                    ${c.preview ? `<div class="chat-preview">${this._escape(c.preview)}</div>` : ''}
                  </button>
                  <button class="chat-delete" data-id="${this._escape(c.id)}" data-title="${this._escape(c.titulo || 'Consulta')}" title="Borrar">🗑</button>
                </div>`;
      }).join('');

      list.querySelectorAll('.chat-item').forEach(btn => {
        btn.addEventListener('click', () => {
          this._sessionId = btn.dataset.id;
          this._stopPolling();
          this._emit('centri-open-chat', { sessionId: btn.dataset.id });
          this._highlightActiveChat();
          if (isMobileViewport()) this._closeAllPanels();
        });
      });

      list.querySelectorAll('.chat-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this._showDeleteConfirm(btn.dataset.id, btn.dataset.title);
        });
      });
    }

    _showDeleteConfirm(sessionId, titulo) {
      const prev = this.shadowRoot.getElementById('deleteModal');
      if (prev) prev.remove();
      const modal = document.createElement('div');
      modal.className = 'modal-backdrop';
      modal.id = 'deleteModal';
      modal.innerHTML = `
        <div class="modal">
          <div class="modal-title">¿Borrar esta consulta?</div>
          <div class="modal-body">
            "${this._escape(titulo)}"
            <div class="modal-note">Esta acción no se puede deshacer.</div>
          </div>
          <div class="modal-actions">
            <button class="modal-btn modal-btn-cancel" id="modalCancel">Cancelar</button>
            <button class="modal-btn modal-btn-danger" id="modalDelete">Borrar</button>
          </div>
        </div>
      `;
      this.shadowRoot.appendChild(modal);
      const cancel = () => modal.remove();
      modal.addEventListener('click', (e) => { if (e.target === modal) cancel(); });
      modal.querySelector('#modalCancel').addEventListener('click', cancel);
      modal.querySelector('#modalDelete').addEventListener('click', () => {
        this._emit('centri-delete-chat', { sessionId });
        this._chats = this._chats.filter(c => c.id !== sessionId);
        if (this._sessionId === sessionId) this._resetToNewChat();
        else this._renderChats();
        modal.remove();
      });
    }

    _highlightActiveChat() {
      this.shadowRoot.querySelectorAll('.chat-item-row').forEach(el => {
        el.classList.toggle('active', el.dataset.id === this._sessionId);
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TTS — fontanería lista. Requiere backend TTS + config.ttsEnabled=true.
    // ═══════════════════════════════════════════════════════════════════════

    _onTtsButtonClick(messageId, text, btn) {
      if (!btn) btn = this.shadowRoot.querySelector(`.tts-btn[data-mid="${messageId}"]`);
      if (!btn) return;
      const state = btn.dataset.state || 'idle';

      if (state === 'playing' && this._playingMessageId === messageId) {
        this._stopTts();
        return;
      }
      if (this._playingMessageId) this._stopTts();

      this._setTtsBtnState(btn, 'loading');
      this._playingMessageId = messageId;

      const cleanText = this._sanitizeForTts(text);
      if (!cleanText) {
        this._setTtsBtnState(btn, 'idle');
        this._playingMessageId = null;
        return;
      }

      // Llamada directa al backend por HTTP. NO se emite ningún evento al Page
      // Code: setAttribute trunca payloads grandes y el audio base64 lo es.
      // Patrón literal de CATHOVIA v1.6.5.
      this._fetchTts(messageId, cleanText, btn);
    }

    async _fetchTts(messageId, texto, btn) {
      try {
        const res = await fetch(this._functionsUrl('/_functions/centriTts'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texto: texto })
        });
        if (!res.ok) {
          console.warn(`${TAG} centriTts HTTP ${res.status}`);
          this._applyTtsError({ messageId, error: `HTTP ${res.status}` });
          return;
        }
        const data = await res.json();
        if (!data.ok || !data.audioContent) {
          console.warn(`${TAG} centriTts respuesta sin audio:`, data.error);
          this._applyTtsError({ messageId, error: data.error || 'sin audio' });
          return;
        }
        console.log(`${TAG} centriTts OK ${data.timeMs}ms voice=${data.voice} audioLen=${data.audioContent.length}`);
        this._applyTtsAudio({
          messageId,
          audioContent: data.audioContent,
          mimeType: data.mimeType || 'audio/mpeg'
        });
      } catch (err) {
        console.error(`${TAG} centriTts EXCEPTION:`, err.message || err);
        this._applyTtsError({ messageId, error: err.message || 'error de red' });
      }
    }

    // Métodos públicos llamables desde el Page Code (bypass del setAttribute).
    receiveTtsAudio(payload) {
      this._applyTtsAudio(payload || {});
    }

    receiveTtsError(payload) {
      this._applyTtsError(payload || {});
    }

    _applyTtsAudio(payload) {
      const { messageId, audioContent, mimeType } = payload || {};
      if (!messageId || !audioContent) return;
      if (messageId !== this._playingMessageId) return; // llegó tarde, ignorar
      this._playAudioBase64(audioContent, mimeType || 'audio/mpeg', messageId);
    }

    _applyTtsError(payload) {
      const { messageId, error } = payload || {};
      console.warn(`${TAG} TTS error mid=${messageId}: ${error}`);
      if (messageId === this._playingMessageId) {
        const btn = this.shadowRoot.querySelector(`.tts-btn[data-mid="${messageId}"]`);
        if (btn) this._setTtsBtnState(btn, 'idle');
        this._playingMessageId = null;
      }
    }

    _playAudioBase64(base64, mimeType, messageId) {
      if (!this._audioEl) this._audioEl = new Audio();
      const audio = this._audioEl;
      audio.pause();
      audio.currentTime = 0;

      audio.src = `data:${mimeType};base64,${base64}`;

      const btn = this.shadowRoot.querySelector(`.tts-btn[data-mid="${messageId}"]`);
      if (btn) this._setTtsBtnState(btn, 'playing');

      audio.onended = () => {
        const b = this.shadowRoot.querySelector(`.tts-btn[data-mid="${messageId}"]`);
        if (b) this._setTtsBtnState(b, 'idle');
        this._playingMessageId = null;
      };
      audio.onerror = () => {
        console.warn(`${TAG} audio playback error`);
        const b = this.shadowRoot.querySelector(`.tts-btn[data-mid="${messageId}"]`);
        if (b) this._setTtsBtnState(b, 'idle');
        this._playingMessageId = null;
      };

      audio.play().catch(err => {
        console.warn(`${TAG} audio.play() rechazado:`, err.message);
        const b = this.shadowRoot.querySelector(`.tts-btn[data-mid="${messageId}"]`);
        if (b) this._setTtsBtnState(b, 'idle');
        this._playingMessageId = null;
      });
    }

    _stopTts() {
      if (this._audioEl) {
        try { this._audioEl.pause(); this._audioEl.currentTime = 0; } catch (_) {}
      }
      if (this._playingMessageId) {
        const btn = this.shadowRoot.querySelector(`.tts-btn[data-mid="${this._playingMessageId}"]`);
        if (btn) this._setTtsBtnState(btn, 'idle');
      }
      this._playingMessageId = null;
    }

    _setTtsBtnState(btn, state) {
      if (!btn) return;
      btn.dataset.state = state;
      const icon = btn.querySelector('.tts-icon');
      const label = btn.querySelector('.tts-label');
      if (state === 'idle')    { if (icon) icon.textContent = '🔊'; if (label) label.textContent = 'Escuchar'; }
      if (state === 'loading') { if (icon) icon.textContent = '⏳'; if (label) label.textContent = 'Preparando'; }
      if (state === 'playing') { if (icon) icon.textContent = '⏸'; if (label) label.textContent = 'Parar'; }
    }

    _sanitizeForTts(text) {
      let t = String(text || '');
      t = t.replace(/\*\*(.+?)\*\*/g, '$1');
      t = t.replace(/^#{1,6}\s+/gm, '');
      t = t.replace(/\*(.+?)\*/g, '$1');
      t = t.replace(/\n{3,}/g, '\n\n').trim();
      return t;
    }

    _toggleTtsAutoPlay() {
      this._ttsAutoPlay = !this._ttsAutoPlay;
      this._writeLS(LS_TTS_AUTO, this._ttsAutoPlay);
      const btn = this.shadowRoot.getElementById('btnToggleTts');
      if (btn) {
        btn.textContent = this._ttsAutoPlay ? '🔊' : '🔇';
        btn.title = this._ttsAutoPlay ? 'Voz automática activada' : 'Voz automática desactivada';
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // MICRÓFONO (Web Speech API — portado de EGAEL +50)
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
      this._silenceTimer = setTimeout(() => this._stopMic(), SILENCE_MS);
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
      const input = this.shadowRoot.getElementById('chatInput');
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
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          this._appendError('Permiso de micrófono denegado. Actívalo en los ajustes del navegador.');
        }
      };
      this._recognition.onend = () => {
        this._clearSafetyTimer();
        this._isListening = false; this._setMicState('idle');
        const text = this._androidFinalBuffer.trim();
        this._androidFinalBuffer = '';
        if (!text) { input.placeholder = this._brand.placeholder; return; }
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
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          this._appendError('Permiso de micrófono denegado. Actívalo en los ajustes del navegador.');
        }
      };
      this._recognition.onend = () => {
        this._clearSafetyTimer();
        this._isListening = false; this._setMicState('idle');
        const text = (input.value || '').trim();
        if (!text) { input.placeholder = this._brand.placeholder; return; }
        input.value = '';
        this._sendQuery(text);
      };
      try { this._recognition.start(); }
      catch (e) { this._setMicState('idle'); input.placeholder = this._brand.placeholder; }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // UTILIDADES
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Resuelve la URL de un endpoint.
     *
     * ⚠️ NO viene de AKIRA ni de CATHOVIA. Verificado sobre el código de las
     * dos: cero apariciones de functionsBase; ambas llaman a '/_functions/...'
     * en absoluto. La Guía Técnica de CATHOVIA §17.7 lo da por resuelto desde
     * el 25-jul y afirma que "ese trabajo ya está pagado". No lo está.
     *
     * Dos cosas rompe no tenerlo:
     *   · 404 si el sitio se sirve bajo subcarpeta — el fetch absoluto se come
     *     el prefijo antes de llegar al backend.
     *   · La consola queda atada a este runtime. Con esto, apuntarla a otro
     *     servidor es un valor de configuración.
     *
     * DEGRADA SIN ROMPER: sin functionsBase devuelve la ruta absoluta, es
     * decir, exactamente el comportamiento actual de AKIRA.
     */
    _functionsUrl(path) {
      const base = String(this._functionsBase || '').replace(/\/+$/, '');
      return base + path;
    }

    _emit(name, detail) {
      this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
    }

    _escape(s) {
      return String(s == null ? '' : s)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    }

    _readLS(key, fallback) {
      try { const v = localStorage.getItem(key); if (v === null) return fallback; return v === '1'; }
      catch (_) { return fallback; }
    }

    _writeLS(key, val) { try { localStorage.setItem(key, val ? '1' : '0'); } catch (_) {} }

    _render() {
      const c = this._colors;
      const b = this._brand;
      const sidebarClass = this._sidebarOpen ? ' sidebar-open' : '';
      const panelClass   = this._panelOpen   ? ' panel-open'   : '';

      this.shadowRoot.innerHTML = `
<style>
  /* Fuentes: cargadas por <link> en el head (ensureFonts).
     NUNCA @import aquí — regla Manual Técnico §13. */

  :host {
    display: block;
    width: 100%;
    /* Anclado a la VENTANA, no al contenedor de Wix.
       Wix declara la altura en el editor pero el runtime la infla midiendo
       el contenido inicial del custom element; con height:100% la consola
       hereda esa altura inventada y el input queda fuera de pantalla.
       dvh respeta las barras del navegador móvil. (CATHOVIA v1.6.4)
       PRECONDICIÓN: la página contiene SOLO el custom element. Si se añade
       cabecera/footer de Wix, restar su alto: calc(100dvh - Npx). */
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
  }
  * { box-sizing: border-box; }
  ::selection { background: var(--accent); color: var(--accent-ink); }

  .app {
    display: flex; flex-direction: column;
    height: 100%; max-height: 100%; min-height: 0;
    background: var(--bg); overflow: hidden;
  }

  .layout {
    flex: 1; min-height: 0;
    display: grid;
    grid-template-columns: 0 1fr 0;
    grid-template-rows: auto 1fr;
    grid-template-areas: "topbar topbar topbar" "sidebar main panel";
    background: var(--bg);
    transition: grid-template-columns .22s ease;
    position: relative;
  }
  .layout.sidebar-open { grid-template-columns: 280px 1fr 0; }
  .layout.panel-open   { grid-template-columns: 0 1fr 320px; }
  .layout.sidebar-open.panel-open { grid-template-columns: 280px 1fr 320px; }

  /* TOPBAR */
  .topbar {
    grid-area: topbar;
    display: flex; align-items: center; gap: 12px;
    padding: 10px 18px;
    background: var(--surface);
    border-bottom: 1px solid var(--hairline);
    min-height: 56px;
  }
  .tb-btn {
    display: inline-flex; align-items: center; justify-content: center;
    width: 36px; height: 36px;
    border-radius: 8px;
    border: 1px solid var(--hairline);
    background: var(--surface);
    color: var(--ink);
    cursor: pointer; font-size: 16px; flex-shrink: 0;
    transition: background .15s, border-color .15s;
  }
  .tb-btn:hover { background: var(--bg); border-color: var(--ink-soft); }
  .tb-brand {
    flex: 1; display: flex; flex-direction: column; align-items: center;
    line-height: 1.1; min-width: 0; text-align: center;
  }
  /* Logo: CSS deliberadamente mínimo. Cualquier background/border/filter
     aquí reintroduce el marco blanco. Usar URL cruda ~mv2.png del Media
     Manager, NUNCA la URL con /v1/fill/ (aplana el alfa). */
  .tb-logo {
    height: 30px; width: auto; display: block;
    background: none; border: 0; box-shadow: none; filter: none;
    max-width: 100%; object-fit: contain;
  }
  .tb-title {
    font-size: 20px; font-weight: 600; letter-spacing: .3px; color: var(--ink);
    max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .tb-sub {
    font-size: 10.5px; text-transform: uppercase; letter-spacing: 2px;
    color: var(--muted); margin-top: 2px;
    max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }

  /* CHIPS DE PLANO. Mismo lenguaje visual que .tb-btn: borde hairline,
     radio 8px, superficie de la topbar. El activo usa el acento de marca.

     ⚠️ CENTRI tiene CUATRO chips y uno de etiqueta larga ("Trabajar con
     Centrimerca"). Con dos cortos, como en AKIRA, un flex sin más bastaba;
     con estos no. Se permite scroll horizontal antes que dejar que los chips
     empujen el logo o se salgan de la barra: min-width:0 para que el flex
     pueda encogerlos, y scrollbar oculta para que no ensucie la topbar. */
  .tb-planos {
    display: flex; gap: 6px;
    min-width: 0;
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .tb-planos::-webkit-scrollbar { display: none; }
  .tb-chip {
    border: 1px solid var(--hairline);
    background: var(--surface);
    color: var(--muted);
    border-radius: 8px;
    padding: 7px 13px;
    font-family: inherit;
    font-size: 11.5px; font-weight: 600;
    text-transform: uppercase; letter-spacing: 1.2px;
    cursor: pointer; white-space: nowrap; flex-shrink: 0;
    transition: background .15s, border-color .15s, color .15s;
  }
  .tb-chip:hover { color: var(--ink); border-color: var(--ink-soft); }
  .tb-chip.active {
    background: var(--accent); color: var(--accent-ink);
    border-color: var(--accent);
  }

  /* ERROR BANNER */
  .error-banner {
    display: none; align-items: center; gap: 10px;
    padding: 10px 16px; background: #7a1a1a; color: #ffe8e8;
    font-size: 13px; border-bottom: 1px solid #5a1010;
  }
  .error-banner .eb-icon {
    font-weight: bold; background: rgba(255,255,255,.15);
    width: 20px; height: 20px; border-radius: 50%;
    display: inline-flex; align-items: center; justify-content: center; font-size: 12px;
  }
  .error-banner .eb-text { flex: 1; }
  .error-banner .eb-close {
    background: transparent; border: 1px solid rgba(255,255,255,.3);
    color: #ffe8e8; width: 24px; height: 24px; border-radius: 4px; cursor: pointer;
  }

  /* SIDEBAR */
  .sidebar {
    grid-area: sidebar; background: var(--bg);
    border-right: 1px solid var(--hairline);
    overflow: hidden; display: flex; flex-direction: column;
    min-width: 0; min-height: 0;
  }
  .sb-head {
    padding: 16px 16px 12px; border-bottom: 1px solid var(--hairline);
    display: flex; justify-content: space-between; align-items: center;
  }
  .sb-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: var(--muted); }
  .sb-head-actions { display: flex; align-items: center; gap: 8px; }
  .sb-new {
    background: var(--accent); color: var(--accent-ink); border: none;
    padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600;
    cursor: pointer; font-family: var(--font-body);
  }
  .sb-new:hover { filter: brightness(1.12); }

  .mobile-close {
    display: none; background: transparent; border: 1px solid var(--hairline);
    color: var(--muted); width: 32px; height: 32px; border-radius: 8px;
    cursor: pointer; font-size: 14px;
    align-items: center; justify-content: center; line-height: 1; padding: 0; flex-shrink: 0;
  }
  .mobile-close:hover { background: var(--surface); color: var(--ink); border-color: var(--ink-soft); }
  .panel-close-row { display: none; justify-content: flex-end; padding: 12px 14px 0 14px; }

  .chats-list { flex: 1; overflow-y: auto; padding: 8px; }
  .chat-item-row {
    display: flex; align-items: stretch; gap: 2px;
    border-radius: 8px; margin-bottom: 2px; transition: background .12s;
  }
  .chat-item-row:hover { background: var(--surface); }
  .chat-item-row.active { background: var(--surface); border-left: 2px solid var(--accent); }
  .chat-item {
    flex: 1; min-width: 0; text-align: left; background: transparent; border: none;
    padding: 10px 8px 10px 12px; cursor: pointer;
    font-family: var(--font-body); color: var(--ink); border-radius: 8px 0 0 8px;
  }
  .chat-item-row.active .chat-item { padding-left: 10px; }
  .chat-delete {
    background: transparent; border: none; color: var(--muted); cursor: pointer;
    padding: 0 10px; font-size: 14px; opacity: 0;
    transition: opacity .12s, color .12s; border-radius: 0 8px 8px 0;
    display: flex; align-items: center; justify-content: center; line-height: 1;
  }
  .chat-item-row:hover .chat-delete { opacity: 0.7; }
  .chat-delete:hover { opacity: 1 !important; color: #a03030; background: rgba(160,48,48,.08); }
  .chat-title { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .chat-preview { font-size: 11px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }

  /* MODAL */
  .modal-backdrop {
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(20, 24, 32, .5);
    display: flex; align-items: center; justify-content: center;
    z-index: 100; animation: fadeIn .18s ease;
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .modal {
    background: var(--surface); border-radius: 14px; padding: 24px 22px 18px;
    max-width: 380px; width: calc(100% - 40px);
    box-shadow: 0 10px 40px rgba(0,0,0,.25);
    font-family: var(--font-body); animation: modalRise .22s ease;
  }
  @keyframes modalRise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  .modal-title { font-size: 19px; color: var(--ink); margin-bottom: 8px; font-weight: 600; }
  .modal-body { font-size: 14px; color: var(--ink-soft); line-height: 1.5; margin-bottom: 20px; }
  .modal-note { font-size: 12px; color: var(--muted); margin-top: 8px; font-style: italic; }
  .modal-actions { display: flex; gap: 8px; justify-content: flex-end; }
  .modal-btn {
    padding: 9px 18px; border-radius: 8px; font-size: 13px; font-weight: 600;
    cursor: pointer; font-family: var(--font-body);
    border: 1px solid var(--hairline); background: transparent; color: var(--ink);
    transition: background .15s;
  }
  .modal-btn-cancel:hover { background: var(--bg); }
  .modal-btn-danger { background: #a03030; color: #fff; border-color: #a03030; }
  .modal-btn-danger:hover { background: #8a2525; }

  .empty { padding: 24px 12px; text-align: center; color: var(--muted); font-size: 13px; font-style: italic; }
  .empty.small { padding: 12px 8px; font-size: 12px; }

  /* MAIN */
  .main {
    grid-area: main; display: flex; flex-direction: column;
    min-width: 0; min-height: 0; overflow: hidden;
    background: var(--surface);
    box-shadow: inset 0 4px 12px -8px rgba(0,0,0,.06);
  }
  .messages {
    flex: 1; min-height: 0; overflow-y: auto;
    padding: 32px 28px; display: flex; flex-direction: column;
    gap: 26px; justify-content: flex-start;
  }

  .turn { display: flex; flex-direction: column; }
  .turn-user { align-items: flex-end; }
  .turn-user .bubble {
    background: var(--accent); color: var(--accent-ink);
    padding: 12px 16px; border-radius: 16px 16px 4px 16px;
    max-width: 74%; font-size: 15px; line-height: 1.5;
  }
  .turn-ai .editorial { font-size: 16px; line-height: 1.7; color: var(--ink); max-width: 78ch; }
  .turn-ai .editorial p { margin: 0 0 14px 0; }
  .turn-ai .editorial p:last-child { margin-bottom: 0; }
  .turn-ai .editorial strong { font-weight: 600; color: var(--ink); }

  .tts-row { margin-top: 10px; }
  .tts-btn {
    display: inline-flex; align-items: center; gap: 6px;
    background: transparent; border: 1px solid var(--hairline);
    color: var(--muted); border-radius: 8px; padding: 5px 11px;
    font-size: 12px; cursor: pointer; font-family: var(--font-body);
    transition: background .15s, color .15s;
  }
  .tts-btn:hover { background: var(--bg); color: var(--ink); }

  .turn-error .err-box {
    background: rgba(160,48,48,.07); border: 1px solid rgba(160,48,48,.28);
    color: #8a2525; border-radius: 12px; padding: 12px 14px;
    font-size: 14px; display: flex; align-items: center; gap: 10px; max-width: 78%;
  }
  .turn-error .err-box-retry { flex-direction: column; align-items: flex-start; gap: 10px; }
  .turn-error .err-body { display: flex; align-items: center; gap: 10px; }
  .turn-error .err-icon {
    font-weight: bold; background: rgba(160,48,48,.15);
    width: 20px; height: 20px; border-radius: 50%;
    display: inline-flex; align-items: center; justify-content: center;
    font-size: 12px; flex-shrink: 0;
  }
  .turn-error .err-retry-btn {
    background: transparent; border: 1px solid rgba(160,48,48,.4);
    color: #8a2525; border-radius: 8px; padding: 7px 13px;
    font-size: 12.5px; font-weight: 600; cursor: pointer; font-family: var(--font-body);
  }
  .turn-error .err-retry-btn:hover { background: rgba(160,48,48,.1); }

  .thinking { display: flex; align-items: center; gap: 12px; }
  .thinking-dots { display: flex; gap: 4px; }
  .thinking-dots span {
    width: 7px; height: 7px; border-radius: 50%;
    background: var(--accent); opacity: .3;
    animation: pulse 1.3s infinite ease-in-out;
  }
  .thinking-dots span:nth-child(2) { animation-delay: .18s; }
  .thinking-dots span:nth-child(3) { animation-delay: .36s; }
  @keyframes pulse { 0%,100% { opacity: .25; transform: scale(.85); } 50% { opacity: 1; transform: scale(1); } }
  .thinking-label { font-size: 13.5px; color: var(--muted); font-style: italic; }

  /* WELCOME */
  .welcome { padding: 48px 20px; text-align: center; }
  .welcome-ornament { font-size: 16px; letter-spacing: 6px; color: var(--accent); opacity: .5; margin-bottom: 18px; }
  .welcome-title { font-size: 34px; font-weight: 600; color: var(--ink); margin-bottom: 16px; letter-spacing: -.02em; }
  .welcome-sub { font-size: 16.5px; line-height: 1.6; color: var(--ink-soft); max-width: 56ch; margin: 0 auto; }

  /* INPUT */
  .input-area { padding: 14px 22px 20px; }
  .input-box {
    display: flex; align-items: flex-end; gap: 8px;
    background: var(--bg); border: 1px solid var(--hairline);
    border-radius: 16px; padding: 8px 8px 8px 16px;
    transition: border-color .15s;
  }
  .input-box:focus-within { border-color: var(--accent); }

  /* Vacío en DEFAULT_BRAND: por defecto no se pinta nada. Se activa pasando
     brand.disclaimer desde el page code. Patrón CATHOVIA v1.6.7. */
  .disclaimer {
    text-align: center; font-size: 11.5px; color: var(--muted);
    margin-top: 8px; line-height: 1.4;
  }
  .input-ta {
    flex: 1; border: none; background: transparent; resize: none;
    font-family: var(--font-body); font-size: 15px; line-height: 1.5;
    color: var(--ink); padding: 8px 4px; max-height: 180px; outline: none;
  }
  .input-ta::placeholder { color: var(--muted); }
  .send-btn, .mic-btn {
    width: 38px; height: 38px; border-radius: 10px; border: none;
    cursor: pointer; flex-shrink: 0;
    display: inline-flex; align-items: center; justify-content: center;
    transition: filter .15s, background .15s;
  }
  .send-btn { background: var(--accent); color: var(--accent-ink); font-size: 17px; }
  .send-btn:hover { filter: brightness(1.12); }
  .mic-btn { background: transparent; border: 1px solid var(--hairline); color: var(--muted); font-size: 16px; }
  .mic-btn:hover { background: var(--surface); color: var(--ink); }
  .mic-btn.listening { background: var(--accent-soft); color: var(--accent); border-color: var(--accent); }
  .mic-btn.preparing { opacity: .6; }

  /* PANEL LATERAL — montado y VACÍO (preparado para futuros usos) */
  .panel {
    grid-area: panel; background: var(--bg);
    border-left: 1px solid var(--hairline);
    overflow-y: auto; min-width: 0; min-height: 0;
  }
  .panel-section { padding: 16px; border-bottom: 1px solid var(--hairline); }
  .panel-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
  .panel-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: var(--muted); }

  .backdrop {
    display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(20,24,32,.4); opacity: 0; pointer-events: none;
    transition: opacity .25s ease; z-index: 5;
  }

  /* ── MÓVIL ── */
  @media (max-width: 900px) {
    .layout { grid-template-columns: 0 1fr 0 !important; }
    .backdrop { display: block; }
    .topbar { padding: 8px 12px; gap: 8px; min-height: 52px; position: sticky; top: 0; z-index: 12; }
    .tb-btn { width: 34px; height: 34px; font-size: 15px; }
    .tb-planos { gap: 4px; }
    .tb-chip { padding: 6px 9px; font-size: 10px; letter-spacing: .8px; }
    .tb-logo { height: 26px; }
    .tb-title { font-size: 18px; }
    .tb-sub { font-size: 9.5px; letter-spacing: 1.5px; }

    .sidebar, .panel {
      position: fixed; top: 52px; bottom: 0; z-index: 10;
      width: 88%; max-width: 320px;
      transform: translateX(-100%); transition: transform .25s ease;
      box-shadow: 0 0 40px rgba(0,0,0,.18);
    }
    .sidebar { left: 0; border-right: 1px solid var(--hairline); }
    .panel { right: 0; transform: translateX(100%); border-left: 1px solid var(--hairline); border-right: none; }
    .layout.sidebar-open .sidebar { transform: translateX(0); }
    .layout.panel-open .panel { transform: translateX(0); }
    .layout.sidebar-open .backdrop, .layout.panel-open .backdrop { opacity: 1; pointer-events: auto; }

    .mobile-close { display: inline-flex; }
    .panel-close-row { display: flex; }
    .chat-delete { opacity: 0.6; padding: 0 14px; font-size: 15px; }
    .chat-item-row .chat-delete { opacity: 0.6; }

    .modal { padding: 22px 20px 16px; max-width: 340px; }
    .modal-title { font-size: 18px; }

    .main { grid-area: main; box-shadow: none; }
    .messages { padding: 24px 18px; gap: 22px; }
    .input-area { padding: 12px 14px 16px; }
    .input-box { padding: 8px 8px 8px 14px; border-radius: 14px; }
    .input-ta { font-size: 16px; }
    .turn-user .bubble { max-width: 85%; font-size: 15px; }
    .turn-ai .editorial { font-size: 16px; line-height: 1.65; }
    .welcome { padding: 40px 16px; }
    .welcome-title { font-size: 28px; }
    .welcome-sub { font-size: 16px; }
  }

  @media (max-width: 420px) {
    .topbar { padding: 8px 10px; gap: 6px; }
    .tb-logo { height: 22px; }
    .tb-title { font-size: 16px; }
    .messages { padding: 20px 14px; gap: 18px; }
    .welcome-title { font-size: 25px; }
    .welcome-sub { font-size: 15px; }
    .turn-ai .editorial { font-size: 15.5px; }
    .sidebar, .panel { width: 92%; }
  }
</style>

<div class="app">

  <div class="error-banner" id="errorBanner">
    <span class="eb-icon">!</span>
    <span class="eb-text" id="errorBannerText"></span>
    <button class="eb-close" id="closeErrorBanner">✕</button>
  </div>

  <div class="layout${sidebarClass}${panelClass}" id="layout">

    <div class="topbar">
      <button class="tb-btn" id="btnToggleSidebar" title="Historial">☰</button>
      <div class="tb-brand">
        ${b.logo
          ? `<img class="tb-logo" src="${this._escape(b.logo)}" alt="${this._escape(b.name)}" />`
          : `<div class="tb-title">${this._escape(b.name)}</div>`}
        ${b.sub ? `<div class="tb-sub">${this._escape(b.sub)}</div>` : ''}
      </div>
      <div class="tb-planos" id="tbPlanos">
        ${PLANOS.map(p => `<button class="tb-chip${p.id === this._modo ? ' active' : ''}" data-plano="${p.id}" title="${this._escape(p.title)}">${this._escape(p.label)}</button>`).join('')}
      </div>
      ${this._ttsEnabled ? `<button class="tb-btn" id="btnToggleTts" title="Voz automática">${this._ttsAutoPlay ? '🔊' : '🔇'}</button>` : ''}
    </div>

    <aside class="sidebar">
      <div class="sb-head">
        <div class="sb-label">Historial</div>
        <div class="sb-head-actions">
          <button class="sb-new" id="btnNewChat">+ Nueva</button>
          <button class="mobile-close" id="btnCloseSidebar" title="Cerrar">✕</button>
        </div>
      </div>
      <div class="chats-list" id="chatsList">
        <div class="empty">Sin consultas previas</div>
      </div>
    </aside>

    <main class="main">
      <div class="messages" id="messages"></div>
      <div class="input-area">
        <div class="input-box">
          <textarea class="input-ta" id="chatInput" rows="1" placeholder="${this._escape(b.placeholder)}"></textarea>
          <button class="mic-btn idle" id="micBtn" title="Hablar">🎤</button>
          <button class="send-btn" id="sendBtn" title="Enviar">↑</button>
        </div>
        ${b.disclaimer ? `<div class="disclaimer">${this._escape(b.disclaimer)}</div>` : ''}
      </div>
    </main>

    <aside class="panel">
      <div class="panel-close-row">
        <button class="mobile-close" id="btnClosePanel" title="Cerrar">✕</button>
      </div>
      <div class="panel-section">
        <div class="panel-head"><div class="panel-title">Panel</div></div>
        <div class="empty small">Sin contenido</div>
      </div>
    </aside>

    <div class="backdrop" id="backdrop"></div>

  </div>

</div>
      `;
    }
  }

  customElements.define('centri-console', CentriConsole);
  console.log(`${TAG} Registrado.`);

})();