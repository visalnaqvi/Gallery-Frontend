import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ImageGallery, { ReactImageGalleryItem } from "react-image-gallery";
import { ImageItem } from "@/types/ImageItem";
import { ArchiveRestore, Download, HeartIcon, Info, Trash2, X } from "lucide-react";

type Props = {
    images: ImageItem[];
    setCurrentIndex: (value: number | ((prev: number) => number)) => void;
    setImages: (value: ImageItem[] | ((prev: ImageItem[]) => ImageItem[])) => void;
    setIsOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
    currentIndex: number;
    fetchImages: () => void;
    LOAD_MORE_AHEAD: number;
    hasMore: boolean;
    loading: boolean;
    isOpen: boolean;
    preloadImages: (centerIndex: number, immediate?: boolean) => void;
    connectionSpeed: 'slow' | 'fast';
};

// Progressive image component with blur placeholder
const ProgressiveImage = ({ src, alt, priority = false }: {
    src: string;
    alt: string;
    priority?: boolean;
}) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [showBlur, setShowBlur] = useState(true);

    return (
        <div className="relative h-screen w-screen flex items-center justify-center bg-gray-900">
            {/* Blur placeholder */}
            {showBlur && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-32 h-32 bg-gray-800 rounded-lg animate-pulse"></div>
                </div>
            )}

            {/* Main image */}
            <Image
                src={src}
                alt={alt}
                fill
                className={`object-contain transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'
                    }`}
                priority={priority}
                sizes="100vw"
                onLoad={() => {
                    setImageLoaded(true);
                    setTimeout(() => setShowBlur(false), 150);
                }}
                onError={() => {
                    setShowBlur(false);
                }}
            />

            {/* Loading indicator */}
            {!imageLoaded && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                    <div className="flex items-center space-x-2 text-white bg-black bg-opacity-50 px-3 py-2 rounded">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm">Loading...</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default function ImageGalleryComponent({
    images,
    setCurrentIndex,
    currentIndex,
    fetchImages,
    LOAD_MORE_AHEAD,
    hasMore,
    loading,
    setIsOpen,
    setImages,
    isOpen,
    preloadImages,
    connectionSpeed
}: Props) {
    const [showIcons, setShowIcons] = useState(true);
    const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [showImageInfo, setShowImageInfo] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const lastSlideTimeRef = useRef<number>(0);
    const slideVelocityRef = useRef<number>(0);

    // Format functions
    const formatFileSize = useCallback((bytes: number): string => {
        const mb = bytes / (1024 * 1024);
        return `${mb.toFixed(2)} MB`;
    }, []);

    const formatDate = useCallback((dateString: string): string => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }, []);

    // Auto-hide icons
    const resetHideTimer = useCallback(() => {
        if (hideTimerRef.current) {
            clearTimeout(hideTimerRef.current);
        }
        setShowIcons(true);
        hideTimerRef.current = setTimeout(() => {
            setShowIcons(false);
        }, 3000);
    }, []);

    const handleMouseMove = useCallback(() => {
        resetHideTimer();
    }, [resetHideTimer]);

    // Keyboard navigation with preloading
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            switch (e.key) {
                case "Escape":
                    setIsOpen(false);
                    setShowImageInfo(false);
                    break;
                case "ArrowRight":
                    if (currentIndex < images.length - 1) {
                        const newIndex = currentIndex + 1;
                        setCurrentIndex(newIndex);
                        preloadImages(newIndex);
                    }
                    break;
                case "ArrowLeft":
                    if (currentIndex > 0) {
                        const newIndex = currentIndex - 1;
                        setCurrentIndex(newIndex);
                        preloadImages(newIndex);
                    }
                    break;
            }
        };

        if (isOpen) {
            document.addEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "hidden";
            resetHideTimer();
        }

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "unset";
            if (hideTimerRef.current) {
                clearTimeout(hideTimerRef.current);
            }
        };
    }, [isOpen, currentIndex, images.length, setCurrentIndex, setIsOpen, preloadImages, resetHideTimer]);

    // Optimized gallery items with progressive loading
    const galleryItems: ReactImageGalleryItem[] = useMemo(
        () =>
            images.map((image, index) => ({
                original: image.compressed_location,
                thumbnail: image.thumbnail_location,
                loading: "lazy" as const,
                originalAlt: `Gallery image ${index + 1}`,
                thumbnailAlt: `Gallery thumbnail ${index + 1}`,
            })),
        [images]
    );

    // Download functions
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

    // Smart slide handler with velocity tracking and adaptive preloading
    const handleSlide = useCallback((index: number) => {
        const now = Date.now();
        const timeDiff = now - lastSlideTimeRef.current;
        const indexDiff = Math.abs(index - currentIndex);

        // Calculate slide velocity (images per second)
        if (timeDiff > 0) {
            slideVelocityRef.current = indexDiff / (timeDiff / 1000);
        }

        lastSlideTimeRef.current = now;
        setCurrentIndex(index);
        setShowImageInfo(false);
        resetHideTimer();

        // Adaptive preloading based on slide velocity
        const isFastSliding = slideVelocityRef.current > 2;
        if (!isFastSliding) {
            preloadImages(index);
        }

        // Load more data if needed
        if (images.length - index <= LOAD_MORE_AHEAD && hasMore && !loading) {
            fetchImages();
        }
    }, [currentIndex, setCurrentIndex, resetHideTimer, preloadImages, images.length, LOAD_MORE_AHEAD, hasMore, loading, fetchImages]);

    const currentImage = images[currentIndex];

    // Highlight/favorite functionality
    const handleHighlightUpdate = useCallback(async () => {
        if (!currentImage?.id) return;

        try {
            const action = currentImage.highlight ? "remove" : "add";
            const res = await fetch(`/api/groups/images?imageId=${currentImage.id}&action=${action}`, {
                method: "PATCH",
            });

            if (!res.ok) {
                const err = await res.json();
                console.error("Failed to update highlight:", err.error);
                alert("Failed to update highlight.");
                return;
            }

            setImages(prevImages =>
                prevImages.map((img: ImageItem) =>
                    img.id === currentImage.id
                        ? { ...img, highlight: !img.highlight }
                        : img
                )
            );
        } catch (err) {
            console.error("Error updating highlight:", err);
            alert("Something went wrong.");
        }
    }, [currentImage, setImages]);

    // Restore functionality
    const handleRestoreGroup = useCallback(async () => {
        if (!currentImage) return;

        try {
            const res = await fetch(`/api/groups/images/restore?imageId=${currentImage.id}`, {
                method: "PATCH",
            });

            if (!res.ok) {
                const err = await res.json();
                console.error("Failed to RESTORE:", err.error);
                alert("Failed to RESTORE.");
                return;
            }

            alert("Image Restored Successfully");
        } catch (err) {
            alert("Something went wrong.");
        }
    }, [currentImage]);

    // Delete functionality
    const handleConfirmDelete = useCallback(async () => {
        if (!currentImage?.id) return;

        try {
            const res = await fetch(`/api/groups/images?imageId=${currentImage.id}`, {
                method: "DELETE",
            });

            if (!res.ok) {
                const err = await res.json();
                console.error("Failed to delete:", err.error);
                alert("Failed to schedule delete.");
                return;
            }

            alert("Image will be deleted in 24 hours.");
            setShowDeleteConfirm(false);
        } catch (err) {
            console.error("Error deleting image:", err);
            alert("Something went wrong.");
        }
    }, [currentImage]);

    return (
        <div
            className="fixed inset-0 bg-black z-50"
            onMouseMove={handleMouseMove}
            onClick={() => setShowImageInfo(false)}
        >
            {/* Close button */}
            <button
                onClick={() => setIsOpen(false)}
                className={`absolute top-4 right-4 z-50 text-white text-3xl hover:text-gray-300 transition-all duration-300 bg-black bg-opacity-50 rounded-full w-12 h-12 flex items-center justify-center ${showIcons ? 'opacity-100' : 'opacity-0'
                    }`}
                aria-label="Close gallery"
            >
                <X size={24} />
            </button>

            {/* Image counter */}
            <div className={`absolute top-4 left-4 z-50 text-white bg-black bg-opacity-50 px-3 py-1 rounded transition-all duration-300 ${showIcons ? 'opacity-100' : 'opacity-0'
                }`}>
                {currentIndex + 1} / {images.length}
            </div>

            {/* Connection indicator for slow connections */}
            {connectionSpeed === 'slow' && (
                <div className={`absolute top-16 left-4 z-50 text-yellow-400 bg-black bg-opacity-50 px-3 py-1 rounded text-sm transition-all duration-300 ${showIcons ? 'opacity-100' : 'opacity-0'
                    }`}>
                    Slow connection detected
                </div>
            )}

            {/* Action Icons */}
            <div className={`absolute bottom-4 right-4 z-50 flex gap-3 transition-all duration-300 ${showIcons ? 'opacity-100' : 'opacity-0'
                }`}>
                {/* Info Icon */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowImageInfo(!showImageInfo);
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
                        handleHighlightUpdate();
                        resetHideTimer();
                    }}
                    className="p-3 bg-gray-900 text-white rounded-full hover:bg-red-500 transition-colors duration-200 shadow-lg"
                    title="Toggle Favorite"
                >
                    <HeartIcon
                        fill={currentImage?.highlight ? "red" : "none"}
                        stroke={currentImage?.highlight ? "red" : "white"}
                        size={20}
                    />
                </button>

                {/* Delete/Restore Icon */}
                {currentImage && currentImage.delete_at ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleRestoreGroup();
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
                            setShowDeleteConfirm(true);
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
                                onClick={() => setShowDeleteConfirm(false)}
                                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmDelete}
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
                    className="absolute bottom-4 left-4 z-50 bg-black bg-opacity-90 text-white p-4 rounded-lg max-w-sm"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-semibold">Image Info</h3>
                        <button
                            onClick={() => setShowImageInfo(false)}
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
                        {currentImage.delete_at && (
                            <div>
                                <span className="font-medium text-red-400">Scheduled for deletion:</span>
                                <br />
                                <span className="text-red-300">{formatDate(currentImage.delete_at)}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Main Gallery */}
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
                        onSlide={handleSlide}
                        renderItem={(item: ReactImageGalleryItem, index?: number) => (
                            <ProgressiveImage
                                src={item.original}
                                alt={item.originalAlt || "Gallery image"}
                                priority={index === currentIndex}
                            />
                        )}
                        // Custom navigation arrows with better UX
                        renderLeftNav={(onClick, disabled) => (
                            <button
                                onClick={onClick}
                                disabled={disabled}
                                className={`absolute left-4 top-1/2 transform -translate-y-1/2 z-40 text-white text-4xl hover:text-gray-300 transition-all duration-300 bg-black bg-opacity-50 rounded-full w-16 h-16 flex items-center justify-center ${showIcons ? 'opacity-100' : 'opacity-0'
                                    } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
                                aria-label="Previous image"
                            >
                                ‹
                            </button>
                        )}
                        renderRightNav={(onClick, disabled) => (
                            <button
                                onClick={onClick}
                                disabled={disabled}
                                className={`absolute right-4 top-1/2 transform -translate-y-1/2 z-40 text-white text-4xl hover:text-gray-300 transition-all duration-300 bg-black bg-opacity-50 rounded-full w-16 h-16 flex items-center justify-center ${showIcons ? 'opacity-100' : 'opacity-0'
                                    } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
                                aria-label="Next image"
                            >
                                ›
                            </button>
                        )}
                    />
                </div>
            </div>

            {/* Loading indicator for more images */}
            {loading && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-50">
                    <div className="flex items-center space-x-2 text-white bg-black bg-opacity-50 px-3 py-2 rounded">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm">Loading more images...</span>
                    </div>
                </div>
            )}
        </div>
    );
}