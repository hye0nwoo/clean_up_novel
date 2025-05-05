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
| Volume Pattern Recognition | ✅ | ✅ | |
| Series Duplicate Exclusion | ✅ | ✅ | |
| **User Experience** |
| Progress Display | ✅ | ✅ | |
| Result Report | ✅ | ❌ | GUI: In Progress |
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

- OS: Windows 10 or higher
- Python 3.8+ (CLI version)
- Node.js 18.x+ (GUI version)
- Memory: 4GB or more recommended
- Storage: At least 2x the size of files to be processed

## Usage

### CLI Version (Python)
1. Install Python 3.8 or higher
2. Change to cli_python directory: `cd cli_python`
3. Install required packages: `pip install -r requirements.txt`
4. Run the program: `python cleanup_novel.py`
5. Follow the on-screen instructions:
   - Enter directory path to process (press Enter for current directory)
   - Select similarity threshold (1: Low, 2: Medium, 3: High)
   - Review found duplicate files
   - Choose which file to keep for each group

#### CLI Features
- Simple operation through command-line interface
- Fast execution with multi-thread/multi-process processing
- Real-time progress display
- Processing result summary
- Detailed logs for error cases

### GUI Version (JavaScript)
1. Install Node.js 18.x or higher
2. Run `npm install`
3. Start the program with `npm start`

#### GUI Features
- Folder selection and file processing
- Basic duplicate file detection and moving
- Processing progress display

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