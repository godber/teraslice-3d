---
id: task-3
title: Restructure frontend project
status: To Do
assignee: []
created_date: '2025-07-14'
labels: []
dependencies: []
---

## Description

The frontend of this project has grown big enough that we can't keep everything
in graph.html.  We need a proper frontend project structure and to manage
dependencies with npm and build a bundled.  Can you evaluate the situation and
propose a plan and write your proposed changes into `backlog/tasks/task-3 - Restructure-frontend-project.md`

## Current State Analysis

The current frontend consists of:
- `templates/graph.html` (170 lines) - Single HTML file with embedded JavaScript
- `static/3d-force-graph.js` - Third-party 3D Force Graph library (v1.77.0)
- `static/lil-gui.esm.js` - GUI controls library

The JavaScript code in `graph.html` handles:
- 3D graph visualization with ForceGraph3D
- Node/link filtering and search functionality
- Color customization controls
- Graph data loading and rendering
- User interaction handling

## Proposed Frontend Structure

### 1. Create Modern Frontend Project Structure

```
frontend/
├── package.json
├── vite.config.js
├── index.html                    # Vite entry point
├── src/
│   ├── main.js                   # Entry point
│   ├── graph/
│   │   ├── GraphRenderer.js      # 3D graph rendering logic
│   │   ├── GraphFilters.js       # Filtering functionality
│   │   └── GraphColors.js        # Color management
│   ├── controls/
│   │   └── GuiControls.js        # lil-gui controls
│   ├── utils/
│   │   └── api.js                # API calls
│   └── style.css                 # Main styles
├── dist/                         # Build output
└── node_modules/
```

### 2. Package Management with npm

Create `package.json` with proper dependency management:

```json
{
  "name": "teraslice-3d-frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "3d-force-graph": "^1.77.0",
    "lil-gui": "^0.19.0"
  },
  "devDependencies": {
    "vite": "^5.0.0"
  }
}
```

### 3. Module Organization

#### `src/main.js` - Entry Point
- Initialize application
- Import and orchestrate other modules
- Handle application lifecycle

#### `src/graph/GraphRenderer.js` - Core Visualization
- ForceGraph3D initialization and configuration
- Node and link rendering logic
- Event handling for graph interactions

#### `src/graph/GraphFilters.js` - Filtering System
- Node and link filtering logic
- Search functionality
- Filter state management

#### `src/graph/GraphColors.js` - Color Management
- Color configuration and themes
- Dynamic color updates
- Node color assignment logic

#### `src/controls/GuiControls.js` - UI Controls
- lil-gui setup and configuration
- Control panels for colors and filters
- Control state synchronization

#### `src/utils/api.js` - API Layer
- Data fetching from `/api/pipeline_graph`
- Error handling
- Data transformation utilities

### 4. Build System with Vite

Configure vite to:
- Fast ES module-based development server
- Bundle JavaScript modules for production
- Process CSS with built-in support
- Handle static assets
- Generate optimized builds with automatic code splitting
- Hot Module Replacement (HMR) for faster development

Create `vite.config.js`:
```javascript
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html'
      }
    }
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8000'
    }
  }
})
```

### 5. Integration with FastAPI

Update FastAPI to:
- Serve bundled assets from `frontend/dist/`
- Update template rendering to use new structure
- Maintain existing API endpoints

### 6. Benefits of This Structure

1. **Maintainability**: Separated concerns into focused modules
2. **Scalability**: Easy to add new features without touching core files
3. **Dependency Management**: Proper npm-based dependency handling
4. **Development Experience**: Lightning-fast HMR, instant server start, modern ES modules
5. **Performance**: Optimized bundling with automatic code splitting and tree-shaking
6. **Simplicity**: Zero-config setup with sensible defaults
7. **Testing**: Easier to unit test individual modules
8. **Code Quality**: ESLint, Prettier integration possibilities

### 7. Migration Strategy

1. Create frontend directory structure
2. Extract JavaScript from `graph.html` into modules
3. Set up build system
4. Update FastAPI to serve bundled assets
5. Test functionality parity
6. Remove old static files

### 8. Development Commands

```bash
# Install dependencies
cd frontend && npm install

# Development server with HMR
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

This restructuring will transform the current monolithic HTML file into a maintainable, scalable frontend project while preserving all existing functionality.
