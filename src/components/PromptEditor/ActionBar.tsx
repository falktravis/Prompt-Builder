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
      <button
        className="copy-btn"
        onClick={copyPrompt}
        title="Copy Prompt"
      >
        <ContentCopyIcon />
        <span>Copy Prompt</span>
      </button>

      <button
        className="new-section-btn" // Added class for styling
        onClick={handleAddNewSection}
        title="Add New Section"
      >
        <AddIcon /> {/* Optional: Icon for the button */}
        <span>New Section</span>
      </button>
      
      <div className="format-indicator">
        {markdownEnabled ? "Markdown Format Enabled" : "Plain Text Format"}
      </div>
    </div>
  );
};

export default ActionBar;