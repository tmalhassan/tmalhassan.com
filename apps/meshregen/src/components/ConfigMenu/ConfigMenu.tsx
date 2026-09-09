import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import BackArrow from '../SVGComponents/BackArrow';
import { useDevice } from '../../contexts/device-context/useDevice';
import { SVGS_DATA } from '../../data/SVGsData';
import type { SVGNames } from '../../types/SVGDataTypes';
import type { DebugAction, DebugChildField, debugState } from '../../types/DebugToolTypes';
import './ConfigMenu.css';
import './ConfigSliders.css'

const subOptions: DebugChildField[] = [
  'outerBuffer',
  'innerBuffer',
  'centroids',
  'neighbors',
  'clipRegions',
];

const DEBUG_TOOL_TITLES: Record<DebugChildField, string> = {
  clipRegions: 'Clip regions',
  innerBuffer: 'Inner buffer',
  outerBuffer: 'Outer buffer',
  centroids: 'Centroids',
  neighbors: 'Neighbors',
}

interface ConfigMenuProps {
  spacing: number,
  setSpacing: Dispatch<SetStateAction<number>>,

  offsetMultiplier: number,
  setOffsetMultiplier: Dispatch<SetStateAction<number>>,

  selectedSVG: SVGNames,
  setSelectedSVG: Dispatch<SetStateAction<SVGNames>>,

  uploadedSVG: File | undefined,
  setUploadedSVG: Dispatch<SetStateAction<File | undefined>>,

  colorsActive: boolean,
  setColorsActive: Dispatch<SetStateAction<boolean>>,

  debugTools: debugState,
  debugDispatch: React.ActionDispatch<[action: DebugAction]>
}

export default function ConfigMenu({ 
  spacing, 
  setSpacing, 
  offsetMultiplier, 
  setOffsetMultiplier, 
  selectedSVG, 
  setSelectedSVG, 
  uploadedSVG, 
  setUploadedSVG, 
  debugTools, 
  debugDispatch,
  colorsActive,
  setColorsActive
}: ConfigMenuProps) {
  const { device } = useDevice();
  const [isActive, setIsActive] = useState(device === 'laptop');
  const [selectMenuState, setSelectMenuState] = useState<{ expand: boolean; height: string }>({ expand: false, height: `13em` });
  const [debugMenuHeight, setDebugMenuHeight] = useState<string>(`0px`);

  const svgSelectWrapperRef = useRef<HTMLDivElement | null>(null);
  const svgSelectMenuRef = useRef<HTMLDivElement | null>(null);

  const debugMenuWrapperRef = useRef<HTMLDivElement | null>(null);
  const debugMenuRef = useRef<HTMLDivElement | null>(null);

  const getCalculatedHeight = (targetRectHeight: number, wrapperElement: HTMLDivElement) => {
    const style = getComputedStyle(wrapperElement);
    // console.log(wrapperElement, `marginTop`, style.marginTop, `marginBottom`, style.marginBottom);
    return targetRectHeight + parseFloat(style.marginTop) + parseFloat(style.marginBottom);
  };

  useEffect(() => {
    let resizeRafId: number | null = null;
    const svgsWrapper = svgSelectWrapperRef.current;
    const svgsMenu = svgSelectMenuRef.current;
    const debugWrapper = debugMenuWrapperRef.current;
    const debugMenu = debugMenuRef.current;

    if (!svgsWrapper || !svgsMenu || !debugWrapper || !debugMenu) return;

    const resizeObs = new ResizeObserver((entries) => {
      if (resizeRafId) return;

      resizeRafId = requestAnimationFrame(() => {
        entries.forEach((entry) => {
          switch (entry.target) {
            case svgsMenu:
              setSelectMenuState((curr) => ({ 
                ...curr, 
                height: `${getCalculatedHeight(entry.contentRect.height + 20, svgsWrapper)}px`
              }));
              break;

            case debugMenu:
              setDebugMenuHeight(`${getCalculatedHeight(entry.contentRect.height, debugWrapper)}px`);
              break;

            default:
              return;
          }
        });

        resizeRafId = null;
      });
    });

    resizeObs.observe(svgsMenu);
    resizeObs.observe(debugMenu);

    return () => {
      resizeObs.disconnect();
      if (resizeRafId) cancelAnimationFrame(resizeRafId);
    };
  }, []);

  return(
    <>
      <div className='config-menu' data-isactive={isActive}>
        {device !== 'laptop' && 
          <button className='show-hide-button' data-isactive={isActive} onClick={() => setIsActive(!isActive)}>
            <BackArrow />
          </button>
        }
        <div className='config-menu-content'>
          <div className='config-menu-section observed' ref={svgSelectWrapperRef} style={{ maxHeight: selectMenuState.expand ? selectMenuState.height : `13em` }}>
            <div className='svg-select-menu' ref={svgSelectMenuRef}>
              {Object.entries(SVGS_DATA).map(([name, svg], id) => (
                <SVGImageButton
                  key={`${name}-${id}`}
                  pathDs={svg.paths}
                  size={{ width: 1024, height: 1024 }}
                  isActive={selectedSVG === name}
                  onClickAction={() => setSelectedSVG(name as SVGNames)}
                />
              ))}
            </div>
            <button className='show-hide-button' data-isactive={selectMenuState.expand} onClick={() => setSelectMenuState((curr) => ({ ...curr, expand: !curr.expand }))}>
              <BackArrow />
            </button>
          </div>
          <div className='config-menu-section'>
            <ConfigSlider
              id='spacing-slider'
              title='Spacing'
              value={spacing}
              min={1}
              max={10}
              step={0.25}
              onChangeAction={(newValue) => setSpacing(newValue)}
            />
            <ConfigSlider
              id='offset-slider'
              title='offset'
              value={offsetMultiplier}
              min={1}
              max={10}
              step={0.25}
              onChangeAction={(newValue) => setOffsetMultiplier(newValue)}
            />
            <ConfigToggle
              id='colors-toggle'
              title='Show colors'
              value={(colorsActive && SVGS_DATA[selectedSVG].src) ? 1 : 0}
              onChangeAction={(newValue) => setColorsActive(newValue !== 0)}
            />
            <ConfigToggle
              id='debug-toggle'
              title='Enable debug'
              value={debugTools.enableDebug ? 1 : 0}
              onChangeAction={() => debugDispatch({ type: 'TOGGLE_MASTER' })}
            />
          </div>
          <div className='config-menu-section observed' ref={debugMenuWrapperRef} style={{ maxHeight: debugTools.enableDebug ? debugMenuHeight : `0px` }}>
            <div className='debug-tools-menu' ref={debugMenuRef}>
              {subOptions.map((tool) => {
                const isEnabled = debugTools[tool];

                return <ConfigToggle 
                  key={tool}
                  id={`${tool}-toggle`}
                  title={DEBUG_TOOL_TITLES[tool]}
                  value={isEnabled ? 1 : 0}
                  onChangeAction={() => debugDispatch({ type: 'TOGGLE_CHILD', field: tool })}
                />
              })}
            </div>
          </div>
        </div>
      </div>
      {device !== 'laptop' && <div className='filler' data-isactive={isActive} />}
    </>
  )
}

function SVGImageButton({ pathDs, size, isActive, onClickAction }: { pathDs: string[]; size: { width: number, height: number }, isActive: boolean, onClickAction: () => void }) {
  return(
    <button className='svg-menu-item' data-isactive={isActive} onClick={onClickAction}>
      <svg 
        viewBox={`0 0 ${size.width} ${size.height}`} 
        fill="none" 
        stroke="white" 
        strokeWidth={5} 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      >
        {pathDs.map((pathD, id) => 
          <path key={id} d={pathD}/>
        )}
      </svg>
    </button>
  )
}

function ConfigSlider({ 
  id, 
  title,
  value, 
  min, 
  max, 
  step, 
  onChangeAction 
}: { 
  id: string, 
  title: string,
  value: number, 
  min: number, 
  max: number, 
  step: number, 
  onChangeAction: (val: number) => void;
}) {
  return (
    <div className='config-item-container'>
      <span>{`${title}:`}</span>
      <div className='config-slider'>
        <input 
          className='styled-slider'
          type="range" 
          id={id} 
          value={value} 
          min={min} 
          max={max} 
          step={step} 
          onChange={(e) => onChangeAction(Number(e.target.value))}
        />
      </div>
      <span>{value}</span>
    </div>
  )
}

function ConfigToggle({ 
  id, 
  title,
  value, 
  onChangeAction 
}: { 
  id: string, 
  title: string,
  value: number, 
  onChangeAction: (val: number) => void;
}) {
  const didChangeValue = useRef(false);

  return (
    <div className='config-item-container'>
      <span>{title}</span>
      <div className='config-toggle'>
        <input 
          className='styled-toggle'
          data-isactive={value === 1}
          type="range" 
          id={id} 
          value={value} 
          min={0} 
          max={1} 
          step={1} 
          onChange={(e) => {
            onChangeAction(Number(e.target.value));
            didChangeValue.current = true;
          }}
          onPointerUp={() => {
            if (!didChangeValue.current) {
              const toggledValue = value === 0 ? 1 : 0;
              onChangeAction(toggledValue);
            }
            didChangeValue.current = false;
          }}
          style={{ touchAction: 'none' }}
        />
        <div className='smooth-thumb-visual' />
      </div>
    </div>
  )
}
