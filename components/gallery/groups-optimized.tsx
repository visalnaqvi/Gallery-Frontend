"use client";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import "react-image-gallery/styles/css/image-gallery.css";
import { ImageItem } from "@/types/ImageItem";
import GalleryGrid from "@/components/gallery/grid";
import InfoToast from "@/components/infoToast";
import ImageGalleryComponent from "./components/ImageGallery-optimized";

type ApiResponse = {
    images: ImageItem[];
    hasMore: boolean;
    hotImages: number;
};

// LRU Cache for image preloading
class ImageCache {
    private cache = new Map<string, HTMLImageElement>();
    private maxSize = 100;
    private loadingPromises = new Map<string, Promise<void>>();

    async preload(src: string): Promise<void> {
        if (this.cache.has(src)) {
            // Move to end (most recently used)
            const img = this.cache.get(src)!;
            this.cache.delete(src);
            this.cache.set(src, img);
            return Promise.resolve();
        }

        if (this.loadingPromises.has(src)) {
            return this.loadingPromises.get(src)!;
        }

        const promise = new Promise<void>((resolve, reject) => {
            const img = new window.Image();
            img.onload = () => {
                this.addToCache(src, img);
                this.loadingPromises.delete(src);
                resolve();
            };
            img.onerror = () => {
                this.loadingPromises.delete(src);
                reject();
            };
            img.src = src;
        });

        this.loadingPromises.set(src, promise);
        return promise;
    }

    private addToCache(src: string, img: HTMLImageElement) {
        if (this.cache.size >= this.maxSize) {
            // Remove oldest item
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey as string);
        }
        this.cache.set(src, img);
    }

    has(src: string): boolean {
        return this.cache.has(src);
    }

    clear() {
        this.cache.clear();
        this.loadingPromises.clear();
    }
}

// Priority queue for preloading
class PreloadQueue {
    private queue: Array<{ src: string; priority: number }> = [];
    private processing = false;
    private maxConcurrent = 3;
    private activeLoads = 0;

    add(src: string, priority: number) {
        // Remove if already exists
        this.queue = this.queue.filter(item => item.src !== src);
        // Add with new priority
        this.queue.push({ src, priority });
        // Sort by priority (higher number = higher priority)
        this.queue.sort((a, b) => b.priority - a.priority);

        if (!this.processing) {
            this.process();
        }
    }

    private async process() {
        this.processing = true;

        while (this.queue.length > 0 && this.activeLoads < this.maxConcurrent) {
            const item = this.queue.shift();
            if (!item) break;

            this.activeLoads++;
            this.loadImage(item.src).finally(() => {
                this.activeLoads--;
                if (this.queue.length > 0) {
                    this.process();
                }
            });
        }

        if (this.activeLoads === 0) {
            this.processing = false;
        }
    }

    private async loadImage(src: string): Promise<void> {
        try {
            await imageCache.preload(src);
        } catch (error) {
            console.warn(`Failed to preload image: ${src}`, error);
        }
    }

    clear() {
        this.queue = [];
        this.processing = false;
        this.activeLoads = 0;
    }
}

const imageCache = new ImageCache();
const preloadQueue = new PreloadQueue();

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
    const [mode, setMode] = useState("gallery");

    // Refs for stable references
    const currentGroupIdRef = useRef<string | null>(null);
    const currentSortingRef = useRef<string>("date_taken");
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastPreloadIndexRef = useRef<number>(-1);

    // Network speed detection
    const [connectionSpeed, setConnectionSpeed] = useState<'slow' | 'fast'>('fast');

    useEffect(() => {
        // Detect connection speed
        const connection = (navigator as any).connection;
        if (connection) {
            const effectiveType = connection.effectiveType;
            setConnectionSpeed(effectiveType === '4g' ? 'fast' : 'slow');
        }
    }, []);

    // Smart preloading based on connection speed and carousel state
    const getPreloadStrategy = useCallback(() => {
        const baseStrategy = {
            immediate: 10,  // ±2-3 images
            secondary: 15,  // ±5-7 images  
            tertiary: 20, // ±10-15 images
        };

        return baseStrategy;
    }, [connectionSpeed]);

    // Optimized preloading function
    const preloadImages = useCallback((centerIndex: number, immediate = false) => {
        if (centerIndex === lastPreloadIndexRef.current && !immediate) return;
        lastPreloadIndexRef.current = centerIndex;

        const strategy = getPreloadStrategy();

        // Clear existing queue for new preload session
        if (immediate) {
            preloadQueue.clear();
        }

        // Immediate priority (highest)
        for (let i = Math.max(0, centerIndex - strategy.immediate);
            i <= Math.min(images.length - 1, centerIndex + strategy.immediate); i++) {
            if (images[i]) {
                preloadQueue.add(images[i].compressed_location, 100);
            }
        }

        // Secondary priority (medium)
        for (let i = Math.max(0, centerIndex - strategy.secondary);
            i <= Math.min(images.length - 1, centerIndex + strategy.secondary); i++) {
            if (images[i] && Math.abs(i - centerIndex) > strategy.immediate) {
                preloadQueue.add(images[i].compressed_location, 50);
            }
        }

        // Tertiary priority (low) - only if fast connection
        if (connectionSpeed === 'fast') {
            for (let i = Math.max(0, centerIndex - strategy.tertiary);
                i <= Math.min(images.length - 1, centerIndex + strategy.tertiary); i++) {
                if (images[i] && Math.abs(i - centerIndex) > strategy.secondary) {
                    preloadQueue.add(images[i].compressed_location, 10);
                }
            }
        }
    }, [images, getPreloadStrategy, connectionSpeed]);

    // Predictive preloading on hover
    const handleImageHover = useCallback((index: number) => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }

        hoverTimeoutRef.current = setTimeout(() => {
            // Preload this image and immediate neighbors
            const strategy = getPreloadStrategy();
            for (let i = Math.max(0, index - strategy.immediate);
                i <= Math.min(images.length - 1, index + strategy.immediate); i++) {
                if (images[i]) {
                    preloadQueue.add(images[i].compressed_location, 75);
                }
            }
        }, 300); // 300ms hover delay
    }, [images, getPreloadStrategy]);

    const handleImageHoverEnd = useCallback(() => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }
    }, []);

    // Reset state function
    const resetState = useCallback(() => {
        setImages([]);
        setPage(0);
        setHasMore(true);
        setLoading(false);
        setHotImages(0);
        imageCache.clear();
        preloadQueue.clear();
        lastPreloadIndexRef.current = -1;
    }, []);

    // Fetch images with better state management
    const fetchImages = useCallback(async (currentPage?: number, resetImages?: boolean) => {
        const actualGroupId = currentGroupIdRef.current;
        const actualSorting = currentSortingRef.current;
        const actualPage = currentPage !== undefined ? currentPage : page;

        if (!actualGroupId || loading) return;
        if (!hasMore && actualPage > 0) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/groups/images?groupId=${actualGroupId}&page=${actualPage}&sorting=${actualSorting}&mode=${mode}`);
            const data: ApiResponse = await res.json();

            if (res.status === 403) {
                setIsForbidden(true);
                return;
            }

            if (res.status !== 200) return;

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

        if (currentGroupIdRef.current !== groupId) {
            console.log("GroupId changed from", currentGroupIdRef.current, "to", groupId);
            currentGroupIdRef.current = groupId;
            resetState();
            setTimeout(() => {
                fetchImages(0, true);
            }, 0);
        }
    }, [groupId, resetState]);

    // Effect to handle sorting changes
    useEffect(() => {
        if (!groupId) return;

        if (currentSortingRef.current !== sorting) {
            console.log("Sorting changed from", currentSortingRef.current, "to", sorting);
            currentSortingRef.current = sorting;
            resetState();
            setTimeout(() => {
                fetchImages(0, true);
            }, 0);
        }
    }, [sorting, groupId, resetState]);

    // Effect to handle mode changes
    useEffect(() => {
        resetState();
        fetchImages(0, true);
    }, [mode, resetState, groupId]);

    // Infinite scroll observer
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

    // Optimized click handler with immediate preloading
    const handleImageClick = useCallback((idx: number) => {
        setCurrentIndex(idx);
        setIsOpen(true);

        // Immediate preload for smooth opening
        preloadImages(idx, true);

        // Load more data if needed
        if (images.length - idx <= LOAD_MORE_AHEAD && hasMore && !loading) {
            fetchImages();
        }
    }, [images, hasMore, loading, preloadImages, fetchImages]);

    // Preload visible grid images on scroll
    useEffect(() => {
        if (isOpen) return; // Don't preload grid images when carousel is open

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const img = entry.target as HTMLImageElement;
                        const src = img.dataset.src;
                        if (src) {
                            preloadQueue.add(src, 25); // Low priority for grid preloading
                        }
                    }
                });
            },
            { rootMargin: '50px' }
        );

        // Observe all grid images
        const gridImages = document.querySelectorAll('[data-src]');
        gridImages.forEach(img => observer.observe(img));

        return () => observer.disconnect();
    }, [isOpen, images]);

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
            {hotImages > 0 && (
                <InfoToast
                    loading={true}
                    message={`Your recent uploaded ${hotImages} images are being processed and will be available shortly...`}
                />
            )}

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

            <div ref={loaderRef} className="h-10"></div>

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
                    preloadImages={preloadImages}
                    connectionSpeed={connectionSpeed}
                />
            )}
        </>
    );
}