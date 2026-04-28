import type { SVGProps } from "../../types/SVGTypes";

export default function LinkedInIcon({ fill, stroke }: SVGProps) {
  return(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      style={{ fill, stroke, transitionDuration: '0.2s' }}
    >
      <path d="M8 11v5M8 8h0M12 16v-5M16 16v-3c0-1.1-.9-2-2-2s-2 .9-2 2" />
      <path d="M3 7c0-2.2 1.8-4 4-4h10c2.2 0 4 1.8 4 4v10c0 2.2-1.8 4-4 4H7c-2.2 0-4-1.8-4-4V7z" />
    </svg>
  )
}