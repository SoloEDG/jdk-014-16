<script setup lang="ts">
import type {
  ComicDocument,
  ReadingLocation,
} from "../../../shared/document";
import { pageRail } from "../lib/rail";

const props = defineProps<{
  doc: ComicDocument;
  location: ReadingLocation;
}>();
const emit = defineEmits<{ page: [id: string] }>();
const rail = () => pageRail(props.doc, props.location);
</script>
<template>
  <div v-if="rail().pages.length > 1" class="page-rail" aria-label="页导航">
    <button
      v-for="item in rail().pages"
      :key="item.pageId"
      :class="{
        active: item.active,
        current: item.pageId === location.pageId,
        'rail-wide': item.badge === 'spread',
      }"
      :title="
        item.badge === 'spread'
          ? `${item.title}（跨页图）`
          : item.badge === 'cover'
            ? `${item.title}（独立封面）`
            : item.title
      "
      @click="emit('page', item.pageId)"
    >
      <b>{{ String(item.index).padStart(2, "0") }}</b>
      <i v-if="item.badge === 'spread'" class="rail-badge">跨</i>
      <i v-else-if="item.badge === 'cover'" class="rail-badge">封</i>
      <i v-else-if="item.badge === 'paired'" class="rail-badge pair">双</i>
    </button>
  </div>
</template>
