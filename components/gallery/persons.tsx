"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import ImageGallery, { ReactImageGalleryItem } from "react-image-gallery";
import "react-image-gallery/styles/css/image-gallery.css";
import GalleryGrid from "@/components/gallery/grid";
import { ImageItem } from "@/types/ImageItem";
import { Pencil, Check, X, Info, Trash2, Download } from "lucide-react";
import InfoToast from "@/components/infoToast";
import Switch from "./switch";

interface Person {
    person_id: string;
    name: string;
    totalImages: number;
    face_thumb_bytes: string; // base64 string
}

export default function Gallery({ isPublic }: { isPublic: boolean }) {
    const searchParams = useSearchParams();
    const groupId = searchParams.get("groupId");
    const personId = searchParams.get("personId");
    const [personDetails, setPersonDetails] = useState<Person>();
    const [isOpen, setIsOpen] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [images, setImages] = useState<ImageItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState("");
    const loadedImagesRef = useRef<Set<string>>(new Set());
    const [sorting, setSorting] = useState<string>("date_taken");
    const [isForbidden, setIsForbidden] = useState<boolean>(false);

    // New states for carousel icons
    const [showIcons, setShowIcons] = useState(true);
    const [showImageInfo, setShowImageInfo] = useState(false);
    const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

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

    // ✅ Fetch all images once
    const fetchImages = useCallback(async () => {
        if (!groupId || loading) return;
        setLoading(true);

        try {
            const resP = await fetch(
                `/api/persons/getPersonDetails?personId=${personId}`
            );
            const dataP: Person = await resP.json();

            setPersonDetails(dataP);

            const res = await fetch(
                `/api/persons/getPersonImages?groupId=${groupId}&personId=${personId}&sorting=${sorting}`
            );
            if (res.status === 403) {
                setIsForbidden(true);
                return;
            }
            if (res.status != 200) {
                return;
            }
            const data: ImageItem[] = await res.json();

            setImages(data);
            data.forEach((image) => preloadImage(image.compressed_location));
        } catch (err) {
            console.error("Failed to fetch images", err);
        } finally {
            setLoading(false);
        }
    }, [groupId, personId, preloadImage, sorting]);

    useEffect(() => {
        fetchImages();
    }, [fetchImages, sorting]);

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

    // ✅ Open carousel
    const handleImageClick = useCallback(
        (idx: number) => {
            setCurrentIndex(idx);
            setIsOpen(true);
            setShowImageInfo(false);

            const indicesToPreload = [idx - 2, idx - 1, idx, idx + 1, idx + 2].filter(
                (i) => i >= 0 && i < images.length
            );
            indicesToPreload.forEach((i) =>
                preloadImage(images[i].compressed_location)
            );
        },
        [images, preloadImage]
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

    if (isForbidden) {
        return <InfoToast loading={false} message="Looks like you don't have access to this group. Contact group admin to get access." />;
    }
    if (!groupId) return <p>No groupId provided in URL</p>;

    const currentImage = images[currentIndex];

    return (
        <>
            {/* Grid */}
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
            <GalleryGrid
                isPublic={isPublic}
                isPerson={true}
                personId={personId}
                groupId={groupId}
                handleImageClick={handleImageClick}
                images={images}
                sorting={sorting}
                setSorting={setSorting}
            />

            {loading && (
                <InfoToast loading={true} message="Loading Images" />
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
                            className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-500 transition-colors duration-200 shadow-lg"
                            title="Image Info"
                        >
                            <Info size={20} />
                        </button>

                        {/* Delete Icon */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                // TODO: Implement delete functionality
                                console.log('Delete clicked for image:', currentImage?.id);
                                resetHideTimer();
                            }}
                            className="p-3 bg-red-600 text-white rounded-full hover:bg-red-500 transition-colors duration-200 shadow-lg"
                            title="Delete Image"
                        >
                            <Trash2 size={20} />
                        </button>

                        {/* Download Compressed Icon */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                downloadCompressed();
                                resetHideTimer();
                            }}
                            className="p-3 bg-green-600 text-white rounded-full hover:bg-green-500 transition-colors duration-200 shadow-lg"
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
                            className="p-3 bg-purple-600 text-white rounded-full hover:bg-purple-500 transition-colors duration-200 shadow-lg"
                            title="Download Original"
                        >
                            <Download size={20} />
                        </button>
                    </div>

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
                                    const indicesToPreload = [index - 1, index, index + 1].filter(
                                        (i) => i >= 0 && i < images.length
                                    );
                                    indicesToPreload.forEach((i) =>
                                        preloadImage(images[i].compressed_location)
                                    );
                                }}
                                renderItem={(item) => (
                                    <div className="image-gallery-image relative h-screen w-screen flex items-center justify-center">
                                        <Image
                                            src={item.original}
                                            alt={item.originalAlt || ""}
                                            fill
                                            className="object-contain"
                                            priority={false}
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