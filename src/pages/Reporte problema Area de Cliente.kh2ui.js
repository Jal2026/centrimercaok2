/*
 * CENTRIMERCA — Hall Área de Clientes · Page Code · v1.0.2
 * Página:  la del hall donde vive el HtmlComponent.
 * Archivo: pega esto en el code panel de esa página.
 *
 * REQUIERE: Hall_Area_de_Clientes_Centrimerca_v1_0_1.html en un HtmlComponent.
 *
 * QUÉ HACE: puente puro. El iframe avisa del botón pulsado con
 *   parent.postMessage({ type: 'hallNavegar', boton })
 * y aquí se navega con wixLocation.to() a la URL/ruta guardada en
 * CentriConfig (lectura .limit(1), igual que FichaProducto_page.js).
 *
 *   boton      → campo CentriConfig
 *   acceder    → btnAcceder   (URL)
 *   tutorial   → btnTutorial  (Texto: URL o ruta)
 *   ayuda      → btnAyuda     (Texto: URL o ruta)
 *   terminos   → btnTerminos  (Texto: URL o ruta)
 *
 * ⚠️ CONFIRMA EL ELEMENT ID:
 *     EL — Element ID del HtmlComponent (por defecto '#htmlHallClientes').
 * ⚠️ CentriConfig debe tener permiso de lectura «Cualquiera».
 *
 * v1.0.1 — normaliza el destino antes de wixLocation.to():
 *   'https://…' / 'http://…' → tal cual (externo)
 *   '/ruta'                  → tal cual (interno)
 *   'www.…'                  → antepone 'https://'
 *   'ruta' (sin barra)       → antepone '/'
 *   y registra en consola el valor crudo y el destino final.
 *
 * v1.0.2 — las rutas internas se convierten en URL absoluta con
 *   wixLocation.baseUrl ('/tutorialareaclientes' → 'https://www.centrimerca.es/tutorialareaclientes').
 *   Así todos los botones navegan por el mismo camino que el enlace externo,
 *   que es el que está comprobado que funciona.
 */

import wixData from 'wix-data';
import wixLocation from 'wix-location';

const V          = 'Hall Clientes Page v1.0.2';
const EL         = '#htmlHallClientes';   // ← Element ID del HtmlComponent
const COL_CONFIG = 'CentriConfig';

const CAMPOS = {
  acceder:  'btnAcceder',
  tutorial: 'btnTutorial',
  ayuda:    'btnAyuda',
  terminos: 'btnTerminos'
};

$w.onReady(function () {
  let el;
  try { el = $w(EL); } catch (e) {
    console.error(`[${V}] no encuentro ${EL}`);
    return;
  }

  // Config leída una sola vez; los clics esperan a esta promesa.
  const cfgPromise = wixData.query(COL_CONFIG).limit(1).find()
    .then(res => (res.items && res.items[0]) || {})
    .catch(err => {
      console.warn(`[${V}] no pude leer "${COL_CONFIG}" (¿ID o permisos?):`, err && err.message);
      return {};
    });

  el.onMessage(async (event) => {
    const msg = event && event.data;
    if (!msg || typeof msg !== 'object' || msg.type !== 'hallNavegar') { return; }

    const campo = CAMPOS[msg.boton];
    if (!campo) {
      console.warn(`[${V}] botón desconocido: "${msg.boton}"`);
      return;
    }

    const cfg = await cfgPromise;
    const url = (typeof cfg[campo] === 'string') ? cfg[campo].trim() : '';
    if (!url) {
      console.warn(`[${V}] ${COL_CONFIG}.${campo} vacío — botón "${msg.boton}" sin destino`);
      return;
    }
    const destino = normalizarDestino(url);
    console.log(`[${V}] ${msg.boton}: crudo="${url}" → destino="${destino}"`);
    wixLocation.to(destino);
  });
});

function normalizarDestino(url) {
  if (/^https?:\/\//i.test(url)) { return url; }
  if (/^www\./i.test(url)) { return 'https://' + url; }
  const ruta = (url.charAt(0) === '/') ? url : ('/' + url);
  const base = String(wixLocation.baseUrl || '').replace(/\/+$/, '');
  return base + ruta;
}