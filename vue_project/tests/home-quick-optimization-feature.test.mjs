import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const source = (path) => readFile(new URL(path, import.meta.url), 'utf8')

test('home keeps the established layout while removing the verified first-visit problems', async () => {
  const [home, guide, freshness, navigation, navigationView, guest, app] = await Promise.all([
    source('../src/views/appHome.vue'),
    source('../src/components/NewUserGuide.vue'),
    source('../src/components/DataFreshnessNotice.vue'),
    source('../src/components/appNav.css'),
    source('../src/components/appNav.vue'),
    source('../src/components/GuestAccessBanner.vue'),
    source('../src/App.vue'),
  ])

  assert.match(home, /<h1 class="hero-title">全球新闻与研究证据工作台<\/h1>/)
  assert.doesNotMatch(home, /近300万|100\+|60\+|200\+/)
  assert.match(home, /background-image: url\('\/imgs\/home\/home-cards\.webp'\)/)
  assert.match(home, /@media \(max-width: 768px\)[\s\S]*?\.card \{[\s\S]*?aspect-ratio: auto;/)
  assert.match(home, /-webkit-line-clamp: 2/)
  assert.doesNotMatch(guide, /setTimeout\(openGuide,\s*1100\)/)
  assert.doesNotMatch(guide, /autoOpenTimer/)
  assert.match(freshness, /position:\s*fixed/)
  assert.match(freshness, /top:\s*72px/)
  assert.match(freshness, /backdrop-filter:\s*blur\(14px\)/)
  assert.match(freshness, /width:\s*44px; height:\s*44px/)
  assert.match(app, /\.freshness-notice ~ \.home/)
  assert.match(app, /padding-top:\s*150px/)
  assert.match(navigation, /\.mobile-hamburger\s*\{[\s\S]*?width:\s*44px;[\s\S]*?height:\s*44px;/)
  assert.doesNotMatch(navigation, /\.mobile-hamburger\s*\{[\s\S]*?width:\s*34px;[\s\S]*?height:\s*34px;/)
  assert.match(navigation, /\.mobile-nav > a\.mobile-nav-item/)
  assert.match(navigation, /\.mobile-nav > button\.mobile-nav-item/)
  assert.match(navigation, /\.mobile-nav-item--has-children:has\(\.mobile-submenu\)/)
  assert.match(navigation, /\.mobile-submenu-item\s*\{[\s\S]*?min-height:\s*44px;/)
  assert.match(navigationView, /<Teleport to="body">[\s\S]*class="mobile-drawer-overlay"[\s\S]*<\/Teleport>/)
  assert.match(guest, /globemind:guest-access-banner:dismissed:v1/)
  assert.match(guest, /@media \(max-width: 760px\)[\s\S]*?\.guest-access \{[\s\S]*?position: relative;/)
})
