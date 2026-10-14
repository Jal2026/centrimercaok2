/* ═══════════════════════════════════════════════════════════════════════════
 * CENTRIMERCA — Ficha de Contacto · Backend web module · v1.0.0
 * Ruta: backend/centriFichaContacto.web.js
 * FECHA: 14 Octubre 2026
 *
 * NUEVO. Módulo PÚBLICO de la ficha de contacto de cada persona del equipo.
 * Va aparte de centriEquipo.web.js a propósito: aquel exige admin en todo;
 * este lo consume cualquier visitante que escanea un QR.
 *
 * LO USAN:
 *   · Page Code de la página dinámica de ítem de `equipo`
 *       → obtenerFichaContacto({ id })            (webMethod, Anyone)
 *   · backend/http-functions.js v1.0.2
 *       → vcardFichaCore({ id })                   (función PURA, sin sesión)
 *     Mismo esquema que centriLogic.web.js: funciones puras exportadas junto
 *     a los webMethods, importadas por http-functions.
 *
 * ⛔ ORDEN DE DESPLIEGUE: este archivo ANTES que http-functions.js v1.0.2.
 *    Si http-functions sube primero, su import falla y caen TODOS sus
 *    endpoints (CENTRI incluido).
 *
 * REGLAS
 *   · Lectura con suppressAuth y LISTA BLANCA de campos: nunca se devuelve el
 *     registro entero (email cifrado, campos heredados de importaciones…).
 *   · `activo` !== true → la ficha NO funciona: no se devuelve ningún dato de
 *     la persona y la vCard no se entrega.
 *   · Teléfono: `numeroTelefono` es NÚMERO sin prefijo. Normalización COPIADA
 *     de la página Equipo (Equipo.rcgzm.js): solo dígitos; "0034…" → "34…";
 *     9 dígitos → "34" + número.
 *   · Foto de la vCard según `fotoAgenda`: 'general' → fotoGeneral; vacío o
 *     'empleado' → imagen. Si falta la elegida, la otra. Si no hay, sin PHOTO.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * FIELD KEYS — esquema de `equipo` confirmado por Jal el 14/10/2026
 * ───────────────────────────────────────────────────────────────────────────
 * nombre (TEXT) · rol (TEXT) · area (TEXT) · descripcion (TEXT)
 * imagen (IMAGE) · fotoGeneral (IMAGE) · fotoAgenda (TEXT: empleado|general)
 * email (EMAIL) · numeroTelefono (NUMBER) · web (URL) · direccion (TEXT)
 * slug (TEXT) · activo (BOOLEAN)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { webMethod, Permissions } from 'wix-web-module';
import wixData from 'wix-data';
import { fetch } from 'wix-fetch';

const VERSION = '1.0.0';
const TAG = `[FichaContacto][${VERSION}]`;
const AUTH = { suppressAuth: true };

// ── ID de colección ────────────────────────────────────────────────────────
const COL = 'equipo';   // ID real (minúscula), el mismo que centriEquipo.web.js

// ── Field keys de `equipo` (esquema real) ──────────────────────────────────
const F = {
  nombre:      'nombre',
  rol:         'rol',
  area:        'area',
  descripcion: 'descripcion',
  imagen:      'imagen',
  fotoGeneral: 'fotoGeneral',
  fotoAgenda:  'fotoAgenda',
  email:       'email',
  telefono:    'numeroTelefono',
  web:         'web',
  direccion:   'direccion',
  slug:        'slug',
  activo:      'activo'
};

// ── Enlaces fijos de la ficha (no son datos de personas) ───────────────────
const URL_CENTRI        = 'https://www.centrimerca.com/centripro';
const URL_AREA_CLIENTES = 'https://www.centrimerca.com/areadeclientes';
const URL_WEB_EMPRESA   = 'https://www.centrimerca.com';

// Endpoint de la vCard (http-functions.js v1.0.2 → get_fichaVcard)
const RUTA_VCARD = '/_functions/fichaVcard?id=';

// Foto de la vCard
const FOTO_LADO     = 560;           // px, cuadrada
const FOTO_MAX_BYTES = 400 * 1024;   // por encima se omite la foto

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════
function _txt(v) { return (v === null || v === undefined) ? '' : String(v).trim(); }

/* wix:image://v1/<mediaId>/<file>#...  →  https://static.wixstatic.com/media/<mediaId>
   Idéntico a _imgUrl de centriEquipo.web.js / centriCatalogo.web.js */
function _imgUrl(uri) {
  if (!uri || typeof uri !== 'string') { return ''; }
  if (uri.indexOf('http') === 0) { return uri; }
  const m = uri.match(/wix:image:\/\/v1\/([^/]+)/);
  return m ? ('https://static.wixstatic.com/media/' + m[1]) : '';
}

/* Teléfono → { tel: '34600000000', ver: '+34 600 000 000' } | null
   Normalización copiada de Equipo.rcgzm.js. */
function _telefono(v) {
  let t = _txt(v).replace(/\D/g, '');
  if (!t) { return null; }
  if (t.indexOf('0034') === 0) { t = t.substring(2); }
  if (t.length === 9) { t = '34' + t; }
  let ver = '+' + t;
  if (t.length === 11 && t.indexOf('34') === 0) {
    const n = t.substring(2);
    ver = '+34 ' + n.substring(0, 3) + ' ' + n.substring(3, 6) + ' ' + n.substring(6);
  }
  return { tel: t, ver };
}

function _webUrl(v) {
  const u = _txt(v);
  if (!u) { return ''; }
  return /^https?:\/\//i.test(u) ? u : ('https://' + u);
}

function _webVer(url) {
  return url.replace(/^https?:\/\//i, '').replace(/\/$/, '');
}

function _slugDe(nombre) {
  return _txt(nombre)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Lee la persona por _id. Solo devuelve el registro si activo === true.
async function _leerActivo(id) {
  if (!id) { return null; }
  const it = await wixData.get(COL, id, AUTH);
  if (!it) { return null; }
  if (it[F.activo] !== true) {
    console.log(`${TAG} ficha ${id} no disponible (activo=${it[F.activo]})`);
    return null;
  }
  return it;
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. FICHA PÚBLICA  (Page Code → custom element)
// ═══════════════════════════════════════════════════════════════════════════
function _payload(it) {
  const tel   = _telefono(it[F.telefono]);
  const email = _txt(it[F.email]);
  const web   = _webUrl(it[F.web]);
  const dir   = _txt(it[F.direccion]);

  return {
    ok:          true,
    nombre:      _txt(it[F.nombre]),
    rol:         _txt(it[F.rol]),
    area:        _txt(it[F.area]),
    descripcion: _txt(it[F.descripcion]),
    imagen:      _imgUrl(it[F.imagen]),
    fotoGeneral: _imgUrl(it[F.fotoGeneral]),

    telVer:      tel ? tel.ver : '',
    telHref:     tel ? ('tel:+' + tel.tel) : '',
    waHref:      tel ? ('https://wa.me/' + tel.tel) : '',
    email:       email,
    emailHref:   email ? ('mailto:' + email) : '',
    webVer:      web ? _webVer(web) : '',
    webHref:     web,
    direccion:   dir,
    mapaHref:    dir ? ('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(dir)) : '',

    vcardHref:        RUTA_VCARD + encodeURIComponent(it._id),
    centriHref:       URL_CENTRI,
    areaClientesHref: URL_AREA_CLIENTES,
    webEmpresaHref:   URL_WEB_EMPRESA
  };
}

export const obtenerFichaContacto = webMethod(
  Permissions.Anyone,
  async ({ id } = {}) => {
    try {
      const it = await _leerActivo(_txt(id));
      if (!it) {
        return { ok: false, motivo: 'no_disponible', webEmpresaHref: URL_WEB_EMPRESA };
      }
      return _payload(it);

    } catch (e) {
      console.error(`${TAG} ❌ obtenerFichaContacto(${id}):`, e.message);
      return { ok: false, motivo: 'error', webEmpresaHref: URL_WEB_EMPRESA };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// 2. vCARD  (función PURA para http-functions.js → get_fichaVcard)
// ═══════════════════════════════════════════════════════════════════════════

// Escapado de valores de texto vCard 3.0
function _esc(s) {
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

// Plegado de líneas a 75 caracteres (CRLF + espacio)
function _plegar(l) {
  if (l.length <= 75) { return l; }
  const out = [l.slice(0, 75)];
  for (let i = 75; i < l.length; i += 74) { out.push(' ' + l.slice(i, i + 74)); }
  return out.join('\r\n');
}

function _cabecera(h, nombre) {
  if (!h) { return ''; }
  if (typeof h.get === 'function') { return _txt(h.get(nombre)); }
  return _txt(h[nombre] || h[nombre.toLowerCase()]);
}

/* Descarga la foto y la devuelve en base64.
   1º intento: versión reducida a FOTO_LADO px (transformación del servicio de
      medios). ⚠️ No verificada en este proyecto: si no responde con una
      imagen válida, se usa el 2º intento.
   2º intento: la imagen original, solo si no supera FOTO_MAX_BYTES.
   Si ninguno vale, la vCard sale sin foto (nunca falla por la foto). */
async function _fotoBase64(url) {
  if (!url) { return null; }
  const intentos = [
    `${url}/v1/fill/w_${FOTO_LADO},h_${FOTO_LADO},al_c,q_85/foto.jpg`,
    url
  ];

  for (const u of intentos) {
    try {
      const r = await fetch(u, { method: 'get' });
      if (!r.ok) {
        console.warn(`${TAG} foto HTTP ${r.status}: ${u}`);
        continue;
      }
      const ct = _cabecera(r.headers, 'content-type').toLowerCase();
      const tipo = ct.indexOf('jpeg') >= 0 || ct.indexOf('jpg') >= 0 ? 'JPEG'
                 : ct.indexOf('png') >= 0 ? 'PNG' : '';
      if (!tipo) {
        console.warn(`${TAG} foto con tipo no admitido (${ct || 'sin content-type'}): ${u}`);
        continue;
      }
      const buf = (typeof r.arrayBuffer === 'function')
        ? Buffer.from(await r.arrayBuffer())
        : await r.buffer();
      if (!buf || !buf.length) { continue; }
      if (buf.length > FOTO_MAX_BYTES) {
        console.warn(`${TAG} foto demasiado pesada (${buf.length} bytes): ${u}`);
        continue;
      }
      return { tipo, b64: buf.toString('base64') };

    } catch (e) {
      console.warn(`${TAG} foto no descargada (${u}):`, e.message);
    }
  }
  return null;
}

/**
 * vcardFichaCore({ id }) → { ok: true, vcf, archivo } | { ok: false }
 * PURA: sin webMethod ni sesión. La llama get_fichaVcard (http-functions).
 */
export async function vcardFichaCore({ id } = {}) {
  try {
    const it = await _leerActivo(_txt(id));
    if (!it) { return { ok: false }; }

    const nombreCompleto = _txt(it[F.nombre]);
    const partes = nombreCompleto.split(/\s+/).filter(Boolean);
    const nombre = partes.shift() || '';
    const apellidos = partes.join(' ');

    const tel   = _telefono(it[F.telefono]);
    const email = _txt(it[F.email]);
    const web   = _webUrl(it[F.web]);
    const dir   = _txt(it[F.direccion]);
    const area  = _txt(it[F.area]);
    const rol   = _txt(it[F.rol]);
    const desc  = _txt(it[F.descripcion]);

    const lineas = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      'N:' + _esc(apellidos) + ';' + _esc(nombre) + ';;;',
      'FN:' + _esc(nombreCompleto),
      'ORG:Centrimerca' + (area ? ';' + _esc(area) : '')
    ];
    if (rol)   { lineas.push('TITLE:' + _esc(rol)); }
    if (tel)   { lineas.push('TEL;TYPE=CELL,VOICE:+' + tel.tel); }
    if (email) { lineas.push('EMAIL;TYPE=INTERNET,WORK:' + email); }
    if (web)   { lineas.push('URL:' + web); }
    if (dir)   { lineas.push('ADR;TYPE=WORK:;;' + _esc(dir) + ';;;;'); }
    if (desc)  { lineas.push('NOTE:' + _esc(desc)); }

    // Foto según fotoAgenda (vacío = empleado). Si falta la elegida, la otra.
    const general  = _txt(it[F.fotoAgenda]) === 'general';
    const elegida  = general ? it[F.fotoGeneral] : it[F.imagen];
    const otra     = general ? it[F.imagen] : it[F.fotoGeneral];
    let foto = await _fotoBase64(_imgUrl(elegida));
    if (!foto && otra) { foto = await _fotoBase64(_imgUrl(otra)); }
    if (foto) { lineas.push('PHOTO;ENCODING=b;TYPE=' + foto.tipo + ':' + foto.b64); }

    lineas.push('END:VCARD');

    const vcf = lineas.map(_plegar).join('\r\n') + '\r\n';
    const archivo = (_slugDe(it[F.slug]) || _slugDe(nombreCompleto) || 'contacto') + '.vcf';

    console.log(`${TAG} vCard ${it._id}: ${vcf.length} caracteres, foto=${foto ? foto.tipo : 'no'}`);
    return { ok: true, vcf, archivo };

  } catch (e) {
    console.error(`${TAG} ❌ vcardFichaCore(${id}):`, e.message);
    return { ok: false };
  }
}
