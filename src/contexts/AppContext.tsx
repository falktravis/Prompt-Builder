/**
 * AppContext
 * Manages global application state and settings
 */

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { Settings } from "@/types";

const LOCAL_STORAGE_SETTINGS_KEY = 'promptBuilderSettings'; // May still be used for temporary or non-critical settings

// Default settings
const DEFAULT_SETTINGS: Settings = {
  autoSave: true,
  defaultPromptName: "New Prompt",
  defaultSectionType: "instruction",
  theme: "dark",
  markdownPromptingEnabled: false,
  systemPrompt: "# Prompt Structure/System Guide\n\nThis document outlines a structured request format for the following prompt. Each section of the prompt is clearly marked with a markdown heading that indicates both the section type and title.\n\n## Section Types\n\n### **Role** \nDefines the expertise, perspective, or character you will adopt. You will embody this role completely while processing and responding to the prompt.\n\n### **Context** \nProvides essential background information and situational details needed for you to understand the task. All context is critical for generating an appropriate response.\n\n### **Instructions** \nSpecifies the exact deliverables and actions required. This section defines success criteria and should be followed precisely.\n\n### **Style** \nEstablishes guidelines for your style in formulating a response. Your response should consistently adhere to these stylistic guidelines.\n\n### **Format** \nDetails the structural requirements for the output, including organization, layout, and presentation specifications.\n\n## Implementation\n\n- Each section begins with a level-1 markdown heading: `# [Type]: [Title]`\n- You will thoroughly process all sections before producing a response\n- You must prioritize following instructions precisely while maintaining the specified role, context awareness, style, and format\n\nWhat follows is the prompt using the outlined system and formatting.",
};

// Context type definition
type AppContextType = {
  appName: string;
  appVersion: string;
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
  isSettingsModalOpen: boolean;
  setSettingsModalOpen: (open: boolean) => void;
  isCommunityModalOpen: boolean;
  setCommunityModalOpen: (open: boolean) => void;
  appInitialized: boolean;
};

// Create context with default values
const AppContext = createContext<AppContextType>({
  appName: "Prompt Builder",
  appVersion: "1.0.0",
  settings: DEFAULT_SETTINGS,
  updateSettings: () => {},
  isSettingsModalOpen: false,
  setSettingsModalOpen: () => {},
  isCommunityModalOpen: false,
  setCommunityModalOpen: () => {},
  appInitialized: false,
});

// Hook for using this context
export const useAppContext = () => useContext(AppContext);

// Provider component
type AppProviderProps = {
  children: ReactNode;
};

export const AppProvider = ({ children }: AppProviderProps) => {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
  const [isCommunityModalOpen, setCommunityModalOpen] = useState(false);
  const [appInitialized, setAppInitialized] = useState(false);

  // Load settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      setAppInitialized(false);
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const data = await response.json();
          if (data.settings) {
            setSettings(data.settings);
          } else {
            // No settings in DB, use defaults and save them
            setSettings(DEFAULT_SETTINGS);
            await fetch('/api/settings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ settings: DEFAULT_SETTINGS, activePromptId: null }),
            });
          }
        } else {
          console.error('Failed to load settings from API, using defaults.');
          setSettings(DEFAULT_SETTINGS);
          // Optionally try to save defaults if API is reachable but settings are missing
          await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ settings: DEFAULT_SETTINGS, activePromptId: null }),
          });
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        setSettings(DEFAULT_SETTINGS); // Fallback to defaults on any error
      }
      setAppInitialized(true);
    };

    loadSettings();
  }, []); // Run once on mount

  // Save settings when they change
  useEffect(() => {
    if (!appInitialized) return; // Don't save during initial load or if not initialized

    const saveSettings = async () => {
      try {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ settings }),
        });
      } catch (error) {
        console.error('Error saving settings:', error);
      }
    };

    // Debounce saving to avoid rapid writes
    const debounceSave = setTimeout(saveSettings, 1000);
    return () => clearTimeout(debounceSave);

  }, [settings, appInitialized]);

  // Function to update settings
  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings((prevSettings) => ({
      ...prevSettings,
      ...newSettings,
    }));
  };

  return (
    <AppContext.Provider
      value={{
        appName: "Prompt Builder",
        appVersion: "1.0.0",
        settings,
        updateSettings,
        isSettingsModalOpen,
        setSettingsModalOpen,
        isCommunityModalOpen,
        setCommunityModalOpen,
        appInitialized,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};