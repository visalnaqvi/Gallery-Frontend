"use client";

import Image from "next/image";
import logo from "../public/logo-white.png";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { usePathname } from "next/navigation";


export default function Logo() {

    const [src, setSrc] = useState<string>()
    const [loading, setLoading] = useState<boolean>(true)
    const [isPublic, setIsPublic] = useState<boolean>(false)
    const searchParams = useSearchParams();
    const groupId = searchParams.get("groupId");
    const pathname = usePathname();

    // Prefer user's studio_image if available
    useEffect(() => {
        if (!groupId) {
            setLoading(false)
            return
        };
        const fetchLogo = async () => {
            const res = await fetch("/api/user/getIdByGroupId?groupId=" + groupId);
            if (res.status == 200) {
                let user = await res.text();
                fetch(`/api/user?userId=${user}`)
                    .then((res) => res.json())
                    .then((data) => setSrc(data.studio_logo)).then(() => { setLoading(false) });
            } else {
                setLoading(false)
            }

        }
        fetchLogo()
    }, [groupId]);

    useEffect(() => {
        if (pathname.includes("/public/")) {
            setIsPublic(true)
        } else {
            setLoading(false)
        }
    }, [pathname]);
    return (!loading && src && src.length > 10 ? <Image src={src} alt="logo" width={120} height={40} /> : !loading && <Image src={logo} alt="logo" width={120} height={40} />)
}