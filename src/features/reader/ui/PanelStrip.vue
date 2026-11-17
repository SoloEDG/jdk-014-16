<script setup lang="ts">
import { computed } from "vue";
import type {
  ComicDocument,
  ReadingLocation,
} from "../../../shared/document";
import { stripGroups } from "../lib/sheets";

const props = defineProps<{
  doc: ComicDocument;
  location: ReadingLocation;
  narrow: boolean;
}>();
const emit = defineEmits<{ select: [id: string] }>();

const groups = computed(() =>
  stripGroups(props.doc, props.location, props.narrow),
);
const total = computed(() =>
  groups.value.reduce((count, group) => count + group.panels.length, 0),
);
</script>
<template>
  <section class="panel-strip">
    <div class="section-heading">
      <span>分镜导航 <small>STORYBOARD</small></span>
      <span class="muted">{{ total }} 个镜头</span>
    </div>
    <div class="strip-groups" :class="{ paired: groups.length === 2 }">
      <div
        v-for="(group, gi) in groups"
        :key="group.pageId"
        class="panel-thumbs"
        :class="{ secondary: groups.length === 2 && gi === 1 }"
      >
        <button
          v-for="panel in group.panels"
          :key="panel.panelId"
          :class="{
            selected: location.panelId === panel.panelId,
            dimmed: !panel.visible,
          }"
          @click="emit('select', panel.panelId)"
        >
          <div :style="panel.style"></div>
          <span
            ><b>{{ String(panel.index + 1).padStart(2, "0") }}</b>
            {{ panel.speaker }}
            <small>{{ panel.duration }}s</small></span
          >
        </button>
      </div>
    </div>
  </section>
</template>
