'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Phone, CheckCircle } from 'lucide-react';
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth";
import { auth } from "@/lib/firebaseClient";
import InfoToast from '@/components/infoToast';
import { GridLoader } from 'react-spinners';

declare global {
    interface Window {
        recaptchaVerifier?: RecaptchaVerifier;
    }
}

export default function VerifyPhonePage() {
    const { data: session, update } = useSession();
    const router = useRouter();
    const [phone, setPhone] = useState("+91");
    const [otp, setOtp] = useState("");
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

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
                        "expired-callback": () => setError("reCAPTCHA expired"),
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
        if (!confirmationResult || !session?.user?.id) {
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
            const res = await fetch('/api/user/update-phone', {
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    phone_number: result.user.phoneNumber,
                    firebase_uid: result.user.uid
                }),
            });

            if (res.ok) {
                setSuccess(true);

                // Update session
                await update({ phoneVerified: true });

                // Check if face verification is needed
                setTimeout(() => {
                    if (!session.hasFaceImage) {
                        router.push('/verify/face');
                    } else {
                        router.push('/');
                    }
                    router.refresh();
                }, 2000);
            } else {
                const data = await res.json();
                setError(data.error || "Failed to save phone number");
            }
        } catch (error: any) {
            let msg = "Invalid OTP.";
            if (error.code === "auth/invalid-verification-code") {
                msg = "Incorrect OTP. Please try again.";
            } else if (error.code === "auth/code-expired") {
                msg = "OTP expired. Request a new one.";
            }
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    if (!session?.user?.email) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <GridLoader color="#2b7fff" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
            {success && (
                <div className='fixed top-4 right-4 z-50 max-w-md'>
                    <InfoToast
                        loading={false}
                        success={true}
                        message='Phone verified successfully! Redirecting...'
                    />
                </div>
            )}

            {error && (
                <div className='fixed top-4 right-4 z-50 max-w-md'>
                    <InfoToast
                        loading={false}
                        success={false}
                        message={error}
                    />
                </div>
            )}

            <div className="max-w-2xl mx-auto">
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-6 shadow-lg">
                        <Phone className="w-10 h-10 text-white" />
                    </div>

                    <h1 className="text-4xl font-bold text-gray-900 mb-4">
                        Verify Your Phone Number
                    </h1>

                    <p className="text-lg text-gray-600 max-w-xl mx-auto">
                        We need to verify your phone number for account security and notifications
                    </p>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100 mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <CheckCircle className="w-6 h-6 text-green-500" />
                        Why we need this
                    </h2>
                    <div className="space-y-3 mb-8">
                        <div className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                            <p className="text-gray-700">
                                <span className="font-semibold">Account Recovery:</span> Restore access if you forget your password
                            </p>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                            <p className="text-gray-700">
                                <span className="font-semibold">Security Alerts:</span> Get notified of important account activity
                            </p>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                            <p className="text-gray-700">
                                <span className="font-semibold">Two-Factor Authentication:</span> Add an extra layer of security
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {!confirmationResult ? (
                            <>
                                <div>
                                    <label className="block text-gray-700 font-medium mb-2">
                                        Phone Number
                                    </label>
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="+911234567890"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        disabled={loading}
                                    />
                                    <p className="text-sm text-gray-500 mt-1">
                                        Include country code (e.g., +91 for India)
                                    </p>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    <p className="text-sm font-medium text-gray-700 mb-2">Complete verification:</p>
                                    <div id="recaptcha-container"></div>
                                </div>

                                {loading ? (
                                    <div className="flex justify-center py-3">
                                        <GridLoader size={10} color="#2b7fff" />
                                    </div>
                                ) : (
                                    <button
                                        onClick={sendOTP}
                                        className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition shadow-md"
                                    >
                                        Send OTP
                                    </button>
                                )}
                            </>
                        ) : (
                            <>
                                <div>
                                    <label className="block text-gray-700 font-medium mb-2">
                                        Enter 6-digit OTP
                                    </label>
                                    <input
                                        type="text"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                                        placeholder="123456"
                                        maxLength={6}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest"
                                        disabled={loading}
                                        autoFocus
                                    />
                                    <p className="text-sm text-gray-500 mt-1 text-center">
                                        Sent to {phone}
                                    </p>
                                </div>

                                {loading ? (
                                    <div className="flex justify-center py-3">
                                        <GridLoader size={10} color="#2b7fff" />
                                    </div>
                                ) : (
                                    <>
                                        <button
                                            onClick={verifyOTP}
                                            disabled={otp.length !== 6}
                                            className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Verify & Continue
                                        </button>

                                        <button
                                            onClick={() => {
                                                setConfirmationResult(null);
                                                setOtp("");
                                                setError("");
                                            }}
                                            className="w-full text-blue-600 hover:text-blue-700 text-sm transition"
                                        >
                                            Change phone number
                                        </button>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <div className="text-center">
                    <p className="text-sm text-gray-600">
                        Having trouble? Contact us at{' '}
                        <a href="tel:+918920152023" className="font-semibold text-blue-600 hover:underline">
                            +91-8920152023
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}