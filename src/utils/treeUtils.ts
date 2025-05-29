/**
 * Tree manipulation utility functions
 * Handles operations on the folder/component tree structure
 */

import { TreeNode, FolderType, ComponentType } from "../types"; // Ensure ComponentType is imported

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
  folderId: string, // Changed from number
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
  parentId: string, // Changed from number
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
export const removeNode = (tree: FolderType[], nodeId: string): FolderType[] => { // Changed nodeId from number
  return tree.filter(node => node.id !== nodeId).map((node) => { // Filter at the current level first
    if (node.type === "folder") {
      return {
        ...node,
        children: removeNode(node.children as FolderType[], nodeId) as (FolderType | ComponentType)[] // Recursively call on children
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
  draggedNodeId: string, // Changed from number
  targetFolderId: string // Changed from number
): FolderType[] => {
  let nodeToMove: TreeNode | null = null;
  const updatedTree = JSON.parse(JSON.stringify(tree)); // Deep clone

  // Helper function to find and remove the node
  const findAndRemove = (nodes: (FolderType | ComponentType)[], id: string): TreeNode | null => { // Changed id from number
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
  
  nodeToMove = findAndRemove(updatedTree, draggedNodeId);
  
  if (!nodeToMove) {
    return tree; 
  }
  
  // Helper function to insert the node into its new location
  const insertIntoTarget = (nodes: (FolderType | ComponentType)[], targetId: string, nodeToInsert: TreeNode): boolean => { // Changed targetId from number, node to nodeToInsert
    for (let i = 0; i < nodes.length; i++) {
      const current = nodes[i];
      if (current.id === targetId && current.type === "folder") {
        current.children.push(nodeToInsert);
        return true;
      }
      
      if (current.type === "folder") {
        if (insertIntoTarget(current.children, targetId, nodeToInsert)) {
          return true;
        }
      }
    }
    return false;
  };
  
  if (!insertIntoTarget(updatedTree, targetFolderId, nodeToMove)) {
     // If target folder is not found, or if trying to drop into a root component (which is not a folder)
     // For simplicity, if the target isn't a valid folder, we can choose to not move the node
     // or append to root if targetFolderId implies root, though current logic requires a folder.
     // Re-adding to root if not inserted, or consider it an invalid move.
     // For now, if insertIntoTarget returns false, it means target folder wasn't found.
     // To be safe, returning the original tree if the target is not found.
     return tree;
  }
  
  return updatedTree;
};

/**
 * Recursively finds a node by its ID and applies an update function to it,
 * returning a new tree structure with the updated node.
 * @param nodes The array of nodes to search within.
 * @param nodeId The ID of the node to update.
 * @param updateFn A function that takes the found node and returns an updated version of it.
 * @returns A new array of nodes with the specified node updated.
 */
export const updateNodeById = (nodes: FolderType[], id: string, updates: Partial<FolderType>): FolderType[] => {
    return nodes.map(node => {
        if (node.id === id) {
            return { ...node, ...updates };
        }
        if (node.children) {
            // Correctly type the children before recursive call
            const children = node.children as FolderType[]; // Assuming children of FolderType are FolderType
            return { ...node, children: updateNodeById(children, id, updates) };
        }
        return node;
    });
};

/**
 * Deep clones a node and assigns new unique IDs to the node and its children.
 * @param node The node to clone.
 * @param generateId Function to generate unique IDs (now string).
 * @returns The cloned node with new IDs.
 */
export const cloneAndAssignNewIds = (node: TreeNode, generateId: () => string): TreeNode => { // Changed generateId return type
  const clonedNode = JSON.parse(JSON.stringify(node)) as TreeNode;
  clonedNode.id = generateId();

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
 * @param generateId Function to generate unique IDs (now string).
 * @returns A new array representing the merged tree structure.
 */
export const mergeTreeData = (
  existingNodes: FolderType[],
  newNodesFromFile: FolderType[],
  generateId: () => string // Changed generateId return type
): FolderType[] => {
  const mergedResultNodes: FolderType[] = JSON.parse(JSON.stringify(existingNodes)); 

  newNodesFromFile.forEach(nodeFromFile => {
    if (nodeFromFile.type === "folder") {
      const existingFolder = mergedResultNodes.find(
        (existingNode) => existingNode.type === "folder" && existingNode.name === nodeFromFile.name
      );

      if (existingFolder) {
        existingFolder.children = mergeTreeDataRecursive(
          existingFolder.children,
          nodeFromFile.children,
          generateId
        );
      } else {
        mergedResultNodes.push(cloneAndAssignNewIds(nodeFromFile, generateId) as FolderType);
      }
    }
  });

  return mergedResultNodes;
};

/**
 * Recursive helper for mergeTreeData to handle children arrays (mixed FolderType and ComponentType).
 * @param existingChildren Current children array.
 * @param newChildrenFromFile New children array from the file.
 * @param generateId Function to generate unique IDs (now string).
 * @returns Merged children array.
 */
const mergeTreeDataRecursive = (
  existingChildren: (FolderType | ComponentType)[],
  newChildrenFromFile: (FolderType | ComponentType)[],
  generateId: () => string // Changed generateId return type
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
    }
  });

  return mergedChildren;
};

// Helper function to find a node by ID in the tree
export const findNodeById = (tree: FolderType[], nodeId: string): TreeNode | null => {
  for (const node of tree) {
    if (node.id === nodeId) {
      return node;
    }
    if (node.type === "folder") {
      const foundInChildren = findNodeById(node.children as FolderType[], nodeId);
      if (foundInChildren) {
        return foundInChildren;
      }
    }
  }
  return null;
};

/**
 * Normalizes tree data loaded from storage, ensuring each folder has an 'expanded' property.
 * Defaults to false, except for the root node which defaults to true.
 * @param nodes The tree nodes to normalize.
 * @param rootId The ID of the root node.
 * @returns Normalized tree nodes, cast to FolderType[] as per plan for top-level.
 */
export const normalizeExpansionState = (nodes: (FolderType | ComponentType)[], defaultExpanded: boolean = false): (FolderType | ComponentType)[] => {
    return nodes.map(node => {
        if (node.type === 'folder') {
            const folderNode = node as FolderType;
            return {
                ...folderNode,
                expanded: folderNode.expanded !== undefined ? folderNode.expanded : defaultExpanded,
                children: folderNode.children ? normalizeExpansionState(folderNode.children, defaultExpanded) : []
            };
        }
        return node; // For ComponentType, just return the node
    });
};