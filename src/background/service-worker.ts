import {
  getAllTabs,
  findDuplicates,
  closeDuplicates,
  groupTabsByDomain,
  getTabStats,
} from "../utils/tab-utils";
import { isExcludedUrl } from "../utils/domain-utils";
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

// Track recently created tabs so we don't auto-close duplicates before the
// user has a chance to navigate the new tab to a different URL.
const recentlyCreatedTabs = new Map<number, number>();
const GRACE_PERIOD_MS = 5000;

// Auto-detect duplicates when a new tab is created
chrome.tabs.onCreated.addListener(async (tab) => {
  if (tab.id !== undefined) {
    recentlyCreatedTabs.set(tab.id, Date.now());
  }
  await updateBadge();
});

// Auto-detect duplicates when a tab finishes loading its URL
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    const createdAt = recentlyCreatedTabs.get(tabId);
    if (createdAt && Date.now() - createdAt < GRACE_PERIOD_MS) {
      // Tab was just created/duplicated — skip auto-close to give user time to navigate
      recentlyCreatedTabs.delete(tabId);
      return;
    }
    recentlyCreatedTabs.delete(tabId);
    await handlePotentialDuplicate(tab.url);
  }
});

// Update badge when tabs are removed
chrome.tabs.onRemoved.addListener(async (tabId) => {
  recentlyCreatedTabs.delete(tabId);
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
    }

    return false;
  }
);

// Initialize badge on service worker start
updateBadge();

console.log("[TidyTabs] Service worker started");
