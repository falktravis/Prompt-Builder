'use client';

/**
 * TreeNode component
 * Renders an individual node (folder or component) in the tree view
 */

import React, { useState } from "react";
import { FolderType, TreeNode, ComponentType } from "@/types";
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import DeleteIcon from '@mui/icons-material/Delete';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import ComponentIcon from "./ComponentIcon"; // Assuming this path is correct

// Constants
const INDENT = 20;

interface TreeNodeProps {
  node: TreeNode;
  level: number;
  selectedNode: TreeNode | null;
  setSelectedNode: (node: TreeNode) => void;
  isAddingFolder: string | null; // Changed from number | null
  newFolderName: string;
  setNewFolderName: (name: string) => void;
  newFolderInputRef: React.RefObject<HTMLInputElement>;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  submitNewFolder: () => void;
  startAddFolder: (folderId: string) => void; // Changed from number
  openAddComponentModal: (folderId: string) => void; // Changed from number
  openEditComponentModal: (component: TreeNode) => void;
  handleDeleteNode: (nodeId: string) => void; // Changed from number
  handleToggleFolderExpand: (folderId: string) => void; // Added
}

const TreeNodeComponent: React.FC<TreeNodeProps> = ({
  node,
  level,
  selectedNode,
  setSelectedNode,
  isAddingFolder,
  newFolderName,
  setNewFolderName,
  newFolderInputRef,
  handleKeyDown,
  submitNewFolder,
  startAddFolder,
  openAddComponentModal,
  openEditComponentModal,
  handleDeleteNode,
  handleToggleFolderExpand, // Added
}) => {
  const isFolder = node.type === "folder";
  const isComponent = node.type === "component";
  const isExpanded = isFolder && (node as FolderType).expanded; // Changed
  const isSelected = selectedNode && selectedNode.id === node.id;
  const [isHovering, setIsHovering] = useState(false);
  
  // Toggle folder expansion
  const toggleExpand = () => {
    if (!isFolder) return;
    handleToggleFolderExpand(node.id); // Changed
  };
  
  // Handle node selection
  const handleNodeClick = () => {
    setSelectedNode(node);
    
    if (node.type === "folder") {
      toggleExpand();
    }
    else if (node.type === "component") {
      openEditComponentModal(node);
    }
  };
  
  // Handle drag start
  const handleDragStart = (e: React.DragEvent) => {
    if (isComponent) { // Only components from sidebar are draggable for prompt building
      e.stopPropagation();
      // The node is already a ComponentType if isComponent is true
      e.dataTransfer.setData("application/json", JSON.stringify(node as ComponentType));
      e.dataTransfer.effectAllowed = "move";
      document.body.classList.add('is-dragging-something'); // Add global cursor style

      // Optional: custom drag preview (can be removed if not desired or styled differently)
      const dragPreview = document.createElement("div");
      dragPreview.className = `dragging-component dragging-component-${(node as ComponentType).componentType}`;
      dragPreview.textContent = node.name;
      document.body.appendChild(dragPreview);
      e.dataTransfer.setDragImage(dragPreview, 0, 0);
      setTimeout(() => {
        document.body.removeChild(dragPreview);
      }, 0);
    } else {
      // Prevent dragging folders for this specific functionality
      e.preventDefault();
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.stopPropagation();
    document.body.classList.remove('is-dragging-something'); // Remove global cursor style
    // Clean up drag preview if it was created and not removed by timeout (though timeout should handle it)
    const existingPreview = document.querySelector('.dragging-component');
    if (existingPreview && existingPreview.parentNode === document.body) {
      document.body.removeChild(existingPreview);
    }
  };
  
  // Handle drag over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isFolder) return;
    
    e.dataTransfer.dropEffect = "move";
    setIsHovering(true);
  };
  
  // Handle drag leave
  const handleDragLeave = () => {
    setIsHovering(false);
  };
  
  // Handle drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsHovering(false);
    if (isFolder) {
      // Data might be stringified JSON or just the ID. Assuming ID for now.
      const draggedData = e.dataTransfer.getData("application/json") || e.dataTransfer.getData("text/plain");
      let draggedNodeId: string | null = null;
      try {
        const parsedData = JSON.parse(draggedData);
        draggedNodeId = parsedData.id || parsedData; // Handle if it's an object with id or just the id string
      } catch (error) {
        draggedNodeId = draggedData; // Fallback if not JSON
      }

      if (!draggedNodeId || draggedNodeId === node.id) return; 

      // Dispatch custom event with string IDs
      if (window.dispatchEvent) {
        const dropEvent = new CustomEvent("node-dropped", {
          detail: { draggedNodeId: draggedNodeId, targetNodeId: node.id }, // node.id is already string
        });
        window.dispatchEvent(dropEvent);
      }
    }
  };
  
  // Delete confirmation
  const confirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    const message = isFolder
      ? `Are you sure you want to delete this folder and all its contents? This action cannot be undone.`
      : `Are you sure you want to delete this component? This action cannot be undone.`;
    
    if (window.confirm(message)) {
      handleDeleteNode(node.id);
    }
  };

  return (
    <div>
      <div
        className={`tree-node ${isSelected ? "selected" : ""} ${
          isHovering ? "hover" : ""
        }`}
        style={{ paddingLeft: `${level * INDENT}px` }}
        onClick={handleNodeClick}
        onDragStart={isComponent ? handleDragStart : undefined} // Attach drag start only to components
        onDragEnd={isComponent ? handleDragEnd : undefined} // Attach drag end only to components
        onDragOver={handleDragOver} // Keep for folder reordering if used
        onDragLeave={handleDragLeave} // Keep for folder reordering if used
        onDrop={isFolder ? handleDrop : undefined} // Keep for folder reordering if used
        draggable={isComponent} // Only components are draggable for this feature
      >
        <div className="node-content">
          {isFolder ? (
            <div className="node-icon">
              {isExpanded ? <FolderOpenIcon /> : <FolderIcon />}
            </div>
          ) : (
            <div className="node-icon">
              <ComponentIcon componentType={(node as ComponentType).componentType} />
            </div>
          )}
          <span className="node-name">{node.name}</span>
          
          {/* Folder actions */}
          {isFolder && (
            <div className="node-actions">
              <button
                className="action-btn add-folder-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  startAddFolder(node.id);
                }}
                title="Add Folder"
              >
                <CreateNewFolderIcon sx={{fontSize: 16}} />
              </button>
              <button
                className="action-btn add-component-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  openAddComponentModal(node.id);
                }}
                title="Add Component"
              >
                <NoteAddIcon sx={{fontSize: 16}} />
              </button>
              <button
                className="action-btn delete-btn"
                onClick={confirmDelete}
                title="Delete Folder"
              >
                <DeleteIcon sx={{fontSize: 16}} />
              </button>
            </div>
          )}
          
          {/* Component actions */}
          {!isFolder && (
            <div className="node-actions">
              <button
                className="action-btn delete-btn"
                onClick={confirmDelete}
                title="Delete Component"
              >
                <DeleteIcon sx={{fontSize: 16}} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* New folder input */}
      {isAddingFolder === node.id && (
        <div
          className="new-folder-input-container"
          style={{ paddingLeft: `${(level + 1) * INDENT}px` }}
        >
          <input
            ref={newFolderInputRef}
            type="text"
            className="new-folder-input"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={submitNewFolder}
            placeholder="Folder name..."
          />
        </div>
      )}

      {/* Render children if expanded */}
      {isFolder && isExpanded && (node as FolderType).children.map((child) => (
        <TreeNodeComponent
          key={child.id}
          node={child}
          level={level + 1}
          selectedNode={selectedNode}
          setSelectedNode={setSelectedNode}
          isAddingFolder={isAddingFolder}
          newFolderName={newFolderName}
          setNewFolderName={setNewFolderName}
          newFolderInputRef={newFolderInputRef}
          handleKeyDown={handleKeyDown}
          submitNewFolder={submitNewFolder}
          startAddFolder={startAddFolder}
          openAddComponentModal={openAddComponentModal}
          openEditComponentModal={openEditComponentModal}
          handleDeleteNode={handleDeleteNode}
          handleToggleFolderExpand={handleToggleFolderExpand} // Added
        />
      ))}
    </div>
  );
};

export default TreeNodeComponent;