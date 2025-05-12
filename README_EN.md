# Novel File Organizer (CLI)

[![한국어](https://img.shields.io/badge/언어-한국어-blue.svg)](README.md)
[![English](https://img.shields.io/badge/Language-English-blue.svg)](README_EN.md)

[![Status](https://img.shields.io/badge/status-completed-green)](README_EN.md)
[![Python](https://img.shields.io/badge/Python-3.8+-blue)](https://www.python.org/)
[![License](https://img.shields.io/badge/License-MIT-lightgrey)](LICENSE)
[![Version](https://img.shields.io/badge/Version-1.0.3-blue)](README_EN.md)

A command-line program that finds and organizes duplicate novel files (.txt, .epub) in your collection.
Similar to the file name organizer but specialized for managing novel files.
Files with similar names are grouped together, allowing you to keep one file and move the rest to a duplicates folder.
(Similarity threshold: 0.75 - detects more files as similar)

## Technology Stack

### Core Technologies
- **Python 3.8+**: Main programming language
- **xxHash**: Fast hash-based duplicate detection
- **tqdm**: Progress bar display
- **psutil**: System resource monitoring

### Build & Deployment
- **PyInstaller**: Executable file creation

## Key Features

- txt and epub file processing
- Duplicate file detection and moving
- Subfolder scanning
- Filename normalization (metadata tag removal, separator unification, etc.)
- Hash-based duplicate checking
- Volume pattern recognition
- Series duplicate exclusion
- Multi-thread processing
- Progress display
- Processing result reports

## System Requirements

- Windows 10 or higher
- Python 3.8 or higher
- Storage: At least 2x the size of files to be processed

## Usage

### For Users
Download and run from the [releases](https://github.com/hye0nwoo/clean_up_novel/releases/latest) page:
- [`소설 파일 중복 검사_CLI 1.0.3.exe`](https://github.com/hye0nwoo/clean_up_novel/releases/download/1.0.3/소설.파일.중복.검사_CLI.1.0.3.exe): Lightweight command-line version (Portable version, no installation required)

※ If you see an "Unknown Publisher" warning, click "More Info" and then "Run anyway".

### For Developers
To run the source code:

1. Install Python 3.8 or higher
2. Run `pip install -r requirements.txt`
3. Start with `python cleanup_novel.py`

## Precautions

- Backup of files before processing is recommended
- Avoid modifying files during program execution
- Maximum processable file size: 50MB
- File system write permissions required

## Troubleshooting

### When Program Becomes Unresponsive
1. Close and restart the program
2. Try processing fewer files

### When Duplicates Are Not Properly Detected
1. Check special characters in filenames
2. Verify series naming patterns

## License

This project is distributed under the MIT License. 