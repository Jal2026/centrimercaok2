/* ═══════════════════════════════════════════════════════════════════════════
 * CENTRIMERCA — CENTRI SALES · Banco de pruebas · Transcripción + informe (Wix Velo)
 * Archivo:  backend/centriSalesLab.web.js
 * VERSION:  1.4.0
 * FECHA:    25 Octubre 2026
 *
 * v1.4.0 — 25 OCT 2026 · TICKET DE GASTO (pantallas del prototipo: «Añadir
 *   ticket», «Ticket de gasto», «No se lee bien el ticket»). ADITIVO.
 *     · NUEVO ticketCore({ imagen(base64), mime }): Claude (MODELO_INFORME,
 *       con imagen) lee categoría, total, fecha y comercio. Si no se lee el
 *       total con seguridad → { legible:false }. Si se lee, la foto se sube
 *       al Media Manager (CARPETA_TICKETS) y se devuelve su fileUrl.
 *     · Lo expone http-functions.js v1.0.5: POST /_functions/centriSalesTicket.
 *     · Patrón de subida: mediaManager.upload() de la documentación de Velo
 *       (wix-media-backend), con isPrivate:false como su ejemplo.
 *     · Si falla la subida de la foto, la lectura del ticket no se pierde
 *       (foto vacía y aviso en el log).
 *
 * v1.3.1 — 25 OCT 2026 · En la segunda prueba real el resumen puso al
 *   cliente («Cándido Ávila», nombre comercial del negocio) como una de las
 *   personas de la reunión. Ahora el nombre llega marcado como nombre del
 *   negocio y hay una regla: no contarlo como persona salvo que el reporte
 *   diga que estuvo.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * CAMBIOS v1.2.0 → v1.3.0 — primera prueba real de la beta (Jal, 25-oct)
 * ───────────────────────────────────────────────────────────────────────────
 *   1. RESUMEN: de 35 a 90 palabras como máximo. Con 35 se perdía quién
 *      estuvo en la visita (los dos hermanos y el padre) y cómo está el
 *      cliente (contentos) en un reporte de más de un minuto. Ahora el
 *      resumen debe recoger: quién estuvo, cómo está el cliente, qué se
 *      habló y en qué quedó. Tope de texto 600 → 900 caracteres y
 *      MAX_TOKENS_INFORME 900 → 1200.
 *   2. DUDAS: solo preguntas que se contestan con Sí o No (la app solo
 *      ofrece esos dos botones). Salió «¿Qué volumen anual estiman…?».
 *
 * ───────────────────────────────────────────────────────────────────────────
 * CAMBIOS v1.1.0 → v1.2.0 — INFORME SEGÚN LA UI v1 + REINTENTOS
 * ───────────────────────────────────────────────────────────────────────────
 *   1. PRÓXIMA ACCIÓN Y SUGERENCIA DE LA IA, SEPARADAS. En la prueba real
 *      la IA se inventó la próxima acción. Ahora:
 *      · proxima_accion: SOLO la que dice el comercial. Si no dice ninguna,
 *        va vacía (y la validación vacía también fecha y responsable).
 *      · sugerencia_ia { descripcion, responsable }: campo NUEVO, aparte,
 *        sin fecha. Es lo que propone la IA y la app lo marca «Esto no lo
 *        has dicho tú». Si repite la próxima acción, se descarta.
 *      En la taxonomía (responsable sirve para las dos), el prompt y
 *      _validarInforme.
 *   2. RESUMEN de 60 a 35 palabras (en el móvil ocupaba 8 líneas).
 *   3. PROMPT: vocabulario del sector (rappel, objetivos, merma, palé,
 *      reposición), respetar negaciones y conservar condiciones y salvedades.
 *      Corrige los dos fallos de la prueba real («no le hacemos reposiciones»
 *      → «retrasos en reposiciones»; se perdió «aunque no han llegado a los
 *      objetivos»). Los ejemplos del prompt son DISTINTOS de esa prueba, para
 *      que repetirla siga sirviendo de comprobación.
 *      La sugerencia trata del cliente o de la cuenta, nunca del comercial
 *      (línea roja del Reglamento europeo de IA).
 *   4. ADITIVO: las respuestas de error llevan reintentable: true cuando
 *      repetir puede servir (Google 5xx o 429, «Error técnico», la IA no
 *      devolvió JSON). Lo usa el botón «Reintentar» de centri-sales-lab
 *      v1.0.5. Las respuestas correctas y la firma de las dos funciones NO
 *      cambian: http-functions.js v1.0.4 sigue igual.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * CAMBIOS v1.0.0 → v1.1.0 — INFORME DE LA VISITA CON IA (ADITIVO)
 * ───────────────────────────────────────────────────────────────────────────
 *   Nueva función pura informePruebaCore({ texto, cliente }): convierte la
 *   transcripción del reporte en un informe estructurado con Claude Haiku y
 *   una taxonomía CERRADA validada en código (patrón del intérprete de
 *   CATHOVIA, cathoviaClima.js v1.3.0). La llama http-functions.js v1.0.4
 *   (POST /_functions/centriSalesLabInforme) desde el custom element
 *   centri-sales-lab v1.0.4, en una petición aparte de la transcripción:
 *   cada una por debajo del corte de ~14 s de Wix.
 *   transcribirPruebaCore NO cambia.
 *
 *   Procedencia:
 *   · _llamarModelo(): COPIA LITERAL de cathoviaClima.js v1.3.0.
 *   · Parseo (quitar ```json y JSON.parse) y _validar() contra TAXONOMIA:
 *     mismo patrón que _interpretar/_validar de cathoviaClima.js.
 *   · Modelo 'claude-haiku-4-5' y secret 'CENTRIMERCA': los de
 *     centriLogic.web.js v1.0.9 (MODEL_FALLBACK y SECRET_API).
 *   · Taxonomía, prompt y fecha de hoy: NUEVOS.
 *
 *   ⚠️ LÍNEA ROJA (Reglamento europeo de IA): el informe describe la VISITA y
 *   al CLIENTE, nunca al comercial. El prompt prohíbe recoger lo que el
 *   comercial dice de sí mismo (cansancio, ánimo, quejas personales). En
 *   ningún caso se analiza la voz para inferir emociones (prohibido en el
 *   trabajo, art. 5.1.f): aquí solo llega texto.
 *
 *   ⚠️ CODE/CMS: en el banco de pruebas la taxonomía y el prompt viven en
 *   código para iterar rápido. En Centri Sales irán al Entrenador.
 *
 *   ⚠️ También es público y sin sesión, y ahora gasta tokens de Anthropic:
 *   MAX_TEXTO y MAX_TOKENS_INFORME acotan cada llamada. Quitar al terminar.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * QUÉ ES
 * ───────────────────────────────────────────────────────────────────────────
 * Backend de PRUEBA del modo «Grabar y transcribir» del custom element
 * centri-sales-lab (public/custom-elements/centriSalesLab.js v1.0.2).
 * Recibe un segmento de audio grabado en el móvil (≤ 1 minuto, en base64) y
 * lo transcribe con Google Cloud Speech-to-Text V1 (recognize síncrono).
 *
 * NO escribe en ninguna colección y NO guarda el audio: transcribe y
 * devuelve el texto. Solo deja trazas en los logs del sitio.
 *
 * Lo llama http-functions.js v1.0.3 (POST /_functions/centriSalesLabTranscribir).
 * Por eso la función exportada es PURA, no un webMethod: un endpoint HTTP
 * corre sin sesión de miembro (mismo motivo que centriSynthesizeCore en
 * centriTTS.web.js).
 *
 * ───────────────────────────────────────────────────────────────────────────
 * PROCEDENCIA
 * ───────────────────────────────────────────────────────────────────────────
 *   · _getAccessToken() (OAuth2, JWT RS256 con la Service Account de
 *     GOOGLE_SA_JSON): COPIA LITERAL de centriTTS.web.js v1.0.0, que a su vez
 *     es copia literal de egaelTTS v1.3.0. Único cambio: la constante del
 *     scope se llama STT_SCOPE (mismo valor que TTS_SCOPE: cloud-platform).
 *   · Estructura de la llamada (token → fetch POST JSON → control de
 *     !response.ok → parseo): la de centriSynthesizeCore.
 *   · Petición y respuesta de Google V1 (config, audio.content, results,
 *     totalBilledTime): según la documentación de Google; no hay código
 *     previo de transcripción en AKIRA, CATHOVIA ni CENTRI.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * LÍMITES DE GOOGLE (V1, documentación oficial)
 * ───────────────────────────────────────────────────────────────────────────
 *   · recognize síncrono: 1 minuto de audio o 10 MB por petición. Más largo
 *     exige reconocimiento asíncrono con el audio en Cloud Storage. Por eso
 *     el custom element parte la grabación en segmentos de 55 s.
 *   · WEBM_OPUS y OGG_OPUS admitidos; frecuencia 8000, 12000, 16000, 24000 o
 *     48000 Hz. Chrome graba Opus a 48000 Hz.
 *   · MP4 / AAC (lo que graba Safari en iPhone) NO está admitido. Se
 *     rechaza aquí con un mensaje claro, antes de gastar una llamada.
 *   · Precio V1 (USD por minuto, facturado por segundo): los primeros 60
 *     minutos al mes gratis; después 0,016 $ con registro de datos para
 *     Google y 0,024 $ sin él (la opción por defecto si no se activa el
 *     registro de datos en el proyecto).
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ⚠️ ENDPOINT PÚBLICO DURANTE LA PRUEBA
 * ───────────────────────────────────────────────────────────────────────────
 * El endpoint HTTP no lleva sesión: cualquiera que conozca la ruta puede
 * mandar audio y gastar minutos. Se limita el tamaño (MAX_B64) y la
 * duración (MAX_MS). Para la prueba basta; en Centri Sales de verdad la
 * transcripción irá detrás del control de acceso. AL TERMINAR LA PRUEBA,
 * quitar el bloque del endpoint de http-functions.js.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * REQUISITOS
 * ───────────────────────────────────────────────────────────────────────────
 *   · Secret GOOGLE_SA_JSON (el mismo del TTS de CENTRI).
 *   · En el proyecto de Google Cloud de esa Service Account: ACTIVAR
 *     «Cloud Speech-to-Text API». Sin eso Google responde 403.
 *     (Hecho el 21-oct-2026 en el proyecto voice-egael.)
 *   · v1.1.0: secret CENTRIMERCA (la clave de Anthropic de CENTRI, ya existe).
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { fetch } from 'wix-fetch';
import { getSecret } from 'wix-secrets-backend';
import crypto from 'crypto';
import { mediaManager } from 'wix-media-backend';   // v1.4.0 — fotos de tickets

// El TAG se deriva de VERSION (patrón de centriTTS.web.js).
const VERSION = '1.4.0';
const V = `CENTRI_SALES_LAB v${VERSION}`;

const STT_ENDPOINT   = 'https://speech.googleapis.com/v1/speech:recognize';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const STT_SCOPE      = 'https://www.googleapis.com/auth/cloud-platform';

const IDIOMA = 'es-ES';

// Modelo preferido para dictados largos. Si Google lo rechaza (400), se
// repite la petición una vez con el modelo por defecto y se informa de cuál
// se usó.
const MODELO_PREFERIDO = 'latest_long';

// Opus en WebM/Ogg grabado por Chrome: 48000 Hz.
const SAMPLE_RATE = 48000;

// Topes de la prueba (endpoint público). Google admite hasta 10 MB y 1 min.
const MAX_B64 = 4 * 1024 * 1024;   // ~3 MB de audio
const MAX_MS  = 61000;             // segmentos de 55 s + margen

let _tokenCache = { token: null, expiresAt: 0 };

// ═══════════════════════════════════════════════════════════════════════════
// TRANSCRIPCIÓN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Función PURA. La llama http-functions.js.
 * @param {{ audio: string, mime: string, ms: number }} params
 *   audio: base64 SIN el prefijo data:
 *   mime:  tipo que dio MediaRecorder (p. ej. 'audio/webm;codecs=opus')
 *   ms:    duración del segmento medida en el móvil
 * @returns {{ ok: boolean, texto?: string, modelo?: string,
 *             facturadoS?: number, timeMs?: number, error?: string }}
 */
export async function transcribirPruebaCore({ audio, mime, ms }) {
  const tipo = String(mime || '').toLowerCase();
  const largo = typeof audio === 'string' ? audio.length : 0;
  console.log(`[${V}] transcribir IN b64=${largo} mime=${tipo || '?'} ms=${ms || '?'}`);

  try {
    if (!largo) return { ok: false, error: 'Falta el audio.' };
    if (largo > MAX_B64) {
      return { ok: false, error: `Audio demasiado grande (${Math.round(largo / 1024)} KB en base64; máximo ${Math.round(MAX_B64 / 1024)} KB).` };
    }
    if (Number(ms) > MAX_MS) {
      return { ok: false, error: `Segmento demasiado largo (${Math.round(Number(ms) / 1000)} s; Google admite 60 s por petición).` };
    }

    let encoding = '';
    if (tipo.indexOf('webm') >= 0) encoding = 'WEBM_OPUS';
    else if (tipo.indexOf('ogg') >= 0) encoding = 'OGG_OPUS';
    else {
      return {
        ok: false,
        error: `Formato ${tipo || 'desconocido'} no admitido por Google Speech-to-Text V1 (admite WebM/Ogg Opus). En iPhone, Safari graba en MP4/AAC: hace falta convertirlo antes de enviarlo.`
      };
    }

    const accessToken = await _getAccessToken();

    // 1.ª petición con el modelo preferido; si Google lo rechaza, una 2.ª sin modelo.
    let r = await _recognize(accessToken, audio, encoding, MODELO_PREFERIDO);
    if (!r.ok && r.status === 400) {
      console.warn(`[${V}] modelo ${MODELO_PREFERIDO} rechazado (400): repito con el modelo por defecto`);
      r = await _recognize(accessToken, audio, encoding, '');
    }

    if (!r.ok) {
      if (r.status === 403) {
        return { ok: false, error: 'Google rechazó la petición (403). Activa «Cloud Speech-to-Text API» en el proyecto de Google Cloud de la cuenta de servicio (GOOGLE_SA_JSON); si ya está activa, el motivo exacto está en los logs del sitio.' };
      }
      // v1.2.0: reintentable si el fallo es de Google (5xx) o por exceso de peticiones (429)
      return { ok: false, error: `El servicio de transcripción respondió ${r.status}.`, reintentable: r.status >= 500 || r.status === 429 };
    }

    const data = r.data || {};
    const resultados = Array.isArray(data.results) ? data.results : [];
    const texto = resultados
      .map((x) => (x && Array.isArray(x.alternatives) && x.alternatives[0] && x.alternatives[0].transcript) || '')
      .map((t) => String(t).trim())
      .filter(Boolean)
      .join(' ');
    const facturadoS = parseFloat(String(data.totalBilledTime || '0').replace('s', '')) || 0;

    console.log(`[${V}] transcribir OUT ${r.timeMs}ms modelo=${r.modelo || 'default'} facturado=${facturadoS}s resultados=${resultados.length} chars=${texto.length}`);

    if (!texto) {
      return { ok: false, error: 'Google no reconoció voz en este audio.', modelo: r.modelo || 'default', facturadoS, timeMs: r.timeMs };
    }

    return {
      ok: true,
      texto,
      modelo: r.modelo || 'default',
      facturadoS,
      timeMs: r.timeMs
    };

  } catch (err) {
    console.error(`[${V}] transcribir EXCEPTION:`, err.message || err);
    return { ok: false, error: 'Error técnico: ' + (err.message || 'desconocido'), reintentable: true };   // v1.2.0
  }
}

async function _recognize(accessToken, audio, encoding, modelo) {
  const config = {
    encoding,
    sampleRateHertz: SAMPLE_RATE,
    languageCode: IDIOMA,
    enableAutomaticPunctuation: true
  };
  if (modelo) config.model = modelo;

  const startTime = Date.now();
  const response = await fetch(STT_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({ config, audio: { content: audio } })
  });
  const timeMs = Date.now() - startTime;

  if (!response.ok) {
    const errText = await response.text();
    console.error(`[${V}] Speech-to-Text ${response.status} (modelo ${modelo || 'default'}): ${errText.substring(0, 500)}`);
    return { ok: false, status: response.status, timeMs, modelo };
  }

  const data = await response.json();
  return { ok: true, status: response.status, timeMs, modelo, data };
}

// ═══════════════════════════════════════════════════════════════════════════
// INFORME DE LA VISITA (v1.1.0)
// ═══════════════════════════════════════════════════════════════════════════

// Mismo modelo y mismo secret que CENTRI (centriLogic.web.js v1.0.9).
const MODELO_INFORME     = 'claude-haiku-4-5';
const SECRET_ANTHROPIC   = 'CENTRIMERCA';
const MAX_TOKENS_INFORME = 1200;   // v1.3.0: 900 → 1200 (resumen más largo)
const MAX_TEXTO          = 8000;    // caracteres de transcripción (~10 min hablando)
const ZONA               = 'Europe/Madrid';

// ── Taxonomía CERRADA. Cambiarla aquí; el prompt y la validación la leen. ──
const TAXONOMIA_VISITA = {
  resultado:   ['pedido', 'oferta', 'seguimiento', 'incidencia', 'sin_interes', 'no_atendido', 'otro'],
  interes:     ['alto', 'medio', 'bajo', 'indeterminado'],
  objeciones:  ['precio', 'calidad', 'mermas', 'entrega', 'servicio', 'condiciones_pago', 'competencia', 'otra'],
  alertas:     ['riesgo_impago', 'queja', 'riesgo_perdida', 'descuento_solicitado', 'oportunidad'],
  responsable: ['comercial', 'direccion_comercial', 'cobros', 'logistica', 'calidad', 'otro']
};
const MULTIPLES = ['objeciones', 'alertas'];

const DESCRIPCION_TAXONOMIA_VISITA = [
  'resultado (uno): pedido (el cliente compra o confirma un pedido) | oferta (se le ha hecho o queda pendiente una oferta) | seguimiento (hay que volver o llamar, sin pedido ni oferta) | incidencia (la visita gira sobre un problema: mermas, entrega, calidad, factura) | sin_interes | no_atendido (no se pudo hablar con el cliente) | otro',
  'interes (uno, del CLIENTE en seguir comprando o en comprar más): alto | medio | bajo | indeterminado',
  'objeciones (lista, puede ir vacía): precio | calidad | mermas | entrega | servicio | condiciones_pago | competencia | otra',
  'alertas (lista, puede ir vacía): riesgo_impago (debe facturas, retrasa pagos, hay que pasar a cobros) | queja | riesgo_perdida (puede irse a otro proveedor o dejar de comprar) | descuento_solicitado | oportunidad (más volumen, nuevas tiendas, campaña)',
  'responsable (uno, de la próxima acción y de la sugerencia de la IA): comercial | direccion_comercial | cobros | logistica | calidad | otro'
].join('\n');

// v1.2.0 — Vocabulario del sector. ⚠️ CODE/CMS: en Centri Sales irá al
// Entrenador junto con la taxonomía y el prompt.
const VOCABULARIO_SECTOR = [
  '- rappel: descuento o bonificación por volumen de compra, ligado a unos objetivos.',
  '- objetivos: volumen de compra pactado con el cliente para un periodo (p. ej., el año).',
  '- merma: género que se pierde o se estropea.',
  '- palé, reposición: términos del sector; escríbelos tal cual.'
].join('\n');

function _hoyMadrid() {
  const d = new Date();
  try {
    const dia = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
    const semana = new Intl.DateTimeFormat('es-ES', { timeZone: ZONA, weekday: 'long' }).format(d);
    return { dia, semana };
  } catch (e) {
    return { dia: d.toISOString().slice(0, 10), semana: '' };
  }
}

function _systemInforme(hoy) {
  return [
    'Eres el asistente que pasa a limpio los reportes de visita de los comerciales de Centrimerca, mayorista de frutas y hortalizas en Mercamadrid.',
    'Recibes la transcripción automática de un reporte dictado por voz justo después de una visita a un cliente. Tu tarea: convertirla en un informe breve y estructurado.',
    `Hoy es ${hoy.semana ? hoy.semana + ', ' : ''}${hoy.dia} (Europe/Madrid). Convierte las fechas relativas ("mañana", "el jueves", "la semana que viene") a AAAA-MM-DD. Si no hay fecha, null.`,
    '',
    'TAXONOMÍA CERRADA (usa solo estos valores, copiados exactamente):',
    DESCRIPCION_TAXONOMIA_VISITA,
    '',
    // v1.2.0
    'VOCABULARIO DEL SECTOR (escríbelo tal cual: no lo cambies por sinónimos ni lo reinterpretes):',
    VOCABULARIO_SECTOR,
    '',
    'REGLAS:',
    '- Solo lo que dice el reporte. No inventes importes, cantidades, fechas, productos ni acuerdos. Si algo no está, déjalo vacío o null.',
    '- La transcripción viene de voz y puede tener errores. Corrige términos del sector solo cuando sea evidente por el contexto (p. ej. "rappers" → rappel, "palet" → palé). Nunca corrijas nombres de clientes ni de personas.',
    // v1.3.0: 35 → 90 palabras y contenido obligatorio (prueba real: se perdían asistentes y ánimo del cliente)
    '- Quita muletillas y repeticiones ("bueno", "pues", "o sea"). El resumen va en tercera persona, neutro, máximo 90 palabras, en frases cortas.',
    // v1.3.1: el nombre del cliente es el del negocio
    '- El nombre del cliente es el nombre comercial del NEGOCIO. No lo pongas entre las personas de la visita salvo que el reporte diga que esa persona estuvo.',
    '- El resumen recoge, si el reporte lo dice: quién estuvo en la visita (personas y su relación, p. ej. «los dos hermanos y el padre»), cómo está el cliente (contento, molesto, preocupado…) y por qué, qué se habló y en qué quedó. Después, los hechos, peticiones y condiciones del cliente. No omitas a las personas ni el ánimo del cliente por ahorrar palabras.',
    // v1.2.0: fallos de la prueba real (negación mal leída y condición perdida)
    '- Respeta el sentido exacto de cada hecho y mantén las negaciones: «no le servimos los sábados» significa que no se le sirve ese día; no lo conviertas en un retraso ni en una incidencia de entrega.',
    '- Conserva las condiciones y salvedades que cambian el sentido («aunque», «solo si», «a cambio de», «sin haber llegado a»). P. ej., «acepta el precio solo si se le sirve antes de las 7» no es «acepta el precio». Van en el resumen o en la descripción que corresponda.',
    '- ⛔ El informe trata de la VISITA y del CLIENTE. NO recojas nada de lo que el comercial diga sobre sí mismo (cansancio, ánimo, frustración, opiniones personales sobre compañeros o jefes). No lo resumas, no lo uses para ningún campo.',
    '- Lo que expresa el CLIENTE (quejas, enfado, satisfacción) sí cuenta para interes, objeciones y alertas.',
    '- importe_eur: número solo si el reporte da una cifra en euros. Un porcentaje de descuento va en la descripción, no en importe_eur.',
    '- productos: los que se nombran, en minúscula y singular genérico (p. ej. "tomate rama", "pera"). Máximo 10.',
    // v1.3.0: la app solo ofrece Sí / No
    '- dudas: hasta 3 preguntas cortas para que el comercial confirme lo que no queda claro o lo que pudo transcribirse mal. Si todo está claro, lista vacía.',
    '- Cada duda se contesta SOLO con Sí o No. Nunca preguntes «qué», «cuánto», «cuándo», «cuál» ni «cómo». Si falta un dato, pregunta si lo que entendiste es correcto (p. ej. «¿Son 3 palés de naranja?») o no lo preguntes.',
    '- Si el reporte menciona un cliente distinto del de la visita, añádelo como duda.',
    // v1.2.0: próxima acción (lo que dice el comercial) y sugerencia de la IA, separadas
    '- proxima_accion: SOLO la que el comercial dice expresamente (lo que va a hacer, lo acordado con el cliente o lo que pide a otro departamento). Si no dice ninguna: descripcion "", fecha null y responsable "". No la deduzcas ni la completes.',
    '- sugerencia_ia: tu propuesta, aparte, de UNA acción concreta que se desprenda de los hechos del reporte (sobre todo si hay alertas o algo sin resolver). Máximo 20 palabras, sin fecha. Trata del cliente o de la cuenta, nunca de cómo lo ha hecho el comercial. No repitas proxima_accion y nunca pongas tu propuesta en proxima_accion. Si no aporta nada: descripcion "" y responsable "".',
    'Responde SOLO con JSON, sin texto alrededor ni bloques de código:',
    '{"resumen":"","resultado":"","interes":"","pedido":{"hay":false,"descripcion":"","importe_eur":null},"productos":[],"objeciones":[],"alertas":[],"proxima_accion":{"descripcion":"","fecha":null,"responsable":""},"sugerencia_ia":{"descripcion":"","responsable":""},"dudas":[]}'
  ].join('\n');
}

function _texto(v, max) {
  return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);
}

function _validarInforme(r) {
  const out = {};
  const invalidos = [];
  out.resumen = _texto(r.resumen, 900);   // v1.3.0: 600 → 900

  ['resultado', 'interes'].forEach((campo) => {
    const v = String(r[campo] || '').trim();
    out[campo] = TAXONOMIA_VISITA[campo].indexOf(v) >= 0 ? v : null;
    if (out[campo] === null) invalidos.push(campo);
  });

  MULTIPLES.forEach((campo) => {
    const lista = Array.isArray(r[campo]) ? r[campo] : [];
    out[campo] = lista
      .map((v) => String(v || '').trim())
      .filter((v, i, a) => TAXONOMIA_VISITA[campo].indexOf(v) >= 0 && a.indexOf(v) === i);
    if (lista.length !== out[campo].length) invalidos.push(campo);
  });

  const p = r.pedido && typeof r.pedido === 'object' ? r.pedido : {};
  const imp = Number(p.importe_eur);
  out.pedido = {
    hay: p.hay === true,
    descripcion: _texto(p.descripcion, 300),
    importe_eur: (p.importe_eur !== null && p.importe_eur !== '' && isFinite(imp) && imp >= 0) ? imp : null
  };

  out.productos = (Array.isArray(r.productos) ? r.productos : [])
    .map((v) => _texto(v, 40).toLowerCase())
    .filter((v, i, a) => v && a.indexOf(v) === i)
    .slice(0, 10);

  const pa = r.proxima_accion && typeof r.proxima_accion === 'object' ? r.proxima_accion : {};
  const fecha = String(pa.fecha || '').trim();
  const resp = String(pa.responsable || '').trim();
  out.proxima_accion = {
    descripcion: _texto(pa.descripcion, 300),
    fecha: /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : null,
    responsable: TAXONOMIA_VISITA.responsable.indexOf(resp) >= 0 ? resp : null
  };
  if (pa.fecha && !out.proxima_accion.fecha) invalidos.push('proxima_accion.fecha');
  if (resp && TAXONOMIA_VISITA.responsable.indexOf(resp) < 0) invalidos.push('proxima_accion.responsable');
  // v1.2.0: sin descripción no hay próxima acción (una fecha o un responsable sueltos serían inventados)
  if (!out.proxima_accion.descripcion) {
    out.proxima_accion.fecha = null;
    out.proxima_accion.responsable = null;
  }

  // v1.2.0 — sugerencia de la IA, aparte de lo que dijo el comercial (sin fecha)
  const sg = r.sugerencia_ia && typeof r.sugerencia_ia === 'object' ? r.sugerencia_ia : {};
  const respSg = String(sg.responsable || '').trim();
  out.sugerencia_ia = {
    descripcion: _texto(sg.descripcion, 200),
    responsable: TAXONOMIA_VISITA.responsable.indexOf(respSg) >= 0 ? respSg : null
  };
  if (respSg && TAXONOMIA_VISITA.responsable.indexOf(respSg) < 0) invalidos.push('sugerencia_ia.responsable');
  // Si repite la próxima acción del comercial, no es una sugerencia: se descarta.
  if (out.sugerencia_ia.descripcion && out.proxima_accion.descripcion &&
      out.sugerencia_ia.descripcion.toLowerCase() === out.proxima_accion.descripcion.toLowerCase()) {
    out.sugerencia_ia.descripcion = '';
    invalidos.push('sugerencia_ia.repetida');
  }
  if (!out.sugerencia_ia.descripcion) out.sugerencia_ia.responsable = null;

  out.dudas = (Array.isArray(r.dudas) ? r.dudas : [])
    .map((v) => _texto(v, 160))
    .filter(Boolean)
    .slice(0, 3);

  out.camposInvalidos = invalidos;
  return out;
}

/**
 * Función PURA. La llama http-functions.js v1.0.4.
 * @param {{ texto: string, cliente: { nombre?: string, tipo?: string, zona?: string } }} params
 * @returns {{ ok: boolean, informe?: object, modelo?: string, timeMs?: number,
 *             tokens?: { entrada: number, salida: number }, error?: string }}
 */
export async function informePruebaCore({ texto, cliente }) {
  const t = String(texto || '').trim();
  const c = cliente && typeof cliente === 'object' ? cliente : {};
  console.log(`[${V}] informe IN chars=${t.length} cliente=${_texto(c.nombre, 80) || '?'}`);

  try {
    if (!t) return { ok: false, error: 'Falta el texto del reporte.' };
    if (t.length > MAX_TEXTO) {
      return { ok: false, error: `Reporte demasiado largo (${t.length} caracteres; máximo ${MAX_TEXTO}).` };
    }

    let apiKey;
    try { apiKey = await getSecret(SECRET_ANTHROPIC); }
    catch (e) { return { ok: false, error: `Configuración incompleta: falta el secret ${SECRET_ANTHROPIC}.` }; }

    const hoy = _hoyMadrid();
    const user = [
      'CLIENTE DE LA VISITA:',
      `- Nombre comercial del negocio (no es una persona): ${_texto(c.nombre, 120) || 'sin indicar'}`,   // v1.3.1
      c.tipo ? `- Tipo: ${_texto(c.tipo, 60)}` : null,
      c.zona ? `- Zona: ${_texto(c.zona, 60)}` : null,
      '',
      'TRANSCRIPCIÓN DEL REPORTE:',
      t
    ].filter((l) => l !== null).join('\n');

    const t0 = Date.now();
    const res = await _llamarModelo(apiKey, MODELO_INFORME, _systemInforme(hoy), user, MAX_TOKENS_INFORME);
    const timeMs = Date.now() - t0;

    let r;
    try {
      r = JSON.parse(res.texto.replace(/```json|```/g, '').trim());
    } catch (e) {
      console.error(`[${V}] informe: respuesta no JSON: ${res.texto.slice(0, 200)}`);
      return { ok: false, error: 'La IA no devolvió un informe válido.', timeMs, reintentable: true };   // v1.2.0
    }

    const informe = _validarInforme(r);
    console.log(`[${V}] informe OUT ${timeMs}ms modelo=${MODELO_INFORME} in=${res.entrada} out=${res.salida} invalidos=${informe.camposInvalidos.join(',') || '0'}`);

    return {
      ok: true,
      informe,
      modelo: MODELO_INFORME,
      timeMs,
      tokens: { entrada: res.entrada, salida: res.salida }
    };

  } catch (err) {
    console.error(`[${V}] informe EXCEPTION:`, err.message || err);
    return { ok: false, error: 'Error técnico: ' + (err.message || 'desconocido'), reintentable: true };   // v1.2.0
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TICKET DE GASTO (v1.4.0) — foto del ticket → la IA la lee → Media Manager
// ═══════════════════════════════════════════════════════════════════════════

const MAX_TICKET_B64    = 4 * 1024 * 1024;   // ~3 MB de imagen (la app la reduce antes)
const MIME_TICKET       = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_TOKENS_TICKET = 300;
const CATEGORIAS_TICKET = ['combustible', 'parking', 'peaje', 'comida', 'alojamiento', 'otro'];
const CARPETA_TICKETS   = '/centri-sales/tickets';

function _systemTicket(hoy) {
  return [
    'Lees fotos de tickets y facturas simplificadas de los gastos de los comerciales de Centrimerca (combustible, parking, peajes, comidas, alojamiento).',
    `Hoy es ${hoy.dia} (Europe/Madrid).`,
    'Responde SOLO con JSON, sin texto alrededor ni bloques de código:',
    '{"legible":true,"categoria":"","total_eur":null,"fecha":null,"comercio":""}',
    '- legible: false si la foto no es un ticket o si no se lee el importe TOTAL con seguridad. En ese caso deja el resto vacío o null.',
    `- categoria: una de ${CATEGORIAS_TICKET.join(', ')}.`,
    '- total_eur: el importe TOTAL pagado, número con punto decimal (p. ej. 62.4). No lo inventes ni lo calcules: si no se lee, legible false.',
    '- fecha: la del ticket en AAAA-MM-DD. Si no se lee, null.',
    '- comercio: el nombre del establecimiento tal como aparece, máximo 60 caracteres. Si no se lee, "".'
  ].join('\n');
}

export async function ticketCore({ imagen, mime }) {
  const b64 = String(imagen || '');
  const tipo = String(mime || '').toLowerCase();
  console.log(`[${V}] ticket IN b64=${b64.length} mime=${tipo}`);

  try {
    if (!b64) return { ok: false, error: 'Falta la foto del ticket.' };
    if (b64.length > MAX_TICKET_B64) return { ok: false, error: 'La foto es demasiado grande.' };
    if (MIME_TICKET.indexOf(tipo) < 0) return { ok: false, error: 'Formato de foto no admitido.' };

    let apiKey;
    try { apiKey = await getSecret(SECRET_ANTHROPIC); }
    catch (e) { return { ok: false, error: `Configuración incompleta: falta el secret ${SECRET_ANTHROPIC}.` }; }

    const user = [
      { type: 'image', source: { type: 'base64', media_type: tipo, data: b64 } },
      { type: 'text', text: 'Lee este ticket.' }
    ];

    const t0 = Date.now();
    const res = await _llamarModelo(apiKey, MODELO_INFORME, _systemTicket(_hoyMadrid()), user, MAX_TOKENS_TICKET);
    const timeMs = Date.now() - t0;

    let r;
    try {
      r = JSON.parse(res.texto.replace(/```json|```/g, '').trim());
    } catch (e) {
      console.error(`[${V}] ticket: respuesta no JSON: ${res.texto.slice(0, 200)}`);
      return { ok: false, error: 'La IA no devolvió una lectura válida.', timeMs, reintentable: true };
    }

    // «18,5» → 18.5 (coma decimal sin punto de millares)
    const bruto = String(r && r.total_eur != null ? r.total_eur : '');
    const total = Number(/^\d+,\d{1,2}$/.test(bruto) ? bruto.replace(',', '.') : bruto);
    const legible = !!(r && r.legible === true && isFinite(total) && total > 0 && total < 100000);
    console.log(`[${V}] ticket OUT ${timeMs}ms legible=${legible} in=${res.entrada} out=${res.salida}`);
    if (!legible) return { ok: true, ticket: { legible: false }, timeMs };

    const categoria = CATEGORIAS_TICKET.indexOf(r.categoria) >= 0 ? r.categoria : 'otro';
    const fecha = /^\d{4}-\d{2}-\d{2}$/.test(String(r.fecha || '')) ? r.fecha : null;
    const comercio = _texto(r.comercio, 60);

    // La foto se guarda solo si se ha leído (patrón de la documentación de
    // mediaManager.upload). Un fallo aquí no pierde la lectura.
    let foto = '';
    try {
      const ext = tipo === 'image/png' ? 'png' : (tipo === 'image/webp' ? 'webp' : 'jpg');
      const subida = await mediaManager.upload(
        CARPETA_TICKETS,
        Buffer.from(b64, 'base64'),
        `ticket-${Date.now()}.${ext}`,
        {
          mediaOptions: { mimeType: tipo, mediaType: 'image' },
          metadataOptions: { isPrivate: false, isVisitorUpload: false }
        }
      );
      foto = (subida && subida.fileUrl) || '';
    } catch (e) {
      console.error(`[${V}] ticket: no se pudo guardar la foto:`, e.message || e);
    }

    return {
      ok: true,
      ticket: { legible: true, categoria, total_eur: Math.round(total * 100) / 100, fecha, comercio, foto },
      modelo: MODELO_INFORME,
      timeMs
    };

  } catch (err) {
    console.error(`[${V}] ticket EXCEPTION:`, err.message || err);
    return { ok: false, error: 'Error técnico: ' + (err.message || 'desconocido'), reintentable: true };
  }
}

// COPIA LITERAL de _llamarModelo() de cathoviaClima.js v1.3.0, con un único
// añadido marcado [LAB]: devuelve también los tokens de entrada y salida.
async function _llamarModelo(apiKey, modelo, system, user, maxTokens) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: modelo,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }]
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data && data.error ? data.error.message : `HTTP ${res.status}`);
  // [LAB] en CATHOVIA devuelve solo el texto
  const u = data.usage || {};
  return {
    texto: (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim(),
    entrada: u.input_tokens || 0,
    salida: u.output_tokens || 0
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// OAUTH2 — JWT RS256 con Service Account
// COPIA LITERAL de centriTTS.web.js v1.0.0 (copia literal de egaelTTS v1.3.0).
// Único cambio: TTS_SCOPE → STT_SCOPE (mismo valor).
// ═══════════════════════════════════════════════════════════════════════════

async function _getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (_tokenCache.token && _tokenCache.expiresAt > now + 300) return _tokenCache.token;

  let saJson;
  try { saJson = await getSecret('GOOGLE_SA_JSON'); }
  catch (e) { throw new Error('GOOGLE_SA_JSON no encontrado en Wix Secrets'); }

  let sa;
  try { sa = JSON.parse(saJson); }
  catch (e) { throw new Error('GOOGLE_SA_JSON no es JSON válido'); }

  if (!sa.client_email || !sa.private_key) {
    throw new Error('GOOGLE_SA_JSON no tiene client_email o private_key');
  }

  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss:   sa.client_email,
    scope: STT_SCOPE,
    aud:   TOKEN_ENDPOINT,
    iat:   now,
    exp:   now + 3600
  };

  const b64url = (obj) => Buffer.from(JSON.stringify(obj))
    .toString('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const headerEnc = b64url(header);
  const claimEnc  = b64url(claim);
  const signingInput = `${headerEnc}.${claimEnc}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingInput);
  const signature = signer.sign(sa.private_key)
    .toString('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const jwt = `${signingInput}.${signature}`;

  const params = new URLSearchParams();
  params.append('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
  params.append('assertion', jwt);

  const tokenRes = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    console.error(`[${V}] OAuth token exchange failed ${tokenRes.status}: ${errText.substring(0, 500)}`);
    throw new Error(`OAuth ${tokenRes.status}`);
  }

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error('Sin access_token en respuesta OAuth');

  _tokenCache = {
    token: tokenData.access_token,
    expiresAt: now + (tokenData.expires_in || 3600)
  };
  console.log(`[${V}] access_token nuevo, expira en ${tokenData.expires_in || 3600}s`);

  return _tokenCache.token;
}
