import type {
  ComicDocument,
  ComicPage,
  PageHalf,
  ReadingLocation,
} from "../../../shared/document";
import { locateView } from "./navigation";
import { halfForPanel, isWideArtwork, orderedPanels } from "./sequence";

/** A page as the stage paints it, optionally cropped to one half. */
export interface StageSheet {
  page: ComicPage;
  crop?: PageHalf;
}

export interface FacingLayout {
  /** Sheets in physical left-to-right order. */
  sheets: StageSheet[];
  /** True when the view shows two ordinary facing pages. */
  facing: boolean;
}

/**
 * What the stage paints at this position.
 *
 * A wide screen shows every page of the view, so a pair appears side by side.
 * A narrow screen shows the page the reader is on; a spread artwork is
 * cropped to the half in view rather than squeezed or split into fake pages.
 * A right-opening chapter puts its first page on the physical right, so the
 * DOM order for a pair is reversed.
 */
export function facingLayout(
  doc: ComicDocument,
  at: ReadingLocation,
  narrow: boolean,
): FacingLayout {
  const found = locateView(doc, at.pageId);
  if (!found) return { sheets: [], facing: false };
  const { view } = found,
    wide = isWideArtwork(view),
    currentIndex = Math.max(
      0,
      view.pages.findIndex((page) => page.id === at.pageId),
    );

  if (wide) {
    const page = view.pages[0]!;
    return {
      sheets: [
        {
          page,
          crop: narrow
            ? (at.half ?? (view.direction === "rtl" ? "right" : "left"))
            : undefined,
        },
      ],
      facing: false,
    };
  }

  if (narrow) {
    const page = view.pages[currentIndex] ?? view.pages[0]!;
    return { sheets: [{ page }], facing: false };
  }

  const sheets = view.pages.map((page) => ({ page })),
    facing = sheets.length === 2;
  const physical =
    facing && view.direction === "rtl" ? [...sheets].reverse() : sheets;
  return { sheets: physical, facing };
}

export interface StripGroup {
  pageId: string;
  title: string;
  panels: {
    panelId: string;
    index: number;
    speaker: string;
    duration: number;
    style: Record<string, string>;
    /** False for panels on the hidden half of a cropped spread. */
    visible: boolean;
  }[];
}

function thumbStyle(page: ComicPage, rect: { x: number; y: number; width: number; height: number }) {
  return {
    backgroundImage: `url("${page.image}")`,
    backgroundSize: `${(page.width / rect.width) * 100}% ${(page.height / rect.height) * 100}%`,
    backgroundPosition: `${(rect.x / (page.width - rect.width || 1)) * 100}% ${(rect.y / (page.height - rect.height || 1)) * 100}%`,
    backgroundRepeat: "no-repeat",
  };
}

/**
 * Storyboard groups in the order they appear on screen.
 *
 * On a wide screen a facing pair is listed left to right, so a right-opening
 * chapter shows its first page on the right, exactly like the stage. On a
 * narrow screen only one page is visible, so that page is listed first and
 * its partner is still listed — dimmed but clickable — so nothing vanishes
 * from the strip as the viewport changes.
 */
export function stripGroups(
  doc: ComicDocument,
  at: ReadingLocation,
  narrow: boolean,
): StripGroup[] {
  const found = locateView(doc, at.pageId);
  if (!found) return [];
  const { view } = found,
    wide = isWideArtwork(view),
    activeHalf = at.half ?? (view.direction === "rtl" ? "right" : "left"),
    groups = view.pages.map((page) => {
      const panels = orderedPanels(page, view.direction),
        pageVisible = !narrow || page.id === at.pageId;
      return {
        pageId: page.id,
        title: page.title,
        panels: panels.map((panel, index) => ({
          panelId: panel.id,
          index,
          speaker: panel.speaker,
          duration: panel.duration,
          style: thumbStyle(page, panel.rect),
          visible:
            pageVisible &&
            (!(wide && narrow) || halfForPanel(page, panel) === activeHalf),
        })),
      };
    });

  if (narrow && groups.length === 2) {
    const current = groups.find((group) => group.pageId === at.pageId);
    return current
      ? [current, ...groups.filter((group) => group !== current)]
      : groups;
  }
  return view.direction === "rtl" && groups.length === 2
    ? [...groups].reverse()
    : groups;
}
