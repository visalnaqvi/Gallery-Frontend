'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, X, Play, Pause, RotateCcw, AlertCircle, CheckCircle, Clock, FileImage, Folder, Image as ImageIcon } from 'lucide-react';
import { Upload, X, Play, Pause, RotateCcw, AlertCircle, CheckCircle, Clock, FileImage, Folder, Image as ImageIcon } from 'lucide-react';
import { storage } from '@/lib/firebaseClient';
import {
    getDownloadURL,
    ref,
    uploadBytesResumable,
    UploadTask,
    UploadTaskSnapshot,
} from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { resizeImage } from './resize';

interface QueueItem {
    id: string;
    file: File;
    groupId: string;
    userId: string;
    status: 'pending' | 'uploading' | 'completed' | 'failed';
    progress: number;
    error: string | null;
    uploadedAt: string | null;
    task: UploadTask | null;
    location: string | null
}

interface UploadStats {
    total: number;
    completed: number;
    failed: number;
    totalSize: number;
    uploadedSize: number;
}

interface UploadState {
    queue: QueueItem[];
    currentUpload: QueueItem | null;
    isProcessing: boolean;
    isPaused: boolean;
    stats: UploadStats;
}

interface DriveFile {
    id: string;
    name: string;
    mimeType: string;
    thumbnailLink?: string;
    iconLink?: string;
    size?: string;
}

interface SelectedDriveFolder {
    id: string;
    name: string;
    imageFiles: DriveFile[];
    totalFiles: number;
}

interface DriveFile {
    id: string;
    name: string;
    mimeType: string;
    thumbnailLink?: string;
    iconLink?: string;
    size?: string;
}

interface SelectedDriveFolder {
    id: string;
    name: string;
    imageFiles: DriveFile[];
    totalFiles: number;
}

type StateListener = (state: UploadState) => void;

// Upload queue manager using singleton pattern for cross-component persistence
class UploadQueueManager {
    private queue: QueueItem[] = [];
    private currentUpload: QueueItem | null = null;
    private isProcessing: boolean = false;
    private isPaused: boolean = false;
    private listeners: Set<StateListener> = new Set();
    private stats: UploadStats = {
        total: 0,
        completed: 0,
        failed: 0,
        totalSize: 0,
        uploadedSize: 0
    };

    addListener(callback: StateListener): () => void {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    private notify(): void {
        this.listeners.forEach(callback => callback(this.getState()));
    }

    getState(): UploadState {
        return {
            queue: [...this.queue],
            currentUpload: this.currentUpload,
            isProcessing: this.isProcessing,
            isPaused: this.isPaused,
            stats: { ...this.stats }
        };
    }

    addFiles(files: File[], groupId: string, userId: string): void {
        const newItems: QueueItem[] = files.map(file => ({
            id: uuidv4(),
            file,
            groupId,
            userId,
            status: 'pending',
            progress: 0,
            error: null,
            uploadedAt: null,
            task: null,
            location: null
        }));

        this.queue.push(...newItems);
        this.stats.total += newItems.length;
        this.stats.totalSize += newItems.reduce((sum, item) => sum + item.file.size, 0);

        this.notify();

        if (!this.isProcessing && !this.isPaused) {
            this.startProcessing();
        }
    }

    async startProcessing(): Promise<void> {
        if (this.isProcessing || this.isPaused) return;

        this.isProcessing = true;
        this.notify();

        while (this.queue.length > 0 && !this.isPaused) {
            const item = this.queue.find(item => item.status === 'pending');
            if (!item) break;

            await this.uploadItem(item);
        }

        this.isProcessing = false;
        this.currentUpload = null;
        this.notify();
    }

    private async uploadItem(item: QueueItem): Promise<void> {
        this.currentUpload = item;
        item.status = 'uploading';
        this.notify();

        try {
            const uuid = item.id;
            const timestamp = new Date().toISOString();
            const filePath = `u_${uuid}`;
            const fileRef = ref(storage, filePath);

            // Custom metadata to be stored with the file
            const customMetadata = {
                id: uuid,
                group_id: item.groupId,
                filename: item.file.name,
                user_id: item.userId,
                uploaded_at: timestamp
            };

            await new Promise<void>((resolve, reject) => {
                // Upload with custom metadata
                const task = uploadBytesResumable(fileRef, item.file, {
                    customMetadata: customMetadata
                });
                item.task = task;

                task.on(
                    'state_changed',
                    (snapshot: UploadTaskSnapshot) => {
                        item.progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        this.notify();
                    },
                    (error) => {
                        item.status = 'failed';
                        item.error = error.message;
                        this.stats.failed++;
                        reject(error);
                    },
                    async () => {
                        try {
                            // Get download URL for the uploaded file
                            const downloadURL = await getDownloadURL(task.snapshot.ref);

                            item.status = 'completed';
                            item.uploadedAt = timestamp;
                            item.progress = 100;
                            item.location = downloadURL;
                            this.stats.completed++;
                            this.stats.uploadedSize += item.file.size;

                            resolve();
                        } catch (error) {
                            console.error('Failed to get download URL:', error);
                            item.status = 'failed';
                            item.error = 'Failed to get download URL';
                            this.stats.failed++;
                            reject(error);
                        }
                    }
                );
            });
        } catch (error) {
            item.status = 'failed';
            item.error = error instanceof Error ? error.message : 'Unknown error';
            this.stats.failed++;
        }

        this.notify();
    }

    pause(): void {
        this.isPaused = true;
        if (this.currentUpload?.task) {
            this.currentUpload.task.cancel();
        }
        this.notify();
    }

    resume(): void {
        this.isPaused = false;
        this.notify();
        this.startProcessing();
    }

    retry(itemId: string): void {
        const item = this.queue.find(q => q.id === itemId);
        if (item) {
            item.status = 'pending';
            item.error = null;
            item.progress = 0;
            item.task = null;
            this.notify();

            if (!this.isProcessing && !this.isPaused) {
                this.startProcessing();
            }
        }
    }

    retryFailed(): void {
        this.queue.forEach(item => {
            if (item.status === 'failed') {
                item.status = 'pending';
                item.error = null;
                item.progress = 0;
                item.task = null;
            }
        });
        this.stats.failed = 0;
        this.notify();

        if (!this.isProcessing && !this.isPaused) {
            this.startProcessing();
        }
    }

    clear(): void {
        // Cancel all active uploads
        this.queue.forEach(item => {
            if (item.task) {
                try {
                    item.task.cancel();
                } catch (err) {
                    console.error('Error cancelling task:', err);
                }
            }
        });

        this.queue = [];
        this.currentUpload = null;
        this.isProcessing = false;
        this.isPaused = false;
        this.stats = {
            total: 0,
            completed: 0,
            failed: 0,
            totalSize: 0,
            uploadedSize: 0
        };
        this.notify();
    }

    removeCompleted(): void {
        this.queue = this.queue.filter(item => item.status !== 'completed');
        this.notify();
    }
}

// Singleton instance
const uploadManager = new UploadQueueManager();

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
};

export default function ProductionImageUploader() {
    const [dragOver, setDragOver] = useState<boolean>(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [uploadState, setUploadState] = useState<UploadState>(uploadManager.getState());
    const [startTime, setStartTime] = useState<number | null>(null);
    const [selectedDriveFolder, setSelectedDriveFolder] = useState<SelectedDriveFolder | null>(null);
    const [isLoadingFolderContents, setIsLoadingFolderContents] = useState(false);
    const [isDriveImporting, setIsDriveImporting] = useState(false);
    const [selectedDriveFolder, setSelectedDriveFolder] = useState<SelectedDriveFolder | null>(null);
    const [isLoadingFolderContents, setIsLoadingFolderContents] = useState(false);
    const [isDriveImporting, setIsDriveImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data: session } = useSession();
    const searchParams = useSearchParams();
    const groupId = searchParams.get("groupId");

    useEffect(() => {
        const unsubscribe = uploadManager.addListener(setUploadState);
        return unsubscribe;
    }, []);

    useEffect(() => {
        const script = document.createElement("script");
        script.src = "https://apis.google.com/js/api.js";
        script.onload = () => {
            // @ts-ignore
            window.gapi.load("auth", { callback: () => console.log("Google Auth loaded") });
            // @ts-ignore
            window.gapi.load("picker", { callback: () => console.log("Google Picker loaded") });
        };
        document.body.appendChild(script);
    }, []);

    const fetchFolderContents = async (folderId: string, folderName: string): Promise<void> => {
        if (!session?.accessToken) return;

        setIsLoadingFolderContents(true);
        try {
            // Use Google Drive API to list files in the folder
            const response = await fetch(
                `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&fields=files(id,name,mimeType,thumbnailLink,iconLink,size)&pageSize=1000`,
                {
                    headers: {
                        'Authorization': `Bearer ${session.accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                throw new Error('Failed to fetch folder contents');
            }

            const data = await response.json();
            const files: DriveFile[] = data.files || [];

            // Filter image files
            const imageFiles = files.filter(file =>
                file.mimeType && file.mimeType.startsWith('image/')
            );

            setSelectedDriveFolder({
                id: folderId,
                name: folderName,
                imageFiles,
                totalFiles: files.length
            });
        } catch (error) {
            console.error('Error fetching folder contents:', error);
            alert('Failed to load folder contents. Please try again.');
        } finally {
            setIsLoadingFolderContents(false);
        }
    };

    const handleImportFromDrive = async () => {
        if (!session?.accessToken) {
            alert("No Google Drive access. Please login with Google.");
            return;
        }

        // Reset selected folder
        setSelectedDriveFolder(null);

        // Load picker API
        // @ts-ignore
        window.gapi.load("picker", { callback: createPicker });
    };

    const createPicker = () => {
        if (!session?.accessToken) return;

        // @ts-ignore
        const view = new google.picker.DocsView(google.picker.ViewId.FOLDERS)
            .setIncludeFolders(true)
            .setSelectFolderEnabled(true);

        // @ts-ignore
        const picker = new google.picker.PickerBuilder()
            .addView(view)
            .setOAuthToken(session.accessToken)
            .setDeveloperKey(key) // 👈 needs to be in env
            .setCallback(pickerCallback)
            .build();

        picker.setVisible(true);
    };

    const pickerCallback = async (data: any) => {
        if (data.action === "picked") {
            const folderId = data.docs[0].id;
            const folderName = data.docs[0].name;
            console.log("Selected folder:", folderId, folderName);

            // Fetch folder contents
            await fetchFolderContents(folderId, folderName);
        }
    };

    const handleImportDriveImages = async () => {
        if (!selectedDriveFolder || !groupId || !session?.user?.id) {
            alert('Missing required information for import.');
            return;
        }

        setIsDriveImporting(true);

        try {
            // Update group status first
            const res = await fetch('/api/groups', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ groupId }),
            });

            if (!res.ok) {
                const errorText = await res.text();
                console.error('Failed to update group status:', errorText);
                alert('Could not update group status.');
                return;
            }
            console.log('Group status updated to heating');

            // Save folderId for this group + user in backend
            const saveResponse = await fetch("/api/save-drive-folder", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    folderId: selectedDriveFolder.id,
                    groupId,
                    userId: session.user.id,
                }),
            });

            if (!saveResponse.ok) {
                throw new Error('Failed to save Drive folder information');
            }

            alert(`Successfully set up import for "${selectedDriveFolder.name}" with ${selectedDriveFolder.imageFiles.length} images. Processing will begin shortly.`);

            // Reset the selected folder after successful import
            setSelectedDriveFolder(null);
        } catch (error) {
            console.error('Error importing from Drive:', error);
            alert('Failed to set up Drive import. Please try again.');
        } finally {
            setIsDriveImporting(false);
        }
    };

    useEffect(() => {
        if (uploadState.isProcessing && !startTime) {
            setStartTime(Date.now());
        } else if (!uploadState.isProcessing) {
            setStartTime(null);
        }
    }, [uploadState.isProcessing, startTime]);

    const handleFileSelect = useCallback((files: FileList | null) => {
        if (!files) return;

        const validFiles = Array.from(files).filter((file) => {
            if (!file.type.startsWith('image/')) return false;
            if (file.size > 50 * 1024 * 1024) { // 50MB limit
                alert(`File ${file.name} is too large. Maximum size is 50MB.`);
                return false;
            }
            return true;
        });

        setSelectedFiles(validFiles);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragOver(false);
        handleFileSelect(e.dataTransfer.files);
    }, [handleFileSelect]);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragOver(false);
    }, []);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        handleFileSelect(e.target.files);
        // Reset input to allow selecting same files again
        e.target.value = '';
    }, [handleFileSelect]);

    const startUpload = useCallback(async () => {
        if (selectedFiles.length === 0) {
            alert('Please select images first.');
            return;
        }

        if (!groupId) {
            alert('No groupId available.');
            return;
        }

        if (!session?.user?.id) {
            alert('User session not found.');
            return;
        }

        // Update group status first
        // Update group status first
        try {
            const res = await fetch('/api/groups', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ groupId }),
            });

            if (!res.ok) {
                const errorText = await res.text();
                console.error('Failed to update group status:', errorText);
                alert('Could not update group status.');
                return;
            }
            console.log('Group status updated to heating');
        } catch (error) {
            console.error('Error updating group status:', error);
            alert('Failed to update group status.');
            return;
        }

        uploadManager.addFiles(selectedFiles, groupId, session.user.id);
        setSelectedFiles([]);
    }, [selectedFiles, groupId, session?.user?.id]);

    const calculateETA = (): number | null => {
        if (!startTime || uploadState.stats.completed === 0) return null;

        const elapsed = (Date.now() - startTime) / 1000;
        const rate = uploadState.stats.completed / elapsed;
        const remaining = uploadState.stats.total - uploadState.stats.completed;

        return rate > 0 ? remaining / rate : null;
    };

    const calculateSpeed = (): number | null => {
        if (!startTime || uploadState.stats.uploadedSize === 0) return null;

        const elapsed = (Date.now() - startTime) / 1000;
        return uploadState.stats.uploadedSize / elapsed;
    };

    const eta = calculateETA();
    const speed = calculateSpeed();
    const overallProgress = uploadState.stats.total > 0
        ? (uploadState.stats.completed / uploadState.stats.total) * 100
        : 0;

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            {/* Google Drive Import Section */}
            <div className="bg-white border rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Folder className="h-5 w-5" />
                    Import from Google Drive
                </h3>

                <div className="space-y-4">
                    {!selectedDriveFolder ? (
                        <button
                            onClick={handleImportFromDrive}
                            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                            disabled={isLoadingFolderContents}
                        >
                            <Folder className="h-4 w-4" />
                            {isLoadingFolderContents ? 'Loading...' : 'Select Google Drive Folder'}
                        </button>
                    ) : (
                        <div className="space-y-4">
                            {/* Selected Folder Info */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-medium text-blue-900 flex items-center gap-2">
                                            <Folder className="h-4 w-4" />
                                            {selectedDriveFolder.name}
                                        </h4>
                                        <p className="text-sm text-blue-700 mt-1">
                                            {selectedDriveFolder.imageFiles.length} images found
                                            {selectedDriveFolder.totalFiles > selectedDriveFolder.imageFiles.length && (
                                                <span className="text-blue-600">
                                                    {' '}({selectedDriveFolder.totalFiles - selectedDriveFolder.imageFiles.length} other files)
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setSelectedDriveFolder(null)}
                                        className="text-blue-600 hover:text-blue-800"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Image Preview Grid */}
                            {selectedDriveFolder.imageFiles.length > 0 && (
                                <div className="space-y-3">
                                    <h5 className="font-medium text-gray-700 flex items-center gap-2">
                                        <ImageIcon className="h-4 w-4" />
                                        Image Files Preview
                                    </h5>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                        {selectedDriveFolder.imageFiles.slice(0, 12).map((file) => (
                                            <div key={file.id} className="relative group">

                                                <div className="aspect-square rounded-lg overflow-hidden border">
                                                    {file.thumbnailLink ? (
                                                        <img
                                                            src={file.thumbnailLink}
                                                            alt={file.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
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
                                    {selectedDriveFolder.imageFiles.length > 12 && (
                                        <p className="text-sm text-gray-500 text-center">
                                            ... and {selectedDriveFolder.imageFiles.length - 12} more images
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Import Button */}
                            <div className="flex gap-3">
                                <button
                                    onClick={handleImportDriveImages}
                                    disabled={isDriveImporting || selectedDriveFolder.imageFiles.length === 0}
                                    className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                    {isDriveImporting ? (
                                        <>
                                            <Clock className="h-4 w-4 animate-spin" />
                                            Setting up import...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="h-4 w-4" />
                                            Import {selectedDriveFolder.imageFiles.length} Images
                                        </>
                                    )}
                                </button>

                                <button
                                    onClick={handleImportFromDrive}
                                    className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                                    disabled={isDriveImporting}
                                >
                                    <Folder className="h-4 w-4" />
                                    Choose Different Folder
                                </button>
                            </div>

                            {selectedDriveFolder.imageFiles.length === 0 && (
                                <div className="text-center py-4">
                                    <p className="text-gray-500">No image files found in this folder.</p>
                                    <button
                                        onClick={handleImportFromDrive}
                                        className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                                    >
                                        Select a different folder
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Google Drive Import Section */}
            <div className="bg-white border rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Folder className="h-5 w-5" />
                    Import from Google Drive
                </h3>

                <div className="space-y-4">
                    {!selectedDriveFolder ? (
                        <button
                            onClick={handleImportFromDrive}
                            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                            disabled={isLoadingFolderContents}
                        >
                            <Folder className="h-4 w-4" />
                            {isLoadingFolderContents ? 'Loading...' : 'Select Google Drive Folder'}
                        </button>
                    ) : (
                        <div className="space-y-4">
                            {/* Selected Folder Info */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-medium text-blue-900 flex items-center gap-2">
                                            <Folder className="h-4 w-4" />
                                            {selectedDriveFolder.name}
                                        </h4>
                                        <p className="text-sm text-blue-700 mt-1">
                                            {selectedDriveFolder.imageFiles.length} images found
                                            {selectedDriveFolder.totalFiles > selectedDriveFolder.imageFiles.length && (
                                                <span className="text-blue-600">
                                                    {' '}({selectedDriveFolder.totalFiles - selectedDriveFolder.imageFiles.length} other files)
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setSelectedDriveFolder(null)}
                                        className="text-blue-600 hover:text-blue-800"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Image Preview Grid */}
                            {selectedDriveFolder.imageFiles.length > 0 && (
                                <div className="space-y-3">
                                    <h5 className="font-medium text-gray-700 flex items-center gap-2">
                                        <ImageIcon className="h-4 w-4" />
                                        Image Files Preview
                                    </h5>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                        {selectedDriveFolder.imageFiles.slice(0, 12).map((file) => (
                                            <div key={file.id} className="relative group">

                                                <div className="aspect-square rounded-lg overflow-hidden border">
                                                    {file.thumbnailLink ? (
                                                        <img
                                                            src={file.thumbnailLink}
                                                            alt={file.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
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
                                    {selectedDriveFolder.imageFiles.length > 12 && (
                                        <p className="text-sm text-gray-500 text-center">
                                            ... and {selectedDriveFolder.imageFiles.length - 12} more images
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Import Button */}
                            <div className="flex gap-3">
                                <button
                                    onClick={handleImportDriveImages}
                                    disabled={isDriveImporting || selectedDriveFolder.imageFiles.length === 0}
                                    className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                    {isDriveImporting ? (
                                        <>
                                            <Clock className="h-4 w-4 animate-spin" />
                                            Setting up import...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="h-4 w-4" />
                                            Import {selectedDriveFolder.imageFiles.length} Images
                                        </>
                                    )}
                                </button>

                                <button
                                    onClick={handleImportFromDrive}
                                    className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                                    disabled={isDriveImporting}
                                >
                                    <Folder className="h-4 w-4" />
                                    Choose Different Folder
                                </button>
                            </div>

                            {selectedDriveFolder.imageFiles.length === 0 && (
                                <div className="text-center py-4">
                                    <p className="text-gray-500">No image files found in this folder.</p>
                                    <button
                                        onClick={handleImportFromDrive}
                                        className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                                    >
                                        Select a different folder
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* File Selection Area */}
            <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
                    ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
                    ${uploadState.isProcessing ? 'opacity-50 pointer-events-none' : 'hover:border-gray-400'}
                `}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={uploadState.isProcessing}
                />

                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                    Drop images here or click to select
                </p>
                <p className="text-lg font-medium text-gray-900 mb-2">
                    Uploading Images Directly
                    Uploading Images Directly
                </p>
                <p className="text-sm text-gray-500">
                    Supports JPG, PNG, GIF, WebP • Max 50MB per file • Select thousands of files
                </p>

                {selectedFiles.length > 0 && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-700">
                            {selectedFiles.length} files selected ({formatFileSize(selectedFiles.reduce((sum, f) => sum + f.size, 0))})
                        </p>
                    </div>
                )}
            </div>

            {/* Upload Controls */}
            {(selectedFiles.length > 0 || uploadState.stats.total > 0) && (
                <div className="flex flex-wrap gap-3">
                    {selectedFiles.length > 0 && (
                        <button
                            onClick={startUpload}
                            disabled={uploadState.isProcessing}
                            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            <Play className="h-4 w-4" />
                            Upload {selectedFiles.length} Images
                        </button>
                    )}

                    {uploadState.isProcessing && (
                        <button
                            onClick={() => uploadManager.pause()}
                            className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
                        >
                            <Pause className="h-4 w-4" />
                            Pause
                        </button>
                    )}

                    {uploadState.isPaused && (
                        <button
                            onClick={() => uploadManager.resume()}
                            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                        >
                            <Play className="h-4 w-4" />
                            Resume
                        </button>
                    )}

                    {uploadState.stats.failed > 0 && (
                        <button
                            onClick={() => uploadManager.retryFailed()}
                            className="flex items-center gap-2 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700"
                        >
                            <RotateCcw className="h-4 w-4" />
                            Retry Failed ({uploadState.stats.failed})
                        </button>
                    )}

                    {uploadState.queue.length > 0 && (
                        <>
                            <button
                                onClick={() => uploadManager.removeCompleted()}
                                className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                            >
                                Clear Completed
                            </button>

                            <button
                                onClick={() => uploadManager.clear()}
                                className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                            >
                                <X className="h-4 w-4" />
                                Clear All
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* Upload Progress */}
            {uploadState.stats.total > 0 && (
                <div className="bg-white border rounded-lg p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Upload Progress</h3>
                        {uploadState.isPaused && (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                                Paused
                            </span>
                        )}
                    </div>

                    {/* Overall Progress Bar */}
                    <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm text-gray-600">
                            <span>Overall Progress</span>
                            <span>{Math.round(overallProgress)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                                style={{ width: `${overallProgress}%` }}
                            />
                        </div>
                    </div>

                    {/* Current File Progress */}
                    {uploadState.currentUpload && (
                        <div className="space-y-2 mb-4 p-3 bg-blue-50 rounded-lg">
                            <div className="flex justify-between text-sm">
                                <span className="font-medium truncate max-w-xs">
                                    {uploadState.currentUpload.file.name}
                                </span>
                                <span>{Math.round(uploadState.currentUpload.progress)}%</span>
                            </div>
                            <div className="w-full bg-blue-200 rounded-full h-2">
                                <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${uploadState.currentUpload.progress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Statistics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">{uploadState.stats.completed}</div>
                            <div className="text-gray-500">Completed</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-red-600">{uploadState.stats.failed}</div>
                            <div className="text-gray-500">Failed</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{uploadState.stats.total - uploadState.stats.completed - uploadState.stats.failed}</div>
                            <div className="text-gray-500">Pending</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-gray-900">{uploadState.stats.total}</div>
                            <div className="text-gray-500">Total</div>
                        </div>
                    </div>

                    {/* Speed and ETA */}
                    {(speed || eta) && (
                        <div className="flex justify-between mt-4 pt-4 border-t text-sm text-gray-600">
                            {speed && (
                                <span>Speed: {formatFileSize(speed)}/s</span>
                            )}
                            {eta && (
                                <span>ETA: {formatTime(eta)}</span>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Upload Queue */}
            {uploadState.queue.length > 0 && (
                <div className="bg-white border rounded-lg shadow-sm">
                    <div className="p-4 border-b">
                        <h3 className="text-lg font-semibold text-gray-900">Upload Queue ({uploadState.queue.length})</h3>
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                        {uploadState.queue.slice(0, 50).map((item) => (
                            <div key={item.id} className="flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-gray-50">
                                <div className="flex-shrink-0">
                                    {item.status === 'completed' && <CheckCircle className="h-5 w-5 text-green-500" />}
                                    {item.status === 'failed' && <AlertCircle className="h-5 w-5 text-red-500" />}
                                    {item.status === 'uploading' && <Clock className="h-5 w-5 text-blue-500 animate-spin" />}
                                    {item.status === 'pending' && <FileImage className="h-5 w-5 text-gray-400" />}
                                </div>

                                <div className="flex-grow min-w-0">
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                            {item.file.name}
                                        </p>
                                        <span className="text-xs text-gray-500 ml-2">
                                            {formatFileSize(item.file.size)}
                                        </span>
                                    </div>

                                    {item.status === 'uploading' && (
                                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                                            <div
                                                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                                                style={{ width: `${item.progress}%` }}
                                            />
                                        </div>
                                    )}

                                    {item.error && (
                                        <p className="text-xs text-red-600 mt-1">{item.error}</p>
                                    )}
                                </div>

                                {item.status === 'failed' && (
                                    <button
                                        onClick={() => uploadManager.retry(item.id)}
                                        className="flex-shrink-0 text-blue-600 hover:text-blue-800 text-sm"
                                    >
                                        Retry
                                    </button>
                                )}
                            </div>
                        ))}

                        {uploadState.queue.length > 50 && (
                            <div className="p-3 text-center text-sm text-gray-500 bg-gray-50">
                                ... and {uploadState.queue.length - 50} more files
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Status Indicator for Background Uploads */}
            {uploadState.isProcessing && (
                <div className="fixed bottom-4 right-4 bg-white border-2 border-blue-500 rounded-lg p-4 shadow-lg z-50">
                    <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-blue-600 animate-spin" />
                        <span className="text-sm font-medium">Uploading in background</span>
                    </div>
                    <div className="text-xs text-gray-600">
                        {uploadState.stats.completed} / {uploadState.stats.total} completed
                    </div>
                    {speed && (
                        <div className="text-xs text-gray-600">
                            {formatFileSize(speed)}/s
                        </div>
                    )}
                    <div className="mt-2">
                        <div className="w-32 bg-gray-200 rounded-full h-1">
                            <div
                                className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                                style={{ width: `${overallProgress}%` }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}