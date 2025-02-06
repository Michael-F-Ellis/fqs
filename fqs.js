import { defaultParameters, updateFontSizes } from './src/utils/parameters.js';
import { lineProblems } from './src/classes/LineProblem.js';
import { appendSVGLineChild, appendSVGTextChild } from './src/utils/svg.js';
import { LyricLine } from './src/classes/LyricLine.js';
import { keyTable } from './src/utils/keyTable.js';
import { Alterations, Pitch, PitchLine } from './src/classes/Pitch.js';
/*
*********************************************************************
   Module globals
*********************************************************************   
*/

const scoreMap = new Map();
let isDirty = false; // global flag that is set when we edit a score and cleared when export the scores
let player; //  module global player object
// Initialize on page load
window.addEventListener('load', () => {
  updateFontSizes();
});
/*
********************************************************************
   Classes 
*********************************************************************
*/

class Book {
  // A Book is a collection of Scores.
  constructor(containerid) {
    this.container = document.getElementById(containerid);
    this.scores = new Map(); // Will hold scores keyed by score.id
    this.delimiter = "\nEndOfScore\n" // delimiter between scores in exportable .fqs format
    this.controlsVisible = true;
    initYouTubeAPI();
  }
  // enforceControlsVisibility() hides or shows the book-actions div of each score according to the
  // controlsVisible flag.
  enforceControlsVisibility() {
    const actiondivs = document.querySelectorAll('div.book-actions');
    for (const actiondiv of actiondivs) {
      actiondiv.style.display = this.controlsVisible ? 'block' : 'none';
    }
  }

  // pageBreak returns a div that will force a page break.
  // Credit: https://stackoverflow.com/a/58245474/426853
  pageBreak() {
    const pageBreakDiv = document.createElement('div');
    pageBreakDiv.style.breakAfter = 'page';
    return pageBreakDiv;
  }

  // addScore() adds a score to the book. If nextSibling is specified, the score
  // will be inserted after the specified sibling. Otherwise, it will be
  // appended to the end. A set of control buttons is prepended to the score.
  addScore(scoreText, nextSibling) {
    const score = new Score(scoreText, this.container);
    if (!score) {
      return;
    }

    // Create book-actions div with control buttons
    const actionsDiv = document.createElement('div');
    actionsDiv.classList.add('book-actions');

    // Insert new score button
    const insertButton = document.createElement('button');
    insertButton.textContent = 'Insert new score';
    insertButton.onclick = () => {
      const newScore = this.addScore("title: New Score", score.outer);
      //const newScore = this.addScore("title: New Score", score.outer.nextSibling);
      newScore.showSourceEditor();
    };
    actionsDiv.appendChild(insertButton);

    // Delete score button  
    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete score';
    deleteButton.onclick = () => {
      if (confirm('Delete this score?')) {
        this.deleteScore(score.id);
      }
    };
    actionsDiv.appendChild(deleteButton);

    // Edit mode toggle button
    const editButton = document.createElement('button');
    editButton.textContent = 'Toggle edit mode';
    editButton.onclick = () => score.toggleEdit();
    actionsDiv.appendChild(editButton);

    // Jump to TOC button
    const tocButton = document.createElement('button');
    tocButton.textContent = 'Contents';
    tocButton.onclick = () => {
      document.getElementById('score-toc').scrollIntoView();
    };
    actionsDiv.appendChild(tocButton);

    // Add actions div at top of score
    score.outer.prepend(actionsDiv);
    score.outer.append(this.pageBreak());

    // Add updateToc as a post-render callback
    score.postRenderCallback = () => this.updateToc();
    // Insert the score 
    if (nextSibling) {
      this.container.insertBefore(score.outer, nextSibling);
    } else {
      this.container.appendChild(score.outer);
    }

    // Add score to map and render
    this.scores.set(score.id, score);
    score.render();
    this.updateToc();
    return score;
  }
  // deleteScore(id) deletes the score with the given id.
  deleteScore(id) {
    const scorediv = document.getElementById(id);
    scorediv.remove();
    this.scores.delete(id);
    this.updateToc();
  }
  // importFromText(text) imports scores from a string containing the scores in the
  // format produced by exportToText().
  importFromText(text) {
    const scoreTexts = text.split(this.delimiter);
    for (const scoreText of scoreTexts) {
      if (scoreText.trim() === '') {
        continue;
      }
      this.addScore(scoreText, null); // null means append to end of container
    }
  }
  // exportToText() returns a string containing all the scores in the book with
  // the delimiter expected by importFromText().
  exportToText() {
    let text = '';
    const scores = this.getScores();
    scores.forEach(score => {
      text += score.getText() + this.delimiter;
    });
    return text;
  }
  // getScores() returns an array of scores in the order they appear in the container.
  getScores() {
    const scoredivs = document.querySelectorAll('div.score');
    const scores = [];
    for (const scorediv of scoredivs) {
      const score = this.scores.get(scorediv.id);
      if (score) {
        scores.push(score);
      }
    }
    return scores;
  }

  // render() renders all the scores in the book into the container.  before
  // rendering it scans the container to determine the order of the scores.  The
  // scores are rendered in the order they appear in the container.
  render() {
    // get the scores in order
    const scores = this.getScores()
    if (scores.length === 0) {
      return;
    }
    const texts = scores.map(score => score.getText());

    // clear the container
    this.container.innerHTML = '';

    // recreate and render the  scores in order
    for (const text of texts) {
      const score = new Score(text, this.container);
      if (score) {
        this.addScore(text, null); // null means append to end of container
      }
    }
  }
  // updateToc() updates the table of contents (TOC) at the top of the page.
  updateToc() {
    // get the toc div
    const toc = document.getElementById('score-toc');
    if (!toc) {
      return;
    }
    // clear the toc
    toc.innerHTML = '';

    // get the scores in order
    const scores = this.getScores()
    // add the toc entries
    toc.appendChild(document.createTextNode('Contents\n'));
    const ul = toc.appendChild(document.createElement('ul'));
    scores.forEach(score => {
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.setAttribute('href', `#${score.id}`);
      link.setAttribute('class', 'link-to-score');
      link.textContent = score.getTitle();
      li.appendChild(link);
      ul.appendChild(li);
    });
    toc.appendChild(this.pageBreak());
  }
}

// Score represents a score div and its associated editable source text.  It
// has a render method that renders the source text as FQS musical notation.
// The nested html structure of the rendered score is:
//
// container: (div supplied by the caller, may contain multiple scores)
//     outer: (class score)
//         controls: (optionally inserted by caller)
//         wrapper: (class score-wrapper)
//             inner: (class inner-wrapper)
// .               svg: (portion of rendered score)
//                 editor: (editable pre for portion of rendered score)
// .               ... (multiple svg+editor elements)
//             sourcediv:
//                 source: (editable pre for entire score text)
//
//     ... (multiple score elements)

class Score {
  constructor(text, container) {
    this.editMode = false;
    this.outer = document.createElement('div');
    this.outer.classList.add('score');
    this.id = `score-${Math.random().toString(36).substring(2, 15)}`;
    this.outer.setAttribute('id', this.id);
    scoreMap.set(this.id, this);
    // next comes a wrapper div that will contain the rendered
    // and the editable source text.
    this.wrapper = document.createElement('div');
    this.wrapper.classList.add('score-wrapper');
    this.wrapper.style.display = 'flex';
    this.wrapper.style.width = '100%';
    this.outer.appendChild(this.wrapper)
    // the inner wrapper div is where the svg's that comprise each
    // line of the rendered score will go
    this.inner = document.createElement('div');
    this.inner.classList.add('inner-wrapper');
    this.wrapper.appendChild(this.inner);
    // the source div will contain the editable <pre> element that 
    // holds the source text
    this.sourcediv = document.createElement('div');
    this.sourcediv.classList.add('source-div');
    this.wrapper.appendChild(this.sourcediv)
    // the editable pre element.
    this.source = document.createElement('pre');
    this.source.classList.add('source');
    this.source.setAttribute('contenteditable', 'plaintext-only');
    this.source.textContent = text;
    this.sourcediv.appendChild(this.source);
    // a post-render callback, if needed, to update TOC, etc.
    this.postRenderCallback = null;
    // Add the score to the container
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
    // look for the first line that starts with a 'title:'
    const titleLine = text.split('\n').find(line => line.startsWith('title:'));
    if (titleLine) {
      return titleLine.split(':')[1].trim();
    }
    throw new Error('No title found in score');
  }

  // showSourceEditor() makes the source editor visible.
  // by changing the the display style and width of the source div
  // and the width of the inner div.
  showSourceEditor() {
    this.sourcediv.style.display = 'block';
    this.sourcediv.style.width = '50%';
    this.inner.style.width = '50%';
  }
  // hideSourceEditor() makes the source editor invisible.
  // by changing the the display style and width of the source div
  // and the width of the inner div.
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
  // render() renders the score into the inner div.
  render() {
    // get the source text from the source pre element
    const data = preprocessScore(this.source.textContent);
    renderScore(this.inner, data);
    const svgElements = this.inner.querySelectorAll('svg');
    for (const svg of svgElements) {
      // calculate rendered height and adjust the svg height and viewbox
      let height = svg.getBBox().height + 30; // empirical
      // svg.setAttribute('height', height);
      let zoom = 100;
      if (data.zoom) {
        // if data.zoom can't be parsed, use 100% and add a message to the
        // lineProblems object so that the error can be displayed in the
        // SVG.
        zoom = parseInt(data.zoom, 10);
        if (isNaN(zoom)) {
          lineProblems.add("Invalid zoom value: " + data.zoom);
          zoom = 100;
        }
        // allow user to specify a zoom factor between 50 and 500%
        zoom = Math.max(50, Math.min(500, parseInt(zoom,
          10)));

        const xpix = 720 * 100. / zoom;
        svg.setAttribute('viewBox', `0 0 ${xpix} ${height}`);
      }
    }
    // scoreToc(); // update the table of contents
    isDirty = true // signal that the score has been edited
    this.forceEditMode(this.editMode);
    // if there is a postRenderCallback, call it
    if (this.postRenderCallback) {
      this.postRenderCallback();
    }
  }
}

// The Cue class is used render cue text in the style specified in the style sheet.
class Cue {
  constructor(text) {
    this.text = text;
  }
  render = (function (svg, x0, y0) {
    // x0 is the x coordinate of the left edge of the line
    // y0 is the y coordinate of the base line of the cue
    appendSVGTextChild(svg, x0, y0, this.text, ["cue"]);
  });
} // end Cue class

class LineAnnotations {
  constructor(lyricLine, y0, cssClasses, fingerPositions = null) {
    this.lyricLine = lyricLine;
    this.y0 = y0;
    this.cssClasses = cssClasses;
    this.bars = lyricLine.bars;
    this.beats = lyricLine.beats;
    this.attacks = lyricLine.attacks;
    this.fingerMap = new Map();
    this.fingerPositions = fingerPositions;
    if (fingerPositions) {
      for (let finger of fingerPositions) {
        this.fingerMap.set(finger[0], finger[1]); // x keys y value
      }
    }
    this.isFingered = this.fingerMap.size > 0;
    // merge the bars and attacks array into one array by concatenating
    // the two arrays and sorting the result.
    this.positions = this.bars.concat(this.attacks).sort((a, b) => a - b);
  }

  nextBar(pos) {
    // return the position of the next barline after the current position
    // Add a lineProblem and return the pos unchanged if were at the last bar already.
    for (let i = 0; i < this.bars.length; i++) {
      let p = this.bars[i];
      if (p > pos) {
        //console.log(`next bar at ${p}`)
        return p
      }
    }
    lineProblems.add("Already at last bar position")
    return pos;
  }

  nextBeat(pos) {
    for (let i = 0; i < this.beats.length; i++) {
      let p = this.beats[i];
      if (p > pos) {
        // console.log(`next beat at ${p}`)
        return p
      }
    }
    lineProblems.add("Already at or past last beat position");
    return pos;
  }
  nextNote(pos) {
    for (let i = 0; i < this.attacks.length; i++) {
      let p = this.attacks[i];
      if (p > pos) {
        // console.log(`next note at ${p}`)
        return p
      }
    }
    lineProblems.add("Already at or past last note position");
    return pos;
  }
  nearestFingerY(x) {
    // return the y coordinate of the nearest finger position
    // to the given x coordinate.
    let nearest = null;
    let minDistance = Infinity;
    for (let [x0, y0] of this.fingerPositions) {
      let d = Math.abs(x0 - x);
      if (d < minDistance) {
        minDistance = d;
        nearest = y0;
      }
    }
    return nearest;
  }
  render(svg, x0, text, step) {
    if (!['bar', 'beat', 'note'].includes(step)) {
      throw new Error(`Invalid step: ${step} : must be one of 'bar', 'beat', or 'note'`);
    }
    const tokens = text.trim().split(/\s+/);
    let pos = 0;

    tokens.forEach(token => {
      switch (token) {
        case "|":
          pos = this.nextBar(pos);
          switch (step) {
            case 'beat':
              pos = this.nextBeat(pos)
              break;
            case 'note':
              pos = this.nextNote(pos)
              break
          }
          break;
        case "_":
          switch (step) {
            case 'bar':
              pos = this.nextBar(pos);
              break;
            case 'beat':
              pos = this.nextBeat(pos)
              break
            case 'note':
              pos = this.nextNote(pos);
              break;
          }
          break;
        default:
          let x = x0;
          x += pos * defaultParameters.lyricFontWidth;
          // Replace underscores with spaces in the rendered text
          let y = this.y0
          if (this.isFingered) {
            y = this.nearestFingerY(x)
          }
          appendSVGTextChild(svg, x, y, token.replace(/_/g, ' '), this.cssClasses);
          // Move to next step position if one is available
          switch (step) {
            case 'bar':
              if (pos < this.bars[this.bars.length - 1]) {
                pos = this.nextBar(pos);
              }
              break;
            case 'beat':
              if (pos < this.beats[this.beats.length - 1]) {
                pos = this.nextBeat(pos);
              }
              break;
            case 'note':
              if (pos < this.attacks[this.attacks.length - 1]) {
                pos = this.nextNote(pos);
              }
              break;
            default:
              break;
          }
          break;
      }
      // console.log(token, pos);
    });
  }
}

class PerBar {
  constructor(text) {
    this.text = text;
  }
  render(svg, x0, y0, lyricLine) {
    const annotations = new LineAnnotations(lyricLine, y0, ['perbar']);
    annotations.render(svg, x0, this.text, 'bar');
  }
}

class PerBeat {
  constructor(text) {
    this.text = text;
  }
  render(svg, x0, y0, lyricLine) {
    const annotations = new LineAnnotations(lyricLine, y0, ['perbeat']);
    annotations.render(svg, x0, this.text, 'beat');
  }
}

class PerNote {
  constructor(text) {
    this.text = text;
  }
  render(svg, x0, y0, lyricLine) {
    const annotations = new LineAnnotations(lyricLine, y0, ['pernote']);
    annotations.render(svg, x0, this.text, 'note');
  }
}

// The  Finger class is used to render fingerings. It is almost identical to the PerNote class.
// except that it adds a small fudge to the x position to make the tiny font
// align better with the pitch letters. 
class Finger {
  constructor(lyricLine, pitchLine) {
    this.lyricLine = lyricLine
    this.positions = pitchLine.fingerPositions;
  }
  render(svg, text) {
    const annotations = new LineAnnotations(
      this.lyricLine,
      0, // not needed
      ['fingering'],
      this.positions);
    annotations.render(svg, defaultParameters.leftX, text, 'note');
  }
}

// The Counter class is similar to the PerBeat class. It provides
// an automated method for rendering beat numbers above the beats.
// The constructor takes 2 arguments:
//    n, the first beat number (should be 1 unless we're starting with a partial measure)
//    lyricLine, an object containing beats and bars arrays for positioning
//    markers, an array of RhythmMarkers used to compute the locations of tuplet beats
class Counter {
  constructor(n, lyricLine, markers) {
    this.n = n;
    this.beats = lyricLine.beats;
    this.subBeats = lyricLine.subBeats;
    this.bars = lyricLine.bars;
    if (this.bars[0] == 0) {
      this.bars.shift(); // drop the pseudo barline at 0
    }
    this.markers = markers;
    this.tuplets = lyricLine.tuplets;
    this.interpolateTuplets();

    // We need to generate a list of beat numbers that resets to 1
    // each time the beat position exceeds the next bar position.
    // The counting will begin with n unless n is <= 0, in which
    // case we will start with 1 for the first beat after the first bar.
    let count = (n > 0) ? n : 1;
    this.counts = [];
    let i = 0; // index into bars
    let j = 0; // index into beats
    for (let beat of this.beats) {
      if (i < this.bars.length) {
        if (beat > this.bars[i]) { // we've crossed the next bar
          count = 1;
          i++;
        }
      }
      j++;
      this.counts.push(count);
      count++;
    }
  }
  reverseInterpolate(deltaPairs, targetY) {
    // Convert delta pairs to cumulative coordinates
    let points = [[0, 0]];
    let sumX = 0, sumY = 0;

    for (const [dx, dy] of deltaPairs) {
      sumX += dx;
      sumY += dy;
      points.push([sumX, sumY]);
    }

    // Find interval containing targetY
    for (let i = 0; i < points.length - 1; i++) {
      const [x0, y0] = points[i];
      const [x1, y1] = points[i + 1];

      if (targetY >= y0 && targetY <= y1) {
        // Linear interpolation within interval
        const fraction = (targetY - y0) / (y1 - y0);
        return x0 + fraction * (x1 - x0);
      }
    }

    return null; // Target Y is outside the function's range
  }

  getNEqualDivisions(deltaPairs, N) {
    // Calculate total Y accumulation
    const totalY = deltaPairs.reduce((sum, [_, dy]) => sum + dy, 0);

    // Calculate Y increment for N divisions
    const increment = totalY / N;

    // Generate array of target Y values
    const divisions = [];
    for (let i = 1; i < N; i++) {
      const targetY = i * increment;
      const x = this.reverseInterpolate(deltaPairs, targetY);
      divisions.push(x);
    }

    return divisions;
  }

  interpolateTuplets() {
    const interpolatedBeats = [];

    for (const [i, beat] of this.beats.entries()) {
      interpolatedBeats.push(beat);

      const fractions = this.markers.beatFractions[i];
      // if (!fractions || fractions.length <= 1) continue;
      if (!fractions) continue;

      // Convert fractions to delta pairs
      const deltaPairs = fractions.map(f => [f.span, f.val]);

      // Calculate actual beat span from the sum of spans
      const beatSpan = deltaPairs.reduce((sum, [dx, _]) => sum + dx, 0);

      // Get N-1 interpolated positions for N-tuplet
      const divisions = this.getNEqualDivisions(deltaPairs, this.tuplets[i].tupletSize);

      // Map the normalized positions to actual beat positions
      const positions = divisions.map(x => beat + x);
      interpolatedBeats.push(...positions);
    }

    this.beats = interpolatedBeats;
  }
  render = (function (svg, x0, y0, fontwidth) {
    // x0 is the x coordinate of the left edge of the line y0 is the
    // y coordinate of the baseline of the line. 
    // fontwidth is the width of the lyric font
    // in pixels.  (the counter font will typically be
    // smaller than the lyric font) We will render the counts by
    // looping through the beats and rendering the count number
    // above each beat. 
    let i = 0;
    for (let count of this.counts) {
      let x = x0 + this.beats[i] * fontwidth;
      appendSVGTextChild(svg, x, y0, count + '', ["counter"]);
      i++;
    }
  });
}
// The FracSpan class is used to represent a fraction. It is used by the
// RhythmMarkers class to represent the subbeats within a beat and span (the number
// of rendered char positions comprising the fraction.
class FracSpan {
  constructor(value, span, kind = '*') {
    this.val = value;
    this.span = span;
    this.kind = kind; // one of attack '*', hold '-', or rest ';'
  }
}
class RhythmMarkers {
  // The purpose of this class is to draw a group of vertical lines whose x
  // coordinates are aligned with the beat notation and having lengths
  // proportional to the subbeats within the beat.  For example, "*-**" will be
  // represented numerically as [0.5, 0.25, 0.25] because the first attack is
  // sustained for 2 of the four subbeats. 
  constructor(lyricLine) {
    this.lyricLine = lyricLine;
    // rhythm is an array of rhythm markup,  as created by LyricLine.extractRhythm()`
    this.rhythms = lyricLine.extractRhythm();
    this.beatFractions = []; // an array of arrays of FracSpan objects
    for (let i = 0; i < this.rhythms.length; i++) {
      const rhythm = this.rhythms[i];
      const baseFraction = this.computeBaseFraction(rhythm);
      //console.log(`baseFraction: ${baseFraction}`);
      // strip underscores from rhythm
      const rhythmNoUnderscores = rhythm.replace(/_/g, '');
      const fractions = [];
      const nchar = rhythm.length;
      let chordIndex = -1; // -1  means not in a chord
      let f = null; // current beat fraction
      for (let j = 0; j < nchar; j++) {
        switch (rhythmNoUnderscores[j]) {
          case '(':
            chordIndex = 0;
            continue;
          case ')':
            f.span = chordIndex;
            chordIndex = -1;
            continue;
          case '-':
            if (j == 0) {
              f = new FracSpan(baseFraction, 1, '-');
            } else {
              f.val++;
            }
            continue;
          case '*':
          case ';':
            switch (chordIndex) {
              case -1:
                if (f) {
                  fractions.push(f);
                }
                f = new FracSpan(baseFraction, 1, rhythm[j]);
                break;
              case 0:
                f = new FracSpan(baseFraction, 1, rhythm[j]);
                chordIndex++;
                break;
              default:
                // ignore attacks in chords after the first  one.
                chordIndex++;
                break
            }
            continue;
        }
      }
      // push the last fraction
      fractions.push(f);
      for (let fraction of fractions) {
        // console.log(fraction);
      }
      // divide each fraction by the sum of fractions

      //const sum = fractions.reduce((a, b) => a + b.val, 0);
      const sum = fractions.reduce((a, b) => a + b.val / baseFraction, 0);
      for (let j = 0; j < fractions.length; j++) {
        fractions[j].val = fractions[j].val / sum;
      }

      this.beatFractions.push(fractions);
    }
    // We may need to adjust the spans of the beat fractions that
    // correspond lyric line syllables with length > 1.
    const spans = this.lyricLine.syllableSpans();
    // console.log(`Syllable spans: ${spans}`)
    if (spans.length > 0) {
      let iSpan = 0;
      for (let arr of this.beatFractions) {
        for (let frac of arr) {
          if (iSpan < spans.length) {
            frac.span = spans[iSpan];
            iSpan++;
          } else {
            console.log(`Warning: too many syllables in lyric line ${this.lyricLine.lyric}`);
          }
        }
      }
    }
  }
  computeBaseFraction(rhythm) {
    // Count effective positions, treating chords as single positions
    let activePositions = 0;
    let underscores = 0;
    let inChord = false;
    for (let j = 0; j < rhythm.length; j++) {
      if (rhythm[j] === '(') {
        inChord = true;
        activePositions++;
      } else if (rhythm[j] === ')') {
        inChord = false;
      } else if (rhythm[j] === '_') {
        underscores++;
      } else if (!inChord && rhythm[j] !== '_') {
        activePositions++;
      }
    }
    if (activePositions === 0) {
      console.log(`Warning: rhythm ${rhythm} has no active positions`);
      lineProblems.add(`Invalid rhythm ${rhythm}`);
      return null;
    }
    return activePositions / (underscores + activePositions)
  }
  render(svg, x0, y0, beats, fontwidth) {
    // x0 is the x coordinate of the left edge of the line 
    // y0 is the y coordinate of the baseline of the line.
    // beats is an array of beat x positions,
    // and fontwidth is the width of the lyric font in pixels. 
    // We will render the rhythm markers by looping through the beats and and
    // drawing a line for each beatFraction.  The length of each line will be
    // proportional to the fraction of the beat and scaled so that the lines
    // will fit within two fontwidths.
    let i = 0;
    const fh = defaultParameters.lyricFontHeight
    const width = fontwidth / 4; // marker width is 1/4 of font width
    for (let fractions of this.beatFractions) {
      let nBeats = this.lyricLine.tuplets[i].tupletSize
      let x = x0 + beats[i] * fontwidth;
      let xb0 = x; let xb1 = x; // left and right ends of the beat
      let y = y0 - fh;
      let height = 0;
      for (let fraction of fractions) {
        height = fraction.val * fh * nBeats;
        height = Math.min(height, fh);
        switch (fraction.kind) {
          case '*':
            appendSVGLineChild(svg, x, y, x, y + height, ["pitch-marker"]);
            break;
          case '-':
            appendSVGLineChild(svg, x, y, x, y + height, ["hold-marker"]);
            break;
          case ';':
            appendSVGLineChild(svg, x, y, x, y + height, ["rest-marker"]);
            break;
        }
        xb1 = x + width - 1;
        x += fraction.span * fontwidth
      }
      // Now draw a thin connector line across the top of the rhythm markers
      // for the beat.
      appendSVGLineChild(svg, xb0, y, xb1, y, ["rhythm-connector"]);
      if (nBeats > 1) {
        // Draw the beat count just to left of the connector line
        appendSVGTextChild(svg, xb0 - 6, y + 8, nBeats, ["pernote", "red"]);
      }
      i++;
    }
  }
}
// The Chord class is used to render chords symbols above beats.
class Chord {
  constructor(text) {
    this.text = text;
    // Trim the text and split on whitespace
    this.tokens = this.text.trim().split(/\s+/);
    // Replace common abreviations with symbols, e.g. "maj" with "△"
    // so that, for example, "Cmaj7" will render as "C△7"
    this.tokens = this.tokens.map(token => {
      return token.replace(/m7b5/, "ø7")
        .replace(/-7b5/, "ø7")
        .replace(/maj7/, "△7")
        .replace(/min/, "m")
        .replace(/m/, "m")
        .replace(/dim/, "°")
        .replace(/aug/, "+")
        .replace(/7b9/, "7♭9")
        .replace(/b/, "♭")
        .replace(/#/, "♯")
        .replace(/\//, "/")
    });
  }
  render = (function (svg, x0, y0, beats, fontwidth) {
    // x0 is the x coordinate of the left edge of the line
    // y0 is the y coordinate of the baseline of the line
    // fontwidth is the width of the lyric font in pixels.
    // (the chord font will typically be larger than the lyric font)
    // As with the Pitch class, we will render the expression
    // by looping through the tokens and rendering each one
    // at the next beat from the lyric line. Before rendering,
    // we split the chord tokens into the root and the chord text,
    // e.g. "Cmaj7" will be split into ["C", "maj7"]. The chord
    // text is rendered in a smaller font than the root.
    // Note, at present I'm using a couple of fudge factors to
    // get the chord text to render correctly. This is not ideal
    // and should be replaced with a more robust solution.
    const xfudge = 1.2 * fontwidth // px
    const yfudge = 4 // px
    let i = 0;
    for (let token of this.tokens) {
      const root = token[0]
      const chtext = token.slice(1)
      let x = x0;
      let y = y0;
      if (i < beats.length) {
        x = x0 + beats[i] * fontwidth;
        // replace any underscores with spaces
        appendSVGTextChild(svg, x, y, root.replace(/_/g, " "), ["chord"]);
        if (root != "_") {
          x += xfudge;
          appendSVGTextChild(svg, x, y, chtext, ["chord-text"]);
        }
      }
      i++;
    }
  })
}
// The ImageLine  class supports the 'image:' keyword.
class ImageLine {
  // This WeakMap holds window-level listeners for image resize events.  It's
  // purpose is to ensure that listeners are garbage collected when the image
  // popup is destroyed.
  static imageResizeListeners = new WeakMap();

  constructor(text) {
    this.text = text.trim();
    this.wellFormed = false;
    this.fetched = false;

    // Parse URL and optional scale factor
    const parts = this.text.split(/\s+/);
    // validate the URL
    this.url = new URL(parts[0]);
    // check that the URL is a valid image URL
    if (!this.url.href.match(/\.(jpg|jpeg|png|gif|svg)$/i)) {
      lineProblems.add(`invalid image URL: ${parts[0]}`);
      return
    }

    // Set scale
    this.scale = parts[1] ? parseFloat(parts[1]) : 0.9;
    if (isNaN(this.scale) || this.scale <= 0) {
      lineProblems.add("image scale must be a positive number");
      return;
    }
    this.wellFormed = true;

  }
  render(svg, x0, y0) {
    if (!this.wellFormed) return;

    // Create score icon using treble clef
    const icon = appendSVGTextChild(svg, 0, 72, "🎼", ["score-icon"]);

    // Create popup div
    const popup = document.createElement('div');
    popup.className = 'image-popup';
    popup.style.display = 'none';
    popup.style.position = 'fixed';
    popup.style.zIndex = '1000';
    popup.style.backgroundColor = 'white';
    popup.style.border = '1px solid black';
    popup.style.padding = '20px';
    popup.style.left = '50%';
    popup.style.top = '50%';
    popup.style.transform = 'translate(-50%, -50%)';

    // Add close button
    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.style.position = 'absolute';
    closeButton.style.right = '5px';
    closeButton.style.top = '5px';
    closeButton.style.border = 'none';
    closeButton.style.background = 'none';
    closeButton.style.fontSize = '20px';
    closeButton.style.cursor = 'pointer';
    popup.appendChild(closeButton);

    // Create img element
    const img = document.createElement('img');
    img.src = this.url;
    const rescaleImage = () => {
      this.fetched = true;
      const viewportWidth = window.innerWidth;
      img.style.width = `${viewportWidth * this.scale}px`;
      img.style.height = 'auto';
    };

    img.onload = rescaleImage;
    window.addEventListener('resize', rescaleImage);

    // Store the listener with the popup as key.  When popup is removed, its
    // entry in WeakMap is automatically cleared
    ImageLine.imageResizeListeners.set(popup, rescaleImage);

    popup.appendChild(img);
    document.body.appendChild(popup);

    // Add click handlers
    icon.addEventListener('click', () => {
      if (!this.fetched) {
        alert(`image: Failed to load\n${this.url}\nPlease check the URL and try again.`);
        return;
      }
      popup.style.display = 'block';
    });

    closeButton.addEventListener('click', () => {
      popup.style.display = 'none';
    });
  }
}

/**************************************************************
  Helper functions
***************************************************************/
async function fetchWithTimeout(url, options = {}, timeout = 5000) {
  /*
  // Usage:
  fetchWithTimeout('https://example.com/api/data', { method: 'POST' }, 10000)
    .then(response => response.json())
    .then(data => console.log(data))
    .catch(error => console.error(error));
    */
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId); // Clear the timeout if the request succeeds
    return response;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw error; // Re-throw other errors
  }
}
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
function musicToPitchLyric(musicLine) {
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
function normalizeBarlines(text) {
  let normalized = "";
  // Add final barline if missing (text doesn't end with '|' after trimming)
  if (!normalized.trim().endsWith('|')) {
    normalized = normalized.trim() + ' |';
  }
  // Next ensure all barlines have one space before and after
  normalized = text.replace(/\s*\|\s*/g, ' | ');

  // Trim any space after the final barline
  return normalized.trim();
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
function preprocessScore(text) {
  text = stripComments(text);
  const blocks = text.split(/\n\s*\n/);
  //console.log(blocks);
  const data = { text: text, lines: [], showIntervals: false };

  // We must deal with three kinds of block.
  // 
  // The first kind is text block that begins with preface: or postscript:
  // or text: and may have one or more lines. Subsequent lines are
  // treated as text lines. 

  // The second kind of block is a single line that begins with
  //   title:, or zoom: It is an error if either of these keywords
  // are followed by anything other than the remainder of the line.
  //
  // The the third kind of block is one or more lines, each of which begins
  // with one of the following keywords: 
  //   cue:, perbar:,  pernote:, perbeat:, 
  //   chord:, music:, lyric:
  // loop through the blocks in reverse order.
  for (let i = blocks.length - 1; i >= 0; i--) {
    let block = blocks[i].trim();
    if (block.startsWith("youtube:")) {
      // youtube video id with optional default play rate
      // e.g. youtube:12345678 0.75
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
    if (block.startsWith("title:")) {
      data.title = block.slice(6).trim();
      blocks.splice(i, 1);
      continue;
    }
    if (block.startsWith("intervals:")) {
      data.showIntervals = true;
      blocks.splice(i, 1);
      continue;
    }
  }

  // at this point only the third kind of blocks are left
  let kvlines = blocks.map(line => {
    const obj = {}; // what we will return
    if (line.startsWith("text:")) {
      obj.text = line.slice(5).trim();
      return obj;
    }
    // If we get to here, it's a music linegroup
    const parts = line.split(/\n/);
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
        case "nomarkers":
          obj.nomarkers = true;
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
  kvlines = kvlines.filter(obj => Object.keys(obj).length > 0);
  //console.log(kvlines);

  // push the remaining lines. 
  for (let kv of kvlines) {
    data.lines.push(kv);
    continue;
  }
  return data;
}
// countLeadingSpaces returns the number of leading spaces in the line.
// It's needed by renderMultiline() because SVG text elements ignore leading
// whitespace.
function countLeadingSpaces(line) {
  let i = 0;
  while (line[i] === ' ') {
    i++;
  }
  return i;
}

function renderMultiline(svg, x, y, text, fontHeight, className) {
  const lines = text.split('\n');

  lines.forEach(line => {
    // We support a single '.' as a blank line indicator
    if (line.trimEnd() === '.') {
      y += fontHeight;
      return
    }
    const dx = countLeadingSpaces(line) * fontHeight * 0.5 // assume fontwidth is half of font height
    // get the fontSize of the textElement
    appendSVGTextChild(svg, x + dx, y, line.trimEnd(), [className]);
    y += fontHeight
  });

  return y;
}

// YouTube IFrame API initialization. Call this function once the page loads.
function initYouTubeAPI() {
  let tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  tag.onload = () => {
    console.log('YouTube IFrame API script loaded');
  };
  let firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

// Minimal player initialization. This implementation avoids third-party cookie issues.
// See https://stackoverflow.com/a/64444601/426853
function onYouTubeIframeAPIReady() {
  console.log('YouTube IFrame API ready');
  player = new YT.Player('player', {
    height: '0',
    width: '0',
    videoId: '',
    host: 'https://www.youtube-nocookie.com',
    playerVars: {
      'playsinline': 1,
      origin: window.location.host
    },
    events: {
      'onStateChange': onPlayerStateChange
    }
  });
}

// Handle player state changes
function onPlayerStateChange(event) {
  const speakerIcons = document.querySelectorAll('.speaker-icon');
  const TIME_TOLERANCE = 0.5; // Half second tolerance

  if (event.data === YT.PlayerState.PLAYING) {
    const currentTime = player.getCurrentTime();
    // Add active class to current speaker icon
    speakerIcons.forEach(icon => {
      const iconTime = parseFloat(icon.dataset.timestamp);
      if (Math.abs(currentTime - iconTime) < TIME_TOLERANCE) {
        icon.classList.add('speaker-icon-active');
      }
    });
  } else if (event.data === YT.PlayerState.ENDED ||
    event.data === YT.PlayerState.PAUSED ||
    event.data === YT.PlayerState.STOPPED) {
    // Remove active class from all speaker icons
    speakerIcons.forEach(icon => {
      icon.classList.remove('speaker-icon-active');
    });
  }
}

function playYouTubeAt(videoId, timeSeconds, rate = 1.0) {
  // Wait for player to be ready
  if (!player || !player.playVideo) {
    setTimeout(() => playYouTubeAt(videoId, timeSeconds, rate), 100);
    return;
  }
  if (player.getPlayerState() === YT.PlayerState.PLAYING) {
    player.pauseVideo();
    return;
  }
  if (player.getVideoData().video_id !== videoId) {
    player.loadVideoById(videoId, timeSeconds);
  } else {
    player.seekTo(timeSeconds);
  }
  try {
    player.setPlaybackRate(rate);
  } catch (e) {
    alert("Can't play this video at that rate. Check the  video to see what rates are supported.");
    console.log(e);
    return;
  }
  console.log("Playing " + videoId + " from " + timeSeconds + " seconds at " + rate + "x");
  player.playVideo()
}
function reconstructSectionText(line) {
  let text = '';
  // Build section text from line properties
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
  // ... add other line properties
  return text;
}

// The renderScore function is used to render the score using the
// members of the data object created by preprocessScore.
//  - wrapper is a div element that will hold svg's we create
//  - data is an object containing the preprocessed score
function renderScore(wrapper, data) {
  // The addEditor function is a closure that adds editing capabilities to a
  // section of the score. The svg argument is the svg element that will
  // be edited.  
  const addEditor = (svg) => {
    // Create a div that will hold the editor and the reload button.
    const editorDiv = document.createElement('div');
    editorDiv.setAttribute('class', 'section-editor-div');
    editorDiv.style.display = 'none';
    editorDiv.style.alignItems = 'flex-start';
    // Create the reload button
    const reloadButton = document.createElement('button');
    reloadButton.textContent = '↻';
    reloadButton.setAttribute('class', 'reload-icon');
    // Create the editor element
    const editor = document.createElement('pre');
    editor.classList.add('section-editor');
    editor.setAttribute('contenteditable', 'plaintext-only');
    editor.style.display = 'block';
    // Wrap the button and editor in the editor div.
    editorDiv.appendChild(reloadButton);
    editorDiv.appendChild(editor);
    wrapper.appendChild(editorDiv);

    // Create a pencil icon  that shows and hides the editor.
    const pencil = appendSVGTextChild(svg, 0, 16, "✎", ['pencil-icon']);
    pencil.addEventListener("click", function (e) {
      e.stopPropagation();
      e.preventDefault();
      e.stopImmediatePropagation();
      editorDiv.style.display = editorDiv.style.display === 'none' ? 'flex' : 'none';
      return false;
    }, true);
    // Each input event on the editor will update the main source
    editor.addEventListener('input', () => {
      const sectionEditors = wrapper.querySelectorAll('.section-editor');
      // Update main source and render
      const fullText = Array.from(sectionEditors)
        .map(ed => ed.textContent.trim())
        .filter(text => text.length > 0)
        .join('\n\n');

      const scoreDiv = wrapper.closest('div.score');
      const mainEditor = scoreDiv.querySelector('pre.source');
      mainEditor.textContent = fullText;
    });
    // The reload button will reload the edited score.
    reloadButton.addEventListener('click', () => {
      // Save editor state
      const activeEditor = editor;
      // Get index of active editor among siblings
      const allEditors = wrapper.querySelectorAll('.section-editor');
      const activeIndex = Array.from(allEditors).indexOf(activeEditor);

      const scoreDiv = wrapper.closest('div.score');
      const score = scoreMap.get(scoreDiv.id);
      score.render();

      // Find and restore state of new editor at same index
      const newEditorDivs = wrapper.querySelectorAll('.section-editor-div');
      const newActiveEditor = newEditorDivs[activeIndex];
      newActiveEditor.style.display = 'flex';
      newActiveEditor.focus();
    });
    return editor; // so caller can add initial text content
  }
  // clear any existing content of the SVG element
  wrapper.innerHTML = "";
  // create an svg element
  let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  let y = 0; // y coordinate of the top of the rendered score
  wrapper.appendChild(svg)
  addEditor(svg)

  // Render any line problems that were encountered in
  // preliminary processing
  y = lineProblems.render(svg, defaultParameters.leftX, y);
  lineProblems.clear();

  // Render the title at the top of the SVG element
  y += 2 * defaultParameters.titleFontHeight
  appendSVGTextChild(svg, defaultParameters.leftX, y, data.title, ['title']);

  // Special handling for first SVG's section editor (title block)
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
    } else {
      data.staff = 4;
    }
    if (data.intervals) {
      titleText += `\n\nintervals: ${data.intervals}`;
    }
    titleEditor.textContent = titleText;
  }

  // Render the score
  data.lines.forEach((line, index) => {
    // create an svg element
    let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    let y = 0; // y coordinate of the top of the rendered score
    wrapper.appendChild(svg)
    let sectionEditor = addEditor(svg);
    // Populate editor with this section's source
    sectionEditor.textContent = reconstructSectionText(line);

    // If it's a text block, render it.
    if (line.text) {
      y += 2 * defaultParameters.lyricFontHeight + defaultParameters.textFontHeight;
      y = renderMultiline(svg, defaultParameters.leftX, y,
        line.text, defaultParameters.textFontHeight, 'text');
      y += defaultParameters.textFontHeight
      return;
    }
    // Handle the music lines. If present, a music line replaces the
    // lyric and pitch lines.
    line.showLyric = true;
    if (line.music) {
      const { lyric, pitch } = musicToPitchLyric(line.music);
      line.lyric = lyric;
      line.pitch = pitch;
      line.showLyric = false;
    }
    let lyricline = undefined
    if (line.lyric) {
      lyricline = new LyricLine(
        line.lyric, line.showLyric);
    }
    y += defaultParameters.lyricFontHeight
    // Render the image, if any. 
    if (line.image) {
      const image = new ImageLine(line.image);
      if (image.wellFormed) {
        image.render(svg, defaultParameters.leftX, y);
      }
    }
    // Render the cue, if any
    if (line.cue) {
      if (!line.lyric) {
        y += defaultParameters.lyricFontHeight;
      } else {
        y += defaultParameters.lyricFontHeight;
      }
      const cue = new Cue(line.cue);
      cue.render(svg, defaultParameters.leftX, y);
    }
    // Render the chords, if any
    if (line.chord && line.lyric) {
      y += defaultParameters.chordFontHeight
      const chord = new Chord(line.chord);
      chord.render(svg, defaultParameters.leftX, y, lyricline.beats, defaultParameters.lyricFontWidth);
      // y += bookParameters.chordFontHeight / 3;
    }
    // Render per-beat items, if any
    if (line.perbeat && line.lyric) {
      y += defaultParameters.perbeatFontHeight * 1.5
      const perbeat = new PerBeat(line.perbeat)
      perbeat.render(svg, defaultParameters.leftX, y, lyricline)
    }
    // Generate rhythm markers. They're needed by Counter.
    let rhythm = undefined;
    if (lyricline) {
      rhythm = new RhythmMarkers(lyricline);
    }
    // Render the rhythm markers unless nomarkers has been set.
    if (line.lyric && !line.nomarkers) {
      // check that there is a least one non-empty rhythm marker before
      // rendering them. This saves vertical space when possible.
      if (rhythm.beatFractions.map(r => r.length > 0).reduce((a, b) => a || b, true)) {
        y += defaultParameters.lyricFontHeight * 1.1
        rhythm.render(svg, defaultParameters.leftX, y, lyricline.beats, defaultParameters.lyricFontWidth);
      }
    }
    // Render the pitches, if any
    let pitchLine = undefined;
    // console.log(`${y} y before pitch line decision`)
    if (line.pitch && line.lyric) {
      y += data.staff * defaultParameters.lyricFontHeight;
      // console.log(`${y} y before pitch line render`)
      try {
        pitchLine = new PitchLine(line.pitch, data.staff);
        pitchLine.render(svg, defaultParameters.leftX, y,
          defaultParameters, lyricline, data.showIntervals);
        // y += data.staff * defaultParameters.lyricFontHeight;
        // console.log(`${y} y after pitch line render`)
      } catch (e) {
        lineProblems.add("Pitch line error: " + e.message);
        //console.log(e);
      }
    }
    // Render the fingerings, if any
    if (line.finger && line.lyric) {
      const finger = new Finger(lyricline, pitchLine)
      finger.render(svg, line.finger)
    }
    if (line.perbar && line.lyric) {
      y += defaultParameters.perbarFontHeight;
      const perbar = new PerBar(line.perbar);
      perbar.render(svg, defaultParameters.leftX, y, lyricline);
    }
    // Render the lyric
    if (line.showLyric) {
      y += 1.1 * defaultParameters.lyricFontHeight;
      if (line.lyric) {
        lyricline.render(svg, defaultParameters.leftX, y, defaultParameters.lyricFontWidth);
      }
    }

    // Render the per note expression marks, if any.
    if (line.pernote && line.lyric) {
      y += defaultParameters.pernoteFontHeight * 1.5; // 2 px extra space between exprs and lyric to clear descenders
      const expr = new PerNote(line.pernote);
      // expr.render(svg, bookParameters.leftX, y, lyricline.attacks, bookParameters.lyricFontWidth);
      expr.render(svg, defaultParameters.leftX, y, lyricline);
    }
    // Render the counter, if any
    if (line.counter && line.lyric) {
      y += defaultParameters.counterFontHeight * 1.5
      // line counter may be an empty string or a string that should be convertible to an integer
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
      // y += bookParameters.counterFontHeight / 3;
    }
    // Render any line problems that were encountered
    y = lineProblems.render(svg, defaultParameters.leftX, y);
    lineProblems.clear();

    // Add click handler for play click handlers
    if (data.youtubeId && line.play !== undefined) {
      svg.style.cursor = 'pointer';
      const speaker = appendSVGTextChild(svg, 0, 48, "🔊", ["speaker-icon"]);

      // Add timestamp data attribute used by onPlayerStateChange()
      speaker.dataset.timestamp = String(line.play);

      speaker.addEventListener('click', (event) => {
        if (event.detail === 1) { // Single click
          setTimeout(() => {
            if (!event.target.clickProcessed) {
              // Remove active class from all icons first
              document.querySelectorAll('.speaker-icon').forEach(icon => {
                icon.classList.remove('speaker-icon-active');
              });
              playYouTubeAt(data.youtubeId, line.play, line.playRate || 1.0);
            }
          }, 200); // Delay to allow for double click detection
        }
        event.target.clickProcessed = (event.detail === 2);
      });
    }
  });
}

export {
  Book, Score, initYouTubeAPI, onYouTubeIframeAPIReady,
}
