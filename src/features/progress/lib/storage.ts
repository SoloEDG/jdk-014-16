import type {
  ComicDocument,
  Bookmark,
  Chapter,
  ComicPage,
  ReadingLocation,
} from "../../../shared/document";
const KEY = "panel-jdk014-v1";
export interface SavedSession {
  document: ComicDocument;
  location: ReadingLocation;
  bookmarks: Bookmark[];
}

/**
 * Fill in fields added after a session was saved. Documents from before
 * direction and pairing support are left-to-right, single page, and every
 * page is a plain page rather than a spread or cover.
 */
function upgradeDocument(document: ComicDocument): ComicDocument {
  return {
    ...document,
    chapters: document.chapters.map(
      (chapter): Chapter => ({
        ...chapter,
        direction: chapter.direction === "rtl" ? "rtl" : "ltr",
        layout: chapter.layout === "pair" ? "pair" : "single",
        pages: chapter.pages.map(
          (page): ComicPage => ({
            ...page,
            spread: page.spread === true,
            cover: page.cover === true,
          }),
        ),
      }),
    ),
  };
}

/** Old bookmarks and locations may lack the optional half field. */
function upgradeLocation(location: ReadingLocation): ReadingLocation {
  return {
    ...location,
    half: location.half === "left" || location.half === "right"
      ? location.half
      : undefined,
    zoom: Number.isFinite(location.zoom) ? location.zoom : 1,
    x: Number.isFinite(location.x) ? location.x : 0,
    y: Number.isFinite(location.y) ? location.y : 0,
  };
}

export function readSession(): SavedSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as SavedSession;
    if (
      value.document?.version !== 1 ||
      !Array.isArray(value.document.chapters) ||
      !value.document.chapters.length ||
      !value.location ||
      !Array.isArray(value.bookmarks)
    )
      return null;
    for (const c of value.document.chapters) {
      if (!c.pages?.length) return null;
      for (const p of c.pages)
        if (!p.panels?.length || typeof p.image !== "string") return null;
    }
    const document = upgradeDocument(value.document);
    return {
      document,
      location: upgradeLocation(value.location),
      bookmarks: value.bookmarks.map((bookmark) => ({
        ...bookmark,
        location: upgradeLocation(bookmark.location),
      })),
    };
  } catch {
    return null;
  }
}
export function writeSession(value: SavedSession): string {
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
    return "已保存到此浏览器";
  } catch {
    return "存储空间不足，本次修改仅保留在当前页面；请减少导入图片";
  }
}
