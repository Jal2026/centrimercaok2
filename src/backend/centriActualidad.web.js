/* ═══════════════════════════════════════════════════════════════════════════
 * CENTRIMERCA — Actualidad (noticias) · Backend web module · v1.0.1
 * Ruta: backend/centriActualidad.web.js
 * FECHA: 22 Septiembre 2026
 *
 * REQUIERE: ActualidadNoticias.page.js v1.0.0 + Editor_Actualidad_Centrimerca_v1_0_0.html
 *
 * ───────────────────────────────────────────────────────────────────────────
 * PROCEDENCIA
 * ───────────────────────────────────────────────────────────────────────────
 * Guard de acceso: COPIA LITERAL de _exigirAdmin() de centriCatalogo.web.js
 *   v1.0.3 (que a su vez es copia literal de centriEntrenador.web.js v1.0.0).
 *   Autoriza por email O memberId en CentriAdmins, falla cerrado.
 *   Único cambio respecto al original: la etiqueta del mensaje denegado dice
 *   "editor de actualidad" en vez de "editor de catálogo".
 * Subida de imágenes: patrón literal de uploadImagenCategoria() /
 *   subirImagenCatalogo() — mediaManager.upload → fileUrl → READ-MERGE-UPDATE.
 *
 * v1.0.1: reemplazado el guard replicado de v1.0.0 (llamaba a getMember() sin
 *   fieldset FULL → loginEmail vacío → gate falso "sin sesión") por el verbatim
 *   de centriCatalogo. Los webMethods pasan al patrón del catálogo: el guard
 *   devuelve { ok, error } y se comprueba al inicio, no lanza.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ⚠️ FIELD KEYS A VERIFICAR EN EL CMS (causa nº1 de fallo silencioso)
 * ───────────────────────────────────────────────────────────────────────────
 * COL='actualidad' y las claves F.* de abajo son NOMBRES INTERNOS, no las
 * etiquetas visibles. Un key mal no da error: devuelve el campo vacío. Sobre
 * todo confirma `activo` (etiqueta visible "Activo"), `etiquetas` y `comodin`.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { webMethod, Permissions } from 'wix-web-module';
import wixData from 'wix-data';
import { mediaManager } from 'wix-media-backend';
import { currentMember } from 'wix-members-backend';

const VERSION = '1.0.1';
const TAG = `[Actualidad][${VERSION}]`;
const AUTH = { suppressAuth: true };

// ── IDs de colección ───────────────────────────────────────────────────────
const COL      = 'actualidad';     // ID real de la colección de noticias
const C_ADMINS = 'CentriAdmins';   // idéntico al catálogo/entrenador

// ── Carpeta del Media Manager ──────────────────────────────────────────────
const CARPETA = '/Centrimerca/Actualidad';

const LIMITE = 1000;

// ── Field keys de `actualidad` — VERIFICAR EN EL CMS ───────────────────────
const F = {
  titulo:      'titulo',
  descripcion: 'descripcion',   // "Texto enriquecido" → se guarda/lee como HTML (string)
  orden:       'orden',
  etiquetas:   'etiquetas',     // "Array de textos"
  imagen:      'imagen',        // "Imagen" → wix:image:// (solo se escribe vía subida)
  portada:     'portada',       // booleano
  comodin:     'comodin',       // booleano
  activo:      'activo'         // booleano
};

const CAMPOS_TOGGLE = { activo: F.activo, portada: F.portada, comodin: F.comodin };

// ═══════════════════════════════════════════════════════════════════════════
// CONTROL DE ACCESO  (copia literal de centriCatalogo.web.js v1.0.3)
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
      console.warn(`${TAG} acceso DENEGADO a actualidad: email=${email || '—'} memberId=${memberId || '—'} (${filas.length} filas activas en ${C_ADMINS})`);

      const pista = `Detectado: correo ${email || '—'}, memberId ${memberId || '—'}. ` +
                    `${C_ADMINS} tiene ${filas.length} fila(s) con activo=true. ` +
                    `Añade una fila con ese correo en \`email\` y \`activo\` marcado, o pega ese memberId en \`memberId\`.`;
      return { ok: false, error: `No tienes acceso al editor de actualidad. ${pista}` };
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

function _num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function _bool(v) { return v === true || v === 'true'; }

/* wix:image://v1/<mediaId>/<file>#...  →  https://static.wixstatic.com/media/<mediaId>
   Idéntico a _imgUrl de centriCatalogo.web.js */
function _imgUrl(uri) {
  if (!uri || typeof uri !== 'string') { return ''; }
  if (uri.indexOf('http') === 0) { return uri; }
  const m = uri.match(/wix:image:\/\/v1\/([^/]+)/);
  return m ? ('https://static.wixstatic.com/media/' + m[1]) : '';
}

// De fila del CMS → objeto que consume el widget.
function _mapNoticia(it) {
  return {
    id:          it._id,
    titulo:      _txt(it[F.titulo]),
    descripcion: _txt(it[F.descripcion]),
    orden:       (typeof it[F.orden] === 'number') ? it[F.orden] : 0,
    etiquetas:   Array.isArray(it[F.etiquetas]) ? it[F.etiquetas] : [],
    imagen:      _imgUrl(it[F.imagen]),
    portada:     it[F.portada] === true,
    comodin:     it[F.comodin] === true,
    activo:      it[F.activo] === true
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. LISTAR NOTICIAS
// ═══════════════════════════════════════════════════════════════════════════
export const listarNoticias = webMethod(
  Permissions.SiteMember,
  async () => {
    const guard = await _exigirAdmin();
    if (!guard.ok) { return { ok: false, error: guard.error }; }

    try {
      const res = await wixData.query(COL)
        .ascending(F.orden)
        .limit(LIMITE)
        .find(AUTH);

      const noticias = (res.items || []).map(_mapNoticia);
      console.log(`${TAG} listar: ${noticias.length} noticias`);
      return { ok: true, noticias };

    } catch (e) {
      console.error(`${TAG} ❌ listarNoticias — revisa el ID de colección (COL="${COL}"):`, e.message);
      return { ok: false, error: `No pude leer actualidad: ${e.message}` };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// 2. GUARDAR NOTICIA (alta o edición)
// La imagen NO se escribe aquí: se sube aparte (uploadImagenNoticia). En
// edición se hace READ-MERGE-UPDATE para no pisar `imagen` ni otros campos.
// ═══════════════════════════════════════════════════════════════════════════
export const guardarNoticia = webMethod(
  Permissions.SiteMember,
  async ({ noticiaId, datos }) => {
    const guard = await _exigirAdmin();
    if (!guard.ok) { return { ok: false, error: guard.error }; }

    const d = datos || {};
    const titulo = _txt(d.titulo);
    if (!titulo) { return { ok: false, error: 'El título es obligatorio.' }; }

    try {
      const campos = {
        [F.titulo]:      titulo,
        [F.descripcion]: d.descripcion || '',
        [F.orden]:       _num(d.orden),
        [F.etiquetas]:   Array.isArray(d.etiquetas) ? d.etiquetas : [],
        [F.portada]:     _bool(d.portada),
        [F.comodin]:     _bool(d.comodin),
        [F.activo]:      _bool(d.activo)
      };

      let guardada;
      if (noticiaId) {
        const actual = await wixData.get(COL, noticiaId, AUTH);
        if (!actual) { return { ok: false, error: 'Noticia no encontrada.' }; }
        guardada = await wixData.update(COL, Object.assign({}, actual, campos), AUTH);
      } else {
        guardada = await wixData.insert(COL, campos, AUTH);
      }

      console.log(`${TAG} ✅ noticia ${noticiaId ? 'actualizada' : 'creada'}: ${guardada._id}`);
      return { ok: true, noticia: _mapNoticia(guardada) };

    } catch (e) {
      console.error(`${TAG} ❌ guardarNoticia:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// 3. TOGGLE de un booleano (activo | portada | comodin) — READ-MERGE-UPDATE
// ═══════════════════════════════════════════════════════════════════════════
export const toggleNoticiaCampo = webMethod(
  Permissions.SiteMember,
  async ({ noticiaId, campo, valor }) => {
    const guard = await _exigirAdmin();
    if (!guard.ok) { return { ok: false, error: guard.error }; }

    const key = CAMPOS_TOGGLE[campo];
    if (!key) { return { ok: false, error: `Campo no permitido: ${campo}` }; }
    if (!noticiaId) { return { ok: false, error: 'Falta noticiaId.' }; }

    try {
      const actual = await wixData.get(COL, noticiaId, AUTH);
      if (!actual) { return { ok: false, error: 'Noticia no encontrada.' }; }

      const nuevoValor = _bool(valor);
      await wixData.update(COL, Object.assign({}, actual, { [key]: nuevoValor }), AUTH);

      console.log(`${TAG} ✅ toggle ${noticiaId}: ${campo}=${nuevoValor}`);
      return { ok: true, id: noticiaId, campo, valor: nuevoValor };

    } catch (e) {
      console.error(`${TAG} ❌ toggleNoticiaCampo:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// 4. ELIMINAR NOTICIA
// ═══════════════════════════════════════════════════════════════════════════
export const eliminarNoticia = webMethod(
  Permissions.SiteMember,
  async ({ noticiaId }) => {
    const guard = await _exigirAdmin();
    if (!guard.ok) { return { ok: false, error: guard.error }; }
    if (!noticiaId) { return { ok: false, error: 'Falta noticiaId.' }; }

    try {
      await wixData.remove(COL, noticiaId, AUTH);
      console.log(`${TAG} 🗑️ noticia eliminada: ${noticiaId}`);
      return { ok: true };

    } catch (e) {
      console.error(`${TAG} ❌ eliminarNoticia:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// 5. SUBIR IMAGEN DE NOTICIA
// Patrón literal de subirImagenCatalogo (centriCatalogo.web.js):
// mediaManager.upload → fileUrl → READ-MERGE-UPDATE de `imagen`.
// ═══════════════════════════════════════════════════════════════════════════
export const uploadImagenNoticia = webMethod(
  Permissions.SiteMember,
  async ({ noticiaId, base64Data, fileName, mimeType }) => {
    const guard = await _exigirAdmin();
    if (!guard.ok) { return { ok: false, error: guard.error }; }

    if (!noticiaId || !base64Data || !fileName) {
      return { ok: false, error: 'Faltan parámetros (noticiaId, base64Data, fileName).' };
    }

    try {
      const registro = await wixData.get(COL, noticiaId, AUTH);
      if (!registro) { return { ok: false, error: 'Noticia no encontrada.' }; }

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

      console.log(`${TAG} ✅ imagen subida y ${COL}.${F.imagen} actualizado: ${fileUrl}`);
      return { ok: true, fileUrl, publicUrl: _imgUrl(fileUrl) };

    } catch (e) {
      console.error(`${TAG} ❌ uploadImagenNoticia:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);