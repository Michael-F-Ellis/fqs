import { lineProblems } from "./LineProblem.js";
import { defaultParameters } from "../utils/parameters.js";
import { preprocessScore } from "../utils/preprocess.js";
import { LyricLine } from "./LyricLine.js";
import { PitchLine } from "./Pitch.js";
import { renderMultilineText } from "../utils/textrender.js";
import { appendSVGTextChild } from "../utils/svg.js";
import { playYouTubeAt } from "../utils/youtube.js";

import { ImageLine } from "./ImageLine.js";
import { Cue } from "./Cue.js";
import { PerBar, PerNote, PerBeat, Finger } from "./LineAnnotations.js";
import { Chord } from "./Chord.js";
import { Counter } from "./Counter.js";
import { RhythmMarkers } from "./RhythmMarkers.js";
import { FqsToMidiParser } from "../midi/FqsToMidiParser.js";

export const scoreMap = new Map();
export class Score {
  constructor(text, container, midiPlayer, ast) {
    this.dirty = false;
    this.editMode = false;
    this.midiPlayer = midiPlayer;
    this.pitchLines = [];
    this.lyricLines = [];
    this.noteEvents = [];
    this.lineBoundaries = [];
    this.ast = ast;
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
    if (this.ast.header.title) {
      return this.ast.header.title;
    }
    return "Untitled";
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
    if (!this.ast) {
      this.ast = preprocessScore(this.source.textContent)[0];
    }
    this.data = this.ast;

    if (!this.data.header) {
      this.data.header = {};
    }
    if (!this.data.header.midi) {
      this.data.header.midi = {
        tempo: 120,
        roll: "off",
        ref: "G4",
      };
    } else {
      if (this.data.header.midi.roll === undefined) {
        this.data.header.midi.roll = "off";
      }
      if (this.data.header.midi.tempo === undefined) {
        this.data.header.midi.tempo = 120;
      }
      if (this.data.header.midi.ref === undefined) {
        this.data.header.midi.ref = "G4";
      }
    }

    // This is a hack to make the parser work with the current data structure
    const scoreForParser = {
      PitchLines: [],
      LyricLines: [],
      MidiParams: this.data.header.midi,
    };

    // Centralize line processing
    this.pitchLines = [];
    this.lyricLines = [];
    this.ast.sections.forEach(section => {
      if (section.type === 'music_section') {
        const line = section.lines;
        const line_midi_params = line.midi ? { ...this.data.header.midi, ...line.midi } : { ...this.data.header.midi };

        // Use pitch and lyric directly from the AST
        const pitchContent = line.pitch || ''; // Default to empty string if no pitch line
        const lyricContent = line.lyric || ''; // Default to empty string if no lyric line

        // Determine showLyric based on whether a lyric line was provided in the FQS
        const showLyric = !!line.lyric;

        if (pitchContent || lyricContent) { // Only create lines if there's content
          const pitchLine = new PitchLine(pitchContent, this.data.header.staff, line_midi_params);
          const lyricLine = new LyricLine(lyricContent, showLyric);
          this.pitchLines.push(pitchLine);
          this.lyricLines.push(lyricLine);
          // The parser expects an array of objects with a 'Pitches' property
          scoreForParser.PitchLines.push({ Pitches: pitchLine.pitches });
          // The parser expects an array of objects with a 'Tuplets' property
          scoreForParser.LyricLines.push({ Tuplets: lyricLine.tuplets });
        } else {
          this.pitchLines.push(null);
          this.lyricLines.push(null);
          // Even for non-music lines, we need placeholders to keep indices in sync
          scoreForParser.PitchLines.push({ Pitches: [] });
          scoreForParser.LyricLines.push({ Tuplets: [] });
        }
      } else {
        this.pitchLines.push(null);
        this.lyricLines.push(null);
        scoreForParser.PitchLines.push({ Pitches: [] });
        scoreForParser.LyricLines.push({ Tuplets: [] });
      }
    });

    // Parse MIDI data and store it on this score instance
    if (scoreForParser.PitchLines.Pitcheslength > 0) {
      const midiParser = new FqsToMidiParser(scoreForParser);
      this.noteEvents = midiParser.parse();
    } else {
      this.noteEvents = [];
    }

    renderScore(this, this.inner);
    const svgElements = this.inner.querySelectorAll('svg');
    for (const svg of svgElements) {
      let height = svg.getBBox().height + 30;
      let zoom = 100;
      if (this.data.header.zoom) {
        zoom = parseInt(this.data.header.zoom, 10);
        if (isNaN(zoom)) {
          lineProblems.add("Invalid zoom value: " + this.data.header.zoom);
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



function createActionsDropdown(svg, section, index, score) {
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
  if (section.type === 'music_section') {
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
  if (score.data.header.youtube && section.lines.play !== undefined) {
    const ytItem = document.createElement('div');
    ytItem.textContent = 'Play from YouTube';
    ytItem.classList.add('actions-dropdown-item');
    ytItem.addEventListener('click', () => {
      playYouTubeAt(score.data.header.youtube.id, section.lines.play.time, section.lines.play.rate || 1.0);
      dropdownMenu.style.display = 'none';
    });
    dropdownMenu.appendChild(ytItem);
  }

  // Add Image option
  if (section.type === 'image') {
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

  if (!data.header.staff) {
    data.header.staff = 4;
  }

  wrapper.innerHTML = "";
  let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  let y = 0;
  wrapper.appendChild(svg)
  const titleEditor = createActionsDropdown(svg, {}, -1, score);

  y = lineProblems.render(svg, defaultParameters.leftX, y);
  lineProblems.clear();

  y += 2 * defaultParameters.titleFontHeight
  appendSVGTextChild(svg, defaultParameters.leftX, y, data.header.title, ['title']);

  if (titleEditor) {
    titleEditor.textContent = score.source.textContent;
  }

  data.sections.forEach((section, index) => {
    let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    let y = 0;
    wrapper.appendChild(svg)
    let sectionEditor = createActionsDropdown(svg, section, index, score);
    sectionEditor.textContent = score.source.textContent;

    if (section.type === 'text') {
      y += 2 * defaultParameters.lyricFontHeight + defaultParameters.textFontHeight;
      y = renderMultilineText(svg, defaultParameters.leftX, y,
        section.text, defaultParameters.textFontHeight, 'text');
      y += defaultParameters.textFontHeight
      return;
    }

    const lyricline = lyricLines[index];
    console.log(lyricline || "empty lyric line")
    const pitchLine = pitchLines[index];
    console.log(pitchLine || "empty pitch line")

    y += defaultParameters.lyricFontHeight
    if (section.type === 'image') {
      const image = new ImageLine(section.url);
      if (image.wellFormed) {
        const imageElement = image.render(svg, defaultParameters.leftX, y);
        imageElement.classList.add('image-line'); // Add class for toggling
      }
    }
    if (section.type === 'music_section' && section.lines.cue) {
      if (!lyricline) {
        y += defaultParameters.lyricFontHeight;
      } else {
        y += defaultParameters.lyricFontHeight;
      }
      const cue = new Cue(section.lines.cue);
      cue.render(svg, defaultParameters.leftX, y);
    }
    if (section.type === 'music_section' && section.lines.chord && lyricline) {
      y += defaultParameters.chordFontHeight
      const chord = new Chord(section.lines.chord);
      chord.render(svg, defaultParameters.leftX, y, lyricline.beats, defaultParameters.lyricFontWidth);
    }
    if (section.type === 'music_section' && section.lines.perbeat && lyricline) {
      y += defaultParameters.perbeatFontHeight * 1.5
      const perbeat = new PerBeat(section.lines.perbeat)
      perbeat.render(svg, defaultParameters.leftX, y, lyricline)
    }
    let rhythm = undefined;
    if (lyricline) {
      rhythm = new RhythmMarkers(lyricline);
    }

    if (pitchLine && lyricline) {
      y += parseInt(data.header.staff, 10) * defaultParameters.lyricFontHeight;
      try {
        pitchLine.render(svg, defaultParameters.leftX, y,
          defaultParameters, lyricline, data.header.intervals === 'on');
      } catch (e) {
        lineProblems.add("Pitch line error: " + e.message);
      }
    }
    if (section.type === 'music_section' && section.lines.finger && lyricline && pitchLine) {
      const finger = new Finger(lyricline, pitchLine)
      finger.render(svg, section.lines.finger)
    }
    if (section.type === 'music_section' && section.lines.perbar && lyricline) {
      y += defaultParameters.perbarFontHeight;
      const perbar = new PerBar(section.lines.perbar);
      perbar.render(svg, defaultParameters.leftX, y, lyricline);
    }
    if (lyricline && lyricline.showLyric) {
      y += defaultParameters.lyricFontHeight;
      lyricline.render(svg, defaultParameters.leftX, y, defaultParameters.lyricFontWidth);
    }
    if (section.type === 'music_section' && section.lines.pernote && lyricline) {
      y += defaultParameters.pernoteFontHeight * 1.5;
      const expr = new PerNote(section.lines.pernote);
      expr.render(svg, defaultParameters.leftX, y, lyricline);
    }
    if (section.type === 'music_section' && section.lines.counter && lyricline) {
      y += defaultParameters.counterFontHeight * 1.5
      let npartial = 0;
      if (section.lines.counter.length > 0) {
        try {
          npartial = parseInt(section.lines.counter);
        } catch (e) {
          lineProblems.add(`Invalid counter value: ${section.lines.counter}`);
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