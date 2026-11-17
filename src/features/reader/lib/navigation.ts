import type {
  Chapter,
  ComicDocument,
  ComicPage,
  PageHalf,
  Panel,
  ReadingDirection,
  ReadingLocation,
  ReadingMode,
} from "../../../shared/document";
import {
  buildChapterViews,
  defaultHalf,
  directionOf,
  firstPanelOnHalf,
  halfForPanel,
  halfOrder,
  isHalf,
  isWideArtwork,
  orderedPanels,
  type ReadingView,
} from "./sequence";

/** One navigable position in the single reading sequence. */
export interface ReadingStep {
  chapterId: string;
  pageId: string;
  panelId: string;
  /** Every page visible at this step, in reading order. */
  pageIds: string[];
  /** Half to show on a narrow screen when the artwork spans two pages. */
  half?: PageHalf;
  direction: ReadingDirection;
  /** Index of the view inside its chapter. */
  viewIndex: number;
}

export interface SequenceOptions {
  /**
   * On a narrow screen a two-page view is shown one page (or one half of a
   * wide artwork) at a time, so page mode must step through it in those
   * smaller increments instead of skipping to the next view.
   */
  narrow?: boolean;
}

/**
 * Flatten the document into the one reading sequence shared by paging,
 * keyboard input, the panel strip, sound cues, bookmarks and progress.
 *
 * Page mode has one step per view (or per page/half on a narrow screen);
 * panel mode has one step per panel in reading order. Both arrows index the
 * same list, so moving back is the exact inverse of moving forward.
 */
export function readingSequence(
  doc: ComicDocument,
  mode: ReadingMode,
  options: SequenceOptions = {},
): ReadingStep[] {
  const steps: ReadingStep[] = [];
  for (const chapter of doc.chapters) {
    const direction = directionOf(chapter);
    buildChapterViews(chapter).forEach((view, viewIndex) => {
      const base = {
        chapterId: chapter.id,
        pageIds: view.pages.map((page) => page.id),
        direction,
        viewIndex,
      };
      if (mode === "panel") {
        for (const page of view.pages)
          for (const panel of orderedPanels(page, direction))
            steps.push({
              ...base,
              pageId: page.id,
              panelId: panel.id,
              pageIds: [page.id],
              // Only a wide artwork needs a half; a facing pair identifies
              // its position by page id.
              half: isWideArtwork(view)
                ? halfForPanel(page, panel)
                : undefined,
            });
        return;
      }
      if (options.narrow) {
        for (const page of view.pages) {
          if (page.spread) {
            for (const half of halfOrder(direction))
              steps.push({
                ...base,
                pageId: page.id,
                panelId: firstPanelOnHalf(page, direction, half)?.id ?? "",
                pageIds: [page.id],
                half,
              });
          } else
            steps.push({
              ...base,
              pageId: page.id,
              panelId: orderedPanels(page, direction)[0]?.id ?? "",
              pageIds: [page.id],
            });
        }
        return;
      }
      const page = view.pages[0];
      if (!page) return;
      steps.push({
        ...base,
        pageId: page.id,
        panelId: orderedPanels(page, direction)[0]?.id ?? "",
        half: isWideArtwork(view) ? defaultHalf(view, page) : undefined,
      });
    });
  }
  return steps;
}

/** The view containing a page, together with its chapter and page. */
export function locateView(
  doc: ComicDocument,
  pageId: string,
):
  | {
      chapter: Chapter;
      view: ReadingView;
      page: ComicPage;
      index: number;
      pageIndex: number;
    }
  | undefined {
  for (const chapter of doc.chapters) {
    const views = buildChapterViews(chapter);
    const index = views.findIndex((view) =>
      view.pages.some((page) => page.id === pageId),
    );
    if (index < 0) continue;
    const view = views[index]!,
      page = view.pages.find((page) => page.id === pageId) ?? view.pages[0];
    if (!page) return undefined;
    return {
      chapter,
      view,
      page,
      index,
      pageIndex: chapter.pages.indexOf(page),
    };
  }
  return undefined;
}

export interface ResolvedReading {
  chapter: Chapter | undefined;
  view: ReadingView | undefined;
  page: ComicPage | undefined;
  panel: Panel | undefined;
  direction: ReadingDirection;
  viewIndex: number;
  pageIndex: number;
}

function fallbackLocation(doc: ComicDocument): ReadingLocation {
  const chapter = doc.chapters[0],
    page = chapter?.pages[0];
  return {
    chapterId: chapter?.id ?? "",
    pageId: page?.id ?? "",
    panelId: page?.panels[0]?.id ?? "",
    zoom: 1,
    x: 0,
    y: 0,
  };
}

/** Resolve a location into the view, page and panel the reader should show. */
export function resolveReading(
  doc: ComicDocument,
  at: ReadingLocation,
): ResolvedReading {
  const found = locateView(doc, at.pageId),
    chapter =
      found?.chapter ??
      doc.chapters.find((chapter) => chapter.id === at.chapterId) ??
      doc.chapters[0],
    page = found?.page ?? chapter?.pages[0],
    view =
      found?.view ??
      (chapter
        ? buildChapterViews(chapter).find((view) =>
            view.pages.some((item) => item.id === page?.id),
          )
        : undefined),
    direction = view?.direction ?? directionOf(chapter),
    panels = page ? orderedPanels(page, direction) : [],
    panel =
      panels.find((panel) => panel.id === at.panelId) ?? panels[0];
  return {
    chapter,
    view,
    page,
    panel,
    direction,
    viewIndex: found?.index ?? 0,
    pageIndex: found?.pageIndex ?? 0,
  };
}

/**
 * Coerce a stored location onto the current document: resolve missing pages,
 * repair panels, and attach the correct half for a wide artwork. Sessions
 * saved before these fields existed simply acquire the left-to-right,
 * single-page defaults.
 */
export function normalize(
  doc: ComicDocument,
  at: ReadingLocation,
): ReadingLocation {
  // Prefer the stored page. Only when it no longer exists do we fall back to
  // the page that owns the stored panel.
  const byPage = locateView(doc, at.pageId),
    panelHome = at.panelId ? locatePanel(doc, at.panelId) : undefined,
    anchor = byPage ?? locateView(doc, panelHome?.page.id ?? at.pageId),
    chapter =
      anchor?.chapter ??
      panelHome?.chapter ??
      doc.chapters.find((chapter) => chapter.id === at.chapterId) ??
      doc.chapters[0];
  if (!chapter) return fallbackLocation(doc);
  const page = anchor?.page ?? panelHome?.page ?? chapter.pages[0];
  if (!page) return fallbackLocation(doc);
  const view =
      anchor?.view ??
      buildChapterViews(chapter).find((view) =>
        view.pages.some((item) => item.id === page.id),
      ),
    direction = view?.direction ?? directionOf(chapter),
    panels = orderedPanels(page, direction),
    // `half` is meaningful only when cropping a wide spread artwork; on a
    // facing pair the page id already says which page is on screen.
    half = view && isWideArtwork(view)
      ? isHalf(at.half)
        ? at.half
        : defaultHalf(view, page)
      : undefined,
    panel =
      panels.find((panel) => panel.id === at.panelId) ??
      (half ? firstPanelOnHalf(page, direction, half) : undefined) ??
      panels[0];
  return {
    chapterId: chapter.id,
    pageId: page.id,
    panelId: panel?.id ?? "",
    half,
    zoom: Math.max(1, Math.min(3, Number.isFinite(at.zoom) ? at.zoom : 1)),
    x: Number.isFinite(at.x) ? at.x : 0,
    y: Number.isFinite(at.y) ? at.y : 0,
  };
}

/** Location of a panel anywhere in the document, for strip/stage clicks. */
export function panelLocation(
  doc: ComicDocument,
  panelId: string,
): ReadingLocation | undefined {
  const home = locatePanel(doc, panelId);
  if (!home) return undefined;
  const { chapter, page, panel } = home,
    view = buildChapterViews(chapter).find((view) =>
      view.pages.some((item) => item.id === page.id),
    ),
    wide = view ? isWideArtwork(view) : false;
  return {
    chapterId: chapter.id,
    pageId: page.id,
    panelId: panel.id,
    half: wide ? halfForPanel(page, panel) : undefined,
    zoom: 1,
    x: 0,
    y: 0,
  };
}

/** Raw lookup: which chapter and page owns this panel. */
export function locatePanel(doc: ComicDocument, panelId: string) {
  for (const chapter of doc.chapters)
    for (const page of chapter.pages) {
      const panel = page.panels.find((panel) => panel.id === panelId);
      if (panel) return { chapter, page, panel };
    }
  return undefined;
}

function stepLocation(step: ReadingStep): ReadingLocation {
  return {
    chapterId: step.chapterId,
    pageId: step.pageId,
    panelId: step.panelId,
    half: step.half,
    zoom: 1,
    x: 0,
    y: 0,
  };
}

function stepIndex(
  steps: ReadingStep[],
  at: ReadingLocation,
  mode: ReadingMode,
): number {
  if (mode === "panel") {
    const exact = steps.findIndex(
      (step) => step.pageId === at.pageId && step.panelId === at.panelId,
    );
    if (exact >= 0) return exact;
  }
  if (isHalf(at.half)) {
    const halfMatch = steps.findIndex(
      (step) => step.pageId === at.pageId && step.half === at.half,
    );
    if (halfMatch >= 0) return halfMatch;
  }
  const page = steps.findIndex((step) => step.pageId === at.pageId);
  if (page >= 0) return page;
  // A paired view is a single step in wide mode; if the reader is currently
  // on its second page, that step still represents where they are.
  return steps.findIndex((step) => step.pageIds.includes(at.pageId));
}

/**
 * Move one step forward (positive) or back (negative) in the active mode.
 * Both directions walk the same list, making them exact inverses.
 */
export function advance(
  doc: ComicDocument,
  at: ReadingLocation,
  delta: number,
  mode: ReadingMode,
  options: SequenceOptions = {},
): ReadingLocation {
  const steps = readingSequence(doc, mode, options);
  if (!steps.length) return fallbackLocation(doc);
  const index = stepIndex(steps, at, mode),
    target =
      index < 0
        ? steps[0]!
        : steps[Math.max(0, Math.min(steps.length - 1, index + delta))]!;
  return stepLocation(target);
}

/** First position of a chapter, honouring its reading direction. */
export function chapterStart(chapter: Chapter): ReadingLocation {
  const view = buildChapterViews(chapter)[0],
    page = view?.pages[0],
    direction = directionOf(chapter),
    panels = page ? orderedPanels(page, direction) : [],
    half =
      view && page && isWideArtwork(view)
        ? defaultHalf(view, page)
        : undefined,
    panel =
      page && half ? firstPanelOnHalf(page, direction, half) : panels[0];
  return {
    chapterId: chapter.id,
    pageId: page?.id ?? "",
    panelId: panel?.id ?? "",
    half,
    zoom: 1,
    x: 0,
    y: 0,
  };
}

export function startLocation(doc: ComicDocument): ReadingLocation {
  const chapter = doc.chapters[0];
  return chapter ? chapterStart(chapter) : fallbackLocation(doc);
}

