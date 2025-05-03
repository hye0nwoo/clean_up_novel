# Novel File Organizer - GUI Version

[![한국어](https://img.shields.io/badge/언어-한국어-blue.svg)](README.md)
[![English](https://img.shields.io/badge/Language-English-blue.svg)](README_EN.md)

[![Status](https://img.shields.io/badge/status-reimplementation-yellow)](README.md)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-green)](https://nodejs.org/)
[![Vue.js](https://img.shields.io/badge/Vue.js-3.x-brightgreen)](https://vuejs.org/)
[![Electron](https://img.shields.io/badge/Electron-latest-blue)](https://www.electronjs.org/)
[![License](https://img.shields.io/badge/License-MIT-lightgrey)](LICENSE)

Web-based interface version of the Novel File Organizer to be implemented in JavaScript.

## ⚠️ Reimplementation Notice

This version is currently under reimplementation:
- Existing code has been removed and needs to be reimplemented
- Will be rewritten using Vue.js and Electron
- Contributions are welcome

## Development Roadmap

1. Phase 1 - Project Setup (Upcoming)
   - Initialize Vue.js 3.x project
   - Integrate Electron
   - Set up basic project structure

2. Phase 2 - UI Implementation (Planned)
   - Implement basic components
   - File upload/drag-and-drop
   - Progress indication UI

3. Phase 3 - Core Features (Planned)
   - Implement file processing logic
   - WebWorker-based parallel processing
   - Implement data store

4. Phase 4 - Optimization (Planned)
   - Performance optimization
   - User experience improvements
   - Testing and stabilization

## Planned Features

- Modern and responsive web interface
- Real-time processing visualization
- Drag-and-drop file support
- Interactive file management system
- Dark/Light theme support

## Tech Stack

- Frontend: Vue.js 3.x
- Desktop: Electron
- State Management: Pinia
- UI Framework: Vuetify
- Build Tool: Vite
- Testing: Vitest

### Project Structure (Planned)
```
gui_js/
├── src/
│   ├── components/    # Vue components
│   ├── views/         # Page views
│   ├── store/         # Pinia store
│   ├── services/     # Business logic
│   └── utils/        # Utility functions
├── electron/         # Electron-related code
├── public/           # Static files
├── tests/           # Test code
└── package.json     # Project configuration
```

## Contributing

As the project is under reimplementation, we welcome contributions:
1. Bug reports through issue tracker
2. Feature improvement suggestions
3. Code contributions through pull requests

## License

This project is distributed under the MIT License.

## Development Status

This version is currently in planning stage. The following features are planned:

### Planned Features
- Modern web interface
- Real-time processing feedback
- Drag-and-drop file support
- Interactive file management

### Intended Tech Stack
- Vue.js: UI framework
- Electron: Desktop application wrapper
- xxhash-wasm: Hash calculation
- fuzzysort: String matching

## Features

- Modern web interface
- Real-time processing feedback
- Drag-and-drop file support
- Interactive file management

## Installation

### Prerequisites
- Node.js 16.0 or higher
- npm (Node.js package manager)

### Setup
1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

## Usage

### Starting the Application
1. Open `index.html` in your browser
2. Select or drag-and-drop your novel directory
3. Configure settings using the interface
4. Start processing

### Interface Features
- Visual progress indication
- File size and count statistics
- Interactive duplicate management
- Dark/Light theme support

## Technical Details

### Dependencies
- Vue.js: UI framework
- Electron: Desktop application wrapper
- xxhash-wasm: High-performance hashing
- fuzzysort: Fast string matching

### Architecture
- Component-based UI design
- Event-driven architecture
- WebWorker for background processing
- IndexedDB for result caching

### Performance Features
- Asynchronous file processing
- Chunked file reading
- Memory-efficient operations
- Background processing

## Development

### Project Structure
```
gui_js/
├── src/
│   ├── components/     # Vue components
│   ├── services/       # Business logic
│   ├── utils/         # Helper functions
│   └── assets/        # Static resources
├── public/            # Public assets
├── tests/            # Unit tests
└── package.json      # Project configuration
```

### Available Scripts
```bash
# Development
npm run dev

# Testing
npm run test

# Production Build
npm run build

# Electron Build
npm run build:electron
```

### Testing
```bash
# Run unit tests
npm run test

# Run e2e tests
npm run test:e2e
```

## Browser Support

- Chrome 80+
- Firefox 75+
- Edge 80+
- Safari 13+ 