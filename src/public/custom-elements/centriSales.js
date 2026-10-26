/* ═══════════════════════════════════════════════════════════════════════════
 * CENTRIMERCA — CENTRI SALES · App de los comerciales (Wix Custom Element)
 * Archivo:  public/custom-elements/centriSales.js
 * Tag name: centri-sales
 * VERSION:  1.0.11 (BETA)
 * FECHA:    26 Octubre 2026
 *
 * v1.0.11 — 26 OCT 2026 · VISITAS DE OTRO DÍA (Jal): icono de calendario al
 *   lado de «Visitas de hoy». Abre el selector de fecha del móvil (hasta hoy)
 *   y la lista pasa a ese día («Visitas del día»). Debajo del nombre sale el
 *   día elegido, no el de hoy. Las de otro día se abren igual (completar o
 *   reabrir). Para volver: elegir hoy. «Nueva visita» y «He llegado» vuelven
 *   solos a hoy. Borrador y pendientes de envío solo salen en hoy.
 *   Requiere centriSalesVisitas v1.1.3 (visitasHoy con { dia }).
 *
 * v1.0.10 — 26 OCT 2026 · Único cambio: «Cambiar» del resultado sube a la
 *   línea de «Resultado» y es más pequeño. Con «Presentación» el botón
 *   tapaba la palabra (Jal, iPhone).
 *
 * v1.0.9 — 26 OCT 2026 · AVISOS DE LA EMPRESA (Jal): «i» en un círculo arriba
 *   a la derecha del inicio. Punto fucsia si hay avisos sin ver; al tocarla,
 *   pantalla «Avisos» con la lista (fecha y mensaje) y se marcan como vistos.
 *   Lo visto se recuerda en el móvil (localStorage); la app no escribe nada.
 *   Método nuevo `avisos` (backend/centriSalesAvisos.web.js v1.0.0 +
 *   CentriSales.page.js v1.0.3). Se pide al abrir la app y al volver al
 *   inicio (como mucho cada 2 min) y al abrir «Avisos».
 *
 * v1.0.8 — 25 OCT 2026 · (Parte de 1.0.6; la 1.0.7 «motivo» se descarta.)
 *   Resultados de centriSalesLab 1.5.1: fuera «Oferta», entra «Ventas»;
 *   nuevos Negociación, Administrativa, Presentación y Cortesía (solo en la
 *   lista de «Cambiar»; sin botones nuevos). Al reabrir una visita antigua
 *   con «oferta», se muestra «Ventas».
 *
 * v1.0.6 — 25 OCT 2026 · «Añadir a mi calendario»: con la fecha de la
 *   próxima acción fijada, un botón la lleva al calendario del móvil.
 *   Android: abre Google Calendar con el evento relleno (enlace
 *   calendar.google.com/calendar/render?action=TEMPLATE). iPhone y resto:
 *   descarga un archivo .ics, que abre el Calendario. Evento de día
 *   completo: «Cliente · próxima acción», con el resumen como nota.
 *   El recuadro FECHA sigue siendo para fijar o cambiar la fecha.
 *
 * v1.0.5 — 25 OCT 2026 · Prueba en móvil de Jal:
 *   1. TICKET DE GASTO (pantallas del prototipo): «Añadir ticket» junto a
 *      «Corregir» abre la cámara del móvil (en escritorio, elegir archivo).
 *      La foto se reduce en el móvil (TICKET_MAX_PX, JPEG) y va por fetch a
 *      /_functions/centriSalesTicket (centriSalesLab v1.4.0 + http-functions
 *      v1.0.5). Se lee → «Ticket de gasto» (categoría, total, fecha,
 *      comercio; Repetir foto / Guardar ticket). No se lee → «No se lee
 *      bien el ticket». Al guardar, el ticket va dentro del informe
 *      (informe.ticket) y se ve en el informe y al reabrir la visita.
 *      Cámara: input de archivo con capture (cámara nativa del móvil), no un
 *      visor propio como el del prototipo.
 *   2. FECHA DE LA PRÓXIMA ACCIÓN: tocar el calendario abre el selector de
 *      fecha del móvil y se puede fijar o cambiar.
 *   3. Al marcar Sí/No, cambiar el resultado o la fecha, el informe ya no
 *      salta arriba: se conserva el desplazamiento.
 *
 * v1.0.4 — 25 OCT 2026 · Prueba real de Jal:
 *   1. ENVIAR INFORME: al pulsar en la parte de arriba del botón se abría
 *      «Corregir». La barra de enviar queda por encima de todo
 *      (position + z-index) y hay aire debajo de «Corregir».
 *   2. REABRIR UNA VISITA ENVIADA: en «Visitas de hoy», tocar una visita
 *      enviada abre su informe (método leerVisita, centriSalesVisitas
 *      v1.1.0). Se puede cambiar el resultado, responder «Para confirmar»
 *      o grabar una corrección y volver a enviar: se actualiza la misma
 *      visita. Salir sin cambiar nada no deja borrador.
 *   3. Ubicación sin precisión conocida: «ubicación guardada» (sin «±? m»).
 *
 * v1.0.3 — 25 OCT 2026 · Tarjetas de cliente con los DOS nombres: el
 *   comercial de título y el fiscal debajo (cuando es distinto), luego la
 *   dirección. «Hermanos Martín» encontraba bien a CANDIDO AVILA. (fiscal
 *   HERMANOS MARTIN C.B.), pero la tarjeta no enseñaba por qué.
 *   (`persona` = nombre fiscal desde centriSalesClientes v1.3.0.)
 *   En las búsquedas escritas los tres datos van uno debajo de otro.
 *
 * v1.0.2 — 25 OCT 2026 · Decir el nombre del cliente: en escritorio había
 *   que hablar dos veces. La pantalla decía «Te escucho…» nada más tocar el
 *   micro, pero el navegador aún no estaba recogiendo audio y lo primero que
 *   se decía se perdía. El código literal del micrófono ya avisa del estado
 *   («Preparando micrófono…» al arrancar, «Te escucho…» cuando de verdad
 *   entra audio) por el placeholder del input; el adaptador lo ignoraba.
 *   Ahora lo pinta: hasta que entra audio sale «Preparando micrófono…» con
 *   el punto en gris, y «Te escucho…» con el punto en fucsia después.
 *
 * v1.0.1 — 25 OCT 2026 · Cliente nuevo: fuera el campo «Persona de contacto».
 *   En los contactos, Nombre = nombre comercial y Compañía = nombre fiscal;
 *   la persona ya no tiene sitio (centriSalesClientes v1.3.0 no la guarda).
 *
 * ───────────────────────────────────────────────────────────────────────────
 * QUÉ ES
 * ───────────────────────────────────────────────────────────────────────────
 * La app del comercial, con el diseño de la UI v1 validada en Claude Design
 * («App Comerciales Prototipo»): Inicio (foto y nombre, Nueva visita, He
 * llegado, Visitas de hoy) → elegir cliente (por voz, escribiendo o cliente
 * nuevo) → contar la visita → preparando → informe para confirmar → ENVIAR
 * INFORME → enviado. Estados: error al preparar (Reintentar) y sin conexión
 * («Guardado en el móvil», se envía solo al volver la conexión).
 * Salir del informe o del error sin enviar deja un borrador que se retoma
 * desde Inicio.
 *
 * FUERA DE ESTA BETA (están en el prototipo): ticket de gasto, «Cerca de ti»
 * y responder «Para confirmar» por voz (aquí: Sí / No).
 *
 * ───────────────────────────────────────────────────────────────────────────
 * CÓMO HABLA CON EL SERVIDOR
 * ───────────────────────────────────────────────────────────────────────────
 *   · Con el PAGE CODE (sesión de miembro + rol + ficha en `equipo`):
 *       atributo `config`    ← { comercial:{ nombre, rol, foto } } o { error }
 *       evento   `sales-rpc` → { reqId, metodo, args }
 *       atributo `respuesta` ← { _ts, reqId, data }
 *     Métodos: buscarCliente, crearCliente, guardarLlegada, guardarVisita,
 *     visitasHoy (backend/centriSalesClientes.web.js v1.2.0 y
 *     backend/centriSalesVisitas.web.js v1.0.0). Las respuestas son pequeñas:
 *     ninguna se acerca al límite de ~64 KB de los atributos.
 *   · Por FETCH directo (el audio no cabe en un atributo):
 *       /_functions/centriSalesLabTranscribir y /_functions/centriSalesLabInforme
 *     (backend/centriSalesLab.web.js v1.2.0 + http-functions.js v1.0.4, ya en
 *     producción). ⚠️ Son públicos y sin sesión (acotados en tamaño); van
 *     detrás del control de acceso en la versión final.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * PROCEDENCIA
 * ───────────────────────────────────────────────────────────────────────────
 *   · Diseño, textos, paleta, iconos (window.CMIcons) y flujo: prototipo de
 *     Claude Design «App Comerciales Prototipo» (UI v1, 21-oct-2026).
 *   · Micrófono para decir el nombre del cliente (_setupMic …
 *     _startStandardSession): COPIA LITERAL de centriSalesLab.js v1.0.5, que
 *     es copia literal de centriConsole.js v1.0.4 (portado de EGAEL +50).
 *     Frase corta: el dictado del navegador sirve (decisión de la bitácora).
 *   · Grabación por trozos (MediaRecorder, SEGMENTO_MS, AUDIO_BPS,
 *     MIME_CANDIDATOS), transcripción en paralelo, informe, reintento
 *     automático solo si la petición no llega y clasificación de lo que se
 *     puede reintentar: ADAPTADO de centriSalesLab.js v1.0.5 (misma lógica,
 *     otro estado de pantalla).
 *   · ensureFonts() y _escape(): copia literal de centriConsole.js v1.0.4.
 *   · :host anclado a 100dvh: copia literal de centriConsole.js v1.0.4.
 *     PRECONDICIÓN: la página contiene SOLO este custom element.
 *
 * ⚠️ REGLA DE INTERFAZ: ningún texto visible nombra la plataforma.
 * ═══════════════════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  if (customElements.get('centri-sales')) {
    console.log('[CENTRI SALES] Ya registrado.');
    return;
  }

  const VERSION = '1.0.6';
  const TAG = `[CENTRI SALES v${VERSION}]`;

  // ── Servidor ──
  const ENDPOINT_TRANSCRIBIR = '/_functions/centriSalesLabTranscribir';
  const ENDPOINT_INFORME     = '/_functions/centriSalesLabInforme';
  const ENDPOINT_TICKET      = '/_functions/centriSalesTicket';   // v1.0.5
  const TICKET_MAX_PX        = 1600;    // lado largo de la foto del ticket
  const TICKET_CALIDAD       = 0.82;    // JPEG
  const RPC_TIMEOUT_MS       = 30000;

  // ── Micrófono del nombre del cliente — mismos valores que centriConsole v1.0.4 ──
  const SILENCE_MS = 2200;
  const SAFETY_MS  = 12000;

  // ── Grabación de la visita — valores de centriSalesLab.js v1.0.5 ──
  const SEGMENTO_MS = 25000;
  const AUDIO_BPS   = 32000;
  const MIME_CANDIDATOS = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/aac'
  ];
  const MAX_GRABACION_MS = 10 * 60000;   // tope de seguridad: 10 minutos
  const REINTENTOS_AUTO  = 2;
  const REINTENTO_MS     = 1500;

  // ── Ubicación ──
  const GEO_TIMEOUT_MS = 20000;
  // A menos de esto del cliente cuenta como «en el cliente».
  // ⚠️ PROVISIONAL para la beta: la bitácora lo pide en la configuración,
  // editable sin desplegar.
  const MARGEN_CLIENTE_M = 150;

  // ── Pendientes de enviar, guardados en el móvil ──
  const LS_PENDIENTES = 'centriSales.pendientes';

  // ── v1.0.9 — Avisos de la empresa ──
  const LS_AVISOS_VISTOS = 'centriSales.avisosVistos';
  const AVISOS_REFRESCO_MS = 2 * 60 * 1000;   // al volver al inicio, como mucho cada 2 min

  const UA = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
  const IS_ANDROID = /Android/.test(UA);

  // ═════════════════════════════════════════════════════════════════════════
  // MARCA — paleta y tipografía de la UI v1 (prototipo de Claude Design)
  // ═════════════════════════════════════════════════════════════════════════

  const C = {
    fucsia:   '#E80A4D',
    verdeOsc: '#045333',
    verdeAz:  '#006166',
    verdeMed: '#09A072',
    verdeCla: '#B7DACF',
    verdeNeg: '#00393C',
    tinta:    '#12201F',
    gris:     '#6B7A78',
    linea:    '#D3DEDC',
    fondo:    '#F2F5F4',
    blanco:   '#FFFFFF'
  };

  const FONT_BODY = '"Bai Jamjuree", ui-sans-serif, system-ui, sans-serif';

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

  // Iconos del prototipo (window.CMIcons). Solo los que usa esta beta.
  const cc = (x, y, r) => `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
  const ICONOS = {
    tag: ['M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z', 'M7.5 7.5h.01'],
    minus: [cc(12, 12, 10), 'M8 12h8'],
    plus: ['M5 12h14', 'M12 5v14'],
    pin: ['M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0', cc(12, 10, 3)],
    check: ['M20 6 9 17l-5-5'],
    checkC: [cc(12, 12, 10), 'm9 12 2 2 4-4'],
    clock: [cc(12, 12, 10), 'M12 6v6l4 2'],
    help: [cc(12, 12, 10), 'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3', 'M12 17h.01'],
    info: [cc(12, 12, 10), 'M12 16v-4', 'M12 8h.01'],   // v1.0.9 — Lucide «info»
    calendar: ['M8 2v4', 'M16 2v4', 'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', 'M3 10h18'],   // v1.0.11 — Lucide «calendar»
    chev: ['m9 18 6-6-6-6'],
    back: ['m12 19-7-7 7-7', 'M19 12H5'],
    mic: ['M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z', 'M19 10v2a7 7 0 0 1-14 0v-2', 'M12 19v3'],
    search: [cc(11, 11, 8), 'm21 21-4.3-4.3'],
    searchX: [cc(11, 11, 8), 'm21 21-4.3-4.3', 'm13.5 8.5-5 5', 'm8.5 8.5 5 5'],
    pencil: ['M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z'],
    redo: ['M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8', 'M3 3v5h5'],
    cycle: ['M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8', 'M21 3v5h-5', 'M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16', 'M8 16H3v5'],
    alert: ['m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3', 'M12 9v4', 'M12 17h.01'],
    stop: ['M7 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z'],
    wifiOff: ['M12 20h.01', 'M8.5 16.429a5 5 0 0 1 7 0', 'M5 12.859a10 10 0 0 1 5.17-2.69', 'M19 12.859a10 10 0 0 0-2.007-1.523', 'M2 8.82a15 15 0 0 1 4.177-2.643', 'M22 8.82a15 15 0 0 0-11.288-3.764', 'm2 2 20 20'],
    sparkles: ['M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z'],
    citrus: ['M21.66 17.67a1.08 1.08 0 0 1-.04 1.6A12 12 0 0 1 4.73 2.38a1.1 1.1 0 0 1 1.61-.04z', 'M19.65 15.66A8 8 0 0 1 8.35 4.34', 'm14 10-5.5 5.5', 'M14 17.85V10H6.15'],
    trend: ['M22 7 13.5 15.5 8.5 10.5 2 17', 'M16 7h6v6'],
    x: ['M18 6 6 18', 'm6 6 12 12'],
    home: ['M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8', 'M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'],
    lock: ['M7 11V7a5 5 0 0 1 10 0v4', 'M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z'],
    user: [cc(12, 8, 5), 'M20 21a8 8 0 0 0-16 0'],
    // v1.0.5 — del prototipo (window.CMIcons)
    camera: ['M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z', cc(12, 13, 3)],
    fuel: ['M3 22h12', 'M4 9h10', 'M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18', 'M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5'],
    receipt: ['M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z', 'M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8', 'M12 17.5v-11']
  };
  function ico(nombre) {
    const d = ICONOS[nombre] || [];
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d.map((p) => `<path d="${p}"></path>`).join('')}</svg>`;
  }

  // Resultado de la visita: claves de TAXONOMIA_VISITA (centriSalesLab.web.js
  // v1.2.0); etiqueta, icono y color del prototipo. 'otro' no está en el
  // prototipo: gris, como Sin interés.
  const RESULTADOS = [
    { k: 'pedido',      label: 'Pedido',      icon: 'checkC', bg: C.verdeMed },
    { k: 'ventas',      label: 'Ventas',      icon: 'tag',    bg: C.verdeOsc },   // v1.0.8
    { k: 'negociacion', label: 'Negociación', icon: 'trend',  bg: C.verdeOsc },   // v1.0.8
    { k: 'seguimiento', label: 'Seguimiento', icon: 'cycle',  bg: C.verdeAz },
    { k: 'administrativa', label: 'Administrativa', icon: 'receipt', bg: C.verdeNeg },   // v1.0.8
    { k: 'incidencia',  label: 'Incidencia',  icon: 'alert',  bg: C.fucsia },
    { k: 'presentacion', label: 'Presentación', icon: 'user', bg: C.verdeAz },   // v1.0.8
    { k: 'cortesia',    label: 'Cortesía',    icon: 'sparkles', bg: C.verdeMed },   // v1.0.8
    { k: 'sin_interes', label: 'Sin interés', icon: 'minus',  bg: C.gris },
    { k: 'no_atendido', label: 'No atendido', icon: 'user',   bg: C.gris },
    { k: 'otro',        label: 'Otro',        icon: 'help',   bg: C.gris }
  ];

  // Etiquetas de la taxonomía — las de centriSalesLab.js v1.0.5 (ETIQUETAS).
  const ETIQUETAS = {
    interes: { alto: 'Alto', medio: 'Medio', bajo: 'Bajo', indeterminado: 'Sin determinar' },
    objeciones: { precio: 'Precio', calidad: 'Calidad', mermas: 'Mermas', entrega: 'Entrega', servicio: 'Servicio', condiciones_pago: 'Condiciones de pago', competencia: 'Competencia', otra: 'Otra' },
    alertas: { riesgo_impago: 'Riesgo de impago', queja: 'Queja', riesgo_perdida: 'Riesgo de pérdida', descuento_solicitado: 'Pide descuento', oportunidad: 'Oportunidad' },
    responsable: { comercial: 'Comercial', direccion_comercial: 'Dirección comercial', cobros: 'Cobros', logistica: 'Logística', calidad: 'Calidad', otro: 'Otro' }
  };
  function etiqueta(campo, v) { return (ETIQUETAS[campo] && ETIQUETAS[campo][v]) || v || '—'; }
  const NIVEL_INTERES = { alto: 3, medio: 2, bajo: 1, indeterminado: 0 };

  // v1.0.5 — categorías del ticket (las de CATEGORIAS_TICKET de centriSalesLab v1.4.0)
  const CATEGORIAS_TICKET = {
    combustible: { label: 'Combustible', icon: 'fuel' },
    parking:     { label: 'Parking',     icon: 'receipt' },
    peaje:       { label: 'Peaje',       icon: 'receipt' },
    comida:      { label: 'Comida',      icon: 'receipt' },
    alojamiento: { label: 'Alojamiento', icon: 'receipt' },
    otro:        { label: 'Otro gasto',  icon: 'receipt' }
  };
  function euros(n) {
    const v = Number(n);
    if (!isFinite(v)) return '';
    return v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '\u00a0€';
  }
  function fechaCorta(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
    return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
  }

  // ═════════════════════════════════════════════════════════════════════════
  // UTILIDADES
  // ═════════════════════════════════════════════════════════════════════════

  const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const MESES_CORTOS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

  function hhmm(d) {
    const x = d || new Date();
    return String(x.getHours()).padStart(2, '0') + ':' + String(x.getMinutes()).padStart(2, '0');
  }
  function hoyTexto() {
    const d = new Date();
    return `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`;
  }
  function mmss(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }
  function inicial(s) {
    const t = String(s || '').trim();
    return t ? t.charAt(0).toUpperCase() : '?';
  }
  function nuevoId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
  /** Distancia en metros entre dos { lat, lon } (fórmula del haversine). */
  function distanciaM(a, b) {
    if (!a || !b) return null;
    const R = 6371000, rad = (g) => g * Math.PI / 180;
    const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  function textoDistancia(m) {
    if (m === null || m === undefined || !isFinite(m)) return '';
    if (m < 1000) return `${Math.round(m / 10) * 10} m`;
    return `${(Math.round(m / 100) / 10).toLocaleString('es-ES')} km`;
  }
  // Copia literal de blobABase64 de centriSalesLab.js v1.0.5
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
  function leerPendientes() {
    try { const v = JSON.parse(localStorage.getItem(LS_PENDIENTES) || '[]'); return Array.isArray(v) ? v : []; }
    catch (_) { return []; }
  }
  function escribirPendientes(lista) {
    try { localStorage.setItem(LS_PENDIENTES, JSON.stringify(lista || [])); return true; }
    catch (_) { return false; }
  }
  // v1.0.9 — claves de los avisos ya vistos (mismo patrón que los pendientes)
  function leerAvisosVistos() {
    try { const v = JSON.parse(localStorage.getItem(LS_AVISOS_VISTOS) || '[]'); return Array.isArray(v) ? v : []; }
    catch (_) { return []; }
  }
  function escribirAvisosVistos(lista) {
    try { localStorage.setItem(LS_AVISOS_VISTOS, JSON.stringify(lista || [])); return true; }
    catch (_) { return false; }
  }
  // v1.0.9 — «2026-12-15» → «15 de diciembre»
  // v1.0.11 — AAAA-MM-DD de hoy (hora del móvil) y «2026-10-22» → «Jueves, 22 de octubre»
  function hoyIso() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function diaLargo(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
    if (!m) return '';
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`;
  }
  function diaTexto(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
    return m ? `${Number(m[3])} de ${MESES[Number(m[2]) - 1]}` : '';
  }

  // ═════════════════════════════════════════════════════════════════════════
  // ELEMENTO
  // ═════════════════════════════════════════════════════════════════════════

  class CentriSales extends HTMLElement {

    static get observedAttributes() { return ['config', 'respuesta']; }

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });

      // Lo que espera el código literal del micrófono de CENTRI
      this._brand = { placeholder: '' };
      this._pending = false;
      this._SR = null;
      this._recognition = null;
      this._isListening = false;
      this._silenceTimer = null;
      this._safetyTimer = null;
      this._androidFinalBuffer = '';
      this._lastFinalTranscript = '';
      this._causaFin = '';

      // App
      this._comercial = null;
      this._screen = 'cargando';
      this._errorAcceso = '';
      this._rpcPend = new Map();
      this._visitas = [];
      this._dia = '';                // v1.0.11: día de la lista (AAAA-MM-DD); vacío = hoy
      this._avisos = [];             // v1.0.9: avisos de la empresa
      this._avisosTs = 0;            // v1.0.9: última petición
      this._toastTimer = null;
      this._borrador = null;         // informe sin enviar (uno, el último)

      // Flujo de una visita
      this._modo = 'nueva';          // 'nueva' | 'llegada'
      this._cliente = null;          // { contactId, negocio, persona, telefono, direccion, ubicacion, tipo }
      this._visitaId = null;         // id en CentriSalesVisitas (si hay llegada)
      this._llegadaTs = null;        // hora de llegada (ms)
      this._llegadaCoord = null;
      this._llegadaGeo = null;
      this._dicho = '';              // lo que el comercial dijo al buscar
      this._coincidencias = [];
      this._escrito = '';
      this._resultadosEscritos = [];
      this._tBuscar = null;
      this._buscando = false;
      this._posicion = null;         // última posición del móvil { lat, lon, precision, ts }
      this._nuevoCliente = null;     // formulario de cliente nuevo
      this._parecidos = [];

      // Grabación, texto e informe
      this._trans = null;
      this._grabacion = null;        // { segs, res, pendientes, ms, coord }
      this._texto = '';
      this._textoPrevio = '';        // en «Corregir»: el texto anterior
      this._informe = null;
      this._paso = 0;
      this._resOpen = false;
      this._tick = null;
      this._reabierta = false;   // v1.0.4: informe de una visita ya enviada
      this._cambiada = false;
      this._ticketLeido = null;  // v1.0.5: ticket leído, pendiente de «Guardar ticket»
      this._ultimaPintada = '';  // v1.0.5: para conservar el desplazamiento
    }

    connectedCallback() {
      ensureFonts();
      this._render();
      this._bindEvents();
      this._setupMic();
      this._onOnline = () => this._enviarPendientes();
      window.addEventListener('online', this._onOnline);
      this._emitir('sales-ready', {});
      console.log(`${TAG} listo`);
    }

    disconnectedCallback() {
      window.removeEventListener('online', this._onOnline);
      try { this._stopMic(); } catch (_) {}
      try { this._pararGrabacion(true); } catch (_) {}
      this._pararTick();
    }

    attributeChangedCallback(nombre, _viejo, valor) {
      if (!valor) return;
      let data;
      try { data = JSON.parse(valor); } catch (e) { console.warn(`${TAG} ${nombre}: JSON no válido`); return; }
      if (nombre === 'config') this._aplicarConfig(data);
      else if (nombre === 'respuesta') this._recibirRespuesta(data);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PUENTE CON EL PAGE CODE
    // ═══════════════════════════════════════════════════════════════════════

    _emitir(nombre, detail) {
      this.dispatchEvent(new CustomEvent(nombre, { detail, bubbles: true, composed: true }));
    }

    _rpc(metodo, args) {
      const reqId = nuevoId();
      return new Promise((resolve) => {
        const t = setTimeout(() => {
          if (this._rpcPend.has(reqId)) {
            this._rpcPend.delete(reqId);
            resolve({ ok: false, sinRespuesta: true, error: { code: 'SIN_RESPUESTA', message: 'El servidor no respondió.' } });
          }
        }, RPC_TIMEOUT_MS);
        this._rpcPend.set(reqId, (r) => { clearTimeout(t); resolve(r); });
        this._emitir('sales-rpc', { reqId, metodo, args: args || {} });
      });
    }

    _recibirRespuesta(r) {
      const fn = r && this._rpcPend.get(r.reqId);
      if (!fn) return;
      this._rpcPend.delete(r.reqId);
      // r.data es lo que devolvió el webMethod: { ok, ... } o el error del puente
      fn(r.data || { ok: false, error: { code: 'SIN_DATOS', message: 'Respuesta vacía.' } });
    }

    _aplicarConfig(cfg) {
      if (cfg.error) {
        this._errorAcceso = String(cfg.error);
        this._go('sinacceso');
        return;
      }
      this._comercial = cfg.comercial || { nombre: '', rol: '', foto: '' };
      this._go('home');
      this._cargarVisitas();
      this._cargarAvisos();     // v1.0.9
      this._enviarPendientes();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // NAVEGACIÓN
    // ═══════════════════════════════════════════════════════════════════════

    _go(screen) {
      if (this._screen === 'listening' && screen !== 'listening') { try { this._stopMic(); } catch (_) {} }
      this._screen = screen;
      this._pintar();
    }

    /**
     * Salir del informe o del error sin enviar NO pierde el trabajo: queda un
     * borrador (uno, el último) que se retoma desde Inicio.
     */
    _guardarBorrador() {
      // También al salir de «Corregir» sin grabar: el informe anterior sigue valiendo.
      const corrigiendo = this._screen === 'visit' && !!this._informe;
      if (!this._cliente || !(this._screen === 'report' || this._screen === 'error' || corrigiendo)) return;
      // v1.0.4: una visita ya enviada que se abre y se cierra sin tocar no es un borrador
      if (this._reabierta && !this._cambiada) return;
      this._borrador = {
        pantalla: corrigiendo ? 'report' : this._screen,
        cliente: this._cliente, visitaId: this._visitaId, llegadaTs: this._llegadaTs,
        grabacion: this._grabacion, texto: this._texto, textoPrevio: this._textoPrevio,
        informe: this._informe, hora: hhmm()
      };
    }

    _retomarBorrador() {
      const b = this._borrador;
      if (!b) return;
      this._borrador = null;
      this._cliente = b.cliente; this._visitaId = b.visitaId; this._llegadaTs = b.llegadaTs;
      this._grabacion = b.grabacion; this._texto = b.texto; this._textoPrevio = b.textoPrevio;
      this._informe = b.informe; this._resOpen = false;
      if (b.pantalla === 'report' && b.informe) { this._textoPrevio = ''; this._go('report'); }
      else this._reintentar();
    }

    _inicio() {
      this._guardarBorrador();
      this._cliente = null;
      this._visitaId = null;
      this._llegadaTs = null;
      this._llegadaCoord = null;
      this._llegadaGeo = null;
      this._texto = '';
      this._textoPrevio = '';
      this._informe = null;
      this._grabacion = null;
      this._resOpen = false;
      this._reabierta = false;   // v1.0.4
      this._cambiada = false;
      this._go('home');
      this._cargarVisitas();
      this._cargarAvisos();     // v1.0.9
    }

    _toast(texto) {
      const el = this.shadowRoot.getElementById('toast');
      if (!el) return;
      el.textContent = texto;
      el.classList.add('on');
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => el.classList.remove('on'), 4000);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // UBICACIÓN — siempre nueva (maximumAge 0, como centriSalesLab v1.0.5)
    // ═══════════════════════════════════════════════════════════════════════

    _ubicar() {
      return new Promise((resolve) => {
        if (!navigator.geolocation) { resolve(null); return; }
        navigator.geolocation.getCurrentPosition((pos) => {
          const c = pos.coords;
          this._posicion = { lat: c.latitude, lon: c.longitude, precision: Math.round(c.accuracy), ts: Date.now() };
          resolve(this._posicion);
        }, (err) => {
          console.warn(`${TAG} ubicación: ${(err && err.message) || 'error'}`);
          resolve(null);
        }, { enableHighAccuracy: true, timeout: GEO_TIMEOUT_MS, maximumAge: 0 });
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // INICIO Y VISITAS DE HOY
    // ═══════════════════════════════════════════════════════════════════════

    async _cargarVisitas() {
      const dia = this._dia;   // v1.0.11
      const r = await this._rpc('visitasHoy', dia ? { dia } : {});
      if (dia !== this._dia) return;   // v1.0.11: se cambió de día mientras llegaba
      if (r && r.ok) {
        this._visitas = Array.isArray(r.visitas) ? r.visitas : [];
        if (this._screen === 'home' || this._screen === 'arrived') this._pintar();
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // AVISOS DE LA EMPRESA (v1.0.9)
    // ═══════════════════════════════════════════════════════════════════════

    async _cargarAvisos(forzar) {
      if (!forzar && Date.now() - this._avisosTs < AVISOS_REFRESCO_MS) return;
      this._avisosTs = Date.now();
      const r = await this._rpc('avisos', {});
      if (!r || !r.ok) { this._avisosTs = 0; return; }   // se reintenta la próxima vez
      this._avisos = Array.isArray(r.avisos) ? r.avisos : [];
      if (this._screen === 'avisos') this._marcarAvisosVistos();
      if (this._screen === 'home' || this._screen === 'avisos') this._pintar();
    }

    _avisosSinVer() {
      const vistos = leerAvisosVistos();
      return this._avisos.filter((a) => vistos.indexOf(a.clave) < 0).length;
    }

    _marcarAvisosVistos() {
      if (this._avisos.length) escribirAvisosVistos(this._avisos.map((a) => a.clave));
    }

    _abrirAvisos() {
      this._marcarAvisosVistos();
      this._go('avisos');
      this._cargarAvisos(true);
    }

    // v1.0.11 — cambiar el día de la lista
    _elegirDia(valor) {
      const hoy = hoyIso();
      const v = /^\d{4}-\d{2}-\d{2}$/.test(String(valor || '')) ? valor : '';
      const nuevo = (!v || v >= hoy) ? '' : v;
      if (nuevo === this._dia) return;
      this._dia = nuevo;
      this._visitas = [];
      this._pintar();
      this._cargarVisitas();
    }

    _nuevaVisita() { this._dia = ''; this._modo = 'nueva'; this._prepararBusqueda(); }   // v1.0.11: vuelve a hoy

    _heLlegado() {
      // La hora y la ubicación se guardan YA; el cliente se elige después.
      this._modo = 'llegada';
      this._dia = '';   // v1.0.11: vuelve a hoy
      this._llegadaTs = Date.now();
      this._llegadaCoord = null;
      this._llegadaGeo = this._ubicar().then((p) => { if (p) this._llegadaCoord = { lat: p.lat, lon: p.lon }; return p; });
      this._prepararBusqueda();
    }

    _prepararBusqueda() {
      this._dicho = '';
      this._escrito = '';
      this._resultadosEscritos = [];
      this._coincidencias = [];
      if (this._modo !== 'llegada' && (!this._posicion || Date.now() - this._posicion.ts > 60000)) {
        this._ubicar().then(() => { if (this._screen === 'matches') this._pintar(); });
      }
      this._go('pick');
    }

    async _elegirCliente(c) {
      this._cliente = c;
      if (this._modo === 'llegada') {
        // La ubicación se pidió al pulsar «He llegado»: se espera a tenerla.
        if (this._llegadaGeo) { try { await this._llegadaGeo; } catch (_) {} }
        const ts = this._llegadaTs || Date.now();
        const coord = this._llegadaCoord || (this._posicion ? { lat: this._posicion.lat, lon: this._posicion.lon } : null);
        const r = await this._rpc('guardarLlegada', {
          contactId: c.contactId, cliente: c.negocio || c.persona,
          lat: coord ? coord.lat : null, lon: coord ? coord.lon : null, ts
        });
        if (r && r.ok && r.visita) {
          this._visitaId = r.visita.id;
          this._llegadaTs = r.visita.llegada || ts;
        } else {
          this._toast((r && r.error && r.error.message) || 'No se pudo guardar la llegada.');
          this._visitaId = null;
        }
        this._go('arrived');
        this._cargarVisitas();
      } else {
        this._visitaId = null;
        this._llegadaTs = null;
        this._go('visit');
      }
    }

    _abrirVisitaDeHoy(id) {
      if (id === '__borrador') { this._retomarBorrador(); return; }
      const v = this._visitas.find((x) => x.id === id);
      if (v && v.estado === 'llegada') {
        this._cliente = { contactId: v.contactId, negocio: v.cliente, persona: '', telefono: '', direccion: '', ubicacion: null, tipo: '' };
        this._visitaId = v.id;
        this._llegadaTs = v.llegada || null;
        this._texto = ''; this._textoPrevio = ''; this._informe = null; this._grabacion = null;
        this._go('visit');
        return;
      }
      if (v && v.estado === 'enviada') { this._reabrirVisita(v.id); return; }   // v1.0.4
      const p = leerPendientes().find((x) => x.envioId === id);
      if (p) this._enviarPendientes(true);
    }

    /** v1.0.4 — Abre el informe de una visita ya enviada para revisarlo o corregirlo. */
    async _reabrirVisita(id) {
      this._go('cargando');
      const r = await this._rpc('leerVisita', { id });
      const v = r && r.ok && r.visita;
      if (!v || !v.informe) {
        this._go('home');
        this._toast((r && r.error && r.error.message) || 'No se pudo abrir la visita.');
        return;
      }
      this._cliente = { contactId: v.contactId, negocio: v.cliente, persona: '', telefono: '', direccion: '', ubicacion: null, tipo: '' };
      this._visitaId = v.id;
      this._llegadaTs = v.llegada || null;
      this._texto = v.transcripcion || '';
      this._textoPrevio = '';
      const inf = v.informe;
      if (inf.resultado === 'oferta') inf.resultado = 'ventas';   // v1.0.8: valor antiguo
      if (!Array.isArray(inf.confirmaciones)) inf.confirmaciones = (inf.dudas || []).map((q) => ({ pregunta: q, respuesta: '' }));
      this._informe = inf;
      const coord = (typeof v.reporteLat === 'number' && typeof v.reporteLon === 'number') ? { lat: v.reporteLat, lon: v.reporteLon, precision: null } : null;
      this._grabacion = { segs: [], res: [], pendientes: [], ms: (v.segundosAudio || 0) * 1000, coord, informeFallo: false };
      this._reabierta = true;
      this._cambiada = false;
      this._resOpen = false;
      this._go('report');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // BUSCAR CLIENTE
    // ═══════════════════════════════════════════════════════════════════════

    _escuchar() {
      if (!this._SR) { this._toast('Este móvil no permite dictar aquí: escribe el nombre.'); return; }
      this._dicho = '';
      this._go('listening');
      this._startMic();
    }

    async _finDictado(texto) {
      const t = String(texto || '').trim();
      this._dicho = t;
      if (!t) { this._go('pick'); this._toast('No te he oído. Prueba otra vez o escribe el nombre.'); return; }
      this._go('buscando');
      const r = await this._rpc('buscarCliente', { texto: t });
      if (r && r.ok) {
        this._coincidencias = r.clientes || [];
        this._go(this._coincidencias.length ? 'matches' : 'nomatch');
      } else {
        this._go('pick');
        this._toast((r && r.error && r.error.message) || 'No se pudo buscar el cliente.');
      }
    }

    _alEscribir(valor) {
      this._escrito = valor;
      clearTimeout(this._tBuscar);
      const t = valor.trim();
      if (t.length < 2) { this._resultadosEscritos = []; this._pintarResultadosEscritos(); return; }
      this._tBuscar = setTimeout(async () => {
        this._buscando = true; this._pintarResultadosEscritos();
        const r = await this._rpc('buscarCliente', { texto: t });
        this._buscando = false;
        if (this._escrito.trim() !== t) return;   // ya escribió otra cosa
        this._resultadosEscritos = (r && r.ok && r.clientes) || [];
        this._pintarResultadosEscritos();
      }, 400);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CLIENTE NUEVO
    // ═══════════════════════════════════════════════════════════════════════

    _abrirNuevoCliente() {
      this._nuevoCliente = { negocio: this._dicho || this._escrito || '', telefono: '', persona: '', direccion: '' };
      this._parecidos = [];
      this._ubicar();
      this._go('nuevo');
    }

    _leerFormularioNuevo() {
      const r = this.shadowRoot;
      const v = (id) => { const el = r.getElementById(id); return el ? el.value.trim() : ''; };
      this._nuevoCliente = { negocio: v('fNegocio'), telefono: v('fTelefono'), persona: v('fPersona'), direccion: v('fDireccion') };
      return this._nuevoCliente;
    }

    async _crearCliente(opciones) {
      const f = this._nuevoCliente || this._leerFormularioNuevo();
      if (!f.negocio || !f.telefono) { this._toast('Hacen falta el nombre del negocio y un teléfono.'); return; }
      const p = this._posicion;
      const r = await this._rpc('crearCliente', Object.assign({
        negocio: f.negocio, telefono: f.telefono, persona: f.persona, direccion: f.direccion,
        ubicacion: p ? { lat: p.lat, lon: p.lon } : null
      }, opciones || {}));
      if (r && r.ok && r.cliente) { this._toast('Cliente dado de alta.'); this._elegirCliente(r.cliente); return; }
      const code = r && r.error && r.error.code;
      if (code === 'POSIBLES_DUPLICADOS') { this._parecidos = r.parecidos || []; this._go('duplicados'); return; }
      if (code === 'TELEFONO_DUPLICADO') { this._go('telefonoDuplicado'); return; }
      this._toast((r && r.error && r.error.message) || 'No se pudo dar de alta el cliente.');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CONTAR LA VISITA — grabación por trozos
    // ADAPTADO de «Grabar y transcribir» de centriSalesLab.js v1.0.5:
    // a los SEGMENTO_MS se abre un grabador nuevo sobre el mismo micrófono
    // ANTES de cerrar el anterior (sin hueco); cada trozo se transcribe aparte
    // y en paralelo (Google V1 síncrono admite 1 min por petición).
    // ═══════════════════════════════════════════════════════════════════════

    async _empezarGrabacion() {
      if (this._trans) return;
      if (!(window.MediaRecorder && navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
        this._toast('Este móvil no permite grabar aquí.');
        return;
      }
      const T = { activo: true, stream: null, rec: null, timer: null, tope: null, mime: '', inicio: 0, nSeg: 0, abiertos: 0, segmentos: [], enviado: false };
      this._trans = T;
      let stream;
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
      catch (e) {
        this._trans = null;
        this._toast('Sin permiso de micrófono. Actívalo en los ajustes del navegador.');
        return;
      }
      if (this._trans !== T || !T.activo) { try { stream.getTracks().forEach((t) => t.stop()); } catch (_) {} return; }
      T.stream = stream;
      try { T.mime = MIME_CANDIDATOS.find((t) => MediaRecorder.isTypeSupported(t)) || ''; } catch (_) { T.mime = ''; }
      T.inicio = Date.now();
      if (!this._segmento(T)) return;
      T.tope = setTimeout(() => this._terminarGrabacion(), MAX_GRABACION_MS);
      this._ubicar();   // en paralelo, no bloquea
      if (navigator.vibrate) { try { navigator.vibrate(50); } catch (_) {} }
      this._go('rec');
      this._arrancarTick();
      console.log(`${TAG} grabando · ${T.mime || 'formato por defecto'}`);
    }

    /** Abre un trozo nuevo. Devuelve false si no se pudo crear el grabador. */
    _segmento(T) {
      const opts = { audioBitsPerSecond: AUDIO_BPS };
      if (T.mime) opts.mimeType = T.mime;
      let rec;
      try { rec = new MediaRecorder(T.stream, opts); }
      catch (e) {
        try { rec = new MediaRecorder(T.stream); }
        catch (e2) { this._fallaGrabacion(T, 'no se pudo crear el grabador'); return false; }
      }
      const seg = { n: T.nSeg++, trozos: [], inicio: Date.now(), mime: rec.mimeType || T.mime || '' };
      T.rec = rec;
      T.abiertos++;
      rec.ondataavailable = (ev) => { if (ev.data && ev.data.size) seg.trozos.push(ev.data); };
      rec.onstop = () => {
        T.abiertos--;
        const blob = new Blob(seg.trozos, { type: seg.mime || 'audio/webm' });
        T.segmentos[seg.n] = { blob, ms: Date.now() - seg.inicio, mime: blob.type };
        if (!T.activo && T.abiertos === 0) this._grabacionCerrada(T);
      };
      try { rec.start(1000); }
      catch (e) { T.abiertos--; this._fallaGrabacion(T, 'el grabador no arrancó'); return false; }
      T.timer = setTimeout(() => {
        if (!T.activo || T.rec !== rec) return;
        // El siguiente empieza ANTES de cerrar este: sin hueco en el cambio.
        if (!this._segmento(T)) return;
        try { rec.stop(); } catch (_) {}
      }, SEGMENTO_MS);
      return true;
    }

    _terminarGrabacion() {
      const T = this._trans;
      if (!T || !T.activo) return;
      T.activo = false;
      clearTimeout(T.timer);
      clearTimeout(T.tope);
      this._pararTick();
      if (!T.rec) return;
      try {
        if (T.rec.state !== 'inactive') T.rec.stop();
        else if (T.abiertos === 0) this._grabacionCerrada(T);
      } catch (_) {
        if (T.abiertos === 0) this._grabacionCerrada(T);
      }
    }

    _pararGrabacion(descartar) {
      const T = this._trans;
      if (!T) return;
      T.activo = false;
      if (descartar) T.enviado = true;   // no se procesa
      clearTimeout(T.timer); clearTimeout(T.tope);
      try { if (T.rec && T.rec.state !== 'inactive') T.rec.stop(); } catch (_) {}
      try { if (T.stream) T.stream.getTracks().forEach((t) => t.stop()); } catch (_) {}
      this._trans = null;
      this._pararTick();
    }

    _fallaGrabacion(T, msg) {
      T.activo = false;
      clearTimeout(T.timer); clearTimeout(T.tope);
      try { if (T.stream) T.stream.getTracks().forEach((t) => t.stop()); } catch (_) {}
      if (this._trans === T) this._trans = null;
      this._pararTick();
      console.warn(`${TAG} grabación: ${msg}`);
      this._toast('No se pudo grabar. Inténtalo otra vez.');
      this._go('visit');
    }

    async _grabacionCerrada(T) {
      if (T.enviado) return;
      T.enviado = true;
      try { T.stream.getTracks().forEach((t) => t.stop()); } catch (_) {}
      this._trans = null;
      const segs = T.segmentos.filter(Boolean);
      if (!segs.length || !segs.some((s) => s.blob.size > 0)) {
        this._toast('No se grabó audio. Inténtalo otra vez.');
        this._go('visit');
        return;
      }
      const p = this._posicion;
      // En «Corregir» se suman los segundos de la grabación anterior.
      const msPrevio = (this._textoPrevio && this._grabacion) ? (this._grabacion.ms || 0) : 0;
      this._grabacion = {
        segs,
        res: [],
        pendientes: segs.map((_, i) => i),
        ms: msPrevio + segs.reduce((a, s) => a + s.ms, 0),
        coord: p ? { lat: p.lat, lon: p.lon, precision: p.precision } : null,
        informeFallo: false
      };
      this._paso = 1;
      this._go('prep');
      await this._procesar();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TRANSCRIPCIÓN E INFORME — ADAPTADO de centriSalesLab.js v1.0.5
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * fetch con REINTENTO AUTOMÁTICO solo cuando la petición no llega (fetch
     * lanza, p. ej. «Failed to fetch»). Si el servidor responde, aunque sea
     * con error, NO se repite sola: pudo gastar ya minutos de Google o tokens.
     * COPIA de _fetchConReintento de centriSalesLab.js v1.0.5 (sin métricas).
     */
    async _fetchConReintento(url, opciones, que) {
      for (let intento = 0; ; intento++) {
        try {
          return await fetch(url, opciones);
        } catch (e) {
          if (intento >= REINTENTOS_AUTO) throw e;
          const espera = REINTENTO_MS * (intento + 1);
          console.warn(`${TAG} ${que}: la petición no llegó (${(e && e.message) || 'error de red'}); reintento ${intento + 1} de ${REINTENTOS_AUTO}`);
          await new Promise((r) => setTimeout(r, espera));
        }
      }
    }

    async _transcribirSegmento(s, i) {
      const anotar = (msg, reintentable) => {
        console.warn(`${TAG} transcripción, trozo ${i + 1}: ${msg}`);
        return { texto: '', reintentable: !!reintentable };
      };
      try {
        const audio = await blobABase64(s.blob);
        const res = await this._fetchConReintento(ENDPOINT_TRANSCRIBIR, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audio, mime: s.mime, ms: s.ms })
        }, `transcripción ${i + 1}`);
        if (!res.ok) {
          if (res.status === 404) return anotar('el endpoint no existe (404)');
          return anotar(`HTTP ${res.status}`, res.status >= 500);
        }
        const data = await res.json();
        if (!data || !data.ok) return anotar((data && data.error) || 'sin texto', !!(data && data.reintentable));
        return { ok: true, texto: String(data.texto || '').trim() };
      } catch (e) {
        return anotar((e && e.message) || 'error de red', true);
      }
    }

    async _pedirInforme(texto) {
      const c = this._cliente || {};
      try {
        const res = await this._fetchConReintento(ENDPOINT_INFORME, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            texto,
            cliente: { nombre: c.negocio || c.persona || '', zona: c.direccion || '' }
          })
        }, 'informe');
        if (!res.ok) return { ok: false, reintentable: res.status >= 500, error: `HTTP ${res.status}` };
        const data = await res.json();
        if (!data || !data.ok || !data.informe) return { ok: false, reintentable: !!(data && data.reintentable), error: (data && data.error) || 'sin informe' };
        return { ok: true, informe: data.informe };
      } catch (e) {
        return { ok: false, reintentable: true, error: (e && e.message) || 'error de red' };
      }
    }

    /** Transcribe los trozos pendientes y pide el informe. Reintentable. */
    async _procesar() {
      const G = this._grabacion;
      if (!G) return;
      if (G.pendientes.length) {
        this._paso = 1; this._pintarPasos();
        const nuevos = await Promise.all(G.pendientes.map((i) => this._transcribirSegmento(G.segs[i], i)));
        G.pendientes.forEach((i, k) => { G.res[i] = nuevos[k]; });
        G.pendientes = G.res.map((r, i) => (r && r.reintentable ? i : -1)).filter((i) => i >= 0);
        if (G.pendientes.length) { this._go('error'); return; }
      }
      const nuevoTexto = G.res.map((r) => (r && r.texto) || '').filter(Boolean).join(' ');
      if (!nuevoTexto) { this._toast('No he entendido nada en la grabación. Repítela, por favor.'); this._go('visit'); return; }
      // «Corregir»: lo nuevo se añade al relato anterior y el informe se rehace entero.
      this._texto = this._textoPrevio ? `${this._textoPrevio}\n\nCorrección del comercial: ${nuevoTexto}` : nuevoTexto;
      this._paso = 2; this._pintarPasos();
      const r = await this._pedirInforme(this._texto);
      if (!r.ok) {
        console.warn(`${TAG} informe: ${r.error}`);
        G.informeFallo = true;
        this._go('error');
        return;
      }
      G.informeFallo = false;
      this._informe = Object.assign({}, r.informe, { confirmaciones: (r.informe.dudas || []).map((q) => ({ pregunta: q, respuesta: '' })) });
      this._resOpen = false;
      this._cambiada = true;   // v1.0.4
      this._paso = 3;
      this._go('report');
    }

    _reintentar() {
      if (!this._grabacion) { this._go('visit'); return; }
      this._paso = 1;
      this._go('prep');
      this._procesar();
    }

    _corregir() {
      // Grabar una corrección: se suma al relato y se rehace el informe.
      this._textoPrevio = this._texto;
      this._go('visit');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ENVIAR
    // ═══════════════════════════════════════════════════════════════════════

    _datosEnvio() {
      const c = this._cliente || {};
      const G = this._grabacion || {};
      const coord = G.coord || (this._posicion ? { lat: this._posicion.lat, lon: this._posicion.lon } : null);
      return {
        envioId: nuevoId(),
        visitaId: this._visitaId,
        contactId: c.contactId,
        cliente: c.negocio || c.persona,
        transcripcion: this._texto,
        informe: this._informe,
        segundosAudio: Math.round((G.ms || 0) / 1000),
        lat: coord ? coord.lat : null,
        lon: coord ? coord.lon : null,
        hora: hhmm()
      };
    }

    async _enviar() {
      if (!this._informe) return;
      const datos = this._datosEnvio();
      const btn = this.shadowRoot.getElementById('btnEnviar');
      if (btn) { btn.disabled = true; btn.textContent = 'ENVIANDO…'; }
      const r = await this._rpc('guardarVisita', datos);
      if (r && r.ok) {
        this._horaEnvio = hhmm();
        this._go('sent');
        this._cargarVisitas();
        return;
      }
      if (!r || r.sinRespuesta || !navigator.onLine) {
        // Sin conexión o sin respuesta: se guarda en el móvil y se envía sola.
        const lista = leerPendientes();
        lista.push(datos);
        if (escribirPendientes(lista)) { this._go('offline'); return; }
      }
      if (btn) { btn.disabled = false; btn.textContent = 'ENVIAR INFORME'; }
      this._toast((r && r.error && r.error.message) || 'No se pudo enviar el informe.');
    }

    async _enviarPendientes(avisar) {
      if (this._enviandoPend || !this._comercial) return;
      const lista = leerPendientes();
      if (!lista.length) return;
      this._enviandoPend = true;
      const quedan = [];
      for (const d of lista) {
        const r = await this._rpc('guardarVisita', d);
        if (!(r && r.ok)) quedan.push(d);
      }
      escribirPendientes(quedan);
      this._enviandoPend = false;
      if (avisar) this._toast(quedan.length ? 'Aún no se puede enviar. Se enviará sola.' : 'Informe enviado.');
      if (quedan.length !== lista.length) this._cargarVisitas();
      else if (this._screen === 'home') this._pintar();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // RELOJ DE LA GRABACIÓN
    // ═══════════════════════════════════════════════════════════════════════

    _arrancarTick() {
      this._pararTick();
      this._tick = setInterval(() => {
        const el = this.shadowRoot.getElementById('reloj');
        if (el && this._trans) el.textContent = mmss(Date.now() - this._trans.inicio);
      }, 250);
    }
    _pararTick() { if (this._tick) { clearInterval(this._tick); this._tick = null; } }

    // ═══════════════════════════════════════════════════════════════════════
    // MICRÓFONO DEL NOMBRE DEL CLIENTE
    // COPIA LITERAL de centriSalesLab.js v1.0.5 (= centriConsole.js v1.0.4,
    // MICRÓFONO, Web Speech API — portado de EGAEL +50). Cambios marcados [LAB].
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

    // ═══════════════════════════════════════════════════════════════════════
    // CALENDARIO DEL MÓVIL (v1.0.6)
    // ═══════════════════════════════════════════════════════════════════════

    _anadirCalendario() {
      const inf = this._informe || {};
      const pa = inf.proxima_accion || {};
      if (!pa.fecha || !/^\d{4}-\d{2}-\d{2}$/.test(pa.fecha)) { this._toast('Primero elige la fecha.'); return; }
      const c = this._cliente || {};
      const titulo = `${c.negocio || c.persona || 'Cliente'} · ${pa.descripcion || 'Próxima acción'}`;
      const nota = String(inf.resumen || '');
      const ini = pa.fecha.replace(/-/g, '');
      const d = new Date(pa.fecha + 'T12:00:00');
      d.setDate(d.getDate() + 1);
      const fin = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
      if (IS_ANDROID) {
        const url = 'https://calendar.google.com/calendar/render?action=TEMPLATE'
          + '&text=' + encodeURIComponent(titulo)
          + '&dates=' + ini + '/' + fin
          + '&details=' + encodeURIComponent(nota);
        window.open(url, '_blank', 'noopener');
        return;
      }
      const esc = (t) => String(t).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
      const ahora = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
      const ics = [
        'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Centrimerca//Visitas//ES', 'CALSCALE:GREGORIAN',
        'BEGIN:VEVENT',
        `UID:${nuevoId()}@centrimerca`,
        `DTSTAMP:${ahora}`,
        `DTSTART;VALUE=DATE:${ini}`,
        `DTEND;VALUE=DATE:${fin}`,
        `SUMMARY:${esc(titulo)}`,
        `DESCRIPTION:${esc(nota)}`,
        'END:VEVENT', 'END:VCALENDAR'
      ].join('\r\n');
      try {
        const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = 'proxima-accion.ics';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      } catch (e) {
        this._toast('No se pudo crear el evento.');
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TICKET DE GASTO (v1.0.5)
    // ═══════════════════════════════════════════════════════════════════════

    _abrirCamaraTicket() {
      const i = this.shadowRoot.getElementById('fTicket');
      if (i) i.click();
    }

    /** Reduce la foto en el móvil: lado largo TICKET_MAX_PX, JPEG. Devuelve base64 sin prefijo. */
    async _prepararFoto(file) {
      const url = URL.createObjectURL(file);
      try {
        const img = await new Promise((resolve, reject) => {
          const im = new Image();
          im.onload = () => resolve(im);
          im.onerror = () => reject(new Error('No se pudo abrir la foto'));
          im.src = url;
        });
        const k = Math.min(1, TICKET_MAX_PX / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
        const w = Math.max(1, Math.round(img.naturalWidth * k));
        const h = Math.max(1, Math.round(img.naturalHeight * k));
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(img, 0, 0, w, h);
        const dataUrl = cv.toDataURL('image/jpeg', TICKET_CALIDAD);
        return dataUrl.slice(dataUrl.indexOf(',') + 1);
      } finally {
        URL.revokeObjectURL(url);
      }
    }

    async _leerTicket(file) {
      if (!this._informe) return;
      this._go('leyendoTicket');
      let imagen;
      try { imagen = await this._prepararFoto(file); }
      catch (e) {
        console.warn(`${TAG} ticket: ${(e && e.message) || 'foto no válida'}`);
        this._go('badticket');
        return;
      }
      let r;
      try {
        const res = await this._fetchConReintento(ENDPOINT_TICKET, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imagen, mime: 'image/jpeg' })
        }, 'ticket');
        r = res.ok ? await res.json() : { ok: false, error: `HTTP ${res.status}` };
      } catch (e) {
        r = { ok: false, error: (e && e.message) || 'error de red' };
      }
      if (this._screen !== 'leyendoTicket') return;   // salió de la pantalla
      if (r && r.ok && r.ticket && r.ticket.legible) {
        this._ticketLeido = r.ticket;
        this._go('ticket');
        return;
      }
      if (r && r.ok && r.ticket && r.ticket.legible === false) { this._go('badticket'); return; }
      console.warn(`${TAG} ticket: ${(r && r.error) || 'sin respuesta'}`);
      this._go('report');
      this._toast('No se pudo leer el ticket. Inténtalo otra vez.');
    }

    _guardarTicket() {
      if (!this._informe || !this._ticketLeido) { this._go('report'); return; }
      const t = this._ticketLeido;
      this._informe.ticket = { categoria: t.categoria, total_eur: t.total_eur, fecha: t.fecha || null, comercio: t.comercio || '', foto: t.foto || '' };
      this._ticketLeido = null;
      this._cambiada = true;
      this._go('report');
      this._toast('Ticket guardado en el informe.');
    }

    _tarjetaTicket(t) {
      if (!t || !isFinite(Number(t.total_eur))) return '';
      const cat = CATEGORIAS_TICKET[t.categoria] || CATEGORIAS_TICKET.otro;
      return `<div class="caja fila-ticket">
        <span class="tk-i">${ico(cat.icon)}</span>
        <span class="tk-t">Ticket · ${this._escape(cat.label)}${t.comercio ? ` · ${this._escape(t.comercio)}` : ''}</span>
        <span class="tk-v">${this._escape(euros(t.total_eur))}</span>
      </div>`;
    }

    _vLeyendoTicket() {
      return `<div class="centro full g28 pad">
        <span class="fruta">${ico('receipt')}</span>
        <div class="t-28 tc">Leyendo el ticket…</div>
      </div>`;
    }

    _vTicket() {
      const t = this._ticketLeido || {};
      const cat = CATEGORIAS_TICKET[t.categoria] || CATEGORIAS_TICKET.otro;
      return `<div class="col">
        <div class="cab">
          <button class="atras" data-accion="volverInforme" aria-label="Volver al informe">${ico('back')}</button>
          <div class="cab-t"><span class="cab-tit">Ticket de gasto</span></div>
        </div>
        <div class="col grow g14 pad-l scroll">
          <div class="caja tk-grande">
            <span class="tk-disco">${ico(cat.icon)}</span>
            <span class="tk-cat">${this._escape(cat.label)}</span>
            <span class="tk-total">${this._escape(euros(t.total_eur))}</span>
          </div>
          <div class="caja tk-datos">
            <div class="tk-fila"><span class="t-gris16">Fecha</span><b>${this._escape(fechaCorta(t.fecha) || '—')}</b></div>
            <div class="tk-fila"><span class="t-gris16">Comercio</span><b>${this._escape(t.comercio || '—')}</b></div>
          </div>
          <button class="btn btn-gris btn-64" data-accion="ticket"><span class="i24">${ico('camera')}</span>Repetir foto</button>
          <div class="grow"></div>
          <button class="btn btn-azul btn-84" data-accion="guardarTicket"><span class="i28">${ico('check')}</span>Guardar ticket</button>
        </div>
      </div>`;
    }

    _vBadTicket() {
      return `<div class="col">
        <div class="centro grow g18 pad">
          <span class="disco disco-fucsia">${ico('alert')}</span>
          <div class="t-titulo">No se lee bien el ticket</div>
          <div class="t-texto">Busca más luz y que salga entero, sin dobleces.</div>
        </div>
        <div class="pie">
          <button class="btn btn-azul btn-84" data-accion="ticket"><span class="i30">${ico('camera')}</span>Repetir foto</button>
          <button class="btn btn-borde btn-68" data-accion="volverInforme">Ahora no</button>
        </div>
      </div>`;
    }

    // Adaptadores de lo que el código literal espera encontrar en CENTRI
    _crearAdaptadorInput() {
      // Misma interfaz que el <textarea> de CENTRI: value y placeholder.
      const self = this;
      return {
        _v: '',
        get value() { return this._v; },
        set value(v) {
          this._v = String(v == null ? '' : v);
          self._pintarDicho(this._v);
        },
        // v1.0.2: el código literal avisa aquí del estado del micrófono
        set placeholder(p) { self._pintarEstadoMic(p); },
        get placeholder() { return ''; }
      };
    }
    _stopTts() { /* esta app no tiene voz de salida */ }
    _sendQuery(text) { this._finCentri(text); }
    _appendError(text) { this._toast(text); }
    _finCentri(text) {
      // El código literal NO limpia el temporizador de silencio en onend (ver
      // centriSalesLab.js): se limpia aquí para que no pare la búsqueda siguiente.
      this._clearSilenceTimer();
      this._clearSafetyTimer();
      this._causaFin = '';
      if (this._screen !== 'listening') return;   // salió de la pantalla
      this._finDictado(text);
    }
    _anotarErrorDictado(codigo) {
      console.warn(`${TAG} dictado: ${codigo}`);
      if (codigo === 'not-allowed' || codigo === 'service-not-allowed' || codigo === 'audio-capture') {
        if (this._screen === 'listening') this._go('pick');
      }
    }
    // v1.0.2 — «Preparando micrófono…» hasta que entra audio; luego «Te escucho…»
    _pintarEstadoMic(p) {
      const t = String(p || '');
      if (!t) return;
      const caja = this.shadowRoot.getElementById('estadoMic');
      const txt = this.shadowRoot.getElementById('estadoMicTxt');
      if (txt) txt.textContent = t;
      if (caja) caja.classList.toggle('activo', t === 'Te escucho…');
    }
    _pintarDicho(t) {
      const el = this.shadowRoot.getElementById('dicho');
      if (el) el.textContent = t;
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
    // EVENTOS (delegación: data-accion)
    // ═══════════════════════════════════════════════════════════════════════

    _bindEvents() {
      const r = this.shadowRoot;
      r.addEventListener('click', (ev) => {
        // v1.0.5 — calendario de la próxima acción: abrir el selector del sistema
        if (ev.target && (ev.target.id === 'fFecha' || ev.target.id === 'fDia')) {   // v1.0.11: fDia
          try { if (typeof ev.target.showPicker === 'function') ev.target.showPicker(); } catch (_) {}
          return;
        }
        const el = ev.target.closest('[data-accion]');
        if (!el || el.disabled) return;
        const a = el.dataset.accion;
        const arg = el.dataset.arg;
        switch (a) {
          case 'inicio': this._pararGrabacion(true); this._inicio(); break;
          case 'nuevaVisita': this._nuevaVisita(); break;
          case 'heLlegado': this._heLlegado(); break;
          case 'avisos': this._abrirAvisos(); break;   // v1.0.9
          case 'abrirVisita': this._abrirVisitaDeHoy(arg); break;
          case 'masTarde': this._inicio(); break;
          case 'contar': this._texto = ''; this._textoPrevio = ''; this._informe = null; this._grabacion = null; this._go('visit'); break;
          case 'escuchar': this._escuchar(); break;
          case 'terminarDictado': this._stopMic(); break;
          case 'escribir': this._go('pick'); setTimeout(() => { const i = r.getElementById('fBuscar'); if (i) i.focus(); }, 50); break;
          case 'elegir': {
            const lista = [].concat(this._coincidencias, this._resultadosEscritos, this._parecidos);
            const c = lista.find((x) => x.contactId === arg);
            if (c) this._elegirCliente(c);
            break;
          }
          case 'clienteNuevo': this._abrirNuevoCliente(); break;
          case 'crearCliente': this._leerFormularioNuevo(); this._crearCliente({}); break;
          case 'crearConfirmado': this._crearCliente({ confirmado: true }); break;
          case 'crearIgualmente': this._crearCliente({ confirmado: true, allowDuplicates: true }); break;
          case 'volverNuevo': this._go('nuevo'); break;
          case 'grabar': this._empezarGrabacion(); break;
          case 'terminar': this._terminarGrabacion(); break;
          case 'reintentar': this._reintentar(); break;
          case 'cambiarRes': this._resOpen = !this._resOpen; this._pintar(); break;
          case 'elegirRes': if (this._informe) { this._informe.resultado = arg; this._resOpen = false; this._cambiada = true; this._pintar(); } break;
          case 'confirmar': {
            const [i, v] = String(arg).split(':');
            const cf = this._informe && this._informe.confirmaciones && this._informe.confirmaciones[Number(i)];
            if (cf) { cf.respuesta = cf.respuesta === v ? '' : v; this._cambiada = true; this._pintar(); }
            break;
          }
          case 'corregir': this._corregir(); break;
          case 'ticket': this._abrirCamaraTicket(); break;               // v1.0.5
          case 'guardarTicket': this._guardarTicket(); break;
          case 'calendario': this._anadirCalendario(); break;               // v1.0.6
          case 'volverInforme': this._ticketLeido = null; this._go('report'); break;
          case 'enviar': this._enviar(); break;
          default: break;
        }
      });
      r.addEventListener('input', (ev) => {
        if (ev.target && ev.target.id === 'fBuscar') this._alEscribir(ev.target.value);
      });
      // v1.0.5 — foto del ticket y fecha de la próxima acción
      r.addEventListener('change', (ev) => {
        const t = ev.target;
        if (!t) return;
        if (t.id === 'fTicket') {
          const f = t.files && t.files[0];
          t.value = '';
          if (f) this._leerTicket(f);
        } else if (t.id === 'fDia') {   // v1.0.11
          this._elegirDia(t.value);
        } else if (t.id === 'fFecha' && this._informe) {
          const pa = Object.assign({}, this._informe.proxima_accion || {});
          pa.fecha = t.value || null;
          this._informe.proxima_accion = pa;
          this._cambiada = true;
          this._pintar();
        }
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PINTAR
    // ═══════════════════════════════════════════════════════════════════════

    _pintar() {
      const box = this.shadowRoot.getElementById('pantalla');
      if (!box) return;
      const fn = {
        cargando: () => this._vCargando(),
        sinacceso: () => this._vSinAcceso(),
        home: () => this._vHome(false),
        arrived: () => this._vHome(true),
        pick: () => this._vPick(),
        listening: () => this._vListening(),
        buscando: () => this._vBuscando(),
        matches: () => this._vMatches(),
        nomatch: () => this._vNoMatch(),
        nuevo: () => this._vNuevo(),
        duplicados: () => this._vDuplicados(),
        telefonoDuplicado: () => this._vTelefonoDuplicado(),
        visit: () => this._vVisit(),
        rec: () => this._vRec(),
        prep: () => this._vPrep(),
        error: () => this._vError(),
        report: () => this._vReport(),
        sent: () => this._vSent(),
        offline: () => this._vOffline(),
        leyendoTicket: () => this._vLeyendoTicket(),   // v1.0.5
        ticket: () => this._vTicket(),
        badticket: () => this._vBadTicket(),
        avisos: () => this._vAvisos()   // v1.0.9
      }[this._screen] || (() => '');
      // v1.0.5: si se repinta la misma pantalla, se conserva el desplazamiento
      const misma = this._ultimaPintada === this._screen;
      const prev = box.querySelector('.scroll');
      const y = misma && prev ? prev.scrollTop : 0;
      box.innerHTML = fn();
      this._ultimaPintada = this._screen;
      if (this._screen === 'pick') this._pintarResultadosEscritos();
      box.scrollTop = 0;
      if (y) { const nuevo = box.querySelector('.scroll'); if (nuevo) nuevo.scrollTop = y; }
    }

    _cabecera(titulo, subtitulo) {
      return `<div class="cab">
        <button class="atras" data-accion="inicio" aria-label="Volver al inicio">${ico('back')}</button>
        <div class="cab-t">${subtitulo ? `<span class="cab-sub">${this._escape(subtitulo)}</span>` : ''}<span class="cab-tit">${this._escape(titulo)}</span></div>
      </div>`;
    }

    _vCargando() {
      return `<div class="centro full"><span class="fruta">${ico('citrus')}</span><div class="t-gris">Cargando…</div></div>`;
    }

    _vSinAcceso() {
      return `<div class="centro full g18 pad">
        <span class="disco disco-gris">${ico('lock')}</span>
        <div class="t-titulo">No tienes acceso</div>
        <div class="t-texto">${this._escape(this._errorAcceso)}</div>
      </div>`;
    }

    _vHome(conHoja) {
      const c = this._comercial || {};
      const foto = c.foto
        ? `<div class="foto" style="background-image:url('${this._escape(c.foto)}')"></div>`
        : `<div class="foto foto-ini">${this._escape(inicial(c.nombre))}</div>`;
      const ST = {
        llegada:  { st: 'Falta el informe', icon: 'pin', cls: 'st-pin' },
        enviada:  { st: 'Enviada', icon: 'check', cls: 'st-ok' },
        dudas:    { st: 'Con dudas', icon: 'help', cls: 'st-dudas' },
        pendiente:{ st: 'Pendiente de enviar', icon: 'clock', cls: 'st-pend' },
        borrador: { st: 'Sin enviar · toca para seguir', icon: 'redo', cls: 'st-pin' }
      };
      const b = this._dia ? null : this._borrador;   // v1.0.11: borrador y pendientes, solo en hoy
      const borr = b ? [{ id: '__borrador', cliente: b.cliente.negocio || b.cliente.persona, hora: b.hora, estado: 'borrador' }] : [];
      const pend = (this._dia ? [] : leerPendientes()).map((p) => ({ id: p.envioId, cliente: p.cliente, hora: p.hora, estado: 'pendiente' }));
      const lista = borr.concat(pend, this._visitas.map((v) => Object.assign({}, v, { estado: v.estado === 'enviada' && v.conDudas ? 'dudas' : v.estado })));
      const tarjetas = lista.map((v) => {
        const s = ST[v.estado] || ST.enviada;
        // v1.0.4: también las enviadas (y con dudas): se abre su informe
        const abre = true;
        return `<button class="tarjeta" ${abre ? `data-accion="abrirVisita" data-arg="${this._escape(v.id)}"` : 'tabindex="-1"'}>
          <span class="t-ico ${s.cls}">${ico(s.icon)}</span>
          <span class="t-cuerpo"><span class="t-nom">${this._escape(v.cliente || '—')}</span><span class="t-est ${s.cls}-t">${this._escape(v.hora || '')} · ${s.st}</span></span>
          <span class="t-chev">${abre ? ico('chev') : ''}</span>
        </button>`;
      }).join('') || `<div class="vacio">${this._dia ? 'No hay visitas ese día.' : 'Aún no hay visitas hoy.'}</div>`;

      let hoja = '';
      if (conHoja) {
        const nombre = this._cliente ? (this._cliente.negocio || this._cliente.persona) : '';
        hoja = `<div class="velo" data-accion="masTarde"></div>
        <div class="hoja">
          <div class="asa"></div>
          <span class="ok-grande">${ico('check')}</span>
          <div class="hoja-t">
            <div class="hoja-sub"><span class="i18 verde">${ico('pin')}</span>Ubicación y hora guardadas</div>
            <div class="hoja-tit">Llegada a ${this._escape(nombre)} <span class="nowrap">· ${this._escape(hhmm(new Date(this._llegadaTs || Date.now())))} ✓</span></div>
          </div>
          <button class="btn btn-fucsia btn-88" data-accion="contar"><span class="i34">${ico('mic')}</span>Contar la visita</button>
          <button class="btn btn-borde btn-64" data-accion="masTarde">Más tarde</button>
        </div>`;
      }

      return `<div class="scroll home">
        <div class="yo">${foto}<div class="yo-t"><div class="yo-nom">${this._escape(c.nombre || '')}</div><div class="yo-fecha">${this._escape(this._dia ? diaLargo(this._dia) : hoyTexto())}</div></div><button class="info-b" data-accion="avisos" aria-label="Avisos">${ico('info')}${this._avisosSinVer() ? '<span class="info-dot"></span>' : ''}</button></div>
        <button class="nueva" data-accion="nuevaVisita"><span class="nueva-ico"><span class="i36">${ico('plus')}</span></span><span>Nueva visita</span></button>
        <button class="llegue" data-accion="heLlegado"><span class="i32">${ico('pin')}</span><span>He llegado</span></button>
        <div class="seccion-fila"><div class="seccion">${this._dia ? 'Visitas del día' : 'Visitas de hoy'}</div><label class="dia-b" aria-label="Elegir día">${ico('calendar')}<input id="fDia" class="cal-in" type="date" max="${hoyIso()}" value="${this._dia || hoyIso()}"></label></div>
        <div class="lista">${tarjetas}</div>
      </div>${hoja}`;
    }

    // v1.0.9 — avisos de la empresa
    _vAvisos() {
      const lista = this._avisos.map((a) => `<div class="aviso">
          <div class="aviso-f">${this._escape(diaTexto(a.fecha))}</div>
          <div class="aviso-m">${this._escape(a.mensaje)}</div>
        </div>`).join('') || '<div class="vacio">No hay avisos.</div>';
      return `<div class="col">
        <div class="scroll grow">
          ${this._cabecera('Avisos')}
          <div class="col g14 pad-r">${lista}</div>
        </div>
      </div>`;
    }

    _vPick() {
      const titulo = this._modo === 'llegada' ? '¿Dónde has llegado?' : '¿Qué cliente?';
      return `<div class="col">
        ${this._cabecera(titulo)}
        <div class="centro grow g28">
          <button class="mic-176" data-accion="escuchar" aria-label="Decir el nombre del cliente">${ico('mic')}</button>
          <div class="t-26">Di el nombre del cliente</div>
        </div>
        <div class="pie">
          <label class="buscador"><span class="i24">${ico('search')}</span><input id="fBuscar" type="search" autocomplete="off" placeholder="Escribir el nombre" value="${this._escape(this._escrito)}"></label>
          <div id="escritos"></div>
          <button class="btn btn-gris btn-64" data-accion="clienteNuevo"><span class="i24">${ico('plus')}</span>Cliente nuevo</button>
        </div>
      </div>`;
    }

    _pintarResultadosEscritos() {
      const box = this.shadowRoot.getElementById('escritos');
      if (!box) return;
      const q = this._escrito.trim();
      if (q.length < 2) { box.innerHTML = ''; return; }
      if (this._buscando && !this._resultadosEscritos.length) { box.innerHTML = '<div class="nota">Buscando…</div>'; return; }
      if (!this._resultadosEscritos.length) { box.innerHTML = '<div class="nota">No encuentro ese cliente</div>'; return; }
      box.innerHTML = `<div class="hits">${this._resultadosEscritos.map((c) => `
        <button class="hit" data-accion="elegir" data-arg="${this._escape(c.contactId)}"><span class="hit-t"><span class="hit-n">${this._escape(c.negocio || c.persona)}</span>${this._lineaFiscal(c)}</span><span class="hit-z">${this._escape(this._subCliente(c))}</span></button>`).join('')}</div>`;
    }

    _vListening() {
      return `<div class="col">
        ${this._cabecera(this._modo === 'llegada' ? '¿Dónde has llegado?' : '¿Qué cliente?')}
        <div class="centro grow g40 pad">
          <div class="dicho">«<span id="dicho">${this._escape(this._dicho)}</span><span class="cursor">|</span>»</div>
          <button class="mic-pulso" data-accion="terminarDictado" aria-label="Terminar">
            <span class="onda"></span><span class="onda o2"></span><span class="mic-176 fijo">${ico('mic')}</span>
          </button>
          <div class="escucho" id="estadoMic"><span class="punto"></span><span id="estadoMicTxt">Preparando micrófono…</span></div>
        </div>
      </div>`;
    }

    _vBuscando() {
      return `<div class="col">${this._cabecera('¿Qué cliente?')}
        <div class="centro grow g28 pad"><span class="fruta">${ico('citrus')}</span><div class="t-gris">Buscando «${this._escape(this._dicho)}»…</div></div></div>`;
    }

    // v1.0.3 — nombre fiscal (llega como `persona`) cuando no repite el comercial
    _lineaFiscal(c) {
      const f = String(c.persona || '').trim();
      if (!f || !c.negocio || f.toUpperCase() === String(c.negocio).trim().toUpperCase()) return '';
      return `<span class="m-f">${this._escape(f)}</span>`;
    }

    _subCliente(c) {
      const partes = [];
      if (c.direccion) partes.push(c.direccion);   // v1.0.3: el nombre fiscal va en su propia línea
      const d = distanciaM(this._posicion, c.ubicacion);
      if (d !== null) partes.push(`a ${textoDistancia(d)}`);
      if (c.tipo === 'prospecto') partes.push('nuevo');
      return partes.join(' · ');
    }

    _vMatches() {
      const cards = this._coincidencias.map((c, n) => `
        <button class="match ${n === 0 ? 'mejor' : ''}" data-accion="elegir" data-arg="${this._escape(c.contactId)}">
          ${n === 0 ? '<span class="badge">Más probable</span>' : ''}
          <span class="m-ini">${this._escape(inicial(c.negocio || c.persona))}</span>
          <span class="m-t"><span class="m-n">${this._escape(c.negocio || c.persona)}</span>${this._lineaFiscal(c)}<span class="m-z">${this._escape(this._subCliente(c))}</span></span>
          <span class="m-ok">${ico('check')}</span>
        </button>`).join('');
      return `<div class="col">
        ${this._cabecera('¿Es este?')}
        <div class="col grow g12 pad-l scroll">
          <div class="nota">Has dicho: <b>«${this._escape(this._dicho)}»</b></div>
          ${cards}
          <div class="grow"></div>
          <button class="btn btn-borde btn-64" data-accion="escuchar"><span class="i24">${ico('mic')}</span>Ninguno, repetir</button>
          <button class="btn btn-gris btn-64" data-accion="clienteNuevo"><span class="i24">${ico('plus')}</span>Cliente nuevo</button>
        </div>
      </div>`;
    }

    _vNoMatch() {
      return `<div class="col">
        ${this._cabecera('¿Qué cliente?')}
        <div class="centro grow g18 pad">
          <span class="disco disco-gris">${ico('searchX')}</span>
          <div class="t-titulo">No encuentro ese cliente</div>
          <div class="t-texto">Has dicho: <b>«${this._escape(this._dicho)}»</b></div>
        </div>
        <div class="pie">
          <button class="btn btn-fucsia btn-80" data-accion="escuchar"><span class="i30">${ico('mic')}</span>Repetir</button>
          <button class="btn btn-borde btn-72" data-accion="escribir"><span class="i26">${ico('pencil')}</span>Escribir</button>
          <button class="btn btn-gris btn-64" data-accion="clienteNuevo"><span class="i24">${ico('plus')}</span>Cliente nuevo</button>
        </div>
      </div>`;
    }

    _vNuevo() {
      const f = this._nuevoCliente || {};
      const campo = (id, label, valor, tipo, oblig) => `<label class="campo"><span class="campo-l">${label}${oblig ? ' *' : ''}</span><input id="${id}" type="${tipo || 'text'}" value="${this._escape(valor)}" autocomplete="off"></label>`;
      return `<div class="col">
        ${this._cabecera('Cliente nuevo')}
        <div class="scroll grow pad-l g14 col">
          ${campo('fNegocio', 'Nombre del negocio', f.negocio, 'text', true)}
          ${campo('fTelefono', 'Teléfono', f.telefono, 'tel', true)}
          ${campo('fDireccion', 'Dirección', f.direccion)}
          <div class="aviso-loc"><span class="i22">${ico('pin')}</span>Se guarda tu ubicación actual como la del cliente.</div>
        </div>
        <div class="pie"><button class="btn btn-fucsia btn-80" data-accion="crearCliente"><span class="i30">${ico('check')}</span>Dar de alta</button></div>
      </div>`;
    }

    _vDuplicados() {
      const cards = this._parecidos.map((c) => `
        <button class="match" data-accion="elegir" data-arg="${this._escape(c.contactId)}">
          <span class="m-ini">${this._escape(inicial(c.negocio || c.persona))}</span>
          <span class="m-t"><span class="m-n">${this._escape(c.negocio || c.persona)}</span>${this._lineaFiscal(c)}<span class="m-z">${this._escape(this._subCliente(c))}</span></span>
          <span class="m-ok">${ico('check')}</span>
        </button>`).join('');
      return `<div class="col">
        ${this._cabecera('¿Es alguno de estos?')}
        <div class="col grow g12 pad-l scroll">
          <div class="nota">Ya hay clientes con un nombre muy parecido.</div>
          ${cards}
          <div class="grow"></div>
          <button class="btn btn-borde btn-64" data-accion="crearConfirmado">No, es otro: darlo de alta</button>
        </div>
      </div>`;
    }

    _vTelefonoDuplicado() {
      return `<div class="col">
        ${this._cabecera('Cliente nuevo')}
        <div class="centro grow g18 pad">
          <span class="disco disco-fucsia">${ico('alert')}</span>
          <div class="t-titulo">Ese teléfono ya está en otro contacto</div>
          <div class="t-texto">Comprueba que no es el mismo cliente.</div>
        </div>
        <div class="pie">
          <button class="btn btn-borde btn-72" data-accion="volverNuevo">Corregir el teléfono</button>
          <button class="btn btn-gris btn-64" data-accion="crearIgualmente">Darlo de alta igualmente</button>
        </div>
      </div>`;
    }

    _subVisita() {
      if (this._llegadaTs) return `En el cliente · ${hhmm(new Date(this._llegadaTs))}`;
      const c = this._cliente || {};
      return c.direccion || '';
    }

    _vVisit() {
      const c = this._cliente || {};
      const corrigiendo = !!this._textoPrevio;
      const sub = this._subVisita();
      return `<div class="col">
        <div class="cab">
          <button class="atras" data-accion="inicio" aria-label="Volver al inicio">${ico('back')}</button>
          <div class="cab-t"><span class="cab-tit">${this._escape(c.negocio || c.persona || '')}</span>${sub ? `<span class="cab-sub2"><span class="i18 verde">${ico('pin')}</span>${this._escape(sub)}</span>` : ''}</div>
        </div>
        <div class="centro grow g30 pb120">
          <button class="mic-220" data-accion="grabar" aria-label="Empezar a grabar">${ico('mic')}</button>
          <div class="centro g6">
            <div class="t-28">${corrigiendo ? 'Cuéntame la corrección' : 'Cuéntame la visita'}</div>
            <div class="t-gris17">Toca el micro y habla con calma</div>
          </div>
        </div>
      </div>`;
    }

    _vRec() {
      const c = this._cliente || {};
      const barras = [10, 22, 34, 18, 40, 28, 14, 36, 24, 44, 20, 32, 16, 38, 26, 12, 30, 22]
        .map((h, n) => `<span class="barra" style="height:${h}px;animation-delay:${(n % 6) * 0.12}s"></span>`).join('');
      return `<div class="col">
        <div class="rec-cab"><span class="cab-tit">${this._escape(c.negocio || c.persona || '')}</span><span class="grabando"><span class="punto"></span>Grabando</span></div>
        <div class="centro grow g28">
          <div class="mic-pulso m200"><span class="onda lenta"></span><span class="onda lenta o2"></span><span class="mic-200 fijo">${ico('mic')}</span></div>
          <div class="reloj" id="reloj">${mmss(this._trans ? Date.now() - this._trans.inicio : 0)}</div>
          <div class="barras">${barras}</div>
        </div>
        <div class="pie pb36"><button class="btn btn-oscuro btn-88" data-accion="terminar"><span class="i30">${ico('stop')}</span>Terminar</button></div>
      </div>`;
    }

    _pasosHtml() {
      return ['Escuchando', 'Escribiendo', 'Preparando el informe'].map((label, n) => {
        const done = n < this._paso, cur = n === this._paso;
        const marca = done ? `<span class="p-ok">${ico('check')}</span>` : cur ? '<span class="p-cur"><span></span></span>' : '<span class="p-todo"></span>';
        return `<div class="paso ${done ? 'hecho' : cur ? 'actual' : ''}">${marca}${label}</div>`;
      }).join('');
    }
    _pintarPasos() {
      const el = this.shadowRoot.getElementById('pasos');
      if (el) el.innerHTML = this._pasosHtml();
    }

    _vPrep() {
      return `<div class="centro full g44 pad pb80">
        <div class="rodar"><span class="fruta-rueda">${ico('citrus')}</span><span class="suelo"></span></div>
        <div class="t-28 tc">Preparando el informe</div>
        <div class="pasos" id="pasos">${this._pasosHtml()}</div>
      </div>`;
    }

    _vError() {
      return `<div class="col">
        <div class="centro grow g20 pad">
          <span class="disco disco-fucsia">${ico('alert')}</span>
          <div class="t-titulo">No he podido preparar el informe</div>
          <div class="guardada"><span class="i28">${ico('checkC')}</span><span>Tu grabación está guardada. No se ha perdido nada.</span></div>
        </div>
        <div class="pie">
          <button class="btn btn-fucsia btn-88" data-accion="reintentar"><span class="i30">${ico('redo')}</span>Reintentar</button>
          <button class="btn btn-borde btn-68" data-accion="inicio">Más tarde</button>
        </div>
      </div>`;
    }

    _ubicacionTexto() {
      const G = this._grabacion || {};
      const yo = G.coord || this._posicion;
      const cli = this._cliente && this._cliente.ubicacion;
      const partes = [];
      if (this._llegadaTs) partes.push(`Llegada ${hhmm(new Date(this._llegadaTs))}`);
      if (yo && cli) {
        const d = distanciaM(yo, cli);
        partes.push(d <= MARGEN_CLIENTE_M ? 'en el cliente ✓' : `a ${textoDistancia(d)} del cliente`);
      } else if (yo) {
        partes.push(yo.precision ? `ubicación guardada · ±${yo.precision} m` : 'ubicación guardada');
      } else {
        partes.push('sin ubicación');
      }
      const t = partes.join(' · ');
      return t.charAt(0).toUpperCase() + t.slice(1);
    }

    _vReport() {
      const c = this._cliente || {};
      const inf = this._informe || {};
      const res = RESULTADOS.find((r) => r.k === inf.resultado) || RESULTADOS[RESULTADOS.length - 1];
      const opciones = RESULTADOS.map((r) => `<button class="res-op ${r.k === inf.resultado ? 'sel' : ''}" data-accion="elegirRes" data-arg="${r.k}"><span class="res-op-i" style="background:${r.bg}">${ico(r.icon)}</span>${r.label}</button>`).join('');
      const nivel = NIVEL_INTERES[inf.interes] || 0;
      const barras = [1, 2, 3].map((n) => `<span class="int-b ${n <= nivel ? 'on' : ''}"></span>`).join('');
      const chips = (lista, campo) => (lista || []).map((v) => `<span class="chip">${this._escape(etiqueta(campo, v))}</span>`).join('');
      const alertas = (inf.alertas || []).map((v) => v === 'oportunidad'
        ? `<span class="chip chip-op"><span class="i22">${ico('trend')}</span>${this._escape(etiqueta('alertas', v))}</span>`
        : `<span class="chip chip-al"><span class="i22">${ico('alert')}</span>${this._escape(etiqueta('alertas', v))}</span>`).join('');
      const pedido = inf.pedido && inf.pedido.hay
        ? `<div class="fila"><span class="t-gris16">Pedido</span><span class="fila-v">${this._escape(inf.pedido.descripcion || 'Sí')}${inf.pedido.importe_eur !== null && inf.pedido.importe_eur !== undefined ? ` · ${this._escape(Number(inf.pedido.importe_eur).toLocaleString('es-ES'))} €` : ''}</span></div>` : '';
      const productos = (inf.productos || []).length ? `<div class="sub-t">Productos</div><div class="chips">${(inf.productos || []).map((p) => `<span class="chip">${this._escape(p)}</span>`).join('')}</div>` : '';
      const objeciones = (inf.objeciones || []).length ? `<div class="sub-t">Objeciones</div><div class="chips">${chips(inf.objeciones, 'objeciones')}</div>` : '';
      const bloqueAlertas = (inf.alertas || []).length ? `<div class="sub-t">Alertas</div><div class="chips">${alertas}</div>` : '';
      const pa = inf.proxima_accion || {};
      let cal = '<span class="cal-d">?</span><span class="cal-p">Por fijar</span>';
      if (pa.fecha && /^\d{4}-\d{2}-\d{2}$/.test(pa.fecha)) {
        const [, m, d] = pa.fecha.split('-').map(Number);
        cal = `<span class="cal-d">${d}</span><span class="cal-p">${MESES_CORTOS[m - 1]}</span>`;
      }
      const sg = inf.sugerencia_ia || {};
      const confs = (inf.confirmaciones || []).map((cf, i) => `
        <div class="conf">
          <div class="conf-q">${this._escape(cf.pregunta)}</div>
          <div class="conf-b">
            <button class="sn ${cf.respuesta === 'si' ? 'on' : ''}" data-accion="confirmar" data-arg="${i}:si"><span class="i22">${ico('check')}</span>Sí</button>
            <button class="sn ${cf.respuesta === 'no' ? 'on' : ''}" data-accion="confirmar" data-arg="${i}:no"><span class="i22">${ico('x')}</span>No</button>
          </div>
        </div>`).join('');
      const G = this._grabacion || {};
      const yo = G.coord || this._posicion;
      const mapa = yo ? `<a href="https://www.google.com/maps?q=${yo.lat},${yo.lon}" target="_blank" rel="noopener">Ver en el mapa</a>` : '';

      return `<div class="col">
        <div class="scroll grow">
          <div class="cab">
            <button class="atras" data-accion="inicio" aria-label="Volver al inicio">${ico('back')}</button>
            <div class="cab-t"><span class="cab-sub">Informe de la visita</span><span class="cab-tit">${this._escape(c.negocio || c.persona || '')}</span></div>
          </div>
          <div class="col g14 pad-r">
            <div class="caja g14">
              <div class="res">
                <span class="res-i" style="background:${res.bg}">${ico(res.icon)}</span>
                <span class="res-t"><span class="res-top"><span class="t-gris16">Resultado</span><button class="cambiar" data-accion="cambiarRes">Cambiar</button></span><span class="res-l">${res.label}</span></span>
              </div>
              ${this._resOpen ? `<div class="res-grid">${opciones}</div>` : ''}
              ${inf.resumen ? `<div class="resumen">${this._escape(inf.resumen)}</div>` : ''}
              ${pedido}
              <div class="fila borde"><span class="t-gris16">Interés del cliente</span><span class="int"><span class="int-bs">${barras}</span><span class="int-l">${this._escape(etiqueta('interes', inf.interes))}</span></span></div>
            </div>
            ${(productos || objeciones || bloqueAlertas) ? `<div class="caja g12">${productos}${objeciones}${bloqueAlertas}</div>` : ''}
            <div class="caja fila-pa">
              <label class="cal"><span class="cal-h">FECHA</span>${cal}<input id="fFecha" class="cal-in" type="date" value="${this._escape(pa.fecha || '')}" aria-label="Fecha de la próxima acción"></label>
              <span class="pa"><span class="t-gris16">Próxima acción</span><span class="pa-t">${this._escape(pa.descripcion || 'No has dicho ninguna')}</span>${pa.responsable ? `<span class="pa-r"><span class="i16">${ico('user')}</span>${this._escape(etiqueta('responsable', pa.responsable))}</span>` : ''}${pa.fecha ? `<button class="a-cal" data-accion="calendario"><span class="i18">${ico('clock')}</span>Añadir a mi calendario</button>` : ''}</span>
            </div>
            ${sg.descripcion ? `<div class="caja sug">
              <div class="sug-h"><span class="i22">${ico('sparkles')}</span>Sugerencia de la IA</div>
              <div class="sug-t">${this._escape(sg.descripcion)}${sg.responsable ? ` · ${this._escape(etiqueta('responsable', sg.responsable))}` : ''}</div>
              <div class="t-gris16">Esto no lo has dicho tú.</div>
            </div>` : ''}
            ${confs ? `<div class="caja g16"><div class="sub-t con-i"><span class="i20">${ico('help')}</span>Para confirmar</div>${confs}</div>` : ''}
            <div class="caja fila-loc">
              <span class="loc-i">${ico('pin')}</span>
              <span class="loc-t"><span class="loc-l">${this._escape(this._ubicacionTexto())}</span>${mapa}</span>
            </div>
            ${this._tarjetaTicket(inf.ticket)}
            <div class="fila-btns">
              <button class="btn btn-borde btn-72" data-accion="corregir"><span class="i24 fucsia">${ico('mic')}</span>Corregir</button>
              <button class="btn btn-gris btn-72" data-accion="ticket"><span class="i24">${ico('camera')}</span>${inf.ticket ? 'Otro ticket' : 'Añadir ticket'}</button>
            </div>
            <div class="aire"></div>
          </div>
        </div>
        <div class="barra-enviar"><button class="enviar" id="btnEnviar" data-accion="enviar">ENVIAR INFORME</button></div>
      </div>`;
    }

    _vSent() {
      const c = this._cliente || {};
      return `<div class="col">
        <div class="centro grow g26 pad">
          <div class="ok-envio"><span class="halo"></span><span class="ok-180">${ico('check')}</span></div>
          <div class="centro g6 aparece">
            <div class="t-32">Informe enviado</div>
            <div class="t-verde18">${this._escape(c.negocio || c.persona || '')} · ${this._escape(this._horaEnvio || hhmm())}</div>
          </div>
        </div>
        <div class="pie pb36"><button class="btn btn-azul btn-88" data-accion="inicio"><span class="i28">${ico('home')}</span>Volver al inicio</button></div>
      </div>`;
    }

    _vOffline() {
      return `<div class="col">
        <div class="centro grow g20 pad">
          <span class="disco disco-gris">${ico('wifiOff')}</span>
          <div class="t-30">Guardado en el móvil</div>
          <div class="t-texto">Se enviará solo cuando haya conexión.</div>
        </div>
        <div class="pie pb36"><button class="btn btn-azul btn-84" data-accion="inicio"><span class="i28">${ico('home')}</span>Volver al inicio</button></div>
      </div>`;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // RENDER (estructura fija + estilos)
    // ═══════════════════════════════════════════════════════════════════════

    _render() {
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
    color: ${C.tinta};
    background: ${C.fondo};
    -webkit-font-smoothing: antialiased;
    -webkit-tap-highlight-color: transparent;
  }
  * { box-sizing: border-box; }
  button { font: inherit; color: inherit; background: none; border: none; padding: 0; margin: 0; cursor: pointer; text-align: inherit; -webkit-tap-highlight-color: transparent; }
  button:focus-visible, input:focus-visible, a:focus-visible { outline: 3px solid ${C.verdeAz}; outline-offset: 2px; }
  a { color: ${C.verdeAz}; }
  svg { width: 100%; height: 100%; display: block; }

  @keyframes pulse { 0% { transform: scale(1); opacity: .55 } 100% { transform: scale(1.7); opacity: 0 } }
  @keyframes wave { 0%, 100% { transform: scaleY(.3) } 50% { transform: scaleY(1) } }
  @keyframes roll { 0% { transform: translateX(-90px) rotate(0) } 50% { transform: translateX(90px) rotate(360deg) } 100% { transform: translateX(-90px) rotate(0) } }
  @keyframes blink { 0%, 100% { opacity: 1 } 50% { opacity: .25 } }
  @keyframes pop { 0% { transform: scale(.6); opacity: 0 } 60% { transform: scale(1.08); opacity: 1 } 100% { transform: scale(1) } }
  @keyframes up { 0% { transform: translateY(100%) } 100% { transform: translateY(0) } }
  @keyframes fade { 0% { opacity: 0 } 100% { opacity: 1 } }
  @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .01s !important; animation-iteration-count: 1 !important; } }

  .app { position: relative; height: 100%; max-width: 520px; margin: 0 auto; background: ${C.fondo}; overflow: hidden; }
  #pantalla { position: absolute; top: env(safe-area-inset-top); left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; }
  .col { display: flex; flex-direction: column; min-height: 0; }
  #pantalla > .col { flex: 1; }
  .grow { flex: 1; min-height: 0; }
  .full { flex: 1; }
  .centro { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
  .scroll { overflow-y: auto; -webkit-overflow-scrolling: touch; }
  .pad { padding: 0 28px; }
  .pad-l { padding: 4px 20px 28px; }
  .pad-r { padding: 8px 16px 20px; }
  .pb36 { padding-bottom: calc(36px + env(safe-area-inset-bottom)) !important; }
  .pb80 { padding-bottom: 80px; }
  .pb120 { padding-bottom: 120px; }
  .g6 { gap: 6px; } .g12 { gap: 12px; } .g14 { gap: 14px; } .g16 { gap: 16px; } .g18 { gap: 18px; } .g20 { gap: 20px; }
  .g26 { gap: 26px; } .g28 { gap: 28px; } .g30 { gap: 30px; } .g40 { gap: 40px; } .g44 { gap: 44px; }
  .tc { text-align: center; }
  .nowrap { white-space: nowrap; }
  .i16, .i18, .i20, .i22, .i24, .i26, .i28, .i30, .i32, .i34, .i36 { display: inline-flex; flex: none; }
  .i16 { width: 16px; height: 16px; } .i18 { width: 18px; height: 18px; } .i20 { width: 20px; height: 20px; } .i22 { width: 22px; height: 22px; }
  .i24 { width: 24px; height: 24px; } .i26 { width: 26px; height: 26px; } .i28 { width: 28px; height: 28px; } .i30 { width: 30px; height: 30px; }
  .i32 { width: 32px; height: 32px; } .i34 { width: 34px; height: 34px; } .i36 { width: 36px; height: 36px; }
  .verde { color: ${C.verdeMed}; } .fucsia { color: ${C.fucsia}; }

  .t-gris { font-size: 18px; color: ${C.gris}; }
  .t-gris16 { font-size: 16px; color: ${C.gris}; }
  .t-gris17 { font-size: 17px; color: ${C.gris}; }
  .t-26 { font-size: 26px; font-weight: 700; color: ${C.verdeNeg}; }
  .t-28 { font-size: 28px; font-weight: 700; color: ${C.verdeNeg}; }
  .t-30 { font-size: 30px; font-weight: 700; color: ${C.verdeNeg}; }
  .t-32 { font-size: 32px; font-weight: 700; color: ${C.verdeNeg}; }
  .t-titulo { font-size: 28px; font-weight: 700; color: ${C.verdeNeg}; line-height: 1.2; }
  .t-texto { font-size: 18px; color: ${C.tinta}; line-height: 1.45; }
  .t-verde18 { font-size: 18px; color: ${C.verdeOsc}; font-weight: 600; }
  .nota { font-size: 16px; color: ${C.gris}; padding: 4px; }
  .nota b { color: ${C.tinta}; font-weight: 600; }
  .vacio { font-size: 16px; color: ${C.gris}; padding: 8px 4px; }

  /* Botones genéricos */
  .btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 12px; font-weight: 700; transition: transform .1s; flex: none; }
  .btn:active, .nueva:active, .llegue:active, .enviar:active { transform: scale(.97); }
  .btn-fucsia { background: ${C.fucsia}; color: ${C.blanco}; border-radius: 24px; font-size: 22px; }
  .btn-borde { border: 2px solid ${C.verdeAz}; background: ${C.blanco}; color: ${C.verdeAz}; border-radius: 22px; font-size: 19px; }
  .btn-gris { border: 2px solid ${C.linea}; background: ${C.blanco}; color: ${C.verdeOsc}; border-radius: 20px; font-size: 18px; }
  .btn-oscuro { background: ${C.verdeNeg}; color: ${C.blanco}; border-radius: 26px; font-size: 24px; }
  .btn-azul { background: ${C.verdeAz}; color: ${C.blanco}; border-radius: 26px; font-size: 23px; }
  .btn-64 { min-height: 64px; } .btn-68 { min-height: 68px; } .btn-72 { min-height: 72px; } .btn-80 { min-height: 80px; } .btn-84 { min-height: 84px; } .btn-88 { min-height: 88px; }
  .btn-fucsia.btn-88 { border-radius: 26px; font-size: 24px; }
  .pie { flex: none; padding: 0 20px calc(28px + env(safe-area-inset-bottom)); display: flex; flex-direction: column; gap: 12px; }

  /* Cabecera de pantalla */
  .cab { flex: none; display: flex; align-items: center; gap: 10px; padding: 8px 12px 4px; min-height: 72px; }
  .atras { width: 64px; height: 64px; flex: none; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: ${C.verdeOsc}; }
  .atras:active { background: ${C.linea}; }
  .atras svg { width: 30px; height: 30px; }
  .cab-t { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .cab-sub { font-size: 16px; color: ${C.gris}; }
  .cab-tit { font-size: 21px; font-weight: 700; color: ${C.verdeNeg}; }
  .cab-sub2 { font-size: 16px; color: ${C.verdeOsc}; font-weight: 600; display: flex; align-items: center; gap: 6px; }

  /* Inicio */
  .home { position: absolute; inset: 0; display: flex; flex-direction: column; gap: 16px; padding: 16px 20px calc(20px + env(safe-area-inset-bottom)); }
  .yo { display: flex; align-items: center; gap: 16px; }
  .foto { width: 76px; height: 76px; flex: none; border-radius: 50%; background-color: ${C.fucsia}; background-size: cover; background-position: center top; box-shadow: 0 0 0 3px ${C.blanco}, 0 0 0 5px ${C.verdeCla}; }
  .foto-ini { display: flex; align-items: center; justify-content: center; color: ${C.blanco}; font-size: 32px; font-weight: 700; }
  .yo-t { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .yo-nom { font-size: 22px; font-weight: 700; color: ${C.verdeNeg}; line-height: 1.15; }
  .yo-fecha { font-size: 16px; color: ${C.gris}; }
  .nueva { height: 116px; flex: none; border-radius: 28px; background: ${C.fucsia}; color: ${C.blanco}; display: flex; align-items: center; gap: 18px; padding: 0 24px; box-shadow: 0 14px 28px -14px rgba(232,10,77,.7); font-size: 28px; font-weight: 700; transition: transform .1s; }
  .nueva-ico { width: 64px; height: 64px; flex: none; border-radius: 50%; background: rgba(255,255,255,.2); display: flex; align-items: center; justify-content: center; }
  .llegue { height: 80px; flex: none; border-radius: 24px; background: ${C.verdeAz}; color: ${C.blanco}; display: flex; align-items: center; gap: 16px; padding: 0 24px; font-size: 22px; font-weight: 700; transition: transform .1s; }
  /* v1.0.9 — avisos */
  .info-b { position: relative; width: 52px; height: 52px; flex: none; margin-left: auto; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: ${C.verdeAz}; }
  .info-b svg { width: 34px; height: 34px; }
  .info-dot { position: absolute; top: 6px; right: 6px; width: 14px; height: 14px; border-radius: 50%; background: ${C.fucsia}; box-shadow: 0 0 0 2px ${C.fondo}; }
  .aviso { border-radius: 20px; background: ${C.blanco}; border: 1px solid ${C.linea}; padding: 14px 16px; display: flex; flex-direction: column; gap: 6px; }
  .aviso-f { font-size: 15px; font-weight: 600; color: ${C.gris}; }
  .aviso-m { font-size: 18px; line-height: 1.45; color: ${C.tinta}; white-space: pre-line; overflow-wrap: anywhere; }
  /* v1.0.11 — día de la lista */
  .seccion-fila { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 6px; }
  .seccion-fila .seccion { margin-top: 0; }
  .dia-b { position: relative; width: 44px; height: 44px; flex: none; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: ${C.verdeAz}; cursor: pointer; }
  .dia-b svg { width: 28px; height: 28px; }
  .seccion { font-size: 18px; font-weight: 700; color: ${C.verdeNeg}; margin-top: 6px; }
  .lista { display: flex; flex-direction: column; gap: 10px; }
  .tarjeta { min-height: 76px; border-radius: 20px; background: ${C.blanco}; border: 1px solid ${C.linea}; display: flex; align-items: center; gap: 14px; padding: 10px 14px; width: 100%; flex: none; }
  .tarjeta:active { background: ${C.fondo}; }
  .t-ico { width: 48px; height: 48px; flex: none; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
  .t-ico svg { width: 26px; height: 26px; }
  .t-cuerpo { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .t-nom { font-size: 17px; font-weight: 700; color: ${C.tinta}; }
  .t-est { font-size: 16px; font-weight: 600; }
  .t-chev { width: 22px; height: 22px; flex: none; color: ${C.gris}; display: flex; }
  .st-pin { background: ${C.fucsia}; color: ${C.blanco}; } .st-pin-t { color: ${C.fucsia}; }
  .st-ok { background: ${C.verdeMed}; color: ${C.blanco}; } .st-ok-t { color: ${C.verdeOsc}; }
  .st-pend { background: ${C.linea}; color: ${C.tinta}; } .st-pend-t { color: ${C.gris}; }
  .st-dudas { background: ${C.verdeCla}; color: ${C.verdeNeg}; } .st-dudas-t { color: ${C.verdeAz}; }

  /* Hoja «He llegado» */
  .velo { position: absolute; inset: 0; background: rgba(18,32,31,.45); animation: fade .2s both; }
  .hoja { position: absolute; left: 0; right: 0; bottom: 0; background: ${C.blanco}; border-radius: 32px 32px 0 0; padding: 20px 20px calc(34px + env(safe-area-inset-bottom)); display: flex; flex-direction: column; align-items: center; gap: 18px; text-align: center; animation: up .3s ease-out both; }
  .asa { width: 44px; height: 5px; border-radius: 3px; background: ${C.linea}; }
  .ok-grande { width: 96px; height: 96px; border-radius: 50%; background: ${C.verdeMed}; color: ${C.blanco}; display: flex; align-items: center; justify-content: center; animation: pop .5s ease-out .2s both; }
  .ok-grande svg { width: 52px; height: 52px; }
  .hoja-t { display: flex; flex-direction: column; gap: 4px; }
  .hoja-sub { font-size: 16px; font-weight: 600; color: ${C.gris}; display: flex; align-items: center; justify-content: center; gap: 6px; }
  .hoja-tit { font-size: 24px; font-weight: 700; color: ${C.verdeNeg}; line-height: 1.25; }

  /* Micrófonos */
  .mic-176, .mic-200, .mic-220 { border-radius: 50%; background: ${C.fucsia}; color: ${C.blanco}; display: flex; align-items: center; justify-content: center; box-shadow: 0 20px 40px -16px rgba(232,10,77,.7); transition: transform .1s; flex: none; }
  .mic-176 { width: 176px; height: 176px; } .mic-176 svg { width: 80px; height: 80px; }
  .mic-200 { width: 200px; height: 200px; } .mic-200 svg { width: 88px; height: 88px; }
  .mic-220 { width: 220px; height: 220px; box-shadow: 0 24px 48px -18px rgba(232,10,77,.75); } .mic-220 svg { width: 96px; height: 96px; }
  .mic-176:active, .mic-220:active { transform: scale(.95); }
  .mic-pulso { position: relative; width: 176px; height: 176px; flex: none; }
  .mic-pulso.m200 { width: 200px; height: 200px; }
  .mic-pulso .fijo { position: absolute; inset: 0; width: auto; height: auto; box-shadow: none; }
  .onda { position: absolute; inset: 0; border-radius: 50%; background: ${C.fucsia}; animation: pulse 1.8s ease-out infinite; }
  .onda.o2 { animation-delay: .9s; }
  .onda.lenta { animation-duration: 2.4s; } .onda.lenta.o2 { animation-delay: 1.2s; }
  .dicho { font-size: 34px; font-weight: 700; color: ${C.verdeNeg}; line-height: 1.2; text-align: center; min-height: 120px; display: flex; align-items: center; justify-content: center; }
  .cursor { color: ${C.fucsia}; animation: blink 1s infinite; }
  .escucho, .grabando { display: flex; align-items: center; gap: 8px; font-weight: 600; }
  .escucho { font-size: 20px; color: ${C.gris}; }
  .escucho .punto { background: ${C.linea}; animation: none; }
  .escucho.activo { color: ${C.verdeNeg}; }
  .escucho.activo .punto { background: ${C.fucsia}; animation: blink 1s infinite; }
  .punto { width: 12px; height: 12px; border-radius: 50%; background: ${C.fucsia}; animation: blink 1s infinite; }
  .rec-cab { flex: none; display: flex; flex-direction: column; padding: 16px 24px 0; }
  .grabando { font-size: 16px; color: ${C.fucsia}; font-weight: 700; }
  .reloj { font-size: 48px; font-weight: 700; color: ${C.verdeNeg}; font-variant-numeric: tabular-nums; letter-spacing: .02em; }
  .barras { height: 48px; display: flex; align-items: center; gap: 5px; }
  .barra { width: 6px; border-radius: 3px; background: ${C.fucsia}; animation: wave .9s ease-in-out infinite; }

  /* Buscar cliente */
  .buscador { min-height: 64px; border-radius: 20px; background: ${C.blanco}; border: 2px solid ${C.linea}; display: flex; align-items: center; gap: 12px; padding: 0 18px; color: ${C.gris}; flex: none; }
  .buscador input { flex: 1; min-width: 0; border: none; outline: none; background: transparent; font: inherit; font-size: 18px; color: ${C.tinta}; }
  .hits { display: flex; flex-direction: column; gap: 8px; max-height: 220px; overflow-y: auto; }
  .hit { min-height: 64px; border-radius: 18px; background: ${C.blanco}; border: 1px solid ${C.linea}; padding: 10px 14px; display: flex; flex-direction: column; align-items: flex-start; gap: 2px; width: 100%; flex: none; text-align: left; }
  .hit-n { font-size: 17px; font-weight: 700; }
  .hit-z { font-size: 15px; color: ${C.verdeOsc}; }
  .match { min-height: 88px; border-radius: 24px; background: ${C.blanco}; border: 1px solid ${C.linea}; padding: 12px 16px; display: flex; align-items: center; gap: 14px; position: relative; width: 100%; flex: none; animation: fade .3s both; }
  .match.mejor { min-height: 108px; margin-top: 8px; background: ${C.verdeCla}; border: 3px solid ${C.verdeAz}; }
  .match:active { transform: scale(.98); }
  .badge { position: absolute; top: -12px; left: 16px; background: ${C.verdeAz}; color: ${C.blanco}; font-size: 14px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; padding: 3px 10px; border-radius: 999px; }
  .m-ini { width: 56px; height: 56px; flex: none; border-radius: 50%; background: ${C.fondo}; color: ${C.verdeOsc}; font-size: 26px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
  .mejor .m-ini { background: ${C.verdeOsc}; color: ${C.blanco}; }
  .m-t { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .m-n { font-size: 19px; font-weight: 700; color: ${C.verdeNeg}; }
  .m-z { font-size: 16px; color: ${C.verdeOsc}; }
  .m-f { font-size: 15px; font-weight: 600; color: ${C.gris}; overflow-wrap: anywhere; }
  .m-n, .m-z, .hit-n, .hit-z { overflow-wrap: anywhere; }
  .hit-t { display: flex; flex-direction: column; min-width: 0; }
  .m-ok { width: 52px; height: 52px; flex: none; border-radius: 50%; background: ${C.verdeAz}; color: ${C.blanco}; display: flex; align-items: center; justify-content: center; }
  .m-ok svg { width: 26px; height: 26px; }
  .disco { width: 120px; height: 120px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex: none; }
  .disco svg { width: 56px; height: 56px; }
  .disco-gris { background: ${C.linea}; color: ${C.tinta}; }
  .disco-fucsia { width: 140px; height: 140px; background: ${C.blanco}; border: 4px solid ${C.fucsia}; color: ${C.fucsia}; }
  .disco-fucsia svg { width: 64px; height: 64px; }

  /* Cliente nuevo */
  .campo { display: flex; flex-direction: column; gap: 6px; flex: none; }
  .campo-l { font-size: 16px; font-weight: 700; color: ${C.verdeOsc}; }
  .campo input { min-height: 60px; border-radius: 18px; border: 2px solid ${C.linea}; background: ${C.blanco}; padding: 0 16px; font: inherit; font-size: 18px; color: ${C.tinta}; outline: none; }
  .campo input:focus { border-color: ${C.verdeAz}; }
  .aviso-loc { display: flex; align-items: center; gap: 8px; font-size: 16px; color: ${C.verdeOsc}; font-weight: 600; }

  /* Preparando */
  .rodar { width: 260px; display: flex; flex-direction: column; align-items: center; }
  .fruta-rueda { width: 72px; height: 72px; color: ${C.verdeMed}; display: flex; animation: roll 4s ease-in-out infinite; }
  .suelo { width: 100%; height: 4px; border-radius: 2px; background: ${C.verdeCla}; margin-top: 6px; }
  .fruta { width: 64px; height: 64px; color: ${C.verdeMed}; display: flex; animation: blink 1.4s infinite; }
  .pasos { width: 100%; display: flex; flex-direction: column; gap: 14px; }
  .paso { display: flex; align-items: center; gap: 14px; font-size: 19px; font-weight: 700; color: ${C.gris}; }
  .paso.hecho { color: ${C.verdeOsc}; } .paso.actual { color: ${C.verdeNeg}; }
  .p-ok { width: 40px; height: 40px; border-radius: 50%; background: ${C.verdeMed}; color: ${C.blanco}; display: flex; align-items: center; justify-content: center; animation: pop .4s both; flex: none; }
  .p-ok svg { width: 22px; height: 22px; }
  .p-cur { width: 40px; height: 40px; border-radius: 50%; border: 3px solid ${C.verdeAz}; display: flex; align-items: center; justify-content: center; flex: none; }
  .p-cur span { width: 14px; height: 14px; border-radius: 50%; background: ${C.verdeAz}; animation: blink 1s infinite; }
  .p-todo { width: 40px; height: 40px; border-radius: 50%; border: 3px solid ${C.linea}; flex: none; }
  .guardada { width: 100%; border-radius: 20px; background: ${C.verdeCla}; padding: 14px 16px; display: flex; align-items: center; gap: 12px; text-align: left; font-size: 17px; font-weight: 600; color: ${C.verdeNeg}; line-height: 1.35; }
  .guardada .i28 { color: ${C.verdeOsc}; }

  /* Informe */
  .caja { border-radius: 24px; background: ${C.blanco}; padding: 18px; display: flex; flex-direction: column; flex: none; }
  .res { display: flex; align-items: center; gap: 16px; }
  .res-i { width: 64px; height: 64px; flex: none; border-radius: 50%; color: ${C.blanco}; display: flex; align-items: center; justify-content: center; }
  .res-i svg { width: 38px; height: 38px; }
  .res-t { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .res-l { font-size: 24px; font-weight: 700; color: ${C.verdeNeg}; }
  .res-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }   /* v1.0.10 */
  .cambiar { flex: none; white-space: nowrap; min-height: 36px; padding: 0 12px; border-radius: 999px; border: 2px solid ${C.linea}; display: flex; align-items: center; font-size: 15px; font-weight: 700; color: ${C.verdeAz}; }   /* v1.0.10: 48 → 36 px, 16 → 15 px */
  .res-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; animation: fade .2s both; }
  .res-op { min-height: 64px; border-radius: 18px; border: 2px solid ${C.linea}; display: flex; align-items: center; gap: 10px; padding: 0 12px; font-size: 16px; font-weight: 700; color: ${C.tinta}; width: 100%; }
  .res-op.sel { border-color: ${C.verdeAz}; }
  .res-op-i { width: 36px; height: 36px; flex: none; border-radius: 50%; color: ${C.blanco}; display: flex; align-items: center; justify-content: center; }
  .res-op-i svg { width: 20px; height: 20px; }
  .resumen { font-size: 17px; line-height: 1.5; color: ${C.tinta}; text-wrap: pretty; }
  .fila { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .fila.borde { border-top: 1px solid ${C.linea}; padding-top: 12px; }
  .fila-v { font-size: 17px; font-weight: 700; color: ${C.verdeNeg}; text-align: right; }
  .int { display: flex; align-items: center; gap: 10px; }
  .int-bs { display: flex; gap: 4px; }
  .int-b { width: 18px; height: 10px; border-radius: 3px; background: ${C.linea}; }
  .int-b.on { background: ${C.verdeAz}; }
  .int-l { font-size: 20px; font-weight: 700; color: ${C.verdeNeg}; }
  .sub-t { font-size: 16px; font-weight: 700; color: ${C.verdeOsc}; }
  .sub-t.con-i { display: flex; align-items: center; gap: 8px; }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .chip { min-height: 44px; padding: 0 16px; border-radius: 999px; background: ${C.fondo}; border: 1px solid ${C.linea}; display: flex; align-items: center; gap: 8px; font-size: 17px; font-weight: 600; }
  .chip-al { padding: 0 14px 0 10px; background: ${C.blanco}; border: 2px solid ${C.fucsia}; }
  .chip-al .i22 { color: ${C.fucsia}; }
  .chip-op { padding: 0 14px 0 10px; background: ${C.blanco}; border: 2px solid ${C.verdeMed}; color: ${C.verdeOsc}; }
  .chip-op .i22 { color: ${C.verdeMed}; }
  .fila-pa { flex-direction: row; align-items: center; gap: 16px; }
  .cal { width: 72px; flex: none; border-radius: 14px; overflow: hidden; border: 2px solid ${C.verdeOsc}; display: flex; flex-direction: column; align-items: center; }
  .cal-h { width: 100%; background: ${C.verdeOsc}; color: ${C.blanco}; font-size: 14px; font-weight: 700; letter-spacing: .08em; text-align: center; padding: 3px 0; }
  .cal-d { font-size: 32px; font-weight: 700; color: ${C.verdeNeg}; line-height: 1.1; padding-top: 4px; }
  .cal-p { font-size: 14px; font-weight: 600; color: ${C.gris}; padding-bottom: 4px; }
  .pa { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .pa-t { font-size: 18px; font-weight: 700; color: ${C.verdeNeg}; line-height: 1.25; }
  .pa-r { font-size: 16px; color: ${C.verdeOsc}; display: flex; align-items: center; gap: 6px; }
  .a-cal { margin-top: 8px; align-self: flex-start; min-height: 44px; padding: 0 14px; border-radius: 999px; border: 2px solid ${C.verdeAz}; color: ${C.verdeAz}; font-size: 16px; font-weight: 700; display: inline-flex; align-items: center; gap: 8px; }
  .sug { border: 2px dashed ${C.verdeAz}; padding: 16px 18px; gap: 8px; }
  .sug-h { display: flex; align-items: center; gap: 8px; color: ${C.verdeAz}; font-size: 15px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
  .sug-t { font-size: 17px; line-height: 1.45; color: ${C.tinta}; }
  .conf { display: flex; flex-direction: column; gap: 10px; }
  .conf-q { font-size: 18px; font-weight: 600; color: ${C.tinta}; }
  .conf-b { display: flex; gap: 8px; }
  .sn { flex: 1; height: 64px; border-radius: 20px; border: 2px solid ${C.verdeAz}; background: ${C.blanco}; color: ${C.verdeAz}; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 19px; font-weight: 700; }
  .sn.on { background: ${C.verdeAz}; color: ${C.blanco}; }
  .fila-loc { flex-direction: row; align-items: center; gap: 12px; padding: 16px 18px; }
  .loc-i { width: 44px; height: 44px; flex: none; border-radius: 50%; background: ${C.verdeCla}; color: ${C.verdeOsc}; display: flex; align-items: center; justify-content: center; }
  .loc-i svg { width: 24px; height: 24px; }
  .loc-t { flex: 1; display: flex; flex-direction: column; }
  .loc-l { font-size: 17px; font-weight: 600; color: ${C.verdeOsc}; }
  .loc-t a { font-size: 16px; font-weight: 600; }
  .barra-enviar { flex: none; position: relative; z-index: 5; padding: 12px 16px calc(26px + env(safe-area-inset-bottom)); background: ${C.blanco}; border-top: 1px solid ${C.linea}; }
  .aire { height: 28px; flex: none; }
  /* v1.0.5 — ticket y calendario */
  .fila-btns { display: flex; gap: 10px; flex: none; }
  .fila-btns .btn { flex: 1; width: auto; font-size: 18px; gap: 8px; }
  .cal { position: relative; cursor: pointer; }
  .cal-in { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; border: 0; padding: 0; margin: 0; cursor: pointer; }
  .fila-ticket { flex-direction: row; align-items: center; gap: 12px; padding: 16px 18px; animation: fade .3s both; }
  .tk-i { width: 44px; height: 44px; flex: none; border-radius: 50%; background: ${C.verdeCla}; color: ${C.verdeOsc}; display: flex; align-items: center; justify-content: center; }
  .tk-i svg { width: 24px; height: 24px; }
  .tk-t { flex: 1; min-width: 0; font-size: 17px; font-weight: 600; color: ${C.verdeOsc}; overflow-wrap: anywhere; }
  .tk-v { font-size: 19px; font-weight: 700; color: ${C.verdeNeg}; white-space: nowrap; }
  .tk-grande { align-items: center; text-align: center; gap: 10px; padding: 22px 18px; animation: fade .3s both; }
  .tk-disco { width: 88px; height: 88px; border-radius: 50%; background: ${C.verdeCla}; color: ${C.verdeOsc}; display: flex; align-items: center; justify-content: center; }
  .tk-disco svg { width: 44px; height: 44px; }
  .tk-cat { font-size: 20px; font-weight: 700; color: ${C.verdeOsc}; }
  .tk-total { font-size: 56px; font-weight: 700; color: ${C.verdeNeg}; line-height: 1; font-variant-numeric: tabular-nums; }
  .tk-datos { padding: 6px 18px; }
  .tk-fila { min-height: 60px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .tk-fila + .tk-fila { border-top: 1px solid ${C.linea}; }
  .tk-fila b { font-size: 18px; text-align: right; overflow-wrap: anywhere; }
  .enviar { width: 100%; height: 96px; border-radius: 28px; background: ${C.fucsia}; color: ${C.blanco}; display: flex; align-items: center; justify-content: center; font-size: 26px; font-weight: 700; letter-spacing: .04em; box-shadow: 0 14px 28px -14px rgba(232,10,77,.7); transition: transform .1s; }
  .enviar:disabled { opacity: .7; }

  /* Enviado */
  .ok-envio { position: relative; width: 180px; height: 180px; flex: none; }
  .halo { position: absolute; inset: -28px; border-radius: 50%; background: ${C.verdeCla}; opacity: .5; animation: pop .7s ease-out both; }
  .ok-180 { position: absolute; inset: 0; border-radius: 50%; background: ${C.verdeMed}; color: ${C.blanco}; display: flex; align-items: center; justify-content: center; animation: pop .5s ease-out .15s both; }
  .ok-180 svg { width: 96px; height: 96px; }
  .aparece { margin-top: 12px; animation: fade .4s .4s both; }

  /* Aviso flotante */
  .toast { position: absolute; left: 16px; right: 16px; bottom: calc(24px + env(safe-area-inset-bottom)); background: ${C.tinta}; color: ${C.blanco}; border-radius: 18px; padding: 14px 18px; font-size: 17px; font-weight: 600; line-height: 1.35; opacity: 0; transform: translateY(12px); transition: opacity .2s, transform .2s; pointer-events: none; z-index: 20; }
  .toast.on { opacity: 1; transform: none; }
</style>
<div class="app">
  <div id="pantalla"></div>
  <div class="toast" id="toast" role="status" aria-live="polite"></div>
  <input id="fTicket" type="file" accept="image/*" capture="environment" hidden>
</div>`;
      this._pintar();
    }
  }

  customElements.define('centri-sales', CentriSales);
})();
