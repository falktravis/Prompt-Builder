'use client';

/**
 * Sidebar component
 * Contains the tree view of folders and components
 */

import React, { useRef, useState } from "react";
import { TreeNode, FolderType, ComponentType } from "@/types";
import { useTreeContext } from "@/contexts/TreeContext";
import TreeView from "./TreeView";
import FileControls from "./FileControls";
import "./SideBar.scss";
import MoreVertIcon from '@mui/icons-material/MoreVert';

const Sidebar: React.FC = () => {
  const { 
    treeData, 
    selectedNode, 
    setSelectedNode,
    setComponentBeingEdited,
    setComponentModalOpen,
    handleAddFolder,
    handleDeleteNode,
    handleToggleFolderExpand,
  } = useTreeContext();
  
  const [isAddingFolder, setIsAddingFolder] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const newFolderInputRef = useRef<HTMLInputElement>(null);
  
  // Focus input when adding a new folder
  React.useEffect(() => {
    if (isAddingFolder !== null && newFolderInputRef.current) {
      newFolderInputRef.current.focus();
    }
  }, [isAddingFolder]);

  // Start adding a new folder
  const startAddFolder = (folderId: string) => {
    setIsAddingFolder(folderId);
    setNewFolderName("");
  };
  
  // Submit a new folder
  const submitNewFolder = () => {
    if (!newFolderName.trim() || isAddingFolder === null) {
      setIsAddingFolder(null);
      return;
    }
    
    handleAddFolder(isAddingFolder, newFolderName.trim());
    setIsAddingFolder(null);
    setNewFolderName("");
  };
  
  // Handle keyboard events when adding a folder
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      submitNewFolder();
    } else if (e.key === "Escape") {
      setIsAddingFolder(null);
    }
  };
  
  // Open the component modal for adding a new component
  const openAddComponentModal = (folderId: string) => {
    setComponentBeingEdited(null);
    const parentFolder = treeData.find(f => f.id === folderId) || (treeData[0]?.children.find(c => c.id === folderId && c.type === 'folder') as FolderType);
    const nodeToSelect: FolderType | null = parentFolder ? parentFolder : (findNodeInTree(treeData, folderId) as FolderType | null) ;

    if (nodeToSelect && nodeToSelect.type === "folder") {
      setSelectedNode(nodeToSelect);
    } else {
      setSelectedNode({ id: folderId, type: "folder", name: "Unknown Folder", children: [], expanded: false });
    }
    setComponentModalOpen(true);
  };

  // Helper function to find a node in the tree (can be moved to utils if used elsewhere)
  const findNodeInTree = (nodes: TreeNode[], id: string): TreeNode | null => {
    for (const node of nodes) {
        if (node.id === id) return node;
        if (node.type === "folder" && node.children) {
            const found = findNodeInTree(node.children, id);
            if (found) return found;
        }
    }
    return null;
  };
  
  // Open the component modal for editing an existing component
  const openEditComponentModal = (component: TreeNode) => {
    if (component.type === "component") {
      setComponentBeingEdited(component as ComponentType);
      setComponentModalOpen(true);
    }
  };

  return (
    <div id="side-bar">
      <header>
        <h2>Library</h2>
        <button
          className="library-options"
        >
          <MoreVertIcon fontSize="inherit"/>
        </button>
      </header>
      <div className="tree-container">
        <TreeView
          treeData={treeData}
          selectedNode={selectedNode}
          setSelectedNode={setSelectedNode}
          isAddingFolder={isAddingFolder}
          newFolderName={newFolderName}
          setNewFolderName={setNewFolderName}
          newFolderInputRef={newFolderInputRef as React.RefObject<HTMLInputElement>} // Corrected type assertion
          handleKeyDown={handleKeyDown}
          submitNewFolder={submitNewFolder}
          startAddFolder={startAddFolder}
          openAddComponentModal={openAddComponentModal}
          openEditComponentModal={openEditComponentModal}
          handleDeleteNode={handleDeleteNode}
          handleToggleFolderExpand={handleToggleFolderExpand}
        />
      </div>
      <FileControls />
    </div>
  );
};

export default Sidebar;