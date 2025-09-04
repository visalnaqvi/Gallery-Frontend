// hooks/useGallery.ts
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { ImageItem } from "@/types/ImageItem";

type Album = {
    id: number;
    name: string;
    total_images: number;
    group_id: number;
};

type ApiResponse = {
    images: ImageItem[];
    hasMore: boolean;
    hotImages?: number;
};

type GalleryMode = "gallery" | "person" | "album";

interface UseGalleryProps {
    groupId: string | null;
    personId?: string | null;
    albumId?: string | null;
    mode: GalleryMode;
    sorting: string;
}

interface UseGalleryReturn {
    // State
    images: ImageItem[];
    setImages: React.Dispatch<React.SetStateAction<ImageItem[]>>;
    page: number;
    hasMore: boolean;
    loading: boolean;
    hotImages: number;
    isForbidden: boolean;
    albums: Album[];
    
    // Gallery state
    isOpen: boolean;
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    currentIndex: number;
    setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
    
    // Functions
    fetchImages: (currentPage?: number, resetImages?: boolean) => Promise<void>;
    handleImageClick: (idx: number) => Promise<void>;
    resetState: () => void;
    
    // Refs
    loaderRef: React.RefObject<HTMLDivElement | null>;
    
    // Constants
    LOAD_MORE_AHEAD: number;
}

export default function useGallery({
    groupId,
    personId,
    albumId,
    mode,
    sorting
}: UseGalleryProps): UseGalleryReturn {
    // States
    const [images, setImages] = useState<ImageItem[]>([]);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [hotImages, setHotImages] = useState(0);
    const [isForbidden, setIsForbidden] = useState<boolean>(false);
    const [albums, setAlbums] = useState<Album[]>([]);
    const [albumLoading , setAlbumLoading] = useState(false)
    const [imageLoading , setImageLoading] = useState(false)
    // Gallery states
    const [isOpen, setIsOpen] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    
    // Constants
    const LOAD_MORE_AHEAD = 10;
    
    // Refs
    const loaderRef = useRef<HTMLDivElement | null>(null);
    const currentGroupIdRef = useRef<string | null>(null);
    const currentPersonIdRef = useRef<string | null | undefined>(null);
    const currentAlbumIdRef = useRef<string | null | undefined>(null);
    const currentSortingRef = useRef<string>("date_taken");
    
    // Preloading system
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
    useEffect(()=>{
        if(!albumLoading && !imageLoading){
            setLoading(false)
        }
    },[albumLoading , imageLoading])
    // Fetch albums
    const fetchAlbums = useCallback(async () => {
        if (!groupId) return;
        setLoading(true);
        setAlbumLoading(true)
        try {
            const res = await fetch(`/api/albums?groupId=${groupId}`);
            if (res.status === 403) {
                setIsForbidden(true);
                return;
            }
            if (!res.ok) return;

            const data = await res.json();
            setAlbums(data);
        } catch (err) {
            console.error("Failed to fetch albums:", err);
        } finally {
            setAlbumLoading(false);
        }
    }, [groupId]);

    // Build API URL based on mode
    const buildApiUrl = useCallback((actualPage: number, actualSorting: string) => {
        const actualGroupId = currentGroupIdRef.current;
        const actualPersonId = currentPersonIdRef.current;
        const actualAlbumId = currentAlbumIdRef.current;

        switch (mode) {
            case "person":
                return `/api/persons/getPersonImages?groupId=${actualGroupId}&personId=${actualPersonId}&page=${actualPage}&sorting=${actualSorting}`;
            case "album":
                return `/api/albums/getAlbumImages?groupId=${actualGroupId}&albumId=${actualAlbumId}&page=${actualPage}&sorting=${actualSorting}`;
            case "gallery":
            default:
                return `/api/groups/images?groupId=${actualGroupId}&page=${actualPage}&sorting=${actualSorting}&mode=${mode}`;
        }
    }, [mode]);

    // Fetch images with better state management
    const fetchImages = useCallback(async (currentPage?: number, resetImages?: boolean) => {
        const actualGroupId = currentGroupIdRef.current;
        const actualPersonId = currentPersonIdRef.current;
        const actualAlbumId = currentAlbumIdRef.current;
        const actualSorting = currentSortingRef.current;
        const actualPage = currentPage !== undefined ? currentPage : page;

        if (!actualGroupId || loading) return;
        
        // Check required IDs based on mode
        if (mode === "person" && !actualPersonId) return;
        if (mode === "album" && !actualAlbumId) return;

        // Don't fetch if we don't have more pages (unless it's the first page)
        if (!hasMore && actualPage > 0) return;

        setLoading(true);
        setImageLoading(true)
        try {
            const apiUrl = buildApiUrl(actualPage, actualSorting);
            const res = await fetch(apiUrl);
            const data: ApiResponse = await res.json();

            if (res.status === 403) {
                setIsForbidden(true);
                return;
            }

            if (res.status !== 200) {
                return;
            }

            if (resetImages || actualPage === 0) {
                setImages(data.images);
            } else {
                setImages((prev) => [...prev, ...data.images]);
            }

            setHasMore(data.hasMore);
            setPage(actualPage + 1);
            
            // Set hotImages only for gallery mode
            if (mode === "gallery" && data.hotImages !== undefined) {
                setHotImages(data.hotImages);
            }

        } catch (err) {
            console.error("Failed to fetch images", err);
        } finally {
            setImageLoading(false);
        }
    }, [page, hasMore, loading, mode, buildApiUrl]);

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

    // Effect to handle parameter changes
    useEffect(() => {
        if (!groupId) return;

        let shouldReset = false;
        
        // Check if any relevant parameter changed
        if (currentGroupIdRef.current !== groupId) {
            console.log("GroupId changed from", currentGroupIdRef.current, "to", groupId);
            currentGroupIdRef.current = groupId;
            shouldReset = true;
        }
        
        if (mode === "person" && currentPersonIdRef.current !== personId) {
            console.log("PersonId changed from", currentPersonIdRef.current, "to", personId);
            currentPersonIdRef.current = personId;
            shouldReset = true;
        }
        
        if (mode === "album" && currentAlbumIdRef.current !== albumId) {
            console.log("AlbumId changed from", currentAlbumIdRef.current, "to", albumId);
            currentAlbumIdRef.current = albumId;
            shouldReset = true;
        }
        
        if (currentSortingRef.current !== sorting) {
            console.log("Sorting changed from", currentSortingRef.current, "to", sorting);
            currentSortingRef.current = sorting;
            shouldReset = true;
        }

        if (shouldReset) {
            resetState();
            // Use setTimeout to ensure state is reset before fetching
            setTimeout(() => {
                fetchImages(0, true);
            }, 0);
        }
    }, [groupId, personId, albumId, sorting, mode, resetState, fetchImages]);

    // Fetch albums on mount
    useEffect(() => {
        fetchAlbums();
    }, [fetchAlbums]);

    // Infinite scroll observer
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

    return {
        // State
        images,
        setImages,
        page,
        hasMore,
        loading,
        hotImages,
        isForbidden,
        albums,
        
        // Gallery state
        isOpen,
        setIsOpen,
        currentIndex,
        setCurrentIndex,
        
        // Functions
        fetchImages,
        handleImageClick,
        resetState,
        
        // Refs
        loaderRef,
        
        // Constants
        LOAD_MORE_AHEAD
    };
}