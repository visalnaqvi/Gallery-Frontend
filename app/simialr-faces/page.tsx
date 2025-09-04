"use client";
import { useEffect, useState } from "react";
import { ArrowLeft, ImageIcon } from "lucide-react";
import { ImageItem } from "@/types/ImageItem";
import GalleryGrid from "@/components/gallery/grid";
import InfoToast from "@/components/infoToast";
import ImageGalleryComponent from "@/components/gallery/components/ImageGallery";
import useGallery from "@/hooks/useGallery";

type Album = {
    id: number;
    name: string;
    total_images: number;
    group_id: number;
};

interface SimilarImagesViewProps {
    groupId: string;
    similarImageId: string;
    onBack: () => void;
    isPublic: boolean;
}

export default function SimilarImagesView({
    groupId,
    similarImageId,
    onBack,
    isPublic
}: SimilarImagesViewProps) {
    const [sorting, setSorting] = useState<string>("date_taken");
    const [similarImages, setSimilarImages] = useState<ImageItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Gallery state for similar images
    const [isOpen, setIsOpen] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [albums, setAlbums] = useState<Album[]>([]);

    // Fetch similar images
    const fetchSimilarImages = async (resetImages = false) => {
        if (!similarImageId || !groupId) return;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(
                `/api/groups/images/similar?groupId=${groupId}&similarImageId=${similarImageId}&sorting=${sorting}`
            );

            if (!response.ok) {
                if (response.status === 403) {
                    setError("Access denied to this group");
                    return;
                }
                throw new Error('Failed to fetch similar images');
            }

            const data = await response.json();
            setSimilarImages(data.images || []);

        } catch (err) {
            console.error("Error fetching similar images:", err);
            setError("Failed to load similar images");
        } finally {
            setLoading(false);
        }
    };

    // Fetch albums
    const fetchAlbums = async () => {
        if (!groupId) return;

        try {
            const res = await fetch(`/api/albums?groupId=${groupId}`);
            if (res.ok) {
                const data = await res.json();
                setAlbums(data);
            }
        } catch (err) {
            console.error("Failed to fetch albums:", err);
        }
    };

    // Handle image click to open gallery
    const handleImageClick = (idx: number) => {
        setCurrentIndex(idx);
        setIsOpen(true);
    };

    // Mock functions for gallery compatibility
    const mockFetchImages = async () => { };
    const mockResetState = () => { };

    useEffect(() => {
        fetchSimilarImages(true);
        fetchAlbums();
    }, [similarImageId, groupId, sorting]);

    if (error) {
        return (
            <div className="p-4">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 mb-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
                >
                    <ArrowLeft size={16} />
                    Back to Gallery
                </button>
                <InfoToast loading={false} message={error} />
            </div>
        );
    }

    return (
        <div className="h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-gray-50">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
                >
                    <ArrowLeft size={16} />
                    Back to Gallery
                </button>

                <div className="flex items-center gap-2 text-gray-700">
                    <ImageIcon size={20} />
                    <h1 className="text-lg font-semibold">
                        Similar Images ({similarImages.length})
                    </h1>
                </div>

                <div className="w-24"></div> {/* Spacer for centering */}
            </div>

            {/* Loading indicator */}
            {loading && (
                <InfoToast loading={true} message="Loading similar images..." />
            )}

            {/* Similar Images Grid */}
            {!loading && (
                <div className="overflow-hidden">
                    <GalleryGrid
                        handleImageClick={handleImageClick}
                        images={similarImages}
                        sorting={sorting}
                        setSorting={setSorting}
                        groupId={groupId}
                        isPerson={false}
                        personId={null}
                        isPublic={isPublic}
                        mode="similar"
                        loading={loading}
                        // Don't show similar images grouping in this view
                        onSimilarImagesClick={undefined}
                    />
                </div>
            )}

            {/* Empty state */}
            {!loading && similarImages.length === 0 && (
                <InfoToast loading={false} message="No similar images found" />
            )}

            {/* Fullscreen carousel for similar images */}
            {isOpen && similarImages.length > 0 && (
                <ImageGalleryComponent
                    images={similarImages}
                    setCurrentIndex={setCurrentIndex}
                    setImages={setSimilarImages}
                    setIsOpen={setIsOpen}
                    currentIndex={currentIndex}
                    fetchImages={mockFetchImages}
                    LOAD_MORE_AHEAD={0}
                    hasMore={false}
                    loading={false}
                    isOpen={isOpen}
                    mode="similar"
                    resetState={mockResetState}
                    albums={albums}
                    groupId={groupId}
                />
            )}
        </div>
    );
}