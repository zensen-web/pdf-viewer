import '../src/pdf-viewer'

import { storiesOf, withKnobs, number } from '@open-wc/demoing-storybook'

import { html } from 'lit-element'

import { PDF_TEST, PDF_HUCK_FINN } from './_resources'

const stories = storiesOf('PDF Viewer', module)
stories.addDecorator(withKnobs)

stories.add('Main', () =>
  html`
    <zen-pdf-viewer
      .src="${PDF_HUCK_FINN}"
      .pageNum="${number('Page Number', 1)}"
      .zoomIndex="${number('Zoom Index', 2)}"
    ></zen-pdf-viewer>
  `,
)
