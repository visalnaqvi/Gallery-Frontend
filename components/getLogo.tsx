"use client";

import Image from "next/image";
import logo from "../public/logo-white.png";
// import { useEffect, useState } from "react";
// import { useSearchParams } from "next/navigation";
// import { usePathname } from "next/navigation";


export default function Logo() {

    // const [src, setSrc] = useState<string>()
    // const [loading, setLoading] = useState<boolean>(true)
    // const [isPublic, setIsPublic] = useState<boolean>(false)
    // const searchParams = useSearchParams();
    // const userId = searchParams.get("userId");
    // const pathname = usePathname();

    // Prefer user's studio_image if available
    // useEffect(() => {
    //     if (!userId) {
    //         setLoading(false)
    //         return
    //     };

    //     fetch(`/api/user?userId=${userId}`)
    //         .then((res) => res.json())
    //         .then((data) => setSrc(data.studio_logo)).then(() => { setLoading(false) });
    // }, [userId]);

    // useEffect(() => {
    //     if (pathname.includes("/public/")) {
    //         setIsPublic(true)
    //     }
    // }, [pathname]);
    return <Image src={logo} alt="logo" width={120} height={40} />
}