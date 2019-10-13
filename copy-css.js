const fs = require('fs')
const util = require('util')

const readFile = util.promisify(fs.readFile)
const writeFile = util.promisify(fs.writeFile)

const PDF_CSS_PATH = 'node_modules/pdfjs-dist/web/pdf_viewer.css'
const OUTPUT_PATH = 'src/pdf_viewer.css.js'

function buildFileContents (src) {
  return `
import { css } from 'lit-element'

export const STYLES_PDF = css\`
${src}
\`
`
}

(async function () {
  const data = await readFile(PDF_CSS_PATH, 'utf8')
  const content = buildFileContents(data)

  await writeFile(OUTPUT_PATH, content)
})()
