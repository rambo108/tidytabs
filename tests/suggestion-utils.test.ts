import { TabInfo } from "../src/types";
import {
  getStaleTabs,
  getHeavyDomains,
  generateSuggestions,
} from "../src/utils/suggestion-utils";

function makeTab(overrides: Partial<TabInfo> = {}): TabInfo {
  return {
    id: 1,
    url: "https://example.com",
    domain: "example.com",
    title: "Example",
    lastAccessed: Date.now(),
    windowId: 1,
    pinned: false,
    ...overrides,
  };
}

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

describe("getStaleTabs", () => {
  it("returns tabs not accessed in 3+ days", () => {
    const tabs = [
      makeTab({ id: 1, lastAccessed: Date.now() - THREE_DAYS_MS - 1000 }),
      makeTab({ id: 2, lastAccessed: Date.now() }),
    ];
    const stale = getStaleTabs(tabs);
    expect(stale).toHaveLength(1);
    expect(stale[0].id).toBe(1);
  });

  it("excludes pinned tabs", () => {
    const tabs = [
      makeTab({ id: 1, lastAccessed: Date.now() - THREE_DAYS_MS - 1000, pinned: true }),
    ];
    expect(getStaleTabs(tabs)).toHaveLength(0);
  });

  it("excludes internal browser URLs", () => {
    const tabs = [
      makeTab({
        id: 1,
        url: "chrome://settings",
        lastAccessed: Date.now() - THREE_DAYS_MS - 1000,
      }),
    ];
    expect(getStaleTabs(tabs)).toHaveLength(0);
  });

  it("returns empty array when no stale tabs", () => {
    const tabs = [makeTab({ id: 1, lastAccessed: Date.now() })];
    expect(getStaleTabs(tabs)).toHaveLength(0);
  });

  it("excludes tabs with lastAccessed of 0", () => {
    const tabs = [makeTab({ id: 1, lastAccessed: 0 })];
    expect(getStaleTabs(tabs)).toHaveLength(0);
  });
});

describe("getHeavyDomains", () => {
  it("returns domains with 5+ tabs", () => {
    const tabs = Array.from({ length: 6 }, (_, i) =>
      makeTab({ id: i, domain: "github.com", url: `https://github.com/page${i}` })
    );
    const heavy = getHeavyDomains(tabs);
    expect(heavy.size).toBe(1);
    expect(heavy.get("github.com")!.length).toBe(6);
  });

  it("does not return domains with fewer than 5 tabs", () => {
    const tabs = Array.from({ length: 4 }, (_, i) =>
      makeTab({ id: i, domain: "github.com" })
    );
    expect(getHeavyDomains(tabs).size).toBe(0);
  });

  it("handles multiple heavy domains", () => {
    const tabs = [
      ...Array.from({ length: 5 }, (_, i) =>
        makeTab({ id: i, domain: "github.com", url: `https://github.com/${i}` })
      ),
      ...Array.from({ length: 5 }, (_, i) =>
        makeTab({ id: i + 10, domain: "google.com", url: `https://google.com/${i}` })
      ),
    ];
    expect(getHeavyDomains(tabs).size).toBe(2);
  });
});

describe("generateSuggestions", () => {
  it("generates stale tab suggestion", () => {
    const tabs = [
      makeTab({ id: 1, lastAccessed: Date.now() - THREE_DAYS_MS - 1000 }),
      makeTab({ id: 2, lastAccessed: Date.now() }),
    ];
    const suggestions = generateSuggestions(tabs);
    const stale = suggestions.find((s) => s.id === "stale-tabs");
    expect(stale).toBeDefined();
    expect(stale!.tabIds).toEqual([1]);
  });

  it("generates heavy domain suggestion", () => {
    const tabs = Array.from({ length: 6 }, (_, i) =>
      makeTab({ id: i, domain: "github.com", url: `https://github.com/page${i}` })
    );
    const suggestions = generateSuggestions(tabs);
    const heavy = suggestions.find((s) => s.id === "heavy-github.com");
    expect(heavy).toBeDefined();
    expect(heavy!.tabIds).toHaveLength(6);
  });

  it("returns empty when no suggestions apply", () => {
    const tabs = [makeTab({ id: 1, lastAccessed: Date.now() })];
    expect(generateSuggestions(tabs)).toHaveLength(0);
  });
});
