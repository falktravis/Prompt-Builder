/**
 * ComponentModal
 * Modal for adding and editing components
 */

import React, { useState, useEffect } from "react";
import ModalBase from "./ModalBase";
import { useTreeContext } from "../../contexts/TreeContext";

const ComponentModal: React.FC = () => {
  const {
    isComponentModalOpen,
    setComponentModalOpen,
    componentBeingEdited,
    selectedNode,
    handleAddComponent,
    handleUpdateComponent
  } = useTreeContext();

  const [componentName, setComponentName] = useState("");
  const [componentContent, setComponentContent] = useState("");
  const [componentType, setComponentType] = useState<"instruction" | "role" | "context" | "format" | "style">("instruction");
  const [error, setError] = useState("");

  // Reset form when modal opens/closes or editing component changes
  useEffect(() => {
    if (isComponentModalOpen) {
      if (componentBeingEdited) {
        // Editing an existing component
        setComponentName(componentBeingEdited.name);
        setComponentContent(componentBeingEdited.content);
        setComponentType(componentBeingEdited.componentType);
      } else {
        // Adding a new component
        setComponentName("");
        setComponentContent("");
        setComponentType("instruction");
      }
      setError("");
    }
  }, [isComponentModalOpen, componentBeingEdited]);

  // Submit handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!componentName.trim()) {
      setError("Component name is required");
      return;
    }

    if (componentBeingEdited) {
      // Update existing component
      handleUpdateComponent({
        ...componentBeingEdited,
        name: componentName.trim(),
        content: componentContent,
        componentType: componentType
      });
    } else if (selectedNode && selectedNode.type === "folder") {
      // Add new component
      handleAddComponent(selectedNode.id, {
        name: componentName.trim(),
        content: componentContent,
        componentType: componentType
      });
    }

    setComponentModalOpen(false);
  };

  return (
    <ModalBase
      isOpen={isComponentModalOpen}
      onClose={() => setComponentModalOpen(false)}
      title={componentBeingEdited ? "Edit Component" : "Add Component"}
      className="component-modal"
    >
      <form onSubmit={handleSubmit}>
        {error && <div className="error-message">{error}</div>}
        
        <div className="form-group">
          <label htmlFor="componentName">Name:</label>
          <input
            id="componentName"
            type="text"
            value={componentName}
            onChange={(e) => setComponentName(e.target.value)}
            autoFocus
          />
        </div>

        <div className="form-group">
          <label htmlFor="componentType">Type:</label>
          <select 
            id="componentType" 
            value={componentType} 
            onChange={(e) => setComponentType(e.target.value as any)}
          >
            <option value="instruction">Instruction</option>
            <option value="role">Role</option>
            <option value="context">Context</option>
            <option value="format">Format</option>
            <option value="style">Style</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="componentContent">Content:</label>
          <textarea
            id="componentContent"
            value={componentContent}
            onChange={(e) => setComponentContent(e.target.value)}
            rows={10}
          />
        </div>

        <div className="form-actions">
          <button type="button" onClick={() => setComponentModalOpen(false)}>Cancel</button>
          <button type="submit" className="primary">
            {componentBeingEdited ? "Confirm" : "Create"}
          </button>
        </div>
      </form>
    </ModalBase>
  );
};

export default ComponentModal;