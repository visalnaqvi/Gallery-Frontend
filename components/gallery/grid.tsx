"use client";

import Image from "next/image";
import { ImageItem } from "@/types/ImageItem";
import { Share2, Heart, ImageIcon, Trash, Users, Ungroup } from "lucide-react";
import InfoToast from "../infoToast";
import { useState } from "react";

// Enhanced ImageItem type to include similar_image_id
interface EnhancedImageItem extends ImageItem {
    similar_image_id?: string;
    similar_count?: number; // Count of similar images in this group
}

type GalleryGridProps = {
    handleImageClick: (index: number) => void;
    images: EnhancedImageItem[];
    sorting: string;
    setSorting: (value: string) => void;
    groupId: string | null;
    personId: string | null;
    isPerson: boolean;
    isPublic: boolean;
    setMode?: (value: string) => void;
    mode?: string;
    loading: boolean;
    onSimilarImagesClick?: (similarImageId: string) => void;
};

export default function GalleryGrid({
    handleImageClick,
    images,
    sorting,
    setSorting,
    groupId,
    personId,
    isPerson,
    isPublic,
    setMode,
    mode,
    loading,
    onSimilarImagesClick
}: GalleryGridProps) {
    const [groupSimilarImages, setGroupSimilarImages] = useState(true);

    const onCopyLink = async () => {
        const domain = window.location.origin;
        const link = isPerson
            ? `${domain}/public/gallery-person?groupId=${groupId}&personId=${personId}`
            : `${domain}/public/gallery-groups?groupId=${groupId}`;

        await navigator.clipboard.writeText(link);
        alert("Sharable link copied!");
    };

    // Process images to group similar ones
    const processedImages = () => {
        if (!groupSimilarImages) return images;

        const groupedImages: EnhancedImageItem[] = [];
        const processedSimilarIds = new Set<string>();

        images.forEach((image) => {
            const similarId = image.similar_image_id;

            // If no similar_image_id or it's "no_similar", add as individual image
            if (!similarId || similarId === "no_similar") {
                groupedImages.push(image);
                return;
            }

            // If we haven't processed this similar group yet
            if (!processedSimilarIds.has(similarId)) {
                // Find all images with the same similar_image_id
                const similarImages = images.filter(img => img.similar_image_id === similarId);

                // Use the first image as the representative
                const representativeImage = {
                    ...similarImages[0],
                    similar_count: similarImages.length
                };

                groupedImages.push(representativeImage);
                processedSimilarIds.add(similarId);
            }
        });

        return groupedImages;
    };

    const displayImages = processedImages();

    const handleImageClickWrapper = (idx: number) => {
        const clickedImage = displayImages[idx];

        // If this image has similar images and we're in grouped mode, show similar images view
        if (groupSimilarImages &&
            clickedImage.similar_image_id &&
            clickedImage.similar_image_id !== "no_similar" &&
            clickedImage.similar_count &&
            clickedImage.similar_count > 1 &&
            onSimilarImagesClick) {
            onSimilarImagesClick(clickedImage.similar_image_id);
            return;
        }

        // Find the original index in the full images array
        const originalIndex = images.findIndex(img => img.id === clickedImage.id);
        handleImageClick(originalIndex);
    };

    return (
        <>
            {/* Controls */}
            <div className="flex justify-end items-center p-4">
                {/* Similar Images Grouping Toggle */}
                <div className="flex justify-end items-center mr-2">
                    <button
                        type="button"
                        onClick={() => setGroupSimilarImages(!groupSimilarImages)}
                        className={`flex justify-center items-center ${groupSimilarImages ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-500 hover:bg-gray-600'
                            } text-white px-4 py-2 rounded cursor-pointer transition`}
                        title={groupSimilarImages ? "Ungroup similar images" : "Group similar images"}
                    >
                        {groupSimilarImages ? (
                            <Ungroup size={16} className="md:mr-2 mb-1" />
                        ) : (
                            <Users size={16} className="md:mr-2 mb-1" />
                        )}
                        <span className="hidden md:block">
                            {groupSimilarImages ? "Ungroup" : "Group"}
                        </span>
                    </button>
                </div>

                {/* Share Link */}
                {groupId && (
                    <div className="flex justify-end items-center">
                        <button
                            type="button"
                            onClick={onCopyLink}
                            className="flex justify-center items-center bg-blue-500 text-white px-4 py-2 rounded cursor-pointer hover:bg-blue-600 transition"
                        >
                            <Share2 size={16} className="md:mr-2 mb-1" />
                            <span className="hidden md:block">Copy Link</span>
                        </button>
                    </div>
                )}

                {/* Mode toggles */}
                {mode && setMode && (
                    <div className="flex justify-end items-center ml-2">
                        <button
                            disabled={loading}
                            type="button"
                            onClick={() => setMode(mode === "gallery" ? "bin" : "gallery")}
                            className={`flex justify-center items-center ${loading ? 'bg-blue-300' : 'bg-blue-500'
                                } text-white px-4 py-2 rounded cursor-pointer hover:${loading ? 'bg-blue-300' : 'bg-blue-600'
                                } transition`}
                        >
                            {mode === "gallery" ? (
                                <Trash size={16} className="md:mr-2 mb-1" />
                            ) : (
                                <ImageIcon size={16} className="md:mr-2 mb-1" />
                            )}
                            <span className="hidden md:block">
                                {mode === "gallery" ? "Bin" : "Gallery"}
                            </span>
                        </button>
                    </div>
                )}

                {setMode && (
                    <div className="flex justify-end items-center ml-2">
                        <button
                            disabled={loading}
                            type="button"
                            onClick={() => setMode("highlight")}
                            className={`flex justify-center items-center ${loading ? 'bg-blue-300' : 'bg-blue-500'
                                } text-white px-4 py-2 rounded cursor-pointer hover:${loading ? 'bg-blue-300' : 'bg-blue-600'
                                } transition`}
                        >
                            <Heart size={16} className="md:mr-2 mb-1" />
                            <span className="hidden md:block">Highlights</span>
                        </button>
                    </div>
                )}

                {/* Sorting */}
                <div className="flex flex-col items-start ml-2 bg-blue-100 rounded p-2">
                    <label
                        htmlFor="sort"
                        className="text-xs font-medium text-gray-600 text-center ml-1"
                    >
                        Sort
                    </label>
                    <select
                        id="sort"
                        value={sorting}
                        onChange={(e) => setSorting(e.target.value)}
                        className="text-base font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-800 cursor-pointer"
                    >
                        <option className="bg-white text-sm font-normal" value="date_taken">Date Taken</option>
                        <option className="bg-white text-sm font-normal" value="filename">Name</option>
                        <option className="bg-white text-sm font-normal" value="uploaded_at">Upload Date</option>
                    </select>
                </div>
            </div>

            {/* Image Grid */}
            {!loading && displayImages && displayImages.length === 0 ? (
                <InfoToast loading={false} message="No Images Found" />
            ) : (
                <div className="p-4 grid grid-cols-4 md:grid-cols-8 lg:grid-cols-10 gap-1 md:gap-2">
                    {displayImages.map((image, idx) => (
                        <div
                            key={`${image.thumbnail_location}-${idx}`}
                            className="relative aspect-square cursor-pointer overflow-hidden rounded-sm md:rounded-lg shadow-md bg-gray-200"
                            onClick={() => handleImageClickWrapper(idx)}
                        >
                            <Image
                                src={image.thumbnail_location}
                                alt={`group image ${idx}`}
                                fill
                                className="object-cover object-top hover:scale-105 transition-transform duration-300"
                                priority={idx < 12}
                                unoptimized
                            />

                            {/* Similar Images Indicator */}
                            {groupSimilarImages &&
                                image.similar_image_id &&
                                image.similar_image_id !== "no_similar" &&
                                image.similar_count &&
                                image.similar_count > 1 && (
                                    <div className="absolute bottom-1 right-1 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-full flex items-center">
                                        <Users size={12} className="mr-1" />
                                        {image.similar_count}
                                    </div>
                                )}
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}