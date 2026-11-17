import type {
  ComicPage,
  PageHalf,
  Panel,
  Rect,
} from "../../../shared/document";

function fraction(offset: number, span: number): number {
  return span > 0 ? (offset / span) * 100 : 0;
}

/** Paint a rectangular region (`rect`) of a page image into a box. */
export function cropStyle(page: ComicPage, rect: Rect) {
  return {
    backgroundImage: `url("${page.image}")`,
    backgroundRepeat: "no-repeat",
    backgroundSize: `${(page.width / rect.width) * 100}% ${(page.height / rect.height) * 100}%`,
    backgroundPosition: `${fraction(rect.x, page.width - rect.width)}% ${fraction(rect.y, page.height - rect.height)}%`,
  };
}

export function fullRect(page: ComicPage): Rect {
  return { x: 0, y: 0, width: page.width, height: page.height };
}

/** A whole page inside a box whose aspect ratio matches the artwork. */
export function sheetStyle(page: ComicPage) {
  return {
    aspectRatio: `${page.width}/${page.height}`,
    backgroundImage: `url("${page.image}")`,
    backgroundRepeat: "no-repeat",
    backgroundSize: "100% 100%",
  };
}

export function halfRect(page: ComicPage, half: PageHalf): Rect {
  return {
    x: half === "right" ? page.width / 2 : 0,
    y: 0,
    width: page.width / 2,
    height: page.height,
  };
}

/** One physical half of a wide spread artwork, cropped to fit a narrow screen. */
export function halfStyle(page: ComicPage, half: PageHalf) {
  const rect = halfRect(page, half);
  return {
    aspectRatio: `${rect.width}/${rect.height}`,
    ...cropStyle(page, rect),
  };
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Position a panel hotspot inside a page sheet, or inside a cropped region of
 * it (a half of a spread on a narrow screen). Panels that straddle the crop
 * edge are clamped to the visible area rather than overflowing it.
 */
export function hotspotStyle(
  page: ComicPage,
  panel: Panel,
  rect: Rect = fullRect(page),
) {
  const left = clamp(((panel.rect.x - rect.x) / rect.width) * 100),
    right = clamp(
      ((panel.rect.x + panel.rect.width - rect.x) / rect.width) * 100,
    ),
    top = clamp(((panel.rect.y - rect.y) / rect.height) * 100),
    bottom = clamp(
      ((panel.rect.y + panel.rect.height - rect.y) / rect.height) * 100,
    );
  return {
    left: `${left}%`,
    top: `${top}%`,
    width: `${Math.max(0, right - left)}%`,
    height: `${Math.max(0, bottom - top)}%`,
  };
}

export function constrainPan(x: number, y: number, zoom: number) {
  const limit = (zoom - 1) * 220;
  return {
    x: Math.max(-limit, Math.min(limit, x)),
    y: Math.max(-limit, Math.min(limit, y)),
  };
}
