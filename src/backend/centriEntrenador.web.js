/* ═══════════════════════════════════════════════════════════════════════════
 * CENTRIMERCA — CENTRI · Entrenador (backend)
 * Archivo:  backend/centriEntrenador.web.js
 * VERSION:  1.0.0
 * FECHA:    25 Agosto 2026
 *
 * ───────────────────────────────────────────────────────────────────────────
 * PROCEDENCIA
 * ───────────────────────────────────────────────────────────────────────────
 * Port de akiraEntrenador.web.js v1.2.0 (patrón EGAEL).
 *
 * ───────────────────────────────────────────────────────────────────────────
 * QUÉ ES
 * ───────────────────────────────────────────────────────────────────────────
 * La superficie de gobierno del conocimiento. Centrimerca edita QUÉ dice
 * CENTRI —identidad, tono, reglas, corpus— sin tocar una línea de código y
 * sin bajar al CMS a mano.
 *
 * El criterio de aceptación del patrón es exactamente ese: si para configurar
 * algo hay que abrir la base de datos, el patrón está roto.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ⚠️ SEGURIDAD — LA DIFERENCIA GRANDE CON AKIRA. LEER ANTES DE DESPLEGAR.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * AKIRA protege el Entrenador con Permissions.SiteMember, y allí basta:
 * todos los miembros del sitio son personal del salón.
 *
 * AQUÍ NO BASTA, Y ES UN AGUJERO REAL.
 *
 * Los miembros de Centrimerca son clientes B2B y visitantes registrados. Con
 * SiteMember a secas, CUALQUIERA de ellos puede llamar a guardarAlignment o a
 * eliminarDocumento y reescribir lo que dice CENTRI. Los permisos de PÁGINA
 * no protegen un webMethod: la página se protege sola, el método no.
 *
 * Por eso todos los métodos de este archivo pasan por _exigirAdmin().
 *
 * ⚠️ REQUIERE UNA COLECCIÓN MÁS: CentriAdmins, con los ID de campo
 *    `email`(texto), `memberId`(texto) y `activo`(booleano). Una fila por
 *    persona autorizada.
 *
 *    Basta con rellenar `email` — el correo con el que esa persona entra en
 *    el sitio. `memberId` es opcional y solo para quien prefiera la llave
 *    inmutable de Wix; no hace falta ir al dashboard a buscar ningún ID.
 *
 * ⚠️ FALLA CERRADO A PROPÓSITO: si la colección no existe o está vacía, NADIE
 *    entra, ni siquiera tú. Es incómodo el primer día y es la dirección
 *    correcta del fallo. Un control de acceso que al fallar deja pasar no es
 *    un control de acceso.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * QUÉ CAMBIA RESPECTO A AKIRA v1.2.0
 * ───────────────────────────────────────────────────────────────────────────
 *
 *   1. _exigirAdmin() en todos los métodos. Ver arriba.
 *
 *   2. CUATRO PLANOS. Un alignment por plano, un corpus por plano.
 *
 *   3. VERSIONADO POR PLANO. AKIRA calcula la versión nueva con el máximo
 *      GLOBAL de la colección: publicar Producto le pone la versión que le
 *      tocaba a Mercado, y los números dejan de significar nada dentro de
 *      cada plano. Aquí el máximo se calcula solo entre las filas del plano.
 *
 *   4. COMPARACIÓN NUMÉRICA DE VERSIÓN. AKIRA hace .descending('version')
 *      sobre un campo de TEXTO, así que ordena alfabéticamente: "10.0" queda
 *      por debajo de "9.0" y a partir de la décima publicación la versión
 *      empieza a retroceder. Aquí se leen las filas del plano y se compara
 *      con parseFloat.
 *
 *   5. actualizarDocumento() y leerDocumento() — NUEVOS. AKIRA solo sabe
 *      crear, activar/desactivar y eliminar: corregir una errata en un
 *      documento obliga a borrarlo y rehacerlo, o a bajar al CMS. Eso rompe
 *      el criterio de aceptación del propio patrón. Centrimerca va a mantener
 *      este corpus, no solo a cargarlo una vez.
 *
 *   6. SIN CACHÉ. El entrenador de AKIRA invalida cachés porque su backend
 *      cachea alignment y documentos. centriLogic los lee frescos en cada
 *      pregunta, así que aquí no hay nada que invalidar y lo publicado surte
 *      efecto en la siguiente pregunta. Menos piezas, menos desincronización.
 *
 *   7. META_PROMPT POR PLANO. El de AKIRA describe un salón de peluquería y
 *      pide un asistente de gestión interna. Aquí hay cuatro planos con
 *      naturalezas distintas y cada uno necesita su molde.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { webMethod, Permissions } from 'wix-web-module';
import { fetch } from 'wix-fetch';
import wixData from 'wix-data';
import { getSecret } from 'wix-secrets-backend';
import { currentMember } from 'wix-members-backend';

const VERSION = '1.0.0';
const TAG = `[CentriEntrenador][${VERSION}]`;
const AUTH = { suppressAuth: true };

const C_ALIGNMENT = 'CentriAlignment';
const C_DOCUMENTS = 'CentriDocuments';
const C_ADMINS    = 'CentriAdmins';

const SECRET_API = 'CENTRIMERCA';
const MODEL = 'claude-sonnet-4-6';

const PLANOS_VALIDOS = ['mercado', 'producto', 'trabajar', 'dudas'];
const PLANO_DEFECTO  = 'dudas';   // idéntico al de centriLogic. No desincronizar.

function _normPlano(v) {
  const s = (v === null || v === undefined) ? '' : String(v).trim().toLowerCase();
  return s || PLANO_DEFECTO;
}

function _planoPedido(v) {
  const p = _normPlano(v);
  return PLANOS_VALIDOS.indexOf(p) >= 0 ? p : PLANO_DEFECTO;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTROL DE ACCESO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Comprueba que quien llama está en CentriAdmins y activo.
 *
 * ⚠️ FALLA CERRADO. Sin sesión, sin colección, sin fila o con error de
 * lectura → NO autorizado. Nunca "por si acaso, déjale pasar".
 *
 * Devuelve { ok:true, memberId } o { ok:false, error }.
 */
/**
 * Comprueba que quien llama está autorizado y activo en CentriAdmins.
 *
 * AUTORIZA POR EMAIL DE ACCESO, que es el dato que la persona ya conoce.
 * `memberId` sigue aceptándose como llave alternativa para quien prefiera el
 * identificador inmutable, pero NO hace falta rellenarlo: basta con una de
 * las dos columnas.
 *
 * El email se normaliza (recortado y en minúsculas) en los dos lados de la
 * comparación, así que da igual cómo se teclee en el CMS.
 *
 * ⚠️ FALLA CERRADO. Sin sesión, sin colección, sin fila o con error de
 * lectura → NO autorizado. Nunca "por si acaso, déjale pasar".
 */
async function _exigirAdmin() {
  let memberId = '';
  let email = '';

  try {
    // ⚠️ getMember() SIN opciones devuelve un objeto REDUCIDO que NO trae
    // loginEmail: el campo llega vacío y la comprobación por correo falla
    // siempre, con la fila bien puesta en el CMS. Hay que pedir el fieldset
    // completo. Verificado en producción: email='' y memberId sí resuelto.
    let member = null;
    try {
      member = await currentMember.getMember({ fieldsets: ['FULL'] });
    } catch (eFull) {
      // Si el fieldset completo no está disponible, se sigue con el reducido:
      // se pierde el correo pero el memberId permite autorizar igualmente.
      console.warn(`${TAG} fieldset FULL no disponible, se usa el reducido:`, eFull.message);
      member = await currentMember.getMember();
    }

    memberId = (member && member._id) || '';

    // El correo puede venir en loginEmail o dentro de contactDetails según el
    // fieldset que haya respondido. Se prueban ambos.
    let bruto = (member && member.loginEmail) || '';
    if (!bruto && member && member.contactDetails) {
      const cd = member.contactDetails;
      if (Array.isArray(cd.emails) && cd.emails.length > 0) {
        bruto = typeof cd.emails[0] === 'string' ? cd.emails[0] : (cd.emails[0].email || '');
      }
    }
    email = String(bruto || '').trim().toLowerCase();

  } catch (e) {
    console.warn(`${TAG} sin sesión de miembro:`, e.message);
    return { ok: false, error: 'Necesitas iniciar sesión.' };
  }

  if (!memberId && !email) {
    return { ok: false, error: 'Necesitas iniciar sesión.' };
  }

  try {
    // Se leen las filas activas y se comparan en memoria, NO con un .eq() por
    // email. Motivo: el CMS puede guardar el correo con mayúsculas o con
    // espacios sueltos, y un .eq() literal no casaría — el resultado sería un
    // "no tienes acceso" sin explicación, con la fila delante y bien puesta.
    const res = await wixData.query(C_ADMINS)
      .eq('activo', true)
      .limit(200)
      .find(AUTH);

    const filas = res.items || [];

    const autorizado = filas.some(f => {
      const fEmail = String(f.email || '').trim().toLowerCase();
      const fId    = String(f.memberId || '').trim();
      if (email && fEmail && fEmail === email) return true;
      if (memberId && fId && fId === memberId) return true;
      return false;
    });

    if (!autorizado) {
      console.warn(`${TAG} acceso DENEGADO al entrenador: email=${email || '—'} memberId=${memberId || '—'} (${filas.length} filas activas en ${C_ADMINS})`);
      return { ok: false, error: 'No tienes acceso al entrenador de CENTRI.' };
    }

    return { ok: true, memberId, email };

  } catch (e) {
    // Colección inexistente o ilegible. Se deniega: ver aviso de cabecera.
    console.error(`${TAG} no se pudo comprobar ${C_ADMINS} — se deniega el acceso:`, e.message);
    return { ok: false, error: 'No se pudo verificar el acceso.' };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// LLAMADA AL MODELO (solo para probar y para generar prompts)
// ═══════════════════════════════════════════════════════════════════════════

async function _callModelo(systemPrompt, userMessage, maxTokens) {
  const apiKey = await getSecret(SECRET_API);
  if (!apiKey) throw new Error(`Falta el secret ${SECRET_API}.`);

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens || 800,
      system: systemPrompt,
      messages: [{ role: 'user', content: String(userMessage) }]
    })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data && data.error ? data.error.message : `HTTP ${res.status}`);

  return (data.content || [])
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('\n')
    .trim();
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. CARGAR — alignment del plano + corpus
// ═══════════════════════════════════════════════════════════════════════════

export const cargarConfigEntrenador = webMethod(
  Permissions.SiteMember,
  async ({ modo } = {}) => {
    const admin = await _exigirAdmin();
    if (!admin.ok) return { ok: false, error: admin.error };

    try {
      const plano = _planoPedido(modo);
      console.log(`${TAG} cargarConfigEntrenador plano=${plano}`);

      // ⚠️ El filtro por plano se hace EN MEMORIA, no en la query. Un
      // .eq('modo', plano) deja fuera las filas con el campo vacío, que por la
      // regla "vacío = plano por defecto" son precisamente las de ese plano.
      const [borradorRes, publicadasRes, docsRes] = await Promise.all([
        wixData.query(C_ALIGNMENT).eq('status', 'borrador').limit(50).find(AUTH),
        wixData.query(C_ALIGNMENT).eq('status', 'publicado').descending('publicationDate').limit(50).find(AUTH),
        wixData.query(C_DOCUMENTS).ascending('orden').limit(300).find(AUTH)
      ]);

      const borrador  = (borradorRes.items || []).find(a => _normPlano(a.modo) === plano) || null;
      const publicada = (publicadasRes.items || []).find(a => _normPlano(a.modo) === plano) || null;

      // Todos los documentos, activos e inactivos, con su plano y su tamaño.
      // ⚠️ NO se devuelve `contenido`: con un corpus grande, mandar el texto
      // completo de 300 documentos a la UI en cada carga es tirar contexto y
      // ancho de banda. Para editar uno se pide con leerDocumento().
      const documentos = (docsRes.items || []).map(d => ({
        id: d._id,
        titulo: d.titulo || '',
        tipo: d.tipo || '',
        resumen: d.resumen || '',
        modo: _normPlano(d.modo),
        activo: d.activo === true,
        orden: Number(d.orden) || 0,
        chars: (d.contenido || '').length
      }));

      // Presupuesto consumido POR PLANO. Es el número que evita el fallo
      // silencioso: un corpus que excede su tope se trunca y nadie se entera
      // hasta que las respuestas empiezan a salir raras.
      const consumo = {};
      for (const p of PLANOS_VALIDOS) {
        const delPlano = documentos.filter(d => d.modo === p && d.activo);
        consumo[p] = {
          documentos: delPlano.length,
          chars: delPlano.reduce((n, d) => n + d.chars, 0)
        };
      }

      return {
        ok: true,
        plano,
        planos: PLANOS_VALIDOS,
        borrador,
        publicada,
        documentos,
        consumo,
        documentosActivos: documentos.filter(d => d.activo).length
      };

    } catch (e) {
      console.error(`${TAG} cargarConfigEntrenador error:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// 2. GUARDAR BORRADOR
// ═══════════════════════════════════════════════════════════════════════════

export const guardarAlignment = webMethod(
  Permissions.SiteMember,
  async ({ config }) => {
    const admin = await _exigirAdmin();
    if (!admin.ok) return { ok: false, error: admin.error };

    try {
      if (!config) return { ok: false, error: 'config requerido' };
      const plano = _planoPedido(config.modo);
      console.log(`${TAG} guardarAlignment plano=${plano}`);

      // El borrador es POR PLANO: guardar el de Producto no puede pisar el de
      // Mercado.
      const existRes = await wixData.query(C_ALIGNMENT)
        .eq('status', 'borrador')
        .limit(50)
        .find(AUTH);
      const existente = (existRes.items || []).find(a => _normPlano(a.modo) === plano) || null;

      const registro = {
        modo: plano,
        // IDENTIDAD y COMPORTAMIENTO no se mezclan nunca. promptBase responde
        // "quién es"; extraInstructions responde "cómo actúa". Cuando la salida
        // derive, sabrás cuál mirar. Y datos masivos NO van a ninguno de los
        // dos: van al corpus.
        promptBase: config.promptBase || '',
        extraInstructions: config.extraInstructions || '',
        tone: config.tone || 'directo',
        detailLevel: config.detailLevel || 'medio',
        grOnlyQuery:  config.grOnlyQuery  !== false,
        grNoInvent:   config.grNoInvent   !== false,
        grNoMarkdown: config.grNoMarkdown !== false,
        grConcision:  config.grConcision  === true,
        welcomeTitle: config.welcomeTitle || '',
        welcomeText:  config.welcomeText  || '',
        placeholder:  config.placeholder  || '',
        version: config.version || '1.0',
        status: 'borrador'
      };

      let saved;
      if (existente) {
        // ⚠️ El update REEMPLAZA el documento entero. `registro` lleva todos
        // los campos a propósito: un update parcial borraría los que faltasen.
        registro._id = existente._id;
        saved = await wixData.update(C_ALIGNMENT, registro, AUTH);
      } else {
        saved = await wixData.insert(C_ALIGNMENT, registro, AUTH);
      }

      return { ok: true, alignmentId: saved._id, version: registro.version, plano };

    } catch (e) {
      console.error(`${TAG} guardarAlignment error:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// 3. PUBLICAR
// ═══════════════════════════════════════════════════════════════════════════

export const publicarAlignment = webMethod(
  Permissions.SiteMember,
  async ({ alignmentId }) => {
    const admin = await _exigirAdmin();
    if (!admin.ok) return { ok: false, error: admin.error };

    try {
      if (!alignmentId) return { ok: false, error: 'alignmentId requerido' };

      const item = await wixData.get(C_ALIGNMENT, alignmentId, AUTH);
      if (!item) return { ok: false, error: 'Configuración no encontrada.' };

      const plano = _planoPedido(item.modo);
      console.log(`${TAG} publicarAlignment plano=${plano} id=${alignmentId}`);

      const publicadas = await wixData.query(C_ALIGNMENT)
        .eq('status', 'publicado')
        .limit(100)
        .find(AUTH);

      const delPlano = (publicadas.items || []).filter(a => _normPlano(a.modo) === plano);

      // ⚠️ ARCHIVAR SOLO LAS DEL MISMO PLANO.
      // La primera versión de AKIRA archivaba TODAS las publicadas: publicar
      // un plano dejaba a los otros SIN IDENTIDAD PUBLICADA, en silencio,
      // cayendo a la de por defecto. Nadie se entera hasta que alguien nota
      // que ese plano responde raro.
      for (const ant of delPlano) {
        if (ant._id === alignmentId) continue;
        ant.status = 'archivado';
        await wixData.update(C_ALIGNMENT, ant, AUTH);
      }

      // ⚠️ Versión máxima DEL PLANO y comparada COMO NÚMERO.
      // AKIRA usa .descending('version') sobre un campo de texto y el máximo
      // global de la colección: ordena "10.0" por debajo de "9.0" y mezcla la
      // numeración de todos los planos.
      const todasDelPlano = await wixData.query(C_ALIGNMENT).limit(200).find(AUTH);
      let maxVersion = 1.0;
      for (const a of (todasDelPlano.items || [])) {
        if (_normPlano(a.modo) !== plano) continue;
        const v = parseFloat(a.version);
        if (!isNaN(v) && v > maxVersion) maxVersion = v;
      }

      item.status = 'publicado';
      item.modo = plano;
      item.publicationDate = new Date();
      item.version = (Math.round((maxVersion + 0.1) * 10) / 10).toFixed(1);

      await wixData.update(C_ALIGNMENT, item, AUTH);

      console.log(`${TAG} publicado plano=${plano} v${item.version}`);
      return {
        ok: true,
        version: item.version,
        plano,
        fechaPublicacion: item.publicationDate,
        archivadas: delPlano.filter(a => a._id !== alignmentId).length
      };

    } catch (e) {
      console.error(`${TAG} publicarAlignment error:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// 4. PROBAR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Prueba una respuesta con la configuración que se está editando, SIN
 * publicarla. Es el ciclo corto de crítica: v1 → crítica → v2 → v3, que en la
 * práctica converge en tres o cuatro vueltas.
 *
 * ⚠️ Esta prueba NO reconstruye el prompt real de centriLogic: monta uno
 * equivalente con la identidad, las reglas y el corpus del plano. Sirve para
 * calibrar tono, criterio y guardrails. Para verificar el comportamiento
 * exacto en producción, la consola.
 */
export const testCentri = webMethod(
  Permissions.SiteMember,
  async ({ message, configOverride, modo }) => {
    const admin = await _exigirAdmin();
    if (!admin.ok) return { ok: false, error: admin.error };

    const startMs = Date.now();
    try {
      if (!message) return { ok: false, error: 'message requerido' };
      const plano = _planoPedido(modo || (configOverride && configOverride.modo));

      let config = configOverride;
      if (!config) {
        const pub = await wixData.query(C_ALIGNMENT)
          .eq('status', 'publicado')
          .descending('publicationDate')
          .limit(50)
          .find(AUTH);
        config = (pub.items || []).find(a => _normPlano(a.modo) === plano) || null;
      }
      if (!config) return { ok: false, error: 'No hay configuración para este plano. Guarda una primero.' };

      const docsRes = await wixData.query(C_DOCUMENTS)
        .eq('activo', true)
        .ascending('orden')
        .limit(300)
        .find(AUTH);
      const documentos = (docsRes.items || []).filter(d => _normPlano(d.modo) === plano);

      const bloques = [];
      if (config.promptBase) bloques.push(String(config.promptBase).trim());
      bloques.push(`PLANO ACTIVO: ${plano.toUpperCase()}.`);

      const gr = [];
      if (config.grNoInvent)   gr.push('El conocimiento de referencia es la ÚNICA verdad. Si no está, di que no lo tienes.');
      if (config.grNoMarkdown) gr.push('Responde en texto plano: sin markdown, sin viñetas, sin emojis.');
      if (config.grConcision)  gr.push('No describas tu razonamiento. Da la respuesta directa.');
      if (config.grOnlyQuery)  gr.push('Solo información. No ofrezcas tramitar, reservar ni registrar nada.');
      if (gr.length) bloques.push('--- GUARDRAILS ---\n' + gr.join('\n'));

      if (config.extraInstructions && String(config.extraInstructions).trim()) {
        bloques.push('--- INSTRUCCIONES DE CENTRIMERCA ---\n' + String(config.extraInstructions).trim());
      }

      let chars = 0;
      if (documentos.length) {
        const corpus = ['--- CONOCIMIENTO DE REFERENCIA ---'];
        for (const d of documentos) {
          corpus.push(`[${d.tipo || 'documento'}] ${d.titulo || 'Documento'}\n${d.contenido || ''}`);
          chars += (d.contenido || '').length;
        }
        bloques.push(corpus.join('\n\n'));
      }

      const systemPrompt = bloques.join('\n\n');
      const respuesta = await _callModelo(systemPrompt, message, 800);

      const guardrails = [];
      if (config.grOnlyQuery)  guardrails.push('Solo consulta');
      if (config.grNoInvent)   guardrails.push('No inventar');
      if (config.grNoMarkdown) guardrails.push('Sin markdown');
      if (config.grConcision)  guardrails.push('Anti-verborrea');

      return {
        ok: true,
        plano,
        response: respuesta,
        systemPromptLength: systemPrompt.length,
        corpusChars: chars,
        documentsCount: documentos.length,
        config: {
          tone: config.tone,
          detailLevel: config.detailLevel,
          guardrails,
          version: config.version
        },
        timeMs: Date.now() - startMs
      };

    } catch (e) {
      console.error(`${TAG} testCentri error:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// 5. GENERAR IDENTIDAD CON IA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Molde por plano. El de AKIRA describe un salón de peluquería y pide un
 * asistente de gestión interna: aquí no sirve ni traducido.
 *
 * Los cuatro piden explícitamente una IDENTIDAD, no reglas: las reglas viven
 * en extraInstructions y los datos en el corpus. Un promptBase hinchado con
 * datos operativos es latencia, coste y riesgo de truncamiento — y en Cathovia
 * fue la causa de un 504 que costó encontrar.
 */
const META_BASE = `Eres un diseñador de prompts experto para asistentes de IA de empresa.

El usuario trabaja en Centrimerca, un mayorista de frutas y hortalizas con sede en Mercamadrid. Te va a describir una parte de su negocio. A partir de esa descripción, redacta el bloque de IDENTIDAD del asistente para el plano indicado.

REGLAS DURAS:
- Escribe SOLO la identidad: quién es el asistente, en qué plano trabaja, con qué voz habla y cuál es su propósito.
- NO incluyas reglas de comportamiento, prohibiciones ni formato de salida: eso vive en otro campo.
- NO incluyas datos concretos (precios, calibres, nombres de personas, teléfonos, variedades): eso vive en el corpus documental. Un dato metido aquí queda congelado y desactualizado.
- Segunda persona ("Eres…", "Tu propósito es…").
- Español, texto plano, entre 80 y 200 palabras.
- Responde SOLO con el texto de la identidad, sin explicaciones ni comillas.`;

const META_POR_PLANO = {
  mercado: `${META_BASE}

PLANO: MERCADO. El asistente aporta contexto sobre el mercado de frutas y hortalizas: temporadas, comportamiento de la oferta y la demanda, factores que mueven los precios. NO da cotizaciones ni precios del día.`,

  producto: `${META_BASE}

PLANO: PRODUCTO. El asistente informa sobre el catálogo: variedades, calibres, orígenes, formatos y calendario de temporada. Su rasgo definitorio es la exactitud: reproduce los datos del catálogo tal cual, sin aproximar.`,

  trabajar: `${META_BASE}

PLANO: TRABAJAR CON CENTRIMERCA. El asistente explica procedimientos, condiciones y a quién dirigirse. Punto crítico: quien pregunta puede ser un cliente de años o alguien que aún no lo es, y el asistente debe servir igual a los dos sin dar por supuesta ninguna relación previa.`,

  dudas: `${META_BASE}

PLANO: DUDAS. El asistente resuelve preguntas generales sobre Centrimerca apoyándose en las preguntas frecuentes de la empresa. Es el plano de entrada: tono acogedor y capacidad de derivar al plano adecuado cuando la pregunta encaja mejor en otro.`
};

export const generarPromptCentri = webMethod(
  Permissions.SiteMember,
  async ({ descripcion, modo }) => {
    const admin = await _exigirAdmin();
    if (!admin.ok) return { ok: false, error: admin.error };

    try {
      if (!descripcion || String(descripcion).trim().length < 20) {
        return { ok: false, error: 'Describe esta parte del negocio con al menos unas frases.' };
      }
      const plano = _planoPedido(modo);
      console.log(`${TAG} generarPromptCentri plano=${plano}`);

      const prompt = await _callModelo(META_POR_PLANO[plano] || META_POR_PLANO[PLANO_DEFECTO], descripcion, 900);
      if (!prompt) return { ok: false, error: 'No se pudo generar el texto.' };

      return { ok: true, prompt, plano };

    } catch (e) {
      console.error(`${TAG} generarPromptCentri error:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// 6. CORPUS
// ═══════════════════════════════════════════════════════════════════════════

export const crearDocumento = webMethod(
  Permissions.SiteMember,
  async ({ titulo, tipo, contenido, resumen, modo }) => {
    const admin = await _exigirAdmin();
    if (!admin.ok) return { ok: false, error: admin.error };

    try {
      if (!titulo)    return { ok: false, error: 'titulo requerido' };
      if (!contenido) return { ok: false, error: 'contenido requerido' };

      // ⚠️ El plano se EXIGE de forma explícita y se valida. Un documento con
      // el plano vacío se va al corpus por defecto y lo contamina: es
      // exactamente así como en AKIRA un manual entero acabó dentro del corpus
      // del consultor.
      const planoDoc = _planoPedido(modo);
      if (!modo) {
        console.warn(`${TAG} crearDocumento SIN plano: "${titulo}" → ${planoDoc}`);
      }

      const maxOrden = await wixData.query(C_DOCUMENTS)
        .descending('orden')
        .limit(1)
        .find(AUTH);
      const nextOrden = maxOrden.items.length > 0 ? (Number(maxOrden.items[0].orden) || 0) + 1 : 1;

      const doc = await wixData.insert(C_DOCUMENTS, {
        titulo: String(titulo),
        tipo: tipo || 'otro',
        contenido: String(contenido),
        resumen: resumen || String(titulo),
        modo: planoDoc,
        activo: true,
        orden: nextOrden
      }, AUTH);

      console.log(`${TAG} crearDocumento OK "${titulo}" plano=${planoDoc} chars=${String(contenido).length}`);

      return {
        ok: true,
        documento: {
          id: doc._id,
          titulo: doc.titulo,
          tipo: doc.tipo,
          resumen: doc.resumen,
          modo: doc.modo,
          activo: doc.activo,
          orden: doc.orden,
          chars: (doc.contenido || '').length
        }
      };

    } catch (e) {
      console.error(`${TAG} crearDocumento error:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

/**
 * Lee UN documento con su contenido, para editarlo.
 *
 * NUEVO respecto a AKIRA. cargarConfigEntrenador devuelve la lista sin
 * contenido a propósito; esto trae el texto solo del que se va a tocar.
 */
export const leerDocumento = webMethod(
  Permissions.SiteMember,
  async ({ documentoId }) => {
    const admin = await _exigirAdmin();
    if (!admin.ok) return { ok: false, error: admin.error };

    try {
      if (!documentoId) return { ok: false, error: 'documentoId requerido' };
      const d = await wixData.get(C_DOCUMENTS, documentoId, AUTH);
      if (!d) return { ok: false, error: 'Documento no encontrado.' };

      return {
        ok: true,
        documento: {
          id: d._id,
          titulo: d.titulo || '',
          tipo: d.tipo || '',
          contenido: d.contenido || '',
          resumen: d.resumen || '',
          modo: _normPlano(d.modo),
          activo: d.activo === true,
          orden: Number(d.orden) || 0
        }
      };
    } catch (e) {
      console.error(`${TAG} leerDocumento error:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

/**
 * Actualiza un documento del corpus.
 *
 * NUEVO respecto a AKIRA, que solo sabe crear, activar/desactivar y eliminar.
 * Sin esto, corregir una errata obliga a borrar y rehacer, o a bajar al CMS a
 * mano — que es justo lo que el patrón dice que no puede pasar.
 *
 * ⚠️ READ-MERGE-UPDATE: el update REEMPLAZA el documento entero. Se lee, se
 * fusiona solo lo que llega, y se escribe completo.
 */
export const actualizarDocumento = webMethod(
  Permissions.SiteMember,
  async ({ documentoId, titulo, tipo, contenido, resumen, modo, orden }) => {
    const admin = await _exigirAdmin();
    if (!admin.ok) return { ok: false, error: admin.error };

    try {
      if (!documentoId) return { ok: false, error: 'documentoId requerido' };

      const actual = await wixData.get(C_DOCUMENTS, documentoId, AUTH);
      if (!actual) return { ok: false, error: 'Documento no encontrado.' };

      const merged = { ...actual };
      if (titulo    !== undefined) merged.titulo    = String(titulo);
      if (tipo      !== undefined) merged.tipo      = String(tipo);
      if (contenido !== undefined) merged.contenido = String(contenido);
      if (resumen   !== undefined) merged.resumen   = String(resumen);
      if (modo      !== undefined) merged.modo      = _planoPedido(modo);
      if (orden     !== undefined) merged.orden     = Number(orden) || 0;

      await wixData.update(C_DOCUMENTS, merged, AUTH);

      console.log(`${TAG} actualizarDocumento OK ${documentoId} plano=${_normPlano(merged.modo)} chars=${(merged.contenido || '').length}`);

      return {
        ok: true,
        documento: {
          id: merged._id,
          titulo: merged.titulo || '',
          tipo: merged.tipo || '',
          resumen: merged.resumen || '',
          modo: _normPlano(merged.modo),
          activo: merged.activo === true,
          orden: Number(merged.orden) || 0,
          chars: (merged.contenido || '').length
        }
      };

    } catch (e) {
      console.error(`${TAG} actualizarDocumento error:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

export const toggleDocumento = webMethod(
  Permissions.SiteMember,
  async ({ documentoId, activo }) => {
    const admin = await _exigirAdmin();
    if (!admin.ok) return { ok: false, error: admin.error };

    try {
      if (!documentoId) return { ok: false, error: 'documentoId requerido' };
      const doc = await wixData.get(C_DOCUMENTS, documentoId, AUTH);
      if (!doc) return { ok: false, error: 'Documento no encontrado.' };

      const merged = { ...doc };
      merged.activo = activo === true;
      await wixData.update(C_DOCUMENTS, merged, AUTH);

      console.log(`${TAG} toggleDocumento ${documentoId} → activo=${merged.activo}`);
      return { ok: true, documentoId, activo: merged.activo };

    } catch (e) {
      console.error(`${TAG} toggleDocumento error:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

export const eliminarDocumento = webMethod(
  Permissions.SiteMember,
  async ({ documentoId }) => {
    const admin = await _exigirAdmin();
    if (!admin.ok) return { ok: false, error: admin.error };

    try {
      if (!documentoId) return { ok: false, error: 'documentoId requerido' };
      await wixData.remove(C_DOCUMENTS, documentoId, AUTH);
      console.log(`${TAG} eliminarDocumento ${documentoId}`);
      return { ok: true, documentoId };
    } catch (e) {
      console.error(`${TAG} eliminarDocumento error:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

/* ═══════════════════════════════════════════════════════════════════════════
 * MÉTODOS EXPUESTOS
 * ═══════════════════════════════════════════════════════════════════════════
 *   cargarConfigEntrenador({ modo })
 *   guardarAlignment({ config })
 *   publicarAlignment({ alignmentId })
 *   testCentri({ message, configOverride, modo })
 *   generarPromptCentri({ descripcion, modo })
 *   crearDocumento({ titulo, tipo, contenido, resumen, modo })
 *   leerDocumento({ documentoId })
 *   actualizarDocumento({ documentoId, ...campos })
 *   toggleDocumento({ documentoId, activo })
 *   eliminarDocumento({ documentoId })
 *
 * TODOS pasan por _exigirAdmin(). Sin fila activa en CentriAdmins, ninguno
 * responde.
 * ═══════════════════════════════════════════════════════════════════════════
 */