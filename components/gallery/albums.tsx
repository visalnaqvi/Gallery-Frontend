"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import "react-image-gallery/styles/css/image-gallery.css";
import GalleryGrid from "@/components/gallery/grid";
import InfoToast from "@/components/infoToast";
import ImageGalleryComponent from "./components/ImageGallery";
import useGallery from "@/hooks/useGallery";

interface Album {
    id: number;
    name: string;
    total_images: number;
    group_id: number;
}

export default function GalleryAlbums({ isPublic }: { isPublic: boolean }) {
    const searchParams = useSearchParams();
    const groupId = searchParams.get("groupId");
    const albumId = searchParams.get("albumId");
    const [albumDetails, setAlbumDetails] = useState<Album>();
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
        albumId,
        mode: "album",
        sorting
    });

    // Fetch album details
    const fetchAlbumDetails = useCallback(async () => {
        if (!groupId || !albumId) return;

        try {
            const res = await fetch(`/api/albums?groupId=${groupId}`);
            const data: Album[] = await res.json();
            const album = data.find(a => a.id === Number(albumId));
            if (album) {
                setAlbumDetails(album);
            }
        } catch (err) {
            console.error("Failed to fetch album details", err);
        }
    }, [groupId, albumId]);

    // Effect to fetch album details when albumId changes
    useEffect(() => {
        if (groupId && albumId) {
            fetchAlbumDetails();
        }
    }, [groupId, albumId, fetchAlbumDetails]);

    if (isForbidden) {
        return <InfoToast loading={false} message="Looks like you don't have access to this group. Contact group admin to get access." />;
    }
    if (!groupId) {
        return <InfoToast loading={false} message="No groupId provided in URL" />;
    }
    if (!albumId) {
        return <InfoToast loading={false} message="No albumId provided in URL" />;
    }

    return (
        <>
            {/* Album Details Header */}
            {albumDetails && (
                <div className={"bg-blue-100 m-[10px] rounded-md flex items-center p-4"}>
                    <div className="w-20 h-20 bg-blue-200 rounded-lg flex items-center justify-center mr-4">
                        <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    </div>
                    <div>
                        <p className="font-semibold text-[25px] md:text-[30px] text-blue-800">{albumDetails.name}</p>
                        <p className="font-medium text-blue-700">Total Images: {albumDetails.total_images}</p>
                    </div>
                </div>
            )}

            {/* Grid */}
            <GalleryGrid
                isPublic={isPublic}
                isPerson={false}
                personId={null}
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
                <InfoToast loading={false} message="No Images found for this album" />
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
                    mode={"album"}
                    resetState={resetState}
                    groupId={groupId}
                    albums={albums}
                    getImageSource={getImageSource}
                />
            )}
        </>
    );
}