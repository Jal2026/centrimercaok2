/* ═══════════════════════════════════════════════════════════════════════════
 * CENTRIMERCA — Catálogo · Page Code del editor
 * Página:   Backoffice · Catálogo de productos (acceso restringido)
 * VERSION:  1.0.1
 * FECHA:    18 Septiembre 2026
 *
 * ───────────────────────────────────────────────────────────────────────────
 * PATRÓN EGAEL: PUENTE, SIN LÓGICA PROPIA
 * ───────────────────────────────────────────────────────────────────────────
 * Solo enruta mensajes entre el widget y centriCatalogo.web.js. Cero
 * decisiones. Un `if` sobre contenido aquí está en el sitio equivocado.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ⚠️ CANAL: IFRAME (postMessage), NO custom element
 * ───────────────────────────────────────────────────────────────────────────
 * El editor de catálogo es un HtmlComponent, igual que el Entrenador. La
 * consola CENTRI es un custom element y habla por atributos. No mezclar.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ⚠️ ACCESO
 * ───────────────────────────────────────────────────────────────────────────
 * Proteger la página por permisos de Wix Members NO basta: quien decide es
 * _exigirAdmin() en el backend, contra CentriAdmins. El permiso de página
 * evita que la vean; el guard evita que la usen. Hacen falta los dos.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ⛔ ORDEN DE DESPLIEGUE
 * ───────────────────────────────────────────────────────────────────────────
 * centriCatalogo.web.js → este page code → el widget.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
  cargarCatalogo,
  guardarProducto,
  guardarVariedad,
  toggleProducto,
  toggleVariedad,
  toggleFamiliaDestacada,
  eliminarProducto,
  eliminarVariedad,
  subirImagenCatalogo
} from 'backend/centriCatalogo.web';

const EL_ID = '#htmlCatalogoCentri';   // ← ajustar si el Element ID difiere
const TAG = '[PageCode_Catalogo_CENTRI][1.0.1]';

$w.onReady(function () {
  console.log(`${TAG} onReady`);

  let el;
  try {
    el = $w(EL_ID);
  } catch (e) {
    console.error(`${TAG} No existe ${EL_ID}. Revisa el Element ID en el editor.`);
    return;
  }

  el.onMessage(async (event) => {
    const msg = event.data;
    if (!msg || !msg.type) return;

    const send = (type, data) => el.postMessage(Object.assign({ type }, data));

    console.log(`${TAG} mensaje: ${msg.type}`);

    try {
      if (msg.type === 'ready') {
        const res = await cargarCatalogo();
        return send('catalogoCargado', { payload: res });
      }

      if (msg.type === 'saveProducto') {
        const res = await guardarProducto({
          productoId: msg.productoId,
          datos: msg.datos
        });
        // tempId viaja de vuelta: el widget necesita saber qué formulario
        // recibió el id definitivo cuando el alta era nueva.
        return send('productoGuardado', { payload: res, tempId: msg.tempId });
      }

      if (msg.type === 'saveVariedad') {
        const res = await guardarVariedad({
          variedadId: msg.variedadId,
          productoId: msg.productoId,
          datos: msg.datos
        });
        return send('variedadGuardada', { payload: res, tempId: msg.tempId });
      }

      if (msg.type === 'toggleProducto') {
        const res = await toggleProducto({
          productoId: msg.productoId,
          campo: msg.campo,
          valor: msg.valor
        });
        return send('productoToggled', { payload: res });
      }

      if (msg.type === 'toggleFamilia') {
        const res = await toggleFamiliaDestacada({
          productoId: msg.productoId,
          valor: msg.valor
        });
        return send('familiaToggled', { payload: res });
      }

      if (msg.type === 'toggleVariedad') {
        const res = await toggleVariedad({
          variedadId: msg.variedadId,
          campo: msg.campo,
          valor: msg.valor
        });
        return send('variedadToggled', { payload: res });
      }

      if (msg.type === 'deleteProducto') {
        const res = await eliminarProducto({
          productoId: msg.productoId,
          forzar: msg.forzar === true
        });
        return send('productoEliminado', { payload: res, productoId: msg.productoId });
      }

      if (msg.type === 'deleteVariedad') {
        const res = await eliminarVariedad({ variedadId: msg.variedadId });
        return send('variedadEliminada', { payload: res, variedadId: msg.variedadId });
      }

      if (msg.type === 'uploadImagen') {
        const res = await subirImagenCatalogo({
          destino: msg.destino,
          id: msg.id,
          base64Data: msg.base64Data,
          fileName: msg.fileName,
          mimeType: msg.mimeType
        });
        return send('imagenSubida', { payload: res });
      }

      if (msg.type === 'resize') return;   // lo gestiona el propio widget

      console.warn(`${TAG} mensaje no reconocido: ${msg.type}`);

    } catch (e) {
      console.error(`${TAG} EXCEPTION en ${msg.type}:`, e);
      send('error', { payload: { error: e.message || 'Error técnico.' } });
    }
  });
});