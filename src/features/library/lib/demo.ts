import type {
  Chapter,
  ComicDocument,
  ComicPage,
  Rect,
} from "../../../shared/document";
import { artwork, spreadArtwork } from "./artwork";

const DEMO_PANELS: Rect[] = [
  { x: 12, y: 12, width: 876, height: 532 },
  { x: 12, y: 558, width: 430, height: 390 },
  { x: 456, y: 558, width: 432, height: 390 },
  { x: 12, y: 962, width: 876, height: 226 },
];

function demoPage(
  chapterIndex: number,
  pageIndex: number,
  lines: string[],
  options: { spread?: boolean; cover?: boolean } = {},
): ComicPage {
  const spread = options.spread === true;
  return {
    id: `page-${chapterIndex}-${pageIndex}`,
    title: spread ? `第 ${pageIndex + 1} 页 · 跨页` : `第 ${pageIndex + 1} 页`,
    width: spread ? 1800 : 900,
    height: 1200,
    image: spread
      ? spreadArtwork(chapterIndex + pageIndex, chapterIndex + pageIndex + 1)
      : artwork(chapterIndex + pageIndex),
    ...(spread ? { spread: true } : {}),
    ...(options.cover ? { cover: true } : {}),
    panels: lines.map((dialogue, i) => ({
      id: `panel-${chapterIndex}-${pageIndex}-${i}`,
      dialogue,
      speaker: i % 2 ? "陈屿" : "旁白",
      sound: i === 2 ? ("pulse" as const) : ("rain" as const),
      duration: 4 + i,
      rect: spread
        ? spreadRect(i)
        : DEMO_PANELS[i]!,
    })),
  };
}

/** Panels for a 1800×1200 spread: two per half, mirroring the single layout. */
function spreadRect(index: number): Rect {
  return (
    [
      { x: 12, y: 12, width: 1776, height: 532 },
      { x: 12, y: 558, width: 870, height: 630 },
      { x: 918, y: 558, width: 870, height: 630 },
      { x: 918, y: 12, width: 870, height: 532 },
    ][index] ?? DEMO_PANELS[0]!
  );
}

export function demoDocument(): ComicDocument {
  const lines = [
    [
      "整座城市都在等待一场不会停的雨。",
      "末班车已经走了，你还在等谁？",
      "一封没有署名的消息，在凌晨两点亮起。",
      "沿着光走。我们在旧车站见。",
    ],
    [
      "街灯把影子拉得很长。",
      "我记得这里，曾经有一间唱片店。",
      "有人比我更早抵达。",
      "雨声里，传来一首熟悉的歌。",
    ],
    [
      "城市的边缘，终于亮起一线微光。",
      "原来你一直都在。",
      "那封信，是写给昨天的自己。",
      "天亮了。我们出发吧。",
    ],
  ];
  const chapters: Chapter[] = lines.map((text, c) => {
    const count = c === 0 ? 4 : 3;
    return {
      id: `chapter-${c}`,
      title: ["第一章 · 夜的来信", "第二章 · 失落的频率", "第三章 · 天光将至"][
        c
      ]!,
      subtitle: [
        "凌晨 02:17 / 城市边缘",
        "凌晨 03:42 / 旧车站",
        "清晨 05:06 / 海岸",
      ][c]!,
      // The first two chapters read right-to-left with facing pages; the last
      // keeps the classic left-to-right single-page flow.
      direction: c < 2 ? "rtl" : "ltr",
      layout: c < 2 ? "pair" : "single",
      pages: Array.from({ length: count }, (_, p) =>
        demoPage(c, p, text, {
          cover: c === 0 && p === 0,
          spread: c === 1 && p === 1,
        }),
      ),
    };
  });
  return {
    version: 1,
    id: "before-rain",
    title: "雨停之前",
    author: "林间工作室",
    chapters,
  };
}
