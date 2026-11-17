import { ref, computed, type Ref } from "vue";
import type {
  ComicDocument,
  PageHalf,
  ReadingLocation,
  ReadingMode,
} from "../../../shared/document";
import type { ReaderCommand } from "../../../shared/commands";
import {
  advance,
  chapterStart,
  normalize,
  panelLocation,
  resolveReading,
  startLocation,
  type SequenceOptions,
} from "../lib/navigation";
import { constrainPan } from "../lib/viewport";
import {
  defaultHalf,
  halfForPanel,
  halfOrder,
  isHalf,
  isWideArtwork,
  orderedPanels,
} from "../lib/sequence";

export interface ReaderOptions extends SequenceOptions {}

export function useReader(
  doc: Ref<ComicDocument>,
  options: Ref<ReaderOptions> = ref({}),
) {
  const stored = ref<ReadingLocation>(
      normalize(doc.value, startLocation(doc.value)),
    ),
    mode = ref<ReadingMode>("page");

  /** Every mutation passes through normalize so the stored state is valid. */
  function set(value: ReadingLocation) {
    stored.value = normalize(doc.value, value);
  }

  const current = computed(() => resolveReading(doc.value, stored.value)),
    view = computed(() => current.value.view),
    page = computed(() => current.value.page),
    pages = computed(() => view.value?.pages ?? []),
    panel = computed(() => current.value.panel),
    direction = computed(() => current.value.direction),
    paired = computed(() => pages.value.length === 2),
    wide = computed(() => !!view.value && isWideArtwork(view.value)),
    narrow = computed(() => options.value.narrow === true);

  /**
   * The half of a wide spread artwork currently in view. Facing pairs track
   * their position through `pageId` instead, so this stays undefined for them
   * even on a narrow screen.
   */
  const half = computed<PageHalf | undefined>(() => {
    if (!view.value || !page.value || !wide.value) return undefined;
    return isHalf(stored.value.half)
      ? stored.value.half
      : (defaultHalf(view.value, page.value) ?? halfOrder(direction.value)[0]);
  });

  function dispatch(command: ReaderCommand) {
    let at: ReadingLocation = { ...stored.value };
    if (command.type === "move")
      at = advance(doc.value, at, command.delta, mode.value, options.value);
    if (command.type === "chapter") {
      const chapter = doc.value.chapters.find((c) => c.id === command.id);
      at = chapter
        ? chapterStart(chapter)
        : { ...at, chapterId: command.id, pageId: "", panelId: "" };
    }
    if (command.type === "page") {
      const target = resolveReading(doc.value, {
        ...at,
        pageId: command.id,
        panelId: "",
        half: undefined,
      });
      // Moving to a page of the same wide artwork keeps the half on screen.
      const keepHalf =
        target.view &&
        isWideArtwork(target.view) &&
        at.pageId === target.page?.id &&
        isHalf(at.half);
      at = {
        ...at,
        pageId: target.page?.id ?? at.pageId,
        panelId: "",
        half: keepHalf ? at.half : undefined,
        zoom: 1,
        x: 0,
        y: 0,
      };
    }
    if (command.type === "panel") {
      at =
        panelLocation(doc.value, command.id) ??
        { ...at, panelId: command.id };
      at = { ...at, zoom: 1, x: 0, y: 0 };
    }
    if (command.type === "restore") at = { ...command.location };
    set(at);
  }

  function reconcile() {
    set(stored.value);
  }

  function zoom(delta: number) {
    set({
      ...stored.value,
      zoom: Math.max(
        1,
        Math.min(3, Math.round((stored.value.zoom + delta) * 10) / 10),
      ),
    });
    pan(stored.value.x, stored.value.y);
  }

  function pan(x: number, y: number) {
    set({ ...stored.value, ...constrainPan(x, y, stored.value.zoom) });
  }

  /**
   * Flip to the other half of the current view on a narrow screen. This is a
   * convenience for wide artworks; ordinary paired views can also be advanced
   * with the same arrow keys, which walk page by page.
   */
  function flipHalf() {
    if (!narrow.value || !view.value || !page.value) return;
    const order = halfOrder(direction.value);
    if (wide.value) {
      const lead =
          half.value ?? defaultHalf(view.value, page.value) ?? order[0]!,
        target = order[(order.indexOf(lead) + 1) % order.length]!,
        // Land on the first panel of that half in reading order, so sound
        // and the strip follow the same position.
        nextPanel =
          orderedPanels(page.value, direction.value).find(
            (item) => halfForPanel(page.value!, item) === target,
          ) ?? panel.value;
      set({
        ...stored.value,
        half: target,
        panelId: nextPanel?.id ?? stored.value.panelId,
        zoom: 1,
        x: 0,
        y: 0,
      });
      return;
    }
    if (!paired.value) return;
    const currentHalf =
        defaultHalf(view.value, page.value) ?? order[0]!,
      target = order.find((item) => item !== currentHalf);
    if (!target) return;
    const index = target === order[0] ? 0 : 1;
    set({
      ...stored.value,
      pageId: view.value.pages[index]?.id ?? stored.value.pageId,
      panelId: "",
      zoom: 1,
      x: 0,
      y: 0,
    });
  }

  function setMode(value: ReadingMode) {
    mode.value = value;
  }

  return {
    location: stored,
    mode,
    current,
    view,
    page,
    pages,
    panel,
    paired,
    wide,
    narrow,
    half,
    direction,
    dispatch,
    reconcile,
    zoom,
    pan,
    flipHalf,
    setMode,
  };
}
