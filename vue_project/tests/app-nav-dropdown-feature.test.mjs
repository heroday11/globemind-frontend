import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const navigation = await readFile(
  new URL(process.env.APP_NAV_SOURCE || '../src/components/appNav.vue', import.meta.url),
  'utf8',
)

test('desktop and mobile More menus share the same destination links', () => {
  const definitions = navigation.match(/const moreLinks = \[([\s\S]*?)\]/)?.[1]
  assert.ok(definitions)
  assert.deepEqual([...definitions.matchAll(/path: '([^']+)', label: '([^']+)'/g)].map(
    ([, path, label]) => [path, label],
  ), [
    ['/sentiment-analysis', '涉华舆情分析'],
    ['/data-service/ground-news', '全球新闻观察台'],
    ['/data-service/data-search', '数据服务'],
    ['/academic-data', 'Agent 能力市场'],
  ])

  for (const id of ['desktop-more-menu', 'mobile-more-menu']) {
    const menu = navigation.match(new RegExp(`<div id="${id}"[^>]*>([\\s\\S]*?)</div>`))?.[1]
    assert.ok(menu, id)
    assert.match(menu, /<router-link\s+v-for="link in moreLinks"[\s\S]*?:to="link.path"/)
    assert.match(navigation, new RegExp(`aria-controls="${id}"`))
  }
})

test('desktop dropdowns stay open when focus moves inside their own item', () => {
  assert.match(navigation, /function closeMoreOnFocusOut\(event\)[\s\S]{0,180}currentTarget\.contains\(event\.relatedTarget\)/)
  assert.match(
    navigation,
    /leaveUserCenterDropdown = \(event\)[\s\S]{0,180}currentTarget\?\.contains\?\.\(event\.relatedTarget\)/,
  )
  assert.doesNotMatch(navigation, /enterDataServiceDropdownContent|enterUserCenterDropdownContent/)
  assert.doesNotMatch(navigation, /class="dropdown-menu"[\s\S]{0,180}@pointerleave=/)
})
