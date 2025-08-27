'use client'
import Gallery from "@/components/gallery/persons"
import { Suspense } from "react"

export default function PersonsGallery() {
    return <Suspense fallback={<div>Loading...</div>}><Gallery isPublic={true} /></Suspense>
}