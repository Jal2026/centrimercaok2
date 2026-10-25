/* ═══════════════════════════════════════════════════════════════════════════
 * CENTRIMERCA — CENTRI SALES · Visitas (Wix Velo)
 * Archivo:  backend/centriSalesVisitas.web.js
 * VERSION:  1.1.2
 * FECHA:    25 Octubre 2026
 *
 * v1.1.2 — 25 OCT 2026 · Resultados válidos = los de centriSalesLab 1.5.1
 *   (fuera «oferta», entra «ventas»; nuevos negociacion, administrativa,
 *   presentacion, cortesia). Un «oferta» que llegue se guarda como «ventas».
 *
 * v1.1.1 — 25 OCT 2026 · Los mensajes de acceso que ve el usuario ya no
 *   nombran «Centri Sales» («No tienes acceso a esta aplicación.», «No estás
 *   dado de alta en el equipo.»).
 *   Mismo cambio en centriSalesClientes v1.3.2 (bloque copiado).
 *
 * v1.1.0 — 25 OCT 2026 · REABRIR UNA VISITA ENVIADA (petición de Jal tras la
 *   primera prueba): desde «Visitas de hoy» el comercial abre el informe ya
 *   enviado, lo corrige y lo vuelve a enviar.
 *     · NUEVO centriSalesLeerVisita({ id }): la visita entera (informe,
 *       transcripción, horas y coordenadas), solo si es de quien llama.
 *     · centriSalesGuardarVisita: con visitaId ya no se aplica el filtro
 *       «mismo texto ⇒ reintento»; se actualiza esa visita (si solo cambió
 *       el resultado o las respuestas de «Para confirmar», el texto es el
 *       mismo y antes se descartaba el cambio). Sin visitaId, igual que antes.
 *       Al actualizar, ubicación y segundos de audio que lleguen vacíos no
 *       borran los ya guardados.
 *
 * v1.0.1 — 25 OCT 2026 · Único cambio: ROL_AUTORIZADO pasa de 'Centri Sales'
 *   a 'AppVentas' (nombre real del rol en el site).
 *
 * ───────────────────────────────────────────────────────────────────────────
 * QUÉ ES
 * ───────────────────────────────────────────────────────────────────────────
 * Guarda las visitas de los comerciales en la colección CentriSalesVisitascomercial.
 * Tres webMethods, para el page code de la página de Centri Sales (con
 * sesión de miembro):
 *   · centriSalesGuardarLlegada({ contactId, cliente, lat?, lon?, ts? })
 *       Botón «He llegado»: guarda la hora y la ubicación de llegada. Si ese
 *       comercial ya marcó hoy la llegada a ese cliente y aún no envió el
 *       informe, se actualiza esa visita en lugar de crear otra.
 *   · centriSalesGuardarVisita({ visitaId?, contactId, cliente,
 *                                transcripcion, informe, segundosAudio?,
 *                                lat?, lon? })
 *       «ENVIAR INFORME». Si hay visitaId (o una llegada de hoy a ese
 *       cliente sin informe), completa esa visita; si no, crea una nueva.
 *       Si el mismo informe ya se guardó (reintento tras un corte de red con
 *       el guardado hecho), devuelve la visita existente y no duplica.
 *   · centriSalesVisitasHoy()
 *       Las visitas de HOY (Europe/Madrid) del comercial que llama.
 *   · centriSalesLeerVisita({ id }) (v1.1.0)
 *       Una visita entera del comercial que llama, para reabrir su informe.
 *
 * El informe llega del custom element (lo generó backend/centriSalesLab
 * .web.js v1.2.0 y el comercial pudo cambiar el resultado y responder
 * «Para confirmar»). Se guarda entero en `informe` (Objeto) y, aparte,
 * `resultado` e `interes` validados contra la taxonomía para filtrar.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * PROCEDENCIA (no inventada)
 * ───────────────────────────────────────────────────────────────────────────
 *   · _reconocerComercial(), _txt(), _imgUrl(), ROL_AUTORIZADO, C_EQUIPO,
 *     LIMITE_EQUIPO y F_EQUIPO: COPIA LITERAL de centriSalesClientes.web.js
 *     v1.2.0 (que a su vez copia centriEntrenador v1.0.3 y cathoviaEntrenador
 *     v1.0.1). Si el acceso cambia allí, cambiarlo aquí.
 *   · _coordenadas() y DECIMALES_COORD: COPIA LITERAL de
 *     centriSalesClientes.web.js v1.2.0.
 *   · READ-MERGE-UPDATE (wixData.get → Object.assign → wixData.update) e
 *     insert con { suppressAuth: true }: patrón de centriEquipo.web.js v1.0.5.
 *   · Día de hoy en Europe/Madrid con Intl.DateTimeFormat('en-CA'): patrón de
 *     _hoyMadrid() de centriSalesLab.web.js v1.2.0.
 *   · Valores válidos de resultado e interes: los de TAXONOMIA_VISITA de
 *     centriSalesLab.web.js v1.2.0. Si cambian allí, cambiarlos aquí.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * COLECCIÓN CentriSalesVisitascomercial — field keys
 * ───────────────────────────────────────────────────────────────────────────
 *   Id (Texto: id de la ficha del comercial en `equipo`) ·
 *   comercial (Texto) · contactId (Texto) ·
 *   cliente (Texto) · estado (Texto: llegada | enviada) ·
 *   llegada (Fecha y hora) · reporte (Fecha y hora) ·
 *   llegadaLat · llegadaLon · reporteLat · reporteLon · segundosAudio
 *   (Número) · transcripcion (Texto) · resultado (Texto) · interes (Texto) ·
 *   informe (Objeto)
 *   ✅ Verificados contra el esquema real de la colección (API, 25-oct-2026,
 *   revision 1). El id del comercial va en el campo de clave `Id` (no hay
 *   `comercialId`). Escribir en un campo que no existe NO falla (el CMS lo
 *   añade solo): si se renombra un campo, cambiar F.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { webMethod, Permissions } from 'wix-web-module';
import wixData from 'wix-data';
import { currentMember } from 'wix-members-backend';

const VERSION = '1.1.2';
const TAG = `[CentriSalesVisitas][${VERSION}]`;
const AUTH = { suppressAuth: true };

const C_VISITAS = 'CentriSalesVisitascomercial';
const F = {
  comercialId:   'Id',            // clave real del campo en la colección
  comercial:     'comercial',
  contactId:     'contactId',
  cliente:       'cliente',
  estado:        'estado',
  llegada:       'llegada',
  reporte:       'reporte',
  llegadaLat:    'llegadaLat',
  llegadaLon:    'llegadaLon',
  reporteLat:    'reporteLat',
  reporteLon:    'reporteLon',
  segundosAudio: 'segundosAudio',
  transcripcion: 'transcripcion',
  resultado:     'resultado',
  interes:       'interes',
  informe:       'informe'
};
const ESTADO_LLEGADA = 'llegada';
const ESTADO_ENVIADA = 'enviada';

// Valores de TAXONOMIA_VISITA de centriSalesLab.web.js v1.2.0
const RESULTADOS = ['pedido', 'ventas', 'negociacion', 'seguimiento', 'administrativa', 'incidencia', 'presentacion', 'cortesia', 'sin_interes', 'no_atendido', 'otro'];   // v1.1.2
const INTERESES  = ['alto', 'medio', 'bajo', 'indeterminado'];

const ZONA = 'Europe/Madrid';
const MAX_TRANSCRIPCION = 8000;   // el mismo tope que MAX_TEXTO del informe
// Hora de llegada enviada por el móvil: se acepta si no se aleja de la del
// servidor más de esto (relojes mal puestos); si no, cuenta la del servidor.
const MARGEN_TS_MS = 2 * 60 * 60 * 1000;

// ── Usuarios de la app — COPIA LITERAL de centriSalesClientes.web.js v1.3.2 ──
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

// ── Coordenadas — COPIA LITERAL de centriSalesClientes.web.js v1.2.0 ──
const DECIMALES_COORD = 6;   // comprobado en el site: guarda y devuelve 6

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
        return { ok: false, error: 'No tienes acceso a esta aplicación.' };   // [SALES] v1.1.1
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
      return { ok: false, error: 'No estás dado de alta en el equipo.' };   // v1.1.1
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
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/** AAAA-MM-DD de una fecha en Europe/Madrid (patrón _hoyMadrid). */
function _diaMadrid(d) {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  } catch (e) {
    return d.toISOString().slice(0, 10);
  }
}

/** HH:MM de una fecha en Europe/Madrid. */
function _horaMadrid(d) {
  try {
    return new Intl.DateTimeFormat('es-ES', { timeZone: ZONA, hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
  } catch (e) {
    return d.toISOString().slice(11, 16);
  }
}

function _fecha(v) {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

/** Hora enviada por el móvil si es razonable; si no, la del servidor. */
function _tsAceptado(ts) {
  const ahora = Date.now();
  const n = Number(ts);
  if (isFinite(n) && Math.abs(ahora - n) <= MARGEN_TS_MS) return new Date(n);
  return new Date(ahora);
}

/** ¿Quedan preguntas de «Para confirmar» sin responder? */
function _conDudas(informe) {
  if (!informe || typeof informe !== 'object') return false;
  const dudas = Array.isArray(informe.dudas) ? informe.dudas.length : 0;
  if (!dudas) return false;
  const conf = Array.isArray(informe.confirmaciones) ? informe.confirmaciones : [];
  const respondidas = conf.filter(c => c && (c.respuesta === 'si' || c.respuesta === 'no')).length;
  return respondidas < dudas;
}

/** Lo que la app necesita de cada visita. */
function _paraApp(it) {
  const llegada = _fecha(it[F.llegada]);
  const reporte = _fecha(it[F.reporte]);
  const ref = llegada || reporte || _fecha(it._createdDate) || new Date();
  return {
    id:        it._id,
    contactId: _txt(it[F.contactId]),
    cliente:   _txt(it[F.cliente]),
    estado:    _txt(it[F.estado]),
    hora:      _horaMadrid(ref),
    llegada:   llegada ? llegada.getTime() : null,
    conDudas:  _txt(it[F.estado]) === ESTADO_ENVIADA && _conDudas(it[F.informe]),
    resultado: _txt(it[F.resultado])
  };
}

/** Visitas del comercial creadas desde ayer (se filtra «hoy» en memoria). */
async function _visitasRecientes(comercialId) {
  const desde = new Date(Date.now() - 36 * 60 * 60 * 1000);
  const res = await wixData.query(C_VISITAS)
    .eq(F.comercialId, comercialId)
    .ge('_createdDate', desde)
    .limit(200)
    .find(AUTH);
  return res.items || [];
}

function _esDeHoy(it) {
  const ref = _fecha(it[F.llegada]) || _fecha(it[F.reporte]) || _fecha(it._createdDate);
  return !!ref && _diaMadrid(ref) === _diaMadrid(new Date());
}

/** Llegada de hoy de este comercial a este cliente, aún sin informe. */
function _llegadaAbierta(items, contactId) {
  return items.find(it =>
    _txt(it[F.contactId]) === contactId &&
    _txt(it[F.estado]) === ESTADO_LLEGADA &&
    _esDeHoy(it)
  ) || null;
}

/** Valida el informe que llega de la app (se guarda entero, sin inventar). */
function _informeLimpio(informe) {
  const inf = (informe && typeof informe === 'object' && !Array.isArray(informe)) ? informe : {};
  if (inf.resultado === 'oferta') inf.resultado = 'ventas';   // v1.1.2: valor antiguo
  const resultado = RESULTADOS.indexOf(_txt(inf.resultado)) >= 0 ? _txt(inf.resultado) : '';
  const interes   = INTERESES.indexOf(_txt(inf.interes)) >= 0 ? _txt(inf.interes) : '';
  return { informe: inf, resultado, interes };
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. HE LLEGADO
//   payload: { contactId, cliente, lat?, lon?, ts? }
//   return : { ok, version, visita } | { ok:false, error:{ code, message } }
// ═══════════════════════════════════════════════════════════════════════════

export const centriSalesGuardarLlegada = webMethod(
  Permissions.SiteMember,
  async (payload) => {
    const acceso = await _reconocerComercial();
    if (!acceso.ok) return { ok: false, version: VERSION, error: { code: 'SIN_ACCESO', message: acceso.error } };

    try {
      const { contactId, cliente, lat, lon, ts } = payload || {};
      const cId = _txt(contactId);
      const cNom = _txt(cliente);
      if (!cId || !cNom) {
        return { ok: false, version: VERSION, error: { code: 'DATOS_INCOMPLETOS', message: 'Falta el cliente.' } };
      }

      const cuando = _tsAceptado(ts);
      const coord = _coordenadas(lat, lon);
      const cambios = {
        [F.llegada]:    cuando,
        [F.llegadaLat]: coord ? coord.lat : null,
        [F.llegadaLon]: coord ? coord.lon : null
      };

      const recientes = await _visitasRecientes(acceso.comercial.id);
      const abierta = _llegadaAbierta(recientes, cId);

      let guardada;
      if (abierta) {
        // READ-MERGE-UPDATE (patrón centriEquipo)
        const actual = await wixData.get(C_VISITAS, abierta._id, AUTH);
        guardada = await wixData.update(C_VISITAS, Object.assign({}, actual, cambios), AUTH);
        console.log(`${TAG} llegada ACTUALIZADA ${guardada._id} · ${cNom} · ${acceso.comercial.nombre}`);
      } else {
        const fila = Object.assign({
          [F.comercialId]: acceso.comercial.id,
          [F.comercial]:   acceso.comercial.nombre,
          [F.contactId]:   cId,
          [F.cliente]:     cNom,
          [F.estado]:      ESTADO_LLEGADA
        }, cambios);
        guardada = await wixData.insert(C_VISITAS, fila, AUTH);
        console.log(`${TAG} llegada NUEVA ${guardada._id} · ${cNom} · ${acceso.comercial.nombre}`);
      }

      return { ok: true, version: VERSION, visita: _paraApp(guardada) };

    } catch (e) {
      console.error(`${TAG} ❌ centriSalesGuardarLlegada:`, e);
      return { ok: false, version: VERSION, error: { code: 'ERROR_GUARDAR', message: 'No se pudo guardar la llegada.' }, detalle: safeErr(e) };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// 2. ENVIAR INFORME
//   payload: { visitaId?, contactId, cliente, transcripcion, informe,
//              segundosAudio?, lat?, lon? }
//   return : { ok, version, visita, duplicada? } | { ok:false, error }
// ═══════════════════════════════════════════════════════════════════════════

export const centriSalesGuardarVisita = webMethod(
  Permissions.SiteMember,
  async (payload) => {
    const acceso = await _reconocerComercial();
    if (!acceso.ok) return { ok: false, version: VERSION, error: { code: 'SIN_ACCESO', message: acceso.error } };

    try {
      const { visitaId, contactId, cliente, transcripcion, informe, segundosAudio, lat, lon } = payload || {};
      const cId  = _txt(contactId);
      const cNom = _txt(cliente);
      const texto = _txt(transcripcion).slice(0, MAX_TRANSCRIPCION);
      if (!cId || !cNom || !texto) {
        return { ok: false, version: VERSION, error: { code: 'DATOS_INCOMPLETOS', message: 'Faltan el cliente o el texto de la visita.' } };
      }

      const limpio = _informeLimpio(informe);
      const coord = _coordenadas(lat, lon);
      const seg = Number(segundosAudio);
      const cambios = {
        [F.estado]:        ESTADO_ENVIADA,
        [F.reporte]:       new Date(),
        [F.reporteLat]:    coord ? coord.lat : null,
        [F.reporteLon]:    coord ? coord.lon : null,
        [F.segundosAudio]: isFinite(seg) && seg >= 0 ? Math.round(seg) : null,
        [F.transcripcion]: texto,
        [F.resultado]:     limpio.resultado,
        [F.interes]:       limpio.interes,
        [F.informe]:       limpio.informe
      };

      const recientes = await _visitasRecientes(acceso.comercial.id);

      // ¿Reintento de un envío que ya se guardó? Mismo cliente y mismo texto.
      // v1.1.0: solo sin visitaId. Con visitaId se actualiza esa visita (es
      // idempotente) y así se guardan los cambios de una visita reabierta.
      const yaEnviada = !_txt(visitaId) && recientes.find(it =>
        _txt(it[F.contactId]) === cId &&
        _txt(it[F.estado]) === ESTADO_ENVIADA &&
        _txt(it[F.transcripcion]) === texto
      );
      if (yaEnviada) {
        console.log(`${TAG} visita ya guardada (reintento) ${yaEnviada._id} · ${cNom}`);
        return { ok: true, version: VERSION, visita: _paraApp(yaEnviada), duplicada: true };
      }

      // Visita a completar: la indicada por la app (si es de este comercial)
      // o la llegada de hoy a este cliente.
      let base = null;
      const vId = _txt(visitaId);
      if (vId) {
        const v = await wixData.get(C_VISITAS, vId, AUTH);
        if (v && _txt(v[F.comercialId]) === acceso.comercial.id) base = v;
        else console.warn(`${TAG} visitaId ${vId} no encontrada o de otro comercial: se busca la llegada de hoy`);
      }
      if (!base) base = _llegadaAbierta(recientes, cId);

      let guardada;
      if (base) {
        const actual = await wixData.get(C_VISITAS, base._id, AUTH);
        // v1.1.0: al reenviar una visita, un dato que ahora llega vacío no
        // borra el que ya estaba guardado (ubicación y segundos de audio).
        [F.reporteLat, F.reporteLon, F.segundosAudio].forEach(k => {
          if (cambios[k] === null && actual[k] !== null && actual[k] !== undefined) delete cambios[k];
        });
        guardada = await wixData.update(C_VISITAS, Object.assign({}, actual, cambios), AUTH);
        console.log(`${TAG} visita COMPLETADA ${guardada._id} · ${cNom} · ${limpio.resultado || '—'} · ${acceso.comercial.nombre}`);
      } else {
        const fila = Object.assign({
          [F.comercialId]: acceso.comercial.id,
          [F.comercial]:   acceso.comercial.nombre,
          [F.contactId]:   cId,
          [F.cliente]:     cNom
        }, cambios);
        guardada = await wixData.insert(C_VISITAS, fila, AUTH);
        console.log(`${TAG} visita NUEVA ${guardada._id} · ${cNom} · ${limpio.resultado || '—'} · ${acceso.comercial.nombre}`);
      }

      return { ok: true, version: VERSION, visita: _paraApp(guardada) };

    } catch (e) {
      console.error(`${TAG} ❌ centriSalesGuardarVisita:`, e);
      return { ok: false, version: VERSION, error: { code: 'ERROR_GUARDAR', message: 'No se pudo guardar la visita.' }, detalle: safeErr(e) };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// 2b. LEER UNA VISITA (v1.1.0) — para reabrir el informe desde «Visitas de hoy»
//   payload: { id }
//   return : { ok, version, visita:{ id, contactId, cliente, estado, hora,
//              llegada(ms|null), transcripcion, informe, segundosAudio,
//              reporteLat, reporteLon } } | { ok:false, error }
// ═══════════════════════════════════════════════════════════════════════════

export const centriSalesLeerVisita = webMethod(
  Permissions.SiteMember,
  async (payload) => {
    const acceso = await _reconocerComercial();
    if (!acceso.ok) return { ok: false, version: VERSION, error: { code: 'SIN_ACCESO', message: acceso.error } };

    try {
      const id = _txt(payload && payload.id);
      if (!id) {
        return { ok: false, version: VERSION, error: { code: 'DATOS_INCOMPLETOS', message: 'Falta la visita.' } };
      }
      const it = await wixData.get(C_VISITAS, id, AUTH);
      if (!it || _txt(it[F.comercialId]) !== acceso.comercial.id) {
        console.warn(`${TAG} leerVisita: ${id} no existe o es de otro comercial (${acceso.comercial.nombre})`);
        return { ok: false, version: VERSION, error: { code: 'NO_ENCONTRADA', message: 'No se encontró la visita.' } };
      }
      const base = _paraApp(it);
      const num = (v) => (typeof v === 'number' && isFinite(v) ? v : null);
      return {
        ok: true,
        version: VERSION,
        visita: Object.assign(base, {
          transcripcion: _txt(it[F.transcripcion]),
          informe:       (it[F.informe] && typeof it[F.informe] === 'object') ? it[F.informe] : null,
          segundosAudio: num(it[F.segundosAudio]),
          reporteLat:    num(it[F.reporteLat]),
          reporteLon:    num(it[F.reporteLon])
        })
      };
    } catch (e) {
      console.error(`${TAG} ❌ centriSalesLeerVisita:`, e);
      return { ok: false, version: VERSION, error: { code: 'ERROR_LEER', message: 'No se pudo abrir la visita.' }, detalle: safeErr(e) };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// 3. VISITAS DE HOY
//   return : { ok, version, visitas:[…] }  (más recientes primero)
// ═══════════════════════════════════════════════════════════════════════════

export const centriSalesVisitasHoy = webMethod(
  Permissions.SiteMember,
  async () => {
    const acceso = await _reconocerComercial();
    if (!acceso.ok) return { ok: false, version: VERSION, error: { code: 'SIN_ACCESO', message: acceso.error } };

    try {
      const recientes = await _visitasRecientes(acceso.comercial.id);
      const hoy = recientes.filter(_esDeHoy);
      hoy.sort((a, b) => {
        const ra = _fecha(a[F.llegada]) || _fecha(a[F.reporte]) || _fecha(a._createdDate);
        const rb = _fecha(b[F.llegada]) || _fecha(b[F.reporte]) || _fecha(b._createdDate);
        return (rb ? rb.getTime() : 0) - (ra ? ra.getTime() : 0);
      });
      return { ok: true, version: VERSION, visitas: hoy.map(_paraApp) };
    } catch (e) {
      console.error(`${TAG} ❌ centriSalesVisitasHoy:`, e);
      return { ok: false, version: VERSION, error: { code: 'ERROR_LEER', message: 'No se pudieron leer las visitas de hoy.' }, detalle: safeErr(e) };
    }
  }
);
