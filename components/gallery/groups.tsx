"use client";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
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
    const LOAD_MORE_AHEAD = 50;
    const [sorting, setSorting] = useState<string>("date_taken");
    const loaderRef = useRef<HTMLDivElement | null>(null);
    const [hotImages, setHotImages] = useState(0);
    const [isForbidden, setIsForbidden] = useState<boolean>(false);
    // Add ref to track current groupId to prevent stale closures
    const currentGroupIdRef = useRef<string | null>(null);
    const currentSortingRef = useRef<string>("date_taken");
    const [mode, setMode] = useState("gallery")


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
            // data.images.forEach((image) => preloadImage(image.compressed_location));
        } catch (err) {
            console.error("Failed to fetch images", err);
        } finally {
            setLoading(false);
            cache.current.loadingStates.set(requestKey, false);
        }
    }, [page, hasMore, loading, mode]);

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





    if (isForbidden) {
        return <InfoToast loading={false} message="Looks like you don't have access to this group. Contact group admin to get access." />;
    }

    // if (hotImages === 0 && images.length === 0 && !loading) {
    //     return (
    //         <InfoToast loading={false} message="No Images in this group" />
    //     );
    // }

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
            {isOpen &&
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
                    preloadImage={preloadImage}
                />
            }
        </>
    );
}