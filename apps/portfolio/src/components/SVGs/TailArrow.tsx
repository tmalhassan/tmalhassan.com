import type { SVGProps } from "../../types/SVGTypes";

export default function BackArrow({ fill, stroke }: SVGProps) {
  return(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      style={{ fill, stroke, transitionDuration: '0.2s' }}
    >
      <g>
        <path d="M13.307,18l6-6l-6-6"/>
        <line x1="19.307" y1="12" x2="4.693" y2="12"/>
      </g>
    </svg>
  )
}