"use client";

import SimilarFacesList from "@/components/similarFaces";
import { Suspense } from "react";



export default function SimilarFacesListPage() {

  return <Suspense fallback={<div>Loading...</div>}><SimilarFacesList></SimilarFacesList></Suspense>

}