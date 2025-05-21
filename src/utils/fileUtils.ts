/**
 * File handling utility functions
 * Manages file operations for prompt data import/export
 */

import { FolderType, Prompt } from "../types";

/**
 * Parse loaded JSON data into application data structure
 * @param data Raw JSON data
 * @returns Parsed tree and prompts data
 */
export const parseLoadedData = (data: any): {
  tree: FolderType[];
  prompts: Prompt[];
} => {
  try {
    if (!data) {
      throw new Error("No data provided");
    }

    const { tree, prompts } = data;

    if (!tree || !Array.isArray(tree) || !prompts || !Array.isArray(prompts)) {
      throw new Error("Invalid data format");
    }

    // Validate tree structure
    const isValidTree = tree.every((node: any) => 
      node && typeof node === 'object' && 
      (node.type === 'folder' || node.type === 'component') &&
      typeof node.id === 'number' &&
      typeof node.name === 'string'
    );

    if (!isValidTree) {
      throw new Error("Invalid tree structure");
    }

    // Validate prompts structure
    const isValidPrompts = prompts.every((prompt: any) =>
      prompt && typeof prompt === 'object' &&
      typeof prompt.id === 'number' &&
      typeof prompt.name === 'string' &&
      Array.isArray(prompt.sections)
    );

    if (!isValidPrompts) {
      throw new Error("Invalid prompts structure");
    }

    // Add missing properties to ensure backward compatibility
    const processedPrompts = prompts.map((prompt: any) => ({
      ...prompt,
      num: prompt.num || prompt.id, // Ensure num property exists
      sections: prompt.sections.map((section: any) => ({
        ...section,
        open: section.open !== undefined ? section.open : true,
        dirty: section.dirty !== undefined ? section.dirty : false
      }))
    }));

    return { 
      tree: tree as FolderType[],
      prompts: processedPrompts as Prompt[]
    };
  } catch (error) {
    console.error("Error parsing data:", error);
    throw error;
  }
};

/**
 * Load JSON file and parse its contents
 * @param file File object to read
 * @returns Promise with parsed data
 */
export const loadJSONFile = (file: File): Promise<{
  tree: FolderType[];
  prompts: Prompt[];
}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        if (!event.target?.result) {
          throw new Error("Failed to read file");
        }
        
        const data = JSON.parse(event.target.result as string);
        const parsedData = parseLoadedData(data);
        resolve(parsedData);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error("Error reading file"));
    };
    
    reader.readAsText(file);
  });
};