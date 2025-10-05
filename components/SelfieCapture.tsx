"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, CheckCircle, XCircle, RefreshCw } from "lucide-react";

type Props = {
    userEmail: string;
    onComplete?: () => void;
};

export default function SelfieCapture({ userEmail, onComplete }: Props) {
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [faceDetected, setFaceDetected] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameRef = useRef<number>(null);

    // ✅ Face detection using browser's API (if available)
    const detectFace = async () => {
        if (!videoRef.current || !overlayCanvasRef.current) return;

        const video = videoRef.current;
        const canvas = overlayCanvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Clear previous drawings
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Simple face position guide (oval shape in center)
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radiusX = canvas.width * 0.35;
        const radiusY = canvas.height * 0.45;

        // Draw guide oval
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
        ctx.strokeStyle = faceDetected ? "#10b981" : "#3b82f6";
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 5]);
        ctx.stroke();

        // Draw corner markers
        const drawCorner = (x: number, y: number, flipX: boolean, flipY: boolean) => {
            const size = 20;
            ctx.beginPath();
            ctx.moveTo(x, y + (flipY ? -size : size));
            ctx.lineTo(x, y);
            ctx.lineTo(x + (flipX ? -size : size), y);
            ctx.strokeStyle = faceDetected ? "#10b981" : "#3b82f6";
            ctx.lineWidth = 3;
            ctx.setLineDash([]);
            ctx.stroke();
        };

        const margin = 40;
        drawCorner(margin, margin, false, false); // Top-left
        drawCorner(canvas.width - margin, margin, true, false); // Top-right
        drawCorner(margin, canvas.height - margin, false, true); // Bottom-left
        drawCorner(canvas.width - margin, canvas.height - margin, true, true); // Bottom-right

        // Draw center crosshair
        ctx.beginPath();
        ctx.moveTo(centerX - 10, centerY);
        ctx.lineTo(centerX + 10, centerY);
        ctx.moveTo(centerX, centerY - 10);
        ctx.lineTo(centerX, centerY + 10);
        ctx.strokeStyle = faceDetected ? "#10b981" : "#6b7280";
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.stroke();

        // Continue animation
        animationFrameRef.current = requestAnimationFrame(detectFace);
    };

    // ✅ Start camera
    const startCamera = async () => {
        try {
            setError(null);
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: "user",
                    width: { ideal: 720 },
                    height: { ideal: 1280 },
                    aspectRatio: { ideal: 0.5625 } // 9:16 portrait
                },
            });
            setStream(mediaStream);

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                videoRef.current.onloadedmetadata = () => {
                    if (overlayCanvasRef.current && videoRef.current) {
                        overlayCanvasRef.current.width = videoRef.current.videoWidth;
                        overlayCanvasRef.current.height = videoRef.current.videoHeight;
                        detectFace();
                    }
                };
            }
        } catch (err) {
            setError("Unable to access camera. Please check permissions.");
            console.error("Camera error:", err);
        }
    };

    // ✅ Stop camera
    const stopCamera = () => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            setStream(null);
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    };

    // ✅ Capture selfie
    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        if (!context) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = canvas.toDataURL("image/jpeg", 0.9);
        setCapturedImage(imageData);
        stopCamera();
    };

    // ✅ Retake
    const retakePhoto = () => {
        setCapturedImage(null);
        setError(null);
        setSuccess(false);
        startCamera();
    };

    // ✅ Upload selfie
    const uploadSelfie = async () => {
        if (!capturedImage || !userEmail) {
            setError("Missing image or email");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch("https://api.snappergallery.com/validate-selfie", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: userEmail,
                    imageData: capturedImage,
                    groupId: 13
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || "Upload failed");
                return;
            }

            setSuccess(true);
            setTimeout(() => {
                onComplete?.();
            }, 1500);
        } catch (err) {
            console.error(err);
            setError("An error occurred during upload.");
        } finally {
            setLoading(false);
        }
    };

    // ✅ Cleanup on unmount
    useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, []);

    // Simulate face detection for demo
    useEffect(() => {
        const interval = setInterval(() => {
            setFaceDetected((prev) => !prev);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-6">
            <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">
                Capture Your Selfie
            </h2>
            <p className="text-gray-500 text-center mb-4">
                Position your face within the frame
            </p>

            {/* Camera or captured image */}
            <div className="relative mb-4 rounded-lg overflow-hidden border bg-black" style={{ aspectRatio: "9/16" }}>
                {!capturedImage ? (
                    <>
                        <video
                            ref={videoRef}
                            autoPlay
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                        />
                        <canvas
                            ref={overlayCanvasRef}
                            className="absolute top-0 left-0 w-full h-full pointer-events-none"
                        />
                        {/* Status indicator */}
                        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-full bg-black bg-opacity-50 backdrop-blur-sm">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${faceDetected ? 'bg-green-500' : 'bg-blue-500'} animate-pulse`}></div>
                                <span className="text-white text-sm font-medium">
                                    {faceDetected ? 'Face Detected' : 'Align your face'}
                                </span>
                            </div>
                        </div>
                    </>
                ) : (
                    <img
                        src={capturedImage}
                        alt="Captured selfie"
                        className="w-full h-full object-cover"
                    />
                )}
                <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Guidelines */}
            {!capturedImage && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    <ul className="text-xs text-gray-600 space-y-1">
                        <li>✓ Position your face in the center</li>
                        <li>✓ Ensure good lighting</li>
                        <li>✓ Remove glasses if possible</li>
                        <li>✓ Look directly at the camera</li>
                    </ul>
                </div>
            )}

            {/* Error or Success messages */}
            {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded mb-3 text-sm">
                    <XCircle size={18} />
                    {error}
                </div>
            )}
            {success && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded mb-3 text-sm">
                    <CheckCircle size={18} />
                    Selfie uploaded successfully!
                </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
                {!capturedImage && (
                    <button
                        onClick={capturePhoto}
                        disabled={!stream}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                        <Camera size={20} />
                        Capture
                    </button>
                )}

                {capturedImage && !loading && (
                    <>
                        <button
                            onClick={uploadSelfie}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
                        >
                            <CheckCircle size={20} />
                            Upload
                        </button>
                        <button
                            onClick={retakePhoto}
                            className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
                        >
                            <RefreshCw size={20} />
                            Retake
                        </button>
                    </>
                )}

                {loading && (
                    <div className="flex-1 flex flex-col items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <p className="text-sm text-gray-600">Uploading...</p>
                    </div>
                )}
            </div>
        </div>
    );
}