import { FqsToMidiParser } from './FqsToMidiParser.js';

/**
 * Manages MIDI playback using Tone.js.
 */
export class MidiPlayer {
    constructor() {
        this.synth = new Tone.Synth().toDestination();
        this.part = null;
        this.metronome = null;
        this.noteEvents = [];
        this.lineBoundaries = [];
        this.playingLineIndex = -1;
    }

    loadScore(score) {
        const parser = new FqsToMidiParser(score);
        this.noteEvents = parser.getNoteEvents();
        console.log('MidiPlayer: Loaded note events:', this.noteEvents);
        this.lineBoundaries = parser.getLineBoundaries();
        this.scoreData = score.data;

        if (this.part) {
            this.part.dispose();
        }
        this.part = new Tone.Part((time, value) => {
            this.synth.triggerAttackRelease(Tone.Frequency(value.note, "midi"), value.duration, time);
        }, this.noteEvents).start(0);
    }

    playStopLine(lineIndex) {
        // If the clicked line is already playing, stop it.
        if (this.playingLineIndex === lineIndex) {
            this.stop();
            return;
        }

        // If another line is playing, stop it before starting the new one.
        if (this.playingLineIndex !== -1) {
            this.stop();
        }
        
        if (Tone.context.state !== 'running') {
            Tone.context.resume();
        }

        const boundary = this.lineBoundaries[lineIndex];
        if (!boundary || this.noteEvents.length === 0) {
            console.log("No notes to play for this line.");
            return;
        }

        this.playingLineIndex = lineIndex;
        this.toggleIcon(true);

        Tone.Transport.bpm.value = this.scoreData.midi_params.tempo || 120;
        
        if (this.scoreData.midi_params.metronome === 'on') {
            if (this.metronome) this.metronome.dispose();
            this.metronome = new Tone.Loop(time => {
                new Tone.MembraneSynth().toDestination().triggerAttackRelease("C4", "8n", time);
            }, "4n").start(0);
        }

        // When the transport stops (e.g., at the end of the line), reset the state.
        Tone.Transport.scheduleOnce(() => {
            this.stop();
        }, boundary.endTime);

        Tone.Transport.start(Tone.now(), boundary.startTime);
    }

    stop() {
        Tone.Transport.stop();
        Tone.Transport.cancel();
        if (this.metronome) {
            this.metronome.dispose();
            this.metronome = null;
        }
        this.toggleIcon(false);
        this.playingLineIndex = -1;
    }

    toggleIcon(isPlaying) {
        document.querySelectorAll('.midi-play-icon').forEach((icon, index) => {
            if (index === this.playingLineIndex) {
                icon.classList.toggle('midi-playing', isPlaying);
            } else {
                icon.classList.remove('midi-playing');
            }
        });
    }
}
