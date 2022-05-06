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
fields!**  But, for low-risk decisions, like redirecting to
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

## API

### `actualRequestUrl(req) => URL | null`

Give it a request (either node http/https server request, or a
fetch.Request lookalike).

Returns a URL object if it could be parsed, otherwise null.

### `getProto(req) => string`

Return `'https'` if the user allegedly used https, otherwise `'http'`

### `getHost(req) => string | null`

Return the hostname the user allegedly used.

### `getPath(req) => string`

Return the string portion of the request url.
