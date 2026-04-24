import { TabInfo, DuplicateGroup, TabStats, SearchResult, FuzzyMatchResult } from "../types";
import { extractDomain, isExcludedUrl, normalizeUrl } from "./domain-utils";
import { getStaleTabs } from "./suggestion-utils";

/**
 * Fuzzy match a query against a text string.
 * Characters in the query must appear in order in the text.
 * Scoring rewards consecutive matches, word-boundary matches, and early matches.
 */
export function fuzzyMatch(text: string, query: string): FuzzyMatchResult {
  if (!query) return { matched: true, score: 0, matchedIndices: [] };
  if (!text) return { matched: false, score: 0, matchedIndices: [] };

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();

  // Quick exact-contains check (highest score path)
  const exactIndex = lowerText.indexOf(lowerQuery);
  if (exactIndex !== -1) {
    const indices = Array.from({ length: lowerQuery.length }, (_, i) => exactIndex + i);
    // Bonus for starting at 0 or at a word boundary
    const boundaryBonus = exactIndex === 0 ? 50 : /\W/.test(text[exactIndex - 1]) ? 30 : 0;
    return { matched: true, score: 200 + boundaryBonus, matchedIndices: indices };
  }

  // Sequential character matching
  let qi = 0;
  let score = 0;
  let prevMatchIndex = -2;
  const matchedIndices: number[] = [];

  for (let ti = 0; ti < lowerText.length && qi < lowerQuery.length; ti++) {
    if (lowerText[ti] === lowerQuery[qi]) {
      matchedIndices.push(ti);

      // Consecutive match bonus
      if (ti === prevMatchIndex + 1) {
        score += 15;
      } else {
        score += 5;
      }

      // Word boundary bonus (start of string or preceded by non-alphanumeric)
      if (ti === 0 || /\W/.test(text[ti - 1])) {
        score += 10;
      }

      // Early match bonus (diminishing)
      score += Math.max(0, 10 - ti);

      prevMatchIndex = ti;
      qi++;
    }
  }

  if (qi < lowerQuery.length) {
    return { matched: false, score: 0, matchedIndices: [] };
  }

  return { matched: true, score, matchedIndices };
}

/**
 * Query all open tabs across all windows and map them to TabInfo objects.
 */
export async function getAllTabs(): Promise<TabInfo[]> {
  const chromeTabs = await chrome.tabs.query({});
  return chromeTabs
    .filter((tab) => tab.id !== undefined && tab.url !== undefined)
    .map((tab) => ({
      id: tab.id!,
      url: normalizeUrl(tab.url!),
      domain: extractDomain(tab.url!),
      title: tab.title || "",
      lastAccessed: tab.lastAccessed ?? 0,
      windowId: tab.windowId,
      pinned: tab.pinned ?? false,
    }));
}

/**
 * Find groups of duplicate tabs (same exact normalized URL).
 * Excludes pinned tabs and internal browser URLs from being closed.
 */
export function findDuplicates(tabs: TabInfo[]): DuplicateGroup[] {
  const urlMap = new Map<string, TabInfo[]>();

  for (const tab of tabs) {
    // Skip excluded URLs and pinned tabs
    if (isExcludedUrl(tab.url) || tab.pinned || !tab.domain) {
      continue;
    }

    const existing = urlMap.get(tab.url);
    if (existing) {
      existing.push(tab);
    } else {
      urlMap.set(tab.url, [tab]);
    }
  }

  const duplicateGroups: DuplicateGroup[] = [];

  for (const [url, groupTabs] of urlMap) {
    if (groupTabs.length <= 1) continue;

    // Keep the most recently accessed tab
    const sorted = [...groupTabs].sort(
      (a, b) => b.lastAccessed - a.lastAccessed
    );
    const tabToKeep = sorted[0];
    const tabIdsToClose = sorted.slice(1).map((t) => t.id);

    duplicateGroups.push({ url, tabs: groupTabs, tabToKeep, tabIdsToClose });
  }

  return duplicateGroups;
}

/**
 * Close duplicate tabs, keeping the most recently accessed one in each group.
 * Returns the number of tabs closed.
 */
export async function closeDuplicates(
  duplicateGroups: DuplicateGroup[]
): Promise<number> {
  const idsToClose = duplicateGroups.flatMap((g) => g.tabIdsToClose);
  if (idsToClose.length === 0) return 0;

  await chrome.tabs.remove(idsToClose);
  return idsToClose.length;
}

/**
 * Group tabs by domain using the chrome.tabGroups API.
 * Returns the number of groups created.
 */
export async function groupTabsByDomain(tabs: TabInfo[]): Promise<number> {
  // Collect tabs by domain (skip excluded URLs)
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

  let groupsCreated = 0;

  // Group tabs by domain within each window
  const windowDomainMap = new Map<number, Map<string, number[]>>();

  for (const [domain, domainTabs] of domainMap) {
    for (const tab of domainTabs) {
      if (!windowDomainMap.has(tab.windowId)) {
        windowDomainMap.set(tab.windowId, new Map());
      }
      const windowMap = windowDomainMap.get(tab.windowId)!;
      if (!windowMap.has(domain)) {
        windowMap.set(domain, []);
      }
      windowMap.get(domain)!.push(tab.id);
    }
  }

  // Create tab groups per window per domain (only if 2+ tabs share a domain)
  for (const [_windowId, domainTabIds] of windowDomainMap) {
    for (const [domain, tabIds] of domainTabIds) {
      if (tabIds.length < 2) continue;

      try {
        const { getDomainColor } = await import("./domain-utils");
        const groupId = await chrome.tabs.group({ tabIds });
        await chrome.tabGroups.update(groupId, {
          title: domain,
          color: getDomainColor(domain),
          collapsed: false,
        });
        groupsCreated++;
      } catch {
        // Tab may have been closed between query and group — ignore
      }
    }
  }

  return groupsCreated;
}

/**
 * Get current tab statistics for the popup UI.
 */
export async function getTabStats(): Promise<TabStats> {
  const tabs = await getAllTabs();
  const duplicates = findDuplicates(tabs);
  const domains = new Set(tabs.map((t) => t.domain).filter(Boolean));
  const staleTabs = getStaleTabs(tabs);

  return {
    totalTabs: tabs.length,
    duplicateCount: duplicates.reduce((sum, g) => sum + g.tabIdsToClose.length, 0),
    uniqueDomains: domains.size,
    staleCount: staleTabs.length,
  };
}

/**
 * Search open tabs by title or URL using fuzzy matching.
 * Results are ranked by match quality, then by recency.
 */
export async function searchTabs(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  const tabs = await getAllTabs();
  const trimmed = query.trim();

  const scored: { tab: TabInfo; score: number }[] = [];

  for (const tab of tabs) {
    const titleMatch = fuzzyMatch(tab.title, trimmed);
    const urlMatch = fuzzyMatch(tab.url, trimmed);

    if (!titleMatch.matched && !urlMatch.matched) continue;

    // Title matches are worth more than URL matches
    const titleScore = titleMatch.matched ? titleMatch.score * 2 : 0;
    const urlScore = urlMatch.matched ? urlMatch.score : 0;
    const bestScore = Math.max(titleScore, urlScore);

    // Small recency bonus (normalized to 0-10 range)
    const recencyBonus = Math.min(10, tab.lastAccessed / (Date.now() / 10));

    scored.push({ tab, score: bestScore + recencyBonus });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .map(({ tab }) => ({
      id: tab.id,
      title: tab.title,
      url: tab.url,
      domain: tab.domain,
      windowId: tab.windowId,
    }));
}
