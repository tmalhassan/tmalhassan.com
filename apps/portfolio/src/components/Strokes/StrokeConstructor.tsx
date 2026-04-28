import type { ReactNode } from "react";
import type { StrokeData, StrokeShape } from "../../types/TextRevealTypes";


export default function StrokeConstructor(strokeData: StrokeData, fill: string, mask: string): { viewBox: string; strokes: StrokeShape[]; maskedPath: React.ReactNode; } {
  const viewBox = strokeData.viewBox;
  const strokes = strokeData.strokes;
  const maskedPath = (
    <g fill={fill} mask={`url(#${mask})`}>
      <path d={`${strokeData.pathString}`} />
    </g>
  ) as ReactNode;
  
  return { viewBox, strokes, maskedPath }
}