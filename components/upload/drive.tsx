'use client';

import React, { useState, useEffect } from 'react';
import { Folder, X, Upload, Clock, ImageIcon, ChevronRight, ArrowLeft, Search, RefreshCw, Copy, CheckCircle, AlertTriangle } from 'lucide-react';
import { useSession } from "next-auth/react";
import driveIcon from "../../public/drive.svg"
import Image from 'next/image';

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

        const cacheKey = parentId;
        const cachedData = folderCache[cacheKey];

        if (cachedData && Date.now() - cachedData.timestamp < 5 * 60 * 1000) {
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
                processedFolders = data.folders.sort((a: DriveFolder, b: DriveFolder) => {
                    if (a.imageCount !== b.imageCount) {
                        return b.imageCount - a.imageCount;
                    }
                    return a.name.localeCompare(b.name);
                });
            } else {
                const subfolders = await Promise.all(
                    data.files.map(async (folder: any) => {
                        const [imageResponse, subfolderResponse] = await Promise.all([
                            fetch(`/api/drive-service?action=get-folder-contents&folderId=${folder.id}&type=images`),
                            fetch(`/api/drive-service?action=get-folder-contents&folderId=${folder.id}&type=folders`)
                        ]);

                        const imageData = imageResponse.ok ? await imageResponse.json() : { files: { count: 0, hasMore: false } };
                        const subfolderData = subfolderResponse.ok ? await subfolderResponse.json() : { files: [] };

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
        setFolderCache({});
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

            const sortedFolders = data.folders.sort((a: DriveFolder, b: DriveFolder) => {
                if (a.imageCount !== b.imageCount) {
                    return b.imageCount - a.imageCount;
                }
                return a.name.localeCompare(b.name);
            });

            setFolders(sortedFolders);

            setFolderCache({
                'root': {
                    folders: sortedFolders,
                    timestamp: Date.now()
                }
            });

            setError(null);
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
        if (importingFolderIds.includes(folder.id)) {
            return;
        }

        if (folder.hasSubfolders) {
            setCurrentPath(prev => [...prev, { id: folder.id, name: folder.name }]);
            await fetchFolders(folder.id);
        } else if (folder.imageCount > 0) {
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
            const res = await fetch('/api/groups', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ groupId }),
            });

            if (!res.ok) {
                throw new Error('Failed to update group status');
            }

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
                await fetchCount();
            } else {
                throw new Error(data.error || 'Failed to stop import');
            }
        } catch (error) {
            console.error('Error stopping import:', error);
            alert('Failed to stop import. Please try again.');
        } finally {
            setStoppingImportIds(prev => prev.filter(id => id !== folderId));
        }
    };

    return (
        <div className="bg-white border rounded-lg p-3 sm:p-6 shadow-sm">
            {/* User Email and Service Account Info */}
            {session?.user?.email && (
                <div className="mb-3 sm:mb-4 p-3 sm:p-4 border rounded-lg bg-gray-50">
                    <div className="space-y-2 sm:space-y-3">
                        <div>
                            <p className="text-xs sm:text-sm text-gray-600">Logged in as:</p>
                            <p className="font-medium text-gray-900 text-sm sm:text-base break-all">{session.user.email}</p>
                        </div>

                        <div>
                            <p className="text-xs sm:text-sm text-gray-600">Service Account Email (share folders with this email):</p>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mt-1">
                                <code className="bg-gray-100 px-2 py-1 rounded text-xs sm:text-sm font-mono w-full sm:flex-1 break-all">
                                    {serviceAccountEmail}
                                </code>
                                <button
                                    onClick={copyToClipboard}
                                    className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs sm:text-sm whitespace-nowrap"
                                    title="Copy to clipboard"
                                >
                                    {copySuccess ? (
                                        <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                                    ) : (
                                        <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
                                    )}
                                    {copySuccess ? 'Copied!' : 'Copy'}
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowInstructions(!showInstructions)}
                            className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm font-medium"
                        >
                            {showInstructions ? 'Hide Instructions' : 'Show Setup Instructions'}
                        </button>

                        {showInstructions && (
                            <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-blue-50 border border-blue-200 rounded text-xs sm:text-sm">
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
                <div className='w-full bg-blue-100 p-2 rounded mb-3 sm:mb-4'>
                    <p className="font-bold text-blue-600 text-xs sm:text-sm">Loading Importing Groups</p>
                </div>
            ) : count > 0 && (
                <div className='w-full bg-blue-100 p-2 rounded mb-3 sm:mb-4'>
                    <p className="font-bold text-blue-600 text-xs sm:text-sm">
                        Currently Importing {count} folders from shared Google Drive folders.
                        Images will be available in gallery shortly. Meanwhile you can select more folders to import.
                    </p>
                </div>
            )}

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Image src={driveIcon} width={20} height={20} className="sm:w-[25px] sm:h-[25px]" alt='drive icon' />
                    <span className="text-sm sm:text-lg">Import from Shared Drive Folders</span>
                </h3>

                <button
                    onClick={refreshFolders}
                    disabled={isRefreshing || isLoading}
                    className="flex items-center gap-1 sm:gap-2 text-blue-600 hover:text-blue-800 disabled:text-gray-400 text-xs sm:text-sm"
                    title="Refresh shared folders"
                >
                    <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            {error && (
                <div className="mb-3 sm:mb-4 p-3 sm:p-4 border rounded-lg bg-red-50 border-red-200">
                    <div className="text-xs sm:text-sm text-red-700">{error}</div>
                </div>
            )}

            {!session?.user?.email && (
                <div className="mb-3 sm:mb-4 p-3 sm:p-4 border rounded-lg bg-yellow-50 border-yellow-200">
                    <div className="text-xs sm:text-sm text-yellow-700">
                        Please sign in to view folders shared with you.
                    </div>
                </div>
            )}

            {/* Selected Folders Summary */}
            {selectedFolders.length > 0 && (
                <div className="mb-3 sm:mb-4 p-3 sm:p-4 border rounded-lg bg-green-50 border-green-200">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2">
                        <h4 className="font-medium text-green-900 text-xs sm:text-sm">
                            Selected Folders ({selectedFolders.length}) - Total Images: {totalSelectedImages}
                        </h4>
                        <button
                            onClick={clearAllSelections}
                            className="text-green-600 hover:text-green-800 text-xs sm:text-sm"
                        >
                            Clear All
                        </button>
                    </div>
                    <div className="space-y-2">
                        {selectedFolders.map((folder) => (
                            <div key={folder.id} className="flex items-center justify-between bg-white p-2 rounded border">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <Folder className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 flex-shrink-0" />
                                    <span className="font-medium text-xs sm:text-sm truncate">{folder.name}</span>
                                    <span className="text-xs text-gray-500 whitespace-nowrap">
                                        ({folder.imageCountTruncated || folder.imageCount} images)
                                    </span>
                                </div>
                                <button
                                    onClick={() => removeSelectedFolder(folder.id)}
                                    className="text-red-600 hover:text-red-800 ml-2 flex-shrink-0"
                                >
                                    <X className="h-3 w-3 sm:h-4 sm:w-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className="mt-3 sm:mt-4 flex gap-2 sm:gap-3">
                        <button
                            onClick={handleImport}
                            disabled={isImporting || selectedFolders.length === 0}
                            className="flex items-center gap-1 sm:gap-2 bg-green-600 text-white px-3 py-1.5 sm:px-6 sm:py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-xs sm:text-sm"
                        >
                            {isImporting ? (
                                <>
                                    <Clock className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                                    <span className="hidden sm:inline">Setting up import...</span>
                                    <span className="sm:hidden">Importing...</span>
                                </>
                            ) : (
                                <>
                                    <Upload className="h-3 w-3 sm:h-4 sm:w-4" />
                                    <span className="hidden sm:inline">Import {selectedFolders.length} Folders ({totalSelectedImages} Images)</span>
                                    <span className="sm:hidden">Import ({selectedFolders.length})</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            <div className="space-y-3 sm:space-y-4">
                {/* Navigation Path */}
                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 overflow-x-auto">
                    {currentPath.length > 1 && (
                        <button
                            onClick={navigateBack}
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 whitespace-nowrap"
                        >
                            <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                            Back
                        </button>
                    )}
                    <div className="flex items-center gap-2 overflow-x-auto">
                        {currentPath.map((path, index) => (
                            <React.Fragment key={path.id}>
                                {index > 0 && <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />}
                                <span className={`${index === currentPath.length - 1 ? 'font-medium' : ''} whitespace-nowrap`}>
                                    {path.name}
                                </span>
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search folders..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm"
                    />
                </div>

                {/* Folders List */}
                {isLoading ? (
                    <div className="text-center py-6 sm:py-8">
                        <Clock className="h-5 w-5 sm:h-6 sm:w-6 animate-spin mx-auto mb-2 text-blue-600" />
                        <p className="text-gray-600 text-xs sm:text-sm">Loading folders...</p>
                    </div>
                ) : (
                    <div className="max-h-64 sm:max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                        {filteredFolders.length === 0 ? (
                            <div className="p-3 sm:p-4 text-center text-gray-500 text-xs sm:text-sm">
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
                                        className={`flex items-center justify-between p-2 sm:p-3 border-b last:border-b-0 hover:bg-gray-50 ${(folder.imageCount === 0 && !folder.hasSubfolders) || isImporting
                                            ? 'opacity-50 cursor-not-allowed'
                                            : 'cursor-pointer'
                                            } ${isSelected ? 'bg-green-50 border-green-200' : ''} ${isImporting ? 'bg-orange-50 border-orange-200' : ''}`}
                                    >
                                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                                            <Folder className={`h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 ${isSelected ? 'text-green-600' : isImporting ? 'text-orange-600' : 'text-blue-600'}`} />
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                                                    <p className="font-medium text-gray-900 text-xs sm:text-sm truncate">{folder.name}</p>
                                                    {isImporting && (
                                                        <span className="text-xs bg-orange-100 text-orange-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full font-medium flex items-center gap-1 whitespace-nowrap">
                                                            <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 animate-spin" />
                                                            Processing
                                                        </span>
                                                    )}
                                                    {isSelected && !isImporting && (
                                                        <span className="text-xs bg-green-100 text-green-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full font-medium whitespace-nowrap">
                                                            Selected
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs sm:text-sm text-gray-500">
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
                                                        <span className="text-orange-600 text-xs ml-1 sm:ml-2 block sm:inline">
                                                            - Being imported, cannot select
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 sm:gap-2 ml-2 flex-shrink-0">
                                            {isImporting && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleStopImport(folder.id, folder.name);
                                                    }}
                                                    disabled={stoppingImportIds.includes(folder.id)}
                                                    className="text-orange-700 hover:text-orange-900 text-xs font-medium px-1.5 sm:px-2 py-0.5 sm:py-1 border border-orange-300 rounded bg-white hover:bg-orange-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 whitespace-nowrap"
                                                    title={`Stop importing folder "${folder.name}"`}
                                                >
                                                    {stoppingImportIds.includes(folder.id) && (
                                                        <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 animate-spin" />
                                                    )}
                                                    <span className="hidden sm:inline">{stoppingImportIds.includes(folder.id) ? 'Stopping...' : 'Stop Import'}</span>
                                                    <span className="sm:hidden">Stop</span>
                                                </button>
                                            )}
                                            {folder.hasSubfolders && !isImporting && (
                                                <>
                                                    <span className="text-xs bg-blue-100 text-blue-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded whitespace-nowrap hidden sm:inline">
                                                        Has subfolders
                                                    </span>
                                                    <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                                                </>
                                            )}
                                            {folder.imageCount > 0 && !folder.hasSubfolders && !isImporting && (
                                                <span className={`text-xs sm:text-sm font-medium ${isSelected ? 'text-green-600' : 'text-blue-600'} whitespace-nowrap hidden sm:inline`}>
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