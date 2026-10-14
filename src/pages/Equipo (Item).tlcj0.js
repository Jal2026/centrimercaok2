/*
 * CENTRIMERCA — Ficha de Contacto · Page Code
 * Página:   ítem dinámica de `equipo`  ·  hoy /equipo/<nombre>, después /equipo/<slug>
 * Archivo:  pega esto en el code panel de esa página        ·  v1.0.1
 *
 * REQUIERE: fichaContacto.js v1.0.4 (acepta imagenOrig / fotoGeneralOrig).
 *           backend/centriFichaContacto.web.js v1.0.0 (sin cambios).
 *
 * v1.0.1 — CARGA RÁPIDA. Mismo patrón que Productos (Item) v1.1.4:
 *   1. La ficha se arma con el ítem que YA trae el dataset dinámico y se
 *      pinta al momento. En v1.0.0 cada visita esperaba antes una llamada al
 *      backend (con su arranque en frío): era lo que la hacía lenta.
 *   2. Regla de `activo` aquí también: activo !== true → «no disponible», sin
 *      pintar ningún dato de la persona.
 *   3. Fotos REDUCIDAS (retrato ≤ 480 px, portada ≤ 1600 px de lado mayor),
 *      con el MISMO encuadre del original: el tamaño sale de originWidth /
 *      originHeight del propio wix:image://. Pipeline /v1/fill/ (el que ya
 *      usa el proyecto) SOLO para JPG/WEBP: en PNG aplana el alfa (ver
 *      centriConsole.js). Si la reducida falla, el custom element carga la
 *      original (imagenOrig / fotoGeneralOrig).
 *   4. `email` es un campo cifrado: si el dataset no lo trae como email
 *      válido, se pide al backend (obtenerFichaContacto) SIN bloquear la
 *      ficha y se añade al llegar. Del backend solo se toma el email.
 *
 * ⚠️ _payload es COPIA de centriFichaContacto.web.js v1.0.0 → _payload
 *    (teléfono, web, mapa, enlaces). Si cambias uno, cambia el otro.
 *
 * ⚠️ AJUSTES DE ESTA PÁGINA (una sola vez, los hace el desarrollador):
 *     EL_ID        — Element ID del custom element (tag `ficha-contacto`)
 *     DATASET_ID   — ID del dataset dinámico de esta página
 *     LOGO_BLANCO  — URL pública del logo calado en blanco (portada)
 *     LOGO_COLOR   — URL pública del logo en color (pie)
 *     URL CRUDA del Media Manager (…~mv2.png), NUNCA la variante /v1/fill/
 *     (aplana el alfa y deja un marco blanco). Sin URL, la ficha sale sin logo.
 *
 * ⛔ El dataset de esta página NO debe filtrar por `activo`: si filtra, una
 *    persona inactiva da la página de error genérica del sitio en vez del
 *    mensaje «Esta ficha de contacto ya no está disponible».
 */

import { obtenerFichaContacto } from 'backend/centriFichaContacto.web.js';

const V           = 'Ficha Contacto Page v1.0.1';
const EL_ID       = '#fichaContacto';     // ← Element ID del custom element
const DATASET_ID  = '#dynamicDataset';    // ← dataset dinámico de la página de ítem
const LOGO_BLANCO = '';                   // ← URL pública del logo calado en blanco
const LOGO_COLOR  = '';                   // ← URL pública del logo en color

// Enlaces fijos de la ficha (iguales que en centriFichaContacto.web.js)
const URL_CENTRI        = 'https://www.centrimerca.com/centripro';
const URL_AREA_CLIENTES = 'https://www.centrimerca.com/areadeclientes';
const URL_WEB_EMPRESA   = 'https://www.centrimerca.com';
const RUTA_VCARD        = '/_functions/fichaVcard?id=';

// Lado mayor máximo de las fotos reducidas (px)
const MAX_RETRATO = 480;
const MAX_PORTADA = 1600;

function _txt(v) { return (v === null || v === undefined) ? '' : String(v).trim(); }

/* wix:image://v1/<mediaId>/<file>#...  →  https://static.wixstatic.com/media/<mediaId>
   Idéntico a wixImgToUrl de Productos (Item). */
function wixImgToUrl(uri) {
  if (!uri || typeof uri !== 'string') { return ''; }
  if (uri.indexOf('http') === 0) { return uri; }
  const m = uri.match(/wix:image:\/\/v1\/([^/]+)/);
  return m ? ('https://static.wixstatic.com/media/' + m[1]) : '';
}

/* Foto reducida con el mismo encuadre (lado mayor ≤ max). Solo JPG/WEBP y
   solo si el wix:image:// trae originWidth/originHeight; si no, la original. */
function imgReducida(uri, max) {
  const orig = wixImgToUrl(uri);
  const res = { src: orig, orig: '' };
  if (!orig || typeof uri !== 'string') { return res; }

  const m = uri.match(/wix:image:\/\/v1\/([^/]+)\/[^#]*#.*originWidth=(\d+).*originHeight=(\d+)/);
  if (!m) { return res; }

  const id = m[1];
  const w0 = Number(m[2]);
  const h0 = Number(m[3]);
  if (!/\.(jpe?g|webp)$/i.test(id) || !w0 || !h0) { return res; }

  const k = Math.min(1, max / Math.max(w0, h0));
  const w = Math.round(w0 * k);
  const h = Math.round(h0 * k);
  return {
    src: `https://static.wixstatic.com/media/${id}/v1/fill/w_${w},h_${h},al_c,q_85,enc_auto/${id}`,
    orig
  };
}

/* Teléfono → { tel: '34600000000', ver: '+34 600 000 000' } | null
   Normalización copiada de Equipo.rcgzm.js (igual que el backend). */
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

function _emailValido(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

// COPIA de centriFichaContacto.web.js v1.0.0 → _payload (+ fotos reducidas).
function _payload(it) {
  const tel     = _telefono(it.numeroTelefono);
  const email   = _txt(it.email);
  const emailOk = _emailValido(email);
  const web     = _webUrl(it.web);
  const dir     = _txt(it.direccion);
  const retrato = imgReducida(it.imagen, MAX_RETRATO);
  const portada = imgReducida(it.fotoGeneral, MAX_PORTADA);

  return {
    ok:          true,
    nombre:      _txt(it.nombre),
    rol:         _txt(it.rol),
    area:        _txt(it.area),
    descripcion: _txt(it.descripcion),
    imagen:          retrato.src,
    imagenOrig:      retrato.orig,
    fotoGeneral:     portada.src,
    fotoGeneralOrig: portada.orig,

    telVer:      tel ? tel.ver : '',
    telHref:     tel ? ('tel:+' + tel.tel) : '',
    waHref:      tel ? ('https://wa.me/' + tel.tel) : '',
    email:       emailOk ? email : '',
    emailHref:   emailOk ? ('mailto:' + email) : '',
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

$w.onReady(function () {
  const dataset = $w(DATASET_ID);

  dataset.onReady(async function () {
    let el;
    try { el = $w(EL_ID); } catch (e) {
      console.error(`[${V}] no encuentro ${EL_ID}`);
      return;
    }

    const item = dataset.getCurrentItem();

    // ── Regla de `activo`: inactiva o inexistente → no disponible ──────────
    if (!item || item.activo !== true) {
      console.warn(`[${V}] ficha ${(item && item._id) || '—'} no disponible`);
      entregar(el, { ok: false, motivo: 'no_disponible', webEmpresaHref: URL_WEB_EMPRESA });
      return;
    }

    // ── Ficha al momento, con lo que trae el dataset ────────────────────────
    const ficha = _payload(item);
    entregar(el, ficha);

    // ── Email cifrado: si no ha llegado como email válido, al backend ──────
    if (!ficha.email) {
      try {
        const r = await obtenerFichaContacto({ id: item._id });
        if (r && r.ok === true && r.email) {
          ficha.email = r.email;
          ficha.emailHref = r.emailHref;
          entregar(el, ficha);
        }
      } catch (err) {
        console.warn(`[${V}] email no disponible:`, err && err.message);
      }
    }
  });
});

function entregar(el, ficha) {
  ficha.logoBlanco = LOGO_BLANCO;
  ficha.logoColor  = LOGO_COLOR;
  setAttr(el, 'ficha', JSON.stringify(ficha), 5);
}

/* setAttribute robusto: Wix a veces pinta el CE unos ms tras el onReady.
   Copia de Productos (Item) v1.1.4. */
function setAttr(el, name, value, intentos) {
  try {
    el.setAttribute(name, value);
  } catch (err) {
    if (intentos > 0) {
      setTimeout(() => setAttr(el, name, value, intentos - 1), 120);
    } else {
      console.error(`[${V}] setAttribute("${name}") ABANDONO tras reintentos:`, err && err.message);
    }
  }
}
