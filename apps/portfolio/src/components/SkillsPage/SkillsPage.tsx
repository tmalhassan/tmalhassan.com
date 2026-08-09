import React, { useEffect, useRef, useState, } from "react";
import { useDevice } from "../../contexts/device-context/useDevice";
import { useTheme } from "../../contexts/theme-context/useTheme";
import { useNotificationManager } from "../../contexts/notifications-context/useNotifManager";
import { SkillsCanvasEngine } from "./SkillsCanvasEngine";
import type { sectionsTypes, SectionViewTypes, } from "../../types/SectionsTypes";
import type { PageCardsRefsTypes } from "../../types/PageCardsRefsTypes";
import "./SkillsPage.css";


export default function SkillsPage({
  refs,
  sectionView,
  svTransToggle,
  ToggleSectionView,
}: SectionViewTypes & {
  refs: PageCardsRefsTypes;
  svTransToggle: boolean;
}) {
  const { Notify } = useNotificationManager();
  const [inView, setInView] = useState(false);
  const [activeSkillSection, setActiveSkillSection] = useState<sectionsTypes | null>(null);
  const lastTapRef = useRef<{ time: number; section: sectionsTypes | null; } | null>(null);
  const toastEnablerRef = useRef(true);

  useEffect(() => {
    const observedElement = refs.divRef.current;
    if (!observedElement) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          console.log("Skills page is in view!");
          setInView(true);
        } else {
          console.log("Skills page left the view!");
          setInView(false);
        }
      },
      // { rootMargin: "-1px", threshold: 0 },
      { threshold: 0.85 }, // 0.65
    );

    observer.observe(observedElement);

    return () => {
      observer.unobserve(observedElement);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    console.log(activeSkillSection);
  }, [activeSkillSection]);

  function handleSectionClick(e: PointerEvent, section: sectionsTypes, runTask?: () => void) {
    const pointerType = e.pointerType;

    if (pointerType === "mouse") {
      setActiveSkillSection(section);
      ToggleSectionView({ state: true, type: section });
      if (runTask) runTask();

      return;
    }

    const now = performance.now();
    const lastTap = lastTapRef.current;

    if (
      lastTap !== null &&
      now - lastTap.time <= 700 &&
      lastTap.section === section
    ) {
      lastTapRef.current = null;

      setActiveSkillSection(section);
      ToggleSectionView({ state: true, type: section });
      if (runTask) runTask();

      return;
    }

    // first tap / too slow -> record time & show toast
    if (toastEnablerRef.current) {
      toastEnablerRef.current = false;
      Notify({ message: `Double tap to open`, duration: 1000 });
      setTimeout(() => {
        toastEnablerRef.current = true;
      }, 3000);
    }
    lastTapRef.current = { time: now, section };
  }

  return (
    <div className="page-card" ref={refs.divRef} style={{ overflow: "hidden" }}>
      <SkillsSectionsCanvas
        inView={inView}
        handleSectionClick={handleSectionClick}
        svTransToggle={svTransToggle}
        sectionView={sectionView}
      />
    </div>
  );
}

function SkillsSectionsCanvas({
  inView,
  handleSectionClick,
  svTransToggle,
  sectionView,
}: {
  inView: boolean;
  handleSectionClick: (e: PointerEvent, sec: sectionsTypes, runTask?: () => void) => void;
  svTransToggle: boolean;
  sectionView: sectionsTypes | null;
}) {
  const { theme } = useTheme();
  const { device, tier } = useDevice();

  const mainCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const uiCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const glowCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  const engineRef = useRef<SkillsCanvasEngine | null>(null);

  const rawDpr = Math.min(window.devicePixelRatio || 1, 2);
  const dpr =
    tier === "high"
      ? Math.min(rawDpr, device === "laptop" ? 2 : 1.75)
      : tier === "mid"
        ? Math.min(rawDpr, device === "laptop" ? 1.75 : 1.25) // 1.75 : 1.5
        : Math.min(rawDpr, device === "laptop" ? 1.5 : 1.15); // 1.5 : 1.25

  useEffect(() => {
    const main = mainCanvasRef.current;
    const ui = uiCanvasRef.current;
    const glow = glowCanvasRef.current;

    if (!main || !ui || !glow) return;

    const engine = new SkillsCanvasEngine(main, ui, glow, sectionView, handleSectionClick, { dpr, rawDpr, theme, device });
    engineRef.current = engine;

    const observer = new ResizeObserver((entries) => {
      if (!entries[0]) return;
      const { width, height } = entries[0].contentRect;
      engine.handleResize(width, height);
    });
    
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
      engine.destroy();
      
      if (engineRef.current === engine) {
        engineRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!engineRef.current) return; 
    engineRef.current.updateDevice(device);
  }, [device]);

  useEffect(() => {
    if (!engineRef.current) return;
    engineRef.current.updateTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (!engineRef.current) return;
    engineRef.current.updateInView(inView);
  }, [inView]);

  useEffect(() => {
    if (!svTransToggle && engineRef.current) {
      engineRef.current.handleReactSectionClose();
    }
  }, [svTransToggle]);

  return (
    <div ref={containerRef} className="skills-canvas-wrapper">
      <canvas ref={mainCanvasRef} />
      <canvas ref={uiCanvasRef} style={{ position: "absolute", top: 0, left: 0, zIndex: 1 }} />
      <canvas ref={glowCanvasRef} style={{ position: "absolute", top: 0, left: 0, zIndex: 2, pointerEvents: "none" }} />
    </div>
  );
}
