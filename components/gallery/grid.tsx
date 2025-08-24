"use client";

import Image from "next/image";
import { ImageItem } from "@/types/ImageItem";

type GalleryGridProps = {
    handleImageClick: (index: number) => void;
    images: ImageItem[];
    sorting: string;
    setSorting: (value: string) => void;
};

export default function GalleryGrid({ handleImageClick, images, sorting, setSorting }: GalleryGridProps) {
    return (
        <>
            {/* Sorting Dropdown */}
            <div className="flex justify-end items-center p-4">
                <label htmlFor="sort" className="mr-2 text-sm font-medium text-gray-700">
                    Sort by:
                </label>
                <select
                    id="sort"
                    value={sorting}
                    onChange={(e) => setSorting(e.target.value)}
                    className="border rounded-lg px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="date_taken">Date Taken</option>
                    <option value="filename">Name</option>
                    <option value="uploaded_at">Upload Date</option>
                </select>
            </div>

            {/* Image Grid */}
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {images.map((image, idx) => (
                    <div
                        key={`${image.thumbnail_location}-${idx}`}
                        className="relative aspect-square cursor-pointer overflow-hidden rounded-lg shadow-md bg-gray-200"
                        onClick={() => handleImageClick(idx)}
                    >
                        <Image
                            src={image.thumbnail_location}
                            alt={`group image ${idx}`}
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 16.67vw"
                            className="object-cover object-top hover:scale-105 transition-transform duration-300"
                            priority={idx < 12}
                        />
                    </div>
                ))}
            </div>
        </>
    );
}
