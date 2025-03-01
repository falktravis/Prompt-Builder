/**
 * App.tsx
 *
 * This file implements a Prompt Builder for a legal analytics service.
 * The application lets users organize “components” (which can be linked to public legal data)
 * into folders and then build “prompts” by dragging and dropping those components into a prompt editor.
 * The service is designed to eventually support analytics on criminal defense cases, profiling judges and
 * prosecutors (starting in Massachusetts).
 *
 * The file includes:
 *   - Type definitions for components, folders, tree nodes, sections, and prompts.
 *   - Initial data for the folder tree and new prompts.
 *   - A Sidebar component that handles the folder/component tree with drag–drop,
 *     file load/save (JSON), modal editing, and folder management.
 *   - The main App component which manages prompt tabs and a prompt editor for composing content.
 */

import React, {
  useState,
  useRef,
  useEffect,
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
import AbcIcon from "@mui/icons-material/Abc";
import LibraryBooksIcon from "@mui/icons-material/LibraryBooks";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";

// ----- TYPE DEFINITIONS -----
// Represents a component item in the tree (e.g., a legal data component)
export type ComponentType = {
  id: number;
  name: string;
  type: "component";
  content: string;
  componentType: "context" | "main" | "instruction";
};

// Represents a folder that can contain sub-folders or components.
export type FolderType = {
  id: number;
  name: string;
  type: "folder";
  children: (FolderType | ComponentType)[];
};

// A TreeNode can be either a Folder or a Component.
export type TreeNode = FolderType | ComponentType;

// Represents a section within a prompt (each section may be linked to a component)
export type Section = {
  id: number;
  name: string;
  content: string;
  type: "context" | "main" | "instruction";
  linkedComponentId?: number;
  originalContent?: string;
  open: boolean;
  dirty: boolean;
  editingHeader?: boolean;
  editingHeaderTempName?: string;
  editingHeaderTempType?: "context" | "main" | "instruction";
};

// Represents a complete prompt with multiple sections.
export type Prompt = {
  id: number;
  num: number;
  name: string;
  sections: Section[];
};

// ----- INITIAL DATA -----
/** 
 * The base folder is initialized with an empty "Components" folder.
 */
const initialTreeData: FolderType[] = [
  {
    id: 1,
    name: "Components",
    type: "folder",
    children: [],
  },
];

/**
 * Initial section used when creating a new prompt.
 */
const initialSections: Section[] = [
  {
    id: Date.now(),
    name: "Section 1",
    content: "",
    type: "main",
    open: true,
    dirty: false,
    editingHeader: false,
  },
];

// Constant for indent threshold (used for drop indicator offsets)
const INDENT = 20;

// ----- HELPER FUNCTIONS (PURE UTILS) -----

/**
 * Parses loaded JSON data from file input or drop.
 * Returns an array of FolderType or ComponentType items.
 */
const parseLoadedData = (data: any): (FolderType | ComponentType)[] => {
  let newChildren: (FolderType | ComponentType)[] = [];
  if (Array.isArray(data)) {
    newChildren = data;
  } else if (data.type === "folder" && data.children) {
    newChildren = data.children;
  }
  console.assert(newChildren.length > 0, "Parsed data is empty");
  return newChildren;
};

/**
 * Recursively updates the folder with a given folderId using the updater callback.
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

// ----- SIDEBAR COMPONENT -----
// Manages the tree of folders and components including drag–drop, JSON file load/save, and modals.
type SidebarProps = {
  treeData: FolderType[];
  setTreeData: React.Dispatch<React.SetStateAction<FolderType[]>>;
};

const Sidebar: React.FC<SidebarProps> = ({ treeData, setTreeData }) => {
  // ----- STATE VARIABLES FOR UI INTERACTIONS -----
  const [collapsed, setCollapsed] = useState<{ [key: number]: boolean }>({});
  const [editingFolderId, setEditingFolderId] = useState<number | null>(null);
  const [newFolderName, setNewFolderName] = useState<string>("");
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<"add" | "edit" | null>(null);
  const [modalFolderId, setModalFolderId] = useState<number | null>(null);
  const [modalComponent, setModalComponent] = useState<ComponentType | null>(null);
  const [modalName, setModalName] = useState<string>("");
  const [modalType, setModalType] = useState<"context" | "main" | "instruction">("context");
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

  // File input ref for load JSON.
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ----- EFFECTS -----

  // Close any open menu when clicking elsewhere.
  useEffect(() => {
    const handleDocumentClick = () => setOpenMenu(null);
    document.addEventListener("click", handleDocumentClick);
    return () => document.removeEventListener("click", handleDocumentClick);
  }, []);

  // Initialize collapsed state for folders (except the base folder).
  useEffect(() => {
    const initializeCollapsedState = (nodes: TreeNode[], collapsedState: { [key: number]: boolean } = {}) => {
      nodes.forEach((node) => {
        if (node.type === "folder" && node.id !== 1) {
          collapsedState[node.id] = true;
        }
        if (node.type === "folder" && node.children) {
          initializeCollapsedState(node.children, collapsedState);
        }
      });
      return collapsedState;
    };
    setCollapsed(initializeCollapsedState(treeData));
  }, [treeData]);

  // ----- FILE LOAD / SAVE FUNCTIONS -----

  /**
   * Handles file input changes (loading a JSON file) and updates the tree data.
   */
  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/json") {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          const newChildren = parseLoadedData(data);
          // Append new children to the base folder (id: 1)
          setTreeData((prev) =>
            prev.map((node) =>
              node.id === 1 && node.type === "folder"
                ? { ...node, children: [...node.children, ...newChildren] }
                : node
            )
          );
          console.log("JSON file loaded successfully.");
        } catch (err) {
          console.error("Error parsing JSON file", err);
        }
      };
      reader.readAsText(file);
    } else {
      console.error("Unsupported file type. Please select a JSON file.");
    }
  };

  /**
   * Handles file drop events (drag–drop a JSON file) and updates the tree data.
   */
  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === "application/json") {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target?.result as string);
            const newChildren = parseLoadedData(data);
            setTreeData((prev) =>
              prev.map((node) =>
                node.id === 1 && node.type === "folder"
                  ? { ...node, children: [...node.children, ...newChildren] }
                  : node
              )
            );
            console.log("JSON file dropped and loaded successfully.");
          } catch (err) {
            console.error("Error parsing dropped JSON file", err);
          }
        };
        reader.readAsText(file);
      } else {
        console.error("Dropped file is not a JSON file.");
      }
    }
  };

  /**
   * Saves the base folder (id: 1) to a JSON file and triggers a download.
   */
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

  // ----- MODAL FUNCTIONS -----

  /**
   * Opens the modal for adding a new component to the specified folder.
   */
  const openAddComponentModal = (folderId: number) => {
    setModalMode("add");
    setModalFolderId(folderId);
    setModalName("");
    setModalType("context");
    setModalContent("");
    setModalOpen(true);
  };

  /**
   * Opens the modal for editing an existing component.
   */
  const openEditComponentModal = (comp: ComponentType) => {
    setModalMode("edit");
    setModalComponent(comp);
    setModalName(comp.name);
    setModalType(comp.componentType);
    setModalContent(comp.content);
    setModalOpen(true);
  };

  /**
   * Closes the modal and resets modal-related state.
   */
  const closeModal = () => {
    setModalOpen(false);
    setModalMode(null);
    setModalFolderId(null);
    setModalComponent(null);
  };

  /**
   * Submits the modal form (either adding a new component or editing an existing one)
   * and updates the tree data accordingly.
   */
  const submitModal = () => {
    if (modalMode === "add" && modalFolderId !== null) {
      const newComp: ComponentType = {
        id: Date.now(),
        name: modalName,
        type: "component",
        content: modalContent,
        componentType: modalType,
      };
      // Recursively add the new component to the designated folder.
      const addComponent = (nodes: FolderType[]): FolderType[] => {
        return nodes.map((node) => {
          if (node.id === modalFolderId && node.type === "folder") {
            return { ...node, children: [...node.children, newComp] };
          }
          if (node.children) {
            return { ...node, children: addComponent(node.children as FolderType[]) };
          }
          return node;
        });
      };
      setTreeData(addComponent(treeData));
      console.log("Component added:", newComp);
    } else if (modalMode === "edit" && modalComponent) {
      const updatedComp: ComponentType = {
        ...modalComponent,
        name: modalName,
        content: modalContent,
        componentType: modalType,
      };
      // Recursively update the matching component in the tree.
      const updateComponent = (nodes: TreeNode[]): TreeNode[] => {
        return nodes.map((node) => {
          if (node.type === "component" && node.id === updatedComp.id) {
            return updatedComp;
          } else if (node.type === "folder" && node.children) {
            return { ...node, children: updateComponent(node.children) };
          }
          return node;
        });
      };
      setTreeData(updateComponent(treeData) as FolderType[]);
      console.log("Component updated:", updatedComp);
    }
    closeModal();
  };

  // ----- FOLDER MANAGEMENT FUNCTIONS -----

  /**
   * Toggles the collapse state for a given folder.
   */
  const toggleCollapse = (id: number) =>
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));

  /**
   * Initiates folder editing (to add a sub-folder).
   */
  const startEditing = (parentId: number) => {
    setEditingFolderId(parentId);
    setNewFolderName("");
  };

  /**
   * Saves a new folder under the folder with the specified parentId.
   */
  const saveFolder = (parentId: number) => {
    if (!newFolderName.trim()) return;
    const newFolder: FolderType = {
      id: Date.now(),
      name: newFolderName,
      type: "folder",
      children: [],
    };
    // Use helper to update the folder tree recursively.
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

  /**
   * Cancels folder editing.
   */
  const cancelEditing = () => {
    setEditingFolderId(null);
    setNewFolderName("");
  };

  /**
   * Deletes a folder (except the base folder) from the tree.
   */
  const deleteFolder = (folderId: number) => {
    if (folderId === 1) return;
    const removeFolderFromNodes = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.reduce<TreeNode[]>((acc, node) => {
        if (node.type === "folder") {
          if (node.id === folderId) return acc;
          const updatedChildren = removeFolderFromNodes(node.children);
          acc.push({ ...node, children: updatedChildren });
        } else {
          acc.push(node);
        }
        return acc;
      }, []);
    };
    const newData = removeFolderFromNodes(treeData);
    setTreeData(newData as FolderType[]);
    console.log("Folder deleted, id:", folderId);
  };

  /**
   * Deletes a component from the tree.
   */
  const deleteComponent = (componentId: number) => {
    const removeComponentFromNodes = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.reduce<TreeNode[]>((acc, node) => {
        if (node.type === "component") {
          if (node.id === componentId) return acc;
          acc.push(node);
        } else if (node.type === "folder") {
          const updatedChildren = removeComponentFromNodes(node.children);
          acc.push({ ...node, children: updatedChildren });
        }
        return acc;
      }, []);
    };
    const newData = removeComponentFromNodes(treeData);
    setTreeData(newData as FolderType[]);
    console.log("Component deleted, id:", componentId);
  };

  // ----- DRAG–DROP HELPER FUNCTIONS -----

  /**
   * Checks recursively whether a node is a descendant of a given parent.
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
   * Inserts a node at a target location in the tree based on a given position.
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
   * Removes a node (by id) from the tree and returns the new tree along with the removed node.
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
   * Moves a node (dragged) to a new location relative to a target node.
   */
  const moveNode = (
    dragged: TreeNode,
    target: TreeNode,
    position: "above" | "below" | "inside" | "inside-bottom"
  ) => {
    // Prevent moving a folder into itself or one of its descendants.
    if (
      dragged.id === target.id ||
      (dragged.type === "folder" && isDescendant(dragged, target))
    ) {
      console.warn("Invalid move: Cannot move a node into itself or its descendant.");
      return;
    }
    let newTree = [...treeData];
    const removalResult = removeNode(newTree, dragged.id);
    newTree = removalResult.newNodes as FolderType[];
    newTree = insertNode(newTree, target.id, dragged, position) as FolderType[];
    setTreeData(newTree);
    console.log(`Moved node ${dragged.id} to ${position} of node ${target.id}`);
  };

  // ----- RENDER TREE (FOLDER / COMPONENT DISPLAY) -----

  /**
   * Recursively renders the tree structure (folders and components)
   * with support for drag–drop indicators.
   */
  const renderTree = (nodes: TreeNode[], depth: number = 0, parentNode?: FolderType): JSX.Element => (
    <ul
      style={{ paddingLeft: `${depth * 0.9375}rem` }}
      onDragOver={(e) => {
        // Handle drag–over on an entire list (parent drop zone)
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
          const newNodes = [...nodes];
          const removalResult = removeNode(newNodes, draggedNode.id);
          const updatedNodes = removalResult.newNodes;
          updatedNodes.splice(dropIndicator.targetIndex!, 0, draggedNode);
          // Update parent's children
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
            // For folder targets, check if the mouse is over the folder header.
            if (node.type === "folder") {
              const headerEl = e.currentTarget.querySelector(".folder-header-container");
              if (headerEl) {
                const headerRect = headerEl.getBoundingClientRect();
                if (e.clientY < headerRect.bottom) {
                  let dropY = headerRect.bottom;
                  let dropX = rect.left + INDENT; // indent for folder children
                  if (!collapsed[node.id]) { // folder is open
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
            // For component nodes, allow indicator only above or below.
            const offsetY = e.clientY - rect.top;
            let pos: "above" | "below" = offsetY < rect.height / 2 ? "above" : "below";
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
            // If dropping on a folder header, force "inside-bottom"
            if (node.type === "folder" && dropIndicator && dropIndicator.position === "inside-bottom") {
              moveNode(draggedNode, node, "inside-bottom");
            } else if (dropIndicator && !dropIndicator.effectiveParent) {
              moveNode(draggedNode, node, dropIndicator.position);
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
                  {collapsed[node.id] ? (
                    <FolderIcon fontSize="inherit" />
                  ) : (
                    <FolderOpenIcon fontSize="inherit" />
                  )}{" "}
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
                  {collapsed[node.id] ? (
                    <FolderIcon fontSize="inherit" />
                  ) : (
                    <FolderOpenIcon fontSize="inherit" />
                  )}
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
                {node.componentType === "context" && (
                  <div className="icon context-icon">
                    <LibraryBooksIcon />
                  </div>
                )}
                {node.componentType === "main" && (
                  <div className="icon main-icon">
                    <AbcIcon />
                  </div>
                )}
                {node.componentType === "instruction" && (
                  <div className="icon instruction-icon">
                    <FormatListBulletedIcon />
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
      <div
        id="sidebar-container"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleFileDrop}
      >
        <h1>Prompt Builder</h1>
        <div className="tree">{renderTree(treeData)}</div>
        {modalOpen && (
          <div
            className="modal-overlay"
            onClick={(e) => {
              if ((e.target as HTMLElement).classList.contains("modal-overlay"))
                closeModal();
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
                    setModalType(e.target.value as "context" | "main" | "instruction")
                  }
                >
                  <option value="context">context</option>
                  <option value="main">main</option>
                  <option value="instruction">instruction</option>
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
        )}
      </div>
      <div className="file-controls">
        <button
          className="load-json-btn"
          onClick={() => fileInputRef.current?.click()}
        >
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

// ----- MAIN APP COMPONENT -----
// Manages multiple prompts and displays the prompt editor with sections.
// Also handles saving and loading of tree data and prompts from chrome storage.
const App: React.FC = () => {
  const [treeData, setTreeData] = useState<FolderType[]>(initialTreeData);

  // Initialize prompts with one prompt containing the initial sections.
  const initialPromptId = Date.now();
  const [prompts, setPrompts] = useState<Prompt[]>([
    { id: initialPromptId, num: 1, name: "Prompt 1", sections: initialSections },
  ]);
  // activePromptId tracks which prompt is being edited
  const [activePromptId, setActivePromptId] = useState<number>(initialPromptId);
  // dropSectionIndex for drag–drop section reordering
  const [dropSectionIndex, setDropSectionIndex] = useState<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<number, HTMLTextAreaElement>>({});
  const sectionNameInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  // Get the currently active prompt.
  const activePrompt = prompts.find((p) => p.id === activePromptId) || { sections: [] };

  /**
   * Updates the active prompt's sections in the overall prompts state.
   */
  const updateActivePromptSections = (newSections: Section[]) => {
    setPrompts((prev) =>
      prev.map((p) => (p.id === activePromptId ? { ...p, sections: newSections } : p))
    );
  };

  // ----- CHROME STORAGE: LOAD AND SAVE -----

  // Load treeData and prompts from chrome storage.
  useEffect(() => {
    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.local.get(["treeData", "prompts"], (result) => {
        if (result.treeData) {
          setTreeData(result.treeData);
        }
        if (result.prompts) {
          setPrompts(result.prompts);
          setActivePromptId(result.prompts[0]?.id || null);
        }
      });
    }
  }, []);

  // Save treeData and prompts to chrome storage whenever they change.
  useEffect(() => {
    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.local.set({ treeData, prompts });
    }
  }, [treeData, prompts]);

  // ----- EFFECT: Adjust textarea heights on section changes -----
  useEffect(() => {
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

  // ----- SECTION MANAGEMENT FUNCTIONS -----

  /**
   * Adds a new section after the given index. Optionally focuses the new section header.
   */
  const addSection = (afterIndex: number, focusNew: boolean = false) => {
    const newSection: Section = {
      id: Date.now(),
      name: "",
      content: "",
      type: "main",
      open: true,
      dirty: false,
      editingHeader: true,
      editingHeaderTempName: "",
      editingHeaderTempType: "main",
    };
    const newArr = [...activePrompt.sections];
    newArr.splice(afterIndex + 1, 0, newSection);
    updateActivePromptSections(newArr);
    console.log("New section added:", newSection);
    setTimeout(() => {
      if (focusNew && sectionNameInputRefs.current[newSection.id]) {
        sectionNameInputRefs.current[newSection.id]?.focus();
      }
    }, 0);
  };

  /**
   * Toggles a section's open/closed state.
   */
  const toggleSection = (sectionId: number) => {
    const newSections = activePrompt.sections.map((sec) =>
      sec.id === sectionId ? { ...sec, open: !sec.open } : sec
    );
    updateActivePromptSections(newSections);
  };

  /**
   * Updates a section's content and marks it as dirty if it no longer matches its linked component.
   */
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

  /**
   * Updates a section's header (name and type) and ends editing mode.
   */
  const updateSectionHeader = (
    sectionId: number,
    newName: string,
    newType: "context" | "main" | "instruction"
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

  /**
   * Begins header editing mode for a section.
   */
  const startHeaderEdit = (section: Section) => {
    const newSections = activePrompt.sections.map((s) =>
      s.id === section.id
        ? { ...s, editingHeader: true, editingHeaderTempName: s.name, editingHeaderTempType: s.type }
        : s
    );
    updateActivePromptSections(newSections);
  };

  /**
   * Cancels header editing for a section.
   */
  const cancelHeaderEdit = (sectionId: number) => {
    const newSections = activePrompt.sections.map((s) =>
      s.id === sectionId
        ? { ...s, editingHeader: false, editingHeaderTempName: undefined, editingHeaderTempType: undefined }
        : s
    );
    updateActivePromptSections(newSections);
  };

  /**
   * Commits header editing changes for a section.
   */
  const commitHeaderEdit = (section: Section) => {
    const newName = section.editingHeaderTempName ?? section.name;
    const newType = section.editingHeaderTempType ?? section.type;
    updateSectionHeader(section.id, newName, newType);
  };

  /**
   * Handles key down events within a section's textarea.
   * On Enter (without Shift) at the end of text, a new section is added.
   */
  const handleSectionKeyDown = (
    e: KeyboardEvent<HTMLTextAreaElement>,
    section: Section,
    index: number
  ) => {
    if (e.key === "Enter") {
      if (e.shiftKey) {
        return;
      } else {
        e.preventDefault();
        const target = e.currentTarget;
        if (target.selectionStart === target.value.length) {
          const newVal = target.value;
          updateSectionContent(section.id, newVal);
          addSection(index, true);
        }
      }
    }
  };

  /**
   * Determines the insertion index for drag–drop reordering by inspecting section container positions.
   */
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

  /**
   * Handles dropping a component into the prompt editor.
   * Creates a new section from the dropped component.
   */
  const handleWrapperDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!wrapperRef.current) return;
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

  /**
   * Saves changes in a section back to its linked component.
   */
  const handleSaveSection = (section: Section) => {
    if (!section.linkedComponentId) return;
    const newContent = section.content;
    const updateComponent = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.map((node) => {
        if (node.type === "component" && node.id === section.linkedComponentId) {
          return { ...node, content: newContent };
        } else if (node.type === "folder" && node.children) {
          return { ...node, children: updateComponent(node.children) };
        }
        return node;
      });
    };
    setTreeData((prev) => updateComponent(prev) as FolderType[]);
    const newSections = activePrompt.sections.map((sec) =>
      sec.id === section.id ? { ...sec, originalContent: newContent, dirty: false } : sec
    );
    updateActivePromptSections(newSections);
    console.log("Section saved and component updated, section id:", section.id);
  };

  /**
   * Returns a color based on the section type.
   */
  const getColor = (t: "context" | "main" | "instruction") => {
    if (t === "context") return "#2196f3";
    if (t === "main") return "#4caf50";
    if (t === "instruction") return "#ff9800";
    return "#000";
  };

  /**
   * Copies the compiled prompt (all section contents joined) to the clipboard.
   */
  const handleCopy = () => {
    const compiledPrompt = activePrompt.sections.map((sec) => sec.content).join("\n\n");
    navigator.clipboard.writeText(compiledPrompt)
      .then(() => console.log("Prompt copied to clipboard."))
      .catch((err) => console.error("Failed to copy prompt: ", err));
  };

  /**
   * Creates a new prompt, switches to it, and ensures that only the most recent prompts are kept.
   */
  const handleNewPrompt = () => {
    const newPrompt: Prompt = {
      id: Date.now(),
      num: prompts[prompts.length - 1].num + 1,
      name: `Prompt ${prompts[prompts.length - 1].num + 1}`,
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

  /**
   * Switches the active prompt for editing.
   */
  const handleSwitchPrompt = (promptId: number) => {
    setActivePromptId(promptId);
    console.log("Switched to prompt:", promptId);
  };

  // ----- MAIN APP RENDER -----
  return (
    <main>
      <section id="side-bar">
        <Sidebar treeData={treeData} setTreeData={setTreeData} />
      </section>
      <section id="content">
        {/* Prompt Tabs */}
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
                    const rect = containers[dropSectionIndex - 1].getBoundingClientRect();
                    const wrapperRect = wrapperRef.current.getBoundingClientRect();
                    return rect.bottom - wrapperRect.top;
                  }
                  return 0;
                })(),
              }}
            >
              <button
                className="hover-add-btn"
                onClick={() => addSection(dropSectionIndex!, true)}
              >
                +
              </button>
            </div>
          )}
          {activePrompt.sections.map((sec, index) => (
            <div className="section-container" key={sec.id}>
              {sec.linkedComponentId && (
                <div
                  className="section-marker"
                  style={{ backgroundColor: getColor(sec.type) }}
                ></div>
              )}
              <div className="section-header">
                <button
                  className="accordion-toggle"
                  onClick={() => toggleSection(sec.id)}
                >
                  {sec.open ? (
                    <ExpandLessIcon fontSize="inherit" />
                  ) : (
                    <ExpandMoreIcon fontSize="inherit" />
                  )}
                </button>
                {sec.editingHeader ? (
                  <div className="section-header-edit-container">
                    <input
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
                            sectionRefs.current[sec.id]?.focus();
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
                              ? { ...s, editingHeaderTempType: e.target.value as "context" | "main" | "instruction" }
                              : s
                          )
                        )
                      }
                    >
                      <option value="context">context</option>
                      <option value="main">main</option>
                      <option value="instruction">instruction</option>
                    </select>
                  </div>
                ) : (
                  <span
                    className="section-header-text"
                    onClick={(e) => {
                      e.stopPropagation();
                      startHeaderEdit(sec);
                    }}
                  >
                    {sec.name || "Unnamed"} • {sec.type}
                  </span>
                )}
                {sec.linkedComponentId && sec.dirty && (
                  <button
                    className="section-save-btn"
                    onClick={() => handleSaveSection(sec)}
                  >
                    Save
                  </button>
                )}
                <button
                  className="section-delete-btn"
                  onClick={() =>
                    updateActivePromptSections(
                      activePrompt.sections.filter((s) => s.id !== sec.id)
                    )
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
                  onInput={(e) => {
                    const ta = e.currentTarget;
                    ta.style.height = "auto";
                    ta.style.height = ta.scrollHeight + "px";
                  }}
                ></textarea>
              )}
            </div>
          ))}
        </div>
        <div className="copy-button-container">
          <div className="left">
            <button className="copy-btn" onClick={handleCopy}>Copy</button>
            <button className="new-section-btn" onClick={() => addSection(activePrompt.sections.length - 1, true)}>New Section</button>
          </div>
          <button className="new-prompt-btn" onClick={handleNewPrompt}>New Prompt</button>
        </div>
      </section>
    </main>
  );
};

export default App;
