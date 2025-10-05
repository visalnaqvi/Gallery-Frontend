'use client'
import AuthPage from "@/components/authPage";
import { Suspense } from "react";

export default function PersonPrivate() {
    return <Suspense fallback={<div>Loading...</div>}><AuthPage /></Suspense>
}