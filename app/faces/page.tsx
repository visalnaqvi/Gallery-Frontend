'use client'
import PersonThumbnails from "@/components/faces";
import { Suspense } from "react";

export default function PersonPrivate() {
    return <Suspense fallback={<div>Loading...</div>}><PersonThumbnails isPublic={false} pageLink="/gallery-person" /></Suspense>
}