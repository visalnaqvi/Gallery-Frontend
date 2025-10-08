'use client';

import { useRef, useState, useEffect } from 'react';
import { Camera, CheckCircle2, XCircle, RotateCcw, Upload } from 'lucide-react';

interface SelfieCaptureProps {
    userEmail: string;
    onComplete: () => void;
    onError?: (error: string) => void;
}

export default function SelfieCapture({ userEmail, onComplete, onError }: SelfieCaptureProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string>('');
    const [isCameraReady, setIsCameraReady] = useState(false);

    useEffect(() => {
        startCamera();
        return () => {
            stopCamera();
        };
    }, []);

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 720 },
                    height: { ideal: 1280 },
                    facingMode: 'user'
                }
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                videoRef.current.onloadedmetadata = () => {
                    setIsCameraReady(true);
                };
            }
        } catch (err) {
            const error = 'Failed to access camera. Please ensure camera permissions are granted.';
            setErrorMsg(error);
            if (onError) onError(error);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    };

    const captureImage = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, 0, 0);
                const imageData = canvas.toDataURL('image/jpeg', 0.95);
                setCapturedImage(imageData);
                stopCamera();
            }
        }
    };

    const retake = () => {
        setCapturedImage(null);
        setErrorMsg('');
        startCamera();
    };

    const submitSelfie = async () => {
        if (!capturedImage) return;

        setIsLoading(true);
        setErrorMsg('');

        try {
            const response = await fetch('https://api.snappergallery.com/validate-selfie', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: userEmail,
                    imageData: capturedImage,
                }),
            });

            const data = await response.json();

            if (response.ok && data.valid) {
                onComplete();
            } else {
                const error = data.error || 'Validation failed. Please try again.';
                setErrorMsg(error);
                if (onError) onError(error);
                setCapturedImage(null);
                startCamera();
            }
        } catch (err) {
            const error = 'Network error. Please check your connection and try again.';
            setErrorMsg(error);
            if (onError) onError(error);
            setCapturedImage(null);
            startCamera();
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto">
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                {/* Camera/Preview Area - Fixed Height */}
                <div className="relative bg-gray-900" style={{ height: 'calc(100vh - 400px)', maxHeight: '600px', minHeight: '400px' }}>
                    {!capturedImage ? (
                        <div className="relative w-full h-full">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover"
                            />

                            {/* Face Guide Overlay - SVG */}
                            {isCameraReady && (
                                <svg
                                    className="absolute inset-0 w-full h-full pointer-events-none"
                                    viewBox="0 0 100 100"
                                    preserveAspectRatio="none"
                                >
                                    {/* Oval Guide */}
                                    <ellipse
                                        cx="50"
                                        cy="45"
                                        rx="30"
                                        ry="38"
                                        fill="none"
                                        stroke="#60a5fa"
                                        strokeWidth="0.5"
                                        strokeDasharray="2,1"
                                        opacity="0.8"
                                    />

                                    {/* Corner Markers - Top Left */}
                                    <line x1="17" y1="7" x2="17" y2="15" stroke="#60a5fa" strokeWidth="0.8" strokeLinecap="round" />
                                    <line x1="17" y1="7" x2="25" y2="7" stroke="#60a5fa" strokeWidth="0.8" strokeLinecap="round" />

                                    {/* Corner Markers - Top Right */}
                                    <line x1="83" y1="7" x2="83" y2="15" stroke="#60a5fa" strokeWidth="0.8" strokeLinecap="round" />
                                    <line x1="83" y1="7" x2="75" y2="7" stroke="#60a5fa" strokeWidth="0.8" strokeLinecap="round" />

                                    {/* Corner Markers - Bottom Left */}
                                    <line x1="17" y1="83" x2="17" y2="75" stroke="#60a5fa" strokeWidth="0.8" strokeLinecap="round" />
                                    <line x1="17" y1="83" x2="25" y2="83" stroke="#60a5fa" strokeWidth="0.8" strokeLinecap="round" />

                                    {/* Corner Markers - Bottom Right */}
                                    <line x1="83" y1="83" x2="83" y2="75" stroke="#60a5fa" strokeWidth="0.8" strokeLinecap="round" />
                                    <line x1="83" y1="83" x2="75" y2="83" stroke="#60a5fa" strokeWidth="0.8" strokeLinecap="round" />
                                </svg>
                            )}

                            {!isCameraReady && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 bg-opacity-90">
                                    <Camera className="w-16 h-16 text-blue-400 mb-4 animate-pulse" />
                                    <p className="text-white text-lg font-medium">Initializing camera...</p>
                                </div>
                            )}

                            {/* Instructions Overlay */}
                            {isCameraReady && (
                                <div className="absolute top-4 left-4 right-4">
                                    <div className="bg-black bg-opacity-60 backdrop-blur-sm rounded-lg p-3">
                                        <p className="text-white text-sm text-center font-medium">
                                            Position your face within the oval guide
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Capture Button Overlay */}
                            {isCameraReady && (
                                <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                                    <button
                                        onClick={captureImage}
                                        className="w-20 h-20 bg-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform duration-200 active:scale-95 border-4 border-blue-500"
                                    >
                                        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                                            <Camera className="w-8 h-8 text-white" />
                                        </div>
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <img
                            src={capturedImage}
                            alt="Captured selfie"
                            className="w-full h-full object-cover"
                        />
                    )}
                    <canvas ref={canvasRef} className="hidden" />
                </div>

                {/* Error Message */}
                {errorMsg && (
                    <div className="mx-4 mt-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
                        <div className="flex items-start gap-3">
                            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                            <p className="text-red-700 text-sm font-medium">{errorMsg}</p>
                        </div>
                    </div>
                )}

                {/* Action Buttons - Only show for captured image */}
                {capturedImage && (
                    <div className="p-6">
                        <div className="flex gap-3">
                            <button
                                onClick={retake}
                                disabled={isLoading}
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 transition-all duration-200"
                            >
                                <RotateCcw className="w-5 h-5" />
                                Retake
                            </button>
                            <button
                                onClick={submitSelfie}
                                disabled={isLoading}
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-semibold hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-400 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Verifying...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-5 h-5" />
                                        Submit
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* Tips Section */}
                <div className="px-6 pb-6">
                    <div className="bg-blue-50 rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-blue-900 mb-2">Tips for best results:</h3>
                        <ul className="space-y-1 text-xs text-blue-700">
                            <li className="flex items-start gap-2">
                                <span className="text-blue-500 mt-0.5">•</span>
                                <span>Ensure good lighting on your face</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-blue-500 mt-0.5">•</span>
                                <span>Look directly at the camera</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-blue-500 mt-0.5">•</span>
                                <span>Remove glasses or hats if possible</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-blue-500 mt-0.5">•</span>
                                <span>Position your face within the oval guide</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}