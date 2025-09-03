"use client";

import AlbumsComponent from "@/components/albums";
import { Suspense } from "react";



export default function UserProfilePage() {

    return (
        <Suspense fallback={<div>Loading...</div>}><AlbumsComponent /></Suspense>
    );
}
