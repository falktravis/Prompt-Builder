/**
 * File handling utility functions
 * Manages file operations for prompt data import/export
 */

import { FolderType, Prompt, ComponentType, Section } from "../types"; // Added ComponentType and Section
import { v4 as uuidv4 } from 'uuid';

/**
 * Parse loaded JSON data into application data structure
 * @param data Raw JSON data
 * @returns Parsed tree and prompts data
 */
export const parseLoadedData = (data: any): {
  tree: FolderType[];
  prompts: Prompt[];
} => {
  // Entry log for parseLoadedData
  // console.log("[fileUtils|parseLoadedData] ENTERING parseLoadedData. Timestamp:", new Date().toISOString());

  if (typeof uuidv4 !== 'function') {
    console.error("[fileUtils|parseLoadedData] uuidv4 is not a function. Please ensure the 'uuid' package is installed and imported correctly.");
    throw new Error("ID generation utility (uuidv4) is not available. Cannot process file.");
  }
  // console.log("[fileUtils|parseLoadedData] uuidv4 check passed.");

  try {
    if (!data) {
      console.error("[fileUtils|parseLoadedData] No data provided to parseLoadedData.");
      throw new Error("No data provided");
    }

    let treeToProcess: any[];
    let promptsToProcess: any[];

    // Check if the data is in the new format { tree: [], prompts: [] }
    if (data && typeof data === 'object' && (data.tree !== undefined || data.prompts !== undefined) && !Array.isArray(data)) {
      treeToProcess = Array.isArray(data.tree) ? data.tree : [];
      promptsToProcess = Array.isArray(data.prompts) ? data.prompts : [];
      // console.log("[fileUtils|parseLoadedData] Detected object format. Tree items:", treeToProcess.length, "Prompt items:", promptsToProcess.length);
    } 
    // Check if the data is in the legacy format (an array of tree nodes)
    else if (Array.isArray(data)) {
      treeToProcess = data;
      promptsToProcess = []; // Legacy format only contains tree data
      // console.log("[fileUtils|parseLoadedData] Detected legacy array format. Tree items:", treeToProcess.length);
    } 
    // If neither, it's an unrecognized format
    else {
      console.error("[fileUtils|parseLoadedData] Unrecognized data format. Data received:", data);
      throw new Error("Invalid data format: Data is not a recognized array or object structure.");
    }

    if (!Array.isArray(treeToProcess)) {
      // This case should ideally be caught by the logic above, but as a safeguard:
      console.error("[fileUtils|parseLoadedData] Tree data is not an array after initial parsing. Tree received:", treeToProcess);
      throw new Error("Invalid data format: Tree data could not be resolved to an array.");
    }
    if (!Array.isArray(promptsToProcess)) {
      // Safeguard for prompts as well
      console.warn("[fileUtils|parseLoadedData] Prompts data is not an array after initial parsing, defaulting to empty. Prompts received:", promptsToProcess);
      promptsToProcess = [];
    }
    // console.log("[fileUtils|parseLoadedData] Initial data structure checks passed.");

    // --- Start of ID Transformation and Enhanced Validation ---
    const oldNumericIdToNewStringIdMap: Map<number, string> = new Map();
    const validComponentTypes = ["instruction", "role", "context", "format", "style"];
    const validSectionTypes = ["instruction", "role", "context", "format", "style"];

    // Helper function to process tree nodes (folders and components)
    const processNode = (node: any, parentPath: string = "ROOT"): FolderType | ComponentType => {
      const nodeNameForPath = node && node.name ? node.name.replace(/\s+/g, '_') : 'UnnamedNode';
      const currentPath = `${parentPath}/${nodeNameForPath}`;
      // console.log(`[fileUtils|processNode] ENTERING processNode for path: ${currentPath}, Original node (brief): {type: ${node?.type}, name: ${node?.name}, id: ${node?.id}}`);

      if (!node || typeof node !== 'object' || !node.type || typeof node.name !== 'string') { // Stricter name check
        console.error(`[fileUtils|processNode] Invalid node structure at path ${currentPath}. Node data:`, node);
        throw new Error(`Invalid node structure at path ${currentPath}: Missing type, name, or node is not an object.`);
      }

      const newId = uuidv4();
      // console.log(`[fileUtils|processNode] Path: ${currentPath}, Node: "${node.name}" (Type: ${node.type}), Original ID: ${node.id}. Generated newId: ${newId}`);

      if (typeof newId !== 'string' || newId.length === 0) {
        console.error(`[fileUtils|processNode] CRITICAL: uuidv4() returned an invalid ID: '${newId}' for node "${node.name}" at path ${currentPath}`);
        throw new Error(`uuidv4 generated an invalid ID for node ${node.name}`); // Fail fast
      }

      if (node.type === 'component' && typeof node.id === 'number') {
        oldNumericIdToNewStringIdMap.set(node.id as number, newId);
      }

      let processedChildNode: FolderType | ComponentType;

      if (node.type === 'folder') {
        if (!Array.isArray(node.children)) {
          console.warn(`[fileUtils|processNode] Folder "${node.name}" at path ${currentPath} missing children array, defaulting to empty.`);
          node.children = [];
        }
        processedChildNode = {
          id: newId, // Use newId directly
          name: node.name,
          type: "folder",
          children: node.children.map((child: any) => processNode(child, currentPath)),
        } as FolderType;
        // console.log(`[fileUtils|processNode] Path: ${currentPath}, Returning FOLDER: "${processedChildNode.name}", ID: ${processedChildNode.id}`);
        if (typeof processedChildNode.id !== 'string' || processedChildNode.id.length === 0) {
            console.error(`[fileUtils|processNode] CRITICAL: Folder "${processedChildNode.name}" at path ${currentPath} is being returned with an invalid ID: ${processedChildNode.id}`);
        }
      } else if (node.type === 'component') {
        let content = node.content;
        if (typeof content !== 'string') {
            console.warn(`[fileUtils|processNode] Component "${node.name}" at path ${currentPath} missing or invalid content, defaulting to empty string. Content was:`, content);
            content = "";
        }
        let componentType = node.componentType;
        if (!validComponentTypes.includes(componentType)) {
          console.warn(`[fileUtils|processNode] Invalid componentType "${componentType}" for component "${node.name}" at path ${currentPath}. Defaulting to "context".`);
          componentType = "context";
        }
        processedChildNode = {
            id: newId, // Use newId directly
            name: node.name,
            type: "component",
            content: content,
            componentType: componentType,
        } as ComponentType;
        // console.log(`[fileUtils|processNode] Path: ${currentPath}, Returning COMPONENT: "${processedChildNode.name}", ID: ${processedChildNode.id}`);
        if (typeof processedChildNode.id !== 'string' || processedChildNode.id.length === 0) {
            console.error(`[fileUtils|processNode] CRITICAL: Component "${processedChildNode.name}" at path ${currentPath} is being returned with an invalid ID: ${processedChildNode.id}`);
        }
      } else {
        console.error(`[fileUtils|processNode] Unknown node type: "${node.type}" for node "${node.name}" at path ${currentPath}`);
        throw new Error(`Unknown node type: "${node.type}" for node "${node.name}" at path ${currentPath}`);
      }
      // console.log(`[fileUtils|processNode] EXITING processNode for path: ${currentPath}, Processed ID: ${processedChildNode.id}`);
      return processedChildNode;
    };

    // console.log("[fileUtils|parseLoadedData] About to process tree. Number of root tree nodes:", treeToProcess.length);
    const processedTree: FolderType[] = treeToProcess.map((node: any) => processNode(node) as FolderType);
    // console.log("[fileUtils|parseLoadedData] Finished processing tree. Number of processed root tree nodes:", processedTree.length);


    // console.log("[fileUtils|parseLoadedData] About to process prompts. Number of prompts:", promptsToProcess.length);
    const processedPrompts = promptsToProcess.map((prompt: any): Prompt => {
      if (!prompt || typeof prompt !== 'object' || typeof prompt.name !== 'string' || !Array.isArray(prompt.sections)) {
        console.error("[fileUtils|parseLoadedData] Invalid prompt structure during mapping:", prompt);
        throw new Error("Invalid prompt structure during mapping: Missing name or sections array.");
      }
      const newPromptId = uuidv4();
      if (typeof newPromptId !== 'string' || newPromptId.length === 0) {
          console.error(`[fileUtils|parseLoadedData] CRITICAL: uuidv4() returned an invalid ID for prompt "${prompt.name}"`);
          throw new Error(`uuidv4 generated an invalid ID for prompt ${prompt.name}`); // Fail fast
      }

      return {
        id: newPromptId,
        name: prompt.name,
        num: prompt.num || (typeof prompt.id === 'number' ? prompt.id : 0),
        sections: prompt.sections.map((section: any): Section => {
          if (!section || typeof section !== 'object' || typeof section.name !== 'string' || typeof section.content !== 'string') {
            console.error("[fileUtils|parseLoadedData] Invalid section structure during mapping:", section);
            throw new Error("Invalid section structure during mapping: Missing name or content.");
          }
          const newSectionId = uuidv4();
          if (typeof newSectionId !== 'string' || newSectionId.length === 0) {
            console.error(`[fileUtils|parseLoadedData] CRITICAL: uuidv4() returned an invalid ID for section "${section.name}" in prompt "${prompt.name}"`);
            throw new Error(`uuidv4 generated an invalid ID for section ${section.name}`); // Fail fast
          }

          let newLinkedComponentId: string | undefined = undefined;
          if (typeof section.linkedComponentId === 'number') {
            newLinkedComponentId = oldNumericIdToNewStringIdMap.get(section.linkedComponentId as number);
          } else if (typeof section.linkedComponentId === 'string' && section.linkedComponentId.length > 0) {
            newLinkedComponentId = section.linkedComponentId;
          }
          
          let sectionType = section.type;
          if (!validSectionTypes.includes(sectionType)) {
            sectionType = "context";
          }

          return {
            id: newSectionId,
            name: section.name,
            content: section.content,
            type: sectionType,
            linkedComponentId: newLinkedComponentId,
            originalContent: section.originalContent || section.content,
            open: section.open !== undefined ? section.open : true,
            dirty: section.dirty !== undefined ? section.dirty : false,
            editingHeader: section.editingHeader !== undefined ? section.editingHeader : false,
            editingHeaderTempName: section.editingHeaderTempName || '',
            editingHeaderTempType: validSectionTypes.includes(section.editingHeaderTempType) ? section.editingHeaderTempType : sectionType,
          };
        }),
      };
    });
    // console.log("[fileUtils|parseLoadedData] Finished processing prompts. Number of processed prompts:", processedPrompts.length);


    // console.log("[fileUtils|parseLoadedData] EXITING parseLoadedData successfully. Timestamp:", new Date().toISOString());
    return { 
      tree: processedTree,
      prompts: processedPrompts
    };
  } catch (error: any) {
    console.error("[fileUtils|parseLoadedData] Error during parsing function. Error message:", error.message, "Stack:", error.stack, "Timestamp:", new Date().toISOString());
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