/**
 * Type definitions for Prompt Builder
 */

// Component types for the sidebar tree
export type ComponentType = {
  id: string; // Changed from number
  name: string;
  type: "component";
  content: string;
  componentType: "instruction" | "role" | "context" | "format" | "style";
};

// Folder type for the sidebar tree
export type FolderType = {
  id: string; // Changed from number
  name: string;
  type: "folder";
  children: (FolderType | ComponentType)[];
  expanded: boolean; // New property
};

// Union type for items in the tree
export type TreeNode = FolderType | ComponentType;

// Section type for prompt building
export type Section = {
  id: string; // Changed from number
  name: string;
  content: string;
  type: "instruction" | "role" | "context" | "format" | "style";
  linkedComponentId?: string; // Changed from number to string
  originalContent?: string;
  open: boolean;
  dirty: boolean;
  editingHeader?: boolean;
  editingHeaderTempName?: string;
  editingHeaderTempType?: "instruction" | "role" | "context" | "format" | "style";
};

// Prompt type containing sections
export type Prompt = {
  id: string; // Changed from number
  num: number;
  name: string;
  sections: Section[];
};

// Settings type for application configuration
export type Settings = {
  autoSave: boolean;
  defaultPromptName: string;
  defaultSectionType: "instruction" | "role" | "context" | "format" | "style";
  theme: "dark" | "light";
  markdownPromptingEnabled: boolean;
  systemPrompt: string;
};