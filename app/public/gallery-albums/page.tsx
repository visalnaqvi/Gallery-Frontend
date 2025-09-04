'use client'
import GalleryAlbums from "@/components/gallery/albums"
import { Suspense } from "react"

export default function GroupsGalleryPage() {
    return <Suspense fallback={<div>Loading...</div>}><GalleryAlbums isPublic={true} /></Suspense>
}