"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import InfoToast from "@/components/infoToast";
import { useSession } from "next-auth/react";
import { Search, X, Check, UserPlus, Crown } from "lucide-react";

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
    delete_at: string;
    invited_owner: string | null;
};

type User = {
    id: string;
    name: string;
    email: string;
};

type Member = {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
};

export default function GroupSettingsComponent() {
    const searchParams = useSearchParams();
    const groupId = searchParams.get("groupId");
    const { data: session } = useSession();

    const [group, setGroup] = useState<GroupDetails | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState<any>({});
    const [newProfileFile, setNewProfileFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);

    // Ownership transfer states
    const [searchEmail, setSearchEmail] = useState("");
    const [searchResult, setSearchResult] = useState<any>(null);
    const [searching, setSearching] = useState(false);
    const [showOwnershipConfirm, setShowOwnershipConfirm] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);

    const formatFileSize = (bytes: number): string => {
        const gb = bytes / (1024 * 1024 * 1024);
        return `${gb.toFixed(2)} GB`;
    };

    const formatDateTime = (dateString: string): string => {
        if (!dateString) return "Not Available";
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

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

            const membersRes = await fetch(`/api/groups/members?groupId=${groupId}`);
            const membersData = await membersRes.json();
            setMembers(membersData.members || []);
        } catch (err) {
            console.error("Error fetching data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!groupId) return;
        fetchData();
    }, [groupId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

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
                    profile_pic_bytes: profilePicBuffer,
                }),
            });

            if (res.ok) {
                alert("Group updated successfully!");
                setNewProfileFile(null);
                setPreview(null);
                fetchData();
            } else {
                alert("Failed to update group.");
            }
        } catch (err) {
            console.error("Error updating group:", err);
        }
    };

    const handleSearchUser = async () => {
        if (!searchEmail.trim()) return;

        setSearching(true);
        try {
            const res = await fetch(`/api/users/search?email=${encodeURIComponent(searchEmail.trim())}`);
            const data = await res.json();
            setSearchResult(data);
        } catch (err) {
            console.error("Error searching user:", err);
        } finally {
            setSearching(false);
        }
    };

    const handleAddMember = async () => {
        if (!searchResult?.user) return;

        try {
            const res = await fetch('/api/groups/members', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    groupId: parseInt(groupId!),
                    userId: searchResult.user.id
                })
            });

            if (res.ok) {
                alert("Member added successfully!");
                setSearchEmail("");
                setSearchResult(null);
                fetchData();
            } else {
                alert("Failed to add member.");
            }
        } catch (err) {
            console.error("Error adding member:", err);
        }
    };

    const handleInviteOwnership = async (userId: string) => {
        setSelectedUser(userId);
        setShowOwnershipConfirm(true);
    };

    const confirmInviteOwnership = async () => {
        try {
            const res = await fetch('/api/groups/ownership', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    groupId: parseInt(groupId!),
                    invitedUserId: selectedUser
                })
            });

            if (res.ok) {
                alert("Ownership invitation sent!");
                setShowOwnershipConfirm(false);
                fetchData();
            } else {
                alert("Failed to send invitation.");
            }
        } catch (err) {
            console.error("Error sending ownership invitation:", err);
        }
    };

    const handleCancelInvite = async () => {
        try {
            const res = await fetch(`/api/groups/ownership?groupId=${groupId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                alert("Invitation cancelled!");
                fetchData();
            }
        } catch (err) {
            console.error("Error cancelling invitation:", err);
        }
    };

    const handleOwnershipAction = async (action: 'accept' | 'reject') => {
        try {
            const res = await fetch('/api/groups/ownership', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    groupId: parseInt(groupId!),
                    action
                })
            });

            if (res.ok) {
                alert(action === 'accept' ? "Ownership transferred!" : "Invitation rejected!");
                fetchData();
            }
        } catch (err) {
            console.error("Error processing ownership action:", err);
        }
    };

    const handleConfirmDelete = useCallback(async () => {
        if (!groupId) return;

        try {
            const res = await fetch(`/api/groups?groupId=${groupId}`, {
                method: "DELETE",
            });

            if (!res.ok) {
                const err = await res.json();
                console.error("Failed to delete:", err.error);
                alert("Failed to schedule delete.");
                return;
            }

            alert("Group will be deleted in 24 hours.");
            fetchData();
            setShowDeleteConfirm(false);
        } catch (err) {
            console.error("Error deleting Group:", err);
            alert("Something went wrong.");
        }
    }, [groupId]);
    const handleRemoveMember = async (userId: string) => {
        if (!confirm("Are you sure you want to remove this member?")) return;

        try {
            const res = await fetch(`/api/groups/members?groupId=${groupId}&userId=${userId}&mode=remove`, {
                method: 'DELETE'
            });

            if (res.ok) {
                alert("Member removed successfully!");
                fetchData();
            } else {
                alert("Failed to remove member.");
            }
        } catch (err) {
            console.error("Error removing member:", err);
        }
    };

    const handleLeaveGroup = async () => {
        if (!confirm("Are you sure you want to leave this group?")) return;

        try {
            const res = await fetch(`/api/groups/members?groupId=${groupId}&userId=${session?.user?.id}&mode=leave`, {
                method: 'DELETE'
            });

            if (res.ok) {
                alert("You have left the group!");
                window.location.href = "/"; // Redirect to groups page
            } else {
                alert("Failed to leave group.");
            }
        } catch (err) {
            console.error("Error leaving group:", err);
        }
    };
    const handleRestoreGroup = useCallback(async () => {
        if (!groupId) return;

        try {
            const res = await fetch(`/api/groups/restore?groupId=${groupId}`, {
                method: "PATCH",
            });

            if (!res.ok) {
                const err = await res.json();
                console.error("Failed to RESTORE:", err.error);
                alert("Failed to RESTORE.");
                return;
            }
            fetchData();
        } catch (err) {
            console.error("Error restoring Group:", err);
            alert("Something went wrong.");
        }
    }, [groupId]);

    const isAdmin = session?.user?.id === group?.admin_user;
    const isInvitedOwner = session?.user?.id === group?.invited_owner;
    const hasActiveInvite = !!group?.invited_owner;

    if (loading) return <div className="p-6"><InfoToast loading={true} message="Loading..." /></div>;
    if (!group) return <div className="p-6"><InfoToast loading={false} message="Group Not Found..." /></div>;

    return (
        <div>
            <br />

            {/* Ownership Invitation Banner */}
            {isInvitedOwner && (
                <div className="max-w-2xl mx-auto mb-4 p-4 bg-yellow-50 border-2 border-yellow-400 rounded-xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-yellow-900">Ownership Transfer Invitation</h3>
                            <p className="text-sm text-yellow-700">You've been invited to become the owner of this group</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleOwnershipAction('accept')}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                                Accept
                            </button>
                            <button
                                onClick={() => handleOwnershipAction('reject')}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                                Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/65" onClick={(e) => e.stopPropagation()}>
                    <div className="bg-white rounded-lg p-6 max-w-md mx-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Deletion</h3>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to delete this group? This action will schedule the group for deletion in 24 hours.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50">
                                Cancel
                            </button>
                            <button onClick={handleConfirmDelete} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Ownership Confirmation Modal */}
            {showOwnershipConfirm && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/65" onClick={(e) => e.stopPropagation()}>
                    <div className="bg-white rounded-lg p-6 max-w-md mx-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Ownership Transfer</h3>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to invite this user to become the owner? They will need to accept the invitation.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setShowOwnershipConfirm(false)} className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50">
                                Cancel
                            </button>
                            <button onClick={confirmInviteOwnership} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                                Send Invitation
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-2xl mx-auto p-6 bg-white shadow-md rounded-xl mt-2">
                <h1 className="text-2xl font-bold mb-4">Group Settings</h1>

                <form onSubmit={handleSubmit} className="space-y-4">
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

                    {/* <div>
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
                    </div> */}

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
                                value={formatFileSize(group.total_size)}
                                disabled
                                className="mt-1 w-full p-2 border rounded-lg bg-gray-100 border-[#dbdbdb] shadow-sm"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium">Last Image Uploaded</label>
                            <input
                                type="text"
                                value={formatDateTime(group.last_image_uploaded_at)}
                                disabled
                                className="mt-1 w-full p-2 border rounded-lg bg-gray-100 border-[#dbdbdb] shadow-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Created On</label>
                            <input
                                type="text"
                                value={formatDateTime(group.created_at)}
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

                {/* Add Member Section - Only visible to admin */}
                {isAdmin && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <h2 className="text-lg font-semibold mb-3">Add Member</h2>
                        <div className="flex gap-2">
                            <input
                                type="email"
                                value={searchEmail}
                                onChange={(e) => setSearchEmail(e.target.value)}
                                placeholder="Enter user email"
                                className="flex-1 p-2 border rounded-lg border-[#dbdbdb]"
                                onKeyDown={(e) => e.key === 'Enter' && handleSearchUser()}
                            />
                            <button
                                onClick={handleSearchUser}
                                disabled={searching || !searchEmail.trim()}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                <Search size={18} />
                                Search
                            </button>
                        </div>

                        {searching && (
                            <div className="mt-3 p-3 bg-white rounded border">
                                <p className="text-gray-600">Searching...</p>
                            </div>
                        )}

                        {searchResult && !searching && (
                            <div className="mt-3 p-3 bg-white rounded border border-gray-200">
                                {searchResult.found ? (
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium">{searchResult.user.first_name} {searchResult.user.last_name}</p>
                                            <p className="text-sm text-gray-600">{searchResult.user.email}</p>
                                        </div>
                                        {searchResult.user.groups?.includes(parseInt(groupId!)) ? (
                                            <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm">
                                                Already a Member
                                            </span>
                                        ) : (
                                            <button
                                                onClick={handleAddMember}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                                            >
                                                <UserPlus size={18} />
                                                Add
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-gray-600">User not found</p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Members List */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h2 className="text-lg font-semibold mb-3">Group Members ({members.length})</h2>
                    <div className="space-y-2">
                        {members.map((member) => (
                            <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                                <div>
                                    <p className="font-medium">{member.first_name} {member.last_name}</p>
                                    <p className="text-sm text-gray-600">{member.email}</p>
                                    {member.id === group.admin_user && (
                                        <span className="inline-block mt-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                                            Owner
                                        </span>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    {isAdmin && member.id !== group.admin_user && (
                                        <>
                                            {group.invited_owner === member.id ? (
                                                <div className="flex gap-2">
                                                    <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded text-sm">
                                                        Invitation Sent
                                                    </span>
                                                    <button
                                                        onClick={handleCancelInvite}
                                                        className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                                                    >
                                                        Cancel Invite
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => handleInviteOwnership(member.id)}
                                                        disabled={hasActiveInvite}
                                                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                                                    >
                                                        <Crown size={16} />
                                                        Make Owner
                                                    </button>
                                                    <button
                                                        onClick={() => handleRemoveMember(member.id)}
                                                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-2 text-sm"
                                                    >
                                                        <X size={16} />
                                                        Remove
                                                    </button>
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Delete/Restore Group */}
                {group.delete_at ? (
                    <>
                        <p className="mt-4 bg-red-100 p-2 border border-red-600 rounded text-red-600 font-semibold">
                            This group will be deleted on {formatDateTime(group.delete_at)}
                        </p>
                        {isAdmin && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleRestoreGroup();
                                }}
                                className="mt-2 w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 cursor-pointer"
                            >
                                Restore Group
                            </button>
                        )}
                    </>
                ) : (
                    <>
                        {isAdmin ? (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowDeleteConfirm(true);
                                }}
                                className="mt-4 w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 cursor-pointer"
                            >
                                Delete Group
                            </button>
                        ) : (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleLeaveGroup();
                                }}
                                className="mt-4 w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 cursor-pointer"
                            >
                                Leave Group
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}