/**
 * App component
 * Main application entry point that orchestrates contexts and components
 */

import React, { useEffect } from "react";
import { AppProvider, useAppContext } from "../../contexts/AppContext";
import { TreeProvider, useTreeContext } from "../../contexts/TreeContext";
import { PromptProvider } from "../../contexts/PromptContext";
import Sidebar from "../Sidebar";
import PromptEditor from "../PromptEditor";
import ComponentModal from "../Modal/ComponentModal";
import SettingsModal from "../Modal/SettingsModal";
import CommunityComponentsModal from "../Modal/CommunityComponentsModal"; // Added
import "./App.scss";

// Inner App component that uses the contexts
const AppContent: React.FC = () => {
  const { settings, setSettingsModalOpen } = useAppContext();
  const { handleNodeDrop } = useTreeContext();

  // Set up event listeners for drag and drop operations between tree and sections
  useEffect(() => {
    const handleNodeDropped = (e: CustomEvent) => {
      if (e.detail && e.detail.draggedNodeId && e.detail.targetNodeId) {
        handleNodeDrop(e.detail.draggedNodeId, e.detail.targetNodeId);
      }
    };

    // Listen for custom node-dropped event
    window.addEventListener('node-dropped' as any, handleNodeDropped as EventListener);

    return () => {
      window.removeEventListener('node-dropped' as any, handleNodeDropped as EventListener);
    };
  }, [handleNodeDrop]);

  // Apply theme from settings
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  return (
    <main>
      <Sidebar openSettings={() => setSettingsModalOpen(true)} />
      <PromptEditor />
      <ComponentModal />
      <SettingsModal />
      <CommunityComponentsModal /> {/* Added */}
    </main>
  );
};

// Root App component with context providers
const App: React.FC = () => {
  return (
    <AppProvider>
      <TreeProvider>
        <PromptProvider>
          <AppContent />
        </PromptProvider>
      </TreeProvider>
    </AppProvider>
  );
};

export default App;