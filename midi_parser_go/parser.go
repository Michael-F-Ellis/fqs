package midi_parser

import (
	"log"
	"strings"
)

const NoteEvent = 1 // triggered by an asterisk, '*' in the rhythm input
const RestEvent = 2 // triggered by a semicolon, ';' in the rhythm input
const HoldEvent = 3 // triggered by a dash, '-' in the rhythm input
const LineEvent = 4 // inserted by the parser at the beginning of each line before other events.

type MusicEvent struct {
	Kind       int     // NoteEvent | RestEvent | HoldEven | LineEvent
	tIdx       int     // index of the tuplet that contains this event.
	ChordIndex int     // index of notes in a chord. (valid for NoteEvents. Set to -1 for non chord notes
	Time       float64 // start time of event
	Duration   float64 // duration of event
	Note       int     // a MIDI pitch (valid if Kind is NoteEvent)
}

// Tuplet represents a rhythmic grouping within a beat.
type Tuplet struct {
	Text       string // The raw lyric text, e.g., "(*--*)"
	TupletSize int    // number of beats spanned by this tuplet, e.g., 2 for a 2 beat triplet
	// The following are assigned at parse time
	subDivisions int
}

// LyricLine represents a line of lyrics, providing the rhythmic structure.
type LyricLine struct {
	Tuplets []Tuplet
}

// Pitch represents a single musical pitch.
type Pitch struct {
	MidiNote         int  // MIDI note number (0-127)
	IsChordPitch     bool // True if this pitch is part of a chord
	ChordGroupNumber int  // Identifies which chord group this pitch belongs to
}

// PitchLine represents a line of musical pitches.
type PitchLine struct {
	Pitches []Pitch
}

// MidiParams contains MIDI-specific parameters for playback.
type MidiParams struct {
	Tempo int
	Roll  string // "on" or "off"
}

// Score represents the entire musical piece to be parsed.
type Score struct {
	PitchLines []PitchLine
	LyricLines []LyricLine
	MidiParams MidiParams
}

func NewScore(pitchLines []PitchLine, lyricLines []LyricLine, midiParams MidiParams) *Score {
	return &Score{
		PitchLines: pitchLines,
		LyricLines: lyricLines,
		MidiParams: midiParams,
	}
}

type FQSMIDIParser struct {
	// Input
	score *Score
	// State
	rollChords bool // stagger chord tone attacks if true
	// State variables
	tIdx     int      // index of current tuplet
	pos      int      // current position in current tuplet
	beatTime float64  // time of current beat in beats (i.e. not yet scaled for tempo)
	chordIdx int      // index of current chord
	inChord  bool     // whether we're in a chord
	Tuplets  []Tuplet // tuplets for the current line
	// Output
	Events []MusicEvent
}

func NewMidiParser(score *Score) *FQSMIDIParser {
	return &FQSMIDIParser{
		score:      score,
		tIdx:       0,
		pos:        0,
		inChord:    false,
		chordIdx:   0,
		rollChords: false,
		Events:     []MusicEvent{},
	}
}

func (p *FQSMIDIParser) Parse() {

	for i, line := range p.score.LyricLines {
		//insert a Music event of Kind 'LineEvent'
		p.Events = append(p.Events, MusicEvent{
			Kind: LineEvent,
		})
		// get the tuplets for this line.
		p.Tuplets = line.Tuplets
		// get the PitchLine for this line
		pitchLine := p.score.PitchLines[i]

		for p.tIdx < len(p.Tuplets) {
			tuplet := &p.Tuplets[p.tIdx]
			ttext := strings.TrimSpace(tuplet.Text)
			for p.pos < len(ttext) {
				switch tuplet.Text[p.pos] {
				case '(':
					p.beginChord()
				case ')':
					p.endChord(tuplet)
				case '*':
					p.addNoteEvent(tuplet)
				case '-':
					p.addHoldEvent()
				case ';':
					p.addRestEvent()
				default:
					log.Fatalf("invalid character: %c", ttext[p.pos])

				}
				p.pos++
			}
			p.ProcessTupletEnd()
		}
		// match note values from pitchLine to NoteEvents in the current line
		pitchIdx := 0
		for i, event := range p.Events {
			if event.Kind == NoteEvent {
				p.Events[i].Note = pitchLine.Pitches[pitchIdx].MidiNote
				pitchIdx++
			}
		}
		// remove all events that aren't NoteEvents
		for i := len(p.Events) - 1; i >= 0; i-- {
			if p.Events[i].Kind != NoteEvent {
				p.Events = append(p.Events[:i], p.Events[i+1:]...)
			}
		}
	}
}

func (p *FQSMIDIParser) beginChord() {
	p.inChord = true
	p.chordIdx = 0
}

func (p *FQSMIDIParser) endChord(t *Tuplet) {
	p.inChord = false
	p.chordIdx = -1
	t.subDivisions++
}

func (p *FQSMIDIParser) addNoteEvent(tp *Tuplet) {
	p.Events = append(p.Events, MusicEvent{
		Kind:       NoteEvent,
		tIdx:       p.tIdx,
		ChordIndex: p.chordIdx,
	})
	if !p.inChord {
		tp.subDivisions++
	} else {
		p.chordIdx++
	}
}

func (p *FQSMIDIParser) addHoldEvent() {
	p.Events = append(p.Events, MusicEvent{
		Kind:       HoldEvent,
		tIdx:       p.tIdx,
		ChordIndex: p.chordIdx,
	})
}

func (p *FQSMIDIParser) addRestEvent() {
	p.Events = append(p.Events, MusicEvent{
		Kind:       RestEvent,
		tIdx:       p.tIdx,
		ChordIndex: p.chordIdx,
	})
}

func (p *FQSMIDIParser) ProcessTupletEnd() {
	tuplet := &p.Tuplets[p.tIdx]
	beats := float64(tuplet.TupletSize)             // # of beats in this tuplet
	subSize := beats / float64(tuplet.subDivisions) // fractional beats per subdivision
	p.beatTime += beats                             // This will be the start time of the next tuplet.

	// Walk backward through the events of the current tuplet assigning start times
	holdDuration := 0.0
	for i := len(p.Events) - 1; i >= 0; i-- {
		ifloat := float64(i)
		event := &p.Events[i]
		if event.tIdx != p.tIdx {
			break // we've walked back past the first event in this tuplet.
		}
		switch event.Kind {
		case NoteEvent:
			if event.ChordIndex == -1 || !p.rollChords {
				event.Time = p.beatTime - ifloat*subSize
				event.Duration = subSize + holdDuration
				holdDuration = 0.0
			} else {
				event.Time = p.beatTime - ifloat*subSize + float64(event.ChordIndex)*subSize
				event.Duration = subSize - float64(event.ChordIndex)*subSize + holdDuration
				holdDuration = 0.0

			}
		case HoldEvent:
			holdDuration += subSize
			event.Time = p.beatTime - ifloat*subSize
		case RestEvent:
			event.Time = p.beatTime - ifloat*subSize
			event.Duration = subSize + holdDuration
			holdDuration = 0.0
		}

	}
	p.tIdx++
	p.pos = 0
}

/*
// Parse takes a Score object and returns a slice of NoteEvents for each line.
func Parse(score Score) [][]MusicEvent {
	allLinesEvents := make([][]MusicEvent, len(score.PitchLines))
	beatDuration := 60.0 / float64(score.MidiParams.Tempo)
	rollChords := score.MidiParams.Roll != "off"

	for lineIndex, pitchLine := range score.PitchLines {
		if lineIndex >= len(score.LyricLines) {
			break
		}
		lyricLine := score.LyricLines[lineIndex]

		// Pass 1: Get all note start times
		noteStartTimes := calculateNoteStartTimes(lyricLine, pitchLine, beatDuration, rollChords)

		// Pass 2: Build the final events with durations
		allLinesEvents[lineIndex] = buildNoteEvents(noteStartTimes, pitchLine, beatDuration)
	}

	return allLinesEvents
}
*/
