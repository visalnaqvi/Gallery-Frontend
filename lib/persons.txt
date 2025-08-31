"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import ImageGallery, { ReactImageGalleryItem } from "react-image-gallery";
import "react-image-gallery/styles/css/image-gallery.css";
import GalleryGrid from "@/components/gallery/grid";
import { ImageItem } from "@/types/ImageItem";
import { Pencil, Check, X, Info, Trash2, Download, HeartIcon, ArchiveRestore } from "lucide-react";
import InfoToast from "@/components/infoToast";
import Switch from "./switch";

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
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    // Add ref to track current groupId and personId to prevent stale closures
    const currentGroupIdRef = useRef<string | null>(null);
    const currentPersonIdRef = useRef<string | null>(null);
    const currentSortingRef = useRef<string>("date_taken");

    // New states for carousel icons
    const [showIcons, setShowIcons] = useState(true);
    const [showImageInfo, setShowImageInfo] = useState(false);
    const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

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

    // ✅ Auto-hide icons after 3 seconds
    const resetHideTimer = useCallback(() => {
        if (hideTimerRef.current) {
            clearTimeout(hideTimerRef.current);
        }
        setShowIcons(true);
        hideTimerRef.current = setTimeout(() => {
            setShowIcons(false);
        }, 3000);
    }, []);

    // ✅ Handle mouse movement to show/hide icons
    const handleMouseMove = useCallback(() => {
        resetHideTimer();
    }, [resetHideTimer]);

    // ✅ Convert bytes to MB
    const formatFileSize = (bytes: number): string => {
        const mb = bytes / (1024 * 1024);
        return `${mb.toFixed(2)} MB`;
    };

    // ✅ Format date
    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

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

    // ✅ Close on Esc
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setIsOpen(false);
                setShowImageInfo(false);
            }
        };
        if (isOpen) {
            document.addEventListener("keydown", handleEsc);
            document.body.style.overflow = "hidden";
            resetHideTimer(); // Start auto-hide timer when carousel opens
        }
        return () => {
            document.removeEventListener("keydown", handleEsc);
            document.body.style.overflow = "unset";
            if (hideTimerRef.current) {
                clearTimeout(hideTimerRef.current);
            }
        };
    }, [isOpen, resetHideTimer]);

    // ✅ Open carousel with preloading and infinite scroll trigger
    const handleImageClick = useCallback(
        (idx: number) => {
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

            // Load more if approaching end
            if (images.length - idx <= LOAD_MORE_AHEAD && hasMore && !loading) {
                fetchImages();
            }
        },
        [images, hasMore, loading, preloadImage, fetchImages]
    );

    // ✅ Gallery items
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
                headers: { 'Content-Type': 'application/json' },
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



    const currentImage = images[currentIndex];
    const handleConfirmDelete = useCallback(async () => {
        if (!currentImage?.id) return;

        try {
            const res = await fetch(`/api/groups/images?imageId=${currentImage.id}`, {
                method: "DELETE",
            });

            if (!res.ok) {
                const err = await res.json();
                console.error("Failed to delete:", err.error);
                alert("Failed to schedule delete.");
                return;
            }

            const data = await res.json();
            console.log("Delete scheduled:", data);
            alert("Image will be deleted in 24 hours.");
            setShowDeleteConfirm(false);
        } catch (err) {
            console.error("Error deleting image:", err);
            alert("Something went wrong.");
        }
    }, [currentImage]);
    const handleHighlightUpdate = useCallback(async () => {
        if (!currentImage?.id) return;

        try {
            // Use the correct property name (highlight instead of hightlight)
            const action = currentImage.highlight ? "remove" : "add";

            const res = await fetch(`/api/groups/images?imageId=${currentImage.id}&action=${action}`, {
                method: "PATCH",
            });

            if (!res.ok) {
                const err = await res.json();
                console.error("Failed to update highlight:", err.error);
                alert("Failed to update highlight.");
                return;
            }

            const data = await res.json();
            console.log("Highlight updated:", data);

            // Update local state to reflect the change
            setImages(prevImages =>
                prevImages.map(img =>
                    img.id === currentImage.id
                        ? { ...img, highlight: !img.highlight }
                        : img
                )
            );


        } catch (err) {
            console.error("Error updating highlight:", err);
            alert("Something went wrong.");
        }
    }, [currentImage, setImages]);
    const handleRestoreGroup = useCallback(async () => {
        if (!groupId) return;

        try {
            const res = await fetch(`/api/groups/images/restore?imageId=${currentImage.id}`, {
                method: "PATCH",
            });

            if (!res.ok) {
                const err = await res.json();
                console.error("Failed to RESTORE:", err.error);
                alert("Failed to RESTORE.");
                return;
            }
            const data = await res.json();
            alert("Image Resotred Successfully");
        } catch (err) {
            alert("Something went wrong.");
        }
    }, [groupId]);
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
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black z-50"
                    onMouseMove={handleMouseMove}
                    onClick={() => setShowImageInfo(false)}
                >
                    {/* Close button */}
                    <button
                        onClick={() => setIsOpen(false)}
                        className={`absolute top-4 right-4 z-50 text-white text-3xl hover:text-gray-300 transition-all duration-300 bg-black bg-opacity-50 rounded-full w-12 h-12 flex items-center justify-center ${showIcons ? 'opacity-100' : 'opacity-0'
                            }`}
                        aria-label="Close gallery"
                    >
                        ×
                    </button>

                    {/* Image counter */}
                    <div className={`absolute top-4 left-4 z-50 text-white bg-black bg-opacity-50 px-3 py-1 rounded transition-all duration-300 ${showIcons ? 'opacity-100' : 'opacity-0'
                        }`}>
                        {currentIndex + 1} / {images.length}
                    </div>

                    {/* Action Icons */}
                    <div className={`absolute bottom-4 right-4 z-50 flex gap-3 transition-all duration-300 ${showIcons ? 'opacity-100' : 'opacity-0'
                        }`}>
                        {/* Info Icon */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowImageInfo(!showImageInfo);
                                resetHideTimer();
                            }}
                            className="p-3 bg-gray-900 text-white rounded-full hover:bg-blue-500 transition-colors duration-200 shadow-lg"
                            title="Image Info"
                        >
                            <Info size={20} />
                        </button>
                        {/* Heart icon */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleHighlightUpdate();
                                resetHideTimer();
                            }}
                            className="p-3 bg-gray-900 text-white rounded-full transition-colors duration-200 shadow-lg"
                            title="Image Info"
                        >
                            <HeartIcon fill={currentImage?.highlight ? "white" : ""} size={20} />
                        </button>
                        {/* Delete Icon */}
                        {currentImage && currentImage.delete_at ?

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleRestoreGroup();
                                    resetHideTimer();
                                }}
                                className="p-3 bg-gray-900 text-white rounded-full hover:bg-green-500 transition-colors duration-200 shadow-lg"
                                title="Restore Image"
                            >
                                <ArchiveRestore size={20} />
                            </button>

                            : <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowDeleteConfirm(true);
                                    resetHideTimer();
                                }}
                                className="p-3 bg-gray-900 text-white rounded-full hover:bg-red-500 transition-colors duration-200 shadow-lg"
                                title="Delete Image"
                            >
                                <Trash2 size={20} />
                            </button>}

                        {/* Download Compressed Icon */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                downloadCompressed();
                                resetHideTimer();
                            }}
                            className="p-3 bg-gray-900 text-white rounded-full hover:bg-green-500 transition-colors duration-200 shadow-lg"
                            title="Download Compressed"
                        >
                            <Download size={20} />
                        </button>

                        {/* Download Original Icon */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                downloadOriginal();
                                resetHideTimer();
                            }}
                            className="p-3 bg-gray-900 text-white rounded-full hover:bg-purple-500 transition-colors duration-200 shadow-lg"
                            title="Download Original"
                        >
                            <Download size={20} />
                        </button>
                    </div>
                    {showDeleteConfirm && (
                        <div
                            className="absolute inset-0 z-50 flex items-center justify-center bg-black/65"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="bg-white rounded-lg p-6 max-w-md mx-4">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                    Confirm Deletion
                                </h3>
                                <p className="text-gray-600 mb-6">
                                    Are you sure you want to delete this image? This action will schedule the image for deletion in 24 hours.
                                </p>
                                <div className="flex gap-3 justify-end">
                                    <button
                                        onClick={() => setShowDeleteConfirm(false)}
                                        className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleConfirmDelete}
                                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* Image Info Panel */}
                    {showImageInfo && currentImage && (
                        <div
                            className="absolute bottom-4 left-4 z-50 bg-black bg-opacity-80 text-white p-4 rounded-lg max-w-sm"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-lg font-semibold">Image Info</h3>
                                <button
                                    onClick={() => setShowImageInfo(false)}
                                    className="text-gray-300 hover:text-white ml-2"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div>
                                    <span className="font-medium">Filename:</span>
                                    <br />
                                    <span className="text-gray-300">{currentImage.filename}</span>
                                </div>
                                <div>
                                    <span className="font-medium">Size:</span>
                                    <br />
                                    <span className="text-gray-300">{formatFileSize(currentImage.size)}</span>
                                </div>
                                <div>
                                    <span className="font-medium">Date Taken:</span>
                                    <br />
                                    <span className="text-gray-300">{formatDate(currentImage.date_taken)}</span>
                                </div>
                                <div>
                                    <span className="font-medium">Uploaded:</span>
                                    <br />
                                    <span className="text-gray-300">{formatDate(currentImage.uploaded_at)}</span>
                                </div>
                            </div>
                        </div>
                    )}

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
                                    setShowImageInfo(false); // Hide info when sliding
                                    resetHideTimer(); // Reset timer on slide

                                    // Preload surrounding images
                                    const indicesToPreload = [index - 1, index, index + 1].filter(
                                        (i) => i >= 0 && i < images.length
                                    );

                                    // Load more if approaching end
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