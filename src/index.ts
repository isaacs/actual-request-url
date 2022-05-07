import type { HeadersInit } from 'node-fetch'
import type { IncomingHttpHeaders } from 'node:http'

interface Sock {
  encrypted?: boolean
  localPort?: number
}
type MaybeSock = Sock | undefined
export interface Req {
  url?: string | URL | null
  headers?: HeadersInit | IncomingHttpHeaders
  socket?: Sock
}

const header = (req: Req, key: string): string | null => {
  const h = req.headers
  if (!h || typeof h !== 'object') {
    return null
  }

  if (h && typeof h === 'object') {
    const maplike = h as { get: (key: string) => string }
    if (!Array.isArray(h) && typeof maplike.get === 'function') {
      const val: unknown = maplike.get(key)
      if (typeof val === 'string') {
        return val
      }
    } else if (
      Array.isArray(h) ||
      typeof (h as Iterable<[string, string]>)[Symbol.iterator] ===
        'function'
    ) {
      for (const [hkey, val] of h as Iterable<[string, string]>) {
        if (hkey === key) {
          return val
        }
      }
    } else {
      const val: unknown = (h as { [key: string]: string })[key]
      if (typeof val === 'string') {
        return val
      }
    }
  }

  return null
}

export const getForwardVal = (req: Req, key: string): string | null => {
  const fw = header(req, 'forwarded')
  const keq = `${key.toLowerCase()}=`
  if (fw && typeof fw === 'string') {
    const firstFw = (fw.split(',').shift() as string).split(';')
    const fwKey = firstFw.filter(f =>
      f.toLowerCase().trim().startsWith(keq)
    )[0]
    if (fwKey) {
      return fwKey.trim().substring(keq.length)
    }
  }
  return null
}

// proxies *append* to the header, so the first one is the one
// that the user actually hit first, allegedly.
const getXFW = (req: Req, key: string): string | null => {
  const val = header(req, key)
  return typeof val === 'string' ? val.split(',')[0] : null
}

export const getProto = (req: Req): string => {
  switch (getForwardVal(req, 'proto')) {
    case 'https':
      return 'https'
    case 'http':
      return 'http'
  }

  const switches: [string, string, string][] = [
    ['x-forwarded-proto', 'https', 'http'],
    ['x-forwarded-protocol', 'https', 'http'],
    ['front-end-https', 'on', 'off'],
    ['x-forwarded-ssl', 'on', 'off'],
    ['x-url-scheme', 'https', 'http'],
  ]
  for (const [key, trueval, falseval] of switches) {
    switch (getXFW(req, key)) {
      case trueval:
        return 'https'
      case falseval:
        return 'http'
    }
  }

  // ok, couldn't get anything from the headers, try to see if the
  // socket is encrypted, if there even is one.
  const sock: MaybeSock = req.socket as MaybeSock
  return !!(sock && sock.encrypted) ? 'https' : 'http'
}

export const getHost = (req: Req): string | null =>
  getForwardVal(req, 'host') ||
  getXFW(req, 'x-forwarded-host') ||
  header(req, 'host') ||
  null

export const getPort = (req: Req): string | null =>
  getForwardVal(req, 'port') ||
  getXFW(req, 'x-forwarded-port') ||
  (req.socket?.localPort ? String(req.socket.localPort) : null)

export const getPath = (req: Req): string => {
  if (!req.url) {
    return '/'
  }
  if (typeof req.url === 'object' && req.url instanceof URL) {
    return req.url.pathname + req.url.search
  }
  if (/^https?:\/\//.test(req.url)) {
    const u = new URL(req.url)
    return u.pathname + u.search
  }
  return req.url
}

export const actualRequestUrl = (req: Req): URL | null => {
  const proto: string = getProto(req)
  const host: string | null = getHost(req)
  if (!host) {
    return null
  }
  const port = getPort(req) || ''
  const showPort =
    port &&
    !(
      (port === '80' && proto === 'http') ||
      (port === '443' && proto === 'https')
    )

  try {
    return new URL(
      `${proto}://${host}${showPort ? `:${port}` : ''}${getPath(req)}`
    )
    /* c8 ignore start */
  } catch (_) {
    return null
  }
  /* c8 ignore stop */
}
