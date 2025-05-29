'use client';

/**
 * PromptEditor component
 * Main interface for building and editing prompts
 */

import React, { useState, DragEvent, useRef, useEffect } from "react";
import { usePromptContext } from "../../contexts/PromptContext";
import { useAppContext } from "../../contexts/AppContext";
import Section from "./Section";
import PromptTabs from "./PromptTabs";
import ActionBar from "./ActionBar";
import "./PromptEditor.scss";
import { ComponentType as ComponentNodeType, Section as SectionType } from "../../types";
import { v4 as uuidv4 } from 'uuid'; // Import uuidv4 at the top of the file

const PromptEditor: React.FC = () => {
  const { 
    prompts, 
    activePromptId, 
    setActivePromptId,
    addPrompt, 
    addSectionAtIndex,
    moveSectionToIndex, // Added from context
    newlyAddedSectionIdForFocus,
    clearNewlyAddedSectionIdForFocus,
    updatePromptName, // Added from context
  } = usePromptContext();
  
  const { settings } = useAppContext();
  const sectionNameInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const mainTitleInputRef = useRef<HTMLInputElement>(null);
  
  // State for main prompt title editing
  const [isEditingActivePromptTitle, setIsEditingActivePromptTitle] = useState(false);
  const [activePromptTitleValue, setActivePromptTitleValue] = useState("");

  // Track editing state for prompt names (for tabs)
  const [editingPromptName, setEditingPromptName] = useState<string | null>(null); // Ensure this is string | null
  const [editingPromptNameValue, setEditingPromptNameValue] = useState("");

  // State for drag and drop indicator
  const [dropSectionIndex, setDropSectionIndex] = useState<number | null>(null);
  const sectionsContainerRef = useRef<HTMLDivElement>(null);
  
  // Get active prompt
  const activePrompt = prompts.find(p => p.id === activePromptId);

  // Effect to focus main title input when it becomes editable
  useEffect(() => {
    if (isEditingActivePromptTitle && mainTitleInputRef.current) {
      mainTitleInputRef.current.focus();
    }
  }, [isEditingActivePromptTitle]);
  
  // Start editing prompt name (for tabs)
  const startEditingPromptName = (promptId: string, currentName: string) => { // Ensure promptId is string
    setEditingPromptName(promptId);
    setEditingPromptNameValue(currentName);
  };
  
  // Save edited prompt name (for tabs)
  const savePromptName = (promptId: string) => { // Ensure promptId is string
    if (!editingPromptNameValue.trim()) {
      const currentPrompt = prompts.find(p => p.id === promptId); // p.id is string, promptId is string
      if (currentPrompt) {
          setEditingPromptNameValue(currentPrompt.name);
      }
      setEditingPromptName(null); 
      return;
    }
    updatePromptName(promptId, editingPromptNameValue.trim()); // promptId is string, updatePromptName expects string
    setEditingPromptName(null); 
  };

  // Drag and drop handlers for the sections container
  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!sectionsContainerRef.current || !activePrompt) return;

    const sectionElements = Array.from(
      sectionsContainerRef.current.querySelectorAll(".section")
    ) as HTMLElement[];

    let dropIdx = activePrompt.sections.length;
    for (let i = 0; i < sectionElements.length; i++) {
      const elem = sectionElements[i];
      const rect = elem.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      if (event.clientY < midY) {
        dropIdx = i;
        break;
      }
    }
    setDropSectionIndex(dropIdx);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDropSectionIndex(null);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!activePrompt) return;
    setDropSectionIndex(null);
    document.body.classList.remove('is-dragging-something'); // Ensure grabbing cursor is removed on drop

    const data = event.dataTransfer.getData("application/json");
    if (data) {
      try {
        const droppedItem = JSON.parse(data);
        const insertionIndex = dropSectionIndex !== null ? dropSectionIndex : activePrompt.sections.length;

        if (droppedItem.dragType === "existingSection") {
          // Handle reordering of an existing section
          if (typeof droppedItem.sectionId === 'string' && 
              typeof activePromptId === 'string' &&
              droppedItem.sectionId && // Ensure not empty string
              activePromptId &&       // Ensure not empty string
              typeof droppedItem.originalIndex === 'number') {

            let finalInsertionIndex = insertionIndex;

            // If the section is dragged downwards (originalIndex is less than the target insertionIndex),
            // the actual index for insertion in the modified list (after removal) will be one less.
            if (droppedItem.originalIndex < insertionIndex) {
              finalInsertionIndex = insertionIndex - 1;
            }
            // If dragging upwards (originalIndex > insertionIndex) or to the same conceptual slot,
            // the insertionIndex is correct as items before the originalIndex are not shifted by removal.
            // The case where originalIndex === insertionIndex (no actual move) will also be handled correctly
            // by moveSectionToIndex if it's a no-op or reinserts at the same spot.

            // Ensure the finalInsertionIndex is not less than 0.
            if (finalInsertionIndex < 0) {
                finalInsertionIndex = 0;
            }
            
            moveSectionToIndex(activePromptId, droppedItem.sectionId, finalInsertionIndex);
          }
        } else {
          // Handle adding a new section from a componentNode (existing logic)
          const componentNode = droppedItem as ComponentNodeType; // Assuming it's a ComponentNodeType if not existingSection
          const newSection: SectionType = {
            id: uuidv4(), // Changed from Date.now() to uuidv4() for string ID
            name: componentNode.name,
            content: componentNode.content,
            type: componentNode.componentType,
            linkedComponentId: componentNode.id,
            originalContent: componentNode.content,
            open: true,
            dirty: false,
          };
          addSectionAtIndex(activePrompt.id, newSection, insertionIndex);
        }
      } catch (error) {
        console.error("Failed to parse dropped data or process drop:", error);
      }
    }
  };

  // Effect for focusing newly added section
  useEffect(() => {
    if (newlyAddedSectionIdForFocus && activePrompt && sectionsContainerRef.current) {
      const inputEl = sectionNameInputRefs.current[newlyAddedSectionIdForFocus]; // key is string
      if (inputEl) {
        setTimeout(() => {
          inputEl.focus();
          inputEl.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 50);
      }
      clearNewlyAddedSectionIdForFocus();
    }
  }, [newlyAddedSectionIdForFocus, activePrompt?.sections, clearNewlyAddedSectionIdForFocus]);
  
  if (!activePrompt) {
    return (
      <div id="content">
        <div className="empty-state">
          <p>No prompts available. Create a new prompt to get started.</p>
          <button onClick={() => addPrompt()}>Create Prompt</button>
        </div>
      </div>
    );
  }

  return (
    <div id="content">
      {/* Tabs for prompt navigation */}
      <PromptTabs 
        prompts={prompts}
        activePromptId={activePromptId}
        setActivePromptId={setActivePromptId}
        // Props for tab-specific editing
        editingPromptName={editingPromptName} 
        editingPromptNameValue={editingPromptNameValue}
        setEditingPromptNameValue={setEditingPromptNameValue}
        startEditingPromptName={startEditingPromptName}
        savePromptName={savePromptName}
      />

      {/* Main Prompt Title Display/Input */}
      {activePrompt && (
        <div className="prompt-main-title-container">
          {isEditingActivePromptTitle ? (
            <input
              type="text"
              className="prompt-main-title-input"
              value={activePromptTitleValue}
              onChange={(e) => setActivePromptTitleValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (activePrompt && activePromptTitleValue.trim()) {
                    updatePromptName(activePrompt.id, activePromptTitleValue.trim());
                  }
                  setIsEditingActivePromptTitle(false);
                  e.preventDefault();
                } else if (e.key === 'Escape') {
                  setIsEditingActivePromptTitle(false);
                  // Optionally reset activePromptTitleValue to activePrompt.name if needed
                  // setActivePromptTitleValue(activePrompt.name); 
                }
              }}
              onBlur={() => {
                // Check if the related target is part of the input or something that should not trigger save
                // This is a common pattern but might need adjustment based on specific interactable elements
                // For now, we assume any blur should attempt to save and close.
                if (activePrompt && activePromptTitleValue.trim()) {
                  updatePromptName(activePrompt.id, activePromptTitleValue.trim());
                }
                setIsEditingActivePromptTitle(false);
              }}
              ref={mainTitleInputRef}
            />
          ) : (
            <h2
              className="prompt-main-title-display"
              onClick={() => {
                if (activePrompt) {
                  setIsEditingActivePromptTitle(true);
                  setActivePromptTitleValue(activePrompt.name);
                }
              }}
            >
              {activePrompt.name}
            </h2>
          )}
        </div>
      )}

      {/* Sections */}
      <div 
        className="sections-container"
        ref={sectionsContainerRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {dropSectionIndex !== null && activePrompt && (
          <div
            className="insertion-indicator"
            style={{
              top: (() => {
                if (!sectionsContainerRef.current) return 0;
                const sectionElements = Array.from(
                  sectionsContainerRef.current.querySelectorAll(".section")
                ) as HTMLElement[];

                if (sectionElements.length === 0) return 0;
                if (dropSectionIndex === 0) {
                  return sectionElements[0].offsetTop;
                }
                if (dropSectionIndex >= sectionElements.length) {
                  const lastSection = sectionElements[sectionElements.length - 1];
                  return lastSection.offsetTop + lastSection.offsetHeight;
                }
                return sectionElements[dropSectionIndex].offsetTop;
              })(),
            }}
          />
        )}
        {activePrompt.sections.map((section, index) => (
          <Section 
            key={section.id} 
            section={section}
            promptId={activePrompt.id}
            index={index} // Added: pass index to Section component
            nameInputRefCallback={(el) => {
              if (section.id) { // Ensure section.id is not null/undefined before using as key
                sectionNameInputRefs.current[section.id] = el; // section.id is string
              }
            }}
          />
        ))}
      </div>

    {/* Action bar with copy buttons */}
    <ActionBar 
        activePromptId={activePromptId}
        systemPrompt={settings.systemPrompt}
        markdownEnabled={settings.markdownPromptingEnabled}
      />
    </div>
  );
};

export default PromptEditor;