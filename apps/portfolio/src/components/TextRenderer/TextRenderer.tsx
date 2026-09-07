import type { ContentBlock } from '../../types/TextBlockContent';
import { parseWordMarkers } from '../../utilities/parseWordMarkers';
import './TextRenderer.css';

interface TextRendererProps {
  text: ContentBlock[];
  animate: boolean;
  animStartDelay?: number;
  wordAnimDuration?: number;
}

export default function TextRenderer({ text, animate, wordAnimDuration = 0.0275, animStartDelay = 0.25 }: TextRendererProps) {
  let globalWordIndex = 0;

  const renderInlineText = (content: string) => {
    return content.split(' ').map((rawWord) => {

      const currentWordIndex = globalWordIndex++;

      const { word, leadingPunct, trailingPunct, styleClasses } = parseWordMarkers(rawWord);

      return(
        <InlineWord
          key={currentWordIndex}
          word={word}
          leadingPunct={leadingPunct}
          trailingPunct={trailingPunct}
          styleClasses={styleClasses}
          animate={animate}
          animationDelay={
            animate
              ? animStartDelay + currentWordIndex * wordAnimDuration
              : undefined
          }
        />
      );
    });
  };

  return (
    <>
      {text.map(({ type, content }, index) => {

        switch (type) {

          case 'paragraph':
            return(
              <p key={index}>
                {renderInlineText(content)}
              </p>
            );

          case 'heading1':
            return(
              <h1 key={index}>
                {renderInlineText(content)}
              </h1>
            );

          case 'heading2':
            return(
              <h2 key={index}>
                {renderInlineText(content)}
              </h2>
            );

          case 'heading3':
            return(
              <h3 key={index}>
                {renderInlineText(content)}
              </h3>
            );

          case 'ulist':
            return(
              <ul key={index}>
                {content.map((line, j) => (
                  <li key={j}>
                    {renderInlineText(line)}
                  </li>
                ))}
              </ul>
            );

          case 'olist':
            return(
              <ol key={index}>
                {content.map((line, j) => (
                  <li key={j}>
                    {renderInlineText(line)}
                  </li>
                ))}
              </ol>
            );
        }
      })}
    </>
  );
}

interface InlineWordProps {
  word: string;
  leadingPunct: string;
  trailingPunct: string;
  styleClasses: string;
  animate: boolean;
  animationDelay?: number;
}

function InlineWord({ word, leadingPunct, trailingPunct, styleClasses, animate, animationDelay }: InlineWordProps) {
  return(
    <>
      <span
        className={`paragraph-word${animate ? ' animate' : ''}`}
        style={{ animationDelay: animate ? `${animationDelay}s` : undefined }}
      >
        {leadingPunct}
      </span>
      <span
        className={`paragraph-word${styleClasses}${animate ? ' animate' : ''}`}
        style={{ animationDelay: animate ? `${animationDelay}s` : undefined }}
      >
        {word}
      </span>
      <span
        className={`paragraph-word${animate ? ' animate' : ''}`}
        style={{ animationDelay: animate ? `${animationDelay}s` : undefined }}
      >
        {trailingPunct}
      </span>
      {' '}
    </>
  )
}