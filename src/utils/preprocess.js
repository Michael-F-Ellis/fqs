import { parse } from './fqs_parser.js';

// The preprocessScore function is used to parse the score input
// text and convert it into a data object with members for the title,
// preface, lyrics, expressions, cues, pitches, chords, perbars and
// postscript. The data object is returned.
export function preprocessScore(text) {
  // In stage 1, we split the fqs text into an array of score strings.
  // The 'EndOfScore' string is the delimiter.
  const scoreStrings = text.split("EndOfScore").map(s => s.trim()).filter(s => s.length > 0);

  // In stage 2, we parse each score string individually.
  const asts = scoreStrings.map((scoreStr, i) => {
      try {
          return parse(scoreStr);
      } catch (e) {
          // Enhance error with score index information
          e.message = `Error parsing score #${i + 1}:
${e.message}`;
          throw e;
      }
  });
  return asts;
}