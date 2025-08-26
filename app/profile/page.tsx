"use client";

import { Suspense } from "react";
import UserProfile from "@/components/userProfile";


export default function UserProfilePage() {

    return (
        <Suspense fallback={<div>Loading...</div>}><UserProfile></UserProfile></Suspense>
    );
}
