'use client'
import Gallery from "@/components/gallery/groups"
import { Suspense } from "react"

export default function GroupsGallery() {
    return <Suspense fallback={<div>Loading...</div>}><Gallery isPublic={true} /></Suspense>
}