'use client';

/**
 * SectionHeader component
 * Header for an individual prompt section
 */

import React, { useState, useRef, useEffect } from "react";
import { Section } from "@/types";
import { usePromptContext } from "@/contexts/PromptContext";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CloseIcon from '@mui/icons-material/Close';

interface SectionHeaderProps {
  section: Section;
  promptId: string;
  onToggle: () => void;
  onDelete: () => void;
  nameInputRefCallback?: (el: HTMLInputElement | null) => void; // Added for focusing
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ 
  section, 
  promptId, 
  onToggle, 
  onDelete, 
  nameInputRefCallback, // Added for focusing
}) => {
  const { updateSection } = usePromptContext();
  const [isEditing, setIsEditing] = useState(section.editingHeader || false); // Initialize with section.editingHeader
  const [editName, setEditName] = useState(section.name);
  const [editType, setEditType] = useState(section.type);
  const nameInputRef = useRef<HTMLInputElement>(null); // Ref for the name input
  const editZoneRef = useRef<HTMLDivElement>(null); // Ref for the section-edit div
  const headerInfoRef = useRef<HTMLDivElement>(null); // Ref for the section-info div

  // Effect to manage the nameInputRef callback
  useEffect(() => {
    if (nameInputRefCallback) {
      nameInputRefCallback(nameInputRef.current);
    }
  }, [nameInputRefCallback, nameInputRef.current]);

  // Effect to handle initial editing state based on section.editingHeader
  useEffect(() => {
    if (section.editingHeader) {
      setIsEditing(true);
      setEditName(section.editingHeaderTempName !== undefined ? section.editingHeaderTempName : section.name);
      setEditType(section.editingHeaderTempType !== undefined ? section.editingHeaderTempType : section.type);
      // Reset the editingHeader flag in the context once editing is initiated
      // Also clear temp names/types
      updateSection(promptId, section.id, { 
        editingHeader: false,
        editingHeaderTempName: undefined,
        editingHeaderTempType: undefined
      });
    }
  }, [section.editingHeader, section.id, promptId, section.name, section.type, updateSection, section.editingHeaderTempName, section.editingHeaderTempType]);
  
  // Effect for dynamic input width adjustment
  useEffect(() => {
    if (isEditing && nameInputRef.current) {
      nameInputRef.current.style.minWidth = '100px'; // Or from SCSS
      nameInputRef.current.style.width = 'auto'; // Reset width to allow shrinkage
      
      // Ensure styles are applied and measurements can be taken
      requestAnimationFrame(() => {
        if (nameInputRef.current) {
          const scrollWidth = nameInputRef.current.scrollWidth;
          nameInputRef.current.style.width = `${scrollWidth}px`;

          if (headerInfoRef.current) {
            const containerWidth = headerInfoRef.current.offsetWidth;
            const maxWidth = containerWidth * 0.7;
            nameInputRef.current.style.maxWidth = `${maxWidth}px`;
          }
        }
      });
    }
  }, [isEditing, editName]);

  // Effect for click outside to save
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (editZoneRef.current && !editZoneRef.current.contains(event.target as Node)) {
        saveEdit();
      }
    };

    if (isEditing) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditing, editName, editType]);

  // Start editing header
  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditName(section.name);
    setEditType(section.type);
  };
  
  // Save header edit
  const saveEdit = () => {
    // Only update if there are actual changes to name or type
    if (editName.trim() !== section.name || editType !== section.type) {
      if (editName.trim()) { // Ensure name is not just whitespace
        updateSection(promptId, section.id, {
          name: editName.trim(),
          type: editType
        });
      } else if (section.name !== "") { // If original name was not empty, allow saving empty name
         updateSection(promptId, section.id, {
          name: "", // Save as empty
          type: editType
        });
      }
    }
    setIsEditing(false);
  };
  
  // Handle key press in edit mode
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      saveEdit();
    } else if (e.key === "Escape") {
      setIsEditing(false);
    }
  };

  // Get section type color class
  const getTypeClass = () => {
    switch (section.type) {
      case "instruction":
        return "instruction-type";
      case "role":
        return "role-type";
      case "context":
        return "context-type";
      case "format":
        return "format-type";
      case "style":
        return "style-type";
      default:
        return "";
    }
  };

  return (
    <div 
      className="section-header"
      onClick={onToggle} 
    >
      <div className="section-info" ref={headerInfoRef}>
        <div className="section-toggle">
          {section.open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </div>
        {isEditing ? (
          <div className="section-edit" ref={editZoneRef} onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              ref={nameInputRef}
            />
            •
            <select
              value={editType}
              onChange={(e) => {setEditType(e.target.value as any)}}
              onClick={(e) => e.stopPropagation()}
            >
              <option value="instruction">Instruction</option>
              <option value="role">Role</option>
              <option value="context">Context</option>
              <option value="format">Format</option>
              <option value="style">Style</option>
            </select>
          </div>
        ) : (
            <div onClick={(e) => {if(section.open){startEdit(e)}}} className={`section-display ${getTypeClass()}`}>
            {section.name} • {section.type.charAt(0).toUpperCase() + section.type.slice(1)}
            </div>
        )}
      </div>

      {!isEditing && (
        <div className="section-actions" onClick={(e) => e.stopPropagation()}>
          <button className="action-btn delete-btn" onClick={onDelete} title="Delete Section">
            <CloseIcon fontSize="small" />
          </button>
        </div>
      )}
    </div>
  );
};

export default SectionHeader;