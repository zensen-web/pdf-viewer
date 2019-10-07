import '../src/pdf-viewer'

import { storiesOf } from '@open-wc/demoing-storybook'
import { html } from 'lit-element'

import { PDF_TEST, PDF_HUCK_FINN } from './_resources'

const stories = storiesOf('PDF Viewer', module)

stories.add('Main', () =>
  html`
    <zen-pdf-viewer
      .src="${PDF_HUCK_FINN}"
    ></zen-pdf-viewer>
  `,
)
