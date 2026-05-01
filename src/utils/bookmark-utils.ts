import { BookmarkResult } from "../types";
import { extractDomain } from "./domain-utils";
import { fuzzyMatch } from "./tab-utils";

/**
 * Resolve the full folder path for a bookmark by walking up the parent chain.
 * Returns a string like "Bookmarks Bar › Dev › Tools".
 */
export async function resolveFolderPath(parentId: string): Promise<string> {
  const parts: string[] = [];
  let currentId = parentId;

  while (currentId && currentId !== "0") {
    try {
      const nodes = await chrome.bookmarks.get(currentId);
      if (nodes.length === 0) break;
      const node = nodes[0];
      if (node.title) {
        parts.unshift(node.title);
      }
      currentId = node.parentId ?? "";
    } catch {
      break;
    }
  }

  return parts.join(" › ");
}

/**
 * Search bookmarks by title or URL using fuzzy matching.
 * Returns flat results regardless of folder nesting, ranked by match quality.
 */
export async function searchBookmarks(query: string): Promise<BookmarkResult[]> {
  if (!query.trim()) return [];

  const trimmed = query.trim();

  // Use Chrome's built-in bookmark search for initial filtering
  const rawResults = await chrome.bookmarks.search(trimmed);

  // Filter to only actual bookmarks (not folders) that have URLs
  const bookmarks = rawResults.filter((node) => node.url);

  // Apply fuzzy matching for scoring and re-ranking
  const scored: {
    node: chrome.bookmarks.BookmarkTreeNode;
    score: number;
    titleMatchIndices: number[];
    urlMatchIndices: number[];
  }[] = [];

  for (const node of bookmarks) {
    const titleMatch = fuzzyMatch(node.title || "", trimmed);
    const urlMatch = fuzzyMatch(node.url || "", trimmed);

    if (!titleMatch.matched && !urlMatch.matched) continue;

    const titleScore = titleMatch.matched ? titleMatch.score * 2 : 0;
    const urlScore = urlMatch.matched ? urlMatch.score : 0;
    scored.push({
      node,
      score: Math.max(titleScore, urlScore),
      titleMatchIndices: titleMatch.matched ? titleMatch.matchedIndices : [],
      urlMatchIndices: urlMatch.matched ? urlMatch.matchedIndices : [],
    });
  }

  // Sort by score descending, limit to top 10
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 10);

  // Resolve folder paths in parallel
  const results = await Promise.all(
    top.map(async ({ node, titleMatchIndices, urlMatchIndices }) => ({
      id: node.id,
      title: node.title || node.url || "",
      url: node.url!,
      domain: extractDomain(node.url!),
      folderPath: await resolveFolderPath(node.parentId ?? ""),
      titleMatchIndices,
      urlMatchIndices,
    }))
  );

  return results;
}
