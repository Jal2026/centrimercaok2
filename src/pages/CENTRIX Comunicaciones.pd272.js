/*
 * CENTRIMERCA — Comunicaciones · Page Code · v1.0.0
 * Página:  CENTRIX MARKETING Y COMUNICACIONES (donde vive el HtmlComponent).
 * Archivo: pega esto en el code panel de esa página.
 *
 * REQUIERE: backend/centriComunicaciones.web.js v1.0.0
 *           + Comunicaciones_Centrimerca_v1_0_0.html (en el HtmlComponent)
 *
 * QUÉ ES: un PUENTE PURO iframe ↔ backend. Cero decisiones, cero `if` sobre
 * contenido. Mismo patrón que el page code del Editor de actualidad: recibe un
 * postMessage del widget, llama al web method que le corresponde y devuelve el
 * resultado tal cual dentro de { type, payload }.
 *
 * Canal Widget → Page : el iframe hace parent.postMessage({type, ...})
 *                       → aquí llega por $w(EL).onMessage(event => event.data)
 * Canal Page → Widget : $w(EL).postMessage({type, payload})
 *
 * ⚠️ La página ya tiene código propio (colores del repetidor de tarjetas).
 *    Este bloque va DEBAJO, en el mismo archivo. Wix admite varios
 *    $w.onReady en la misma página.
 */

import {
  cargarComunicaciones,
  guardarBorradorCampania,
  enviarPruebaCampania,
  enviarCampania,
  listarCampanias,
  subirImagenCampania,
  listarGaleria
} from 'backend/centriComunicaciones.web.js';

const V  = 'Comunicaciones Page v1.0.0';
const EL = '#htmlComunicacionesCentri';   // ← Element ID del HtmlComponent

$w.onReady(function () {
  let el;
  try { el = $w(EL); } catch (e) {
    console.error(`[${V}] no encuentro ${EL}`);
    return;
  }

  const responder = (type, payload) => {
    try { el.postMessage({ type, payload }); }
    catch (e) { console.error(`[${V}] postMessage(${type}) falló:`, e && e.message); }
  };

  el.onMessage(async (event) => {
    const msg = event && event.data;
    if (!msg || typeof msg !== 'object') { return; }

    try {
      switch (msg.type) {

        case 'ready': {
          const r = await cargarComunicaciones();
          responder('initComunicaciones', r);
          break;
        }

        case 'guardarBorrador': {
          const r = await guardarBorradorCampania({ campania: msg.campania || {} });
          responder('borradorGuardado', r);
          break;
        }

        case 'enviarPrueba': {
          const r = await enviarPruebaCampania({ campania: msg.campania || {}, emails: msg.emails || [] });
          responder('pruebaEnviada', r);
          break;
        }

        case 'enviarCampania': {
          const r = await enviarCampania({ campania: msg.campania || {} });
          responder('campaniaEnviada', r);
          break;
        }

        case 'getCampanias': {
          const r = await listarCampanias();
          responder('campanias', r);
          break;
        }

        case 'subirImagen': {
          const r = await subirImagenCampania({
            base64Data: msg.base64Data,
            fileName: msg.fileName,
            mimeType: msg.mimeType
          });
          // El widget necesita la clave del campo para colocar la URL en su sitio.
          responder('imagenSubida', Object.assign({ clave: msg.clave }, r));
          break;
        }

        case 'getGaleria': {
          const r = await listarGaleria();
          responder('galeria', r);
          break;
        }

        case 'resize': {
          // Igual que en el Editor de actualidad: si Wix permite fijar la altura
          // del HtmlComponent por código, se aplica; si no, no pasa nada.
          try { if (typeof msg.height === 'number' && msg.height > 0) { el.height = msg.height; } }
          catch (e) { /* HtmlComponent sin height por código: no-op */ }
          break;
        }

        default:
          // Mensajes no reconocidos: se ignoran (puente puro).
          break;
      }
    } catch (err) {
      console.error(`[${V}] error atendiendo "${msg.type}":`, err && err.message);
      responder('error', { ok: false, error: (err && err.message) || 'Error inesperado' });
    }
  });
});
