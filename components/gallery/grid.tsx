"use client";

import Image from "next/image";
import { ImageItem } from "@/types/ImageItem";
import { Share2, Heart, ImageIcon, Trash, Grid3x3 } from "lucide-react";
import InfoToast from "../infoToast";
import { useState } from "react";
import { isMobile, isTablet } from 'react-device-detect';

type GalleryGridProps = {
    handleImageClick: (index: number) => void;
    images: ImageItem[];
    sorting: string;
    setSorting: (value: string) => void;
    groupId: string | null;
    personId: string | null;
    isPerson: boolean;
    isPublic: boolean;
    setMode?: (value: string) => void;
    mode?: string
    loading: boolean
};

export default function GalleryGrid({ handleImageClick, images, sorting, setSorting, groupId, personId, isPerson, isPublic, setMode, mode, loading }: GalleryGridProps) {
    const [currentColumnIndex, setCurrentColumnIndex] = useState(0);

    // Get column options based on device type
    const getColumnOptions = () => {
        if (isMobile) return [2, 3, 4]; // sm
        if (isTablet) return [2, 4, 6, 8]; // md
        // Desktop - check window width for lg vs xl
        if (typeof window !== 'undefined' && window.innerWidth >= 1280) {
            return [6, 8, 10, 12, 14]; // xl
        }
        return [4, 6, 8, 10]; // lg
    };

    const getCurrentColumns = () => {
        const options = getColumnOptions();
        return options[currentColumnIndex % options.length];
    };

    const handleColumnToggle = () => {
        setCurrentColumnIndex(prev => prev + 1);
    };

    const onCopyLink = async () => {
        const domain = window.location.origin;
        const link = isPerson
            ? `${domain}/public/gallery-person?groupId=${groupId}&personId=${personId}`
            : `${domain}/public/gallery-groups?groupId=${groupId}`;

        await navigator.clipboard.writeText(link);
        alert("Sharable link copied!");
    };

    return (
        <>
            {/* Toolbar */}
            <div className="flex justify-end items-center p-4">
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

                <div className="flex justify-end items-center ml-2">
                    <button
                        type="button"
                        onClick={handleColumnToggle}
                        className="flex justify-center items-center bg-blue-500 text-white px-4 py-2 rounded cursor-pointer hover:bg-blue-600 transition"
                        title={`Toggle columns (currently ${getCurrentColumns()})`}
                    >
                        <Grid3x3 size={16} className="md:mr-2" />
                        <span className="hidden md:block">{getCurrentColumns()}</span>
                    </button>
                </div>

                {mode && setMode && (
                    <div className="flex justify-end items-center ml-2">
                        <button
                            disabled={loading}
                            type="button"
                            onClick={() => setMode(mode === "gallery" ? "bin" : "gallery")}
                            className={`flex justify-center items-center ${loading ? 'bg-blue-300' : 'bg-blue-500'} text-white px-4 py-2 rounded cursor-pointer hover:${loading ? 'bg-blue-300' : 'bg-blue-600'} transition`}
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
                            className={`flex justify-center items-center ${loading ? 'bg-blue-300' : 'bg-blue-500'} text-white px-4 py-2 rounded cursor-pointer hover:${loading ? 'bg-blue-300' : 'bg-blue-600'} transition`}
                        >
                            <Heart size={16} className="md:mr-2 mb-1" />
                            <span className="hidden md:block">
                                Highlights
                            </span>
                        </button>
                    </div>
                )}

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
            {!loading && images && images.length === 0 ? (
                <InfoToast loading={false} message="No Images Found" />
            ) : (
                <div
                    className="p-4 grid gap-1 md:gap-2"
                    style={{
                        gridTemplateColumns: `repeat(${getCurrentColumns()}, minmax(0, 1fr))`
                    }}
                >
                    {images.map((image, idx) => (
                        <div
                            key={`${image.thumbnail_location}-${idx}`}
                            className="relative aspect-square cursor-pointer overflow-hidden rounded-sm md:rounded-lg shadow-md bg-gray-200"
                            onClick={() => handleImageClick(idx)}
                        >
                            <Image
                                src={image.thumbnail_location}
                                alt={`group image ${idx}`}
                                fill
                                className="object-cover object-top hover:scale-105 transition-transform duration-300"
                                priority={idx < 12}
                                unoptimized
                            />
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}