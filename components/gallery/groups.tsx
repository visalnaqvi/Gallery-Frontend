"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import "react-image-gallery/styles/css/image-gallery.css";
import GalleryGrid from "@/components/gallery/grid";
import InfoToast from "@/components/infoToast";
import ImageGalleryComponent from "./components/ImageGallery";
import useGallery from "@/hooks/useGallery";

export default function GalleryGroups({ isPublic }: { isPublic: boolean }) {
    const searchParams = useSearchParams();
    const groupId = searchParams.get("groupId");
    const [sorting, setSorting] = useState<string>("date_taken");
    const [mode, setMode] = useState("gallery");

    const {
        // State
        images,
        setImages,
        hasMore,
        loading,
        hotImages,
        isForbidden,
        albums,

        // Gallery state
        isOpen,
        setIsOpen,
        currentIndex,
        setCurrentIndex,

        // Functions
        fetchImages,
        handleImageClick,
        resetState,

        // Refs
        loaderRef,

        // Constants
        LOAD_MORE_AHEAD
    } = useGallery({
        groupId,
        mode: mode as "gallery",
        sorting
    });

    // Effect to handle mode changes
    useEffect(() => {
        if (!groupId) return;
        resetState();
        fetchImages(0, true);
    }, [mode, resetState, groupId]);

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
            {/* Hot Images Toast */}
            {hotImages > 0 && (
                <InfoToast
                    loading={true}
                    message={`Your recent uploaded ${hotImages} images are being processed and will be available shortly...`}
                />
            )}

            {/* Gallery Grid */}
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
                    mode={mode}
                    resetState={resetState}
                    albums={albums}
                    groupId={groupId}
                />
            )}
        </>
    );
}