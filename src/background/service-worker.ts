import {
  getAllTabs,
  findDuplicates,
  closeDuplicates,
  groupTabsByDomain,
  getTabStats,
  searchTabs,
} from "../utils/tab-utils";
import { isExcludedUrl } from "../utils/domain-utils";
import { generateSuggestions, getStaleTabs } from "../utils/suggestion-utils";
import { searchBookmarks } from "../utils/bookmark-utils";
import { ExtensionMessage, OrganizeResult } from "../types";

// --- Badge: show total tab count ---

async function updateBadge(): Promise<void> {
  try {
    const tabs = await chrome.tabs.query({});
    const count = tabs.length;
    await chrome.action.setBadgeText({ text: count.toString() });
    await chrome.action.setBadgeBackgroundColor({ color: "#4285F4" });
  } catch {
    // Service worker may wake up before APIs are ready — ignore
  }
}

// --- Core: detect and close duplicates for a specific URL ---

async function handlePotentialDuplicate(url: string): Promise<void> {
  if (!url || isExcludedUrl(url)) return;

  const tabs = await getAllTabs();
  const duplicates = findDuplicates(tabs);

  if (duplicates.length > 0) {
    await closeDuplicates(duplicates);
    console.log(
      `[TidyTabs] Closed ${duplicates.reduce((s, g) => s + g.tabIdsToClose.length, 0)} duplicate tab(s)`
    );
  }

  await updateBadge();
}

// --- Full organize: close duplicates + group by domain ---

async function organizeAllTabs(): Promise<OrganizeResult> {
  const tabs = await getAllTabs();
  const duplicates = findDuplicates(tabs);
  const duplicatesClosed = await closeDuplicates(duplicates);

  // Re-query tabs after closing duplicates
  const remainingTabs = await getAllTabs();
  const groupsCreated = await groupTabsByDomain(remainingTabs);

  const domains = [
    ...new Set(remainingTabs.map((t) => t.domain).filter(Boolean)),
  ];

  await updateBadge();

  return {
    duplicatesClosed,
    groupsCreated,
    totalTabs: remainingTabs.length,
    domains,
  };
}

// --- Event listeners ---

// Track the last known URL per tab so auto-close only fires on actual
// navigation to a new URL, not on tab create/duplicate/restore.
const tabUrlMap = new Map<number, string>();

// Seed URL map for existing tabs on service worker startup
chrome.tabs.query({}).then((tabs) => {
  for (const tab of tabs) {
    if (tab.id !== undefined && tab.url) {
      tabUrlMap.set(tab.id, tab.url);
    }
  }
});

chrome.tabs.onCreated.addListener(async (tab) => {
  // Record the initial URL but don't auto-close — user may be duplicating to navigate elsewhere
  if (tab.id !== undefined && tab.url) {
    tabUrlMap.set(tab.id, tab.url);
  }
  await updateBadge();
});

// Only auto-close duplicates when a tab navigates to a different URL
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    const previousUrl = tabUrlMap.get(tabId);
    tabUrlMap.set(tabId, tab.url);

    // Skip if this is the first load (tab was just created/duplicated with this URL)
    if (!previousUrl || previousUrl === tab.url) return;

    await handlePotentialDuplicate(tab.url);
  }
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  tabUrlMap.delete(tabId);
  await updateBadge();
});

// --- Message handler for popup communication ---

chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ) => {
    // Only accept messages from this extension
    if (sender.id !== chrome.runtime.id) return false;

    switch (message.type) {
      case "GET_STATS":
        getTabStats().then((data) =>
          sendResponse({ type: "STATS_RESULT", data })
        );
        return true; // async response

      case "CLOSE_DUPLICATES":
        (async () => {
          const tabs = await getAllTabs();
          const duplicates = findDuplicates(tabs);
          const closed = await closeDuplicates(duplicates);
          await updateBadge();
          sendResponse({ type: "ORGANIZE_RESULT", data: { duplicatesClosed: closed } });
        })();
        return true;

      case "ORGANIZE_TABS":
        organizeAllTabs().then((data) =>
          sendResponse({ type: "ORGANIZE_RESULT", data })
        );
        return true;

      case "SEARCH_TABS":
        searchTabs(message.query).then((results) =>
          sendResponse({ type: "SEARCH_RESULT", data: results })
        );
        return true;

      case "SWITCH_TO_TAB":
        (async () => {
          try {
            // If the tab is in a collapsed group, expand it first so the
            // browser scrolls/reveals the tab in the strip.
            const tab = await chrome.tabs.get(message.tabId);
            if (
              tab.groupId !== undefined &&
              tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE
            ) {
              try {
                await chrome.tabGroups.update(tab.groupId, { collapsed: false });
              } catch {
                // tabGroups may be unavailable; ignore
              }
            }
          } catch {
            // tab may have been closed; fall through
          }
          await chrome.tabs.update(message.tabId, { active: true });
          await chrome.windows.update(message.windowId, { focused: true });
          sendResponse({ type: "SWITCH_RESULT", data: { success: true } });
        })();
        return true;

      case "GET_SUGGESTIONS":
        (async () => {
          const allTabs = await getAllTabs();
          const suggestions = generateSuggestions(allTabs);
          sendResponse({ type: "SUGGESTIONS_RESULT", data: suggestions });
        })();
        return true;

      case "CLOSE_STALE_TABS":
        (async () => {
          const allTabs = await getAllTabs();
          const staleTabs = getStaleTabs(allTabs);
          const staleIds = staleTabs.map((t) => t.id);
          if (staleIds.length > 0) {
            await chrome.tabs.remove(staleIds);
          }
          await updateBadge();
          sendResponse({ type: "STALE_RESULT", data: { closed: staleIds.length } });
        })();
        return true;

      case "SEARCH_BOOKMARKS":
        searchBookmarks(message.query).then((results) =>
          sendResponse({ type: "BOOKMARK_SEARCH_RESULT", data: results })
        );
        return true;

      case "MARK_TAB":
        markTab(message.tabId, message.marker).then(() =>
          sendResponse({ type: "MARK_RESULT", data: { success: true } })
        );
        return true;

      case "UNMARK_TAB":
        unmarkTab(message.tabId).then(() =>
          sendResponse({ type: "UNMARK_RESULT", data: { success: true } })
        );
        return true;

      case "REVEAL_ACTIVE_TAB":
        revealActiveTab(message.marker).then((data) =>
          sendResponse({ type: "REVEAL_RESULT", data })
        );
        return true;
    }

    return false;
  }
);

/**
 * Prefix the tab's <title> with `marker` so the tab stands out in the
 * browser's tab strip / vertical tab list. Stores the original title on
 * `window.__tidyTabsOriginalTitle` so it can be restored on unmark.
 *
 * Silently ignores tabs that can't be scripted (chrome://, edge://, the
 * Web Store, view-source:, etc.). Requires the "scripting" permission
 * and host_permissions: <all_urls>.
 */
async function markTab(tabId: number, marker: string): Promise<void> {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (m: string) => {
        const w = window as unknown as { __tidyTabsOriginalTitle?: string };
        if (w.__tidyTabsOriginalTitle === undefined) {
          w.__tidyTabsOriginalTitle = document.title;
        }
        document.title = m + w.__tidyTabsOriginalTitle;
      },
      args: [marker],
    });
  } catch {
    // Tab is not scriptable (internal page, no host permission, closed) — ignore
  }
}

async function unmarkTab(tabId: number): Promise<void> {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const w = window as unknown as { __tidyTabsOriginalTitle?: string };
        if (w.__tidyTabsOriginalTitle !== undefined) {
          document.title = w.__tidyTabsOriginalTitle;
          delete w.__tidyTabsOriginalTitle;
        }
      },
    });
  } catch {
    // Ignore — tab may be gone or non-scriptable
  }
}

/**
 * "Find my current tab": briefly activate the nearest neighbor tab and switch
 * back so the browser scrolls the tab strip to bring the active tab into view,
 * expand its tab group if collapsed, and prefix its title with `marker` so it
 * stands out visually. Lives in the service worker so the dance survives the
 * popup closing when we activate the pivot tab.
 */
async function revealActiveTab(
  marker: string
): Promise<{ success: boolean; tabId?: number }> {
  const lastFocused = await chrome.windows.getLastFocused({ populate: false });
  const [activeTab] = await chrome.tabs.query({
    active: true,
    windowId: lastFocused.id,
  });
  if (!activeTab || activeTab.id === undefined) {
    return { success: false };
  }

  if (
    activeTab.groupId !== undefined &&
    activeTab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE
  ) {
    try {
      await chrome.tabGroups.update(activeTab.groupId, { collapsed: false });
    } catch {
      // ignore
    }
  }

  // Pivot dance: activating the already-active tab is a no-op, so the browser
  // doesn't scroll. Briefly activate a neighbor and then switch back.
  const windowTabs = await chrome.tabs.query({ windowId: activeTab.windowId });
  const others = windowTabs.filter(
    (t) => t.id !== undefined && t.id !== activeTab.id
  );
  if (others.length > 0) {
    const idx = activeTab.index ?? 0;
    others.sort(
      (a, b) => Math.abs((a.index ?? 0) - idx) - Math.abs((b.index ?? 0) - idx)
    );
    const pivot = others[0];
    try {
      await chrome.tabs.update(pivot.id!, { active: true });
      await new Promise((r) => setTimeout(r, 120));
      await chrome.tabs.update(activeTab.id, { active: true });
    } catch {
      try {
        await chrome.tabs.update(activeTab.id, { active: true });
      } catch {
        // ignore
      }
    }
  }

  await markTab(activeTab.id, marker);
  // Auto-clear the marker after 5s. Lives in the service worker so it
  // survives the popup closing.
  const tabIdToClear = activeTab.id;
  setTimeout(() => {
    unmarkTab(tabIdToClear).catch(() => {});
  }, 5000);
  return { success: true, tabId: activeTab.id };
}

// Initialize badge on service worker start
updateBadge();

console.log("[TidyTabs] Service worker started");
