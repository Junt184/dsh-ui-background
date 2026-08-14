// Host half of dsh-ui-background.
//
// Registers one HTTP route that serves a local image file to the browser, so
// the client half can accept `file://` URLs and bare absolute paths (the
// browser itself refuses to load `file://` subresources from an http(s) page).
// The route is loopback-only: it answers 403 for non-loopback clients, so a
// 0.0.0.0 / trusted-host deployment cannot read arbitrary files through it.
//
// Preferences themselves live in the browser's localStorage — the Web settings
// API is allowlisted to first-party namespaces (WEB_SETTINGS_NAMESPACES in
// @deepseek-ai/dsh-host-apiproxy), so a third-party plugin cannot register a
// durable settings namespace reachable from the browser. See README.
import { readFile } from 'node:fs/promises'
import { extname } from 'node:path'

/** Route prefix the client half addresses for local-image serving. */
export const IMAGE_ROUTE = '/dsh-ui-background/image'

const MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
}

/** Whether a request originates from the local machine. */
function isLoopback(req) {
  const addr = req.socket?.remoteAddress
  return addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1'
}

/**
 * Serve a local image file by path (query param `path`). Loopback-only.
 * @param ctx - host Cordis context.
 */
export function apply(ctx) {
  ctx.inject(['webServer'], (httpCtx) => {
    httpCtx.effect(() => httpCtx.webServer.register({
      kind: 'prefix',
      path: IMAGE_ROUTE,
      handler: async (req, res) => {
        if (!isLoopback(req)) {
          res.writeHead(403, { 'Content-Type': 'text/plain' })
          res.end('forbidden: local-image route is loopback-only')
          return
        }
        try {
          const url = new URL(req.url ?? '/', 'http://localhost')
          const filePath = url.searchParams.get('path') ?? ''
          if (filePath === '') {
            res.writeHead(400, { 'Content-Type': 'text/plain' })
            res.end('missing path')
            return
          }
          const data = await readFile(filePath)
          const type = MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream'
          res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' })
          res.end(data)
        } catch {
          res.writeHead(404, { 'Content-Type': 'text/plain' })
          res.end('not found')
        }
      },
    }), 'ui-background: local image route')
  })
}
