/* ═══════════════════════════════════════════════════════════════════════════
 * CENTRIMERCA — CENTRI · Page Code del Entrenador
 * Página:   CENTRI Entrenador
 * VERSION:  1.0.0
 * FECHA:    25 Agosto 2026
 *
 * Port del page code del Entrenador AKIRA v1.2.0.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * PATRÓN EGAEL: PUENTE, SIN LÓGICA PROPIA
 * ───────────────────────────────────────────────────────────────────────────
 * Este archivo solo enruta mensajes entre el widget y el backend. Cero
 * decisiones. Si aquí aparece un `if` sobre contenido, está en el sitio
 * equivocado: el criterio vive en centriEntrenador.web.js.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ⚠️ OTRO CANAL QUE EL DE LA CONSOLA. NO CONFUNDIR.
 * ───────────────────────────────────────────────────────────────────────────
 * El Entrenador es un HtmlComponent: se embebe como IFRAME AISLADO y habla
 * por postMessage.
 *
 * La consola CENTRI es un custom element: corre en el DOM de la página y
 * habla por atributos y eventos.
 *
 * Son dos mecanismos distintos con límites distintos. Copiar el patrón de uno
 * al otro no funciona.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ⚠️ ACCESO
 * ───────────────────────────────────────────────────────────────────────────
 * Proteger esta página por permisos de Wix Members NO ES SUFICIENTE y no es
 * lo que protege el entrenador.
 *
 * Quien de verdad decide es _exigirAdmin() dentro del backend, contra la
 * colección CentriAdmins. El permiso de página evita que la gente VEA la
 * pantalla; el guard del backend evita que la USEN. Con miembros que son
 * clientes B2B, hacen falta los dos.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ⛔ ORDEN DE DESPLIEGUE
 * ───────────────────────────────────────────────────────────────────────────
 * centriEntrenador → este page code → el widget.
 *
 * Si el widget sube antes que el page code, manda su `ready` con `modo` a un
 * page code viejo que ignora ese campo, y el entrenador cargaría siempre el
 * mismo plano. Pasó en AKIRA.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
  cargarConfigEntrenador,
  guardarAlignment,
  publicarAlignment,
  testCentri,
  generarPromptCentri,
  crearDocumento,
  leerDocumento,
  actualizarDocumento,
  toggleDocumento,
  eliminarDocumento
} from 'backend/centriEntrenador.web';

const EL_ID = '#htmlEntrenadorCentri';   // ← ajustar si el Element ID difiere
const TAG = '[PageCode_Entrenador_CENTRI][1.0.0]';

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
      // ── Arranque y cambio de plano ──
      // ⚠️ `modo` se REENVÍA. Sin esto el selector de plano cargaría siempre
      // el mismo: el widget lo manda al arrancar y en cada cambio de pestaña.
      if (msg.type === 'ready') {
        const res = await cargarConfigEntrenador({ modo: msg.modo });
        return send('configLoaded', { payload: res });
      }

      if (msg.type === 'saveConfig') {
        const res = await guardarAlignment({ config: msg.config });
        return send('configSaved', { payload: res });
      }

      if (msg.type === 'publishConfig') {
        const res = await publicarAlignment({ alignmentId: msg.alignmentId });
        return send('configPublished', { payload: res });
      }

      if (msg.type === 'testPrompt') {
        const res = await testCentri({
          message: msg.message,
          configOverride: msg.configOverride,
          modo: msg.modo
        });
        return send('testResult', { payload: res });
      }

      if (msg.type === 'generatePrompt') {
        const res = await generarPromptCentri({
          descripcion: msg.descripcion,
          modo: msg.modo
        });
        return send('promptGenerated', { payload: res });
      }

      // ── Corpus ──
      if (msg.type === 'createDocument') {
        const res = await crearDocumento({
          titulo: msg.titulo,
          tipo: msg.tipo,
          contenido: msg.contenido,
          resumen: msg.resumen,
          modo: msg.modo          // ⚠️ se reenvía: sin él, el documento cae al plano por defecto
        });
        return send('documentCreated', { payload: res });
      }

      if (msg.type === 'readDocument') {
        const res = await leerDocumento({ documentoId: msg.documentoId });
        return send('documentRead', { payload: res });
      }

      if (msg.type === 'updateDocument') {
        const res = await actualizarDocumento({
          documentoId: msg.documentoId,
          titulo: msg.titulo,
          tipo: msg.tipo,
          contenido: msg.contenido,
          resumen: msg.resumen,
          modo: msg.modo
        });
        return send('documentUpdated', { payload: res });
      }

      if (msg.type === 'toggleDocument') {
        const res = await toggleDocumento({
          documentoId: msg.documentoId,
          activo: msg.activo
        });
        return send('documentToggled', { payload: res });
      }

      if (msg.type === 'deleteDocument') {
        const res = await eliminarDocumento({ documentoId: msg.documentoId });
        // documentoId viaja de vuelta: el widget lo necesita para quitar la
        // fila de su lista, y el backend podría no devolverlo en un error.
        return send('documentDeleted', { payload: res, documentoId: msg.documentoId });
      }

      if (msg.type === 'resize') return;   // lo gestiona el propio widget

      console.warn(`${TAG} mensaje no reconocido: ${msg.type}`);

    } catch (e) {
      console.error(`${TAG} EXCEPTION en ${msg.type}:`, e);
      send('error', { payload: { error: e.message || 'Error técnico.' } });
    }
  });
});