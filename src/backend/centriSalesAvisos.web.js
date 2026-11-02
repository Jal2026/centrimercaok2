/* ═══════════════════════════════════════════════════════════════════════════
 * CENTRIMERCA — CENTRI SALES · Avisos de la empresa (Wix Velo)
 * Archivo:  backend/centriSalesAvisos.web.js
 * VERSION:  1.1.0
 * FECHA:    2 Noviembre 2026
 *
 * v1.1.0 — 2 NOV 2026 · Dos cambios (Jal):
 *   1. ACCESO EN DOS NIVELES: _reconocerComercial() y F_EQUIPO, COPIA
 *      LITERAL del bloque de centriSalesClientes.web.js 1.5.0 (casilla «App
 *      Ventas» de la ficha de `equipo`, además del rol). Se sube junto con
 *      clientes 1.5.0 y visitas 1.2.0.
 *   2. DESTINATARIOS: el panel de CENTRIX ya escribe en `destinatarios` los
 *      _id de las fichas de `equipo` a las que va el aviso. Vacío = todos.
 *      Con valores, el aviso solo lo ve el comercial cuya ficha esté en la
 *      lista (acceso.comercial.id). La respuesta no cambia: la app 1.0.11 no
 *      se toca.
 *
 * v1.0.0 — 26 OCT 2026 · Primera versión (Jal). Mensajes que la empresa
 *   cuelga para los comerciales («Atención, no habrá tomates cherry hasta el
 *   15 de diciembre»). La app los enseña con la «i» del inicio.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * QUÉ ES
 * ───────────────────────────────────────────────────────────────────────────
 * Un webMethod para el page code de la página de la app (sesión de miembro):
 *   · centriSalesAvisos()
 *       Los avisos activos y no caducados, los más recientes primero:
 *       { ok, version, avisos:[{ id, clave, mensaje, fecha, hasta }] }
 *         fecha → AAAA-MM-DD de publicación (Europe/Madrid)
 *         hasta → AAAA-MM-DD o null
 *         clave → id + fecha de la última edición: si se edita un aviso,
 *                 la app lo vuelve a marcar como no visto.
 *
 * Caducidad: un aviso con `hasta` se ve HASTA ese día incluido (Europe/Madrid).
 * `destinatarios` (v1.1.0): _id de fichas de `equipo`. Vacío = lo ven todos;
 *   con valores, solo esos comerciales.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * PROCEDENCIA (no inventada)
 * ───────────────────────────────────────────────────────────────────────────
 *   · Usuarios de la app, safeErr() y CONTROL DE ACCESO completo
 *     (_txt, _imgUrl, _reconocerComercial): COPIA LITERAL de
 *     centriSalesVisitas.web.js v1.1.2 (que copia centriSalesClientes).
 *     Si el acceso cambia allí, cambiarlo aquí.
 *   · _diaMadrid() y _fecha(): COPIA LITERAL de centriSalesVisitas.web.js v1.1.2.
 *   · Lectura con { suppressAuth: true } y respuesta { ok, version, error:{code,
 *     message} }: patrón de centriSalesVisitas.web.js.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * COLECCIÓN CentriSalesAvisos — field keys
 * ───────────────────────────────────────────────────────────────────────────
 *   mensaje (Texto) · activo (Booleano) · hasta (Fecha, opcional) ·
 *   destinatarios (Etiquetas: _id de fichas de `equipo`; vacío = todos)
 *   La lee este backend con suppressAuth.
 *   ⚠️ Permisos reales, leídos por API el 2-nov-2026: miembros del sitio para
 *   leer, crear, editar y borrar (no «solo administrador» como se pidió).
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { webMethod, Permissions } from 'wix-web-module';
import wixData from 'wix-data';
import { currentMember } from 'wix-members-backend';

const VERSION = '1.1.0';
const TAG = `[CentriSalesAvisos][${VERSION}]`;
const AUTH = { suppressAuth: true };

const C_AVISOS = 'CentriSalesAvisos';
const F_AVISOS = {
  mensaje:       'mensaje',
  activo:        'activo',
  hasta:         'hasta',
  destinatarios: 'destinatarios'   // v1.1.0: _id de fichas de `equipo`; vacío = todos
};
const LIMITE_AVISOS = 50;
const MAX_MENSAJE = 1000;

const ZONA = 'Europe/Madrid';

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
  email:  'email',
  appVentas: 'appVentas'   // 2-nov-2026: Booleano «App Ventas», creado por API (leído: BOOLEAN)
};

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
 *   2. el rol ROL_AUTORIZADO (nivel 1: lo pone a mano el administrador);
 *   3. su email de acceso en UNA sola ficha de `equipo`;
 *   4. (2-nov-2026) la casilla «App Ventas» de esa ficha activada (nivel 2: se
 *      activa y desactiva desde el panel de CENTRIX). Sin marcar = sin acceso.
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

    // 2-nov-2026 — Nivel 2: casilla «App Ventas» de la ficha, activada desde
    // el panel de CENTRIX. Solo vale true: vacía o false = sin acceso.
    if (it[F_EQUIPO.appVentas] !== true) {
      console.warn(`${TAG} acceso DENEGADO: email=${email} sin «App Ventas» activado en ${C_EQUIPO}`);
      return { ok: false, error: 'Tu acceso a la app no está activado.' };
    }
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

function _fecha(v) {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Día (AAAA-MM-DD) del campo `hasta`. Un campo «Fecha» del CMS llega como
 * texto AAAA-MM-DD; «Fecha y hora», como Date. Se aceptan los dos.
 */
function _diaHasta(v) {
  if (!v) return '';
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  const d = _fecha(v);
  return d ? _diaMadrid(d) : '';
}

// ═══════════════════════════════════════════════════════════════════════════
// AVISOS
//   return : { ok, version, avisos:[{ id, clave, mensaje, fecha, hasta }] }
// ═══════════════════════════════════════════════════════════════════════════

export const centriSalesAvisos = webMethod(
  Permissions.SiteMember,
  async () => {
    const acceso = await _reconocerComercial();
    if (!acceso.ok) return { ok: false, version: VERSION, error: { code: 'SIN_ACCESO', message: acceso.error } };

    try {
      const res = await wixData.query(C_AVISOS)
        .eq(F_AVISOS.activo, true)
        .descending('_createdDate')
        .limit(LIMITE_AVISOS)
        .find(AUTH);

      const hoy = _diaMadrid(new Date());
      const yo = _txt(acceso.comercial && acceso.comercial.id);   // v1.1.0
      const avisos = [];
      (res.items || []).forEach((it) => {
        const mensaje = _txt(it[F_AVISOS.mensaje]).slice(0, MAX_MENSAJE);
        if (!mensaje) return;
        const hasta = _diaHasta(it[F_AVISOS.hasta]);
        if (hasta && hasta < hoy) return;   // caducado
        // v1.1.0 — destinatarios: vacío = todos; con valores, solo esas fichas.
        // Un texto suelto (no lista) cuenta como un destinatario: nunca se
        // convierte en «todos» un aviso que iba a una persona.
        const brutoPara = it[F_AVISOS.destinatarios];
        const para = (Array.isArray(brutoPara) ? brutoPara : (_txt(brutoPara) ? [brutoPara] : []))
          .map(_txt).filter(Boolean);
        if (para.length > 0 && para.indexOf(yo) < 0) return;
        const creado = _fecha(it._createdDate);
        const editado = _fecha(it._updatedDate) || creado;
        avisos.push({
          id: it._id,
          clave: `${it._id}:${editado ? editado.getTime() : 0}`,
          mensaje,
          fecha: creado ? _diaMadrid(creado) : '',
          hasta: hasta || null
        });
      });

      return { ok: true, version: VERSION, avisos };
    } catch (e) {
      console.error(`${TAG} ❌ centriSalesAvisos:`, e);
      return { ok: false, version: VERSION, error: { code: 'ERROR_LEER', message: 'No se pudieron leer los avisos.' }, detalle: safeErr(e) };
    }
  }
);
