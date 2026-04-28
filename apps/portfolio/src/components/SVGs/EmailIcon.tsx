import type { SVGProps } from "../../types/SVGTypes";

export default function EmailIcon({ fill, stroke }: SVGProps) {
  return(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      style={{ fill, stroke, transitionDuration: '0.2s' }}
    >
      {/* <path d="M22 7.5V17c0 1.6-1.2 2.9-2.8 3H5c-1.6 0-2.9-1.2-3-2.8V7.5l9.4 6.3.1.1c.3.1.6.1.9 0l.1-.1c.1 0 9.5-6.3 9.5-6.3z"/>
      <path d="M19 4c1.1 0 2 .6 2.6 1.4L12 11.8 2.4 5.4C3 4.6 3.8 4.1 4.8 4H19z"/> */}

      <path d="M3 7c0-1.1.9-2 2-2h14c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V7zm0 0 9 6 9-6" />
    </svg>
  )
}