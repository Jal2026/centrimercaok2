/*
 * CENTRIMERCA — Ficha de Contacto · Page Code
 * Página:   ítem dinámica de `equipo`  ·  hoy /equipo/<nombre>, después /equipo/<slug>
 * Archivo:  pega esto en el code panel de esa página        ·  v1.0.0
 *
 * NUEVO. Mismo patrón que Productos (Item) v1.1.4:
 *   1. Espera el dataset dinámico y coge la persona actual (getCurrentItem).
 *   2. Pide la ficha al backend por _id (centriFichaContacto.web.js →
 *      obtenerFichaContacto). El backend aplica la regla de `activo` y
 *      devuelve SOLO los campos públicos.
 *   3. Añade las URLs de los dos logos y entrega el payload al custom element
 *      por setAttribute('ficha', ...), con reintentos.
 *
 * Se usa el _id (no el nombre ni el slug) para pedir la ficha: funciona igual
 * con la URL actual por nombre y con la definitiva por slug.
 *
 * ⚠️ AJUSTES DE ESTA PÁGINA (una sola vez, los hace el desarrollador):
 *     EL_ID        — Element ID del custom element (tag `ficha-contacto`)
 *     DATASET_ID   — ID del dataset dinámico de esta página
 *     LOGO_BLANCO  — URL pública de imagenes/logo-blanco.png (portada)
 *     LOGO_COLOR   — URL pública de imagenes/logo-color.png  (pie)
 *     Los logos se suben una vez a la carpeta de medios y se pega aquí su URL
 *     https://static.wixstatic.com/media/… . Sin URL, la ficha sale sin logo.
 *
 * ⛔ El dataset de esta página NO debe filtrar por `activo`: si filtra, una
 *    persona inactiva da la página de error genérica del sitio en vez del
 *    mensaje «Esta ficha de contacto ya no está disponible».
 */

import { obtenerFichaContacto } from 'backend/centriFichaContacto.web.js';

const V           = 'Ficha Contacto Page v1.0.0';
const EL_ID       = '#fichaContacto';     // ← Element ID del custom element
const DATASET_ID  = '#dynamicDataset';    // ← dataset dinámico de la página de ítem
const LOGO_BLANCO = '';                   // ← URL pública del logo calado en blanco
const LOGO_COLOR  = '';                   // ← URL pública del logo en color

$w.onReady(function () {
  const dataset = $w(DATASET_ID);

  dataset.onReady(async function () {
    let el;
    try { el = $w(EL_ID); } catch (e) {
      console.error(`[${V}] no encuentro ${EL_ID}`);
      return;
    }

    const item = dataset.getCurrentItem();
    const id = (item && item._id) || '';
    if (!id) { console.warn(`[${V}] getCurrentItem vacío`); }

    let ficha;
    try {
      ficha = id
        ? await obtenerFichaContacto({ id })
        : { ok: false, motivo: 'no_disponible' };
    } catch (err) {
      console.error(`[${V}] obtenerFichaContacto EXCEPCIÓN:`, err && err.message);
      ficha = { ok: false, motivo: 'error' };
    }

    if (!ficha || typeof ficha !== 'object') {
      ficha = { ok: false, motivo: 'error' };
    }
    if (ficha.ok !== true) {
      console.warn(`[${V}] ficha ${id || '—'} no disponible (motivo: ${ficha.motivo || '—'})`);
    }

    ficha.logoBlanco = LOGO_BLANCO;
    ficha.logoColor  = LOGO_COLOR;

    setAttr(el, 'ficha', JSON.stringify(ficha), 5);
  });
});

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
