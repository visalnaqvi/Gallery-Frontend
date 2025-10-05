"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import InfoToast from "@/components/infoToast";
import Switch from "./gallery/switch";

interface Person {
    person_id: string;
    name: string;
    face_thumb_bytes: string;
    user_id?: string;
    first_name?: string;
    last_name?: string;
    is_current_user?: boolean;
}

type props = {
    pageLink: string;
    isPublic: boolean;
}

export default function PersonThumbnails({ pageLink, isPublic }: props) {
    const [persons, setPersons] = useState<Person[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isForbidden, setIsForbidden] = useState<boolean>(false);
    const searchParams = useSearchParams();
    const groupId = searchParams.get("groupId");
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const { data: session } = useSession();

    useEffect(() => {
        const fetchPersons = async () => {
            setLoading(true);
            setIsForbidden(false);
            setIsProcessing(false);
            if (!groupId) return;

            try {
                const res = await fetch(`/api/persons?groupId=${groupId}`);
                if (res.status === 403) {
                    setIsForbidden(true);
                }
                if (res.status === 202) {
                    setIsProcessing(true);
                }
                if (res.status !== 200) {
                    return;
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
    }, [groupId]);

    if (isForbidden) {
        return <InfoToast loading={false} message="Looks like you don't have access to this group. Contact group admin to get access." />;
    }
    if (isProcessing) {
        return <InfoToast loading={true} message="We are processing your images and will be available shortly." />;
    }
    if (!groupId) return <p className="text-red-600 text-center p-4">Missing groupId</p>;
    if (loading) return <InfoToast loading={true} message="Loading..." />;
    if (error) return <p className="text-red-600 text-center p-4">{error}</p>;

    return (
        <div className="px-4 py-6 md:px-6 lg:px-8 max-w-7xl mx-auto">
            <div className="mb-8">
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800 mb-2">
                    {persons.length} {persons.length === 1 ? 'Person' : 'People'} in this Group
                </h2>
                <div className="h-1 w-20 bg-blue-600 rounded-full"></div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4 lg:gap-6">
                {persons.map((p) => (
                    <Link
                        key={p.person_id}
                        href={`${pageLink}?groupId=${groupId}&personId=${p.person_id}`}
                        className="group"
                    >
                        <div className="relative bg-gradient-to-br from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
                            <div className="p-4 flex flex-col items-center">
                                {/* Thumbnail */}
                                <div className="relative mb-3">
                                    {p.face_thumb_bytes ? (
                                        <img
                                            src={p.face_thumb_bytes}
                                            alt={`${p.name}'s photo`}
                                            className="w-20 h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 object-cover rounded-full border-4 border-white shadow-md group-hover:border-blue-200 transition-all duration-300"
                                        />
                                    ) : (
                                        <div className="w-20 h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full border-4 border-white shadow-md flex items-center justify-center">
                                            <svg className="w-10 h-10 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    )}

                                    {/* "You" or "Claimed" Badge */}
                                    {p.is_current_user && (
                                        <div className="absolute -top-1 -right-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md">
                                            You
                                        </div>
                                    )}
                                    {p.user_id && !p.is_current_user && (
                                        <div className="absolute -top-1 -right-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md">
                                            Claimed
                                        </div>
                                    )}
                                </div>

                                {/* Name */}
                                <div className="text-center w-full">
                                    <p className="font-bold text-sm md:text-md text-gray-800 truncate px-1">
                                        {p.name}
                                    </p>

                                    {/* User Details (if claimed) */}
                                    {p.user_id && p.first_name && (
                                        <p className="font-bold text-sm md:text-md text-gray-600 mt-1 truncate px-1">
                                            {p.first_name} {p.last_name || ''}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Hover Effect Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                        </div>
                    </Link>
                ))}
            </div>

            {persons.length === 0 && (
                <div className="text-center py-12">
                    <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No people found</h3>
                    <p className="text-gray-500">This group doesn't have any recognized people yet.</p>
                </div>
            )}
        </div>
    );
}