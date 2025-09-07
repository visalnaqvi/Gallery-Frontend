import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ImageGallery, { ReactImageGalleryItem } from "react-image-gallery";
import { ImageItem } from "@/types/ImageItem";
import { ArchiveRestore, Download, HeartIcon, Info, Trash2, X, Plus, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { saveAs } from "file-saver";
import { useSession } from "next-auth/react";
import { isMobile } from "react-device-detect";

type Album = {
    id: number;
    name: string;
    total_images: number;
    group_id: number;
};

type props = {
    images: ImageItem[]
    setCurrentIndex: (value: number | ((prev: number) => number)) => void;
    setImages: (value: ImageItem[] | ((prev: ImageItem[]) => ImageItem[])) => void;
    setIsOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
    currentIndex: number;
    fetchImages: (currentPage?: number, resetImages?: boolean) => void;
    LOAD_MORE_AHEAD: number;
    hasMore: boolean;
    loading: boolean;
    isOpen: boolean;
    mode?: string;
    resetState: () => void;
    getImageSource: (image: ImageItem) => string;
    albums: Album[];
    groupId: string;
}

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
    mode,
    resetState,
    getImageSource,
    albums,
    groupId
}: props) {
    const [showIcons, setShowIcons] = useState(true);
    const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [showImageInfo, setShowImageInfo] = useState(false);
    const [showAlbums, setShowAlbums] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [albumActionLoading, setAlbumActionLoading] = useState<number | null>(null);
    const [imageAlbumIds, setImageAlbumIds] = useState<number[]>([]);
    const [fetchingAlbums, setFetchingAlbums] = useState(false);
    const { data: session } = useSession()

    // Optimized preloading system
    const preloadedImagesRef = useRef<Set<string>>(new Set());
    const preloadingRef = useRef<Set<string>>(new Set());
    const preloadQueueRef = useRef<string[]>([]);
    const isProcessingQueueRef = useRef(false);

    // Reduced window for better performance
    const IMMEDIATE_WINDOW = 5; // Images to load immediately around current
    const GALLERY_WINDOW = 10; // Total gallery items to create

    // Priority-based preload function
    const preloadImage = useCallback((src: string, priority: 'high' | 'normal' = 'normal'): Promise<void> => {
        if (preloadedImagesRef.current.has(src) || preloadingRef.current.has(src)) {
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            preloadingRef.current.add(src);

            const img = new window.Image();

            // Set priority hints for modern browsers
            if ('loading' in img) {
                img.loading = priority === 'high' ? 'eager' : 'lazy';
            }
            if ('fetchPriority' in img) {
                (img as any).fetchPriority = priority === 'high' ? 'high' : 'low';
            }

            img.onload = () => {
                preloadedImagesRef.current.add(src);
                preloadingRef.current.delete(src);
                resolve();
            };
            img.onerror = () => {
                preloadingRef.current.delete(src);
                console.warn(`Failed to preload: ${src}`);
                resolve();
            };
            img.src = src;
        });
    }, []);

    // Queue-based preloading system
    const processPreloadQueue = useCallback(async () => {
        if (isProcessingQueueRef.current || preloadQueueRef.current.length === 0) {
            return;
        }

        isProcessingQueueRef.current = true;

        try {
            // Process high priority items first (batch of 3)
            const highPriorityBatch = preloadQueueRef.current.splice(0, 3);
            await Promise.all(
                highPriorityBatch.map(src => preloadImage(src, 'high'))
            );

            // Small delay before processing normal priority
            await new Promise(resolve => setTimeout(resolve, 100));

            // Process remaining items in smaller batches
            while (preloadQueueRef.current.length > 0) {
                const batch = preloadQueueRef.current.splice(0, 2);
                await Promise.all(
                    batch.map(src => preloadImage(src, 'normal'))
                );

                // Longer delay between normal priority batches
                if (preloadQueueRef.current.length > 0) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }
        } finally {
            isProcessingQueueRef.current = false;
        }
    }, [preloadImage]);

    // Optimized gallery items - only create items around current index
    const galleryItems: ReactImageGalleryItem[] = useMemo(() => {
        // Create a smaller window of gallery items around current index
        const start = Math.max(0, currentIndex - GALLERY_WINDOW);
        const end = Math.min(images.length - 1, currentIndex + GALLERY_WINDOW);

        const items: ReactImageGalleryItem[] = [];

        // Fill with placeholder items for indices before our window
        for (let i = 0; i < start; i++) {
            items.push({
                original: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB2aWV3Qm94PSIwIDAgMSAxIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNmMGYwZjAiLz48L3N2Zz4=',
                loading: "lazy" as const,
                originalAlt: `Loading image ${i + 1}`,
            });
        }

        // Add real items for the visible window
        for (let i = start; i <= end; i++) {
            const image = images[i];
            if (image) {
                items.push({
                    original: getImageSource(image),
                    loading: i === currentIndex ? "eager" as const : "lazy" as const,
                    originalAlt: `Gallery image ${i + 1}`,
                    thumbnailAlt: `Gallery thumbnail ${i + 1}`,
                });
            }
        }

        // Fill with placeholder items for indices after our window
        for (let i = end + 1; i < images.length; i++) {
            items.push({
                original: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB2aWV3Qm94PSIwIDAgMSAxIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNmMGYwZjAiLz48L3N2Zz4=',
                loading: "lazy" as const,
                originalAlt: `Loading image ${i + 1}`,
            });
        }

        return items;
    }, [images, currentIndex, GALLERY_WINDOW]);

    // Priority-based preloading around current index
    const preloadAroundIndex = useCallback(async (index: number) => {
        // Clear previous queue
        preloadQueueRef.current = [];

        // High priority: immediate neighbors (±3)
        const immediateStart = Math.max(0, index - 3);
        const immediateEnd = Math.min(images.length - 1, index + 3);

        // Normal priority: extended window (±10)
        const extendedStart = Math.max(0, index - IMMEDIATE_WINDOW);
        const extendedEnd = Math.min(images.length - 1, index + IMMEDIATE_WINDOW);

        const highPriorityImages: string[] = [];
        const normalPriorityImages: string[] = [];

        // Collect high priority images (immediate neighbors)
        for (let i = immediateStart; i <= immediateEnd; i++) {
            const src = images[i] ? getImageSource(images[i]) : "";
            if (src && !preloadedImagesRef.current.has(src) && !preloadingRef.current.has(src)) {
                highPriorityImages.push(src);
            }
        }

        // Collect normal priority images (extended window, excluding immediate)
        for (let i = extendedStart; i <= extendedEnd; i++) {
            if (i < immediateStart || i > immediateEnd) {
                const src = images[i] ? getImageSource(images[i]) : "";
                if (src && !preloadedImagesRef.current.has(src) && !preloadingRef.current.has(src)) {
                    normalPriorityImages.push(src);
                }
            }
        }

        // Add to queue: high priority first, then normal priority
        preloadQueueRef.current = [...highPriorityImages, ...normalPriorityImages];

        console.log(`Queued ${highPriorityImages.length} high priority and ${normalPriorityImages.length} normal priority images for index ${index}`);

        // Start processing the queue
        processPreloadQueue();

    }, [images, IMMEDIATE_WINDOW, processPreloadQueue]);

    // Auto-hide icons after 3 seconds
    const resetHideTimer = useCallback(() => {
        if (hideTimerRef.current) {
            clearTimeout(hideTimerRef.current);
        }
        setShowIcons(true);
        hideTimerRef.current = setTimeout(() => {
            setShowIcons(false);
        }, 3000);
    }, []);

    // Handle mouse movement to show/hide icons
    const handleMouseMove = useCallback(() => {
        resetHideTimer();
    }, [resetHideTimer]);

    // Convert bytes to MB
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

    // Fetch album IDs for current image
    const fetchImageAlbums = useCallback(async (imageId: string) => {
        if (!imageId) return;

        setFetchingAlbums(true);
        try {
            const response = await fetch(`/api/groups/images/getAlbums?imageId=${imageId}`);
            if (!response.ok) {
                console.error('Failed to fetch image albums');
                return;
            }

            const data = await response.json();
            setImageAlbumIds(data.albumIds || []);
        } catch (error) {
            console.error('Error fetching image albums:', error);
            setImageAlbumIds([]);
        } finally {
            setFetchingAlbums(false);
        }
    }, []);

    // Check if current image is in a specific album
    const isImageInAlbum = useCallback((albumId: number): boolean => {
        return imageAlbumIds.includes(albumId);
    }, [imageAlbumIds]);

    // Handle adding/removing image from album
    const handleAlbumToggle = useCallback(async (albumId: number) => {
        const currentImage = images[currentIndex];
        if (!currentImage?.id) return;

        setAlbumActionLoading(albumId);

        try {
            const isInAlbum = isImageInAlbum(albumId);

            if (isInAlbum) {
                // Remove from album
                const response = await fetch('/api/albums', {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        mode: 'image',
                        albumId: albumId,
                        groupId: parseInt(groupId),
                        imageId: currentImage.id
                    }),
                });

                if (!response.ok) {
                    const error = await response.json();
                    console.error('Failed to remove image from album:', error);
                    alert('Failed to remove image from album');
                    return;
                }

                setImages(prevImages =>
                    prevImages.map(img =>
                        img.id === currentImage.id
                            ? {
                                ...img,
                                albums: imageAlbumIds.filter(id => id !== albumId) || []
                            }
                            : img
                    )
                );

                setImageAlbumIds(prev => prev.filter(id => id !== albumId));

                if (mode === 'album') {
                    const nextIndex = currentIndex < images.length - 1 ? currentIndex : currentIndex - 1;

                    if (nextIndex >= 0 && images.length > 1) {
                        setCurrentIndex(nextIndex);
                    } else {
                        setIsOpen(false);
                    }

                    resetState();
                    setTimeout(() => {
                        fetchImages(0, true);
                    }, 0);
                }

            } else {
                // Add to album
                const response = await fetch('/api/albums', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        imageId: currentImage.id,
                        albumId: albumId,
                        groupId: parseInt(groupId)
                    }),
                });

                if (!response.ok) {
                    const error = await response.json();
                    console.error('Failed to add image to album:', error);
                    alert('Failed to add image to album');
                    return;
                }

                setImages(prevImages =>
                    prevImages.map(img =>
                        img.id === currentImage.id
                            ? {
                                ...img,
                                albums: [...(imageAlbumIds || []), albumId]
                            }
                            : img
                    )
                );

                setImageAlbumIds(prev => [...prev, albumId]);
            }

        } catch (error) {
            console.error('Error toggling album:', error);
            alert('Something went wrong');
        } finally {
            setAlbumActionLoading(null);
        }
    }, [currentIndex, images, groupId, isImageInAlbum, setImages, mode, resetState, fetchImages, setCurrentIndex, setIsOpen, imageAlbumIds]);

    // Handle browser back button and mobile back gesture
    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            if (isOpen) {
                event.preventDefault();
                setIsOpen(false);
            }
        };

        if (isOpen) {
            window.history.pushState({ galleryOpen: true }, '', window.location.href);
            window.addEventListener('popstate', handlePopState);
        }

        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [isOpen, setIsOpen]);

    // Setup keyboard handlers and body overflow
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setIsOpen(false);
                setShowImageInfo(false);
                setShowAlbums(false);
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
            if (hideTimerRef.current) {
                clearTimeout(hideTimerRef.current);
            }
        };
    }, [isOpen, resetHideTimer, setIsOpen]);

    // Enhanced slide handler with dynamic gallery item updates
    const handleSlide = useCallback(async (index: number) => {
        console.log(`Sliding to index ${index}`);
        setCurrentIndex(index);
        setShowImageInfo(false);
        setShowAlbums(false);
        resetHideTimer();

        setImageAlbumIds([]);

        // Check if we need to load the actual image (if it was a placeholder)
        const currentImage = images[index];
        if (currentImage?.compressed_location && currentImage?.compressed_location_3k) {
            // Immediately preload current image with high priority
            await preloadImage(getImageSource(currentImage), 'high');
        }

        // Start preloading around new index
        preloadAroundIndex(index);

        // Fetch more images if close to end
        if (images.length - index <= LOAD_MORE_AHEAD && hasMore && !loading) {
            console.log(`Fetching more images (${images.length - index} remaining)`);
            fetchImages();
        }
    }, [images, setCurrentIndex, resetHideTimer, preloadImage, preloadAroundIndex,
        LOAD_MORE_AHEAD, hasMore, loading, fetchImages]);

    // Initial preloading when gallery opens
    useEffect(() => {
        if (isOpen && images.length > 0) {
            console.log(`Gallery opened at index ${currentIndex}`);

            // Clear any stale preload state
            preloadingRef.current.clear();
            preloadQueueRef.current = [];

            // Immediately load current image
            const currentSrc = getImageSource(images[currentIndex])
            if (currentSrc) {
                preloadImage(currentSrc, 'high');
            }

            // Start preloading around current index
            setTimeout(() => preloadAroundIndex(currentIndex), 100);
        }
    }, [isOpen, currentIndex, images.length, preloadAroundIndex, preloadImage]);

    const downloadCompressed = useCallback(async () => {
        try {
            let src;
            if (images[currentIndex].location_stripped) {
                src = images[currentIndex].location_stripped
            } else if (images[currentIndex].compressed_location_3k) {
                src = images[currentIndex].compressed_location_3k
            } else if (images[currentIndex].compressed_location) {
                src = images[currentIndex].compressed_location
            } else {
                return;
            }
            const fileResp = await fetch(src);
            const blob = await fileResp.blob();
            saveAs(blob, images[currentIndex].filename || "image.jpg");
        } catch (error) {
            console.error("Download failed:", error);
            alert("Download not supported on this device.");
        }
    }, [images, currentIndex]);

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

            const data = await res.json();
            console.log("Highlight updated:", data);

            setImages(prevImages =>
                prevImages.map((img: ImageItem) =>
                    img.id === currentImage.id
                        ? { ...img, highlight: !img.highlight }
                        : img
                )
            );

            if (mode == 'highlight' && currentImage.highlight) {
                const nextIndex = currentIndex < images.length - 1 ? currentIndex : currentIndex - 1;

                if (nextIndex >= 0 && images.length > 1) {
                    setCurrentIndex(nextIndex);
                } else {
                    setIsOpen(false);
                }

                resetState();
                setTimeout(() => {
                    fetchImages(0, true);
                }, 0);
            }
        } catch (err) {
            console.error("Error updating highlight:", err);
            alert("Something went wrong.");
        }
    }, [currentIndex, images, setImages, mode, resetState, fetchImages, setCurrentIndex, setIsOpen]);

    const handleRestoreImage = useCallback(async () => {
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

            setImages(prevImages =>
                prevImages.map((img: ImageItem) =>
                    img.id === currentImage.id
                        ? { ...img, delete_at: null }
                        : img
                )
            );

            if (mode == 'bin') {
                const nextIndex = currentIndex < images.length - 1 ? currentIndex : currentIndex - 1;

                if (nextIndex >= 0 && images.length > 1) {
                    setCurrentIndex(nextIndex);
                } else {
                    setIsOpen(false);
                }

                resetState();
                setTimeout(() => {
                    fetchImages(0, true);
                }, 0);
            }
            alert("Image Restored Successfully");
        } catch (err) {
            alert("Something went wrong.");
        }
    }, [currentIndex, images, setImages, mode, resetState, fetchImages, setCurrentIndex, setIsOpen]);

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

            setImages(prevImages =>
                prevImages.map((img: ImageItem) =>
                    img.id === currentImage.id
                        ? { ...img, delete_at: new Date().toISOString() }
                        : img
                )
            );

            alert("Image will be deleted in 24 hours.");
            setShowDeleteConfirm(false);
        } catch (error) {
            console.error("Error deleting image:", error);
            alert("Something went wrong.");
        }
    }, [currentIndex, images, setImages]);

    // Custom navigation functions
    const goToPrevious = useCallback(() => {
        if (currentIndex > 0) {
            handleSlide(currentIndex - 1);
        }
    }, [currentIndex, handleSlide]);

    const goToNext = useCallback(() => {
        if (currentIndex < images.length - 1) {
            handleSlide(currentIndex + 1);
        }
    }, [currentIndex, images.length, handleSlide]);

    const currentImage = images[currentIndex];

    return (
        <div
            className="fixed inset-0 bg-black z-50"
            onMouseMove={handleMouseMove}
            onClick={() => {
                setShowImageInfo(false);
                setShowAlbums(false);
            }}
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

            {/* Custom Navigation Arrows */}
            {images.length > 1 && (
                <>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            goToPrevious();
                        }}
                        disabled={currentIndex === 0}
                        className={`absolute left-4 top-1/2 -translate-y-1/2 z-40 p-3 bg-black/70 bg-opacity-50 text-white rounded-full hover:bg-opacity-75 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed ${showIcons ? 'opacity-100' : 'opacity-0'
                            }`}
                        aria-label="Previous image"
                    >
                        <ChevronLeft size={24} />
                    </button>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            goToNext();
                        }}
                        disabled={currentIndex === images.length - 1}
                        className={`absolute right-4 top-1/2 -translate-y-1/2 z-40 p-3 bg-black/70 bg-opacity-50 text-white rounded-full hover:bg-opacity-75 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed ${showIcons ? 'opacity-100' : 'opacity-0'
                            }`}
                        aria-label="Next image"
                    >
                        <ChevronRight size={24} />
                    </button>
                </>
            )}

            {/* Action Icons */}
            <div className={`absolute bottom-4 right-4 z-50 flex gap-3 transition-all duration-300 ${showIcons ? 'opacity-100' : 'opacity-0'
                }`}>
                {/* Info Icon */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowImageInfo(!showImageInfo);
                        setShowAlbums(false);
                        resetHideTimer();
                    }}
                    className="p-3 bg-gray-900 text-white rounded-full hover:bg-gray-700 transition-colors duration-200 shadow-lg"
                    title="View image details"
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
                    className="p-3 bg-gray-900 text-white rounded-full transition-colors duration-200 shadow-lg hover:bg-gray-700"
                    title={currentImage?.highlight ? "Remove from favorites" : "Add to favorites"}
                >
                    <HeartIcon fill={currentImage?.highlight ? "white" : ""} size={20} />
                </button>

                {/* Add to Album icon */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (!showAlbums && currentImage?.id) {
                            fetchImageAlbums(currentImage.id);
                        }
                        setShowAlbums(!showAlbums);
                        setShowImageInfo(false);
                        resetHideTimer();
                    }}
                    className="p-3 bg-gray-900 text-white rounded-full hover:bg-gray-700 transition-colors duration-200 shadow-lg"
                    title="Manage albums"
                >
                    <Plus size={20} />
                </button>

                {/* Delete/Restore Icon */}
                {currentImage && currentImage.delete_at ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleRestoreImage();
                            resetHideTimer();
                        }}
                        className="p-3 bg-gray-900 text-white rounded-full hover:bg-gray-700 transition-colors duration-200 shadow-lg"
                        title="Restore image"
                    >
                        <ArchiveRestore size={20} />
                    </button>
                ) : (
                    session?.user?.id && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowDeleteConfirm(true);
                                resetHideTimer();
                            }}
                            className="p-3 bg-gray-900 text-white rounded-full hover:bg-gray-700 transition-colors duration-200 shadow-lg"
                            title="Delete image"
                        >
                            <Trash2 size={20} />
                        </button>
                    )
                )}

                {/* Download Icon */}
                {!isMobile && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            downloadCompressed();
                            resetHideTimer();
                        }}
                        className="p-3 bg-gray-900 text-white rounded-full hover:bg-gray-700 transition-colors duration-200 shadow-lg"
                        title="Download image"
                    >
                        <Download size={20} />
                    </button>
                )}
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

            {/* Albums Panel */}
            {showAlbums && currentImage && (
                <div
                    className="absolute bottom-4 left-4 z-50 bg-black bg-opacity-90 text-white p-4 rounded-lg max-w-sm max-h-96 overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex justify-between items-start mb-3">
                        <h3 className="text-lg font-semibold">Albums</h3>
                        <button
                            onClick={() => setShowAlbums(false)}
                            className="text-gray-300 hover:text-white ml-2"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {fetchingAlbums ? (
                        <div className="flex items-center justify-center py-4">
                            <div className="w-6 h-6 border border-white border-t-transparent rounded-full animate-spin"></div>
                            <span className="ml-2 text-sm">Loading albums...</span>
                        </div>
                    ) : albums.length === 0 ? (
                        <p className="text-gray-400 text-sm">No albums available</p>
                    ) : (
                        <div className="space-y-2">
                            {albums.map(album => {
                                const isInAlbum = isImageInAlbum(album.id);
                                const isLoading = albumActionLoading === album.id;

                                return (
                                    <button
                                        key={album.id}
                                        onClick={() => handleAlbumToggle(album.id)}
                                        disabled={isLoading}
                                        className={`w-full flex items-center justify-between p-2 rounded transition-colors ${isInAlbum
                                            ? 'bg-green-600 hover:bg-green-700'
                                            : 'bg-gray-700 hover:bg-gray-600'
                                            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <span className="text-sm font-medium truncate">
                                            {album.name}
                                        </span>
                                        <div className="flex items-center gap-2 ml-2">
                                            {/* <span className="text-xs text-gray-300">
                                                {album.total_images} photos
                                            </span> */}
                                            {isLoading ? (
                                                <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin"></div>
                                            ) : isInAlbum ? (
                                                <Check size={16} className="text-white" />
                                            ) : (
                                                <Plus size={16} className="text-gray-300" />
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Image Gallery - Hidden navigation arrows */}
            <div className="h-full flex items-center justify-center">
                <div className="w-full max-h-full relative flex items-center justify-center">
                    <style jsx>{`
                        .image-gallery-left-nav,
                        .image-gallery-right-nav {
                            display: none !important;
                        }
                    `}</style>
                    <ImageGallery
                        items={galleryItems}
                        startIndex={currentIndex}
                        showThumbnails={false}
                        showFullscreenButton={false}
                        showPlayButton={false}
                        showBullets={false}
                        lazyLoad={false} // Disabled since we're handling preloading manually
                        showNav={false} // Disable default navigation
                        slideDuration={150}
                        slideInterval={0}
                        onSlide={handleSlide}
                        slideOnThumbnailOver={false}
                        disableKeyDown={false}
                        disableSwipe={false}
                        useBrowserFullscreen={false}
                    />
                </div>
            </div>
        </div>
    );
}