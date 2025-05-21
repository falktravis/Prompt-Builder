/**
 * PromptContext
 * Manages prompts and their sections
 */

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { Prompt, Section, ComponentType } from "../types";
import { useAppContext } from "./AppContext";

// Context type definition
type PromptContextType = {
  prompts: Prompt[];
  setPrompts: React.Dispatch<React.SetStateAction<Prompt[]>>;
  activePromptId: number | null;
  setActivePromptId: React.Dispatch<React.SetStateAction<number | null>>;
  addPrompt: (name?: string) => Prompt;
  duplicatePrompt: (promptIdToDuplicate: number) => Prompt | null; // Added this line
  addSectionToPrompt: (promptId: number, type?: string) => void;
  updateSection: (promptId: number, sectionId: number, updates: Partial<Omit<Section, "id">>) => void;
  deleteSection: (promptId: number, sectionId: number) => void;
  moveSectionUp: (promptId: number, sectionId: number) => void;
  moveSectionDown: (promptId: number, sectionId: number) => void;
  moveSectionToIndex: (promptId: number, sectionId: number, newIndex: number) => void; // Added for section reordering
  toggleSectionOpen: (promptId: number, sectionId: number) => void;
  deletePrompt: (promptId: number) => void;
  updateSectionFromLinkedComponent: (section: Section, component: ComponentType) => void;
  getCompiledPromptText: (promptId: number) => string;
  addSectionAtIndex: (section: Section, index: number) => void; // Added for drag and drop
  addNewSectionForEditing: (promptId: number) => void; // Added for new section button
  newlyAddedSectionIdForFocus: number | null; // Added for focusing new section
  clearNewlyAddedSectionIdForFocus: () => void; // Added for clearing focus state
  updatePromptName: (promptId: number, newName: string) => void; // Added for updating prompt name
};

// Create context with default values
const PromptContext = createContext<PromptContextType>({
  prompts: [],
  setPrompts: () => {},
  activePromptId: null,
  setActivePromptId: () => {},
  addPrompt: () => ({ id: 0, num: 0, name: "", sections: [] }),
  duplicatePrompt: () => null, // Added this line
  addSectionToPrompt: () => {},
  updateSection: () => {},
  deleteSection: () => {},
  moveSectionUp: () => {},
  moveSectionDown: () => {},
  moveSectionToIndex: () => {}, // Added for section reordering
  toggleSectionOpen: () => {},
  deletePrompt: () => {},
  updateSectionFromLinkedComponent: () => {},
  getCompiledPromptText: () => "",
  addSectionAtIndex: () => {}, // Added for drag and drop
  addNewSectionForEditing: () => {}, // Added for new section button
  newlyAddedSectionIdForFocus: null, // Added for focusing new section
  clearNewlyAddedSectionIdForFocus: () => {}, // Added for clearing focus state
  updatePromptName: () => {}, // Added for updating prompt name
});

// Hook for using this context
export const usePromptContext = () => useContext(PromptContext);

// Provider component
type PromptProviderProps = {
  children: ReactNode;
};

export const PromptProvider = ({ children }: PromptProviderProps) => {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [activePromptId, setActivePromptId] = useState<number | null>(null);
  const [newlyAddedSectionIdForFocus, setNewlyAddedSectionIdForFocus] = useState<number | null>(null); // Added state
  const { settings, appInitialized } = useAppContext();

  // Create initial default prompt if none exist
  useEffect(() => {
    if (prompts.length === 0 && appInitialized) {
      const initialPrompt = addPrompt(settings.defaultPromptName);
      setActivePromptId(initialPrompt.id);
    }
  }, [appInitialized]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load prompts from storage on component mount
  useEffect(() => {
    if (!appInitialized) return;

    const loadPrompts = async () => {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.local.get(['prompts', 'activePromptId'], (data) => {
            if (data.prompts && data.prompts.length > 0) {
              setPrompts(data.prompts);
              setActivePromptId(data.activePromptId || data.prompts[0].id);
            }
          });
        } else {
          const storedPrompts = localStorage.getItem('prompts');
          const storedActivePromptId = localStorage.getItem('activePromptId');
          
          if (storedPrompts) {
            const parsedPrompts = JSON.parse(storedPrompts);
            setPrompts(parsedPrompts);
            
            if (parsedPrompts.length > 0) {
              setActivePromptId(storedActivePromptId ? parseInt(storedActivePromptId, 10) : parsedPrompts[0].id);
            }
          }
        }
      } catch (error) {
        console.error('Error loading prompts:', error);
      }
    };

    loadPrompts();
  }, [appInitialized]);

  // Save prompts when they change
  useEffect(() => {
    if (!appInitialized || prompts.length === 0) return;

    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({ prompts, activePromptId });
      } else {
        localStorage.setItem('prompts', JSON.stringify(prompts));
        localStorage.setItem('activePromptId', activePromptId?.toString() || '');
      }
    } catch (error) {
      console.error('Error saving prompts:', error);
    }
  }, [prompts, activePromptId, appInitialized]);

  // Create a new prompt
  const addPrompt = (name?: string): Prompt => {
    const id = Date.now();
    const nextNum = prompts.length > 0 
      ? Math.max(...prompts.map(p => p.num)) + 1 
      : 1;
    
    const newPrompt: Prompt = {
      id,
      num: nextNum,
      name: name || `${settings.defaultPromptName} ${nextNum}`,
      sections: [{
        id: Date.now(),
        name: 'Section 1',
        content: '',
        type: settings.defaultSectionType,
        open: true,
        dirty: false
      }]
    };

    setPrompts(prev => [...prev, newPrompt]);
    return newPrompt;
  };

  // Duplicate an existing prompt
  const duplicatePrompt = (promptIdToDuplicate: number): Prompt | null => {
    const originalPrompt = prompts.find(p => p.id === promptIdToDuplicate);
    if (!originalPrompt) {
      console.error("Original prompt to duplicate not found");
      return null;
    }

    const newPromptId = Date.now();
    // Deep copy sections and ensure new unique IDs for each section
    // Also reset any transient states like editingHeader
    const newSections = originalPrompt.sections.map((section) => ({
      ...section,
      id: Date.now() + Math.random(), // Unique ID for the new section
      editingHeader: false, // Reset editing state
      editingHeaderTempName: undefined, // Reset temporary editing name
      editingHeaderTempType: undefined, // Reset temporary editing type
    }));

    // Calculate the 'num' for the new prompt
    const nextNum = prompts.length > 0 
      ? Math.max(...prompts.map(p => p.num)) + 1 
      : 1;

    const duplicatedPrompt: Prompt = {
      // Spread originalPrompt fields that should be copied, then override specific ones.
      // Based on current Prompt type: id, num, name, sections.
      // We are creating new id, num, name, sections.
      id: newPromptId,
      num: nextNum,
      name: `${originalPrompt.name} (copy)`,
      sections: newSections,
    };

    setPrompts(prevPrompts => [...prevPrompts, duplicatedPrompt]);
    setActivePromptId(duplicatedPrompt.id); // Set the new duplicated prompt as active
    return duplicatedPrompt;
  };

  // Add a section to a prompt
  const addSectionToPrompt = (promptId: number, type?: string) => {
    setPrompts(prevPrompts => 
      prevPrompts.map(prompt => {
        if (prompt.id !== promptId) return prompt;
        
        const newSection: Section = {
          id: Date.now(),
          name: `Section ${prompt.sections.length + 1}`,
          content: '',
          type: (type as any) || settings.defaultSectionType,
          open: true,
          dirty: false
        };
        
        return {
          ...prompt,
          sections: [...prompt.sections, newSection]
        };
      })
    );
  };

  // Add a section to a prompt at a specific index
  const addSectionAtIndex = (section: Section, index: number) => {
    if (!activePromptId) return;
    setPrompts(prevPrompts =>
      prevPrompts.map(prompt => {
        if (prompt.id !== activePromptId) return prompt;

        const newSections = [...prompt.sections];
        newSections.splice(index, 0, section);

        return {
          ...prompt,
          sections: newSections,
        };
      })
    );
  };

  // Move a section to a specific index within a prompt
  const moveSectionToIndex = (promptId: number, sectionId: number, newIndex: number) => {
    setPrompts(prevPrompts =>
      prevPrompts.map(prompt => {
        if (prompt.id !== promptId) return prompt;

        const sectionToMove = prompt.sections.find(s => s.id === sectionId);
        if (!sectionToMove) return prompt; // Section not found

        const sectionsWithoutMoved = prompt.sections.filter(s => s.id !== sectionId);
        
        const newSections = [...sectionsWithoutMoved];
        const actualNewIndex = Math.max(0, Math.min(newIndex, newSections.length));
        newSections.splice(actualNewIndex, 0, sectionToMove);

        return {
          ...prompt,
          sections: newSections,
        };
      })
    );
  };

  // Update a section in a prompt
  const updateSection = (
    promptId: number, 
    sectionId: number, 
    updates: Partial<Omit<Section, "id">>
  ) => {
    setPrompts(prevPrompts => 
      prevPrompts.map(prompt => {
        if (prompt.id !== promptId) return prompt;
        
        return {
          ...prompt,
          sections: prompt.sections.map(section => {
            if (section.id !== sectionId) return section;
            
            // Apply all updates from the 'updates' object to a temporary version of the section.
            const tempUpdatedSection = {
              ...section,
              ...updates,
            };

            let finalDirtyState;
            if (tempUpdatedSection.linkedComponentId) {
              // For linked components, the dirty status is strictly determined by whether
              // its current content differs from its originalContent (the content synced from the library).
              finalDirtyState = tempUpdatedSection.content !== tempUpdatedSection.originalContent;
            } else {
              // For non-linked sections, the concept of 'dirty' relative to a library component doesn't apply.
              // It will be false unless explicitly set to true by the 'updates' object.
              finalDirtyState = updates.dirty === true;
            }
            
            return {
              ...tempUpdatedSection,
              dirty: finalDirtyState,
            };
          })
        };
      })
    );
  };

  // Delete a section from a prompt
  const deleteSection = (promptId: number, sectionId: number) => {
    setPrompts(prevPrompts => 
      prevPrompts.map(prompt => {
        if (prompt.id !== promptId) return prompt;
        
        return {
          ...prompt,
          sections: prompt.sections.filter(section => section.id !== sectionId)
        };
      })
    );
  };

  // Move a section up in the order
  const moveSectionUp = (promptId: number, sectionId: number) => {
    setPrompts(prevPrompts => 
      prevPrompts.map(prompt => {
        if (prompt.id !== promptId) return prompt;
        
        const sectionIndex = prompt.sections.findIndex(s => s.id === sectionId);
        if (sectionIndex <= 0) return prompt;
        
        const newSections = [...prompt.sections];
        const temp = newSections[sectionIndex];
        newSections[sectionIndex] = newSections[sectionIndex - 1];
        newSections[sectionIndex - 1] = temp;
        
        return {
          ...prompt,
          sections: newSections
        };
      })
    );
  };

  // Move a section down in the order
  const moveSectionDown = (promptId: number, sectionId: number) => {
    setPrompts(prevPrompts => 
      prevPrompts.map(prompt => {
        if (prompt.id !== promptId) return prompt;
        
        const sectionIndex = prompt.sections.findIndex(s => s.id === sectionId);
        if (sectionIndex < 0 || sectionIndex >= prompt.sections.length - 1) return prompt;
        
        const newSections = [...prompt.sections];
        const temp = newSections[sectionIndex];
        newSections[sectionIndex] = newSections[sectionIndex + 1];
        newSections[sectionIndex + 1] = temp;
        
        return {
          ...prompt,
          sections: newSections
        };
      })
    );
  };

  // Toggle a section's open state
  const toggleSectionOpen = (promptId: number, sectionId: number) => {
    setPrompts(prevPrompts => 
      prevPrompts.map(prompt => {
        if (prompt.id !== promptId) return prompt;
        
        return {
          ...prompt,
          sections: prompt.sections.map(section => {
            if (section.id !== sectionId) return section;
            
            return {
              ...section,
              open: !section.open
            };
          })
        };
      })
    );
  };

  // Delete a prompt
  const deletePrompt = (promptId: number) => {
    setPrompts(prevPrompts => prevPrompts.filter(p => p.id !== promptId));
    
    // If we deleted the active prompt, select another one
    if (activePromptId === promptId) {
      const remainingPrompts = prompts.filter(p => p.id !== promptId);
      setActivePromptId(remainingPrompts.length > 0 ? remainingPrompts[0].id : null);
    }
  };

  // Update a section from a linked component
  const updateSectionFromLinkedComponent = (section: Section, component: ComponentType) => {
    if (!section.linkedComponentId) return;
    
    const promptWithSection = prompts.find(p => 
      p.sections.some(s => s.id === section.id)
    );
    
    if (!promptWithSection) return;
    
    updateSection(promptWithSection.id, section.id, {
      content: component.content,
      originalContent: component.content,
      type: component.componentType,
      name: component.name,
    });
  };

  // Get compiled prompt text from a prompt
  const getCompiledPromptText = (promptId: number): string => {
    const prompt = prompts.find(p => p.id === promptId);
    if (!prompt) return "";
    
    if (settings.markdownPromptingEnabled) {
      return prompt.sections.map(section => {
        return `# ${section.type.charAt(0).toUpperCase() + section.type.slice(1)}: ${section.name}\n\n${section.content}`;
      }).join('\n\n');
    } else {
      return prompt.sections.map(section => section.content).join('\n\n');
    }
  };

  // Add a new section to a prompt, configured for immediate header editing
  const addNewSectionForEditing = (promptId: number) => {
    const newSectionId = Date.now();
    const newSection: Section = {
      id: newSectionId,
      name: "", // Empty name, as per old behavior
      content: "", // Empty content, as per old behavior
      type: "instruction", // Hardcoded, as per old behavior
      open: true,
      dirty: false,
      editingHeader: true, // Signal SectionHeader to start in edit mode
      editingHeaderTempName: "", // As per old behavior
      editingHeaderTempType: "instruction", // As per old behavior
    };

    setPrompts(prevPrompts =>
      prevPrompts.map(prompt => {
        if (prompt.id !== promptId) return prompt;
        return {
          ...prompt,
          sections: [...prompt.sections, newSection],
        };
      })
    );
    setNewlyAddedSectionIdForFocus(newSectionId); // Set for PromptEditor to focus
  };

  // Clear the newly added section ID focus state
  const clearNewlyAddedSectionIdForFocus = () => {
    setNewlyAddedSectionIdForFocus(null);
  };

  // Update a prompt's name
  const updatePromptName = (promptId: number, newName: string) => {
    setPrompts(prevPrompts =>
      prevPrompts.map(prompt =>
        prompt.id === promptId ? { ...prompt, name: newName } : prompt
      )
    );
  };

  return (
    <PromptContext.Provider
      value={{
        prompts,
        setPrompts,
        activePromptId,
        setActivePromptId,
        addPrompt,
        duplicatePrompt, // Exposed this function
        addSectionToPrompt,
        updateSection,
        deleteSection,
        moveSectionUp,
        moveSectionDown,
        moveSectionToIndex, // Exposed
        toggleSectionOpen,
        deletePrompt,
        updateSectionFromLinkedComponent,
        getCompiledPromptText,
        addSectionAtIndex,
        addNewSectionForEditing, // Exposed
        newlyAddedSectionIdForFocus, // Exposed
        clearNewlyAddedSectionIdForFocus, // Exposed
        updatePromptName, // Exposed
      }}
    >
      {children}
    </PromptContext.Provider>
  );
};