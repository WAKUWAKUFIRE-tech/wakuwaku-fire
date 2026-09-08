// Restore documents belong in Git, not the public website.
export function onRequest() {
  return new Response('Not found', {status:404, headers:{'Content-Type':'text/plain; charset=utf-8','X-Robots-Tag':'noindex, nofollow','Cache-Control':'no-store'}});
}
