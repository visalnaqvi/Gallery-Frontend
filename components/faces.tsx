"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import InfoToast from "@/components/infoToast";
import Switch from "./gallery/switch";

interface Person {
    person_id: string;
    id: string,
    image_id: string;
    quality_score: number;
    insight_face_confidence: number;
    face_thumb_bytes: string; // base64 string
}

type props = {
    pageLink: string;
    isPublic: boolean;
}

export default function PersonThumbnails({ pageLink, isPublic }: props) {
    const [persons, setPersons] = useState<Person[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isForbidden, setIsForbidden] = useState<boolean>(false)
    const searchParams = useSearchParams();
    const groupId = searchParams.get("groupId"); // 👈 get query param
    const [isProcessing, setIsProcessing] = useState<boolean>(false)
    useEffect(() => {
        const fetchPersons = async () => {
            if (!groupId) return; // don’t fetch if no groupId

            try {
                const res = await fetch(`/api/persons/faces?groupId=${groupId}`);
                if (res.status === 403) {
                    setIsForbidden(true)
                }
                if (res.status === 202) {
                    setIsProcessing(true)
                }
                if (res.status !== 200) {
                    return
                }
                if (!res.ok) throw new Error("Failed to fetch persons");

                const data: Person[] = await res.json();
                setPersons(data);
            } catch (err) {
                setError((err as Error).message);
            } finally {
                setLoading(false);
            }
        };

        fetchPersons();
    }, [groupId]); // 👈 re-run when groupId changes
    if (isForbidden) {
        return <InfoToast loading={false} message="Looks like you don't have access to this group. Contact group admin to get access." />;
    }
    if (isProcessing) {
        return <InfoToast loading={true} message="We are processing your images and will be available shortly." />;
    }
    if (!groupId) return <p style={{ color: "red" }}>Missing groupId</p>;
    if (loading) return <InfoToast loading={true} message="Loading..." />;
    if (error) return <p style={{ color: "red" }}>{error}</p>;

    return (
        <div style={{ padding: "20px", margin: "auto" }}>
            {/* {
                isPublic &&
                <Switch groupId={groupId} />
            } */}
            <h2 className="font-semibold text-[30px] mb-[20px]">{persons.length} Persons in Group {groupId}</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", margin: "auto" }}>
                {persons.map((p) => (
                    // <Link
                    //     key={p.person_id}
                    //     href={`${pageLink}?groupId=${groupId}&personId=${p.person_id}`}
                    //     style={{ textDecoration: "none", color: "inherit" }}
                    // >
                    <div className="text-center bg-blue-100 p-3 rounded-md">
                        {p.face_thumb_bytes ? (
                            <img
                                src={p.face_thumb_bytes}
                                alt={`Person ${p.person_id}`}
                            />
                        ) : (
                            <div
                                style={{
                                    width: "100px",
                                    height: "100px",
                                    background: "#eee",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    borderRadius: "8px",
                                    fontSize: "0.8rem",
                                    color: "#666",
                                }}
                            >
                                No Image
                            </div>
                        )}
                        <p className="font-medium mt-2">q - {p.quality_score}</p>
                        <p className="font-medium mt-2">i - {p.insight_face_confidence}</p>
                        <p className="font-medium mt-2">{p.person_id}</p>
                        <p className="font-medium mt-2">{p.id}</p>
                        <p className="font-medium mt-2">{p.image_id}</p>
                    </div>
                    // </Link>
                ))}
            </div>
        </div>
    );
}
