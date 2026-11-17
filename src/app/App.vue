<script setup lang="ts">
import { computed } from "vue";
import {
  BookOpen,
  ChevronRight,
  Grid2X2,
  Scan,
  Minus,
  Plus,
  Bookmark,
  Cloud,
  PanelLeftClose,
  Columns2,
  RectangleHorizontal,
  BookMarked,
} from "lucide-vue-next";
import { LibraryPanel } from "../features/library";
import { ChapterPanel } from "../features/chapters";
import { PageRail } from "../features/chapters";
import { ReaderStage, PanelStrip } from "../features/reader";
import { AudioPanel } from "../features/audio";
import { ProgressPanel } from "../features/progress";
import { useWorkspace } from "./workspace";
const {
  doc,
  reader: r,
  progress: p,
  library: l,
  chapters: c,
  audio: a,
  narrow,
} = useWorkspace();
const current = r.current,
  at = r.location,
  mode = r.mode,
  metrics = p.metrics,
  bookmarks = p.bookmarks,
  status = p.status,
  cue = a.cue,
  wide = r.wide,
  direction = r.direction;
const chapterIndex = computed(
  () => doc.value.chapters.findIndex((c) => c.id === at.value.chapterId) + 1,
);
const page = computed(() => current.value.page);
const marked = computed(() => ({
  spread: page.value?.spread === true,
  cover: page.value?.cover === true,
}));
const caption = computed(() => {
  const label = metrics.value.pageLabel;
  if (!page.value) return "";
  return `第 ${label} 页 · ${page.value.title}`;
});
function focus(id: string) {
  r.dispatch({ type: "panel", id });
  r.setMode("panel");
}
</script>
<template>
  <div class="app-shell">
    <header class="app-header">
      <a class="brand" href="./"
        ><div class="brand-icon"><BookOpen :size="22" /></div>
        <strong>PANEL<span>沉浸漫画</span></strong></a
      >
      <nav>
        <span>我的书架</span><ChevronRight :size="13" /><strong>{{
          doc.title
        }}</strong
        ><span class="preview-tag">正在阅读</span>
      </nav>
      <div class="header-right">
        <Cloud :size="15" /><span>本地已就绪</span>
        <div class="avatar">林</div>
      </div>
    </header>
    <div class="workspace">
      <aside class="left-sidebar">
        <div class="book-cover">
          <img :src="doc.chapters[0]?.pages[0]?.image" alt="雨停之前漫画封面" />
          <div>
            <small>ORIGINAL COMIC</small>
            <h1>{{ doc.title }}</h1>
            <p>{{ doc.author }} 著</p>
          </div>
          <span>全彩 · 沉浸版</span>
        </div>
        <div class="book-details">
          <h2>{{ doc.title }} <span>连载中</span></h2>
          <p>当城市沉睡，故事才刚刚开始。</p>
          <div><span>都市悬疑</span><span>氛围叙事</span></div>
        </div>
        <ChapterPanel
          :chapters="doc.chapters"
          :active="at.chapterId"
          :editing="c.editing.value"
          :draft="c.draft.value"
          :error="c.error.value"
          @select="r.dispatch({ type: 'chapter', id: $event })"
          @rename="c.begin"
          @move="c.move"
          @remove="c.remove"
          @direction="c.direction"
          @layout="c.setLayout"
          @draft="c.draft.value = $event"
          @save="c.rename"
        /><LibraryPanel
          :busy="l.busy.value"
          :message="l.message.value"
          @import="l.importFiles"
          @reset="l.reset"
        />
        <div class="sidebar-footer">
          <PanelLeftClose :size="14" /> 你的私人漫画放映室 <span>v1.0</span>
        </div>
      </aside>
      <main class="reading-workspace">
        <div class="reader-toolbar">
          <div>
            <span class="chapter-eyebrow"
              >CHAPTER {{ String(chapterIndex).padStart(2, "0") }}
              <i class="direction-tag">{{
                direction === "rtl" ? "右起" : "左起"
              }}</i></span
            >
            <h2>{{ current.chapter?.title }}</h2>
          </div>
          <div class="reader-tools">
            <div class="mode-switch">
              <button
                :class="{ active: mode === 'page' }"
                @click="r.setMode('page')"
              >
                <Grid2X2 :size="14" /> 整页</button
              ><button
                :class="{ active: mode === 'panel' }"
                @click="r.setMode('panel')"
              >
                <Scan :size="14" /> 逐格
              </button>
            </div>
            <span class="tool-divider"></span>
            <button
              :class="{ marked: marked.spread }"
              title="把本页标记为跨页图"
              :aria-pressed="marked.spread"
              @click="c.flag(at.pageId, 'spread', !marked.spread)"
            >
              <RectangleHorizontal :size="15" />
            </button>
            <button
              :class="{ marked: marked.cover }"
              title="把本页标记为独立封面"
              :aria-pressed="marked.cover"
              @click="c.flag(at.pageId, 'cover', !marked.cover)"
            >
              <BookMarked :size="15" />
            </button>
            <button
              v-if="wide && narrow"
              title="切换跨页图的左右半页"
              @click="r.flipHalf"
            >
              <Columns2 :size="15" />
            </button>
            <span class="tool-divider"></span
            ><button aria-label="缩小" @click="r.zoom(-0.2)">
              <Minus :size="15" /></button
            ><span class="zoom-value">{{ Math.round(at.zoom * 100) }}%</span
            ><button aria-label="放大" @click="r.zoom(0.2)">
              <Plus :size="15" /></button
            ><button title="收藏当前分镜" @click="p.add">
              <Bookmark :size="16" />
            </button>
          </div>
        </div>
        <PageRail
          :doc="doc"
          :location="at"
          @page="r.dispatch({ type: 'page', id: $event })"
        />
        <ReaderStage
          v-if="current.page && current.panel"
          :doc="doc"
          :location="at"
          :mode="mode"
          :narrow="narrow"
          :caption="caption"
          @move="r.dispatch({ type: 'move', delta: $event })"
          @pan="r.pan"
          @panel="focus"
          @flip="r.flipHalf"
        />
        <div class="page-position">
          <span>{{ current.chapter?.subtitle }}</span>
          <div>
            <b>{{ metrics.pageLabel }}</b
            ><span>/ {{ String(metrics.pageCount).padStart(2, "0") }}</span
            ><small>页 · 全书 {{ metrics.percent }}%</small>
          </div>
          <span>阅读位置自动保存 <i></i></span>
        </div>
        <PanelStrip
          v-if="current.view"
          :doc="doc"
          :location="at"
          :narrow="narrow"
          @select="focus"
        />
      </main>
      <aside class="right-sidebar">
        <AudioPanel
          :enabled="a.enabled.value"
          :volume="a.volume.value"
          :dialogue="a.dialogue.value"
          :cue="cue"
          :error="a.error.value"
          @toggle="a.toggle"
          @volume="a.volume.value = $event"
          @dialogue="a.dialogue.value = !a.dialogue.value"
        /><ProgressPanel
          :bookmarks="bookmarks"
          :percent="metrics.percent"
          :status="status"
          @add="p.add"
          @remove="p.remove"
          @restore="r.dispatch({ type: 'restore', location: $event })"
        />
        <div class="reading-tip">
          <span>✦ 阅读小贴士</span>
          <p>试试逐格模式，让画面与声音<br />带你走进故事的深处。</p>
          <kbd>←</kbd><kbd>→</kbd> <small>切换画面</small><br /><kbd>Space</kbd>
          <small>播放 / 暂停声景</small>
        </div>
      </aside>
    </div>
    <footer class="app-footer">
      <span><i></i> 所有故事，都有回声。</span
      ><span>PANEL · 为每一格想象而生</span
      ><span>图片导入 · 本地存储 · 无需联网</span>
    </footer>
  </div>
</template>
