/*
 * PEG Grammar for a single FQS Score
 */

// A Score is a self-contained unit, from header to the end of the text.
Score
  = header:HeaderSection sections:(_ BlankLine _ s:Section { return s; })* _ {
      return { type: "score", header, sections };
    }

// The header section contains metadata for the score. It consists of allowed
// items separated by line breaks.  The first BlankLine encountered terminates
// the header.
HeaderSection
  = items:(first:HeaderItem rest:(_ LineBreak _ i:HeaderItem { return i; })* { return [first, ...rest]; })? {
      const header = {};
      if (items) {
        items.forEach(item => {
          Object.assign(header, item);
        });
      }
      return header;
    }

HeaderItem
  = TitleLine / ZoomLine / StaffLine / YoutubeLine / MidiLine / IntervalsLine 

// Sections make up the body of the score.
Section
  = TextSection
  / ImageSection
  / MusicSection

// A text section is one or more lines of text. It begins with the 'text:'
// keyword and ends with a blank line.  We also so support a rudimentary font
// capability that allows the user to specify the text size and style in
// parentheses at the beginning of the line.  Examples:
// text: (1.2) This text will render in normal font 20% larger than the default ...
// text: (i 0.5) This text will render in italic font 50% smaller than the default ...
// text: (b 2) This text will render in bold font twice the size of the default ...
TextSection
  = "text:" _ fontspec:FontSpec? content:$( (!BlankLine .)* ) {
      return { type: "text", fontspec:fontspec, text: content.trim() };
    }

// A font spec allows specifying italic or bold style and a scale factor
// relative to the default font size. If either or both values are missing, the
// defaults are normal 'n' and 1.0.
FontSpec
  = "(" style:("i" / "b")* scale:Float?  _ ")" [ \t]+ {
    return {style: style!== null ? style : n, scale: scale !== null ? scale : scale: 1.0}
  }

// An image section displays an image within the score. There are two required
// arguments: A valid URL and a scale factor as a float.  The scale factor
// defines how the width of the image will be scaled relative to the width of
// its container. The default is 0.9.
ImageSection
  = "image:" _ url:Url _ scale:Float? _ {
      return { type: "image", url, scale: scale !== null ? scale : 0.9 };
    }

// A music section is a group of lines that describe a single line of music. 
MusicSection
  = lines:(first:MusicSectionLine rest:(_ LineBreak _ !BlankLine l:MusicSectionLine { return l; })* { return [first, ...rest]; }) {
      const section = { type: "music_section", lines: {} };
      lines.flat().forEach(line => {
        Object.assign(section.lines, line);
      });
      return section;
    }

// A music section must contain exactly one music line. It may contain at most
// one each of lyric, chord, finger, counter, and play lines. Multiple cue lines
// are allowed.
MusicSectionLine
  = MusicLine / LyricLine / CueLine / ChordLine / FingerLine / CounterLine / PlayLine / MidiLine


// -- Keyword Line Definitions --

// Header only:

// A title line specifies the score title.
TitleLine
  = "title:" _ value:String { return { title: value }; }

// A zoom line specifies the scaling factor for the score. The default is 1.0.
ZoomLine
  = "zoom:" _ value:Float { return { zoom: value }; }

// A staff line specifies how many lines are drawn for the staff. The default is 4.
StaffLine
  = "staff:" _ value:Integer { return { staff: staff !== null ? staff : 4 }; };

// A youtube line specifies a video id and, optionally, a play rate. The default is 1.0.
YoutubeLine
  = "youtube:" _ id:VideoId _ rate:Float? { return { youtube: { id, rate: rate !== null ? rate : 1.0 } }; }

// A midi line may appear in the HeaderSection to establish defaults for the
// score or in a Music Section to override the defaults for that section.
MidiLine
  = "midi:" _ params:MidiParamList { return { midi: params }; }

MidiParamList
  = first:MidiParam rest:(_ "," _ p:MidiParam { return p; })* {
      const params = { ...first };
      rest.forEach(p => Object.assign(params, p));
      return params;
    }

MidiParam
  = "tempo=" bpm:Integer { 
    return { tempo: bpm }; 
    } 
  / "ref=" v:MidiRefValue { return { ref: v }; } // midi reference note and octave, e.g. 'G3'
  / "roll=" v:$("on" / "off") { return { roll: v }; } // whether or not to roll chords.

MidiRefValue
  = n:MidiRefNoteName o:Integer? { return n + (o !== null ? o : ""); }

MidiRefNoteName
  = $[a-gA-G]

// An intervals line controls whether interval sizes are displayed between pitches.
// The default is 'off'.
IntervalsLine
  = "intervals:" _ value:$("on" / "off") _ { 
    return { intervals: value !== null ? value : "off" }; 
    }

CueLine
  = "cue:" _ FontSpec? _ value:String { return { cue: value }; }

ChordLine
  = "chord:" _ value:String { return { chord: value }; }

FingerLine
  = "finger:" _ value:String { return { finger: value }; }

CounterLine
  = "counter:" _ value:Integer { return { counter: value }; }

PlayLine
  = "play:" _ time:Time _ rate:Float? { return { play: { time, rate: rate !== null ? rate : 1.0 } }; }

MusicLine
  // = "music:" _ value:String { return { music: value }; }
  = "music:" _ value:Bar+ { return { music: value }; }

LyricLine
  = "lyric:" _ value:String { return { lyric: value }; }


// -- Basic Types & Lexical Tokens --

NoteName
  = $[a-g]

VideoId
  = $[a-zA-Z0-9_-]+

Url
  = "https://" rest:$([a-zA-Z0-9-._~:/?#@!$'*+,;=%]+) { return "https://" + rest; }

Time "time"
  = min:[0-9]+ ":" sec:$([0-9][0-9]?) { return { minutes: parseInt(min.join('')), seconds: parseInt(sec) }; }

// -- Music line components & Tokens --

// A bar is an optional key signature plus one or more beat tuples.
Bar
  = first:(_ KeySig? _ BeatTuple+) rest:(_ Barline)


// A bar line terminates a bar.
Barline
  = "_ | _"

// A key signature specifies the number of sharps or flats.
KeySig
  = "K0" / ("K" [#&] [1-7])

// A beat tuple contains the sub-beats in one or more beats.
BeatTuple 
  = [2-9]* BeatGroup

BeatGroup
  = SubBeat+ Partial*

SubBeat = (Chord / ( Pitch / Rest / Hold ))

Chord
  = "(" Pitch+ ")"

Rest 
  = ";"

Hold
 = SingleHold / DoubleHold 

SingleHold
  = "-"

DoubleHold 
  = "="

Partial
  = "_"

Pitch
  = OctaveMarks* Alteration* NoteName

OctaveMarks
  = ("^"+ / "/"+)


// An alteration specifies a sharp or flat for a single note.
Alteration
  = ("&&" / "&") / ("##" / "#")

// Fundamental types

String "string"
  = [^\n\r]* { return text(); }


Integer "integer"
  = digits:[0-9]+ { return parseInt(text(), 10); }

Float "float"
  = digits:([0-9]* ("." [0-9]*)*) { return parseFloat(text(), 10); }

// -- Whitespace and Separators --

_ "whitespace"
  = [ \t]*

// A line break is a newline preceded by optional whitespace.
LineBreak "line break"
  = _ ( "\n" / "\r\n")

// A blank line is whitespace containing at least 2 line breaks.
BlankLine "blank line separator"
  = LineBreak LineBreak+ _
