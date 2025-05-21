/**
 * TreeContext
 * Manages the component and folder tree structure
 */

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { TreeNode, FolderType, ComponentType } from "../types";
import { 
  insertNode, 
  removeNode, 
  isDescendant, 
  moveNodeInTree
} from "../utils/treeUtils";
import { useAppContext } from "./AppContext";

// Initial tree data
const INITIAL_TREE_DATA: FolderType[] = [
  {
    id: 1,
    name: "Components",
    type: "folder",
    children: [],
  },
];

// Context type definition
type TreeContextType = {
  treeData: FolderType[];
  setTreeData: React.Dispatch<React.SetStateAction<FolderType[]>>;
  selectedNode: TreeNode | null;
  setSelectedNode: React.Dispatch<React.SetStateAction<TreeNode | null>>;
  expandedFolders: number[];
  setExpandedFolders: React.Dispatch<React.SetStateAction<number[]>>;
  isComponentModalOpen: boolean;
  setComponentModalOpen: (open: boolean) => void;
  componentBeingEdited: ComponentType | null;
  setComponentBeingEdited: React.Dispatch<React.SetStateAction<ComponentType | null>>;
  handleAddFolder: (parentId: number, name: string) => void;
  handleAddComponent: (parentId: number, component: Omit<ComponentType, "id" | "type">) => void;
  handleUpdateComponent: (component: ComponentType) => void;
  handleDeleteNode: (nodeId: number) => void;
  handleNodeDrop: (draggedNodeId: number, targetNodeId: number) => void;
};

// Create context with default values
const TreeContext = createContext<TreeContextType>({
  treeData: INITIAL_TREE_DATA,
  setTreeData: () => {},
  selectedNode: null,
  setSelectedNode: () => {},
  expandedFolders: [],
  setExpandedFolders: () => {},
  isComponentModalOpen: false,
  setComponentModalOpen: () => {},
  componentBeingEdited: null,
  setComponentBeingEdited: () => {},
  handleAddFolder: () => {},
  handleAddComponent: () => {},
  handleUpdateComponent: () => {},
  handleDeleteNode: () => {},
  handleNodeDrop: () => {},
});

// Hook for using this context
export const useTreeContext = () => useContext(TreeContext);

// Provider component
type TreeProviderProps = {
  children: ReactNode;
};

export const TreeProvider = ({ children }: TreeProviderProps) => {
  const [treeData, setTreeData] = useState<FolderType[]>(INITIAL_TREE_DATA);
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<number[]>([1]); // Root folder expanded by default
  const [isComponentModalOpen, setComponentModalOpen] = useState(false);
  const [componentBeingEdited, setComponentBeingEdited] = useState<ComponentType | null>(null);
  const { appInitialized } = useAppContext();

  // Load tree data from storage on component mount
  useEffect(() => {
    if (!appInitialized) return;

    const loadTreeData = async () => {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.local.get('treeData', (data) => {
            if (data.treeData) {
              setTreeData(data.treeData);
            }
          });
        } else {
          const storedTreeData = localStorage.getItem('treeData');
          if (storedTreeData) {
            setTreeData(JSON.parse(storedTreeData));
          }
        }
      } catch (error) {
        console.error('Error loading tree data:', error);
      }
    };

    loadTreeData();
  }, [appInitialized]);

  // Save tree data when it changes
  useEffect(() => {
    if (!appInitialized) return;

    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({ treeData });
      } else {
        localStorage.setItem('treeData', JSON.stringify(treeData));
      }
    } catch (error) {
      console.error('Error saving tree data:', error);
    }
  }, [treeData, appInitialized]);

  // Handler functions for tree operations
  const handleAddFolder = (parentId: number, name: string) => {
    const newFolder: FolderType = {
      id: Date.now(),
      name,
      type: "folder",
      children: [],
    };

    setTreeData((prevTree) => insertNode(prevTree, parentId, newFolder));
    setExpandedFolders((prev) => [...prev, parentId]);
  };

  const handleAddComponent = (parentId: number, component: Omit<ComponentType, "id" | "type">) => {
    const newComponent: ComponentType = {
      ...component,
      id: Date.now(),
      type: "component",
    };

    setTreeData((prevTree) => insertNode(prevTree, parentId, newComponent));
  };

  const handleUpdateComponent = (component: ComponentType) => {
    // Find component's parent folder
    let parentId: number | null = null;

    const findParent = (nodes: TreeNode[], componentId: number): number | null => {
      for (const node of nodes) {
        if (node.type === "folder") {
          for (const child of node.children) {
            if (child.id === componentId) {
              return node.id;
            }
          }
          const result = findParent(node.children, componentId);
          if (result !== null) {
            return result;
          }
        }
      }
      return null;
    };

    parentId = findParent(treeData, component.id);
    if (parentId === null) return;

    // Remove old component and insert updated one
    setTreeData((prevTree) => {
      const treeWithoutOldComponent = removeNode(prevTree, component.id);
      return insertNode(treeWithoutOldComponent, parentId!, component);
    });
  };

  const handleDeleteNode = (nodeId: number) => {
    setTreeData((prevTree) => removeNode(prevTree, nodeId));
    
    // Deselect if the deleted node was selected
    if (selectedNode && selectedNode.id === nodeId) {
      setSelectedNode(null);
    }
  };

  const handleNodeDrop = (draggedNodeId: number, targetNodeId: number) => {
    // Find the nodes
    let draggedNode: TreeNode | null = null;
    let targetNode: FolderType | null = null;

    const findNode = (nodes: TreeNode[], id: number): TreeNode | null => {
      for (const node of nodes) {
        if (node.id === id) return node;
        if (node.type === "folder") {
          const found = findNode(node.children, id);
          if (found) return found;
        }
      }
      return null;
    };

    draggedNode = findNode(treeData, draggedNodeId);
    const potentialTarget = findNode(treeData, targetNodeId);
    
    if (!draggedNode || !potentialTarget) return;
    
    // Make sure target is a folder
    if (potentialTarget.type !== "folder") return;
    targetNode = potentialTarget;

    // Prevent dropping a folder into its own descendant
    if (draggedNode.type === "folder" && isDescendant(targetNode, draggedNode as FolderType)) {
      return;
    }

    // Move the node
    setTreeData((prevTree) => moveNodeInTree(prevTree, draggedNodeId, targetNodeId));
  };

  return (
    <TreeContext.Provider
      value={{
        treeData,
        setTreeData,
        selectedNode,
        setSelectedNode,
        expandedFolders,
        setExpandedFolders,
        isComponentModalOpen,
        setComponentModalOpen,
        componentBeingEdited,
        setComponentBeingEdited,
        handleAddFolder,
        handleAddComponent,
        handleUpdateComponent,
        handleDeleteNode,
        handleNodeDrop,
      }}
    >
      {children}
    </TreeContext.Provider>
  );
};