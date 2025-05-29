'use client';

/**
 * SimpleTreeView component
 * Read-only tree view for displaying library components in the CommunityComponentsModal.
 * Can be configured to show all component content by default or disable content toggling.
 */
import React, { useState, useEffect } from 'react';
import { TreeNode, ComponentType } from '../../types';
import FolderIcon from '@mui/icons-material/Folder';
import ComponentIcon from '../Sidebar/TreeView/ComponentIcon';

interface SimpleTreeViewProps {
  nodes: TreeNode[];
  level?: number;
  expandAllNodeContents?: boolean; // New prop: If true, all component contents are expanded by default
  disableNodeContentToggle?: boolean; // New prop: If true, clicking component headers does not toggle content
}

// Helper function to get all component IDs from nodes recursively
const getAllComponentIds = (nodes: TreeNode[]): string[] => {
  let ids: string[] = [];
  for (const node of nodes) {
    if (node.type === 'component') {
      ids.push(node.id);
    }
    if (node.type === 'folder' && node.children) {
      ids = ids.concat(getAllComponentIds(node.children));
    }
  }
  return ids;
};

const SimpleTreeView: React.FC<SimpleTreeViewProps> = ({ nodes, level = 0, expandAllNodeContents = false, disableNodeContentToggle = false }) => {
  const [expandedContentNodeIds, setExpandedContentNodeIds] = useState<Set<string>>(() => {
    if (expandAllNodeContents) {
      // If expandAllNodeContents is true, initialize with all component IDs
      return new Set(getAllComponentIds(nodes));
    }
    return new Set();
  });

  // Effect to update expanded IDs if nodes or expandAllNodeContents prop changes
  useEffect(() => {
    if (expandAllNodeContents) {
      setExpandedContentNodeIds(new Set(getAllComponentIds(nodes)));
    }
    // If expandAllNodeContents becomes false, we might want to reset,
    // but current plan implies it's an initial state.
    // For simplicity, we only set all if true.
  }, [nodes, expandAllNodeContents]);

  const handleNodeHeaderClick = (nodeId: string, nodeType: string) => {
    // Only allow toggling if disableNodeContentToggle is false
    if (!disableNodeContentToggle && nodeType === 'component') {
      setExpandedContentNodeIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(nodeId)) {
          newSet.delete(nodeId);
        } else {
          newSet.add(nodeId);
        }
        return newSet;
      });
    }
  };

  return (
    <div className="simple-tree-view" style={{ paddingLeft: level > 0 ? '20px' : '0px' }}>
      {nodes.map(node => (
        <div key={node.id} className={`simple-tree-node ${node.type}`}>
          <div 
            className="simple-tree-node-header" 
            onClick={() => handleNodeHeaderClick(node.id, node.type)}
            // Adjust cursor based on whether content toggling is disabled for components
            style={{ cursor: node.type === 'component' && !disableNodeContentToggle ? 'pointer' : 'default' }}
          >
            <span className="simple-tree-node-icon">
              {node.type === 'folder' ? (
                <FolderIcon />
              ) : (
                <ComponentIcon componentType={(node as ComponentType).componentType} />
              )}
            </span>
            <span className="simple-tree-node-name">{node.name}</span>
          </div>
          {/* Render component content if it's a component, its ID is in expandedContentNodeIds, and it has content */}
          {node.type === 'component' && expandedContentNodeIds.has(node.id) && (node as ComponentType).content && !disableNodeContentToggle && (
            <pre className="component-content-details">
              {(node as ComponentType).content}
            </pre>
          )}
          {/* Recursively render children if it's a folder with children */}
          {node.type === 'folder' && node.children && node.children.length > 0 && (
            <SimpleTreeView nodes={node.children} level={level + 1} expandAllNodeContents={expandAllNodeContents} disableNodeContentToggle={disableNodeContentToggle} />
          )}
        </div>
      ))}
    </div>
  );
};

export default SimpleTreeView;
