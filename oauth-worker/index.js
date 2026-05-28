/**
 * Cloudflare Worker — GitHub OAuth proxy for Decap CMS
 *
 * Setup:
 * 1. Create a GitHub OAuth App at https://github.com/settings/developers
 *    - Homepage URL: https://drou0302.github.io
 *    - Callback URL: https://decap-oauth.drou0302.workers.dev/callback
 * 2. Set secrets: wrangler secret put GITHUB_CLIENT_ID
 *                 wrangler secret put GITHUB_CLIENT_SECRET
 * 3. Deploy: wrangler deploy
 * 4. Update public/admin/config.yml base_url to this worker's URL
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' },
      });
    }

    if (url.pathname === '/auth') {
      const params = new URLSearchParams({
        client_id: env.GITHUB_CLIENT_ID,
        scope: 'repo,user',
      });
      return Response.redirect(`https://github.com/login/oauth/authorize?${params}`);
    }

    if (url.pathname === '/callback') {
      const code = url.searchParams.get('code');
      if (!code) return new Response('Missing code', { status: 400 });

      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });

      const { access_token, error } = await tokenRes.json();

      if (error || !access_token) {
        const msg = `authorization:github:error:${error ?? 'unknown'}`;
        return new Response(
          `<script>(function(){
            function cb(e){ e.source.postMessage(${JSON.stringify(msg)}, e.origin); }
            window.addEventListener('message', cb, false);
            window.opener.postMessage('authorizing:github', '*');
          })()</script>`,
          { headers: { 'Content-Type': 'text/html' } }
        );
      }

      const token = access_token;
      const successMsg = `authorization:github:success:${JSON.stringify({ token, provider: 'github' })}`;
      return new Response(
        `<script>(function(){
          function cb(e){ e.source.postMessage(${JSON.stringify(successMsg)}, e.origin); }
          window.addEventListener('message', cb, false);
          window.opener.postMessage('authorizing:github', '*');
        })()</script>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    return new Response('Not found', { status: 404 });
  },
};
