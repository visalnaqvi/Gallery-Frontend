"use client";

import Image from "next/image";
import { ImageItem } from "@/types/ImageItem";
import { Share2, Flame, ImageIcon, Trash } from "lucide-react";
import Switch from "./switch";
import { useRouter } from "next/navigation";
import InfoToast from "../infoToast";
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
    const router = useRouter()
    return (
        <>

            {/* Sorting Dropdown */}
            <div className="flex justify-end items-center p-4">
                <div className="flex justify-end items-center mr-2">
                    <label htmlFor="sort" className="mr-2 text-sm font-medium text-gray-700">
                        Sort:
                    </label>
                    <select
                        id="sort"
                        value={sorting}
                        onChange={(e) => setSorting(e.target.value)}
                        className="bg-blue-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option className="bg-white" value="date_taken">Date Taken</option>
                        <option className="bg-white" value="filename">Name</option>
                        <option className="bg-white" value="uploaded_at">Upload Date</option>
                    </select>
                </div>

                {groupId && <div className="flex justify-end items-center">
                    <button
                        type="button"
                        onClick={() => {
                            const domain = window.location.origin; // current domain
                            const link = isPerson ? `${domain}/public/gallery-person?groupId=${groupId}&personId=${personId}` : `${domain}/public/gallery-groups?groupId=${groupId}`;
                            navigator.clipboard.writeText(link);
                            alert("Sharable link copied!");
                        }}
                        className="flex justify-center items-center bg-blue-500 text-white px-4 py-2 rounded cursor-pointer hover:bg-blue-600 transition"
                    >
                        <Share2 size={16} className="md:mr-2 mb-1" />
                        <span className="hidden md:block">Copy Sharable Link</span>
                    </button>
                </div>}

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

                {setMode && <div className="flex justify-end items-center ml-2">
                    <button
                        disabled={loading}
                        type="button"
                        onClick={() => setMode("highlight")}
                        className={`flex justify-center items-center ${loading ? 'bg-blue-300' : 'bg-blue-500'} text-white px-4 py-2 rounded cursor-pointer hover:${loading ? 'bg-blue-300' : 'bg-blue-600'} transition`}
                    >
                        <Flame size={16} className="md:mr-2 mb-1" />
                        <span className="hidden md:block">
                            Highlights
                        </span>
                    </button>
                </div>}



            </div>
            {/* Image Grid */}

            {!loading && images && images.length == 0 ?

                <InfoToast loading={false} message="No Images Found" /> :
                <div className="p-4 grid grid-cols-4 md:grid-cols-8 lg:grid-cols-10 gap-1 md:gap-2">
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
                            />
                        </div>
                    ))}
                </div>}
        </>
    );
}
