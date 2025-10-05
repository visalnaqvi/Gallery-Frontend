"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import "react-image-gallery/styles/css/image-gallery.css";
import GalleryGrid from "@/components/gallery/grid";
import { Pencil, Check, X, User, UserCircle } from "lucide-react";
import InfoToast from "@/components/infoToast";
import ImageGalleryComponent from "./components/ImageGallery";
import useGallery from "@/hooks/useGallery";

interface Person {
    person_id: string;
    name: string;
    totalImages: number;
    face_thumb_bytes: string;
    user_id?: string;
    first_name?: string;
    last_name?: string;
    is_current_user?: boolean;
    is_claimed?: boolean;
}

export default function GalleryPersons({ isPublic }: { isPublic: boolean }) {
    const searchParams = useSearchParams();
    const groupId = searchParams.get("groupId");
    const personId = searchParams.get("personId");
    const [personDetails, setPersonDetails] = useState<Person>();
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState("");
    const [sorting, setSorting] = useState<string>("date_taken");
    const { data: session } = useSession();

    const {
        images,
        setImages,
        hasMore,
        loading,
        isForbidden,
        albums,
        isOpen,
        setIsOpen,
        currentIndex,
        setCurrentIndex,
        handleImageClick,
        fetchImages,
        resetState,
        getImageSource,
        loaderRef,
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

    // Only allow editing if NOT claimed
    const canEdit = !personDetails?.is_claimed;

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
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 m-3 md:m-4 rounded-xl shadow-md p-4 md:p-6">
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                        {/* Thumbnail */}
                        <div className="relative flex-shrink-0">
                            {personDetails.face_thumb_bytes ? (
                                <img
                                    src={personDetails.face_thumb_bytes}
                                    alt={`${personDetails.name}'s photo`}
                                    className="w-24 h-24 md:w-32 md:h-32 object-cover rounded-2xl border-4 border-white shadow-lg"
                                />
                            ) : (
                                <div className="w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl border-4 border-white shadow-lg flex items-center justify-center">
                                    <User className="w-12 h-12 text-gray-400" />
                                </div>
                            )}

                            {/* Status Badge */}
                            {personDetails.is_current_user && (
                                <div className="absolute -top-2 -right-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                                    You
                                </div>
                            )}
                            {personDetails.is_claimed && !personDetails.is_current_user && (
                                <div className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                                    Claimed
                                </div>
                            )}
                        </div>

                        {/* Details */}
                        <div className="flex-grow w-full md:w-auto">
                            {/* Name Display - Editable only if NOT claimed */}
                            <div className="flex items-center gap-2 mb-2">
                                {isEditing ? (
                                    <>
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="px-3 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 flex-grow text-lg md:text-xl font-semibold"
                                            autoFocus
                                        />
                                        <button
                                            onClick={handleSaveName}
                                            className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                                            title="Save"
                                        >
                                            <Check size={20} />
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditName(personDetails.name);
                                                setIsEditing(false);
                                            }}
                                            className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                                            title="Cancel"
                                        >
                                            <X size={20} />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800 flex items-center gap-2">
                                            {personDetails.name}
                                            {personDetails.is_claimed && (
                                                <UserCircle className="w-6 h-6 md:w-7 md:h-7 text-purple-600" />
                                            )}
                                        </h1>
                                        {canEdit && (
                                            <button
                                                onClick={() => setIsEditing(true)}
                                                className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors"
                                                title="Edit name"
                                            >
                                                <Pencil size={18} />
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Profile message for claimed users */}
                            {personDetails.is_claimed && personDetails.is_current_user && (
                                <div className="mb-3">
                                    <p className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                                        This is your profile. To change your name, please update it in your profile settings.
                                    </p>
                                </div>
                            )}

                            {/* Stats */}
                            <div className="flex flex-wrap gap-4 mt-3">
                                <div className="bg-white px-4 py-2 rounded-lg shadow-sm">
                                    <p className="text-sm text-gray-600">Total Images</p>
                                    <p className="text-xl md:text-2xl font-bold text-blue-600">
                                        {personDetails.totalImages}
                                    </p>
                                </div>

                                {personDetails.is_claimed && (
                                    <div className="bg-white px-4 py-2 rounded-lg shadow-sm">
                                        <p className="text-sm text-gray-600">Status</p>
                                        <p className="text-base md:text-lg font-semibold text-purple-600">
                                            {personDetails.is_current_user ? 'Your Profile' : 'Claimed'}
                                        </p>
                                    </div>
                                )}
                            </div>
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
                    totalCount={personDetails?.totalImages || 0}
                />
            )}
        </>
    );
}