"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import InfoToast from "@/components/infoToast";

type GroupDetails = {
    name: string;
    profile_pic_bytes: string;
    total_images: number;
    total_size: number;
    admin_user: string;
    last_image_uploaded_at: string;
    plan_type: string;
    access: string;
    created_at: string;
};

type User = {
    id: string;
    name: string;
    email: string;
};

export default function GroupSettingsComponent() {
    const searchParams = useSearchParams();
    const groupId = searchParams.get("groupId");

    const [group, setGroup] = useState<GroupDetails | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState<any>({});
    const [newProfileFile, setNewProfileFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const fetchData = async () => {
        try {
            const groupRes = await fetch(`/api/groups/details?groupId=${groupId}`);
            const groupData = await groupRes.json();
            if (groupData?.[0]) {
                setGroup(groupData[0]);
                setForm(groupData[0]);
            }

            const userRes = await fetch(`/api/users?groupId=${groupId}`);
            const userData = await userRes.json();
            setUsers(userData || []);
        } catch (err) {
            console.error("Error fetching data:", err);
        } finally {
            setLoading(false);
        }
    };
    // fetch group + users
    useEffect(() => {
        if (!groupId) return;



        fetchData();
    }, [groupId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    // helper to resize image to 200px max
    async function resizeImageToBuffer(file: File): Promise<Uint8Array> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement("canvas");
                    const ctx = canvas.getContext("2d");
                    if (!ctx) return reject("Canvas not supported");

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
                        0.8
                    );
                };
                if (e.target?.result) img.src = e.target.result as string;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        if (file) {
            setNewProfileFile(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!groupId) return;

        let profilePicBuffer: Uint8Array | null = null;
        if (newProfileFile) {
            profilePicBuffer = await resizeImageToBuffer(newProfileFile);
        }

        try {
            const res = await fetch(`/api/groups/details?groupId=${groupId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...form,
                    profile_pic_bytes: profilePicBuffer, // send buffer if updated
                }),
            });

            if (res.ok) {
                alert("Group updated successfully!");
                setNewProfileFile(null);
                setPreview(null);
                fetchData()
            } else {
                alert("Failed to update group.");
            }
        } catch (err) {
            console.error("Error updating group:", err);
        }
    };

    if (loading) return <div className="p-6"><InfoToast loading={true} message="Loading..." /></div>;
    if (!group) return <div className="p-6"><InfoToast loading={false} message="Group Not Found..." /></div>;

    return (
        <div>
            <br></br>
            <div className="max-w-2xl mx-auto p-6 bg-white shadow-md rounded-xl mt-2">
                <h1 className="text-2xl font-bold mb-4">Group Settings</h1>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Group Name */}
                    <div>
                        <label className="block text-sm font-medium">Group Name</label>
                        <input
                            type="text"
                            name="name"
                            value={form.name || ""}
                            onChange={handleChange}
                            className="mt-1 w-full p-2 border rounded-lg border-[#dbdbdb] shadow-sm"
                        />
                    </div>

                    {/* Profile Picture */}
                    <div>
                        <label className="block text-sm font-medium">Profile Picture</label>
                        <div className="flex items-center gap-4 mt-2">
                            {(preview || group.profile_pic_bytes) && (
                                <img
                                    src={preview || group.profile_pic_bytes}
                                    alt="Group Profile"
                                    className="w-20 h-20 rounded-full object-cover"
                                />
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="border p-2 rounded border-[#dbdbdb] shadow-sm"
                            />
                        </div>
                    </div>

                    {/* Plan Type */}
                    {/* <div>
                    <label className="block text-sm font-medium">Plan Type</label>
                    <select
                        name="plan_type"
                        value={form.plan_type || ""}
                        onChange={handleChange}
                        disabled
                        className="mt-1 w-full p-2 border rounded-lg bg-gray-100"
                    >
                        <option value="Lite">Lite</option>
                        <option value="Pro">Pro</option>
                        <option value="Elite">Elite</option>
                    </select>
                </div> */}

                    {/* Access */}
                    <div>
                        <label className="block text-sm font-medium">Access</label>
                        <select
                            name="access"
                            value={form.access || ""}
                            onChange={handleChange}
                            className="mt-1 w-full p-2 border rounded-lg border-[#dbdbdb] shadow-sm"
                        >
                            <option value="Private">Private</option>
                            <option value="Public">Public</option>
                        </select>
                    </div>

                    {/* Admin User */}
                    <div>
                        <label className="block text-sm font-medium">Admin User</label>
                        <select
                            name="admin_user"
                            value={form.admin_user || ""}
                            onChange={handleChange}
                            className="mt-1 w-full p-2 border rounded-lg border-[#dbdbdb] shadow-sm"
                        >
                            {users.map((user, idx) => (
                                <option key={idx} value={user.email}>
                                    {user.name} ({user.email})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Read-only fields */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium">Total Images</label>
                            <input
                                type="text"
                                value={group.total_images}
                                disabled
                                className="mt-1 w-full p-2 border rounded-lg bg-gray-100 border-[#dbdbdb] shadow-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Total Size</label>
                            <input
                                type="text"
                                value={group.total_size}
                                disabled
                                className="mt-1 w-full p-2 border rounded-lg bg-gray-100 border-[#dbdbdb] shadow-sm"
                            />
                        </div>
                    </div>

                    {/* Read-only fields */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium">Last Image Uploaded At</label>
                            <input
                                type="text"
                                value={group.last_image_uploaded_at ? group.last_image_uploaded_at : ""}
                                disabled
                                className="mt-1 w-full p-2 border rounded-lg bg-gray-100 border-[#dbdbdb] shadow-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Create On</label>
                            <input
                                type="text"
                                value={group.created_at ? group.created_at : ""}
                                disabled
                                className="mt-1 w-full p-2 border rounded-lg bg-gray-100 border-[#dbdbdb] shadow-sm"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 cursor-pointer"
                    >
                        Save Changes
                    </button>
                </form>
            </div>
        </div>
    );
}
