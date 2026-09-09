import type { SVGProps } from "../../types/SVGTypes";

export default function BackArrow({ fill, stroke }: SVGProps) {
  return(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      style={{ fill, stroke, transitionDuration: '0.2s' }}
    >
      <path d="m13.6 6-6 6 6 6" />
    </svg>
  )
}