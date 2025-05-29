"use client";

/**
 * CommunityComponentsModal.tsx
 * Modal for browsing and importing components from a shared library.
 * Fetches all library file contents upfront and displays a tree view in collapsed headers.
 * Component content expands inline within the header tree view.
 */
import React, { useState, useEffect, useCallback } from 'react';
import ModalBase from './ModalBase';
import SimpleTreeView from './SimpleTreeView';
import { useAppContext } from '@/contexts/AppContext';
import { useTreeContext } from '@/contexts/TreeContext';
import { FolderType, ComponentType } from '@/types'; // Removed TreeNode
import { mergeTreeData } from '@/utils/treeUtils';
import { v4 as uuidv4 } from 'uuid'; // Added for generating string IDs
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

// Define getResourceURL for Next.js environment
const getResourceURL = (path: string) => `/${path}`;

interface LibraryFile {
  name: string;
  content: FolderType[] | null; // Expecting an array of folders, usually one root "Components" folder
  error: string | null;
  isLoading: boolean;
  importStatus: 'idle' | 'importing' | 'imported' | 'error';
}

const CommunityComponentsModal: React.FC = () => {
  const { isCommunityModalOpen, setCommunityModalOpen } = useAppContext();
  const { treeData, setTreeData } = useTreeContext(); // treeData is FolderType[]
  const [libraryFiles, setLibraryFiles] = useState<LibraryFile[]>([]);
  const [manifestError, setManifestError] = useState<string | null>(null);

  const validComponentTypes = ["instruction", "role", "context", "format", "style"];

  // Helper function to assign new UUIDs to library nodes
  const processNodeForLibrary = (node: any): FolderType | ComponentType => {
    if (!node || typeof node !== 'object' || !node.type || typeof node.name !== 'string') {
      console.error(`[CommunityModal|processNodeForLibrary] Invalid node structure. Node data:`, node);
      const name = (node && typeof node.name === 'string') ? node.name : 'Unnamed Node';
      throw new Error(`Invalid node structure for "${name}": Missing type, or node is not an object.`);
    }

    const newId = uuidv4();

    if (node.type === 'folder') {
      if (!Array.isArray(node.children)) {
        node.children = [];
      }
      return {
        id: newId,
        name: node.name,
        type: "folder",
        children: node.children.map((child: any) => processNodeForLibrary(child)),
      } as FolderType;
    } else if (node.type === 'component') {
      const content = typeof node.content === 'string' ? node.content : "";
      let componentType = node.componentType;
      if (!validComponentTypes.includes(componentType)) {
        componentType = "context";
      }
      return {
        id: newId,
        name: node.name,
        type: "component",
        content: content,
        componentType: componentType,
      } as ComponentType;
    } else {
      console.error(`[CommunityModal|processNodeForLibrary] Unknown node type: "${node.type}" for node "${node.name}"`);
      throw new Error(`Unknown node type: "${node.type}" for node "${node.name}"`);
    }
  };

  // Updated parser for library files to assign string UUIDs
  const parseLibraryFileData = (data: any): FolderType[] => {
    if (Array.isArray(data)) {
      try {
        // Process each root node (expected to be a folder)
        return data.map(item => processNodeForLibrary(item) as FolderType);
      } catch (error) {
        console.error('[CommunityModal|parseLibraryFileData] Error processing library data:', error);
        throw new Error(`Failed to parse library file: ${(error as Error).message}`);
      }
    }
    console.error('[CommunityModal|parseLibraryFileData] Invalid library file format. Expected an array. Data:', data);
    throw new Error('Invalid library file format. Expected an array of folders.');
  };

  useEffect(() => {
    if (isCommunityModalOpen) {
      const fetchManifestAndContents = async () => {
        try {
          const manifestUrl = getResourceURL('library/library-manifest.json');
          const response = await fetch(manifestUrl);
          if (!response.ok) {
            throw new Error(`Failed to load library manifest: ${response.statusText}`);
          }
          const fileNames = await response.json();
          if (!Array.isArray(fileNames)) {
            throw new Error('Library manifest is not a valid JSON array.');
          }
          // Initialize files with isLoading true for content fetching
          const initialFiles = fileNames.map(name => ({
            name,
            content: null,
            error: null,
            isLoading: true, // Set to true initially as we will fetch content immediately
            importStatus: 'idle' as 'idle' | 'importing' | 'imported' | 'error',
          }));
          setLibraryFiles(initialFiles);
          setManifestError(null);

          // Fetch content for all files
          fileNames.forEach(fileName => {
            fetchLibraryFileContent(fileName, true); // Pass a flag to indicate initial mass fetch
          });

        } catch (err) {
          console.error('Error fetching library manifest or initial contents:', err);
          setManifestError((err as Error).message);
          setLibraryFiles([]);
        }
      };
      fetchManifestAndContents();
    }
  }, [isCommunityModalOpen]);

  const fetchLibraryFileContent = useCallback(async (fileName: string, isInitialFetch: boolean = false) => {
    // If not an initial fetch, set loading state for just this file.
    // For initial fetches, loading state is set in fetchManifestAndContents.
    if (!isInitialFetch) {
      setLibraryFiles(prevFiles =>
        prevFiles.map(f => (f.name === fileName ? { ...f, isLoading: true, error: null } : f))
      );
    }
    try {
      const fileUrl = getResourceURL(`library/${fileName}`);
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`Failed to load library file ${fileName}: ${response.statusText}`);
      }
      const data = await response.json();
      const parsedContent = parseLibraryFileData(data);
      setLibraryFiles(prevFiles =>
        prevFiles.map(f => (f.name === fileName ? { ...f, content: parsedContent, isLoading: false } : f))
      );
    } catch (err) {
      console.error(`Error fetching file ${fileName}:`, err);
      setLibraryFiles(prevFiles =>
        prevFiles.map(f => (f.name === fileName ? { ...f, error: (err as Error).message, isLoading: false } : f))
      );
    }
  }, []);

  const handleImport = useCallback(async (fileName: string) => {
    const fileToImport = libraryFiles.find(f => f.name === fileName);
    if (!fileToImport) return;

    setLibraryFiles(prevFiles =>
      prevFiles.map(f => (f.name === fileName ? { ...f, importStatus: 'importing' } : f))
    );

    try {
      let contentToImport = fileToImport.content;
      if (!contentToImport) {
        // Fetch content if not already loaded
        const fileUrl = getResourceURL(`library/${fileName}`);
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error(`Failed to fetch ${fileName} for import.`);
        const data = await response.json();
        // Ensure fetched data is also processed for correct IDs
        contentToImport = parseLibraryFileData(data);
      }

      if (!contentToImport) {
        throw new Error('File content is not available for import.');
      }

      // contentToImport should now have string UUIDs from parseLibraryFileData
      setTreeData(currentTreeData => {
        // Numeric ID generation logic (maxExistingId, findMaxId, nextIdCounter, generateId) is removed.
        // contentToImport (FolderType[]) already has string UUIDs.
        // Pass uuidv4 to mergeTreeData for any new structural nodes it might create.
        return mergeTreeData(currentTreeData, contentToImport, uuidv4);
      });

      setLibraryFiles(prevFiles =>
        prevFiles.map(f => (f.name === fileName ? { ...f, importStatus: 'imported' } : f))
      );
      setTimeout(() => {
        setLibraryFiles(prevFiles =>
          prevFiles.map(f => (f.name === fileName && f.importStatus === 'imported' ? { ...f, importStatus: 'idle' } : f))
        );
      }, 3000); // Revert status after 3 seconds

    } catch (err) {
      console.error(`Error importing file ${fileName}:`, err);
      setLibraryFiles(prevFiles =>
        prevFiles.map(f => (f.name === fileName ? { ...f, importStatus: 'error', error: (err as Error).message } : f))
      );
    }
  }, [libraryFiles, setTreeData, treeData]);

  return (
    <ModalBase
      isOpen={isCommunityModalOpen}
      onClose={() => setCommunityModalOpen(false)}
      title="Community Components Library"
      className="community-components-modal"
    >
      {manifestError && <div className="manifest-error">Error loading library: {manifestError}</div>}
      {!manifestError && libraryFiles.length === 0 && <div>Loading library...</div>}
      
      <div className="library-file-list">
        {libraryFiles.map(file => (
          <div key={file.name} className="library-file-item">
            <div className="file-header">
              <div className="file-header-tree-view">
                {file.isLoading && !file.content && <span>Loading tree...</span>}
                {file.error && !file.content && <span>Error loading tree.</span>}
                {file.content && file.content[0] && (
                  <SimpleTreeView 
                    nodes={file.content[0].children || []} 
                  />
                )}
                {!file.isLoading && !file.error && !file.content && <span>Empty or unavailable.</span>}
              </div>
              <div className="file-actions">
                <button 
                  className={`import-button ${file.importStatus}`}
                  onClick={(e) => { 
                    e.stopPropagation(); // Prevent header click when button is clicked
                    handleImport(file.name); 
                  }}
                  disabled={file.importStatus === 'importing' || file.importStatus === 'imported'}
                >
                  {file.importStatus === 'idle' && 'Import'}
                  {file.importStatus === 'importing' && <><HourglassEmptyIcon fontSize="small"/> Importing...</>}
                  {file.importStatus === 'imported' && <><CheckCircleIcon fontSize="small"/> Imported</>}
                  {file.importStatus === 'error' && <><ErrorOutlineIcon fontSize="small"/> Error</>}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ModalBase>
  );
};

export default CommunityComponentsModal;
