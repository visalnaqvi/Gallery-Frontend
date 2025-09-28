'use client';

import React, { useState, useEffect } from 'react';
import { Folder, X, Upload, Clock, ImageIcon, ChevronRight, ArrowLeft, Search, RefreshCw, Copy, CheckCircle, AlertTriangle } from 'lucide-react';
import { useSession } from "next-auth/react";

interface DriveFile {
    id: string;
    name: string;
    mimeType: string;
    thumbnailLink?: string;
    iconLink?: string;
    size?: string;
    parents?: string[];
}

interface DriveFolder {
    id: string;
    name: string;
    imageCount: number;
    totalFiles?: number;
    hasSubfolders: boolean;
    imageCountTruncated?: string;
    parents?: string[];
}

interface FolderPath {
    id: string;
    name: string;
}

interface DriveImportProps {
    groupId: string | null;
    userId: string;
    onImportStart: () => void;
    onImportComplete: () => void;
}

// Cache interface
interface FolderCache {
    [key: string]: {
        folders: DriveFolder[];
        timestamp: number;
    };
}

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function DriveImport({ groupId, userId, onImportStart, onImportComplete }: DriveImportProps) {
    const [folders, setFolders] = useState<DriveFolder[]>([]);
    const [selectedFolders, setSelectedFolders] = useState<DriveFolder[]>([]);
    const [selectedFolderImages, setSelectedFolderImages] = useState<DriveFile[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [currentPath, setCurrentPath] = useState<FolderPath[]>([{ id: 'root', name: 'Shared with Me' }]);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState<string | null>(null);
    const { data: session } = useSession();
    const [count, setCount] = useState<number>(0);
    const [checkCountLoading, setCheckCountLoading] = useState(false);
    const [importingFolderIds, setImportingFolderIds] = useState<string[]>([]);
    const [showInstructions, setShowInstructions] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    const [stoppingImportIds, setStoppingImportIds] = useState<string[]>([]);
    // Cache for folder data
    const [folderCache, setFolderCache] = useState<FolderCache>({});

    const serviceAccountEmail = "snapper@buttons-2dc4a.iam.gserviceaccount.com";

    async function fetchCount() {
        try {
            setCheckCountLoading(true);
            const res = await fetch("/api/get-importing-groups", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ groupId }),
            });

            const data = await res.json();
            if (res.ok) {
                setCount(data.count);
                // Use folderIds from the updated API response
                setImportingFolderIds(data.folderIds || []);
            } else {
                console.error("Error:", data.error);
            }
        } catch (err) {
            console.error("Request failed:", err);
        } finally {
            setCheckCountLoading(false);
        }
    }

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(serviceAccountEmail);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (err) {
            console.error('Failed to copy: ', err);
        }
    };

    const fetchFolders = async (parentId: string = 'root') => {
        if (!session?.user?.email) {
            setError('Please sign in to access shared folders');
            return;
        }

        // Check cache first
        const cacheKey = parentId;
        const cachedData = folderCache[cacheKey];

        if (cachedData && Date.now() - cachedData.timestamp < 5 * 60 * 1000) { // 5 minutes cache
            setFolders(cachedData.folders);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            let url = '/api/drive-service?action=list-folders';

            if (parentId !== 'root') {
                url = `/api/drive-service?action=get-folder-contents&folderId=${parentId}&type=folders`;
            }

            const response = await fetch(url);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch folders');
            }

            const data = await response.json();

            let processedFolders: DriveFolder[];

            if (parentId === 'root') {
                // Sort folders by image count (descending) then by name
                processedFolders = data.folders.sort((a: DriveFolder, b: DriveFolder) => {
                    if (a.imageCount !== b.imageCount) {
                        return b.imageCount - a.imageCount;
                    }
                    return a.name.localeCompare(b.name);
                });
            } else {
                // For subfolders, we need to process them differently
                const subfolders = await Promise.all(
                    data.files.map(async (folder: any) => {
                        // Get image count and subfolder info for each folder
                        const [imageResponse, subfolderResponse] = await Promise.all([
                            fetch(`/api/drive-service?action=get-folder-contents&folderId=${folder.id}&type=images`),
                            fetch(`/api/drive-service?action=get-folder-contents&folderId=${folder.id}&type=folders`)
                        ]);

                        const imageData = imageResponse.ok ? await imageResponse.json() : { files: { count: 0, hasMore: false } };
                        const subfolderData = subfolderResponse.ok ? await subfolderResponse.json() : { files: [] };

                        // Handle the new count-only response format for images
                        const imageCount = imageData.files?.count || 0;
                        const hasMoreImages = imageData.files?.hasMore || false;

                        return {
                            id: folder.id,
                            name: folder.name,
                            imageCount: imageCount,
                            imageCountTruncated: hasMoreImages ? `${imageCount}+` : undefined,
                            hasSubfolders: subfolderData.files?.length > 0,
                            parents: folder.parents
                        };
                    })
                );

                processedFolders = subfolders.sort((a, b) => {
                    if (a.imageCount !== b.imageCount) {
                        return b.imageCount - a.imageCount;
                    }
                    return a.name.localeCompare(b.name);
                });
            }

            setFolders(processedFolders);

            // Cache the result
            setFolderCache(prev => ({
                ...prev,
                [cacheKey]: {
                    folders: processedFolders,
                    timestamp: Date.now()
                }
            }));

        } catch (error) {
            console.error('Error fetching folders:', error);
            setError(error instanceof Error ? error.message : 'Failed to fetch folders');
        } finally {
            setIsLoading(false);
        }
    };

    const refreshFolders = async () => {
        setIsRefreshing(true);

        // Clear cache on refresh
        setFolderCache({});

        // Clear selected folders on refresh
        setSelectedFolders([]);
        setSelectedFolderImages([]);

        try {
            const response = await fetch('/api/drive-service', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'refresh-folders' }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to refresh folders');
            }

            const data = await response.json();

            // Sort folders by image count (descending) then by name
            const sortedFolders = data.folders.sort((a: DriveFolder, b: DriveFolder) => {
                if (a.imageCount !== b.imageCount) {
                    return b.imageCount - a.imageCount;
                }
                return a.name.localeCompare(b.name);
            });

            setFolders(sortedFolders);

            // Cache the refreshed root data
            setFolderCache({
                'root': {
                    folders: sortedFolders,
                    timestamp: Date.now()
                }
            });

            setError(null);
            // Refresh importing folder IDs
            await fetchCount();
        } catch (error) {
            console.error('Error refreshing folders:', error);
            setError(error instanceof Error ? error.message : 'Failed to refresh folders');
        } finally {
            setIsRefreshing(false);
        }
    };

    const fetchFolderImages = async (folderId: string) => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/drive-service?action=get-folder-contents&folderId=${folderId}&type=images`);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch folder images');
            }

            const data = await response.json();
            setSelectedFolderImages(data.files || []);
        } catch (error) {
            console.error('Error fetching folder images:', error);
            setError(error instanceof Error ? error.message : 'Failed to fetch folder images');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFolderClick = async (folder: DriveFolder) => {
        // Check if folder is being imported - prevent selection
        if (importingFolderIds.includes(folder.id)) {
            return;
        }

        if (folder.hasSubfolders) {
            // Navigate into the folder
            setCurrentPath(prev => [...prev, { id: folder.id, name: folder.name }]);
            await fetchFolders(folder.id);
        } else if (folder.imageCount > 0) {
            // Toggle selection of this folder
            setSelectedFolders(prev => {
                const isSelected = prev.some(f => f.id === folder.id);
                if (isSelected) {
                    return prev.filter(f => f.id !== folder.id);
                } else {
                    return [...prev, folder];
                }
            });
        }
    };

    const navigateBack = () => {
        if (currentPath.length > 1) {
            const newPath = currentPath.slice(0, -1);
            setCurrentPath(newPath);
            setSelectedFolderImages([]);
            const parentId = newPath[newPath.length - 1].id;
            fetchFolders(parentId === 'root' ? 'root' : parentId);
        }
    };

    const removeSelectedFolder = (folderId: string) => {
        setSelectedFolders(prev => prev.filter(f => f.id !== folderId));
    };

    const clearAllSelections = () => {
        setSelectedFolders([]);
        setSelectedFolderImages([]);
    };

    const handleImport = async () => {
        if (selectedFolders.length === 0 || !groupId) return;

        setIsImporting(true);
        onImportStart();

        try {
            // Update group status
            const res = await fetch('/api/groups', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ groupId }),
            });

            if (!res.ok) {
                throw new Error('Failed to update group status');
            }

            // Send all selected folders in a single API call
            const saveResponse = await fetch("/api/save-drive-folder", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    folderIds: selectedFolders.map(folder => (folder.id)),
                    groupId,
                    userId,
                }),
            });

            if (!saveResponse.ok) {
                throw new Error(`Failed to save Drive folder information`);
            }

            await fetchCount();
            const totalImages = selectedFolders.reduce((sum, folder) => sum + folder.imageCount, 0);
            alert(`Successfully set up import for ${selectedFolders.length} folders with ${totalImages} total images. Processing will begin shortly.`);
            setSelectedFolders([]);
            setSelectedFolderImages([]);
            onImportComplete();
        } catch (error) {
            console.error('Error importing from Drive:', error);
            alert('Failed to set up Drive import. Please try again.');
        } finally {
            setIsImporting(false);
        }
    };

    useEffect(() => {
        fetchCount();
    }, [groupId]);

    useEffect(() => {
        if (session?.user?.email) {
            fetchFolders();
        }
    }, [session?.user?.email]);

    const filteredFolders = folders.filter(folder =>
        folder.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalSelectedImages = selectedFolders.reduce((sum, folder) => sum + folder.imageCount, 0);
    const handleStopImport = async (folderId: string, folderName: string) => {
        if (!groupId) return;

        // Add folder ID to stopping list
        setStoppingImportIds(prev => [...prev, folderId]);

        try {
            const response = await fetch("/api/save-drive-folder", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    folderIds: [folderId],
                    groupId,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                alert(`Successfully stopped import for folder "${folderName}"`);
                // Refresh the importing folder IDs to update the UI
                await fetchCount();
            } else {
                throw new Error(data.error || 'Failed to stop import');
            }
        } catch (error) {
            console.error('Error stopping import:', error);
            alert('Failed to stop import. Please try again.');
        } finally {
            // Remove folder ID from stopping list
            setStoppingImportIds(prev => prev.filter(id => id !== folderId));
        }
    };
    return (
        <div className="bg-white border rounded-lg p-6 shadow-sm">
            {/* User Email and Service Account Info */}
            {session?.user?.email && (
                <div className="mb-4 p-4 border rounded-lg bg-gray-50">
                    <div className="space-y-3">
                        <div>
                            <p className="text-sm text-gray-600">Logged in as:</p>
                            <p className="font-medium text-gray-900">{session.user.email}</p>
                        </div>

                        <div>
                            <p className="text-sm text-gray-600">Service Account Email (share folders with this email):</p>
                            <div className="flex items-center gap-2 mt-1">
                                <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono flex-1">
                                    {serviceAccountEmail}
                                </code>
                                <button
                                    onClick={copyToClipboard}
                                    className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                                    title="Copy to clipboard"
                                >
                                    {copySuccess ? (
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                    ) : (
                                        <Copy className="h-4 w-4" />
                                    )}
                                    {copySuccess ? 'Copied!' : 'Copy'}
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowInstructions(!showInstructions)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                            {showInstructions ? 'Hide Instructions' : 'Show Setup Instructions'}
                        </button>

                        {showInstructions && (
                            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                                <h4 className="font-medium text-blue-900 mb-2">Setup Instructions:</h4>
                                <ol className="list-decimal list-inside space-y-1 text-blue-700">
                                    <li>Copy the service account email above</li>
                                    <li>Go to your Google Drive and right-click on the folder you want to share</li>
                                    <li>Select "Share" from the context menu</li>
                                    <li>Paste the service account email and give it "Viewer" permissions</li>
                                    <li>Click "Send" to share the folder</li>
                                    <li>Come back here and click the "Refresh" button</li>
                                    <li>Your shared folder should now appear in the list below</li>
                                </ol>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {checkCountLoading ? (
                <div className='w-full bg-blue-100 p-2 rounded mb-4'>
                    <p className="font-bold text-blue-600">Loading Importing Groups</p>
                </div>
            ) : count > 0 && (
                <div className='w-full bg-blue-100 p-2 rounded mb-4'>
                    <p className="font-bold text-blue-600">
                        Currently Importing {count} folders from shared Google Drive folders.
                        Images will be available in gallery shortly. Meanwhile you can select more folders to import.
                    </p>
                </div>
            )}

            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="30" height="30" viewBox="0 0 48 48">
                        <path fill="#1e88e5" d="M38.59,39c-0.535,0.93-0.298,1.68-1.195,2.197C36.498,41.715,35.465,42,34.39,42H13.61 c-1.074,0-2.106-0.285-3.004-0.802C9.708,40.681,9.945,39.93,9.41,39l7.67-9h13.84L38.59,39z"></path><path fill="#fbc02d" d="M27.463,6.999c1.073-0.002,2.104-0.716,3.001-0.198c0.897,0.519,1.66,1.27,2.197,2.201l10.39,17.996 c0.537,0.93,0.807,1.967,0.808,3.002c0.001,1.037-1.267,2.073-1.806,3.001l-11.127-3.005l-6.924-11.993L27.463,6.999z"></path><path fill="#e53935" d="M43.86,30c0,1.04-0.27,2.07-0.81,3l-3.67,6.35c-0.53,0.78-1.21,1.4-1.99,1.85L30.92,30H43.86z"></path><path fill="#4caf50" d="M5.947,33.001c-0.538-0.928-1.806-1.964-1.806-3c0.001-1.036,0.27-2.073,0.808-3.004l10.39-17.996 c0.537-0.93,1.3-1.682,2.196-2.2c0.897-0.519,1.929,0.195,3.002,0.197l3.459,11.009l-6.922,11.989L5.947,33.001z"></path><path fill="#1565c0" d="M17.08,30l-6.47,11.2c-0.78-0.45-1.46-1.07-1.99-1.85L4.95,33c-0.54-0.93-0.81-1.96-0.81-3H17.08z"></path><path fill="#2e7d32" d="M30.46,6.8L24,18L17.53,6.8c0.78-0.45,1.66-0.73,2.6-0.79L27.46,6C28.54,6,29.57,6.28,30.46,6.8z"></path>
                    </svg>
                    Import from Shared Drive Folders
                </h3>

                <button
                    onClick={refreshFolders}
                    disabled={isRefreshing || isLoading}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                    title="Refresh shared folders"
                >
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            {error && (
                <div className="mb-4 p-4 border rounded-lg bg-red-50 border-red-200">
                    <div className="text-sm text-red-700">{error}</div>
                </div>
            )}

            {!session?.user?.email && (
                <div className="mb-4 p-4 border rounded-lg bg-yellow-50 border-yellow-200">
                    <div className="text-sm text-yellow-700">
                        Please sign in to view folders shared with you.
                    </div>
                </div>
            )}

            {/* Selected Folders Summary */}
            {selectedFolders.length > 0 && (
                <div className="mb-4 p-4 border rounded-lg bg-green-50 border-green-200">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-green-900">
                            Selected Folders ({selectedFolders.length}) - Total Images: {totalSelectedImages}
                        </h4>
                        <button
                            onClick={clearAllSelections}
                            className="text-green-600 hover:text-green-800 text-sm"
                        >
                            Clear All
                        </button>
                    </div>
                    <div className="space-y-2">
                        {selectedFolders.map((folder) => (
                            <div key={folder.id} className="flex items-center justify-between bg-white p-2 rounded border">
                                <div className="flex items-center gap-2">
                                    <Folder className="h-4 w-4 text-green-600" />
                                    <span className="font-medium">{folder.name}</span>
                                    <span className="text-sm text-gray-500">
                                        ({folder.imageCountTruncated || folder.imageCount} images)
                                    </span>
                                </div>
                                <button
                                    onClick={() => removeSelectedFolder(folder.id)}
                                    className="text-red-600 hover:text-red-800"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 flex gap-3">
                        <button
                            onClick={handleImport}
                            disabled={isImporting || selectedFolders.length === 0}
                            className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {isImporting ? (
                                <>
                                    <Clock className="h-4 w-4 animate-spin" />
                                    Setting up import...
                                </>
                            ) : (
                                <>
                                    <Upload className="h-4 w-4" />
                                    Import {selectedFolders.length} Folders ({totalSelectedImages} Images)
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                {/* Navigation Path */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    {currentPath.length > 1 && (
                        <button
                            onClick={navigateBack}
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back
                        </button>
                    )}
                    <div className="flex items-center gap-2">
                        {currentPath.map((path, index) => (
                            <React.Fragment key={path.id}>
                                {index > 0 && <ChevronRight className="h-4 w-4" />}
                                <span className={index === currentPath.length - 1 ? 'font-medium' : ''}>
                                    {path.name}
                                </span>
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search folders..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                {/* Folders List */}
                {isLoading ? (
                    <div className="text-center py-8">
                        <Clock className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
                        <p className="text-gray-600">Loading folders...</p>
                    </div>
                ) : (
                    <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                        {filteredFolders.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">
                                No shared folders found. Make sure folders are shared with the service account email above.
                            </div>
                        ) : (
                            filteredFolders.map((folder) => {
                                const isSelected = selectedFolders.some(f => f.id === folder.id);
                                const isImporting = importingFolderIds.includes(folder.id);

                                return (
                                    <div
                                        key={folder.id}
                                        onClick={() => handleFolderClick(folder)}
                                        className={`flex items-center justify-between p-3 border-b last:border-b-0 hover:bg-gray-50 ${(folder.imageCount === 0 && !folder.hasSubfolders) || isImporting
                                            ? 'opacity-50 cursor-not-allowed'
                                            : 'cursor-pointer'
                                            } ${isSelected ? 'bg-green-50 border-green-200' : ''} ${isImporting ? 'bg-orange-50 border-orange-200' : ''}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Folder className={`h-5 w-5 ${isSelected ? 'text-green-600' : isImporting ? 'text-orange-600' : 'text-blue-600'}`} />
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium text-gray-900">{folder.name}</p>
                                                    {isImporting && (
                                                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium flex items-center gap-1">
                                                            <Clock className="h-3 w-3 animate-spin" />
                                                            Processing
                                                        </span>
                                                    )}
                                                    {isSelected && !isImporting && (
                                                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                                                            Selected
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-500">
                                                    {folder.imageCount > 0 && (
                                                        <span className={`font-medium ${isImporting ? 'text-orange-600' : 'text-green-600'}`}>
                                                            {folder.imageCountTruncated || folder.imageCount} images
                                                        </span>
                                                    )}
                                                    {folder.imageCount === 0 && folder.hasSubfolders && (
                                                        <span className="text-gray-400">Contains subfolders</span>
                                                    )}
                                                    {folder.imageCount === 0 && !folder.hasSubfolders && (
                                                        <span className="text-gray-400">No images found</span>
                                                    )}
                                                    {isImporting && (
                                                        <span className="text-orange-600 text-xs ml-2">
                                                            - Being imported, cannot select
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {isImporting && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleStopImport(folder.id, folder.name);
                                                    }}
                                                    disabled={stoppingImportIds.includes(folder.id)}
                                                    className="text-orange-700 hover:text-orange-900 text-xs font-medium px-2 py-1 border border-orange-300 rounded bg-white hover:bg-orange-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                                    title={`Stop importing folder "${folder.name}"`}
                                                >
                                                    {stoppingImportIds.includes(folder.id) && (
                                                        <Clock className="h-3 w-3 animate-spin" />
                                                    )}
                                                    {stoppingImportIds.includes(folder.id) ? 'Stopping...' : 'Stop Import'}
                                                </button>
                                            )}
                                            {folder.hasSubfolders && !isImporting && (
                                                <>
                                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                                        Has subfolders
                                                    </span>
                                                    <ChevronRight className="h-4 w-4 text-gray-400" />
                                                </>
                                            )}
                                            {folder.imageCount > 0 && !folder.hasSubfolders && !isImporting && (
                                                <span className={`text-sm font-medium ${isSelected ? 'text-green-600' : 'text-blue-600'}`}>
                                                    {isSelected ? 'Selected' : 'Click to Select'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}