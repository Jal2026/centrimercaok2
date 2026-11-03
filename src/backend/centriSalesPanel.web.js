/* ═══════════════════════════════════════════════════════════════════════════
 * CENTRIMERCA — CENTRIX · Panel de la App de Ventas (Wix Velo)
 * Archivo:  backend/centriSalesPanel.web.js
 * VERSION:  1.0.2
 * FECHA:    3 Noviembre 2026
 *
 * v1.0.2 — 3 NOV 2026 · MAPA DE VISITAS (plan del 21-oct: Google Maps).
 *   Único cambio: panelCargar() devuelve además `claveMapa`, la clave de
 *   Google Maps JavaScript API guardada en el secret GOOGLE_MAPS_KEY. Si el
 *   secret no existe, `claveMapa` va vacía y el widget dibuja el mapa con
 *   OpenStreetMap. La clave de Maps JavaScript es de navegador por diseño:
 *   se protege restringiéndola en Google Cloud (solo Maps JavaScript API y
 *   solo los dominios del panel), no ocultándola. Page code sin cambios.
 *
 * v1.0.1 — 2 NOV 2026 · Único cambio: un resultado «oferta» guardado antes
 *   de centriSalesLab 1.5.1 cuenta como «ventas» (decisión de Jal del 25-oct:
 *   fuera «Oferta» en todas partes; el motor ya lo convertía, pero las
 *   visitas antiguas lo tienen guardado). Afecta a la lista, el filtro, el
 *   barómetro y la lectura. No se reescribe nada en la colección.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * QUÉ ES
 * ───────────────────────────────────────────────────────────────────────────
 * Backend del panel de control de la app de los comerciales, en CENTRIX.
 * Lo usa dirección (filas activas de CentriAdmins). Cuatro apartados:
 *
 *   1. USUARIOS
 *      · panelCargar()            → { usuarios, hoy }: fichas de `equipo` con la
 *                                   casilla «App Ventas» activada, con su última
 *                                   visita y sus reuniones de los últimos 30 días.
 *      · panelEquipo()            → todas las fichas, solo para dar de alta
 *                                   (se abre bajo demanda).
 *      · panelActivarApp({ id, activo })  → enciende o apaga la casilla.
 *      Acceso a la app en dos niveles (Jal, 2-nov-2026): el rol AppVentas lo
 *      pone el administrador a mano (nivel 1) y la casilla la gestiona este
 *      panel (nivel 2). Lo comprueban centriSalesClientes 1.5.0,
 *      centriSalesVisitas 1.2.0 y centriSalesAvisos 1.1.0.
 *
 *   2. REPORTE DE ACTIVIDAD
 *      · panelVisitas({ desde, hasta, comercialId?, resultado?, situacion? })
 *      · panelVisita({ id })      → la visita entera (transcripción e informe).
 *      · panelProximas({ comercialId? }) → próximas citas y seguimientos vencidos.
 *
 *   3. MENSAJERÍA (avisos de la «i» de la app)
 *      · panelAvisos()
 *      · panelGuardarAviso({ id?, mensaje, activo, hasta, destinatarios })
 *        destinatarios = _id de fichas de `equipo`; vacío = todos.
 *        Apagar un aviso = guardarlo con activo false.
 *
 *   4. ANÁLISIS
 *      · panelBarometro({ desde, hasta }) → barómetro del equipo y por comercial.
 *      · panelLectura({ desde, hasta, comercialId? }) → lectura del periodo con IA.
 *      · panelReinterpretarLote({ max }) → rellena «lo que el cliente valora» y
 *        «dudas de trabajo» en visitas anteriores al motor 1.6.0, desde su
 *        transcripción guardada.
 *
 * BARÓMETRO (acordado con Jal, 2-nov-2026). Por visita enviada; una visita
 * puede contar en más de una situación:
 *   · positiva:    resultado pedido | ventas | negociacion, o interés alto.
 *   · negativa:    resultado sin_interes | incidencia, o alertas riesgo_perdida |
 *                  riesgo_impago | queja.
 *   · oportunidad: alerta oportunidad, o interés alto sin pedido.
 *   · seguimiento: resultado seguimiento, o próxima acción con fecha.
 *   · vencido:     próxima acción con fecha pasada y sin una visita enviada
 *                  posterior a ese mismo cliente.
 * Además: reuniones (visitas enviadas), llegadas sin informe, pedidos e
 * importe, y recuentos de resultados, interés, alertas, objeciones, lo que el
 * cliente valora, dudas de trabajo y peticiones a otros departamentos.
 *
 * LÍNEA ROJA (Jal): se describe la SITUACIÓN DE TRABAJO, nunca el estado
 * emocional de los comerciales. La lectura con IA no los compara entre sí ni
 * los puntúa. El informe de cada visita ya excluye ánimo, cansancio y estrés
 * (centriSalesLab.web.js 1.6.0).
 *
 * ───────────────────────────────────────────────────────────────────────────
 * PROCEDENCIA (no inventada)
 * ───────────────────────────────────────────────────────────────────────────
 *   · _exigirAdmin(): COPIA LITERAL de centriEquipo.web.js 1.0.5 (que copia
 *     centriActualidad 1.0.1 → centriCatalogo 1.0.3 → centriEntrenador 1.0.0).
 *     Único cambio: la etiqueta del mensaje denegado, marcada [PANEL].
 *   · _txt(), _imgUrl(): COPIA LITERAL de centriEquipo.web.js 1.0.5.
 *   · _diaMadrid(), _horaMadrid(), _fecha(), safeErr(): COPIA LITERAL de
 *     centriSalesVisitas.web.js 1.2.0.
 *   · Visitas por día (ventana de _createdDate ±48 h y filtro por llegada,
 *     informe o creación): patrón de _visitasDelDia() de centriSalesVisitas.
 *   · _todos(): COPIA LITERAL de cathoviaClima.js 1.3.0.
 *   · _llamarModelo(): COPIA LITERAL de centriSalesLab.web.js 1.6.0 (copia de
 *     cathoviaClima.js 1.3.0 con los tokens añadidos).
 *   · Lectura del periodo con IA: patrón de generarLectura() de
 *     cathoviaClima.js 1.3.0 (agregados + muestra breve, solo cifras dadas).
 *     Modelo: el de los informes (claude-haiku-4-5) para quedar por debajo
 *     del corte de ~14 s; la lectura no se guarda (no hay colección para eso).
 *   · Reinterpretación por lotes: patrón de procesarClimaLote() del
 *     Analizador de Cathovia. Usa informePruebaCore() de centriSalesLab.web.js
 *     (el mismo import que http-functions.js 1.0.5) y SOLO copia las dos
 *     listas nuevas al informe guardado (READ-MERGE-UPDATE): lo confirmado por
 *     el comercial no se toca.
 *   · READ-MERGE-UPDATE con { suppressAuth: true }: patrón de
 *     toggleMiembroActivo() de centriEquipo.web.js 1.0.5.
 *   · Respuestas { ok, error } en texto: patrón de los gestores de CENTRIX.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * COLECCIONES Y CLAVES — leídas por API el 2-nov-2026
 * ───────────────────────────────────────────────────────────────────────────
 *   equipo: nombre · rol · imagen · email · appVentas (Booleano «App Ventas»,
 *     creado por API el 2-nov-2026) · activo («visible en la web», NO se usa)
 *   CentriSalesVisitascomercial: Id (id de la ficha del comercial) ·
 *     comercial · contactId · cliente · estado (llegada | enviada) · llegada ·
 *     reporte · llegadaLat · llegadaLon · reporteLat · reporteLon ·
 *     segundosAudio · transcripcion · resultado · interes · informe (Objeto)
 *   CentriSalesAvisos: mensaje · activo · hasta (Fecha) · destinatarios
 *     (Etiquetas)
 *   CentriAdmins: email · memberId · activo
 *
 * ───────────────────────────────────────────────────────────────────────────
 * DESPLIEGUE
 * ───────────────────────────────────────────────────────────────────────────
 *   ⛔ Requiere centriSalesLab.web.js 1.6.0 publicado (lo importa). Con el
 *      1.5.1, panelReinterpretarLote se niega a guardar (no trae las listas).
 *   Secret: CENTRIMERCA (el mismo de CENTRI y de los informes).
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { webMethod, Permissions } from 'wix-web-module';
import wixData from 'wix-data';
import { currentMember } from 'wix-members-backend';
import { fetch } from 'wix-fetch';
import { getSecret } from 'wix-secrets-backend';
import { informePruebaCore } from 'backend/centriSalesLab.web';

const VERSION = '1.0.2';
const TAG = `[CentriSalesPanel][${VERSION}]`;
const AUTH = { suppressAuth: true };

// ── IDs de colección ───────────────────────────────────────────────────────
const C_ADMINS  = 'CentriAdmins';                  // idéntico a los gestores de CENTRIX
const C_EQUIPO  = 'equipo';                        // ID real (minúscula)
const C_VISITAS = 'CentriSalesVisitascomercial';   // el de centriSalesVisitas.web.js
const C_AVISOS  = 'CentriSalesAvisos';             // el de centriSalesAvisos.web.js

const LIMITE_EQUIPO = 1000;   // idéntico a LIMITE de centriEquipo.web.js
const LIMITE_AVISOS = 200;

// ── Field keys ─────────────────────────────────────────────────────────────
const F_EQUIPO = {
  nombre:    'nombre',
  rol:       'rol',
  imagen:    'imagen',
  email:     'email',
  appVentas: 'appVentas'   // Booleano «App Ventas» (nivel 2 de acceso)
};

// COPIA LITERAL de F de centriSalesVisitas.web.js 1.2.0
const F = {
  comercialId:   'Id',            // clave real del campo en la colección
  comercial:     'comercial',
  contactId:     'contactId',
  cliente:       'cliente',
  estado:        'estado',
  llegada:       'llegada',
  reporte:       'reporte',
  llegadaLat:    'llegadaLat',
  llegadaLon:    'llegadaLon',
  reporteLat:    'reporteLat',
  reporteLon:    'reporteLon',
  segundosAudio: 'segundosAudio',
  transcripcion: 'transcripcion',
  resultado:     'resultado',
  interes:       'interes',
  informe:       'informe'
};
const ESTADO_LLEGADA = 'llegada';
const ESTADO_ENVIADA = 'enviada';

// COPIA de F_AVISOS de centriSalesAvisos.web.js 1.1.0
const F_AVISOS = {
  mensaje:       'mensaje',
  activo:        'activo',
  hasta:         'hasta',
  destinatarios: 'destinatarios'   // _id de fichas de `equipo`; vacío = todos
};
const MAX_MENSAJE = 1000;   // el mismo tope que centriSalesAvisos.web.js

// Valores de TAXONOMIA_VISITA de centriSalesLab.web.js 1.6.0
const RESULTADOS = ['pedido', 'ventas', 'negociacion', 'seguimiento', 'administrativa', 'incidencia', 'presentacion', 'cortesia', 'sin_interes', 'no_atendido', 'otro'];

// ── Barómetro (acordado con Jal, 2-nov-2026) ───────────────────────────────
const BAROMETRO = {
  positivaResultado:   ['pedido', 'ventas', 'negociacion'],
  negativaResultado:   ['sin_interes', 'incidencia'],
  negativaAlertas:     ['riesgo_perdida', 'riesgo_impago', 'queja'],
  oportunidadAlertas:  ['oportunidad'],
  seguimientoResultado: ['seguimiento']
};
const SITUACIONES = ['positiva', 'negativa', 'oportunidad', 'seguimiento', 'vencido'];

const ZONA = 'Europe/Madrid';
const MAX_DIAS_PERIODO = 366;
const DIAS_ACTIVIDAD_USUARIO = 30;   // «reuniones de los últimos 30 días» en usuarios
const DIAS_PROXIMAS = 180;           // ventana de visitas para próximas citas y vencidos
const MAX_RESUMEN_LISTA = 300;       // caracteres del resumen en la lista del reporte

// ── IA (mismo modelo y secret que los informes de centriSalesLab.web.js) ────
const MODELO_LECTURA     = 'claude-haiku-4-5';
const SECRET_ANTHROPIC   = 'CENTRIMERCA';
const MAX_TOKENS_LECTURA = 1400;
const MAX_VISITAS_LECTURA = 40;      // muestra de visitas que recibe la IA
const MAX_LOTE = 3;                  // reinterpretaciones por llamada (corte de ~14 s)

// ── Mapa (v1.0.2) ──────────────────────────────────────────────────────────
const SECRET_MAPA = 'GOOGLE_MAPS_KEY';   // clave de Google Maps JavaScript API (opcional)

/** Clave del mapa, o '' si el secret no existe (el widget usa OpenStreetMap). */
async function _claveMapa() {
  try { return _txt(await getSecret(SECRET_MAPA)); }
  catch (e) { return ''; }
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTROL DE ACCESO  (copia literal de centriEquipo.web.js 1.0.5)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Comprueba que quien llama está autorizado y activo en CentriAdmins.
 *
 * ⚠️ FALLA CERRADO. Sin sesión, sin colección, sin fila o con error de
 * lectura → NO autorizado. Los permisos de PÁGINA no protegen un webMethod.
 */
async function _exigirAdmin() {
  let memberId = '';
  let email = '';

  try {
    let member = null;
    try {
      member = await currentMember.getMember({ fieldsets: ['FULL'] });
    } catch (eFull) {
      console.warn(`${TAG} fieldset FULL no disponible, se usa el reducido:`, eFull.message);
      member = await currentMember.getMember();
    }

    memberId = (member && member._id) || '';

    let bruto = (member && member.loginEmail) || '';
    if (!bruto && member && member.contactDetails) {
      const cd = member.contactDetails;
      if (Array.isArray(cd.emails) && cd.emails.length > 0) {
        bruto = typeof cd.emails[0] === 'string' ? cd.emails[0] : (cd.emails[0].email || '');
      }
    }
    email = String(bruto || '').trim().toLowerCase();

  } catch (e) {
    console.warn(`${TAG} sin sesión de miembro:`, e.message);
    return { ok: false, error: 'Necesitas iniciar sesión.' };
  }

  if (!memberId && !email) {
    return { ok: false, error: 'Necesitas iniciar sesión.' };
  }

  try {
    const res = await wixData.query(C_ADMINS)
      .eq('activo', true)
      .limit(200)
      .find(AUTH);

    const filas = res.items || [];

    const autorizado = filas.some(f => {
      const fEmail = String(f.email || '').trim().toLowerCase();
      const fId    = String(f.memberId || '').trim();
      if (email && fEmail && fEmail === email) return true;
      if (memberId && fId && fId === memberId) return true;
      return false;
    });

    if (!autorizado) {
      console.warn(`${TAG} acceso DENEGADO al panel de la app de ventas: email=${email || '—'} memberId=${memberId || '—'} (${filas.length} filas activas en ${C_ADMINS})`);   // [PANEL]

      const pista = `Detectado: correo ${email || '—'}, memberId ${memberId || '—'}. ` +
                    `${C_ADMINS} tiene ${filas.length} fila(s) con activo=true. ` +
                    `Añade una fila con ese correo en \`email\` y \`activo\` marcado, o pega ese memberId en \`memberId\`.`;
      return { ok: false, error: `No tienes acceso al panel de la app de ventas. ${pista}` };   // [PANEL]
    }

    return { ok: true, memberId, email };

  } catch (e) {
    console.error(`${TAG} error leyendo ${C_ADMINS} — se deniega por defecto:`, e.message);
    return { ok: false, error: 'No se pudo verificar el acceso.' };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

// COPIA LITERAL de centriEquipo.web.js 1.0.5
function _txt(v) { return (v === null || v === undefined) ? '' : String(v).trim(); }

/* wix:image://v1/<mediaId>/<file>#...  →  https://static.wixstatic.com/media/<mediaId>
   COPIA LITERAL de _imgUrl de centriEquipo.web.js 1.0.5 */
function _imgUrl(uri) {
  if (!uri || typeof uri !== 'string') { return ''; }
  if (uri.indexOf('http') === 0) { return uri; }
  const m = uri.match(/wix:image:\/\/v1\/([^/]+)/);
  return m ? ('https://static.wixstatic.com/media/' + m[1]) : '';
}

// COPIA LITERAL de centriSalesVisitas.web.js 1.2.0
function safeErr(e) {
  return { name: (e && e.name) || 'Error', message: (e && e.message) || String(e) };
}

/** AAAA-MM-DD de una fecha en Europe/Madrid (patrón _hoyMadrid). */
function _diaMadrid(d) {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  } catch (e) {
    return d.toISOString().slice(0, 10);
  }
}

/** HH:MM de una fecha en Europe/Madrid. */
function _horaMadrid(d) {
  try {
    return new Intl.DateTimeFormat('es-ES', { timeZone: ZONA, hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
  } catch (e) {
    return d.toISOString().slice(11, 16);
  }
}

function _fecha(v) {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

// COPIA LITERAL de cathoviaClima.js 1.3.0
async function _todos(query) {
  let res = await query.limit(1000).find(AUTH);
  const items = (res.items || []).slice();
  let vueltas = 0;
  while (res.hasNext() && vueltas < 50) {
    res = await res.next();
    items.push(...(res.items || []));
    vueltas++;
  }
  return items;
}

// ── Propios del panel ──────────────────────────────────────────────────────

function _esDia(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(`${s}T12:00:00Z`).getTime());
}

function _sumarDias(dia, n) {
  const d = new Date(`${dia}T12:00:00Z`);
  return new Date(d.getTime() + n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function _validarPeriodo(desde, hasta) {
  const hoy = _diaMadrid(new Date());
  if (!_esDia(desde) || !_esDia(hasta)) return 'Periodo no válido.';
  if (desde > hasta) return 'La fecha de inicio va después de la de fin.';
  if (hasta > hoy) return 'El periodo no puede acabar después de hoy.';
  if (_sumarDias(desde, MAX_DIAS_PERIODO) < hasta) return `El periodo no puede pasar de ${MAX_DIAS_PERIODO} días.`;
  return '';
}

/**
 * v1.0.1 — Resultado de la visita. «oferta» (anterior a centriSalesLab 1.5.1)
 * cuenta como «ventas», igual que hace _validarInforme() del motor.
 */
function _resultadoDe(it, inf) {
  const v = _txt(it[F.resultado]) || _txt(inf.resultado);
  return v === 'oferta' ? 'ventas' : v;
}

/** Referencia temporal de una visita: llegada, informe o creación (como _visitasDelDia). */
function _refVisita(it) {
  return _fecha(it[F.llegada]) || _fecha(it[F.reporte]) || _fecha(it._createdDate);
}

function _num(v) {
  const n = Number(v);
  return (v === null || v === undefined || v === '' || !isFinite(n)) ? null : n;
}

function _lista(v) {
  return Array.isArray(v) ? v.map(_txt).filter(Boolean) : [];
}

function _informe(it) {
  const inf = it[F.informe];
  return (inf && typeof inf === 'object' && !Array.isArray(inf)) ? inf : {};
}

function _sumar(mapa, clave, n) {
  if (!clave) return;
  mapa[clave] = (mapa[clave] || 0) + (n === undefined ? 1 : n);
}

/**
 * Visitas cuya referencia cae entre dos días (Europe/Madrid), ambos incluidos.
 * Patrón de _visitasDelDia(): ventana de _createdDate con ±48 h de margen y
 * filtro por el día de la llegada, el informe o la creación.
 */
async function _visitasEntre(desde, hasta) {
  const ini = new Date(new Date(`${desde}T12:00:00Z`).getTime() - 48 * 60 * 60 * 1000);
  const fin = new Date(new Date(`${hasta}T12:00:00Z`).getTime() + 48 * 60 * 60 * 1000);
  const items = await _todos(
    wixData.query(C_VISITAS)
      .ge('_createdDate', ini)
      .le('_createdDate', fin)
  );
  return items.filter((it) => {
    const ref = _refVisita(it);
    if (!ref) return false;
    const dia = _diaMadrid(ref);
    return dia >= desde && dia <= hasta;
  });
}

/**
 * Índice contactId → referencias (ms) de sus visitas ENVIADAS, para saber si
 * una próxima acción vencida tuvo después otra visita a ese cliente.
 */
function _indiceEnviadas(items) {
  const idx = {};
  items.forEach((it) => {
    if (_txt(it[F.estado]) !== ESTADO_ENVIADA) return;
    const c = _txt(it[F.contactId]);
    const ref = _refVisita(it);
    if (!c || !ref) return;
    (idx[c] = idx[c] || []).push(ref.getTime());
  });
  return idx;
}

/** Situaciones del barómetro de una visita enviada. */
function _situaciones(it, hoy, indice) {
  const s = { positiva: false, negativa: false, oportunidad: false, seguimiento: false, vencido: false };
  if (_txt(it[F.estado]) !== ESTADO_ENVIADA) return s;

  const inf = _informe(it);
  const resultado = _resultadoDe(it, inf);   // v1.0.1
  const interes = _txt(it[F.interes]) || _txt(inf.interes);
  const alertas = _lista(inf.alertas);
  const pedido = inf.pedido && typeof inf.pedido === 'object' ? inf.pedido : {};
  const pa = inf.proxima_accion && typeof inf.proxima_accion === 'object' ? inf.proxima_accion : {};
  const fechaPa = _esDia(_txt(pa.fecha)) ? _txt(pa.fecha) : '';

  s.positiva = BAROMETRO.positivaResultado.indexOf(resultado) >= 0 || interes === 'alto';
  s.negativa = BAROMETRO.negativaResultado.indexOf(resultado) >= 0 ||
               alertas.some((a) => BAROMETRO.negativaAlertas.indexOf(a) >= 0);
  s.oportunidad = alertas.some((a) => BAROMETRO.oportunidadAlertas.indexOf(a) >= 0) ||
                  (interes === 'alto' && pedido.hay !== true);
  s.seguimiento = BAROMETRO.seguimientoResultado.indexOf(resultado) >= 0 || !!fechaPa;

  if (fechaPa && fechaPa < hoy) {
    const ref = _refVisita(it);
    const despues = (indice[_txt(it[F.contactId])] || []).some((t) => ref && t > ref.getTime());
    s.vencido = !despues;
  }
  return s;
}

/** Fila del reporte (lista). */
function _fila(it, hoy, indice) {
  const inf = _informe(it);
  const ref = _refVisita(it);
  const llegada = _fecha(it[F.llegada]);
  const reporte = _fecha(it[F.reporte]);
  const pedido = inf.pedido && typeof inf.pedido === 'object' ? inf.pedido : {};
  const pa = inf.proxima_accion && typeof inf.proxima_accion === 'object' ? inf.proxima_accion : {};
  const sg = inf.sugerencia_ia && typeof inf.sugerencia_ia === 'object' ? inf.sugerencia_ia : {};
  const tk = inf.ticket && typeof inf.ticket === 'object' ? inf.ticket : null;
  return {
    id:           it._id,
    dia:          ref ? _diaMadrid(ref) : '',
    hora:         ref ? _horaMadrid(ref) : '',
    comercialId:  _txt(it[F.comercialId]),
    comercial:    _txt(it[F.comercial]),
    contactId:    _txt(it[F.contactId]),
    cliente:      _txt(it[F.cliente]),
    estado:       _txt(it[F.estado]),
    resultado:    _resultadoDe(it, inf),   // v1.0.1
    interes:      _txt(it[F.interes]) || _txt(inf.interes),
    resumen:      _txt(inf.resumen).slice(0, MAX_RESUMEN_LISTA),
    pedido:       { hay: pedido.hay === true, descripcion: _txt(pedido.descripcion), importe: _num(pedido.importe_eur) },
    productos:    _lista(inf.productos),
    objeciones:   _lista(inf.objeciones),
    alertas:      _lista(inf.alertas),
    valora:       _lista(inf.valora_cliente),
    dudasTrabajo: _lista(inf.dudas_trabajo),
    proxima:      { descripcion: _txt(pa.descripcion), fecha: _esDia(_txt(pa.fecha)) ? _txt(pa.fecha) : null, responsable: _txt(pa.responsable) },
    sugerencia:   { descripcion: _txt(sg.descripcion), responsable: _txt(sg.responsable) },
    ticket:       tk ? { categoria: _txt(tk.categoria), total: _num(tk.total_eur), comercio: _txt(tk.comercio), foto: _txt(tk.foto) } : null,
    llegada:      { hora: llegada ? _horaMadrid(llegada) : '', lat: _num(it[F.llegadaLat]), lon: _num(it[F.llegadaLon]) },
    reporte:      { hora: reporte ? _horaMadrid(reporte) : '', lat: _num(it[F.reporteLat]), lon: _num(it[F.reporteLon]) },
    segundosAudio: _num(it[F.segundosAudio]),
    situaciones:  _situaciones(it, hoy, indice)
  };
}

/** Acumulador vacío del barómetro. */
function _accVacio() {
  return {
    reuniones: 0, llegadasSinInforme: 0,
    positivas: 0, negativas: 0, oportunidades: 0, seguimientos: 0, vencidos: 0,
    pedidos: 0, importePedidos: 0,
    resultados: {}, interes: {}, alertas: {}, objeciones: {}, valora: {}, dudasTrabajo: {},
    peticiones: {}, productos: {}
  };
}

function _acumular(acc, f) {
  if (f.estado !== ESTADO_ENVIADA) {
    if (f.estado === ESTADO_LLEGADA) acc.llegadasSinInforme++;
    return;
  }
  acc.reuniones++;
  if (f.situaciones.positiva) acc.positivas++;
  if (f.situaciones.negativa) acc.negativas++;
  if (f.situaciones.oportunidad) acc.oportunidades++;
  if (f.situaciones.seguimiento) acc.seguimientos++;
  if (f.situaciones.vencido) acc.vencidos++;
  if (f.pedido.hay) {
    acc.pedidos++;
    if (f.pedido.importe !== null) acc.importePedidos += f.pedido.importe;
  }
  _sumar(acc.resultados, f.resultado || 'sin_dato');
  _sumar(acc.interes, f.interes || 'sin_dato');
  f.alertas.forEach((a) => _sumar(acc.alertas, a));
  f.objeciones.forEach((o) => _sumar(acc.objeciones, o));
  f.valora.forEach((v) => _sumar(acc.valora, v));
  f.dudasTrabajo.forEach((d) => _sumar(acc.dudasTrabajo, d));
  if (f.proxima.descripcion && f.proxima.responsable && f.proxima.responsable !== 'comercial') {
    _sumar(acc.peticiones, f.proxima.responsable);
  }
  f.productos.forEach((p) => _sumar(acc.productos, p));
}

/** Los N productos más nombrados. */
function _top(mapa, n) {
  return Object.keys(mapa)
    .map((k) => ({ nombre: k, veces: mapa[k] }))
    .sort((a, b) => b.veces - a.veces)
    .slice(0, n);
}

function _cerrar(acc) {
  const out = Object.assign({}, acc);
  out.importePedidos = Math.round(acc.importePedidos * 100) / 100;
  out.productos = _top(acc.productos, 10);
  return out;
}

/** Fichas de `equipo` con su problema de acceso, si lo hay. */
async function _leerEquipo() {
  const res = await wixData.query(C_EQUIPO).limit(LIMITE_EQUIPO).find(AUTH);
  const filas = res.items || [];
  const porEmail = {};
  filas.forEach((f) => {
    const e = _txt(f[F_EQUIPO.email]).toLowerCase();
    if (e) porEmail[e] = (porEmail[e] || 0) + 1;
  });
  return filas.map((f) => {
    const email = _txt(f[F_EQUIPO.email]).toLowerCase();
    let problema = '';
    if (!email) problema = 'Sin email de acceso en la ficha.';
    else if (porEmail[email] > 1) problema = 'Email compartido con otras fichas: no podrá entrar.';
    return {
      id:        f._id,
      nombre:    _txt(f[F_EQUIPO.nombre]),
      rol:       _txt(f[F_EQUIPO.rol]),
      foto:      _imgUrl(f[F_EQUIPO.imagen]),
      email,
      appVentas: f[F_EQUIPO.appVentas] === true,
      problema
    };
  }).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. USUARIOS
// ═══════════════════════════════════════════════════════════════════════════

export const panelCargar = webMethod(
  Permissions.SiteMember,
  async () => {
    const guard = await _exigirAdmin();
    if (!guard.ok) { return { ok: false, error: guard.error }; }

    try {
      const hoy = _diaMadrid(new Date());
      const equipo = await _leerEquipo();
      const usuarios = equipo.filter((p) => p.appVentas);

      const recientes = await _visitasEntre(_sumarDias(hoy, -(DIAS_ACTIVIDAD_USUARIO - 1)), hoy);
      // hasSome sobre un campo de texto con una lista de ids: patrón de
      // centriComunicaciones.web.js 1.0.4 (hasSome('campaignId', ids)).
      const ultimas = usuarios.length === 0 ? [] : await _todos(
        wixData.query(C_VISITAS)
          .hasSome(F.comercialId, usuarios.map((u) => u.id))
          .eq(F.estado, ESTADO_ENVIADA)
          .descending('_createdDate')
      );

      usuarios.forEach((u) => {
        u.reuniones30 = recientes.filter((v) => _txt(v[F.comercialId]) === u.id && _txt(v[F.estado]) === ESTADO_ENVIADA).length;
        const ult = ultimas.find((v) => _txt(v[F.comercialId]) === u.id);
        const ref = ult ? _refVisita(ult) : null;
        u.ultimaVisita = ref ? { dia: _diaMadrid(ref), hora: _horaMadrid(ref), cliente: _txt(ult[F.cliente]) } : null;
      });

      return { ok: true, version: VERSION, hoy, usuarios, claveMapa: await _claveMapa() };   // v1.0.2
    } catch (e) {
      console.error(`${TAG} ❌ panelCargar:`, e);
      return { ok: false, error: 'No se pudieron leer los usuarios de la app.', detalle: safeErr(e) };
    }
  }
);

export const panelEquipo = webMethod(
  Permissions.SiteMember,
  async () => {
    const guard = await _exigirAdmin();
    if (!guard.ok) { return { ok: false, error: guard.error }; }

    try {
      return { ok: true, equipo: await _leerEquipo() };
    } catch (e) {
      console.error(`${TAG} ❌ panelEquipo:`, e);
      return { ok: false, error: 'No se pudo leer el equipo.', detalle: safeErr(e) };
    }
  }
);

// READ-MERGE-UPDATE de `appVentas` (patrón de toggleMiembroActivo de centriEquipo).
export const panelActivarApp = webMethod(
  Permissions.SiteMember,
  async ({ id, activo } = {}) => {
    const guard = await _exigirAdmin();
    if (!guard.ok) { return { ok: false, error: guard.error }; }
    if (!_txt(id)) { return { ok: false, error: 'Falta la persona.' }; }

    try {
      const actual = await wixData.get(C_EQUIPO, _txt(id), AUTH);
      if (!actual) { return { ok: false, error: 'Persona no encontrada.' }; }

      const valor = (activo === true || activo === 'true');
      await wixData.update(C_EQUIPO, Object.assign({}, actual, { [F_EQUIPO.appVentas]: valor }), AUTH);

      console.log(`${TAG} ✅ appVentas ${id}: ${valor} (por ${guard.email || guard.memberId})`);
      return { ok: true, id: _txt(id), appVentas: valor };
    } catch (e) {
      console.error(`${TAG} ❌ panelActivarApp:`, e);
      return { ok: false, error: 'No se pudo cambiar el acceso.', detalle: safeErr(e) };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// 2. REPORTE DE ACTIVIDAD
// ═══════════════════════════════════════════════════════════════════════════

export const panelVisitas = webMethod(
  Permissions.SiteMember,
  async ({ desde, hasta, comercialId, resultado, situacion } = {}) => {
    const guard = await _exigirAdmin();
    if (!guard.ok) { return { ok: false, error: guard.error }; }

    const err = _validarPeriodo(desde, hasta);
    if (err) { return { ok: false, error: err }; }
    if (resultado && RESULTADOS.indexOf(_txt(resultado)) < 0) { return { ok: false, error: 'Resultado no válido.' }; }
    if (situacion && SITUACIONES.indexOf(_txt(situacion)) < 0) { return { ok: false, error: 'Situación no válida.' }; }

    try {
      const hoy = _diaMadrid(new Date());
      const periodo = await _visitasEntre(desde, hasta);
      // Para «vencido» cuentan también las visitas posteriores al periodo.
      const hastaHoy = hasta === hoy ? periodo : await _visitasEntre(desde, hoy);
      const indice = _indiceEnviadas(hastaHoy);

      let filas = periodo.map((it) => _fila(it, hoy, indice));
      if (_txt(comercialId)) filas = filas.filter((f) => f.comercialId === _txt(comercialId));
      if (_txt(resultado)) filas = filas.filter((f) => f.resultado === _txt(resultado));
      if (_txt(situacion)) filas = filas.filter((f) => f.situaciones[_txt(situacion)]);

      filas.sort((a, b) => (b.dia + b.hora).localeCompare(a.dia + a.hora));
      return { ok: true, desde, hasta, visitas: filas };
    } catch (e) {
      console.error(`${TAG} ❌ panelVisitas:`, e);
      return { ok: false, error: 'No se pudieron leer las visitas.', detalle: safeErr(e) };
    }
  }
);

export const panelVisita = webMethod(
  Permissions.SiteMember,
  async ({ id } = {}) => {
    const guard = await _exigirAdmin();
    if (!guard.ok) { return { ok: false, error: guard.error }; }
    if (!_txt(id)) { return { ok: false, error: 'Falta la visita.' }; }

    try {
      const it = await wixData.get(C_VISITAS, _txt(id), AUTH);
      if (!it) { return { ok: false, error: 'Visita no encontrada.' }; }

      const hoy = _diaMadrid(new Date());
      const ref = _refVisita(it);
      const posteriores = ref ? await _visitasEntre(_diaMadrid(ref), hoy) : [];
      const fila = _fila(it, hoy, _indiceEnviadas(posteriores));

      return {
        ok: true,
        visita: Object.assign(fila, {
          transcripcion: _txt(it[F.transcripcion]),
          informe: _informe(it)
        })
      };
    } catch (e) {
      console.error(`${TAG} ❌ panelVisita:`, e);
      return { ok: false, error: 'No se pudo abrir la visita.', detalle: safeErr(e) };
    }
  }
);

export const panelProximas = webMethod(
  Permissions.SiteMember,
  async ({ comercialId } = {}) => {
    const guard = await _exigirAdmin();
    if (!guard.ok) { return { ok: false, error: guard.error }; }

    try {
      const hoy = _diaMadrid(new Date());
      const items = await _visitasEntre(_sumarDias(hoy, -(DIAS_PROXIMAS - 1)), hoy);
      const indice = _indiceEnviadas(items);

      let filas = items
        .filter((it) => _txt(it[F.estado]) === ESTADO_ENVIADA)
        .map((it) => _fila(it, hoy, indice))
        .filter((f) => !!f.proxima.fecha);
      if (_txt(comercialId)) filas = filas.filter((f) => f.comercialId === _txt(comercialId));

      const proximas = filas.filter((f) => f.proxima.fecha >= hoy)
        .sort((a, b) => a.proxima.fecha.localeCompare(b.proxima.fecha));
      const vencidas = filas.filter((f) => f.situaciones.vencido)
        .sort((a, b) => a.proxima.fecha.localeCompare(b.proxima.fecha));

      return { ok: true, hoy, proximas, vencidas };
    } catch (e) {
      console.error(`${TAG} ❌ panelProximas:`, e);
      return { ok: false, error: 'No se pudieron leer las próximas citas.', detalle: safeErr(e) };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// 3. MENSAJERÍA — avisos de la «i» de la app
// ═══════════════════════════════════════════════════════════════════════════

/** Día (AAAA-MM-DD) del campo `hasta` — mismo criterio que centriSalesAvisos.web.js. */
function _diaHasta(v) {
  if (!v) return '';
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  const d = _fecha(v);
  return d ? _diaMadrid(d) : '';
}

/** destinatarios guardado → lista de _id (un texto suelto cuenta como uno). */
function _destinatarios(v) {
  return (Array.isArray(v) ? v : (_txt(v) ? [v] : [])).map(_txt).filter(Boolean);
}

export const panelAvisos = webMethod(
  Permissions.SiteMember,
  async () => {
    const guard = await _exigirAdmin();
    if (!guard.ok) { return { ok: false, error: guard.error }; }

    try {
      const [res, equipo] = await Promise.all([
        wixData.query(C_AVISOS).descending('_createdDate').limit(LIMITE_AVISOS).find(AUTH),
        _leerEquipo()
      ]);
      const nombres = {};
      equipo.forEach((p) => { nombres[p.id] = p.nombre; });
      const hoy = _diaMadrid(new Date());

      const avisos = (res.items || []).map((it) => {
        const creado = _fecha(it._createdDate);
        const hasta = _diaHasta(it[F_AVISOS.hasta]);
        return {
          id:       it._id,
          mensaje:  _txt(it[F_AVISOS.mensaje]),
          activo:   it[F_AVISOS.activo] === true,
          hasta:    hasta || null,
          caducado: !!hasta && hasta < hoy,
          fecha:    creado ? _diaMadrid(creado) : '',
          destinatarios: _destinatarios(it[F_AVISOS.destinatarios])
            .map((id) => ({ id, nombre: nombres[id] || '(ficha borrada)' }))
        };
      });

      return { ok: true, hoy, avisos };
    } catch (e) {
      console.error(`${TAG} ❌ panelAvisos:`, e);
      return { ok: false, error: 'No se pudieron leer los avisos.', detalle: safeErr(e) };
    }
  }
);

export const panelGuardarAviso = webMethod(
  Permissions.SiteMember,
  async ({ id, mensaje, activo, hasta, destinatarios } = {}) => {
    const guard = await _exigirAdmin();
    if (!guard.ok) { return { ok: false, error: guard.error }; }

    const texto = _txt(mensaje);
    if (!texto) { return { ok: false, error: 'Escribe el mensaje.' }; }
    if (texto.length > MAX_MENSAJE) { return { ok: false, error: `El mensaje no puede pasar de ${MAX_MENSAJE} caracteres.` }; }
    const diaHasta = _txt(hasta);
    if (diaHasta && !_esDia(diaHasta)) { return { ok: false, error: 'Fecha de fin no válida.' }; }

    try {
      // Solo fichas que existen en `equipo`.
      const equipo = await _leerEquipo();
      const validos = {};
      equipo.forEach((p) => { validos[p.id] = true; });
      const para = _destinatarios(destinatarios).filter((d, i, a) => validos[d] && a.indexOf(d) === i);
      if (_destinatarios(destinatarios).length > 0 && para.length === 0) {
        return { ok: false, error: 'Ninguno de los destinatarios está en el equipo.' };
      }

      const cambios = {
        [F_AVISOS.mensaje]:       texto,
        [F_AVISOS.activo]:        activo !== false && activo !== 'false',
        [F_AVISOS.hasta]:         diaHasta || null,
        [F_AVISOS.destinatarios]: para
      };

      let guardado;
      if (_txt(id)) {
        const actual = await wixData.get(C_AVISOS, _txt(id), AUTH);
        if (!actual) { return { ok: false, error: 'Aviso no encontrado.' }; }
        guardado = await wixData.update(C_AVISOS, Object.assign({}, actual, cambios), AUTH);
      } else {
        guardado = await wixData.insert(C_AVISOS, cambios, AUTH);
      }

      console.log(`${TAG} ✅ aviso ${guardado._id} guardado (activo=${cambios[F_AVISOS.activo]}, destinatarios=${para.length || 'todos'})`);
      return { ok: true, id: guardado._id };
    } catch (e) {
      console.error(`${TAG} ❌ panelGuardarAviso:`, e);
      return { ok: false, error: 'No se pudo guardar el aviso.', detalle: safeErr(e) };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// 4. ANÁLISIS — barómetro, lectura con IA y reinterpretación
// ═══════════════════════════════════════════════════════════════════════════

/** Barómetro del equipo y por comercial de un periodo. */
async function _barometro(desde, hasta) {
  const hoy = _diaMadrid(new Date());
  const periodo = await _visitasEntre(desde, hasta);
  const hastaHoy = hasta === hoy ? periodo : await _visitasEntre(desde, hoy);
  const indice = _indiceEnviadas(hastaHoy);
  const filas = periodo.map((it) => _fila(it, hoy, indice));

  const equipoAcc = _accVacio();
  const porId = {};
  filas.forEach((f) => {
    _acumular(equipoAcc, f);
    const k = f.comercialId || '(sin id)';
    if (!porId[k]) porId[k] = { comercialId: k, comercial: f.comercial, acc: _accVacio() };
    _acumular(porId[k].acc, f);
  });

  // Los usuarios de la app sin visitas en el periodo también salen (con 0).
  const usuarios = (await _leerEquipo()).filter((p) => p.appVentas);
  usuarios.forEach((u) => {
    if (!porId[u.id]) porId[u.id] = { comercialId: u.id, comercial: u.nombre, acc: _accVacio() };
    else porId[u.id].comercial = u.nombre || porId[u.id].comercial;
  });

  const porComercial = Object.keys(porId)
    .map((k) => Object.assign({ comercialId: porId[k].comercialId, comercial: porId[k].comercial }, _cerrar(porId[k].acc)))
    .sort((a, b) => a.comercial.localeCompare(b.comercial, 'es'));

  return { desde, hasta, equipo: _cerrar(equipoAcc), porComercial, filas };
}

export const panelBarometro = webMethod(
  Permissions.SiteMember,
  async ({ desde, hasta } = {}) => {
    const guard = await _exigirAdmin();
    if (!guard.ok) { return { ok: false, error: guard.error }; }
    const err = _validarPeriodo(desde, hasta);
    if (err) { return { ok: false, error: err }; }

    try {
      const b = await _barometro(desde, hasta);
      return { ok: true, desde: b.desde, hasta: b.hasta, equipo: b.equipo, porComercial: b.porComercial };
    } catch (e) {
      console.error(`${TAG} ❌ panelBarometro:`, e);
      return { ok: false, error: 'No se pudo calcular el barómetro.', detalle: safeErr(e) };
    }
  }
);

// COPIA LITERAL de _llamarModelo() de centriSalesLab.web.js 1.6.0
// (copia de cathoviaClima.js v1.3.0 con los tokens de entrada y salida, [LAB]).
async function _llamarModelo(apiKey, modelo, system, user, maxTokens) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: modelo,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }]
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data && data.error ? data.error.message : `HTTP ${res.status}`);
  // [LAB] en CATHOVIA devuelve solo el texto
  const u = data.usage || {};
  return {
    texto: (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim(),
    entrada: u.input_tokens || 0,
    salida: u.output_tokens || 0
  };
}

const SYSTEM_LECTURA = [
  'Eres el analista comercial de Centrimerca, mayorista de frutas y hortalizas en Mercamadrid.',
  'Recibes el BARÓMETRO de las visitas de los comerciales de un periodo (JSON): del equipo y de cada comercial, y una MUESTRA de visitas con su resultado, su situación y el resumen del informe.',
  'Cómo se cuenta cada situación (una visita puede contar en varias):',
  '- positiva: pedido, ventas o negociación, o interés alto del cliente.',
  '- negativa: sin interés o incidencia, o alertas de riesgo de pérdida, riesgo de impago o queja.',
  '- oportunidad: alerta de oportunidad, o interés alto sin pedido.',
  '- seguimiento: resultado seguimiento, o una próxima acción con fecha. vencido: esa fecha ya pasó sin otra visita al cliente.',
  '- valora: lo que el cliente valora o elogia. dudasTrabajo: dudas de trabajo que expresa el comercial (precio, condiciones, stock, producto, cómo tramitar algo). peticiones: próximas acciones que el comercial pide a otro departamento.',
  'Escribe en español una lectura para la dirección de Centrimerca, con estas secciones en Markdown:',
  '## Lectura general (2-3 frases)',
  '## Situaciones positivas',
  '## Situaciones negativas',
  '## Oportunidades',
  '## Seguimiento',
  '## Situación de trabajo de cada comercial',
  '## Propuestas (concretas y accionables)',
  'REGLAS:',
  '- Usa SOLO las cifras y los hechos de los datos. No inventes datos, porcentajes, importes ni clientes.',
  '- En «Situación de trabajo de cada comercial» describe la situación de trabajo de cada uno: los problemas que encuentra en sus clientes, las señales positivas que recibe, sus dudas de trabajo y lo que pide a otros departamentos. Si no tiene visitas en el periodo, dilo en una línea.',
  '- ⛔ Nunca describas ni deduzcas el estado emocional, el ánimo, el cansancio, el estrés o la actitud de los comerciales.',
  '- ⛔ No compares a los comerciales entre sí, no los ordenes ni los puntúes, y no valores su rendimiento: describe situaciones.',
  '- Las dudas de trabajo son necesidades de información o de apoyo de la empresa, no fallos del comercial. Proponer cómo resolverlas (formación, una tabla de precios, un contacto) sí es una propuesta válida.',
  '- Si hay menos de 15 reuniones en el periodo, dilo al principio y modera las conclusiones.',
  '- Puedes nombrar clientes para concretar. No copies frases literales de los resúmenes.',
  '- Máximo 450 palabras. Directo, sin adornos.'
].join('\n');

/** Muestra de visitas para la IA: primero las negativas, vencidas y oportunidades. */
function _muestraVisitas(filas) {
  const peso = (f) => (f.situaciones.negativa ? 4 : 0) + (f.situaciones.vencido ? 3 : 0) +
                      (f.situaciones.oportunidad ? 2 : 0) + (f.dudasTrabajo.length ? 2 : 0) +
                      (f.situaciones.positiva ? 1 : 0);
  return filas
    .filter((f) => f.estado === ESTADO_ENVIADA)
    .sort((a, b) => peso(b) - peso(a))
    .slice(0, MAX_VISITAS_LECTURA)
    .map((f) => {
      const sit = SITUACIONES.filter((s) => f.situaciones[s]).join(',') || '—';
      const extra = [
        f.alertas.length ? `alertas:${f.alertas.join(',')}` : '',
        f.objeciones.length ? `objeciones:${f.objeciones.join(',')}` : '',
        f.valora.length ? `valora:${f.valora.join(',')}` : '',
        f.dudasTrabajo.length ? `dudasTrabajo:${f.dudasTrabajo.join(',')}` : ''
      ].filter(Boolean).join(' · ');
      return `- [${f.dia} · ${f.comercial || '?'} · ${f.cliente || '?'} · ${f.resultado || '?'} · interés ${f.interes || '?'} · ${sit}${extra ? ' · ' + extra : ''}] ${f.resumen}`;
    });
}

export const panelLectura = webMethod(
  Permissions.SiteMember,
  async ({ desde, hasta, comercialId } = {}) => {
    const guard = await _exigirAdmin();
    if (!guard.ok) { return { ok: false, error: guard.error }; }
    const err = _validarPeriodo(desde, hasta);
    if (err) { return { ok: false, error: err }; }

    try {
      const b = await _barometro(desde, hasta);
      const id = _txt(comercialId);
      const filas = id ? b.filas.filter((f) => f.comercialId === id) : b.filas;
      const porComercial = id ? b.porComercial.filter((p) => p.comercialId === id) : b.porComercial;
      const enviadas = filas.filter((f) => f.estado === ESTADO_ENVIADA).length;
      if (enviadas === 0) { return { ok: false, error: 'No hay visitas enviadas en el periodo.' }; }

      let apiKey;
      try { apiKey = await getSecret(SECRET_ANTHROPIC); }
      catch (e) { return { ok: false, error: 'Configuración incompleta: falta la clave de la IA.' }; }

      const user =
        `PERIODO: ${desde} a ${hasta}${id ? ' (solo un comercial)' : ''}\n\n` +
        (id ? '' : `BARÓMETRO DEL EQUIPO:\n${JSON.stringify(b.equipo)}\n\n`) +
        `BARÓMETRO POR COMERCIAL:\n${JSON.stringify(porComercial)}\n\n` +
        `MUESTRA DE VISITAS (${Math.min(MAX_VISITAS_LECTURA, enviadas)} de ${enviadas}):\n${_muestraVisitas(filas).join('\n')}`;

      const t0 = Date.now();
      const r = await _llamarModelo(apiKey, MODELO_LECTURA, SYSTEM_LECTURA, user, MAX_TOKENS_LECTURA);
      const ms = Date.now() - t0;
      console.log(`${TAG} lectura ${desde}→${hasta}${id ? ' comercial=' + id : ''} visitas=${enviadas} ${ms}ms in=${r.entrada} out=${r.salida}`);

      return {
        ok: true,
        lectura: { desde, hasta, comercialId: id || null, texto: r.texto, visitas: enviadas, modelo: MODELO_LECTURA, generadoEn: new Date().toISOString(), ms }
      };
    } catch (e) {
      console.error(`${TAG} ❌ panelLectura:`, e);
      return { ok: false, error: 'No se pudo preparar la lectura.', detalle: safeErr(e) };
    }
  }
);

/** Visitas enviadas con transcripción cuyo informe aún no tiene las listas de 1.6.0. */
async function _pendientesReinterpretar() {
  const items = await _todos(wixData.query(C_VISITAS).eq(F.estado, ESTADO_ENVIADA));
  return items.filter((it) => {
    const inf = it[F.informe];
    return _txt(it[F.transcripcion]) && inf && typeof inf === 'object' && !Array.isArray(inf) &&
           !Array.isArray(inf.valora_cliente);
  });
}

export const panelReinterpretarLote = webMethod(
  Permissions.SiteMember,
  async ({ max } = {}) => {
    const guard = await _exigirAdmin();
    if (!guard.ok) { return { ok: false, error: guard.error }; }

    try {
      const n = Math.max(1, Math.min(MAX_LOTE, Number(max) || 2));
      const pendientes = await _pendientesReinterpretar();
      const lote = pendientes.slice(0, n);
      let hechas = 0;
      let errores = 0;
      let motorAntiguo = false;

      await Promise.all(lote.map(async (it) => {
        try {
          const r = await informePruebaCore({ texto: _txt(it[F.transcripcion]), cliente: { nombre: _txt(it[F.cliente]) } });
          if (!r || !r.ok || !r.informe) { errores++; return; }
          if (!Array.isArray(r.informe.valora_cliente) || !Array.isArray(r.informe.dudas_trabajo)) { motorAntiguo = true; return; }

          // READ-MERGE-UPDATE: solo las dos listas nuevas; lo demás, como lo dejó el comercial.
          const actual = await wixData.get(C_VISITAS, it._id, AUTH);
          if (!actual) { errores++; return; }
          const informe = Object.assign({}, _informe(actual), {
            valora_cliente: r.informe.valora_cliente,
            dudas_trabajo:  r.informe.dudas_trabajo
          });
          await wixData.update(C_VISITAS, Object.assign({}, actual, { [F.informe]: informe }), AUTH);
          hechas++;
        } catch (e) {
          console.error(`${TAG} reinterpretar ${it._id}:`, e.message);
          errores++;
        }
      }));

      if (motorAntiguo) {
        return { ok: false, error: 'El motor de informes publicado es anterior al 1.6.0: súbelo antes de reinterpretar.' };
      }
      const quedan = Math.max(0, pendientes.length - hechas);
      console.log(`${TAG} reinterpretar: ${hechas} hechas, ${errores} con error, quedan ${quedan}`);
      return { ok: true, hechas, errores, quedan };
    } catch (e) {
      console.error(`${TAG} ❌ panelReinterpretarLote:`, e);
      return { ok: false, error: 'No se pudo reinterpretar.', detalle: safeErr(e) };
    }
  }
);
