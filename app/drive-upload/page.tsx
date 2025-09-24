"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

declare global {
    interface Window {
        gapi: any;
        google: any;
    }
}

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY!;
const APP_ID = process.env.NEXT_PUBLIC_GOOGLE_APP_ID!; // same project as OAuth client

export default function DrivePicker() {
    const { data: session } = useSession();
    const [files, setFiles] = useState<any[]>([]);
    const [pickerReady, setPickerReady] = useState(false);

    // Load Picker and GAPI scripts
    useEffect(() => {
        const loadScript = (src: string) =>
            new Promise((resolve) => {
                const script = document.createElement("script");
                script.src = src;
                script.onload = resolve;
                document.body.appendChild(script);
            });

        const loadPicker = async () => {
            await loadScript("https://apis.google.com/js/api.js");
            await loadScript("https://apis.google.com/js/api/picker.js");

            window.gapi.load("picker", { callback: () => setPickerReady(true) });
        };

        loadPicker();
    }, []);

    const openPicker = () => {
        if (!pickerReady || !session?.accessToken) {
            alert("Google Picker not ready or user not signed in.");
            return;
        }

        const view = new window.google.picker.DocsView()
            .setIncludeFolders(true)
            .setSelectFolderEnabled(true)
            .setOwnedByMe(true);

        const picker = new window.google.picker.PickerBuilder()
            .setAppId(APP_ID)
            .setOAuthToken(session.accessToken)
            .addView(view)
            .setDeveloperKey(API_KEY)
            .setCallback((data: any) => {
                if (data[window.google.picker.Response.ACTION] === window.google.picker.Action.PICKED) {
                    const docs = data[window.google.picker.Response.DOCUMENTS];
                    setFiles(docs.map((doc: any) => ({ id: doc.id, name: doc.name })));
                }
            })
            .build();

        picker.setVisible(true);
    };

    return (
        <div className="p-4">
            <button
                onClick={openPicker}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
                Select from Google Drive
            </button>

            {files.length > 0 && (
                <ul className="mt-4 space-y-2">
                    {files.map((f) => (
                        <li key={f.id} className="text-gray-800">
                            📂 {f.name} ({f.id})
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
