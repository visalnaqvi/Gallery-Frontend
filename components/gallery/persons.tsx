"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import "react-image-gallery/styles/css/image-gallery.css";
import GalleryGrid from "@/components/gallery/grid";
import { ImageItem } from "@/types/ImageItem";
import { Pencil, Check, X } from "lucide-react";
import InfoToast from "@/components/infoToast";
import ImageGalleryComponent from "./components/ImageGallery";

interface Person {
    person_id: string;
    name: string;
    totalImages: number;
    face_thumb_bytes: string; // base64 string
}

type ApiResponse = {
    images: ImageItem[];
    hasMore: boolean;
};

export default function GalleryPersons({ isPublic }: { isPublic: boolean }) {
    const searchParams = useSearchParams();
    const groupId = searchParams.get("groupId");
    const personId = searchParams.get("personId");
    const [personDetails, setPersonDetails] = useState<Person>();
    const [isOpen, setIsOpen] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [images, setImages] = useState<ImageItem[]>([]);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState("");
    const loadedImagesRef = useRef<Set<string>>(new Set());
    const [sorting, setSorting] = useState<string>("date_taken");
    const [isForbidden, setIsForbidden] = useState<boolean>(false);
    const LOAD_MORE_AHEAD = 50;
    const loaderRef = useRef<HTMLDivElement | null>(null);
    const preloadedRange = useRef<{ min: number; max: number }>({ min: -1, max: -1 });
    // Add ref to track current groupId and personId to prevent stale closures
    const currentGroupIdRef = useRef<string | null>(null);
    const currentPersonIdRef = useRef<string | null>(null);
    const currentSortingRef = useRef<string>("date_taken");


    // ✅ Use refs for cache + preloaded images (no re-render)
    const cache = useRef<{
        pages: Map<string, string[]>;
        allImages: Map<string, string[]>;
        loadingStates: Map<string, boolean>;
    }>({
        pages: new Map(),
        allImages: new Map(),
        loadingStates: new Map(),
    });

    // ✅ Preload images
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
        loadedImagesRef.current.clear();
        cache.current.pages.clear();
        cache.current.allImages.clear();
        cache.current.loadingStates.clear();
    }, []);

    // ✅ Fetch images with pagination (similar to GalleryGroups)
    const fetchImages = useCallback(async (currentPage?: number, resetImages?: boolean) => {
        const actualGroupId = currentGroupIdRef.current;
        const actualPersonId = currentPersonIdRef.current;
        const actualSorting = currentSortingRef.current;
        const actualPage = currentPage !== undefined ? currentPage : page;

        if (!actualGroupId || !actualPersonId || loading) return;

        // Don't fetch if we don't have more pages (unless it's the first page)
        if (!hasMore && actualPage > 0) return;

        setLoading(true);
        try {
            const res = await fetch(
                `/api/persons/getPersonImages?groupId=${actualGroupId}&personId=${actualPersonId}&page=${actualPage}&sorting=${actualSorting}`
            );

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

            // Preload images
            data.images.forEach((image) => preloadImage(image.compressed_location));
        } catch (err) {
            console.error("Failed to fetch images", err);
        } finally {
            setLoading(false);
        }
    }, [page, hasMore, loading, preloadImage]);

    // ✅ Fetch person details
    const fetchPersonDetails = useCallback(async () => {
        if (!personId) return;

        try {
            const res = await fetch(`/api/persons/getPersonDetails?personId=${personId}`);
            const data: Person = await res.json();
            setPersonDetails(data);
            setEditName(data.name);
        } catch (err) {
            console.error("Failed to fetch person details", err);
        }
    }, [personId]);

    // ✅ Effect to handle groupId/personId changes
    useEffect(() => {
        if (!groupId || !personId) return;

        // Only reset and fetch if groupId or personId actually changed
        if (currentGroupIdRef.current !== groupId || currentPersonIdRef.current !== personId) {
            console.log("GroupId or PersonId changed");
            currentGroupIdRef.current = groupId;
            currentPersonIdRef.current = personId;
            resetState();
            fetchPersonDetails();
            // Use setTimeout to ensure state is reset before fetching
            setTimeout(() => {
                fetchImages(0, true);
            }, 0);
        }
    }, [groupId, personId, resetState, fetchPersonDetails]);

    // ✅ Effect to handle sorting changes
    useEffect(() => {
        if (!groupId || !personId) return;

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
    }, [sorting, groupId, personId, resetState]);

    // ✅ Infinite scroll observer - same as GalleryGroups
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



    // ✅ Open carousel with preloading and infinite scroll trigger
    const handleImageClick = useCallback(

        async (idx: number) => {
            console.log("clicked")
            setCurrentIndex(idx);
            setIsOpen(true);
            console.log("preloading")
            // 🔹 1. Load clicked image first
            await preloadImage(images[idx].compressed_location);

            // 🔹 2. Define batches (tiered order)
            const batches: number[][] = [
                Array.from({ length: 5 }, (_, i) => idx + i + 1),   // next 5
                Array.from({ length: 5 }, (_, i) => idx + i + 6),   // next 5 after that
                Array.from({ length: 5 }, (_, i) => idx - i - 1),   // previous 5
                Array.from({ length: 5 }, (_, i) => idx - i - 6),   // previous 5 before that
            ].map(batch => batch.filter(i => i >= 0 && i < images.length));

            // 🔹 3. Preload sequentially (parallel inside each batch)
            for (const batch of batches) {
                await Promise.all(
                    batch.map(i => preloadImage(images[i].compressed_location))
                );
            }

            // 🔹 4. Update preloadedRange ref
            preloadedRange.current = {
                min: Math.max(
                    0,
                    Math.min(preloadedRange.current.min, idx - 10, idx) // clamp at 0
                ),
                max: Math.min(
                    images.length - 1,
                    Math.max(preloadedRange.current.max, idx + 10, idx) // clamp at last index
                ),
            };

            // 🔹 5. Fetch more if near end
            if (images.length - idx <= LOAD_MORE_AHEAD && hasMore && !loading) {

                console.log("fetching mroe")
                fetchImages();
            }
        },
        [images, hasMore, loading, preloadImage, fetchImages, setCurrentIndex, setIsOpen, preloadedRange, LOAD_MORE_AHEAD]
    );



    const handleSaveName = async () => {
        if (!personId) return;
        try {
            const res = await fetch("/api/persons/updateName", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ personId, name: editName }),
            });
            if (!res.ok) throw new Error("Failed to update name");
            setPersonDetails((prev) => prev ? { ...prev, name: editName } : prev);
            setIsEditing(false);
        } catch (err) {
            console.error("Error updating name:", err);
            alert("Failed to update name");
        }
    };

    if (isForbidden) {
        return <InfoToast loading={false} message="Looks like you don't have access to this group. Contact group admin to get access." />;
    }
    if (!groupId) {
        return <InfoToast loading={false} message="No groupId provided in URL" />;
    }
    if (!personId) { return <InfoToast loading={false} message="No personId provided in URL" /> };
    return (
        <>
            {/* Person Details Header */}
            {personDetails && (
                <div className={"bg-blue-100 m-[10px] rounded-md flex items-center"}>
                    <div>
                        {personDetails.face_thumb_bytes ? (
                            <img
                                src={personDetails.face_thumb_bytes}
                                alt={`Person ${personDetails.person_id}`}
                                style={{
                                    width: "100px",
                                    height: "100px",
                                    objectFit: "cover",
                                    borderRadius: "8px",
                                }}
                            />
                        ) : (
                            <div
                                style={{
                                    width: "100px",
                                    height: "100px",
                                    background: "#eee",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    borderRadius: "8px",
                                    fontSize: "0.8rem",
                                    color: "#666",
                                }}
                            >
                                No Image
                            </div>
                        )}
                    </div>
                    {/* Editable Name */}
                    <div className="ml-[20px]">
                        <div className="flex items-center justify-start gap-2">
                            {isEditing ? (
                                <>
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="px-2 py-1 border rounded"
                                    />
                                    <button
                                        onClick={handleSaveName}
                                        className="text-green-600 hover:text-green-800"
                                    >
                                        <Check size={20} />
                                    </button>
                                    <button
                                        onClick={() => {
                                            setEditName(personDetails.name);
                                            setIsEditing(false);
                                        }}
                                        className="text-red-600 hover:text-red-800"
                                    >
                                        <X size={20} />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <p className="font-semibold text-[30px]">{personDetails.name}</p>
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="text-blue-600 hover:text-blue-800"
                                    >
                                        <Pencil size={18} />
                                    </button>
                                </>
                            )}
                        </div>
                        <div>
                            <p className="font-medium">Total Images: {personDetails.totalImages}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Grid */}
            <GalleryGrid
                isPublic={isPublic}
                isPerson={true}
                personId={personId}
                groupId={groupId}
                handleImageClick={handleImageClick}
                images={images}
                sorting={sorting}
                setSorting={setSorting}
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

            {/* No images message */}
            {!loading && images.length === 0 && hasMore === false && (
                <InfoToast loading={false} message="No Images found for this person" />
            )}

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
                    preloadedRange={preloadedRange}
                />
            }
        </>
    );
}