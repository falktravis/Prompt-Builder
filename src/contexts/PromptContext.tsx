/**
 * PromptContext
 * Manages prompts and their sections
 */

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from "react";
import { v4 as uuidv4 } from 'uuid';
import { Prompt, Section, ComponentType, Settings } from "@/types";
import { useAppContext } from './AppContext';
import { debounce } from "@/utils/debounce";

// Context type definition
type PromptContextType = {
  prompts: Prompt[];
  setPrompts: React.Dispatch<React.SetStateAction<Prompt[]>>;
  activePromptId: string | null;
  setActivePromptId: React.Dispatch<React.SetStateAction<string | null>>;
  addPrompt: (name?: string) => Promise<Prompt>;
  duplicatePrompt: (promptIdToDuplicate: string) => Promise<Prompt | null>;
  addSectionToPrompt: (promptId: string, type?: Settings['defaultSectionType']) => string | undefined;
  updateSection: (promptId: string, sectionId: string, updates: Partial<Omit<Section, "id">>) => void;
  deleteSection: (promptId: string, sectionId: string) => void;
  moveSectionUp: (promptId: string, sectionId: string) => void;
  moveSectionDown: (promptId: string, sectionId: string) => void;
  moveSectionToIndex: (promptId: string, sectionId: string, newIndex: number) => void;
  toggleSectionOpen: (promptId: string, sectionId: string) => void;
  deletePrompt: (promptId: string) => void;
  updateSectionFromLinkedComponent: (promptId: string, sectionId: string, component: ComponentType) => void;
  getCompiledPromptText: (promptId: string) => string;
  addSectionAtIndex: (promptId: string, section: Section, index: number) => void;
  addSectionFromComponent: (promptId: string, componentData: ComponentType, index: number) => void;
  addNewSectionForEditing: (promptId: string) => void;
  newlyAddedSectionIdForFocus: string | null;
  clearNewlyAddedSectionIdForFocus: () => void;
  updatePromptName: (promptId: string, newName: string) => void;
  isPromptsLoading: boolean;
};

// Create context with default values
const PromptContext = createContext<PromptContextType>({
  prompts: [],
  setPrompts: () => {},
  activePromptId: null,
  setActivePromptId: () => {},
  addPrompt: () => Promise.resolve({ id: uuidv4(), num: 0, name: "", sections: [] }),
  duplicatePrompt: () => Promise.resolve(null),
  addSectionToPrompt: () => undefined,
  updateSection: () => {},
  deleteSection: () => {},
  moveSectionUp: () => {},
  moveSectionDown: () => {},
  moveSectionToIndex: () => {},
  toggleSectionOpen: () => {},
  deletePrompt: () => {},
  updateSectionFromLinkedComponent: () => {},
  getCompiledPromptText: () => "",
  addSectionAtIndex: () => {},
  addSectionFromComponent: () => {},
  addNewSectionForEditing: () => {},
  newlyAddedSectionIdForFocus: null,
  clearNewlyAddedSectionIdForFocus: () => {},
  updatePromptName: () => {},
  isPromptsLoading: true, // Default to true
});

// Hook for using this context
export const usePromptContext = () => useContext(PromptContext);

// Provider component
type PromptProviderProps = {
  children: ReactNode;
};

export const PromptProvider = ({ children }: PromptProviderProps) => {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [activePromptId, setActivePromptId] = useState<string | null>(null);
  const [newlyAddedSectionIdForFocus, setNewlyAddedSectionIdForFocus] = useState<string | null>(null);
  const { settings, appInitialized } = useAppContext();
  const [isPromptsLoading, setIsPromptsLoading] = useState<boolean>(true);

  const promptsRef = React.useRef(prompts);
  const activePromptIdRef = React.useRef(activePromptId);
  const activePromptIdChangeIsFromAddPrompt = useRef(false);

  useEffect(() => {
    promptsRef.current = prompts;
  }, [prompts]);

  useEffect(() => {
    activePromptIdRef.current = activePromptId;
  }, [activePromptId]);

  // Load prompts and activePromptId from API on mount and when appInitialized changes
  useEffect(() => {
    if (appInitialized && settings) {
      const fetchInitialData = async () => {
        setIsPromptsLoading(true);
        try {
          const promptsResponse = await fetch('/api/prompts');
          if (!promptsResponse.ok) throw new Error('Failed to fetch prompts');
          const fetchedPrompts = await promptsResponse.json();
          setPrompts(fetchedPrompts);

          // Assuming active_prompt_id is stored in a general app-config or user-preferences
          // This endpoint might need to be /api/user-preferences/activePromptId or similar
          const activeIdResponse = await fetch('/api/app-config/activePromptId');
          if (!activeIdResponse.ok) {
            // If not found or error, don't throw, just proceed without an active ID or set to first.
            console.warn('Failed to fetch active prompt ID or none set.');
            setActivePromptId(fetchedPrompts.length > 0 ? fetchedPrompts[0].id : null);
          } else {
            const activeIdData = await activeIdResponse.json();
            setActivePromptId(activeIdData.activePromptId);
          }

        } catch (error) {
          console.error("Error loading initial data:", error);
          setPrompts([]);
          setActivePromptId(null);
        } finally {
          setIsPromptsLoading(false);
        }
      };
      fetchInitialData();
    }
  }, [appInitialized, settings]);

  // Effect to set first prompt as active if activePromptId is null and prompts are loaded
  useEffect(() => {
    if (!isPromptsLoading && prompts.length > 0 && !prompts.find(p => p.id === activePromptId)) {
        setActivePromptId(prompts[0].id);
    } else if (!isPromptsLoading && prompts.length === 0) {
        setActivePromptId(null);
    }
  }, [prompts, activePromptId, isPromptsLoading]);

  const saveActivePromptIdToApi = useCallback(debounce(async (currentActivePromptId: string | null) => {
    if (!appInitialized || activePromptIdChangeIsFromAddPrompt.current) return;
    try {
      // This endpoint should match where active_prompt_id is stored (e.g., user_preferences or app_config)
      await fetch('/api/app-config/activePromptId', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activePromptId: currentActivePromptId }),
      });
    } catch (error) {
      console.error('Failed to save active prompt ID:', error);
    }
  }, 1000), [appInitialized]);

  useEffect(() => {
    if (appInitialized && !isPromptsLoading) {
        saveActivePromptIdToApi(activePromptId);
    }
  }, [activePromptId, appInitialized, isPromptsLoading, saveActivePromptIdToApi]);


  const updatePromptInApi = useCallback(debounce(async (promptToUpdate: Prompt) => {
    if (!appInitialized) return;
    try {
      // Ensure sections sent to API are clean if necessary (e.g. no UI-only state like 'editingHeader')
      // For now, sending the whole prompt object as is.
      const { sections, ...restOfPrompt } = promptToUpdate;
      const sectionsForApi = sections.map(({ editingHeader, editingHeaderTempName, editingHeaderTempType, ...section }) => section);

      await fetch(`/api/prompts/${promptToUpdate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...restOfPrompt, sections: sectionsForApi }),
      });
    } catch (error) {
      console.error(`Failed to update prompt ${promptToUpdate.id}:`, error);
    }
  }, 1000), [appInitialized]);

  const addPrompt = useCallback(async (name?: string): Promise<Prompt> => {
    activePromptIdChangeIsFromAddPrompt.current = true;
    const tempClientId = uuidv4();

    const newPromptName = name || settings.defaultPromptName || `Prompt ${promptsRef.current.length + 1}`;
    const initialSections: Section[] = settings.defaultSectionType
      ? [{
          id: uuidv4(),
          name: 'Section 1',
          content: '',
          type: settings.defaultSectionType,
          open: true,
          dirty: false,
        }]
      : [];

    // Data for the API - ensure it matches what the backend expects for a new prompt.
    // 'open' and 'dirty' are primarily UI concerns but might be stored if desired.
    // For now, let's assume the backend can handle the full Section object or ignore extra fields.
    const promptDataForApi = {
      name: newPromptName,
      sections: initialSections, // Sending full initial sections
      num: promptsRef.current.length + 1, // Or other logic for 'num'
    };

    const tempPrompt: Prompt = {
      id: tempClientId,
      name: newPromptName,
      sections: initialSections,
      num: promptDataForApi.num,
    };

    setPrompts(prevPrompts => [...prevPrompts, tempPrompt]);
    setActivePromptId(tempPrompt.id);

    try {
      const response = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(promptDataForApi),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        console.error('Failed to create prompt:', response.status, errorData);
        setPrompts(prevPrompts => prevPrompts.filter(p => p.id !== tempClientId));
        if (activePromptIdRef.current === tempClientId) {
          const remainingPrompts = promptsRef.current.filter(p => p.id !== tempClientId);
          setActivePromptId(remainingPrompts.length > 0 ? remainingPrompts[0].id : null);
        }
        throw new Error(`Failed to create prompt: ${errorData.message || response.statusText}`);
      }

      const createdPrompt: Prompt = await response.json();

      setPrompts(prevPrompts =>
        prevPrompts.map(p => (p.id === tempClientId ? createdPrompt : p))
      );
      setActivePromptId(createdPrompt.id);

      return createdPrompt;
    } catch (error) {
      console.error("Error in addPrompt:", error);
      setPrompts(prevPrompts => prevPrompts.filter(p => p.id !== tempClientId));
      if (activePromptIdRef.current === tempClientId) {
        const remainingPrompts = promptsRef.current.filter(p => p.id !== tempClientId);
        setActivePromptId(remainingPrompts.length > 0 ? remainingPrompts[0].id : null);
      }
      throw error;
    } finally {
      activePromptIdChangeIsFromAddPrompt.current = false;
    }
  }, [settings.defaultPromptName, settings.defaultSectionType, setPrompts, setActivePromptId, promptsRef, activePromptIdRef, appInitialized /* updatePromptInApi removed as it's not directly used here */]);

  const duplicatePrompt = useCallback(async (promptIdToDuplicate: string): Promise<Prompt | null> => {
    console.warn("duplicatePrompt is a placeholder and not fully implemented.");
    const promptToDuplicate = promptsRef.current.find(p => p.id === promptIdToDuplicate);
    if (!promptToDuplicate) {
      console.error("Prompt to duplicate not found");
      return null;
    }

    // Create a deep copy of sections with new IDs
    const newSections: Section[] = promptToDuplicate.sections.map(section => ({
      ...section,
      id: uuidv4(),
      // Reset UI-specific states if necessary
      dirty: false,
      editingHeader: false,
      editingHeaderTempName: undefined,
      editingHeaderTempType: undefined,
    }));

    const newPromptName = `${promptToDuplicate.name} (Copy)`;
    
    // Use a structure similar to addPrompt for API interaction
    activePromptIdChangeIsFromAddPrompt.current = true; // Manage flag if it becomes active immediately
    const tempClientId = uuidv4();

    const promptDataForApi = {
      name: newPromptName,
      sections: newSections, // Send new sections
      num: promptsRef.current.length + 1, // Or determine num differently
    };

    const tempPrompt: Prompt = {
      id: tempClientId,
      name: newPromptName,
      sections: newSections,
      num: promptDataForApi.num,
    };
    
    setPrompts(prevPrompts => [...prevPrompts, tempPrompt]);
    setActivePromptId(tempPrompt.id); // Optionally make the new duplicate active

    try {
      const response = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(promptDataForApi),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        console.error('Failed to create duplicated prompt:', errorData);
        // Revert optimistic updates for duplicate
        setPrompts(prevPrompts => prevPrompts.filter(p => p.id !== tempClientId));
        // Potentially revert activePromptId if it was set to tempClientId
        throw new Error(`Failed to create duplicated prompt: ${errorData.message || response.statusText}`);
      }
      const createdPrompt: Prompt = await response.json();
      setPrompts(prevPrompts => prevPrompts.map(p => (p.id === tempClientId ? createdPrompt : p)));
      setActivePromptId(createdPrompt.id); // Ensure active ID is the server one
      return createdPrompt;
    } catch (error) {
      console.error("Error duplicating prompt:", error);
      // Revert optimistic updates if not already done
       setPrompts(prevPrompts => prevPrompts.filter(p => p.id !== tempClientId));
      // Potentially revert activePromptId
      throw error;
    } finally {
      activePromptIdChangeIsFromAddPrompt.current = false;
    }
  }, [setPrompts, setActivePromptId, promptsRef, activePromptIdRef, appInitialized, settings.defaultPromptName]); // Added settings for potential default naming if needed

  const deletePrompt = useCallback(async (promptId: string) => {
    setPrompts(prevPrompts => prevPrompts.filter(p => p.id !== promptId));
    if (activePromptIdRef.current === promptId) {
      const newActiveId = promptsRef.current.length > 0 ? promptsRef.current[0].id : null;
      setActivePromptId(newActiveId);
      // No need to call saveActivePromptIdToApi here if useEffect for activePromptId handles it
    }
    try {
      await fetch(`/api/prompts/${promptId}`, { method: 'DELETE' });
    } catch (error) {
      console.error(`Failed to delete prompt ${promptId}:`, error);
      // Potentially re-add prompt to UI or notify user
    }
  }, [setPrompts, setActivePromptId, promptsRef, activePromptIdRef]);

  const updatePromptName = useCallback((promptId: string, newName: string) => {
    setPrompts(prevPrompts =>
      prevPrompts.map(p => (p.id === promptId ? { ...p, name: newName } : p))
    );
    const promptToUpdate = promptsRef.current.find(p => p.id === promptId);
    if (promptToUpdate) {
      updatePromptInApi({ ...promptToUpdate, name: newName });
    }
  }, [setPrompts, promptsRef, updatePromptInApi]);

  const addSectionToPrompt = useCallback((promptId: string, type?: Settings['defaultSectionType']): string | undefined => {
    const sectionType = type || settings.defaultSectionType || 'instruction';
    const newSection: Section = {
      id: uuidv4(),
      name: 'New Section',
      content: '',
      type: sectionType,
      open: true,
      dirty: false,
    };
    setPrompts(prevPrompts =>
      prevPrompts.map(p =>
        p.id === promptId ? { ...p, sections: [...p.sections, newSection] } : p
      )
    );
    const promptToUpdate = promptsRef.current.find(p => p.id === promptId);
    if (promptToUpdate) {
      updatePromptInApi({ ...promptToUpdate, sections: [...promptToUpdate.sections, newSection] });
    }
    return newSection.id;
  }, [setPrompts, promptsRef, updatePromptInApi, settings.defaultSectionType]);

  const updateSection = useCallback((promptId: string, sectionId: string, updates: Partial<Omit<Section, "id">>) => {
    setPrompts(prevPrompts =>
      prevPrompts.map(p =>
        p.id === promptId
          ? {
              ...p,
              sections: p.sections.map(s =>
                s.id === sectionId ? { ...s, ...updates, dirty: true } : s
              ),
            }
          : p
      )
    );
    // Debounced update to API
    const promptToUpdate = promptsRef.current.find(p => p.id === promptId);
    if (promptToUpdate) {
      const updatedSections = promptToUpdate.sections.map(s => 
        s.id === sectionId ? { ...s, ...updates, dirty: true } : s
      );
      updatePromptInApi({ ...promptToUpdate, sections: updatedSections });
    }
  }, [setPrompts, promptsRef, updatePromptInApi]);

  const deleteSection = useCallback((promptId: string, sectionId: string) => {
    setPrompts(prevPrompts =>
      prevPrompts.map(p =>
        p.id === promptId
          ? { ...p, sections: p.sections.filter(s => s.id !== sectionId) }
          : p
      )
    );
    const promptToUpdate = promptsRef.current.find(p => p.id === promptId);
    if (promptToUpdate) {
      const updatedSections = promptToUpdate.sections.filter(s => s.id !== sectionId);
      updatePromptInApi({ ...promptToUpdate, sections: updatedSections });
    }
  }, [setPrompts, promptsRef, updatePromptInApi]);

  const moveSection = useCallback((promptId: string, sectionId: string, direction: 'up' | 'down') => {
    setPrompts(prevPrompts =>
      prevPrompts.map(p => {
        if (p.id === promptId) {
          const index = p.sections.findIndex(s => s.id === sectionId);
          if (index === -1) return p;
          const newIndex = direction === 'up' ? index - 1 : index + 1;
          if (newIndex < 0 || newIndex >= p.sections.length) return p;
          const newSections = [...p.sections];
          const [movedSection] = newSections.splice(index, 1);
          newSections.splice(newIndex, 0, movedSection);
          return { ...p, sections: newSections };
        }
        return p;
      })
    );
    const promptToUpdate = promptsRef.current.find(p => p.id === promptId);
    if (promptToUpdate) {
      // Logic to reorder sections for API update (already done in local state by this point)
      updatePromptInApi(promptToUpdate); 
    }
  }, [setPrompts, promptsRef, updatePromptInApi]);

  const moveSectionUp = useCallback((promptId: string, sectionId: string) => {
    moveSection(promptId, sectionId, 'up');
  }, [moveSection]);

  const moveSectionDown = useCallback((promptId: string, sectionId: string) => {
    moveSection(promptId, sectionId, 'down');
  }, [moveSection]);

  const moveSectionToIndex = useCallback((promptId: string, sectionId: string, newIndex: number) => {
    setPrompts(prevPrompts =>
      prevPrompts.map(p => {
        if (p.id === promptId) {
          const oldIndex = p.sections.findIndex(s => s.id === sectionId);
          if (oldIndex === -1) return p;
          const newSections = [...p.sections];
          const [movedSection] = newSections.splice(oldIndex, 1);
          newSections.splice(newIndex, 0, movedSection);
          return { ...p, sections: newSections };
        }
        return p;
      })
    );
    const promptToUpdate = promptsRef.current.find(p => p.id === promptId);
    if (promptToUpdate) {
      updatePromptInApi(promptToUpdate);
    }
  }, [setPrompts, promptsRef, updatePromptInApi]);

  const toggleSectionOpen = useCallback((promptId: string, sectionId: string) => {
    setPrompts(prevPrompts =>
      prevPrompts.map(p =>
        p.id === promptId
          ? {
              ...p,
              sections: p.sections.map(s =>
                s.id === sectionId ? { ...s, open: !s.open } : s
              ),
            }
          : p
      )
    );
    // No API update for section open/close state as it's UI-only
  }, [setPrompts]);

  const updateSectionFromLinkedComponent = useCallback((promptId: string, sectionId: string, component: ComponentType) => {
    setPrompts(prevPrompts =>
      prevPrompts.map(p =>
        p.id === promptId
          ? {
              ...p,
              sections: p.sections.map(s =>
                s.id === sectionId
                  ? {
                      ...s,
                      content: component.content || '',
                      type: component.componentType || s.type, // Corrected: componentType
                      linkedComponentId: component.id, // Set linkedComponentId
                      // isLinked removed as it's not in Section type
                      name: component.name, // Typically, you'd also update the section name
                      dirty: true,
                    }
                  : s
              ),
            }
          : p
      )
    );
    const promptToUpdate = promptsRef.current.find(p => p.id === promptId);
    if (promptToUpdate) {
      // Create a new sections array for the update to ensure reactivity and correct data for API
      const updatedSections = promptToUpdate.sections.map(s =>
        s.id === sectionId ? {
          ...s,
          content: component.content || '',
          type: component.componentType || s.type,
          linkedComponentId: component.id,
          name: component.name,
          dirty: true,
        } : s
      );
      updatePromptInApi({ ...promptToUpdate, sections: updatedSections });
    }
  }, [setPrompts, promptsRef, updatePromptInApi]);

  const getCompiledPromptText = useCallback((promptId: string): string => {
    const prompt = promptsRef.current.find(p => p.id === promptId);
    if (!prompt) return "";
    // Simple compilation for now, can be expanded
    return prompt.sections.map(s => `# ${s.type}: ${s.name}\n${s.content}`).join('\n\n');
  }, [promptsRef]);

  const addSectionAtIndex = useCallback((promptId: string, section: Section, index: number) => {
    setPrompts(prevPrompts =>
      prevPrompts.map(p => {
        if (p.id === promptId) {
          const newSections = [...p.sections];
          newSections.splice(index, 0, section);
          return { ...p, sections: newSections };
        }
        return p;
      })
    );
    const promptToUpdate = promptsRef.current.find(p => p.id === promptId);
    if (promptToUpdate) {
      updatePromptInApi(promptToUpdate);
    }
  }, [setPrompts, promptsRef, updatePromptInApi]);

  const addSectionFromComponent = useCallback((promptId: string, componentData: ComponentType, index: number) => {
    const newSection: Section = {
      id: uuidv4(),
      name: componentData.name,
      content: componentData.content || '',
      type: componentData.componentType || 'instruction', // Corrected: componentType
      open: true,
      dirty: false,
      linkedComponentId: componentData.id, // Set linkedComponentId
      // isLinked removed
    };
    addSectionAtIndex(promptId, newSection, index);
  }, [addSectionAtIndex]);

  const addNewSectionForEditing = useCallback((promptId: string) => {
    const newSectionId = addSectionToPrompt(promptId);
    if (newSectionId) {
      setNewlyAddedSectionIdForFocus(newSectionId);
    }
  }, [addSectionToPrompt, setNewlyAddedSectionIdForFocus]);

  const clearNewlyAddedSectionIdForFocus = useCallback(() => {
    setNewlyAddedSectionIdForFocus(null);
  }, [setNewlyAddedSectionIdForFocus]);


  return (
    <PromptContext.Provider
      value={{
        prompts,
        setPrompts,
        activePromptId,
        setActivePromptId,
        addPrompt,
        duplicatePrompt, // Ensure it's in the value
        addSectionToPrompt,
        updateSection,
        deleteSection,
        moveSectionUp,
        moveSectionDown,
        moveSectionToIndex,
        toggleSectionOpen,
        deletePrompt,
        updateSectionFromLinkedComponent,
        getCompiledPromptText,
        addSectionAtIndex,
        addSectionFromComponent,
        addNewSectionForEditing,
        newlyAddedSectionIdForFocus,
        clearNewlyAddedSectionIdForFocus,
        updatePromptName,
        isPromptsLoading,
      }}
    >
      {children}
    </PromptContext.Provider>
  );
};