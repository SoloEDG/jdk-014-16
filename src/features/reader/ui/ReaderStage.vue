<script setup lang="ts">
import { ref, computed } from "vue";
import { ChevronLeft, ChevronRight, Maximize2, Columns2 } from "lucide-vue-next";
import type {
  ComicDocument,
  ReadingLocation,
  ReadingMode,
} from "../../../shared/document";
import {
  cropStyle,
  fullRect,
  halfRect,
  halfStyle,
  hotspotStyle,
  sheetStyle,
} from "../lib/viewport";
import { facingLayout } from "../lib/sheets";
import { halfForPanel, orderedPanels } from "../lib/sequence";
import { resolveReading } from "../lib/navigation";

const props = defineProps<{
  doc: ComicDocument;
  location: ReadingLocation;
  mode: ReadingMode;
  narrow: boolean;
  caption: string;
}>();
const emit = defineEmits<{
  move: [delta: number];
  pan: [x: number, y: number];
  panel: [id: string];
  flip: [];
}>();

const stage = ref<HTMLElement>();
let drag: { x: number; y: number; px: number; py: number } | null = null;
function down(e: PointerEvent) {
  if (props.location.zoom <= 1) return;
  drag = {
    x: e.clientX,
    y: e.clientY,
    px: props.location.x,
    py: props.location.y,
  };
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
}
function move(e: PointerEvent) {
  if (drag)
    emit("pan", drag.px + e.clientX - drag.x, drag.py + e.clientY - drag.y);
}
function fullscreen() {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void stage.value?.requestFullscreen();
}

const reading = computed(() => resolveReading(props.doc, props.location));
const layout = computed(() =>
  facingLayout(props.doc, props.location, props.narrow),
);
const direction = computed(() => reading.value.direction);
const facing = computed(() => layout.value.facing);
const cropped = computed(() =>
  layout.value.sheets.some((sheet) => sheet.crop !== undefined),
);
const transform = computed(
  () => `translate(${props.location.x}px, ${props.location.y}px) scale(${props.location.zoom})`,
);

/** Panel mode paints only the current panel, extracted from its page. */
const focused = computed(() => {
  if (props.mode !== "panel") return undefined;
  const page = reading.value.page,
    panel = reading.value.panel;
  if (!page || !panel) return undefined;
  return {
    page,
    panel,
    style: {
      aspectRatio: `${panel.rect.width}/${panel.rect.height}`,
      ...cropStyle(page, panel.rect),
    },
  };
});

function sheetStyleFor(sheet: (typeof layout.value.sheets)[number]) {
  return sheet.crop ? halfStyle(sheet.page, sheet.crop) : sheetStyle(sheet.page);
}
function hotspotRectFor(sheet: (typeof layout.value.sheets)[number]) {
  return sheet.crop ? halfRect(sheet.page, sheet.crop) : fullRect(sheet.page);
}
function visiblePanels(sheet: (typeof layout.value.sheets)[number]) {
  const panels = orderedPanels(sheet.page, direction.value);
  return sheet.crop
    ? panels.filter((panel) => halfForPanel(sheet.page, panel) === sheet.crop)
    : panels;
}
</script>
<template>
  <section ref="stage" class="reader-stage">
    <div class="stage-grain"></div>
    <div class="stage-topline">
      <span><i></i> IMMERSIVE READING</span>
      <div class="stage-tools">
        <button
          v-if="cropped"
          class="half-toggle"
          title="切换跨页图的左右半页"
          @click="emit('flip')"
        >
          <Columns2 :size="13" /> 另半边
        </button>
        <button title="全屏阅读" @click="fullscreen">
          <Maximize2 :size="16" />
        </button>
      </div>
    </div>
    <button
      class="nav-arrow previous"
      :aria-label="direction === 'rtl' ? '下一页或分镜' : '上一页或分镜'"
      @click="emit('move', direction === 'rtl' ? 1 : -1)"
    >
      <ChevronLeft :size="23" />
    </button>
    <div
      class="comic-frame"
      :class="{ focused: mode === 'panel', paired: facing && mode === 'page' }"
      @pointerdown="down"
      @pointermove="move"
      @pointerup="drag = null"
      @pointercancel="drag = null"
    >
      <div
        v-if="focused"
        class="comic-image"
        :style="{ ...focused.style, transform }"
      ></div>
      <div v-else class="comic-spread" :style="{ transform }">
        <div
          v-for="sheet in layout.sheets"
          :key="sheet.page.id"
          class="comic-image sheet"
          :data-page-id="sheet.page.id"
          :data-crop="sheet.crop"
          :class="{
            current: sheet.page.id === location.pageId,
            cropped: !!sheet.crop,
          }"
          :style="sheetStyleFor(sheet)"
        >
          <template v-if="mode === 'page'">
            <button
              v-for="(panel, i) in visiblePanels(sheet)"
              :key="panel.id"
              class="panel-hotspot"
              :style="hotspotStyle(sheet.page, panel, hotspotRectFor(sheet))"
              :aria-label="`阅读分镜 ${i + 1}`"
              @dblclick="emit('panel', panel.id)"
            >
              <span>{{ String(i + 1).padStart(2, "0") }}</span>
            </button>
          </template>
        </div>
      </div>
    </div>
    <button
      class="nav-arrow next"
      :aria-label="direction === 'rtl' ? '上一页或分镜' : '下一页或分镜'"
      @click="emit('move', direction === 'rtl' ? -1 : 1)"
    >
      <ChevronRight :size="23" />
    </button>
    <div class="stage-caption">
      <span
        >{{ mode === "page" ? "整页浏览" : "逐格沉浸" }} <b>·</b>
        {{ caption }}</span
      >
      <span v-if="facing">双页跨页 <b>·</b> 双击分镜进入</span>
      <span v-else-if="cropped">半页查看 <b>·</b> 点击“另半边”</span>
      <span v-else>← → 翻阅 <b>·</b> 双击分镜进入</span>
    </div>
  </section>
</template>
