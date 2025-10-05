"use client";

import Image from "next/image";
import { ImageItem } from "@/types/ImageItem";
import { Share2, Heart, ImageIcon, Trash, Grid3x3, Link2, Mail, X, Loader2 } from "lucide-react";
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
    const [currentColumnIndex, setCurrentColumnIndex] = useState(3);
    const [showShareModal, setShowShareModal] = useState(false);
    const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);

    // Get column options based on device type
    const getColumnOptions = () => {
        if (isMobile) return [2, 3, 4, 5]; // sm
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

    const onCopyPublicLink = async () => {
        const domain = window.location.origin;
        const link = isPerson
            ? `${domain}/public/gallery-person?groupId=${groupId}&personId=${personId}`
            : `${domain}/public/gallery-groups?groupId=${groupId}`;

        await navigator.clipboard.writeText(link);
        alert("Public link copied to clipboard!");
        setShowShareModal(false);
    };

    const onGenerateInviteLink = async () => {
        if (!groupId) return;

        setIsGeneratingInvite(true);
        try {
            const res = await fetch("/api/invite-links/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ groupId }),
            });

            if (!res.ok) throw new Error("Failed to generate invite link");

            const data = await res.json();
            const domain = window.location.origin;
            const inviteLink = `${domain}/invite/${data.inviteId}`;

            await navigator.clipboard.writeText(inviteLink);
            alert("Invite link copied to clipboard!");
            setShowShareModal(false);
        } catch (err) {
            console.error("Error generating invite link:", err);
            alert("Failed to generate invite link. Please try again.");
        } finally {
            setIsGeneratingInvite(false);
        }
    };

    return (
        <>
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row justify-between md:justify-end items-stretch md:items-center p-4 gap-2">
                {/* Sorting Dropdown - First on mobile, Last on desktop */}
                <div className="flex flex-col items-start bg-blue-100 rounded p-2 md:order-2">
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
                        className="text-base font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-800 cursor-pointer w-full"
                    >
                        <option className="bg-white text-sm font-normal" value="date_taken">Date Taken</option>
                        <option className="bg-white text-sm font-normal" value="filename">Name</option>
                        <option className="bg-white text-sm font-normal" value="uploaded_at">Upload Date</option>
                    </select>
                </div>

                {/* Action Buttons - Second on mobile, First on desktop */}
                <div className="flex flex-wrap gap-2 md:order-1">
                    {groupId && (
                        <button
                            type="button"
                            onClick={() => setShowShareModal(true)}
                            className="flex justify-center items-center bg-blue-500 text-white px-4 py-2 rounded cursor-pointer hover:bg-blue-600 transition"
                        >
                            <Share2 size={16} className="md:mr-2 mb-1" />
                            <span className="hidden md:block">Share</span>
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={handleColumnToggle}
                        className="flex justify-center items-center bg-blue-500 text-white px-4 py-2 rounded cursor-pointer hover:bg-blue-600 transition"
                        title={`Toggle columns (currently ${getCurrentColumns()})`}
                    >
                        <Grid3x3 size={16} className="md:mr-2" />
                        <span className="hidden md:block">{getCurrentColumns()}</span>
                    </button>

                    {mode && setMode && (
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
                    )}

                    {setMode && (
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
                    )}
                </div>
            </div>

            {/* Share Modal */}
            {showShareModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative animate-in fade-in duration-200">
                        {/* Close Button */}
                        <button
                            onClick={() => setShowShareModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X size={24} />
                        </button>

                        {/* Header */}
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">Share {isPerson ? 'Person' : 'Group'}</h2>
                            <p className="text-sm text-gray-600">Choose how you want to share this content</p>
                        </div>

                        {/* Share Options */}
                        <div className="space-y-3">
                            {/* Public Link Option */}
                            <button
                                onClick={onCopyPublicLink}
                                className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-lg border-2 border-blue-200 transition-all duration-200 hover:shadow-md group"
                            >
                                <div className="bg-blue-500 p-3 rounded-full group-hover:bg-blue-600 transition-colors">
                                    <Link2 className="text-white" size={24} />
                                </div>
                                <div className="flex-grow text-left">
                                    <h3 className="font-semibold text-gray-800 text-lg">Public Link</h3>
                                    <p className="text-sm text-gray-600">Anyone with this link can view</p>
                                </div>
                            </button>

                            {/* Invite Link Option */}
                            <button
                                onClick={onGenerateInviteLink}
                                disabled={isGeneratingInvite}
                                className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 rounded-lg border-2 border-purple-200 transition-all duration-200 hover:shadow-md group disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className="bg-purple-500 p-3 rounded-full group-hover:bg-purple-600 transition-colors">
                                    {isGeneratingInvite ? (
                                        <Loader2 className="text-white animate-spin" size={24} />
                                    ) : (
                                        <Mail className="text-white" size={24} />
                                    )}
                                </div>
                                <div className="flex-grow text-left">
                                    <h3 className="font-semibold text-gray-800 text-lg">
                                        {isGeneratingInvite ? 'Generating...' : 'Invite Link'}
                                    </h3>
                                    <p className="text-sm text-gray-600">Generate a unique invite link</p>
                                </div>
                            </button>
                        </div>

                        {/* Info Text */}
                        <div className="mt-6 p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-600 text-center">
                                Links will be automatically copied to your clipboard
                            </p>
                        </div>
                    </div>
                </div>
            )}

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