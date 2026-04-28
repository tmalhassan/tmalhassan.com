import './AnimateText.css';

interface AnimateTextType {
  type: 'title' | 'paragraph';
  text: string[];
  animStartDelay?: number;
  wordAnimDuration?: number;
}

export default function AnimateText({ type, text, wordAnimDuration, animStartDelay }: AnimateTextType) {
  const ANIM_DELAY = animStartDelay || 0.25;
  const WORD_ANIM_DURATION =  wordAnimDuration || 0.0275;
  const timeOffset = (() => {
    let total = 0;

    text[0].split(' ').forEach(() => {
      total += WORD_ANIM_DURATION;
    });

    return total;
  })();

  function parseWordMarkers(word: string): { word: string; punctuation: string; styleClasses: string } {
    if (!word) return { word: "", punctuation: "", styleClasses: "" };

    const punctMatch = word.match(/[.,!?;:]$/);
    const punctuation = punctMatch ? punctMatch[0] : "";
    let core = punctuation ? word.slice(0, -1) : word;

    const markerToClass: Record<string, string> = {
      "_": " itlc",
      "*": " bold",
      "#": " code",
    };

    const markers = new Set(["_", "*", "#"]);
    const classesList: string[] = [];

    while (core.length >= 2) {
      const first = core[0];
      if (!markers.has(first)) break;

      const lastIndex = core.lastIndexOf(first);

      if (lastIndex === core.length - 1) {
        classesList.push(markerToClass[first]);
        core = core.slice(1, -1); // remove the outer pair and continue
      } else {
        break;
      }
    }

    const styleClasses = classesList.join(""); // already include leading spaces
    return { word: core, punctuation, styleClasses };
  }

  return(
    <>
    {text.map((paragraph, pIndex) => (
      type === 'paragraph' ?
        <p key={pIndex}>
          {paragraph.split(' ').map((rawWord, i) => {
            const { word, punctuation, styleClasses } = parseWordMarkers(rawWord);

            return(
              <span
                key={`${pIndex}-${i}`}
                className={`paragraph-word${styleClasses}`}
                style={{ animationDelay: `${(WORD_ANIM_DURATION * i) + ANIM_DELAY + (pIndex * timeOffset)}s` }}
              >
                {word}{punctuation}&nbsp;
              </span>
            )
          })}
        </p>
      :
        <h1 key={pIndex}>
          {paragraph.split(' ').map((rawWord, i) => {
            const { word, punctuation, styleClasses } = parseWordMarkers(rawWord);

            return(
              <span
                key={`${pIndex}-${i}`}
                className={`paragraph-word${styleClasses}`}
                style={{ animationDelay: `${(WORD_ANIM_DURATION * i) + ANIM_DELAY + (pIndex * timeOffset)}s` }}
              >
                {word}{punctuation}&nbsp;
              </span>
            )
          })}
        </h1>
    ))}
    </>
  )
}