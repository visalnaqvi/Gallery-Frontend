'use client';

import React, { useEffect } from 'react';
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import DriveImport from './drive';
import FileUpload from './uploader';

export default function ImageUploader() {
    const { data: session } = useSession();
    const searchParams = useSearchParams();
    const groupId = searchParams.get("groupId");

    const handleUploadStart = () => {
        console.log('Upload started');
        // You can add any logic here when upload starts
    };

    const handleUploadComplete = () => {
        console.log('Upload completed');
        // You can add any logic here when upload completes
    };

    const handleImportStart = () => {
        console.log('Import started');
        // You can add any logic here when import starts
    };

    const handleImportComplete = () => {
        console.log('Import completed');
        // You can add any logic here when import completes
    };

    useEffect(() => {
        // Load Google APIs
        const script = document.createElement("script");
        script.src = "https://apis.google.com/js/api.js";
        script.onload = () => {
            // @ts-ignore
            if (window.gapi) {
                // @ts-ignore
                window.gapi.load("auth", { callback: () => console.log("Google Auth loaded") });
            }
        };
        document.body.appendChild(script);

        return () => {
            // Cleanup script if needed
            if (document.body.contains(script)) {
                document.body.removeChild(script);
            }
        };
    }, []);

    if (!session?.user?.id || !groupId) {
        return (
            <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
                    <p className="text-sm sm:text-base text-yellow-800">
                        {!session?.user?.id ? 'Please log in to upload images.' : 'No group selected.'}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 py-6 sm:py-8">
            {/* Page Title */}
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 px-1">
                Upload Images
            </h1>

            <div className="space-y-4 sm:space-y-6">
                {/* Google Drive Import Component */}
                <DriveImport
                    groupId={groupId}
                    userId={session.user.id}
                    onImportStart={handleImportStart}
                    onImportComplete={handleImportComplete}
                />
                {/* Direct File Upload Component */}
                <div className="bg-white border rounded-lg p-3 sm:p-6 shadow-sm">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                        Upload Images Directly
                    </h3>
                    <FileUpload
                        groupId={groupId}
                        userId={session.user.id}
                        onUploadStart={handleUploadStart}
                        onUploadComplete={handleUploadComplete}
                    />
                </div>


            </div>
        </div>
    );
}