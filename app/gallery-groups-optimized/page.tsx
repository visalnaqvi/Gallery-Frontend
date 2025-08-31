'use client'
import GalleryGroups from "@/components/gallery/groups-optimized"
import { Suspense } from "react"

export default function GroupsGalleryPage() {
    return <Suspense fallback={<div>Loading...</div>}><GalleryGroups isPublic={false} /></Suspense>
}