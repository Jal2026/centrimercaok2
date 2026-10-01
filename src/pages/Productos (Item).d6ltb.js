/*
 * CENTRIMERCA — Ficha de Producto · Page Code
 * Página:   ítem dinámica de Productos  ·  URL /productos/<slug>
 * Archivo:  pega esto en el code panel de esa página        ·  v1.1.4
 *
 * v1.1.4 — Dos cosas, y la primera es la que rompía la página:
 *   1. COL_VARIED pasa de 'Variedades' a 'variedades'. Con la mayúscula la
 *      colección no existe (WDE0025), la consulta lanzaba excepción, el catch
 *      devolvía [] y la ficha no pintaba ninguna variedad. Nunca fue el
 *      filtro: v1.1.1 y v1.1.2 fallaron por esto, no por lo que tocaron.
 *   2. La ficha respeta `activo`: se descartan las variedades con
 *      `activo === false`, filtrando en memoria (ver el bloque más abajo).
 *
 *   Si una familia queda con todas apagadas, el custom element
 *   (fichaProducto.js v1.3.0) ya omite la sección "Variedades" y el chip del
 *   recuento: la ficha se ve entera, sin ese bloque. El CE no se toca.
 *
 * Qué hace:
 *   1. Espera el dataset dinámico y coge el producto actual (getCurrentItem).
 *   2. Consulta la colección Variedades enlazadas por el campo referencia
 *      `producto`, ordenadas por `orden`, descartando las de `activo: false`.
 *   3. Convierte las imágenes wix:image:// a URL pública (para el <img> del CE).
 *   4. Arma el payload y lo pasa al custom element por setAttribute('ficha', ...).
 *
 * Canal Page → CE: setAttribute('ficha', JSON.stringify(payload))  (idéntico a Centri.page)
 * Canal CE → Page: eventos 'ficha-pedir' / 'ficha-contacto' (listeners opcionales abajo).
 *
 * ⚠️ IDs a confirmar en el editor (ajústalos si difieren):
 *     EL_ID       — Element ID del custom element en la página
 *     DATASET_ID  — ID del dataset dinámico de la página
 *     COL_CONFIG  — ID real de la colección de configuración
 *     REF_FIELD   — field key del campo referencia en variedades → productos
 *
 * ⛔ COL_VARIED va en MINÚSCULA: 'variedades'. El nombre VISIBLE de la
 *    colección es otro ("Variedades y Destacados") y NO sirve como ID.
 *    Escribirlo con mayúscula provoca WDE0025 "The Variedades collection does
 *    not exist", la consulta salta al catch y la ficha se queda sin ninguna
 *    variedad. Misma minúscula que usa backend/centriCatalogo.web.js.
 */

import wixData from 'wix-data';
import wixLocation from 'wix-location';

const V           = 'Ficha Producto Page v1.1.4';
const EL_ID       = '#fichaProducto';     // ← Element ID del custom element
const DATASET_ID  = '#dynamicDataset';    // ← dataset dinámico de la página de ítem
const COL_VARIED  = 'variedades';         // ← ID REAL, en minúscula. Ver cabecera v1.1.4
const COL_CONFIG  = 'CentriConfig';       // ← colección de configuración (urlSercliente, whatsappComercial)
const REF_FIELD   = 'producto';           // ← campo referencia Variedades → Productos
const ORDEN_FIELD = 'orden';

/* wix:image://v1/<mediaId>/<file>#...  →  https://static.wixstatic.com/media/<mediaId> */
function wixImgToUrl(uri) {
  if (!uri || typeof uri !== 'string') { return ''; }
  if (uri.indexOf('http') === 0) { return uri; }
  const m = uri.match(/wix:image:\/\/v1\/([^/]+)/);
  return m ? ('https://static.wixstatic.com/media/' + m[1]) : '';
}

/*
 * temporada llega del CMS como TEXTO. Wix lo aceptó como string JSON escapado,
 * así que puede necesitar hasta DOS JSON.parse (doble parseo). Esta función
 * inspecciona el tipo real y va parseando mientras siga siendo string, hasta
 * un máximo de 2 pasadas; para en cuanto tenga un objeto. Soporta los 3 casos:
 *   - string JSON escapado (doble)   → 2 parseos
 *   - string JSON normal             → 1 parseo
 *   - objeto ya deserializado por Wix → 0 parseos
 */
function parseTemporada(raw) {
  if (raw == null || raw === '') { return {}; }
  let val = raw;
  for (let i = 0; i < 2 && typeof val === 'string'; i++) {
    const s = val.trim();
    if (!s) { return {}; }
    try {
      val = JSON.parse(s);
    } catch (e) {
      console.warn(`[${V}] temporada: JSON.parse pasada ${i + 1} falló:`, e && e.message);
      return {};
    }
  }
  if (val && typeof val === 'object') { return val; }
  console.warn(`[${V}] temporada no resolvió a objeto (tipo final: ${typeof val})`);
  return {};
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
    if (!item) {
      console.warn(`[${V}] getCurrentItem vacío`);
      return;
    }

    // ── Variedades ───────────────────────────────────────────────────────────
    let variedades = [];
    try {
      let res = await wixData.query(COL_VARIED)
        .eq('generico', item.nombre)
        .ascending(ORDEN_FIELD)
        .find();
      console.log(`[${V}] por generico("${item.nombre}"): ${res.items.length}`);

      if (res.items.length === 0) {
        res = await wixData.query(COL_VARIED)
          .eq(REF_FIELD, item._id)
          .ascending(ORDEN_FIELD)
          .find();
        console.log(`[${V}] por referencia(${REF_FIELD}=${item._id}): ${res.items.length}`);
      }

      // SONDA: si sigue en 0, ¿hay algo accesible en la colección y con qué valores?
      // - total 0 o EXCEPCIÓN  → ID de colección mal, o permiso de lectura ≠ "Cualquiera"
      // - hay items pero generico ≠ "<nombre>" → desajuste de nombre (espacios/mayúsculas)
      // - producto sale como objeto/id → así se filtra la referencia
      if (res.items.length === 0) {
        const probe = await wixData.query(COL_VARIED).limit(3).find();
        console.log(`[${V}] SONDA "${COL_VARIED}" total accesible: ${probe.totalCount}. Muestra:`,
          probe.items.map(x => ({ nombre: x.nombre, generico: x.generico, producto: x.producto })));
      }

      // ── Filtro de visibilidad ────────────────────────────────────────────
      // El descarte se hace EN MEMORIA, no en la consulta. `.eq('activo',
      // true)` tiraría también las filas con el campo vacío (undefined), no
      // solo las `false`. Aquí desaparece únicamente lo apagado a propósito
      // desde el Gestor de Productos.
      const todas = res.items || [];
      variedades = todas.filter(x => x.activo !== false);
      if (todas.length !== variedades.length) {
        console.log(`[${V}] ocultas ${todas.length - variedades.length} de ${todas.length} variedad(es) con activo=false`);
      }
    } catch (err) {
      console.error(`[${V}] query "${COL_VARIED}" EXCEPCIÓN — casi seguro ID de colección incorrecto o permiso de lectura ≠ "Cualquiera":`, err && err.message);
    }

    // ── Config global (CentriConfig): URLs de los CTA ────────────────────────
    let cfg = {};
    try {
      const cRes = await wixData.query(COL_CONFIG).limit(1).find();
      cfg = (cRes.items && cRes.items[0]) || {};
    } catch (err) {
      console.warn(`[${V}] no pude leer "${COL_CONFIG}" (¿ID o permisos?):`, err && err.message);
    }

    // ── Payload ─────────────────────────────────────────────────────────────
    const payload = {
      nombre:       item.nombre || '',
      subcategoria: item.subcategoria || '',
      tipo:         item.categoria || '',            // "Fruta" | "Verdura" → elige SVG fallback
      imagen:       wixImgToUrl(item.imagen),
      descripcion:  item.descripcion || '',
      origen:       item.origen || '',
      temporada:    parseTemporada(item.temporada),
      consejos: {
        transporte:   item.transporte || '',
        conservacion: item.conservacion || '',
        maduracion:   item.maduracion || ''
      },
      urlSercliente:     cfg.urlSercliente || '',
      whatsappComercial: cfg.whatsappComercial || '',
      variedades: variedades.map(v => ({
        nombre:      v.nombre || '',
        referencia:  v.referencia || '',
        foto:        wixImgToUrl(v.foto),            // "" si no hay → el CE pinta el SVG del tipo
        descripcion: v.descripcion || '',
        formatos:    v.formatos || '',
        calibre:     v.calibre || '',
        dulzor:      v.dulzor || '',
        uso:         v.uso || ''
      }))
    };

    // ── Entrega al custom element (con reintentos, como en Centri.page) ──────
    setAttr(el, 'ficha', JSON.stringify(payload), 5);

    // ── Evento del CE: "¿Aún no eres cliente?" → navegar a urlSercliente ─────
    el.on('ficha-sercliente', (event) => {
      const url = (event && event.detail && event.detail.url) || '';
      if (url) { wixLocation.to(url); }
      else { console.warn(`[${V}] ficha-sercliente sin url — revisa ${COL_CONFIG}.urlSercliente`); }
    });
    // "Hablar con un comercial" lo resuelve el propio custom element (popup
    // interno con Llamar / WhatsApp construidos desde whatsappComercial).
  });
});

/* setAttribute robusto: Wix a veces pinta el CE unos ms tras el onReady. */
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