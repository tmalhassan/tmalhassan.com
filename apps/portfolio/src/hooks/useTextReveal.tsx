import { useEffect, useId, useRef } from "react";
// import type { StrokeShape } from "../types/TextRevealTypes";

type UseTextRevealOptions = {
  /** SVG units per second. Bigger = faster drawing. */
  speed?: number;

  /** Smallest allowed duration for a stroke. */
  minDuration?: number;

  /** Largest allowed duration for a stroke. */
  maxDuration?: number;

  /** Extra gap between letters, in seconds. */
  letterGap?: number;

  /** Initial delay before first letter, in seconds. */
  startDelay?: number;

  /** CSS timing function for the draw animation. */
  easing?: string;
};

// Record we build internally for each stroke the user registers.
interface StrokeRecord {
  el: SVGGeometryElement;
  letterIndex: number;
  length: number; // measured via getTotalLength()
}

// What the hook returns
interface UseTextRevealReturn {
  /** Mask id to use in mask="url(#maskId)" */
  maskId: string;

  /** Register a stroke and associate it with a letter index */
  registerStroke: (letterIndex: number, strokeLength: number | undefined) => (el: SVGGeometryElement | null) => void;

  /** Total animation duration for the whole word/phrase (including gaps/delays). */
  totalDuration: number;
}

export function useTextReveal(options: UseTextRevealOptions = {}): UseTextRevealReturn {
  const {
    speed = 240, // svg units per second (tweak to taste)
    minDuration = 0.18,
    maxDuration = 2.2,
    letterGap = 0,
    startDelay = 0,
    easing = "ease-out",
  } = options;

  const maskId = useId().replace(/:/g, ""); // safer for url(#...)
  const strokesRef = useRef<StrokeRecord[]>([]);
  const totalDurationRef = useRef<number>(0);

  // Callback factory: attach to each stroke element.
  const registerStroke = (letterIndex: number, strokeLength: number | undefined) => (el: SVGGeometryElement | null) => {
    if (!el) return;

    // Measure and stash; we'll compute timings in an effect below.
    const length = (() => {
      if (typeof strokeLength === 'number') return strokeLength
      else {
        const l = el.getTotalLength();
        console.warn(el, "Length not registered! Length: ", l);
        return l
      }
    })();
    strokesRef.current.push({ el, letterIndex, length });
  };

  useEffect(() => {
    const records = [...strokesRef.current]; // copy, don't mutate
    if (records.length === 0) return;

    // group by letter, keep *mount* order inside each letter
    const byLetter = new Map<number, StrokeRecord[]>();
    for (const r of records) {
      const arr = byLetter.get(r.letterIndex) ?? [];
      arr.push(r);
      byLetter.set(r.letterIndex, arr);
    }

    const durations = records.map(r => {
      const raw = r.length / speed;
      return Math.min(maxDuration, Math.max(minDuration, raw));
    });

    // build a lookup from element to its index to avoid O(n^2) indexOf
    const indexByEl = new Map<SVGGeometryElement, number>();
    records.forEach((r, i) => indexByEl.set(r.el, i));

    let cursor = startDelay;
    const delays = new Array(records.length).fill(0);

    const letters = [...byLetter.keys()].sort((a, b) => a - b);
    for (const L of letters) {
      const list = byLetter.get(L)!; // strokes for this letter in mount order
      let letterCursor = 0;
      for (const r of list) {
        const idx = indexByEl.get(r.el)!;
        delays[idx] = cursor + letterCursor;
        letterCursor += durations[idx];
      }
      cursor += letterCursor + letterGap;
    }

    totalDurationRef.current = cursor - letterGap;

    records.forEach((r, i) => {
      const len = r.length;
      r.el.setAttribute("stroke-dasharray", String(len));
      r.el.setAttribute("stroke-dashoffset", String(len));
      const prev = r.el.getAttribute("style") || "";
      const anim = `animation: textRevealDraw ${durations[i]}s ${delays[i]}s ${easing} forwards paused;`;
      r.el.setAttribute("style", prev ? prev + ";" + `stroke-dashoffset: ${r.length};` + ";" + anim : anim);
    });

    return () => { strokesRef.current = []; };
  }, [speed, minDuration, maxDuration, letterGap, startDelay, easing]);

  return {
    maskId,
    registerStroke,
    get totalDuration() { return totalDurationRef.current; },
  };
}