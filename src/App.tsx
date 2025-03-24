/**
 * App.tsx
 *
 * This file implements a Prompt Builder application.
 * It allows users to organize “components” (legal or prompt blocks)
 * into folders, then build “prompts” by dragging and dropping those components.
 * The app supports operations such as file load/save (JSON), modal editing,
 * folder management, and drag–drop reordering.
 *
 * Refactored for improved modularity, readability, error handling, and efficiency.
 */

import React, {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  KeyboardEvent,
  ChangeEvent,
  JSX,
} from "react";
import "./App.scss";

// ----- IMPORTED ICONS (from MUI) -----
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import FolderIcon from "@mui/icons-material/Folder";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import CloseIcon from "@mui/icons-material/Close";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SettingsIcon from "@mui/icons-material/Settings";
import Switch from "@mui/material/Switch";

import AbcIcon from "@mui/icons-material/Abc";
import LibraryBooksIcon from "@mui/icons-material/LibraryBooks";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import PersonIcon from "@mui/icons-material/Person";
import BrushIcon from "@mui/icons-material/Brush";

// ----- TYPE DEFINITIONS -----
export type ComponentType = {
  id: number;
  name: string;
  type: "component";
  content: string;
  componentType: "instruction" | "role" | "context" | "format" | "style";
};

export type FolderType = {
  id: number;
  name: string;
  type: "folder";
  children: (FolderType | ComponentType)[];
};

export type TreeNode = FolderType | ComponentType;

export type Section = {
  id: number;
  name: string;
  content: string;
  type: "instruction" | "role" | "context" | "format" | "style";
  linkedComponentId?: number;
  originalContent?: string;
  open: boolean;
  dirty: boolean;
  editingHeader?: boolean;
  editingHeaderTempName?: string;
  editingHeaderTempType?: "instruction" | "role" | "context" | "format" | "style";
};

export type Prompt = {
  id: number;
  num: number;
  name: string;
  sections: Section[];
};

// Settings type definition
export type Settings = {
  autoSave: boolean;
  defaultPromptName: string;
  defaultSectionType: "instruction" | "role" | "context" | "format" | "style";
  theme: "dark" | "light";
  markdownPromptingEnabled: boolean;
  systemPrompt: string;
};

// ----- CONSTANTS & INITIAL DATA -----
const INDENT = 20;

const initialTreeData: FolderType[] = [
  {
    id: 1,
    name: "Components",
    type: "folder",
    children: [],
  },
];

const initialSections: Section[] = [
  {
    id: Date.now(),
    name: "Section 1",
    content: "",
    type: "instruction",
    open: true,
    dirty: false,
    editingHeader: false,
  },
];

// Default settings
const defaultSettings: Settings = {
  autoSave: true,
  defaultPromptName: "Prompt",
  defaultSectionType: "instruction",
  theme: "dark",
  markdownPromptingEnabled: false,
  systemPrompt: "# Prompt Structure/System Guide\n\nThis document outlines a structured request format for the following prompt. Each section of the prompt is clearly marked with a markdown heading that indicates both the section type and title.\n\n## Section Types\n\n### **Role** \nDefines the expertise, perspective, or character you will adopt. You will embody this role completely while processing and responding to the prompt.\n\n### **Context** \nProvides essential background information and situational details needed for you to understand the task. All context is critical for generating an appropriate response.\n\n### **Instructions** \nSpecifies the exact deliverables and actions required. This section defines success criteria and should be followed precisely.\n\n### **Style** \nEstablishes guidelines for your style in formulating a response. Your response should consistently adhere to these stylistic guidelines.\n\n### **Format** \nDetails the structural requirements for the output, including organization, layout, and presentation specifications.\n\n## Implementation\n\n- Each section begins with a level-1 markdown heading: `# [Type]: [Title]`\n- You will thoroughly process all sections before producing a response\n- You must prioritize following instructions precisely while maintaining the specified role, context awareness, style, and format\n\nWhat follows is the prompt using the outlined system and formatting.",
};

// ----- UTILITY FUNCTIONS ----- //

/**
 * Parses loaded JSON data from a file.
 * @param data The parsed JSON data.
 * @returns An array of FolderType or ComponentType.
 */
const parseLoadedData = (data: any): (FolderType | ComponentType)[] => {
  try {
    let newChildren: (FolderType | ComponentType)[] = [];
    if (Array.isArray(data)) {
      newChildren = data;
    } else if (data.type === "folder" && data.children) {
      newChildren = data.children;
    }
    console.assert(newChildren.length > 0, "Parsed data is empty");
    return newChildren;
  } catch (error) {
    console.error("Error parsing loaded data:", error);
    return [];
  }
};

/**
 * Recursively updates a folder in the tree using an updater function.
 * @param nodes The current folder tree.
 * @param folderId The target folder id.
 * @param updater Callback to update the folder.
 * @returns A new updated folder tree.
 */
const updateFolderInTree = (
  nodes: FolderType[],
  folderId: number,
  updater: (folder: FolderType) => FolderType
): FolderType[] => {
  return nodes.map((node) => {
    if (node.id === folderId && node.type === "folder") {
      return updater(node);
    }
    if (node.type === "folder" && node.children) {
      return { ...node, children: updateFolderInTree(node.children as FolderType[], folderId, updater) };
    }
    return node;
  });
};

/**
 * Loads a JSON file and invokes a callback with parsed children.
 * @param file The JSON file.
 * @param onSuccess Callback with parsed children.
 */
const loadJSONFile = (file: File, onSuccess: (children: (FolderType | ComponentType)[]) => void) => {
  if (file.type !== "application/json") {
    console.error("Unsupported file type. Please select a JSON file.");
    return;
  }
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target?.result as string);
      const newChildren = parseLoadedData(data);
      onSuccess(newChildren);
      console.log("JSON file loaded successfully.");
    } catch (err) {
      console.error("Error parsing JSON file:", err);
    }
  };
  reader.readAsText(file);
};

/**
 * Recursively inserts a node into the tree at a specified target and position.
 */
const insertNode = (
  nodes: TreeNode[],
  targetId: number,
  nodeToInsert: TreeNode,
  position: "above" | "below" | "inside" | "inside-bottom"
): TreeNode[] => {
  const newNodes: TreeNode[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.id === targetId) {
      if (position === "above") {
        newNodes.push(nodeToInsert);
        newNodes.push(node);
      } else if (position === "below") {
        newNodes.push(node);
        newNodes.push(nodeToInsert);
      } else if (position === "inside") {
        if (node.type === "folder") {
          node.children = [nodeToInsert, ...node.children];
        }
        newNodes.push(node);
      } else if (position === "inside-bottom") {
        if (node.type === "folder") {
          node.children = [...node.children, nodeToInsert];
        }
        newNodes.push(node);
      } else {
        newNodes.push(node);
      }
    } else if (node.type === "folder") {
      node.children = insertNode(node.children, targetId, nodeToInsert, position);
      newNodes.push(node);
    } else {
      newNodes.push(node);
    }
  }
  return newNodes;
};

/**
 * Recursively removes a node from the tree.
 * @param nodes The tree nodes.
 * @param id The id of the node to remove.
 * @returns The new tree and the removed node (if any).
 */
const removeNode = (
  nodes: TreeNode[],
  id: number
): { newNodes: TreeNode[]; removed: TreeNode | null } => {
  let removed: TreeNode | null = null;
  const filtered = nodes.filter((node) => {
    if (node.id === id) {
      removed = node;
      return false;
    }
    if (node.type === "folder") {
      const result = removeNode(node.children, id);
      if (result.removed) {
        removed = result.removed;
        node.children = result.newNodes;
      }
    }
    return true;
  });
  return { newNodes: filtered, removed };
};

/**
 * Checks whether the child node is a descendant of the parent node.
 */
const isDescendant = (parent: TreeNode, child: TreeNode): boolean => {
  if (parent.type !== "folder") return false;
  for (const node of parent.children) {
    if (node.id === child.id) return true;
    if (node.type === "folder" && isDescendant(node, child)) return true;
  }
  return false;
};

/**
 * Moves a dragged node relative to a target node.
 * @param treeData The current tree.
 * @param dragged The dragged node.
 * @param target The target node.
 * @param position The relative position.
 * @returns The new tree after moving the node.
 */
const moveNodeInTree = (
  treeData: TreeNode[],
  dragged: TreeNode,
  target: TreeNode,
  position: "above" | "below" | "inside" | "inside-bottom"
): TreeNode[] => {
  if (dragged.id === target.id || (dragged.type === "folder" && isDescendant(dragged, target))) {
    console.warn("Invalid move: Cannot move a node into itself or its descendant.");
    return treeData;
  }
  let newTree = [...treeData];
  const removalResult = removeNode(newTree, dragged.id);
  newTree = removalResult.newNodes;
  newTree = insertNode(newTree, target.id, dragged, position);
  console.log(`Moved node ${dragged.id} to ${position} of node ${target.id}`);
  return newTree;
};

// ----- SIDEBAR COMPONENT & ITS HELPER FUNCTIONS ----- //

type SidebarProps = {
  treeData: FolderType[];
  setTreeData: React.Dispatch<React.SetStateAction<FolderType[]>>;
  openSettings: () => void; // Add this prop
};

/**
 * Renders a modal dialog for adding or editing a component.
 */
const ModalDialog: React.FC<{
  modalMode: "add" | "edit" | null;
  modalName: string;
  modalType: "instruction" | "role" | "context" | "format" | "style";
  modalContent: string;
  setModalName: (name: string) => void;
  setModalType: (type: "instruction" | "role" | "context" | "format" | "style") => void;
  setModalContent: (content: string) => void;
  submitModal: () => void;
  closeModal: () => void;
}> = ({
  modalMode,
  modalName,
  modalType,
  modalContent,
  setModalName,
  setModalType,
  setModalContent,
  submitModal,
  closeModal,
}) => {
  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if ((e.target as HTMLElement).classList.contains("modal-overlay")) closeModal();
      }}
    >
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={closeModal}>
          <CloseIcon fontSize="inherit" />
        </button>
        <h3>{modalMode === "add" ? "Add Component" : "Edit Component"}</h3>
        <label>
          Name:
          <input
            type="text"
            autoFocus
            value={modalName}
            onChange={(e) => setModalName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitModal();
              }
            }}
          />
        </label>
        <label>
          Type:
          <select
            value={modalType}
            onChange={(e) =>
              setModalType(e.target.value as "instruction" | "role" | "context" | "format" | "style")
            }
          >
            <option value="instruction">Instruction</option>
            <option value="role">Role</option>
            <option value="context">Context</option>
            <option value="format">Format</option>
            <option value="style">Style</option>
          </select>
        </label>
        <label style={{ flexGrow: 1 }}>
          Content:
          <textarea
            value={modalContent}
            onChange={(e) => setModalContent(e.target.value)}
          ></textarea>
        </label>
        <button className="modal-submit" onClick={submitModal}>
          {modalMode === "add" ? "Create" : "Confirm"}
        </button>
      </div>
    </div>
  );
};

/**
 * Renders a modal dialog for managing application settings.
 */
const SettingsModal: React.FC<{
  settings: Settings;
  saveSettings: (settings: Settings) => void;
  closeModal: () => void;
}> = ({ settings, saveSettings, closeModal }) => {
  // Local state to track changes before saving
  const [tempSettings, setTempSettings] = useState<Settings>({...settings});
  
  const handleSave = () => {
    saveSettings(tempSettings);
    closeModal();
  };
  
  const resetSystemPrompt = () => {
    setTempSettings({
      ...tempSettings, 
      systemPrompt: defaultSettings.systemPrompt
    });
  };
  
  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if ((e.target as HTMLElement).classList.contains("modal-overlay")) closeModal();
      }}
    >
      <div className="modal-content settings-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={closeModal}>
          <CloseIcon fontSize="inherit" />
        </button>
        <h3>Settings</h3>
        
        <div className="settings-section">
          <h4>Markdown Component Prompting System</h4>
          <p>Systematic method for structuring sectioned prompts for increased understanding. See a more in depth explanation <a href="https://github.com/falktravis/Prompt-Builder/discussions/1">here</a>.</p>
          <label className="settings-toggle">
            <span>Markdown Component Prompting System</span>
            <Switch
              checked={tempSettings.markdownPromptingEnabled}
              onChange={(e) => setTempSettings({...tempSettings, markdownPromptingEnabled: e.target.checked})}
              color="primary"
            />
          </label>
          
          {tempSettings.markdownPromptingEnabled && (
            <div className="settings-field">
              <div className="system-prompt-header">
                <label>System Prompt:</label>
                <button 
                  className="reset-default-btn" 
                  onClick={resetSystemPrompt}
                  title="Reset to default system prompt"
                >
                  Reset to Default
                </button>
              </div>
              <textarea
                className="system-prompt-textarea"
                value={tempSettings.systemPrompt}
                onChange={(e) => setTempSettings({...tempSettings, systemPrompt: e.target.value})}
                rows={8}
              />
            </div>
          )}
        </div>
        
        <div className="settings-actions">
          <button onClick={handleSave} className="modal-submit">Save</button>
          <button onClick={closeModal} className="modal-cancel">Cancel</button>
        </div>
      </div>
    </div>
  );
};

/**
 * Sidebar component that manages folder/component tree, file load/save,
 * modal editing, and folder management.
 */
const Sidebar: React.FC<SidebarProps> = ({ treeData, setTreeData, openSettings }) => {
  // ----- STATE VARIABLES -----
  const [collapsed, setCollapsed] = useState<{ [key: number]: boolean }>({});
  const [editingFolderId, setEditingFolderId] = useState<number | null>(null);
  const [newFolderName, setNewFolderName] = useState<string>("");
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<"add" | "edit" | null>(null);
  const [modalFolderId, setModalFolderId] = useState<number | null>(null);
  const [modalComponent, setModalComponent] = useState<ComponentType | null>(null);
  const [modalName, setModalName] = useState<string>("");
  const [modalType, setModalType] = useState<"instruction" | "role" | "context" | "format" | "style">("instruction");
  const [modalContent, setModalContent] = useState<string>("");
  const [renamingFolderId, setRenamingFolderId] = useState<number | null>(null);
  const [renameFolderName, setRenameFolderName] = useState<string>("");
  const [draggedNode, setDraggedNode] = useState<TreeNode | null>(null);
  const [dragOverNodeId, setDragOverNodeId] = useState<number | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{
    x: number;
    y: number;
    width: number;
    position: "above" | "below" | "inside" | "inside-bottom";
    effectiveParent?: boolean;
    targetIndex?: number;
  } | null>(null);

  // File input ref for loading JSON.
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ----- EFFECTS -----

  // Close any open menu when clicking elsewhere.
  useEffect(() => {
    const handleDocumentClick = () => setOpenMenu(null);
    document.addEventListener("click", handleDocumentClick);
    return () => document.removeEventListener("click", handleDocumentClick);
  }, []);

  // Initialize collapse state for folders (except base folder).
  useEffect(() => {
    const initializeCollapsedState = (
      nodes: TreeNode[],
      state: { [key: number]: boolean } = {}
    ) => {
      nodes.forEach((node) => {
        if (node.type === "folder" && node.id !== 1) {
          // Only initialize if this folder doesn't already have a state
          if (state[node.id] === undefined) {
            state[node.id] = true;
          }
        }
        if (node.type === "folder" && node.children) {
          initializeCollapsedState(node.children, state);
        }
      });
      return state;
    };
    
    setCollapsed((prevCollapsed) => {
      // Merge previous state with new state for any new folders
      return { 
        ...prevCollapsed, 
        ...initializeCollapsedState(treeData, { ...prevCollapsed }) 
      };
    });
  }, [treeData]);

  // ----- FILE LOAD / SAVE HANDLERS -----

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadJSONFile(file, (newChildren) => {
        setTreeData((prev) =>
          prev.map((node) =>
            node.id === 1 && node.type === "folder"
              ? { ...node, children: [...node.children, ...newChildren] }
              : node
          )
        );
      });
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      loadJSONFile(files[0], (newChildren) => {
        setTreeData((prev) =>
          prev.map((node) =>
            node.id === 1 && node.type === "folder"
              ? { ...node, children: [...node.children, ...newChildren] }
              : node
          )
        );
      });
    }
  };

  const handleSaveJSON = () => {
    const baseFolder = treeData.find((node) => node.id === 1 && node.type === "folder");
    if (baseFolder) {
      const fileData = JSON.stringify(baseFolder, null, 2);
      const blob = new Blob([fileData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "components.json";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      console.log("JSON file saved.");
    } else {
      console.error("Base folder not found. Cannot save JSON.");
    }
  };

  // ----- MODAL HANDLERS -----

  const openAddComponentModal = (folderId: number) => {
    setModalMode("add");
    setModalFolderId(folderId);
    setModalName("");
    setModalType("context");
    setModalContent("");
    setModalOpen(true);
  };

  const openEditComponentModal = (comp: ComponentType) => {
    setModalMode("edit");
    setModalComponent(comp);
    setModalName(comp.name);
    setModalType(comp.componentType);
    setModalContent(comp.content);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalMode(null);
    setModalFolderId(null);
    setModalComponent(null);
  };

  const submitModal = () => {
    if (modalMode === "add" && modalFolderId !== null) {
      const newComp: ComponentType = {
        id: Date.now(),
        name: modalName,
        type: "component",
        content: modalContent,
        componentType: modalType,
      };
      // Recursive helper to add component into target folder.
      const addComponentToTree = (nodes: FolderType[]): FolderType[] => {
        return nodes.map((node) => {
          if (node.id === modalFolderId && node.type === "folder") {
            return { ...node, children: [...node.children, newComp] };
          }
          if (node.children) {
            return { ...node, children: addComponentToTree(node.children as FolderType[]) };
          }
          return node;
        });
      };
      setTreeData(addComponentToTree(treeData));
      console.log("Component added:", newComp);
    } else if (modalMode === "edit" && modalComponent) {
      const updatedComp: ComponentType = {
        ...modalComponent,
        name: modalName,
        content: modalContent,
        componentType: modalType,
      };
      // Recursive helper to update component.
      const updateComponentInTree = (nodes: TreeNode[]): TreeNode[] => {
        return nodes.map((node) => {
          if (node.type === "component" && node.id === updatedComp.id) {
            return updatedComp;
          } else if (node.type === "folder" && node.children) {
            return { ...node, children: updateComponentInTree(node.children) };
          }
          return node;
        });
      };
      setTreeData(updateComponentInTree(treeData) as FolderType[]);
      console.log("Component updated:", updatedComp);
    }
    closeModal();
  };

  // ----- FOLDER MANAGEMENT HANDLERS -----

  const toggleCollapse = (id: number) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const startEditing = (parentId: number) => {
    setEditingFolderId(parentId);
    setNewFolderName("");
  };

  const saveFolder = (parentId: number) => {
    if (!newFolderName.trim()) return;
    const newFolder: FolderType = {
      id: Date.now(),
      name: newFolderName,
      type: "folder",
      children: [],
    };
    const updatedTree = updateFolderInTree(treeData, parentId, (folder) => ({
      ...folder,
      children: [...folder.children, newFolder],
    }));
    setTreeData(updatedTree);
    setCollapsed((prev) => ({ ...prev, [newFolder.id]: true }));
    setEditingFolderId(null);
    setNewFolderName("");
    console.log("Folder created:", newFolder);
  };

  const cancelEditing = () => {
    setEditingFolderId(null);
    setNewFolderName("");
  };

  const deleteFolder = (folderId: number) => {
    if (folderId === 1) return;
    const removeFolder = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.reduce<TreeNode[]>((acc, node) => {
        if (node.type === "folder") {
          if (node.id === folderId) return acc;
          const updatedChildren = removeFolder(node.children);
          acc.push({ ...node, children: updatedChildren });
        } else {
          acc.push(node);
        }
        return acc;
      }, []);
    };
    const newData = removeFolder(treeData);
    setTreeData(newData as FolderType[]);
    console.log("Folder deleted, id:", folderId);
  };

  const deleteComponent = (componentId: number) => {
    const removeComponent = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.reduce<TreeNode[]>((acc, node) => {
        if (node.type === "component") {
          if (node.id === componentId) return acc;
          acc.push(node);
        } else if (node.type === "folder") {
          const updatedChildren = removeComponent(node.children);
          acc.push({ ...node, children: updatedChildren });
        }
        return acc;
      }, []);
    };
    const newData = removeComponent(treeData);
    setTreeData(newData as FolderType[]);
    console.log("Component deleted, id:", componentId);
  };

  // ----- DRAG–DROP HANDLERS -----

  const handleMoveNode = (target: TreeNode, position: "above" | "below" | "inside" | "inside-bottom") => {
    if (!draggedNode) return;
    if (draggedNode.id === target.id) return;
    const updatedTree = moveNodeInTree(treeData, draggedNode, target, position);
    setTreeData(updatedTree as FolderType[]);
  };

  /**
   * Recursively renders the tree structure (folders and components) with drag–drop support.
   */
  const renderTree = (nodes: TreeNode[], depth: number = 0, parentNode?: FolderType): JSX.Element => (
    <ul
      style={{ paddingLeft: `${depth * 0.9375}rem` }}
      onDragOver={(e) => {
        if (draggedNode && draggedNode.type === "component") {
          const rect = e.currentTarget.getBoundingClientRect();
          if (e.clientX < rect.left + INDENT) {
            const childrenArray = Array.from(e.currentTarget.children) as HTMLElement[];
            let targetIndex = 0;
            for (let i = 0; i < childrenArray.length; i++) {
              const childRect = childrenArray[i].getBoundingClientRect();
              if (e.clientY < childRect.top + childRect.height / 2) {
                targetIndex = i;
                break;
              }
              targetIndex = i + 1;
            }
            setDropIndicator({
              x: rect.left,
              y: e.clientY,
              width: rect.width,
              position: targetIndex === 0 ? "above" : "below",
              effectiveParent: true,
              targetIndex,
            });
            setDragOverNodeId(null);
            return;
          } else {
            setDropIndicator(null);
          }
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        if (
          draggedNode &&
          draggedNode.type === "component" &&
          dropIndicator &&
          dropIndicator.effectiveParent &&
          parentNode
        ) {
          // Remove dragged node and reinsert it at the target index
          const newNodes = [...nodes];
          const removalResult = removeNode(newNodes, draggedNode.id);
          const updatedNodes = removalResult.newNodes;
          updatedNodes.splice(dropIndicator.targetIndex!, 0, draggedNode);
          const updateParentChildren = (nodes: TreeNode[]): TreeNode[] => {
            return nodes.map((n) => {
              if (n.id === parentNode.id && n.type === "folder") {
                return { ...n, children: updatedNodes };
              }
              if (n.type === "folder" && n.children) {
                return { ...n, children: updateParentChildren(n.children) };
              }
              return n;
            });
          };
          setTreeData(updateParentChildren(treeData) as FolderType[]);
        }
        setDraggedNode(null);
        setDropIndicator(null);
      }}
    >
      {nodes.map((node) => (
        <li
          key={node.id}
          draggable
          onDragStart={(e) => {
            e.stopPropagation();
            setDraggedNode(node);
            e.dataTransfer.setData("application/json", JSON.stringify(node));
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            if (node.type === "folder") {
              const headerEl = e.currentTarget.querySelector(".folder-header-container");
              if (headerEl) {
                const headerRect = headerEl.getBoundingClientRect();
                if (e.clientY < headerRect.bottom) {
                  let dropY = headerRect.bottom;
                  let dropX = rect.left + INDENT;
                  if (!collapsed[node.id]) {
                    const childrenContainer = e.currentTarget.querySelector("ul");
                    if (childrenContainer) {
                      dropY = childrenContainer.getBoundingClientRect().bottom;
                    }
                  }
                  setDropIndicator({
                    x: dropX,
                    y: dropY,
                    width: rect.width - INDENT,
                    position: "inside-bottom",
                  });
                  setDragOverNodeId(node.id);
                  return;
                }
              }
            }
            const offsetY = e.clientY - rect.top;
            const pos: "above" | "below" = offsetY < rect.height / 2 ? "above" : "below";
            setDropIndicator({ x: rect.left, y: e.clientY, width: rect.width, position: pos });
            setDragOverNodeId(node.id);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!draggedNode || draggedNode.id === node.id) {
              setDraggedNode(null);
              setDropIndicator(null);
              return;
            }
            if (node.type === "folder" && dropIndicator && dropIndicator.position === "inside-bottom") {
              handleMoveNode(node, "inside-bottom");
            } else if (dropIndicator && !dropIndicator.effectiveParent) {
              handleMoveNode(node, dropIndicator.position);
            }
            setDraggedNode(null);
            setDragOverNodeId(null);
            setDropIndicator(null);
          }}
          onDragLeave={(e) => {
            e.stopPropagation();
            setDragOverNodeId(null);
            setDropIndicator(null);
          }}
          style={{ position: "relative" }}
        >
          {node.type === "folder" ? (
            <>
              <div className="folder-header-container">
                <span onClick={() => toggleCollapse(node.id)}>
                  {collapsed[node.id] ? <FolderIcon fontSize="inherit" /> : <FolderOpenIcon fontSize="inherit" />}{" "}
                  {renamingFolderId === node.id ? (
                    <input
                      type="text"
                      autoFocus
                      value={renameFolderName}
                      onChange={(e) => setRenameFolderName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const updateName = (nodes: TreeNode[]): TreeNode[] => {
                            return nodes.map((n) => {
                              if (n.id === node.id && n.type === "folder") {
                                return { ...n, name: renameFolderName };
                              }
                              if (n.type === "folder" && n.children) {
                                return { ...n, children: updateName(n.children) };
                              }
                              return n;
                            });
                          };
                          setTreeData(updateName(treeData) as FolderType[]);
                          setRenamingFolderId(null);
                        }
                        if (e.key === "Escape") {
                          setRenamingFolderId(null);
                        }
                      }}
                      onBlur={() => {
                        const updateName = (nodes: TreeNode[]): TreeNode[] => {
                          return nodes.map((n) => {
                            if (n.id === node.id && n.type === "folder") {
                              return { ...n, name: renameFolderName };
                            }
                            if (n.type === "folder" && n.children) {
                              return { ...n, children: updateName(n.children) };
                            }
                            return n;
                          });
                        };
                        setTreeData(updateName(treeData) as FolderType[]);
                        setRenamingFolderId(null);
                      }}
                    />
                  ) : (
                    node.name
                  )}
                </span>
                <div className="dropdown">
                  <button
                    className="menu-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenu(openMenu === node.id ? null : node.id);
                    }}
                  >
                    <MoreVertIcon fontSize="inherit" />
                  </button>
                  {openMenu === node.id && (
                    <ul className="dropdown-menu">
                      <li
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditing(node.id);
                          setOpenMenu(null);
                        }}
                      >
                        Add Sub-Folder
                      </li>
                      {node.id !== 1 && (
                        <>
                          <li
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteFolder(node.id);
                              setOpenMenu(null);
                            }}
                          >
                            Delete Folder
                          </li>
                          <li
                            onClick={(e) => {
                              e.stopPropagation();
                              setRenamingFolderId(node.id);
                              setRenameFolderName(node.name);
                              setOpenMenu(null);
                            }}
                          >
                            Rename Folder
                          </li>
                        </>
                      )}
                      <hr className="dropdown-divider" />
                      <li
                        onClick={(e) => {
                          e.stopPropagation();
                          openAddComponentModal(node.id);
                          setOpenMenu(null);
                        }}
                      >
                        Add Component
                      </li>
                    </ul>
                  )}
                </div>
              </div>
              {!collapsed[node.id] && renderTree(node.children, depth + 1, node)}
              {editingFolderId === node.id && (
                <div className="folder-input-container">
                  {collapsed[node.id] ? <FolderIcon fontSize="inherit" /> : <FolderOpenIcon fontSize="inherit" />}
                  <input
                    type="text"
                    autoFocus
                    className="compact-folder-input"
                    placeholder="New Folder Name"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveFolder(node.id);
                      if (e.key === "Escape") cancelEditing();
                    }}
                    onBlur={() => saveFolder(node.id)}
                  />
                </div>
              )}
            </>
          ) : (
            <div className={`component-display component-${node.componentType}`}>
              <div className="component-controls">
                <button
                  className="edit-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditComponentModal(node as ComponentType);
                  }}
                >
                  <EditIcon fontSize="inherit" />
                </button>
                <button
                  className="delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteComponent(node.id);
                  }}
                >
                  <DeleteIcon fontSize="inherit" />
                </button>
              </div>
              <div className="component-container">
                {node.componentType === "instruction" && (
                  <div className="icon instruction-icon">
                    <FormatListBulletedIcon />
                  </div>
                )}
                {node.componentType === "role" && (
                  <div className="icon role-icon">
                    <PersonIcon />
                  </div>
                )}
                {node.componentType === "context" && (
                  <div className="icon context-icon">
                    <LibraryBooksIcon />
                  </div>
                )}
                {node.componentType === "format" && (
                  <div className="icon format-icon">
                    <AbcIcon />
                  </div>
                )}
                {node.componentType === "style" && (
                  <div className="icon style-icon">
                    <BrushIcon />
                  </div>
                )}
                <div className="component-title">{node.name}</div>
              </div>
            </div>
          )}
          {dragOverNodeId === node.id && dropIndicator && !dropIndicator.effectiveParent && (
            <div
              className="sidebar-drop-indicator"
              style={{
                position: "absolute",
                top:
                  dropIndicator.position === "above"
                    ? 0
                    : dropIndicator.position === "below"
                    ? "100%"
                    : dropIndicator.position === "inside-bottom"
                    ? (node.type === "folder" ? 0 : "50%")
                    : "50%",
                left: dropIndicator.position === "inside" || dropIndicator.position === "inside-bottom" ? INDENT : 0,
                width: dropIndicator.width,
                height: 2,
                backgroundColor: "blue",
              }}
            ></div>
          )}
        </li>
      ))}
    </ul>
  );

  // ----- SIDEBAR RENDER -----
  return (
    <>
      <div id="sidebar-container" onDragOver={(e) => e.preventDefault()} onDrop={handleFileDrop}>
        <header>
          <div className="title">
            <h1>
              Prompt Builder
            </h1>
            <a href="https://docs.google.com/document/d/1eql1d57SB1DtiW8bkQswjnqmxsSl6Ken-96tjSLdG9k/edit?tab=t.0" target="_blank">Guide</a>
          </div>
          <button className="settings-btn" onClick={openSettings}>
            <SettingsIcon fontSize="inherit" />
          </button>
        </header>
        <div className="tree">{renderTree(treeData)}</div>
        {modalOpen && (
          <ModalDialog
            modalMode={modalMode}
            modalName={modalName}
            modalType={modalType}
            modalContent={modalContent}
            setModalName={setModalName}
            setModalType={setModalType}
            setModalContent={setModalContent}
            submitModal={submitModal}
            closeModal={closeModal}
          />
        )}
      </div>
      <div className="file-controls">
        <button className="load-json-btn" onClick={() => fileInputRef.current?.click()}>
          Load JSON
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: "none" }}
          onChange={handleFileInputChange}
        />
        <button className="save-json-btn" onClick={handleSaveJSON}>
          Save JSON
        </button>
      </div>
    </>
  );
};

// ----- MAIN APP COMPONENT & PROMPT EDITOR HANDLERS ----- //

/**
 * Main App component that manages prompts and the prompt editor.
 */
const App: React.FC = () => {
  const [treeData, setTreeData] = useState<FolderType[]>(initialTreeData);
  const initialPromptId = Date.now();
  const [prompts, setPrompts] = useState<Prompt[]>([
    { id: initialPromptId, num: 1, name: "Prompt 1", sections: initialSections },
  ]);
  const [activePromptId, setActivePromptId] = useState<number>(initialPromptId);
  const [dropSectionIndex, setDropSectionIndex] = useState<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<number, HTMLTextAreaElement>>({});
  const sectionNameInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  
  // Add settings state and modal state
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);

  const activePrompt = prompts.find((p) => p.id === activePromptId) || { sections: [] };

  /**
   * Updates sections for the active prompt.
   */
  const updateActivePromptSections = (newSections: Section[]) => {
    setPrompts((prev) =>
      prev.map((p) => (p.id === activePromptId ? { ...p, sections: newSections } : p))
    );
  };

  // ----- CHROME STORAGE HANDLERS -----

  useEffect(() => {
    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.local.get(["treeData", "prompts"], (result) => {
        if (result.treeData) setTreeData(result.treeData);
        if (result.prompts) {
          setPrompts(result.prompts);
          setActivePromptId(result.prompts[0]?.id || null);
        }
      });
    }
  }, []);

  useEffect(() => {
    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.local.set({ treeData, prompts });
    }
  }, [treeData, prompts]);

  // ----- SETTINGS HANDLERS -----
  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem("promptBuilderSettings");
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(parsedSettings);
      } catch (error) {
        console.error("Failed to parse settings from localStorage:", error);
      }
    }
  }, []);

  const saveSettings = (newSettings: Settings) => {
    setSettings(newSettings);
    localStorage.setItem("promptBuilderSettings", JSON.stringify(newSettings));
    console.log("Settings saved:", newSettings);
  };

  // ----- EFFECT: Adjust textarea heights -----
  useLayoutEffect(() => {
    Object.values(sectionRefs.current).forEach((textarea) => {
      if (textarea) {
        textarea.style.height = "auto";
        textarea.style.height = textarea.scrollHeight + "px";
      }
    });
  }, [activePrompt.sections]);

  // ----- EFFECT: Cancel header editing when clicking outside -----
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".section-header")) {
        const newSections = activePrompt.sections.map((sec) => ({ ...sec, editingHeader: false }));
        updateActivePromptSections(newSections);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [activePrompt.sections]);

  // ----- SECTION HANDLERS -----

  const addSection = (afterIndex: number) => {
    const newSection: Section = {
      id: Date.now(),
      name: "",
      content: "",
      type: 'instruction',
      open: true,
      dirty: false,
      editingHeader: true,
      editingHeaderTempName: "",
      editingHeaderTempType: "instruction",
    };
    const newArr = [...activePrompt.sections];
    newArr.splice(afterIndex + 1, 0, newSection);
    updateActivePromptSections(newArr);
    console.log("New section added:", newSection);
    setTimeout(() => {
      const inputEl = sectionNameInputRefs.current[newSection.id];
      if (inputEl && wrapperRef.current) {
        // Save the current scroll position.
        const currentScrollTop = wrapperRef.current.scrollTop;
        // Focus the section header input.
        inputEl.focus();
        const inputRect = inputEl.getBoundingClientRect();
        const wrapperRect = wrapperRef.current.getBoundingClientRect();
        // If the new input is fully visible, restore scroll position.
        if (inputRect.bottom <= wrapperRect.bottom) {
          wrapperRef.current.scrollTop = currentScrollTop;
        } else {
          // Otherwise, scroll into view.
          inputEl.scrollIntoView({ behavior: "auto", block: "nearest", inline: "nearest" });
        }
      }
    }, 50);    
  };

  const toggleSection = (sectionId: number) => {
    const newSections = activePrompt.sections.map((sec) =>
      sec.id === sectionId ? { ...sec, open: !sec.open } : sec
    );
    updateActivePromptSections(newSections);
  };

  const updateSectionContent = (sectionId: number, newContent: string) => {
    const newSections = activePrompt.sections.map((sec) => {
      if (sec.id === sectionId) {
        const isDirty = sec.linkedComponentId ? newContent !== sec.originalContent : false;
        return { ...sec, content: newContent, dirty: !!isDirty };
      }
      return sec;
    });
    updateActivePromptSections(newSections);
  };

  const updateSectionHeader = (
    sectionId: number,
    newName: string,
    newType: "instruction" | "role" | "context" | "format" | "style"
  ) => {
    const newSections = activePrompt.sections.map((sec) =>
      sec.id === sectionId
        ? {
            ...sec,
            name: newName,
            type: newType,
            editingHeader: false,
            editingHeaderTempName: undefined,
            editingHeaderTempType: undefined,
          }
        : sec
    );
    updateActivePromptSections(newSections);
  };

  const startHeaderEdit = (section: Section, e?: React.MouseEvent) => {
    // Stop propagation to prevent document click handler from immediately closing the editor
    e?.stopPropagation();
    
    const newSections = activePrompt.sections.map((s) =>
      s.id === section.id
        ? { ...s, editingHeader: true, editingHeaderTempName: s.name, editingHeaderTempType: s.type }
        : s
    );
    updateActivePromptSections(newSections);
    
    // Set timeout to focus on the input after the state update
    setTimeout(() => {
      if (sectionNameInputRefs.current[section.id]) {
        sectionNameInputRefs.current[section.id]?.focus();
      }
    }, 10);
  };

  const cancelHeaderEdit = (sectionId: number) => {
    const newSections = activePrompt.sections.map((s) =>
      s.id === sectionId
        ? { ...s, editingHeader: false, editingHeaderTempName: undefined, editingHeaderTempType: undefined }
        : s
    );
    updateActivePromptSections(newSections);
  };

  const commitHeaderEdit = (section: Section) => {
    const newName = section.editingHeaderTempName ?? section.name;
    const newType = section.editingHeaderTempType ?? section.type;
    updateSectionHeader(section.id, newName, newType);
  };

  const handleSectionKeyDown = (
    e: KeyboardEvent<HTMLTextAreaElement>,
    section: Section,
    index: number
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (e.currentTarget.selectionStart === e.currentTarget.value.length) {
        updateSectionContent(section.id, e.currentTarget.value);
        addSection(index);
      }
    }
  };

  const handleWrapperDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!wrapperRef.current) return;
    const containers = Array.from(wrapperRef.current.querySelectorAll(".section-container"));
    let dropIdx = containers.length;
    for (let i = 0; i < containers.length; i++) {
      const rect = containers[i].getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      if (e.clientY < mid) {
        dropIdx = i;
        break;
      }
    }
    setDropSectionIndex(dropIdx);
  };

  const handleWrapperDragLeave = () => {
    setDropSectionIndex(null);
  };

  const handleWrapperDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const data = e.dataTransfer.getData("application/json");
    if (data) {
      const comp: ComponentType = JSON.parse(data);
      const idx = dropSectionIndex !== null ? dropSectionIndex : activePrompt.sections.length;
      const newSection: Section = {
        id: Date.now(),
        name: comp.name,
        content: comp.content,
        type: comp.componentType,
        linkedComponentId: comp.id,
        originalContent: comp.content,
        open: true,
        dirty: false,
        editingHeader: false,
      };
      const newArr = [...activePrompt.sections];
      newArr.splice(idx, 0, newSection);
      updateActivePromptSections(newArr);
      console.log("New section created from dropped component:", newSection);
    }
    setDropSectionIndex(null);
  };

  const handleSaveSection = (section: Section) => {
    if (!section.linkedComponentId) return;
    const newContent = section.content;
    const updateComponentInTree = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.map((node) => {
        if (node.type === "component" && node.id === section.linkedComponentId) {
          return { ...node, content: newContent };
        } else if (node.type === "folder" && node.children) {
          return { ...node, children: updateComponentInTree(node.children) };
        }
        return node;
      });
    };
    setTreeData((prev) => updateComponentInTree(prev) as FolderType[]);
    const newSections = activePrompt.sections.map((sec) =>
      sec.id === section.id ? { ...sec, originalContent: newContent, dirty: false } : sec
    );
    updateActivePromptSections(newSections);
    console.log("Section saved and component updated, section id:", section.id);
  };

  const getColor = (t: "instruction" | "role" | "context" | "format" | "style") => {
    if (t === "context") return "#2196f3";
    if (t === "format") return "#4caf50";
    if (t === "instruction") return "#ff9800";
    if (t === "role") return "#f7e920";
    if (t === "style") return "#b01aca";
    return "#000";
  };

  const handleCopy = () => {
    let compiledPrompt: string;
    
    if (settings.markdownPromptingEnabled) {
      // Start with the system prompt
      let promptText = settings.systemPrompt + "\n\n";
      
      // Add each section with the proper markdown heading format with capitalized type
      promptText += activePrompt.sections.map(sec => 
        `# ${sec.type.charAt(0).toUpperCase() + sec.type.slice(1)}: ${sec.name}\n\n${sec.content}`
      ).join("\n\n");
      
      compiledPrompt = promptText;
    } else {
      // Original functionality - just join the contents
      compiledPrompt = activePrompt.sections.map((sec) => sec.content).join("\n\n");
    }
    
    navigator.clipboard
      .writeText(compiledPrompt)
      .then(() => console.log("Prompt copied to clipboard."))
      .catch((err) => console.error("Failed to copy prompt: ", err));
  };

  const handleNewPrompt = () => {
    const nextNum = prompts.length > 0 ? prompts[prompts.length - 1].num + 1 : 1;
    const newPrompt: Prompt = {
      id: Date.now(),
      num: nextNum,
      name: `Section ${nextNum}`, // Use from settings
      sections: initialSections,
    };
    let updatedPrompts = [...prompts, newPrompt];
    if (updatedPrompts.length > 10) {
      updatedPrompts = updatedPrompts.slice(updatedPrompts.length - 10);
    }
    setPrompts(updatedPrompts);
    setActivePromptId(newPrompt.id);
    console.log("New prompt created:", newPrompt);
  };

  const handleSwitchPrompt = (promptId: number) => {
    setActivePromptId(promptId);
    console.log("Switched to prompt:", promptId);
  };

  // ----- MAIN APP RENDER -----
  return (
    <main>
      <section id="side-bar">
        <Sidebar treeData={treeData} setTreeData={setTreeData} openSettings={() => setShowSettingsModal(true)} />
      </section>
      <section id="content">
        <div className="prompt-tabs">
          {prompts.map((p) => (
            <button
              key={p.id}
              className={`prompt-tab ${p.id === activePromptId ? "active" : ""}`}
              onClick={() => handleSwitchPrompt(p.id)}
            >
              {p.name}
            </button>
          ))}
        </div>
        <div
          className="prompt-editor-wrapper"
          ref={wrapperRef}
          onDragOver={handleWrapperDragOver}
          onDragLeave={handleWrapperDragLeave}
          onDrop={handleWrapperDrop}
        >
          {dropSectionIndex !== null && (
            <div
              className="insertion-indicator"
              style={{
                top: (() => {
                  if (!wrapperRef.current) return 0;
                  const containers = wrapperRef.current.querySelectorAll(".section-container");
                  if (dropSectionIndex === 0) return 0;
                  if (containers[dropSectionIndex - 1]) {
                    const prevContainer = containers[dropSectionIndex - 1] as HTMLElement;
                    return prevContainer.offsetTop + prevContainer.offsetHeight;
                  }
                  return 0;
                })(),
              }}
            ></div>
          )}
          {activePrompt.sections.map((sec, index) => (
            <div className="section-container" key={sec.id}>
              {sec.linkedComponentId && (
                <div className="section-marker" style={{ backgroundColor: getColor(sec.type) }}></div>
              )}
              <div className="section-header">
                <button className="accordion-toggle" onClick={() => toggleSection(sec.id)}>
                  {sec.open ? <ExpandLessIcon fontSize="inherit" /> : <ExpandMoreIcon fontSize="inherit" />}
                </button>
                {sec.editingHeader ? (
                  <div className="section-header-edit-container">
                    <input
                      ref={(el) => { sectionNameInputRefs.current[sec.id] = el; }}
                      autoFocus
                      className="section-name-input"
                      type="text"
                      placeholder="Section name..."
                      value={sec.editingHeaderTempName ?? sec.name}
                      onChange={(e) =>
                        updateActivePromptSections(
                          activePrompt.sections.map((s) =>
                            s.id === sec.id ? { ...s, editingHeaderTempName: e.target.value } : s
                          )
                        )
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          commitHeaderEdit(sec);
                          setTimeout(() => {
                            sectionRefs.current[sec.id]?.focus({ preventScroll: true });
                          }, 0);
                        }
                        if (e.key === "Escape") {
                          cancelHeaderEdit(sec.id);
                        }
                      }}
                    />
                      <select
                        className="section-type-select"
                        value={sec.editingHeaderTempType ?? sec.type}
                        onChange={(e) =>
                          updateActivePromptSections(
                            activePrompt.sections.map((s) =>
                              s.id === sec.id
                                ? { ...s, editingHeaderTempType: e.target.value as "instruction" | "role" | "context" | "format" | "style" }
                                : s
                            )
                          )
                        }
                      >
                        <option value="instruction">Instruction</option>
                        <option value="role">Role</option>
                        <option value="context">Context</option>
                        <option value="format">Format</option>
                        <option value="style">Style</option>
                      </select>
                  </div>
                ) : (
                  <span className="section-header-text" onClick={(e) => startHeaderEdit(sec, e)}>
                    {sec.name || "Unnamed"} • {sec.type.charAt(0).toUpperCase() + sec.type.slice(1)}
                  </span>
                )}
                {sec.linkedComponentId && sec.dirty && (
                  <button className="section-save-btn" onClick={() => handleSaveSection(sec)}>
                    Save
                  </button>
                )}
                <button
                  className="section-delete-btn"
                  onClick={() =>
                    updateActivePromptSections(activePrompt.sections.filter((s) => s.id !== sec.id))
                  }
                >
                  x
                </button>
              </div>
              {sec.open && (
                <textarea
                className="section-input"
                value={sec.content}
                onChange={(e) => updateSectionContent(sec.id, e.target.value)}
                onKeyDown={(e) => handleSectionKeyDown(e, sec, index)}
                placeholder="Enter section content..."
                ref={(el) => {
                  if (el) sectionRefs.current[sec.id] = el;
                }}
              ></textarea>
              )}
            </div>
          ))}
        </div>
        <div className="copy-button-container">
          <div className="left">
            <button className="copy-btn" onClick={handleCopy}>
              Copy
            </button>
            <button className="new-section-btn" onClick={() => addSection(activePrompt.sections.length - 1)}>
              New Section
            </button>
          </div>
          <button className="new-prompt-btn" onClick={handleNewPrompt}>
            New Prompt
          </button>
        </div>
      </section>
      {showSettingsModal && (
        <SettingsModal
          settings={settings}
          saveSettings={saveSettings}
          closeModal={() => setShowSettingsModal(false)}
        />
      )}
    </main>
  );
};

export default App;