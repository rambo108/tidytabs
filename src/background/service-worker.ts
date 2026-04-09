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
    }

    return false;
  }
);

// Initialize badge on service worker start
updateBadge();

console.log("[TidyTabs] Service worker started");
