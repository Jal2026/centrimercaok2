/* ═══════════════════════════════════════════════════════════════════════════
 * CENTRIMERCA — CENTRI · Endpoints HTTP
 * Archivo:  backend/http-functions.js
 * VERSION:  1.0.1
 * FECHA:    25 Agosto 2026
 *
 * ⚠️ ESTE ARCHIVO ES COMPARTIDO POR TODO EL SITIO. Si ya existe uno en el
 *    proyecto, NO lo sustituyas: añade a él los tres bloques de CENTRI y el
 *    import. Este archivo es ADITIVO por diseño.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ⛔ ORDEN DE DESPLIEGUE — NO ES OPCIONAL
 * ───────────────────────────────────────────────────────────────────────────
 * centriLogic PRIMERO, este archivo DESPUÉS.
 *
 * Si http-functions sube antes que centriLogic, el import de askCentriCore
 * falla y se lleva por delante TODOS los endpoints del archivo, no solo los
 * de CENTRI. En AKIRA ese mismo fallo tumbaba de golpe la voz, las descargas
 * de Excel y PDF y el webhook de WhatsApp.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * POR QUÉ ENDPOINTS HTTP Y NO webMethods
 * ───────────────────────────────────────────────────────────────────────────
 * La consola llama aquí DIRECTAMENTE por fetch, sin pasar por el page code.
 * Dos motivos, los dos medidos:
 *   1. El paso por atributos TRUNCA payloads grandes (~64 KB). Crítico para
 *      el audio en base64.
 *   2. Elimina un salto de red.
 *
 * ⛔ Las funciones que se importan aquí son PURAS (askCentriCore,
 *    crearSesionCore, centriSynthesizeCore), NO los webMethods. Un endpoint
 *    HTTP corre SIN sesión de usuario: un webMethod con SiteMember detrás
 *    rechazaría la llamada y rompería la única ruta que usa la consola.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ⚠️ EL TECHO DE 14 s — LO QUE ESTE ARCHIVO NO PUEDE ARREGLAR
 * ───────────────────────────────────────────────────────────────────────────
 * Wix corta la CONEXIÓN al cliente a los ~14 s. El backend NO se cancela:
 * sigue corriendo y guarda la respuesta. El cliente recibe 504 sin cuerpo.
 *
 * Por eso existe centriNuevaSesion: da a la consola un sessionId ANTES de la
 * pregunta pesada, para que el polling sepa dónde ir a buscar la respuesta.
 * Sin él, la red de seguridad no cubre la PRIMERA pregunta de cada
 * conversación — justo donde vive la pregunta larga.
 *
 * ⛔ NO INTENTAR STREAMING SSE. Medido: el runtime no acepta streams (ni
 *    ReadableStream ni stream.Readable); el helper de respuesta serializa con
 *    JSON.stringify y cierra. NO REINTENTAR.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { ok, badRequest, serverError } from 'wix-http-functions';

// Funciones PURAS, no los webMethods. Ver aviso de la cabecera.
import { askCentriCore, crearSesionCore } from 'backend/centriLogic.web';
import { centriSynthesizeCore } from 'backend/centriTTS.web';

// ⛔ NO DESCOMENTAR HASTA QUE backend/centriTTS.web.js ESTÉ DESPLEGADO.
//
// Un import que no resuelve NO falla solo en su endpoint: tumba el módulo
// entero y TODOS los endpoints de este archivo devuelven 404. Es el fallo
// que se describe arriba, y ya ocurrió el 25-ago-2026 con este mismo import:
// centriAsk y centriNuevaSesion daban 404 porque centriTTS aún no existía.
//
// Al desplegar centriTTS: descomentar esta línea Y el bloque post_centriTts
// del final, y volver a subir este archivo.
//
// import { centriSynthesizeCore } from 'backend/centriTTS.web';

const TAG = '[CENTRI HTTP]';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

/* ───────────────────────────────────────────────────────────────────────────
 * POST /_functions/centriNuevaSesion
 *
 * Abre la sesión ANTES de la pregunta. Es un insert: milisegundos, no se
 * acerca al techo.
 *
 * ADITIVO Y DEGRADA SIN ROMPER: askCentriCore sigue creando la sesión por su
 * cuenta si le llega sin sessionId. Si este endpoint falla, el comportamiento
 * es el de antes de existir — se pierde la red de seguridad en la primera
 * pregunta, no la pregunta.
 * ─────────────────────────────────────────────────────────────────────────── */
export async function post_centriNuevaSesion(request) {
  try {
    const body = await request.body.json();
    // v1.0.1 — `modo` viaja también aquí. La sesión se abre ANTES de la
    // pregunta, así que si el plano no llegara en esta llamada la conversación
    // se guardaría sin él y el chip no se restituiría al reabrirla. El
    // endpoint es público: crearSesionCore lo valida contra la lista cerrada.
    const { userId, userName, query, modo } = body || {};

    const result = await crearSesionCore({ userId, userName, query, modo });

    return ok({ headers: JSON_HEADERS, body: JSON.stringify(result) });
  } catch (err) {
    console.error(`${TAG} post_centriNuevaSesion EXCEPTION:`, err);
    return serverError({
      headers: JSON_HEADERS,
      body: JSON.stringify({ ok: false, error: 'Error abriendo la conversación.' })
    });
  }
}

/* ───────────────────────────────────────────────────────────────────────────
 * POST /_functions/centriAsk
 *
 * La pregunta. Es la llamada que revienta el techo de 14 s en respuestas
 * largas; la consola lo compensa con polling.
 * ─────────────────────────────────────────────────────────────────────────── */
export async function post_centriAsk(request) {
  try {
    const body = await request.body.json();
    const { sessionId, query, userId, userName, modo } = body || {};

    if (!query) {
      return badRequest({
        headers: JSON_HEADERS,
        body: JSON.stringify({ ok: false, error: 'query requerida' })
      });
    }

    const result = await askCentriCore({ sessionId, query, userId, userName, modo });

    return ok({ headers: JSON_HEADERS, body: JSON.stringify(result) });
  } catch (err) {
    console.error(`${TAG} post_centriAsk EXCEPTION:`, err);
    return serverError({
      headers: JSON_HEADERS,
      body: JSON.stringify({ ok: false, error: 'Error técnico procesando la consulta.' })
    });
  }
}

/* ───────────────────────────────────────────────────────────────────────────
 * POST /_functions/centriTts
 *
 * Voz. Google Cloud TTS, devuelve MP3 en base64.
 *
 * ⚠️ SIN RED DE SEGURIDAD. El audio NO se guarda en ninguna colección: si el
 * fetch se corta, se pierde y no hay de dónde recuperarlo. Medido en
 * producción: P95 de 16.954 ms y 5,9 % de error — revienta el techo de 14 s
 * por la misma razón que la respuesta de texto.
 *
 * CONSECUENCIA PRÁCTICA: la voz irá bien en respuestas cortas y fallará en
 * las largas. Es un límite de la plataforma, no del código. Blindarlo exige
 * trocear el texto y encadenar audios: trabajo aparte, no incluido aquí.
 * ─────────────────────────────────────────────────────────────────────────── */
export async function post_centriTts(request) {
  try {
    const body = await request.body.json();
    const { texto, voiceName, speakingRate, pitch } = body || {};

    if (!texto) {
      return badRequest({
        headers: JSON_HEADERS,
        body: JSON.stringify({ ok: false, error: 'texto requerido' })
      });
    }

    const result = await centriSynthesizeCore({ texto, voiceName, speakingRate, pitch });

    return ok({ headers: JSON_HEADERS, body: JSON.stringify(result) });
  } catch (err) {
    console.error(`${TAG} post_centriTts EXCEPTION:`, err);
    return serverError({
      headers: JSON_HEADERS,
      body: JSON.stringify({ ok: false, error: 'Error sintetizando la voz.' })
    });
  }
}