import './WebDevPage.css';
import gjkl from '../../assets/pages/web-dev-page/devices-mockup.webp';
import React, { useEffect, useRef, useState, type Dispatch, type ReactNode, type RefObject, type SetStateAction } from 'react';
import BackArrow from '../SVGs/BackArrow';
import { useTheme } from '../../contexts/theme-context/useTheme';
// import Noise from 'noisejs';
import { Noise } from "noisejs";
import clamp from '../../utilities/clamp';
import GlassGlareButton from '../GlassGlareButton/GlassGlareButton';
import TailArrow from '../SVGs/TailArrow';
import lerpHue from '../../utilities/lerpHue';
import lerp from '../../utilities/lerp';
import AnimateText from '../AnimateText/AnimateText';
import { LogoShatter } from '../SectionView/SectionView';

// type toolbarCategories = 'front-end' | 'back-end' | 'npm' | 'design';
// type toolbarOptions = {
//   'front-end': frontendOptions;
//   'back-end': backendOptions;
//   npm: npmOptions;
//   design: designOptions;
// };

// type frontendOptions = 'JavaScript' | 'HTML' | 'CSS' | 'TypeScript' | 'React' | 'C#' | 'Unity';
// type backendOptions = 'Node.js' | 'Express' | 'MySQL' | 'GameSparks';
// type npmOptions = 'Multer' | 'Sharp' | 'Bcrypt' | 'CORS' | 'Axios' | 'Immer';
// type designOptions = 'Adobe Illustrator' | 'Adobe Photoshop' | 'Adobe Audition' | 'Adobe After Effects';

// const TOOLBAR_OPTIONS: { [K in toolbarCategories]: Record<toolbarOptions[K], string>; } = {
//   "front-end": {
//     JavaScript: '',
//     HTML: '',
//     CSS: '',
//     TypeScript: '',
//     React: '',
//     "C#": '',
//     'Unity': ''
//   },
//   "back-end": {
//     'Node.js': '',
//     'Express': '',
//     'MySQL': '',
//     'GameSparks': ''
//   },
//   npm: {
//     'Multer': '',
//     'Sharp': '',
//     'Bcrypt': '',
//     'CORS': '',
//     'Axios': '',
//     'Immer': ''
//   },
//   design: {
//     'Adobe Illustrator': '',
//     'Adobe Photoshop': '',
//     'Adobe Audition': '',
//     'Adobe After Effects': ''
//   }
// }


interface WebDevPageType {
  sectionViewPageRef: React.RefObject<HTMLDivElement | null>;
  activeProject: 'alura' | 'hairday' | 'starleap';
  setActiveProject: Dispatch<SetStateAction<'alura' | 'hairday' | 'starleap'>>;
  setProjectInView: Dispatch<SetStateAction<boolean>>;
}


export default function WebDeveloperPage({ sectionViewPageRef, activeProject, setActiveProject, setProjectInView }: WebDevPageType) {
  const { theme } = useTheme();
  const projectsWrapperRef = useRef<HTMLDivElement | null>(null);

  // useEffect(() => {
  //   let resizeRafId: number | null = null;

  //   const onResize = () => {
  //     if (resizeRafId) return;
  
  //     resizeRafId = requestAnimationFrame(() => {
        
        
  //       resizeRafId = null;
  //     });
  //   }

  //   window.addEventListener('resize', onResize, { passive: true });

  //   return () => {
  //     window.removeEventListener('resize', onResize);
  //     if (resizeRafId) cancelAnimationFrame(resizeRafId);
  //   }
  // }, []);

  useEffect(() => {
    const projWrapElement = projectsWrapperRef.current;
    if (!projWrapElement) return;

    const observer = new IntersectionObserver(([entry], obs) => {
      if (entry.isIntersecting) {
        console.log('Projects container fully is in view!');
        
        setProjectInView(true);
        // obs.unobserve(projWrapElement);
      } else {
        setProjectInView(false);
      }
    }, {rootMargin : '0% 0% -80% 0%', threshold : 0}); // 
    
    observer.observe(projWrapElement);
    return () => observer.disconnect();
  }, []);

  function onClickAction(targetProject: 'alura'| 'hairday') {
    if (targetProject === activeProject) return;

    setActiveProject(targetProject);
  }

  function ScrollToProjects() {
    // projectsWrapperRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });

    const el = projectsWrapperRef.current;
    if (!el) return;

    const offset = 40; // whatever you want
    const top = el.offsetTop - offset;

    sectionViewPageRef.current?.scrollTo({ top, behavior: "smooth" });
  }

  return(
    <div className="web-page">
      <div className='wp-header'>
        {/* <NeuralBlob activeProject={activeProject}/> */}
        <LogoShatter activeProject={activeProject}/>
        <AnimateText
          type='title'
          text={[`A spark of curiosity that turned into _passion_.`]}
        />
        <div className='wp-p-wrapper'>
          <p>From a small calculator in <code>Visual Basic</code> to building fully functioning applications with <code>C#</code> and <code>JavaScript</code>. My love for coding only grows by the day.</p>
          <p>{"In addition to this portfolio, here's a curated selection of the projects I've built."}</p>

          {/* <AnimateText
            type='paragraph'
            text={[
              `From a small calculator in #Visual Basic# to building fully functioning applications with #C## and #JavaScript#. My love for coding only grows by the day.`,
              `In addition to this portfolio, here's a curated selection of the projects I've built.`
            ]}
            animStartDelay={0.5}
          /> */}
        </div>
        <GlassGlareButton textLable='Jump right in!'
          buttonImage={<TailArrow stroke={theme === 'dark' ? '#ffffff' : 'rgba(77, 77, 77, 1)'}/>}
          buttonStyle={{ marginTop: '2em' }}
          onClickHandler={ScrollToProjects}
          willAnimate={true}
          triggerAnim={true}
          animDelay={750}
        />
      </div>
      <div className='wp-projects-wrapper' ref={projectsWrapperRef}>
        <div className='wp-project-buttons-container'>
          <button data-isactive={activeProject === 'alura'} onClick={() => onClickAction('alura')}>Alura</button>
          <button data-isactive={activeProject === 'hairday'} onClick={() => onClickAction('hairday')}>Hair day</button>
          <div className='wp-project-buttons-container-glass-overlay'/>
        </div>
        <div className='wp-project-preview-container'>
          <FeatureSectionWithImage
            title={`A User Friendly, Responsive Design`}
            image={gjkl}
            shortDesc={`Whether you're traveling or working from your desktop, manage products and orders effortlessly from any device. The admin panel was built to adapt to any screen size — phone, tablet, or laptop — while maintaining a clean layout and consistent performance. You can even switch between light and dark themes at any moment for a personalized experience.`}
            fullDesc={<FullDesc1/>}
          />
          <FeatureSectionWithImage
            title={`Product Management & Inventory Control`}
            image={gjkl}
            shortDesc={`Easily manage every aspect of your store's products — from titles and prices to stock levels and images — all in one place. Add, edit, or remove products with confidence, knowing every change is synced across your system in real time. The inventory automatically updates when sales occur, helping you stay organized and avoid overselling.`}
            fullDesc={<FullDesc2/>}
          />
        </div>
      </div>
      
    </div>
  )
}

function NeuralBlob({ activeProject }: { activeProject: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // runtime refs (no rerenders)
  const isVisibleRef = useRef(true);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const tRef = useRef<number>(0);
  const fadeInRef = useRef<number>(750);

  // Noise
  const noiseRef = useRef(new Noise(Math.random()));

  const PROJECT_COLORS: Record<string, { top: { h: number; s: number; l: number }; bottom: { h: number; s: number; l: number } }> = {
    alura: {
      top: { h: 290, s: 90, l: 78 },
      bottom: { h: 233, s: 100, l: 65 },
    },
    hairday: {
      top: { h: 9, s: 75, l: 75 },
      bottom: { h: -34, s: 83, l: 74 },
    },
  };

  // Color transition state:
  const startTopRef = useRef({ ...PROJECT_COLORS.alura.top });
  const startBottomRef = useRef({ ...PROJECT_COLORS.alura.bottom });
  const targetTopRef = useRef({ ...PROJECT_COLORS.alura.top });
  const targetBottomRef = useRef({ ...PROJECT_COLORS.alura.bottom });
  const colorLerpRef = useRef(1); // 0..1
  const COLOR_TRANSITION_TIME = 1; // seconds (you asked to restore 1.5s)

  // Init target to current activeProject
  useEffect(() => {
    const pal = PROJECT_COLORS[activeProject];
    startTopRef.current = { ...pal.top };
    startBottomRef.current = { ...pal.bottom };
    targetTopRef.current = { ...pal.top };
    targetBottomRef.current = { ...pal.bottom };
    colorLerpRef.current = 1;
  }, []); // run once

  // When project changes: set start = current interp color, set target = new palette, restart lerp
  useEffect(() => {
    const pal = PROJECT_COLORS[activeProject];

    // compute current instantaneous color (where we are now) to start from
    const tNow = clamp(colorLerpRef.current, 0, 1);
    const curTop = {
      h: lerpHue(startTopRef.current.h, targetTopRef.current.h, tNow),
      s: lerp(startTopRef.current.s, targetTopRef.current.s, tNow),
      l: lerp(startTopRef.current.l, targetTopRef.current.l, tNow),
    };
    const curBottom = {
      h: lerpHue(startBottomRef.current.h, targetBottomRef.current.h, tNow),
      s: lerp(startBottomRef.current.s, targetBottomRef.current.s, tNow),
      l: lerp(startBottomRef.current.l, targetBottomRef.current.l, tNow),
    };

    // set the start to current, set target to new palette, restart lerp
    startTopRef.current = curTop;
    startBottomRef.current = curBottom;
    targetTopRef.current = { ...pal.top };
    targetBottomRef.current = { ...pal.bottom };
    colorLerpRef.current = 0;
  }, [activeProject]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // resize
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // build points
    interface Point { phi: number; theta: number; }
    const POINTS: Point[] = [];
    const RADIUS = 180;
    const NOISE_SCALE = 3.5;
    const NOISE_AMPLITUDE = 50;

    for (let phi = 0; phi < Math.PI; phi += 0.065) {
      for (let theta = 0; theta < Math.PI * 2; theta += 0.065) {
        POINTS.push({ phi, theta });
      }
    }

    const project = (coords: [number, number, number]) => {
      const [x, y, z] = coords;
      const scale = clamp(canvas.width / 2, 300, 400) / (275 + z); // clamp(canvas.width / 2, 275, 400) / (275 + z);
      return [canvas.width / 2 + x * scale, canvas.height / 2 + y * scale, scale] as [number, number, number];
    };

    // IntersectionObserver - pause when offscreen
    const observer = new IntersectionObserver(
      (entries) => {
        const vis = entries[0]?.isIntersecting ?? true;
        isVisibleRef.current = vis;
        if (vis) {
          lastTimeRef.current = performance.now();
          if (rafRef.current == null) {
            rafRef.current = requestAnimationFrame(loop);
          }
        } else {
          if (rafRef.current != null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
          }
        }
      },
      { threshold: 0.01 }
    );
    observer.observe(canvas);

    // main loop defined as function declaration so observer can reference it above
    function loop(now: number) {
      if (!isVisibleRef.current) {
        rafRef.current = null;
        return;
      }

      if (!canvas || !ctx) return;

      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      // advance animation time and fade/timers
      tRef.current += dt * 0.5;
      fadeInRef.current -= 65 * dt;

      // advance color lerp
      if (colorLerpRef.current < 1) {
        colorLerpRef.current = clamp(colorLerpRef.current + dt / COLOR_TRANSITION_TIME, 0, 1);
      }

      // Compute current interpolated palette (start -> target) for this frame
      const tCol = clamp(colorLerpRef.current, 0, 1);
      const startTop = startTopRef.current;
      const startBot = startBottomRef.current;
      const targetTop = targetTopRef.current;
      const targetBot = targetBottomRef.current;

      const currTop = {
        h: lerpHue(startTop.h, targetTop.h, tCol),
        s: lerp(startTop.s, targetTop.s, tCol),
        l: lerp(startTop.l, targetTop.l, tCol),
      };
      const currBot = {
        h: lerpHue(startBot.h, targetBot.h, tCol),
        s: lerp(startBot.s, targetBot.s, tCol),
        l: lerp(startBot.l, targetBot.l, tCol),
      };
      
      ctx.clearRect(0, 0, canvas.width, canvas.height); // clear for fresh draw
      
      // first draw subtle global glow using current top color (smoothly transitions)
      {
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const glowRadius = RADIUS * 2.5;
        const gradient = ctx.createRadialGradient(cx, cy, RADIUS * 0.4, cx, cy, glowRadius);

        // convert hsla to rgba-ish for stops: we can use hsla string with alpha
        const glowColor = `hsla(${currBot.h}, ${currBot.s}%, ${currBot.l}%, 0.12)`;
        gradient.addColorStop(0, glowColor);
        gradient.addColorStop(1, "rgba(0,0,0,0)");
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      
      // draw particles
      for (const p of POINTS) {
        // noise displacement
        let r = RADIUS;
        const n = noiseRef.current.perlin3(
          Math.sin(p.theta) * NOISE_SCALE + tRef.current,
          Math.cos(p.phi) * NOISE_SCALE + tRef.current,
          tRef.current
        );
        r += n * NOISE_AMPLITUDE;

        // spherical -> cartesian
        const x = r * Math.sin(p.phi) * Math.cos(p.theta);
        const y = r * Math.cos(p.phi);
        const z = r * Math.sin(p.phi) * Math.sin(p.theta);

        // rotation
        const rotY = 0.4 * tRef.current;
        const rotX = 0.3 * tRef.current;

        const x1 = x * Math.cos(rotY) - z * Math.sin(rotY);
        const z1 = x * Math.sin(rotY) + z * Math.cos(rotY);

        const y1 = y * Math.cos(rotX) - z1 * Math.sin(rotX);
        const z2 = y * Math.sin(rotX) + z1 * Math.cos(rotX);

        // project
        const [px, py, scale] = project([x1, y1, z2]);

        // radial fade-in
        const dx = px - canvas.width / 2;
        const dy = py - canvas.height / 2;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = RADIUS * (0.5 + (clamp(canvas.width / 2, 300, 400) / RADIUS)) * clamp(fadeInRef.current / 750, 0, 1); // 3 laptop - 2 mobile.       // Math.min((canvas.width / RADIUS), 3)
        const radial = Math.pow(Math.min(dist / (maxDist || 1), 1), fadeInRef.current / 25);


        // depth & height normalized
        const depth = ((z2 * 2) + RADIUS) / (2 * RADIUS);
        const height = (y1 + RADIUS) / (2 * RADIUS);

        // tuning: how much height vs depth contributes to the main color mix
        const HEIGHT_WEIGHT = 0.4;
        const DEPTH_WEIGHT = 1;

        // compute a single mix value biased toward depth
        let mix = height * HEIGHT_WEIGHT + depth * DEPTH_WEIGHT;
        mix = Math.max(0, Math.min(1, mix)); // clamp 0..1

        // interpolate color between current top & bottom using mix
        let h = lerpHue(currBot.h, currTop.h, mix);
        let s = lerp(currBot.s, currTop.s, mix);
        let l = lerp(currBot.l, currTop.l, mix);

        // optional: extra subtle depth-based tweak for a little forward/back shift
        // This is small — depth centered at 0.5, positive pushes frontwards slightly
        const DEPTH_H = 6;  // hue tweak range
        const DEPTH_S = 12;  // saturation tweak range
        const DEPTH_L = 2;  // lightness tweak range

        h += ((depth * 2) - 0.5) * DEPTH_H;
        s += (depth - 0.5) * DEPTH_S;
        l += (depth - 0.5) * DEPTH_L;

        const alpha = radial * (0.2 + depth * 0.8);

        if (alpha <= 0) continue;

        ctx.fillStyle = `hsla(${h}, ${s}%, ${l}%, ${alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, 2 * scale, 0, Math.PI * 2);
        ctx.fill();
      }

      // schedule next frame
      rafRef.current = requestAnimationFrame(loop);
    } // end loop

    // start
    lastTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(loop);

    // cleanup
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      observer.disconnect();
    };
  }, []); // run once

  return <canvas ref={canvasRef} className="wp-neural-blob-canvas" />;
}


interface FeatureSectionType {
  title: string;
  shortDesc: string;
  fullDesc: ReactNode;
}

function FeatureSectionWithImage({ title, shortDesc, fullDesc, image }: FeatureSectionType & { image: string }) {
  const { theme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [height, setHeight] = useState(0);
  const [animate, setAnimate] = useState(false);
  const fullDescRef = useRef<HTMLDivElement | null>(null);
  const sectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let resizeRafId: number | null = null;
    const intersecObservedEl = sectionRef.current;
    const resizeObservedEl = fullDescRef.current;

    if (!resizeObservedEl || !intersecObservedEl) return;

    const resizeObs = new ResizeObserver(() => {
      if (resizeRafId) return;
      
      resizeRafId = requestAnimationFrame(() => {
        const style = getComputedStyle(resizeObservedEl);
        const calcHeight = resizeObservedEl.getBoundingClientRect().height + parseFloat(style.marginTop) + parseFloat(style.marginBottom);
        // console.log(observedElement.style.marginTop, observedElement.style.marginBottom)
        setHeight(calcHeight);

        resizeRafId = null;
      });
    });


    const intersecObs = new IntersectionObserver(([entry], obs) => {
      if (entry.isIntersecting) {
        console.log('section is in view... animate!');
        
        setAnimate(true);
        obs.unobserve(intersecObservedEl);
      }
    }, {rootMargin : '0% 0% -25% 0%', threshold : 0}); // 


    intersecObs.observe(intersecObservedEl);
    resizeObs.observe(resizeObservedEl);

    return () => {
      intersecObs.disconnect();
      resizeObs.disconnect();
      if (resizeRafId) cancelAnimationFrame(resizeRafId);
    };
  }, []);

  return(
    <div className={`project-preview-section${animate ? ' animate' : ''}`} ref={sectionRef}>
      <div className='pp-section-part'>
        <h3 className='pp-section-title'>{title}</h3>
        <p>{shortDesc}</p>
        <div style={{ maxHeight: isCollapsed ? 0 : height, transition: "max-height 0.2s ease-in-out", overflow: 'hidden', display: 'grid' }}>
          <div ref={fullDescRef}>{fullDesc}</div>
        </div>
        <button className='pp-show-hide-button' onClick={() => setIsCollapsed(prev => !prev)}>
          <span>{'Technical details'}</span>
          <span className='pp-show-hide-img' data-iscollapsed={isCollapsed}>
            <BackArrow stroke={theme === 'dark' ? 'white' : '#353535'}/>
          </span>
        </button>
      </div>
      {/* <div className='pp-parts-gap' /> */}
      <div className='pp-section-part' >
        <img src={image} loading='lazy' alt="" />
      </div>
    </div>
  )
}

function FeatureSection({ title, shortDesc, fullDesc }: FeatureSectionType) {
  return(
    <>
    </>
  )
}





function FullDesc1() {
  return(
    <>
    <p>{"Under the hood, this design relies on modern CSS techniques and responsive layout practices to ensure both visual consistency and maintainability:"}</p>
    <ul className='pp-full-desc-ul'>
      <li>
        <p>
          <strong>Fluid & Adaptive Layouts:</strong> Built using flexible units (<code>vw</code>, <code>vh</code>, <code>rem</code>, <code>%</code>) instead of fixed pixels, allowing elements to resize naturally across screen widths.
        </p>
      </li>
      <li>
        <p>
          <strong>Media Queries:</strong> Used to fine-tune breakpoints and optimize the layout for different devices.
        </p>
      </li>
      <li>
        <p>
          <strong>CSS Grid & Flexbox:</strong> Combined to create complex yet adaptable structures with minimal markup and clean responsiveness.
        </p>
      </li>
      <li>
        <p>
          <strong>Theming with CSS Variables:</strong> A global color palette is defined through <code>:root</code> variables, enabling instant theme switching and consistent colors across the app.
        </p>
      </li>
      <li>
        <p>
          <strong>Dark/Light Mode Toggle:</strong> Implemented by dynamically toggling a <code>data-theme</code> attribute on the root element... no page reloads required.
        </p>
      </li>
    </ul>
    </>
  )
}

function FullDesc2() {
  return(
    <>
    <p>{"Designed for scalability and accuracy, the system relies on a clean database structure and efficient update logic to keep product data consistent:"}</p>
    <ul className='pp-full-desc-ul'>
      <li>
        <p>
          <strong>Relational Database Structure:</strong> Products, stock, and variant tables are linked through foreign keys for clean, modular organization.
        </p>
      </li>
      <li>
        <p>
          <strong>Atomic Transactions:</strong> <code>MySQL</code> transactions ensure all submitted data is updated together (<code>commit</code>) or fully (<code>rollback</code>) on error.
        </p>
      </li>
      <li>
        <p>
          <strong>Smart Data Diffing:</strong> A change-detection system compares the current product-object state with the original data and sends only the modified fields... reducing payloads and minimizing server processes.
        </p>
      </li>
      <li>
        <p>
          <strong>Reactive Data Validation:</strong> Ensuring users enter correct data types and formats. Errors are reflected in the UI, preventing invalid submissions to the server.
        </p>
      </li>
      <li>
        <p>
          <strong>Secure Server Logic:</strong> Parameterized queries and strict backend validation prevent invalid data and SQL injection, with automatic rollback on any structural inconsistencies.
        </p>
      </li>
      <li>
        <p>
          <strong>Efficient Image Handling:</strong> Images are pre-processed on the client, stored temporarily in memory using <code>Multer</code>, finalized with <code>Sharp</code>, and written only after a successful database transaction.
        </p>
      </li>
      <li>
        <p>
          <strong>Version Conflict Detection:</strong> Prevents admins from overwriting each other's changes by alerting users when data is modified during editing.
        </p>
      </li>
    </ul>
    </>
  )
}