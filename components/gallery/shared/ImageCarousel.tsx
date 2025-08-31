"use client";
import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import Image from "next/image";
import ImageGallery, { ReactImageGalleryItem } from "react-image-gallery";
import { Info, Trash2, Download, X, HeartIcon, ArchiveRestore } from "lucide-react";
import { ImageItem } from "./types";

interface ImageCarouselProps {
    isOpen: boolean;
    images: ImageItem[];
    currentIndex: number;
    hasMore: boolean;
    loading: boolean;
    showIcons: boolean;
    showImageInfo: boolean;
    showDeleteConfirm: boolean;
    onClose: () => void;
    onSlide: (index: number) => void;
    onLoadMore: () => void;
    onMouseMove: () => void;
    onToggleInfo: () => void;
    onToggleDeleteConfirm: (show: boolean) => void;
    onHighlightUpdate: (imageId: string) => void;
    onDeleteImage: (imageId: string) => void;
    onRestoreImage: (imageId: string) => void;
    resetHideTimer: () => void;
}

export default function ImageCarousel({
    isOpen,
    images,
    currentIndex,
    hasMore,
    loading,
    showIcons,
    showImageInfo,
    showDeleteConfirm,
    onClose,
    onSlide,
    onLoadMore,
    onMouseMove,
    onToggleInfo,
    onToggleDeleteConfirm,
    onHighlightUpdate,
    onDeleteImage,
    onRestoreImage,
    resetHideTimer
}: ImageCarouselProps) {
    const LOAD_MORE_AHEAD = 50;

    const formatFileSize = (bytes: number): string => {
        const mb = bytes / (1024 * 1024);
        return `${mb.toFixed(2)} MB`;
    };

    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const downloadCompressed = useCallback(async () => {
        try {
            const fileResp = await fetch(images[currentIndex].compressed_location);
            const blob = await fileResp.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = images[currentIndex].filename || "image.jpg";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed:', error);
        }
    }, [images, currentIndex]);

    const downloadOriginal = useCallback(async () => {
        try {
            const response = await fetch('/api/images/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: images[currentIndex].id })
            });
            const { downloadUrl } = await response.json();
            const fileResp = await fetch(downloadUrl);
            const blob = await fileResp.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = images[currentIndex].filename || "image.jpg";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed:', error);
        }
    }, [images, currentIndex]);

    const galleryItems: ReactImageGalleryItem[] = useMemo(
        () => images.map((image) => ({
            original: image.compressed_location,
            thumbnail: image.thumbnail_location,
            loading: "lazy" as const,
            originalAlt: "Gallery image",
            thumbnailAlt: "Gallery thumbnail",
        })),
        [images]
    );

    // Close on Esc and manage body overflow
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose();
            }
        };
        if (isOpen) {
            document.addEventListener("keydown", handleEsc);
            document.body.style.overflow = "hidden";
            resetHideTimer();
        }
        return () => {
            document.removeEventListener("keydown", handleEsc);
            document.body.style.overflow = "unset";
        };
    }, [isOpen, onClose, resetHideTimer]);

    const currentImage = images[currentIndex];

    if (!isOpen || !currentImage) return null;

    return (
        <div
            className="fixed inset-0 bg-black z-50"
            onMouseMove={onMouseMove}
            onClick={() => onToggleInfo()}
        >
            {/* Close button */}
            <button
                onClick={onClose}
                className={`absolute top-4 right-4 z-50 text-white text-3xl hover:text-gray-300 transition-all duration-300 bg-black bg-opacity-50 rounded-full w-12 h-12 flex items-center justify-center ${showIcons ? 'opacity-100' : 'opacity-0'
                    }`}
                aria-label="Close gallery"
            >
                ×
            </button>

            {/* Image counter */}
            <div className={`absolute top-4 left-4 z-50 text-white bg-black bg-opacity-50 px-3 py-1 rounded transition-all duration-300 ${showIcons ? 'opacity-100' : 'opacity-0'
                }`}>
                {currentIndex + 1} / {images.length}
            </div>

            {/* Action Icons */}
            <div className={`absolute bottom-4 right-4 z-50 flex gap-3 transition-all duration-300 ${showIcons ? 'opacity-100' : 'opacity-0'
                }`}>
                {/* Info Icon */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleInfo();
                        resetHideTimer();
                    }}
                    className="p-3 bg-gray-900 text-white rounded-full hover:bg-blue-500 transition-colors duration-200 shadow-lg"
                    title="Image Info"
                >
                    <Info size={20} />
                </button>

                {/* Heart icon */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onHighlightUpdate(currentImage.id);
                        resetHideTimer();
                    }}
                    className="p-3 bg-gray-900 text-white rounded-full transition-colors duration-200 shadow-lg"
                    title="Toggle Highlight"
                >
                    <HeartIcon fill={currentImage?.highlight ? "white" : ""} size={20} />
                </button>

                {/* Delete/Restore Icon */}
                {currentImage && currentImage.delete_at ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onRestoreImage(currentImage.id);
                            resetHideTimer();
                        }}
                        className="p-3 bg-gray-900 text-white rounded-full hover:bg-green-500 transition-colors duration-200 shadow-lg"
                        title="Restore Image"
                    >
                        <ArchiveRestore size={20} />
                    </button>
                ) : (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleDeleteConfirm(true);
                            resetHideTimer();
                        }}
                        className="p-3 bg-gray-900 text-white rounded-full hover:bg-red-500 transition-colors duration-200 shadow-lg"
                        title="Delete Image"
                    >
                        <Trash2 size={20} />
                    </button>
                )}

                {/* Download Compressed Icon */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        downloadCompressed();
                        resetHideTimer();
                    }}
                    className="p-3 bg-gray-900 text-white rounded-full hover:bg-green-500 transition-colors duration-200 shadow-lg"
                    title="Download Compressed"
                >
                    <Download size={20} />
                </button>

                {/* Download Original Icon */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        downloadOriginal();
                        resetHideTimer();
                    }}
                    className="p-3 bg-gray-900 text-white rounded-full hover:bg-purple-500 transition-colors duration-200 shadow-lg"
                    title="Download Original"
                >
                    <Download size={20} />
                </button>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div
                    className="absolute inset-0 z-50 flex items-center justify-center bg-black/65"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="bg-white rounded-lg p-6 max-w-md mx-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Confirm Deletion
                        </h3>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to delete this image? This action will schedule the image for deletion in 24 hours.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => onToggleDeleteConfirm(false)}
                                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => onDeleteImage(currentImage.id)}
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Info Panel */}
            {showImageInfo && currentImage && (
                <div
                    className="absolute bottom-4 left-4 z-50 bg-black bg-opacity-80 text-white p-4 rounded-lg max-w-sm"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-semibold">Image Info</h3>
                        <button
                            onClick={() => onToggleInfo()}
                            className="text-gray-300 hover:text-white ml-2"
                        >
                            <X size={16} />
                        </button>
                    </div>
                    <div className="space-y-2 text-sm">
                        <div>
                            <span className="font-medium">Filename:</span>
                            <br />
                            <span className="text-gray-300">{currentImage.filename}</span>
                        </div>
                        <div>
                            <span className="font-medium">Size:</span>
                            <br />
                            <span className="text-gray-300">{formatFileSize(currentImage.size)}</span>
                        </div>
                        <div>
                            <span className="font-medium">Date Taken:</span>
                            <br />
                            <span className="text-gray-300">
                                {currentImage.date_taken ? formatDate(currentImage.date_taken) : "Not Available"}
                            </span>
                        </div>
                        <div>
                            <span className="font-medium">Uploaded:</span>
                            <br />
                            <span className="text-gray-300">{formatDate(currentImage.uploaded_at)}</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="h-full flex flex-col">
                <div className="flex-1 relative">
                    <ImageGallery
                        items={galleryItems}
                        startIndex={currentIndex}
                        showThumbnails={false}
                        showFullscreenButton={false}
                        showPlayButton={false}
                        showBullets={false}
                        lazyLoad={false}
                        showNav={true}
                        slideDuration={300}
                        slideInterval={0}
                        onSlide={(index) => {
                            onSlide(index);
                            if (images.length - index <= LOAD_MORE_AHEAD && hasMore && !loading) {
                                onLoadMore();
                            }
                        }}
                        renderItem={(item) => (
                            <div className="image-gallery-image relative h-screen w-screen flex items-center justify-center">
                                <Image
                                    src={item.original}
                                    alt={item.originalAlt || ""}
                                    fill
                                    className="object-contain"
                                    priority={false}
                                    loading="eager"
                                    unoptimized
                                />
                            </div>
                        )}
                    />
                </div>
            </div>
        </div>
    );
}