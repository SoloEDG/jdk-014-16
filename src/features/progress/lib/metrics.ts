import type { ComicDocument, ReadingLocation } from "../../../shared/document";
import { locateView } from "../../reader/lib/navigation";

export interface ReadingMetrics {
  /** Percentage of the book's pages consumed, following reading order. */
  percent: number;
  /** 1-based index of the first page in the current view. */
  pageIndex: number;
  /** Last page in the current view, in the same numbering. */
  pageEnd: number;
  pageCount: number;
  total: number;
  panels: number;
  /** Whether this view shows two facing pages. */
  paired: boolean;
  /** Display label such as `03` or `03–04`. */
  pageLabel: string;
}

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * Progress is measured over real pages, in the shared reading order.
 *
 * A two-page view counts each of its pages exactly once, and a wide spread
 * artwork counts as the single page it is, so flipping its halves on a narrow
 * screen never inflates the total.
 */
export function readingMetrics(
  doc: ComicDocument,
  at: ReadingLocation,
  narrow = false,
): ReadingMetrics {
  const ordered = doc.chapters.flatMap((chapter) => chapter.pages),
    found = locateView(doc, at.pageId);

  if (!found) {
    return {
      percent: 0,
      pageIndex: 0,
      pageEnd: 0,
      pageCount: 0,
      total: ordered.length,
      panels: 0,
      paired: false,
      pageLabel: "00",
    };
  }

  const { chapter, view, page } = found,
    pages = chapter.pages,
    startIndex = pages.findIndex((item) => item.id === view.pages[0]!.id),
    endIndex = pages.findIndex(
      (item) => item.id === view.pages[view.pages.length - 1]!.id,
    ),
    // On a narrow screen only one page of a pair is on screen, so that page
    // is as far as the reader has actually read. A wide spread artwork is a
    // single page whichever half is showing, so flipping never recounts it.
    furthest = narrow ? page : view.pages[view.pages.length - 1]!,
    consumed = ordered.findIndex((item) => item.id === furthest.id) + 1,
    shownIndex = narrow ? pages.findIndex((item) => item.id === page.id) : startIndex,
    shownEnd = narrow
      ? shownIndex
      : endIndex;

  return {
    percent: Math.round((consumed / Math.max(1, ordered.length)) * 100),
    pageIndex: shownIndex + 1,
    pageEnd: shownEnd + 1,
    pageCount: pages.length,
    total: ordered.length,
    panels: page.panels.length,
    paired: view.pages.length === 2 && !narrow,
    pageLabel:
      shownIndex === shownEnd
        ? pad(shownIndex + 1)
        : `${pad(shownIndex + 1)}–${pad(shownEnd + 1)}`,
  };
}
