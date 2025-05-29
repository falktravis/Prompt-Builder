"use client";

/**
 * SettingsModal
 * Modal for managing application settings
 */

import React, { useState, useEffect } from "react";
import ModalBase from "./ModalBase";
import { useAppContext } from "../../contexts/AppContext";
import Switch from "@mui/material/Switch";

const SettingsModal: React.FC = () => {
  const { 
    settings,
    updateSettings,
    isSettingsModalOpen,
    setSettingsModalOpen
  } = useAppContext();

  const [formData, setFormData] = useState({
    autoSave: true,
    defaultPromptName: "",
    defaultSectionType: "instruction" as "instruction" | "role" | "context" | "format" | "style",
    theme: "dark" as "dark" | "light",
    markdownPromptingEnabled: false,
    systemPrompt: ""
  });

  // Update form data when settings change or modal opens
  useEffect(() => {
    if (isSettingsModalOpen) {
      setFormData({ ...settings });
    }
  }, [settings, isSettingsModalOpen]);

  // Reset system prompt to default
  const handleResetSystemPrompt = () => {
    setFormData(prev => ({
      ...prev,
      systemPrompt: "# Prompt Structure/System Guide\n\nThis document outlines a structured request format for the following prompt. Each section of the prompt is clearly marked with a markdown heading that indicates both the section type and title.\n\n## Section Types\n\n### **Role** \nDefines the expertise, perspective, or character you will adopt. You will embody this role completely while processing and responding to the prompt.\n\n### **Context** \nProvides essential background information and situational details needed for you to understand the task. All context is critical for generating an appropriate response.\n\n### **Instructions** \nSpecifies the exact deliverables and actions required. This section defines success criteria and should be followed precisely.\n\n### **Style** \nEstablishes guidelines for your style in formulating a response. Your response should consistently adhere to these stylistic guidelines.\n\n### **Format** \nDetails the structural requirements for the output, including organization, layout, and presentation specifications.\n\n## Implementation\n\n- Each section begins with a level-1 markdown heading: `# [Type]: [Title]`\n- You will thoroughly process all sections before producing a response\n- You must prioritize following instructions precisely while maintaining the specified role, context awareness, style, and format\n\nWhat follows is the prompt using the outlined system and formatting."
    }));
  };

  // Submit handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formData);
    setSettingsModalOpen(false);
  };

  return (
    <ModalBase
      isOpen={isSettingsModalOpen}
      onClose={() => setSettingsModalOpen(false)}
      title="Settings"
      className="settings-modal"
    >
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <h4>Markdown Component Prompting System</h4>
          <p>Systematic method for structuring sectioned prompts for increased understanding. See a more in depth explanation <a href="https://github.com/falktravis/Prompt-Builder/discussions/1">here</a>.</p>
          <label className="settings-toggle">
            <span>Markdown Component Prompting System</span>
            <Switch
              checked={formData.markdownPromptingEnabled}
              onChange={(e) => setFormData({ ...formData, markdownPromptingEnabled: e.target.checked })}
              color="primary"
            />
          </label>
        </div>

        <div className="form-group">
          <div className="system-prompt-header">
            <label htmlFor="systemPrompt">System Prompt:</label>
            <button className="reset-default-btn" type="button" onClick={handleResetSystemPrompt}>Reset to Default</button>
          </div>
          <textarea
            id="systemPrompt"
            name="systemPrompt"
            value={formData.systemPrompt}
            onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
            rows={5}
            placeholder="Optional system prompt to include..."
          />
        </div>

        <div className="form-actions">
          <button type="button" onClick={() => setSettingsModalOpen(false)}>Cancel</button>
          <button type="submit" className="primary">Save Changes</button>
        </div>
      </form>
    </ModalBase>
  );
};

export default SettingsModal;