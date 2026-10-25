/* ═══════════════════════════════════════════════════════════════════════════
 * CENTRIMERCA — CENTRI SALES · Clientes (Wix Velo)
 * Archivo:  backend/centriSalesClientes.web.js
 * VERSION:  1.3.0
 * FECHA:    25 Octubre 2026
 *
 * v1.3.0 — 25 OCT 2026 · DÓNDE VA CADA DATO (decisión de Jal al importar
 *   los 2.167 clientes del ERP):
 *     · Nombre del contacto (info.name.first) = NOMBRE COMERCIAL → negocio.
 *     · Compañía (info.company)              = NOMBRE FISCAL.
 *   Cambios:
 *     · formatearContacto: negocio sale del nombre; nombreFiscal de company.
 *       Dirección: addressLine (lo que guarda la importación) o
 *       streetAddress.name, más la ciudad; si no, formatted.
 *     · _puntuar: compara con el nombre comercial y con el fiscal.
 *     · _paraApp: `persona` lleva el nombre fiscal cuando es distinto del
 *       comercial (la app lo enseña si no hay dirección).
 *     · centriSalesCrearCliente: el nombre del negocio va a info.name.first.
 *       La persona de contacto ya no tiene sitio y no se guarda (la app
 *       v1.0.1 ya no la pide). El nombre fiscal no se conoce en el alta.
 *
 * v1.2.1 — 25 OCT 2026 · Único cambio: ROL_AUTORIZADO pasa de 'Centri Sales'
 *   a 'AppVentas' (nombre real del rol en el site).
 *
 * v1.2.1 — 25 OCT 2026 · Único cambio: ROL_AUTORIZADO pasa de 'Centri Sales'
 *   a 'AppVentas' (nombre real del rol en el site).
 *
 * ───────────────────────────────────────────────────────────────────────────
 * CAMBIOS v1.1.0 → v1.2.0 — COORDENADAS DEL CLIENTE EN CAMPOS PERSONALIZADOS
 * ───────────────────────────────────────────────────────────────────────────
 *   Campos personalizados de contacto creados por Jal el 25-oct, tipo
 *   «Número (decimal)», sin PII, con la clave fijada al crearlos (no se puede
 *   cambiar después). Leídos por API el 25-oct: custom.latitud y
 *   custom.longitud, dataType NUMBER. Comprobado en el site con un contacto
 *   de prueba (borrado): guardan y devuelven 6 decimales (40.388123,
 *   -3.701234).
 *   Por eso la clave va FIJA (F_LATITUD / F_LONGITUD) y no se resuelve por
 *   nombre en cada llamada como en fichaClienteLogic (KAMISUITE): allí las
 *   claves las generaba Wix con sufijos imprevisibles; aquí las fijó Jal.
 *   1. formatearContacto: `ubicacion` sale de esos dos campos. Ya NO se lee
 *      address.location.
 *   2. centriSalesCrearCliente acepta ubicacion { lat, lon } (el GPS del
 *      móvil en la puerta del cliente) y la guarda en extendedFields dentro
 *      del mismo createContact (patrón custom.sexo de crearContactoCRM y
 *      lopdClientes). Se redondea a 6 decimales (~0,1 m), lo comprobado.
 *      Una ubicación no válida NO bloquea el alta: se avisa en el log y el
 *      cliente se crea sin coordenadas.
 *   Pendiente para el flujo del informe: escribir las coordenadas de un
 *   cliente que ya existe (READ-MERGE-UPDATE con revision, patrón
 *   updatePerfilCliente de clienteAreaLogic). No está en esta versión.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * CAMBIOS v1.0.0 → v1.1.0 — ACCESO: ROL DE MIEMBRO + COLECCIÓN `equipo`
 * ───────────────────────────────────────────────────────────────────────────
 *   Fuera CentriAdmins. Los usuarios de Centri Sales son personas de la
 *   colección `equipo` con un rol de miembro propio (decisión de Jal,
 *   25-oct-2026, como en Cathovia). La app vive en una página solo para
 *   miembros con ese rol. _reconocerComercial() exige las TRES cosas:
 *     1. Sesión de miembro (email de acceso con el fieldset FULL).
 *     2. El rol ROL_AUTORIZADO (currentMember.getRoles()). Los permisos de
 *        página NO protegen un webMethod: sin esta comprobación cualquier
 *        miembro con sesión podría llamarlo, y en este site los clientes
 *        B2B también son miembros.
 *     3. Su email de acceso en UNA sola ficha de `equipo`. Así se sabe quién
 *        es (nombre, rol y foto para la pantalla de Inicio).
 *        ⚠️ En `equipo` hay emails compartidos (contacto@centrimerca.com en
 *        10 fichas, leído el 25-oct). Un email que esté en varias fichas NO
 *        identifica a nadie: se deniega.
 *        `activo` NO cuenta: es «visible en la web», no «usa la app».
 *   NUEVO webMethod centriSalesQuienSoy(): devuelve nombre, rol y foto del
 *   comercial reconocido, para la cabecera de Inicio.
 *   La búsqueda y el alta no cambian de firma; las respuestas de acceso
 *   denegado siguen siendo { ok:false, error:{ code:'SIN_ACCESO' } }.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * QUÉ ES
 * ───────────────────────────────────────────────────────────────────────────
 * Búsqueda y alta de clientes de Centri Sales. Los clientes viven en los
 * CONTACTOS del site (decisión de Jal, 25-oct-2026): no hay colección propia
 * ni copia en el CMS. Se distinguen del resto de contactos (miembros,
 * formularios) por dos etiquetas, creadas en el site el 25-oct:
 *   · «Cliente»   (clave custom.cliente-CXFcs)
 *   · «Prospecto» (clave custom.prospecto-2Zyjg) — los que da de alta un
 *     comercial desde la app; pasan a Cliente cuando se den de alta en G5.
 * Las claves llevan un sufijo aleatorio: aquí NO se escriben, se resuelven
 * por nombre con findOrCreateLabel (patrón de adserverLogic).
 *
 * Dónde va cada dato en el contacto:
 *   · Nombre comercial → info.name.first (v1.3.0).
 *   · Nombre fiscal → info.company (v1.3.0).
 *   · Teléfono, email → phones / emails.
 *   · Dirección → addresses[0].address (addressLine o streetAddress.name,
 *     city; formatted como último recurso).
 *   · Coordenadas → campos personalizados custom.latitud / custom.longitud
 *     (v1.2.0).
 *
 * Tres webMethods, para llamarlos desde el page code (con sesión de miembro):
 *   · centriSalesQuienSoy() (v1.1.0)
 *       Nombre, rol y foto del comercial, de su ficha de `equipo`.
 *   · centriSalesBuscarCliente({ texto })
 *       Devuelve las MAX_COINCIDENCIAS más parecidas al nombre dicho por voz.
 *       La comparación es tolerante (acentos, mayúsculas, palabras de más o
 *       de menos, erratas): «la huerta» encuentra «Frutería La Huerta».
 *   · centriSalesCrearCliente({ negocio, telefono, persona?, email?,
 *                               direccion?, confirmado?, allowDuplicates? })
 *       Alta con la etiqueta Prospecto. Antes de crear, avisa si ya hay un
 *       cliente con un nombre muy parecido (POSIBLES_DUPLICADOS) y, si el
 *       teléfono ya existe, devuelve TELEFONO_DUPLICADO. El comercial
 *       confirma y la app reenvía con confirmado / allowDuplicates.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * POR QUÉ LA BÚSQUEDA ES EN EL SERVIDOR (y no en el móvil)
 * ───────────────────────────────────────────────────────────────────────────
 *   · Por un endpoint público (/_functions/) la lista de clientes quedaría
 *     al alcance de cualquiera que conozca la ruta. No.
 *   · Por el page code, la lista entera no cabe: los atributos del custom
 *     element truncan en silencio por encima de ~64 KB (aviso de CENTRI).
 *   Así que el servidor carga los clientes, compara y devuelve solo las 3
 *   mejores coincidencias: una respuesta pequeña, detrás de la sesión.
 *
 *   CACHÉ EN MEMORIA del servidor durante CACHE_MS (mismo patrón que
 *   _extendedFieldsCache de fichaClienteLogic, 5 min). NO es una copia
 *   guardada: se pierde sola y se vacía al dar de alta un cliente. Evita
 *   volcar los contactos en cada búsqueda (en KALÓNICE, 4.619 contactos
 *   tardaron 13 s; aquí se piden solo los de las dos etiquetas).
 *
 * ───────────────────────────────────────────────────────────────────────────
 * PROCEDENCIA (no inventada)
 * ───────────────────────────────────────────────────────────────────────────
 *   · _reconocerComercial() (v1.1.0), por partes:
 *     - Sesión y email: COPIA LITERAL del bloque de _exigirAdmin() de
 *       centriEntrenador.web.js v1.0.3 (fieldset FULL, loginEmail o
 *       contactDetails.emails).
 *     - Rol: COPIA LITERAL del bloque ROL_AUTORIZADO de _exigirAdmin() de
 *       cathoviaEntrenador.web.js v1.0.1 (veriahumanitas). Solo cambian los
 *       textos [SALES]. ⚠️ En Cathovia ROL_AUTORIZADO está vacío, así que esa
 *       rama no se ha ejecutado nunca en producción; la forma de los roles
 *       (_id, title) es la de la documentación de currentMember.getRoles().
 *     - Ficha en `equipo`: leer las filas y comparar el email en memoria,
 *       mismo patrón que la comparación con CentriAdmins de _exigirAdmin().
 *       Field keys de `equipo` y _imgUrl(): de centriFichaContacto.web.js
 *       v1.0.1 (_imgUrl idéntico en centriEquipo y centriCatalogo).
 *   · Volcado paginado skip/limit 1000 con tope: cargarTodosContactos de
 *     recepcionLogic.web.js v2.1.0 (KAMISUITE).
 *   · Filtro por etiqueta .hasSome('info.labelKeys', [...]) y
 *     elevate(contacts.findOrCreateLabel) → label.key: adserverLogic.web.js
 *     v1.0.0 (KAMISUITE).
 *   · formatearContacto(): copia literal de contactLookup.web.js (KAMISUITE,
 *     cabecera v1.2.0), ampliada con negocio, dirección y tipo [SALES].
 *   · normNombre, NICK, canonTok, lev, tokenSim, nameScore y FUZZY_MIN:
 *     COPIA LITERAL de contactLookup.web.js (cabecera v1.2.0).
 *   · Alta: elevate(contacts.createContact) con { allowDuplicates,
 *     suppressAuth } y lectura estructurada de DUPLICATE_CONTACT_EXISTS:
 *     crearContactoCRM de fichaClienteLogic.web.js v1.9.15 (KAMISUITE).
 *     Dirección: patrón de lopdClientes.web.js v1.2.0 (streetAddress.name +
 *     formatted, arrays directos).
 *   · info.company y labelKeys (array plano) en createContact: según el
 *     ejemplo «full object» de la documentación de wix-crm-backend
 *     (createContact). No había uso previo en el código de KAMISUITE.
 *   · Etiqueta de dirección 'WORK': valor de AddressTag de la API de
 *     contactos (HOME, WORK, BILLING, SHIPPING, UNTAGGED). lopdClientes usa
 *     'HOME' (domicilio de una persona); aquí es un negocio.
 *
 * ⚠️ REGLA DE INTERFAZ: ningún texto que llegue al usuario nombra la
 *    plataforma. Los errores salen con código y texto en español.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { webMethod, Permissions } from 'wix-web-module';
import wixData from 'wix-data';
import { currentMember } from 'wix-members-backend';
import { elevate } from 'wix-auth';
import { contacts } from 'wix-crm-backend';

const VERSION = '1.3.0';
const TAG = `[CentriSalesClientes][${VERSION}]`;
const AUTH = { suppressAuth: true };

// ── Usuarios de la app (v1.1.0) ─────────────────────────────────────────────
// Rol de miembro exigido (nombre o _id del rol). ⚠️ El rol tiene que llamarse
// EXACTAMENTE así en los roles de miembro del site. No dejarlo vacío: vacío =
// basta con tener sesión, y en este site los clientes B2B también son miembros.
const ROL_AUTORIZADO = 'AppVentas';

const C_EQUIPO = 'equipo';   // ID real (minúscula), el mismo que centriEquipo.web.js
const LIMITE_EQUIPO = 1000;  // idéntico a LIMITE de centriEquipo.web.js

// Field keys de `equipo` (esquema real, de centriFichaContacto.web.js v1.0.1)
const F_EQUIPO = {
  nombre: 'nombre',
  rol:    'rol',
  imagen: 'imagen',
  email:  'email'
};

// ── Coordenadas del cliente (v1.2.0) ────────────────────────────────────────
// Campos personalizados de contacto, «Número (decimal)». Claves leídas por API
// el 25-oct-2026; las fijó Jal al crearlos y no se pueden cambiar.
const F_LATITUD  = 'custom.latitud';
const F_LONGITUD = 'custom.longitud';
const DECIMALES_COORD = 6;   // comprobado en el site: guarda y devuelve 6

// Etiquetas de los contactos que son clientes (nombre visible, no la clave).
const ETIQUETA_CLIENTE   = 'Cliente';
const ETIQUETA_PROSPECTO = 'Prospecto';

// Coincidencias que se devuelven a la app (la UI v1 enseña 3 tarjetas).
const MAX_COINCIDENCIAS = 3;

// A partir de este parecido, un alta nueva se avisa como posible duplicado.
// Más exigente que FUZZY_MIN (0,70), que es para sugerir en la búsqueda.
const DUPLICADO_MIN = 0.85;

// Caché en memoria del servidor (patrón fichaClienteLogic, 5 min).
const CACHE_MS = 5 * 60 * 1000;
let _cacheClientes = null;
let _cacheClientesTs = 0;

function safeErr(e) {
  return { name: (e && e.name) || 'Error', message: (e && e.message) || String(e) };
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTROL DE ACCESO (v1.1.0) — sesión + rol de miembro + ficha en `equipo`
// ═══════════════════════════════════════════════════════════════════════════

function _txt(v) { return (v === null || v === undefined) ? '' : String(v).trim(); }

/* wix:image://v1/<mediaId>/<file>#...  →  https://static.wixstatic.com/media/<mediaId>
   COPIA LITERAL de _imgUrl de centriFichaContacto.web.js v1.0.1
   (idéntico a centriEquipo.web.js / centriCatalogo.web.js) */
function _imgUrl(uri) {
  if (!uri || typeof uri !== 'string') { return ''; }
  if (uri.indexOf('http') === 0) { return uri; }
  const m = uri.match(/wix:image:\/\/v1\/([^/]+)/);
  return m ? ('https://static.wixstatic.com/media/' + m[1]) : '';
}

/**
 * Reconoce al comercial que llama. Exige:
 *   1. sesión de miembro;
 *   2. el rol ROL_AUTORIZADO;
 *   3. su email de acceso en UNA sola ficha de `equipo`.
 *
 * Devuelve { ok:true, memberId, email, comercial:{ id, nombre, rol, foto } }
 * o { ok:false, error }.
 *
 * ⚠️ FALLA CERRADO. Sin sesión, sin el rol, sin ficha, con el email en varias
 * fichas o con error de lectura → NO autorizado.
 */
async function _reconocerComercial() {
  let memberId = '';
  let email = '';

  // ── 1. Sesión y email — COPIA LITERAL de _exigirAdmin() de centriEntrenador v1.0.3 ──

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

  // ── 2. Rol — COPIA LITERAL del bloque de _exigirAdmin() de cathoviaEntrenador v1.0.1 ──
  //       (solo cambian los textos, marcados [SALES])
  if (ROL_AUTORIZADO) {
    try {
      const roles = (await currentMember.getRoles()) || [];
      const tiene = roles.some(r => r && (r._id === ROL_AUTORIZADO || r.title === ROL_AUTORIZADO));
      if (!tiene) {
        console.warn(`${TAG} acceso DENEGADO a Centri Sales: memberId=${memberId} sin el rol "${ROL_AUTORIZADO}"`);   // [SALES]
        return { ok: false, error: 'No tienes acceso a Centri Sales.' };   // [SALES]
      }
    } catch (e) {
      console.error(`${TAG} no se pudieron leer los roles — se deniega el acceso:`, e.message);
      return { ok: false, error: 'No se pudo verificar el rol de acceso.' };
    }
  }

  // ── 3. Ficha en `equipo` por el email de acceso ──
  if (!email) {
    console.warn(`${TAG} acceso DENEGADO: memberId=${memberId} sin email de acceso legible`);
    return { ok: false, error: 'No se pudo leer tu email de acceso.' };
  }

  try {
    // Se leen las filas y se comparan en memoria (mismo motivo que en
    // _exigirAdmin de centriEntrenador: mayúsculas y espacios del CMS).
    // `activo` NO se filtra: es «visible en la web», no «usa la app».
    const res = await wixData.query(C_EQUIPO)
      .limit(LIMITE_EQUIPO)
      .find(AUTH);

    const filas = res.items || [];
    const coinciden = filas.filter(f => _txt(f[F_EQUIPO.email]).toLowerCase() === email);

    if (coinciden.length === 0) {
      console.warn(`${TAG} acceso DENEGADO: email=${email} no está en ${C_EQUIPO} (${filas.length} fichas)`);
      return { ok: false, error: 'No estás dado de alta en el equipo de Centri Sales.' };
    }
    if (coinciden.length > 1) {
      // Email compartido (p. ej. el genérico de la empresa): no identifica a nadie.
      console.warn(`${TAG} acceso DENEGADO: email=${email} está en ${coinciden.length} fichas de ${C_EQUIPO}`);
      return { ok: false, error: 'Tu email está en varias fichas del equipo. Hace falta uno propio.' };
    }

    const it = coinciden[0];
    return {
      ok: true,
      memberId,
      email,
      comercial: {
        id:     it._id,
        nombre: _txt(it[F_EQUIPO.nombre]),
        rol:    _txt(it[F_EQUIPO.rol]),
        foto:   _imgUrl(it[F_EQUIPO.imagen])
      }
    };

  } catch (e) {
    // Colección ilegible. Se deniega.
    console.error(`${TAG} no se pudo leer ${C_EQUIPO} — se deniega el acceso:`, e.message);
    return { ok: false, error: 'No se pudo verificar el acceso.' };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FORMATO DEL CONTACTO
// ═══════════════════════════════════════════════════════════════════════════

// ── Coordenadas (v1.2.0) ────────────────────────────────────────────────────
// extendedFields llega PLANO en wix-crm-backend (crmToolsLogic lee
// c.info.extendedFields['custom.sexo']) y como { items: {...} } en la API de
// contactos v4 (leído por API el 25-oct). Se aceptan las dos formas.
function _valorCampo(ef, key) {
  if (!ef || typeof ef !== 'object') return undefined;
  if (ef[key] !== undefined) return ef[key];
  if (ef.items && typeof ef.items === 'object' && ef.items[key] !== undefined) return ef.items[key];
  return undefined;
}

/** { lat, lon } redondeado a DECIMALES_COORD, o null si falta o no es válido. */
function _coordenadas(lat, lon) {
  if (lat === null || lat === undefined || lat === '' || lon === null || lon === undefined || lon === '') return null;
  const la = Number(lat);
  const lo = Number(lon);
  if (!isFinite(la) || !isFinite(lo)) return null;
  if (la < -90 || la > 90 || lo < -180 || lo > 180) return null;
  const f = Math.pow(10, DECIMALES_COORD);
  return { lat: Math.round(la * f) / f, lon: Math.round(lo * f) / f };
}

function _leerUbicacion(ef) {
  return _coordenadas(_valorCampo(ef, F_LATITUD), _valorCampo(ef, F_LONGITUD));
}

// Copia literal de formatearContacto() de contactLookup.web.js (KAMISUITE).
// [SALES] añade negocio (v1.3.0: el nombre del contacto), nombreFiscal
// (info.company), direccion, ubicacion y tipo.
function formatearContacto(contact, tiposPorClave) {
  const infoName = contact?.info?.name || {};
  const nombre = infoName.first || contact?.name?.first || contact?.firstName || '';
  const apellido = infoName.last || contact?.name?.last || contact?.lastName || '';

  const emailsArray = contact?.info?.emails || contact?.emails || [];
  const emails = Array.isArray(emailsArray) ? emailsArray : [];
  const email = emails[0]?.email || emails[0] || contact?.primaryEmail || '';

  const phonesArray = contact?.info?.phones || contact?.phones || [];
  const phones = Array.isArray(phonesArray) ? phonesArray : [];
  const telefono = phones[0]?.phone || phones[0] || contact?.primaryPhone || '';

  // [SALES] — negocio, nombre fiscal, dirección y tipo de cliente
  // v1.3.0: Nombre = nombre comercial; Compañía = nombre fiscal.
  const negocio = `${nombre} ${apellido}`.trim();
  const nombreFiscal = contact?.info?.company || '';
  const dirArray = contact?.info?.addresses || [];
  const dir0 = (Array.isArray(dirArray) && dirArray[0] && dirArray[0].address) || {};
  // v1.3.0: la importación guarda addressLine + city (leído por API el 25-oct);
  // el alta desde la app guarda streetAddress.name + formatted.
  const calle = dir0.addressLine || (dir0.streetAddress && dir0.streetAddress.name) || '';
  const direccion = calle
    ? [calle, dir0.city].filter(Boolean).join(', ')
    : String(dir0.formatted || '').split('\n')[0];
  // v1.2.0 — coordenadas de los campos personalizados (no de address.location)
  const ubicacion = _leerUbicacion(contact?.info?.extendedFields);
  const claves = Array.isArray(contact?.info?.labelKeys) ? contact.info.labelKeys : [];
  let tipo = '';
  if (tiposPorClave) {
    // Cliente pesa más que Prospecto si tuviera las dos.
    if (claves.some(k => tiposPorClave[k] === 'cliente')) tipo = 'cliente';
    else if (claves.some(k => tiposPorClave[k] === 'prospecto')) tipo = 'prospecto';
  }

  return {
    contactId: contact._id || contact.id,
    nombre: String(nombre).trim(),
    apellido: String(apellido).trim(),
    nombreCompleto: `${nombre} ${apellido}`.trim(),
    email: String(email).trim(),
    telefono: String(telefono).trim(),
    negocio: String(negocio).trim(),          // [SALES] v1.3.0: del nombre
    nombreFiscal: String(nombreFiscal).trim(), // [SALES] v1.3.0: de company
    direccion: String(direccion).trim(),      // [SALES]
    ubicacion,                                // [SALES] v1.2.0: de custom.latitud / custom.longitud
    tipo                                      // [SALES] 'cliente' | 'prospecto'
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// COINCIDENCIA DIFUSA — COPIA LITERAL de contactLookup.web.js (KAMISUITE,
// cabecera v1.2.0): normNombre, NICK, canonTok, lev, tokenSim, nameScore,
// FUZZY_MIN.
// ═══════════════════════════════════════════════════════════════════════════

// Normaliza nombre: minúsculas, sin acentos, espacios colapsados.
function normNombre(s) {
  return String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim();
}

// Apodos/diminutivos comunes → forma canónica (solo tokens 1:1).
const NICK = {
  mari: 'maria', meri: 'maria', mery: 'maria', cuca: 'maria',
  charo: 'rosario', lola: 'dolores', pili: 'pilar', conchi: 'concepcion',
  concha: 'concepcion', tere: 'teresa', chelo: 'consuelo', pepe: 'jose',
  paco: 'francisco', curro: 'francisco', nacho: 'ignacio', quique: 'enrique',
  kike: 'enrique', puri: 'purificacion', inma: 'inmaculada', montse: 'montserrat',
  toni: 'antonio', chus: 'jesus', susi: 'susana'
};
function canonTok(t) { return NICK[t] || t; }

function lev(a, b) {
  a = a || ''; b = b || '';
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[n];
}

// Parecido entre dos tokens de nombre (0..1): apodo / inicial / prefijo / edición.
function tokenSim(a, b) {
  const ca = canonTok(a), cb = canonTok(b);
  if (ca === cb) return 1;
  if (a === b) return 1;
  if ((a.length === 1 && b.startsWith(a)) || (b.length === 1 && a.startsWith(b))) return 0.85; // "M." → "Maria"
  const min = Math.min(a.length, b.length);
  if (min >= 2 && (a.startsWith(b) || b.startsWith(a))) return 0.92; // Mari/Maria, Puri/Puri...
  const maxLen = Math.max(a.length, b.length);
  return 1 - lev(a, b) / maxLen;
}

// Score de parecido entre dos nombres ya tokenizados (0..1).
function nameScore(inTokens, cTokens) {
  if (!inTokens.length || !cTokens.length) return 0;
  const short = inTokens.length <= cTokens.length ? inTokens : cTokens;
  const long = inTokens.length <= cTokens.length ? cTokens : inTokens;
  let sum = 0;
  for (const st of short) {
    let best = 0;
    for (const lt of long) { const s = tokenSim(st, lt); if (s > best) best = s; }
    sum += best;
  }
  const base = sum / short.length;                 // encaje de los tokens del nombre corto
  const lenPenalty = short.length / long.length;   // penaliza sobra de tokens
  return base * (0.6 + 0.4 * lenPenalty);
}

const FUZZY_MIN = 0.70;   // umbral de sugerencia

// ── fin de la copia literal ──

function _tokens(s) {
  return normNombre(s).split(' ').filter(Boolean);
}

/**
 * Parecido de un texto con un cliente: el mejor entre el nombre comercial
 * y el fiscal (v1.3.0). Devuelve la lista ordenada de mayor a menor, solo
 * con los que llegan a `minimo`.
 */
function _puntuar(texto, lista, minimo) {
  const inTok = _tokens(texto);
  if (!inTok.length) return [];
  const out = [];
  for (const c of lista) {
    const sNeg = c.negocio ? nameScore(inTok, _tokens(c.negocio)) : 0;
    const sFis = c.nombreFiscal ? nameScore(inTok, _tokens(c.nombreFiscal)) : 0;
    const score = Math.max(sNeg, sFis);
    if (score >= minimo) out.push({ c, score });
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════
// CARGA DE CLIENTES (contactos con etiqueta Cliente o Prospecto)
// ═══════════════════════════════════════════════════════════════════════════

/** Claves de las dos etiquetas, resueltas por nombre (patrón adserverLogic). */
async function _clavesEtiquetas() {
  const findLabel = elevate(contacts.findOrCreateLabel);
  const [rC, rP] = await Promise.all([
    findLabel(ETIQUETA_CLIENTE),
    findLabel(ETIQUETA_PROSPECTO)
  ]);
  return { cliente: rC.label.key, prospecto: rP.label.key };
}

async function _cargarClientes() {
  const ahora = Date.now();
  if (_cacheClientes && (ahora - _cacheClientesTs) < CACHE_MS) {
    return { lista: _cacheClientes, deCache: true };
  }

  const claves = await _clavesEtiquetas();
  const tiposPorClave = { [claves.cliente]: 'cliente', [claves.prospecto]: 'prospecto' };

  // Volcado paginado: patrón cargarTodosContactos (recepcionLogic v2.1.0),
  // con el filtro por etiqueta de adserverLogic v1.0.0.
  const elevatedQuery = elevate(contacts.queryContacts);
  const todos = [];
  let hasMore = true;
  let skip = 0;
  const pageSize = 1000;

  while (hasMore) {
    const result = await elevatedQuery()
      .hasSome('info.labelKeys', [claves.cliente, claves.prospecto])
      .skip(skip)
      .limit(pageSize)
      .find({ suppressAuth: true });

    const items = result?.items || [];
    for (const c of items) todos.push(formatearContacto(c, tiposPorClave));

    if (items.length < pageSize) {
      hasMore = false;
    } else {
      skip += pageSize;
    }

    if (skip >= 10000) {
      console.warn(`${TAG} límite de seguridad alcanzado (10.000)`);
      hasMore = false;
    }
  }

  // Sin nombre comercial ni fiscal no hay nada que buscar ni que enseñar.
  const lista = todos.filter(c => c.contactId && (c.negocio || c.nombreFiscal));

  _cacheClientes = lista;
  _cacheClientesTs = ahora;
  console.log(`${TAG} clientes cargados: ${lista.length} (${todos.length} contactos con etiqueta) en ${Date.now() - ahora} ms`);
  return { lista, deCache: false };
}

// Lo que se devuelve a la app de cada cliente (sin datos que no necesita).
function _paraApp(c, score) {
  return {
    contactId: c.contactId,
    negocio: c.negocio || c.nombreFiscal,
    // v1.3.0: la app enseña `persona` si no hay dirección; ahora es el
    // nombre fiscal, solo cuando no repite el comercial.
    persona: c.nombreFiscal && c.nombreFiscal !== c.negocio ? c.nombreFiscal : '',
    telefono: c.telefono,
    direccion: c.direccion,
    ubicacion: c.ubicacion,
    tipo: c.tipo,
    parecido: Math.round(score * 100)
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 0. QUIÉN SOY (v1.1.0) — cabecera de Inicio: foto, nombre y rol
//   return : { ok, version, comercial:{ nombre, rol, foto } }
//            | { ok:false, error:{ code:'SIN_ACCESO', message } }
// ═══════════════════════════════════════════════════════════════════════════

export const centriSalesQuienSoy = webMethod(
  Permissions.SiteMember,
  async () => {
    const acceso = await _reconocerComercial();
    if (!acceso.ok) return { ok: false, version: VERSION, error: { code: 'SIN_ACCESO', message: acceso.error } };
    const c = acceso.comercial;
    console.log(`${TAG} quienSoy: ${c.nombre} (${acceso.email})`);
    return { ok: true, version: VERSION, comercial: { nombre: c.nombre, rol: c.rol, foto: c.foto } };
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// 1. BUSCAR CLIENTE POR LO QUE DICE EL COMERCIAL
//   payload: { texto }
//   return : { ok, version, clientes:[…], totalClientes, ms, deCache }
// ═══════════════════════════════════════════════════════════════════════════

export const centriSalesBuscarCliente = webMethod(
  Permissions.SiteMember,
  async ({ texto } = {}) => {
    const acceso = await _reconocerComercial();
    if (!acceso.ok) return { ok: false, version: VERSION, error: { code: 'SIN_ACCESO', message: acceso.error } };

    const t0 = Date.now();
    try {
      const t = String(texto || '').trim();
      if (t.length < 2) {
        return { ok: true, version: VERSION, clientes: [], totalClientes: 0, ms: 0, deCache: false };
      }

      const { lista, deCache } = await _cargarClientes();
      const top = _puntuar(t, lista, FUZZY_MIN).slice(0, MAX_COINCIDENCIAS);
      const ms = Date.now() - t0;

      console.log(`${TAG} 🔎 "${t}" → ${top.length} de ${lista.length} · ${ms} ms${deCache ? ' (caché)' : ''}`);
      return {
        ok: true,
        version: VERSION,
        clientes: top.map(x => _paraApp(x.c, x.score)),
        totalClientes: lista.length,
        ms,
        deCache
      };
    } catch (e) {
      console.error(`${TAG} ❌ centriSalesBuscarCliente:`, e);
      return { ok: false, version: VERSION, error: { code: 'ERROR_BUSQUEDA', message: 'No se pudo buscar el cliente.' }, detalle: safeErr(e) };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// 2. DAR DE ALTA UN CLIENTE NUEVO (etiqueta Prospecto)
//   payload: { negocio, telefono, persona?, email?, direccion?,
//              ubicacion?: { lat, lon },          (v1.2.0, GPS del móvil)
//              confirmado?, allowDuplicates? }
//   return : { ok, version, cliente } |
//            { ok:false, error:{ code: 'DATOS_INCOMPLETOS' | 'POSIBLES_DUPLICADOS'
//              | 'TELEFONO_DUPLICADO' | 'ERROR_ALTA' | 'SIN_ACCESO' },
//              parecidos? }
//
//   Flujo de la app:
//     1. Envía sin confirmado. Si hay un nombre muy parecido, recibe
//        POSIBLES_DUPLICADOS con los parecidos: «¿Es alguno de estos?».
//     2. Si el comercial dice que no, reenvía con confirmado: true.
//     3. Si el teléfono ya existe, recibe TELEFONO_DUPLICADO. Si confirma,
//        reenvía con allowDuplicates: true (patrón «Crear igualmente» de
//        KAMISUITE).
// ═══════════════════════════════════════════════════════════════════════════

export const centriSalesCrearCliente = webMethod(
  Permissions.SiteMember,
  async (payload) => {
    const acceso = await _reconocerComercial();
    if (!acceso.ok) return { ok: false, version: VERSION, error: { code: 'SIN_ACCESO', message: acceso.error } };

    try {
      const {
        negocio, telefono, persona, email, direccion,
        ubicacion,                                   // v1.2.0
        confirmado, allowDuplicates
      } = payload || {};

      const nNeg  = String(negocio   || '').trim();
      const nTel  = String(telefono  || '').trim();
      const nPer  = String(persona   || '').trim();
      const nMail = String(email     || '').trim().toLowerCase();
      const nDir  = String(direccion || '').trim();

      console.log(`${TAG} crearCliente: negocio="${nNeg}" tel="${nTel}" persona="${nPer}" confirmado=${confirmado === true} allowDuplicates=${allowDuplicates === true} · por ${acceso.comercial.nombre} (${acceso.email})`);

      // ── Validación: negocio + teléfono ──
      if (!nNeg || !nTel) {
        return {
          ok: false, version: VERSION,
          error: { code: 'DATOS_INCOMPLETOS', message: 'Hacen falta el nombre del negocio y un teléfono.' }
        };
      }

      // ── ¿Ya existe un cliente con un nombre muy parecido? ──
      if (confirmado !== true) {
        const { lista } = await _cargarClientes();
        const parecidos = _puntuar(nNeg, lista, DUPLICADO_MIN).slice(0, MAX_COINCIDENCIAS);
        if (parecidos.length) {
          console.log(`${TAG} crearCliente: ${parecidos.length} posibles duplicados de "${nNeg}"`);
          return {
            ok: false, version: VERSION,
            error: { code: 'POSIBLES_DUPLICADOS', message: 'Ya hay clientes con un nombre muy parecido.' },
            parecidos: parecidos.map(x => _paraApp(x.c, x.score))
          };
        }
      }

      const claves = await _clavesEtiquetas();

      // ── contactInfo (arrays directos, patrón wix-crm-backend) ──
      // v1.3.0: el nombre del negocio es el Nombre del contacto; la Compañía
      // (nombre fiscal) no se conoce en el alta. La persona no se guarda.
      const contactInfo = {
        name: { first: nNeg },
        phones: [{ tag: 'MOBILE', phone: nTel }],
        labelKeys: [claves.prospecto]
      };
      if (nMail) contactInfo.emails = [{ tag: 'MAIN', email: nMail }];
      if (nDir) {
        // Patrón lopdClientes v1.2.0: streetAddress.name + formatted.
        contactInfo.addresses = [
          { tag: 'WORK', address: { streetAddress: { name: nDir }, formatted: nDir } }
        ];
      }

      // ── v1.2.0 — coordenadas del GPS en los campos personalizados ──
      // Mismo sitio que custom.sexo en crearContactoCRM: extendedFields plano
      // dentro del createContact. Una ubicación no válida no bloquea el alta.
      const coord = ubicacion ? _coordenadas(ubicacion.lat, ubicacion.lon) : null;
      if (ubicacion && !coord) {
        console.warn(`${TAG} crearCliente: ubicación no válida, se crea sin coordenadas: ${JSON.stringify(ubicacion).slice(0, 120)}`);
      }
      if (coord) {
        contactInfo.extendedFields = { [F_LATITUD]: coord.lat, [F_LONGITUD]: coord.lon };
      }

      // ── createContact — patrón crearContactoCRM (fichaClienteLogic v1.9.15) ──
      const elevatedCreate = elevate(contacts.createContact);
      let created;
      try {
        created = await elevatedCreate(contactInfo, {
          allowDuplicates: allowDuplicates === true,
          suppressAuth: true
        });
      } catch (createErr) {
        // Detección estructurada (NO regex sobre el mensaje): applicationError.code.
        const appErr = createErr && createErr.details && createErr.details.applicationError;
        const code   = appErr && appErr.code;
        const data   = appErr && appErr.data;
        const rawMsg = String(createErr && createErr.message || '');
        console.warn(`${TAG} crearCliente: excepción · code="${code || '-'}" · dupPhone="${(data && data.duplicatePhone) || '-'}" · dupContactId="${(data && data.duplicateContactId) || '-'}" · raw="${rawMsg}"`);
        if (code === 'DUPLICATE_CONTACT_EXISTS') {
          return {
            ok: false, version: VERSION,
            error: { code: 'TELEFONO_DUPLICADO', message: 'Ese teléfono ya está en otro contacto.' }
          };
        }
        return { ok: false, version: VERSION, error: { code: 'ERROR_ALTA', message: 'No se pudo dar de alta el cliente.' } };
      }

      // El contacto puede venir directamente o dentro de .contact
      const createdContact = created?.contact || created;
      const newId = createdContact?._id || createdContact?.id || null;
      if (!newId) {
        console.warn(`${TAG} crearCliente: no se devolvió el _id del nuevo contacto`);
        return { ok: false, version: VERSION, error: { code: 'ERROR_ALTA', message: 'No se pudo dar de alta el cliente.' } };
      }

      // El cliente nuevo tiene que salir en la próxima búsqueda.
      _cacheClientes = null;
      _cacheClientesTs = 0;

      const tiposPorClave = { [claves.cliente]: 'cliente', [claves.prospecto]: 'prospecto' };
      const cliente = formatearContacto(createdContact, tiposPorClave);
      console.log(`${TAG} crearCliente OK: ${newId} | negocio="${nNeg}" | por ${acceso.comercial.nombre}`);
      return { ok: true, version: VERSION, cliente: _paraApp(cliente, 1) };

    } catch (e) {
      console.error(`${TAG} crearCliente ERROR:`, e);
      return { ok: false, version: VERSION, error: { code: 'ERROR_ALTA', message: 'No se pudo dar de alta el cliente.' } };
    }
  }
);
