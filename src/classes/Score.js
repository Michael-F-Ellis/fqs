import { lineProblems } from "./LineProblem.js";
import { defaultParameters } from "../utils/parameters.js";
import { preprocessScore } from "../utils/preprocess.js";
import { LyricLine } from "./LyricLine.js";
import { PitchLine } from "./Pitch.js";
import { renderMultilineText } from "../utils/textrender.js";
import { appendSVGTextChild } from "../utils/svg.js";
import { playYouTubeAt } from "../utils/youtube.js";
import { musicToPitchLyric } from "../utils/preprocess.js";
import { ImageLine } from "./ImageLine.js";
import { Cue } from "./Cue.js";
import { PerBar, PerNote, PerBeat, Finger } from "./LineAnnotations.js";
import { Chord } from "./Chord.js";
import { Counter } from "./Counter.js";
import { RhythmMarkers } from "./RhythmMarkers.js";
import { FqsToMidiParser } from "../midi/FqsToMidiParser.js";

export const scoreMap = new Map();
export class Score {
  constructor(text, container, midiPlayer) {
    this.dirty = false;
    this.editMode = false;
    this.midiPlayer = midiPlayer;
    this.pitchLines = [];
    this.lyricLines = [];
    this.noteEvents = [];
    this.lineBoundaries = [];
    this.outer = document.createElement('div');
    this.outer.classList.add('score');
    this.id = `score-${Math.random().toString(36).substring(2, 15)}`;
    this.outer.setAttribute('id', this.id);
    scoreMap.set(this.id, this);
    this.wrapper = document.createElement('div');
    this.wrapper.classList.add('score-wrapper');
    this.wrapper.style.display = 'flex';
    this.wrapper.style.width = '100%';
    this.outer.appendChild(this.wrapper)
    this.inner = document.createElement('div');
    this.inner.classList.add('inner-wrapper');
    this.wrapper.appendChild(this.inner);
    this.sourcediv = document.createElement('div');
    this.sourcediv.classList.add('source-div');
    this.wrapper.appendChild(this.sourcediv)
    this.source = document.createElement('pre');
    this.source.classList.add('source');
    this.source.setAttribute('contenteditable', 'plaintext-only');
    this.source.textContent = text;
    this.sourcediv.appendChild(this.source);
    this.postRenderCallback = null;
    container.appendChild(this.outer);

    this.source.addEventListener('input', () => {
      this.render();
    });
  }

  getText() {
    return this.source.textContent;
  }

  getTitle() {
    const text = this.getText();
    const titleLine = text.split('\n').find(line => line.startsWith('title:'));
    if (titleLine) {
      return titleLine.split(':')[1].trim();
    }
    throw new Error('No title found in score');
  }

  showSourceEditor() {
    this.sourcediv.style.display = 'block';
    this.sourcediv.style.width = '50%';
    this.inner.style.width = '50%';
  }

  hideSourceEditor() {
    this.sourcediv.style.display = 'none';
    this.inner.style.width = '100%';
  }

  toggleEdit() {
    this.editMode = !this.editMode;
    this.forceEditMode(this.editMode);
  }

  forceEditMode(state) {
    if (state) {
      this.showSourceEditor();
    } else {
      this.hideSourceEditor();
    }
  }

  render() {
    this.data = preprocessScore(this.source.textContent);
    if (!this.data.midi_params) {
      this.data.midi_params = {
        tempo: 120,
        roll: "off",
        ref: "G4",
      };
    } else {
      if (this.data.midi_params.roll === undefined) {
        this.data.midi_params.roll = "off";
      }
      if (this.data.midi_params.tempo === undefined) {
        this.data.midi_params.tempo = 120;
      }
      if (this.data.midi_params.ref === undefined) {
        this.data.midi_params.ref = "G4";
      }
    }

    // This is a hack to make the parser work with the current data structure
    const scoreForParser = {
      PitchLines: [],
      LyricLines: [],
      MidiParams: this.data.midi_params,
    };

    // Centralize line processing
    this.pitchLines = [];
    this.lyricLines = [];
    this.data.lines.forEach(line => {
      if (line.music) {
        const { lyric, pitch } = musicToPitchLyric(line.music);
        line.lyric = lyric;
        line.pitch = pitch;
        line.showLyric = false;
      } else {
        line.showLyric = true;
      }

      const line_midi_params = line.midi_params || this.data.midi_params;
      console.log(`Line ${this.pitchLines.length}: midi_params =`, JSON.stringify(line_midi_params));
      if (line.pitch && line.lyric) {
        const pitchLine = new PitchLine(line.pitch, this.data.staff, line_midi_params);
        const lyricLine = new LyricLine(line.lyric, line.showLyric);
        this.pitchLines.push(pitchLine);
        this.lyricLines.push(lyricLine);
        // The parser expects an array of objects with a 'Pitches' property
        scoreForParser.PitchLines.push({ Pitches: pitchLine.pitches });
        // The parser expects an array of objects with a 'Tuplets' property
        scoreForParser.LyricLines.push({ Tuplets: lyricLine.tuplets });
      } else if (line.lyric) { // If there's a lyric line but no pitch line
        const pitchLine = new PitchLine('', this.data.staff, line_midi_params); // Create a dummy pitchline
        const lyricLine = new LyricLine(line.lyric, line.showLyric);
        this.pitchLines.push(pitchLine);
        this.lyricLines.push(lyricLine);
        scoreForParser.PitchLines.push({ Pitches: [] });
        scoreForParser.LyricLines.push({ Tuplets: lyricLine.tuplets });
      } else {
        this.pitchLines.push(null);
        this.lyricLines.push(null);
        // Even for non-music lines, we need placeholders to keep indices in sync
        scoreForParser.PitchLines.push({ Pitches: [] });
        scoreForParser.LyricLines.push({ Tuplets: [] });
      }
    });

    // Parse MIDI data and store it on this score instance
    const midiParser = new FqsToMidiParser(scoreForParser);
    this.noteEvents = midiParser.parse();
    // this.lineBoundaries = midiParser.getLineBoundaries(); // getLineBoundaries does not exist on the new parser

    renderScore(this, this.inner);
    const svgElements = this.inner.querySelectorAll('svg');
    for (const svg of svgElements) {
      let height = svg.getBBox().height + 30;
      let zoom = 100;
      if (this.data.zoom) {
        zoom = parseInt(this.data.zoom, 10);
        if (isNaN(zoom)) {
          lineProblems.add("Invalid zoom value: " + this.data.zoom);
          zoom = 100;
        }
        zoom = Math.max(50, Math.min(500, parseInt(zoom, 10)));
        const xpix = 720 * 100. / zoom;
        svg.setAttribute('viewBox', `0 0 ${xpix} ${height}`);
      }
    }
    this.dirty = true
    this.forceEditMode(this.editMode);
    if (this.postRenderCallback) {
      this.postRenderCallback();
    }
  }
}

function reconstructSectionText(line) {
  let text = '';
  if (line.cue) text += `cue: ${line.cue}\n`;
  if (line.chord) text += `chord: ${line.chord}\n`;
  if (line.perbeat) text += `perbeat: ${line.perbeat}\n`;
  if (line.finger) text += `finger: ${line.finger}\n`;
  if (line.music) {
    text += `music: ${line.music}\n`;
  } else if (line.pitch) {
    text += `pitch: ${line.pitch}\n`;
  }
  if (line.perbar) text += `perbar: ${line.perbar}\n`;
  if (line.lyric) text += `lyric: ${line.lyric}\n`;
  if (line.pernote) text += `pernote: ${line.pernote}\n`;
  if (line.counter) text += `counter: ${line.counter}\n`;
  if (line.rhythm) text += `rhythm:\n`;
  if (line.text) text += `text: ${line.text}\n`;
  if (line.play) {
    const minutes = Math.floor(line.play / 60);
    const seconds = line.play - (minutes * 60);
    text += `play: ${minutes}:${seconds < 10 ? '0' + seconds : seconds}`
    if (line.playRate) {
      text += ` ${line.playRate}`;
    }
    text += '\n';
  }
  if (line.image) {
    text += `image: ${line.image}\n`;
  }
  if (line.nomarkers) {
    text += `nomarkers:\n`;
  }
  return text;
}

function createActionsDropdown(svg, line, index, score) {
  const wrapper = svg.parentNode;
  const editorDiv = document.createElement('div');
  editorDiv.setAttribute('class', 'section-editor-div');
  editorDiv.style.display = 'none';
  editorDiv.style.alignItems = 'flex-start';
  const reloadButton = document.createElement('button');
  reloadButton.textContent = '↻';
  reloadButton.setAttribute('class', 'reload-icon');
  const editor = document.createElement('pre');
  editor.classList.add('section-editor');
  editor.setAttribute('contenteditable', 'plaintext-only');
  editor.style.display = 'block';
  editorDiv.appendChild(reloadButton);
  editorDiv.appendChild(editor);
  wrapper.appendChild(editorDiv);

  editor.addEventListener('input', () => {
    const sectionEditors = wrapper.querySelectorAll('.section-editor');
    const fullText = Array.from(sectionEditors)
      .map(ed => ed.textContent.trim())
      .filter(text => text.length > 0)
      .join('\n\n');
    const scoreDiv = wrapper.closest('div.score');
    const mainEditor = scoreDiv.querySelector('pre.source');
    mainEditor.textContent = fullText;
  });
  reloadButton.addEventListener('click', () => {
    const activeEditor = editor;
    const allEditors = wrapper.querySelectorAll('.section-editor');
    const activeIndex = Array.from(allEditors).indexOf(activeEditor);
    const scoreDiv = wrapper.closest('div.score');
    const score = scoreMap.get(scoreDiv.id);
    score.render();
    const newEditorDivs = wrapper.querySelectorAll('.section-editor-div');
    const newActiveEditor = newEditorDivs[activeIndex];
    newActiveEditor.style.display = 'flex';
    newActiveEditor.focus();
  });

  const dropdownMenu = document.createElement('div');
  dropdownMenu.classList.add('actions-dropdown-menu');
  dropdownMenu.style.display = 'none';
  wrapper.appendChild(dropdownMenu);

  const ellipsisIcon = appendSVGTextChild(svg, 0, 16, "…", ['ellipsis-icon']);
  ellipsisIcon.style.cursor = 'pointer';
  ellipsisIcon.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownMenu.style.display = dropdownMenu.style.display === 'none' ? 'block' : 'none';
    const rect = ellipsisIcon.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();
    dropdownMenu.style.left = `${rect.right - wrapperRect.left}px`;
    dropdownMenu.style.top = `${rect.top - wrapperRect.top}px`;
  });

  // Add Edit option
  const editItem = document.createElement('div');
  editItem.textContent = 'Edit';
  editItem.classList.add('actions-dropdown-item');
  editItem.addEventListener('click', () => {
    editorDiv.style.display = editorDiv.style.display === 'none' ? 'flex' : 'none';
    dropdownMenu.style.display = 'none';
  });
  dropdownMenu.appendChild(editItem);

  // Add MIDI option
  if (line.pitch) {
    const midiItem = document.createElement('div');
    midiItem.textContent = 'Play MIDI';
    midiItem.classList.add('actions-dropdown-item');
    midiItem.dataset.lineIndex = String(index);
    midiItem.addEventListener('click', () => {
      if (score.midiPlayer) {
        score.midiPlayer.playStopLine(score, index);
      }
      dropdownMenu.style.display = 'none';
    });
    dropdownMenu.appendChild(midiItem);
  }

  // Add YouTube option
  if (score.data.youtubeId && line.play !== undefined) {
    const ytItem = document.createElement('div');
    ytItem.textContent = 'Play from YouTube';
    ytItem.classList.add('actions-dropdown-item');
    ytItem.addEventListener('click', () => {
      playYouTubeAt(score.data.youtubeId, line.play, line.playRate || 1.0);
      dropdownMenu.style.display = 'none';
    });
    dropdownMenu.appendChild(ytItem);
  }

  // Add Image option
  if (line.image) {
    const imageItem = document.createElement('div');
    imageItem.textContent = 'Show/Hide Image';
    imageItem.classList.add('actions-dropdown-item');
    imageItem.addEventListener('click', () => {
      const imageLine = svg.querySelector('.image-line');
      if (imageLine) {
        imageLine.style.display = imageLine.style.display === 'none' ? 'block' : 'none';
      }
      dropdownMenu.style.display = 'none';
    });
    dropdownMenu.appendChild(imageItem);
  }

  document.addEventListener('click', (e) => {
    if (!dropdownMenu.contains(e.target) && !ellipsisIcon.contains(e.target)) {
      dropdownMenu.style.display = 'none';
    }
  });

  return editor;
}


function renderScore(score, wrapper) {
  const data = score.data;
  const midiPlayer = score.midiPlayer;
  const pitchLines = score.pitchLines;
  const lyricLines = score.lyricLines;

  if (!data.staff) {
    data.staff = 4;
  }

  wrapper.innerHTML = "";
  let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  let y = 0;
  wrapper.appendChild(svg)
  const titleEditor = createActionsDropdown(svg, {}, -1, score);

  y = lineProblems.render(svg, defaultParameters.leftX, y);
  lineProblems.clear();

  y += 2 * defaultParameters.titleFontHeight
  appendSVGTextChild(svg, defaultParameters.leftX, y, data.title, ['title']);

  if (titleEditor) {
    let titleText = `title: ${data.title}`;
    if (data.zoom) {
      titleText += `\n\nzoom: ${data.zoom}`;
    }
    if (data.youtubeId) {
      titleText += `\n\nyoutube: ${data.youtubeId}`;
      if (data.playRate && data.playRate !== 1.0) {
        titleText += ` ${data.playRate}`;
      }
    }
    if (data.staff) {
      titleText += `\n\nstaff: ${data.staff}`;
    }
    if (data.intervals) {
      titleText += `\n\nintervals: ${data.intervals}`;
    }
    titleEditor.textContent = titleText;
  }

  data.lines.forEach((line, index) => {
    let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    let y = 0;
    wrapper.appendChild(svg)
    let sectionEditor = createActionsDropdown(svg, line, index, score);
    sectionEditor.textContent = reconstructSectionText(line);

    if (line.text) {
      y += 2 * defaultParameters.lyricFontHeight + defaultParameters.textFontHeight;
      y = renderMultilineText(svg, defaultParameters.leftX, y,
        line.text, defaultParameters.textFontHeight, 'text');
      y += defaultParameters.textFontHeight
      return;
    }

    const lyricline = lyricLines[index];
    console.log(lyricline || "empty lyric line")
    const pitchLine = pitchLines[index];
    console.log(pitchLine || "empty pitch line")

    y += defaultParameters.lyricFontHeight
    if (line.image) {
      const image = new ImageLine(line.image);
      if (image.wellFormed) {
        const imageElement = image.render(svg, defaultParameters.leftX, y);
        imageElement.classList.add('image-line'); // Add class for toggling
      }
    }
    if (line.cue) {
      if (!lyricline) {
        y += defaultParameters.lyricFontHeight;
      } else {
        y += defaultParameters.lyricFontHeight;
      }
      const cue = new Cue(line.cue);
      cue.render(svg, defaultParameters.leftX, y);
    }
    if (line.chord && lyricline) {
      y += defaultParameters.chordFontHeight
      const chord = new Chord(line.chord);
      chord.render(svg, defaultParameters.leftX, y, lyricline.beats, defaultParameters.lyricFontWidth);
    }
    if (line.perbeat && lyricline) {
      y += defaultParameters.perbeatFontHeight * 1.5
      const perbeat = new PerBeat(line.perbeat)
      perbeat.render(svg, defaultParameters.leftX, y, lyricline)
    }
    let rhythm = undefined;
    if (lyricline) {
      rhythm = new RhythmMarkers(lyricline);
    }

    if (pitchLine && lyricline) {
      y += parseInt(data.staff, 10) * defaultParameters.lyricFontHeight;
      try {
        pitchLine.render(svg, defaultParameters.leftX, y,
          defaultParameters, lyricline, data.showIntervals);
      } catch (e) {
        lineProblems.add("Pitch line error: " + e.message);
      }
    }
    if (line.finger && lyricline && pitchLine) {
      const finger = new Finger(lyricline, pitchLine)
      finger.render(svg, line.finger)
    }
    if (line.perbar && lyricline) {
      y += defaultParameters.perbarFontHeight;
      const perbar = new PerBar(line.perbar);
      perbar.render(svg, defaultParameters.leftX, y, lyricline);
    }
    if (line.showLyric && lyricline) {
      y += defaultParameters.lyricFontHeight;
      lyricline.render(svg, defaultParameters.leftX, y, defaultParameters.lyricFontWidth);
    }
    if (line.pernote && lyricline) {
      y += defaultParameters.pernoteFontHeight * 1.5;
      const expr = new PerNote(line.pernote);
      expr.render(svg, defaultParameters.leftX, y, lyricline);
    }
    if (line.counter && lyricline) {
      y += defaultParameters.counterFontHeight * 1.5
      let npartial = 0;
      if (line.counter.length > 0) {
        try {
          npartial = parseInt(line.counter);
        } catch (e) {
          lineProblems.add(`Invalid counter value: ${line.counter}`);
        }
      }
      const counter = new Counter(npartial, lyricline, rhythm);;
      counter.render(svg, defaultParameters.leftX, y, defaultParameters.lyricFontWidth)
    }
    y = lineProblems.render(svg, defaultParameters.leftX, y);
    lineProblems.clear();
  });
}

export function updateMidiPlayIcon(scoreId, lineIndex, isPlaying) {
  const scoreDiv = document.getElementById(scoreId);
  if (scoreDiv) {
    const dropdowns = scoreDiv.querySelectorAll('.actions-dropdown-menu');
    // The first dropdown is for the title, so we add 1 to the lineIndex
    const dropdown = dropdowns[lineIndex + 1];
    if (dropdown) {
      const midiItem = dropdown.querySelector('[data-line-index]');
      if (midiItem) {
        midiItem.textContent = isPlaying ? "Stop MIDI" : "Play MIDI";
      }
    }
  }
}
