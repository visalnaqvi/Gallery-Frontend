"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface Person {
  person_id: string;
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
    <div style={{ padding: "20px" }}>
      <h2>Persons in Group {groupId}</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
        {persons.map((p) => (
          <Link
            key={p.person_id}
            href={`/gallery-person?groupId=${groupId}&personId=${p.person_id}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div style={{ textAlign: "center", cursor: "pointer" }}>
              {p.face_thumb_bytes ? (
                <img
                  src={`data:image/jpeg;base64,${p.face_thumb_bytes}`}
                  alt={`Person ${p.person_id}`}
                  style={{
                    width: "100px",
                    height: "100px",
                    objectFit: "cover",
                    borderRadius: "8px",
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
              <p>{p.person_id}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
