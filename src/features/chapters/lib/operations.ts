import type { ComicDocument } from "../../../shared/document";
export function renameChapter(
  doc: ComicDocument,
  id: string,
  title: string,
): boolean {
  const c = doc.chapters.find((c) => c.id === id);
  if (!c || !title.trim() || title.trim().length > 60) return false;
  c.title = title.trim();
  return true;
}
export function moveChapter(
  doc: ComicDocument,
  id: string,
  delta: number,
): boolean {
  const i = doc.chapters.findIndex((c) => c.id === id),
    j = i + delta;
  if (i < 0 || j < 0 || j >= doc.chapters.length) return false;
  const [chapter] = doc.chapters.splice(i, 1);
  doc.chapters.splice(j, 0, chapter!);
  return true;
}
export function deleteChapter(doc: ComicDocument, id: string): boolean {
  if (doc.chapters.length < 2) return false;
  const i = doc.chapters.findIndex((c) => c.id === id);
  if (i < 0) return false;
  doc.chapters.splice(i, 1);
  return true;
}
export type ChapterFlag = "direction" | "layout";

/** Toggle a chapter's reading direction; the legacy default stays left-to-right. */
export function setChapterDirection(
  doc: ComicDocument,
  id: string,
  direction: "ltr" | "rtl",
): boolean {
  const c = doc.chapters.find((c) => c.id === id);
  if (!c) return false;
  c.direction = direction;
  return true;
}

/** Toggle between single-page and facing-page presentation. */
export function setChapterLayout(
  doc: ComicDocument,
  id: string,
  layout: "single" | "pair",
): boolean {
  const c = doc.chapters.find((c) => c.id === id);
  if (!c) return false;
  c.layout = layout;
  return true;
}

export type PageFlag = "spread" | "cover";

/**
 * Mark a page as a spread artwork (one image across two physical pages) or as
 * a standalone cover. Both flags keep the page out of automatic pairing;
 * clearing both lets the page pair normally again.
 */
export function setPageFlag(
  doc: ComicDocument,
  chapterId: string,
  pageId: string,
  flag: PageFlag,
  value: boolean,
): boolean {
  const chapter = doc.chapters.find((c) => c.id === chapterId),
    page = chapter?.pages.find((p) => p.id === pageId);
  if (!page) return false;
  if (value) page[flag] = true;
  else delete page[flag];
  return true;
}
