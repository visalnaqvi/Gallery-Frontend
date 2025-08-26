'use client'
import GroupSettingsComponent from "@/components/groupSettingsComponent";
import { Suspense } from "react";


export default function GroupSettingsPage() {
    return <Suspense fallback={<div>Loading...</div>}><GroupSettingsComponent /></Suspense>
}
