'use client';

import { storage } from '@/lib/firebaseClient';
import {
    ref,
    uploadBytesResumable,
    UploadTask,
} from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { useState, useRef } from 'react';
import pLimit from 'p-limit';
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";

interface ImageMeta {
    id: string;
    location: string | null;
    filename: string;
    size: number;
    uploaded_at: string;
}

export default function ImageUploader() {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [filesMeta, setFilesMeta] = useState<ImageMeta[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadedCount, setUploadedCount] = useState(0);
    const uploadCounter = useRef(0);
    const { data: session } = useSession();
    const searchParams = useSearchParams();

    // check groupId from URL first, fallback to context
    const groupId = searchParams.get("groupId");
    console.log("group id", groupId)
    // keep active tasks so we can cancel them
    const activeTasks = useRef<UploadTask[]>([]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) return;

        const validFiles = Array.from(files).filter((file) =>
            file.type.startsWith('image/')
        );
        setSelectedFiles(validFiles);
        setFilesMeta([]);
        setUploadedCount(0);
        uploadCounter.current = 0;
        activeTasks.current = []; // reset task list
    };

    const updateProgress = () => {
        uploadCounter.current += 1;
        if (
            uploadCounter.current % 5 === 0 ||
            uploadCounter.current === selectedFiles.length
        ) {
            setUploadedCount(uploadCounter.current);
        }
    };

    const handleUpload = async () => {
        if (selectedFiles.length === 0) {
            alert('Please select images first.');
            return;
        }

        if (!groupId) {
            alert('No groupId available.');
            return;
        }

        setUploading(true);

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
                setUploading(false);
                return;
            }
            console.log('Group status updated to heating');
        } catch (error) {
            console.error('Error updating group status:', error);
            setUploading(false);
            return;
        }

        const limit = pLimit(20);
        const results: ImageMeta[] = [];

        const uploadTasks = selectedFiles.map((file) =>
            limit(() => {
                return new Promise<ImageMeta | null>((resolve) => {
                    try {
                        const uuid = uuidv4();
                        const timestamp = new Date().toISOString();
                        const filePath = `${uuid}`;
                        const fileRef = ref(storage, filePath);

                        const task = uploadBytesResumable(fileRef, file);
                        activeTasks.current.push(task);

                        task.on(
                            'state_changed',
                            undefined, // we don’t track per-file %
                            (error) => {
                                console.error(`Upload failed for ${file.name}:`, error);
                                resolve(null);
                            },
                            async () => {
                                const meta: ImageMeta = {
                                    id: uuid,
                                    location: null,
                                    filename: file.name,
                                    size: file.size,
                                    uploaded_at: timestamp,
                                };
                                updateProgress();
                                resolve(meta);
                            }
                        );
                    } catch (err) {
                        console.error(`Error starting upload for ${file.name}:`, err);
                        resolve(null);
                    }
                });
            })
        );

        try {
            const uploadedAll = await Promise.all(uploadTasks);
            const filtered = uploadedAll.filter((m): m is ImageMeta => m !== null);

            setFilesMeta(filtered);

            // Send metadata in chunks of 20
            const chunkSize = 20;
            for (let i = 0; i < filtered.length; i += chunkSize) {
                const chunk = filtered.slice(i, i + chunkSize);
                try {
                    const res = await fetch('/api/update-image-upload-status', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId: session?.user?.id,
                            groupId,
                            images: chunk
                        }),
                    });

                    if (!res.ok) {
                        const errorText = await res.text();
                        console.error('Failed to save metadata chunk:', errorText);
                    } else {
                        const data = await res.json();
                        console.log('Metadata chunk saved:', data);
                    }
                } catch (error) {
                    console.error('Error sending metadata:', error);
                }
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Some uploads may have failed.');
        }

        setUploading(false);
        setSelectedFiles([]);
        setFilesMeta([]);
        setUploadedCount(0);
        uploadCounter.current = 0;
        activeTasks.current = [];
    };

    const handleCancel = () => {
        // cancel all ongoing firebase uploads
        activeTasks.current.forEach((task) => {
            try {
                task.cancel();
            } catch (err) {
                console.error('Error cancelling task:', err);
            }
        });
        activeTasks.current = [];

        setUploading(false);
        setSelectedFiles([]);
        setFilesMeta([]);
        setUploadedCount(0);
        uploadCounter.current = 0;
    };

    return (
        <div className="flex flex-col gap-4 max-w-md mx-auto mt-8">
            <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                disabled={uploading}
            />
            {session?.user?.id && <button
                onClick={handleUpload}
                disabled={uploading || selectedFiles.length === 0}
                className="bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-400"
            >
                {uploading ? 'Uploading...' : 'Upload Images'}
            </button>}

            {uploading && (
                <>
                    <progress
                        value={uploadedCount}
                        max={selectedFiles.length}
                        className="w-full h-2"
                    />
                    <p className="text-sm text-gray-600">
                        Uploaded: {uploadedCount} / {selectedFiles.length}
                    </p>
                    <button
                        onClick={handleCancel}
                        className="text-red-600 underline text-sm"
                    >
                        Cancel Upload
                    </button>
                </>
            )}
        </div>
    );
}
