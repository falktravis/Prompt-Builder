/**
 * useTreeData hook
 * Provides tree data manipulation functionality
 */

import { useCallback } from "react";
import { FolderType, TreeNode, ComponentType } from "../types";
import { useTreeContext } from "../contexts/TreeContext";

/**
 * Hook for finding a node in the tree by ID
 */
export const useTreeData = () => {
  const { treeData } = useTreeContext();

  /**
   * Find a node in the tree by its ID
   * @param nodeId ID of the node to find
   * @returns The node if found, null otherwise
   */
  const findNodeById = useCallback((nodeId: number): TreeNode | null => {
    const findNode = (nodes: TreeNode[]): TreeNode | null => {
      for (const node of nodes) {
        if (node.id === nodeId) {
          return node;
        }
        if (node.type === "folder") {
          const foundInChildren = findNode((node as FolderType).children);
          if (foundInChildren) {
            return foundInChildren;
          }
        }
      }
      return null;
    };

    return findNode(treeData);
  }, [treeData]);

  /**
   * Find a component in the tree by its ID
   * @param componentId ID of the component to find
   * @returns The component if found, null otherwise
   */
  const findComponentById = useCallback((componentId: number): ComponentType | null => {
    const node = findNodeById(componentId);
    return node && node.type === "component" ? node as ComponentType : null;
  }, [findNodeById]);

  /**
   * Find the parent of a node in the tree
   * @param nodeId ID of the node to find the parent for
   * @returns The parent folder if found, null otherwise
   */
  const findParentNode = useCallback((nodeId: number): FolderType | null => {
    const findParent = (nodes: TreeNode[]): FolderType | null => {
      for (const node of nodes) {
        if (node.type === "folder") {
          const folderNode = node as FolderType;
          if (folderNode.children.some(child => child.id === nodeId)) {
            return folderNode;
          }
          const foundInChildren = findParent(folderNode.children);
          if (foundInChildren) {
            return foundInChildren;
          }
        }
      }
      return null;
    };

    return findParent(treeData);
  }, [treeData]);

  /**
   * Get the full path of a node in the tree
   * @param nodeId ID of the node to get the path for
   * @returns Array of node names representing the path
   */
  const getNodePath = useCallback((nodeId: number): string[] => {
    const path: string[] = [];
    
    const buildPath = (currentId: number): boolean => {
      const node = findNodeById(currentId);
      if (!node) return false;
      
      path.unshift(node.name);
      
      const parent = findParentNode(currentId);
      if (parent) {
        return buildPath(parent.id);
      }
      
      return true;
    };
    
    buildPath(nodeId);
    return path;
  }, [findNodeById, findParentNode]);

  return {
    findNodeById,
    findComponentById,
    findParentNode,
    getNodePath
  };
};