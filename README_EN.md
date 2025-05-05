# Novel File Organizer

[![한국어](https://img.shields.io/badge/언어-한국어-blue.svg)](README.md)
[![English](https://img.shields.io/badge/Language-English-blue.svg)](README_EN.md)

[![Status](https://img.shields.io/badge/status-completed-green)](README_EN.md)
[![Python](https://img.shields.io/badge/Python-3.8+-blue)](https://www.python.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-green)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-lightgrey)](LICENSE)

A program that finds and organizes duplicate novel files (.txt).

## Implementation Status

| Feature | CLI (Python) | GUI (JavaScript) | Note |
|---------|-------------|------------------|------|
| **File Processing** |
| txt File Processing | ✅ | ✅ | |
| epub File Processing | ❌ | ❌ | Planned |
| Move Duplicate Files | ✅ | ✅ | |
| Subdirectory Scan | ✅ | ❌ | GUI: In Progress |
| **Filename Normalization** |
| Remove Metadata Tags | ✅ | ✅ | [xxx], (xxx), etc. |
| Unify Separators | ✅ | ✅ | _, -, + → space |
| Remove Numbers/Completion Marks | ✅ | ✅ | |
| Case Insensitive | ✅ | ✅ | |
| **Performance Optimization** |
| Initial Grouping | ✅ | ❌ | GUI: In Progress |
| Multi-threading | ✅ | ❌ | GUI: Under Review |
| **Series Handling** |
| Volume Pattern Recognition | ✅ | ✅ | Enhanced Pattern Detection |
| Series Duplicate Exclusion | ✅ | ✅ | Improved Normalization |
| **User Experience** |
| Progress Display | ✅ | ✅ | |
| Result Report | ✅ | ✅ | |
| Cancel/Rollback | ❌ | ❌ | Planned |
| Settings Customization | ❌ | ❌ | Planned |

## Future Improvements

### Quality Improvements
- ⏳ Add unit tests
- ⏳ Enhance logging system
- ⏳ Strengthen error handling

### User Experience
- ⏳ Progress bar for operations
- ⏳ Detailed processing result reports
- ⏳ Operation cancel/rollback functionality

### Additional Features
- ⏳ Customization through configuration files
- ⏳ Content-based similarity check (optional)
- ⏳ Automatic backup functionality

## System Requirements

- Windows 10 or higher
- Storage: At least 2x the size of files to be processed

## Usage

### For Users
Download and run your preferred version from the releases folder:
- `소설 파일 중복 검사_GUI 1.0.0.exe`: User-friendly graphical interface version
- `소설 파일 중복 검사_CLI 1.0.0.exe`: Lightweight command-line version

### For Developers
If you want to run the source code:

#### CLI Version (Python)
- Requires Python 3.8+
- In `cli_python` folder, run `pip install -r requirements.txt`
- Start with `python cleanup_novel.py`

#### GUI Version (JavaScript)
- Requires Node.js 18.x+
- In `gui_js` folder, run `npm install && npm start`

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