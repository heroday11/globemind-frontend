import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const navigation = await readFile(
  new URL(process.env.APP_NAV_SOURCE || '../src/components/appNav.vue', import.meta.url),
  'utf8',
)

test('desktop and mobile expose the same primary destinations in order', () => {
  const definitions = navigation.match(/const primaryLinks = \[([\s\S]*?)\]/)?.[1]
  assert.ok(definitions)
  assert.deepEqual([...definitions.matchAll(/path: '([^']+)', label: '([^']+)'/g)].map(
    ([, path, label]) => [path, label],
  ), [
    ['/', '首页'],
    ['/data-service/ground-news', '全球新闻观察台'],
    ['/sentiment-analysis', '涉华舆情分析'],
    ['/data-service/data-search', '数据服务'],
    ['/data-service/story-graph', '事件故事脉络'],
    ['/data-assistant', '数据助手'],
    ['/data-service/report-center', '报告中心'],
    ['/financial-terminal', '数值分析预警'],
    ['/academic-data', 'Agent 能力市场'],
  ])

  assert.match(navigation, /<nav class="nav-center"[\s\S]*?<li v-for="link in primaryLinks"[\s\S]*?<router-link\s+:to="link.path"/)
  assert.match(navigation, /<nav class="mobile-nav"[\s\S]*?<router-link\s+v-for="link in primaryLinks"[\s\S]*?:to="link.path"/)
  assert.doesNotMatch(navigation, /desktop-more-menu|mobile-more-menu/)
})

test('the user center stays open when focus moves inside its menu', () => {
  assert.match(
    navigation,
    /leaveUserCenterDropdown = \(event\)[\s\S]{0,180}currentTarget\?\.contains\?\.\(event\.relatedTarget\)/,
  )
  assert.doesNotMatch(navigation, /enterDataServiceDropdownContent|enterUserCenterDropdownContent/)
  assert.doesNotMatch(navigation, /class="dropdown-menu"[\s\S]{0,180}@pointerleave=/)
})
