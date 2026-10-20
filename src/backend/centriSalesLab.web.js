/* ═══════════════════════════════════════════════════════════════════════════
 * CENTRIMERCA — CENTRI SALES · Banco de pruebas · Transcripción (Wix Velo)
 * Archivo:  backend/centriSalesLab.web.js
 * VERSION:  1.0.0
 * FECHA:    21 Octubre 2026
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
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { fetch } from 'wix-fetch';
import { getSecret } from 'wix-secrets-backend';
import crypto from 'crypto';

// El TAG se deriva de VERSION (patrón de centriTTS.web.js).
const VERSION = '1.0.0';
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
      return { ok: false, error: `El servicio de transcripción respondió ${r.status}.` };
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
    return { ok: false, error: 'Error técnico: ' + (err.message || 'desconocido') };
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
