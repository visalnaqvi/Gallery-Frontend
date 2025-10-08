'use client';

import { useState, useEffect } from 'react';
import { Phone, ArrowLeft } from 'lucide-react';
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth";
import { auth } from "@/lib/firebaseClient";
import { GridLoader } from 'react-spinners';

declare global {
    interface Window {
        recaptchaVerifier?: RecaptchaVerifier;
    }
}

type Props = {
    userId: string;
    onSuccess: () => void;
    onBack?: () => void;
};

export default function SignupStep2({ userId, onSuccess, onBack }: Props) {
    const [phone, setPhone] = useState("+91");
    const [otp, setOtp] = useState("");
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (typeof window === "undefined") return;

        const timer = setTimeout(() => {
            const container = document.getElementById("recaptcha-container");
            if (!container || window.recaptchaVerifier) return;

            try {
                window.recaptchaVerifier = new RecaptchaVerifier(
                    auth,
                    "recaptcha-container",
                    {
                        size: "normal",
                        callback: () => console.log("reCAPTCHA verified"),
                        "expired-callback": () => setError("reCAPTCHA expired, please try again"),
                    }
                );

                window.recaptchaVerifier.render().catch((error) => {
                    console.error("reCAPTCHA render error:", error);
                });
            } catch (error) {
                console.error("Error creating reCAPTCHA:", error);
            }
        }, 100);

        return () => {
            clearTimeout(timer);
            if (window.recaptchaVerifier) {
                try {
                    window.recaptchaVerifier.clear();
                } catch (e) { }
                window.recaptchaVerifier = undefined;
            }
        };
    }, []);

    const sendOTP = async () => {
        setError("");

        if (!phone.startsWith("+") || phone.length < 10) {
            setError("Please enter a valid phone number with country code");
            return;
        }

        if (!window.recaptchaVerifier) {
            setError("reCAPTCHA not initialized. Please refresh the page.");
            return;
        }

        setLoading(true);
        try {
            const result = await signInWithPhoneNumber(auth, phone, window.recaptchaVerifier);
            setConfirmationResult(result);
            setError("");
        } catch (error: any) {
            let msg = "Failed to send OTP.";
            if (error.code === "auth/invalid-app-credential") {
                msg = "Please complete the reCAPTCHA and try again.";
            } else if (error.code === "auth/too-many-requests") {
                msg = "Too many requests. Try again later.";
            } else if (error.code === "auth/invalid-phone-number") {
                msg = "Invalid phone number format.";
            }
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const verifyOTP = async () => {
        if (!confirmationResult) {
            setError("Please send OTP first.");
            return;
        }

        if (otp.length !== 6) {
            setError("Please enter a valid 6-digit OTP.");
            return;
        }

        setLoading(true);
        try {
            const result = await confirmationResult.confirm(otp);

            // Save phone number to database
            const res = await fetch('/api/auth/signup/step2', {
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId,
                    phone_number: result.user.phoneNumber,
                    firebase_uid: result.user.uid
                }),
            });

            if (res.ok) {
                onSuccess();
            } else {
                const data = await res.json();
                setError(data.error || "Failed to save phone number");
            }
        } catch (error: any) {
            let msg = "Invalid OTP.";
            if (error.code === "auth/invalid-verification-code") {
                msg = "Incorrect OTP. Please check and try again.";
            } else if (error.code === "auth/code-expired") {
                msg = "OTP expired. Request a new one.";
            }
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md space-y-6">
            {onBack && (
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-blue-100 hover:text-white transition"
                >
                    <ArrowLeft size={20} />
                    <span>Back</span>
                </button>
            )}

            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-full mb-4">
                    <Phone className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">Verify Phone Number</h2>
                <p className="text-blue-100">We'll send you a verification code</p>
            </div>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    <p className="text-sm">{error}</p>
                </div>
            )}

            <div className="space-y-4">
                {!confirmationResult ? (
                    <>
                        <div>
                            <label className="block text-white font-medium mb-2 text-sm">
                                Phone Number
                            </label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="+911234567890"
                                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={loading}
                                />
                            </div>
                            <p className="text-blue-100 text-xs mt-1">
                                Include country code (e.g., +91 for India)
                            </p>
                        </div>

                        <div className="bg-white/10 p-4 rounded-lg">
                            <p className="text-white text-sm font-medium mb-2">Complete verification:</p>
                            <div id="recaptcha-container"></div>
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-3">
                                <GridLoader size={10} color="#ffffff" />
                            </div>
                        ) : (
                            <button
                                onClick={sendOTP}
                                className="w-full bg-white text-blue-600 font-semibold py-3 rounded-lg hover:bg-blue-50 transition shadow-md"
                            >
                                Send OTP
                            </button>
                        )}
                    </>
                ) : (
                    <>
                        <div>
                            <label className="block text-white font-medium mb-2 text-sm">
                                Enter 6-digit OTP
                            </label>
                            <input
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                                placeholder="123456"
                                maxLength={6}
                                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest"
                                disabled={loading}
                                autoFocus
                            />
                            <p className="text-blue-100 text-xs mt-1 text-center">
                                Sent to {phone}
                            </p>
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-3">
                                <GridLoader size={10} color="#ffffff" />
                            </div>
                        ) : (
                            <button
                                onClick={verifyOTP}
                                disabled={otp.length !== 6}
                                className="w-full bg-white text-blue-600 font-semibold py-3 rounded-lg hover:bg-blue-50 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Verify & Continue
                            </button>
                        )}

                        <button
                            onClick={() => {
                                setConfirmationResult(null);
                                setOtp("");
                                setError("");
                            }}
                            className="w-full text-blue-100 hover:text-white text-sm transition"
                        >
                            Change phone number
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}