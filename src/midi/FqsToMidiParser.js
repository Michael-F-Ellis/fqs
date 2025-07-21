import { LyricLine } from '../classes/LyricLine.js';
import { PitchLine } from '../classes/Pitch.js';

/**
 * Parses an FQS Score object into a format suitable for MIDI playback.
 */
export class FqsToMidiParser {
    constructor(score) {
        this.score = score;
        this.midi_params = score.data.midi_params || {};
        this.noteEvents = [];
        this.lineBoundaries = [];
        this.parse();
    }

    parse() {
        const tempo = parseInt(this.midi_params.tempo, 10) || 120;
        const beatDuration = 60.0 / tempo;
        let absoluteTime = 0.0;

        this.score.pitchLines.forEach((pitchLine, lineIndex) => {
            const lineStartTime = absoluteTime;
            let lineCurrentTime = 0.0;
            const lyricLine = this.score.lyricLines[lineIndex];

            if (pitchLine && lyricLine) {
                if (pitchLine.pitches.length === lyricLine.attacks.length) {
                    let attackIndex = 0;
                    for (let i = 0; i < lyricLine.beats.length; i++) {
                        const beatStartPos = lyricLine.beats[i];
                        const nextBeatStartPos = (i + 1 < lyricLine.beats.length) ? lyricLine.beats[i + 1] : lyricLine.text.length;
                        
                        const attacksInBeat = lyricLine.attacks.filter(
                            attackPos => attackPos >= beatStartPos && attackPos < nextBeatStartPos
                        );

                        const tuplet = lyricLine.tuplets[i] || { tupletSize: 1 };
                        const notesInBeat = attacksInBeat.length;
                        
                        if (notesInBeat > 0) {
                            const noteDuration = (beatDuration / notesInBeat) * (1 / tuplet.tupletSize);
                            for (let j = 0; j < notesInBeat; j++) {
                                const pitch = pitchLine.pitches[attackIndex];
                                if (pitch && pitch.midiNote) {
                                    this.noteEvents.push({
                                        note: pitch.midiNote,
                                        time: lineCurrentTime,
                                        duration: noteDuration,
                                        lineIndex: lineIndex
                                    });
                                }
                                lineCurrentTime += noteDuration;
                                attackIndex++;
                            }
                        } else {
                            lineCurrentTime += beatDuration;
                        }
                    }
                }
            }
            const lineEndTime = lineStartTime + lineCurrentTime;
            this.lineBoundaries.push({ startTime: 0, endTime: lineCurrentTime });
            absoluteTime = lineEndTime;
        });
    }

    getNoteEvents() {
        return this.noteEvents;
    }

    getLineBoundaries() {
        return this.lineBoundaries;
    }
}
