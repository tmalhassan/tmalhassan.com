import { useEffect } from 'react';
import TextRenderer from '../TextRenderer/TextRenderer';
import './IncompleteSection.css';

export function IncompleteSection() {
  return(
    <div className="incomplete-section">
      <TextRenderer
        text={[
          {
            type: "heading2",
            content: `_*Cue_ _cricket_ _sounds...*_`
          },
          {
            type: "paragraph",
            content: `_Pardon_ _the_ _dust!_ _I'm_ _still_ _working_ _on_ _this_ _section._ _I_ _will_ _update_ _it_ _as_ _soon_ _as_ _it's_ _ready,_ _promise!_`
          }
        ]}
        animate={true}
      />
    </div>
  )
}

interface IncompleteOverlayProps {
  infoDialogRef: React.RefObject<HTMLDialogElement | null>;
  setInfoOverlayActive: React.Dispatch<React.SetStateAction<boolean>>;
}

export function IncompleteOverlay({ infoDialogRef, setInfoOverlayActive }: IncompleteOverlayProps) {
  useEffect(() => {
    infoDialogRef.current?.showModal();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      CloseDialog();
    };

    window.addEventListener("scroll", handleScroll, { passive: true, capture: true });
    
    return () => {
      window.removeEventListener("scroll", handleScroll, { capture: true });
    };
  }, []);

  function CloseDialog() {
    infoDialogRef.current?.setAttribute('data-isactive', 'false');

    setTimeout(() => {
      setInfoOverlayActive(false);
    }, 300);
  }

  return(
    <dialog className='info-dialog' ref={infoDialogRef} data-isactive={true} onClick={(e) => {if (e.currentTarget === e.target) CloseDialog()}}>
      <div className="info-dialog-content">
        <TextRenderer
          text={[
            {
              type: "heading2",
              content: `_Under_ _Development_`
            },
            {
              type: "paragraph",
              content: `Thanks for stopping by! I am still working on bringing this portfolio to life with custom animations and new features. If you spot an empty corner or a rough edge, it just means I am still polishing it. Check back soon to see it evolve!`
            }
          ]}
          animate={false}
        />
      </div>
    </dialog>
  )
}