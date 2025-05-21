/**
 * TreeView component
 * Displays the folder/component hierarchy
 */

import React from "react";
import { FolderType, TreeNode } from "../../../types";
import TreeNodeComponent from "./TreeNode";

interface TreeViewProps {
  treeData: FolderType[];
  selectedNode: TreeNode | null;
  setSelectedNode: (node: TreeNode) => void;
  expandedFolders: number[];
  setExpandedFolders: React.Dispatch<React.SetStateAction<number[]>>;
  isAddingFolder: number | null;
  newFolderName: string;
  setNewFolderName: (name: string) => void;
  // Use a more accurate type that matches what useRef returns
  newFolderInputRef: React.RefObject<HTMLInputElement>;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  submitNewFolder: () => void;
  startAddFolder: (folderId: number) => void;
  openAddComponentModal: (folderId: number) => void;
  openEditComponentModal: (component: TreeNode) => void;
  handleDeleteNode: (nodeId: number) => void;
}

const TreeView: React.FC<TreeViewProps> = ({
  treeData,
  selectedNode,
  setSelectedNode,
  expandedFolders,
  setExpandedFolders,
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
}) => {
  return (
    <div className="tree-view">
      {treeData.map((node) => (
        <TreeNodeComponent
          key={node.id}
          node={node}
          level={0}
          selectedNode={selectedNode}
          setSelectedNode={setSelectedNode}
          expandedFolders={expandedFolders}
          setExpandedFolders={setExpandedFolders}
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
        />
      ))}
    </div>
  );
};

export default TreeView;