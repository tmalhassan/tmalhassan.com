export function parseWordMarkers(word: string): { word: string; leadingPunct: string; trailingPunct: string; styleClasses: string; } {
  if (!word) {
    return {
      word: "",
      leadingPunct: "",
      trailingPunct: "",
      styleClasses: "",
    };
  }

  const markerToClass: Record<string, string> = {
    "_": " itlc",
    "*": " bold",
    "#": " code",
    "~": " strong",
  };

  const markers = new Set(Object.keys(markerToClass));
  const isPunctuation = (char: string) =>
    ".,!?;:()[]".includes(char);

  let core = word;
  let leadingPunct = "";
  let trailingPunct = "";

  // Extract leading punctuation.
  while (core.length > 0 && isPunctuation(core[0])) {
    leadingPunct += core[0];
    core = core.slice(1);
  }

  // Extract trailing punctuation.
  while (core.length > 0 && isPunctuation(core[core.length - 1])) {
    trailingPunct = core[core.length - 1] + trailingPunct;
    core = core.slice(0, -1);
  }

  // Extract style markers.
  const classesList: string[] = [];

  while (core.length >= 2) {
    const first = core[0];

    if (!markers.has(first)) {
      break;
    }

    const lastIndex = core.lastIndexOf(first);

    if (lastIndex !== core.length - 1) {
      break;
    }

    classesList.push(markerToClass[first]);
    core = core.slice(1, -1);
  }

  return {
    word: core,
    leadingPunct: leadingPunct,
    trailingPunct: trailingPunct,
    styleClasses: classesList.join(""),
  };
}
