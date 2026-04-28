export type StrokeShape = {
  /** Which letter this stroke belongs to (0-based). */
  letter: number;

  /** The order within the same letter (handwriting order) */
  order: number;

  /** SVG element tag to render inside the mask. */
  tag: "path" | "line" | "polyline" | "polygon" | "rect" | "circle" | "ellipse";

  /** Raw SVG props for that element (except stroke/fill/style which we handle). */
  props: React.SVGProps<SVGElement> & { d?: string };

  /** Optional strokeWidth override for this stroke. */
  strokeWidth?: number;

  strokeLength?: number;
};

export interface StrokeData {
  viewBox: string,
  strokes: StrokeShape[],
  pathString: string;
}