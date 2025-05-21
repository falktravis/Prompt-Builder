/**
 * useDragDrop hook
 * Provides drag and drop functionality
 */

import { useState, useCallback } from "react";
import { TreeNode, ComponentType } from "../types";

type DragNodeData = {
  id: number;
  type: string;
  name: string;
  content?: string;
  componentType?: string;
};

export const useDragDrop = () => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  
  /**
   * Start dragging a tree node
   * @param e Drag event
   * @param node Node being dragged
   */
  const handleTreeNodeDragStart = useCallback((e: React.DragEvent, node: TreeNode) => {
    const dragData: DragNodeData = {
      id: node.id,
      type: node.type,
      name: node.name
    };
    
    // Add component specific data if it's a component
    if (node.type === "component") {
      const component = node as ComponentType;
      dragData.content = component.content;
      dragData.componentType = component.componentType;
    }
    
    e.dataTransfer.setData("text/plain", JSON.stringify(dragData));
    
    // Set drag image
    const dragPreview = document.createElement("div");
    dragPreview.className = `dragging-component dragging-component-${
      node.type === "folder" ? "folder" : (node as any).componentType || "unknown"
    }`;
    dragPreview.textContent = node.name;
    document.body.appendChild(dragPreview);
    e.dataTransfer.setDragImage(dragPreview, 0, 0);
    
    // Remove the element after it's used
    setTimeout(() => {
      document.body.removeChild(dragPreview);
    }, 0);
  }, []);
  
  /**
   * Handle drag over event
   * @param e Drag event
   * @param preventDefault Whether to call preventDefault on the event
   */
  const handleDragOver = useCallback((e: React.DragEvent, preventDefault = true) => {
    if (preventDefault) {
      e.preventDefault();
    }
    setIsDraggingOver(true);
  }, []);
  
  /**
   * Handle drag leave event
   */
  const handleDragLeave = useCallback(() => {
    setIsDraggingOver(false);
  }, []);
  
  /**
   * Parse data from a drag event
   * @param e Drag event
   * @returns Parsed data or null if invalid
   */
  const parseDragData = useCallback((e: React.DragEvent): DragNodeData | null => {
    try {
      const data = e.dataTransfer.getData("text/plain");
      return JSON.parse(data);
    } catch (err) {
      console.error("Error parsing drag data:", err);
      return null;
    }
  }, []);

  return {
    isDraggingOver,
    setIsDraggingOver,
    handleTreeNodeDragStart,
    handleDragOver,
    handleDragLeave,
    parseDragData
  };
};