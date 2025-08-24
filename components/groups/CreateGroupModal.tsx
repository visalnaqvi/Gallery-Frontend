'use client';

import { useState } from 'react';

export default function CreateGroupModal({
    userId,
    onClose,
    onGroupCreated,
}: {
    userId: string;
    onClose: () => void;
    onGroupCreated: () => void;
}) {
    const [groupName, setGroupName] = useState('');
    const [loading, setLoading] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [planType, setPlanType] = useState('Lite'); // default
    const [access, setAccess] = useState('Private'); // default

    // Resize image to 100px and return Uint8Array (buffer)
    async function resizeImageToBuffer(file: File): Promise<Uint8Array> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    if (!ctx) return reject("Canvas not supported");

                    // Keep aspect ratio
                    const maxSize = 300;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxSize) {
                            height = Math.round((height * maxSize) / width);
                            width = maxSize;
                        }
                    } else {
                        if (height > maxSize) {
                            width = Math.round((width * maxSize) / height);
                            height = maxSize;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob(
                        blob => {
                            if (!blob) return reject("Canvas blob failed");
                            blob.arrayBuffer().then(buf => resolve(new Uint8Array(buf)));
                        },
                        "image/jpeg",
                        0.8 // quality
                    );
                };
                if (e.target?.result) img.src = e.target.result as string;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async function handleCreateGroup() {
        if (!groupName.trim()) return;

        setLoading(true);

        let profilePicBuffer: Uint8Array | null = null;
        if (file) {
            profilePicBuffer = await resizeImageToBuffer(file);
        }

        try {
            const res = await fetch(`/api/groups?userId=${userId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: groupName,
                    userId,
                    profile_pic_bytes: profilePicBuffer, // send as array of numbers
                    planType,
                    access,
                }),
            });

            const data = await res.json();
            setLoading(false);

            if (res.ok) {
                alert('Group created successfully!');
                onGroupCreated();
                onClose();
            } else {
                alert(data.error || 'Failed to create group');
            }
        } catch (err) {
            console.error(err);
            setLoading(false);
            alert('Error while creating group');
        }
    }

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
            <div className="bg-white p-6 rounded shadow-md w-full max-w-sm">
                <h2 className="text-lg font-semibold mb-4">Create New Group</h2>

                {/* Group Name */}
                <input
                    type="text"
                    value={groupName}
                    onChange={e => setGroupName(e.target.value)}
                    placeholder="Enter group name"
                    className="w-full border p-2 rounded mb-4"
                />

                {/* Profile Picture */}
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Profile Picture</label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={e => setFile(e.target.files ? e.target.files[0] : null)}
                        className="w-full border p-2 rounded"
                    />
                </div>

                {/* Payment Plan */}
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Payment Plan</label>
                    <select
                        value={planType}
                        onChange={e => setPlanType(e.target.value)}
                        className="w-full border p-2 rounded"
                    >
                        <option value="Lite">Lite</option>
                        <option value="Pro">Pro</option>
                        <option value="Elite">Elite</option>
                    </select>
                </div>

                {/* Access */}
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Access</label>
                    <select
                        value={access}
                        onChange={e => setAccess(e.target.value)}
                        className="w-full border p-2 rounded"
                    >
                        <option value="Public">Public</option>
                        <option value="Private">Private</option>
                    </select>
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border rounded hover:bg-gray-100"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCreateGroup}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
                    >
                        {loading ? 'Creating...' : 'Create'}
                    </button>
                </div>
            </div>
        </div>
    );
}
