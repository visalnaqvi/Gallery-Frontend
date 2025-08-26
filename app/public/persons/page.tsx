'use client'
import PersonThumbnails from "@/components/persons";
import { Suspense } from "react";

export default function PersonPublic() {
  return <Suspense fallback={<div>Loading...</div>}><PersonThumbnails pageLink="/public/gallery-person" /></Suspense>
}