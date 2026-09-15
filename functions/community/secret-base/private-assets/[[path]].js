import { isAuthorized } from "../auth.js";

const NO_STORE_HEADERS = {
  "cache-control": "no-store",
  "x-robots-tag": "noindex, nofollow, noarchive",
};

export async function onRequest(context) {
  if (!(await isAuthorized(context.request, context.env.SECRET_BASE_PASSWORD))) {
    return new Response("Not found", { status: 404, headers: NO_STORE_HEADERS });
  }

  const path = Array.isArray(context.params.path)
    ? context.params.path.join("/")
    : (context.params.path || "");

  if (!path || path.includes("..") || path.includes("\\")) {
    return new Response("Not found", { status: 404, headers: NO_STORE_HEADERS });
  }

  const assetUrl = new URL(`/community/secret-base/private-assets/${path}`, context.request.url);
  const assetResponse = await context.env.ASSETS.fetch(assetUrl);
  if (assetResponse.status === 404) {
    return new Response("Not found", { status: 404, headers: NO_STORE_HEADERS });
  }

  const headers = new Headers(assetResponse.headers);
  headers.set("cache-control", "private, max-age=86400");
  headers.set("x-robots-tag", "noindex, nofollow, noarchive");
  return new Response(assetResponse.body, { status: assetResponse.status, headers });
}
