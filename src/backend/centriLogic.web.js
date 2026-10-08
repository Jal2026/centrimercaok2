/* ═══════════════════════════════════════════════════════════════════════════
 * CENTRIMERCA — CENTRI · Backend
 * Archivo:  backend/centriLogic.web.js
 * VERSION:  1.0.6
 * FECHA:    08 Octubre 2026
 *
 * ───────────────────────────────────────────────────────────────────────────
 * PROCEDENCIA
 * ───────────────────────────────────────────────────────────────────────────
 * Port de akiraLogic.web.js v1.9.0 y cathoviaBackend.web.js v1.6.x.
 * Lo que se copia literal se marca como tal. Lo que cambia va enumerado.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * QUÉ ES ESTE BACKEND — Y QUÉ NO ES
 * ───────────────────────────────────────────────────────────────────────────
 *
 * CENTRI v1.0 es SOLO CORPUS. No hay motor de datos.
 * (v1.0.5: ya lo hay. Lee del CMS lo que se marque en el Entrenador, con una
 *  herramienta. Ver la nota v1.0.5.)
 *
 * AKIRA dedica ~1.500 líneas a un motor de consulta transaccional: dos
 * herramientas, ejes ortogonales, registro declarativo de fuentes, parseo de
 * ledger, agregaciones. Todo eso existe porque hay un CMS con reservas y
 * cobros detrás. CENTRI v1.0 NO tiene ERP integrado: ese motor no tendría a
 * qué apuntar. Portarlo sería copiar la maquinaria sin la máquina.
 *
 * Consecuencia práctica, y es buena: CENTRI es exactamente el perfil del
 * plano sin herramientas. Se cae con las herramientas todo su coste de
 * contexto —descripciones, reglas del motor, valores canónicos, tabla de
 * fechas completa— y queda un prompt corto y un corpus grande.
 *
 * ⛔ NO mandar `tools: []`. Es error de la API. El payload se construye como
 *    objeto y la clave `tools` sencillamente no se añade nunca en esta
 *    versión. Si algún día hay ERP, se añade aquí y el resto no se toca.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * MIEMBROS — MÉTODO CATHOVIA (decisión de Jal, 25-Ago-2026)
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Los dos proyectos padres resuelven esto de forma OPUESTA:
 *
 *   · AKIRA falla ABIERTO. Si no hay userId, o si el campo usuarioId no
 *     existe en el CMS, el listado degrada a "sin filtrar" y todo el mundo ve
 *     las conversaciones de todo el mundo. En un salón, con un equipo que se
 *     conoce, es un incordio. Aquí sería una fuga entre empresas distintas.
 *
 *   · CATHOVIA falla CERRADO: `if (!userId) return { chats: [] }`. Sin
 *     identidad no se enseña nada.
 *
 * Se adopta CATHOVIA. Tres piezas:
 *   1. Sin userId → lista vacía. Nunca "por si acaso, te enseño todo".
 *   2. El filtro por usuarioId va EN LA QUERY, no en memoria.
 *   3. Guardia de propiedad: nadie abre ni borra una sesión que no es suya.
 *
 * ⚠️ EXTENSIÓN SOBRE CATHOVIA: allí la guardia solo está en BORRAR.
 *    `cathoviaAbrirChat` acepta cualquier sessionId y devuelve la
 *    conversación entera sin comprobar de quién es. Con la página protegida
 *    por miembros y sessionIds no adivinables el riesgo es bajo, pero aquí
 *    los miembros son de empresas que compiten entre sí. La guardia se
 *    aplica también al ABRIR.
 *
 * ⚠️ CentriSessions.usuarioId TIENE QUE EXISTIR EN EL CMS. Escribir a un
 *    campo inexistente NO falla: la base de datos ignora la clave en
 *    silencio. Verificarlo contra el backend, no contra un CSV exportado.
 *    Con el método Cathovia, si el campo no existe la query no casa con nada
 *    y el usuario ve su historial vacío — molesto, pero seguro. Es la
 *    dirección correcta del fallo.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * PLANOS
 * ───────────────────────────────────────────────────────────────────────────
 * mercado · producto · trabajar · dudas
 *
 * El plano lo pide el usuario con los chips y llega por `modo`. El endpoint
 * es PÚBLICO: se valida contra la lista cerrada y cualquier otra cosa cae al
 * plano por defecto. Nunca se confía en lo que llega de fuera.
 *
 * El plano decide TRES cosas: qué alignment aplica, qué corpus se inyecta y
 * con qué instrucción se encabeza ese corpus.
 *
 * ⚠️ PLANO_DEFECTO = 'dudas', y NO coincide con el plano de arranque de la
 *    consola ('mercado'). Es deliberado. Con la regla "vacío = plano por
 *    defecto", todo documento al que se le olvide poner plano cae aquí. En
 *    AKIRA el defecto era el plano principal y por ahí se coló un manual de
 *    69.838 caracteres en el corpus del consultor, que además leía solo su
 *    primer 17 % — en silencio, durante meses. Que el defecto sea el plano
 *    menos crítico limita el daño de ese descuido.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ⚠️ CONTRADICCIÓN GUÍA / CÓDIGO SOBRE EL FAILOVER — DECISIÓN PENDIENTE
 * ───────────────────────────────────────────────────────────────────────────
 * La Guía Técnica de CATHOVIA §6 dice, literal, que nunca se degrade el
 * camino crítico a un modelo débil como medida de failover, porque "corrompe
 * justamente la experiencia que justifica el producto".
 *
 * El CÓDIGO de CATHOVIA hace exactamente eso: Sonnet primario, Haiku de
 * respaldo para respuestas al usuario. AKIRA igual.
 *
 * Aquí se implementa el failover porque es lo que hacen los dos proyectos en
 * producción, PERO:
 *   · Está aislado en FALLBACK_HABILITADO. Apagarlo es una línea.
 *   · Cuando cae al modelo de respaldo, SE LOGUEA. La objeción real de la
 *     guía es la degradación SILENCIOSA, no la degradación.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * v1.0.1 — 03 SEP 2026 · SE RETIRA POLÍTICA EDITORIAL DEL CÓDIGO
 * ───────────────────────────────────────────────────────────────────────────
 * Petición de Jal: el plano MERCADO debe poder dar una primera indicación con
 * conocimiento general del sector cuando el corpus no cubra la pregunta, y
 * debe ofrecer las fuentes de referencia que los documentos traen escritas.
 * CENTRI no es una biblioteca total: orienta y dice dónde ampliar.
 *
 * Se intentó resolver desde el entrenador y NO era posible. Tres literales
 * del código lo impedían, y ninguno se podía apagar desde el CMS:
 *
 *   1. REGLAS DE TRABAJO, rotuladas "INQUEBRANTABLES", enviadas a los cuatro
 *      planos: "tu única fuente es el conocimiento", "si no cubre, DILO, no
 *      deduzcas", "no menciones el conocimiento ni los documentos".
 *   2. El literal de la casilla grNoInvent: "el conocimiento de referencia es
 *      la ÚNICA verdad".
 *   3. INSTRUCCION_CORPUS.mercado: "no lo cites textualmente" — que además
 *      era el pendiente P-14, porque ese plano ya tiene tablas de calibres.
 *
 * ⚠️ ESTE CAMBIO NO AÑADE POLÍTICA AL CÓDIGO: LA QUITA. El bloque de reglas
 *    pasa de siete a cuatro. Las que se van no se pierden — ya estaban dichas
 *    en INSTRUCCION_CORPUS de cada plano o en una casilla del entrenador.
 *    Estaban escritas en tres capas a la vez, y esa duplicación era justo lo
 *    que impedía cambiarlas sin desplegar código.
 *
 * Regla de reparto que queda establecida:
 *   · CÓDIGO → lo que es un HECHO del sistema (no hay ERP detrás, la fecha
 *     viene dada, no se explica la mecánica interna). No es opinión, no se
 *     edita.
 *   · CMS    → lo que es CRITERIO (qué se cuenta, con qué límite, cuándo se
 *     cita una fuente, cuándo se remite). Se edita en el entrenador, sin
 *     desplegar. Patrón #1 de la Guía de referencia.
 *
 * Añadida una regla de precedencia explícita: donde las INSTRUCCIONES DE
 * CENTRIMERCA o la nota del conocimiento sean más concretas, mandan ellas.
 * Sin esa línea, un bloque autodeclarado inquebrantable gana siempre y el
 * entrenador queda decorativo.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * v1.0.2 — 03 SEP 2026 · MERCADO RESPONDE FUERA DEL CORPUS
 * ───────────────────────────────────────────────────────────────────────────
 * La v1.0.1 quitó el bloqueo global pero quedaban dos frenos. Verificado en
 * producción: preguntada por el régimen especial agrario del IVA —sector puro,
 * sin documento detrás— CENTRI respondió "queda fuera del contenido que
 * manejo" y remitió a la AEAT. Sabe la respuesta y no la da.
 *
 *   1. grNoInvent prohibía toda cifra no escrita. Criterio de Jal: inventar es
 *      ESPECULAR, no citar lo que se sabe con solidez. El literal separa ahora
 *      conocimiento consolidado (se da) de suposición sobre Centrimerca (nunca).
 *   2. INSTRUCCION_CORPUS.mercado abría con "este material es tu criterio de
 *      contexto", que el modelo leía como el perímetro de lo respondible. Se
 *      dice explícitamente que NO es el límite.
 *
 * ⚠️ SOLO MERCADO. Producto, trabajar y dudas siguen cerrados: sus propias
 *    instrucciones exigen literal y no se han tocado en ninguna de las dos
 *    versiones. La casilla "No inventar" sigue marcada en los cuatro planos —
 *    lo que cambia es qué prohíbe, no dónde se aplica.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * v1.0.3 — 03 SEP 2026 · REGRESIÓN INTRODUCIDA EN v1.0.1, CORREGIDA
 * ───────────────────────────────────────────────────────────────────────────
 * `_instruccionCorpus(plano)` se empujaba DENTRO de `if (documentos.length>0)`.
 * Un plano sin documentos activos no recibía instrucción de corpus alguna.
 *
 * En v1.0.0 no se notaba: las reglas globales rotuladas INQUEBRANTABLES lo
 * tapaban. Al retirarlas en v1.0.1 quedaron PRODUCTO y TRABAJAR —los dos
 * vacíos a la espera del catálogo y los procedimientos reales— sin ninguna
 * instrucción. Detectado en producción: PRODUCTO respondió una pregunta de
 * fiscalidad con conocimiento general, construyó una URL y la devolvió en
 * markdown. Su instrucción, que dice "es tu ÚNICA fuente" y prohíbe deducir,
 * nunca se le envió.
 *
 * La instrucción del plano pasa a enviarse SIEMPRE. Los documentos, solo si
 * existen. Si no hay ninguno, se avisa al modelo y se loguea — mismo criterio
 * que el truncado: lo que degrada, se dice.
 *
 * ⚠️ El aviso NO lleva política: remite a la nota del plano, que es la que
 *    decide. PRODUCTO cierra porque su instrucción lo cierra; MERCADO
 *    seguiría abierto porque la suya lo abre. Ni una regla más en el código.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * v1.0.4 — 03 SEP 2026 · LA SESIÓN RECUERDA SU PLANO
 * ───────────────────────────────────────────────────────────────────────────
 * ⛔ REQUIERE CAMPO NUEVO EN EL CMS ANTES DE DESPLEGAR:
 *      CentriSessions · field id `modo` · tipo Texto
 *    Escribir a un campo inexistente NO FALLA: wixData ignora la clave en
 *    silencio y la sesión se guardaría sin plano sin dar un solo error.
 *
 * Detectado por Jal: al reabrir una conversación del historial, el chip de
 * plano no se restituye. Viene de origen — `_crearSesion` escribía título,
 * estado y fechas, y nada más; `centriAbrirChat` devolvía solo mensajes. El
 * plano nunca se guardó. Heredado de AKIRA y CATHOVIA.
 *
 * No es cosmético. El historial viaja ENTERO al modelo en cada pregunta, así
 * que una conversación de mercado reabierta con el chip en producto mete
 * turnos de un plano dentro del prompt de otro, y deshace la separación que
 * el backend acaba de hacer. Es el mismo motivo por el que cambiar de plano
 * abre conversación nueva.
 *
 * ⚠️ DEGRADACIÓN PARA LAS SESIONES YA EXISTENTES: son anteriores al campo y
 *    no tienen plano. `centriAbrirChat` devuelve `modo: null` en ese caso, NO
 *    el plano por defecto. Forzar 'dudas' sobre una conversación de mercado
 *    sería peor que no tocar el chip. Con null, el front deja lo que haya.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * v1.0.5 — 08 OCT 2026 · DATOS Y ACCIONES DESDE EL ENTRENADOR
 * ───────────────────────────────────────────────────────────────────────────
 * Petición de Jal: CENTRI con acceso a los datos del CMS, CON SELECTOR, y que
 * ofrezca acciones ("¿quieres llamar a Raquel?", "¿descargas su tarjeta?",
 * "¿quieres conocer las variedades del kiwi?").
 *
 *   · SELECTOR: en el Entrenador, por plano. Se guarda en el alignment
 *     (campo `fuentes`) y vale cuando se PUBLICA, como el tono o las reglas.
 *     Qué colecciones, qué campos ve el modelo y qué campos son botón.
 *   · CONSULTA: herramienta consultar_datos, generada desde la selección del
 *     plano. Bucle de tool use como el de AKIRA (máx. 4 vueltas + cierre).
 *     Un plano sin selección funciona exactamente igual que en v1.0.4: una
 *     sola llamada y sin clave `tools`.
 *   · ACCIONES: el modelo escribe [[ACCION:aN]] con ids que le da la
 *     herramienta; este archivo los cambia por [[BTN:tipo|etiqueta|enlace]]
 *     con el dato real del CMS. El modelo nunca escribe un teléfono ni un
 *     enlace de botón. Preguntas sugeridas: [[PREGUNTA:texto]].
 *   · BLOQUEO FIJO: conversaciones, administradores, miembros, pedidos y
 *     formularios no se leen nunca, aunque se marquen a mano en el CMS.
 *
 * ⛔ REQUIERE el campo `fuentes` (Texto) en CentriAlignment y el Entrenador
 *    v1.0.1. Sin campo, el alignment no trae `fuentes` y CENTRI responde
 *    como en v1.0.4: degrada sin romper.
 *
 * Archivos del circuito: centriEntrenador.web.js v1.0.1 + widget del
 * Entrenador v1.0.1 (selector) · este (consulta y botones) · centriConsole.js
 * v1.0.2 (pinta los botones).
 *
 * ───────────────────────────────────────────────────────────────────────────
 * v1.0.6 — 08 OCT 2026 · RESPUESTAS RÁPIDAS, NO "PREGUNTAS DE SEGUIMIENTO"
 * ───────────────────────────────────────────────────────────────────────────
 * Detectado por Jal en la primera prueba: los chips ofrecían información que
 * CENTRI no tiene ("¿Qué formatos o calibres necesito?" sobre la banana, sin
 * variedades en el CMS). La causa era el literal de este archivo: invitaba a
 * "cerrar con preguntas de seguimiento". Ahora el marcador se describe como lo
 * que es —una respuesta rápida que se envía como mensaje del usuario— y se
 * prohíbe usarlo para ofrecer lo que no hay. CUÁNDO se usa (p. ej. «Sí» / «No»
 * al ofrecer un comercial) es criterio y está en el Entrenador.
 *
 *   · MAX_PREGUNTAS 3 → 6: una respuesta rápida por cada comercial del equipo.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { webMethod, Permissions } from 'wix-web-module';
import { fetch } from 'wix-fetch';
import wixData from 'wix-data';
import { getSecret } from 'wix-secrets-backend';

const VERSION = '1.0.6';
const TAG = `[CentriLogic][${VERSION}]`;
const AUTH = { suppressAuth: true };

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

const MODEL_PRIMARY  = 'claude-sonnet-4-6';
const MODEL_FALLBACK = 'claude-haiku-4-5';

const PRIMARY_TIMEOUT_MS  = 45000;
const FALLBACK_TIMEOUT_MS = 25000;

// Ver la nota de cabecera sobre la contradicción guía/código.
// false = si el primario falla, se responde con un error honesto.
const FALLBACK_HABILITADO = true;

const MAX_TOKENS    = 1200;
const HISTORY_LIMIT = 10;     // turnos (se leen HISTORY_LIMIT*2 filas)

// Presupuesto de corpus POR PLANO.
//
// ⚠️ Un tope único para todos los planos es una bomba de relojería: el plano
// cuyo corpus es más grande se queda con sus primeros documentos y el resto
// se descarta EN SILENCIO. Por eso hay tope por plano y por eso _buildSystem
// avisa por consola cuando va a truncar.
//
// ⚠️ ESTOS NÚMEROS SON PROVISIONALES. Están puestos a ojo porque el corpus
// real de Centrimerca aún no está completo. DIMENSIONARLOS CON DATOS REALES
// en cuanto lo esté: el techo de AKIRA se puso a ojo en 1.000 filas y devolvió
// totales erróneos con aplomo hasta que alguien midió.
const MAX_DOC_CHARS = 12000;
const DOC_CHARS_POR_PLANO = {
  mercado:  90000,   // dimensionado 25-ago con el corpus real: 50.839 activos
  producto: 90000,   // catálogo de Centrimerca. Pendiente de contenido real
  trabajar: 60000,
  dudas:    60000
};

function _docCharsDelPlano(plano) {
  return DOC_CHARS_POR_PLANO[plano] || MAX_DOC_CHARS;
}

// ── Colecciones ────────────────────────────────────────────────────────────
const C_ALIGNMENT = 'CentriAlignment';
const C_DOCUMENTS = 'CentriDocuments';
const C_SESSIONS  = 'CentriSessions';
const C_MESSAGES  = 'CentriMessages';
const C_LOG       = 'CentriLog';
const C_CONFIG    = 'CentriConfig';     // fila única

// Secret con la clave de la API. NO es el mismo que el de la voz.
const SECRET_API = 'CENTRIMERCA';

// ═══════════════════════════════════════════════════════════════════════════
// PLANOS
// ═══════════════════════════════════════════════════════════════════════════

const PLANOS_VALIDOS = ['mercado', 'producto', 'trabajar', 'dudas'];

// Ver la nota de cabecera: NO coincide con el plano de arranque de la consola.
const PLANO_DEFECTO = 'dudas';

function _normPlano(v) {
  const s = (v === null || v === undefined) ? '' : String(v).trim().toLowerCase();
  return s || PLANO_DEFECTO;   // vacío (documento o alignment) = plano por defecto
}

function _planoPedido(modo) {
  const p = _normPlano(modo);
  return PLANOS_VALIDOS.indexOf(p) >= 0 ? p : PLANO_DEFECTO;
}

/**
 * Instrucción que encabeza el bloque de conocimiento.
 *
 * ⚠️ SE INVIERTE SEGÚN LA NATURALEZA DEL CORPUS, y es un hallazgo que sale
 * caro descubrir tarde. Hay dos redacciones y son opuestas:
 *
 *   · Criterio, metodología, contexto  → "intégralo, no lo cites textualmente"
 *   · Datos literales, procedimientos  → "reprodúcelo EXACTO, no lo deduzcas"
 *
 * En AKIRA el encabezado estaba redactado para el primer caso y se enviaba en
 * todos los planos. Aplicado al manual pedía justo lo contrario de lo
 * correcto, y parafrasear un manual produce nombres de botón inventados.
 *
 * Aquí el reparto es:
 *   · MERCADO  → MIXTO (v1.0.1). La explicación se integra con naturalidad;
 *                el dato escrito y la fuente de referencia se reproducen
 *                exactos. La v1.0.0 decía "no lo cites textualmente" a secas,
 *                y ese plano acabó teniendo las tablas de calibres y los
 *                bloques de fuentes de los 16 documentos de sector: la
 *                instrucción pedía parafrasear justo lo que no se puede
 *                parafrasear. Era el pendiente P-14.
 *   · PRODUCTO → variedades, calibres y orígenes. Un calibre parafraseado es
 *                un calibre inventado. LITERAL.
 *   · TRABAJAR → procedimientos y contactos. LITERAL: un nombre o un paso mal
 *                copiado manda a alguien a la persona equivocada.
 *   · DUDAS    → FAQs redactadas por Centrimerca. Se respeta su redacción.
 */
const INSTRUCCION_CORPUS = {
  mercado: 'Este material es tu base sobre el mercado de frutas y hortalizas: temporadas, oferta y demanda, factores que mueven los precios y marco normativo del sector. NO ES EL LÍMITE DE LO QUE PUEDES RESPONDER: cuando la pregunta sea del sector y no esté cubierta aquí, respóndela igualmente con tu propio conocimiento, con la misma naturalidad y sin anunciar que no la tienes documentada. Donde el material sí diga algo, manda él sobre lo que sepas por tu cuenta. La EXPLICACIÓN la das con tus palabras, integrándola con naturalidad. Lo que está ESCRITO se reproduce EXACTAMENTE como aparece —cifras, calibres, categorías, plazos, tipos impositivos, identificadores de norma y las fuentes de referencia del final de cada documento—: no lo reformules ni lo aproximes, y no completes ni deduzcas nunca una URL, un número de norma o un nombre de organismo que no esté escrito. Los bloques de nota interna dirigidos a ti no se citan ni se mencionan. Si te preguntan por un precio concreto de hoy, di que los precios se confirman con Centrimerca directamente: aquí no tienes cotizaciones en tiempo real.',

  producto: 'Este material es el catálogo de Centrimerca: variedades, calibres, orígenes, formatos y calendario de temporada. Es tu ÚNICA fuente sobre producto. Reproduce EXACTAMENTE los nombres de variedad, los calibres, los formatos y las denominaciones de origen tal y como aparecen: no los reformules, no los traduzcas y no los aproximes. Si el catálogo no cubre lo que se pregunta, dilo en lugar de deducirlo — nunca describas un producto, un calibre o una disponibilidad que no esté escrita aquí.',

  trabajar: 'Este material describe cómo se trabaja con Centrimerca: procedimientos, condiciones y a quién dirigirse en cada caso. Reproduce EXACTAMENTE los nombres, los cargos, los canales de contacto y el orden de los pasos tal y como aparecen. Si algo no está cubierto, dilo y remite a Centrimerca en lugar de deducir un procedimiento. Escribe siempre de forma que sirva igual a alguien que ya es cliente y a alguien que aún no lo es: no des por supuesta ninguna relación previa.',

  dudas: 'Este material son las preguntas frecuentes redactadas por Centrimerca. Respeta su contenido y su redacción: son la respuesta oficial de la empresa. Si la pregunta no está cubierta, dilo y remite a Centrimerca en lugar de improvisar una respuesta.'
};

function _instruccionCorpus(plano) {
  return INSTRUCCION_CORPUS[plano] || INSTRUCCION_CORPUS[PLANO_DEFECTO];
}

/**
 * Identidad por defecto de cada plano.
 *
 * Solo se usa cuando NO hay alignment publicado para ese plano.
 *
 * ⚠️ NUNCA se hereda la identidad de otro plano. Decirle al modelo que es un
 * experto de mercado mientras responde una duda de procedimiento es PEOR que
 * no tener identidad: responde con seguridad desde el papel equivocado.
 */
function _identidadPorDefecto(plano, marca) {
  const base = `Eres CENTRI, la inteligencia artificial de ${marca}, mayorista de frutas y hortalizas en Mercamadrid. Hablas en español, con criterio profesional y sin rodeos.`;

  if (plano === 'mercado') {
    return `${base} Trabajas en el plano MERCADO: aportas contexto sobre temporadas, comportamiento del mercado y factores de oferta y demanda. No das cotizaciones ni precios del día.`;
  }
  if (plano === 'producto') {
    return `${base} Trabajas en el plano PRODUCTO: informas sobre el catálogo, variedades, calibres, orígenes y calendario de temporada, con los datos exactos del catálogo.`;
  }
  if (plano === 'trabajar') {
    return `${base} Trabajas en el plano TRABAJAR CON CENTRIMERCA: explicas procedimientos, condiciones y a quién dirigirse. Quien pregunta puede ser tanto un cliente actual como alguien que está valorando serlo: no des por supuesta ninguna relación previa.`;
  }
  return `${base} Trabajas en el plano DUDAS: resuelves preguntas generales sobre Centrimerca apoyándote en las preguntas frecuentes de la empresa.`;
}

// ═══════════════════════════════════════════════════════════════════════════
// LECTURAS — CMS
// ═══════════════════════════════════════════════════════════════════════════

async function _getConfig() {
  try {
    const res = await wixData.query(C_CONFIG).limit(1).find(AUTH);
    return res.items.length > 0 ? res.items[0] : null;
  } catch (e) {
    // Colección inexistente o vacía: se sigue con los valores por defecto.
    console.warn(`${TAG} _getConfig fallo:`, e.message);
    return null;
  }
}

async function _getAlignments() {
  try {
    const res = await wixData.query(C_ALIGNMENT)
      .eq('status', 'publicado')
      .descending('publicationDate')
      .limit(20)
      .find(AUTH);
    return res.items || [];
  } catch (e) {
    console.warn(`${TAG} _getAlignments fallo:`, e.message);
    return [];
  }
}

/**
 * Alignment del plano pedido. Null si no hay ninguno publicado para él: el
 * prompt usa entonces la identidad por defecto DE ESE PLANO.
 *
 * ⚠️ El filtro por plano se hace EN MEMORIA, no en la query. Un
 * `.eq('modo', plano)` dejaría fuera las filas con el campo vacío, que por la
 * regla "vacío = plano por defecto" son precisamente las de ese plano.
 */
function _alignmentDelPlano(alignments, plano) {
  const lista = alignments || [];
  return lista.find(a => _normPlano(a && a.modo) === plano) || null;
}

/**
 * Documentos activos. Se leen TODOS y se filtran después en memoria.
 *
 * ⚠️ El límite se reparte entre TODOS los planos, no por plano: esta query es
 * anterior al filtro. Con cuatro corpus conviviendo, un tope corto pierde
 * documentos ANTES de llegar al filtro y sin error visible. 300 con margen.
 *
 * No se filtra en la query a propósito: obligaría a esperar al alignment
 * antes de pedir los documentos y serializaría el PREP.
 */
async function _getDocumentos() {
  try {
    const res = await wixData.query(C_DOCUMENTS)
      .eq('activo', true)
      .ascending('orden')
      .limit(300)
      .find(AUTH);
    return res.items || [];
  } catch (e) {
    console.warn(`${TAG} _getDocumentos fallo:`, e.message);
    return [];
  }
}

function _filtrarDocsPorPlano(docs, plano) {
  const planoActivo = _normPlano(plano);
  return (docs || []).filter(d => _normPlano(d && d.modo) === planoActivo);
}

// ═══════════════════════════════════════════════════════════════════════════
// v1.0.5 — DATOS Y ACCIONES (lo que se marca en el Entrenador)
// ═══════════════════════════════════════════════════════════════════════════
//
// El alignment PUBLICADO de cada plano trae en `fuentes` qué colecciones del
// CMS puede leer CENTRI en ese plano, qué campos ve de cada una y qué campos
// se convierten en botón. Lo decide Centrimerca desde el Entrenador: este
// archivo no conoce ninguna colección.
//
// CENTRI no recibe los datos de antemano: los pide con la herramienta
// consultar_datos cuando la pregunta los necesita. Una colección nueva es
// marcarla en el Entrenador y publicar. Cero código.

// Colecciones que CENTRI no lee NUNCA, aunque alguien las marque a mano en el
// CMS. ⚠️ MISMO LISTADO que centriEntrenador.web.js, que ni las enseña: si se
// toca uno, se toca el otro. El chat es público y los clientes compiten entre
// sí: conversaciones, administradores, miembros, pedidos y formularios no
// salen por aquí.
const COLECCIONES_BLOQUEADAS = [
  'CentriSessions', 'CentriMessages', 'CentriLog', 'CentriAdmins',
  'CentriAlignment', 'CentriDocuments', 'CentriPlantillas', 'CentriCampanias',
  'CentriPronunciacion'
];
const PREFIJOS_BLOQUEADOS = ['Members/', 'WixForms/', 'Marketing/', 'Stores/Orders'];

function _coleccionBloqueada(id) {
  const s = String(id || '').trim();
  if (!s) return true;
  if (COLECCIONES_BLOQUEADAS.indexOf(s) >= 0) return true;
  return PREFIJOS_BLOQUEADOS.some(p => s.indexOf(p) === 0);
}

const NOMBRE_HERRAMIENTA = 'consultar_datos';

const MAX_VUELTAS        = 4;       // vueltas de herramienta por pregunta
const LIMITE_FILAS_FUENTE = 1000;   // tope de lectura por colección
// Tope de lo que devuelve una consulta. Por encima, sin búsqueda, se devuelve
// solo el índice de nombres y se pide acotar: volcar una colección grande
// entera quema contexto y tiempo sin mejorar la respuesta.
const MAX_CHARS_RESULTADO = 40000;
const MAX_BOTONES   = 6;
const MAX_PREGUNTAS = 6;

/*
 * Acciones posibles. Lista CERRADA: es lo que la consola sabe pintar. Cada una
 * construye su enlace con el valor del campo; si el valor no sirve (vacío,
 * correo mal formado, protocolo raro), no hay botón.
 */
const TIPOS_ACCION = {
  llamar: {
    etiqueta: n => n ? `Llamar a ${n}` : 'Llamar',
    // Un "+" inicial se respeta; si no lo hay, se marca el número tal cual.
    // No se antepone ningún prefijo de país: el dato manda.
    href: v => {
      const s = _txt(v);
      const d = s.replace(/[^\d]/g, '');
      return d ? 'tel:' + (s.charAt(0) === '+' ? '+' : '') + d : '';
    }
  },
  whatsapp: {
    etiqueta: n => n ? `WhatsApp con ${n}` : 'WhatsApp',
    // Mismo criterio que fichaProducto.js v1.3.0: solo dígitos.
    href: v => {
      const d = _txt(v).replace(/[^\d]/g, '');
      return d ? 'https://wa.me/' + d : '';
    }
  },
  correo: {
    etiqueta: n => n ? `Escribir a ${n}` : 'Escribir',
    href: v => {
      const s = _txt(v);
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? 'mailto:' + s : '';
    }
  },
  tarjeta: {
    etiqueta: n => n ? `Tarjeta de ${n}` : 'Tarjeta de contacto',
    href: v => _enlaceSeguro(v)
  },
  ficha: {
    etiqueta: n => n ? `Ver ficha: ${n}` : 'Ver ficha',
    href: v => _enlaceSeguro(v)
  },
  enlace: {
    etiqueta: n => n ? `Abrir: ${n}` : 'Abrir enlace',
    href: v => _enlaceSeguro(v)
  }
};

/* Solo http(s) o ruta de la propia web ("/productos/kiwi"). Nada más. */
function _enlaceSeguro(v) {
  const s = _txt(v);
  if (/^https?:\/\//i.test(s)) return s;
  if (s.charAt(0) === '/' && s.charAt(1) !== '/') {
    try { return decodeURI(s); } catch (_) { return s; }
  }
  return '';
}

/* Copia literal de centriCatalogo.web.js v1.0.3. */
function _txt(v) {
  return (v === null || v === undefined) ? '' : String(v).trim();
}

/*
 * JSON guardado en un campo de TEXTO. Wix a veces lo devuelve como objeto y a
 * veces como string escapado dos veces. Mismo criterio que _parseTemporada en
 * centriCatalogo.web.js: hasta DOS JSON.parse, parando en cuanto hay objeto.
 * Devuelve null si no es JSON.
 */
function _parseJson(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  let val = raw;
  for (let i = 0; i < 2 && typeof val === 'string'; i++) {
    const s = val.trim();
    if (!s) return null;
    const c = s.charAt(0);
    if (c !== '{' && c !== '[' && c !== '"') return null;
    try { val = JSON.parse(s); } catch (_) { return null; }
  }
  return (val && typeof val === 'object') ? val : null;
}

/*
 * La selección del plano, saneada. Lo que no cuadra (colección bloqueada, sin
 * id, acción desconocida) se descarta aquí y no llega a la herramienta.
 */
function _leerFuentes(config) {
  const vacio = { colecciones: [], preguntas: false, descartadas: [] };
  if (!config || !config.fuentes) return vacio;

  const f = _parseJson(config.fuentes);
  if (!f) {
    console.warn(`${TAG} ⚠️ alignment '${config.modo}' v${config.version || '?'}: \`fuentes\` no es JSON válido — sin datos`);
    return vacio;
  }

  const descartadas = [];
  const colecciones = [];
  for (const c of (Array.isArray(f.colecciones) ? f.colecciones : [])) {
    if (!c || !c.id) continue;
    const id = String(c.id).trim();
    if (_coleccionBloqueada(id)) { descartadas.push(id); continue; }

    const campos = (Array.isArray(c.campos) ? c.campos : [])
      .filter(x => x && x.key)
      .map(x => ({ key: String(x.key), tipo: _txt(x.tipo).toUpperCase() }));

    const acciones = (Array.isArray(c.acciones) ? c.acciones : [])
      .filter(x => x && x.key && TIPOS_ACCION[x.accion])
      .map(x => ({ key: String(x.key), accion: x.accion }));

    const principal = _txt(c.principal);
    if (!principal && campos.length === 0 && acciones.length === 0) continue;

    colecciones.push({
      id,
      nombre: _txt(c.nombre) || id,
      principal,
      descripcion: _txt(c.descripcion),
      campos,
      acciones
    });
  }

  if (descartadas.length > 0) {
    console.warn(`${TAG} ⚠️ fuentes BLOQUEADAS descartadas: ${descartadas.join(', ')}`);
  }
  return { colecciones, preguntas: f.preguntas === true, descartadas };
}

/* Definición de la herramienta, generada desde la selección del plano. */
function _herramientaDatos(fuentes) {
  const unicos = (arr) => arr.filter((x, i) => x && arr.indexOf(x) === i);
  const listado = fuentes.colecciones.map(c => {
    const campos = unicos([c.principal].concat(c.campos.map(x => x.key)));
    const acciones = unicos(c.acciones.map(a => a.accion));
    return `· "${c.id}" (${c.nombre}): ${c.descripcion || 'sin descripción'}` +
      (campos.length ? `\n  Campos: ${campos.join(', ')}` : '') +
      (acciones.length ? `\n  Acciones: ${acciones.join(', ')}` : '');
  }).join('\n');

  return {
    name: NOMBRE_HERRAMIENTA,
    description:
      'Lee datos reales de Centrimerca guardados en nuestra web. Úsala siempre que la respuesta ' +
      'dependa de un dato concreto: no lo deduzcas ni lo des de memoria. Puedes llamarla varias ' +
      'veces en la misma respuesta.\n\nFuentes disponibles en este plano:\n' + listado,
    input_schema: {
      type: 'object',
      properties: {
        fuente: {
          type: 'string',
          enum: fuentes.colecciones.map(c => c.id),
          description: 'Qué colección leer.'
        },
        busqueda: {
          type: 'string',
          description: 'Texto para acotar: el nombre de un producto, una variedad, una persona o un cargo. ' +
            'Opcional: sin él devuelve la colección entera, salvo que sea demasiado grande.'
        }
      },
      required: ['fuente']
    }
  };
}

/* RICH_TEXT → texto. Solo para que el modelo no lea etiquetas. */
function _sinHtml(v) {
  return _txt(v)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/* Valor de un campo tal y como lo lee el modelo. undefined = no se envía. */
function _valorParaModelo(v, tipo) {
  if (v === null || v === undefined || v === '') return undefined;
  if (tipo === 'RICH_TEXT') return _sinHtml(v) || undefined;
  if (tipo === 'ARRAY_STRING' && Array.isArray(v)) {
    return v.map(x => _txt(x)).filter(Boolean).join(', ') || undefined;
  }
  if (tipo === 'DATE' || tipo === 'DATETIME') {
    const d = (v instanceof Date) ? v : new Date((v && v.$date) ? v.$date : v);
    return isNaN(d.getTime()) ? (_txt(v) || undefined) : d.toISOString().substring(0, 10);
  }
  if (tipo === 'BOOLEAN') return v === true ? 'sí' : (v === false ? 'no' : undefined);
  if (tipo === 'ADDRESS' && typeof v === 'object') return _txt(v.formatted) || undefined;
  if (tipo === 'PAGE_LINK' || tipo === 'URL') return _enlaceSeguro(v) || _txt(v) || undefined;
  if (typeof v === 'string') {
    const json = _parseJson(v);           // p. ej. `temporada`
    return json !== null ? json : (_txt(v) || undefined);
  }
  return v;
}

function _nuevoRegistroAcciones() {
  return { n: 0, mapa: {} };
}

function _registrarAccion(reg, tipo, etiqueta, href) {
  reg.n++;
  const id = 'a' + reg.n;
  reg.mapa[id] = { tipo, etiqueta, href };
  return id;
}

/*
 * La herramienta. Genérica: todo su comportamiento sale de la selección.
 *
 *   · Lee la colección y descarta las filas con `activo === false`, EN
 *     MEMORIA: criterio literal de FichaProducto.page.js v1.1.4 (lo apagado a
 *     propósito no existe para CENTRI; un campo vacío no apaga nada).
 *   · Proyección: el campo principal (el que nombra la fila) + los campos
 *     marcados. Lo no marcado NO viaja al modelo.
 *   · Acciones: se calculan con el valor REAL del campo, aunque ese campo no
 *     se le enseñe al modelo. El modelo solo recibe el id y el tipo.
 *   · Búsqueda: copia del criterio de consultarConfig (AKIRA): sin acentos y,
 *     si parece un teléfono, por dígitos. Sin coincidencias se devuelve todo.
 */
async function _consultarDatos(input, fuentes, reg) {
  const p = input || {};
  const def = fuentes.colecciones.find(c => c.id === p.fuente);
  if (!def) {
    return {
      error: `La fuente "${p.fuente}" no está disponible en este plano.`,
      fuentesDisponibles: fuentes.colecciones.map(c => c.id)
    };
  }
  // Defensa en profundidad: _leerFuentes ya las descarta.
  if (_coleccionBloqueada(def.id)) return { error: 'Fuente no disponible.' };

  const t0 = Date.now();
  const res = await wixData.query(def.id).limit(LIMITE_FILAS_FUENTE).find(AUTH);
  const visibles = (res.items || []).filter(item => item && item.activo !== false);

  let filas = visibles.map(item => {
    const datos = {};
    if (def.principal) {
      const v = _valorParaModelo(item[def.principal], 'TEXT');
      if (v !== undefined) datos[def.principal] = v;
    }
    for (const c of def.campos) {
      if (c.key === def.principal) continue;
      const v = _valorParaModelo(item[c.key], c.tipo);
      if (v !== undefined) datos[c.key] = v;
    }
    return { item, datos };
  });

  if (p.busqueda) {
    const norm = (s) => String(s || '').toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '');
    const aguja = norm(p.busqueda).trim();
    const soloDigitos = aguja.replace(/[^\d]/g, '');
    const esTelefono = soloDigitos.length >= 6;
    const coinciden = filas.filter(f => {
      const blob = norm(JSON.stringify(f.datos));
      if (aguja && blob.indexOf(aguja) !== -1) return true;
      if (esTelefono && blob.replace(/[^\d]/g, '').indexOf(soloDigitos) !== -1) return true;
      return false;
    });
    if (coinciden.length > 0) filas = coinciden;
  }

  // Demasiado grande para devolverla entera: índice de nombres y que acote.
  // Sin campo principal no hay índice posible: se recorta por filas enteras.
  const tamano = JSON.stringify(filas.map(f => f.datos)).length;
  let recortadas = 0;
  if (tamano > MAX_CHARS_RESULTADO) {
    if (def.principal) {
      console.log(`${TAG} consultar_datos fuente=${def.id} busqueda="${p.busqueda || ''}" → ${filas.length} filas, ${tamano} chars: SOLO ÍNDICE (${Date.now() - t0}ms)`);
      return {
        fuente: def.id,
        total: filas.length,
        aviso: 'Hay demasiados datos para devolverlos todos. Vuelve a consultar con `busqueda` (por ejemplo, uno de estos nombres).',
        indice: filas.map(f => f.datos[def.principal]).filter(Boolean)
      };
    }
    let acumulado = 2;
    const caben = [];
    for (const f of filas) {
      const n = JSON.stringify(f.datos).length + 1;
      if (acumulado + n > MAX_CHARS_RESULTADO) break;
      acumulado += n;
      caben.push(f);
    }
    recortadas = filas.length - caben.length;
    filas = caben;
  }

  const salida = filas.map(f => {
    const fila = Object.assign({}, f.datos);
    const nombre = _txt(def.principal ? f.item[def.principal] : '');
    const acciones = [];
    for (const a of def.acciones) {
      const tipo = TIPOS_ACCION[a.accion];
      const href = tipo.href(f.item[a.key]);
      if (!href) continue;
      acciones.push({ id: _registrarAccion(reg, a.accion, tipo.etiqueta(nombre), href), tipo: a.accion });
    }
    if (acciones.length > 0) fila.acciones = acciones;
    return fila;
  });

  console.log(`${TAG} consultar_datos fuente=${def.id} busqueda="${p.busqueda || ''}" → ${salida.length} filas${recortadas ? ` (+${recortadas} recortadas)` : ''} (${Date.now() - t0}ms)`);
  const resultado = { fuente: def.id, total: salida.length + recortadas, filas: salida };
  if (recortadas > 0) {
    resultado.aviso = `Faltan ${recortadas} filas por límite de espacio. Si la respuesta puede depender de ellas, consulta con \`busqueda\`.`;
  }
  return resultado;
}

/*
 * Instrucciones de la herramienta y de los marcadores. Es MECÁNICA del
 * sistema (cómo se pide un dato, cómo sale un botón), no criterio: el criterio
 * de cuándo ofrecer qué va en el Entrenador.
 */
function _bloqueDatos(fuentes) {
  const lineas = [
    '--- DATOS Y ACCIONES ---',
    `Tienes la herramienta ${NOMBRE_HERRAMIENTA} para leer datos de Centrimerca. Úsala siempre que la respuesta dependa de un dato concreto: un producto, una variedad, una persona o un contacto. No lo deduzcas ni lo respondas de memoria.`,
    'Las filas pueden traer acciones (llamar, whatsapp, correo, tarjeta, ficha o enlace), cada una con su id. Para ofrecer una, escribe su marcador exactamente así: [[ACCION:id]], en una línea propia al final de la respuesta. El botón lo monta el sistema con el dato real: no hace falta que escribas el teléfono, el correo ni el enlace. Usa solo ids que te haya devuelto la herramienta en esta misma respuesta.',
    'Ofrecer estos botones no es tramitar nada: solo abren el teléfono, el correo o una página.'
  ];
  if (fuentes.preguntas) {
    lineas.push('Respuestas rápidas: puedes añadir [[PREGUNTA:texto]], cada una en una línea propia al final. Al pulsarla, ese texto se envía tal cual, como si lo escribiera el usuario. Úsalas solo para que conteste a algo que tú le preguntas (por ejemplo «Sí» y «No») o para pedir algo que puedes responder con los datos que tienes. Nunca ofrezcas con ellas información que no tienes.');
  }
  return lineas.join('\n');
}

const RE_BTN      = /\[\[BTN:[^\]]*\]\]/g;
const RE_ACCION   = /\[\[ACCION:\s*([a-zA-Z0-9_-]+)\s*\]\]/g;
const RE_PREGUNTA = /\[\[PREGUNTA:\s*([^\]]+?)\s*\]\]/g;

/*
 * Respuesta del modelo → texto que se guarda y se envía a la consola.
 *
 *   · [[BTN:...]] que escriba el modelo se BORRAN: un botón solo lo fabrica
 *     este archivo, con el dato del CMS. Si no, un modelo que imitase el
 *     historial podría poner un teléfono inventado detrás de un botón.
 *   · [[ACCION:aN]] → [[BTN:tipo|etiqueta|enlace]] si el id existe en esta
 *     pregunta. Un id desconocido desaparece.
 *   · [[PREGUNTA:...]] se conserva solo si el plano lo permite.
 *
 * El resultado se guarda tal cual en CentriMessages: así el botón sobrevive
 * al 504 (el polling lee del historial) y a la reapertura de la conversación.
 */
function _resolverMarcadores(texto, reg, permitirPreguntas) {
  let s = String(texto || '').replace(RE_BTN, '');
  const usados = {};
  let botones = 0;
  s = s.replace(RE_ACCION, (m, id) => {
    const a = reg && reg.mapa[id];
    if (!a || usados[id] || botones >= MAX_BOTONES) return '';
    usados[id] = true;
    botones++;
    const etiqueta = String(a.etiqueta).replace(/\|/g, '/').replace(/\]/g, ')');
    const href = String(a.href).replace(/\|/g, '%7C').replace(/\]/g, '%5D');
    return `[[BTN:${a.tipo}|${etiqueta}|${href}]]`;
  });
  let preguntas = 0;
  s = s.replace(RE_PREGUNTA, (m, q) => {
    if (!permitirPreguntas || preguntas >= MAX_PREGUNTAS) return '';
    const t = _txt(q).replace(/\|/g, '/').substring(0, 160);
    if (!t) return '';
    preguntas++;
    return `[[PREGUNTA:${t}]]`;
  });
  return s.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

/*
 * Historial → modelo. Los botones de turnos anteriores se convierten en su
 * etiqueta y las preguntas sugeridas se quitan: el modelo no ve nunca un
 * [[BTN:...]] que pudiera copiar.
 */
function _textoParaModelo(texto) {
  return String(texto || '')
    .replace(/\[\[BTN:[^|\]]*\|([^|\]]*)\|[^\]]*\]\]/g, '($1)')
    .replace(RE_BTN, '')
    .replace(RE_PREGUNTA, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function _contarBotones(texto) {
  return (String(texto || '').match(RE_BTN) || []).length;
}

// ═══════════════════════════════════════════════════════════════════════════
// FECHAS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * El modelo COPIA la fecha, no la calcula. Un modelo que calcula fechas se
 * equivoca de vez en cuando y siempre con aplomo.
 *
 * Zona horaria explícita: la query va en UTC y desborda el día.
 */
function _hoyMadrid() {
  const now = new Date();
  const iso = now.toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });
  const nombre = now.toLocaleDateString('es-ES', {
    timeZone: 'Europe/Madrid', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
  return { iso, nombre };
}

// ═══════════════════════════════════════════════════════════════════════════
// PROMPT — STABLE cacheado + VOLÁTIL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * STABLE (no cambia entre preguntas → se cachea, TTL 5 min):
 *   identidad · tono y detalle · contexto de la empresa · reglas · guardrails
 *   · corpus de conocimiento.
 *
 * VOLÁTIL (cambia cada día → fuera de la caché):
 *   la fecha de hoy.
 *
 * Poner la fecha dentro del bloque cacheado invalidaría la caché a diario sin
 * motivo. Poner el corpus fuera la haría inútil. El uso real es en ráfaga
 * —nadie hace una sola pregunta— así que una sesión de cinco preguntas es una
 * fría y cuatro calientes.
 */
function _buildSystemBlocks(ctx) {
  const { config, documentos, empresa, plano, fuentes } = ctx;
  const hayDatos = !!(fuentes && fuentes.colecciones && fuentes.colecciones.length > 0);
  const hoy = _hoyMadrid();
  const stable = [];

  const marca = (empresa && empresa.brandName) || 'Centrimerca';

  // ── IDENTIDAD ──
  if (config && config.promptBase && String(config.promptBase).trim()) {
    stable.push(String(config.promptBase).trim());
  } else {
    stable.push(_identidadPorDefecto(plano, marca));
  }

  stable.push(`PLANO ACTIVO: ${plano.toUpperCase()}.`);

  // ── TONO Y NIVEL DE DETALLE ──
  if (config) {
    const tonos = {
      formal:  'TONO: Formal y profesional. Sin emojis ni coloquialismos.',
      directo: 'TONO: Directo y al grano. Mínimas palabras, máxima información.',
      cercano: 'TONO: Cercano y natural, sin perder profesionalidad.'
    };
    if (tonos[config.tone]) stable.push(tonos[config.tone]);

    const detalles = {
      breve:   'NIVEL DE DETALLE: Respuestas breves y densas.',
      medio:   'NIVEL DE DETALLE: Extensión media. Dato, contexto y conclusión.',
      extenso: 'NIVEL DE DETALLE: Respuesta detallada, con matices.'
    };
    if (detalles[config.detailLevel]) stable.push(detalles[config.detailLevel]);
  }

  // ── CONTEXTO DE LA EMPRESA (leído del CMS, cero hardcoding) ──
  const ctxEmpresa = ['--- CONTEXTO DE LA EMPRESA ---'];
  if (empresa) {
    if (empresa.brandName)  ctxEmpresa.push(`Nombre comercial: ${empresa.brandName}`);
    if (empresa.legalName)  ctxEmpresa.push(`Razón social: ${empresa.legalName}`);
    if (empresa.address)    ctxEmpresa.push(`Ubicación: ${empresa.address}`);
    if (empresa.phone)      ctxEmpresa.push(`Teléfono: ${empresa.phone}`);
    if (empresa.horario)    ctxEmpresa.push(`Horario: ${empresa.horario}`);
    if (empresa.descripcion) ctxEmpresa.push(String(empresa.descripcion));
  }
  if (ctxEmpresa.length > 1) stable.push(ctxEmpresa.join('\n'));

  // ── REGLAS DE TRABAJO ──
  //
  // ⚠️ v1.0.1 — AQUÍ SOLO VA LO QUE ES UN HECHO DEL SISTEMA.
  //
  // La v1.0.0 mandaba siete reglas rotuladas INQUEBRANTABLES a los cuatro
  // planos. Cuatro no eran hechos, eran criterio, y ya estaban escritas en
  // otro sitio:
  //
  //   · "tu única fuente es el conocimiento" / "si no cubre, DILO, no
  //     deduzcas" → ya lo dice INSTRUCCION_CORPUS en producto, trabajar y
  //     dudas, con las palabras de cada plano. En MERCADO no sobraba: hacía
  //     daño. Cerraba el conocimiento general del sector, que es exactamente
  //     lo que ese plano necesita para dar una primera indicación y remitir.
  //   · "eres SOLO CONSULTA" → es la casilla grOnlyQuery. Estaba en el código
  //     Y en el CMS: desmarcarla no la apagaba.
  //   · "no des por supuesta ninguna relación previa" → está en
  //     INSTRUCCION_CORPUS.trabajar y en las instrucciones del entrenador.
  //
  // Duplicar una regla en tres capas no la refuerza. Lo único que consigue es
  // que no se pueda cambiar desde donde debe cambiarse.
  //
  // ⚠️ La antigua regla 6 prohibía "mencionar el conocimiento, los documentos
  //    ni la mecánica del sistema". Esa frase es la causa directa de que
  //    CENTRI no citara nunca las fuentes de referencia que los propios
  //    documentos traen al final. Se acota a la mecánica interna: la fuente
  //    externa SÍ se da, es el objeto del producto.
  //
  // ⚠️ La regla de PRECEDENCIA no es decorativa. Sin ella un bloque que se
  //    autodeclara inquebrantable gana a lo que escriba Jal en el entrenador,
  //    y el entrenador queda de adorno.
  stable.push([
    '--- REGLAS DE TRABAJO ---',
    '1. No tienes acceso a los sistemas de gestión: no ves stock en tiempo',
    '   real, ni precios del día, ni pedidos, ni facturas. Si te piden uno de',
    '   esos datos, dilo con claridad y remite a nuestro equipo.',
    '2. No expliques tu proceso interno ni la mecánica del sistema. Habla del',
    '   negocio. Sí puedes señalar la norma, el organismo o la fuente externa',
    '   donde ampliar, cuando el conocimiento la traiga escrita.',
    '3. La fecha de hoy está más abajo. NO la calcules: cópiala.',
    '4. Las INSTRUCCIONES DE CENTRIMERCA y la nota que acompaña al',
    '   conocimiento mandan sobre lo anterior donde sean más concretas.'
  ].join('\n'));

  // ── v1.0.5 — DATOS Y ACCIONES (solo si el plano tiene selección) ──
  if (hayDatos) stable.push(_bloqueDatos(fuentes));

  // ── GUARDRAILS EDITABLES DESDE EL CMS ──
  if (config) {
    const gr = [];
    // ⚠️ v1.0.1 — el literal anterior era "el conocimiento de referencia es la
    //    ÚNICA verdad". Eso no es un guardrail de datos: cierra también la
    //    explicación. El caso que lo motiva es el contrario y ya pasó en
    //    producción — preguntada por calibres de manzana sin corpus, CENTRI
    //    soltó rangos en milímetros de su conocimiento general y avisó DESPUÉS.
    //    Lo que hay que prohibir es EL DATO no escrito, no el saber del sector.
    if (config.grNoInvent)   gr.push('No especules. Lo que sabes con solidez lo dices; lo que no sabes, lo dices también. Nunca supongas ni deduzcas nada sobre Centrimerca —precios, stock, catálogo, condiciones, procedimientos o contactos— que no esté escrito en el conocimiento: eso se remite a nuestro equipo.');
    if (config.grNoMarkdown) gr.push('Responde en texto plano: sin markdown, sin viñetas, sin emojis.');
    if (config.grConcision)  gr.push('No describas tu razonamiento. Da la respuesta directa.');
    if (config.grOnlyQuery)  gr.push('Solo información. No ofrezcas tramitar, reservar ni registrar nada.');
    if (gr.length > 0) stable.push('--- GUARDRAILS ---\n' + gr.join('\n'));

    if (config.extraInstructions && String(config.extraInstructions).trim()) {
      stable.push('--- INSTRUCCIONES DE CENTRIMERCA ---\n' + String(config.extraInstructions).trim());
    }
  }

  // ── CONOCIMIENTO ──
  //
  // ⚠️ EL TRUNCADO NUNCA PUEDE SER SILENCIOSO. Si el corpus no cabe, se corta,
  // pero queda escrito en el log de la preparación (ver askCentriCore) y en un
  // console.warn. El caso que lo justifica: un documento de 69.838 caracteres
  // con el tope en 12.000 — el modelo leía el primer 17 %, cortado a mitad de
  // sección, y llevaba meses pasando sin que nadie lo supiera.
  // ⚠️ v1.0.3 — LA INSTRUCCIÓN DEL PLANO SE ENVÍA SIEMPRE, HAYA CORPUS O NO.
  // Estaba dentro del if y un plano vacío se quedaba sin ella. Ver cabecera.
  const bloques = ['--- CONOCIMIENTO DE REFERENCIA ---'];
  bloques.push(_instruccionCorpus(plano));

  if (documentos && documentos.length > 0) {
    const tope = _docCharsDelPlano(plano);
    let chars = 0;
    let truncado = false;

    for (const d of documentos) {
      const contenido = d.contenido || '';
      const titulo = d.titulo || 'Documento';
      const tipo = d.tipo || 'documento';

      if (chars + contenido.length > tope) {
        const queda = tope - chars;
        if (queda > 200) {
          bloques.push(`[${tipo}] ${titulo}\n${contenido.substring(0, queda)}…`);
        }
        truncado = true;
        break;
      }
      bloques.push(`[${tipo}] ${titulo}\n${contenido}`);
      chars += contenido.length;
    }

    if (truncado) {
      console.warn(`${TAG} ⚠️ corpus del plano '${plano}' TRUNCADO en ${tope} chars`);
      // Que el modelo lo sepa y pueda decirlo, en vez de responder como si
      // tuviera el corpus entero.
      bloques.push('--- AVISO ---\nEl conocimiento de referencia está incompleto en esta consulta por límite de espacio. Si la respuesta puede depender de algo que no ves, indícalo en lugar de responder como si tuvieras toda la información.');
    }
  } else {
    console.warn(`${TAG} ⚠️ plano '${plano}' SIN documentos activos`);
    // v1.0.5 — si el plano tiene datos seleccionados, el aviso lo dice: leído
    // a secas ("no tienes material"), el modelo no usaría la herramienta.
    bloques.push('--- AVISO ---\nEn esta consulta no hay ningún documento cargado para este plano. Aplica la nota anterior sabiendo que no tienes material de referencia detrás.' +
      (hayDatos ? ` Para datos concretos de Centrimerca sí tienes la herramienta ${NOMBRE_HERRAMIENTA}.` : ''));
  }

  stable.push(bloques.join('\n\n'));

  // ── VOLÁTIL ──
  // Sin motor de consulta no hacen falta rangos resueltos: basta el día.
  return [
    { type: 'text', text: stable.join('\n\n'), cache_control: { type: 'ephemeral' } },
    { type: 'text', text: `--- FECHA ---\nHOY: ${hoy.nombre} (${hoy.iso}). Zona horaria Europe/Madrid.` }
  ];
}

// ═══════════════════════════════════════════════════════════════════════════
// LLAMADA AL MODELO
// ═══════════════════════════════════════════════════════════════════════════

function _withTimeout(promise, timeoutMs, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timeout ${timeoutMs}ms`)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function _postAnthropic(apiKey, body, timeoutMs, label) {
  const res = await _withTimeout(
    fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    }),
    timeoutMs, label
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data && data.error ? data.error.message : `HTTP ${res.status}`);
  return data;
}

/**
 * Sin herramientas (plano sin datos seleccionados): una sola llamada,
 * exactamente como hasta v1.0.4.
 *
 * Con herramientas (v1.0.5): bucle de tool use, mismo esquema que AKIRA. El
 * modelo pide datos → se ejecuta consultar_datos → el modelo responde. Máx.
 * MAX_VUELTAS vueltas; si las agota, una llamada de cierre sin herramientas.
 *
 * ⛔ La clave `tools` NO se añade al payload si no hay herramienta. Mandarla
 *    vacía es error de API.
 */
async function _callModelo(model, apiKey, systemBlocks, messages, timeoutMs, herramientas) {
  if (herramientas) {
    return _callModeloConHerramientas(model, apiKey, systemBlocks, messages, timeoutMs, herramientas);
  }

  const startMs = Date.now();

  const payload = {
    model,
    max_tokens: MAX_TOKENS,
    system: systemBlocks,
    messages
  };

  const data = await _postAnthropic(apiKey, payload, timeoutMs, model);

  const u = data.usage || {};
  const cacheStats = {
    hit:    u.cache_read_input_tokens     || 0,
    create: u.cache_creation_input_tokens || 0,
    input:  u.input_tokens  || 0,
    output: u.output_tokens || 0
  };

  const respuesta = (data.content || [])
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('\n')
    .trim();

  return { respuesta, timeMs: Date.now() - startMs, cacheStats };
}

async function _callModeloConHerramientas(model, apiKey, systemBlocks, messages, timeoutMs, herramientas) {
  const startMs = Date.now();
  const convo = messages.slice();
  let cacheStats = { hit: 0, create: 0, input: 0, output: 0 };
  let consultas = 0;

  const sumar = (u) => {
    const x = u || {};
    cacheStats = {
      hit:    cacheStats.hit    + (x.cache_read_input_tokens     || 0),
      create: cacheStats.create + (x.cache_creation_input_tokens || 0),
      input:  cacheStats.input  + (x.input_tokens  || 0),
      output: cacheStats.output + (x.output_tokens || 0)
    };
  };
  const textoDe = (bloques) => (bloques || [])
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('\n')
    .trim();

  for (let vuelta = 0; vuelta < MAX_VUELTAS; vuelta++) {
    const payload = {
      model,
      max_tokens: MAX_TOKENS,
      system: systemBlocks,
      messages: convo,
      tools: [herramientas.tool]
    };

    const data = await _postAnthropic(apiKey, payload, timeoutMs, model);
    sumar(data.usage);

    const bloques = data.content || [];
    const toolUses = bloques.filter(b => b.type === 'tool_use');

    if (data.stop_reason !== 'tool_use' || toolUses.length === 0) {
      return { respuesta: textoDe(bloques), timeMs: Date.now() - startMs, cacheStats, consultas };
    }

    convo.push({ role: 'assistant', content: bloques });

    const resultados = [];
    for (const tu of toolUses) {
      consultas++;
      let out;
      try {
        out = (tu.name === herramientas.tool.name)
          ? await herramientas.ejecutar(tu.input || {})
          : { error: `Herramienta desconocida: ${tu.name}` };
      } catch (e) {
        console.warn(`${TAG} herramienta ${tu.name} falló:`, e.message);
        out = { error: 'No se pudieron leer los datos: ' + e.message };
      }
      resultados.push({
        type: 'tool_result',
        tool_use_id: tu.id,
        content: JSON.stringify(out)
      });
    }
    convo.push({ role: 'user', content: resultados });
  }

  // Salvaguarda: si agota las vueltas, pide el cierre sin más herramientas.
  console.warn(`${TAG} ⚠️ ${MAX_VUELTAS} vueltas de herramienta agotadas: llamada de cierre`);
  const final = await _postAnthropic(apiKey, {
    model, max_tokens: MAX_TOKENS, system: systemBlocks, messages: convo
  }, timeoutMs, model + '-cierre');
  sumar(final.usage);
  return { respuesta: textoDe(final.content), timeMs: Date.now() - startMs, cacheStats, consultas };
}

async function _callConFallback(apiKey, systemBlocks, messages, herramientas) {
  try {
    const r = await _callModelo(MODEL_PRIMARY, apiKey, systemBlocks, messages, PRIMARY_TIMEOUT_MS, herramientas);
    return { ...r, modeloUsado: MODEL_PRIMARY, degradado: false };
  } catch (err1) {
    if (!FALLBACK_HABILITADO) {
      throw new Error(`${MODEL_PRIMARY}:[${err1.message}] (failover deshabilitado)`);
    }
    // ⚠️ Degradación VISIBLE. La objeción de la guía es que sea silenciosa.
    console.warn(`${TAG} ⚠️ DEGRADACIÓN: ${MODEL_PRIMARY} falló (${err1.message}). Cayendo a ${MODEL_FALLBACK}.`);
    try {
      const r = await _callModelo(MODEL_FALLBACK, apiKey, systemBlocks, messages, FALLBACK_TIMEOUT_MS, herramientas);
      return { ...r, modeloUsado: MODEL_FALLBACK, degradado: true };
    } catch (err2) {
      throw new Error(`${MODEL_PRIMARY}:[${err1.message}] ${MODEL_FALLBACK}:[${err2.message}]`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SESIONES E HISTORIAL — MÉTODO CATHOVIA
// ═══════════════════════════════════════════════════════════════════════════

const USER_FIELD = 'usuarioId';

async function _crearSesion(userId, userName, primeraQuery, plano) {
  const now = new Date();
  const titulo = primeraQuery
    ? String(primeraQuery).substring(0, 60)
    : 'Consulta ' + now.toLocaleDateString('es-ES');

  const registro = {
    title: titulo,
    estado: 'activa',
    fechaCreacion: now,
    fechaActualizacion: now
  };
  registro[USER_FIELD] = userId || '';
  registro.usuarioNombre = userName || '';

  // v1.0.4 — el plano se guarda con la sesión para poder restituir el chip al
  // reabrirla. Se valida contra la lista cerrada como en cualquier otra
  // entrada: aquí llega desde el front igual que en askCentriCore.
  registro.modo = _planoPedido(plano);

  const res = await wixData.insert(C_SESSIONS, registro, AUTH);
  return res._id;
}

/**
 * Comprueba que la sesión es de quien dice. Devuelve:
 *   { existe:false }                    → no hay tal sesión
 *   { existe:true, propia:false }       → es de otro
 *   { existe:true, propia:true, sesion} → adelante
 *
 * ⚠️ Sin userId → NUNCA propia. Método Cathovia: falla cerrado.
 */
async function _verificarPropiedad(sessionId, userId) {
  let sesion = null;
  try { sesion = await wixData.get(C_SESSIONS, sessionId, AUTH); }
  catch (_) { sesion = null; }

  if (!sesion) return { existe: false };

  const owner = sesion[USER_FIELD] || '';

  if (!userId) {
    console.warn(`${TAG} acceso sin userId a la sesión ${sessionId} — denegado`);
    return { existe: true, propia: false, sesion };
  }
  if (owner !== userId) {
    console.warn(`${TAG} userId=${userId} intentó acceder a sesión de "${owner}"`);
    return { existe: true, propia: false, sesion };
  }
  return { existe: true, propia: true, sesion };
}

async function _getHistorial(sessionId) {
  const res = await wixData.query(C_MESSAGES)
    .eq('sessionRef', sessionId)
    .ascending('orden')
    .limit(HISTORY_LIMIT * 2)
    .find(AUTH);
  return (res.items || []).map(m => ({
    role: m.rol === 'user' ? 'user' : 'assistant',
    content: m.contenido
  }));
}

/**
 * Guarda el turno.
 *
 * ⚠️ READ-MERGE-UPDATE obligatorio: wixData.update REEMPLAZA el documento
 * entero. Un update parcial borra los campos que no se le pasan.
 *
 * ⚠️ NO se lleva contador de mensajes. AKIRA lo tiene y su propia guía lo
 * documenta como error: el contador lo sube un update posterior cuyo fallo se
 * traga un catch, se desincroniza, y un filtro por él deja la barra lateral
 * vacía. Contar lo real es una query más y es la verdad.
 */
async function _guardarMensajes(sessionId, query, respuesta) {
  const res = await wixData.query(C_MESSAGES)
    .eq('sessionRef', sessionId)
    .descending('orden')
    .limit(1)
    .find(AUTH);

  const orden = res.items.length > 0 ? (Number(res.items[0].orden) || 0) + 1 : 1;
  const now = new Date();

  await wixData.insert(C_MESSAGES, {
    sessionRef: sessionId, rol: 'user', contenido: query, orden, timestamp: now
  }, AUTH);
  await wixData.insert(C_MESSAGES, {
    sessionRef: sessionId, rol: 'assistant', contenido: respuesta, orden: orden + 1, timestamp: now
  }, AUTH);

  try {
    const sesion = await wixData.get(C_SESSIONS, sessionId, AUTH);
    if (sesion) {
      const merged = { ...sesion };
      merged.fechaActualizacion = now;
      await wixData.update(C_SESSIONS, merged, AUTH);
    }
  } catch (e) {
    console.warn(`${TAG} _guardarMensajes: no se pudo tocar la sesión:`, e.message);
  }
}

/**
 * Log.
 *
 * ⚠️ prepMs y apiMs van a SUS PROPIAS COLUMNAS, no metidos dentro del JSON de
 * params. En AKIRA están dentro del JSON y las columnas numéricas existen
 * vacías — lo que impide ordenar por latencia, que es justo para lo que se
 * instrumentó. Pendiente abierto suyo, corregido aquí de origen.
 *
 * Un totalMs único oculta la causa: 204 ms de base de datos contra 43.020 ms
 * de API es una conclusión que un solo número no permite sacar.
 */
function _log(campos) {
  return wixData.insert(C_LOG, {
    timestamp: new Date(),
    query: (campos.query || '').substring(0, 500),
    plano: campos.plano || '',
    modelo: campos.modeloUsado || '',
    degradado: campos.degradado === true,
    prepMs: Number(campos.prepMs) || 0,
    apiMs: Number(campos.apiMs) || 0,
    timeMs: Number(campos.totalMs) || 0,
    corpusChars: Number(campos.corpusChars) || 0,
    corpusTruncado: campos.corpusTruncado === true,
    // v1.0.5 — `datos` (fuentes, consultas, botones) va dentro: sin columnas nuevas.
    params: JSON.stringify({ cache: campos.cacheStats || {}, datos: campos.datos || {} }).substring(0, 1000),
    responseSummary: (campos.respuesta || '').substring(0, 200),
    version: VERSION,
    error: campos.error || ''
  }, AUTH).catch(() => {});
}

// ═══════════════════════════════════════════════════════════════════════════
// NÚCLEO — funciones PURAS, llamables desde http-functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Crea la sesión y devuelve su _id.
 *
 * Función PURA, no webMethod: la llama http-functions.js, que corre SIN
 * sesión de miembro. Un webMethod con SiteMember rechazaría la llamada y
 * rompería la única ruta que usa el widget.
 *
 * PARA QUÉ EXISTE: para que la consola tenga sessionId ANTES de lanzar la
 * pregunta pesada. Sin él no puede arrancar el polling de recuperación del
 * 504, porque un 504 no trae cuerpo del que sacarlo — y entonces la red de
 * seguridad NUNCA protege la primera pregunta de una conversación, que es
 * justo donde vive la pregunta larga. El fallo es invisible en pruebas porque
 * de la segunda en adelante funciona perfectamente.
 *
 * Coste: un insert. Milisegundos. El techo de 14 s ni se acerca.
 */
export async function crearSesionCore({ userId, userName, query, modo } = {}) {
  try {
    const sessionId = await _crearSesion(userId, userName, query, modo);
    console.log(`${TAG} crearSesionCore OK sessionId=${sessionId}`);
    return { ok: true, sessionId };
  } catch (err) {
    console.error(`${TAG} crearSesionCore EXCEPTION:`, err.message || err);
    return { ok: false, error: err.message || 'No he podido abrir la conversación.' };
  }
}

/**
 * Lógica principal. Función pura async, llamada desde http-functions.js.
 *
 * SOBRE EL TECHO DE 14 s (medido, no supuesto):
 *   Wix corta la CONEXIÓN al cliente a los ~14 s, tanto en webMethod como en
 *   http-function: no hay ruta rápida. Pero el backend SIGUE EJECUTÁNDOSE y
 *   termina de guardar en CentriMessages. Por eso la consola hace polling: si
 *   recibe 504, va a buscar la respuesta al historial.
 *
 *   ⛔ NO INTENTAR SSE. Está medido que el runtime no acepta streams (ni
 *      ReadableStream ni stream.Readable): el helper de respuesta serializa
 *      con JSON.stringify y cierra. NO REINTENTAR.
 */
export async function askCentriCore({ sessionId, query, userId, userName, modo }) {
  const tIn = Date.now();
  console.log(`${TAG} askCentriCore IN sessionId=${sessionId || 'nueva'} modo=${modo || '-'} query="${(query || '').substring(0, 50)}…"`);

  try {
    if (!query || !String(query).trim()) {
      return { ok: false, error: 'query obligatoria' };
    }

    // ── PREP: lecturas independientes EN PARALELO ──
    // Nada que no dependa entre sí debe correr en serie.
    const apiKeyPromise = getSecret(SECRET_API).catch(e => {
      console.error(`${TAG} secret ${SECRET_API} no accesible:`, e.message);
      return null;
    });

    const [alignments, documentos, empresa] = await Promise.all([
      _getAlignments(),
      _getDocumentos(),
      _getConfig()
    ]);

    // El endpoint es público: el plano se valida contra la lista cerrada.
    const plano = _planoPedido(modo);
    const config = _alignmentDelPlano(alignments, plano);
    const documentosDelPlano = _filtrarDocsPorPlano(documentos, plano);

    // v1.0.5 — datos y acciones del plano, tal y como están PUBLICADOS.
    const fuentes = _leerFuentes(config);
    const reg = _nuevoRegistroAcciones();
    const herramientas = fuentes.colecciones.length > 0
      ? { tool: _herramientaDatos(fuentes), ejecutar: (input) => _consultarDatos(input, fuentes, reg) }
      : null;

    const prepMs = Date.now() - tIn;
    const corpusChars = documentosDelPlano.reduce(
      (n, d) => n + ((d && d.contenido) ? d.contenido.length : 0), 0);
    const tope = _docCharsDelPlano(plano);
    const corpusTruncado = corpusChars > tope;

    // Log de preparación. Es la línea que destapa los fallos silenciosos:
    // un `align=por defecto` significa que la fila no está publicada o le
    // falta el plano; un `docs=` que no cuadre significa que alguna celda de
    // plano quedó vacía y ese documento se fue al corpus por defecto.
    console.log(`${TAG} PREP ${prepMs}ms: plano=${plano} align=${config ? 'v' + (config.version || '?') : 'por defecto'} docs=${documentos.length}→${documentosDelPlano.length} corpus=${corpusChars}/${tope} fuentes=${fuentes.colecciones.map(c => c.id).join(',') || '-'}`);

    if (corpusTruncado) {
      console.warn(`${TAG} ⚠️ el corpus del plano '${plano}' excede el presupuesto: se truncará en ${tope} chars`);
    }
    if (!config) {
      console.warn(`${TAG} sin alignment publicado para '${plano}' — identidad por defecto DE ESE PLANO`);
    }

    const apiKey = await apiKeyPromise;
    if (!apiKey) {
      return { ok: false, error: `Configuración incompleta: falta el secret ${SECRET_API}.` };
    }

    const systemBlocks = _buildSystemBlocks({
      config, documentos: documentosDelPlano, empresa, plano, fuentes
    });

    // ── SESIÓN E HISTORIAL ──
    // Sesión nueva: se crea EN PARALELO con la llamada al modelo. Su _id solo
    // hace falta al guardar. (Patrón CATHOVIA, −250 ms.)
    let messages = [];
    let sessionPromise;

    if (!sessionId) {
      sessionPromise = _crearSesion(userId, userName, query, plano);
    } else {
      // ⚠️ Guardia de propiedad también AQUÍ. Sin ella, cualquiera con un
      // sessionId ajeno continuaría la conversación de otra empresa.
      const prop = await _verificarPropiedad(sessionId, userId);
      if (prop.existe && !prop.propia) {
        return { ok: false, error: 'No tienes acceso a esta conversación.' };
      }
      if (!prop.existe) {
        // La sesión no existe: se abre una nueva en lugar de fallar.
        sessionPromise = _crearSesion(userId, userName, query, plano);
      } else {
        sessionPromise = Promise.resolve(sessionId);
        // v1.0.5 — los botones de turnos anteriores viajan como su etiqueta:
        // el modelo no ve nunca un [[BTN:...]] que pudiera imitar.
        messages = (await _getHistorial(sessionId)).map(m =>
          m.role === 'assistant' ? { role: m.role, content: _textoParaModelo(m.content) } : m);
      }
    }

    messages.push({ role: 'user', content: String(query) });

    // ── MODELO ──
    let r;
    try {
      r = await _callConFallback(apiKey, systemBlocks, messages, herramientas);
    } catch (err) {
      console.error(`${TAG} el modelo no respondió:`, err.message);
      try { await sessionPromise; } catch (_) {}
      _log({ query, plano, error: err.message, totalMs: Date.now() - tIn, prepMs, corpusChars, corpusTruncado,
             datos: { fuentes: fuentes.colecciones.map(c => c.id) } });
      return { ok: false, error: 'El servicio no responde ahora mismo. Reinténtalo en unos segundos.' };
    }

    const { modeloUsado, degradado, timeMs: apiMs, cacheStats } = r;

    // v1.0.5 — marcadores → botones con el dato real (o fuera, si no valen).
    const respuesta = _resolverMarcadores(r.respuesta, reg, fuentes.preguntas);
    const datos = {
      fuentes: fuentes.colecciones.map(c => c.id),
      consultas: r.consultas || 0,
      botones: _contarBotones(respuesta)
    };

    let effectiveSessionId;
    try {
      effectiveSessionId = await sessionPromise;
    } catch (e) {
      console.error(`${TAG} _crearSesion falló:`, e.message);
      return { ok: false, error: 'No he podido abrir la conversación. Reinténtalo.' };
    }

    if (!respuesta) {
      return { ok: false, error: 'No he podido generar respuesta. Reformula la pregunta.' };
    }

    await _guardarMensajes(effectiveSessionId, String(query), respuesta);

    const totalMs = Date.now() - tIn;
    _log({ query, respuesta, plano, modeloUsado, degradado, prepMs, apiMs, totalMs, cacheStats, corpusChars, corpusTruncado, datos });

    console.log(`${TAG} askCentriCore OUT total=${totalMs}ms (prep=${prepMs}ms api=${apiMs}ms) modelo=${modeloUsado}${degradado ? ' ⚠️DEGRADADO' : ''} cache=${cacheStats.hit}/${cacheStats.create} len=${respuesta.length} consultas=${datos.consultas} botones=${datos.botones}`);

    return { ok: true, respuesta, sessionId: effectiveSessionId };

  } catch (err) {
    console.error(`${TAG} askCentriCore EXCEPTION:`, err);
    _log({ query, error: err.message || String(err), totalMs: Date.now() - tIn });
    return { ok: false, error: 'Error técnico: ' + (err.message || 'desconocido') };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// WEB METHODS — los llama el page code
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ⚠️ Permissions.Anyone, NO SiteMember, y no es dejadez.
 *
 * El acceso a la consola lo controla el permiso de PÁGINA de Wix Members.
 * Exigir SiteMember en los métodos rompe llamadas legítimas desde las páginas
 * y, sobre todo, dejaría estos métodos inutilizables si algún día los llama
 * un endpoint HTTP (que corre sin sesión de usuario).
 *
 * La separación por persona NO se apoya en el permiso del método: se apoya en
 * userId y en la guardia de propiedad. Ver _verificarPropiedad.
 */
export const centriAbrir = webMethod(
  Permissions.Anyone,
  async () => {
    try {
      const [alignments, empresa] = await Promise.all([_getAlignments(), _getConfig()]);

      // Textos de bienvenida por plano.
      // ⚠️ Solo se devuelve lo que Centrimerca haya escrito de verdad: los
      // vacíos NO se mandan, para que la consola conserve su texto de fábrica.
      // Un campo en blanco por descuido no puede dejar la pantalla muda.
      const planos = {};
      for (const p of PLANOS_VALIDOS) {
        const a = _alignmentDelPlano(alignments, p);
        if (!a) continue;
        const bloque = {};
        if (a.welcomeTitle && String(a.welcomeTitle).trim()) bloque.welcomeTitle = String(a.welcomeTitle).trim();
        if (a.welcomeText  && String(a.welcomeText).trim())  bloque.welcome      = String(a.welcomeText).trim();
        if (a.placeholder  && String(a.placeholder).trim())  bloque.placeholder  = String(a.placeholder).trim();
        if (Object.keys(bloque).length > 0) planos[p] = bloque;
      }

      const config = _alignmentDelPlano(alignments, PLANO_DEFECTO) || (alignments[0] || null);

      return {
        ok: true,
        sessionId: null,          // cada visita arranca en welcome
        brandName: (empresa && empresa.brandName) || '',
        logoUrl:   (empresa && empresa.logoUrl) || '',
        disclaimer: (empresa && empresa.disclaimer) || '',
        planos,
        alignment: config
          ? { version: config.version || '1.0', tone: config.tone || 'directo' }
          : null
      };
    } catch (e) {
      console.error(`${TAG} centriAbrir EXCEPTION:`, e);
      return { ok: false, error: e.message };
    }
  }
);

/**
 * Lista las conversaciones del usuario.
 *
 * ⚠️ MÉTODO CATHOVIA — FALLA CERRADO. Sin userId devuelve lista VACÍA.
 *    AKIRA aquí degrada a "sin filtrar" y enseña las conversaciones de todos.
 *    Con miembros de empresas distintas eso no es aceptable.
 *
 * ⚠️ NO se filtra por un contador de mensajes. Se cuentan los mensajes REALES.
 *    Un contador auxiliar "para optimizar" se desincroniza en cuanto un update
 *    falla dentro de un catch, y entonces ninguna sesión pasa el filtro y la
 *    barra lateral sale vacía. Es una query más por chat y es la verdad.
 */
export const centriListarChats = webMethod(
  Permissions.Anyone,
  async ({ userId, limit }) => {
    console.log(`${TAG} centriListarChats IN userId=${userId || 'anon'}`);
    try {
      if (!userId) {
        console.warn(`${TAG} centriListarChats sin userId → lista vacía (falla cerrado)`);
        return { ok: true, chats: [] };
      }

      const result = await wixData.query(C_SESSIONS)
        .eq(USER_FIELD, userId)
        .descending('fechaActualizacion')
        .limit(limit || 30)
        .find(AUTH);

      const items = result.items || [];

      const chatsRaw = await Promise.all(items.map(async (s) => {
        let preview = '';
        let hasUserMsg = false;
        try {
          const lastMsg = await wixData.query(C_MESSAGES)
            .eq('sessionRef', s._id)
            .eq('rol', 'user')
            .descending('orden')
            .limit(1)
            .find(AUTH);
          if (lastMsg.items.length > 0) {
            preview = (lastMsg.items[0].contenido || '').substring(0, 90);
            hasUserMsg = true;
          }
        } catch (_) { /* sin preview */ }
        return {
          id: s._id,
          titulo: s.title || 'Conversación',
          fecha: s.fechaActualizacion || s._createdDate,
          preview,
          _hasUserMsg: hasUserMsg
        };
      }));

      // Las sesiones huérfanas (abiertas y abandonadas antes de preguntar) no
      // se enseñan. Existen porque la sesión se crea ANTES de la pregunta.
      const chats = chatsRaw
        .filter(c => c._hasUserMsg)
        .map(({ _hasUserMsg, ...c }) => c);

      console.log(`${TAG} centriListarChats OUT ${chats.length}/${items.length} sesiones`);
      return { ok: true, chats };

    } catch (err) {
      console.error(`${TAG} centriListarChats EXCEPTION:`, err);
      return { ok: false, error: err.message, chats: [] };
    }
  }
);

/**
 * Abre una conversación.
 *
 * ⚠️ CON GUARDIA DE PROPIEDAD. CATHOVIA no la tiene aquí: acepta cualquier
 *    sessionId y devuelve los mensajes. Extensión deliberada.
 */
export const centriAbrirChat = webMethod(
  Permissions.Anyone,
  async ({ sessionId, userId }) => {
    console.log(`${TAG} centriAbrirChat IN sessionId=${sessionId} userId=${userId || 'anon'}`);
    try {
      if (!sessionId) return { ok: false, error: 'sessionId requerido' };

      const prop = await _verificarPropiedad(sessionId, userId);
      if (!prop.existe) return { ok: false, error: 'Esa conversación ya no existe.' };
      if (!prop.propia) return { ok: false, error: 'No tienes acceso a esta conversación.' };

      const result = await wixData.query(C_MESSAGES)
        .eq('sessionRef', sessionId)
        .ascending('orden')
        .limit(200)
        .find(AUTH);

      const mensajes = (result.items || []).map(m => ({
        rol: m.rol,
        contenido: m.contenido,
        timestamp: m.timestamp
      }));

      // v1.0.4 — el plano guardado, para que el front restituya el chip.
      // `_verificarPropiedad` ya trajo la fila: no hace falta otra query.
      // Si la sesión es anterior al campo, o trae basura, se devuelve null y
      // el front NO toca el chip. Nunca el plano por defecto (ver cabecera).
      const guardado = (prop.sesion && prop.sesion.modo)
        ? String(prop.sesion.modo).trim().toLowerCase()
        : '';
      const modo = PLANOS_VALIDOS.indexOf(guardado) >= 0 ? guardado : null;

      console.log(`${TAG} centriAbrirChat OUT ${mensajes.length} mensajes modo=${modo || 'sin guardar'}`);
      return { ok: true, sessionId, mensajes, modo };

    } catch (err) {
      console.error(`${TAG} centriAbrirChat EXCEPTION:`, err);
      return { ok: false, error: err.message };
    }
  }
);

/**
 * Borra una conversación y todos sus mensajes.
 *
 * El borrado de mensajes va POR LOTES con paginación: una sesión larga no
 * cabe en una sola query y borrar "los primeros 50" dejaría huérfanos.
 */
export const centriBorrarChat = webMethod(
  Permissions.Anyone,
  async ({ sessionId, userId }) => {
    console.log(`${TAG} centriBorrarChat IN sessionId=${sessionId} userId=${userId || 'anon'}`);
    try {
      if (!sessionId) return { ok: false, error: 'sessionId requerido' };

      const prop = await _verificarPropiedad(sessionId, userId);
      if (!prop.existe) {
        // Ya no estaba. No es un error desde el punto de vista del usuario.
        return { ok: true, sessionId, alreadyGone: true };
      }
      if (!prop.propia) {
        return { ok: false, error: 'No tienes permiso para borrar esta conversación.' };
      }

      let deletedMsgs = 0;
      while (true) {
        const batch = await wixData.query(C_MESSAGES)
          .eq('sessionRef', sessionId)
          .limit(50)
          .find(AUTH);
        const items = batch.items || [];
        if (items.length === 0) break;
        await Promise.all(items.map(m => wixData.remove(C_MESSAGES, m._id, AUTH).catch(() => null)));
        deletedMsgs += items.length;
        if (items.length < 50) break;
      }

      await wixData.remove(C_SESSIONS, sessionId, AUTH);

      console.log(`${TAG} centriBorrarChat OUT ${deletedMsgs} mensajes + sesión`);
      return { ok: true, sessionId, deletedMsgs };

    } catch (err) {
      console.error(`${TAG} centriBorrarChat EXCEPTION:`, err);
      return { ok: false, error: 'Error técnico: ' + (err.message || 'desconocido') };
    }
  }
);

/* ═══════════════════════════════════════════════════════════════════════════
 * VERIFICACIÓN TRAS DESPLEGAR
 * ═══════════════════════════════════════════════════════════════════════════
 * En Site Monitoring, por cada pregunta debe salir:
 *
 *   PREP <ms>: plano=<p> align=v<n> docs=<total>→<delPlano> corpus=<chars>/<tope>
 *
 *   · align=por defecto  → la fila del alignment no está publicada, o le falta
 *                          el campo `modo`.
 *   · docs= que no cuadre → alguna celda `modo` quedó vacía y ese documento se
 *                          fue al corpus del plano por defecto (dudas).
 *   · corpus= sobre el tope → se está truncando (sale además un console.warn).
 *   · ⚠️DEGRADADO en la línea OUT → respondió el modelo de respaldo.
 *
 *   v1.0.5:
 *   · PREP ... fuentes=<ids>  → colecciones que el plano tiene PUBLICADAS en
 *     el Entrenador. fuentes=- → el plano no usa datos (una sola llamada).
 *   · consultar_datos fuente=<id> busqueda="…" → <n> filas  → cada consulta.
 *   · OUT ... consultas=<n> botones=<n>  → cuántas veces leyó datos y cuántos
 *     botones salieron en la respuesta.
 *   · "fuentes BLOQUEADAS descartadas" → alguien marcó a mano una colección
 *     prohibida en el CMS; no se ha leído.
 *
 * Y el circuito del 504, en la consola del navegador:
 *
 *   sesión abierta antes de preguntar: <id> → centriAsk HTTP 504 → startPolling
 *   → entrada sobre el intento 14-15 de 20 (≈43 s sobre ventana de 60 s)
 * ═══════════════════════════════════════════════════════════════════════════
 */
