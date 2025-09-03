"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";


type Album = {
    id: number;
    name: string;
    total_images: number;
    groupId: number;
};

export default function AlbumsComponent() {
    const searchParams = useSearchParams();
    const groupId = searchParams.get("groupId");

    const [albums, setAlbums] = useState<Album[]>([]);
    const [newAlbum, setNewAlbum] = useState("");
    const [loading, setLoading] = useState(false);

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [albumToDelete, setAlbumToDelete] = useState<Album | null>(null);

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
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold">Albums</h1>

            {/* Add new album */}
            <div className="flex gap-2">
                <input
                    placeholder="New album name"
                    value={newAlbum}
                    onChange={(e) => setNewAlbum(e.target.value)}
                />
                <button onClick={createAlbum}>Add Album</button>
            </div>

            {/* Albums list */}
            {loading ? (
                <p>Loading albums...</p>
            ) : albums.length === 0 ? (
                <p>No albums found for this group.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {albums.map((album) => (
                        <div key={album.id} className="shadow-md">
                            <div>
                                <div className="flex justify-between items-center">
                                    <span>{album.name}</span>
                                    <button
                                        onClick={() => {
                                            setAlbumToDelete(album);
                                            setConfirmOpen(true);
                                        }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                            <div>
                                <p>{album.total_images} images</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Confirmation Dialog */}
            {confirmOpen && <div>
                <div>
                    <div>
                        <p>Confirm Delete</p>
                    </div>
                    <p>
                        Are you sure you want to delete album{" "}
                        <strong>{albumToDelete?.name}</strong>?
                        <br />
                        This will remove all images in the album.
                    </p>
                    <div>
                        <button onClick={() => setConfirmOpen(false)}>
                            Cancel
                        </button>
                        <button onClick={deleteAlbum}>
                            Delete
                        </button>
                    </div>
                </div>
            </div>}
        </div>
    );
}
