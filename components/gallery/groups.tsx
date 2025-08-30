"use client";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import ImageGallery, { ReactImageGalleryItem } from "react-image-gallery";
import "react-image-gallery/styles/css/image-gallery.css";
import { ImageItem } from "@/types/ImageItem";
import GalleryGrid from "@/components/gallery/grid";
import InfoToast from "@/components/infoToast";
import Switch from "./switch";
import { Info, Trash2, Download, X, HeartIcon } from "lucide-react";

type ApiResponse = {
    images: ImageItem[];
    hasMore: boolean;
    hotImages: number;
};

export default function Gallery({ isPublic }: { isPublic: boolean }) {
    const searchParams = useSearchParams();
    const groupId = searchParams.get("groupId");
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [images, setImages] = useState<ImageItem[]>([]);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const LOAD_MORE_AHEAD = 10;
    const [sorting, setSorting] = useState<string>("date_taken");
    const loaderRef = useRef<HTMLDivElement | null>(null);
    const [hotImages, setHotImages] = useState(0);
    const [isForbidden, setIsForbidden] = useState<boolean>(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    // Add ref to track current groupId to prevent stale closures
    const currentGroupIdRef = useRef<string | null>(null);
    const currentSortingRef = useRef<string>("date_taken");
    const [mode, setMode] = useState("gallery")
    // New states for carousel icons
    const [showIcons, setShowIcons] = useState(true);
    const [showImageInfo, setShowImageInfo] = useState(false);
    const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

    // ✅ Use refs for cache + preloaded images (no re-render)
    const loadedImagesRef = useRef<Set<string>>(new Set());
    const cache = useRef<{
        pages: Map<string, string[]>;
        allImages: Map<string, string[]>;
        loadingStates: Map<string, boolean>;
    }>({
        pages: new Map(),
        allImages: new Map(),
        loadingStates: new Map(),
    });

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

    // ✅ Convert bytes to MB
    const formatFileSize = (bytes: number): string => {
        const mb = bytes / (1024 * 1024);
        return `${mb.toFixed(2)} MB`;
    };

    // ✅ Format date
    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // ✅ Preload image without re-render
    const preloadImage = useCallback((src: string) => {
        if (loadedImagesRef.current.has(src)) return Promise.resolve();
        return new Promise<void>((resolve, reject) => {
            const img = new window.Image();
            img.onload = () => {
                loadedImagesRef.current.add(src);
                resolve();
            };
            img.onerror = reject;
            img.src = src;
        });
    }, []);

    // ✅ Reset state function
    const resetState = useCallback(() => {
        setImages([]);
        setPage(0);
        setHasMore(true);
        setLoading(false);
        setHotImages(0);
        loadedImagesRef.current.clear();
        cache.current.pages.clear();
        cache.current.allImages.clear();
        cache.current.loadingStates.clear();
    }, []);

    // ✅ Fetch images with better state management
    const fetchImages = useCallback(async (currentPage?: number, resetImages?: boolean) => {
        const actualGroupId = currentGroupIdRef.current;
        const actualSorting = currentSortingRef.current;
        const actualPage = currentPage !== undefined ? currentPage : page;

        if (!actualGroupId || loading) return;

        // Don't fetch if we don't have more pages (unless it's the first page)
        if (!hasMore && actualPage > 0) return;

        const requestKey = `${actualGroupId}-${actualPage}`;

        setLoading(true);
        try {
            const res = await fetch(`/api/groups/images?groupId=${actualGroupId}&page=${actualPage}&sorting=${actualSorting}&mode=${mode}`);
            const data: ApiResponse = await res.json();
            if (res.status === 403) {
                setIsForbidden(true);
                return;
            }

            if (res.status != 200) {
                return;
            }
            if (resetImages || actualPage === 0) {
                setImages(data.images);
            } else {
                setImages((prev) => [...prev, ...data.images]);
            }

            setHasMore(data.hasMore);
            setPage(actualPage + 1);
            setHotImages(data.hotImages);

            // Preload images
            data.images.forEach((image) => preloadImage(image.compressed_location));
        } catch (err) {
            console.error("Failed to fetch images", err);
        } finally {
            setLoading(false);
            cache.current.loadingStates.set(requestKey, false);
        }
    }, [page, hasMore, loading, preloadImage, mode]);

    // ✅ Effect to handle groupId changes
    useEffect(() => {
        if (!groupId) return;

        // Only reset and fetch if groupId actually changed
        if (currentGroupIdRef.current !== groupId) {
            console.log("GroupId changed from", currentGroupIdRef.current, "to", groupId);
            currentGroupIdRef.current = groupId;
            resetState();
            // Use setTimeout to ensure state is reset before fetching
            setTimeout(() => {
                fetchImages(0, true);
            }, 0);
        }
    }, [groupId, resetState]);

    // ✅ Effect to handle sorting changes
    useEffect(() => {
        if (!groupId) return;

        // Only reset and fetch if sorting actually changed
        if (currentSortingRef.current !== sorting) {
            console.log("Sorting changed from", currentSortingRef.current, "to", sorting);
            currentSortingRef.current = sorting;
            resetState();
            // Use setTimeout to ensure state is reset before fetching
            setTimeout(() => {
                fetchImages(0, true);
            }, 0);
        }

        if (currentSortingRef.current !== sorting) {
            console.log("Sorting changed from", currentSortingRef.current, "to", sorting);
            currentSortingRef.current = sorting;
            resetState();
            // Use setTimeout to ensure state is reset before fetching
            setTimeout(() => {
                fetchImages(0, true);
            }, 0);
        }
    }, [sorting, groupId, resetState]);

    useEffect(() => {
        resetState();
        fetchImages(0, true)
    }, [mode, resetState, groupId])

    // Helper function to download from Firebase URL with CORS handling
    const downloadFromFirebaseUrl = useCallback(async (url: string, filename: string) => {
        try {
            // Try to use a simple anchor tag approach first
            const link = document.createElement("a");
            link.href = url;
            link.download = filename;
            link.target = "_blank";
            // Add to DOM temporarily
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error("Failed to download image:", err);
            alert("Failed to download image. The image will open in a new tab instead.");
            window.open(url, '_blank');
        }
    }, []);

    // Download compressed image via backend proxy
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

    // ✅ Infinite scroll observer - separate from main fetch logic
    useEffect(() => {
        let timeoutId: NodeJS.Timeout;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !loading && hasMore && images.length > 0) {
                    clearTimeout(timeoutId);
                    timeoutId = setTimeout(() => fetchImages(), 100);
                }
            },
            { threshold: 0.1 }
        );

        if (loaderRef.current) observer.observe(loaderRef.current);
        return () => {
            clearTimeout(timeoutId);
            if (loaderRef.current) observer.unobserve(loaderRef.current);
            observer.disconnect();
        };
    }, [fetchImages, loading, hasMore, images.length]);

    // ✅ Close on Esc and setup auto-hide
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

    // ✅ Click handler to open carousel
    const handleImageClick = useCallback(
        (idx: number) => {
            setCurrentIndex(idx);
            setIsOpen(true);
            setShowImageInfo(false);
            const indicesToPreload = [
                idx - 10, idx - 9, idx - 8, idx - 7, idx - 6,
                idx - 5, idx - 4, idx - 3, idx - 2, idx - 1,
                idx, idx + 1, idx + 2, idx + 3, idx + 4,
                idx + 5, idx + 6, idx + 7, idx + 8, idx + 9, idx + 10
            ].filter((i) => i >= 0 && i < images.length);

            indicesToPreload.forEach((i) => preloadImage(images[i].compressed_location));

            if (images.length - idx <= LOAD_MORE_AHEAD && hasMore && !loading) {
                fetchImages();
            }
        },
        [images, hasMore, loading, preloadImage, fetchImages]
    );



    // ✅ Stable gallery items
    const galleryItems: ReactImageGalleryItem[] = useMemo(
        () =>
            images.map((image) => ({
                original: image.compressed_location,
                thumbnail: image.thumbnail_location,
                loading: "lazy" as const,
                originalAlt: "Gallery image",
                thumbnailAlt: "Gallery thumbnail",
            })),
        [images]
    );

    const currentImage = images[currentIndex];
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
                prevImages.map(img =>
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

    if (isForbidden) {
        return <InfoToast loading={false} message="Looks like you don't have access to this group. Contact group admin to get access." />;
    }

    if (hotImages === 0 && images.length === 0 && !loading) {
        return (
            <InfoToast loading={false} message="No Images in this group" />
        );
    }

    if (!groupId) {
        return (
            <InfoToast loading={false} message="No groupId provided in URL" />
        )
    };


    return (
        <>
            {/* Grid */}
            {hotImages > 0 &&
                <InfoToast loading={true} message={
                    `Your recent uploaded ${hotImages} images are being processed and will be available shortly...`
                } />
            }
            {/* {
                isPublic &&
                <Switch groupId={groupId} />
            } */}
            <GalleryGrid
                handleImageClick={handleImageClick}
                images={images}
                sorting={sorting}
                setSorting={setSorting}
                groupId={groupId}
                isPerson={false}
                personId={null}
                isPublic={isPublic}
                setMode={setMode}
                mode={mode}
                loading={loading}
            />

            {loading && (
                <InfoToast loading={true} message="Loading Images" />
            )}

            {!hasMore && images.length > 0 && (
                <p className="text-center py-4 text-gray-500">No more images to load</p>
            )}

            {/* Infinite scroll trigger */}
            <div ref={loaderRef} className="h-10"></div>

            {/* Fullscreen carousel */}
            {isOpen && (
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
                                    <span className="text-gray-300">{formatDate(currentImage.date_taken)}</span>
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
                                    setCurrentIndex(index);
                                    setShowImageInfo(false); // Hide info when sliding
                                    resetHideTimer(); // Reset timer on slide
                                    const indicesToPreload = [index - 1, index, index + 1].filter(
                                        (i) => i >= 0 && i < images.length
                                    );
                                    if (images.length - index <= LOAD_MORE_AHEAD && hasMore && !loading) {
                                        fetchImages();
                                    }
                                    indicesToPreload.forEach((i) => preloadImage(images[i].compressed_location));
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
            )}
        </>
    );
}