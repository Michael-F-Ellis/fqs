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
        let currentTime = 0.0;

        this.score.data.lines.forEach((line, lineIndex) => {
            const lineStartTime = currentTime;

            if (line.pitch && line.lyric) {
                const pitchLine = new PitchLine(line.pitch, this.score.data.staff, this.score.data.midi_params);
                console.log('FqsToMidiParser: Parsed pitches from PitchLine:', pitchLine.pitches);
                const lyricLine = new LyricLine(line.lyric, true);

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
                                        time: currentTime,
                                        duration: noteDuration,
                                        lineIndex: lineIndex
                                    });
                                }
                                currentTime += noteDuration;
                                attackIndex++;
                            }
                        } else {
                            currentTime += beatDuration;
                        }
                    }
                }
            }
            this.lineBoundaries.push({ startTime: lineStartTime, endTime: currentTime });
        });
    }

    getNoteEvents() {
        return this.noteEvents;
    }

    getLineBoundaries() {
        return this.lineBoundaries;
    }
}
