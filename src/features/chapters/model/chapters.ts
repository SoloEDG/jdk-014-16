import { ref, type Ref } from "vue";
import type {
  ComicDocument,
  PageHalf,
  ReadingDirection,
  ReadingLocation,
} from "../../../shared/document";
import {
  renameChapter,
  moveChapter,
  deleteChapter,
  setChapterDirection,
  setChapterLayout,
  setPageFlag,
  type PageFlag,
} from "../lib/operations";
import {
  buildChapterViews,
  defaultHalf,
  orderedPanels,
  type ChapterLayout,
} from "../../reader/lib/sequence";
import { chapterStart } from "../../reader/lib/navigation";
export function useChapters(
  doc: Ref<ComicDocument>,
  changed: (chapterId?: string) => void,
) {
  const editing = ref(""),
    draft = ref(""),
    error = ref("");
  function begin(id: string) {
    editing.value = id;
    draft.value = doc.value.chapters.find((c) => c.id === id)?.title ?? "";
  }
  function rename() {
    if (!renameChapter(doc.value, editing.value, draft.value)) {
      error.value = "章节名需为 1–60 个字";
      return;
    }
    editing.value = "";
    error.value = "";
    changed();
  }
  function move(id: string, delta: number) {
    if (moveChapter(doc.value, id, delta)) changed(id);
  }
  function remove(id: string) {
    if (!deleteChapter(doc.value, id)) {
      error.value = "至少保留一个章节";
      return;
    }
    changed();
  }
  /** Direction is per chapter, so left-to-right works sit beside right-to-left ones. */
  function direction(value: ReadingDirection, id: string) {
    if (!setChapterDirection(doc.value, id, value)) return;
    changed(id);
  }
  function setLayout(layout: ChapterLayout, id: string) {
    if (!setChapterLayout(doc.value, id, layout)) return;
    changed(id);
  }
  function flag(pageId: string, flag: PageFlag, value: boolean) {
    const chapter = doc.value.chapters.find((c) =>
      c.pages.some((p) => p.id === pageId),
    );
    if (!chapter) return;
    if (!setPageFlag(doc.value, chapter.id, pageId, flag, value)) return;
    changed(chapter.id);
  }
  /**
   * Where the reader should land when a page's pairing turns it into a
   * different view. Called by the workspace so a spread marker never leaves
   * the current position pointing at a page that is no longer shown.
   */
  function anchor(
    chapterId: string,
    location: ReadingLocation,
  ): ReadingLocation | undefined {
    const chapter = doc.value.chapters.find((c) => c.id === chapterId);
    if (!chapter) return undefined;
    const view = buildChapterViews(chapter).find((v) =>
      v.pages.some((p) => p.id === location.pageId),
    );
    if (!view) return chapterStart(chapter);
    const page =
      view.pages.find((p) => p.id === location.pageId) ?? view.pages[0];
    if (!page) return chapterStart(chapter);
    const half: PageHalf | undefined = defaultHalf(view, page),
      panels = orderedPanels(page, view.direction),
      panel =
        panels.find((item) => item.id === location.panelId) ?? panels[0];
    return {
      ...location,
      chapterId: chapter.id,
      pageId: page.id,
      panelId: panel?.id ?? "",
      half,
      zoom: 1,
      x: 0,
      y: 0,
    };
  }
  return {
    editing,
    draft,
    error,
    begin,
    rename,
    move,
    remove,
    direction,
    setLayout,
    flag,
    anchor,
  };
}
