/**
 * Sidebar component
 * Contains the tree view of folders and components
 */

import React, { useRef, useState } from "react";
import { TreeNode } from "../../types";
import { useTreeContext } from "../../contexts/TreeContext";
import TreeView from "./TreeView";
import FileControls from "./FileControls";
import SettingsIcon from "@mui/icons-material/Settings";
import "./Sidebar.scss";

interface SidebarProps {
  openSettings: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ openSettings }) => {
  const { 
    treeData, 
    selectedNode, 
    setSelectedNode,
    expandedFolders,
    setExpandedFolders,
    setComponentBeingEdited,
    setComponentModalOpen,
    handleAddFolder,
    handleDeleteNode
  } = useTreeContext();
  
  const [isAddingFolder, setIsAddingFolder] = useState<number | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const newFolderInputRef = useRef<HTMLInputElement>(null);
  
  // Focus input when adding a new folder
  React.useEffect(() => {
    if (isAddingFolder !== null && newFolderInputRef.current) {
      newFolderInputRef.current.focus();
    }
  }, [isAddingFolder]);

  // Start adding a new folder
  const startAddFolder = (folderId: number) => {
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
  const openAddComponentModal = (folderId: number) => {
    setComponentBeingEdited(null);
    setSelectedNode({ id: folderId, type: "folder", name: "", children: [] });
    setComponentModalOpen(true);
  };
  
  // Open the component modal for editing an existing component
  const openEditComponentModal = (component: TreeNode) => {
    if (component.type === "component") {
      setComponentBeingEdited(component);
      setComponentModalOpen(true);
    }
  };

  return (
    <div id="side-bar">
      <header>
        <div className="title">
          <h1>Prompt Builder</h1>
          <a href="https://docs.google.com/document/d/1eql1d57SB1DtiW8bkQswjnqmxsSl6Ken-96tjSLdG9k/edit?tab=t.0" target="_blank">Guide</a>
        </div>
        <div className="header-actions">
          <button className="settings-btn" onClick={openSettings} title="Settings">
            <SettingsIcon fontSize="inherit" />
          </button>
        </div>
      </header>
      <div className="tree-container">
        <TreeView
          treeData={treeData}
          selectedNode={selectedNode}
          setSelectedNode={setSelectedNode}
          expandedFolders={expandedFolders}
          setExpandedFolders={setExpandedFolders}
          isAddingFolder={isAddingFolder}
          newFolderName={newFolderName}
          setNewFolderName={setNewFolderName}
          newFolderInputRef={newFolderInputRef as React.RefObject<HTMLInputElement>}
          handleKeyDown={handleKeyDown}
          submitNewFolder={submitNewFolder}
          startAddFolder={startAddFolder}
          openAddComponentModal={openAddComponentModal}
          openEditComponentModal={openEditComponentModal}
          handleDeleteNode={handleDeleteNode}
        />
      </div>
      <FileControls />
    </div>
  );
};

export default Sidebar;