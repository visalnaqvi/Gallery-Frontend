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
            document.body.removeChild(script);
        };
    }, []);

    if (!session?.user?.id || !groupId) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800">
                        {!session?.user?.id ? 'Please log in to upload images.' : 'No group selected.'}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
                Upload Images
            </h1>



            {/* Direct File Upload Component */}
            <div className="bg-white border rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Upload Images Directly
                </h3>
                <FileUpload
                    groupId={groupId}
                    userId={session.user.id}
                    onUploadStart={handleUploadStart}
                    onUploadComplete={handleUploadComplete}
                />
            </div>

            {/* Google Drive Import Component */}
            <DriveImport
                groupId={groupId}
                userId={session.user.id}
                onImportStart={handleImportStart}
                onImportComplete={handleImportComplete}
            />
        </div>
    );
}