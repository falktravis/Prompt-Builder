/**
 * Tree manipulation utility functions
 * Handles operations on the folder/component tree structure
 */

import { TreeNode, FolderType, ComponentType } from "../types";

/**
 * Check if a node is a descendant of another node
 * @param descendant Potential descendant node
 * @param ancestor Potential ancestor node
 * @returns boolean indicating if descendant is contained within ancestor
 */
export const isDescendant = (descendant: TreeNode, ancestor: FolderType): boolean => {
  if (ancestor.type !== "folder") return false;
  
  return ancestor.children.some((child) => {
    if (child.id === descendant.id) return true;
    return child.type === "folder" && isDescendant(descendant, child);
  });
};

/**
 * Updates a folder in the tree by ID
 * @param tree Current tree structure
 * @param folderId ID of folder to update
 * @param newData New folder data
 * @returns Updated tree structure
 */
export const updateFolderInTree = (
  tree: FolderType[],
  folderId: number,
  newData: Partial<FolderType>
): FolderType[] => {
  return tree.map((node) => {
    if (node.id === folderId && node.type === "folder") {
      return { ...node, ...newData };
    }
    
    if (node.type === "folder") {
      return {
        ...node,
        children: updateFolderInTree(node.children as FolderType[], folderId, newData) as (FolderType | ComponentType)[]
      };
    }
    
    return node;
  });
};

/**
 * Insert a node into the tree at the specified parent
 * @param tree Current tree structure
 * @param parentId ID of parent folder where node will be inserted
 * @param newNode Node to insert
 * @returns Updated tree structure
 */
export const insertNode = (
  tree: FolderType[],
  parentId: number,
  newNode: TreeNode
): FolderType[] => {
  return tree.map((node) => {
    if (node.id === parentId && node.type === "folder") {
      return {
        ...node,
        children: [...node.children, newNode],
      };
    }
    
    if (node.type === "folder") {
      return {
        ...node,
        children: insertNode(node.children as FolderType[], parentId, newNode) as (FolderType | ComponentType)[]
      };
    }
    
    return node;
  });
};

/**
 * Remove a node from the tree by ID
 * @param tree Current tree structure
 * @param nodeId ID of node to remove
 * @returns Updated tree structure
 */
export const removeNode = (tree: FolderType[], nodeId: number): FolderType[] => {
  return tree.map((node) => {
    if (node.type === "folder") {
      return {
        ...node,
        children: node.children
          .filter((child) => child.id !== nodeId)
          .map((child) => 
            child.type === "folder" 
              ? { ...child, children: removeNode([child] as FolderType[], nodeId)[0].children }
              : child
          ) as (FolderType | ComponentType)[],
      };
    }
    return node;
  });
};

/**
 * Move a node within the tree
 * @param tree Current tree structure
 * @param draggedNodeId ID of node being moved
 * @param targetFolderId ID of destination folder
 * @returns Updated tree structure
 */
export const moveNodeInTree = (
  tree: FolderType[],
  draggedNodeId: number,
  targetFolderId: number
): FolderType[] => {
  // Find the node to move
  let nodeToMove: TreeNode | null = null;
  let updatedTree = JSON.parse(JSON.stringify(tree));
  
  // Helper function to find and remove the node
  const findAndRemove = (nodes: (FolderType | ComponentType)[], id: number): TreeNode | null => {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (node.id === id) {
        nodes.splice(i, 1);
        return node;
      }
      
      if (node.type === "folder") {
        const found = findAndRemove(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };
  
  // Find and remove the node from its current location
  nodeToMove = findAndRemove(updatedTree, draggedNodeId);
  
  if (!nodeToMove) {
    return tree; // Node not found, return original tree
  }
  
  // Helper function to insert the node into its new location
  const insertIntoTarget = (nodes: (FolderType | ComponentType)[], targetId: number, node: TreeNode): boolean => {
    for (let i = 0; i < nodes.length; i++) {
      const current = nodes[i];
      if (current.id === targetId && current.type === "folder") {
        current.children.push(node);
        return true;
      }
      
      if (current.type === "folder") {
        if (insertIntoTarget(current.children, targetId, node)) {
          return true;
        }
      }
    }
    return false;
  };
  
  // Insert the node into the target folder
  if (!insertIntoTarget(updatedTree, targetFolderId, nodeToMove)) {
    return tree; // Target folder not found, return original tree
  }
  
  return updatedTree;
};

/**
 * Deep clones a node and assigns new unique IDs to the node and its children.
 * @param node The node to clone.
 * @param generateId Function to generate unique IDs.
 * @returns The cloned node with new IDs.
 */
export const cloneAndAssignNewIds = (node: TreeNode, generateId: () => number): TreeNode => {
  // Perform a deep clone of the input node
  const clonedNode = JSON.parse(JSON.stringify(node)) as TreeNode;

  // Assign a new ID to the cloned root node
  clonedNode.id = generateId();

  // If the cloned node is a folder, recursively call cloneAndAssignNewIds for its children
  if (clonedNode.type === "folder") {
    clonedNode.children = clonedNode.children.map(child => cloneAndAssignNewIds(child, generateId));
  }

  return clonedNode;
};

/**
 * Merges new nodes from a file into an existing tree structure.
 * - Adds new folders/components.
 * - If a folder with the same name exists, merges its content.
 * - If a component with the same name exists in the same folder, it's not duplicated.
 * - Assigns new IDs to all nodes from the file being added.
 * @param existingNodes The current array of top-level folders.
 * @param newNodesFromFile The array of top-level folders parsed from the loaded file.
 * @param generateId Function to generate unique IDs.
 * @returns A new array representing the merged tree structure.
 */
export const mergeTreeData = (
  existingNodes: FolderType[],
  newNodesFromFile: FolderType[],
  generateId: () => number
): FolderType[] => {
  const mergedResultNodes: FolderType[] = JSON.parse(JSON.stringify(existingNodes)); // Deep clone to avoid mutating original

  newNodesFromFile.forEach(nodeFromFile => {
    if (nodeFromFile.type === "folder") {
      const existingFolder = mergedResultNodes.find(
        (existingNode) => existingNode.type === "folder" && existingNode.name === nodeFromFile.name
      );

      if (existingFolder) {
        // Folder with the same name exists, merge its children
        // Ensure children are treated as TreeNode[] for recursive merging
        existingFolder.children = mergeTreeDataRecursive(
          existingFolder.children,
          nodeFromFile.children,
          generateId
        );
      } else {
        // Folder does not exist, clone and add it with new IDs
        mergedResultNodes.push(cloneAndAssignNewIds(nodeFromFile, generateId) as FolderType);
      }
    }
    // Components at the root level are not expected by FolderType[],
    // but if the function were generalized, component handling would go here.
    // For this specific use case, newNodesFromFile is FolderType[].
  });

  return mergedResultNodes;
};

/**
 * Recursive helper for mergeTreeData to handle children arrays (mixed FolderType and ComponentType).
 * @param existingChildren Current children array.
 * @param newChildrenFromFile New children array from the file.
 * @param generateId Function to generate unique IDs.
 * @returns Merged children array.
 */
const mergeTreeDataRecursive = (
  existingChildren: (FolderType | ComponentType)[],
  newChildrenFromFile: (FolderType | ComponentType)[],
  generateId: () => number
): (FolderType | ComponentType)[] => {
  const mergedChildren: (FolderType | ComponentType)[] = JSON.parse(JSON.stringify(existingChildren));

  newChildrenFromFile.forEach(childFromFile => {
    if (childFromFile.type === "folder") {
      const existingFolder = mergedChildren.find(
        (existingChild) => existingChild.type === "folder" && existingChild.name === childFromFile.name
      ) as FolderType | undefined;

      if (existingFolder) {
        existingFolder.children = mergeTreeDataRecursive(
          existingFolder.children,
          childFromFile.children,
          generateId
        );
      } else {
        mergedChildren.push(cloneAndAssignNewIds(childFromFile, generateId) as FolderType);
      }
    } else if (childFromFile.type === "component") {
      const existingComponent = mergedChildren.find(
        (existingChild) => existingChild.type === "component" && existingChild.name === childFromFile.name
      );

      if (!existingComponent) {
        mergedChildren.push(cloneAndAssignNewIds(childFromFile, generateId) as ComponentType);
      }
      // If component with same name exists, skip to prevent duplication
    }
  });

  return mergedChildren;
};