/* ═══════════════════════════════════════════════════════════════════════════
 * CENTRIMERCA — CENTRI · Page Code
 * Página:   CENTRI
 * VERSION:  1.0.1
 * FECHA:    25 Agosto 2026
 *
 * ───────────────────────────────────────────────────────────────────────────
 * PROCEDENCIA
 * ───────────────────────────────────────────────────────────────────────────
 * Port del page code de AKIRA v1.8.0, que a su vez recogía las correcciones
 * de CATHOVIA. Estructura y decisiones copiadas literales; lo que cambia va
 * enumerado abajo.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * QUÉ HACE — Y SOBRE TODO QUÉ NO HACE
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Puente entre el custom element <centri-console> y backend/centriLogic.web.js.
 *
 * Sirve exactamente cuatro cosas: configuración inicial, historial, lista de
 * conversaciones y borrado. Nada más.
 *
 * ⛔ NO GESTIONA LAS PREGUNTAS, Y ESO ES DELIBERADO.
 *
 *   El custom element llama DIRECTAMENTE a /_functions/centriAsk por fetch.
 *   Si aquí se añadiera un listener 'centri-query' que también llamase al
 *   backend, cada pregunta viajaría por DOS rutas y dispararía DOS llamadas
 *   al modelo en paralelo, con doble coste.
 *
 *   No es una hipótesis: pasó en CATHOVIA v1.6.1 y el log de producción lo
 *   confirmó con dos entradas idénticas. NO AÑADIR ESE LISTENER.
 *
 * ⛔ TAMPOCO GESTIONA LA VOZ, por el mismo motivo más uno propio: el audio
 *   viaja en base64 y setAttribute TRUNCA en silencio por encima de ~64 KB.
 *   El custom element llama a /_functions/centriTts por fetch.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * QUÉ CAMBIA RESPECTO AL PAGE CODE DE AKIRA v1.8.0
 * ───────────────────────────────────────────────────────────────────────────
 *
 *   1. CUATRO PLANOS: mercado · producto · trabajar · dudas.
 *      Arranque en 'mercado' (ver PLANO_ARRANQUE).
 *
 *   2. functionsBase — GANCHO PRESENTE, ENVIADO VACÍO.
 *      ⚠️ Se intentó rellenarlo con wixLocation.baseUrl y DIO 404 en
 *      producción (25-ago-2026). La ruta buena es la absoluta,
 *      '/_functions/...', que es la que usan AKIRA y CATHOVIA. La Guía de
 *      CATHOVIA §17.7 describe el patrón contrario; el código de las dos
 *      consultas dice otra cosa y el código gana.
 *      El gancho se queda para el día que el motor salga de la plataforma.
 *
 *   3. SIN SKIN. No se envía: CENTRI tiene una paleta y vive en el custom
 *      element. Se deja el gancho `colors` por si algún día hay que afinar
 *      un color desde el CMS sin desplegar el archivo.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ⚠️ CONTROL DE ACCESO Y PRIVACIDAD DEL HISTORIAL — LEER ANTES DE PUBLICAR
 * ───────────────────────────────────────────────────────────────────────────
 *
 * El acceso a la página va por permisos de Wix Members. Eso resuelve QUIÉN
 * entra, pero NO resuelve quién ve QUÉ historial.
 *
 * El historial se separa por persona con CentriSessions.usuarioId. En AKIRA
 * ese campo llegó a NO existir en el CMS: el backend lo pedía, la base de
 * datos lo ignoraba en silencio (escribir a un campo inexistente NO falla) y
 * el listado degradaba a "sin filtrar". Consecuencia: todo el mundo veía las
 * conversaciones de todo el mundo.
 *
 * En AKIRA eso era el equipo de un salón. AQUÍ NO. Los miembros de CENTRI son
 * personas de EMPRESAS DISTINTAS, potencialmente competidoras entre sí. El
 * mismo fallo deja las consultas de una empresa a la vista de otra.
 *
 * ⛔ VERIFICAR EL CAMPO CONTRA EL BACKEND ANTES DE ABRIR LA PÁGINA A NADIE.
 *    No contra un CSV exportado: contra el CMS.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ELEMENT ID
 * ───────────────────────────────────────────────────────────────────────────
 * Este archivo asume Element ID #centriConsole y tag name 'centri-console'.
 * Si en el editor le pones otro ID, cambia EL_ID. Es lo único que hay que
 * tocar aquí.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { currentMember } from 'wix-members-frontend';
import {
  centriAbrir,
  centriListarChats,
  centriAbrirChat,
  centriBorrarChat
} from 'backend/centriLogic.web';

// ── CONFIGURACIÓN ──────────────────────────────────────────────────────────

const EL_ID = '#centriConsole';   // ← ajustar si el Element ID del editor difiere

// Plano DE ARRANQUE. Un solo CENTRI con cuatro planos: el usuario cambia con
// los chips de la topbar, así que esto solo decide con cuál abre la pantalla.
// Válidos: 'mercado' | 'producto' | 'trabajar' | 'dudas'.
//
// ⚠️ NO confundir con el plano por defecto DEL BACKEND, que es donde caen los
// documentos del corpus sin plano asignado. Ese debe ser 'dudas'. Que ambos
// coincidan es lo que en AKIRA metió un manual entero en el corpus del
// consultor sin que nadie se enterara.
const PLANO_ARRANQUE = 'mercado';

// Voz. Requiere backend/centriTTS.web.js desplegado + secret GOOGLE_SA_JSON.
// La voz CONCRETA no se elige aquí: sale del CMS (voiceId). Este flag solo
// enciende o apaga el botón.
//
// ⚠️ Ponerlo en true sin el endpoint desplegado pinta un botón que no
// responde. Encenderlo DESPUÉS de verificar la voz, no antes.
const TTS_ENABLED = false;

// Bola flotante del chat IA nativo de Wix. Dos asistentes compitiendo en la
// misma pantalla es mala experiencia, sobre todo cara al cliente.
//
// ⚠️ EL ID ES POR PÁGINA. Vacío = no se intenta ocultar nada. Para activarlo:
// clic en la bola dentro del editor → panel de propiedades → ID → pegarlo
// aquí. Si el ID es incorrecto el hide() falla en silencio (el try/catch lo
// absorbe) y la bola sigue visible.
const CHAT_IA_ID = '';

const V = 'CENTRI Page v1.0.1';

// ═══════════════════════════════════════════════════════════════════════════

$w.onReady(async function () {
  console.log(`[${V}] onReady`);

  // Refuerzos: Wix a veces pinta la bola unos ms después del onReady.
  ocultarBolaChatIA();
  setTimeout(ocultarBolaChatIA, 500);
  setTimeout(ocultarBolaChatIA, 1500);

  let el;
  try {
    el = $w(EL_ID);
  } catch (e) {
    console.error(`[${V}] No existe el custom element ${EL_ID}. Revisa el Element ID en el editor.`);
    return;
  }

  // ── Helper robusto para setAttribute ─────────────────────────────────────
  const trySetAttr = (name, value, retries = 3) => {
    try {
      el.setAttribute(name, value);
      return true;
    } catch (err) {
      console.warn(`[${V}] setAttribute("${name}") fallo:`, err.message);
      if (retries > 0) {
        setTimeout(() => trySetAttr(name, value, retries - 1), 200);
      } else {
        console.error(`[${V}] setAttribute("${name}") ABANDONO tras reintentos`);
      }
      return false;
    }
  };

  // ── Dirección base de los endpoints ──────────────────────────────────────
  // ⛔ SE ENVÍA VACÍO A PROPÓSITO. NO PONER wixLocation.baseUrl AQUÍ.
  //
  // Se intentó y dio 404 en producción (25-ago): baseUrl devuelve la URL
  // completa del sitio y la ruta resultante no es la que Wix expone para las
  // http-functions. La llamada correcta es la ABSOLUTA, '/_functions/...',
  // que es lo que hacen AKIRA y CATHOVIA y lo que funciona.
  //
  // Vacío = el custom element usa la ruta absoluta. Ese es el comportamiento
  // bueno, no un fallback degradado.
  //
  // El gancho se conserva por si algún día el motor sale de esta plataforma:
  // entonces aquí irá la dirección del servidor externo, que sí es un origen
  // distinto y sí hay que declarar.
  const functionsBase = '';

  // ── Resolver usuario ─────────────────────────────────────────────────────
  // ⚠️ userId alimenta CentriSessions.usuarioId → historial POR PERSONA.
  // Si ese campo no existe en el CMS, el backend degrada a listar sin filtrar
  // y CADA MIEMBRO VE LAS CONVERSACIONES DE TODOS. Ver aviso de la cabecera.
  let userId = '';
  let userName = '';
  try {
    const member = await currentMember.getMember();
    if (member) {
      userId = member._id || '';
      userName = (member.profile && member.profile.nickname) || member.loginEmail || '';
    }
  } catch (_) { /* anónimo */ }

  if (!userId) {
    // La página debería estar protegida por Wix Members. Si llega alguien sin
    // sesión, el historial no se puede separar por persona.
    console.warn(`[${V}] Sin miembro identificado. ¿Está la página protegida?`);
  }
  console.log(`[${V}] user: ${userId ? userId + ' / ' + userName : 'anónimo'}`);

  // ═════════════════════════════════════════════════════════════════════════
  // LISTENERS — REGISTRAR **ANTES** DE ENVIAR CONFIG
  // El custom element emite centri-load-chats / centri-open-chat en cuanto
  // recibe config. Sin los listeners puestos, esos eventos se pierden.
  // ═════════════════════════════════════════════════════════════════════════

  // ⛔ NO hay listener 'centri-query'. Ver aviso de la cabecera. NO AÑADIR.

  el.on('centri-open-chat', async (event) => {
    const { sessionId } = event.detail || {};
    if (!sessionId) return;
    try {
      const result = await centriAbrirChat({ sessionId, userId });
      if (result.ok) {
        // _ts fuerza un JSON distinto en cada envío. Sin él, reabrir el mismo
        // chat manda un atributo idéntico y el DOM NO dispara
        // attributeChangedCallback. Además el polling del 504 depende de que
        // este atributo llegue SIEMPRE. (CATHOVIA v1.4.3)
        // v1.0.1 — `modo` es el plano guardado con la sesión. El custom
        // element lo usa para restituir el chip. Puede venir null si la
        // conversación es anterior al campo: en ese caso NO se toca el chip.
        trySetAttr('history', JSON.stringify({
          _ts: Date.now(),
          sessionId: result.sessionId,
          mensajes: result.mensajes || [],
          modo: result.modo || null
        }));
      } else {
        console.warn(`[${V}] centriAbrirChat ERR: ${result.error}`);
      }
    } catch (err) {
      console.error(`[${V}] centriAbrirChat EXCEPTION:`, err);
    }
  });

  el.on('centri-load-chats', async () => {
    try {
      const result = await centriListarChats({ userId });
      trySetAttr('chats', JSON.stringify(result.chats || []));
    } catch (err) {
      console.error(`[${V}] centriListarChats EXCEPTION:`, err);
    }
  });

  el.on('centri-delete-chat', async (event) => {
    const { sessionId } = event.detail || {};
    if (!sessionId) return;
    try {
      const result = await centriBorrarChat({ sessionId, userId });
      if (!result.ok) console.error(`[${V}] centriBorrarChat ERR: ${result.error}`);
      // Refrescar desde el backend: es autoritativo sobre el borrado optimista
      // que ya pintó el custom element.
      const listing = await centriListarChats({ userId });
      trySetAttr('chats', JSON.stringify(listing.chats || []));
    } catch (err) {
      console.error(`[${V}] centriBorrarChat EXCEPTION:`, err);
    }
  });

  el.on('centri-ready', () => {
    console.log(`[${V}] custom element listo`);
  });

  // ⛔ NO hay listener 'centri-tts'. El audio va por fetch directo desde el
  // custom element. Añadirlo aquí duplicaría la llamada y el coste, y el
  // base64 se truncaría en el atributo.

  console.log(`[${V}] listeners registrados`);

  // ═════════════════════════════════════════════════════════════════════════
  // ABRIR CONSOLA Y ENVIAR CONFIG
  // ═════════════════════════════════════════════════════════════════════════

  let abrir;
  try {
    abrir = await centriAbrir();
    if (!abrir.ok) {
      console.error(`[${V}] centriAbrir ERR:`, abrir.error);
      setTimeout(() => trySetAttr('systemError', abrir.error || 'No se pudo abrir CENTRI.'), 100);
      return;
    }
  } catch (err) {
    console.error(`[${V}] centriAbrir EXCEPTION:`, err);
    setTimeout(() => trySetAttr('systemError', 'Error de conexión: ' + err.message), 100);
    return;
  }

  console.log(`[${V}] abierto. align=v${abrir.alignment ? abrir.alignment.version : '-'}`);

  if (!abrir.alignment) {
    console.warn(`[${V}] Sin alignment publicado para el plano de arranque — CENTRI usará su identidad por defecto.`);
  }

  // ── Marca ────────────────────────────────────────────────────────────────
  // El nombre y el logo de CENTRI viven en DEFAULT_BRAND del custom element:
  // son la marca del producto y no pueden perderse por un fallo de este
  // archivo. Aquí solo va lo que salga del CMS.
  const brand = {};
  if (abrir.brandName) brand.sub = abrir.brandName;
  // Vacío = no se pinta. Para activar el aviso de IA, rellenar en el CMS.
  if (abrir.disclaimer) brand.disclaimer = abrir.disclaimer;

  // ── Textos por plano ─────────────────────────────────────────────────────
  // El custom element ya trae los suyos. Aquí solo se superpone lo que
  // Centrimerca haya escrito en el CMS. El backend filtra los vacíos, así que
  // un campo sin rellenar deja intacto el texto de fábrica y la pantalla
  // nunca se queda muda.
  const brandPlanes = {};
  const planosCms = abrir.planos || {};
  Object.keys(planosCms).forEach((p) => {
    brandPlanes[p] = Object.assign({}, brandPlanes[p] || {}, planosCms[p] || {});
  });

  const configPayload = JSON.stringify({
    userId,
    userName,
    modo: PLANO_ARRANQUE,
    sessionId: null,          // cada visita arranca en welcome (CATHOVIA v1.5.3)
    functionsBase,
    ttsEnabled: TTS_ENABLED,
    brand,
    brandPlanes
    // colors: {...}          ← gancho abierto. Si algún día un color se
    //                           gobierna desde el CMS, va aquí. Lo que no
    //                           venga, el custom element lo conserva.
  });

  // ── Carga inicial FORZADA del historial ──────────────────────────────────
  //
  // POR QUÉ HACE FALTA: el custom element emite 'centri-load-chats' desde
  // _applyConfig, pero ese emit puede dispararse antes de que el navegador
  // haya enganchado los listeners de este archivo — y entonces se pierde en
  // silencio. Síntoma: la barra lateral aparece vacía al abrir y solo se
  // puebla tras la primera respuesta.
  //
  // La regla, de CATHOVIA: NO depender del emit. Este page code pide el
  // estado inicial por su cuenta.
  const cargarEstadoInicial = async () => {
    try {
      const chats = await centriListarChats({ userId });
      trySetAttr('chats', JSON.stringify(chats.chats || []));
      console.log(`[${V}] estado inicial: ${(chats.chats || []).length} conversaciones`);
    } catch (err) {
      console.error(`[${V}] cargarEstadoInicial EXCEPTION:`, err);
    }
  };

  setTimeout(() => {
    console.log(`[${V}] enviando config al custom element`);
    trySetAttr('config', configPayload);
    setTimeout(cargarEstadoInicial, 400);
  }, 150);
});

function ocultarBolaChatIA() {
  if (!CHAT_IA_ID) return;   // no configurado: no se intenta nada
  try {
    $w(CHAT_IA_ID).hide();
    console.log('[Chat IA] Bola flotante ocultada', { id: CHAT_IA_ID });
  } catch (e) {
    console.warn('[Chat IA] No se pudo ocultar. Revisa si el ID existe en esta página.', {
      id: CHAT_IA_ID
    });
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
 * ORDEN DE DESPLIEGUE — IMPORTA
 * ═══════════════════════════════════════════════════════════════════════════
 *   1. Campos CMS   →  2. centriLogic  →  3. http-functions
 *   →  4. centriTTS  →  5. este page code  →  6. el custom element
 *
 * ⛔ Si http-functions sube antes que centriLogic, el import de la función de
 *    creación de sesión falla y se lleva por delante TODOS los endpoints del
 *    archivo, no solo el de CENTRI.
 *
 * ⛔ Este page code antes que el custom element. Al revés, el elemento emite
 *    'centri-ready' contra un page code que aún no lo escucha.
 * ═══════════════════════════════════════════════════════════════════════════
 */