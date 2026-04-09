import { TabInfo, Suggestion } from "../types";
import { isExcludedUrl } from "./domain-utils";

const STALE_THRESHOLD_MS = 3 * 24 * 60 * 60 * 1000; // 3 days
const HEAVY_DOMAIN_THRESHOLD = 5;

/**
 * Find tabs that haven't been accessed in 3+ days.
 */
export function getStaleTabs(tabs: TabInfo[]): TabInfo[] {
  const cutoff = Date.now() - STALE_THRESHOLD_MS;
  return tabs.filter(
    (tab) =>
      !tab.pinned &&
      !isExcludedUrl(tab.url) &&
      tab.lastAccessed > 0 &&
      tab.lastAccessed < cutoff
  );
}

/**
 * Find domains with 5+ open tabs.
 */
export function getHeavyDomains(
  tabs: TabInfo[]
): Map<string, TabInfo[]> {
  const domainMap = new Map<string, TabInfo[]>();

  for (const tab of tabs) {
    if (!tab.domain || isExcludedUrl(tab.url)) continue;
    const existing = domainMap.get(tab.domain);
    if (existing) {
      existing.push(tab);
    } else {
      domainMap.set(tab.domain, [tab]);
    }
  }

  // Only return domains at or above the threshold
  const heavy = new Map<string, TabInfo[]>();
  for (const [domain, domainTabs] of domainMap) {
    if (domainTabs.length >= HEAVY_DOMAIN_THRESHOLD) {
      heavy.set(domain, domainTabs);
    }
  }
  return heavy;
}

/**
 * Generate smart suggestions from current tab data.
 */
export function generateSuggestions(tabs: TabInfo[]): Suggestion[] {
  const suggestions: Suggestion[] = [];

  const staleTabs = getStaleTabs(tabs);
  if (staleTabs.length > 0) {
    suggestions.push({
      id: "stale-tabs",
      message: `${staleTabs.length} tab${staleTabs.length > 1 ? "s" : ""} not used in 3+ days`,
      actionLabel: "Close stale tabs",
      tabIds: staleTabs.map((t) => t.id),
    });
  }

  const heavyDomains = getHeavyDomains(tabs);
  for (const [domain, domainTabs] of heavyDomains) {
    suggestions.push({
      id: `heavy-${domain}`,
      message: `${domainTabs.length} tabs open on ${domain}`,
      actionLabel: "View",
      tabIds: domainTabs.map((t) => t.id),
    });
  }

  return suggestions;
}
