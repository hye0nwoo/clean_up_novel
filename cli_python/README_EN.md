# Novel File Organizer - CLI Version

[![한국어](https://img.shields.io/badge/언어-한국어-blue.svg)](README.md)
[![English](https://img.shields.io/badge/Language-English-blue.svg)](README_EN.md)

[![Status](https://img.shields.io/badge/status-reimplementation-yellow)](README.md)
[![Python](https://img.shields.io/badge/Python-3.8+-blue)](https://www.python.org/)
[![rapidfuzz](https://img.shields.io/badge/rapidfuzz-2.x-green)](https://github.com/maxbachmann/RapidFuzz)
[![License](https://img.shields.io/badge/License-MIT-lightgrey)](LICENSE)

Command-line interface version of the Novel File Organizer to be implemented in Python.

## ⚠️ Reimplementation Notice

This version is currently under reimplementation:
- Existing code has been removed and needs to be reimplemented
- Previous functionality will be improved in the rewrite
- Contributions are welcome

## Development Plan

1. Phase 1 - Core Functionality
   - Implement file processing logic
   - Implement similarity comparison algorithm
   - Implement basic CLI interface

2. Phase 2 - Performance Optimization
   - Implement multi-threading/multi-processing
   - Optimize memory usage
   - Improve large file handling

3. Phase 3 - Stabilization
   - Write test code
   - Improve error handling
   - Performance testing and optimization

## Planned Features

- Pure Python implementation
- High-performance parallel processing
  - ThreadPoolExecutor: Parallel file IO operations
  - ProcessPoolExecutor: Parallel CPU-intensive operations
- Memory usage optimization
- Large file processing

## Features

- Pure Python implementation
- Basic file processing
- Single-threaded support
- Basic memory management

## Installation

### Prerequisites
- Python 3.8 or higher
- pip (Python package installer)

### Setup
1. Install required packages:
```bash
pip install -r requirements.txt
```

## Usage

### Basic Usage
```bash
python cleanup_novel.py [directory_path]
```

### Options
```bash
python cleanup_novel.py --help
  --dir PATH           Directory to scan (default: current directory)
  --threshold FLOAT    Similarity threshold (default: 0.85)
  --max-size INT      Maximum file size in MB (default: 50)
```

### Examples
```bash
# Scan current directory with default settings
python cleanup_novel.py

# Scan specific directory with custom threshold
python cleanup_novel.py "D:/Novels" --threshold 0.9
```

## Technical Details

### Dependencies
- rapidfuzz: String similarity comparison
- tqdm: Progress bar

### Performance
- Single-threaded processing
- Basic memory management
  - File-by-file processing
  - Simple string comparison

### File Processing
- Basic text encoding handling
- Simple series detection
- Metadata tag handling
- Basic filename normalization

## Project Structure (Planned)
```
cli_python/
├── src/
│   ├── core/          # Core logic
│   ├── utils/         # Utility functions
│   └── cli/           # CLI interface
├── tests/             # Test code
├── docs/              # Documentation
└── requirements.txt   # Dependencies
```

## Development

### Project Structure
```
cli_python/
├── cleanup_novel.py     # Main script
├── requirements.txt     # Dependencies
├── utils/
│   ├── file_handler.py  # File operations
│   ├── normalizer.py    # Text normalization
│   └── matcher.py       # Similarity matching
└── tests/              # Unit tests
```

### Running Tests
```bash
python -m pytest tests/
```

## Contributing

As the project is under reimplementation, we welcome contributions:
1. Bug reports through issue tracker
2. Feature improvement suggestions
3. Code contributions through pull requests

## License

This project is distributed under the MIT License. 