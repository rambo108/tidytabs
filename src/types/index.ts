/** Core tab information */
export interface TabInfo {
  id: number;
  url: string;
  domain: string;
  title: string;
  lastAccessed: number;
  windowId: number;
  pinned: boolean;
}

/** A group of tabs sharing the same URL (duplicates) */
export interface DuplicateGroup {
  url: string;
  tabs: TabInfo[];
  /** The tab that should be kept (most recently accessed) */
  tabToKeep: TabInfo;
  /** Tab IDs to close */
  tabIdsToClose: number[];
}

/** Result of an organize operation */
export interface OrganizeResult {
  duplicatesClosed: number;
  groupsCreated: number;
  totalTabs: number;
  domains: string[];
}

/** Tab statistics for the popup */
export interface TabStats {
  totalTabs: number;
  duplicateCount: number;
  uniqueDomains: number;
  staleCount: number;
}

/** A search result for the tab search feature */
export interface SearchResult {
  id: number;
  title: string;
  url: string;
  domain: string;
  windowId: number;
}

/** A smart suggestion for the user */
export interface Suggestion {
  id: string;
  message: string;
  actionLabel: string;
  tabIds: number[];
}

// --- Message types for popup ↔ service-worker communication ---

export type MessageType =
  | "GET_STATS"
  | "CLOSE_DUPLICATES"
  | "ORGANIZE_TABS"
  | "SEARCH_TABS"
  | "SWITCH_TO_TAB"
  | "GET_SUGGESTIONS"
  | "CLOSE_STALE_TABS"
  | "STATS_RESULT"
  | "ORGANIZE_RESULT";

export interface GetStatsMessage {
  type: "GET_STATS";
}

export interface CloseDuplicatesMessage {
  type: "CLOSE_DUPLICATES";
}

export interface OrganizeTabsMessage {
  type: "ORGANIZE_TABS";
}

export interface SearchTabsMessage {
  type: "SEARCH_TABS";
  query: string;
}

export interface SwitchToTabMessage {
  type: "SWITCH_TO_TAB";
  tabId: number;
  windowId: number;
}

export interface GetSuggestionsMessage {
  type: "GET_SUGGESTIONS";
}

export interface CloseStaleTabsMessage {
  type: "CLOSE_STALE_TABS";
}

export interface StatsResultMessage {
  type: "STATS_RESULT";
  data: TabStats;
}

export interface OrganizeResultMessage {
  type: "ORGANIZE_RESULT";
  data: OrganizeResult;
}

export type ExtensionMessage =
  | GetStatsMessage
  | CloseDuplicatesMessage
  | OrganizeTabsMessage
  | SearchTabsMessage
  | SwitchToTabMessage
  | GetSuggestionsMessage
  | CloseStaleTabsMessage
  | StatsResultMessage
  | OrganizeResultMessage;
