import { useCallback, useRef, useEffect } from 'react';

// Advanced image preloader with smart caching and priority management
export const useImagePreloader = () => {
    const cacheRef = useRef(new Map<string, HTMLImageElement>());
    const loadingRef = useRef(new Set<string>());
    const priorityQueueRef = useRef<Array<{ src: string; priority: number; timestamp: number }>>([]);
    const processingRef = useRef(false);
    const maxCacheSize = 100;
    const maxConcurrentLoads = 4;
    const activeLoadsRef = useRef(0);

    // Network speed detection
    const getConnectionSpeed = useCallback((): 'slow' | 'medium' | 'fast' => {
        const connection = (navigator as any).connection;
        if (!connection) return 'fast';
        
        const effectiveType = connection.effectiveType;
        switch (effectiveType) {
            case 'slow-2g':
            case '2g':
                return 'slow';
            case '3g':
                return 'medium';
            case '4g':
            default:
                return 'fast';
        }
    }, []);

    // Clean old cache entries (LRU)
    const cleanCache = useCallback(() => {
        if (cacheRef.current.size <= maxCacheSize) return;
        
        const entries = Array.from(cacheRef.current.entries());
        const toRemove = entries.slice(0, entries.length - maxCacheSize + 10);
        toRemove.forEach(([key]) => cacheRef.current.delete(key));
    }, []);

    // Process preload queue
    const processQueue = useCallback(async () => {
        if (processingRef.current || activeLoadsRef.current >= maxConcurrentLoads) return;
        
        processingRef.current = true;
        
        while (priorityQueueRef.current.length > 0 && activeLoadsRef.current < maxConcurrentLoads) {
            // Sort by priority and timestamp
            priorityQueueRef.current.sort((a, b) => {
                if (a.priority !== b.priority) return b.priority - a.priority;
                return a.timestamp - b.timestamp;
            });
            
            const item = priorityQueueRef.current.shift();
            if (!item) break;
            
            if (cacheRef.current.has(item.src) || loadingRef.current.has(item.src)) {
                continue;
            }
            
            activeLoadsRef.current++;
            loadingRef.current.add(item.src);
            
            loadSingleImage(item.src).finally(() => {
                activeLoadsRef.current--;
                loadingRef.current.delete(item.src);
                
                // Continue processing if queue has items
                if (priorityQueueRef.current.length > 0) {
                    setTimeout(() => processQueue(), 10);
                }
            });
        }
        
        processingRef.current = false;
    }, []);

    // Load single image
    const loadSingleImage = useCallback(async (src: string): Promise<void> => {
        return new Promise((resolve, reject) => {
            const img = new window.Image();
            
            img.onload = () => {
                cacheRef.current.set(src, img);
                cleanCache();
                resolve();
            };
            
            img.onerror = () => {
                console.warn(`Failed to preload: ${src}`);
                reject();
            };
            
            // Add crossorigin for better caching
            img.crossOrigin = 'anonymous';
            img.src = src;
        });
    }, [cleanCache]);

    // Add image to preload queue
    const preload = useCallback((src: string, priority: number = 50) => {
        if (cacheRef.current.has(src) || loadingRef.current.has(src)) return;
        
        // Remove existing entry for this src
        priorityQueueRef.current = priorityQueueRef.current.filter(item => item.src !== src);
        
        // Add new entry
        priorityQueueRef.current.push({
            src,
            priority,
            timestamp: Date.now()
        });
        
        // Start processing
        processQueue();
    }, [processQueue]);

    // Batch preload with smart prioritization
    const batchPreload = useCallback((sources: Array<{ src: string; priority: number }>) => {
        sources.forEach(({ src, priority }) => {
            preload(src, priority);
        });
    }, [preload]);

    // Smart preload strategy for carousel
    const preloadCarouselImages = useCallback((
        images: Array<{ compressed_location: string }>,
        centerIndex: number,
        immediate: boolean = false
    ) => {
        const connectionSpeed = getConnectionSpeed();
        const strategy = {
            slow: { immediate: 2, secondary: 4, tertiary: 6 },
            medium: { immediate: 3, secondary: 6, tertiary: 10 },
            fast: { immediate: 4, secondary: 8, tertiary: 15 }
        }[connectionSpeed];

        const preloadList: Array<{ src: string; priority: number }> = [];

        // Immediate priority (current ± immediate range)
        for (let i = Math.max(0, centerIndex - strategy.immediate); 
             i <= Math.min(images.length - 1, centerIndex + strategy.immediate); i++) {
            if (images[i]) {
                const distance = Math.abs(i - centerIndex);
                const priority = immediate ? 100 : Math.max(90 - distance * 5, 70);
                preloadList.push({ src: images[i].compressed_location, priority });
            }
        }

        // Secondary priority
        for (let i = Math.max(0, centerIndex - strategy.secondary); 
             i <= Math.min(images.length - 1, centerIndex + strategy.secondary); i++) {
            if (images[i] && Math.abs(i - centerIndex) > strategy.immediate) {
                const distance = Math.abs(i - centerIndex);
                preloadList.push({ src: images[i].compressed_location, priority: Math.max(60 - distance * 2, 40) });
            }
        }

        // Tertiary priority (only for fast connections)
        if (connectionSpeed === 'fast') {
            for (let i = Math.max(0, centerIndex - strategy.tertiary); 
                 i <= Math.min(images.length - 1, centerIndex + strategy.tertiary); i++) {
                if (images[i] && Math.abs(i - centerIndex) > strategy.secondary) {
                    const distance = Math.abs(i - centerIndex);
                    preloadList.push({ src: images[i].compressed_location, priority: Math.max(30 - distance, 10) });
                }
            }
        }

        batchPreload(preloadList);
    }, [getConnectionSpeed, batchPreload]);

    // Predictive preload for grid hover
    const preloadGridImage = useCallback((
        images: Array<{ compressed_location: string }>,
        index: number
    ) => {
        const connectionSpeed = getConnectionSpeed();
        if (connectionSpeed === 'slow') return; // Skip on slow connections
        
        const preloadList: Array<{ src: string; priority: number }> = [];
        const range = connectionSpeed === 'fast' ? 2 : 1;
        
        for (let i = Math.max(0, index - range); 
             i <= Math.min(images.length - 1, index + range); i++) {
            if (images[i]) {
                preloadList.push({ src: images[i].compressed_location, priority: 30 });
            }
        }
        
        batchPreload(preloadList);
    }, [getConnectionSpeed, batchPreload]);

    // Check if image is cached
    const isCached = useCallback((src: string): boolean => {
        return cacheRef.current.has(src);
    }, []);

    // Clear cache
    const clearCache = useCallback(() => {
        cacheRef.current.clear();
        loadingRef.current.clear();
        priorityQueueRef.current = [];
        processingRef.current = false;
        activeLoadsRef.current = 0;
    }, []);

    // Get cache stats for debugging
    const getCacheStats = useCallback(() => {
        return {
            cacheSize: cacheRef.current.size,
            queueSize: priorityQueueRef.current.length,
            activeLoads: activeLoadsRef.current,
            loading: Array.from(loadingRef.current)
        };
    }, []);

    return {
        preload,
        batchPreload,
        preloadCarouselImages,
        preloadGridImage,
        isCached,
        clearCache,
        getCacheStats,
        connectionSpeed: getConnectionSpeed()
    };
};