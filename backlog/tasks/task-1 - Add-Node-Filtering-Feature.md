---
id: task-1
title: Add Node Filtering Feature
status: To Do
assignee: []
created_date: '2025-07-09'
updated_date: '2025-07-13'
labels: []
dependencies: []
---

## Description

# TODO: Add Node Filtering Feature

## Overview
Add a search input field to filter nodes in the 3D graph visualization based on user string input.

## Implementation Approach
Use **Option 1: Frontend-Based Filtering** - Filter after data load for responsive user experience.

## Implementation Steps

### 1. Add Search Input to GUI Controls
- Add search input field to the existing lil-gui control panel
- Integrate with existing GUI structure alongside color controls
- Position: Within the GUI control panel for consistent UI

### 2. Modify Data Loading Approach
- Change from `.jsonUrl('/pipeline_graph')` to manual fetch to gain control over data
- Store original graph data in a variable for filtering operations
- Example: `const originalData = await fetch('/pipeline_graph').then(r => r.json())`
- Initialize graph with `.graphData(originalData)` instead of `.jsonUrl()`

### 3. Implement Filter Function
- Create a filter function that matches against `node.id` strings
- Use case-insensitive matching: `node.id.toLowerCase().includes(searchTerm.toLowerCase())`
- Filter both nodes and their associated links
- Filter links where source/target nodes don't match the filter

### 4. Update Graph Dynamically
- Use ForceGraph3D's `.graphData()` method to update the visualization
- Update on input events with debouncing for performance
- Preserve graph state (camera position, etc.) when filtering
- Ensure color controls continue to work with filtered data

### 5. Integrate with Existing GUI
- Add filter controls to the existing GUI panel
- Include clear/reset functionality as a button in the GUI
- Ensure smooth integration with existing color controls
- Maintain consistent styling with lil-gui theme

## Technical Details

### Node ID Pattern
- Node IDs follow the format: `connector:topic/index`
- Examples: `kafka_cluster1:topic1`, `es_cluster1:index1`
- This makes them ideal for string matching

### Filter Logic
```javascript
function filterGraphData(searchTerm) {
  if (!searchTerm) {
    Graph.graphData(originalData);
    return;
  }

  const filteredNodes = originalData.nodes.filter(node =>
    node.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const nodeIds = new Set(filteredNodes.map(n => n.id));
  const filteredLinks = originalData.links.filter(link =>
    nodeIds.has(link.source) && nodeIds.has(link.target)
  );

  Graph.graphData({ nodes: filteredNodes, links: filteredLinks });
}

// Integration with lil-gui
const filterFolder = gui.addFolder('Node Filtering');
const filterState = { searchTerm: '' };

filterFolder.add(filterState, 'searchTerm').name('Search Nodes').onChange(value => {
  filterGraphData(value);
});

filterFolder.add({ clear: () => {
  filterState.searchTerm = '';
  filterGraphData('');
  gui.updateDisplay();
}}, 'clear').name('Clear Filter');
```

### Performance Considerations
- Consider debouncing for large datasets
- Maintain responsive UI during filtering
- Preserve 3D graph performance with filtered data

## Files to Modify
- `templates/graph.html` - Modify data loading approach and add filtering functionality integrated with lil-gui controls

## Testing
- Test with various search terms
- Test empty search (reset)
- Test with no matches
- Test performance with large datasets
