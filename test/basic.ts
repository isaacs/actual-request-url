import t from 'tap'
import fetch, { Headers } from 'node-fetch'
import { createServer } from 'node:http'

import {
  actualRequestUrl,
  getProto,
  getHost,
  getPort,
  getPath,
  getForwardVal,
  Req,
} from '../lib/index'

t.match(
  {
    getProto,
    getHost,
    getPort,
    getPath,
    getForwardVal,
  },
  {
    getProto: Function,
    getHost: Function,
    getPort: Function,
    getPath: Function,
    getForwardVal: Function,
  },
  'exported helper methods'
)

// [req, url][]
const cases: [Req, string | null][] = [
  [
    {
      url: '/some/path?a=b',
      headers: {
        host: 'example.com',
        'x-forwarded-proto': 'https',
        'x-forwarded-port': '99',
      },
    },
    'https://example.com:99/some/path?a=b',
  ],
  [
    {
      url: '/some/path?a=b',
      headers: {
        'x-forwarded-proto': 'https',
        'x-forwarded-port': '99',
      },
    },
    null,
  ],
  [
    {
      url: null,
      headers: [
        ['host', 'example.com'],
        ['x-forwarded-proto', 'https'],
      ],
    },
    'https://example.com/',
  ],
  [
    {
      headers: new Headers([
        ['host', 'example.com'],
        ['x-forwarded-proto', 'https'],
        ['x-forwarded-port', '443'],
      ]),
    },
    'https://example.com/',
  ],
  [
    {
      url: 'http://x.com/a/b/c?x=y',
      headers: new Headers([
        ['host', 'example.com'],
        ['x-forwarded-proto', 'https'],
        ['x-forwarded-port', '443'],
      ]),
    },
    'https://example.com/a/b/c?x=y',
  ],
  [
    {
      url: new URL('http://x.com/a/b/c?x=y'),
      headers: new Headers([
        ['host', 'example.com'],
        ['x-forwarded-proto', 'https'],
        ['x-forwarded-port', '443'],
      ]),
    },
    'https://example.com/a/b/c?x=y',
  ],
  [
    {
      url: new URL('http://x.com:443/a/b/c?x=y'),
      headers: new Headers([
        [
          'forwarded',
          'port=80;host=example.com;proto=https, port=443;host=x.com;proto=http',
        ],
      ]),
      socket: { encrypted: true },
    },
    'https://example.com:80/a/b/c?x=y',
  ],
  [
    {
      url: '/a/b/c?x=y',
      headers: { host: 'example.com', forwarded: 'port=80' },
      socket: { encrypted: true },
    },
    'https://example.com:80/a/b/c?x=y',
  ],
  [
    {
      url: '/a/b/c?x=y',
      headers: {
        host: 'example.com',
        forwarded: 'port=80;\n   proto=https',
      },
    },
    'https://example.com:80/a/b/c?x=y',
  ],
  [
    {
      url: '/a/b/c?x=y',
      headers: { host: 'example.com', forwarded: 'port=80;proto=http' },
      socket: { encrypted: true },
    },
    'http://example.com/a/b/c?x=y',
  ],
  [
    {
      url: '/a/b/c?x=y',
      headers: { host: 'example.com' },
      socket: { encrypted: true, localPort: 443 },
    },
    'https://example.com/a/b/c?x=y',
  ],
  [
    {
      url: '/a/b/c?x=y',
      headers: { host: 'example.com' },
      socket: { encrypted: true, localPort: 9999 },
    },
    'https://example.com:9999/a/b/c?x=y',
  ],
  [
    {
      url: '/a/b/c?x=y',
      headers: { host: 'example.com' },
      socket: { encrypted: true, localPort: 0 },
    },
    'https://example.com/a/b/c?x=y',
  ],
  [
    {
      url: '/a/b/c?x=y',
      headers: { host: 'example.com', 'front-end-https': 'off' },
    },
    'http://example.com/a/b/c?x=y',
  ],
  [
    {
      url: '/a/b/c?x=y',
      headers: { host: 'example.com', 'x-forwarded-ssl': 'on' },
    },
    'https://example.com/a/b/c?x=y',
  ],
  [
    {
      url: '/a/b/c?x=y',
      headers: { host: 'example.com', 'x-forwarded-protocol': 'http' },
    },
    'http://example.com/a/b/c?x=y',
  ],
  [
    {
      url: '/a/b/c?x=y',
      headers: { host: 'example.com:1234', 'x-forwarded-protocol': 'http' },
      socket: { localPort: 1234 },
    },
    'http://example.com:1234/a/b/c?x=y',
  ],
  [
    {
      url: 'http://example.com/a/b/c?x=y',
    },
    null,
  ],
]

for (const [req, expect] of cases) {
  const u = actualRequestUrl(req)
  if (u !== null) {
    t.type(u, URL, 'returned URL object')
  }
  const actual = u === null ? u : String(u)
  t.equal(actual, expect, `expect ${expect}`, { req })
}

t.test('actual http server test', t => {
  // mostly for typescript purposes, just to show that it works with
  // a real http request, and doesn't get crabby about types.
  const server = createServer((req, res) => {
    server.close()
    res.setHeader('connection', 'close')
    const u = actualRequestUrl(req)
    res.end(JSON.stringify(u === null ? u : String(u)))
  })
  const c = process.env.TAP_CHILD_ID
  const port = 10000 + (c === undefined ? 0 : +c)
  server.listen(port, async () => {
    const res = await fetch(`http://127.0.0.1:${port}/a/b/c?x=y`, {
      headers: {
        'x-forwarded-proto': 'https',
        'x-forwarded-host': 'example.com',
        forwarded: 'port=443',
        host: '127.0.0.1',
      },
    })
    const actual = await res.json()
    t.equal(actual, 'https://example.com/a/b/c?x=y')
    t.end()
  })
})
