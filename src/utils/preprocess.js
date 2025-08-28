import { normalizeBarlines } from "./textrender.js";
import { lineProblems } from "../classes/LineProblem.js";

// splitFirst splits a string on the supplied separator and returns
// a two-element array of strings containing the part that preceded the
// separator and the remainder of the string, e.g.
//   splitFirst('foo: bar: blah, blah', ': ') --> ['foo', 'bar: blah, blah']
// If the separator is not present, splitFirst returns an empty string
// for the first element and the entire string as the remainder, e.g.
//   splitFirst('no colons here', ': ') --> ['', 'no colons here']
function splitFirst(str, separator) {
  const separatorIndex = str.indexOf(separator);
  if (separatorIndex === -1) {
    return ["", str];
  }
  return [str.slice(0, separatorIndex), str.slice(separatorIndex + separator.length)];
}

function reconstructHeader(data) {
  let header = `title: ${data.title}\n`;
  if (data.zoom) header += `zoom: ${data.zoom}\n`;
  if (data.staff) header += `staff: ${data.staff}\n`;
  if (data.youtubeId) header += `youtube: ${data.youtubeId}\n`;
  if (data.midi_params) {
    header += `midi: tempo=${data.midi_params.tempo}, ref=${data.midi_params.ref}, roll=${data.midi_params.roll}\n`;
  }
  header += data.showIntervals ? `intervals: on\n` : `intervals: off\n` // default to off
  header += data.layout ? `layout: ${data.layout}\n` : `layout: auto\n`; // default to auto
  return header;
}


// musicToPitchLyric takes a music line (a string) and returns a pitch line  and
// a lyric line as an object of the  form {lyric: string, pitch: string }
//
// The lyric line is constructed by identifying all key signature and pitch
// tokens in the music and replacing the pitch tokens with asterisks.
//
// The pitch line is constructed by removing all the hold or rest
// characters, '-' and ';'the from music line.
//
// For example, if the music line is `K#2 c; d -e f |` the lyric line
// will be `*; * -* * |` and the pitch line will be `K#2 c d e f |`. 
export function musicToPitchLyric(musicLine) {
  let lyricLine = musicLine;
  let pitchLine = musicLine;

  // Remove key signatures and replace pitch tokens with asterisks to create the
  // lyric line.
  lyricLine = lyricLine.replace(/K[#&]?\d/g, "")
    .replace(/\^*\/*[#&%]*[a-g]/g, "*");

  // Remove hold, rest and underscore characters from the pitch line
  pitchLine = pitchLine.replace(/[-=;_]/g, "");

  // Now remove any numeric prefixes from tokens in the pitch line
  pitchLine = pitchLine.replace(/\s[0-9]*/g, " ");

  return {
    lyric: lyricLine.trim(),
    pitch: pitchLine.trim()
  };
}

// stripComments removes all lines that start with a ':' character.
function stripComments(text) {
  return text.replace(/^\s*:.*\n/g, "\n");
}
// The preprocessScore function is used to parse the score input
// text and convert it into a data object with members for the title,
// preface, lyrics, expressions, cues, pitches, chords, perbars and
// postscript. The data object is returned.
// It's important to understand the distinction between line groups
// and singleton lines. A line group is a group of lines that represent
// a line of music.  Singletons are things like title, preface, etc.
// that appear once within a score. Within the score text, blank lines
// i.e. /\n\s*\n/ are delimeters between singletons and line groups.
export function preprocessScore(text) {
  text = stripComments(text);
  // Trim whitespace from the start and end of the text to prevent empty blocks,
  // then split by one or more blank lines.
  const blocks = text.trim().split(/\n\s*\n+/);
  const data = { text: text, lines: [], showIntervals: false };

  // The first block is the header.
  const headerBlock = blocks.shift();
  const headerLines = headerBlock.split('\n');

  headerLines.forEach(line => {
    const [key, value] = splitFirst(line, ':');
    const k = key.trim();
    const v = value.trim();
    let parts = [];
    switch (k) {
      case "title":
        data.title = v;
        break;
      case "youtube":
        parts = v.split(" ");
        data.youtubeId = parts[0];
        if (parts.length > 1) {
          data.playRate = parseFloat(parts[1]);
        } else {
          data.playRate = 1.0;
        }
        break;
      case "zoom":
        data.zoom = v;
        break;
      case "staff":
        data.staff = v;
        break;
      case "intervals":
        parts = v.split(',');
        if (parts[0].toLowerCase() === 'on') {
          data.showIntervals = true;
        } else {
          data.showIntervals = false;
        }
        break;
      case "midi":
        const midi_params = {};
        const params = v.split(',');
        params.forEach(param => {
          const [key, value] = param.trim().split('=').map(s => s.trim());
          if (key && value) {
            if (key === 'tempo') {
              midi_params[key] = parseInt(value, 10);
            } else {
              midi_params[key] = value;
            }
          }
        });
        data.midi_params = midi_params;
        break;
      case "layout":
        parts = v.split(',');
        if (parts[0].toLowerCase() === 'auto') {
          data.layout = 'auto';
        } else {
          data.layout = 'manual';
        }
        break;
      default:
        const knownKeys = ["cue", "perbar", "pernote", "perbeat", "chord", "music", "lyric", "counter", "rhythm", "text", "play", "image", "nomarkers"];
        if (knownKeys.includes(k) || (k !== "" && v !== "")) {
          lineProblems.add(`Invalid header line: "${line}". Headers can only contain title, youtube, zoom, staff, intervals, or midi. Did you forget a blank line?`);
        }
        break;
    }
  });

  // Gather any legacy top-level keywords from the rest of the blocks.
  for (let i = blocks.length - 1; i >= 0; i--) {
    let block = blocks[i].trim();
    if (block.startsWith("youtube:")) {
      const parts = block.slice(8).trim().split(" ");
      data.youtubeId = parts[0];
      if (parts.length > 1) {
        data.playRate = parseFloat(parts[1]);
      } else {
        data.playRate = 1.0;
      }
      blocks.splice(i, 1);
      continue;
    }
    if (block.startsWith("zoom:")) {
      data.zoom = block.slice(5).trim();
      blocks.splice(i, 1);
      continue;
    }
    if (block.startsWith("staff:")) {
      data.staff = block.slice(6).trim();
      blocks.splice(i, 1);
      continue;
    }
    if (block.startsWith("intervals:")) {
      data.showIntervals = true;
      blocks.splice(i, 1);
      continue;
    }
    if (block.startsWith("midi:")) {
      const midi_params = {};
      const params = block.slice(5).trim().split(',');
      params.forEach(param => {
        const [key, value] = param.trim().split('=').map(s => s.trim());
        if (key && value) {
          if (key === 'tempo') {
            midi_params[key] = parseInt(value, 10);
          } else {
            midi_params[key] = value;
          }
        }
      });
      data.midi_params = midi_params;
      blocks.splice(i, 1);
      continue;
    }
  }

  // Set defaults for any missing header keywords.
  if (!data.zoom) data.zoom = 100;
  if (!data.staff) data.staff = 4;
  if (!data.youtubeId) data.youtubeId = 'none';
  if (!data.midi_params) {
    data.midi_params = {
      tempo: 120,
      ref: 'G4',
      roll: 'off'
    };
  }

  data.headerText = reconstructHeader(data);


  // Process the rest of the blocks
  let kvlines = blocks.map(line => {
    const obj = {}; // what we will return
    if (line.startsWith("text:")) {
      obj.text = line.slice(5).trim();
      return obj;
    }
    if (line.startsWith("image:")) {
      obj.image = line.slice(6).trim();
      return obj;
    }
    // If we get to here, it's a music linegroup
    const parts = line.split('\n');
    parts.forEach(part => {
      part.trim()
      const [key, value] = splitFirst(part, ':');
      const k = key.trim();
      // Special handling for play:
      switch (k) {
        case "play":
          const parts = value.trim().split(/\s+/);
          const [min, sec] = parts[0].split(':');
          obj[k] = parseInt(min) * 60 + parseInt(sec);
          if (parts[1]) {
            obj.playRate = parseFloat(parts[1]);
          } else {
            obj.playRate = data.playRate;
          }
          break;
        case "midi":
          const line_midi_params = {};
          const params = value.trim().split(',');
          params.forEach(param => {
            const [key, value] = param.trim().split('=').map(s => s.trim());
            if (key && value) {
              if (key === 'tempo') {
                line_midi_params[key] = parseInt(value, 10);
              } else {
                line_midi_params[key] = value;
              }
            }
          });
          obj.midi_params = line_midi_params;
          break;
        case "image":
          lineProblems.add("The 'image:' keyword cannot be used inside a music block.");
          break;
        case "nomarkers": // Deprecated
          break;
        default:
          if (k !== "" && value !== undefined) {
            // if it's a lyric line, substiute '--' for '='
            if (k === "lyric" || k === "music") {
              const q = normalizeBarlines(value);
              const v = q.replace(/=/g, '--');
              obj[k] = v.trim();
            } else {
              obj[k] = value.trim();
            }
          }
      }

    });
    return obj;
  });

  // push the remaining lines. 
  for (let kv of kvlines) {
    data.lines.push(kv);
    continue;
  }
  return data;
}
