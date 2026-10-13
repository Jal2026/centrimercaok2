/* ═══════════════════════════════════════════════════════════════════════════
 * CENTRIMERCA — Gestor de Equipo · Backend web module · v1.0.0
 * Ruta: backend/centriEquipo.web.js
 * FECHA: 13 Octubre 2026
 *
 * REQUIERE: GestorEquipo.page.js v1.0.0 + Gestor_Equipo_Centrimerca_v1_0_0.html
 *
 * ───────────────────────────────────────────────────────────────────────────
 * PROCEDENCIA
 * ───────────────────────────────────────────────────────────────────────────
 * Guard de acceso: COPIA LITERAL de _exigirAdmin() de centriActualidad.web.js
 *   v1.0.1 (que a su vez es copia literal de centriCatalogo.web.js v1.0.3 →
 *   centriEntrenador.web.js v1.0.0). Autoriza por email O memberId en
 *   CentriAdmins, falla cerrado. Único cambio: la etiqueta del mensaje
 *   denegado dice "gestor de equipo".
 * Subida de imágenes: patrón literal de uploadImagenNoticia() /
 *   subirImagenCatalogo() — mediaManager.upload → fileUrl → READ-MERGE-UPDATE.
 * Estructura (listar / guardar / eliminar / subir): la de centriActualidad.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * FIELD KEYS — LEÍDOS DEL ESQUEMA REAL DE `equipo` (API de colecciones, 13/10)
 * ───────────────────────────────────────────────────────────────────────────
 * nombre (Texto) · rol (Texto) · descripcion (Texto plano) · imagen (Imagen)
 * email (Email, cifrado) · numeroTelefono (NÚMERO) · vcard (URL)
 * qr (Imagen; en los datos guarda una URL de quickchart.io)
 * Orden de la colección: campo interno de orden manual del CMS (solo lectura).
 *
 * Campos que este módulo NO toca y conserva por READ-MERGE-UPDATE:
 * createdDate, updatedDate, owner, createdDate1, updatedDate1, owner1,
 * createdDate11, updatedDate11, owner11 (restos de importaciones CSV).
 *
 * QR: el patrón NO se inventa. Las 23 filas existentes guardan
 *   qr = https://quickchart.io/qr?text=<vcard codificada>&size=300&margin=1&ecLevel=M&format=png
 *   Al guardar, si el enlace vCard cambia (o es alta), qr se regenera con
 *   ese mismo patrón para que el QR no quede apuntando a la vCard vieja.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { webMethod, Permissions } from 'wix-web-module';
import wixData from 'wix-data';
import { mediaManager } from 'wix-media-backend';
import { currentMember } from 'wix-members-backend';

const VERSION = '1.0.0';
const TAG = `[Equipo][${VERSION}]`;
const AUTH = { suppressAuth: true };

// ── IDs de colección ───────────────────────────────────────────────────────
const COL      = 'equipo';         // ID real de la colección (minúscula)
const C_ADMINS = 'CentriAdmins';   // idéntico al catálogo/entrenador/actualidad

// ── Carpeta del Media Manager ──────────────────────────────────────────────
const CARPETA = '/Centrimerca/Equipo';

const LIMITE = 1000;

// ── Field keys de `equipo` (esquema real) ──────────────────────────────────
const F = {
  nombre:      'nombre',
  rol:         'rol',
  descripcion: 'descripcion',     // "Texto" plano (no enriquecido)
  imagen:      'imagen',          // "Imagen" → wix:image:// (solo se escribe vía subida)
  email:       'email',           // "Email" (cifrado en el CMS)
  telefono:    'numeroTelefono',  // ⚠️ "Número": sin +34, sin espacios, sin 0 inicial
  vcard:       'vcard',           // "URL"
  qr:          'qr',              // "Imagen"; en los datos guarda URL de quickchart.io
  orden:       '_manualSort_70208d3c-3970-4f20-ac00-b50accefda3d'  // orden manual del CMS (solo lectura)
};

// ── Patrón del QR, copiado de los datos existentes ─────────────────────────
const QR_BASE   = 'https://quickchart.io/qr?text=';
const QR_PARAMS = '&size=300&margin=1&ecLevel=M&format=png';

// ═══════════════════════════════════════════════════════════════════════════
// CONTROL DE ACCESO  (copia literal de centriActualidad.web.js v1.0.1)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Comprueba que quien llama está autorizado y activo en CentriAdmins.
 *
 * ⚠️ FALLA CERRADO. Sin sesión, sin colección, sin fila o con error de
 * lectura → NO autorizado. Los permisos de PÁGINA no protegen un webMethod.
 */
async function _exigirAdmin() {
  let memberId = '';
  let email = '';

  try {
    let member = null;
    try {
      member = await currentMember.getMember({ fieldsets: ['FULL'] });
    } catch (eFull) {
      console.warn(`${TAG} fieldset FULL no disponible, se usa el reducido:`, eFull.message);
      member = await currentMember.getMember();
    }

    memberId = (member && member._id) || '';

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
      console.warn(`${TAG} acceso DENEGADO a equipo: email=${email || '—'} memberId=${memberId || '—'} (${filas.length} filas activas en ${C_ADMINS})`);

      const pista = `Detectado: correo ${email || '—'}, memberId ${memberId || '—'}. ` +
                    `${C_ADMINS} tiene ${filas.length} fila(s) con activo=true. ` +
                    `Añade una fila con ese correo en \`email\` y \`activo\` marcado, o pega ese memberId en \`memberId\`.`;
      return { ok: false, error: `No tienes acceso al gestor de equipo. ${pista}` };
    }

    return { ok: true, memberId, email };

  } catch (e) {
    console.error(`${TAG} error leyendo ${C_ADMINS} — se deniega por defecto:`, e.message);
    return { ok: false, error: 'No se pudo verificar el acceso.' };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════
function _txt(v) { return (v === null || v === undefined) ? '' : String(v).trim(); }

/* wix:image://v1/<mediaId>/<file>#...  →  https://static.wixstatic.com/media/<mediaId>
   Idéntico a _imgUrl de centriCatalogo.web.js / centriActualidad.web.js */
function _imgUrl(uri) {
  if (!uri || typeof uri !== 'string') { return ''; }
  if (uri.indexOf('http') === 0) { return uri; }
  const m = uri.match(/wix:image:\/\/v1\/([^/]+)/);
  return m ? ('https://static.wixstatic.com/media/' + m[1]) : '';
}

// QR con el mismo patrón que ya tienen las filas de `equipo`.
function _qrDesdeVcard(vcard) {
  const v = _txt(vcard);
  return v ? (QR_BASE + encodeURIComponent(v) + QR_PARAMS) : '';
}

// `numeroTelefono` es de tipo Número: se aceptan cifras (y espacios/puntos/
// guiones, que se quitan). Se rechaza lo que el Número perdería en silencio.
function _telefono(v) {
  const s = _txt(v).replace(/[\s.\-()]/g, '');
  if (!s) { return { ok: true, valor: null }; }
  if (!/^\d+$/.test(s)) {
    return { ok: false, error: 'El teléfono solo admite cifras: el campo del CMS es de tipo Número (sin +34 ni letras).' };
  }
  if (s.charAt(0) === '0') {
    return { ok: false, error: 'El teléfono no puede empezar por 0: el campo del CMS es de tipo Número y lo perdería.' };
  }
  return { ok: true, valor: Number(s) };
}

function _emailValido(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

function _urlValida(u) { return /^https?:\/\/\S+$/i.test(u); }

// Orden manual del CMS (cadena). Las filas sin clave van al final.
function _compararOrden(a, b) {
  const ka = a[F.orden];
  const kb = b[F.orden];
  const ta = (typeof ka === 'string' && ka !== '');
  const tb = (typeof kb === 'string' && kb !== '');
  if (ta && tb) { return ka < kb ? -1 : (ka > kb ? 1 : 0); }
  if (ta) { return -1; }
  if (tb) { return 1; }
  return 0;
}

// De fila del CMS → objeto que consume el widget.
function _mapMiembro(it) {
  const tel = it[F.telefono];
  return {
    id:          it._id,
    nombre:      _txt(it[F.nombre]),
    rol:         _txt(it[F.rol]),
    descripcion: _txt(it[F.descripcion]),
    email:       _txt(it[F.email]),
    telefono:    (typeof tel === 'number' && Number.isFinite(tel)) ? String(tel) : _txt(tel),
    vcard:       _txt(it[F.vcard]),
    qr:          _imgUrl(it[F.qr]),
    imagen:      _imgUrl(it[F.imagen])
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. LISTAR EQUIPO  (en el orden manual del CMS)
// ═══════════════════════════════════════════════════════════════════════════
export const listarEquipo = webMethod(
  Permissions.SiteMember,
  async () => {
    const guard = await _exigirAdmin();
    if (!guard.ok) { return { ok: false, error: guard.error }; }

    try {
      const res = await wixData.query(COL)
        .limit(LIMITE)
        .find(AUTH);

      const filas = (res.items || []).slice().sort(_compararOrden);
      const equipo = filas.map(_mapMiembro);
      console.log(`${TAG} listar: ${equipo.length} personas`);
      return { ok: true, equipo };

    } catch (e) {
      console.error(`${TAG} ❌ listarEquipo — revisa el ID de colección (COL="${COL}"):`, e.message);
      return { ok: false, error: `No pude leer equipo: ${e.message}` };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// 2. GUARDAR PERSONA (alta o edición)
// La imagen NO se escribe aquí: se sube aparte (uploadImagenMiembro). En
// edición se hace READ-MERGE-UPDATE para no pisar `imagen` ni otros campos.
// `qr` se regenera solo si cambia el enlace vCard (o es alta).
// ═══════════════════════════════════════════════════════════════════════════
export const guardarMiembro = webMethod(
  Permissions.SiteMember,
  async ({ miembroId, datos }) => {
    const guard = await _exigirAdmin();
    if (!guard.ok) { return { ok: false, error: guard.error }; }

    const d = datos || {};
    const nombre = _txt(d.nombre);
    if (!nombre) { return { ok: false, error: 'El nombre es obligatorio.' }; }

    const email = _txt(d.email);
    if (email && !_emailValido(email)) { return { ok: false, error: `Email no válido: ${email}` }; }

    const vcard = _txt(d.vcard);
    if (vcard && !_urlValida(vcard)) { return { ok: false, error: 'El enlace vCard debe empezar por http:// o https://' }; }

    const tel = _telefono(d.telefono);
    if (!tel.ok) { return { ok: false, error: tel.error }; }

    try {
      const campos = {
        [F.nombre]:      nombre,
        [F.rol]:         _txt(d.rol),
        [F.descripcion]: _txt(d.descripcion),
        [F.email]:       email || null,
        [F.telefono]:    tel.valor,
        [F.vcard]:       vcard || null
      };

      let guardado;
      if (miembroId) {
        const actual = await wixData.get(COL, miembroId, AUTH);
        if (!actual) { return { ok: false, error: 'Persona no encontrada.' }; }
        if (vcard !== _txt(actual[F.vcard])) {
          campos[F.qr] = _qrDesdeVcard(vcard) || null;
        }
        guardado = await wixData.update(COL, Object.assign({}, actual, campos), AUTH);
      } else {
        campos[F.qr] = _qrDesdeVcard(vcard) || null;
        guardado = await wixData.insert(COL, campos, AUTH);
      }

      console.log(`${TAG} ✅ persona ${miembroId ? 'actualizada' : 'creada'}: ${guardado._id}`);
      return { ok: true, miembro: _mapMiembro(guardado) };

    } catch (e) {
      console.error(`${TAG} ❌ guardarMiembro:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// 3. ELIMINAR PERSONA
// ═══════════════════════════════════════════════════════════════════════════
export const eliminarMiembro = webMethod(
  Permissions.SiteMember,
  async ({ miembroId }) => {
    const guard = await _exigirAdmin();
    if (!guard.ok) { return { ok: false, error: guard.error }; }
    if (!miembroId) { return { ok: false, error: 'Falta miembroId.' }; }

    try {
      await wixData.remove(COL, miembroId, AUTH);
      console.log(`${TAG} 🗑️ persona eliminada: ${miembroId}`);
      return { ok: true };

    } catch (e) {
      console.error(`${TAG} ❌ eliminarMiembro:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// 4. SUBIR FOTO DE PERSONA
// Patrón literal de uploadImagenNoticia (centriActualidad.web.js):
// mediaManager.upload → fileUrl → READ-MERGE-UPDATE de `imagen`.
// ═══════════════════════════════════════════════════════════════════════════
export const uploadImagenMiembro = webMethod(
  Permissions.SiteMember,
  async ({ miembroId, base64Data, fileName, mimeType }) => {
    const guard = await _exigirAdmin();
    if (!guard.ok) { return { ok: false, error: guard.error }; }

    if (!miembroId || !base64Data || !fileName) {
      return { ok: false, error: 'Faltan parámetros (miembroId, base64Data, fileName).' };
    }

    try {
      const registro = await wixData.get(COL, miembroId, AUTH);
      if (!registro) { return { ok: false, error: 'Persona no encontrada.' }; }

      const buffer = Buffer.from(base64Data, 'base64');
      const uploadResult = await mediaManager.upload(
        CARPETA,
        buffer,
        fileName,
        {
          mediaOptions: {
            mimeType: mimeType || 'image/jpeg',
            mediaType: 'image'
          },
          metadataOptions: {
            isPrivate: false,
            isVisitorUpload: false
          }
        }
      );

      const fileUrl = (uploadResult && uploadResult.fileUrl) || '';
      if (!fileUrl) { return { ok: false, error: 'Media Manager no devolvió fileUrl.' }; }

      // READ-MERGE-UPDATE con el registro completo ya leído
      await wixData.update(COL, Object.assign({}, registro, { [F.imagen]: fileUrl }), AUTH);

      console.log(`${TAG} ✅ foto subida y ${COL}.${F.imagen} actualizado: ${fileUrl}`);
      return { ok: true, fileUrl, publicUrl: _imgUrl(fileUrl) };

    } catch (e) {
      console.error(`${TAG} ❌ uploadImagenMiembro:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);
