export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface Panel {
  id: string;
  rect: Rect;
  dialogue: string;
  speaker: string;
  sound: "rain" | "pulse" | "wind";
  duration: number;
}
/** `ltr` is the default for documents saved before direction was supported. */
export type ReadingDirection = "ltr" | "rtl";
/** Which physical half of a spread is on screen on a narrow viewport. */
export type PageHalf = "left" | "right";
export interface ComicPage {
  id: string;
  title: string;
  image: string;
  width: number;
  height: number;
  /** The artwork itself spans two physical pages and must never be paired. */
  spread?: boolean;
  /** A standalone cover; never paired with a neighbour. */
  cover?: boolean;
  panels: Panel[];
}
/** How a pair-capable chapter presents ordinary pages in page mode. */
export type ChapterLayout = "single" | "pair";
export interface Chapter {
  id: string;
  title: string;
  subtitle: string;
  direction?: ReadingDirection;
  /**
   * `pair` shows facing pages together. The rest of the app still works from
   * the same page-level reading sequence either way.
   */
  layout?: ChapterLayout;
  pages: ComicPage[];
}
export interface ComicDocument {
  version: 1;
  id: string;
  title: string;
  author: string;
  chapters: Chapter[];
}
export interface ReadingLocation {
  chapterId: string;
  pageId: string;
  panelId: string;
  /** Only meaningful on a narrow screen viewing half of a spread artwork. */
  half?: PageHalf;
  zoom: number;
  x: number;
  y: number;
}
export interface Bookmark {
  id: string;
  label: string;
  location: ReadingLocation;
  created: number;
}
export type ReadingMode = "page" | "panel";
