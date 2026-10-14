/*
 * CENTRIMERCA — Ficha de Contacto · Custom Element
 * Archivo:  fichaContacto.js   ·   v1.0.2
 * Tag name: ficha-contacto      ·   Element ID esperado: #fichaContacto
 *
 * v1.0.2 — MÓVIL (incluye todo lo de v1.0.1):
 *   - Esquinas redondeadas en la portada y en la banda de acciones:
 *     10 % del ancho (min(10vw, 40px) → 39 px en un móvil de 390).
 *   - Botón «Compartir» arriba a la derecha del bloque del nombre. Usa el
 *     menú de compartir del móvil (navigator.share) con la URL de la ficha;
 *     si no existe, copia el enlace y avisa «Enlace copiado».
 *     Va a la altura del nombre para que la píldora del área (a la derecha
 *     del retrato) no se corte.
 *   CSS: .m-cover, .m-actions, .m-nombre, .m-share*. JS: _render (cablea el
 *   botón), _htmlMovil (envuelve nombre y cargo en .m-nombre con el botón),
 *   _compartir y _avisoCopiado (nuevos).
 *   Escritorio sin cambios.
 *
 * v1.0.1 — ESCRITORIO más bajo (tarjeta ≈ 880 → ≈ 670 px a 1366 × 768).
 *   CSS (solo clases .d-* y .d .*): menos aire vertical, casillas de acción
 *   de 52 px, filas de contacto y tarjetas de enlace más compactas.
 *   JS (solo _htmlEscritorio): «Guardar en contactos» pasa de la columna
 *   derecha a la izquierda, bajo el cargo. Móvil sin cambios.
 *
 * NUEVO. Vive en la página dinámica de ítem de `equipo`. Recibe el payload del
 * Page Code por setAttribute('ficha', JSON.stringify(...)) y se pinta solo.
 * Mismo canal que fichaProducto.js / centriConsole (Page → CE por atributo).
 *
 * Diseño: lienzo «Ficha de contacto de empleado · Centrimerca» (14/10/2026).
 *   · < 900 px  → MÓVIL: portada, retrato montado, banda de acciones verde,
 *                 «Guardar en contactos» FLOTANTE (position: fixed).
 *   · ≥ 900 px  → ESCRITORIO: tarjeta de dos columnas, botón en línea.
 *
 * Todo es HTML NATIVO (enlaces <a>), sin JavaScript en los botones:
 *   Llamar (tel:) · WhatsApp (wa.me) · Email (mailto:) · Web · Mapa ·
 *   Guardar en contactos (→ /_functions/fichaVcard?id=…) ·
 *   Hablar con CENTRI IA · Área de Clientes.
 * Cada acción y cada fila solo aparece si su dato existe.
 *
 * PAYLOAD (lo arma backend/centriFichaContacto.web.js; el Page Code añade
 * logoBlanco y logoColor):
 *   { ok: true,
 *     nombre, rol, area, descripcion, imagen, fotoGeneral,
 *     telVer, telHref, waHref, email, emailHref, webVer, webHref,
 *     direccion, mapaHref, vcardHref, centriHref, areaClientesHref,
 *     webEmpresaHref, logoBlanco, logoColor }
 *   { ok: false, motivo: 'no_disponible' | 'error', webEmpresaHref,
 *     logoBlanco, logoColor }
 *
 * ⚠️ PROBAR EN MÓVIL REAL: si algún contenedor de la página aplica
 *    `transform`, `position: fixed` deja de ir pegado a la pantalla y el
 *    botón «Guardar en contactos» se quedaría al final de la ficha.
 */

(function () {
  'use strict';

  if (customElements.get('ficha-contacto')) {
    return;
  }

  // ── Iconos (Lucide, licencia ISC) ─────────────────────────────────────────
  const ICON = {
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
    chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
    pin: '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
    userPlus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98"/><path d="m15.41 6.51-6.82 3.98"/>',
    sparkles: '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/>',
    panel: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    external: '<path d="M7 7h10v10"/><path d="M7 17 17 7"/>'
  };

  function svg(nombre, lado, trazo, grosor) {
    return '<svg width="' + lado + '" height="' + lado + '" viewBox="0 0 24 24" fill="none" stroke="' + trazo +
      '" stroke-width="' + grosor + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      ICON[nombre] + '</svg>';
  }

  const CSS = `
    :host{
      display:block;
      width:100%;
      font-family:'Bai Jamjuree',system-ui,sans-serif;
      color:#00393C;
      -webkit-font-smoothing:antialiased;
    }

    *{ box-sizing:border-box; }

    a{ color:#006166; text-decoration:none; }
    a:focus-visible{ outline:2px solid #E80A4D; outline-offset:2px; }

    /* ── Comunes ─────────────────────────────────────────────────────── */
    .pill{
      display:inline-flex; align-items:center; gap:8px;
      min-width:0; max-width:100%;
      padding:7px 14px 7px 12px;
      border-radius:999px;
      background:#D3E8E6;
    }
    .pill-dot{ flex:0 0 auto; width:7px; height:7px; border-radius:50%; background:#E80A4D; }
    .pill-txt{
      font-size:12px; font-weight:600; letter-spacing:.14em; text-transform:uppercase;
      color:#00393C; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
    }

    .sec-h{
      margin:0 0 12px;
      font-size:12.5px; font-weight:600; letter-spacing:.24em; text-transform:uppercase;
      color:#006166;
    }

    .rows{ display:flex; flex-direction:column; border-top:1px solid #DCEAE8; }
    .row-ico{
      flex:0 0 auto; display:flex; align-items:center; justify-content:center;
      width:42px; height:42px; border-radius:14px; background:#E1EFEE;
    }
    .row-lbl{
      font-size:11.5px; font-weight:600; letter-spacing:.14em; text-transform:uppercase;
      color:#557779;
    }
    .row-val{
      font-size:15.5px; line-height:1.4; font-weight:500;
      color:#00393C; overflow-wrap:anywhere;
    }

    .links{ display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
    .lk{
      display:flex; flex-direction:column; gap:14px;
      padding:16px 14px 16px 16px;
      border-radius:20px; background:#FFFFFF; border:1px solid #DCEAE8;
      color:#00393C; text-decoration:none;
      transition:border-color .15s ease;
    }
    .lk:hover{ border-color:#006166; }
    .lk-top{ display:flex; align-items:flex-start; justify-content:space-between; gap:8px; }
    .lk-ico{
      display:flex; align-items:center; justify-content:center;
      width:40px; height:40px; border-radius:13px; background:#006166;
    }
    .lk-txt{ display:flex; flex-direction:column; gap:3px; }
    .lk-t{ font-size:15.5px; line-height:1.2; font-weight:600; color:#00393C; }
    .lk-d{ font-size:13px; line-height:1.35; color:#557779; }

    .cta-txt{ white-space:nowrap; }

    /* ── MÓVIL (< 900 px) ────────────────────────────────────────────── */
    .m{ display:block; position:relative; background:#F6FAF9; color:#00393C; }
    .d{ display:none; }

    .m-cover{ position:relative; height:288px; overflow:hidden; background:#006166; border-radius:min(10vw, 40px); }
    .m-cover-img{
      position:absolute; inset:0; width:100%; height:100%; display:block;
      object-fit:cover; object-position:center 62%;
    }
    .m-veil{
      position:absolute; inset:0;
      background:linear-gradient(180deg, rgba(0,97,102,0.62) 0%, rgba(0,97,102,0.04) 32%, rgba(0,97,102,0.30) 58%, rgba(0,97,102,0.82) 82%, #006166 100%);
    }
    .m-logo{ position:absolute; top:20px; left:22px; display:block; height:50px; width:auto; }

    .m-body{ max-width:640px; margin:0 auto; }

    .m-id{ position:relative; padding:0 22px; display:flex; flex-direction:column; align-items:flex-start; }
    .m-id-row{ display:flex; align-items:flex-end; gap:14px; max-width:100%; margin-top:-66px; }
    .m-id-row.sin-foto{ margin-top:22px; }
    /* Bloque del nombre (v1.0.2): deja sitio al botón «Compartir» a la derecha */
    .m-nombre{ position:relative; align-self:stretch; margin-top:20px; padding-right:56px; }
    .m-nombre .m-name{ margin-top:0; }

    /* Botón «Compartir» (v1.0.2): arriba a la derecha del bloque del nombre */
    .m-share{
      position:absolute; top:-3px; right:0; z-index:2;
      display:flex; align-items:center; justify-content:center;
      width:44px; height:44px; padding:0; border:0; border-radius:50%;
      background:#E1EFEE; color:#006166; cursor:pointer;
      -webkit-tap-highlight-color:transparent;
      transition:background .15s ease;
    }
    .m-share:hover{ background:#CFE5E3; }
    .m-share:focus-visible{ outline:2px solid #E80A4D; outline-offset:2px; }
    .m-share-ok{
      position:absolute; top:48px; right:0; z-index:2;
      padding:4px 10px; border-radius:999px;
      background:#00393C; color:#FFFFFF;
      font-size:12px; font-weight:600; white-space:nowrap;
      opacity:0; pointer-events:none; transition:opacity .2s ease;
    }
    .m-share-ok.on{ opacity:1; }
    .m-portrait{
      flex:0 0 auto; display:block;
      width:132px; height:132px; border-radius:34px;
      object-fit:cover; object-position:50% 25%;
      border:4px solid #F6FAF9; background:#CFE5E3;
      box-shadow:0 14px 34px rgba(0,57,60,0.22);
    }
    .m-id-row .pill{ margin-bottom:10px; }
    .m-id-row.sin-foto .pill{ margin-bottom:0; }
    .m-name{
      margin:20px 0 0;
      font-size:40px; line-height:.98; font-weight:600; letter-spacing:-.04em;
      color:#00393C; text-wrap:balance;
    }
    .m-role{ margin:10px 0 0; font-size:17px; line-height:1.35; font-weight:500; color:#24494B; }

    .m-actions{ margin-top:28px; background:#006166; padding:22px 14px; border-radius:min(10vw, 40px); }
    .m-actions-grid{
      max-width:640px; margin:0 auto;
      display:grid; grid-template-columns:repeat(var(--n,5),minmax(0,1fr)); gap:6px;
    }
    .m-act{ display:flex; flex-direction:column; align-items:center; gap:8px; color:#CFE5E3; text-decoration:none; }
    .m-act-ico{
      display:flex; align-items:center; justify-content:center;
      width:54px; height:54px; border-radius:18px;
      background:rgba(255,255,255,0.10); border:1px solid rgba(255,255,255,0.18);
      transition:background .15s ease;
    }
    .m-act:hover .m-act-ico{ background:rgba(255,255,255,0.22); }
    .m-act-lbl{ font-size:12.5px; font-weight:600; letter-spacing:.01em; color:#CFE5E3; }

    .m-sec-pres{ padding:32px 22px 0; }
    .m-sec-cont{ padding:34px 22px 0; }
    .m-sec-links{ padding:30px 22px 0; }
    .m-txt{ margin:0; font-size:16px; line-height:1.55; color:#24494B; text-wrap:pretty; white-space:pre-line; }

    .m-row{
      display:flex; align-items:center; gap:14px;
      min-height:44px; padding:13px 0;
      border-bottom:1px solid #DCEAE8; text-decoration:none;
    }
    .m-row-body{ flex:1 1 auto; min-width:0; display:flex; flex-direction:column; gap:2px; }

    .m-foot{ display:flex; justify-content:center; padding:40px 22px 132px; }
    .m-foot img{ display:block; height:50px; width:auto; }

    .m-fade{
      position:fixed; left:0; right:0; bottom:0; height:118px; z-index:20;
      background:linear-gradient(to top, #F6FAF9 38%, rgba(246,250,249,0));
      pointer-events:none;
    }
    .m-cta{
      position:fixed; z-index:21;
      left:16px; right:16px; bottom:calc(18px + env(safe-area-inset-bottom));
      max-width:608px; margin:0 auto;
      display:flex; align-items:center; justify-content:center; gap:10px;
      height:58px; border-radius:999px;
      background:#E80A4D; color:#FFFFFF; text-decoration:none;
      font-size:17px; font-weight:600; letter-spacing:.01em;
      box-shadow:0 14px 30px rgba(232,10,77,0.30), 0 2px 6px rgba(0,57,60,0.12);
      transition:background .15s ease;
    }
    .m-cta:hover{ background:#C9083F; color:#FFFFFF; }

    /* ── ESCRITORIO (≥ 900 px) ───────────────────────────────────────── */
    @media (min-width:900px){
      .m{ display:none; }
      .d{ display:block; }
    }

    .d{ background:#E6EFEE; padding:32px 24px; color:#00393C; }
    .d-card{
      max-width:1120px; margin:0 auto;
      display:grid; grid-template-columns:repeat(2,minmax(0,1fr));
      border-radius:28px; overflow:hidden; background:#FFFFFF;
      box-shadow:0 30px 70px rgba(0,57,60,0.14);
    }

    .d-left{
      position:relative; min-height:560px;
      display:flex; flex-direction:column; justify-content:space-between; gap:40px;
      padding:28px 36px 34px; overflow:hidden; background:#006166;
    }
    .d-cover-img{
      position:absolute; inset:0; width:100%; height:100%; display:block;
      object-fit:cover; object-position:center 55%;
    }
    .d-veil{
      position:absolute; inset:0;
      background:linear-gradient(178deg, rgba(0,97,102,0.62) 0%, rgba(0,97,102,0.06) 30%, rgba(0,97,102,0.55) 58%, rgba(0,97,102,0.92) 80%, #006166 100%);
    }
    .d-logo{ position:relative; display:block; align-self:flex-start; height:60px; width:auto; }
    .d-logo-hueco{ position:relative; height:60px; }
    .d-id{ position:relative; display:flex; flex-direction:column; align-items:flex-start; }
    .d-portrait{
      display:block; width:124px; height:124px; border-radius:32px;
      object-fit:cover; object-position:50% 25%;
      border:3px solid rgba(255,255,255,0.92); background:#CFE5E3;
      box-shadow:0 16px 36px rgba(0,0,0,0.25);
    }
    .d-id .pill{ margin-top:24px; background:rgba(207,229,227,0.94); }
    .d-id .pill-txt{ font-size:12.5px; }
    .d-id > .pill:first-child{ margin-top:0; }
    .d-name{
      margin:16px 0 0;
      font-size:clamp(40px,5.2vw,62px); line-height:.92; font-weight:600; letter-spacing:-.045em;
      color:#FFFFFF; text-wrap:balance;
    }
    .d-id > .d-name:first-child{ margin-top:0; }
    .d-role{ margin:14px 0 0; font-size:20px; line-height:1.35; font-weight:500; color:rgba(255,255,255,0.93); }

    .d-right{
      min-width:0; display:flex; flex-direction:column; gap:24px;
      padding:36px clamp(28px,3.4vw,44px) 32px;
    }
    .d-actions{ display:grid; grid-template-columns:repeat(var(--n,5),minmax(0,1fr)); gap:10px; }
    .d-act{ display:flex; flex-direction:column; align-items:center; gap:8px; color:#00393C; text-decoration:none; }
    .d-act-ico{
      display:flex; align-items:center; justify-content:center;
      width:52px; height:52px; border-radius:18px; background:#006166;
      transition:background .15s ease;
    }
    .d-act:hover .d-act-ico{ background:#00393C; }
    .d-act-lbl{ font-size:13px; font-weight:600; color:#00393C; }

    .d .sec-h{ font-size:13px; margin-bottom:10px; }
    .d-txt{ margin:0; max-width:52ch; font-size:16.5px; line-height:1.55; color:#24494B; text-wrap:pretty; white-space:pre-line; }

    .d-row{
      display:flex; align-items:center; gap:14px;
      min-height:44px; padding:8px 0;
      border-bottom:1px solid #DCEAE8; text-decoration:none;
    }
    .d-row .row-ico{ width:36px; height:36px; border-radius:12px; }
    .d-row .row-lbl{ flex:0 0 104px; }
    .d-row .row-val{ flex:1 1 auto; min-width:0; }

    .d .links{ gap:12px; }
    .d .lk{ gap:10px; padding:14px 14px 14px 16px; }
    .d .lk-ico{ width:36px; height:36px; border-radius:12px; }
    .d .lk-t{ font-size:15.5px; }
    .d .lk-d{ font-size:13px; }

    /* «Guardar en contactos» en la columna izquierda, bajo el cargo */
    .d-id .d-cta{ margin-top:24px; }

    .d-cta{
      align-self:flex-start;
      display:inline-flex; align-items:center; justify-content:center; gap:10px;
      height:54px; padding:0 30px 0 26px; border-radius:999px;
      background:#E80A4D; color:#FFFFFF; text-decoration:none;
      font-size:17px; font-weight:600; letter-spacing:.01em;
      transition:background .15s ease;
    }
    .d-cta:hover{ background:#C9083F; color:#FFFFFF; }

    /* ── NO DISPONIBLE / ERROR ───────────────────────────────────────── */
    .nd{
      min-height:100vh;
      display:flex; flex-direction:column; align-items:center; justify-content:center; gap:28px;
      padding:48px 24px; text-align:center;
      background:#006166; color:#FFFFFF;
    }
    .nd img{ display:block; height:50px; width:auto; }
    .nd h1{ margin:0; max-width:22ch; font-size:28px; line-height:1.15; font-weight:600; letter-spacing:-.02em; color:#FFFFFF; }
    .nd a{
      display:inline-flex; align-items:center; justify-content:center;
      min-height:52px; padding:0 26px; border-radius:999px;
      border:1.5px solid rgba(255,255,255,0.6);
      color:#FFFFFF; font-size:16px; font-weight:600; text-decoration:none;
    }
    .nd a:hover{ border-color:#FFFFFF; color:#FFFFFF; }

    @media (prefers-reduced-motion: reduce){
      *{ transition:none!important; }
    }
  `;

  class FichaContacto extends HTMLElement {

    static get observedAttributes() {
      return ['ficha', 'FICHA'];
    }

    constructor() {
      super();
      this._data = null;
      this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
      this._asegurarFuente();

      if (!this._root) {
        const style = document.createElement('style');
        style.textContent = CSS;

        this._root = document.createElement('div');
        this._root.className = 'ficha';

        this.shadowRoot.appendChild(style);
        this.shadowRoot.appendChild(this._root);
      }

      const inicial =
        this.getAttribute('ficha') ||
        this.getAttribute('FICHA');

      if (inicial) {
        this._parsear(inicial);
      }

      this._render();
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (newVal == null || newVal === oldVal) {
        return;
      }

      this._parsear(newVal);

      if (this._root) {
        this._render();
      }
    }

    _parsear(raw) {
      try {
        this._data = JSON.parse(raw);
      } catch (err) {
        console.error('[ficha-contacto] payload no parseable:', err && err.message);
        this._data = { ok: false, motivo: 'error' };
      }
    }

    _asegurarFuente() {
      const ID = 'ficha-contacto-font';

      if (document.getElementById(ID)) {
        return;
      }

      const link = document.createElement('link');
      link.id = ID;
      link.rel = 'stylesheet';
      link.href =
        'https://fonts.googleapis.com/css2?family=Bai+Jamjuree:wght@400;500;600;700&display=swap';

      document.head.appendChild(link);
    }

    // Escapado para texto y atributos
    _e(s) {
      return s == null ? '' : String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    _ext(externo) {
      return externo ? ' target="_blank" rel="noopener"' : '';
    }

    _render() {
      const p = this._data;

      if (!p) {
        this._root.innerHTML = '';
        return;
      }

      if (p.ok !== true) {
        this._root.innerHTML = this._htmlNoDisponible(p);
        return;
      }

      this._root.innerHTML = this._htmlMovil(p) + this._htmlEscritorio(p);

      // v1.0.2: botón «Compartir» (móvil)
      const share = this._root.querySelector('.m-share');
      if (share) {
        share.addEventListener('click', () => this._compartir());
      }
    }

    // ── Compartir (v1.0.2) ──────────────────────────────────────────────────
    // Menú de compartir del móvil con la URL de la ficha. Sin él (escritorio
    // o navegador antiguo): copia el enlace y avisa.
    async _compartir() {
      const p = this._data || {};
      const url = String(window.location.href).split('#')[0];
      const titulo = (p.nombre ? p.nombre + ' · ' : '') + 'Centrimerca';

      if (navigator.share) {
        try {
          await navigator.share({ title: titulo, text: titulo, url: url });
          return;
        } catch (err) {
          if (err && err.name === 'AbortError') { return; }   // lo canceló el usuario
          console.warn('[ficha-contacto] share no disponible:', err && err.message);
        }
      }

      try {
        await navigator.clipboard.writeText(url);
        this._avisoCopiado();
      } catch (err) {
        window.prompt('Copia el enlace de la ficha:', url);
      }
    }

    _avisoCopiado() {
      const ok = this._root && this._root.querySelector('.m-share-ok');
      if (!ok) { return; }
      ok.textContent = 'Enlace copiado';
      ok.classList.add('on');
      clearTimeout(this._copiadoTimer);
      this._copiadoTimer = setTimeout(() => {
        ok.classList.remove('on');
        ok.textContent = '';
      }, 1800);
    }

    // ── Datos derivados ─────────────────────────────────────────────────────
    _acciones(p) {
      return [
        p.telHref   ? { lbl: 'Llamar',   href: p.telHref,   ico: 'phone', ext: false } : null,
        p.waHref    ? { lbl: 'WhatsApp', href: p.waHref,    ico: 'chat',  ext: true  } : null,
        p.emailHref ? { lbl: 'Email',    href: p.emailHref, ico: 'mail',  ext: false } : null,
        p.webHref   ? { lbl: 'Web',      href: p.webHref,   ico: 'globe', ext: true  } : null,
        p.mapaHref  ? { lbl: 'Mapa',     href: p.mapaHref,  ico: 'pin',   ext: true  } : null
      ].filter(Boolean);
    }

    _filas(p) {
      return [
        p.telHref   ? { lbl: 'Teléfono',  val: p.telVer,    href: p.telHref,   ico: 'phone', ext: false } : null,
        p.emailHref ? { lbl: 'Email',     val: p.email,     href: p.emailHref, ico: 'mail',  ext: false } : null,
        p.webHref   ? { lbl: 'Web',       val: p.webVer,    href: p.webHref,   ico: 'globe', ext: true  } : null,
        p.mapaHref  ? { lbl: 'Dirección', val: p.direccion, href: p.mapaHref,  ico: 'pin',   ext: true  } : null
      ].filter(Boolean);
    }

    _htmlPill(p) {
      if (!p.area) { return ''; }
      return '<div class="pill"><div class="pill-dot"></div><span class="pill-txt">' + this._e(p.area) + '</span></div>';
    }

    _htmlEnlaces(p) {
      const e = this._e.bind(this);
      const item = (href, ico, titulo, desc) => href ? (
        '<a class="lk" href="' + e(href) + '"' + this._ext(true) + '>' +
          '<span class="lk-top">' +
            '<span class="lk-ico">' + svg(ico, 20, '#FFFFFF', 1.7) + '</span>' +
            svg('external', 16, '#557779', 2) +
          '</span>' +
          '<span class="lk-txt">' +
            '<span class="lk-t">' + titulo + '</span>' +
            '<span class="lk-d">' + desc + '</span>' +
          '</span>' +
        '</a>'
      ) : '';

      const html =
        item(p.centriHref, 'sparkles', 'Hablar con CENTRI IA', 'La inteligencia artificial de Centrimerca') +
        item(p.areaClientesHref, 'panel', 'Área de Clientes', 'Pedidos, albaranes y facturas');

      return html ? '<div class="links">' + html + '</div>' : '';
    }

    // ── MÓVIL ───────────────────────────────────────────────────────────────
    _htmlMovil(p) {
      const e = this._e.bind(this);
      const acciones = this._acciones(p);
      const filas = this._filas(p);

      const portada =
        '<header class="m-cover">' +
          (p.fotoGeneral ? '<img class="m-cover-img" src="' + e(p.fotoGeneral) + '" alt="">' : '') +
          '<div class="m-veil"></div>' +
          (p.logoBlanco ? '<img class="m-logo" src="' + e(p.logoBlanco) + '" alt="Centrimerca">' : '') +
        '</header>';

      const identidad =
        '<div class="m-id">' +
          '<div class="m-id-row' + (p.imagen ? '' : ' sin-foto') + '">' +
            (p.imagen ? '<img class="m-portrait" src="' + e(p.imagen) + '" alt="' + e(p.nombre) + '">' : '') +
            this._htmlPill(p) +
          '</div>' +
          '<div class="m-nombre">' +
            // v1.0.2: «Compartir», arriba a la derecha del bloque del nombre
            '<button type="button" class="m-share" aria-label="Compartir ficha" title="Compartir">' +
              svg('share', 20, 'currentColor', 1.8) +
            '</button>' +
            '<span class="m-share-ok" role="status"></span>' +
            '<h1 class="m-name">' + e(p.nombre) + '</h1>' +
            (p.rol ? '<p class="m-role">' + e(p.rol) + '</p>' : '') +
          '</div>' +
        '</div>';

      const banda = acciones.length ? (
        '<nav class="m-actions" aria-label="Acciones de contacto">' +
          '<div class="m-actions-grid" style="--n:' + acciones.length + '">' +
            acciones.map(a =>
              '<a class="m-act" href="' + e(a.href) + '"' + this._ext(a.ext) + '>' +
                '<span class="m-act-ico">' + svg(a.ico, 24, '#FFFFFF', 1.7) + '</span>' +
                '<span class="m-act-lbl">' + a.lbl + '</span>' +
              '</a>'
            ).join('') +
          '</div>' +
        '</nav>'
      ) : '';

      const presentacion = p.descripcion ? (
        '<section class="m-sec-pres">' +
          '<h2 class="sec-h">Presentación</h2>' +
          '<p class="m-txt">' + e(p.descripcion) + '</p>' +
        '</section>'
      ) : '';

      const contacto = filas.length ? (
        '<section class="m-sec-cont">' +
          '<h2 class="sec-h">Contacto</h2>' +
          '<div class="rows">' +
            filas.map(f =>
              '<a class="m-row" href="' + e(f.href) + '"' + this._ext(f.ext) + '>' +
                '<span class="row-ico">' + svg(f.ico, 20, '#006166', 1.8) + '</span>' +
                '<span class="m-row-body">' +
                  '<span class="row-lbl">' + f.lbl + '</span>' +
                  '<span class="row-val">' + e(f.val) + '</span>' +
                '</span>' +
                svg('chevron', 18, '#7FA3A4', 2) +
              '</a>'
            ).join('') +
          '</div>' +
        '</section>'
      ) : '';

      const enlaces = this._htmlEnlaces(p);

      return (
        '<div class="m">' +
          portada +
          '<div class="m-body">' + identidad + '</div>' +
          banda +
          '<div class="m-body">' +
            presentacion +
            contacto +
            (enlaces ? '<section class="m-sec-links">' + enlaces + '</section>' : '') +
            '<footer class="m-foot">' +
              (p.logoColor ? '<img src="' + e(p.logoColor) + '" alt="Centrimerca">' : '') +
            '</footer>' +
          '</div>' +
          (p.vcardHref ? (
            '<div class="m-fade" aria-hidden="true"></div>' +
            '<a class="m-cta" href="' + e(p.vcardHref) + '">' +
              svg('userPlus', 22, '#FFFFFF', 1.9) +
              '<span class="cta-txt">Guardar en contactos</span>' +
            '</a>'
          ) : '') +
        '</div>'
      );
    }

    // ── ESCRITORIO ──────────────────────────────────────────────────────────
    _htmlEscritorio(p) {
      const e = this._e.bind(this);
      const acciones = this._acciones(p);
      const filas = this._filas(p);

      const izquierda =
        '<div class="d-left">' +
          (p.fotoGeneral ? '<img class="d-cover-img" src="' + e(p.fotoGeneral) + '" alt="">' : '') +
          '<div class="d-veil"></div>' +
          (p.logoBlanco
            ? '<img class="d-logo" src="' + e(p.logoBlanco) + '" alt="Centrimerca">'
            : '<div class="d-logo-hueco"></div>') +
          '<div class="d-id">' +
            (p.imagen ? '<img class="d-portrait" src="' + e(p.imagen) + '" alt="' + e(p.nombre) + '">' : '') +
            this._htmlPill(p) +
            '<h1 class="d-name">' + e(p.nombre) + '</h1>' +
            (p.rol ? '<p class="d-role">' + e(p.rol) + '</p>' : '') +
            // v1.0.1: «Guardar en contactos» aquí, bajo el cargo
            (p.vcardHref ? (
              '<a class="d-cta" href="' + e(p.vcardHref) + '">' +
                svg('userPlus', 22, '#FFFFFF', 1.9) +
                '<span class="cta-txt">Guardar en contactos</span>' +
              '</a>'
            ) : '') +
          '</div>' +
        '</div>';

      const bloques = [];

      if (acciones.length) {
        bloques.push(
          '<nav class="d-actions" aria-label="Acciones de contacto" style="--n:' + acciones.length + '">' +
            acciones.map(a =>
              '<a class="d-act" href="' + e(a.href) + '"' + this._ext(a.ext) + '>' +
                '<span class="d-act-ico">' + svg(a.ico, 24, '#FFFFFF', 1.7) + '</span>' +
                '<span class="d-act-lbl">' + a.lbl + '</span>' +
              '</a>'
            ).join('') +
          '</nav>'
        );
      }

      if (p.descripcion) {
        bloques.push(
          '<section>' +
            '<h2 class="sec-h">Presentación</h2>' +
            '<p class="d-txt">' + e(p.descripcion) + '</p>' +
          '</section>'
        );
      }

      if (filas.length) {
        bloques.push(
          '<section>' +
            '<h2 class="sec-h">Contacto</h2>' +
            '<div class="rows">' +
              filas.map(f =>
                '<a class="d-row" href="' + e(f.href) + '"' + this._ext(f.ext) + '>' +
                  '<span class="row-ico">' + svg(f.ico, 19, '#006166', 1.8) + '</span>' +
                  '<span class="row-lbl">' + f.lbl + '</span>' +
                  '<span class="row-val">' + e(f.val) + '</span>' +
                '</a>'
              ).join('') +
            '</div>' +
          '</section>'
        );
      }

      const enlaces = this._htmlEnlaces(p);
      if (enlaces) { bloques.push(enlaces); }

      // v1.0.1: «Guardar en contactos» se pinta en la columna izquierda.

      return (
        '<div class="d">' +
          '<div class="d-card">' +
            izquierda +
            '<div class="d-right">' + bloques.join('') + '</div>' +
          '</div>' +
        '</div>'
      );
    }

    // ── NO DISPONIBLE / ERROR ───────────────────────────────────────────────
    _htmlNoDisponible(p) {
      const e = this._e.bind(this);
      const texto = p.motivo === 'no_disponible'
        ? 'Esta ficha de contacto ya no está disponible'
        : 'No se ha podido cargar la ficha de contacto';

      return (
        '<div class="nd">' +
          (p.logoBlanco ? '<img src="' + e(p.logoBlanco) + '" alt="Centrimerca">' : '') +
          '<h1>' + texto + '</h1>' +
          (p.webEmpresaHref ? '<a href="' + e(p.webEmpresaHref) + '">Ir a la web de Centrimerca</a>' : '') +
        '</div>'
      );
    }
  }

  customElements.define('ficha-contacto', FichaContacto);
})();
