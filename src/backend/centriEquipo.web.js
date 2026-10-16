/* ═══════════════════════════════════════════════════════════════════════════
 * CENTRIMERCA — Gestor de Equipo · Backend web module · v1.0.5
 * Ruta: backend/centriEquipo.web.js
 * FECHA: 16 Octubre 2026
 *
 * REQUIERE: GestorEquipo.page.js v1.0.3 (sin cambios) + gestorequipo v1.0.5.html
 *
 * v1.0.5: el ÁREA se lee y se escribe en `area1`.
 *   - `area1` es el field key real del campo «area» de `equipo` (esquema
 *     leído con la API de colecciones el 16/10). La v1.0.4 escribía en
 *     `area`, una clave que no existía, y el CMS la añadió sola como campo
 *     nuevo. Jal lo ha borrado.
 *   - Único cambio: F.area = 'area1'. El widget sigue mandando y recibiendo
 *     `area`: es el nombre dentro del mensaje, no el del campo.
 *
 * v1.0.4: ficha de contacto (centriFichaContacto.web.js + fichaContacto.js).
 *   - Campos nuevos (esquema confirmado por Jal el 14/10): area, web,
 *     direccion, slug, fotoAgenda, fotoGeneral.
 *   - `area` es el ÁREA (píldora de la ficha y filtro del gestor).
 *     `descripcion` pasa a ser el texto de PRESENTACIÓN de la ficha.
 *   - guardarMiembro escribe area, web, direccion y fotoAgenda SOLO si
 *     llegan en `datos` (un widget antiguo no los borra). Ya NO escribe
 *     `vcard` ni genera el QR desde la vCard: el campo `vcard` (QR TIGER) se
 *     conserva tal cual por READ-MERGE-UPDATE y deja de editarse.
 *   - SLUG automático, nunca editable y nunca cambia una vez asignado. Se
 *     asigna cuando la persona está VISIBLE (activo = true) y no tiene slug:
 *     al abrir el gestor (filas existentes), al guardar y al marcar visible.
 *     Así una copia «(copia)», que nace no visible, recibe su slug cuando
 *     ya se ha renombrado y se publica. Colisiones: -2, -3…
 *   - QR de la FICHA: https://www.centrimerca.com/equipo/<slug> con el
 *     patrón de quickchart de siempre. Sustituye al QR generado (desde la
 *     vCard o desde la ficha) cuando cambia el destino. Un QR SUBIDO a mano
 *     no se toca nunca, salvo que se pida con datos.qrFicha === true
 *     («Usar QR de la ficha» en el widget).
 *   - uploadImagenMiembro acepta campo 'fotoGeneral'.
 *   - duplicarMiembro copia area, web, direccion, fotoGeneral y fotoAgenda.
 *     NO copia slug, qr ni vcard: los tres apuntan a la persona original.
 *   - toggleMiembroActivo devuelve también `miembro` (slug/QR recién
 *     asignados al hacerse visible).
 *   - _mapMiembro devuelve los campos nuevos y fichaUrl.
 *
 * v1.0.3: visible / no visible y duplicar.
 *   - Campo `activo` (Booleano, verificado en el esquema el 14/10).
 *   - guardarMiembro escribe `activo`. Alta: no visible salvo que se marque.
 *   - toggleMiembroActivo({ miembroId, valor }): READ-MERGE-UPDATE de `activo`.
 *   - duplicarMiembro({ miembroId }): crea una copia con los campos de la
 *     ficha (lista blanca, nunca el registro entero), nombre + " (copia)",
 *     NO visible, colocada justo debajo del original.
 *
 * v1.0.2: el ORDEN se edita desde el gestor.
 *   - moverMiembro({ miembroId, prevId, nextId }): escribe en la fila movida
 *     una clave de orden estrictamente entre las de sus nuevos vecinos. Solo
 *     se toca la fila movida.
 *   - El campo es el de orden manual de la colección (F.orden), el mismo por el
 *     que ordena la página pública /centrimercaequipo (verificado 13/10: la web
 *     muestra las 23 personas en el orden de esas claves, comparadas como texto).
 *     Escritura del campo verificada contra la colección real (13/10, revertida).
 *   - Altas: entran al final (clave posterior a la última).
 *   - Mensajes visibles sin referencias a la plataforma.
 *
 * v1.0.1: el QR se puede cambiar desde el gestor.
 *   - uploadImagenMiembro acepta `campo` ('imagen' | 'qr'): subir un QR propio.
 *   - guardarMiembro acepta datos.qrDesdeVcard === true: genera el QR desde la
 *     vCard con el patrón de las filas existentes.
 *   - Al cambiar la vCard, el QR solo se regenera si el guardado ES el generado
 *     desde la vCard anterior. Un QR subido a mano no se toca nunca.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * PROCEDENCIA
 * ───────────────────────────────────────────────────────────────────────────
 * Guard de acceso: COPIA LITERAL de _exigirAdmin() de centriActualidad.web.js
 *   v1.0.1 (que a su vez es copia literal de centriCatalogo.web.js v1.0.3 →
 *   centriEntrenador.web.js v1.0.0). Autoriza por email O memberId en
 *   CentriAdmins, falla cerrado. Único cambio: la etiqueta del mensaje
 *   denegado dice "gestor de equipo".
 * Subida de imágenes: patrón literal de uploadImagenNoticia() /
 *   subirImagenCatalogo() — mediaManager.upload → fileUrl → READ-MERGE-UPDATE.
 * Estructura (listar / guardar / eliminar / subir): la de centriActualidad.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * FIELD KEYS — LEÍDOS DEL ESQUEMA REAL DE `equipo` (API de colecciones, 13/10)
 * ───────────────────────────────────────────────────────────────────────────
 * nombre (Texto) · rol (Texto) · descripcion (Texto plano) · imagen (Imagen)
 * email (Email, cifrado) · numeroTelefono (NÚMERO) · vcard (URL)
 * qr (Imagen; en los datos guarda una URL de quickchart.io)
 * v1.0.4 (confirmados 14/10): web (URL) · direccion (TEXT)
 * v1.0.5 (leído 16/10): area1 (TEXT, rotulado «area»)
 * slug (TEXT) · fotoAgenda (TEXT: empleado|general) · fotoGeneral (IMAGE)
 * Orden: campo de orden manual de la colección (F.orden), claves de texto en
 *   alfabeto 0-9a-z que se comparan como texto ("0q" < "0qg" < "0r8" < "6").
 *   ⚠️ El key incluye un UUID propio de esta colección: si algún día se rehace
 *   el orden manual de la colección, hay que releer el key del esquema.
 *
 * Campos que este módulo NO toca y conserva por READ-MERGE-UPDATE:
 * createdDate, updatedDate, owner, createdDate1, updatedDate1, owner1,
 * createdDate11, updatedDate11, owner11 (restos de importaciones CSV).
 *
 * QR: el patrón NO se inventa. Las 23 filas existentes guardan
 *   qr = https://quickchart.io/qr?text=<vcard codificada>&size=300&margin=1&ecLevel=M&format=png
 *   Ese patrón se usa en el alta, al pulsar «Generar QR desde la vCard» y al
 *   cambiar la vCard de una fila cuyo QR era el generado de la vCard anterior.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { webMethod, Permissions } from 'wix-web-module';
import wixData from 'wix-data';
import { mediaManager } from 'wix-media-backend';
import { currentMember } from 'wix-members-backend';

const VERSION = '1.0.5';
const TAG = `[Equipo][${VERSION}]`;
const AUTH = { suppressAuth: true };

// ── IDs de colección ───────────────────────────────────────────────────────
const COL      = 'equipo';         // ID real de la colección (minúscula)
const C_ADMINS = 'CentriAdmins';   // idéntico al catálogo/entrenador/actualidad

// ── Carpeta del Media Manager ──────────────────────────────────────────────
const CARPETA = '/Centrimerca/Equipo';

const LIMITE = 1000;

// ── Field keys de `equipo` (esquema real) ──────────────────────────────────
const F = {
  nombre:      'nombre',
  rol:         'rol',
  descripcion: 'descripcion',     // "Texto" plano (no enriquecido)
  imagen:      'imagen',          // "Imagen" → wix:image:// (solo se escribe vía subida)
  email:       'email',           // "Email" (cifrado en el CMS)
  telefono:    'numeroTelefono',  // ⚠️ "Número": sin +34, sin espacios, sin 0 inicial
  vcard:       'vcard',           // "URL"
  qr:          'qr',              // "Imagen"; en los datos guarda URL de quickchart.io
  activo:      'activo',          // "Booleano": visible en la web
  orden:       '_manualSort_70208d3c-3970-4f20-ac00-b50accefda3d',  // orden manual de la colección
  // v1.0.4 — ficha de contacto
  area:        'area1',           // "Texto" rotulado «area»: área (píldora de la ficha, filtro). v1.0.5
  web:         'web',             // "URL"
  direccion:   'direccion',       // "Texto"
  slug:        'slug',            // "Texto": lo asigna el sistema, nunca cambia
  fotoAgenda:  'fotoAgenda',      // "Texto": 'empleado' | 'general' (vacío = empleado)
  fotoGeneral: 'fotoGeneral'      // "Imagen": portada de la ficha
};

// Campos de imagen que admite la subida.
const CAMPOS_IMAGEN = { imagen: F.imagen, qr: F.qr, fotoGeneral: F.fotoGeneral };

// ── Patrón del QR, copiado de los datos existentes ─────────────────────────
const QR_BASE   = 'https://quickchart.io/qr?text=';
const QR_PARAMS = '&size=300&margin=1&ecLevel=M&format=png';

// ── Ficha de contacto (v1.0.4) ─────────────────────────────────────────────
// Página dinámica de `equipo` con URL /equipo/{slug}. Es lo que codifica el QR.
const FICHA_BASE  = 'https://www.centrimerca.com/equipo/';
const FOTO_AGENDA = ['empleado', 'general'];

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
      console.warn(`${TAG} acceso DENEGADO a equipo: email=${email || '—'} memberId=${memberId || '—'} (${filas.length} filas activas en ${C_ADMINS})`);

      const pista = `Detectado: correo ${email || '—'}, memberId ${memberId || '—'}. ` +
                    `${C_ADMINS} tiene ${filas.length} fila(s) con activo=true. ` +
                    `Añade una fila con ese correo en \`email\` y \`activo\` marcado, o pega ese memberId en \`memberId\`.`;
      return { ok: false, error: `No tienes acceso al gestor de equipo. ${pista}` };
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

/* wix:image://v1/<mediaId>/<file>#...  →  https://static.wixstatic.com/media/<mediaId>
   Idéntico a _imgUrl de centriCatalogo.web.js / centriActualidad.web.js */
function _imgUrl(uri) {
  if (!uri || typeof uri !== 'string') { return ''; }
  if (uri.indexOf('http') === 0) { return uri; }
  const m = uri.match(/wix:image:\/\/v1\/([^/]+)/);
  return m ? ('https://static.wixstatic.com/media/' + m[1]) : '';
}

// ── Ficha de contacto (v1.0.4) ─────────────────────────────────────────────
// El QR deja de generarse desde la vCard (QR TIGER): ahora codifica la URL de
// la ficha, con el mismo patrón de quickchart que ya tienen las filas.

// Slug: minúsculas, sin tildes, guiones. Igual que centriFichaContacto.web.js.
function _slugDe(nombre) {
  return _txt(nombre)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Slug único en la colección (sin contar la propia fila): base, base-2, base-3…
function _slugUnico(base, filas, excluirId) {
  const raiz = base || 'persona';
  const usados = {};
  (filas || []).forEach(f => {
    if (excluirId && f._id === excluirId) { return; }
    const s = _txt(f[F.slug]);
    if (s) { usados[s] = true; }
  });
  if (!usados[raiz]) { return raiz; }
  let n = 2;
  while (usados[raiz + '-' + n]) { n++; }
  return raiz + '-' + n;
}

function _fichaUrl(slug) {
  const s = _txt(slug);
  return s ? (FICHA_BASE + s) : '';
}

function _qrFicha(slug) {
  const u = _fichaUrl(slug);
  return u ? (QR_BASE + encodeURIComponent(u) + QR_PARAMS) : '';
}

// QR generado por el sistema (quickchart: desde la vCard antigua o desde la
// ficha) o vacío → se puede sustituir. Un QR subido (wix:image://…) NO.
function _qrEsGenerado(qr) {
  const q = _txt(qr);
  return !q || q.indexOf(QR_BASE) === 0;
}

/* Cambios para que una fila VISIBLE tenga su ficha publicable:
   · slug, si no tiene (único; nunca se cambia uno existente)
   · QR de la ficha, si el actual es generado y apunta a otro sitio
     (forzarQr = true lo pone aunque el actual sea un QR subido a mano)
   Fila no visible → {} (no se asigna nada). */
function _cambiosFicha(fila, filas, forzarQr) {
  const cambios = {};
  if (fila[F.activo] !== true) { return cambios; }

  let slug = _txt(fila[F.slug]);
  if (!slug) {
    slug = _slugUnico(_slugDe(fila[F.nombre]), filas, fila._id);
    cambios[F.slug] = slug;
  }

  const qr = _qrFicha(slug);
  if (qr && _txt(fila[F.qr]) !== qr && (forzarQr || _qrEsGenerado(fila[F.qr]))) {
    cambios[F.qr] = qr;
  }
  return cambios;
}

// Al abrir el gestor: pone al día las filas visibles (slug + QR de la ficha).
// Una por una (READ-MERGE-UPDATE con la fila leída). Un fallo en una fila no
// impide cargar el gestor.
async function _asegurarFichas(filas) {
  for (const f of filas) {
    const cambios = _cambiosFicha(f, filas, false);
    if (!Object.keys(cambios).length) { continue; }
    try {
      await wixData.update(COL, Object.assign({}, f, cambios), AUTH);
      Object.assign(f, cambios);
      console.log(`${TAG} ficha al día ${f._id}: ${JSON.stringify(cambios)}`);
    } catch (e) {
      console.error(`${TAG} ❌ no pude poner al día la ficha ${f._id}:`, e.message);
    }
  }
  return filas;
}

// `numeroTelefono` es de tipo Número: se aceptan cifras (y espacios/puntos/
// guiones, que se quitan). Se rechaza lo que el Número perdería en silencio
// (+34, letras, 0 inicial).
function _telefono(v) {
  const s = _txt(v).replace(/[\s.\-()]/g, '');
  if (!s) { return { ok: true, valor: null }; }
  if (!/^\d+$/.test(s)) {
    return { ok: false, error: 'El teléfono solo admite cifras, sin +34 ni letras.' };
  }
  if (s.charAt(0) === '0') {
    return { ok: false, error: 'El teléfono no puede empezar por 0.' };
  }
  return { ok: true, valor: Number(s) };
}

function _emailValido(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

function _urlValida(u) { return /^https?:\/\/\S+$/i.test(u); }

// Orden manual de la colección (cadena). Las filas sin clave van al final.
function _compararOrden(a, b) {
  const ka = a[F.orden];
  const kb = b[F.orden];
  const ta = (typeof ka === 'string' && ka !== '');
  const tb = (typeof kb === 'string' && kb !== '');
  if (ta && tb) { return ka < kb ? -1 : (ka > kb ? 1 : 0); }
  if (ta) { return -1; }
  if (tb) { return 1; }
  return 0;
}

// ── Claves de orden ────────────────────────────────────────────────────────
// Alfabeto de las claves existentes (0-9a-z). Se comparan como texto.
const DIGITOS = '0123456789abcdefghijklmnopqrstuvwxyz';

function _claveValida(k) { return typeof k === 'string' && /^[0-9a-z]*[1-9a-z]$/.test(k); }

// Clave estrictamente entre a y b, comparando como texto.
// a = '' → antes del primero · b = null → después del último.
// Punto medio de índices fraccionarios (algoritmo de rocicorp/fractional-indexing,
// dominio público CC0). Requiere claves sin '0' final, como las existentes.
function _claveEntre(a, b) {
  const cero = DIGITOS[0];
  if (b !== null && a >= b) { throw new Error(`orden inconsistente: "${a}" >= "${b}"`); }
  if (a.slice(-1) === cero || (b && b.slice(-1) === cero)) { throw new Error('clave de orden con 0 final'); }
  if (b) {
    let n = 0;
    while ((a[n] || cero) === b[n]) { n++; }
    if (n > 0) { return b.slice(0, n) + _claveEntre(a.slice(n), b.slice(n)); }
  }
  const dA = a ? DIGITOS.indexOf(a[0]) : 0;
  const dB = (b !== null) ? DIGITOS.indexOf(b[0]) : DIGITOS.length;
  if (dB - dA > 1) { return DIGITOS[Math.round(0.5 * (dA + dB))]; }
  if (b && b.length > 1) { return b.slice(0, 1); }
  return DIGITOS[dA] + _claveEntre(a.slice(1), null);
}

// Lee toda la colección y la devuelve en el orden de la web.
async function _leerOrdenado() {
  const res = await wixData.query(COL)
    .limit(LIMITE)
    .find(AUTH);
  return (res.items || []).slice().sort(_compararOrden);
}

// Clave para una fila nueva: detrás de la última.
function _claveAlFinal(filas) {
  let ultima = '';
  filas.forEach(f => { if (_claveValida(f[F.orden])) { ultima = f[F.orden]; } });
  return _claveEntre(ultima, null);
}

// Filas sin clave (p. ej. altas antiguas): se les da clave al final, en su orden.
async function _asegurarClaves(filas) {
  let ultima = '';
  for (const f of filas) {
    const k = f[F.orden];
    if (typeof k === 'string' && k !== '') { ultima = k; continue; }
    const nueva = _claveEntre(ultima, null);
    await wixData.update(COL, Object.assign({}, f, { [F.orden]: nueva }), AUTH);
    console.log(`${TAG} clave de orden asignada a ${f._id}: ${nueva}`);
    f[F.orden] = nueva;
    ultima = nueva;
  }
  return filas;
}

// De fila de la colección → objeto que consume el widget.
function _mapMiembro(it) {
  const tel = it[F.telefono];
  return {
    id:          it._id,
    nombre:      _txt(it[F.nombre]),
    rol:         _txt(it[F.rol]),
    descripcion: _txt(it[F.descripcion]),
    email:       _txt(it[F.email]),
    telefono:    (typeof tel === 'number' && Number.isFinite(tel)) ? String(tel) : _txt(tel),
    vcard:       _txt(it[F.vcard]),
    qr:          _imgUrl(it[F.qr]),
    imagen:      _imgUrl(it[F.imagen]),
    activo:      it[F.activo] === true,
    // v1.0.4
    area:        _txt(it[F.area]),
    web:         _txt(it[F.web]),
    direccion:   _txt(it[F.direccion]),
    slug:        _txt(it[F.slug]),
    fichaUrl:    _fichaUrl(it[F.slug]),
    fotoAgenda:  _txt(it[F.fotoAgenda]) === 'general' ? 'general' : 'empleado',
    fotoGeneral: _imgUrl(it[F.fotoGeneral])
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. LISTAR EQUIPO  (en el orden de la web)
// ═══════════════════════════════════════════════════════════════════════════
export const listarEquipo = webMethod(
  Permissions.SiteMember,
  async () => {
    const guard = await _exigirAdmin();
    if (!guard.ok) { return { ok: false, error: guard.error }; }

    try {
      // v1.0.4: las filas visibles reciben slug y QR de la ficha si les faltan.
      const filas = await _asegurarFichas(await _leerOrdenado());
      const equipo = filas.map(_mapMiembro);
      console.log(`${TAG} listar: ${equipo.length} personas`);
      return { ok: true, equipo };

    } catch (e) {
      console.error(`${TAG} ❌ listarEquipo — revisa el ID de colección (COL="${COL}"):`, e.message);
      return { ok: false, error: `No pude leer equipo: ${e.message}` };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// 2. GUARDAR PERSONA (alta o edición)
// La foto, la foto general y el QR subido NO se escriben aquí: se suben
// aparte (uploadImagenMiembro). En edición se hace READ-MERGE-UPDATE para no
// pisar imágenes, `vcard` ni otros campos.
// v1.0.4: `vcard` ya no se escribe ni genera QR. Si la persona queda VISIBLE,
// _cambiosFicha le asigna slug (si no tiene) y el QR de la ficha (si el
// actual es generado; con datos.qrFicha === true, aunque sea uno subido).
// ═══════════════════════════════════════════════════════════════════════════
export const guardarMiembro = webMethod(
  Permissions.SiteMember,
  async ({ miembroId, datos }) => {
    const guard = await _exigirAdmin();
    if (!guard.ok) { return { ok: false, error: guard.error }; }

    const d = datos || {};
    const nombre = _txt(d.nombre);
    if (!nombre) { return { ok: false, error: 'El nombre es obligatorio.' }; }

    const email = _txt(d.email);
    if (email && !_emailValido(email)) { return { ok: false, error: `Email no válido: ${email}` }; }

    const tel = _telefono(d.telefono);
    if (!tel.ok) { return { ok: false, error: tel.error }; }

    // v1.0.4 — web: se admite sin protocolo (se antepone https://).
    let web = _txt(d.web);
    if (web && !/^https?:\/\//i.test(web)) { web = 'https://' + web; }
    if (web && !_urlValida(web)) { return { ok: false, error: `Web no válida: ${web}` }; }

    const fotoAgenda = _txt(d.fotoAgenda);
    if (fotoAgenda && FOTO_AGENDA.indexOf(fotoAgenda) < 0) {
      return { ok: false, error: 'Foto del contacto en la agenda: valor no válido.' };
    }

    const qrFicha = (d.qrFicha === true);

    try {
      const campos = {
        [F.nombre]:      nombre,
        [F.rol]:         _txt(d.rol),
        [F.descripcion]: _txt(d.descripcion),
        [F.email]:       email || null,
        [F.telefono]:    tel.valor,
        [F.activo]:      d.activo === true
      };
      // v1.0.4 — solo si llegan: un widget antiguo no los borra.
      if (d.area !== undefined)       { campos[F.area] = _txt(d.area) || null; }
      if (d.web !== undefined)        { campos[F.web] = web || null; }
      if (d.direccion !== undefined)  { campos[F.direccion] = _txt(d.direccion) || null; }
      if (d.fotoAgenda !== undefined) { campos[F.fotoAgenda] = fotoAgenda || null; }

      // Toda la colección: unicidad del slug y clave de orden de las altas.
      const filas = await _leerOrdenado();

      let guardado;
      if (miembroId) {
        const actual = await wixData.get(COL, miembroId, AUTH);
        if (!actual) { return { ok: false, error: 'Persona no encontrada.' }; }
        const fila = Object.assign({}, actual, campos);
        Object.assign(fila, _cambiosFicha(fila, filas, qrFicha));
        guardado = await wixData.update(COL, fila, AUTH);
      } else {
        const fila = Object.assign({}, campos);
        // Alta: entra al final de la lista.
        try {
          fila[F.orden] = _claveAlFinal(filas);
        } catch (eOrden) {
          console.warn(`${TAG} alta sin clave de orden (se asignará al mover):`, eOrden.message);
        }
        Object.assign(fila, _cambiosFicha(fila, filas, qrFicha));
        guardado = await wixData.insert(COL, fila, AUTH);
      }

      console.log(`${TAG} ✅ persona ${miembroId ? 'actualizada' : 'creada'}: ${guardado._id}`);
      return { ok: true, miembro: _mapMiembro(guardado) };

    } catch (e) {
      console.error(`${TAG} ❌ guardarMiembro:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// 2b. MOVER PERSONA (orden)
// prevId / nextId = vecinos tras el movimiento ('' si es el primero/último).
// Se leen las claves frescas, se calcula una estrictamente entre las de los
// vecinos y se escribe SOLO en la fila movida (READ-MERGE-UPDATE).
// Devuelve la lista completa en el orden nuevo.
// ═══════════════════════════════════════════════════════════════════════════
export const moverMiembro = webMethod(
  Permissions.SiteMember,
  async ({ miembroId, prevId, nextId }) => {
    const guard = await _exigirAdmin();
    if (!guard.ok) { return { ok: false, error: guard.error }; }
    if (!miembroId) { return { ok: false, error: 'Falta miembroId.' }; }
    if (miembroId === prevId || miembroId === nextId) { return { ok: false, error: 'Movimiento no válido.' }; }

    try {
      const filas = await _asegurarClaves(await _leerOrdenado());

      const porId = {};
      filas.forEach(f => { porId[f._id] = f; });

      const fila = porId[miembroId];
      if (!fila) { return { ok: false, error: 'Persona no encontrada.' }; }
      const prev = prevId ? porId[prevId] : null;
      const next = nextId ? porId[nextId] : null;
      if ((prevId && !prev) || (nextId && !next)) {
        return { ok: false, error: 'La lista ha cambiado. Recarga la página.' };
      }

      const a = prev ? prev[F.orden] : '';
      const b = next ? next[F.orden] : null;
      if ((prev && !_claveValida(a)) || (next && !_claveValida(b))) {
        throw new Error(`clave de orden no válida: "${a}" / "${b}"`);
      }

      const clave = _claveEntre(a, b);
      if (!(clave > a) || (b !== null && !(clave < b))) {
        throw new Error(`clave fuera de rango: "${a}" < "${clave}" < "${b}"`);
      }

      await wixData.update(COL, Object.assign({}, fila, { [F.orden]: clave }), AUTH);
      console.log(`${TAG} ✅ orden ${miembroId}: "${fila[F.orden]}" → "${clave}" (entre "${a}" y "${b}")`);

      const equipo = (await _leerOrdenado()).map(_mapMiembro);
      return { ok: true, equipo };

    } catch (e) {
      console.error(`${TAG} ❌ moverMiembro:`, e.message);
      return { ok: false, error: 'No se pudo guardar el nuevo orden. Recarga la página e inténtalo de nuevo.' };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// 2c. VISIBLE / NO VISIBLE  (READ-MERGE-UPDATE de `activo`)
// Mismo patrón que toggleNoticiaCampo (centriActualidad.web.js).
// v1.0.4: al hacerse visible recibe slug y QR de la ficha si le faltan, y se
// devuelve también `miembro` para que el widget los muestre.
// ═══════════════════════════════════════════════════════════════════════════
export const toggleMiembroActivo = webMethod(
  Permissions.SiteMember,
  async ({ miembroId, valor }) => {
    const guard = await _exigirAdmin();
    if (!guard.ok) { return { ok: false, error: guard.error }; }
    if (!miembroId) { return { ok: false, error: 'Falta miembroId.' }; }

    try {
      const actual = await wixData.get(COL, miembroId, AUTH);
      if (!actual) { return { ok: false, error: 'Persona no encontrada.' }; }

      const nuevoValor = (valor === true || valor === 'true');
      const fila = Object.assign({}, actual, { [F.activo]: nuevoValor });
      if (nuevoValor) {
        Object.assign(fila, _cambiosFicha(fila, await _leerOrdenado(), false));
      }
      const guardado = await wixData.update(COL, fila, AUTH);

      console.log(`${TAG} ✅ activo ${miembroId}: ${nuevoValor}`);
      return { ok: true, id: miembroId, valor: nuevoValor, miembro: _mapMiembro(guardado) };

    } catch (e) {
      console.error(`${TAG} ❌ toggleMiembroActivo:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// 2d. DUPLICAR PERSONA
// Copia SOLO los campos de la ficha (lista blanca). Nunca el registro entero:
// así no se copian _id, la clave de orden, enlaces de página ni campos sueltos.
// La copia nace NO visible, con nombre + " (copia)", justo debajo del original.
// Devuelve la copia y la lista completa en el orden nuevo.
// v1.0.4: + area, web, direccion, fotoGeneral, fotoAgenda. Fuera vcard y qr:
// igual que el slug, apuntan a la persona original. La copia recibe slug y QR
// propios cuando se publica (visible).
// ═══════════════════════════════════════════════════════════════════════════
const CAMPOS_DUPLICABLES = [
  F.rol, F.descripcion, F.imagen, F.email, F.telefono,
  F.area, F.web, F.direccion, F.fotoGeneral, F.fotoAgenda
];

export const duplicarMiembro = webMethod(
  Permissions.SiteMember,
  async ({ miembroId }) => {
    const guard = await _exigirAdmin();
    if (!guard.ok) { return { ok: false, error: guard.error }; }
    if (!miembroId) { return { ok: false, error: 'Falta miembroId.' }; }

    try {
      const filas = await _asegurarClaves(await _leerOrdenado());
      const i = filas.findIndex(f => f._id === miembroId);
      if (i < 0) { return { ok: false, error: 'Persona no encontrada.' }; }
      const origen = filas[i];

      const copia = {
        [F.nombre]: `${_txt(origen[F.nombre])} (copia)`,
        [F.activo]: false
      };
      CAMPOS_DUPLICABLES.forEach(k => {
        if (origen[k] !== undefined && origen[k] !== null) { copia[k] = origen[k]; }
      });

      // Justo debajo del original.
      try {
        const a = origen[F.orden];
        const b = (i + 1 < filas.length) ? filas[i + 1][F.orden] : null;
        const clave = _claveEntre(a, b);
        if (clave > a && (b === null || clave < b)) { copia[F.orden] = clave; }
      } catch (eOrden) {
        console.warn(`${TAG} copia sin clave de orden (irá al final):`, eOrden.message);
      }

      const creada = await wixData.insert(COL, copia, AUTH);
      console.log(`${TAG} ✅ duplicada ${miembroId} → ${creada._id}`);

      const equipo = (await _leerOrdenado()).map(_mapMiembro);
      return { ok: true, miembro: _mapMiembro(creada), equipo };

    } catch (e) {
      console.error(`${TAG} ❌ duplicarMiembro:`, e.message);
      return { ok: false, error: 'No se pudo duplicar la ficha.' };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// 3. ELIMINAR PERSONA
// ═══════════════════════════════════════════════════════════════════════════
export const eliminarMiembro = webMethod(
  Permissions.SiteMember,
  async ({ miembroId }) => {
    const guard = await _exigirAdmin();
    if (!guard.ok) { return { ok: false, error: guard.error }; }
    if (!miembroId) { return { ok: false, error: 'Falta miembroId.' }; }

    try {
      await wixData.remove(COL, miembroId, AUTH);
      console.log(`${TAG} 🗑️ persona eliminada: ${miembroId}`);
      return { ok: true };

    } catch (e) {
      console.error(`${TAG} ❌ eliminarMiembro:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// 4. SUBIR FOTO O QR DE PERSONA
// Patrón literal de uploadImagenNoticia (centriActualidad.web.js):
// mediaManager.upload → fileUrl → READ-MERGE-UPDATE del campo pedido.
// campo: 'imagen' (por defecto) | 'qr' | 'fotoGeneral' (v1.0.4).
// ═══════════════════════════════════════════════════════════════════════════
export const uploadImagenMiembro = webMethod(
  Permissions.SiteMember,
  async ({ miembroId, campo, base64Data, fileName, mimeType }) => {
    const guard = await _exigirAdmin();
    if (!guard.ok) { return { ok: false, error: guard.error }; }

    const nombreCampo = campo || 'imagen';
    const key = CAMPOS_IMAGEN[nombreCampo];
    if (!key) { return { ok: false, error: `Campo de imagen no permitido: ${nombreCampo}` }; }

    if (!miembroId || !base64Data || !fileName) {
      return { ok: false, error: 'Faltan parámetros (miembroId, base64Data, fileName).' };
    }

    try {
      const registro = await wixData.get(COL, miembroId, AUTH);
      if (!registro) { return { ok: false, error: 'Persona no encontrada.' }; }

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
      if (!fileUrl) { return { ok: false, error: 'No se pudo guardar la imagen.' }; }

      // READ-MERGE-UPDATE con el registro completo ya leído
      await wixData.update(COL, Object.assign({}, registro, { [key]: fileUrl }), AUTH);

      console.log(`${TAG} ✅ ${nombreCampo} subido y ${COL}.${key} actualizado: ${fileUrl}`);
      return { ok: true, campo: nombreCampo, fileUrl, publicUrl: _imgUrl(fileUrl) };

    } catch (e) {
      console.error(`${TAG} ❌ uploadImagenMiembro:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);
