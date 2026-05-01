import { TabInfo, DuplicateGroup } from "../src/types";
import { findDuplicates, fuzzyMatch } from "../src/utils/tab-utils";

// Helper to create a mock TabInfo
function mockTab(overrides: Partial<TabInfo> = {}): TabInfo {
  return {
    id: 1,
    url: "https://example.com/page",
    domain: "example.com",
    title: "Example Page",
    lastAccessed: Date.now(),
    windowId: 1,
    pinned: false,
    active: false,
    groupId: -1,
    ...overrides,
  };
}

describe("fuzzyMatch", () => {
  it("matches exact substring and gives high score", () => {
    const result = fuzzyMatch("GitHub - My Repository", "GitHub");
    expect(result.matched).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(200);
  });

  it("matches case-insensitively", () => {
    const result = fuzzyMatch("GitHub Repository", "github");
    expect(result.matched).toBe(true);
  });

  it("matches fuzzy partial characters in order", () => {
    const result = fuzzyMatch("GitHub", "gith");
    expect(result.matched).toBe(true);
    expect(result.score).toBeGreaterThan(0);
  });

  it("matches scattered characters in order", () => {
    const result = fuzzyMatch("TidyTabs Extension", "ttex");
    expect(result.matched).toBe(true);
  });

  it("does not match when characters are out of order", () => {
    const result = fuzzyMatch("GitHub", "btiG");
    expect(result.matched).toBe(false);
  });

  it("does not match when query has characters not in text", () => {
    const result = fuzzyMatch("GitHub", "githubz");
    expect(result.matched).toBe(false);
  });

  it("returns matched:true with score 0 for empty query", () => {
    const result = fuzzyMatch("anything", "");
    expect(result.matched).toBe(true);
    expect(result.score).toBe(0);
  });

  it("returns matched:false for empty text with non-empty query", () => {
    const result = fuzzyMatch("", "test");
    expect(result.matched).toBe(false);
  });

  it("scores exact substring higher than scattered match", () => {
    const exact = fuzzyMatch("GitHub Repository", "Repo");
    const scattered = fuzzyMatch("Really epic python opus", "Repo");
    expect(exact.score).toBeGreaterThan(scattered.score);
  });

  it("gives word-boundary bonus", () => {
    const boundary = fuzzyMatch("my-repo test", "repo");
    const mid = fuzzyMatch("myrepo test", "repo");
    expect(boundary.score).toBeGreaterThanOrEqual(mid.score);
  });

  it("tracks matched indices correctly for exact substring", () => {
    const result = fuzzyMatch("Hello World", "World");
    expect(result.matched).toBe(true);
    expect(result.matchedIndices).toEqual([6, 7, 8, 9, 10]);
  });
});

describe("findDuplicates", () => {
  it("returns empty array when no duplicates exist", () => {
    const tabs: TabInfo[] = [
      mockTab({ id: 1, url: "https://example.com/page1" }),
      mockTab({ id: 2, url: "https://example.com/page2" }),
      mockTab({ id: 3, url: "https://other.com/" }),
    ];
    expect(findDuplicates(tabs)).toEqual([]);
  });

  it("detects exact URL duplicates", () => {
    const tabs: TabInfo[] = [
      mockTab({ id: 1, url: "https://example.com/page", lastAccessed: 100 }),
      mockTab({ id: 2, url: "https://example.com/page", lastAccessed: 200 }),
      mockTab({ id: 3, url: "https://example.com/page", lastAccessed: 150 }),
    ];
    const groups = findDuplicates(tabs);
    expect(groups).toHaveLength(1);
    expect(groups[0].tabs).toHaveLength(3);
  });

  it("keeps the most recently accessed tab", () => {
    const tabs: TabInfo[] = [
      mockTab({ id: 1, url: "https://example.com/page", lastAccessed: 100 }),
      mockTab({ id: 2, url: "https://example.com/page", lastAccessed: 300 }),
      mockTab({ id: 3, url: "https://example.com/page", lastAccessed: 200 }),
    ];
    const groups = findDuplicates(tabs);
    expect(groups[0].tabToKeep.id).toBe(2); // most recently accessed
    expect(groups[0].tabIdsToClose).toContain(1);
    expect(groups[0].tabIdsToClose).toContain(3);
    expect(groups[0].tabIdsToClose).not.toContain(2);
  });

  it("does NOT treat different query params as duplicates", () => {
    const tabs: TabInfo[] = [
      mockTab({ id: 1, url: "https://example.com/page?a=1" }),
      mockTab({ id: 2, url: "https://example.com/page?a=2" }),
    ];
    expect(findDuplicates(tabs)).toEqual([]);
  });

  it("does NOT treat different protocols as duplicates", () => {
    const tabs: TabInfo[] = [
      mockTab({ id: 1, url: "http://example.com/page", domain: "example.com" }),
      mockTab({ id: 2, url: "https://example.com/page", domain: "example.com" }),
    ];
    expect(findDuplicates(tabs)).toEqual([]);
  });

  it("excludes pinned tabs from duplicate detection", () => {
    const tabs: TabInfo[] = [
      mockTab({ id: 1, url: "https://example.com/page", pinned: true, lastAccessed: 100 }),
      mockTab({ id: 2, url: "https://example.com/page", pinned: false, lastAccessed: 200 }),
      mockTab({ id: 3, url: "https://example.com/page", pinned: false, lastAccessed: 150 }),
    ];
    const groups = findDuplicates(tabs);
    // Only 2 non-pinned tabs with same URL -> 1 group
    expect(groups).toHaveLength(1);
    expect(groups[0].tabs).toHaveLength(2);
    // Pinned tab should not be in the group
    expect(groups[0].tabs.find((t) => t.id === 1)).toBeUndefined();
  });

  it("excludes chrome:// URLs", () => {
    const tabs: TabInfo[] = [
      mockTab({ id: 1, url: "chrome://newtab", domain: "" }),
      mockTab({ id: 2, url: "chrome://newtab", domain: "" }),
    ];
    expect(findDuplicates(tabs)).toEqual([]);
  });

  it("handles multiple duplicate groups", () => {
    const tabs: TabInfo[] = [
      mockTab({ id: 1, url: "https://a.com/", domain: "a.com", lastAccessed: 100 }),
      mockTab({ id: 2, url: "https://a.com/", domain: "a.com", lastAccessed: 200 }),
      mockTab({ id: 3, url: "https://b.com/", domain: "b.com", lastAccessed: 100 }),
      mockTab({ id: 4, url: "https://b.com/", domain: "b.com", lastAccessed: 200 }),
    ];
    const groups = findDuplicates(tabs);
    expect(groups).toHaveLength(2);
  });

  it("handles tabs across different windows", () => {
    const tabs: TabInfo[] = [
      mockTab({ id: 1, url: "https://example.com/page", windowId: 1, lastAccessed: 100 }),
      mockTab({ id: 2, url: "https://example.com/page", windowId: 2, lastAccessed: 200 }),
    ];
    const groups = findDuplicates(tabs);
    expect(groups).toHaveLength(1);
    expect(groups[0].tabToKeep.id).toBe(2);
  });

  it("handles empty tab list", () => {
    expect(findDuplicates([])).toEqual([]);
  });

  it("handles single tab", () => {
    const tabs: TabInfo[] = [mockTab({ id: 1 })];
    expect(findDuplicates(tabs)).toEqual([]);
  });
});
