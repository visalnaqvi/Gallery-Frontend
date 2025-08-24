'use client'

import Image from 'next/image';
import './globals.css';
import { Providers } from './providers'
import { Montserrat } from 'next/font/google';
import logo from "../public/logo-white.png"
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Menu, Users, ImageIcon, LayoutGrid, User, Copy, ChevronDown, ChevronRight, X, Settings, Upload } from "lucide-react";

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-montserrat',
});

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const groupId = parseInt(searchParams.get("groupId") || searchParams.get("group_id") || "0") || null;
  const personId = searchParams.get("personId");
  const hideHeader = pathname.startsWith('/auth');
  const isHomePage = pathname === '/';

  // Fetch groups when drawer opens
  useEffect(() => {
    if (drawerOpen && !isHomePage && groups.length === 0) {
      fetchGroups();
    }
  }, [drawerOpen, isHomePage]);

  // Auto-expand only current group and collapse others
  useEffect(() => {
    if (groupId) {
      // Only keep the current group expanded, collapse all others
      setExpandedGroups(new Set([groupId]));
    } else {
      // If no group is selected, collapse all
      setExpandedGroups(new Set());
    }
  }, [groupId]);

  // Also handle pathname changes for direct navigation
  useEffect(() => {
    if (groupId && (pathname.startsWith('/gallery-groups') || pathname.startsWith('/gallery') || pathname.startsWith('/persons') || pathname.startsWith('/similar-faces'))) {
      // Only keep the current group expanded
      setExpandedGroups(new Set([groupId]));
    }
  }, [pathname, groupId]);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/groups?userId=1');
      const data = await response.json();
      setGroups(data.groups || []);
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (target: string) => {
    router.push(target);
  };

  const toggleGroup = (groupId: number) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const handleGroupNavigation = (groupId: number, tab?: string) => {
    const currentGroupId = parseInt(searchParams.get("group_id") || searchParams.get("groupId") || "0") || null;

    // Set only the clicked group as expanded, collapse others
    setExpandedGroups(new Set([groupId]));

    // Navigate based on tab or current page
    if (tab === 'images' || (!tab && currentGroupId !== groupId)) {
      handleNavigate(`/gallery-groups?groupId=${groupId}`);
    } else if (tab === 'persons') {
      handleNavigate(`/persons?groupId=${groupId}`);
    } else if (tab === 'similar-faces') {
      handleNavigate(`/similar-faces?groupId=${groupId}`);
    } else if (tab === 'settings') {
      handleNavigate(`/groups/settings?groupId=${groupId}`);
    } else if (tab === 'upload') {
      handleNavigate('/upload?groupId=' + groupId);
    }
  };

  const isActiveTab = (groupId: number, tab: string) => {
    const currentGroupId = parseInt(searchParams.get("group_id") || searchParams.get("groupId") || "0") || null;
    if (currentGroupId != groupId) return false;

    switch (tab) {
      case 'images':
        return pathname.startsWith('/gallery') || pathname.startsWith('/gallery-groups');
      case 'persons':
        return pathname.startsWith('/persons');
      case 'similar-faces':
        return pathname.startsWith('/similar-faces');
      case 'settings':
        return pathname.startsWith('/groups/settings');
      case 'upload':
        return pathname.startsWith('/upload');
      default:
        return false;
    }
  };

  const isActiveGroup = (groupId: number) => {
    const currentGroupId = parseInt(searchParams.get("groupId") || searchParams.get("group_id") || "0") || null;
    console.log("current group id ", currentGroupId)
    console.log("param group id ", groupId)
    return currentGroupId == groupId;
  };

  // Helper function to check if group is expanded
  const isGroupExpanded = (groupId: number) => {
    return expandedGroups.has(groupId);
  };

  return (
    <html lang="en">
      <body className={`${montserrat.className} flex h-screen`}>
        {!hideHeader && (
          <>
            {/* Header always on top */}
            <header className="bg-blue-500 flex items-center justify-between p-4 fixed w-full z-20">
              {/* Left: ham menu + logo */}
              <div className="flex items-center gap-4">
                {!isHomePage && (
                  <button
                    onClick={() => setDrawerOpen(!drawerOpen)}
                    className="text-white hover:bg-blue-600 p-1 rounded"
                  >
                    <Menu />
                  </button>
                )}
                <Image src={logo} alt="logo" width={120} height={40} />
              </div>

              {/* Right: user icon */}
              <button
                onClick={() => handleNavigate("/user-profile")}
                className="text-white hover:text-gray-200 hover:bg-blue-600 p-2 rounded-full transition-colors"
              >
                <User size={24} />
              </button>
            </header>

            {/* Sidebar Drawer - only show when not on home page */}
            {!isHomePage && (
              <aside
                className={`bg-blue-600 text-white flex flex-col transition-all duration-300 fixed left-0 top-16 bottom-0 z-10 shadow-lg ${drawerOpen ? "w-72" : "w-0 overflow-hidden"
                  }`}
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

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                  {/* All Groups Header */}
                  <div className="px-4 py-3 border-b border-blue-500">
                    <div className="flex items-center gap-2">
                      <LayoutGrid size={20} />
                      <h2 className="font-semibold text-lg">All Groups</h2>
                      <br></br>
                      <button className='bg-white text-blue-500 p-2 rounded text-sm' onClick={() => { handleNavigate(`/`) }}>View All</button>
                    </div>
                  </div>

                  {/* Groups List */}
                  <div className="py-2">
                    {loading ? (
                      <div className="px-4 py-3 text-blue-200">Loading groups...</div>
                    ) : groups.length === 0 ? (
                      <div className="px-4 py-3 text-blue-200">No groups found</div>
                    ) : (
                      groups.map((group) => (
                        <div key={group.id} className="mb-1">
                          {/* Group Header */}
                          <div className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${isActiveGroup(group.id)
                            ? 'bg-blue-700 border-l-4 border-blue-300'
                            : 'hover:bg-blue-700'
                            }`}>
                            <div className="flex items-center gap-2 flex-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleGroup(group.id);
                                }}
                                className="hover:bg-blue-800 p-1 rounded flex-shrink-0"
                              >
                                {isGroupExpanded(group.id) ? (
                                  <ChevronDown size={16} />
                                ) : (
                                  <ChevronRight size={16} />
                                )}
                              </button>
                              <button
                                onClick={() => handleGroupNavigation(group.id)}
                                className={`font-medium truncate text-left flex-1 hover:text-blue-200 ${isActiveGroup(group.id) ? 'text-white font-semibold' : ''
                                  }`}
                                title={group.name}
                              >
                                {group.name}
                              </button>
                            </div>
                            <span className={`text-xs ml-2 flex-shrink-0 ${isActiveGroup(group.id) ? 'text-blue-100' : 'text-blue-200'
                              }`}>
                              {group.total_images} imgs
                            </span>
                          </div>

                          {/* Group Tabs */}
                          {isGroupExpanded(group.id) && (
                            <div className="ml-6 border-l border-blue-500 pl-4 py-1">
                              <button
                                onClick={() => handleGroupNavigation(group.id, 'images')}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors mb-1 ${isActiveTab(group.id, 'images')
                                  ? 'bg-blue-700 text-white shadow-md border-l-2 border-blue-200'
                                  : 'hover:bg-blue-700 text-blue-100'
                                  }`}
                              >
                                <ImageIcon size={16} />
                                <span>Images</span>
                              </button>

                              <button
                                onClick={() => handleGroupNavigation(group.id, 'persons')}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors mb-1 ${isActiveTab(group.id, 'persons')
                                  ? 'bg-blue-700 text-white shadow-md border-l-2 border-blue-200'
                                  : 'hover:bg-blue-700 text-blue-100'
                                  }`}
                              >
                                <Users size={16} />
                                <span>Persons</span>
                              </button>

                              <button
                                onClick={() => handleGroupNavigation(group.id, 'similar-faces')}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors ${isActiveTab(group.id, 'similar-faces')
                                  ? 'bg-blue-700 text-white shadow-md border-l-2 border-blue-200'
                                  : 'hover:bg-blue-700 text-blue-100'
                                  }`}
                              >
                                <Copy size={16} />
                                <span>Similar Faces</span>
                              </button>
                              <button
                                onClick={() => handleGroupNavigation(group.id, 'upload')}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors ${isActiveTab(group.id, 'upload')
                                  ? 'bg-blue-700 text-white shadow-md border-l-2 border-blue-200'
                                  : 'hover:bg-blue-700 text-blue-100'
                                  }`}
                              >
                                <Upload size={16} />
                                <span>Upload Images</span>
                              </button>

                              <button
                                onClick={() => handleGroupNavigation(group.id, 'settings')}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors ${isActiveTab(group.id, 'settings')
                                  ? 'bg-blue-700 text-white shadow-md border-l-2 border-blue-200'
                                  : 'hover:bg-blue-700 text-blue-100'
                                  }`}
                              >
                                <Settings size={16} />
                                <span>Settings</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t border-blue-500 p-4 text-center">
                  <Image
                    src={logo}
                    alt="logo"
                    width={100}
                    height={32}
                    className="mx-auto mb-2 opacity-80"
                  />
                  <p className="text-xs text-blue-200">
                    © 2025 All rights reserved
                  </p>
                </div>
              </aside>
            )}

            {/* Main Content Area */}
            <main className={`flex-1 overflow-y-auto pt-16 transition-all duration-300 ${!isHomePage && drawerOpen ? "ml-72" : "ml-0"
              }`}>
              <Providers>{children}</Providers>
            </main>
          </>
        )}

        {hideHeader && (
          <Providers>{children}</Providers>
        )}
      </body>
    </html>
  );
}