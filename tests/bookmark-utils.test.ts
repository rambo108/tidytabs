/**
 * Tests for bookmark-utils.
 *
 * Since chrome.bookmarks is only available in the extension runtime,
 * we mock it for unit testing. The fuzzyMatch function (used internally)
 * is already covered by tab-utils.test.ts.
 */

import { resolveFolderPath, searchBookmarks } from "../src/utils/bookmark-utils";

// --- Mock chrome.bookmarks API ---

const mockGet = jest.fn();
const mockSearch = jest.fn();

(global as any).chrome = {
  bookmarks: {
    get: mockGet,
    search: mockSearch,
  },
};

beforeEach(() => {
  mockGet.mockReset();
  mockSearch.mockReset();
});

describe("resolveFolderPath", () => {
  it("builds a path from nested folders", async () => {
    mockGet
      .mockResolvedValueOnce([{ id: "3", title: "Tools", parentId: "2" }])
      .mockResolvedValueOnce([{ id: "2", title: "Dev", parentId: "1" }])
      .mockResolvedValueOnce([{ id: "1", title: "Bookmarks Bar", parentId: "0" }]);

    const path = await resolveFolderPath("3");
    expect(path).toBe("Bookmarks Bar › Dev › Tools");
  });

  it("returns empty string for root node", async () => {
    const path = await resolveFolderPath("0");
    expect(path).toBe("");
  });

  it("handles single folder level", async () => {
    mockGet.mockResolvedValueOnce([{ id: "1", title: "Bookmarks Bar", parentId: "0" }]);

    const path = await resolveFolderPath("1");
    expect(path).toBe("Bookmarks Bar");
  });

  it("handles API errors gracefully", async () => {
    mockGet.mockRejectedValueOnce(new Error("not found"));

    const path = await resolveFolderPath("999");
    expect(path).toBe("");
  });
});

describe("searchBookmarks", () => {
  it("returns empty array for empty query", async () => {
    const results = await searchBookmarks("");
    expect(results).toEqual([]);
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it("returns matching bookmarks with folder paths", async () => {
    mockSearch.mockResolvedValue([
      { id: "10", title: "GitHub - My Repo", url: "https://github.com/my/repo", parentId: "2" },
    ]);
    mockGet
      .mockResolvedValueOnce([{ id: "2", title: "Dev", parentId: "1" }])
      .mockResolvedValueOnce([{ id: "1", title: "Bookmarks Bar", parentId: "0" }]);

    const results = await searchBookmarks("GitHub");
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("GitHub - My Repo");
    expect(results[0].url).toBe("https://github.com/my/repo");
    expect(results[0].domain).toBe("github.com");
    expect(results[0].folderPath).toBe("Bookmarks Bar › Dev");
  });

  it("filters out folder nodes (no url)", async () => {
    mockSearch.mockResolvedValue([
      { id: "5", title: "Dev Folder" },
      { id: "10", title: "GitHub", url: "https://github.com", parentId: "1" },
    ]);
    mockGet.mockResolvedValueOnce([{ id: "1", title: "Bookmarks Bar", parentId: "0" }]);

    const results = await searchBookmarks("Dev");
    // Only the bookmark with a URL should appear
    expect(results.every((r) => r.url)).toBe(true);
  });

  it("limits results to 10", async () => {
    const manyBookmarks = Array.from({ length: 20 }, (_, i) => ({
      id: String(i),
      title: `Bookmark ${i}`,
      url: `https://example${i}.com`,
      parentId: "1",
    }));
    mockSearch.mockResolvedValue(manyBookmarks);
    mockGet.mockResolvedValue([{ id: "1", title: "Bookmarks Bar", parentId: "0" }]);

    const results = await searchBookmarks("Bookmark");
    expect(results.length).toBeLessThanOrEqual(10);
  });

  it("ranks exact title matches higher than partial URL matches", async () => {
    mockSearch.mockResolvedValue([
      { id: "1", title: "test page", url: "https://other.com/page", parentId: "1" },
      { id: "2", title: "My other page", url: "https://test.com/something", parentId: "1" },
    ]);
    mockGet.mockResolvedValue([{ id: "1", title: "Bookmarks", parentId: "0" }]);

    const results = await searchBookmarks("test");
    // The one with "test" in the title should rank first (title score is doubled)
    expect(results[0].title).toBe("test page");
  });
});
