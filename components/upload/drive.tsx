'use client';

import React, { useState, useEffect } from 'react';
import { Upload, Clock, X, Folder } from 'lucide-react';
import { useSession } from "next-auth/react";

interface DriveImportProps {
    groupId: string | null;
    userId: string;
    onImportStart: () => void;
    onImportComplete: () => void;
}

interface SelectedFolder {
    id: string;
    name: string;
}

declare global {
    interface Window {
        google: any;
        gapi: any;
    }
}

export default function GooglePickerDriveImport({ groupId, userId, onImportStart, onImportComplete }: DriveImportProps) {
    const [isPickerLoaded, setIsPickerLoaded] = useState(false);
    const [selectedFolder, setSelectedFolder] = useState<SelectedFolder | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [count, setCount] = useState<number>(0);
    const [checkCountLoading, setCheckCountLoading] = useState(false);
    const { data: session } = useSession();

    // Google API configuration
    const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

    useEffect(() => {
        loadGoogleAPIs();
        fetchCount();
    }, [groupId]);

    const fetchCount = async () => {
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
            } else {
                console.error("Error:", data.error);
            }
        } catch (err) {
            console.error("Request failed:", err);
        } finally {
            setCheckCountLoading(false);
        }
    };

    const loadGoogleAPIs = () => {
        // Load Google API script
        if (!window.gapi) {
            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.onload = () => {
                window.gapi.load('picker', initializePicker);
            };
            document.body.appendChild(script);
        } else {
            window.gapi.load('picker', initializePicker);
        }
    };

    const initializePicker = () => {
        setIsPickerLoaded(true);
    };

    const openPicker = () => {
        if (!window.google || !session?.accessToken) {
            alert("Google Picker not ready or user not signed in.");
            return;
        }

        const view = new window.google.picker.DocsView()
            .setIncludeFolders(true)
            .setSelectFolderEnabled(true)
            .setOwnedByMe(true)
            .setMode(window.google.picker.DocsViewMode.LIST);

        const picker = new window.google.picker.PickerBuilder()
            .setAppId(GOOGLE_API_KEY!)
            .addView(view)
            .setOAuthToken(session.accessToken)
            .setDeveloperKey(GOOGLE_API_KEY)
            .setCallback(pickerCallback)
            .setTitle('Select a folder from Google Drive')
            .build();

        picker.setVisible(true);
    };

    const pickerCallback = (data: any) => {
        if (data.action === window.google.picker.Action.PICKED) {
            const selectedItems = data.docs;

            // Only handle folder selection
            const folder = selectedItems.find((item: any) =>
                item.mimeType === 'application/vnd.google-apps.folder'
            );

            if (folder) {
                setSelectedFolder({
                    id: folder.id,
                    name: folder.name
                });
            } else {
                alert("Please select a folder, not individual files.");
            }
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

            await fetchCount();

            alert(`Successfully set up import for "${selectedFolder.name}". Processing will begin shortly.`);

            setSelectedFolder(null);
            onImportComplete();

        } catch (error) {
            console.error('Error importing from Drive:', error);
            alert('Failed to set up Drive import. Please try again.');
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div className="bg-white border rounded-lg p-6 shadow-sm">
            {/* Status Banner */}
            {checkCountLoading ? (
                <div className='w-full bg-blue-100 p-2 rounded mb-4'>
                    <p className="font-bold text-blue-600">Loading importing groups...</p>
                </div>
            ) : count > 0 && (
                <div className='w-full bg-blue-100 p-2 rounded mb-4'>
                    <p className="font-bold text-blue-600">
                        Currently importing {count} folders from your Google Drive. Images will be available in gallery shortly.
                        Meanwhile you can select more folders to import.
                    </p>
                </div>
            )}

            {/* Header */}
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="30" height="30" viewBox="0 0 48 48">
                    <path fill="#1e88e5" d="M38.59,39c-0.535,0.93-0.298,1.68-1.195,2.197C36.498,41.715,35.465,42,34.39,42H13.61 c-1.074,0-2.106-0.285-3.004-0.802C9.708,40.681,9.945,39.93,9.41,39l7.67-9h13.84L38.59,39z"></path>
                    <path fill="#fbc02d" d="M27.463,6.999c1.073-0.002,2.104-0.716,3.001-0.198c0.897,0.519,1.66,1.27,2.197,2.201l10.39,17.996 c0.537,0.93,0.807,1.967,0.808,3.002c0.001,1.037-1.267,2.073-1.806,3.001l-11.127-3.005l-6.924-11.993L27.463,6.999z"></path>
                    <path fill="#e53935" d="M43.86,30c0,1.04-0.27,2.07-0.81,3l-3.67,6.35c-0.53,0.78-1.21,1.4-1.99,1.85L30.92,30H43.86z"></path>
                    <path fill="#4caf50" d="M5.947,33.001c-0.538-0.928-1.806-1.964-1.806-3c0.001-1.036,0.27-2.073,0.808-3.004l10.39-17.996 c0.537-0.93,1.3-1.682,2.196-2.2c0.897-0.519,1.929,0.195,3.002,0.197l3.459,11.009l-6.922,11.989L5.947,33.001z"></path>
                    <path fill="#1565c0" d="M17.08,30l-6.47,11.2c-0.78-0.45-1.46-1.07-1.99-1.85L4.95,33c-0.54-0.93-0.81-1.96-0.81-3H17.08z"></path>
                    <path fill="#2e7d32" d="M30.46,6.8L24,18L17.53,6.8c0.78-0.45,1.66-0.73,2.6-0.79L27.46,6C28.54,6,29.57,6.28,30.46,6.8z"></path>
                </svg>
                Import from Google Drive
            </h3>

            {/* Main Content */}
            {!selectedFolder ? (
                <div className="space-y-4">
                    <div className="text-center py-8">
                        <Folder className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                        <p className="text-gray-600 mb-4">
                            Select a folder from your Google Drive to import all images
                        </p>
                        <button
                            onClick={openPicker}
                            disabled={!isPickerLoaded || !session?.accessToken}
                            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed mx-auto"
                        >
                            {!isPickerLoaded ? (
                                <>
                                    <Clock className="h-5 w-5 animate-spin" />
                                    Loading Google Picker...
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="20" height="20" viewBox="0 0 48 48">
                                        <path fill="#1e88e5" d="M38.59,39c-0.535,0.93-0.298,1.68-1.195,2.197C36.498,41.715,35.465,42,34.39,42H13.61 c-1.074,0-2.106-0.285-3.004-0.802C9.708,40.681,9.945,39.93,9.41,39l7.67-9h13.84L38.59,39z"></path>
                                        <path fill="#fbc02d" d="M27.463,6.999c1.073-0.002,2.104-0.716,3.001-0.198c0.897,0.519,1.66,1.27,2.197,2.201l10.39,17.996 c0.537,0.93,0.807,1.967,0.808,3.002c0.001,1.037-1.267,2.073-1.806,3.001l-11.127-3.005l-6.924-11.993L27.463,6.999z"></path>
                                        <path fill="#e53935" d="M43.86,30c0,1.04-0.27,2.07-0.81,3l-3.67,6.35c-0.53,0.78-1.21,1.4-1.99,1.85L30.92,30H43.86z"></path>
                                        <path fill="#4caf50" d="M5.947,33.001c-0.538-0.928-1.806-1.964-1.806-3c0.001-1.036,0.27-2.073,0.808-3.004l10.39-17.996 c0.537-0.93,1.3-1.682,2.196-2.2c0.897-0.519,1.929,0.195,3.002,0.197l3.459,11.009l-6.922,11.989L5.947,33.001z"></path>
                                        <path fill="#1565c0" d="M17.08,30l-6.47,11.2c-0.78-0.45-1.46-1.07-1.99-1.85L4.95,33c-0.54-0.93-0.81-1.96-0.81-3H17.08z"></path>
                                        <path fill="#2e7d32" d="M30.46,6.8L24,18L17.53,6.8c0.78-0.45,1.66-0.73,2.6-0.79L27.46,6C28.54,6,29.57,6.28,30.46,6.8z"></path>
                                    </svg>
                                    Select Drive Folder
                                </>
                            )}
                        </button>
                    </div>

                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-2">How it works:</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                            <li>• Click "Select Drive Folder" to open Google Drive picker</li>
                            <li>• Choose a folder that contains your images</li>
                            <li>• All images in that folder will be imported to your gallery</li>
                            <li>• Processing happens in the background</li>
                        </ul>
                    </div>
                </div>
            ) : (
                /* Folder Selected */
                <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-medium text-blue-900 flex items-center gap-2">
                                    <Folder className="h-4 w-4" />
                                    {selectedFolder.name}
                                </h4>
                                <p className="text-sm text-blue-700 mt-1">
                                    Folder selected for import
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedFolder(null)}
                                className="text-blue-600 hover:text-blue-800"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Import Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={handleImport}
                            disabled={isImporting}
                            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {isImporting ? (
                                <>
                                    <Clock className="h-4 w-4 animate-spin" />
                                    Setting up import...
                                </>
                            ) : (
                                <>
                                    <Upload className="h-4 w-4" />
                                    Import Folder
                                </>
                            )}
                        </button>

                        <button
                            onClick={() => setSelectedFolder(null)}
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