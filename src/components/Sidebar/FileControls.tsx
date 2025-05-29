'use client';

/**
 * FileControls component
 * Handles file import/export operations for component library
 */

import React, { useRef } from "react";
import { useTreeContext } from "@/contexts/TreeContext";
// FolderType is used by mergeTreeData and the types of treeData/parsedTreeFromLegacyFile
import { FolderType } from "@/types"; 
import { mergeTreeData } from "@/utils/treeUtils";
import { loadJSONFile } from "@/utils/fileUtils"; // Added: To use the correct parsing logic
import { v4 as uuidv4 } from 'uuid'; // Added: For generating string IDs

const FileControls: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { treeData, setTreeData } = useTreeContext(); // treeData is FolderType[]

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const { tree: parsedTreeFromLegacyFile } = await loadJSONFile(file);

      // Validate tree structure (parsedTreeFromLegacyFile is FolderType[])
      if (!parsedTreeFromLegacyFile) { // Simplified check: if it's undefined or null
        throw new Error("No valid components or folders found in file. The 'tree' property might be missing or invalid.");
      }
      
      // Update tree data
      setTreeData((currentTreeData: FolderType[]) => { // currentTreeData is FolderType[]
        // The custom numeric ID generation logic (maxExistingId, findMaxId, nextIdCounter, local generateId) is removed.
        // parsedTreeFromLegacyFile (FolderType[]) already has string UUIDs.
        // We pass uuidv4 to mergeTreeData; it will use this if it needs to generate IDs 
        // for new structural nodes created during the merge process itself.
        return mergeTreeData(currentTreeData, parsedTreeFromLegacyFile, uuidv4);
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
  
  // Handle file save - This function remains unchanged
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