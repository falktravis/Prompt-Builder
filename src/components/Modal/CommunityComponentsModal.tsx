/**
 * CommunityComponentsModal.tsx
 * Modal for browsing and importing components from a shared library.
 * Fetches all library file contents upfront and displays a tree view in collapsed headers.
 * Component content expands inline within the header tree view.
 */
import React, { useState, useEffect, useCallback } from 'react';
import ModalBase from './ModalBase';
import SimpleTreeView from './SimpleTreeView';
import { useAppContext } from '../../contexts/AppContext';
import { useTreeContext } from '../../contexts/TreeContext';
import { FolderType, TreeNode } from '../../types';
import { mergeTreeData } from '../../utils/treeUtils';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

// Helper function to get resource URL
const getResourceURL = (relativePath: string): string => {
  if (chrome && chrome.runtime && chrome.runtime.getURL) {
    try {
      return chrome.runtime.getURL(relativePath);
    } catch (e) {
      // Fallback for environments where chrome.runtime.getURL exists but throws (e.g., some test environments)
      console.warn("chrome.runtime.getURL failed, falling back to relative path:", e);
      return `/${relativePath}`;
    }
  } 
  // Fallback for development environment or when chrome API is not available
  return `/${relativePath}`;
};

interface LibraryFile {
  name: string;
  content: FolderType[] | null; // Expecting an array of folders, usually one root "Components" folder
  error: string | null;
  isLoading: boolean;
  importStatus: 'idle' | 'importing' | 'imported' | 'error';
}

const CommunityComponentsModal: React.FC = () => {
  const { isCommunityModalOpen, setCommunityModalOpen } = useAppContext();
  const { treeData, setTreeData } = useTreeContext();
  const [libraryFiles, setLibraryFiles] = useState<LibraryFile[]>([]);
  const [manifestError, setManifestError] = useState<string | null>(null);

  // Simplified parser for library files (array of FolderType)
  const parseLibraryFileData = (data: any): FolderType[] => {
    if (Array.isArray(data)) {
      // Basic validation: check if it looks like an array of FolderType
      const isValid = data.every(
        (item) => item && typeof item === 'object' && item.type === 'folder' && item.name && Array.isArray(item.children)
      );
      if (isValid) {
        return data as FolderType[];
      }
    }
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
        // Fetch content if not already loaded (should ideally be loaded on expand)
        const fileUrl = getResourceURL(`library/${fileName}`);
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error(`Failed to fetch ${fileName} for import.`);
        const data = await response.json();
        contentToImport = parseLibraryFileData(data);
      }

      if (!contentToImport) {
        throw new Error('File content is not available for import.');
      }

      setTreeData(currentTreeData => {
        let maxExistingId = 0;
        const findMaxId = (nodes: TreeNode[]): void => {
          for (const node of nodes) {
            maxExistingId = Math.max(maxExistingId, node.id);
            if (node.type === 'folder') {
              findMaxId(node.children);
            }
          }
        };
        findMaxId(currentTreeData);

        let nextIdCounter = Math.max(Date.now(), maxExistingId + 1);
        const generateId = (): number => {
          const newId = nextIdCounter;
          nextIdCounter += 1;
          return newId;
        };
        return mergeTreeData(currentTreeData, contentToImport as FolderType[], generateId);
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
