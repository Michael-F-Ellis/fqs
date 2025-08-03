// src/midi/FqsToMidiParser.js

const NoteEvent = 1;
const RestEvent = 2;
const HoldEvent = 3;

/**
 * A JavaScript implementation of the FQS to MIDI event parser.
 * This is a direct translation of the Go parser.
 */
export class FqsToMidiParser {
    /**
     * @param {object} score - The score object to parse.
     */
    constructor(score) {
        this.score = score;
        this.rollChords = score.MidiParams.Roll !== "off";

        // Sanitize lyric tuplets before parsing
        if (this.score.LyricLines) {
            this.score.LyricLines.forEach(line => {
                if (line.Tuplets) {
                    line.Tuplets.forEach(tuplet => {
                        tuplet.text = this.convertLyricTuplet(tuplet.text);
                    });
                }
            });
        }

        // State variables
        this.tIdx = 0;
        this.pos = 0;
        this.beatTime = 0.0;
        this.chordIdx = 0;
        this.inChord = false;
        this.numNotesInChord = 0;
        this.Tuplets = [];
        this.Events = [];
    }

    /**
     * Converts a lyric tuplet into a purely rhythmic one.
     * This is idempotent.
     * e.g., "Hap.py -" becomes "**-"
     * @param {string} lyricText The lyric text of a tuplet.
     * @returns {string} The rhythm-only text.
     */
    convertLyricTuplet(lyricText) {
        // First, replace any sequence of letters with a single asterisk.
        const withAsterisks = lyricText.replace(/[a-zA-Z]+/g, '*');
        // Then, remove any character that is not part of the rhythmic alphabet.
        // The hyphen must be at the end of the character set to be treated literally.
        return withAsterisks.replace(/[^*;()_-]/g, '');
    }

    /**
     * Parses the score and returns an array of music events for each line.
     * @returns {Array<Array<object>>}
     */
    parse() {
        const allLinesEvents = [];
        let holdAccumulator = 0.0;

        for (let lineIdx = 0; lineIdx < this.score.LyricLines.length; lineIdx++) {
            const lyricLine = this.score.LyricLines[lineIdx];
            this.tIdx = 0;
            this.pos = 0;
            // Add a 'subdivisions' property to our working copy of the tuplets. We'll use it for counting.
            this.Tuplets = lyricLine.Tuplets.map(t => ({ ...t, subDivisions: 0 }));
            this.Events = [];

            // Loop over all the tuplets, creating event sequences for each.
            while (this.tIdx < this.Tuplets.length) {
                const tuplet = this.Tuplets[this.tIdx];
                const ttext = tuplet.text.trim();
                this.pos = 0; // Reset position for each tuplet text
                while (this.pos < ttext.length) {
                    const char = ttext[this.pos];
                    switch (char) {
                        case '(':
                            this._beginChord(ttext);
                            break;
                        case ')':
                            this._endChord(tuplet);
                            break;
                        case '*':
                            this._addNoteEvent(tuplet, lineIdx);
                            break;
                        case '-':
                            this._addHoldEvent(tuplet, lineIdx);
                            break;
                        case ';':
                            this._addRestEvent(tuplet, lineIdx);
                            break;
                        case '_':
                        case ' ':
                            // ignore
                            break;
                        default:
                            throw new Error(`Invalid character in rhythm: ${char}`);
                    }
                    this.pos++;
                }
                this._processTupletEnd(); // calculates start times and provisional durations
            }
            // Deal with hold events
            const [lineEvents, newHoldAccumulator] = this._processLineEvents(holdAccumulator);
            holdAccumulator = newHoldAccumulator;
            // find the pitches that match the note events.
            const pitchLine = this.score.PitchLines[lineIdx];
            let pitchIdx = 0;
            for (const event of lineEvents) {
                if (event.Kind === NoteEvent) {
                    if (pitchLine && pitchIdx < pitchLine.Pitches.length) {
                        event.Note = pitchLine.Pitches[pitchIdx].midiNote;
                        pitchIdx++;
                    }
                }
            }
            allLinesEvents.push(lineEvents);
        }
        // Deal with holds across lines.
        if (holdAccumulator > 0) {
            for (let i = allLinesEvents.length - 1; i >= 0; i--) {
                if (allLinesEvents[i].length > 0) {
                    const lastEvent = allLinesEvents[i][allLinesEvents[i].length - 1];
                    if (lastEvent.Kind === NoteEvent) {
                        lastEvent.Duration += holdAccumulator;
                        break;
                    }
                }
            }
        }

        return allLinesEvents;
    } // End of parse method

    // This method deals with hold events, applying their duration to prior note events.
    _processLineEvents(holdAccumulator) {
        const finalEvents = [];
        if (this.Events.length > 0 && this.Events[0].Kind === NoteEvent) {
            this.Events[0].Duration = (this.Events[0].Duration || 0) + holdAccumulator;
            holdAccumulator = 0;
        }

        for (let i = this.Events.length - 1; i >= 0; i--) {
            const event = this.Events[i];
            switch (event.Kind) {
                case HoldEvent:
                    holdAccumulator += event.Duration;
                    break;
                case RestEvent:
                    holdAccumulator = 0;
                    break;
                case NoteEvent:
                    event.Duration += holdAccumulator;
                    holdAccumulator = 0;
                    finalEvents.unshift(event);
                    break;
            }
        }
        return [finalEvents, holdAccumulator];
    }

    _beginChord(ttext) {
        this.inChord = true;
        this.chordIdx = 0;
        const endParen = ttext.substring(this.pos).indexOf(')');
        if (endParen === -1) {
            throw new Error(`Mismatched parenthesis in tuplet: ${ttext}`);
        }
        const chordText = ttext.substring(this.pos, this.pos + endParen);
        this.numNotesInChord = (chordText.match(/\*/g) || []).length;
    }

    _endChord(tuplet) {
        this.inChord = false;
        this.chordIdx = -1;
        tuplet.subDivisions++;
    }

    _addNoteEvent(tuplet, lineIdx) {
        const event = {
            Kind: NoteEvent,
            LineIndex: lineIdx,
            tIdx: this.tIdx,
            ChordIndex: this.inChord ? this.chordIdx : -1,
            NumNotesInChord: this.inChord ? this.numNotesInChord : 0,
            Duration: 0,
        };
        this.Events.push(event);

        if (!this.inChord) {
            tuplet.subDivisions++;
        } else {
            this.chordIdx++;
        }
    }

    _addHoldEvent(tuplet, lineIdx) {
        this.Events.push({
            Kind: HoldEvent,
            LineIndex: lineIdx,
            tIdx: this.tIdx,
            Duration: 0,
        });
        if (!this.inChord) {
            tuplet.subDivisions++;
        }
    }

    _addRestEvent(tuplet, lineIdx) {
        this.Events.push({
            Kind: RestEvent,
            LineIndex: lineIdx,
            tIdx: this.tIdx,
            Duration: 0,
        });
        if (!this.inChord) {
            tuplet.subDivisions++;
        }
    }
    // Walks backward through events, computing start times and provisional durations for a single tuplet.
    _processTupletEnd() {
        const tuplet = this.Tuplets[this.tIdx];
        let beats = tuplet.tupletSize;
        if (tuplet.subDivisions === 0) {
            this.tIdx++;
            return;
        }

        const numUnderscores = (tuplet.text.match(/_/g) || []).length;
        if (numUnderscores > 0) {
            const numRhythmicChars = (tuplet.text.match(/[\*;-]/g) || []).length;
            if (numRhythmicChars > 0) {
                beats = beats * numRhythmicChars / (numRhythmicChars + numUnderscores);
            }
        }

        const subSize = beats / tuplet.subDivisions;

        let subdivisionFromEnd = 0;
        for (let i = this.Events.length - 1; i >= 0; i--) {
            const event = this.Events[i];
            if (event.tIdx !== this.tIdx) {
                break;
            }

            let isNoteOrRest = false;
            switch (event.Kind) {
                case NoteEvent:
                    isNoteOrRest = true;
                    if (event.ChordIndex === -1 || !this.rollChords) {
                        event.Time = this.beatTime + (tuplet.subDivisions - subdivisionFromEnd - 1) * subSize;
                        event.Duration = subSize;
                    } else {
                        const stagger = (event.NumNotesInChord > 0) ? subSize / event.NumNotesInChord : 0;
                        event.Time = this.beatTime + (tuplet.subDivisions - subdivisionFromEnd - 1) * subSize + event.ChordIndex * stagger;
                        event.Duration = subSize - event.ChordIndex * stagger;
                    }
                    break;
                case HoldEvent:
                case RestEvent:
                    isNoteOrRest = true;
                    event.Time = this.beatTime + (tuplet.subDivisions - subdivisionFromEnd - 1) * subSize;
                    event.Duration = subSize;
                    break;
            }

            if (!event.ChordIndex || event.ChordIndex <= 0) {
                subdivisionFromEnd++;
            }
        }
        this.beatTime += beats;
        this.tIdx++;
    }
}