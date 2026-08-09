import './App.css'
import { useEffect, useRef, useState } from 'react'

// import { useTheme } from './contexts/theme-context/useTheme';
import SectionViewPage from './components/SectionView/SectionView';
import IntroPage from './components/IntroPage/IntroPage';
import AboutMePage from './components/AboutMePage/AboutMePage';
import SkillsPage from './components/SkillsPage/SkillsPage';
import clamp from './utilities/clamp';
import type { sectionsTypes } from './types/SectionsTypes';
import { useDevice } from './contexts/device-context/useDevice';
import ThankYouPage from './components/ThanksYouPage/ThankYouPage';
import { bakeAllLogoColors, preloadMeshes } from './mesh/getMesh';
import type { LogoId } from './types/MeshRegenTypes';

export default function App() {
  const { getScreenDimensions } = useDevice();
  const [colorImages, setColorImages] = useState<Record<LogoId, ImageData> | null>(null);
  const [sectionView, setSectionView] = useState<sectionsTypes | null>(null);
  const [svTransToggle, setSVTransToggle] = useState(false);
  // const [activePage, setActivePage] = useState(0);
  // const cardsContainerRef = useRef<HTMLDivElement | null>(null);
  const introDivRef = useRef<HTMLDivElement | null>(null);
  const introCoverRef = useRef<HTMLDivElement | null>(null);

  const aboutMeDivRef = useRef<HTMLDivElement | null>(null);
  const aboutMeCoverRef = useRef<HTMLDivElement | null>(null);

  const skillsDivRef = useRef<HTMLDivElement | null>(null);
  const skillsCoverRef = useRef<HTMLDivElement | null>(null);

  const thankYouDivRef = useRef<HTMLDivElement | null>(null);
  // const thankYouCoverRef = useRef<HTMLDivElement | null>(null);

  const svTimeoutRef = useRef<number | null>(null);

  // const activePageRef = useRef(0);
  // const screenHeightRef = useRef(0);
  
  const isHidden = !!(svTransToggle || sectionView);
  
  useEffect(() => {
    let cancelled = false;

    bakeAllLogoColors().then(result => {
      if (!cancelled) setColorImages(result);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!colorImages) return;

    preloadMeshes(colorImages);
  }, [colorImages]);

  useEffect(() => {
    return () => {
      if (svTimeoutRef.current) clearTimeout(svTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    const scrollContainer = document.documentElement;
    const introDiv = introDivRef.current;
    const aboutMeDiv = aboutMeDivRef.current;

    if (!scrollContainer || !introDiv || !aboutMeDiv) return;

    let scrollRafId: number | null = null;

    const onScroll = () => {
      if (scrollRafId) return;
      
      scrollRafId = requestAnimationFrame(() => {
        const pageHeight = getScreenDimensions().height; // screenHeightRef.current;
        const scrollDis = scrollContainer.scrollTop;

        introDiv.style.setProperty('--bg-elem-scroll', `${(clamp(0, (scrollDis / 2.5 / pageHeight), 0.2) * 100)}%`);
        aboutMeDiv.style.setProperty('--about-me-opacity', `${(clamp(0, (scrollDis / (pageHeight / 2)), 1) * 100)}%`);

        scrollRafId = null;
      });
    };

    onScroll();

    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      
      if (scrollRafId) cancelAnimationFrame(scrollRafId);
    };
  }, [getScreenDimensions]);

  function ToggleSectionView({ state, type } : { state: true; type: sectionsTypes } | { state: false; type: null }) {
    if (svTimeoutRef.current) clearTimeout(svTimeoutRef.current);
    skillsDivRef.current?.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' });
    setSVTransToggle(state);

    svTimeoutRef.current = setTimeout(() => {
      setSectionView(type);
      clearTimeout(svTimeoutRef.current!);
    }, state ? 0 : 550);
  }

  return (
    <>
      {sectionView && <SectionViewPage sectionView={sectionView} ToggleSectionView={ToggleSectionView} />}  {/* Container 2 */}
      <div className={`cards-container${svTransToggle ? ' hidden' : ''}`} inert={!!sectionView}> {/* Container 1 */}
        <IntroPage refs={{ divRef: introDivRef, coverRef: introCoverRef }} isHidden={isHidden}/>
        <AboutMePage refs={{ divRef: aboutMeDivRef, coverRef: aboutMeCoverRef}} isHidden={isHidden}/>
        <SkillsPage refs={{ divRef: skillsDivRef, coverRef: skillsCoverRef }} sectionView={sectionView} svTransToggle={svTransToggle} ToggleSectionView={ToggleSectionView} />
        <ThankYouPage ref={thankYouDivRef} isHidden={isHidden}/>
      </div>
    </>
  )
}