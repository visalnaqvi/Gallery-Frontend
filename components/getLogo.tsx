"use client";

import Image from "next/image";
import logo from "../public/logo-white.png";
import { useEffect, useState } from "react";
import { useSearchParams, usePathname } from "next/navigation";

interface UserData {
    studio_name?: string;
    studio_logo?: string;
}

export default function Logo() {
    const [user, setUser] = useState<UserData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [isPublic, setIsPublic] = useState<boolean>(false);

    const searchParams = useSearchParams();
    const groupId = searchParams.get("groupId");
    const pathname = usePathname();

    // fetch user by groupId
    useEffect(() => {


        const fetchLogo = async () => {
            if (!groupId) {
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                const res = await fetch("/api/user/getIdByGroupId?groupId=" + groupId);
                if (res.ok) {
                    const userId = await res.text();
                    const userRes = await fetch(`/api/user?userId=${userId}`);
                    if (userRes.ok) {
                        const data = await userRes.json();
                        setUser(data);
                    }
                }
            } catch (err) {
                console.error("Error fetching logo:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchLogo();
    }, [groupId]);

    useEffect(() => {
        if (pathname.includes("/public/")) {
            setIsPublic(true);
        } else {
            setLoading(false);
        }
    }, [pathname]);

    if (loading) return null;

    // ✅ Priority rendering
    if (user?.studio_name) {
        return <p className="text-lg font-bold text-white">{user.studio_name}</p>;
    }

    if (user?.studio_logo && user.studio_logo.length > 10) {
        return <Image src={user.studio_logo} alt="logo" width={120} height={40} />;
    }

    return <Image src={logo} alt="default logo" width={120} height={40} />;
}
