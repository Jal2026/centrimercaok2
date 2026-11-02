/*
 * CENTRIMERCA — Panel de la App de Ventas · Page Code · v1.0.0
 * Página:  la de CENTRIX donde vive el HtmlComponent del panel.
 * Archivo: pega esto en el code panel de esa página.
 *
 * REQUIERE: backend/centriSalesPanel.web.js v1.0.0 + Panel_App_Ventas_v1_0_0.html
 *
 * QUÉ ES: un PUENTE PURO iframe ↔ backend. Cero decisiones, cero `if` sobre
 * contenido. COPIA del patrón del page code del Gestor de equipo (v1.0.3):
 * recibe un postMessage del widget, llama al web method que le corresponde y
 * devuelve el resultado tal cual dentro de { type, payload }.
 *
 * Canal Widget → Page : el iframe hace parent.postMessage({type, ...})
 *                       → aquí llega por $w(EL).onMessage(event => event.data)
 * Canal Page → Widget : $w(EL).postMessage({type, payload})
 *
 * ⚠️ CONFIRMA EL ELEMENT ID:
 *     EL — Element ID del HtmlComponent en esta página (por defecto
 *          '#htmlPanelVentas').
 *
 * ⚠️ La lectura con IA (lectura → panelLectura) puede acercarse a los ~14 s
 *    en que se corta la conexión. Si se corta, llega aquí como excepción y se
 *    reenvía como error; el widget lo dice y se puede volver a pedir.
 */

import {
  panelCargar,
  panelEquipo,
  panelActivarApp,
  panelVisitas,
  panelVisita,
  panelProximas,
  panelBarometro,
  panelLectura,
  panelReinterpretarLote,
  panelAvisos,
  panelGuardarAviso
} from 'backend/centriSalesPanel.web.js';

const V  = 'Panel Ventas Page v1.0.0';
const EL = '#htmlPanelVentas';   // ← Element ID del HtmlComponent

$w.onReady(function () {
  let el;
  try { el = $w(EL); } catch (e) {
    console.error(`[${V}] no encuentro ${EL}`);
    return;
  }

  const responder = (type, payload) => {
    try { el.postMessage({ type, payload }); }
    catch (e) { console.error(`[${V}] postMessage(${type}) falló:`, e && e.message); }
  };

  el.onMessage(async (event) => {
    const msg = event && event.data;
    if (!msg || typeof msg !== 'object') { return; }

    try {
      switch (msg.type) {

        case 'ready': {
          const r = await panelCargar();
          responder('cargado', r);
          break;
        }

        case 'equipo': {
          const r = await panelEquipo();
          responder('equipo', r);
          break;
        }

        case 'activarApp': {
          const r = await panelActivarApp({ id: msg.id, activo: msg.activo });
          responder('appActivada', r);
          break;
        }

        case 'visitas': {
          const r = await panelVisitas({
            desde: msg.desde,
            hasta: msg.hasta,
            comercialId: msg.comercialId || '',
            resultado: msg.resultado || '',
            situacion: msg.situacion || ''
          });
          responder('visitas', r);
          break;
        }

        case 'visita': {
          const r = await panelVisita({ id: msg.id });
          responder('visita', r);
          break;
        }

        case 'proximas': {
          const r = await panelProximas({ comercialId: msg.comercialId || '' });
          responder('proximas', r);
          break;
        }

        case 'barometro': {
          const r = await panelBarometro({ desde: msg.desde, hasta: msg.hasta });
          responder('barometro', r);
          break;
        }

        case 'lectura': {
          const r = await panelLectura({ desde: msg.desde, hasta: msg.hasta, comercialId: msg.comercialId || '' });
          responder('lectura', r);
          break;
        }

        case 'reinterpretar': {
          const r = await panelReinterpretarLote({ max: msg.max });
          responder('reinterpretado', r);
          break;
        }

        case 'avisos': {
          const r = await panelAvisos();
          responder('avisos', r);
          break;
        }

        case 'guardarAviso': {
          const r = await panelGuardarAviso({
            id: msg.id || '',
            mensaje: msg.mensaje,
            activo: msg.activo,
            hasta: msg.hasta || '',
            destinatarios: msg.destinatarios || []
          });
          responder('avisoGuardado', r);
          break;
        }

        case 'resize': {
          // Igual que el Gestor de equipo: si el HtmlComponent admite fijar la
          // altura por código, se aplica; si no, no pasa nada.
          try { if (typeof msg.height === 'number' && msg.height > 0) { el.height = msg.height; } }
          catch (e) { /* HtmlComponent sin height por código: no-op */ }
          break;
        }

        default:
          // Mensajes no reconocidos: se ignoran (puente puro).
          break;
      }
    } catch (err) {
      console.error(`[${V}] error atendiendo "${msg.type}":`, err && err.message);
      responder('error', { ok: false, error: (err && err.message) || 'Error inesperado', origen: msg.type });
    }
  });
});
