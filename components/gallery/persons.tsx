"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import "react-image-gallery/styles/css/image-gallery.css";
import GalleryGrid from "@/components/gallery/grid";
import { Pencil, Check, X } from "lucide-react";
import InfoToast from "@/components/infoToast";
import ImageGalleryComponent from "./components/ImageGallery";
import useGallery from "@/hooks/useGallery";

interface Person {
    person_id: string;
    name: string;
    totalImages: number;
    face_thumb_bytes: string; // base64 string
}

export default function GalleryPersons({ isPublic }: { isPublic: boolean }) {
    const searchParams = useSearchParams();
    const groupId = searchParams.get("groupId");
    const personId = searchParams.get("personId");
    const [personDetails, setPersonDetails] = useState<Person>();
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState("");
    const [sorting, setSorting] = useState<string>("date_taken");

    const {
        // State
        images,
        setImages,
        hasMore,
        loading,
        isForbidden,
        albums,

        // Gallery state
        isOpen,
        setIsOpen,
        currentIndex,
        setCurrentIndex,

        // Functions
        handleImageClick,
        fetchImages,
        resetState,
        getImageSource,
        // Refs
        loaderRef,

        // Constants
        LOAD_MORE_AHEAD
    } = useGallery({
        groupId,
        personId,
        mode: "person",
        sorting
    });

    // Fetch person details
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

    // Effect to fetch person details when personId changes
    useEffect(() => {
        if (personId) {
            fetchPersonDetails();
        }
    }, [personId, fetchPersonDetails]);

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
    if (!personId) {
        return <InfoToast loading={false} message="No personId provided in URL" />;
    }

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

            {/* Loading indicator */}
            {loading && (
                <InfoToast loading={true} message="Loading Images" />
            )}

            {/* End of images indicator */}
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
                    mode={"person"}
                    resetState={resetState}
                    groupId={groupId}
                    albums={albums}
                    getImageSource={getImageSource}
                />
            )}
        </>
    );
}