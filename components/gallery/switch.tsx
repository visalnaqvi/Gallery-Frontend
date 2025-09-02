"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Image, User } from 'lucide-react'
export default function Switch() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const groupId = searchParams.get("groupId");

    // determine active tab
    let activeTab: "images" | "persons" | "none" = "none";
    if (pathname.startsWith("/public/persons")) {
        activeTab = "persons";
    } else if (pathname.startsWith("/public/gallery-groups")) {
        activeTab = "images";
    }

    return (
        <div className="bg-white flex gap-4 border-b py-2 px-4 fixed bottom-[20px] right-[20px] rounded-full shadow-lg border border-[#dbdbdb] z-10">
            {/* Images Tab */}
            <Link
                href={`/public/gallery-groups?groupId=${groupId}`}
                className={`rounded-full flex items-center justify-center px-3 py-2 font-medium ${activeTab === "images"
                    ? "text-white bg-blue-500"
                    : "text-gray-600 hover:text-blue-500"
                    }`}
            >
                <Image size={30} className="pr-2" /> Images
            </Link>

            {/* Persons Tab */}
            <Link
                href={`/public/persons?groupId=${groupId}`}
                className={`flex items-center justify-center px-3 py-2 rounded-full font-medium ${activeTab === "persons"
                    ? "text-white bg-blue-500"
                    : "text-gray-600 hover:text-blue-500"
                    }`}
            >
                <User className="pr-2" size={30} />People
            </Link>
        </div>
    );
}
