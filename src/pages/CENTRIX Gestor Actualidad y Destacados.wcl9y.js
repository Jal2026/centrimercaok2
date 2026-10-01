/*
 * CENTRIMERCA — Editor de actualidad · Page Code · v1.0.0
 * Página:  la del backoffice donde vive el HtmlComponent del editor.
 * Archivo: pega esto en el code panel de esa página.
 *
 * REQUIERE: centriActualidad.web.js v1.0.0 + Editor_Actualidad_Centrimerca_v1_0_0.html
 *
 * QUÉ ES: un PUENTE PURO iframe ↔ backend. Cero decisiones, cero `if` sobre
 * contenido. Idéntico patrón al de CatalogoProductos.page.js: recibe un
 * postMessage del widget, llama al web method que le corresponde, y devuelve
 * el resultado tal cual dentro de { type, payload }.
 *
 * Canal Widget → Page : el iframe hace parent.postMessage({type, ...})
 *                       → aquí llega por $w(EL).onMessage(event => event.data)
 * Canal Page → Widget : $w(EL).postMessage({type, payload})
 *
 * ⚠️ CONFIRMA EL ELEMENT ID:
 *     EL — Element ID del HtmlComponent en esta página (por defecto
 *          '#htmlActualidadCentri').
 */

import {
  listarNoticias,
  guardarNoticia,
  toggleNoticiaCampo,
  eliminarNoticia,
  uploadImagenNoticia
} from 'backend/centriActualidad.web.js';

const V  = 'Actualidad Page v1.0.0';
const EL = '#htmlActualidadCentri';   // ← Element ID del HtmlComponent

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
          const r = await listarNoticias();
          responder('noticiasCargadas', r);
          break;
        }

        case 'saveNoticia': {
          const r = await guardarNoticia({ noticiaId: msg.noticiaId || '', datos: msg.datos || {} });
          responder('noticiaGuardada', r);
          break;
        }

        case 'toggleNoticia': {
          const r = await toggleNoticiaCampo({ noticiaId: msg.noticiaId, campo: msg.campo, valor: msg.valor });
          responder('noticiaToggled', r);
          break;
        }

        case 'deleteNoticia': {
          const r = await eliminarNoticia({ noticiaId: msg.noticiaId });
          // Se reenvía noticiaId a la vez que el payload: el widget lo usa para
          // sacar la fila de su estado local (igual que el editor de catálogo).
          try { el.postMessage({ type: 'noticiaEliminada', noticiaId: msg.noticiaId, payload: r }); }
          catch (e) { console.error(`[${V}] postMessage(noticiaEliminada) falló:`, e && e.message); }
          break;
        }

        case 'uploadImagen': {
          const r = await uploadImagenNoticia({
            noticiaId: msg.id,
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