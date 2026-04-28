import { useId, useMemo } from "react";
import { useTextReveal } from "../hooks/useTextReveal";
import type { StrokeData } from "../types/TextRevealTypes";
import StrokeConstructor from "./Strokes/StrokeConstructor";

interface RevealTextType {
  strokeData: StrokeData

  /** Solid color string OR tuple of two colors for gradient. */
  fill: { color: string | [string, string], angle: number, opacity: number};

  /** Hook timing options */
  speed?: number; minDuration?: number; maxDuration?: number; letterGap?: number; startDelay?: number; easing?: string;

  /** Mask stroke visual color (usually white). */
  strokeColor?: string;

  /** If no fill provided, fallback solid text color. */
  fallbackTextColor?: string;
}

export function RevealText({ strokeData, fill, speed, minDuration, maxDuration, letterGap, startDelay, easing, strokeColor = "white", fallbackTextColor = "black" }: RevealTextType) {
  const { maskId, registerStroke } = useTextReveal({ speed, minDuration, maxDuration, letterGap, startDelay, easing });
  const { defs, paint } = useOptionalGradient(fill.color, fill.angle, fill.opacity);
  const { viewBox, strokes, maskedPath } = StrokeConstructor(strokeData, paint || fallbackTextColor, maskId);
  // const textFill = paint || fallbackTextColor;

  const orderedStrokes = useMemo(() => {
    // decorate with original index to make the sort stable
    return strokes
      .map((s, idx) => ({ s, idx }))
      .sort((a, b) => {
        const byLetter = a.s.letter - b.s.letter;
        if (byLetter !== 0) return byLetter;
        // prefer explicit 'order', then fallback to original index
        const ao = a.s.order ?? a.idx;
        const bo = b.s.order ?? b.idx;
        return ao - bo;
      })
      .map(({ s }) => s);
  }, [strokes]);

  return (
    <svg viewBox={viewBox} xmlns="http://www.w3.org/2000/svg">
      {defs}
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
          {/* Black hides everything; white reveals. */}
          <rect width="100%" height="100%" fill="black" />
          {orderedStrokes.map((s, i) => {
            const common = {
              ref: registerStroke(s.letter, s.strokeLength),
              className: "anim-letter",
              fill: "none" as const,
              stroke: strokeColor,
              strokeLinecap: "round" as const,
              strokeLinejoin: "round" as const,
              strokeWidth: s.strokeWidth, // sensible default for reveal masks
            };
            switch (s.tag) {
              case "path": return <path key={i} {...(s.props as React.SVGProps<SVGPathElement>)} {...common} />;
              case "line": return <line key={i} {...(s.props as React.SVGProps<SVGLineElement>)} {...common} />;
              case "polyline": return <polyline key={i} {...(s.props as React.SVGProps<SVGPolylineElement>)} {...common} />;
              case "polygon": return <polygon key={i} {...(s.props as React.SVGProps<SVGPolygonElement>)} {...common} />;
              case "rect": return <rect key={i} {...(s.props as React.SVGProps<SVGRectElement>)} {...common} />;
              case "circle": return <circle key={i} {...(s.props as React.SVGProps<SVGCircleElement>)} {...common} />;
              case "ellipse": return <ellipse key={i} {...(s.props as React.SVGProps<SVGEllipseElement>)} {...common} />;
            }
          })}
        </mask>
      </defs>

      {/* For text as characters */}
      {/* <text x={40} y={125} fontSize={fontSize} fontFamily={fontFamily} fill={textFill} mask={`url(#${maskId})`}>
        {text}
      </text> */}
      {/* <g fill={textFill} mask={`url(#${maskId})`}>
        {fullText}
      </g> */}

      {/* For text as shapes/paths */}
      {maskedPath}
    </svg>
  );
}

// -----------------------
// Helper: Gradient fill handling
// -----------------------
function useOptionalGradient(fill: string | [string, string] | undefined, rotation: number, opacity: number) {
  const gradientId = useId().replace(/:/g, "");
  const defs = useMemo(() => {
    if (!fill) return null;

    if (Array.isArray(fill) && fill.length === 2) {
      const [c1, c2] = fill;
      return (
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%" gradientTransform={`rotate(${rotation})`}>
            <stop offset="0.65" stopColor={c1} stopOpacity={opacity}/>
            <stop offset="1" stopColor={c2} stopOpacity={opacity}/>
          </linearGradient>
        </defs>
      );
    }
    // Single color needs no defs
    return null;
  }, [fill, gradientId, rotation]);

  const paint = Array.isArray(fill) ? `url(#${gradientId})` : (fill || undefined);
  return { gradientId, defs, paint } as const;
}
