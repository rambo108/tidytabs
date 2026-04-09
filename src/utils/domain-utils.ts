/** URLs with these protocols are internal browser pages and should be excluded. */
const EXCLUDED_PROTOCOLS = ["chrome:", "edge:", "about:", "chrome-extension:", "devtools:"];

/**
 * Extract the domain (hostname) from a URL string.
 * Returns empty string for invalid or internal browser URLs.
 */
export function extractDomain(url: string): string {
  if (!url || isExcludedUrl(url)) {
    return "";
  }

  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return "";
  }
}

/**
 * Check if a URL is an internal browser page that should be excluded
 * from duplicate detection and organization.
 */
export function isExcludedUrl(url: string): boolean {
  if (!url) return true;
  return EXCLUDED_PROTOCOLS.some((protocol) => url.startsWith(protocol));
}

/**
 * Normalize a URL for exact-match comparison.
 * Removes trailing slashes and lowercases the protocol + hostname.
 */
export function normalizeUrl(url: string): string {
  if (!url || isExcludedUrl(url)) {
    return url;
  }

  try {
    const parsed = new URL(url);
    // Reconstruct with normalized protocol + host, keep original path/query/hash
    let normalized = `${parsed.protocol}//${parsed.hostname}`;
    if (parsed.port) {
      normalized += `:${parsed.port}`;
    }
    normalized += parsed.pathname.replace(/\/+$/, "") || "/";
    normalized += parsed.search;
    normalized += parsed.hash;
    return normalized;
  } catch {
    return url;
  }
}

/** Color palette for tab groups, cycling through available chrome group colors. */
export const GROUP_COLORS: chrome.tabGroups.ColorEnum[] = [
  "blue",
  "red",
  "yellow",
  "green",
  "pink",
  "purple",
  "cyan",
  "orange",
  "grey",
];

/**
 * Get a consistent color for a domain by hashing the domain string.
 */
export function getDomainColor(domain: string): chrome.tabGroups.ColorEnum {
  let hash = 0;
  for (let i = 0; i < domain.length; i++) {
    hash = (hash << 5) - hash + domain.charCodeAt(i);
    hash |= 0; // Convert to 32-bit int
  }
  return GROUP_COLORS[Math.abs(hash) % GROUP_COLORS.length];
}
