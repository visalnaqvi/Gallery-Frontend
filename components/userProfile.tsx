"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import InfoToast from "@/components/infoToast";

type Group = {
    id: string;
    name: string;
    total_images: number;
    created_at: string;
    profile_pic_bytes: string | null;
};

type User = {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    plan_type: string;
    groups: Group[];
    studio_name: string | null;
    studio_logo: string | null; // base64 string
};

export default function UserProfile() {
    const { data: session } = useSession();
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);

    useEffect(() => {
        if (!session?.user?.id) return;

        fetch(`/api/user?userId=${session.user.id}`)
            .then((res) => res.json())
            .then((data) => setUser(data));
    }, [session]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const img = new Image();
        img.src = URL.createObjectURL(file);

        img.onload = () => {
            if (img.width > 150 || img.height > 30) {
                alert("Logo must be max 150px wide and 30px tall.");
                e.target.value = "";
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
                if (user) {
                    setUser({ ...user, studio_logo: reader.result as string });
                }
            };
            reader.readAsDataURL(file);
        };
    };

    const handleDeleteLogo = () => {
        if (!user) return;
        setPreview(null);
        setUser({ ...user, studio_logo: null });
    };

    const handleSave = async () => {
        if (!user) return;

        await fetch(`/api/user?userId=${user.id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...user, password }),
        });

        alert("User updated successfully");
    };

    if (!user) return <InfoToast loading={true} message="Loading..." />;

    return (
        <div className="p-6 mx-auto space-y-6 max-w-[1000px]">
            {/* User Profile Section */}
            <div>
                <h1 className="text-2xl font-bold my-2">User Profile</h1>

                <form className="space-y-4">
                    {/* First Name */}
                    <label className="block">
                        <span className="font-medium mb-2 block">First Name:</span>
                        <input
                            type="text"
                            value={user.first_name}
                            onChange={(e) => setUser({ ...user, first_name: e.target.value })}
                            className="border p-2 w-full rounded border-[#dbdbdb] shadow-md"
                        />
                    </label>

                    {/* Last Name */}
                    <label className="block">
                        <span className="font-medium mb-2 block">Last Name</span>
                        <input
                            type="text"
                            value={user.last_name}
                            onChange={(e) => setUser({ ...user, last_name: e.target.value })}
                            className="border p-2 w-full border-[#dbdbdb] shadow-md rounded"
                        />
                    </label>

                    {/* Email */}
                    <label className="block">
                        <span className="font-medium mb-2 block">Email</span>
                        <input
                            type="email"
                            disabled
                            value={user.email}
                            className="border p-2 w-full border-[#dbdbdb] shadow-md rounded bg-[#f8f8f8] cursor-not-allowed"
                        />
                    </label>

                    {/* Password */}
                    {/* <label className="block">
                        <span className="font-medium mb-2 block">Password</span>
                        <div className="flex gap-2 items-center">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="New Password"
                                className="border p-2 flex-1 rounded border-[#dbdbdb] shadow-md"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="text-sm text-blue-500 cursor-pointer"
                            >
                                {showPassword ? "Hide" : "Show"}
                            </button>
                        </div>
                    </label> */}

                    {/* Plan Type */}
                    {/* <label className="block">
                        <span className="font-medium mb-2 block">Plan Type</span>
                        <select
                            disabled
                            value={user.plan_type}
                            onChange={(e) => setUser({ ...user, plan_type: e.target.value })}
                            className="border p-2 w-full rounded border-[#dbdbdb] shadow-md bg-[#f8f8f8] cursor-not-allowed"
                        >
                            <option value="lite">Lite</option>
                            <option value="pro">Pro</option>
                            <option value="elite">Elite</option>
                        </select>
                    </label> */}
                </form>


            </div>

            <div>
                <h1 className="text-2xl font-bold mb-2">Studio Details</h1>

                <label className="block mb-4">
                    <span className="font-medium mb-2 block">Studio Name</span>
                    <input
                        type="text"
                        value={user.studio_name || ""}
                        onChange={(e) => setUser({ ...user, studio_name: e.target.value })}
                        placeholder="Studio Name"
                        className="border p-2 w-full rounded border-[#dbdbdb] shadow-md"
                    />
                </label>

                <div>
                    <label className="block font-medium">Studio Logo</label>
                    <div className="flex items-center gap-4 mt-2">
                        {(preview || user.studio_logo) && (
                            <div className="relative bg-blue-500 p-4">
                                <img
                                    src={preview || user.studio_logo || ""}
                                    alt="Studio Logo"
                                    className="w-[150px] h-[30px] object-contain"
                                />
                                <button
                                    type="button"
                                    onClick={handleDeleteLogo}
                                    className="absolute top-0 right-0 text-xs bg-red-500 text-white px-2 py-1 rounded"
                                >
                                    ✕
                                </button>
                            </div>
                        )}
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="border p-2 rounded border-[#dbdbdb] shadow-sm"
                        />
                    </div>
                </div>
            </div>
            <div className="flex mt-4">
                <button
                    type="button"
                    onClick={handleSave}
                    className="bg-blue-500 text-white px-4 py-2 rounded mr-2 cursor-pointer"
                >
                    Save
                </button>
                <button
                    onClick={() => signOut({ callbackUrl: "/auth" })}
                    className="bg-red-500 text-white px-4 py-2 rounded cursor-pointer"
                >
                    Logout
                </button>
            </div>
            {/* Groups Section */}
            <div>
                <h1 className="text-2xl font-bold mb-2">Your Groups</h1>
                <ul className="space-y-3">
                    {user.groups.map((group) => (
                        <li
                            key={group.id}
                            className="flex items-center gap-4 p-3 rounded bg-blue-100"
                        >
                            {group.profile_pic_bytes ? (
                                <img
                                    src={group.profile_pic_bytes}
                                    alt={group.name}
                                    width={50}
                                    height={50}
                                    className="rounded-full"
                                />
                            ) : (
                                <div className="w-12 h-12 bg-gray-200 rounded-full" />
                            )}
                            <div className="flex-1">
                                <p className="font-medium capitalize">{group.name}</p>
                                <p className="text-sm text-gray-500">
                                    Images: {group.total_images} • Created:{" "}
                                    {group.created_at
                                        ? new Date(group.created_at).toLocaleDateString()
                                        : "Not Available"}
                                </p>
                            </div>
                            <button
                                onClick={() => router.push(`/settings?groupId=${group.id}`)}
                                className="text-white rounded font-semibold bg-blue-500 px-4 py-2 cursor-pointer"
                            >
                                Edit
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
