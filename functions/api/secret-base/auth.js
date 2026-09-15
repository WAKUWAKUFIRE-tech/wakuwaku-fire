import { createSessionCookie } from "../../community/secret-base/auth.js";

function json(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=UTF-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...headers
    }
  });
}

export async function onRequestPost(context) {
  const secret = context.env && context.env.SECRET_BASE_PASSWORD;
  if (typeof secret !== "string" || secret.length < 1) return json({ ok: false, error: "configuration_missing" }, 503);

  const contentLength = Number(context.request.headers.get("content-length") || 0);
  if (contentLength > 2048) return json({ ok: false, error: "request_too_large" }, 413);

  let body;
  try {
    body = JSON.parse(await context.request.text());
  } catch (error) {
    return json({ ok: false, error: "invalid_json" }, 400);
  }
  const password = body && body.password;
  if (typeof password !== "string" || password.length < 1 || password.length > 512) return json({ ok: false, error: "invalid_password" }, 400);

  const valid = password === secret;
  if (!valid) return json({ ok: false, error: "invalid_password" }, 401);

  const cookie = await createSessionCookie(secret, context.request.url);
  return json({ ok: true, redirect: "/community/secret-base/member/" }, 200, { "set-cookie": cookie });
}

export function onRequestGet() {
  return json({ ok: false, error: "method_not_allowed" }, 405, { allow: "POST" });
}
