"use client";
import { useState, useEffect } from "react";
import {
    RecaptchaVerifier,
    signInWithPhoneNumber,
    type ConfirmationResult,
} from "firebase/auth";
import { auth } from "@/lib/firebaseClient";

declare global {
    interface Window {
        recaptchaVerifier?: RecaptchaVerifier;
    }
}

export default function PhoneOTP() {
    const [phone, setPhone] = useState("");
    const [otp, setOtp] = useState("");
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // 🔹 Initialize reCAPTCHA only once
    useEffect(() => {
        if (typeof window === "undefined") return;

        // Wait for DOM to be ready
        const timer = setTimeout(() => {
            const container = document.getElementById("recaptcha-container");
            if (!container) {
                console.error("reCAPTCHA container not found");
                return;
            }

            if (!window.recaptchaVerifier) {
                console.log("Creating reCAPTCHA verifier...");

                try {
                    // ✅ CORRECT: Pass container ID as string, not HTMLElement
                    window.recaptchaVerifier = new RecaptchaVerifier(
                        auth,
                        "recaptcha-container", // String ID, not element
                        {
                            size: "normal",
                            callback: (response: string) => {
                                console.log("reCAPTCHA verified:", response);
                            },
                            "expired-callback": () => {
                                console.log("reCAPTCHA expired");
                            },
                        }
                    );

                    // Render the reCAPTCHA
                    window.recaptchaVerifier.render().then((widgetId) => {
                        console.log("reCAPTCHA rendered successfully, widget ID:", widgetId);
                    }).catch((error) => {
                        console.error("reCAPTCHA render error:", error);
                    });
                } catch (error) {
                    console.error("Error creating reCAPTCHA:", error);
                }
            }
        }, 100);

        return () => {
            clearTimeout(timer);
            if (window.recaptchaVerifier) {
                try {
                    window.recaptchaVerifier.clear();
                } catch (e) {
                    console.log("Error clearing reCAPTCHA:", e);
                }
                window.recaptchaVerifier = undefined;
            }
        };
    }, []);

    const sendOTP = async () => {
        setError("");

        if (!phone.startsWith("+") || phone.length < 10) {
            setError("Please enter a valid phone number with country code (e.g., +911234567890)");
            return;
        }

        if (!window.recaptchaVerifier) {
            setError("reCAPTCHA not initialized. Please refresh the page.");
            return;
        }

        setLoading(true);
        try {
            console.log("Sending OTP to:", phone);
            const appVerifier = window.recaptchaVerifier;
            const result = await signInWithPhoneNumber(auth, phone, appVerifier);
            setConfirmationResult(result);
            setError("");
            alert("OTP sent successfully! Check your phone.");
        } catch (error: any) {
            console.error("Error sending OTP:", error);
            console.error("Error code:", error.code);

            let msg = "Failed to send OTP.";
            if (error.code === "auth/invalid-app-credential") {
                msg = "reCAPTCHA verification failed. Please complete the reCAPTCHA and try again.";
            } else if (error.code === "auth/too-many-requests") {
                msg = "Too many requests. Try again later.";
            } else if (error.code === "auth/invalid-phone-number") {
                msg = "Invalid phone number format.";
            } else if (error.code === "auth/quota-exceeded") {
                msg = "SMS quota exceeded. Please try again later.";
            } else {
                msg = error.message || msg;
            }
            setError(msg);

            // Reset reCAPTCHA on error
            if (window.recaptchaVerifier) {
                try {
                    window.recaptchaVerifier.clear();
                    window.recaptchaVerifier = undefined;
                } catch (e) {
                    console.log("Error clearing reCAPTCHA:", e);
                }
            }
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
            console.log("Phone verified:", result.user);
            alert(`Phone verified successfully!\nPhone: ${result.user.phoneNumber}\nUID: ${result.user.uid}`);

            // Reset form
            setPhone("");
            setOtp("");
            setConfirmationResult(null);
            setError("");
        } catch (error: any) {
            console.error("Error verifying OTP:", error);

            let msg = "Invalid OTP.";
            if (error.code === "auth/invalid-verification-code") {
                msg = "Incorrect OTP. Please check and try again.";
            } else if (error.code === "auth/code-expired") {
                msg = "OTP expired. Request a new one.";
            } else {
                msg = error.message || msg;
            }
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setPhone("");
        setOtp("");
        setConfirmationResult(null);
        setError("");

        if (window.recaptchaVerifier) {
            try {
                window.recaptchaVerifier.clear();
                window.recaptchaVerifier = undefined;
            } catch (e) {
                console.log("Error clearing reCAPTCHA:", e);
            }
        }
    };

    return (
        <div className="p-8 max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-6">Phone Verification</h2>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    <p className="text-sm">{error}</p>
                </div>
            )}

            <div className="space-y-4">
                <div>
                    <label className="block mb-2 font-medium text-sm">
                        Phone Number (with country code)
                    </label>
                    <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+911234567890"
                        className="border border-gray-300 p-3 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={loading || !!confirmationResult}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Include country code (e.g., +91 for India)
                    </p>
                </div>

                {!confirmationResult && (
                    <>
                        {/* reCAPTCHA container */}
                        <div className="border border-gray-200 p-4 rounded bg-gray-50">
                            <p className="text-sm font-medium mb-2">Complete the verification:</p>
                            <div id="recaptcha-container"></div>
                        </div>

                        <button
                            onClick={sendOTP}
                            disabled={loading}
                            className="w-full bg-blue-500 text-white px-4 py-3 rounded font-medium disabled:bg-gray-400 hover:bg-blue-600 transition"
                        >
                            {loading ? "Sending..." : "Send OTP"}
                        </button>
                    </>
                )}

                {confirmationResult && (
                    <div className="space-y-3">
                        <div>
                            <label className="block mb-2 font-medium text-sm">Enter OTP</label>
                            <input
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                                placeholder="123456"
                                maxLength={6}
                                className="border border-gray-300 p-3 w-full rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                                disabled={loading}
                                autoFocus
                            />
                        </div>
                        <button
                            onClick={verifyOTP}
                            disabled={loading || otp.length !== 6}
                            className="w-full bg-green-500 text-white px-4 py-3 rounded font-medium disabled:bg-gray-400 hover:bg-green-600 transition"
                        >
                            {loading ? "Verifying..." : "Verify OTP"}
                        </button>
                        <button
                            onClick={resetForm}
                            disabled={loading}
                            className="w-full bg-gray-500 text-white px-4 py-2 rounded text-sm disabled:bg-gray-400 hover:bg-gray-600 transition"
                        >
                            Cancel / Try Different Number
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}