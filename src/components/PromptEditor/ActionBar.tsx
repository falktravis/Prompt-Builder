/**
 * ActionBar component
 * Copy buttons and actions for prompt output
 */

import React from "react";
import { usePromptContext } from "../../contexts/PromptContext";
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AddIcon from '@mui/icons-material/Add'; // Import AddIcon

interface ActionBarProps {
  activePromptId: number | null;
  systemPrompt: string;
  markdownEnabled: boolean;
}

const ActionBar: React.FC<ActionBarProps> = ({ 
  activePromptId, 
  systemPrompt,
  markdownEnabled 
}) => {
  const { getCompiledPromptText, addNewSectionForEditing } = usePromptContext(); // Added addNewSectionForEditing

  // Copy prompt to clipboard
  const copyPrompt = () => {
    if (!activePromptId) return;
    
    let promptText = getCompiledPromptText(activePromptId);

    if (markdownEnabled && systemPrompt) {
      // If markdown is enabled, format the prompt text accordingly
      promptText = systemPrompt + "\n\n" + promptText;
    }

    navigator.clipboard.writeText(promptText);
  };

  // Handle adding a new section
  const handleAddNewSection = () => {
    if (activePromptId) {
      addNewSectionForEditing(activePromptId);
    }
  };

  return (
    <div className="action-bar">
      <div className="action-bar-buttons-group">
        <button
          className="copy-btn"
          onClick={copyPrompt}
          title="Copy Prompt"
        >
          <ContentCopyIcon />
          <span>Copy Prompt</span>
        </button>

        <button
          className="new-section-btn"
          onClick={handleAddNewSection}
          title="Add New Section"
        >
          <AddIcon />
          <span>New Section</span>
        </button>
      </div>
      <div className="deprecation-message">
        <p>This version of Prompt Builder has been <strong>deprecated</strong>. Please save your components and migrate to the (completely free) centralized version on our website.</p>
        <a href="https://github.com/falktravis/Prompt-Builder/discussions/5" target="_blank" rel="noopener noreferrer" id="more-info">More Info</a>
        <a href="https://buildprompts.ai" target="_blank" rel="noopener noreferrer" id="new-version">New Version</a>
      </div>
    </div>
  );
};

export default ActionBar;