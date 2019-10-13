import pdfjs from 'pdfjs-dist/build/pdf'
import { LitElement, html, css } from 'lit-element'

import { STYLES_PDF } from './pdf_viewer.css.js'

import {
  PDFPageView,
  DefaultTextLayerFactory,
  DefaultAnnotationLayerFactory,
} from 'pdfjs-dist/web/pdf_viewer'

pdfjs.GlobalWorkerOptions.workerSrc = '//mozilla.github.io/pdf.js/build/pdf.worker.js'

const ID_SCROLL = 'scroll'
const ID_CONTENT = 'content'

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

class ZenPdfViewer extends LitElement {
  static get properties () {
    return {
      __pageNum: Number,
      __document: Object,
      __pages: Array,

      pageNum: Number,
      zoomIndex: Number,
      src: String,
    }
  }

  static get styles () {
    return [
      STYLES_PDF,
      css`
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
        display: block;
        overflow: auto;
        min-width: 0;
        min-height: 0;
        flex: 1 0 0;
      }

      .content {
        display: flex;
        width: 100%;
        flex-flow: column nowrap;
        align-items: center;
      }

      .page {
        margin-top: 2rem;
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
    `]
  }

  constructor () {
    super()
    this.__initState()
    this.__initHandlers()
  }

  __initState () {
    this.__pageNum = 1
    this.__scrollEl = null
    this.__contentEl = null
    this.__document = null
    this.__debounce = null
    this.__pages = []
    this.__renderedPageIndices = []


    this.pageNum = 1
    this.zoomIndex = 2
    this.src = ''

    this.onManualPageChange = () => {}
    this.onZoomChange = () => {}
  }

  __initHandlers () {
    this.__handlers = {
      pageUp: () => this.onManualPageChange(this.__pageNum - 1, true),
      pageDown: () => this.onManualPageChange(this.__pageNum + 1, true),
      goToPage: e => {
        const v = Number(e.target.value)
        const pageNum = clamp(v, 1, this.__pages.length)
        this.onManualPageChange(pageNum)
      },
      zoom: e => this.onZoomChange(Number(e.target.value)),
      magnify: () => this.onZoomChange(this.zoomIndex + 1),
      minify: () => this.onZoomChange(this.zoomIndex - 1),
      scroll: e => {
        let offset = e.target.scrollTop

        const index = this.__pages.findIndex(page => {
          if (offset <= (page.view.height / 2) + 20) {
            return true
          }

          offset -= page.view.height + 20
          return false
        })

        if (this.__pageNum !== index + 1) {
          this.__pageNum = index + 1

          clearTimeout(this.__debounce)
          this.__debounce = setTimeout(this.__handlers.display, 1000)
        }
      },
      display: () => {
        this.__debounce = null
        this.__displayPages()
      },
    }
  }

  async __loadDocument () {
    this.__document = await pdfjs.getDocument(this.src).promise
    this.__pages = new Array(this.__document.numPages).fill({})

    for (let i = 0; i < this.__document.numPages; ++i) {
      this.__pages[i] = await this.__loadPage(i + 1)
    }

    this.__scrollToPage(this.pageNum)
    this.__displayPages()
  }

  async __loadPage (pageNum) {
    const page = await this.__document.getPage(pageNum)
    const viewport = page.getViewport({ scale: this.getZoom() })
    const view = new PDFPageView({
      id: pageNum,
      container: this.__contentEl,
      scale: this.getZoom(),
      defaultViewport: viewport,
      textLayerFactory: new DefaultTextLayerFactory(),
      annotationLayerFactory: new DefaultAnnotationLayerFactory(),
    })

    view.setPdfPage(page)

    return {
      ref: page,
      view,
    }
  }

  __displayPages () {
    const pageIndex = this.__pageNum - 1
    const minPageIndex = Math.max(0, pageIndex - 5)
    const maxPageIndex = Math.min(pageIndex + 5, this.__pages.length + 1)
    const diff = maxPageIndex - minPageIndex
    const range = new Array(diff)
      .fill(0)
      .map((_, index) => minPageIndex + index)

    this.__renderedPageIndices.forEach(pageIndex => {
      if (range.indexOf(pageIndex) === -1) {
        this.__pages[pageIndex].view.reset()
      }
    })

    range.forEach(pageIndex => {
      if (this.__renderedPageIndices.indexOf(pageIndex) === -1) {
        this.__pages[pageIndex].view.draw()
      }
    })

    this.__renderedPageIndices = range
  }

  __scrollToPage (pageNum) {
    if (this.__pages.length) {
      this.__scrollEl.scrollTop = this.__pages
        .slice(0, pageNum - 1)
        .reduce((accum, page) => accum + page.view.height + 20, 0)

      this.__pageNum = pageNum
    }
  }


  __updatePageScale () {
    this.__pages.forEach(page => page.view.update(this.getZoom(), 0))
  }

  canPageDown () {
    return this.__pageNum < this.__pages.length
  }

  getZoom () {
    return ITEMS_ZOOM[this.zoomIndex].value
  }

  update (changedProps) {
    if (changedProps.has('pageNum') && this.__scrollEl) {
      this.__scrollToPage(this.pageNum)
    }

    if (changedProps.has('zoomIndex')) {
      this.__updatePageScale()
    }

    super.update(changedProps)
  }

  updated (changedProps) {
    if (changedProps.has('src')) {
      this.__loadDocument()
    }
  }

  firstUpdated () {
    this.__scrollEl = this.shadowRoot.getElementById(ID_SCROLL)
    this.__contentEl = this.shadowRoot.getElementById(ID_CONTENT)
    this.__scrollToPage(this.pageNum)
  }

  renderToolbar () {
    return html`
      <div class="toolbar">
        <button
          class="button button-page"
          .disabled="${this.__pageNum < 2}"
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
          .max="${this.__pages.length}"
          .value="${this.__pageNum}"
          @change="${this.__handlers.goToPage}"
        >

        <span class="text-toolbar">
          ${this.__pages.length ? html`of ${this.__pages.length}` : ''}
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
      <div
        id="${ID_SCROLL}"
        class="scroll"
        @scroll="${this.__handlers.scroll}"
      >
        <div id="${ID_CONTENT}" class="content pdfViewer">
        </div>
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
