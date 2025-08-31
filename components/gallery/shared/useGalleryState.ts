import { useState, useRef, useCallback } from "react";
import { ImageItem } from "./types";

export function useGalleryState() {
    const [images, setImages] = useState<ImageItem[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [sorting, setSorting] = useState<string>("date_taken");
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showIcons, setShowIcons] = useState(true);
    const [showImageInfo, setShowImageInfo] = useState(false);
    const [isForbidden, setIsForbidden] = useState<boolean>(false);
    const [hotImages, setHotImages] = useState(0);

    const loadedImagesRef = useRef<Set<string>>(new Set());
    const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Cache refs to prevent stale closures
    const cache = useRef<{
        pages: Map<string, string[]>;
        allImages: Map<string, string[]>;
        loadingStates: Map<string, boolean>;
    }>({
        pages: new Map(),
        allImages: new Map(),
        loadingStates: new Map(),
    });

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

    const resetState = useCallback(() => {
        setImages([]);
        setPage(0);
        setHasMore(true);
        setLoading(false);
        setHotImages(0);
        setIsForbidden(false);
        loadedImagesRef.current.clear();
        cache.current.pages.clear();
        cache.current.allImages.clear();
        cache.current.loadingStates.clear();
    }, []);

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

    const handleMouseMove = useCallback(() => {
        resetHideTimer();
    }, [resetHideTimer]);

    const handleImageClick = useCallback((idx: number, onLoadMore: () => void) => {
        setCurrentIndex(idx);
        setIsOpen(true);
        setShowImageInfo(false);

        // Preload surrounding images
        const indicesToPreload = [
            idx - 10, idx - 9, idx - 8, idx - 7, idx - 6,
            idx - 5, idx - 4, idx - 3, idx - 2, idx - 1,
            idx, idx + 1, idx + 2, idx + 3, idx + 4,
            idx + 5, idx + 6, idx + 7, idx + 8, idx + 9, idx + 10
        ].filter((i) => i >= 0 && i < images.length);

        indicesToPreload.forEach((i) => preloadImage(images[i].compressed_location));

        if (images.length - idx <= 50 && hasMore && !loading) {
            onLoadMore();
        }
    }, [images, hasMore, loading, preloadImage]);

    const handleHighlightUpdate = useCallback(async (imageId: string) => {
        const currentImage = images.find(img => img.id === imageId);
        if (!currentImage) return;

        try {
            const action = currentImage.highlight ? "remove" : "add";
            const res = await fetch(`/api/groups/images?imageId=${imageId}&action=${action}`, {
                method: "PATCH",
            });

            if (!res.ok) {
                const err = await res.json();
                console.error("Failed to update highlight:", err.error);
                alert("Failed to update highlight.");
                return;
            }

            setImages(prevImages =>
                prevImages.map(img =>
                    img.id === imageId
                        ? { ...img, highlight: !img.highlight }
                        : img
                )
            );
        } catch (err) {
            console.error("Error updating highlight:", err);
            alert("Something went wrong.");
        }
    }, [images]);

    const handleDeleteImage = useCallback(async (imageId: string) => {
        try {
            const res = await fetch(`/api/groups/images?imageId=${imageId}`, {
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
    }, []);

    const handleRestoreImage = useCallback(async (imageId: string) => {
        try {
            const res = await fetch(`/api/groups/images/restore?imageId=${imageId}`, {
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
    }, []);

    // Cleanup timer on unmount
    const cleanup = useCallback(() => {
        if (hideTimerRef.current) {
            clearTimeout(hideTimerRef.current);
        }
    }, []);

    return {
        // State
        images, setImages,
        currentIndex, setCurrentIndex,
        isOpen, setIsOpen,
        page, setPage,
        hasMore, setHasMore,
        loading, setLoading,
        sorting, setSorting,
        showDeleteConfirm, setShowDeleteConfirm,
        showIcons, setShowIcons,
        showImageInfo, setShowImageInfo,
        isForbidden, setIsForbidden,
        hotImages, setHotImages,

        // Utils
        preloadImage,
        resetState,
        handleImageClick,
        handleMouseMove,
        resetHideTimer,
        handleHighlightUpdate,
        handleDeleteImage,
        handleRestoreImage,
        cleanup,
        loadedImagesRef,
        hideTimerRef,
        cache
    };
}