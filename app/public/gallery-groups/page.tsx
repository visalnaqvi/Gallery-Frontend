'use client'
import GalleryGroups from "@/components/gallery/groups"
import { Suspense } from "react"

export default function GroupsGallery() {
    return <Suspense fallback={<div>Loading...</div>}><GalleryGroups isPublic={true} /></Suspense>
}