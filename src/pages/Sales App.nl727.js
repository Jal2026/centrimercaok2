/* ═══════════════════════════════════════════════════════════════════════════
 * CENTRIMERCA — CENTRI SALES · Page Code
 * Página:   Centri Sales (solo miembros con el rol «Centri Sales»)
 * VERSION:  1.0.0 (BETA)
 * FECHA:    25 Octubre 2026
 *
 * ───────────────────────────────────────────────────────────────────────────
 * QUÉ HACE
 * ───────────────────────────────────────────────────────────────────────────
 * Puente entre el custom element <centri-sales> y los webMethods:
 *   · backend/centriSalesClientes.web.js v1.2.0
 *   · backend/centriSalesVisitas.web.js  v1.0.0
 *
 *   1. Registra el listener 'sales-rpc' ANTES de enviar la config.
 *      El element emite { reqId, metodo, args }; aquí se llama al webMethod
 *      y se devuelve el resultado en el atributo `respuesta`
 *      { _ts, reqId, data }.
 *   2. centriSalesQuienSoy() → atributo `config`
 *      { comercial:{ nombre, rol, foto } } o { error }.
 *
 * ⛔ NO pasa el audio ni el informe: el element llama directamente por fetch
 *   a /_functions/centriSalesLabTranscribir y /_functions/centriSalesLabInforme
 *   (el audio no cabe en un atributo, que trunca a ~64 KB).
 *
 * El control de acceso (sesión + rol «Centri Sales» + ficha en `equipo`) lo
 * hace CADA webMethod en el servidor. Este archivo no decide nada.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * PROCEDENCIA
 * ───────────────────────────────────────────────────────────────────────────
 *   · trySetAttr(): COPIA LITERAL de CENTRI IA PRO.xjkdw.js v1.0.2.
 *   · try $w(EL_ID) + return: patrón de CENTRI IA PRO.xjkdw.js v1.0.2.
 *
 * Si en el editor el custom element tiene otro ID, cambia EL_ID.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
  centriSalesQuienSoy,
  centriSalesBuscarCliente,
  centriSalesCrearCliente
} from 'backend/centriSalesClientes.web';
import {
  centriSalesGuardarLlegada,
  centriSalesGuardarVisita,
  centriSalesVisitasHoy
} from 'backend/centriSalesVisitas.web';

// ── CONFIGURACIÓN ──────────────────────────────────────────────────────────

const EL_ID = '#centriSales';   // ← ajustar si el Element ID del editor difiere

const V = 'CENTRI SALES Page v1.0.0';

// Métodos que el element puede pedir. Cualquier otro nombre se rechaza.
const METODOS = {
  buscarCliente:  centriSalesBuscarCliente,
  crearCliente:   centriSalesCrearCliente,
  guardarLlegada: centriSalesGuardarLlegada,
  guardarVisita:  centriSalesGuardarVisita,
  visitasHoy:     centriSalesVisitasHoy
};

// ═══════════════════════════════════════════════════════════════════════════

$w.onReady(async function () {
  console.log(`[${V}] onReady`);

  let el;
  try {
    el = $w(EL_ID);
  } catch (e) {
    console.error(`[${V}] No existe el custom element ${EL_ID}. Revisa el Element ID en el editor.`);
    return;
  }

  // ── Helper robusto para setAttribute ─────────────────────────────────────
  // COPIA LITERAL de CENTRI IA PRO.xjkdw.js v1.0.2
  const trySetAttr = (name, value, retries = 3) => {
    try {
      el.setAttribute(name, value);
      return true;
    } catch (err) {
      console.warn(`[${V}] setAttribute("${name}") fallo:`, err.message);
      if (retries > 0) {
        setTimeout(() => trySetAttr(name, value, retries - 1), 200);
      } else {
        console.error(`[${V}] setAttribute("${name}") ABANDONO tras reintentos`);
      }
      return false;
    }
  };

  const responder = (reqId, data) => {
    trySetAttr('respuesta', JSON.stringify({ _ts: Date.now(), reqId, data }));
  };

  // ═════════════════════════════════════════════════════════════════════════
  // LISTENERS (antes de la config)
  // ═════════════════════════════════════════════════════════════════════════

  el.on('sales-rpc', async (event) => {
    const { reqId, metodo, args } = event.detail || {};
    if (!reqId) return;
    const fn = METODOS[metodo];
    if (!fn) {
      console.warn(`[${V}] método desconocido: ${metodo}`);
      responder(reqId, { ok: false, error: { code: 'METODO_DESCONOCIDO', message: 'Operación no disponible.' } });
      return;
    }
    try {
      const result = await fn(args || {});
      if (!result || !result.ok) {
        console.warn(`[${V}] ${metodo} ERR:`, (result && result.error) || result);
      }
      responder(reqId, result);
    } catch (err) {
      console.error(`[${V}] ${metodo} EXCEPTION:`, err);
      responder(reqId, { ok: false, error: { code: 'ERROR_CONEXION', message: 'Error de conexión. Inténtalo otra vez.' } });
    }
  });

  el.on('sales-ready', () => {
    console.log(`[${V}] custom element listo`);
  });

  console.log(`[${V}] listeners registrados`);

  // ═════════════════════════════════════════════════════════════════════════
  // QUIÉN SOY Y CONFIG
  // ═════════════════════════════════════════════════════════════════════════

  let config;
  try {
    const r = await centriSalesQuienSoy();
    if (r && r.ok) {
      config = { _ts: Date.now(), comercial: r.comercial };
      console.log(`[${V}] comercial: ${r.comercial && r.comercial.nombre}`);
    } else {
      const msg = (r && r.error && r.error.message) || 'No tienes acceso.';
      console.warn(`[${V}] sin acceso: ${msg}`);
      config = { _ts: Date.now(), error: msg };
    }
  } catch (err) {
    console.error(`[${V}] centriSalesQuienSoy EXCEPTION:`, err);
    config = { _ts: Date.now(), error: 'Error de conexión: ' + err.message };
  }

  setTimeout(() => trySetAttr('config', JSON.stringify(config)), 150);
});
