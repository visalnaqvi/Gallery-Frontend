'use client'
import PersonThumbnails from "@/components/persons";
import { Suspense } from "react";

export default function PersonPrivate() {
  return <Suspense fallback={<div>Loading...</div>}><PersonThumbnails pageLink="/gallery-person" /></Suspense>
}