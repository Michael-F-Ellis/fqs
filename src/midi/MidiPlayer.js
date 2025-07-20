import { FqsToMidiParser } from './FqsToMidiParser.js';

/**
 * Manages MIDI playback using Tone.js.
 */
export class MidiPlayer {
    constructor() {
        this.synth = new Tone.Synth().toDestination();
        this.part = null;
        this.metronome = null;
        this.playingScoreId = null;
        this.playingLineIndex = -1;
    }

    playStopLine(score, lineIndex) {
        // If the clicked line is already playing, stop it.
        if (this.playingScoreId === score.id && this.playingLineIndex === lineIndex) {
            this.stop();
            return;
        }

        // If another line is playing, stop it before starting the new one.
        if (this.playingScoreId !== null) {
            this.stop();
        }
        
        if (Tone.context.state !== 'running') {
            Tone.context.resume();
        }

        const boundary = score.lineBoundaries[lineIndex];
        const notesForLine = score.noteEvents.filter(event => event.lineIndex === lineIndex);

        if (!boundary || notesForLine.length === 0) {
            console.log("No notes to play for this line.");
            return;
        }

        this.playingScoreId = score.id;
        this.playingLineIndex = lineIndex;
        this.toggleIcon(true);

        Tone.Transport.bpm.value = score.data.midi_params.tempo || 120;
        
        if (this.part) {
            this.part.dispose();
        }
        this.part = new Tone.Part((time, value) => {
            this.synth.triggerAttackRelease(Tone.Frequency(value.note, "midi"), value.duration, time);
        }, notesForLine).start(0);
        
        if (score.data.midi_params.metronome === 'on') {
            if (this.metronome) this.metronome.dispose();
            this.metronome = new Tone.Loop(time => {
                new Tone.MembraneSynth().toDestination().triggerAttackRelease("C4", "8n", time);
            }, "4n").start(0);
        }

        Tone.Transport.scheduleOnce(() => {
            this.stop();
        }, boundary.endTime - boundary.startTime); // Duration of the line

        this.part.start(0);
        Tone.Transport.start(Tone.now(), boundary.startTime);
    }

    stop() {
        Tone.Transport.stop();
        Tone.Transport.cancel();
        if (this.part) {
            this.part.stop();
        }
        Tone.Transport.position = 0;
        if (this.metronome) {
            this.metronome.dispose();
            this.metronome = null;
        }
        this.toggleIcon(false);
        this.playingScoreId = null;
        this.playingLineIndex = -1;
    }

    toggleIcon(isPlaying) {
        document.querySelectorAll('.midi-play-icon').forEach(icon => {
            const scoreElement = icon.closest('.score');
            if (!scoreElement) return;

            const scoreId = scoreElement.id;
            const lineIndex = parseInt(icon.dataset.lineIndex, 10);

            if (scoreId === this.playingScoreId && lineIndex === this.playingLineIndex) {
                icon.classList.toggle('midi-playing', isPlaying);
            } else {
                icon.classList.remove('midi-playing');
            }
        });
    }
}
