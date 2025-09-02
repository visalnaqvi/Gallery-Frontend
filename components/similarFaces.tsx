"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import InfoToast from "@/components/infoToast";

interface SimFace {
    sim_person_id: string;
    thumb_img_byte: string; // base64 string
}

interface PersonData {
    person_id: string;
    thumbnail: string; // base64 string
    sim_faces: SimFace[];
}

interface PaginationInfo {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}

interface ApiResponse {
    data: PersonData[];
    pagination: PaginationInfo;
}

export default function SimilarFacesList() {
    const [persons, setPersons] = useState<PersonData[]>([]);
    const [pagination, setPagination] = useState<PaginationInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10); // You can make this configurable

    const searchParams = useSearchParams();
    const groupId = searchParams.get("groupId");

    const base64ToDataUrl = (base64str: string) =>
        base64str ? `data:image/jpeg;base64,${base64str}` : "";

    const fetchData = async (page: number = currentPage) => {
        try {
            setLoading(true);
            const res = await fetch(`/api/similar_persons?groupId=${groupId}&page=${page}&limit=${itemsPerPage}`);
            if (!res.ok) throw new Error("Failed to fetch data");
            const json: ApiResponse = await res.json();
            setPersons(json.data || []);
            setPagination(json.pagination);
        } catch (err) {
            console.error(err);
            setError("Could not load similar faces");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(currentPage);
    }, [currentPage]);

    const merge = async (p_id: string, m_id: string) => {
        try {
            const response = await fetch("/api/merge_persons", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    merge_person_id: p_id,
                    merge_into_person_id: m_id,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Merge failed: ${errorText}`);
            }

            const data = await response.json();
            console.log("Merge successful:", data);
            await fetchData(currentPage);
            return data;
        } catch (error) {
            console.error("Error merging persons:", error);
            throw error;
        }
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= (pagination?.totalPages || 1)) {
            setCurrentPage(newPage);
        }
    };

    const renderPagination = () => {
        if (!pagination || pagination.totalPages <= 1) return null;

        const { currentPage, totalPages, hasPrevPage, hasNextPage } = pagination;

        // Generate page numbers to show
        const getPageNumbers = () => {
            const pages: number[] = [];
            const maxVisiblePages = 5;

            if (totalPages <= maxVisiblePages) {
                for (let i = 1; i <= totalPages; i++) {
                    pages.push(i);
                }
            } else {
                const half = Math.floor(maxVisiblePages / 2);
                let start = Math.max(1, currentPage - half);
                let end = Math.min(totalPages, start + maxVisiblePages - 1);

                if (end - start < maxVisiblePages - 1) {
                    start = Math.max(1, end - maxVisiblePages + 1);
                }

                for (let i = start; i <= end; i++) {
                    pages.push(i);
                }
            }

            return pages;
        };

        const pageNumbers = getPageNumbers();

        return (
            <div className="flex items-center justify-center space-x-2 mt-8 mb-4">
                {/* Previous button */}
                <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={!hasPrevPage}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${hasPrevPage
                        ? "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                        : "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                        }`}
                >
                    Previous
                </button>

                {/* Page numbers */}
                {pageNumbers.map((pageNum) => (
                    <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-2 rounded-md text-sm font-medium ${pageNum === currentPage
                            ? "bg-blue-500 text-white border border-blue-500"
                            : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                            }`}
                    >
                        {pageNum}
                    </button>
                ))}

                {/* Next button */}
                <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!hasNextPage}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${hasNextPage
                        ? "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                        : "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                        }`}
                >
                    Next
                </button>
            </div>
        );
    };

    if (loading) return <InfoToast loading={true} message="Loading..." />;
    if (error) return <p style={{ color: "red" }}>{error}</p>;

    return (
        <div className="space-y-8 p-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Similar Persons</h1>
                {pagination && (
                    <div className="text-sm text-gray-600">
                        Showing {persons.length} of {pagination.totalCount} results
                        {pagination.totalPages > 1 && (
                            <span className="ml-2">
                                (Page {pagination.currentPage} of {pagination.totalPages})
                            </span>
                        )}
                    </div>
                )}
            </div>

            {persons.length === 0 ? (
                <p className="text-gray-500">No similar persons found.</p>
            ) : (
                <>
                    {persons.map((person) => (
                        <div key={person.person_id} className="border p-6 rounded-lg shadow-md bg-white">
                            {/* Main person + thumbnail */}
                            <div className="flex items-center space-x-4 mb-4">
                                {person.thumbnail ? (
                                    <img
                                        src={base64ToDataUrl(person.thumbnail)}
                                        alt={`Person ${person.person_id}`}
                                        className="w-24 h-24 object-cover rounded-full border-2 border-blue-200"
                                    />
                                ) : (
                                    <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center text-xs text-gray-500 border-2 border-gray-300">
                                        No Image
                                    </div>
                                )}
                                <div>
                                    <h2 className="font-bold text-lg text-blue-600">
                                        {person.sim_faces.length} similar person{person.sim_faces.length !== 1 ? 's' : ''} found
                                    </h2>
                                    <Link
                                        href={`/gallery-person?personId=${person.person_id}&groupId=${groupId}`}
                                        className="hover:underline"
                                    >
                                        <p className="text-sm text-gray-600">
                                            View Images
                                        </p>
                                    </Link>
                                </div>
                            </div>

                            {/* Similar persons */}
                            {person.sim_faces.length > 0 ? (
                                <div className="mt-4">
                                    <h3 className="font-semibold mb-3 text-gray-800">Similar Persons:</h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                        {person.sim_faces.map((simFace) => (
                                            <div key={simFace.sim_person_id}>
                                                <Link
                                                    href={`/gallery-person?personId=${simFace.sim_person_id}&groupId=${groupId}`}
                                                    className="flex flex-col text-sm hover:bg-gray-50 p-2 rounded-lg transition-colors"
                                                >
                                                    {simFace.thumb_img_byte ? (
                                                        <img
                                                            src={base64ToDataUrl(simFace.thumb_img_byte)}
                                                            alt={`Similar person ${simFace.sim_person_id}`}
                                                            className="w-16 h-16 object-cover rounded-full border border-gray-200 hover:border-blue-300 transition-colors"
                                                        />
                                                    ) : (
                                                        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-xs text-gray-500 border border-gray-300">
                                                            No Image
                                                        </div>
                                                    )}
                                                    <span className="text-blue-600 font-semibold">View Images</span>
                                                </Link>
                                                <button
                                                    className="bg-blue-500 px-4 py-2 text-white rounded m-auto mt-2"
                                                    onClick={() => { merge(person.person_id, simFace.sim_person_id) }}
                                                >
                                                    Merge
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                                    <p className="text-gray-600 text-sm">No similar persons found for this person.</p>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Pagination controls */}
                    {renderPagination()}
                </>
            )}
        </div>
    );
}