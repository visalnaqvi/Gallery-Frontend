"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface Person {
  person_id: string;
  name: string;
  face_thumb_bytes: string; // base64 string
}

export default function PersonThumbnails() {
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const groupId = searchParams.get("groupId"); // 👈 get query param

  useEffect(() => {
    const fetchPersons = async () => {
      if (!groupId) return; // don’t fetch if no groupId

      try {
        const res = await fetch(`/api/persons?groupId=${groupId}`);
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

  if (!groupId) return <p style={{ color: "red" }}>Missing groupId</p>;
  if (loading) return <p>Loading...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <div style={{ padding: "20px", margin: "auto" }}>
      <h2 className="font-semibold text-[30px] mb-[20px]">{persons.length} Persons in Group {groupId}</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", margin: "auto" }}>
        {persons.map((p) => (
          <Link
            key={p.person_id}
            href={`/gallery-person?groupId=${groupId}&personId=${p.person_id}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div className="text-center bg-blue-100 p-3 h-[150px] rounded-md">
              {p.face_thumb_bytes ? (
                <img
                  src={p.face_thumb_bytes}
                  alt={`Person ${p.person_id}`}
                  style={{
                    width: "100px",
                    height: "100px",
                    objectFit: "cover",
                    borderRadius: "100px",
                  }}
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
              <p className="font-medium mt-2">{p.name}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
