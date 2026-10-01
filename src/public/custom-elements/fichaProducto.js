/*
 * CENTRIMERCA — Ficha de Producto · Custom Element
 * Archivo:  fichaProducto.js   ·   v1.3.0
 * Tag name: ficha-producto      ·   Element ID esperado: #fichaProducto
 *
 * Vive en la página de ítem dinámica /productos/<slug> (colección Productos).
 * Recibe el payload del Page Code por setAttribute('ficha', JSON.stringify(...))
 * y se pinta solo. Mismo canal que centriConsole (Page → CE por atributo).
 *
 *   Page → CE:  el.setAttribute('ficha', JSON.stringify(payload))
 *   Los dos botones inferiores son HTML NATIVO (sin JavaScript, a prueba de móvil):
 *     · "¿Aún no eres cliente?"      → <a href="urlSercliente">
 *     · "Hablar con un comercial"    → <details> nativo que despliega
 *                                       <a tel:> y <a wa.me> (desde whatsappComercial)
 *
 * PAYLOAD que espera (lo arma el Page Code desde el CMS):
 *   {
 *     nombre, subcategoria, tipo,
 *     imagen,
 *     descripcion, origen,
 *     temporada: { enero..diciembre: "fuera|entrada|plena|salida", texto },
 *     consejos: { transporte, conservacion, maduracion },
 *     urlSercliente,
 *     whatsappComercial,
 *     variedades: [ { nombre, referencia, foto(URL|""), descripcion,
 *                     formatos, calibre, dulzor, uso } ]
 *   }
 */

(function () {
  'use strict';

  if (customElements.get('ficha-producto')) {
    return;
  }

  const SVG_FRUTA = "data:image/svg+xml," + encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'>" +
    "<rect width='400' height='400' fill='#B7DACF'/>" +
    "<path d='M200 150c-14-26-52-30-70-10-22 24-14 74 10 104 14 18 30 30 46 30h28c16 0 32-12 46-30 24-30 32-80 10-104-18-20-56-16-70 10z' fill='#045333' opacity='0.85'/>" +
    "<path d='M208 138c3-20 16-34 38-40' fill='none' stroke='#045333' stroke-width='10' stroke-linecap='round' opacity='0.85'/>" +
    "<path d='M226 108c14-14 38-12 44 4-14 10-36 8-44-4z' fill='#09A072'/>" +
    "<text x='200' y='330' font-family='Bai Jamjuree, sans-serif' font-size='20' font-weight='600' fill='#045333' text-anchor='middle' opacity='0.7'>Foto pendiente</text>" +
    "</svg>"
  );

  const SVG_VERDURA = "data:image/svg+xml," + encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'>" +
    "<rect width='400' height='400' fill='#B7DACF'/>" +
    "<path d='M200 300c0-70 8-120 40-150 20-19 52-24 78-16-4 28-18 54-44 70' fill='#045333' opacity='0.85'/>" +
    "<path d='M200 300c0-70-8-120-40-150-20-19-52-24-78-16 4 28 18 54 44 70' fill='#09A072' opacity='0.9'/>" +
    "<path d='M200 300V150' fill='none' stroke='#045333' stroke-width='10' stroke-linecap='round' opacity='0.85'/>" +
    "<text x='200' y='340' font-family='Bai Jamjuree, sans-serif' font-size='20' font-weight='600' fill='#045333' text-anchor='middle' opacity='0.7'>Foto pendiente</text>" +
    "</svg>"
  );

  const MESES_ORDEN = [
    'enero','febrero','marzo','abril','mayo','junio',
    'julio','agosto','septiembre','octubre','noviembre','diciembre'
  ];

  const MESES_INI = ['E','F','M','A','M','J','J','A','S','O','N','D'];

  const FASE_SPEC = {
    plena:   { bg: '#09A072', h: 132 },
    entrada: { bg: '#B7DACF', h: 84  },
    salida:  { bg: '#045333', h: 62  },
    fuera:   { bg: '#E7EFEA', h: 16  }
  };

  const NOMBRE_FASE = {
    entrada: 'entrada',
    plena: 'plena',
    salida: 'salida',
    fuera: 'fuera de temporada'
  };

  const CSS = `
    :host{
      display:block;
      width:100%;
      font-family:'Bai Jamjuree',system-ui,sans-serif;
      color:#045333;
      -webkit-font-smoothing:antialiased;
    }

    *{ box-sizing:border-box; }

    .ficha{
      width:100%;
      background:#FBFCFB;
      color:#045333;
      overflow:hidden;
      container-type:inline-size;
    }

    .inner{
      max-width:1240px;
      margin:0 auto;
      padding:0 22px;
    }

    img{ display:block; }

    /* HERO */

    .hero{
      position:relative;
      width:100%;
      height:min(84vh,720px);
      min-height:500px;
      overflow:hidden;
      background:#045333;
    }

    .hero__img{
      position:absolute;
      inset:0;
      width:100%;
      height:100%;
      object-fit:cover;
      object-position:center 55%;
    }

    .hero__scrim{
      position:absolute;
      inset:0;
      background:
        linear-gradient(
          178deg,
          rgba(4,83,51,.55) 0%,
          rgba(4,83,51,.10) 30%,
          rgba(4,83,51,.55) 60%,
          rgba(4,83,51,.9) 84%,
          rgba(4,83,51,1) 100%
        );
    }

    .hero__bottom{
      position:absolute;
      left:0;
      right:0;
      bottom:0;
      padding:0 22px 34px;
      max-width:1240px;
      margin:0 auto;
    }

    .hero__brand{
      display:flex;
      align-items:center;
      gap:9px;
      color:#fff;
      margin-bottom:14px;
    }

    .hero__dot{
      width:11px;
      height:11px;
      border-radius:50%;
      background:#09A072;
    }

    .hero__brandtxt{
      font-size:13px;
      font-weight:600;
      letter-spacing:.22em;
      text-transform:uppercase;
      color:#fff;
    }

    .cat{
      display:inline-flex;
      align-items:center;
      gap:8px;
      padding:7px 14px 7px 12px;
      border-radius:999px;
      background:rgba(183,218,207,.92);
      margin-bottom:18px;
    }

    .cat__dot{
      width:6px;
      height:6px;
      border-radius:50%;
      background:#045333;
    }

    .cat__txt{
      font-size:12.5px;
      font-weight:600;
      letter-spacing:.14em;
      text-transform:uppercase;
      color:#045333;
    }

    .hero h1{
      margin:0;
      font-size:clamp(54px,16cqw,148px);
      line-height:.84;
      font-weight:600;
      letter-spacing:-.045em;
      color:#fff;
    }

    .hero__desc{
      margin:20px 0 0;
      max-width:34ch;
      font-size:clamp(16px,4.2cqw,22px);
      line-height:1.45;
      font-weight:400;
      color:rgba(255,255,255,.93);
    }

    .hero__meta{
      display:flex;
      flex-wrap:wrap;
      gap:10px;
      margin-top:26px;
    }

    .metachip{
      padding:8px 15px;
      border-radius:999px;
      border:1px solid rgba(255,255,255,.42);
      font-size:13px;
      font-weight:500;
      color:#fff;
    }

    /* VARIEDADES */

    .variedades{
      background:#045333;
      padding:44px 0 52px;
    }

    .sec-head{
      display:flex;
      align-items:baseline;
      justify-content:space-between;
      gap:16px;
      margin-bottom:22px;
    }

    .sec-title{
      margin:0;
      font-size:clamp(12.5px,3.2cqw,14px);
      font-weight:600;
      letter-spacing:.24em;
      text-transform:uppercase;
    }

    .variedades .sec-title{ color:#B7DACF; }

    .sec-pos{
      font-size:13px;
      font-weight:500;
      color:rgba(183,218,207,.7);
    }

    .chips{
      display:flex;
      gap:10px;
      overflow-x:auto;
      padding-bottom:6px;
      margin-bottom:22px;
      scrollbar-width:none;
      scroll-behavior:smooth;
    }

    .chips::-webkit-scrollbar{ display:none; }

    .chip{
      flex:0 0 auto;
      display:flex;
      align-items:center;
      gap:11px;
      padding:7px 18px 7px 7px;
      border:none;
      border-radius:999px;
      cursor:pointer;
      font-family:inherit;
      background:rgba(183,218,207,.18);
      color:#B7DACF;
      transition:background .18s ease,color .18s ease;
    }

    .chip img{
      width:38px;
      height:38px;
      border-radius:50%;
      object-fit:cover;
    }

    .chip span{
      font-size:15px;
      font-weight:600;
      letter-spacing:-.01em;
      white-space:nowrap;
    }

    .chip[aria-selected="true"]{
      background:#E80A4D;
      color:#fff;
    }

    .chip:focus-visible{
      outline:3px solid #09A072;
      outline-offset:2px;
    }

    .detalle{
      display:grid;
      grid-template-columns:repeat(auto-fit,minmax(290px,1fr));
      gap:2px;
      border-radius:26px;
      overflow:hidden;
      background:#FBFCFB;
    }

    .detalle__foto{
      position:relative;
      min-height:340px;
      background:#B7DACF;
      transition:opacity .26s ease;
    }

    .detalle__foto img{
      position:absolute;
      inset:0;
      width:100%;
      height:100%;
      object-fit:cover;
    }

    .detalle__fotocap{
      position:absolute;
      left:0;
      right:0;
      bottom:0;
      padding:22px;
      background:linear-gradient(
        to top,
        rgba(4,83,51,.88),
        rgba(4,83,51,0)
      );
    }

    .detalle__fotocap h3{
      margin:0;
      font-size:clamp(34px,9.5cqw,58px);
      line-height:.9;
      font-weight:600;
      letter-spacing:-.04em;
      color:#fff;
    }

    .detalle__info{
      padding:26px 24px 28px;
      display:flex;
      flex-direction:column;
      gap:22px;
    }

    .ref-label{
      font-size:11.5px;
      font-weight:600;
      letter-spacing:.2em;
      text-transform:uppercase;
      color:#09A072;
      margin-bottom:9px;
    }

    .ref-btn{
      width:100%;
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:14px;
      padding:16px 18px;
      border:1.5px solid #B7DACF;
      border-radius:14px;
      background:#F1F8F5;
      cursor:pointer;
      font-family:inherit;
      text-align:left;
      transition:border-color .18s ease;
    }

    .ref-btn:hover{ border-color:#09A072; }

    .ref-code{
      font-size:clamp(21px,6cqw,30px);
      font-weight:700;
      letter-spacing:.04em;
      color:#045333;
      font-variant-numeric:tabular-nums;
    }

    .ref-copy{
      flex:0 0 auto;
      font-size:11.5px;
      font-weight:600;
      letter-spacing:.14em;
      text-transform:uppercase;
      color:#E80A4D;
    }

    .detalle__desc{
      margin:0;
      font-size:clamp(15.5px,4cqw,18px);
      line-height:1.55;
      color:#28513F;
    }

    .formatos{
      display:flex;
      flex-wrap:wrap;
      gap:8px;
    }

    .fmt{
      padding:6px 13px;
      border-radius:999px;
      background:#F1F8F5;
      border:1px solid #E2EEE8;
      font-size:13px;
      font-weight:600;
      color:#045333;
    }

    .specs{
      display:flex;
      flex-direction:column;
      border-top:1px solid #E2EEE8;
    }

    .spec{
      display:flex;
      justify-content:space-between;
      gap:12px;
      padding:13px 0;
      border-bottom:1px solid #E2EEE8;
    }

    .spec:last-child{ border-bottom:none; }

    .spec__k{
      font-size:14px;
      color:#6E8C7E;
    }

    .spec__v{
      font-size:14px;
      font-weight:600;
      color:#045333;
    }

    /* TEMPORADA */

    .temporada{
      background:#FBFCFB;
      padding:52px 0 46px;
    }

    .temporada .sec-title{ color:#09A072; }

    .temp-head{
      display:flex;
      flex-wrap:wrap;
      align-items:center;
      gap:14px;
      margin-bottom:30px;
    }

    .temp-now{
      display:inline-flex;
      align-items:center;
      gap:8px;
      padding:6px 13px;
      border-radius:999px;
      background:#B7DACF;
    }

    .temp-now__dot{
      width:7px;
      height:7px;
      border-radius:50%;
      background:#E80A4D;
    }

    .temp-now__txt{
      font-size:12.5px;
      font-weight:600;
      color:#045333;
    }

    .temp-bars{
      display:flex;
      align-items:flex-end;
      gap:3px;
      height:132px;
    }

    .temp-col{
      flex:1 1 0;
      display:flex;
      flex-direction:column;
      align-items:center;
      position:relative;
    }

    .temp-bar{
      width:100%;
      border-radius:7px 7px 3px 3px;
    }

    .temp-hoy{
      position:absolute;
      top:-22px;
      left:50%;
      transform:translateX(-50%);
      display:flex;
      flex-direction:column;
      align-items:center;
      gap:3px;
    }

    .temp-hoy span{
      font-size:10px;
      font-weight:700;
      letter-spacing:.1em;
      text-transform:uppercase;
      color:#E80A4D;
    }

    .temp-hoy i{
      width:2px;
      height:8px;
      background:#E80A4D;
    }

    .temp-labels{
      display:flex;
      gap:3px;
      margin-top:9px;
    }

    .temp-lbl{
      flex:1 1 0;
      text-align:center;
      font-size:11px;
      letter-spacing:.02em;
    }

    .temp-legend{
      display:flex;
      flex-wrap:wrap;
      gap:18px;
      margin-top:28px;
      padding-top:22px;
      border-top:1px solid #E2EEE8;
    }

    .leg{
      display:flex;
      align-items:center;
      gap:9px;
    }

    .leg i{
      width:13px;
      height:13px;
      border-radius:4px;
    }

    .leg span{
      font-size:13.5px;
      color:#28513F;
    }

    /* CONSEJOS */

    .consejos{
      background:#F1F8F5;
      padding:48px 0 64px;
    }

    .consejos .sec-title{
      color:#09A072;
      margin-bottom:26px;
    }

    .consejos-grid{
      display:grid;
      grid-template-columns:repeat(auto-fit,minmax(250px,1fr));
      gap:14px;
    }

    .consejo{
      background:#fff;
      border-radius:20px;
      padding:24px 22px 26px;
    }

    .consejo h3{
      margin:16px 0 8px;
      font-size:20px;
      font-weight:600;
      letter-spacing:-.02em;
      color:#045333;
    }

    .consejo p{
      margin:0;
      font-size:15.5px;
      line-height:1.5;
      color:#28513F;
    }

    .cta{
      display:flex;
      flex-wrap:wrap;
      align-items:flex-start;
      gap:14px;
      margin-top:34px;
    }

    .cta__primary{
      flex:1 1 220px;
      display:inline-flex;
      align-items:center;
      justify-content:center;
      text-align:center;
      padding:18px 26px;
      border:none;
      border-radius:999px;
      background:#09A072;
      color:#fff;
      text-decoration:none;
      font-family:inherit;
      font-size:16.5px;
      font-weight:600;
      cursor:pointer;
      transition:background .18s ease;
      -webkit-tap-highlight-color:transparent;
    }

    .cta__primary:hover{
      background:#045333;
    }

    .contacto{
      flex:1 1 220px;
    }

    .contacto > summary{
      list-style:none;
      display:inline-flex;
      width:100%;
      align-items:center;
      justify-content:center;
      text-align:center;
      padding:18px 26px;
      border:1.5px solid #B7DACF;
      border-radius:999px;
      background:transparent;
      color:#045333;
      font-family:inherit;
      font-size:16.5px;
      font-weight:600;
      cursor:pointer;
      transition:border-color .18s ease;
      -webkit-tap-highlight-color:transparent;
    }

    .contacto > summary::-webkit-details-marker{
      display:none;
    }

    .contacto > summary::marker{
      content:"";
    }

    .contacto > summary:hover{
      border-color:#09A072;
    }

    .contacto__panel{
      display:flex;
      flex-direction:column;
      gap:10px;
      margin-top:12px;
    }

    .contacto__opt{
      display:flex;
      align-items:center;
      gap:12px;
      padding:15px 18px;
      border:1.5px solid #B7DACF;
      border-radius:14px;
      text-decoration:none;
      color:#045333;
      font-weight:600;
      font-size:16px;
      background:#fff;
      transition:border-color .18s ease, background .18s ease;
      -webkit-tap-highlight-color:transparent;
    }

    .contacto__opt:hover{
      border-color:#09A072;
      background:#F1F8F5;
    }

    .contacto__opt svg{
      color:#09A072;
      flex:0 0 auto;
    }

    @media(prefers-reduced-motion:reduce){
      *{
        transition:none!important;
        scroll-behavior:auto!important;
      }
    }
  `;

  class FichaProducto extends HTMLElement {

    static get observedAttributes() {
      return ['ficha', 'FICHA'];
    }

    constructor() {
      super();
      this._data = null;
      this._idx = 0;
      this._copiadoTimer = null;
      this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
      this._asegurarFuente();

      const style = document.createElement('style');
      style.textContent = CSS;

      this._root = document.createElement('div');
      this._root.className = 'ficha';

      this.shadowRoot.appendChild(style);
      this.shadowRoot.appendChild(this._root);

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
        this._idx = 0;
      } catch (err) {
        console.error(
          '[ficha-producto] payload no parseable:',
          err && err.message
        );

        this._data = null;
      }
    }

    _asegurarFuente() {
      const ID = 'ficha-producto-font';

      if (document.getElementById(ID)) {
        return;
      }

      const link = document.createElement('link');

      link.id = ID;
      link.rel = 'stylesheet';
      link.href =
        'https://fonts.googleapis.com/css2?family=Bai+Jamjuree:wght@300;400;500;600;700&display=swap';

      document.head.appendChild(link);
    }

    _esc(s) {
      return s == null ? '' : String(s);
    }

    _svgTipo() {
      const tipo = this._data && this._data.tipo;

      return String(tipo).toLowerCase() === 'verdura'
        ? SVG_VERDURA
        : SVG_FRUTA;
    }

    _fotoDe(v) {
      return v && v.foto
        ? v.foto
        : this._svgTipo();
    }

    _render() {
      const p = this._data;

      if (!p) {
        this._root.innerHTML = '';
        return;
      }

      const vs = Array.isArray(p.variedades)
        ? p.variedades
        : [];

      if (this._idx > vs.length - 1) {
        this._idx = 0;
      }

      const sel = vs[this._idx] || {};
      const esc = this._esc.bind(this);

      const temp = p.temporada || {};
      const nowIdx = new Date().getMonth();
      const faseHoy =
        temp[MESES_ORDEN[nowIdx]] || 'fuera';

      const metaChips = [
        vs.length
          ? (
              vs.length +
              ' ' +
              (
                vs.length === 1
                  ? 'variedad'
                  : 'variedades'
              )
            )
          : null,

        p.origen
          ? ('Origen ' + p.origen)
          : null

      ]
        .filter(Boolean)
        .map(
          t =>
            `<span class="metachip">${esc(t)}</span>`
        )
        .join('');

      const chips = vs
        .map(
          (v, n) =>
            `
            <button
              class="chip"
              role="tab"
              aria-selected="${n === this._idx}"
              data-i="${n}"
            >
              <img
                src="${esc(this._fotoDe(v))}"
                alt="${esc(v.nombre)}"
                data-svg="${esc(this._svgTipo())}"
              >
              <span>${esc(v.nombre)}</span>
            </button>
            `
        )
        .join('');

      const formatos = (sel.formatos || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .map(
          f =>
            `<span class="fmt">${esc(f)}</span>`
        )
        .join('');

      const specRows = [
        ['Calibre', sel.calibre],
        ['Dulzor', sel.dulzor],
        ['Uso recomendado', sel.uso]
      ]
        .filter(r => r[1])
        .map(
          r =>
            `
            <div class="spec">
              <span class="spec__k">${r[0]}</span>
              <span class="spec__v">${esc(r[1])}</span>
            </div>
            `
        )
        .join('');

      const months = MESES_ORDEN
        .map((mes, i) => {
          const s =
            FASE_SPEC[temp[mes]] ||
            FASE_SPEC.fuera;

          const hoy = i === nowIdx;

          return `
            <div class="temp-col">
              <div
                class="temp-bar"
                style="
                  height:${s.h}px;
                  background:${s.bg}
                "
              ></div>

              ${
                hoy
                  ? `
                    <div class="temp-hoy">
                      <span>Hoy</span>
                      <i></i>
                    </div>
                  `
                  : ''
              }
            </div>
          `;
        })
        .join('');

      const monthLabels = MESES_INI
        .map((l, i) => {

          const fuera =
            (
              temp[MESES_ORDEN[i]] ||
              'fuera'
            ) === 'fuera';

          return `
            <div
              class="temp-lbl"
              style="
                font-weight:${fuera ? 400 : 600};
                color:${fuera ? '#A9BDB2' : '#045333'}
              "
            >
              ${l}
            </div>
          `;
        })
        .join('');

      const c = p.consejos || {};

      const telDigits = String(
        p.whatsappComercial || ''
      ).replace(/[^\d]/g, '');

      const hayConsejos = !!(
        c.transporte ||
        c.conservacion ||
        c.maduracion
      );

      const hayCta = !!(
        p.urlSercliente ||
        telDigits
      );

      console.log(
        '[ficha-producto] CTAs:',
        {
          urlSercliente:
            p.urlSercliente,

          whatsappComercial:
            p.whatsappComercial,

          telDigits
        }
      );

      this._root.innerHTML = `

        <section class="hero">

          <img
            class="hero__img"
            src="${esc(
              p.imagen ||
              this._svgTipo()
            )}"
            alt="${esc(p.nombre)}"
            data-svg="${esc(
              this._svgTipo()
            )}"
          >

          <div class="hero__scrim"></div>

          <div class="hero__bottom">

            <div class="hero__brand">
              <div class="hero__dot"></div>
              <span class="hero__brandtxt">
                Centrimerca
              </span>
            </div>

            ${
              p.subcategoria
                ? `
                  <div class="cat">
                    <div class="cat__dot"></div>
                    <span class="cat__txt">
                      ${esc(p.subcategoria)}
                    </span>
                  </div>
                `
                : ''
            }

            <h1>${esc(p.nombre)}</h1>

            ${
              p.descripcion
                ? `
                  <p class="hero__desc">
                    ${esc(p.descripcion)}
                  </p>
                `
                : ''
            }

            <div class="hero__meta">
              ${metaChips}
            </div>

          </div>

        </section>


        ${
          vs.length
            ? `

              <section class="variedades">

                <div class="inner">

                  <div class="sec-head">

                    <h2 class="sec-title">
                      Variedades
                    </h2>

                    <span class="sec-pos">
                      ${
                        String(
                          this._idx + 1
                        ).padStart(2, '0')
                      }
                      /
                      ${vs.length}
                    </span>

                  </div>

                  <div
                    class="chips"
                    id="chips"
                    role="tablist"
                  >
                    ${chips}
                  </div>

                  <div class="detalle">

                    <div
                      class="detalle__foto"
                      id="detFoto"
                    >

                      <img
                        src="${esc(
                          this._fotoDe(sel)
                        )}"
                        alt="${esc(sel.nombre)}"
                        data-svg="${esc(
                          this._svgTipo()
                        )}"
                      >

                      <div class="detalle__fotocap">
                        <h3>
                          ${esc(sel.nombre)}
                        </h3>
                      </div>

                    </div>


                    <div class="detalle__info">

                      ${
                        sel.referencia
                          ? `

                            <div>

                              <div class="ref-label">
                                Referencia Centrimerca
                              </div>

                              <button
                                class="ref-btn"
                                id="refBtn"
                              >

                                <span class="ref-code">
                                  ${esc(sel.referencia)}
                                </span>

                                <span
                                  class="ref-copy"
                                  id="refCopy"
                                >
                                  Copiar
                                </span>

                              </button>

                            </div>

                          `
                          : ''
                      }


                      ${
                        sel.descripcion
                          ? `
                            <p class="detalle__desc">
                              ${esc(sel.descripcion)}
                            </p>
                          `
                          : ''
                      }


                      ${
                        formatos
                          ? `
                            <div class="formatos">
                              ${formatos}
                            </div>
                          `
                          : ''
                      }


                      ${
                        specRows
                          ? `
                            <div class="specs">
                              ${specRows}
                            </div>
                          `
                          : ''
                      }

                    </div>

                  </div>

                </div>

              </section>

            `
            : ''
        }


        ${
          temp &&
          Object.keys(temp).length
            ? `

              <section class="temporada">

                <div class="inner">

                  <div class="temp-head">

                    <h2 class="sec-title">
                      Temporada
                    </h2>

                    <div class="temp-now">

                      <div class="temp-now__dot"></div>

                      <span class="temp-now__txt">
                        En temporada ahora ·
                        ${
                          NOMBRE_FASE[faseHoy] ||
                          faseHoy
                        }
                      </span>

                    </div>

                  </div>


                  <div class="temp-bars">
                    ${months}
                  </div>


                  <div class="temp-labels">
                    ${monthLabels}
                  </div>


                  <div class="temp-legend">

                    <div class="leg">
                      <i style="background:#B7DACF"></i>
                      <span>Entrada</span>
                    </div>

                    <div class="leg">
                      <i style="background:#09A072"></i>
                      <span>Plena</span>
                    </div>

                    <div class="leg">
                      <i style="background:#045333"></i>
                      <span>Salida</span>
                    </div>

                  </div>


                  ${
                    temp.texto
                      ? `
                        <p
                          class="detalle__desc"
                          style="margin-top:20px"
                        >
                          ${esc(temp.texto)}
                        </p>
                      `
                      : ''
                  }

                </div>

              </section>

            `
            : ''
        }


        ${
          hayConsejos || hayCta
            ? `

              <section class="consejos">

                <div class="inner">

                  ${
                    hayConsejos
                      ? `

                        <h2 class="sec-title">
                          Consejos
                        </h2>


                        <div class="consejos-grid">

                          ${
                            c.transporte
                              ? `

                                <div class="consejo">

                                  <svg
                                    width="30"
                                    height="30"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="#09A072"
                                    stroke-width="1.6"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                  >
                                    <path d="M2 6.5h11v9H2z"></path>
                                    <path d="M13 9.5h4l3.2 3.2v2.8H13z"></path>
                                    <circle cx="6.2" cy="17.5" r="1.7"></circle>
                                    <circle cx="16.8" cy="17.5" r="1.7"></circle>
                                  </svg>

                                  <h3>
                                    Transporte
                                  </h3>

                                  <p>
                                    ${esc(c.transporte)}
                                  </p>

                                </div>

                              `
                              : ''
                          }


                          ${
                            c.conservacion
                              ? `

                                <div class="consejo">

                                  <svg
                                    width="30"
                                    height="30"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="#09A072"
                                    stroke-width="1.6"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                  >
                                    <path d="M12 3v18"></path>
                                    <path d="M4.5 7.5l15 9"></path>
                                    <path d="M19.5 7.5l-15 9"></path>
                                    <path d="M12 6.2l2.1-2.1M12 6.2 9.9 4.1M12 17.8l2.1 2.1M12 17.8 9.9 19.9"></path>
                                    <path d="M6.9 8.9 4.2 8.6M6.9 8.9 6.5 6.2M17.1 15.1l2.7.3M17.1 15.1l.4 2.7M17.1 8.9l2.7-.3M17.1 8.9l.4-2.7M6.9 15.1l-2.7.3M6.9 15.1l-.4 2.7"></path>
                                  </svg>

                                  <h3>
                                    Conservación
                                  </h3>

                                  <p>
                                    ${esc(c.conservacion)}
                                  </p>

                                </div>

                              `
                              : ''
                          }


                          ${
                            c.maduracion
                              ? `

                                <div class="consejo">

                                  <svg
                                    width="30"
                                    height="30"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="#09A072"
                                    stroke-width="1.6"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                  >
                                    <circle
                                      cx="12"
                                      cy="12"
                                      r="8.5"
                                    ></circle>

                                    <path d="M12 6.5v5.5l4 2.5"></path>
                                  </svg>

                                  <h3>
                                    Maduración
                                  </h3>

                                  <p>
                                    ${esc(c.maduracion)}
                                  </p>

                                </div>

                              `
                              : ''
                          }

                        </div>

                      `
                      : ''
                  }


                  ${
                    hayCta
                      ? `

                        <div
                          class="cta"
                          ${
                            hayConsejos
                              ? ''
                              : 'style="margin-top:0"'
                          }
                        >

                          ${
                            p.urlSercliente
                              ? `

                                <a
                                  class="cta__primary"
                                  href="${esc(
                                    p.urlSercliente
                                  )}"
                                >
                                  ¿Aún no eres cliente?
                                </a>

                              `
                              : ''
                          }


                          ${
                            telDigits
                              ? `

                                <details class="contacto">

                                  <summary>
                                    Hablar con un comercial
                                  </summary>


                                  <div class="contacto__panel">

                                    <a
                                      class="contacto__opt"
                                      href="tel:+${telDigits}"
                                    >

                                      <svg
                                        width="22"
                                        height="22"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="1.7"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                      >
                                        <path d="M4 5c0 8 7 15 15 15 1.2 0 2-.9 2-2v-2.3c0-.5-.3-.9-.8-1l-3-.7c-.4-.1-.9 0-1.2.4l-1 1.2c-2.4-1.2-4.3-3.1-5.5-5.5l1.2-1c.4-.3.5-.8.4-1.2l-.7-3C10.2 4.3 9.8 4 9.3 4H7C5.9 4 5 4.8 5 6z"></path>
                                      </svg>

                                      <span>
                                        Llamar
                                      </span>

                                    </a>


                                    <a
                                      class="contacto__opt"
                                      href="https://wa.me/${telDigits}"
                                      target="_blank"
                                      rel="noopener"
                                    >

                                      <svg
                                        width="22"
                                        height="22"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="1.7"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                      >
                                        <path d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.6-1.3A9 9 0 1 0 12 3z"></path>
                                        <path d="M8.5 8.5c-.3 0-.7.1-.9.5-.3.4-1 1.1-1 2.5s1 2.9 1.2 3.1c.2.2 2 3.1 5 4.2 2.5 1 3 .8 3.5.7.5 0 1.6-.6 1.8-1.3.2-.6.2-1.2.2-1.3-.1-.1-.3-.2-.6-.4z"></path>
                                      </svg>

                                      <span>
                                        WhatsApp
                                      </span>

                                    </a>

                                  </div>

                                </details>

                              `
                              : ''
                          }

                        </div>

                      `
                      : ''
                  }

                </div>

              </section>

            `
            : ''
        }

      `;

      this._wire();
    }

    _wire() {

      const chipsBox =
        this.shadowRoot.getElementById('chips');

      if (chipsBox) {

        chipsBox
          .querySelectorAll('.chip')
          .forEach(btn => {

            btn.addEventListener(
              'click',
              () => {

                this._idx =
                  +btn.dataset.i;

                this._render();

                const active =
                  this.shadowRoot.querySelector(
                    '#chips .chip[aria-selected="true"]'
                  );

                if (active) {

                  active.scrollIntoView({
                    inline:'center',
                    block:'nearest',
                    behavior:'smooth'
                  });

                }

              }
            );

          });

      }


      this.shadowRoot
        .querySelectorAll('img[data-svg]')
        .forEach(img => {

          img.addEventListener(
            'error',
            () => {

              if (img.dataset.fb) {
                return;
              }

              img.dataset.fb = '1';
              img.src = img.dataset.svg;

            }
          );

        });


      const refBtn =
        this.shadowRoot.getElementById('refBtn');

      if (refBtn) {

        refBtn.addEventListener(
          'click',
          () => this._copiarRef()
        );

      }

    }

    _copiarRef() {

      const sel =
        (
          this._data.variedades ||
          []
        )[this._idx] ||
        {};

      try {

        navigator.clipboard.writeText(
          sel.referencia
        );

      } catch (e) {

        /* silencioso */

      }


      const lbl =
        this.shadowRoot.getElementById(
          'refCopy'
        );

      if (lbl) {
        lbl.textContent = 'Copiada';
      }


      clearTimeout(
        this._copiadoTimer
      );


      this._copiadoTimer =
        setTimeout(
          () => {

            const l =
              this.shadowRoot.getElementById(
                'refCopy'
              );

            if (l) {
              l.textContent = 'Copiar';
            }

          },
          1600
        );

    }

  }

  customElements.define(
    'ficha-producto',
    FichaProducto
  );

})();