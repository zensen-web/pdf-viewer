import '../src/pdf-viewer'

import { sinon, expect, genSuite } from '@zen-web-components/unit-test-helper'

genSuite('zen-pdf-viewer', false, {
  onStart: meta => {
  },
}, meta => {
  context('when...', () => {
    beforeEach(async () => {
      await meta.updateComplete()
    })

    it('passes', () => expect(true).to.be.true)
  })
})
