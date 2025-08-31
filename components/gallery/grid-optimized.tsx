import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ImageItem } from '@/types/ImageItem';
import { useImagePreloader } from './useImagePreloader';

type Props = {
    handleImageClick: (idx: number) => void;
    handleImageHover?: (idx: number) => void;
    handleImageHoverEnd?: () => void;
    images: ImageItem[];
    sorting: string;
    setSorting: (value: string) => void;
    groupId: string;
    isPerson: boolean;
    personId: string | null;
    isPublic: boolean;
    setMode: (mode: string) => void;
    mode: string;
    loading: boolean;
};

// Progressive image component for grid
const GridImage = ({
    image,
    index,
    onClick,
    onHover,
    onHoverEnd,
    isCached
}: {
    image: ImageItem;
    index: number;
    onClick: () => void;
    onHover: () => void;
    onHoverEnd: () => void;
    isCached: boolean;
}) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [thumbnailLoaded, setThumbnailLoaded] = useState(false);
    const imageRef = useRef<HTMLDivElement>(null);

    return (
        <div
            ref={imageRef}
            className="relative aspect-square cursor-pointer group overflow-hidden rounded-lg bg-gray-200"
            onClick={onClick}
            onMouseEnter={onHover}
            onMouseLeave={onHoverEnd}
            data-src={image.compressed_location}
        >
            {/* Thumbnail layer */}
            <Image
                src={image.thumbnail_location}
                alt={`Image ${index + 1}`}
                fill
                className={`object-cover transition-opacity duration-300 ${thumbnailLoaded ? 'opacity-100' : 'opacity-0'
                    }`}
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                onLoad={() => setThumbnailLoaded(true)}
                priority={index < 20} // Prioritize first 20 thumbnails
            />

            {/* High-quality overlay (only load when cached or on hover) */}
            {(isCached || imageLoaded) && (
                <Image
                    src={image.compressed_location}
                    alt={`Image ${index + 1} high quality`}
                    fill
                    className={`object-cover transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'
                        }`}
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                    onLoad={() => setImageLoaded(true)}
                />
            )}

            {/* Loading placeholder */}
            {!thumbnailLoaded && (
                <div className="absolute inset-0 bg-gray-300 animate-pulse flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="w-12 h-12 border-2 border-white rounded-full flex items-center justify-center">
                        <span className="text-2xl">+</span>
                    </div>
                </div>
            </div>

            {/* Highlight indicator */}
            {image.highlight && (
                <div className="absolute top-2 right-2 z-10">
                    <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">♥</span>
                    </div>
                </div>
            )}

            {/* Delete indicator */}
            {image.delete_at && (
                <div className="absolute top-2 left-2 z-10">
                    <div className="px-2 py-1 bg-red-600 text-white text-xs rounded">
                        Scheduled for deletion
                    </div>
                </div>
            )}
        </div>
    );
};

export default function GalleryGrid({
    handleImageClick,
    handleImageHover,
    handleImageHoverEnd,
    images,
    sorting,
    setSorting,
    groupId,
    isPerson,
    personId,
    isPublic,
    setMode,
    mode,
    loading
}: Props) {
    const {
        preloadGridImage,
        isCached,
        connectionSpeed,
        getCacheStats
    } = useImagePreloader();

    const gridRef = useRef<HTMLDivElement>(null);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [debugMode, setDebugMode] = useState(false);

    // Viewport-based preloading
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const index = parseInt(entry.target.getAttribute('data-index') || '0');
                        if (connectionSpeed !== 'slow') {
                            preloadGridImage(images, index);
                        }
                    }
                });
            },
            {
                rootMargin: '100px', // Start preloading 100px before image enters viewport
                threshold: 0.1
            }
        );

        const gridItems = gridRef.current?.querySelectorAll('[data-index]');
        gridItems?.forEach(item => observer.observe(item));

        return () => observer.disconnect();
    }, [images, preloadGridImage, connectionSpeed]);

    // Enhanced hover handler with debouncing
    const handleOptimizedHover = useCallback((index: number) => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }

        hoverTimeoutRef.current = setTimeout(() => {
            preloadGridImage(images, index);
            handleImageHover?.(index);
        }, 200); // 200ms debounce
    }, [images, preloadGridImage, handleImageHover]);

    const handleOptimizedHoverEnd = useCallback(() => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }
        handleImageHoverEnd?.();
    }, [handleImageHoverEnd]);

    // Keyboard shortcut for debug mode
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                setDebugMode(prev => !prev);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    if (images.length === 0 && !loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px] text-gray-500">
                <div className="text-center">
                    <div className="text-6xl mb-4">📸</div>
                    <p className="text-xl">No images in this group</p>
                    <p className="text-sm mt-2">Upload some images to get started</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative">
            {/* Debug panel */}
            {debugMode && (
                <div className="fixed top-4 right-4 z-40 bg-black bg-opacity-80 text-white p-4 rounded-lg text-sm">
                    <h4 className="font-semibold mb-2">Debug Info</h4>
                    <div>Connection: {connectionSpeed}</div>
                    <div>Cache size: {getCacheStats().cacheSize}</div>
                    <div>Queue size: {getCacheStats().queueSize}</div>
                    <div>Active loads: {getCacheStats().activeLoads}</div>
                </div>
            )}

            {/* Sorting controls */}
            <div className="mb-6 flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">Sort by:</label>
                    <select
                        value={sorting}
                        onChange={(e) => setSorting(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="date_taken">Date Taken</option>
                        <option value="uploaded_at">Upload Date</option>
                        <option value="filename">Filename</option>
                        <option value="size">File Size</option>
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">View:</label>
                    <select
                        value={mode}
                        onChange={(e) => setMode(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="gallery">Gallery</option>
                        <option value="timeline">Timeline</option>
                    </select>
                </div>

                {/* Connection indicator */}
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className={`w-2 h-2 rounded-full ${connectionSpeed === 'fast' ? 'bg-green-500' :
                        connectionSpeed === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}></div>
                    <span className="capitalize">{connectionSpeed} connection</span>
                </div>
            </div>

            {/* Image grid */}
            <div
                ref={gridRef}
                className={`grid gap-4 ${connectionSpeed === 'slow'
                    ? 'grid-cols-2 md:grid-cols-3'
                    : 'grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
                    }`}
            >
                {images.map((image, index) => (
                    <div key={image.id} data-index={index}>
                        <GridImage
                            image={image}
                            index={index}
                            onClick={() => handleImageClick(index)}
                            onHover={() => handleOptimizedHover(index)}
                            onHoverEnd={handleOptimizedHoverEnd}
                            isCached={isCached(image.compressed_location)}
                        />
                    </div>
                ))}
            </div>

            {/* Performance hint for slow connections */}
            {connectionSpeed === 'slow' && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                        📡 Slow connection detected. Using optimized loading for better performance.
                    </p>
                </div>
            )}
        </div>
    );
}