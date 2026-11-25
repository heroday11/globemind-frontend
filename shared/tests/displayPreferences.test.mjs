import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DEFAULT_DISPLAY_PREFERENCES,
  normalizeDisplayPreferences,
} from '../displayPreferences.js'

test('normalizes shared display preference values at the package boundary', () => {
  assert.deepEqual(normalizeDisplayPreferences({ fontSizeOffset: 99 }), {
    ...DEFAULT_DISPLAY_PREFERENCES,
    fontSizeOffset: 7,
  })
  assert.deepEqual(normalizeDisplayPreferences({ fontFamily: 'unknown' }), {
    ...DEFAULT_DISPLAY_PREFERENCES,
  })
})
