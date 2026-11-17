import type {
  Chapter,
  ComicPage,
  PageHalf,
  Panel,
  ReadingDirection,
} from "../../../shared/document";

/**
 * How a chapter lays pages out in page mode. `single` is the legacy default:
 * one page at a time. `pair` shows two facing pages together when possible.
 */
export type ChapterLayout = "single" | "pair";

/**
 * One screen of the reading sequence: either a single page, a single artwork
 * that physically spans two pages, or two facing pages. `pages` is always in
 * reading order, regardless of how the pages are laid out on screen.
 */
export interface ReadingView {
  chapterId: string;
  direction: ReadingDirection;
  pages: ComicPage[];
}

/** Documents saved before direction support existed are left-to-right. */
export function directionOf(chapter: Chapter | undefined): ReadingDirection {
  return chapter?.direction === "rtl" ? "rtl" : "ltr";
}

/** Documents saved before pairing support existed stay single-page. */
export function layoutOf(chapter: Chapter | undefined): ChapterLayout {
  return chapter?.layout === "pair" ? "pair" : "single";
}

export function isPaired(view: ReadingView): boolean {
  return view.pages.length === 2;
}

/** A single image whose artwork is printed across two physical pages. */
export function isWideArtwork(view: ReadingView): boolean {
  return view.pages.length === 1 && view.pages[0]?.spread === true;
}

/** A page the author marked as a spread artwork or a standalone cover. */
export function isStandalone(page: ComicPage): boolean {
  return page.spread === true || page.cover === true;
}

/**
 * Build the chapter's views in reading order.
 *
 * In `pair` chapters ordinary single pages are paired two at a time. A page
 * the author marked as a spread artwork or a standalone cover never shares a
 * view with a neighbour. A leftover final page therefore stays a view of its
 * own: it is neither dropped nor padded with a blank page, so the total page
 * count is never inflated.
 */
export function buildChapterViews(chapter: Chapter): ReadingView[] {
  const direction = directionOf(chapter);
  if (layoutOf(chapter) === "single")
    return chapter.pages.map((page) => ({
      chapterId: chapter.id,
      direction,
      pages: [page],
    }));
  const views: ReadingView[] = [],
    run: ComicPage[] = [];
  const flush = () => {
    for (let i = 0; i < run.length; i += 2)
      views.push({
        chapterId: chapter.id,
        direction,
        pages: run.slice(i, i + 2),
      });
    run.length = 0;
  };
  for (const page of chapter.pages) {
    if (isStandalone(page)) {
      flush();
      views.push({ chapterId: chapter.id, direction, pages: [page] });
    } else run.push(page);
  }
  flush();
  return views;
}

/** Physical halves in the order they are read. */
export function halfOrder(direction: ReadingDirection): PageHalf[] {
  return direction === "rtl" ? ["right", "left"] : ["left", "right"];
}

/** Which physical half a page occupies in a view, if any. */
export function defaultHalf(
  view: ReadingView,
  page: ComicPage,
): PageHalf | undefined {
  if (isWideArtwork(view)) return halfOrder(view.direction)[0];
  if (!isPaired(view)) return undefined;
  const index = view.pages.indexOf(page);
  if (index < 0) return undefined;
  if (view.direction === "rtl") return index === 0 ? "right" : "left";
  return index === 0 ? "left" : "right";
}

/** Which physical half of the artwork contains the panel's centre. */
export function halfForPanel(page: ComicPage, panel: Panel): PageHalf {
  const centre = panel.rect.x + panel.rect.width / 2;
  return centre > page.width / 2 ? "right" : "left";
}

export function isHalf(value: unknown): value is PageHalf {
  return value === "left" || value === "right";
}

function verticallyOverlaps(a: Panel, b: Panel): boolean {
  const top = Math.max(a.rect.y, b.rect.y),
    bottom = Math.min(a.rect.y + a.rect.height, b.rect.y + b.rect.height);
  return bottom - top > Math.min(a.rect.height, b.rect.height) / 2;
}

/**
 * Panels in the order the author intends them to be read: rows top to bottom,
 * and right-to-left inside a row for right-opening chapters.
 */
export function orderedPanels(
  page: ComicPage,
  direction: ReadingDirection,
): Panel[] {
  const rows: Panel[][] = [];
  for (const panel of [...page.panels].sort((a, b) => a.rect.y - b.rect.y)) {
    const row = rows[rows.length - 1];
    if (row && verticallyOverlaps(row[0]!, panel)) row.push(panel);
    else rows.push([panel]);
  }
  return rows.flatMap((row) =>
    row.sort((a, b) =>
      direction === "rtl" ? b.rect.x - a.rect.x : a.rect.x - b.rect.x,
    ),
  );
}

export function firstPanelOnHalf(
  page: ComicPage,
  direction: ReadingDirection,
  half: PageHalf,
): Panel | undefined {
  const panels = orderedPanels(page, direction);
  return (
    panels.find((panel) => halfForPanel(page, panel) === half) ?? panels[0]
  );
}
