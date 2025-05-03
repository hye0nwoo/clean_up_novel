# Novel File Organizer

[![한국어](https://img.shields.io/badge/언어-한국어-blue.svg)](README.md)
[![English](https://img.shields.io/badge/Language-English-blue.svg)](README_EN.md)

[![Status](https://img.shields.io/badge/status-reimplementation-yellow)](README.md)
[![Python](https://img.shields.io/badge/Python-3.8+-blue)](https://www.python.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-green)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-lightgrey)](LICENSE)

A program that finds and organizes duplicate novel files (.txt, .epub).

## ⚠️ Important Notice

The program is currently under reimplementation:
- Existing files have been removed and need to be reimplemented
- Both CLI and GUI versions will be rewritten
- Previous functionality will be improved in the new implementation

## Development Plan

1. CLI Version (Python)
   - Restore core functionality from previous version
   - Improve performance and stability
   - Enhance test coverage

2. GUI Version (JavaScript)
   - Implement new interface with Vue.js
   - Provide desktop app through Electron
   - Optimize user experience

## Planned Features

- Filename-based Duplicate Detection
  - Ignores metadata tags ([xxx], (xxx))
  - Auto-detects series (Vol.1, Book 1, etc.)
  - Ignores spacing and special characters
- Automatic Duplicate Management
  - Moves to 'duplicates' folder
  - Maintains original folder structure
- File Processing
  - Multi-core parallel processing support
  - Large file processing optimization
  - Handles files under 50MB
  - Memory usage optimization

## Version Information

1. [CLI Version](cli_python/README_EN.md)
   - Python-based command-line interface
   - Multi-threaded/Multi-process processing
   - Efficient duplicate file detection

2. [GUI Version](gui_js/README_EN.md)
   - JavaScript/Vue.js-based web interface
   - Electron-based desktop app
   - User-friendly interface

## System Requirements

- Operating System: Windows 10 or later
- Python 3.8 or higher (CLI version)
- Node.js 18.x or higher (GUI version)
- Memory: 4GB or more recommended
- Storage: At least 2x the size of files to process
- Multi-core CPU recommended

## Contributing

As the project is under reimplementation, we welcome contributions:
1. Bug reports through issue tracker
2. Feature improvement suggestions
3. Code contributions through pull requests

## License

This project is distributed under the MIT License.

## Precautions

- Write permission required in executable folder
- Do not modify files during processing
- Files over 50MB are not processed
- Corrupted text files may not process correctly

## Troubleshooting

### When Program Becomes Unresponsive
1. Close and restart the program
2. Try processing fewer files

### When Duplicates Are Not Properly Detected
1. Try different similarity thresholds
   - 0.8: Loose check
   - 0.85: Default
   - 0.9: Strict check
2. Check for special characters in filenames
3. Verify series notation format 