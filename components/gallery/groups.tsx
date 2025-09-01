"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import "react-image-gallery/styles/css/image-gallery.css";
import { ImageItem } from "@/types/ImageItem";
import GalleryGrid from "@/components/gallery/grid";
import InfoToast from "@/components/infoToast";
import ImageGalleryComponent from "./components/ImageGallery";

type ApiResponse = {
    images: ImageItem[];
    hasMore: boolean;
    hotImages: number;
};

export default function GalleryGroups({ isPublic }: { isPublic: boolean }) {
    const searchParams = useSearchParams();
    const groupId = searchParams.get("groupId");
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
    const [mode, setMode] = useState("gallery");

    // Add refs to track current values to prevent stale closures
    const currentGroupIdRef = useRef<string | null>(null);
    const currentSortingRef = useRef<string>("date_taken");

    // Simplified preloading system
    const preloadedImagesRef = useRef<Set<string>>(new Set());
    const preloadingRef = useRef<Set<string>>(new Set());

    // Simple preload function
    const preloadImage = useCallback((src: string): Promise<void> => {
        if (preloadedImagesRef.current.has(src) || preloadingRef.current.has(src)) {
            return Promise.resolve();
        }

        preloadingRef.current.add(src);

        return new Promise((resolve) => {
            const img = new window.Image();
            img.onload = () => {
                preloadedImagesRef.current.add(src);
                preloadingRef.current.delete(src);
                resolve();
            };
            img.onerror = () => {
                preloadingRef.current.delete(src);
                resolve(); // Don't reject to avoid breaking Promise.all
            };
            img.src = src;
        });
    }, []);

    // Reset state function
    const resetState = useCallback(() => {
        setImages([]);
        setPage(0);
        setHasMore(true);
        setLoading(false);
        setHotImages(0);
        preloadedImagesRef.current.clear();
        preloadingRef.current.clear();
    }, []);

    // Fetch images with better state management
    const fetchImages = useCallback(async (currentPage?: number, resetImages?: boolean) => {
        const actualGroupId = currentGroupIdRef.current;
        const actualSorting = currentSortingRef.current;
        const actualPage = currentPage !== undefined ? currentPage : page;

        if (!actualGroupId || loading) return;

        // Don't fetch if we don't have more pages (unless it's the first page)
        if (!hasMore && actualPage > 0) return;

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

        } catch (err) {
            console.error("Failed to fetch images", err);
        } finally {
            setLoading(false);
        }
    }, [page, hasMore, loading, mode]);

    // Effect to handle groupId changes
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
    }, [groupId, resetState, fetchImages]);

    // Effect to handle sorting changes
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
    }, [sorting, groupId, resetState, fetchImages]);

    // Effect to handle mode changes
    useEffect(() => {
        if (!groupId) return;

        resetState();
        fetchImages(0, true);
    }, [mode, resetState, groupId]);

    // Infinite scroll observer - separate from main fetch logic
    useEffect(() => {
        if (isOpen) return; // don't observe if carousel is open

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
    }, [fetchImages, loading, hasMore, images.length, isOpen]);

    // Enhanced click handler with improved preloading
    const handleImageClick = useCallback(async (idx: number) => {
        console.log("Image clicked, opening gallery at index:", idx);
        setCurrentIndex(idx);
        setIsOpen(true);

        // Preload current image immediately
        const currentSrc = images[idx]?.compressed_location;
        if (currentSrc) {
            await preloadImage(currentSrc);
        }

        // Preload surrounding images in background
        const INITIAL_PRELOAD_RANGE = 10;
        const start = Math.max(0, idx - INITIAL_PRELOAD_RANGE);
        const end = Math.min(images.length - 1, idx + INITIAL_PRELOAD_RANGE);

        const imagesToPreload = [];
        for (let i = start; i <= end; i++) {
            if (i !== idx) { // Skip current image as it's already preloaded
                const src = images[i]?.compressed_location;
                if (src && !preloadedImagesRef.current.has(src)) {
                    imagesToPreload.push(src);
                }
            }
        }

        // Preload in batches to avoid overwhelming the browser
        const batchSize = 3;
        for (let i = 0; i < imagesToPreload.length; i += batchSize) {
            const batch = imagesToPreload.slice(i, i + batchSize);
            Promise.all(batch.map(src => preloadImage(src)));

            // Small delay between batches
            if (i + batchSize < imagesToPreload.length) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }

        // Fetch more if close to end
        if (images.length - idx <= LOAD_MORE_AHEAD && hasMore && !loading) {
            fetchImages();
        }
    }, [images, hasMore, loading, preloadImage, fetchImages, LOAD_MORE_AHEAD]);

    if (isForbidden) {
        return <InfoToast loading={false} message="Looks like you don't have access to this group. Contact group admin to get access." />;
    }

    if (!groupId) {
        return (
            <InfoToast loading={false} message="No groupId provided in URL" />
        );
    }

    return (
        <>
            {/* Hot Images Toast */}
            {hotImages > 0 && (
                <InfoToast
                    loading={true}
                    message={`Your recent uploaded ${hotImages} images are being processed and will be available shortly...`}
                />
            )}

            {/* Gallery Grid */}
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

            {/* Loading indicator */}
            {loading && (
                <InfoToast loading={true} message="Loading Images" />
            )}

            {/* End of images indicator */}
            {!hasMore && images.length > 0 && (
                <p className="text-center py-4 text-gray-500">No more images to load</p>
            )}

            {/* Infinite scroll trigger */}
            <div ref={loaderRef} className="h-10"></div>

            {/* Fullscreen carousel */}
            {isOpen && (
                <ImageGalleryComponent
                    images={images}
                    setCurrentIndex={setCurrentIndex}
                    setImages={setImages}
                    setIsOpen={setIsOpen}
                    currentIndex={currentIndex}
                    fetchImages={fetchImages}
                    LOAD_MORE_AHEAD={LOAD_MORE_AHEAD}
                    hasMore={hasMore}
                    loading={loading}
                    isOpen={isOpen}
                    mode={mode}
                    resetState={resetState}
                />
            )}
        </>
    );
}