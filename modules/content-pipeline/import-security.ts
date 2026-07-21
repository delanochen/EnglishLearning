import { isIP } from "node:net";
import { lookup } from "node:dns/promises";

export type ImportSourcePolicy = { baseUrl: string; allowedDomains: string[]; allowedPathPrefixes: string[] };

function privateIpv4(address: string) {
  const octets = address.split(".").map(Number);
  return octets[0] === 10 || octets[0] === 127 || (octets[0] === 169 && octets[1] === 254) || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) || (octets[0] === 192 && octets[1] === 168) || octets[0] === 0;
}

export function isPrivateAddress(address: string) {
  if (isIP(address) === 4) return privateIpv4(address);
  const value = address.toLowerCase().split("%")[0];
  const mapped = value.startsWith("::ffff:") ? value.slice(7) : "";
  return value === "::" || value === "::1" || value.startsWith("fc") || value.startsWith("fd") || value.startsWith("fe8") || value.startsWith("fe9") || value.startsWith("fea") || value.startsWith("feb") || (isIP(mapped) === 4 && privateIpv4(mapped));
}

export function validateImportUrl(rawUrl: string, policy: ImportSourcePolicy) {
  const url = new URL(rawUrl); const base = new URL(policy.baseUrl);
  if (url.protocol !== "https:") throw new Error("IMPORT_HTTPS_REQUIRED");
  if (url.username || url.password) throw new Error("IMPORT_URL_CREDENTIALS_FORBIDDEN");
  if (url.port && url.port !== "443") throw new Error("IMPORT_NONSTANDARD_PORT_FORBIDDEN");
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || isIP(host) && isPrivateAddress(host)) throw new Error("IMPORT_PRIVATE_HOST_FORBIDDEN");
  const domains = [...new Set([base.hostname.toLowerCase(), ...policy.allowedDomains.map((domain) => domain.trim().toLowerCase())])];
  if (!domains.includes(host)) throw new Error("IMPORT_DOMAIN_NOT_ALLOWED");
  if (policy.allowedPathPrefixes.length && !policy.allowedPathPrefixes.some((prefix) => url.pathname.startsWith(prefix.startsWith("/") ? prefix : `/${prefix}`))) throw new Error("IMPORT_PATH_NOT_ALLOWED");
  url.hash = "";
  return url;
}

export async function assertPublicDns(url: URL) {
  const results = await lookup(url.hostname, { all: true, verbatim: true });
  if (!results.length || results.some(({ address }) => isPrivateAddress(address))) throw new Error("IMPORT_DNS_PRIVATE_ADDRESS");
}

export function robotsAllows(robotsText: string, pathname: string) {
  let applies = false; const disallowed: string[] = [];
  for (const rawLine of robotsText.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim(); if (!line) continue;
    const [rawKey, ...rest] = line.split(":"); const key = rawKey.toLowerCase(); const value = rest.join(":").trim();
    if (key === "user-agent") applies = value === "*";
    else if (key === "disallow" && applies && value) disallowed.push(value);
  }
  return !disallowed.some((prefix) => pathname.startsWith(prefix));
}

export function cleanImportedText(input: string, contentType = "text/plain") {
  let text = input.replace(/\u0000/g, "");
  if (contentType.includes("html")) text = text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<!--[\s\S]*?-->/g, " ").replace(/<[^>]+>/g, " ");
  return text.replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/\s+/g, " ").trim();
}
