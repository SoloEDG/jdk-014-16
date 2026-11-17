import type {
  ComicDocument,
  ComicPage,
  ReadingLocation,
} from "../../../shared/document";
import { locateView } from "../../reader/lib/navigation";

export interface PageRailItem {
  index: number;
  pageId: string;
  title: string;
  badge?: "spread" | "cover" | "paired";
  /** Pages sharing the current view are all marked, not just the current one. */
  active: boolean;
  current: boolean;
}

/**
 * Pages of the current chapter in reading order, marked with the view they
 * belong to. Derived from the same view builder as navigation, so the rail
 * never shows a page that pairing removed — the last odd page stays listed
 * and counted exactly once.
 */
export function pageRail(
  doc: ComicDocument,
  at: ReadingLocation,
): { chapterId: string; pages: PageRailItem[] } {
  const found = locateView(doc, at.pageId),
    chapter = found?.chapter ?? doc.chapters[0];
  if (!chapter) return { chapterId: "", pages: [] };
  const view = found?.view,
    shared = new Set(view?.pages.map((page) => page.id) ?? []),
    paired = view?.pages.length === 2;
  return {
    chapterId: chapter.id,
    pages: chapter.pages.map((page: ComicPage, index: number) => ({
      index: index + 1,
      pageId: page.id,
      title: page.title,
      badge: page.spread
        ? "spread"
        : page.cover
          ? "cover"
          : paired && shared.has(page.id)
            ? "paired"
            : undefined,
      active: shared.has(page.id),
      current: page.id === at.pageId,
    })),
  };
}

