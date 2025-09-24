'use client';

import React, { useState, useEffect } from 'react';
import { Folder, X, Upload, Clock, ImageIcon, ChevronRight, ArrowLeft, Search } from 'lucide-react';
import { useSession, signIn } from "next-auth/react";
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
    totalFiles: number;
    hasSubfolders: boolean;
    imageCountTruncated: string;
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

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function DriveImport({ groupId, userId, onImportStart, onImportComplete }: DriveImportProps) {
    const [folders, setFolders] = useState<DriveFolder[]>([]);
    const [selectedFolder, setSelectedFolder] = useState<DriveFolder | null>(null);
    const [selectedFolderImages, setSelectedFolderImages] = useState<DriveFile[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [currentPath, setCurrentPath] = useState<FolderPath[]>([{ id: 'root', name: 'My Drive' }]);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [selectedFolderTotalImages, setSelectedFolderTotalImages] = useState<number>(0);
    const { data: session } = useSession();
    const [count, setCount] = useState<number>(0);
    const [checkCountLoading, setCheckCountLoading] = useState(false)
    const [authError, setAuthError] = useState(false);
    const [isSigningIn, setIsSigningIn] = useState(false)
    async function fetchCount() {
        try {
            setCheckCountLoading(true)
            const res = await fetch("/api/get-importing-groups", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ groupId }),
            });

            const data = await res.json();
            if (res.ok) {
                setCount(data.count);
            } else {
                console.error("Error:", data.error);
            }
        } catch (err) {
            console.error("Request failed:", err);
        } finally {
            setCheckCountLoading(false)
        }
    }


    useEffect(() => {
        fetchCount();
    }, [groupId]);
    const handleAuthError = (error: any) => {
        if (error?.status === 401 || error?.message?.includes('401') || error?.message?.includes('unauthorized')) {
            setAuthError(true);
            setError('Authentication required. Please sign in with Google to access your Drive.');
        } else {
            setError('Failed to access Google Drive. Please try again.');
        }
    };
    const handleGoogleSignIn = async () => {
        setIsSigningIn(true);
        try {
            await signIn("google");
            setAuthError(false);
            setError(null);
        } catch (error) {
            console.error('Sign-in failed:', error);
            setError('Failed to sign in. Please try again.');
        } finally {
            setIsSigningIn(false);
        }
    };
    const fetchFolders = async (parentId: string = 'root') => {
        if (!session?.accessToken) return;

        setIsLoading(true);
        setError(null);
        setAuthError(false);
        try {
            // First, get all folders in the current directory
            const foldersResponse = await fetch(
                `https://www.googleapis.com/drive/v3/files?q='${parentId}'+in+parents+and+mimeType='application/vnd.google-apps.folder'+and+trashed=false&fields=files(id,name,parents)&pageSize=1000`,
                {
                    headers: {
                        'Authorization': `Bearer ${session.accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );
            if (foldersResponse.status === 401) {
                throw new Error('Unauthorized access - 401');
            }
            if (!foldersResponse.ok) {
                throw new Error('Failed to fetch folders');
            }

            const foldersData = await foldersResponse.json();
            const foldersList = foldersData.files || [];

            // For each folder, get the count of images and check for subfolders
            const foldersWithCounts = await Promise.all(
                foldersList.map(async (folder: any) => {
                    try {
                        // Count images in this folder
                        const imagesResponse = await fetch(
                            `https://www.googleapis.com/drive/v3/files?q='${folder.id}'+in+parents+and+(${[
                                'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff'
                            ].map(type => `mimeType='${type}'`).join('+or+')})+and+trashed=false&fields=nextPageToken,files(id)&pageSize=1000`,
                            {
                                headers: {
                                    'Authorization': `Bearer ${session.accessToken}`,
                                    'Content-Type': 'application/json',
                                },
                            } as RequestInit
                        );
                        // Count total files
                        const totalResponse = await fetch(
                            `https://www.googleapis.com/drive/v3/files?q='${folder.id}'+in+parents+and+trashed=false&fields=files(id)&pageSize=1000`,
                            {
                                headers: {
                                    'Authorization': `Bearer ${session.accessToken}`,
                                    'Content-Type': 'application/json',
                                },
                            }
                        );

                        // Check for subfolders
                        const subfoldersResponse = await fetch(
                            `https://www.googleapis.com/drive/v3/files?q='${folder.id}'+in+parents+and+mimeType='application/vnd.google-apps.folder'+and+trashed=false&fields=files(id)&pageSize=1`,
                            {
                                headers: {
                                    'Authorization': `Bearer ${session.accessToken}`,
                                    'Content-Type': 'application/json',
                                },
                            }
                        );

                        const imagesData = imagesResponse.ok ? await imagesResponse.json() : { files: [] };
                        const totalData = totalResponse.ok ? await totalResponse.json() : { files: [] };
                        const subfoldersData = subfoldersResponse.ok ? await subfoldersResponse.json() : { files: [] };
                        const imageCount = imagesData.files?.length || 0;
                        const hasMoreImages = !!imagesData.nextPageToken;
                        return {
                            id: folder.id,
                            name: folder.name,
                            imageCount: imageCount,
                            totalFiles: totalData.files?.length || 0,
                            imageCountTruncated: hasMoreImages ? `${imageCount}+` : `${imageCount}`,
                            hasSubfolders: subfoldersData.files?.length > 0,
                            parents: folder.parents
                        };
                    } catch (error) {
                        console.error(`Error processing folder ${folder.name}:`, error);
                        return {
                            id: folder.id,
                            name: folder.name,
                            imageCount: 0,
                            totalFiles: 0,
                            hasSubfolders: false,
                            parents: folder.parents
                        };
                    }
                })
            );

            // Sort folders alphabetically and prioritize folders with images
            const sortedFolders = foldersWithCounts.sort((a, b) => {
                // First sort by image count (descending), then by name
                if (a.imageCount !== b.imageCount) {
                    return b.imageCount - a.imageCount;
                }
                return a.name.localeCompare(b.name);
            });

            setFolders(sortedFolders);
        } catch (error) {
            console.error('Error fetching folders:', error);
            handleAuthError(error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchFolderImages = async (folderId: string) => {
        if (!session?.accessToken) return;

        setIsLoading(true);
        try {
            const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff'];
            const mimeTypeQuery = imageTypes.map(type => `mimeType='${type}'`).join(' or ');
            const response = await fetch(
                `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and (${mimeTypeQuery}) and trashed=false&fields=files(id,name,mimeType,thumbnailLink,iconLink,size)&pageSize=1000`,
                {
                    headers: {
                        'Authorization': `Bearer ${session.accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );
            if (response.status === 401) {
                throw new Error('Unauthorized access - 401');
            }
            if (!response.ok) {
                throw new Error('Failed to fetch folder images');
            }

            const data = await response.json();
            setSelectedFolderImages(data.files || []);
        } catch (error) {
            console.error('Error fetching folder images:', error);
            handleAuthError(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFolderClick = async (folder: DriveFolder) => {
        if (folder.hasSubfolders) {
            // Navigate into the folder
            setCurrentPath(prev => [...prev, { id: folder.id, name: folder.name }]);
            setSelectedFolder(null);
            setSelectedFolderImages([]);
            await fetchFolders(folder.id);
        } else if (folder.imageCount > 0) {
            // Select this folder and get total image count
            setSelectedFolder(folder);
            setIsLoading(true);

            // Get total count of all images in the folder
            // const totalImages = await fetchAllFolderImages(folder.id);
            // setSelectedFolderTotalImages(totalImages.length);

            // Get first 12 images for preview (you can uncomment the preview section if needed)
            // await fetchFolderImages(folder.id);

            setIsLoading(false);
        }
    };

    const navigateBack = () => {
        if (currentPath.length > 1) {
            const newPath = currentPath.slice(0, -1);
            setCurrentPath(newPath);
            setSelectedFolder(null);
            setSelectedFolderImages([]);
            fetchFolders(newPath[newPath.length - 1].id);
        }
    };

    const handleImport = async () => {
        if (!selectedFolder || !groupId) return;

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

            // Save folder for processing
            const saveResponse = await fetch("/api/save-drive-folder", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    folderId: selectedFolder.id,
                    groupId,
                    userId,
                }),
            });

            if (!saveResponse.ok) {
                throw new Error('Failed to save Drive folder information');
            }
            await fetchCount()
            alert(`Successfully set up import for "${selectedFolder.name}" with ${selectedFolder.imageCount} images. Processing will begin shortly.`);
            setSelectedFolder(null);
            setSelectedFolderImages([]);
            setSelectedFolderTotalImages(0);
            onImportComplete();
        } catch (error) {
            console.error('Error importing from Drive:', error);
            alert('Failed to set up Drive import. Please try again.');
        } finally {
            setIsImporting(false);
        }
    };

    useEffect(() => {
        if (session?.accessToken) {
            fetchFolders();
        }
    }, [session?.accessToken]);

    const filteredFolders = folders.filter(folder =>
        folder.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const fetchAllFolderImages = async (folderId: string) => {
        if (!session?.accessToken) return [];

        const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff'];
        const mimeTypeQuery = imageTypes.map(type => `mimeType='${type}'`).join(' or ');

        let allFiles: DriveFile[] = [];
        let pageToken: string | undefined;

        do {
            const response = await fetch(
                `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and (${mimeTypeQuery}) and trashed=false&fields=nextPageToken,files(id,name,mimeType,thumbnailLink,iconLink,size)&pageSize=1000${pageToken ? `&pageToken=${pageToken}` : ""}`,
                {
                    headers: {
                        'Authorization': `Bearer ${session.accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) throw new Error('Failed to fetch folder images');
            const data = await response.json();
            allFiles = [...allFiles, ...(data.files || [])];
            pageToken = data.nextPageToken;
        } while (pageToken);

        return allFiles;
    };
    return (
        <div className="bg-white border rounded-lg p-6 shadow-sm">
            {checkCountLoading ? <div className='w-full bg-blue-100 p-2 rounded mb-4'>
                <p className="font-bold text-blue-600">Loading Importing Groups</p>
            </div> : count > 0 &&
            <div className='w-full bg-blue-100 p-2 rounded mb-4'>
                <p className="font-bold text-blue-600"> Currently Importing {count} folders from your google drive, Images will be available in gallery shortly. Meanwhile you can select more folders to import.</p>
            </div>}
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="30" height="30" viewBox="0 0 48 48">
                    <path fill="#1e88e5" d="M38.59,39c-0.535,0.93-0.298,1.68-1.195,2.197C36.498,41.715,35.465,42,34.39,42H13.61 c-1.074,0-2.106-0.285-3.004-0.802C9.708,40.681,9.945,39.93,9.41,39l7.67-9h13.84L38.59,39z"></path><path fill="#fbc02d" d="M27.463,6.999c1.073-0.002,2.104-0.716,3.001-0.198c0.897,0.519,1.66,1.27,2.197,2.201l10.39,17.996 c0.537,0.93,0.807,1.967,0.808,3.002c0.001,1.037-1.267,2.073-1.806,3.001l-11.127-3.005l-6.924-11.993L27.463,6.999z"></path><path fill="#e53935" d="M43.86,30c0,1.04-0.27,2.07-0.81,3l-3.67,6.35c-0.53,0.78-1.21,1.4-1.99,1.85L30.92,30H43.86z"></path><path fill="#4caf50" d="M5.947,33.001c-0.538-0.928-1.806-1.964-1.806-3c0.001-1.036,0.27-2.073,0.808-3.004l10.39-17.996 c0.537-0.93,1.3-1.682,2.196-2.2c0.897-0.519,1.929,0.195,3.002,0.197l3.459,11.009l-6.922,11.989L5.947,33.001z"></path><path fill="#1565c0" d="M17.08,30l-6.47,11.2c-0.78-0.45-1.46-1.07-1.99-1.85L4.95,33c-0.54-0.93-0.81-1.96-0.81-3H17.08z"></path><path fill="#2e7d32" d="M30.46,6.8L24,18L17.53,6.8c0.78-0.45,1.66-0.73,2.6-0.79L27.46,6C28.54,6,29.57,6.28,30.46,6.8z"></path>
                </svg>
                Import from Google Drive
            </h3>

            {error && (
                <div className={`mb-4 p-4 border rounded-lg ${authError ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex items-center justify-between">
                        <div className={`text-sm ${authError ? 'text-blue-700' : 'text-red-700'}`}>
                            {error}
                        </div>
                        {authError && (
                            <button
                                onClick={handleGoogleSignIn}
                                disabled={isSigningIn}
                                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                            >
                                {isSigningIn ? (
                                    <>
                                        <Clock className="h-4 w-4 animate-spin" />
                                        Signing in...
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="16" height="16" viewBox="0 0 48 48">
                                            <path fill="#fbc02d" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12	s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24	s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#e53935" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039	l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4caf50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36	c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path><path fill="#1565c0" d="M43.611,20.083L43.595,20L42,20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571	c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
                                        </svg>
                                        Sign in with Google
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {!selectedFolder ? (
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
                                    No folders found
                                </div>
                            ) : (
                                filteredFolders.map((folder) => (
                                    <div
                                        key={folder.id}
                                        onClick={() => handleFolderClick(folder)}
                                        className={`flex items-center justify-between p-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer ${folder.imageCount === 0 && !folder.hasSubfolders ? 'opacity-50 cursor-not-allowed' : ''
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Folder className="h-5 w-5 text-blue-600" />
                                            <div>
                                                <p className="font-medium text-gray-900">{folder.name}</p>
                                                <p className="text-sm text-gray-500">
                                                    {folder.imageCount > 0 && (
                                                        <span className="text-green-600 font-medium">
                                                            {typeof folder.imageCountTruncated === "string"
                                                                ? folder.imageCountTruncated
                                                                : folder.imageCount} images
                                                        </span>
                                                    )}
                                                    {folder.imageCount > 0 && folder.totalFiles > folder.imageCount && (
                                                        <span className="text-gray-400">
                                                            {' '}• {folder.totalFiles - folder.imageCount} other files
                                                        </span>
                                                    )}
                                                    {folder.imageCount === 0 && folder.totalFiles > 0 && (
                                                        <span className="text-gray-400">
                                                            {folder.totalFiles} files (no images)
                                                        </span>
                                                    )}
                                                    {folder.totalFiles === 0 && (
                                                        <span className="text-gray-400">Empty folder</span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {folder.hasSubfolders && (
                                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                                    Has subfolders
                                                </span>
                                            )}
                                            {folder.imageCount > 0 && !folder.hasSubfolders && (
                                                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                                                    Select
                                                </button>
                                            )}
                                            {folder.hasSubfolders && (
                                                <ChevronRight className="h-4 w-4 text-gray-400" />
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            ) : (
                /* Selected Folder View */
                <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-medium text-blue-900 flex items-center gap-2">
                                    <Folder className="h-4 w-4" />
                                    {selectedFolder.name}
                                </h4>
                                <p className="text-sm text-blue-700 mt-1">
                                    {selectedFolder.imageCountTruncated} images found
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setSelectedFolder(null);
                                    setSelectedFolderImages([]);
                                    setSelectedFolderTotalImages(0);
                                }}
                                className="text-blue-600 hover:text-blue-800"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Image Preview */}
                    {/* {selectedFolderImages.length > 0 && (
                        <div className="space-y-3">
                            <h5 className="font-medium text-gray-700 flex items-center gap-2">
                                <ImageIcon className="h-4 w-4" />
                                Image Files Preview
                            </h5>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                {selectedFolderImages.slice(0, 12).map((file) => (
                                    <div key={file.id} className="relative group">
                                        <div className="aspect-square rounded-lg overflow-hidden border">
                                            {file.thumbnailLink ? (
                                                <img
                                                    src={file.thumbnailLink}
                                                    alt={file.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                                    <ImageIcon className="h-6 w-6 text-gray-400" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all rounded-lg flex items-end">
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity p-2 w-full">
                                                <p className="text-white text-xs truncate font-medium">
                                                    {file.name}
                                                </p>
                                                {file.size && (
                                                    <p className="text-white text-xs opacity-80">
                                                        {formatFileSize(parseInt(file.size))}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {selectedFolderImages.length > 12 && (
                                <p className="text-sm text-gray-500 text-center">
                                    ... and {selectedFolderImages.length - 12} more images
                                </p>
                            )}
                        </div>
                    )} */}

                    {/* Import Button */}
                    <div className="flex gap-3">
                        <button
                            onClick={handleImport}
                            disabled={isImporting || selectedFolder.imageCount === 0}
                            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {isImporting ? (
                                <>
                                    <Clock className="h-4 w-4 animate-spin" />
                                    Setting up import...
                                </>
                            ) : (
                                <>
                                    <Upload className="h-4 w-4" />
                                    Import {selectedFolder.imageCountTruncated} Images
                                </>
                            )}
                        </button>

                        <button
                            onClick={() => {
                                setSelectedFolder(null);
                                setSelectedFolderImages([]);
                                setSelectedFolderTotalImages(0);
                            }}
                            className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                            disabled={isImporting}
                        >
                            Choose Different Folder
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}