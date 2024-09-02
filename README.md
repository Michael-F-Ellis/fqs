# fqs - Music Notation System

fqs is a lightweight, flexible music notation system designed for quick and easy creation of musical scores in a format that is easier to read than conventional notation.

## Features

- Simple text-based notation
- Support for lyrics, chords, and musical expressions
- Customizable rendering options
- Export and import functionality
- Browser-based interface
- Self-contained in a single HTML file. No external dependencies

## Getting Started

1. Open `fqs.html` in any web browser other than Firefox
2. Read the reference score that opens by default.
2. Use the 'Insert New Score' button to create a new score
3. Edit the score using the provided editor area.
4. The rendered score updates in real-time as you edit.

## Development status
FQS is fully functional as a personal music notation system for vocal and single-line (monphonic) instruments. It is not yet suitable for complex polyphonic music - and may never be - though I'd be interested in hearing from anyone who has ideas for extending it.

## Contributing

Contributions are welcome! Feel free to submit issues or pull requests to improve fqs.

## Software Structure
The fqs system is implemented as a single HTML file, `fqs.html` that includes all the necessary JS and CSS. As a web app, it doesn't need a server backend (beyond perhaps serving the file).

Don't edit `fqs.html` directly. It's built from `pre-fqs.html` and `reference.fqs`. Edit those files instead and use `make` to rebuild `fqs.html`. The makefile invokes `build.py` to do the actual work.

