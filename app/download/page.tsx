"use client";

export default function DownloadButton() {
    const handleDownload = async () => {
        const id = "1vNw5MVgBU6pArYRoSiM6c9mXQomB_SLm"

        const res = await fetch(`/api/images/download/${id}`);
        if (!res.ok) {
            alert("Failed to download");
            return;
        }

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);

        // create hidden link
        const a = document.createElement("a");
        a.href = url;

        // get filename from header if available
        const disposition = res.headers.get("Content-Disposition");
        const match = disposition?.match(/filename="(.+)"/);
        a.download = match?.[1] || `image_${id}.jpg`;

        document.body.appendChild(a);
        a.click();

        // cleanup
        a.remove();
        window.URL.revokeObjectURL(url);
    };

    return (
        <button onClick={handleDownload} className="px-4 py-2 bg-blue-600 text-white rounded">
            Download Image
        </button>
    );
}
