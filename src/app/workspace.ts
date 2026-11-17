import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { demoDocument, useLibrary } from "../features/library";
import { useChapters } from "../features/chapters";
import { useReader, type ReaderOptions } from "../features/reader";
import { useAudio } from "../features/audio";
import { useProgress, readSession } from "../features/progress";

/**
 * Below this width two facing pages can no longer be read comfortably, so the
 * reader switches to showing one page — or one half of a wide artwork — at a
 * time and steps through the pair page by page.
 */
const NARROW_QUERY = "(max-width: 900px)";

export function useWorkspace() {
  const saved = readSession(),
    doc = ref(saved?.document ?? demoDocument()),
    options = ref<ReaderOptions>({ narrow: isNarrow() }),
    reader = useReader(doc, options);
  if (saved) reader.dispatch({ type: "restore", location: saved.location });

  const progress = useProgress(
    doc,
    reader.location,
    saved,
    computed(() => options.value.narrow === true),
  );
  const library = useLibrary(doc, (id) => {
    reader.dispatch({ type: "chapter", id });
    progress.reconcile();
  });
  const chapters = useChapters(doc, (chapterId) => {
    const current = reader.location.value,
      chapter = doc.value.chapters.find(
        (item) => item.id === (chapterId ?? current.chapterId),
      ),
      // Re-pairing can move the current page into a different view. Anchor on
      // that page rather than leaving the location pointing at a page that is
      // now hidden behind its facing partner.
      anchor =
        chapter && chapter.id === current.chapterId
          ? chapters.anchor(chapter.id, current)
          : undefined;
    if (anchor) reader.dispatch({ type: "restore", location: anchor });
    else if (chapter) reader.dispatch({ type: "chapter", id: chapter.id });
    reader.reconcile();
    progress.reconcile();
  });
  const panel = computed(() => reader.panel.value),
    audio = useAudio(panel);

  function isNarrow(): boolean {
    return (
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia(NARROW_QUERY).matches
    );
  }

  let media: MediaQueryList | undefined;

  /**
   * Gain or lose room for a facing pair without losing the page the reader is
   * on: re-anchoring keeps the same page, and progress keeps counting it once.
   */
  function onViewport(event: MediaQueryList | MediaQueryListEvent) {
    options.value = { narrow: event.matches };
    reader.reconcile();
  }

  function keydown(e: KeyboardEvent) {
    if ((e.target as HTMLElement)?.closest("input,textarea,button,select"))
      return;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      // Arrow keys follow the chapter's reading direction: a right-opening
      // chapter advances with ArrowLeft, exactly like a printed book.
      const forward =
        reader.direction.value === "rtl"
          ? e.key === "ArrowLeft"
          : e.key === "ArrowRight";
      reader.dispatch({ type: "move", delta: forward ? 1 : -1 });
    }
    if (e.key === " ") {
      e.preventDefault();
      audio.toggle();
    }
    if (e.key === "Escape") reader.setMode("page");
  }

  onMounted(() => {
    window.addEventListener("keydown", keydown);
    if (typeof window.matchMedia !== "function") return;
    media = window.matchMedia(NARROW_QUERY);
    onViewport(media);
    media.addEventListener("change", onViewport);
  });
  onBeforeUnmount(() => {
    window.removeEventListener("keydown", keydown);
    media?.removeEventListener("change", onViewport);
  });
  const narrow = computed(() => options.value.narrow === true);
  return { doc, reader, progress, library, chapters, audio, narrow };
}
