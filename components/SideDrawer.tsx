'use client';

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
    ChevronDown, ChevronRight, Copy, ImageIcon, LayoutGrid, Settings,
    Upload, Users, X
} from "lucide-react";
import logo from "@/public/logo-white.png";

interface Group {
    id: number;
    name: string;
    profile_pic_location: string | null;
    total_images: number;
    total_size: string;
    admin_user: number;
    last_image_uploaded_at: string;
    status: string;
}

interface SideDrawerProps {
    drawerOpen: boolean;
    setDrawerOpen: (open: boolean) => void;
}

export default function SideDrawer({ drawerOpen, setDrawerOpen }: SideDrawerProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();
    const [groups, setGroups] = useState<Group[]>([]);
    const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(false);

    const groupId = parseInt(searchParams.get("groupId") || searchParams.get("group_id") || "0") || null;
    const isHomePage = pathname === "/";

    // Fetch groups when drawer opens
    useEffect(() => {
        if (drawerOpen && !isHomePage && groups.length === 0) {
            fetchGroups();
        }
    }, [drawerOpen, isHomePage]);

    useEffect(() => {
        if (groupId) {
            setExpandedGroups(new Set([groupId]));
        } else {
            setExpandedGroups(new Set());
        }
    }, [groupId]);

    const fetchGroups = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/groups?userId=1');
            const data = await response.json();
            setGroups(data.groups || []);
        } catch (error) {
            console.error("Failed to fetch groups:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleNavigate = (target: string) => {
        router.push(target);
    };

    const toggleGroup = (gid: number) => {
        setExpandedGroups(prev => {
            const newSet = new Set(prev);
            newSet.has(gid) ? newSet.delete(gid) : newSet.add(gid);
            return newSet;
        });
    };

    const handleGroupNavigation = (gid: number, tab?: string) => {
        setExpandedGroups(new Set([gid]));
        if (tab === "images") handleNavigate(`/gallery-groups?groupId=${gid}`);
        else if (tab === "persons") handleNavigate(`/persons?groupId=${gid}`);
        else if (tab === "similar-faces") handleNavigate(`/similar-faces?groupId=${gid}`);
        else if (tab === "settings") handleNavigate(`/groups/settings?groupId=${gid}`);
        else if (tab === "upload") handleNavigate(`/upload?groupId=${gid}`);
        else handleNavigate(`/gallery-groups?groupId=${gid}`);
    };

    const isActiveGroup = (gid: number) => gid === groupId;

    return (
        <aside
            className={`bg-blue-600 text-white flex flex-col transition-all duration-300 fixed left-0 top-16 bottom-0 z-10 shadow-lg 
        ${drawerOpen ? "w-72" : "w-0 overflow-hidden"}`}
        >
            {/* Close button */}
            <div className="flex justify-end p-3 border-b border-blue-500">
                <button
                    onClick={() => setDrawerOpen(false)}
                    className="text-white hover:bg-blue-700 p-1 rounded"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Groups */}
            <div className="flex-1 overflow-y-auto">
                <div className="px-4 py-3 border-b border-blue-500">
                    <div className="flex items-center gap-2">
                        <LayoutGrid size={20} />
                        <h2 className="font-semibold text-lg">All Groups</h2>
                        <button className="bg-white text-blue-500 p-2 rounded text-sm ml-auto"
                            onClick={() => handleNavigate(`/`)}
                        >
                            View All
                        </button>
                    </div>
                </div>

                <div className="py-2">
                    {loading ? (
                        <div className="px-4 py-3 text-blue-200">Loading groups...</div>
                    ) : groups.length === 0 ? (
                        <div className="px-4 py-3 text-blue-200">No groups found</div>
                    ) : (
                        groups.map(group => (
                            <div key={group.id} className="mb-1">
                                <div className={`w-full flex items-center justify-between px-4 py-3 transition-colors 
                  ${isActiveGroup(group.id) ? "bg-blue-700 border-l-4 border-blue-300" : "hover:bg-blue-700"}`}>
                                    <div className="flex items-center gap-2 flex-1">
                                        <button
                                            onClick={e => { e.stopPropagation(); toggleGroup(group.id); }}
                                            className="hover:bg-blue-800 p-1 rounded flex-shrink-0"
                                        >
                                            {expandedGroups.has(group.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                        </button>
                                        <button
                                            onClick={() => handleGroupNavigation(group.id)}
                                            className={`font-medium truncate text-left flex-1 
                        ${isActiveGroup(group.id) ? "text-white font-semibold" : "hover:text-blue-200"}`}
                                        >
                                            {group.name}
                                        </button>
                                    </div>
                                    <span className="text-xs ml-2">{group.total_images} imgs</span>
                                </div>

                                {/* Group Tabs */}
                                {expandedGroups.has(group.id) && (
                                    <div className="ml-6 border-l border-blue-500 pl-4 py-1">
                                        {[
                                            { tab: "images", label: "Images", icon: <ImageIcon size={16} /> },
                                            { tab: "persons", label: "Persons", icon: <Users size={16} /> },
                                            { tab: "similar-faces", label: "Similar Faces", icon: <Copy size={16} /> },
                                            { tab: "upload", label: "Upload Images", icon: <Upload size={16} /> },
                                            { tab: "settings", label: "Settings", icon: <Settings size={16} /> },
                                        ].map(item => (
                                            <button
                                                key={item.tab}
                                                onClick={() => handleGroupNavigation(group.id, item.tab)}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-blue-700 text-blue-100"
                                            >
                                                {item.icon}
                                                <span>{item.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="border-t border-blue-500 p-4 text-center">
                <Image src={logo} alt="logo" width={100} height={32} className="mx-auto mb-2 opacity-80" />
                <p className="text-xs text-blue-200">© 2025 All rights reserved</p>
            </div>
        </aside>
    );
}
