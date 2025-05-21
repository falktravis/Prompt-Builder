/**
 * usePrompts hook
 * Provides prompt management utilities
 */

import { useCallback } from "react";
import { Section, ComponentType } from "../types";
import { usePromptContext } from "../contexts/PromptContext";
import { useTreeContext } from "../contexts/TreeContext";
import { useTreeData } from "./useTreeData";

export const usePrompts = () => {
  const { 
    prompts, 
    activePromptId,
    addSectionToPrompt,
    updateSection,
    getCompiledPromptText
  } = usePromptContext();
  
  const { findComponentById } = useTreeData();
  const { handleUpdateComponent } = useTreeContext();

  /**
   * Get the currently active prompt
   * @returns The active prompt or undefined if none
   */
  const getActivePrompt = useCallback(() => {
    return prompts.find(p => p.id === activePromptId);
  }, [prompts, activePromptId]);

  /**
   * Create a section from a component
   * @param promptId ID of the prompt to add the section to
   * @param componentId ID of the component to create section from
   */
  const createSectionFromComponent = useCallback((promptId: number, componentId: number) => {
    const component = findComponentById(componentId);
    if (!component) return;
    
    // Add a new section
    addSectionToPrompt(promptId, component.componentType);
    
    // Find the newly added section (last section in the prompt)
    const prompt = prompts.find(p => p.id === promptId);
    if (!prompt) return;
    
    const newSection = prompt.sections[prompt.sections.length - 1];
    
    // Update it with the component data
    updateSection(promptId, newSection.id, {
      name: component.name,
      content: component.content,
      type: component.componentType,
      linkedComponentId: component.id,
      originalContent: component.content
    });
  }, [findComponentById, addSectionToPrompt, prompts, updateSection]);

  /**
   * Copy a prompt to the clipboard
   * @param promptId ID of the prompt to copy
   * @param includeSystemPrompt Whether to include the system prompt
   * @param systemPrompt System prompt text to include
   * @returns Promise resolving to true if successful, false otherwise
   */
  const copyPromptToClipboard = useCallback((
    promptId: number, 
    includeSystemPrompt = false,
    systemPrompt = ""
  ): Promise<boolean> => {
    const promptText = getCompiledPromptText(promptId);
    const finalText = includeSystemPrompt && systemPrompt
      ? `${systemPrompt}\n\n${promptText}`
      : promptText;
      
    if (!finalText) return Promise.resolve(false);
    
    return navigator.clipboard.writeText(finalText)
      .then(() => true)
      .catch(() => false);
  }, [getCompiledPromptText]);

  /**
   * Check if a section needs to be updated from its linked component
   * @param section Section to check
   * @returns True if update is needed, false otherwise
   */
  const sectionNeedsUpdate = useCallback((section: Section): boolean => {
    if (!section.linkedComponentId) return false;
    
    const linkedComponent = findComponentById(section.linkedComponentId);
    if (!linkedComponent) return false;
    
    return linkedComponent.content !== section.originalContent ||
           linkedComponent.componentType !== section.type ||
           linkedComponent.name !== section.name;
  }, [findComponentById]);

  /**
   * Save changes from a section to its linked component in the library.
   * @param promptId ID of the prompt containing the section.
   * @param sectionId ID of the section to save.
   */
  const saveSectionToComponentLibrary = useCallback((promptId: number, sectionId: number) => {
    const prompt = prompts.find(p => p.id === promptId);
    if (!prompt) {
      console.error(`saveSectionToComponentLibrary: Prompt with id ${promptId} not found.`);
      return;
    }

    const section = prompt.sections.find(s => s.id === sectionId);
    if (!section) {
      console.error(`saveSectionToComponentLibrary: Section with id ${sectionId} not found in prompt ${promptId}.`);
      return;
    }

    if (!section.linkedComponentId) {
      console.warn(`saveSectionToComponentLibrary: Section ${sectionId} is not linked to a component.`);
      return;
    }

    if (!section.dirty) {
      // console.log(`saveSectionToComponentLibrary: Section ${sectionId} is not dirty. No changes to save.`);
      return;
    }

    const componentToUpdate = findComponentById(section.linkedComponentId);
    if (!componentToUpdate) {
      console.error(`saveSectionToComponentLibrary: Linked component with id ${section.linkedComponentId} not found in the tree.`);
      // Optionally, consider unlinking the section here or notifying the user more formally.
      updateSection(promptId, sectionId, { linkedComponentId: undefined, dirty: false, originalContent: undefined });
      return;
    }

    const updatedComponent: ComponentType = {
      ...componentToUpdate, // Preserve other component properties like id and type:"component"
      name: section.name,
      content: section.content,
      componentType: section.type,
    };

    handleUpdateComponent(updatedComponent); // This comes from useTreeContext

    // After successfully saving to the library, update the section's originalContent and reset dirty flag
    updateSection(promptId, sectionId, {
      originalContent: section.content,
      dirty: false,
    });

    console.log(`Section ${sectionId} changes saved to component ${section.linkedComponentId}`);
  }, [prompts, findComponentById, handleUpdateComponent, updateSection]);

  return {
    getActivePrompt,
    createSectionFromComponent,
    copyPromptToClipboard,
    sectionNeedsUpdate,
    saveSectionToComponentLibrary,
  };
};