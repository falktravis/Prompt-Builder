'use client';

/**
 * Section component
 * Individual section within a prompt
 */

import React, { useState, useEffect, useRef } from "react";
import { Section as SectionType, ComponentType } from "@/types";
import { usePromptContext } from "@/contexts/PromptContext";
import { useTreeContext } from "@/contexts/TreeContext";
import SectionHeader from "./SectionHeader";
import useAutosizeTextArea from "@/hooks/useAutosizeTextArea";
import { usePrompts } from "@/hooks/usePrompts"; // Added

interface SectionProps {
  section: SectionType;
  promptId: string;
  nameInputRefCallback?: (el: HTMLInputElement | null) => void; // Added for focusing
  index: number; // Added: index of the section
}

const findComponentById = (treeData: any[], id: string): ComponentType | null => {
  for (const node of treeData) {
    if (node.id === id && node.type === "component") {
      return node as ComponentType;
    }
    
    if (node.type === "folder" && node.children) {
      const found = findComponentById(node.children, id);
      if (found) return found;
    }
  }
  
  return null;
};

const Section: React.FC<SectionProps> = ({ section, promptId, nameInputRefCallback, index }) => {
  const { 
    updateSection, 
    deleteSection, 
    toggleSectionOpen,
    updateSectionFromLinkedComponent,
  } = usePromptContext();
  
  const { treeData } = useTreeContext();
  const { saveSectionToComponentLibrary } = usePrompts(); 
  
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  useAutosizeTextArea(textAreaRef, section.content, section.open);
  
  useEffect(() => {
    if (section.linkedComponentId) {
      const linkedComponent = findComponentById(treeData, section.linkedComponentId);
      
      if (linkedComponent && 
          (linkedComponent.content !== section.originalContent ||
           linkedComponent.componentType !== section.type ||
           linkedComponent.name !== section.name)) {
        updateSectionFromLinkedComponent(section, linkedComponent);
      }
    }
  }, [treeData, section, updateSectionFromLinkedComponent]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateSection(promptId, section.id, { 
      content: e.target.value
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };
  
  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    
    try {
      const data = e.dataTransfer.getData("text/plain");
      const component = JSON.parse(data);
      
      if (component && component.type === "component") {
        updateSection(promptId, section.id, {
          content: component.content,
          type: component.componentType,
          name: component.name,
          linkedComponentId: component.id,
          originalContent: component.content,
        });
      }
    } catch (error) {
      console.error("Error handling drop:", error);
    }
  };

  const handleSectionDragStart = (e: React.DragEvent) => {
    e.stopPropagation(); 
    const dragData = {
      dragType: "existingSection",
      sectionId: section.id,
      promptId: promptId,
      sectionData: section,
      originalIndex: index, // Added: original index of the dragged section
    };
    e.dataTransfer.setData("application/json", JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = "move";
    document.body.classList.add('is-dragging-something');
  };

  const handleSectionDragEnd = (e: React.DragEvent) => {
    e.stopPropagation();
    document.body.classList.remove('is-dragging-something');
  };

  return (
    <div 
      className={`section ${section.open ? "open" : "closed"} ${isDraggingOver ? "drag-over" : ""} ${section.type}`}
    >
      <div 
        className="section-drag-handle"
        draggable={true}
        onDragStart={handleSectionDragStart}
        onDragEnd={handleSectionDragEnd}
        title="Drag to reorder section"
      ></div>

      <SectionHeader 
        section={section}
        promptId={promptId}
        onToggle={() => toggleSectionOpen(promptId, section.id)}
        onDelete={() => deleteSection(promptId, section.id)}
        nameInputRefCallback={nameInputRefCallback}
      />
      
      {section.open && (
        <div 
          className="section-content"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <textarea
            ref={textAreaRef}
            className="section-input"
            value={section.content}
            onChange={handleContentChange}
            placeholder="Section content..."
          />
          
          {section.linkedComponentId && (
            <div className="linked-component-indicator">
              <span>Linked to component</span>
              {section.dirty && (
                <button 
                  className="save-to-library-btn"
                  onClick={() => saveSectionToComponentLibrary(promptId, section.id)}
                >
                  Save to Library
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Section;