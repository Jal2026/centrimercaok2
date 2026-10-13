/*
 * CENTRIMERCA — Gestor de equipo · Page Code · v1.0.2
 * Página:  la del backoffice donde vive el HtmlComponent del gestor.
 * Archivo: pega esto en el code panel de esa página.
 *
 * REQUIERE: centriEquipo.web.js v1.0.2 + Gestor_Equipo_Centrimerca_v1_0_2.html
 *
 * v1.0.2: nuevo mensaje moveMiembro → moverMiembro → miembroMovido (orden).
 * v1.0.1: uploadImagen pasa `campo: msg.destino` ('imagen' | 'qr') al backend.
 *
 * QUÉ ES: un PUENTE PURO iframe ↔ backend. Cero decisiones, cero `if` sobre
 * contenido. Mismo patrón que ActualidadNoticias.page.js: recibe un
 * postMessage del widget, llama al web method que le corresponde, y devuelve
 * el resultado tal cual dentro de { type, payload }.
 *
 * Canal Widget → Page : el iframe hace parent.postMessage({type, ...})
 *                       → aquí llega por $w(EL).onMessage(event => event.data)
 * Canal Page → Widget : $w(EL).postMessage({type, payload})
 *
 * ⚠️ CONFIRMA EL ELEMENT ID:
 *     EL — Element ID del HtmlComponent en esta página (por defecto
 *          '#htmlEquipoCentri').
 */

import {
  listarEquipo,
  guardarMiembro,
  moverMiembro,
  eliminarMiembro,
  uploadImagenMiembro
} from 'backend/centriEquipo.web.js';

const V  = 'Equipo Page v1.0.2';
const EL = '#htmlEquipoCentri';   // ← Element ID del HtmlComponent

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
          const r = await listarEquipo();
          responder('equipoCargado', r);
          break;
        }

        case 'saveMiembro': {
          const r = await guardarMiembro({ miembroId: msg.miembroId || '', datos: msg.datos || {} });
          responder('miembroGuardado', r);
          break;
        }

        case 'moveMiembro': {
          const r = await moverMiembro({ miembroId: msg.miembroId, prevId: msg.prevId || '', nextId: msg.nextId || '' });
          responder('miembroMovido', r);
          break;
        }

        case 'deleteMiembro': {
          const r = await eliminarMiembro({ miembroId: msg.miembroId });
          // Se reenvía miembroId a la vez que el payload: el widget lo usa para
          // sacar la fila de su estado local (igual que el editor de actualidad).
          try { el.postMessage({ type: 'miembroEliminado', miembroId: msg.miembroId, payload: r }); }
          catch (e) { console.error(`[${V}] postMessage(miembroEliminado) falló:`, e && e.message); }
          break;
        }

        case 'uploadImagen': {
          const r = await uploadImagenMiembro({
            miembroId: msg.id,
            campo: msg.destino,
            base64Data: msg.base64Data,
            fileName: msg.fileName,
            mimeType: msg.mimeType
          });
          // El widget espera destino + id para colocar la URL en su sitio.
          responder('imagenSubida', Object.assign({ destino: msg.destino, id: msg.id }, r));
          break;
        }

        case 'resize': {
          // El widget reporta su alto. Si tu versión de Wix permite fijar la
          // altura del HtmlComponent por código, se aplica; si no, no pasa nada
          // (deja el elemento alto en el editor: el widget hace scroll interno).
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
