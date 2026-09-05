import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const navigation = await readFile(
  new URL(process.env.APP_NAV_SOURCE || '../src/components/appNav.vue', import.meta.url),
  'utf8',
)

test('desktop data-service label links directly to data search', () => {
  assert.match(
    navigation,
    /<router-link[\s\S]{0,100}to="\/data-service\/data-search"[\s\S]{0,180}class="dropdown-trigger"/,
  )
  assert.doesNotMatch(navigation, /@click="toggleDataServiceDropdown"/)
})

test('dropdown lifetime is owned by the complete navigation item', () => {
  assert.match(
    navigation,
    /leaveDataServiceDropdown = \(event\)[\s\S]{0,180}currentTarget\?\.contains\?\.\(event\.relatedTarget\)/,
  )
  assert.match(
    navigation,
    /leaveUserCenterDropdown = \(event\)[\s\S]{0,180}currentTarget\?\.contains\?\.\(event\.relatedTarget\)/,
  )
  assert.doesNotMatch(navigation, /enterDataServiceDropdownContent|enterUserCenterDropdownContent/)
  assert.doesNotMatch(navigation, /class="dropdown-menu"[\s\S]{0,180}@pointerleave=/)
})
