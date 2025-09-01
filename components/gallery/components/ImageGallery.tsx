import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ImageGallery, { ReactImageGalleryItem } from "react-image-gallery";
import { ImageItem } from "@/types/ImageItem";
import { ArchiveRestore, Download, HeartIcon, Info, Trash2, X } from "lucide-react";

type props = {
    images: ImageItem[]
    setCurrentIndex: (value: number | ((prev: number) => number)) => void;
    setImages: (value: ImageItem[] | ((prev: ImageItem[]) => ImageItem[])) => void;
    setIsOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
    currentIndex: number;
    fetchImages: () => void;
    LOAD_MORE_AHEAD: number;
    hasMore: boolean;
    loading: boolean;
    isOpen: boolean;
    preloadImage: (src: string) => void
    preloadedRange: React.RefObject<{ min: number; max: number }>;
}

export default function ImageGalleryComponent({ images, setCurrentIndex, currentIndex, fetchImages, LOAD_MORE_AHEAD, hasMore, loading, setIsOpen, setImages, isOpen, preloadImage, preloadedRange }: props) {
    const [showIcons, setShowIcons] = useState(true);
    const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [showImageInfo, setShowImageInfo] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // ✅ Enhanced preloading system
    const lastDirectionRef = useRef<'forward' | 'backward' | null>(null);
    const lastIndexRef = useRef<number>(0);
    const preloadedImagesRef = useRef<Set<string>>(new Set());
    const PRELOAD_BATCH_SIZE = 10; // How many images to preload in each batch

    // ✅ SOLUTION: Create virtualized gallery items with buffer
    const BUFFER_SIZE = 3; // Only render current + 3 before + 3 after

    const virtualizedGalleryItems: ReactImageGalleryItem[] = useMemo(() => {
        // Calculate the range of items to actually render
        const startIndex = Math.max(0, currentIndex - BUFFER_SIZE);
        const endIndex = Math.min(images.length - 1, currentIndex + BUFFER_SIZE);

        // Create array with placeholders for all positions but only real items in buffer
        return images.map((image, index) => {
            if (index >= startIndex && index <= endIndex) {
                // Render actual image within buffer
                return {
                    original: image.compressed_location,
                    loading: "lazy" as const,
                    originalAlt: "Gallery image",
                    thumbnailAlt: "Gallery thumbnail",
                    // Add custom property to identify if this is a real item
                    renderIndex: index,
                    isVirtualized: false
                };
            } else {
                // Placeholder for out-of-buffer items
                return {
                    original: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB2aWV3Qm94PSIwIDAgMSAxIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiMzMzMzMzMiLz48L3N2Zz4=", // 1x1 gray placeholder
                    loading: "lazy" as const,
                    originalAlt: "Loading...",
                    thumbnailAlt: "Loading...",
                    // Add custom property to identify if this is a placeholder
                    renderIndex: index,
                    isVirtualized: true
                };
            }
        });
    }, [images, currentIndex, BUFFER_SIZE]);

    // ✅ Auto-hide icons after 3 seconds
    const resetHideTimer = useCallback(() => {
        if (hideTimerRef.current) {
            clearTimeout(hideTimerRef.current);
        }
        setShowIcons(true);
        hideTimerRef.current = setTimeout(() => {
            setShowIcons(false);
        }, 3000);
    }, []);

    // ✅ Handle mouse movement to show/hide icons
    const handleMouseMove = useCallback(() => {
        resetHideTimer();
    }, [resetHideTimer]);

    // ✅ Enhanced preload function that checks if already loaded
    const preloadImageBatch = useCallback(async (startIndex: number, endIndex: number) => {
        const validIndices = [];

        // Only add indices that are valid and not already preloaded
        for (let i = startIndex; i <= endIndex; i++) {
            if (i >= 0 && i < images.length) {
                const imageSrc = images[i].compressed_location;
                if (!preloadedImagesRef.current.has(imageSrc)) {
                    validIndices.push(i);
                }
            }
        }

        if (validIndices.length === 0) {
            console.log(`🟡 Batch ${startIndex}-${endIndex}: All images already preloaded`);
            return;
        }

        console.log(`🔄 Preloading batch ${startIndex}-${endIndex}: ${validIndices.length} new images`);

        // Preload images in parallel
        const preloadPromises = validIndices.map(async (i) => {
            const imageSrc = images[i].compressed_location;
            try {
                await preloadImage(imageSrc);
                preloadedImagesRef.current.add(imageSrc);
                console.log(`✅ Preloaded image ${i}`);
            } catch (error) {
                console.warn(`❌ Failed to preload image ${i}:`, error);
            }
        });

        await Promise.all(preloadPromises);
        console.log(`✅ Completed batch ${startIndex}-${endIndex}`);
    }, [images, preloadImage]);

    // ✅ Smart directional preloading
    const handleDirectionalPreload = useCallback(async (newIndex: number, direction: 'forward' | 'backward') => {
        console.log(`🎯 Directional preload: ${direction} from index ${newIndex}`);

        if (direction === 'forward') {
            // Calculate next batch to preload
            const currentMax = preloadedRange.current.max;
            const nextBatchStart = Math.max(currentMax + 1, newIndex + 1);
            const nextBatchEnd = nextBatchStart + PRELOAD_BATCH_SIZE - 1;

            if (nextBatchStart < images.length) {
                await preloadImageBatch(nextBatchStart, nextBatchEnd);

                // Update preloaded range
                preloadedRange.current.max = Math.min(images.length - 1, nextBatchEnd);
                console.log(`📈 Updated max range to: ${preloadedRange.current.max}`);
            }
        } else if (direction === 'backward') {
            // Calculate previous batch to preload
            const currentMin = preloadedRange.current.min;
            const prevBatchEnd = Math.min(currentMin - 1, newIndex - 1);
            const prevBatchStart = prevBatchEnd - PRELOAD_BATCH_SIZE + 1;

            if (prevBatchEnd >= 0) {
                await preloadImageBatch(Math.max(0, prevBatchStart), prevBatchEnd);

                // Update preloaded range
                preloadedRange.current.min = Math.max(0, prevBatchStart);
                console.log(`📉 Updated min range to: ${preloadedRange.current.min}`);
            }
        }
    }, [images.length, preloadImageBatch, preloadedRange, PRELOAD_BATCH_SIZE]);

    // ✅ Detect if we need to trigger directional preloading
    const shouldTriggerPreload = useCallback((newIndex: number, direction: 'forward' | 'backward') => {
        const { min, max } = preloadedRange.current;
        const threshold = 10; // Trigger when user is 5 images away from the edge

        if (direction === 'forward') {
            return newIndex >= max - threshold;
        } else {
            return newIndex <= min + threshold;
        }
    }, []);

    // ✅ Convert bytes to MB
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

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setIsOpen(false);
                setShowImageInfo(false);
            }
        };
        if (isOpen) {
            document.addEventListener("keydown", handleEsc);
            document.body.style.overflow = "hidden";
            resetHideTimer(); // Start auto-hide timer when carousel opens
        }
        return () => {
            document.removeEventListener("keydown", handleEsc);
            document.body.style.overflow = "unset";
            if (hideTimerRef.current) {
                clearTimeout(hideTimerRef.current);
            }
        };
    }, [isOpen, resetHideTimer]);

    const downloadCompressed = useCallback(async () => {
        try {
            // Fetch the actual file as blob
            const fileResp = await fetch(images[currentIndex].compressed_location);
            const blob = await fileResp.blob();
            const url = window.URL.createObjectURL(blob);
            // Trigger download
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

    // Download original image via backend proxy
    const downloadOriginal = useCallback(async () => {
        try {
            const response = await fetch('/api/images/download', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    filename: images[currentIndex].id,
                })
            });
            const { downloadUrl } = await response.json();
            const fileResp = await fetch(downloadUrl);
            const blob = await fileResp.blob();
            const url = window.URL.createObjectURL(blob);
            // Trigger download
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

    const currentImage = images[currentIndex];

    const handleHighlightUpdate = useCallback(async () => {
        if (!currentImage?.id) return;

        try {
            // Use the correct property name (highlight instead of hightlight)
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

            const data = await res.json();
            console.log("Highlight updated:", data);

            // Update local state to reflect the change
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
            const data = await res.json();
            alert("Image Resotred Successfully");
        } catch (err) {
            alert("Something went wrong.");
        }
    }, [currentImage]);

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

            const data = await res.json();
            console.log("Delete scheduled:", data);
            alert("Image will be deleted in 24 hours.");
            setShowDeleteConfirm(false);
        } catch (err) {
            console.error("Error deleting image:", err);
            alert("Something went wrong.");
        }
    }, [currentImage]);

    // ✅ Custom render function for virtualized items
    const renderVirtualizedItem = useCallback((item: ReactImageGalleryItem) => {
        // Use custom property to determine if this is a placeholder
        const isVirtualized = (item as any).isVirtualized;
        const itemIndex = (item as any).renderIndex;

        if (isVirtualized) {
            // Show loading placeholder for out-of-buffer items
            return (
                <div className="image-gallery-image relative h-screen w-screen flex items-center justify-center bg-gray-900">
                    <div className="text-white text-lg">Loading...</div>
                </div>
            );
        }

        return (
            <div className="image-gallery-image relative h-screen w-screen flex items-center justify-center">
                <Image
                    src={item.original}
                    alt={item.originalAlt || ""}
                    fill
                    className="object-contain"
                    priority={itemIndex === currentIndex} // Only prioritize current image
                    sizes="110vw"
                />
            </div>
        );
    }, [currentIndex]);

    // ✅ Enhanced slide handler with smart directional preloading
    const handleSlide = useCallback(
        async (index: number) => {
            console.log(`🎯 Sliding from ${currentIndex} to ${index}`);

            setCurrentIndex(index);
            setShowImageInfo(false);
            resetHideTimer();

            // Determine direction
            const direction = index > lastIndexRef.current ? 'forward' : 'backward';
            const directionChanged = lastDirectionRef.current !== null && lastDirectionRef.current !== direction;

            console.log(`📍 Direction: ${direction}${directionChanged ? ' (changed)' : ''}`);

            // Check if we should trigger preloading
            if (shouldTriggerPreload(index, direction)) {
                console.log(`🚀 Triggering ${direction} preload at index ${index}`);
                await handleDirectionalPreload(index, direction);
            }

            // Update refs
            lastDirectionRef.current = direction;
            lastIndexRef.current = index;

            // Fetch more images if close to end
            if (images.length - index <= LOAD_MORE_AHEAD && hasMore && !loading) {
                console.log(`📡 Fetching more images (${images.length - index} remaining)`);
                fetchImages();
            }
        },
        [currentIndex, shouldTriggerPreload, handleDirectionalPreload, resetHideTimer, images.length, LOAD_MORE_AHEAD, hasMore, loading, fetchImages]
    );

    // ✅ Initialize preloaded images tracking when component mounts
    useEffect(() => {
        if (isOpen) {
            // Reset tracking when gallery opens
            lastIndexRef.current = currentIndex;
            lastDirectionRef.current = null;

            // Mark initially preloaded images
            const currentRange = preloadedRange.current;
            for (let i = currentRange.min; i <= currentRange.max; i++) {
                if (i >= 0 && i < images.length) {
                    preloadedImagesRef.current.add(images[i].compressed_location);
                }
            }

            console.log(`🎬 Gallery opened at index ${currentIndex}, preloaded range: ${currentRange.min}-${currentRange.max}`);
        }
    }, [isOpen, currentIndex, images, preloadedRange]);

    return <>
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
                ×
            </button>

            {/* Image counter */}
            <div className={`absolute top-4 left-4 z-50 text-white bg-black bg-opacity-50 px-3 py-1 rounded transition-all duration-300 ${showIcons ? 'opacity-100' : 'opacity-0'
                }`}>
                {currentIndex + 1} / {images.length}
            </div>

            {/* Preload Debug Info (remove in production) */}
            <div className={`absolute top-16 left-4 z-50 text-white bg-black bg-opacity-50 px-2 py-1 rounded text-xs transition-all duration-300 ${showIcons ? 'opacity-100' : 'opacity-0'}`}>
                Preloaded: {preloadedRange.current.min} - {preloadedRange.current.max} ({preloadedImagesRef.current.size} imgs)
            </div>

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
                    className="p-3 bg-gray-900 text-white rounded-full transition-colors duration-200 shadow-lg"
                    title="Image Info"
                >
                    <HeartIcon fill={currentImage?.highlight ? "white" : ""} size={20} />
                </button>
                {/* Delete Icon */}
                {currentImage && currentImage.delete_at ?
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
                    : <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowDeleteConfirm(true);
                            resetHideTimer();
                        }}
                        className="p-3 bg-gray-900 text-white rounded-full hover:bg-red-500 transition-colors duration-200 shadow-lg"
                        title="Delete Image"
                    >
                        <Trash2 size={20} />
                    </button>}
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

            {showImageInfo && currentImage && (
                <div
                    className="absolute bottom-4 left-4 z-50 bg-black bg-opacity-80 text-white p-4 rounded-lg max-w-sm"
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
                            <span className="text-gray-300">{currentImage.date_taken ? formatDate(currentImage.date_taken) : "Not Available"}</span>
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
                        items={virtualizedGalleryItems}
                        startIndex={currentIndex}
                        showThumbnails={false}
                        showFullscreenButton={false}
                        showPlayButton={false}
                        showBullets={false}
                        lazyLoad={true} // ✅ Enable lazy loading
                        showNav={true}
                        slideDuration={100}
                        slideInterval={0}
                        onSlide={(index: number) => { handleSlide(index) }}
                        renderItem={renderVirtualizedItem}
                    />
                </div>
            </div>
        </div>
    </>
}