/**
 * Cloudflare Worker Entrypoint for Music Room Hub
 * Serves static assets from frontend/ and proxies /api and /socket.io to the Node.js backend.
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Backend Node.js server URL (Configured in Cloudflare Dashboard Variables or fallback)
    const backendOrigin = env.BACKEND_URL || "https://your-backend-server.up.railway.app";

    // 1. Proxy API & Real-time WebSocket to Node.js Backend Server
    if (url.pathname.startsWith('/api') || url.pathname.startsWith('/socket.io')) {
      const targetUrl = new URL(url.pathname + url.search, backendOrigin);
      
      // Clone request headers and forward
      const newHeaders = new Headers(request.headers);
      newHeaders.set('Host', new URL(backendOrigin).host);
      newHeaders.set('X-Forwarded-Host', url.host);
      newHeaders.set('X-Forwarded-Proto', url.protocol.replace(':', ''));

      return fetch(new Request(targetUrl, {
        method: request.method,
        headers: newHeaders,
        body: (request.method !== 'GET' && request.method !== 'HEAD') ? request.body : undefined,
        redirect: 'follow'
      }));
    }

    // 2. Serve Static Frontend files (index.html, styles.css, app.js, robots.txt, etc.)
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Cloudflare Worker is running. Please configure static assets or backend URL.", { status: 200 });
  }
};
