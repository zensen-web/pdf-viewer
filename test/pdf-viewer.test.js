import { fixture, expect } from '@open-wc/testing'

import '../src/pdf-viewer'

describe('zen-pdf-viewer', () => {
  it('renders', () =>
    expect(
      fixture('<zen-pdf-viewer></zen-pdf-viewer>')
    ).to.eventually.exist)
})
