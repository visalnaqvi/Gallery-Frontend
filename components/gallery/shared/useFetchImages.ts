import { useCallback, useRef } from "react";
import { ApiResponse, FetchImageParams, ImageItem } from "./types";

interface UseFetchImagesProps {
    setImages: (fn: ImageItem[] | ((prev: ImageItem[]) => ImageItem[])) => void;
    setHasMore: (hasMore: boolean) => void;
    setPage: (page: number) => void;
    setLoading: (loading: boolean) => void;
    setHotImages: (hot: number) => void;
    setIsForbidden: (forbidden: boolean) => void;
    preloadImage: (src: string) => void;
    page: number;
    hasMore: boolean;
    loading: boolean;
}

export function useFetchImages({
    setImages,
    setHasMore,
    setPage,
    setLoading,
    setHotImages,
    setIsForbidden,
    preloadImage,
    page,
    hasMore,
    loading,
}: UseFetchImagesProps) {
    // Refs to track current values and prevent stale closures
    const currentGroupIdRef = useRef<string | null>(null);
    const currentPersonIdRef = useRef<string | null>(null);
    const currentSortingRef = useRef<string>("date_taken");
    const currentModeRef = useRef<string>("gallery");

    const fetchImages = useCallback(async (params: {
        groupId: string;
        personId?: string;
        sorting: string;
        mode?: string;
        currentPage?: number;
        resetImages?: boolean;
    }) => {
        const { groupId, personId, sorting, mode, currentPage, resetImages } = params;
        const actualPage = currentPage !== undefined ? currentPage : page;

        if (!groupId || loading) return;

        // Don't fetch if we don't have more pages (unless it's the first page)
        if (!hasMore && actualPage > 0) return;

        setLoading(true);
        try {
            let apiUrl: string;
            if (personId) {
                // Person-specific endpoint
                apiUrl = `/api/persons/getPersonImages?groupId=${groupId}&personId=${personId}&page=${actualPage}&sorting=${sorting}`;
            } else {
                // Group-wide endpoint
                apiUrl = `/api/groups/images?groupId=${groupId}&page=${actualPage}&sorting=${sorting}&mode=${mode || 'gallery'}`;
            }

            const res = await fetch(apiUrl);
            
            if (res.status === 403) {
                setIsForbidden(true);
                return;
            }

            if (res.status !== 200) {
                return;
            }

            const data: ApiResponse = await res.json();

            if (resetImages || actualPage === 0) {
                setImages(data.images);
            } else {
                setImages((prev) => [...prev, ...data.images]);
            }

            setHasMore(data.hasMore);
            setPage(actualPage + 1);
            
            // Set hotImages only for group endpoint
            if (!personId && data.hotImages !== undefined) {
                setHotImages(data.hotImages);
            }

            // Preload images
            data.images.forEach((image) => preloadImage(image.compressed_location));
        } catch (err) {
            console.error("Failed to fetch images", err);
        } finally {
            setLoading(false);
        }
    }, [page, hasMore, loading, preloadImage, setImages, setHasMore, setPage, setLoading, setHotImages, setIsForbidden]);

    // Update refs helper
    const updateRefs = useCallback((params: {
        groupId?: string;
        personId?: string;
        sorting?: string;
        mode?: string;
    }) => {
        if (params.groupId !== undefined) currentGroupIdRef.current = params.groupId;
        if (params.personId !== undefined) currentPersonIdRef.current = params.personId;
        if (params.sorting !== undefined) currentSortingRef.current = params.sorting;
        if (params.mode !== undefined) currentModeRef.current = params.mode;
    }, []);

    return {
        fetchImages,
        updateRefs,
        currentGroupIdRef,
        currentPersonIdRef,
        currentSortingRef,
        currentModeRef
    };
}