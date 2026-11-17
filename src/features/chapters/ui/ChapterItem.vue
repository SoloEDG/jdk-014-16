<script setup lang="ts">
import {
  ChevronUp,
  ChevronDown,
  Pencil,
  Trash2,
  ArrowLeftRight,
  Columns2,
  BookMarked,
} from "lucide-vue-next";
import type { Chapter, ReadingDirection } from "../../../shared/document";
import { directionOf, layoutOf } from "../../reader/lib/sequence";
defineProps<{
  chapter: Chapter;
  active: boolean;
  number: number;
}>();
const emit = defineEmits<{
  select: [];
  rename: [];
  move: [delta: number];
  remove: [];
  direction: [value: ReadingDirection];
  layout: ["single" | "pair"];
}>();
</script>
<template>
  <article class="chapter-item" :class="{ active }">
    <button class="chapter-select" @click="emit('select')">
      <span class="chapter-number">{{ String(number).padStart(2, "0") }}</span>
      <span>
        <strong>{{ chapter.title }}</strong>
        <small>
          {{ chapter.pages.length }} 页 ·
          {{ chapter.pages.reduce((n, p) => n + p.panels.length, 0) }} 分镜
          <i class="chapter-tag">{{ directionOf(chapter) === "rtl" ? "右起" : "左起" }}</i>
          <i class="chapter-tag">{{ layoutOf(chapter) === "pair" ? "双页" : "单页" }}</i>
        </small>
      </span>
      <span v-if="active" class="active-dot"></span>
    </button>
    <div class="chapter-actions">
      <button
        title="切换阅读方向"
        :aria-label="`切换《${chapter.title}》的阅读方向`"
        @click="emit('direction', directionOf(chapter) === 'rtl' ? 'ltr' : 'rtl')"
      >
        <ArrowLeftRight :size="12" />
      </button>
      <button
        title="切换单页 / 双页"
        :aria-label="`切换《${chapter.title}》的单页或双页显示`"
        @click="emit('layout', layoutOf(chapter) === 'pair' ? 'single' : 'pair')"
      >
        <Columns2 v-if="layoutOf(chapter) === 'pair'" :size="12" />
        <BookMarked v-else :size="12" />
      </button>
      <button title="向上移动章节" @click="emit('move', -1)">
        <ChevronUp :size="13" />
      </button>
      <button title="向下移动章节" @click="emit('move', 1)">
        <ChevronDown :size="13" />
      </button>
      <button title="重命名章节" @click="emit('rename')">
        <Pencil :size="12" />
      </button>
      <button title="删除章节" @click="emit('remove')">
        <Trash2 :size="12" />
      </button>
    </div>
  </article>
</template>
