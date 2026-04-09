import "../popup/popup.css";
import { ExtensionMessage, TabStats, OrganizeResult } from "../types";

// --- DOM Elements ---

const totalTabsEl = document.getElementById("totalTabs")!;
const duplicateCountEl = document.getElementById("duplicateCount")!;
const uniqueDomainsEl = document.getElementById("uniqueDomains")!;
const btnCloseDuplicates = document.getElementById("btnCloseDuplicates") as HTMLButtonElement;
const btnOrganize = document.getElementById("btnOrganize") as HTMLButtonElement;
const statusMessageEl = document.getElementById("statusMessage")!;

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

    // Highlight duplicates if any
    duplicateCountEl.parentElement!.classList.toggle(
      "has-duplicates",
      stats.duplicateCount > 0
    );
  } catch (err) {
    console.error("Failed to get stats:", err);
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
  } catch (err) {
    showStatus("Error organizing tabs", "info");
    console.error(err);
  } finally {
    setLoading(false);
  }
});

// --- Init ---
refreshStats();
