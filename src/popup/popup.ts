import "../popup/popup.css";
import { ExtensionMessage, TabStats, OrganizeResult, SearchResult, Suggestion, BookmarkResult } from "../types";

// --- DOM Elements ---

const totalTabsEl = document.getElementById("totalTabs")!;
const duplicateCountEl = document.getElementById("duplicateCount")!;
const uniqueDomainsEl = document.getElementById("uniqueDomains")!;
const staleCountEl = document.getElementById("staleCount")!;
const staleItemEl = document.getElementById("staleItem")!;
const btnCloseDuplicates = document.getElementById("btnCloseDuplicates") as HTMLButtonElement;
const btnOrganize = document.getElementById("btnOrganize") as HTMLButtonElement;
const statusMessageEl = document.getElementById("statusMessage")!;
const searchInput = document.getElementById("searchInput") as HTMLInputElement;
const searchResultsEl = document.getElementById("searchResults")!;
const suggestionsEl = document.getElementById("suggestions")!;

// --- Helpers ---

function showStatus(message: string, type: "success" | "info" = "success"): void {
  statusMessageEl.textContent = message;
  statusMessageEl.className = `status ${type}`;
  setTimeout(() => {
    statusMessageEl.className = "status hidden";
  }, 3000);
}

function setLoading(loading: boolean): void {
  btnCloseDuplicates.disabled = loading;
  btnOrganize.disabled = loading;
}

async function sendMessage(message: ExtensionMessage): Promise<unknown> {
  return chrome.runtime.sendMessage(message);
}

// --- Stats ---

async function refreshStats(): Promise<void> {
  try {
    const response = (await sendMessage({ type: "GET_STATS" })) as {
      type: string;
      data: TabStats;
    };
    const stats = response.data;
    totalTabsEl.textContent = stats.totalTabs.toString();
    duplicateCountEl.textContent = stats.duplicateCount.toString();
    uniqueDomainsEl.textContent = stats.uniqueDomains.toString();
    staleCountEl.textContent = stats.staleCount.toString();

    duplicateCountEl.parentElement!.classList.toggle(
      "has-duplicates",
      stats.duplicateCount > 0
    );
    staleItemEl.classList.toggle("has-stale", stats.staleCount > 0);
  } catch (err) {
    console.error("Failed to get stats:", err);
  }
}

// --- Tab Search ---

let searchDebounce: ReturnType<typeof setTimeout> | null = null;

searchInput.addEventListener("input", () => {
  if (searchDebounce) clearTimeout(searchDebounce);
  searchDebounce = setTimeout(async () => {
    const query = searchInput.value.trim();
    if (!query) {
      searchResultsEl.className = "search-results hidden";
      searchResultsEl.textContent = "";
      return;
    }

    // Search tabs and bookmarks in parallel
    const [tabResponse, bookmarkResponse] = await Promise.all([
      sendMessage({ type: "SEARCH_TABS", query }) as Promise<{
        type: string;
        data: SearchResult[];
      }>,
      sendMessage({ type: "SEARCH_BOOKMARKS", query }) as Promise<{
        type: string;
        data: BookmarkResult[];
      }>,
    ]);

    const tabResults = tabResponse.data;
    const bookmarkResults = bookmarkResponse.data;

    searchResultsEl.textContent = "";

    if (tabResults.length === 0 && bookmarkResults.length === 0) {
      searchResultsEl.className = "search-results hidden";
      return;
    }

    // Render tab results
    if (tabResults.length > 0) {
      const header = document.createElement("div");
      header.className = "search-section-header";
      header.textContent = "Open Tabs";
      searchResultsEl.appendChild(header);

      for (const result of tabResults) {
        const item = document.createElement("div");
        item.className = "search-result-item";

        const title = document.createElement("span");
        title.className = "search-result-title";
        title.textContent = result.title || result.url;

        const domain = document.createElement("span");
        domain.className = "search-result-domain";
        domain.textContent = result.domain;

        item.appendChild(title);
        item.appendChild(domain);
        item.addEventListener("click", async () => {
          await sendMessage({
            type: "SWITCH_TO_TAB",
            tabId: result.id,
            windowId: result.windowId,
          });
        });
        searchResultsEl.appendChild(item);
      }
    }

    // Render bookmark results
    if (bookmarkResults.length > 0) {
      const header = document.createElement("div");
      header.className = "search-section-header";
      header.textContent = "Bookmarks";
      searchResultsEl.appendChild(header);

      for (const bm of bookmarkResults) {
        const item = document.createElement("div");
        item.className = "search-result-item bookmark-item";

        const info = document.createElement("div");
        info.className = "bookmark-info";

        const title = document.createElement("span");
        title.className = "search-result-title";
        title.textContent = bm.title || bm.url;

        const path = document.createElement("span");
        path.className = "bookmark-path";
        path.textContent = bm.folderPath;

        info.appendChild(title);
        if (bm.folderPath) {
          info.appendChild(path);
        }

        const domain = document.createElement("span");
        domain.className = "search-result-domain";
        domain.textContent = bm.domain;

        item.appendChild(info);
        item.appendChild(domain);
        item.addEventListener("click", async () => {
          await chrome.tabs.create({ url: bm.url });
        });
        searchResultsEl.appendChild(item);
      }
    }

    searchResultsEl.className = "search-results";
  }, 200);
});

// --- Smart Suggestions ---

async function refreshSuggestions(): Promise<void> {
  try {
    const response = (await sendMessage({ type: "GET_SUGGESTIONS" })) as {
      type: string;
      data: Suggestion[];
    };
    const suggestions = response.data;

    suggestionsEl.textContent = "";
    if (suggestions.length === 0) {
      suggestionsEl.className = "suggestions hidden";
      return;
    }

    for (const suggestion of suggestions) {
      const item = document.createElement("div");
      item.className = "suggestion-item";

      const msg = document.createElement("span");
      msg.className = "suggestion-message";
      msg.textContent = suggestion.message;

      item.appendChild(msg);

      if (suggestion.id === "stale-tabs") {
        const btn = document.createElement("button");
        btn.className = "suggestion-action";
        btn.textContent = suggestion.actionLabel;
        btn.addEventListener("click", async () => {
          await sendMessage({ type: "CLOSE_STALE_TABS" });
          showStatus(`✓ Closed ${suggestion.tabIds.length} stale tab${suggestion.tabIds.length > 1 ? "s" : ""}`);
          await refreshStats();
          await refreshSuggestions();
        });
        item.appendChild(btn);
      }

      suggestionsEl.appendChild(item);
    }
    suggestionsEl.className = "suggestions";
  } catch (err) {
    console.error("Failed to get suggestions:", err);
  }
}

// --- Button Handlers ---

btnCloseDuplicates.addEventListener("click", async () => {
  setLoading(true);
  try {
    const response = (await sendMessage({ type: "CLOSE_DUPLICATES" })) as {
      type: string;
      data: Partial<OrganizeResult>;
    };
    const closed = response.data.duplicatesClosed ?? 0;
    showStatus(
      closed > 0
        ? `✓ Closed ${closed} duplicate tab${closed > 1 ? "s" : ""}`
        : "No duplicates found"
    );
    await refreshStats();
    await refreshSuggestions();
  } catch (err) {
    showStatus("Error closing duplicates", "info");
    console.error(err);
  } finally {
    setLoading(false);
  }
});

btnOrganize.addEventListener("click", async () => {
  setLoading(true);
  try {
    const response = (await sendMessage({ type: "ORGANIZE_TABS" })) as {
      type: string;
      data: OrganizeResult;
    };
    const { duplicatesClosed, groupsCreated } = response.data;
    const parts: string[] = [];
    if (duplicatesClosed > 0)
      parts.push(`closed ${duplicatesClosed} duplicate${duplicatesClosed > 1 ? "s" : ""}`);
    if (groupsCreated > 0)
      parts.push(`created ${groupsCreated} group${groupsCreated > 1 ? "s" : ""}`);
    showStatus(
      parts.length > 0 ? `✓ ${parts.join(", ")}` : "Tabs already organized"
    );
    await refreshStats();
    await refreshSuggestions();
  } catch (err) {
    showStatus("Error organizing tabs", "info");
    console.error(err);
  } finally {
    setLoading(false);
  }
});

// --- Init ---
refreshStats();
refreshSuggestions();
