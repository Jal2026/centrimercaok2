/* ═══════════════════════════════════════════════════════════════════════════
 * CENTRIMERCA — Comunicaciones (email vía Brevo) · Backend web module · v1.0.3
 * Ruta: backend/centriComunicaciones.web.js
 * FECHA: 5 Octubre 2026
 *
 * REQUIERE: Comunicaciones.page.js v1.0.1 + Comunicaciones_Centrimerca_v1_0_2.html
 *
 * v1.0.3 (5 Oct 2026):
 *   - header: '' al crear/actualizar la campaña, para que Brevo no añada su
 *     cabecera por defecto («Si usted no es capaz de ver este email…»), que
 *     duplica el enlace de versión web de la plantilla. El parámetro `header`
 *     está documentado; que el valor vacío la suprima se comprueba en la
 *     siguiente prueba (si sigue saliendo, se revierte).
 *
 * v1.0.2 (5 Oct 2026):
 *   - listarCampanias adjunta `datos` (los valores del formulario guardados en
 *     CentriCampanias) a cada campaña hecha con el gestor, sea cual sea su
 *     estado. El widget los usa para «Duplicar como nueva campaña».
 *   - Una campaña en cola (queued) con fecha ya pasada se devuelve como
 *     'enviando': es el estado que deja sendNow mientras Brevo la procesa.
 *
 * v1.0.1 (5 Oct 2026):
 *   - Borrador recuperable. Guardar borrador y enviar prueba escriben una fila
 *     en CentriCampanias con los valores del formulario (Brevo solo guarda el
 *     HTML montado). cargarComunicaciones devuelve el último borrador y el
 *     widget lo restaura. Enviar/programar marca la fila como enviada/programada.
 *   - Nuevo descartarBorradorCampania: marca la fila como 'descartado'.
 *   - Si la campaña guardada ya no existe en Brevo (borrada desde su panel),
 *     se crea una nueva en vez de fallar.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * PROCEDENCIA
 * ───────────────────────────────────────────────────────────────────────────
 * Guard de acceso: COPIA LITERAL de _exigirAdmin() de centriActualidad.web.js
 *   v1.0.1 (copia literal a su vez de centriCatalogo.web.js v1.0.3).
 *   Único cambio: la etiqueta del mensaje denegado dice "gestor de
 *   comunicaciones".
 * Subida de imagen: patrón literal de uploadImagenNoticia (centriActualidad)
 *   sin el READ-MERGE-UPDATE: aquí la URL vuelve al widget, no se guarda en
 *   ninguna colección.
 * Galería: patrón literal de listarImagenesMedia (KAMISUITE whatsappLogic
 *   v1.5.x): mediaManager.listFiles(null, null, { limit, parentFolderId }).
 * Caché de la API key y fetch a Brevo: patrón de brevoLogic.web.js v1.2.0
 *   (KAMISUITE), con una diferencia necesaria: varias respuestas de la API de
 *   campañas son 204 SIN cuerpo, así que el cuerpo se lee como texto y solo
 *   se parsea si no está vacío.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * API DE BREVO USADA (verificada en developers.brevo.com, 5 oct 2026)
 * ───────────────────────────────────────────────────────────────────────────
 *   GET  /v3/contacts/lists?limit&offset            → { lists:[{id,name,uniqueSubscribers}] }
 *        (totalSubscribers está en retirada y vale 0: se usa uniqueSubscribers)
 *   POST /v3/emailCampaigns                          → 201 { id }  (nace en draft)
 *   PUT  /v3/emailCampaigns/{id}                     → 204  (solo draft o programada)
 *   POST /v3/emailCampaigns/{id}/sendTest {emailTo}  → 204 | 400 { unexistingEmails,
 *        withoutListEmails, blackListedEmails }  · máx. 50 pruebas/día
 *   POST /v3/emailCampaigns/{id}/sendNow             → 204 | 402 sin créditos
 *   GET  /v3/emailCampaigns/{id}                     → estado de la campaña
 *   GET  /v3/emailCampaigns?type=classic&statistics=globalStats&excludeHtmlContent=true
 *
 * PROGRAMAR: se hace PUT con scheduledAt y después se LEE la campaña para
 *   comprobar que Brevo la ha dejado en estado 'queued'. Si no, se devuelve
 *   error con el estado real (no se asume nada).
 *
 * ───────────────────────────────────────────────────────────────────────────
 * COLECCIONES Y SECRETO
 * ───────────────────────────────────────────────────────────────────────────
 *   CentriConfig (fila única): remitenteNombre, remitenteEmail, remitenteReplyTo
 *   CentriPlantillas: nombre, descripcion, html, campos (JSON texto), activa, orden
 *   CentriCampanias: campaignId, plantillaId, nombre, asunto, preheader,
 *                    valores (JSON texto), listas (JSON texto), estado  (v1.0.1)
 *   CentriAdmins: email, memberId, activo  (guard)
 *   Secreto: BREVO_CENTRIMERCA
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { webMethod, Permissions } from 'wix-web-module';
import wixData from 'wix-data';
import { mediaManager } from 'wix-media-backend';
import { currentMember } from 'wix-members-backend';
import { getSecret } from 'wix-secrets-backend';
import { fetch } from 'wix-fetch';

const VERSION = '1.0.3';
const TAG = `[Comunicaciones][${VERSION}]`;
const AUTH = { suppressAuth: true };

// ── IDs de colección ───────────────────────────────────────────────────────
const C_CONFIG     = 'CentriConfig';       // fila única
const C_PLANTILLAS = 'CentriPlantillas';
const C_CAMPANIAS  = 'CentriCampanias';    // v1.0.1: estado del formulario por campaña
const C_ADMINS     = 'CentriAdmins';       // idéntico al catálogo/actualidad

// ── Secreto y API ──────────────────────────────────────────────────────────
const SECRETO   = 'BREVO_CENTRIMERCA';
const BREVO_API = 'https://api.brevo.com/v3';

// ── Carpeta del Media Manager ──────────────────────────────────────────────
const CARPETA = '/Centrimerca/Comunicaciones';

// ── Límites ────────────────────────────────────────────────────────────────
const MAX_PRUEBAS     = 10;               // el widget también lo limita a 10
const MARGEN_PROG_MS  = 5 * 60 * 1000;    // programar al menos 5 min en el futuro
const LIMITE_LISTAS   = 50;
const LIMITE_CAMPANAS = 50;

// ═══════════════════════════════════════════════════════════════════════════
// CONTROL DE ACCESO  (copia literal de centriActualidad.web.js v1.0.1)
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
      console.warn(`${TAG} acceso DENEGADO a comunicaciones: email=${email || '—'} memberId=${memberId || '—'} (${filas.length} filas activas en ${C_ADMINS})`);

      const pista = `Detectado: correo ${email || '—'}, memberId ${memberId || '—'}. ` +
                    `${C_ADMINS} tiene ${filas.length} fila(s) con activo=true. ` +
                    `Añade una fila con ese correo en \`email\` y \`activo\` marcado, o pega ese memberId en \`memberId\`.`;
      return { ok: false, error: `No tienes acceso al gestor de comunicaciones. ${pista}` };
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
function _txt(v) { return (v === null || v === undefined) ? '' : String(v).trim(); }

function _num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/* wix:image://v1/<mediaId>/<file>#...  →  https://static.wixstatic.com/media/<mediaId>
   Idéntico a _imgUrl de centriCatalogo / centriActualidad */
function _imgUrl(uri) {
  if (!uri || typeof uri !== 'string') { return ''; }
  if (uri.indexOf('http') === 0) { return uri; }
  const m = uri.match(/wix:image:\/\/v1\/([^/]+)/);
  return m ? ('https://static.wixstatic.com/media/' + m[1]) : '';
}

/* `campos` es un campo de Texto con JSON. Se parsea en bucle por si llega
   doblemente serializado (lección de `temporada`). Devuelve [] si no es un
   array válido: el widget deduce entonces los campos de los marcadores. */
function _parseCampos(v) {
  let x = v;
  for (let i = 0; i < 3 && typeof x === 'string'; i++) {
    const s = x.trim();
    if (!s) { return []; }
    try { x = JSON.parse(s); } catch (e) { return []; }
  }
  return Array.isArray(x) ? x : [];
}

/* v1.0.1: JSON en campo de Texto, parseado en bucle como _parseCampos.
   Devuelve `defecto` si no se puede leer. */
function _parseJson(v, defecto) {
  let x = v;
  for (let i = 0; i < 3 && typeof x === 'string'; i++) {
    const s = x.trim();
    if (!s) { return defecto; }
    try { x = JSON.parse(s); } catch (e) { return defecto; }
  }
  return (x === null || x === undefined) ? defecto : x;
}

/* v1.0.1: guarda en CentriCampanias el estado del formulario de una campaña.
   Una fila por campaignId: READ-MERGE-UPDATE si existe, insert si no.
   Devuelve { ok } o { ok:false, error }. No lanza. */
async function _guardarFila(campania, campaignId, estado) {
  try {
    const c = campania || {};
    const datos = {
      campaignId: String(campaignId),
      plantillaId: _txt(c.plantillaId),
      nombre: _txt(c.nombre),
      asunto: _txt(c.asunto),
      preheader: _txt(c.preheader),
      valores: JSON.stringify((c.valores && typeof c.valores === 'object') ? c.valores : {}),
      listas: JSON.stringify((Array.isArray(c.listas) ? c.listas : []).map(String)),
      estado
    };
    const res = await wixData.query(C_CAMPANIAS).eq('campaignId', String(campaignId)).limit(1).find(AUTH);
    const fila = res.items && res.items[0];
    if (fila) {
      await wixData.update(C_CAMPANIAS, Object.assign({}, fila, datos), AUTH);
    } else {
      await wixData.insert(C_CAMPANIAS, datos, AUTH);
    }
    return { ok: true };
  } catch (e) {
    console.error(`${TAG} ❌ no se pudo guardar ${C_CAMPANIAS} (campaña ${campaignId}):`, e.message);
    return { ok: false, error: e.message };
  }
}

/* v1.0.1: cambia solo el estado de la fila (enviada, programada, descartado). */
async function _marcarEstado(campaignId, estado) {
  try {
    const res = await wixData.query(C_CAMPANIAS).eq('campaignId', String(campaignId)).limit(1).find(AUTH);
    const fila = res.items && res.items[0];
    if (!fila) { return { ok: true }; }
    await wixData.update(C_CAMPANIAS, Object.assign({}, fila, { estado }), AUTH);
    return { ok: true };
  } catch (e) {
    console.error(`${TAG} ❌ no se pudo marcar ${estado} en ${C_CAMPANIAS} (campaña ${campaignId}):`, e.message);
    return { ok: false, error: e.message };
  }
}

/* v1.0.1: último borrador sin enviar, en el formato que restaura el widget. */
async function _leerUltimoBorrador() {
  const res = await wixData.query(C_CAMPANIAS).eq('estado', 'borrador').descending('_updatedDate').limit(1).find(AUTH);
  const f = res.items && res.items[0];
  if (!f || !_txt(f.campaignId)) { return null; }
  return {
    campaignId: _txt(f.campaignId),
    plantillaId: _txt(f.plantillaId),
    nombre: _txt(f.nombre),
    asunto: _txt(f.asunto),
    preheader: _txt(f.preheader),
    valores: _parseJson(f.valores, {}),
    listas: _parseJson(f.listas, [])
  };
}

function _emailValido(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || '')); }

// ── Caché API key (patrón brevoLogic.web.js de KAMISUITE) ───────────────────
const KEY_CACHE_TTL = 30 * 60 * 1000; // 30 min
let _keyCache = null;
let _keyCacheTs = 0;

async function _getBrevoKey() {
  const now = Date.now();
  if (_keyCache && (now - _keyCacheTs) < KEY_CACHE_TTL) {
    return _keyCache;
  }
  try {
    _keyCache = await getSecret(SECRETO);
    _keyCacheTs = now;
    return _keyCache;
  } catch (err) {
    console.error(`${TAG} error obteniendo ${SECRETO}:`, err.message);
    return null;
  }
}

/**
 * Llamada genérica a la API de Brevo.
 * Varias respuestas son 204 sin cuerpo: se lee texto y se parsea solo si hay.
 * Devuelve { ok, status, data }.
 */
async function _brevo(metodo, ruta, cuerpo) {
  const key = await _getBrevoKey();
  if (!key) {
    return { ok: false, status: 0, data: { message: `Secreto ${SECRETO} no disponible.` } };
  }
  try {
    const opts = {
      method: metodo,
      headers: {
        'api-key': key,
        'Accept': 'application/json'
      }
    };
    if (cuerpo !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(cuerpo);
    }
    const response = await fetch(BREVO_API + ruta, opts);
    const texto = await response.text();
    let data = {};
    if (texto) {
      try { data = JSON.parse(texto); } catch (e) { data = { message: texto }; }
    }
    if (!response.ok) {
      console.error(`${TAG} Brevo ${metodo} ${ruta} → ${response.status}:`, texto);
      return { ok: false, status: response.status, data };
    }
    return { ok: true, status: response.status, data };
  } catch (err) {
    console.error(`${TAG} error en fetch a Brevo ${metodo} ${ruta}:`, err.message);
    return { ok: false, status: 0, data: { message: err.message } };
  }
}

// Mensaje legible a partir de una respuesta fallida de Brevo.
function _errBrevo(r, contexto) {
  const d = (r && r.data) || {};
  if (r && r.status === 402) {
    return `${contexto}: Brevo indica que no hay créditos suficientes. Hay que ampliar el plan.`;
  }
  const msg = d.message || d.error || (r && r.status ? `HTTP ${r.status}` : 'sin respuesta');
  const code = d.code ? ` [${d.code}]` : '';
  return `${contexto}: ${msg}${code}`;
}

// ── Config del remitente (CentriConfig, fila única) ─────────────────────────
async function _leerRemitente() {
  const res = await wixData.query(C_CONFIG).limit(1).find(AUTH);
  const c = (res.items && res.items[0]) || {};
  return {
    nombre:  _txt(c.remitenteNombre),
    email:   _txt(c.remitenteEmail),
    replyTo: _txt(c.remitenteReplyTo)
  };
}

// ── Listas de Brevo ─────────────────────────────────────────────────────────
async function _leerListas() {
  const r = await _brevo('GET', `/contacts/lists?limit=${LIMITE_LISTAS}&offset=0&sort=desc`);
  if (!r.ok) { return { ok: false, error: _errBrevo(r, 'No se pudieron leer las listas de Brevo') }; }
  const listas = (r.data.lists || []).map(l => ({
    id: String(l.id),
    nombre: _txt(l.name),
    contactos: _num(l.uniqueSubscribers)
  }));
  return { ok: true, listas };
}

// ── Crear o actualizar la campaña en Brevo (sin programar ni enviar) ────────
// Devuelve { ok, campaignId } o { ok:false, error }.
async function _guardarEnBrevo(campania, remitente) {
  const c = campania || {};
  const asunto = _txt(c.asunto);
  const html = String(c.html || '');

  if (!remitente.email) { return { ok: false, error: 'Falta remitenteEmail en CentriConfig.' }; }
  if (!asunto)          { return { ok: false, error: 'Falta el asunto.' }; }
  if (html.length <= 10) { return { ok: false, error: 'El HTML del correo está vacío.' }; }

  const listIds = (Array.isArray(c.listas) ? c.listas : [])
    .map(x => Number(x))
    .filter(n => Number.isFinite(n) && n > 0);

  const cuerpo = {
    name: _txt(c.nombre) || asunto,
    subject: asunto,
    sender: remitente.nombre ? { name: remitente.nombre, email: remitente.email } : { email: remitente.email },
    htmlContent: html,
    previewText: _txt(c.preheader),
    mirrorActive: true,
    header: ''            // v1.0.3: sin cabecera por defecto de Brevo
  };
  if (remitente.replyTo) { cuerpo.replyTo = remitente.replyTo; }
  if (listIds.length)    { cuerpo.recipients = { listIds }; }

  const id = _txt(c.campaignId);

  if (id) {
    const r = await _brevo('PUT', `/emailCampaigns/${encodeURIComponent(id)}`, cuerpo);
    if (r.ok) { return { ok: true, campaignId: id }; }
    // v1.0.1: si la campaña ya no existe en Brevo, se crea una nueva abajo.
    if (r.status !== 404) { return { ok: false, error: _errBrevo(r, 'No se pudo actualizar la campaña en Brevo') }; }
    console.warn(`${TAG} la campaña ${id} ya no existe en Brevo: se crea una nueva`);
    await _marcarEstado(id, 'descartado');
  }

  const r = await _brevo('POST', '/emailCampaigns', cuerpo);
  if (!r.ok) { return { ok: false, error: _errBrevo(r, 'No se pudo crear la campaña en Brevo') }; }
  const nuevo = r.data && r.data.id;
  if (!nuevo) { return { ok: false, error: 'Brevo no devolvió el id de la campaña.' }; }
  console.log(`${TAG} 🆕 campaña creada en Brevo: ${nuevo}`);
  return { ok: true, campaignId: String(nuevo) };
}

// Estado de Brevo → estado que entiende el widget.
const ESTADO = { sent: 'enviada', queued: 'programada', draft: 'borrador', in_process: 'enviando' };

// ═══════════════════════════════════════════════════════════════════════════
// 1. DATOS INICIALES  (widget: ready → initComunicaciones)
// ═══════════════════════════════════════════════════════════════════════════
export const cargarComunicaciones = webMethod(
  Permissions.SiteMember,
  async () => {
    const guard = await _exigirAdmin();
    if (!guard.ok) { return { ok: false, error: guard.error }; }

    try {
      const [remitente, resPl, resListas, borrador] = await Promise.all([
        _leerRemitente(),
        wixData.query(C_PLANTILLAS).eq('activa', true).ascending('orden').limit(100).find(AUTH),
        _leerListas(),
        _leerUltimoBorrador().catch(e => {
          console.error(`${TAG} no se pudo leer el último borrador:`, e.message);
          return null;
        })
      ]);

      if (!resListas.ok) { return { ok: false, error: resListas.error }; }

      const plantillas = (resPl.items || []).map(it => ({
        id: it._id,
        nombre: _txt(it.nombre),
        descripcion: _txt(it.descripcion),
        html: String(it.html || ''),
        campos: _parseCampos(it.campos)
      }));

      console.log(`${TAG} ✅ carga: ${plantillas.length} plantillas, ${resListas.listas.length} listas, borrador: ${borrador ? borrador.campaignId : 'no'}`);
      return { ok: true, config: { remitente }, plantillas, listas: resListas.listas, borrador };

    } catch (e) {
      console.error(`${TAG} ❌ cargarComunicaciones:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// 2. GUARDAR BORRADOR
// ═══════════════════════════════════════════════════════════════════════════
export const guardarBorradorCampania = webMethod(
  Permissions.SiteMember,
  async ({ campania }) => {
    const guard = await _exigirAdmin();
    if (!guard.ok) { return { ok: false, error: guard.error }; }

    try {
      const remitente = await _leerRemitente();
      const g = await _guardarEnBrevo(campania, remitente);
      if (!g.ok) { return g; }
      // v1.0.1: sin esta fila el borrador no se puede recuperar → se informa.
      const f = await _guardarFila(campania, g.campaignId, 'borrador');
      if (!f.ok) {
        return { ok: false, campaignId: g.campaignId, error: `Guardado en Brevo, pero no en ${C_CAMPANIAS}: ${f.error}` };
      }
      return g;
    } catch (e) {
      console.error(`${TAG} ❌ guardarBorradorCampania:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// 3. ENVIAR PRUEBA  (guarda primero: la prueba es de la versión actual)
// ═══════════════════════════════════════════════════════════════════════════
export const enviarPruebaCampania = webMethod(
  Permissions.SiteMember,
  async ({ campania, emails }) => {
    const guard = await _exigirAdmin();
    if (!guard.ok) { return { ok: false, error: guard.error }; }

    const lista = (Array.isArray(emails) ? emails : []).map(_txt).filter(Boolean);
    if (!lista.length) { return { ok: false, error: 'Falta al menos una dirección de prueba.' }; }
    if (lista.length > MAX_PRUEBAS) { return { ok: false, error: `Máximo ${MAX_PRUEBAS} direcciones de prueba.` }; }
    const malos = lista.filter(e => !_emailValido(e));
    if (malos.length) { return { ok: false, error: `Dirección no válida: ${malos.join(', ')}` }; }

    try {
      const remitente = await _leerRemitente();
      const g = await _guardarEnBrevo(campania, remitente);
      if (!g.ok) { return g; }
      await _guardarFila(campania, g.campaignId, 'borrador');   // v1.0.1 (no bloquea la prueba)

      const r = await _brevo('POST', `/emailCampaigns/${encodeURIComponent(g.campaignId)}/sendTest`, { emailTo: lista });
      if (!r.ok) {
        const d = r.data || {};
        const partes = [];
        if (Array.isArray(d.unexistingEmails) && d.unexistingEmails.length) {
          partes.push(`no existen como contacto en Brevo: ${d.unexistingEmails.join(', ')}`);
        }
        if (Array.isArray(d.withoutListEmails) && d.withoutListEmails.length) {
          partes.push(`no están en ninguna lista de Brevo: ${d.withoutListEmails.join(', ')}`);
        }
        if (Array.isArray(d.blackListedEmails) && d.blackListedEmails.length) {
          partes.push(`están bloqueadas o dadas de baja: ${d.blackListedEmails.join(', ')}`);
        }
        const detalle = partes.length ? ` (${partes.join('; ')})` : '';
        return { ok: false, campaignId: g.campaignId, error: _errBrevo(r, 'No se pudo enviar la prueba') + detalle };
      }

      console.log(`${TAG} 📧 prueba de la campaña ${g.campaignId} enviada a ${lista.join(', ')}`);
      return { ok: true, campaignId: g.campaignId, emails: lista };

    } catch (e) {
      console.error(`${TAG} ❌ enviarPruebaCampania:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// 4. ENVIAR AHORA O PROGRAMAR
// ═══════════════════════════════════════════════════════════════════════════
export const enviarCampania = webMethod(
  Permissions.SiteMember,
  async ({ campania }) => {
    const guard = await _exigirAdmin();
    if (!guard.ok) { return { ok: false, error: guard.error }; }

    const c = campania || {};
    const listas = Array.isArray(c.listas) ? c.listas : [];
    if (!listas.length) { return { ok: false, error: 'No hay listas de destinatarios.' }; }

    const programada = c.modo === 'programada';
    let fechaIso = '';
    if (programada) {
      const t = new Date(c.fecha).getTime();
      if (!Number.isFinite(t)) { return { ok: false, error: 'Fecha de programación no válida.' }; }
      if (t < Date.now() + MARGEN_PROG_MS) { return { ok: false, error: 'La hora programada debe ser al menos 5 minutos posterior a ahora.' }; }
      fechaIso = new Date(t).toISOString();
    }

    try {
      const remitente = await _leerRemitente();
      const g = await _guardarEnBrevo(c, remitente);
      if (!g.ok) { return g; }
      const id = encodeURIComponent(g.campaignId);

      if (!programada) {
        const r = await _brevo('POST', `/emailCampaigns/${id}/sendNow`);
        if (!r.ok) { return { ok: false, campaignId: g.campaignId, error: _errBrevo(r, 'Brevo no ha aceptado el envío') }; }
        await _guardarFila(c, g.campaignId, 'enviada');   // v1.0.1
        console.log(`${TAG} 🚀 campaña ${g.campaignId} enviada ahora (por ${guard.email || guard.memberId})`);
        return { ok: true, campaignId: g.campaignId, programada: false, fecha: '' };
      }

      // Programar: PUT con scheduledAt y comprobación del estado real.
      const rp = await _brevo('PUT', `/emailCampaigns/${id}`, { scheduledAt: fechaIso });
      if (!rp.ok) { return { ok: false, campaignId: g.campaignId, error: _errBrevo(rp, 'Brevo no ha aceptado la programación') }; }

      const rg = await _brevo('GET', `/emailCampaigns/${id}?excludeHtmlContent=true`);
      if (!rg.ok) {
        return { ok: false, campaignId: g.campaignId, error: _errBrevo(rg, 'Programación enviada, pero no se pudo comprobar el estado. Revisa la campaña en Brevo') };
      }
      const estado = _txt(rg.data && rg.data.status);
      if (estado !== 'queued') {
        return { ok: false, campaignId: g.campaignId, error: `Brevo guardó la fecha pero la campaña está en estado "${estado || '—'}", no programada. Revísala en Brevo antes de reintentar.` };
      }

      await _guardarFila(c, g.campaignId, 'programada');   // v1.0.1
      console.log(`${TAG} ⏰ campaña ${g.campaignId} programada para ${fechaIso} (por ${guard.email || guard.memberId})`);
      return { ok: true, campaignId: g.campaignId, programada: true, fecha: fechaIso };

    } catch (e) {
      console.error(`${TAG} ❌ enviarCampania:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// 4b. DESCARTAR BORRADOR (v1.0.1)
// Solo deja de recuperarse en el gestor. La campaña sigue en Brevo como
// borrador; se puede borrar desde su panel si se quiere.
// ═══════════════════════════════════════════════════════════════════════════
export const descartarBorradorCampania = webMethod(
  Permissions.SiteMember,
  async ({ campaignId }) => {
    const guard = await _exigirAdmin();
    if (!guard.ok) { return { ok: false, error: guard.error }; }

    const id = _txt(campaignId);
    if (!id) { return { ok: false, error: 'Falta campaignId.' }; }

    const r = await _marcarEstado(id, 'descartado');
    if (!r.ok) { return { ok: false, campaignId: id, error: r.error }; }
    console.log(`${TAG} 🗑️ borrador ${id} descartado en el gestor`);
    return { ok: true, campaignId: id };
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// 5. SEGUIMIENTO — campañas con estadísticas globales
// ═══════════════════════════════════════════════════════════════════════════
export const listarCampanias = webMethod(
  Permissions.SiteMember,
  async () => {
    const guard = await _exigirAdmin();
    if (!guard.ok) { return { ok: false, error: guard.error }; }

    try {
      const [r, rl] = await Promise.all([
        _brevo('GET', `/emailCampaigns?type=classic&statistics=globalStats&limit=${LIMITE_CAMPANAS}&offset=0&sort=desc&excludeHtmlContent=true`),
        _leerListas()
      ]);
      if (!r.ok) { return { ok: false, error: _errBrevo(r, 'No se pudieron leer las campañas de Brevo') }; }

      const porLista = {};
      ((rl.ok && rl.listas) || []).forEach(l => { porLista[l.id] = l.contactos; });

      // v1.0.2: datos del formulario guardados en CentriCampanias, por campaignId.
      const brutas = r.data.campaigns || [];
      const ids = brutas.map(c => String(c.id));
      const porId = {};
      if (ids.length) {
        try {
          const rf = await wixData.query(C_CAMPANIAS).hasSome('campaignId', ids).limit(1000).find(AUTH);
          (rf.items || []).forEach(f => { porId[_txt(f.campaignId)] = f; });
        } catch (e) {
          console.error(`${TAG} no se pudo leer ${C_CAMPANIAS} para Seguimiento:`, e.message);
        }
      }

      const ahora = Date.now();
      const campanias = brutas.map(c => {
        const gs = (c.statistics && c.statistics.globalStats) || {};
        let estado = ESTADO[c.status] || _txt(c.status);
        // v1.0.2: sendNow la deja en cola con la hora actual → mientras tanto, 'enviando'.
        if (c.status === 'queued') {
          const t = new Date(c.scheduledAt).getTime();
          if (Number.isFinite(t) && t <= ahora) { estado = 'enviando'; }
        }
        const f = porId[String(c.id)];
        const datos = f ? {
          plantillaId: _txt(f.plantillaId),
          nombre: _txt(f.nombre),
          asunto: _txt(f.asunto),
          preheader: _txt(f.preheader),
          valores: _parseJson(f.valores, {}),
          listas: _parseJson(f.listas, [])
        } : null;
        const listasIds = (c.recipients && Array.isArray(c.recipients.lists)) ? c.recipients.lists : [];
        const previstos = listasIds.reduce((t, id) => t + _num(porLista[String(id)]), 0);
        return {
          id: String(c.id),
          nombre: _txt(c.name),
          asunto: _txt(c.subject),
          estado,
          fecha: _txt(c.sentDate) || _txt(c.scheduledAt) || '',
          destinatarios: c.status === 'sent' ? _num(gs.sent) : previstos,
          entregados: _num(gs.delivered),
          aperturas: _num(gs.uniqueViews),
          clics: _num(gs.uniqueClicks),
          bajas: _num(gs.unsubscriptions),
          rebotes: _num(gs.hardBounces) + _num(gs.softBounces),
          datos
        };
      });

      return { ok: true, campanias };

    } catch (e) {
      console.error(`${TAG} ❌ listarCampanias:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// 6. SUBIR IMAGEN PARA UNA CAMPAÑA
// Patrón literal de uploadImagenNoticia (centriActualidad), sin escribir en
// colección: la URL pública vuelve al widget, que la pone en el campo.
// ═══════════════════════════════════════════════════════════════════════════
export const subirImagenCampania = webMethod(
  Permissions.SiteMember,
  async ({ base64Data, fileName, mimeType }) => {
    const guard = await _exigirAdmin();
    if (!guard.ok) { return { ok: false, error: guard.error }; }

    if (!base64Data || !fileName) {
      return { ok: false, error: 'Faltan parámetros (base64Data, fileName).' };
    }

    try {
      const buffer = Buffer.from(base64Data, 'base64');
      const uploadResult = await mediaManager.upload(
        CARPETA,
        buffer,
        fileName,
        {
          mediaOptions: {
            mimeType: mimeType || 'image/jpeg',
            mediaType: 'image'
          },
          metadataOptions: {
            isPrivate: false,
            isVisitorUpload: false
          }
        }
      );

      const fileUrl = (uploadResult && uploadResult.fileUrl) || '';
      if (!fileUrl) { return { ok: false, error: 'Media Manager no devolvió fileUrl.' }; }

      const publicUrl = _imgUrl(fileUrl);
      console.log(`${TAG} ✅ imagen subida: ${publicUrl}`);
      return { ok: true, fileUrl, publicUrl };

    } catch (e) {
      console.error(`${TAG} ❌ subirImagenCampania:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// 7. GALERÍA — imágenes del Media Manager
// Patrón literal de listarImagenesMedia (KAMISUITE): lista la raíz.
// ═══════════════════════════════════════════════════════════════════════════
export const listarGaleria = webMethod(
  Permissions.SiteMember,
  async () => {
    const guard = await _exigirAdmin();
    if (!guard.ok) { return { ok: false, error: guard.error }; }

    try {
      const result = await mediaManager.listFiles(
        null,
        null,
        {
          limit: 50,
          parentFolderId: undefined
        }
      );

      const imagenes = (result || [])
        .filter(f => f.mediaType === 'image')
        .map(f => ({
          url: _imgUrl(f.fileUrl),
          nombre: f.originalFileName || f.fileName || ''
        }))
        .filter(im => !!im.url);

      return { ok: true, imagenes };

    } catch (e) {
      console.error(`${TAG} ❌ listarGaleria:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);
