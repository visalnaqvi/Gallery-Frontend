'use client'
import Switch from "@/components/gallery/switch";
import { Suspense } from "react";

export default function Layout({
    children,
}: {
    children: React.ReactNode
}) {
    return <Suspense fallback={<div>Loading...</div>}><Switch />{children}</Suspense>
}