import { GET_IN_TOUCH_TEXT } from '../Strokes/StrokesData';
import { RevealText } from '../RevealText';
import { useEffect, useRef, useState } from 'react';
import './ThankYouPage.css';

import bgTrnglDark from '../../assets/pages/thanks-page/triangle-fade-dark.svg';
import bgTrnglLight from '../../assets/pages/thanks-page/triangle-fade-light.svg';
import LinkedInIcon from '../SVGs/LinkedInIcon';
import { useTheme } from '../../contexts/theme-context/useTheme';
import EmailIcon from '../SVGs/EmailIcon';
import GlassGlareButton from '../GlassGlareButton/GlassGlareButton';
import { handleRedirectButtonClick } from '../../utilities/linkRedirect';

export default function ThankYouPage({ ref, isHidden }: { ref: React.RefObject<HTMLDivElement | null>; isHidden: boolean; }) {
  const { theme } = useTheme();
  // const [inView, setInView] = useState(false);
  const [enableAnim, setEnableAnim] = useState(false);
  const firstRenderRef = useRef(true);

  // useEffect(() => {
  //   const pageElement = ref.current;

  //   const observer = new IntersectionObserver((entries) => {
  //     entries.forEach((entry) => {
  //       if (entry.target === pageElement) {
  //         if (entry.isIntersecting) {
  //           console.log("Thank You page is in view!");
  //           // setInView(true);
  //           setEnableAnim(true);
  //         } else {
  //           console.log("Thank You page left the view!");
  //           // setInView(false);
  //           setEnableAnim(false);
  //         }
  //       }
  //     });
  //   }, {rootMargin : '-5%', threshold : 0});
    

  //   if (pageElement) observer.observe(pageElement);
    
  //   return () => {
  //     if (pageElement) observer.unobserve(pageElement);
  //     observer.disconnect();
  //   }
  // }, []);

  useEffect(() => {
    const pageElement = ref.current;
    if (!pageElement) return;

    const observer = new IntersectionObserver(([entry], obs) => {
      if (entry.isIntersecting) {
        console.log('Thank You page is in view!');
        
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
    <div className={`page-card${isHidden ? ' hidden' : ''}`} ref={ref} >
      <div className='ty-page-content'> {/* style={{ display: !inView ? 'none' : undefined }} */}
        <div className="ty-page-bg">
          <img className='bg-triangle1' src={theme === 'dark' ? bgTrnglDark : bgTrnglLight} alt="" />
          <img className='bg-triangle2' src={theme === 'dark' ? bgTrnglDark : bgTrnglLight} alt="" />
        </div>
        <div className={`get-in-touch-container${animState()}`}>
          <RevealText
            strokeData={GET_IN_TOUCH_TEXT}
            fill={{ color: ['#ffcca3', '#fbaf86ff'], angle: 65, opacity: 1 }}
            speed={700} // units/sec
            minDuration={0.05}
            maxDuration={2}
            letterGap={0}
            startDelay={0.15}
            easing={'ease-out'} // {"cubic-bezier(0, 0, 0.65, 0.6)"}
            fallbackTextColor="#111827"
          />
        </div>
        <div className='socials-container'>
          <GlassGlareButton
            buttonImage={<LinkedInIcon stroke={theme === 'dark' ? '#bfbfbf' : '#353535cc'}/>}
            triggerAnim={false}
            animDelay={0}
            willAnimate={false}
            onClickHandler={() => handleRedirectButtonClick('linkedin')}
          />
          <GlassGlareButton
            buttonImage={<EmailIcon stroke={theme === 'dark' ? '#bfbfbf' : '#353535cc'}/>}
            triggerAnim={false}
            animDelay={0}
            willAnimate={false}
            onClickHandler={() => handleRedirectButtonClick('email')}
          />
        </div>
        {/* <div className='cover'/> */}
      </div>
    </div>
  )
}

