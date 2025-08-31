'use client'
import GalleryPersons from "@/components/gallery/persons"
import { Suspense } from "react"

export default function GalleryPersonsPage() {
    return <Suspense fallback={<div>Loading...</div>}><GalleryPersons isPublic={false} /></Suspense>
}