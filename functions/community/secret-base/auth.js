const COOKIE_NAME = "secret_base_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
const textEncoder = new TextEncoder();

function bytesToHex(bytes) {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(value) {
  if (!/^[0-9a-f]+$/i.test(value) || value.length % 2) return null;
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  return bytes;
}

async function sign(payload, secret) {
  const key = await crypto.subtle.importKey("raw", textEncoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return bytesToHex(await crypto.subtle.sign("HMAC", key, textEncoder.encode(payload)));
}

function constantTimeEqual(left, right) {
  if (!left || !right || left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

function readCookie(request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const entry = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`));
  return entry ? entry.slice(COOKIE_NAME.length + 1) : "";
}

export async function createSessionCookie(secret, requestUrl) {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  const payload = String(expiresAt);
  const signature = await sign(`secret-base:${payload}`, secret);
  const secure = new URL(requestUrl).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE_NAME}=${payload}.${signature}; Max-Age=${SESSION_MAX_AGE}; Path=/community/secret-base/; HttpOnly; SameSite=Lax${secure}`;
}

export async function isAuthorized(request, secret) {
  if (!secret) return false;
  const raw = readCookie(request);
  const separator = raw.indexOf(".");
  if (separator < 1) return false;
  const expiresAt = Number(raw.slice(0, separator));
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return false;
  const supplied = hexToBytes(raw.slice(separator + 1));
  const expected = hexToBytes(await sign(`secret-base:${expiresAt}`, secret));
  return constantTimeEqual(supplied, expected);
}

export { COOKIE_NAME, SESSION_MAX_AGE };
