import pdfjs from 'pdfjs-dist/build/pdf'

import { LitElement, html, css } from 'lit-element'

pdfjs.GlobalWorkerOptions.workerSrc = '//mozilla.github.io/pdf.js/build/pdf.worker.js'

const ITEMS_ZOOM = [
  { label: '50%', value: 0.5 },
  { label: '75%', value: 0.75 },
  { label: '100%', value: 1 },
  { label: '125%', value: 1.25 },
  { label: '150%', value: 1.5 },
  { label: '175%', value: 1.75 },
  { label: '200%', value: 2 },
]

const clamp = (num, min, max) => (num <= min ? min : num >= max ? max : num)
const range = (size, start) => new Array(size).fill(0).map((_, i) => i + start)

class ZenPdfViewer extends LitElement {
  static get properties () {
    return {
      __document: Object,
      __pageRange: Array,

      pageNum: Number,
      zoomIndex: Number,
      src: String,
    }
  }

  static get styles () {
    return css`
      *,
      *::before,
      *::after {
        box-sizing: border-box;
      }

      :host {
        display: block;
        height: 100%;
        background-color: #777;
      }

      .container {
        display: flex;
        width: 100%;
        height: 100%;
        flex-flow: column nowrap;
      }

      .scroll {
        display: flex;
        overflow: auto;
        min-width: 0;
        min-height: 0;
        flex: 1 0 0;
        flex-flow: column nowrap;
        align-items: center;
      }

      .canvas {
        margin-top: 2rem;
        background-color: #FFF;
        box-shadow: 0 0 8px 2px rgba(0, 0, 0, 0.6);
      }

      .toolbar {
        display: flex;
        padding: 0 1.6rem;
        height: 3.2rem;
        background-color: #474747;
        align-items: center;
        box-shadow:
          inset 0 1px 1px hsla(0, 0%, 0%, .15),
          inset 0 -1px 0 hsla(0, 0%, 100%, .05),
          0 1px 0 hsla(0, 0%, 0%, .15),
          0 1px 1px hsla(0, 0%, 0%, .1);
      }

      .button {
        cursor: pointer;
      }

      .button-page {
        height: 100%;
      }

      .button-zoom {
        outline: none;
        width: 2.2rem;
        height: 2.2rem;
        border: none;
        background: none;
        border: 1px solid transparent;
        color: #FFF;
        font-size: 1.6rem;
        transition: all 200ms ease-in;
      }

      .button-zoom:hover {
        border: 1px solid #000;
        background: #343434;
      }

      .input {
        outline: none;
        margin-left: 2.4rem;
        padding: 0 0.4rem;
        width: 4.8rem;
        height: 2.4rem;
        border: 1px solid #343434;
        border-radius: 2px;
        font-size: 1.6rem;
      }

      .input[type=number]::-webkit-inner-spin-button, 
      .input[type=number]::-webkit-outer-spin-button {
        margin: 0; 
        -webkit-appearance: none; 
      }

      .input-dropdown {
        width: 8rem;
      }

      .text-toolbar {
        margin-left: 0.8rem;
        width: 9.6rem;
        color: #FFF;
        font-size: 1.4rem;
      }
    `
  }

  constructor () {
    super()
    this.__initState()
    this.__initHandlers()
  }

  __initState () {
    this.__document = null
    this.__pageRange = []
    this.__viewports = []

    this.pageNum = 1
    this.zoomIndex = 2
    this.src = ''

    this.onPageChange = () => {}
    this.onZoomChange = () => {}
  }

  __initHandlers () {
    this.__handlers = {
      pageUp: () => this.onPageChange(this.pageNum - 1, true),
      pageDown: () => this.onPageChange(this.pageNum + 1, true),
      goToPage: e => {
        const v = Number(e.target.value)
        const pageNum = clamp(v, 1, this.getPageCount())
        this.onPageChange(pageNum)
      },
      zoom: e => this.onZoomChange(Number(e.target.value)),
      magnify: () => this.onZoomChange(this.zoomIndex + 1),
      minify: () => this.onZoomChange(this.zoomIndex - 1),
      scroll: e => {
        let offset = 0
        const halfHeight = e.target.clientHeight / 2

        const index = this.__viewports.findIndex(viewport => {
          offset += viewport.height + 20
          return offset - e.target.scrollTop >= halfHeight
        })

        if (this.pageNum !== index + 1) {
          this.onPageChange(index + 1)
        }
      },
    }
  }

  async __loadDocument () {
    this.__pageRange = []
    this.__document = await pdfjs.getDocument(this.src).promise
    this.__pageRange = range(this.__document.numPages, 1)
  }

  __loadPages () {
    this.__viewports = new Array(this.__pageRange.length).fill({
      width: 0,
      height: 0,
    })

    return Promise.all(this.__pageRange.map(async pageNum => {
      const page = await this.__document.getPage(pageNum)

      const viewport = page.getViewport({ scale: this.getZoom() })
      const canvasEl = this.shadowRoot.getElementById(`canvas-${pageNum}`)
      const canvasContext = canvasEl.getContext('2d')
      const renderContext = {
        viewport,
        canvasContext,
      }

      canvasEl.width = viewport.width
      canvasEl.height = viewport.height
      canvasEl.style.width = `${viewport.width}px`
      canvasEl.style.height = `${viewport.height}px`

      canvasContext.save()
      canvasContext.clearRect(0, 0, viewport.width, viewport.height)
      canvasContext.restore()

      this.__viewports[pageNum - 1] = {
        width: viewport.width,
        height: viewport.height,
      }

      requestAnimationFrame(() => page.render(renderContext))
    }))
  }

  canPageDown () {
    return this.pageNum < this.getPageCount()
  }

  getPageCount () {
    return this.__pageRange.length
  }

  getZoom () {
    return ITEMS_ZOOM[this.zoomIndex].value
  }

  update (changedProps) {
    if (changedProps.has('src')) {
      this.__loadDocument()
    }

    super.update(changedProps)
  }

  updated (changedProps) {
    if (changedProps.has('__pageRange')) {
      this.__loadPages()
    }
  }

  renderToolbar () {
    return html`
      <div class="toolbar">
        <button
          class="button button-page"
          .disabled="${this.pageNum < 2}"
          @click="${this.__handlers.pageUp}"
        >Page Up</button>

        <button
          class="button button-page"
          .disabled="${!this.canPageDown()}"
          @click="${this.__handlers.pageDown}"
        >Page Down</button>

        <input
          class="input"
          type="number"
          .max="${this.getPageCount()}"
          .value="${this.pageNum}"
          @change="${this.__handlers.goToPage}"
        >

        <span class="text-toolbar">
          ${this.getPageCount() ? html`of ${this.getPageCount()}` : ''}
        </span>

        <button
          class="button button-zoom"
          .disabled="${this.zoomIndex < 1}"
          @click="${this.__handlers.minify}"
        >&#8722;</button>

        <button
          class="button button-zoom"
          .disabled="${this.zoomIndex > ITEMS_ZOOM.length - 2}"
          @click="${this.__handlers.magnify}"
        >&#43;</button>

        <select class="input input-dropdown" @change="${this.__handlers.zoom}">
          ${ITEMS_ZOOM.map((item, index) => html`
              <option
                .value="${item.value}"
                ?selected="${index === this.zoomIndex}"
              >${item.label}</option>
            `)}
        </select>
      </div>
    `
  }

  renderContent () {
    return html`
      <div class="scroll" @scroll="${this.__handlers.scroll}">
        ${this.__pageRange.map(pageNum => html`
          <canvas
            id="canvas-${pageNum}"
            class="canvas"
          ></canvas>
        `)}
      </div>
    `
  }

  render () {
    return html`
      <div class="container">
        ${this.renderToolbar()}
        ${this.renderContent()}
      </div>
    `
  }
}

window.customElements.define('zen-pdf-viewer', ZenPdfViewer)
