import { lineProblems } from "./LineProblem.js";
import { defaultParameters } from "../utils/parameters.js";
import { preprocessScore } from "../utils/preprocess.js";
import { LyricLine } from "./LyricLine.js";
import { PitchLine } from "./Pitch.js";
import { renderMultiline } from "../utils/textrender.js";
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
      this.data.midi_params = {};
    }

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

        if (line.pitch && line.lyric) {
            this.pitchLines.push(new PitchLine(line.pitch, this.data.staff, this.data.midi_params));
            this.lyricLines.push(new LyricLine(line.lyric, line.showLyric));
        } else {
            this.pitchLines.push(null);
            this.lyricLines.push(null);
        }
    });

    // Parse MIDI data and store it on this score instance
    const midiParser = new FqsToMidiParser(this);
    this.noteEvents = midiParser.getNoteEvents();
    this.lineBoundaries = midiParser.getLineBoundaries();

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

function renderScore(score, wrapper) {
    const data = score.data;
    const midiPlayer = score.midiPlayer;
    const pitchLines = score.pitchLines;
    const lyricLines = score.lyricLines;

  if (!data.staff) {
    data.staff = 4;
  }

  const addEditor = (svg) => {
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

    const pencil = appendSVGTextChild(svg, 0, 16, "✎", ['pencil-icon']);
    pencil.addEventListener("click", function (e) {
      e.stopPropagation();
      e.preventDefault();
      e.stopImmediatePropagation();
      editorDiv.style.display = editorDiv.style.display === 'none' ? 'flex' : 'none';
      return false;
    }, true);
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
    return editor;
  }

  wrapper.innerHTML = "";
  let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  let y = 0;
  wrapper.appendChild(svg)
  addEditor(svg)

  y = lineProblems.render(svg, defaultParameters.leftX, y);
  lineProblems.clear();

  y += 2 * defaultParameters.titleFontHeight
  appendSVGTextChild(svg, defaultParameters.leftX, y, data.title, ['title']);

  const titleEditor = wrapper.querySelector('.section-editor');
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
    let sectionEditor = addEditor(svg);
    sectionEditor.textContent = reconstructSectionText(line);

    if (line.text) {
      y += 2 * defaultParameters.lyricFontHeight + defaultParameters.textFontHeight;
      y = renderMultiline(svg, defaultParameters.leftX, y,
        line.text, defaultParameters.textFontHeight, 'text');
      y += defaultParameters.textFontHeight
      return;
    }
    
    const lyricline = lyricLines[index];
    const pitchLine = pitchLines[index];

    y += defaultParameters.lyricFontHeight
    if (line.image) {
      const image = new ImageLine(line.image);
      if (image.wellFormed) {
        image.render(svg, defaultParameters.leftX, y);
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

    if (data.youtubeId && line.play !== undefined) {
      svg.style.cursor = 'pointer';
      const speaker = appendSVGTextChild(svg, 0, 48, "🔊", ["speaker-icon"]);
      speaker.dataset.timestamp = String(line.play);
      speaker.addEventListener('click', (event) => {
        if (event.detail === 1) {
          setTimeout(() => {
            if (!event.target.clickProcessed) {
              document.querySelectorAll('.speaker-icon').forEach(icon => {
                icon.classList.remove('speaker-icon-active');
              });
              playYouTubeAt(data.youtubeId, line.play, line.playRate || 1.0);
            }
          }, 200);
        }
        event.target.clickProcessed = (event.detail === 2);
      });
    }

    if (line.pitch) {
      const midiIcon = appendSVGTextChild(svg, 0, 72, "▶", ["midi-play-icon"]);
      midiIcon.dataset.lineIndex = String(index);
      midiIcon.style.cursor = 'pointer';
      midiIcon.addEventListener('click', (event) => {
          if (midiPlayer) {
              midiPlayer.playStopLine(score, index);
          }
      });
    }
  });
}