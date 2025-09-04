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
    resetState: () => void
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

    // Simplified preloading system
    const preloadedImagesRef = useRef<Set<string>>(new Set());
    const preloadingRef = useRef<Set<string>>(new Set()); // Track images currently being preloaded
    const PRELOAD_WINDOW = 15; // Number of images to keep preloaded around current

    // Simple preload function
    const preloadImage = useCallback((src: string): Promise<void> => {
        if (preloadedImagesRef.current.has(src) || preloadingRef.current.has(src)) {
            return Promise.resolve();
        }

        preloadingRef.current.add(src);

        return new Promise((resolve, reject) => {
            const img = new window.Image();
            img.onload = () => {
                preloadedImagesRef.current.add(src);
                preloadingRef.current.delete(src);
                resolve();
            };
            img.onerror = (error) => {
                preloadingRef.current.delete(src);
                console.warn(`Failed to preload image: ${src}`, error);
                resolve(); // Don't reject to avoid breaking Promise.all
            };
            img.src = src;
        });
    }, []);

    // Generate gallery items WITHOUT virtualization
    const galleryItems: ReactImageGalleryItem[] = useMemo(() => {
        return images.map((image, index) => ({
            original: image.compressed_location,
            loading: "lazy" as const,
            originalAlt: `Gallery image ${index + 1}`,
            thumbnailAlt: `Gallery thumbnail ${index + 1}`,
        }));
    }, [images]);

    // Preload images around current index
    const preloadAroundIndex = useCallback(async (index: number) => {
        const start = Math.max(0, index - PRELOAD_WINDOW);
        const end = Math.min(images.length - 1, index + PRELOAD_WINDOW);

        const toPreload: string[] = [];

        for (let i = start; i <= end; i++) {
            const src = images[i]?.compressed_location;
            if (src && !preloadedImagesRef.current.has(src) && !preloadingRef.current.has(src)) {
                toPreload.push(src);
            }
        }

        if (toPreload.length > 0) {
            console.log(`Preloading ${toPreload.length} images around index ${index}`);

            // Preload in smaller batches to avoid overwhelming the browser
            const batchSize = 5;
            for (let i = 0; i < toPreload.length; i += batchSize) {
                const batch = toPreload.slice(i, i + batchSize);
                await Promise.all(batch.map(src => preloadImage(src)));

                // Small delay between batches to prevent blocking
                if (i + batchSize < toPreload.length) {
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
            }
        }
    }, [images, preloadImage, PRELOAD_WINDOW]);

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
        // Otherwise use the fetched album IDs
        return imageAlbumIds.includes(albumId);
    }, [images, currentIndex, imageAlbumIds]);

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

                // Update local state
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

                // Update fetched album IDs
                setImageAlbumIds(prev => prev.filter(id => id !== albumId));

                // Handle navigation and image removal if in album mode
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

                // Update local state
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

                // Update fetched album IDs
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
            // Preserve full URL (with query params)
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

    // Enhanced slide handler with improved preloading
    const handleSlide = useCallback(async (index: number) => {
        console.log(`Sliding to index ${index}`);
        setCurrentIndex(index);
        setShowImageInfo(false);
        setShowAlbums(false); // Close albums panel when sliding
        resetHideTimer();

        // Clear previous album IDs when sliding to new image
        setImageAlbumIds([]);

        // Immediate preload of current image if not already loaded
        const currentSrc = images[index]?.compressed_location;
        if (currentSrc && !preloadedImagesRef.current.has(currentSrc)) {
            await preloadImage(currentSrc);
        }

        // Preload surrounding images
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

            // Start preloading around current index
            preloadAroundIndex(currentIndex);
        }
    }, [isOpen, currentIndex, images.length, preloadAroundIndex]);

    const downloadCompressed = useCallback(async () => {
        try {
            const fileResp = await fetch(images[currentIndex].compressed_location);
            const blob = await fileResp.blob();

            // Use file-saver to force download
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
                    {/* Previous Arrow */}
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

                    {/* Next Arrow */}
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
                    className="p-3 bg-gray-900 text-white rounded-full hover:bg-blue-500 transition-colors duration-200 shadow-lg"
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
                    className="p-3 bg-gray-900 text-white rounded-full transition-colors duration-200 shadow-lg hover:bg-red-500"
                    title={currentImage?.highlight ? "Remove from favorites" : "Add to favorites"}
                >
                    <HeartIcon fill={currentImage?.highlight ? "white" : ""} size={20} />
                </button>

                {/* Add to Album icon */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (!showAlbums && currentImage?.id) {
                            // Fetch album IDs when opening the panel
                            fetchImageAlbums(currentImage.id);
                        }
                        setShowAlbums(!showAlbums);
                        setShowImageInfo(false);
                        resetHideTimer();
                    }}
                    className="p-3 bg-gray-900 text-white rounded-full hover:bg-purple-500 transition-colors duration-200 shadow-lg"
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
                        className="p-3 bg-gray-900 text-white rounded-full hover:bg-green-500 transition-colors duration-200 shadow-lg"
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
                            className="p-3 bg-gray-900 text-white rounded-full hover:bg-red-500 transition-colors duration-200 shadow-lg"
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
                        className="p-3 bg-gray-900 text-white rounded-full hover:bg-green-500 transition-colors duration-200 shadow-lg"
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
                                            <span className="text-xs text-gray-300">
                                                {album.total_images} photos
                                            </span>
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