'use client';

/**
 * ActionBar component
 * Copy buttons and actions for prompt output
 */

import React from "react";
import { usePromptContext } from "@/contexts/PromptContext";
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AddIcon from '@mui/icons-material/Add';

interface ActionBarProps {
  activePromptId: string | null; // Changed from number
  systemPrompt: string;
  markdownEnabled: boolean;
}

const ActionBar: React.FC<ActionBarProps> = ({ 
  activePromptId, 
  systemPrompt,
  markdownEnabled 
}) => {
  const { getCompiledPromptText, addNewSectionForEditing } = usePromptContext();

  // Copy prompt to clipboard
  const copyPrompt = () => {
    if (!activePromptId) return;
    
    let promptText = getCompiledPromptText(activePromptId); // activePromptId is now string

    if (markdownEnabled && systemPrompt) {
      // If markdown is enabled, format the prompt text accordingly
      promptText = systemPrompt + "\\n\\n" + promptText;
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
    <div className="action-bar-container"> {/* Added a container div */}
      <div className="action-bar-buttons"> {/* Group buttons for styling if needed */}
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
    </div>
  );
};

export default ActionBar;