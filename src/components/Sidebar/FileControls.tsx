/**
 * FileControls component
 * Handles file import/export operations for component library
 */

import React, { useRef } from "react";
import { useTreeContext } from "../../contexts/TreeContext";
import { FolderType, TreeNode } from "../../types";
import { mergeTreeData } from "../../utils/treeUtils";
import { useAppContext } from "../../contexts/AppContext"; // Added

const FileControls: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { treeData, setTreeData } = useTreeContext();
  const { setCommunityModalOpen } = useAppContext(); // Added
  
  /**
   * Detects and parses various file formats to extract tree data
   * Supports old format (array or single folder) and new format ({tree, prompts})
   */
  const parseLoadedData = (data: any): FolderType[] => {
    try {
      // Case 1: New format with tree property
      if (data && typeof data === 'object' && data.tree && Array.isArray(data.tree)) {
        return data.tree;
      }
      
      // Case 2: Old format - array of nodes directly
      if (Array.isArray(data)) {
        return data as FolderType[];
      }
      
      // Case 3: Old format - single folder with children
      if (data && typeof data === 'object' && data.type === "folder" && Array.isArray(data.children)) {
        return [data as FolderType];
      }
      
      throw new Error("Unrecognized data format");
    } catch (error) {
      console.error("Error parsing data:", error);
      throw new Error(`Failed to parse data: ${(error as Error).message}`);
    }
  };
  
  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      // Read the file
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Parse the data to extract tree structure
      const parsedTreeData = parseLoadedData(data);
      
      // Validate tree structure
      if (!parsedTreeData || parsedTreeData.length === 0) {
        throw new Error("No valid components or folders found in file");
      }
      
      // Update tree data using the new merge logic
      setTreeData((currentTreeData) => {
        // Initialize a robust ID generator for this merge operation.
        let maxExistingId = 0;
        const findMaxId = (nodes: TreeNode[]): void => {
          for (const node of nodes) {
            maxExistingId = Math.max(maxExistingId, node.id);
            if (node.type === 'folder') {
              findMaxId(node.children);
            }
          }
        };
        findMaxId(currentTreeData);

        let nextIdCounter = Math.max(Date.now(), maxExistingId + 1);

        const generateId = (): number => {
          const newId = nextIdCounter;
          nextIdCounter += 1;
          return newId;
        };
        
        // Ensure parsedTreeData is treated as FolderType[] as expected by mergeTreeData
        return mergeTreeData(currentTreeData, parsedTreeData as FolderType[], generateId);
      });
      
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error loading file:", error);
      alert(`Error loading file: ${(error as Error).message}`);
    }
  };
  
  // Handle file save
  const handleSave = () => {
    try {
      // Only export tree data, not prompts
      const blob = new Blob([JSON.stringify(treeData, null, 2)], {
        type: "application/json",
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "component-library.json";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error saving file:", error);
      alert(`Error saving file: ${(error as Error).message}`);
    }
  };

  return (
    <div className="file-controls">
      <button
        className="file-btn community-library-btn-fullwidth"
        onClick={() => setCommunityModalOpen(true)}
        title="Community Library"
      >
        Community Library
      </button>
      <div className="load-save-controls"> { /* Added wrapper */ }
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".json"
          style={{ display: "none" }}
        />
        <button
          className="file-btn load-btn"
          onClick={() => fileInputRef.current?.click()}
          title="Load Component Library"
        >
          Load
        </button>
        <button
          className="file-btn save-btn"
          onClick={handleSave}
          title="Save Component Library"
        >
          Save
        </button>
      </div> { /* Closing wrapper */ }
    </div>
  );
};

export default FileControls;