# fqs - Music Notation System

fqs is a lightweight, flexible music notation system designed for quick and easy creation of musical scores in a format that is easier to read than conventional notation.

## Features

- Simple text-based notation
- Support for lyrics, chords, and musical expressions
- Built-in editor.
- Customizable rendering options
- Export and import functionality
- Browser-based interface
- Self-contained. No external dependencies

## Getting Started

1. Visit https://michael-f-ellis.github.io/fqs/fqs.html in any web browser other than Firefox
2. Click the 'Import URL' button and accept the default URL that opens the Reference book.
3. Read and interact with the reference book to learn how to use fqs

## Development status
FQS is fully functional as a personal music notation system for vocal and single-line (monphonic) instruments. It is not yet suitable for complex polyphonic music - and may never be - though I'd be interested in hearing from anyone who has ideas for extending it.

## Contributing

Contributions are welcome! Feel free to submit issues or pull requests to improve fqs.

## Software Structure
The fqs system is implemented as a single HTML file, `fqs.html` that  imports all the necessary JS and CSS from `fqs.js` and `fqs.css`.  As a web app, it doesn't need a server backend (beyond serving the html).

Don't edit `fqs.html` directly. It's built from `pre-fqs.html` and `reference.fqs`. Edit those files instead and use `make` to rebuild `fqs.html`. The makefile invokes `build.py` to do the actual work.

