"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type Album = {
    id: number;
    name: string;
    total_images: number;
    groupId: number;
};
type props = {
    pageLink: string;
    isPublic: boolean;
}
export default function AlbumsComponent({ pageLink, isPublic }: props) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const groupId = searchParams.get("groupId");

    const [albums, setAlbums] = useState<Album[]>([]);
    const [newAlbum, setNewAlbum] = useState("");
    const [loading, setLoading] = useState(false);

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [albumToDelete, setAlbumToDelete] = useState<Album | null>(null);

    // Navigate to album gallery
    const navigateToAlbum = (albumId: number) => {
        router.push(`${pageLink}?groupId=${groupId}&albumId=${albumId}`);
    };

    // ✅ Fetch albums
    const fetchAlbums = async () => {
        if (!groupId) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/albums?groupId=${groupId}`);
            const data = await res.json();
            setAlbums(data);
        } catch (err) {
            console.error("Failed to fetch albums:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAlbums();
    }, [groupId]);

    // ✅ Create new album
    const createAlbum = async () => {
        if (!newAlbum.trim() || !groupId) return;
        try {
            await fetch("/api/albums", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newAlbum, groupId: Number(groupId) }),
            });
            setNewAlbum("");
            fetchAlbums();
        } catch (err) {
            console.error("Failed to create album:", err);
        }
    };

    // ✅ Delete album
    const deleteAlbum = async () => {
        if (!albumToDelete) return;
        try {
            await fetch("/api/albums", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    mode: "album",
                    albumId: albumToDelete.id,
                    groupId: albumToDelete.groupId,
                }),
            });
            setConfirmOpen(false);
            setAlbumToDelete(null);
            fetchAlbums();
        } catch (err) {
            console.error("Failed to delete album:", err);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
            <div className="container mx-auto px-4 py-8 max-w-7xl">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-blue-900 mb-2">Albums</h1>
                    <div className="w-20 h-1 bg-blue-500 rounded-full"></div>
                </div>

                {/* Add new album */}
                <div className="bg-white rounded-xl shadow-lg border border-blue-200 p-6 mb-8">
                    <h2 className="text-xl font-semibold text-blue-800 mb-4">Create New Album</h2>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <input
                            className="flex-1 px-4 py-3 border-2 border-blue-200 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-colors placeholder-blue-400"
                            placeholder="Enter album name..."
                            value={newAlbum}
                            onChange={(e) => setNewAlbum(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && createAlbum()}
                        />
                        <button
                            onClick={createAlbum}
                            disabled={!newAlbum.trim()}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
                        >
                            Add Album
                        </button>
                    </div>
                </div>

                {/* Albums list */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="flex items-center space-x-3">
                            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-600"></div>
                            <p className="text-blue-600 font-medium">Loading albums...</p>
                        </div>
                    </div>
                ) : albums.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-lg border border-blue-200 p-12 text-center">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-blue-800 mb-2">No Albums Found</h3>
                        <p className="text-blue-600">Create your first album to get started organizing your images.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {albums.map((album) => (
                            <div
                                key={album.id}
                                className="bg-white rounded-xl shadow-lg hover:shadow-xl border border-blue-200 overflow-hidden transition-all duration-200 hover:-translate-y-1 cursor-pointer"
                                onClick={() => navigateToAlbum(album.id)}
                            >
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-lg font-semibold text-blue-900 truncate mb-1">
                                                {album.name}
                                            </h3>
                                            <div className="flex items-center text-blue-600">
                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                <span className="text-sm font-medium">
                                                    {album.total_images} {album.total_images === 1 ? 'image' : 'images'}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation(); // Prevent navigation when clicking delete
                                                setAlbumToDelete(album);
                                                setConfirmOpen(true);
                                            }}
                                            className="ml-3 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                                            title="Delete album"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>

                                    {/* Album preview/action area */}
                                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-150 group-hover:from-blue-100 group-hover:to-blue-200 transition-all duration-200">
                                        <div className="flex items-center justify-center text-blue-500 mb-2">
                                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                            </svg>
                                        </div>
                                        <p className="text-center text-sm text-blue-600 font-medium">Click to view album</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Confirmation Dialog */}
                {confirmOpen && (
                    <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-blue-200">
                            <div className="p-6">
                                <div className="flex items-center mb-4">
                                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-semibold text-gray-900">Confirm Delete</h3>
                                </div>
                                <p className="text-gray-600 mb-6">
                                    Are you sure you want to delete the album{" "}
                                    <strong className="text-blue-900">"{albumToDelete?.name}"</strong>?
                                    <br />
                                    <span className="text-red-600 font-medium">This will permanently remove all images in the album.</span>
                                </p>
                                <div className="flex gap-3 justify-end">
                                    <button
                                        onClick={() => setConfirmOpen(false)}
                                        className="px-4 py-2 text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-lg font-medium transition-colors duration-200"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={deleteAlbum}
                                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors duration-200 shadow-md hover:shadow-lg"
                                    >
                                        Delete Album
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}