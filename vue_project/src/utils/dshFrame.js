/** Keep assistant navigation same-origin and bypass stale SPA documents. */
export function dshLaunchUrl(value, origin, nonce) {
  const url = new URL(value, origin)
  if (url.origin !== origin || url.pathname !== '/dsh/' || url.username || url.password) {
    throw new Error('数据助手启动地址无效，请联系管理员。')
  }
  url.searchParams.set('_gm_launch', nonce)
  return `${url.pathname}${url.search}${url.hash}`
}

export function isDshFrame(frame) {
  try {
    return Boolean(frame.contentWindow?.__DSH_BOOT__) &&
      frame.contentWindow.location.pathname.startsWith('/dsh/')
  } catch {
    return false
  }
}
