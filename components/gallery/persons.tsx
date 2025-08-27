"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import ImageGallery, { ReactImageGalleryItem } from "react-image-gallery";
import "react-image-gallery/styles/css/image-gallery.css";
import GalleryGrid from "@/components/gallery/grid";
import { ImageItem } from "@/types/ImageItem";
import { Pencil, Check, X } from "lucide-react"; import InfoToast from "@/components/infoToast";
import Switch from "./switch";
``
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
    const [sorting, setSorting] = useState<string>("date_taken")
    const [isForbidden, setIsForbidden] = useState<boolean>(false)
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
                setIsForbidden(true)
                return
            }
            if (res.status != 200) {
                return
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
            if (e.key === "Escape") setIsOpen(false);
        };
        if (isOpen) {
            document.addEventListener("keydown", handleEsc);
            document.body.style.overflow = "hidden";
        }
        return () => {
            document.removeEventListener("keydown", handleEsc);
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    // ✅ Open carousel
    const handleImageClick = useCallback(
        (idx: number) => {
            setCurrentIndex(idx);
            setIsOpen(true);

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
            <GalleryGrid isPublic={isPublic} isPerson={true} personId={personId} groupId={groupId} handleImageClick={handleImageClick} images={images} sorting={sorting} setSorting={setSorting} />
            {/* {
                isPublic &&
                <Switch groupId={groupId} />
            } */}
            {loading && (
                <InfoToast loading={true} message="Loading Images" />
            )}

            {/* Fullscreen carousel */}
            {isOpen && (
                <div className="fixed inset-0 bg-black z-50">
                    <button
                        onClick={() => setIsOpen(false)}
                        className="absolute top-4 right-4 z-50 text-white text-3xl hover:text-gray-300 transition-colors duration-200 bg-black bg-opacity-50 rounded-full w-12 h-12 flex items-center justify-center"
                        aria-label="Close gallery"
                    >
                        ×
                    </button>
                    <div className="absolute top-4 left-4 z-50 text-white bg-black bg-opacity-50 px-3 py-1 rounded">
                        {currentIndex + 1} / {images.length}
                    </div>

                    {/* Download buttons positioned in bottom right */}
                    <div className="absolute bottom-4 right-4 z-50 flex flex-col gap-2">
                        <button
                            onClick={downloadCompressed}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors duration-200 shadow-lg"
                        >
                            Download Compressed
                        </button>
                        <button
                            onClick={downloadOriginal}
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 transition-colors duration-200 shadow-lg"
                        >
                            Download Original
                        </button>
                    </div>
                    <div className="absolute top-4 left-4 z-50 text-white bg-black bg-opacity-50 px-3 py-1 rounded">
                        {currentIndex + 1} / {images.length}
                    </div>

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
