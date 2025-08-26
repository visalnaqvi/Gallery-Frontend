"use client";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import ImageGallery, { ReactImageGalleryItem } from "react-image-gallery";
import "react-image-gallery/styles/css/image-gallery.css";
import { ImageItem } from "@/types/ImageItem";
import GalleryGrid from "@/components/gallery/grid";
import { useUser } from '@/context/UserContext';
import { GridLoader } from "react-spinners";
import InfoToast from "@/components/infoToast";

type ApiResponse = {
    images: ImageItem[];
    hasMore: boolean;
    hotImages: number;
};

export default function Gallery() {
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
    const { setGroupId } = useUser();

    // Add ref to track current groupId to prevent stale closures
    const currentGroupIdRef = useRef<string | null>(null);
    const currentSortingRef = useRef<string>("date_taken");

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
            const res = await fetch(`/api/groups/images?groupId=${actualGroupId}&page=${actualPage}&sorting=${actualSorting}`);
            const data: ApiResponse = await res.json();

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
    }, [page, hasMore, loading, preloadImage]);

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
    }, [sorting, groupId, resetState]);

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

    // ✅ Close on Esc
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsOpen(false);
        };
        if (isOpen) {
            document.addEventListener("keydown", handleEsc);
            document.body.style.overflow = "hidden";
        }
        return () => {
            document.removeEventListener("keydown", handleEsc);
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    // ✅ Click handler to open carousel
    const handleImageClick = useCallback(
        (idx: number) => {
            setCurrentIndex(idx);
            setIsOpen(true);
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

    if (!groupId) return <p>No groupId provided in URL</p>;

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

    if (hotImages === 0 && images.length === 0 && !loading) {
        return (
            <InfoToast loading={false} message="No Images in this group" />
        );
    }

    return (
        <>
            {/* Grid */}
            {hotImages > 0 &&
                <InfoToast loading={true} message={
                    "Your recent uploaded {hotImages} images are being processed and will be available shortly..."
                } />
            }

            <GalleryGrid
                handleImageClick={handleImageClick}
                images={images}
                sorting={sorting}
                setSorting={setSorting}
                groupId={groupId}
                isPerson={false}
                personId={null}
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
                <div className="fixed inset-0 bg-black z-50">
                    <button
                        onClick={() => setIsOpen(false)}
                        className="absolute top-4 right-4 z-50 text-white text-3xl hover:text-gray-300 transition-colors duration-200 bg-black bg-opacity-50 rounded-full w-12 h-12 flex items-center justify-center"
                        aria-label="Close gallery"
                    >
                        ×
                    </button>

                    <div className="absolute top-4 left-4 z-50 text-white bg-black bg-opacity-50 px-3 py-1 rounded">
                        {currentIndex + 1} / {images.length}
                    </div>

                    {/* Download buttons positioned in bottom right */}
                    <div className="absolute bottom-4 right-4 z-50 flex flex-col gap-2">
                        <button
                            onClick={downloadCompressed}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors duration-200 shadow-lg"
                        >
                            Download Compressed
                        </button>
                        <button
                            onClick={downloadOriginal}
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 transition-colors duration-200 shadow-lg"
                        >
                            Download Original
                        </button>
                    </div>

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