"use client";
import { useState, useCallback } from "react";
import { Pencil, Check, X } from "lucide-react";
import { Person } from "./types";

interface PersonHeaderProps {
    person: Person;
    onNameUpdate: (personId: string, newName: string) => Promise<void>;
}

export default function PersonHeader({ person, onNameUpdate }: PersonHeaderProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(person.name);

    const handleSaveName = useCallback(async () => {
        try {
            await onNameUpdate(person.person_id, editName);
            setIsEditing(false);
        } catch (err) {
            console.error("Error updating name:", err);
            alert("Failed to update name");
            setEditName(person.name); // Reset on error
        }
    }, [person.person_id, editName, onNameUpdate, person.name]);

    return (
        <div className="bg-blue-100 m-[10px] rounded-md flex items-center">
            <div>
                {person.face_thumb_bytes ? (
                    <img
                        src={person.face_thumb_bytes}
                        alt={`Person ${person.person_id}`}
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
            </div>

            <div className="ml-[20px]">
                <div className="flex items-center justify-start gap-2">
                    {isEditing ? (
                        <>
                            <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="px-2 py-1 border rounded"
                            />
                            <button
                                onClick={handleSaveName}
                                className="text-green-600 hover:text-green-800"
                            >
                                <Check size={20} />
                            </button>
                            <button
                                onClick={() => {
                                    setEditName(person.name);
                                    setIsEditing(false);
                                }}
                                className="text-red-600 hover:text-red-800"
                            >
                                <X size={20} />
                            </button>
                        </>
                    ) : (
                        <>
                            <p className="font-semibold text-[30px]">{person.name}</p>
                            <button
                                onClick={() => setIsEditing(true)}
                                className="text-blue-600 hover:text-blue-800"
                            >
                                <Pencil size={18} />
                            </button>
                        </>
                    )}
                </div>
                <div>
                    <p className="font-medium">Total Images: {person.totalImages}</p>
                </div>
            </div>
        </div>
    );
}