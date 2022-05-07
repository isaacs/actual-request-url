# actual-request-url

Get the best guess as to what url the user actually requested,
based on what the `Forwarded`, `X-Forwarded-*`,
`X-Forwarded-For`, ..., request headers are trying to tell you.

Pass it a node-fetch style `Request` object (as found in
remix-run and other platforms) or a Node.js `request` object, and
it'll tell you what it can find.

If the actual url cannot be determined, doesn't appear to be
valid, whatever it'll return `null`, and you're on your own.

If we can figure it out, returns a `URL` object.

## Important Security Note

All of these fields can be set by any proxy truthfully or not.
Anyone can set them via `curl` to make it look like they're
coming from somewhere other than they are.

So, very important: **Do not place any kind of trust in these
fields!** But, for low-risk decisions, like redirecting to
`https` from a `http` request, it's fine.

## USAGE

```js
// cjs style
const { actualRequestUrl } = require('actual-request-url')
// other handy exports, bonus
const {
  getProto, // protocol, http or https, from x-fw or socket encrypted flag
  getHost, // from host, x-forwarded-host, or forward: host=... header
  getPort, // string, like '80' or '443', or null if unclear
  getPath, // string, like `/path/asdf?x=y`
  getForwardVal, // get closest value from Forward header.
}

// esm style
import { actualRequestUrl } from 'actual-request-url'

// other exports:
import {
  getProto, // protocol, http or https, from x-fw or socket encrypted flag
  getHost, // from host, x-forwarded-host, or forward: host=... header
  getPort, // string, like '80' or '443', or null if unclear
  getPath, // string, like `/path/asdf?x=y`
  getForwardVal, // get closest value from Forward header.
} from 'actual-request-url'
```

Actual real-world example, forward `http` requests to an express
app to `https` in productino (note: you should _also_ set [HTTP
Strict Transport Security
headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security)
so it can't be MITM'ed after the first request!)

```js
import { actualRequestUrl, getProto } from 'actual-request-url'

const forceHTTPS = (req, res /* express: next */) => {
  // in production, insist on https
  if (process.env.NODE_ENV === 'production' && getProto(req) !== 'https') {
    const u = actualRequestUrl(req)
    if (!u) {
      // express: res.status(400).send('Invalid url')
      // fastify: res.code(400).send('Invalid url')
      // raw node:
      res.statusCode = 400
      res.end('Invalid url')
    } else {
      u.protocol = 'https:'
      // express: res.redirect(String(u), 301)
      // fastify: res.redirect(301, String(u))
      // raw node:
      res.statusCode = 301
      res.setHeader('location', String(u))
      res.end(`Moved permanently: ${u}`)
    }
  }
  // express: next()
}
```

## API

### `actualRequestUrl(req) => URL | null`

Give it a request (either node http/https server request, or a
fetch.Request lookalike).

Returns a URL object if it could be parsed, otherwise null. (If
it returns `null`, you _probably_ should reply with a 4xx error
of some sort.)

### `getProto(req) => string`

Return `'https'` if the user allegedly used https, otherwise `'http'`

### `getHost(req) => string | null`

Return the hostname the user allegedly used.

### `getPath(req) => string`

Return the path portion of the request url (ie, the part that is
normally found on Node's `req.url`).
