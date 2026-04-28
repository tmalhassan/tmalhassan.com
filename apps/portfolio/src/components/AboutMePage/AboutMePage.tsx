import { useCallback, useEffect, useRef, useState } from "react";
import type { PageCardsRefsTypes } from "../../types/PageCardsRefsTypes";
import './AboutMePage.css';
import { ABOUT_ME_TEXT } from "../../components/Strokes/StrokesData";
import { RevealText } from "../RevealText";
import AnimateText from "../AnimateText/AnimateText";

export default function AboutMePage({ refs, isHidden }: { refs: PageCardsRefsTypes; isHidden: boolean; }) {
  // const [inView, setInView] = useState(false);
  const [enableAnim, setEnableAnim] = useState(false);
  // const textObserverRef = useRef<IntersectionObserver | null>(null);
  const firstRenderRef = useRef(true);
  
  const aboutMeText = [
    `Imagine a mixing bowl in front of you. Around it are all sorts of unusual ingredients. You pick one up and the label reads _*creativity*_. Another says _*diligence*_. Soon, you realize this isn't a recipe for a cake at all — it's a recipe for a personality.`,
    `To the mix, add a sprinkle of _*collaboration*_, a dash of _*problem*_ _*solving*_, and a scoop of _*fast*_ _*learning*_. Don't forget a generous handful of _*attention*_ _*to*_ _*detail*_, and finally, top it off with a hint of _*fun*_ _*energy*_. And there you have it — the recipe for Tarek.`
  ];

  // const setTextContainerNode = useCallback((node: HTMLDivElement | null) => {
  //   if (textObserverRef.current) {
  //     textObserverRef.current.disconnect();
  //   }

  //   if (!node || !firstRenderRef.current) return;

  //   textObserverRef.current = new IntersectionObserver(
  //     (entries) => {
  //       const entry = entries[0];
  //       if (entry.isIntersecting) {
  //         console.log('About Me text container is in view!');
  //         setEnableAnim(true);
  //       }
  //     }, { rootMargin: '-0.5% 0% 0% 0%', threshold: 0 }
  //   );

  //   textObserverRef.current.observe(node);
  // }, []);


  // useEffect(() => {
  //   const pageElement = refs.divRef.current;
  //   // const textContElement = textObserverRef.current;

  //   const observer = new IntersectionObserver((entries) => {
  //     entries.forEach((entry) => {
  //       if (entry.target === pageElement) {
  //         if (entry.isIntersecting && !inView) {
  //           console.log('About Me page is in view!');
  //           setInView(true);
  //         }
  //         if (!entry.isIntersecting) {
  //           console.log('About Me page left the view!');
  //           setInView(false);
  //         }
  //       }

  //       // if (entry.target === textContElement && entry.isIntersecting) {
  //       //   console.log('About Me texts is in view!');
  //       //   setEnableAnim(true);
  //       // }
  //     });
  //   }, {rootMargin : '-1px', threshold : 0});
    

  //   if (pageElement) observer.observe(pageElement);
  //   // if (textContElement) observer.observe(textContElement);
    
  //   return () => {
  //     if (pageElement) observer.unobserve(pageElement);
  //     // if (textContElement) observer.unobserve(textContElement);
  //     observer.disconnect();
  //   }
  // }, []);

  useEffect(() => {
    const pageElement = refs.divRef.current;
    if (!pageElement) return;

    const observer = new IntersectionObserver(([entry], obs) => {
      if (entry.isIntersecting) {
        console.log('About Me page is in view!');
        
        setEnableAnim(true);
        obs.unobserve(pageElement);
      }
    }, {rootMargin : '-10%', threshold : 0});
    
    observer.observe(pageElement);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (enableAnim && firstRenderRef.current === true) firstRenderRef.current = false;
  }, [enableAnim])

  function animState() {
    if (firstRenderRef.current && enableAnim) return ' animate';
    else if (!firstRenderRef.current) return ' end-animate';
    else return ''
  };

  return(
    <div className={`page-card${isHidden ? ' hidden' : ''}`} ref={refs.divRef}>
      <div className={`about-me-container${animState()}`}> {/* ref={setTextContainerNode} style={{ display: !inView ? 'none' : undefined }} */}
        <div className='about-me-title'>
          <RevealText
            strokeData={ABOUT_ME_TEXT}
            fill={{ color: ['#ffcca3', '#fbaf86ff'], angle: 65, opacity: 1 }}
            speed={800} // units/sec
            minDuration={0.15}
            maxDuration={0.2}
            letterGap={0}
            startDelay={0.1}
            easing={'ease-out'} // {"cubic-bezier(0, 0, 0.65, 0.6)"}
            fallbackTextColor="#111827"
          />
        </div>
        <div className='about-me-body'>
          <AnimateText
            type='paragraph'
            text={aboutMeText}
            animStartDelay={0.4}
            wordAnimDuration={0.015}
          />
        </div>
      </div>
      {/* <div ref={refs.coverRef} className='cover'/> */}
    </div>
  )
}