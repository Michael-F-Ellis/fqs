(* FQS Grammar *)

fqs_file ::= score ( "EndOfScore" score )*

score ::= header_block ( blank_line section )*

header_block ::= title_line ( blank_line header_item )*

header_item ::= zoom_line | staff_line | youtube_line | midi_line | intervals_line | layout_line

section ::= text_section | image_section | music_section

text_section ::= "text:" string

image_section ::= "image:" url [ scale ]

music_section ::= music_line_group

music_line_group ::= ( music_line | pitch_lyric_lines ) [ cue_line ] [ chord_line ] [ perbeat_line ] [ perbar_line ] [ pernote_line ] [ finger_line ] [ counter_line ] [ play_line ] [ line_midi_line ]

pitch_lyric_lines ::= pitch_line lyric_line

(* Keyword Lines *)

title_line ::= "title:" string
zoom_line ::= "zoom:" integer
staff_line ::= "staff:" integer
youtube_line ::= "youtube:" video_id [ playback_rate ]
midi_line ::= "midi:" midi_param ( "," midi_param )*
intervals_line ::= "intervals:" ( "on" | "off" )
layout_line ::= "layout:" ( "auto" | "manual" )
cue_line ::= "cue:" string
chord_line ::= "chord:" chord_beat ( " " chord_beat )*
perbeat_line ::= "perbeat:" annotation_item ( " " annotation_item )*
perbar_line ::= "perbar:" annotation_item ( " " annotation_item )*
pernote_line ::= "pernote:" annotation_item ( " " annotation_item )*
finger_line ::= "finger:" annotation_item ( " " annotation_item )*
counter_line ::= "counter:" integer
play_line ::= "play:" time [ playback_rate ]
line_midi_line ::= "midi:" midi_param ( "," midi_param )*
music_line ::= "music:" music_beat ( " " music_beat )*
pitch_line ::= "pitch:" pitch_element*
lyric_line ::= "lyric:" lyric_beat ( " " lyric_beat )*

(* Musical Elements *)

music_beat ::= ( pitch | rest | hold | chord )+ [ partial_beat ]
lyric_beat ::= ( syllable | rest | hold )+ ( "." syllable )* [ partial_beat ]
pitch_element ::= key_signature | barline | pitch
chord_beat ::= chord_symbol | "_"

pitch ::= [ octave_shift ] [ accidental ] note_name
chord ::= "(" pitch+ ")"
rest ::= ";"
hold ::= "-"
double_hold ::= "=" (* exactly equivalent to "--" *)
partial_beat ::= "_"+
syllable ::= utf8_letter+
key_signature ::= "K" ( "0" | ( "#" | "&" ) digit )
barline ::= "|"
octave_shift ::= ( "^" | "/" )+
accidental ::= ( "#" | "##" | "&" | "&&" | "%" )
note_name ::= "a" | "b" | "c" | "d" | "e" | "f" | "g"
chord_symbol ::= string_without_spaces (* e.g., "Am7", "G/B" *)
annotation_item ::= string_without_spaces | "_" | "|"

(* Basic Types *)

string ::= (* any sequence of characters *)
string_without_spaces ::= (* a string with no whitespace *)
utf8_letter ::= (* any valid UTF-8 letter character *)
integer ::= (* one or more digits *)
url ::= (* a valid URL *)
scale ::= (* a floating point number *)
video_id ::= (* a YouTube video ID *)
playback_rate ::= (* a floating point number *)
time ::= (* in "M:S" or "M:SS" format *)
midi_param ::= "tempo=" integer | "ref=" ( note_name | integer ) | "roll=" ( "on" | "off" )
blank_line ::= (* a line containing only whitespace *)

(*
Summary of Key Language Concepts:
Structure: An FQS file is a series of "scores," separated by EndOfScore. Each score has a header and a body composed of sections.
Header: The header defines global properties for the score like title, zoom, staff lines, and default midi settings.
Sections: Sections can be simple text, an image, or a music_line_group. Sections are separated by blank lines.
Music Line Groups: This is the core of the notation. It's a collection of related keywords that describe a single line of music. A line can be defined with a music: keyword (which combines pitch and rhythm) or separately with pitch: and lyric: keywords. Various annotations (chord, perbeat, etc.) can be attached.
Rhythm: Rhythm is defined by whitespace separating beats. Notes within a beat are written together. Special characters like - (hold), ; (rest), and _ (partial beat) control duration.
Pitch: Pitches are standard note names (a-g) and can be modified by accidentals (#, &) and octave shifts (^, /).
Keywords: The language is keyword-driven. The keyword at the beginning of a line determines how the rest of the line is parsed.
*)
