/* ═══════════════════════════════════════════════════════════════════════════
 * CENTRIMERCA — Catálogo · Backend del editor
 * Archivo:  backend/centriCatalogo.web.js
 * VERSION:  1.0.3
 * FECHA:    18 Septiembre 2026
 *
 * ───────────────────────────────────────────────────────────────────────────
 * PROCEDENCIA
 * ───────────────────────────────────────────────────────────────────────────
 * Guard de acceso: copia literal de _exigirAdmin() de centriEntrenador.web.js
 *   v1.0.0 (autoriza por email en CentriAdmins, falla cerrado).
 * Subida de imágenes: patrón literal de uploadImagenCategoria() de
 *   categoriasEditorLogic.web.js (KAMISUITE) — mediaManager.upload → fileUrl →
 *   READ-MERGE-UPDATE del campo.
 * Lectura de `temporada`: copia literal de parseTemporada() de
 *   FichaProducto.page.js v1.1.0 (doble JSON.parse).
 *
 * ───────────────────────────────────────────────────────────────────────────
 * QUÉ ES
 * ───────────────────────────────────────────────────────────────────────────
 * La superficie de gobierno del catálogo: Productos (genéricos) y Variedades,
 * con sus dos banderas de visibilidad — `activo` y `destacado` — en las dos
 * colecciones. Centrimerca edita el catálogo sin bajar al CMS.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * IDs DE COLECCIÓN
 * ───────────────────────────────────────────────────────────────────────────
 * C_PRODUCTOS = 'productos'  ·  C_VARIEDADES = 'variedades'
 * En minúscula, tal y como están en el editor. El nombre VISIBLE es otra cosa
 * ("Variedades"): usarlo fue lo que costó un WDE0025 en la ficha de producto
 * (bitácora 14/09/2026). No reescribir estas dos constantes al reentregar.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ⚠️ CAMPOS QUE ESTE MÓDULO NO ESCRIBE NUNCA
 * ───────────────────────────────────────────────────────────────────────────
 *   Productos.productosList  — campo URL. Si es el enlace de página dinámica
 *                              que genera Wix, escribirlo falla. Se lee y se
 *                              devuelve para mostrarlo; no se guarda.
 *   Productos.variantes      — texto obsoleto, sustituido por la colección de
 *                              variedades. Se lee para avisar; no se guarda.
 *   Productos.ilustracionGenerica — descartado en la ficha (el fallback se
 *                              resuelve al pintar, con SVG). No se toca.
 *   Productos.imagen / Variedades.foto — solo por subirImagenCatalogo().
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { webMethod, Permissions } from 'wix-web-module';
import wixData from 'wix-data';
import { mediaManager } from 'wix-media-backend';
import { currentMember } from 'wix-members-backend';

const VERSION = '1.0.3';
const TAG = `[CentriCatalogo][${VERSION}]`;
const AUTH = { suppressAuth: true };

// ── IDs de colección ───────────────────────────────────────────────────────
const C_PRODUCTOS  = 'productos';
const C_VARIEDADES = 'variedades';
const C_ADMINS     = 'CentriAdmins';

// ── Campo referencia Variedades → Productos ────────────────────────────────
const REF_FIELD = 'producto';

// ── Carpetas del Media Manager ─────────────────────────────────────────────
const CARPETA_PRODUCTOS  = '/Centrimerca/Productos';
const CARPETA_VARIEDADES = '/Centrimerca/Variedades';

const LIMITE = 1000;

// Solo estos campos se escriben. Todo lo que llegue del widget fuera de esta
// lista se descarta: el widget no decide el esquema.
const CAMPOS_PRODUCTO = [
  'nombre', 'descripcion', 'categoria', 'subcategoria', 'orden', 'origen',
  'transporte', 'conservacion', 'maduracion', 'activo', 'destacado'
];
const CAMPOS_VARIEDAD = [
  'nombre', 'referencia', 'descripcion', 'formatos', 'calibre', 'dulzor',
  'uso', 'orden', 'activo', 'destacado'
];

const CAMPOS_TEXTO_PRODUCTO = ['nombre', 'descripcion', 'categoria', 'subcategoria', 'origen', 'transporte', 'conservacion', 'maduracion'];
const CAMPOS_TEXTO_VARIEDAD = ['nombre', 'referencia', 'descripcion', 'formatos', 'calibre', 'dulzor', 'uso'];

// ═══════════════════════════════════════════════════════════════════════════
// CONTROL DE ACCESO  (copia literal de centriEntrenador.web.js v1.0.0)
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
      console.warn(`${TAG} acceso DENEGADO al catálogo: email=${email || '—'} memberId=${memberId || '—'} (${filas.length} filas activas en ${C_ADMINS})`);

      // v1.0.2 — El diagnóstico va en el propio mensaje. Un "no tienes acceso"
      // a secas obliga a bajar a los logs del sitio para saber si falta la
      // fila, si `activo` no es booleano o si el correo de login no es el que
      // está escrito en el CMS. Aquí se lee de un vistazo:
      //   filas activas 0  → nadie tiene `activo: true` (o el campo es texto)
      //   email '—'        → el fieldset no devolvió correo: usar `memberId`
      //   email correcto y filas > 0 → el correo del CMS no es el de login
      const pista = `Detectado: correo ${email || '—'}, memberId ${memberId || '—'}. ` +
                    `${C_ADMINS} tiene ${filas.length} fila(s) con activo=true. ` +
                    `Añade una fila con ese correo en \`email\` y \`activo\` marcado, o pega ese memberId en \`memberId\`.`;
      return { ok: false, error: `No tienes acceso al editor de catálogo. ${pista}` };
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

function _txt(v) {
  return (v === null || v === undefined) ? '' : String(v).trim();
}

function _num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function _bool(v) {
  return v === true || v === 'true';
}

/* wix:image://v1/<mediaId>/<file>#...  →  https://static.wixstatic.com/media/<mediaId> */
function _imgUrl(uri) {
  if (!uri || typeof uri !== 'string') { return ''; }
  if (uri.indexOf('http') === 0) { return uri; }
  const m = uri.match(/wix:image:\/\/v1\/([^/]+)/);
  return m ? ('https://static.wixstatic.com/media/' + m[1]) : '';
}

/*
 * temporada se guarda como TEXTO y Wix lo aceptó como string JSON escapado,
 * así que puede necesitar hasta DOS JSON.parse. Copia literal de
 * FichaProducto.page.js v1.1.0 — si cambia aquí, cambia allí.
 */
function _parseTemporada(raw) {
  if (raw === null || raw === undefined || raw === '') { return {}; }
  let val = raw;
  for (let i = 0; i < 2 && typeof val === 'string'; i++) {
    const s = val.trim();
    if (!s) { return {}; }
    try {
      val = JSON.parse(s);
    } catch (e) {
      console.warn(`${TAG} temporada: JSON.parse pasada ${i + 1} falló:`, e && e.message);
      return {};
    }
  }
  if (val && typeof val === 'object') { return val; }
  return {};
}

/* El campo referencia puede llegar como id (string) o como objeto hidratado. */
function _refId(v) {
  if (!v) { return ''; }
  if (typeof v === 'string') { return v; }
  if (typeof v === 'object') { return _txt(v._id); }
  return '';
}

function _mapProducto(p) {
  return {
    id:           p._id,
    nombre:       _txt(p.nombre),
    descripcion:  _txt(p.descripcion),
    categoria:    _txt(p.categoria),
    subcategoria: _txt(p.subcategoria),
    orden:        (typeof p.orden === 'number') ? p.orden : 0,
    origen:       _txt(p.origen),
    temporada:    _parseTemporada(p.temporada),
    transporte:   _txt(p.transporte),
    conservacion: _txt(p.conservacion),
    maduracion:   _txt(p.maduracion),
    activo:       p.activo === true,
    destacado:    p.destacado === true,
    imagen:       _imgUrl(p.imagen),
    // Solo lectura (ver cabecera): no se escriben nunca.
    variantes:    _txt(p.variantes),
    fichaUrl:     _txt(p.productosList)
  };
}

function _mapVariedad(v, productoIdResuelto) {
  return {
    id:          v._id,
    productoId:  productoIdResuelto || _refId(v[REF_FIELD]),
    generico:    _txt(v.generico),
    nombre:      _txt(v.nombre),
    referencia:  _txt(v.referencia),
    descripcion: _txt(v.descripcion),
    formatos:    _txt(v.formatos),
    calibre:     _txt(v.calibre),
    dulzor:      _txt(v.dulzor),
    uso:         _txt(v.uso),
    orden:       (typeof v.orden === 'number') ? v.orden : 0,
    activo:      v.activo === true,
    destacado:   v.destacado === true,
    foto:        _imgUrl(v.foto)
  };
}

/*
 * v1.0.3 — Todas las filas de una familia.
 *
 * Busca por referencia Y por `generico`, y fusiona sin repetir. Una sola vía
 * deja fuera filas reales: hay variedades con la referencia vacía que solo
 * llevan el nombre de familia, y la ficha pública las encuentra igual porque
 * consulta `generico` primero.
 */
async function _filasFamilia(productoId, nombre) {
  const consultas = [
    wixData.query(C_VARIEDADES).eq(REF_FIELD, productoId).limit(LIMITE).find(AUTH)
  ];
  if (nombre) {
    consultas.push(wixData.query(C_VARIEDADES).eq('generico', nombre).limit(LIMITE).find(AUTH));
  }
  const resultados = await Promise.all(consultas);
  const vistos = {};
  const filas = [];
  for (let i = 0; i < resultados.length; i++) {
    const items = resultados[i].items || [];
    for (let j = 0; j < items.length; j++) {
      if (!vistos[items[j]._id]) { vistos[items[j]._id] = true; filas.push(items[j]); }
    }
  }
  return filas;
}

/* Aplica solo los campos de la lista blanca sobre el registro ya leído. */
function _mergeCampos(registro, datos, lista, listaTexto) {
  const out = Object.assign({}, registro);
  for (let i = 0; i < lista.length; i++) {
    const k = lista[i];
    if (!Object.prototype.hasOwnProperty.call(datos, k)) { continue; }
    if (k === 'orden') { out[k] = _num(datos[k]); }
    else if (k === 'activo' || k === 'destacado') { out[k] = _bool(datos[k]); }
    else if (listaTexto.indexOf(k) >= 0) { out[k] = _txt(datos[k]); }
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. CARGA COMPLETA DEL CATÁLOGO
// ═══════════════════════════════════════════════════════════════════════════
export const cargarCatalogo = webMethod(
  Permissions.SiteMember,
  async () => {
    const guard = await _exigirAdmin();
    if (!guard.ok) { return { ok: false, error: guard.error }; }

    try {
      const [rp, rv] = await Promise.all([
        wixData.query(C_PRODUCTOS).ascending('orden').limit(LIMITE).find(AUTH),
        wixData.query(C_VARIEDADES).ascending('orden').limit(LIMITE).find(AUTH)
      ]);

      const productos = (rp.items || []).map(_mapProducto);

      // Índice nombre → id para resolver variedades que solo tienen `generico`
      // (la ficha de producto consulta primero por ese campo, así que aquí se
      // resuelve igual: referencia rota pero nombre correcto sigue enlazando).
      const porNombre = {};
      for (let i = 0; i < productos.length; i++) {
        porNombre[productos[i].nombre.toLowerCase()] = productos[i].id;
      }

      const variedades = (rv.items || []).map(v => {
        let pid = _refId(v[REF_FIELD]);
        if (!pid) { pid = porNombre[_txt(v.generico).toLowerCase()] || ''; }
        return _mapVariedad(v, pid);
      });

      // Vocabulario de subcategorías tal y como está EN LOS DATOS. No se
      // inventa taxonomía: las pestañas del widget salen de aquí, así que
      // coinciden con las que pinta la web.
      const subcats = {};
      for (let i = 0; i < productos.length; i++) {
        const cat = productos[i].categoria || '(sin categoría)';
        const sub = productos[i].subcategoria;
        if (!subcats[cat]) { subcats[cat] = []; }
        if (sub && subcats[cat].indexOf(sub) < 0) { subcats[cat].push(sub); }
      }
      Object.keys(subcats).forEach(k => subcats[k].sort((a, b) => a.localeCompare(b, 'es')));

      console.log(`${TAG} catálogo cargado: ${productos.length} productos, ${variedades.length} variedades`);

      return {
        ok: true,
        productos,
        variedades,
        subcategorias: subcats,
        huerfanas: variedades.filter(v => !v.productoId).length
      };

    } catch (e) {
      console.error(`${TAG} ❌ cargarCatalogo — casi seguro ID de colección incorrecto (C_PRODUCTOS="${C_PRODUCTOS}", C_VARIEDADES="${C_VARIEDADES}"):`, e.message);
      return { ok: false, error: `No pude leer el catálogo: ${e.message}` };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// 2. GUARDAR PRODUCTO (alta y edición)
// ═══════════════════════════════════════════════════════════════════════════
export const guardarProducto = webMethod(
  Permissions.SiteMember,
  async ({ productoId, datos }) => {
    const guard = await _exigirAdmin();
    if (!guard.ok) { return { ok: false, error: guard.error }; }

    const d = datos || {};
    const nombre = _txt(d.nombre);
    if (!nombre) { return { ok: false, error: 'El nombre es obligatorio.' }; }

    try {
      let registro;
      let nombreAnterior = '';

      if (productoId) {
        registro = await wixData.get(C_PRODUCTOS, productoId, AUTH);
        if (!registro) { return { ok: false, error: 'Producto no encontrado.' }; }
        nombreAnterior = _txt(registro.nombre);
      } else {
        registro = { activo: false, destacado: false, orden: 0 };
      }

      const merged = _mergeCampos(registro, d, CAMPOS_PRODUCTO, CAMPOS_TEXTO_PRODUCTO);

      // temporada: el widget manda objeto; el CMS guarda texto.
      if (Object.prototype.hasOwnProperty.call(d, 'temporada')) {
        const t = d.temporada;
        if (t && typeof t === 'object') { merged.temporada = JSON.stringify(t); }
        else if (typeof t === 'string') { merged.temporada = t; }
      }

      const guardado = productoId
        ? await wixData.update(C_PRODUCTOS, merged, AUTH)
        : await wixData.insert(C_PRODUCTOS, merged, AUTH);

      // Si cambia el nombre, las variedades que enlazan por `generico` se
      // quedarían colgadas: la ficha consulta ese campo antes que la
      // referencia. Se propaga el nombre nuevo.
      let variedadesActualizadas = 0;
      if (productoId && nombreAnterior && nombreAnterior !== _txt(guardado.nombre)) {
        const rv = await wixData.query(C_VARIEDADES)
          .eq(REF_FIELD, productoId)
          .limit(LIMITE)
          .find(AUTH);
        const filas = rv.items || [];
        for (let i = 0; i < filas.length; i++) {
          if (_txt(filas[i].generico) !== _txt(guardado.nombre)) {
            await wixData.update(C_VARIEDADES, Object.assign({}, filas[i], { generico: _txt(guardado.nombre) }), AUTH);
            variedadesActualizadas++;
          }
        }
        console.log(`${TAG} nombre "${nombreAnterior}" → "${guardado.nombre}": ${variedadesActualizadas} variedades resincronizadas`);
      }

      console.log(`${TAG} ✅ producto ${productoId ? 'actualizado' : 'creado'}: ${guardado._id}`);
      return { ok: true, producto: _mapProducto(guardado), variedadesActualizadas };

    } catch (e) {
      console.error(`${TAG} ❌ guardarProducto:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// 3. GUARDAR VARIEDAD (alta y edición)
// ═══════════════════════════════════════════════════════════════════════════
export const guardarVariedad = webMethod(
  Permissions.SiteMember,
  async ({ variedadId, productoId, datos }) => {
    const guard = await _exigirAdmin();
    if (!guard.ok) { return { ok: false, error: guard.error }; }

    const d = datos || {};
    const nombre = _txt(d.nombre);
    if (!nombre) { return { ok: false, error: 'El nombre de la variedad es obligatorio.' }; }
    if (!productoId) { return { ok: false, error: 'Falta el producto al que pertenece la variedad.' }; }

    try {
      const producto = await wixData.get(C_PRODUCTOS, productoId, AUTH);
      if (!producto) { return { ok: false, error: 'El producto de esta variedad no existe.' }; }

      let registro;
      if (variedadId) {
        registro = await wixData.get(C_VARIEDADES, variedadId, AUTH);
        if (!registro) { return { ok: false, error: 'Variedad no encontrada.' }; }
      } else {
        registro = { activo: false, destacado: false, orden: 0 };
      }

      const merged = _mergeCampos(registro, d, CAMPOS_VARIEDAD, CAMPOS_TEXTO_VARIEDAD);

      // Los DOS enlaces, siempre. La ficha usa `generico` primero y la
      // referencia como respaldo; dejar uno solo relleno es cómo se pierde
      // una variedad sin que nadie lo vea.
      merged[REF_FIELD] = productoId;
      merged.generico   = _txt(producto.nombre);

      const guardado = variedadId
        ? await wixData.update(C_VARIEDADES, merged, AUTH)
        : await wixData.insert(C_VARIEDADES, merged, AUTH);

      console.log(`${TAG} ✅ variedad ${variedadId ? 'actualizada' : 'creada'}: ${guardado._id} (${producto.nombre})`);
      return { ok: true, variedad: _mapVariedad(guardado, productoId) };

    } catch (e) {
      console.error(`${TAG} ❌ guardarVariedad:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// 4. TOGGLES (activo / destacado) — las dos banderas de visibilidad
// ═══════════════════════════════════════════════════════════════════════════
async function _toggle(coleccion, id, campo, valor, etiqueta) {
  if (campo !== 'activo' && campo !== 'destacado') {
    return { ok: false, error: `Campo no permitido: ${campo}` };
  }
  try {
    const registro = await wixData.get(coleccion, id, AUTH);
    if (!registro) { return { ok: false, error: `${etiqueta} no encontrada.` }; }
    registro[campo] = _bool(valor);
    await wixData.update(coleccion, registro, AUTH);
    console.log(`${TAG} ✅ ${etiqueta} ${id}: ${campo}=${registro[campo]}`);
    return { ok: true, id, campo, valor: registro[campo] };
  } catch (e) {
    console.error(`${TAG} ❌ toggle ${etiqueta}:`, e.message);
    return { ok: false, error: e.message };
  }
}

export const toggleProducto = webMethod(
  Permissions.SiteMember,
  async ({ productoId, campo, valor }) => {
    const guard = await _exigirAdmin();
    if (!guard.ok) { return { ok: false, error: guard.error }; }
    return _toggle(C_PRODUCTOS, productoId, campo, valor, 'producto');
  }
);

/**
 * v1.0.3 — Condición de DESTACADA de una familia.
 *
 * La cadena del catálogo: producto → si tiene variedades es FAMILIA → si sus
 * variedades están ACTIVAS, la familia está en Destacados. La página
 * Destacados es la colección de variedades filtrada por `activo`, así que
 * dar o quitar esa condición es escribir `activo` en TODAS las filas de la
 * familia de una vez. Eso es lo que hace este método, y es el único sitio
 * donde se escribe en bloque.
 *
 * El campo `destacado` no interviene: ni se lee ni se escribe.
 */
export const toggleFamiliaDestacada = webMethod(
  Permissions.SiteMember,
  async ({ productoId, valor }) => {
    const guard = await _exigirAdmin();
    if (!guard.ok) { return { ok: false, error: guard.error }; }
    if (!productoId) { return { ok: false, error: 'Falta el producto.' }; }

    const activar = _bool(valor);

    try {
      const producto = await wixData.get(C_PRODUCTOS, productoId, AUTH);
      if (!producto) { return { ok: false, error: 'Producto no encontrado.' }; }

      const filas = await _filasFamilia(productoId, _txt(producto.nombre));
      if (!filas.length) {
        return { ok: false, error: `"${_txt(producto.nombre)}" no tiene variedades: sin variedades no es una familia y no puede estar en Destacados.` };
      }

      const tocadas = [];
      for (let i = 0; i < filas.length; i++) {
        if (filas[i].activo === activar) { continue; }
        await wixData.update(C_VARIEDADES, Object.assign({}, filas[i], { activo: activar }), AUTH);
        tocadas.push(filas[i]._id);
      }

      console.log(`${TAG} ✅ familia "${_txt(producto.nombre)}" ${activar ? 'DESTACADA' : 'fuera de Destacados'}: activo=${activar} en ${tocadas.length} de ${filas.length} variedades`);

      return {
        ok: true,
        productoId,
        valor: activar,
        ids: filas.map(f => f._id),
        tocadas: tocadas.length,
        total: filas.length
      };

    } catch (e) {
      console.error(`${TAG} ❌ toggleFamiliaDestacada:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

export const toggleVariedad = webMethod(
  Permissions.SiteMember,
  async ({ variedadId, campo, valor }) => {
    const guard = await _exigirAdmin();
    if (!guard.ok) { return { ok: false, error: guard.error }; }
    return _toggle(C_VARIEDADES, variedadId, campo, valor, 'variedad');
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// 5. BORRADOS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Borrar un producto con variedades deja huérfanas en la otra colección, que
 * no se ven en ninguna pantalla. Por eso el borrado con variedades exige
 * `forzar:true` explícito y entonces las borra también.
 */
export const eliminarProducto = webMethod(
  Permissions.SiteMember,
  async ({ productoId, forzar }) => {
    const guard = await _exigirAdmin();
    if (!guard.ok) { return { ok: false, error: guard.error }; }
    if (!productoId) { return { ok: false, error: 'Falta el producto.' }; }

    try {
      const producto = await wixData.get(C_PRODUCTOS, productoId, AUTH);
      if (!producto) { return { ok: false, error: 'Producto no encontrado.' }; }

      const rv = await wixData.query(C_VARIEDADES)
        .eq(REF_FIELD, productoId)
        .limit(LIMITE)
        .find(AUTH);
      const filas = rv.items || [];

      if (filas.length > 0 && forzar !== true) {
        return {
          ok: false,
          requiereConfirmacion: true,
          variedades: filas.length,
          error: `"${_txt(producto.nombre)}" tiene ${filas.length} variedades. Confirma para borrar producto y variedades.`
        };
      }

      for (let i = 0; i < filas.length; i++) {
        await wixData.remove(C_VARIEDADES, filas[i]._id, AUTH);
      }
      await wixData.remove(C_PRODUCTOS, productoId, AUTH);

      console.log(`${TAG} 🗑️ producto eliminado: ${_txt(producto.nombre)} (+${filas.length} variedades)`);
      return { ok: true, productoId, variedadesEliminadas: filas.length };

    } catch (e) {
      console.error(`${TAG} ❌ eliminarProducto:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

export const eliminarVariedad = webMethod(
  Permissions.SiteMember,
  async ({ variedadId }) => {
    const guard = await _exigirAdmin();
    if (!guard.ok) { return { ok: false, error: guard.error }; }
    if (!variedadId) { return { ok: false, error: 'Falta la variedad.' }; }

    try {
      await wixData.remove(C_VARIEDADES, variedadId, AUTH);
      console.log(`${TAG} 🗑️ variedad eliminada: ${variedadId}`);
      return { ok: true, variedadId };
    } catch (e) {
      console.error(`${TAG} ❌ eliminarVariedad:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// 6. SUBIDA DE IMÁGENES
// Patrón literal de uploadImagenCategoria (KAMISUITE · categoriasEditorLogic):
// mediaManager.upload → fileUrl → READ-MERGE-UPDATE del campo.
//   destino 'producto' → Productos.imagen
//   destino 'variedad' → Variedades.foto
// ═══════════════════════════════════════════════════════════════════════════
export const subirImagenCatalogo = webMethod(
  Permissions.SiteMember,
  async ({ destino, id, base64Data, fileName, mimeType }) => {
    const guard = await _exigirAdmin();
    if (!guard.ok) { return { ok: false, error: guard.error }; }

    if (!id || !base64Data || !fileName) {
      return { ok: false, error: 'Faltan parámetros (id, base64Data, fileName).' };
    }
    if (destino !== 'producto' && destino !== 'variedad') {
      return { ok: false, error: `Destino no permitido: ${destino}` };
    }

    const coleccion = (destino === 'producto') ? C_PRODUCTOS : C_VARIEDADES;
    const campo     = (destino === 'producto') ? 'imagen' : 'foto';
    const carpeta   = (destino === 'producto') ? CARPETA_PRODUCTOS : CARPETA_VARIEDADES;

    try {
      const registro = await wixData.get(coleccion, id, AUTH);
      if (!registro) { return { ok: false, error: 'Registro no encontrado.' }; }

      const buffer = Buffer.from(base64Data, 'base64');
      const uploadResult = await mediaManager.upload(
        carpeta,
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
      await wixData.update(coleccion, Object.assign({}, registro, { [campo]: fileUrl }), AUTH);

      console.log(`${TAG} ✅ imagen subida y ${coleccion}.${campo} actualizado: ${fileUrl}`);
      return { ok: true, destino, id, fileUrl, publicUrl: _imgUrl(fileUrl) };

    } catch (e) {
      console.error(`${TAG} ❌ subirImagenCatalogo:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);