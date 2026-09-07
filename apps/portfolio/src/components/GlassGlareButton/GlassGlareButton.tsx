import { useEffect, useRef, useState, type JSX } from "react";
import './GlassGlareButton.css';

interface GlassGlareButtonType {
  textLable?: string;
  buttonImage?: JSX.Element | string;
  buttonStyle?: React.CSSProperties;
  textStyle?: React.CSSProperties;
  imgStyle?: React.CSSProperties;
  onClickHandler: () => void;
  willAnimate: boolean;
  triggerAnim: boolean;
  animDelay: number;
  highlight?: boolean;
}

export default function GlassGlareButton({ textLable, buttonImage, buttonStyle, textStyle, imgStyle, onClickHandler, willAnimate, triggerAnim, animDelay, highlight = false }: GlassGlareButtonType) {
  const [animState, setAnimState] = useState<'waiting' | 'animating' | 'completed' | 'highlight' | 'static'>(willAnimate ? 'waiting' : 'static');
  const delayTimer = useRef<number | null>(null);
  const endTimer = useRef<number | null>(null);

  // Handle the initial fade-in trigger
  useEffect(() => {
    if (animState !== 'waiting') return;
    if (!triggerAnim) return;

    delayTimer.current = window.setTimeout(() => {
      setAnimState('animating');
    }, animDelay);

    return () => {
      if (delayTimer.current) clearTimeout(delayTimer.current);
    };
  }, [triggerAnim, animState, animDelay]);

  // Handle the animating → completed transition
  useEffect(() => {
    if (animState !== 'animating') return;

    endTimer.current = window.setTimeout(() => {
      setAnimState(highlight ? 'highlight' : 'completed');
    }, 500);

    return () => {
      if (endTimer.current) clearTimeout(endTimer.current);
    };
  }, [animState]);

  function MarkCompleted() {
    if (animState !== 'highlight') return;
    
    setAnimState('completed');
  }

  return(
    <div className={`glass-button-wrapper`} data-animstate={animState} style={buttonStyle}>
      <button onClick={() => {MarkCompleted(); onClickHandler()}}>
        {textLable &&
          <span style={textStyle}>{textLable}</span>
        }
        {typeof buttonImage === 'string' ?
          <img src={buttonImage} alt="" style={imgStyle}/>
          :
          <>{buttonImage}</>
        }
      </button>
      <div className='gb-glare-group'>
        <div className='gb-glare'/>
        <div className='gb-glare'/>
        <div className='gb-glare'/>
      </div>
    </div>
  )
}