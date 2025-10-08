'use client';

import { useState } from 'react';
import { Shield, ArrowLeft } from 'lucide-react';
import SelfieCapture from "@/components/SelfieCapture";

type Props = {
    userEmail: string;
    userId: string;
    onSuccess: () => void;
    onBack?: () => void;
};

export default function SignupStep3({ userEmail, userId, onSuccess, onBack }: Props) {
    const [error, setError] = useState<string | null>(null);

    const handleSelfieComplete = async () => {
        // Update database to mark face verification complete
        try {
            const res = await fetch('/api/auth/signup/step3', {
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId }),
            });

            if (res.ok) {
                onSuccess();
            } else {
                const data = await res.json();
                setError(data.error || "Failed to complete face verification");
            }
        } catch (error) {
            setError("Network error. Please try again.");
        }
    };

    const handleSelfieError = (errorMsg: string) => {
        setError(errorMsg);
        setTimeout(() => setError(null), 5000);
    };

    return (
        <div className="w-full max-w-2xl space-y-6">
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
                    <Shield className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">Verify Your Identity</h2>
                <p className="text-blue-100 max-w-xl mx-auto">
                    Take a quick selfie to secure your account and enable personalized features
                </p>
            </div>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    <p className="text-sm">{error}</p>
                </div>
            )}

            <div className="bg-white rounded-2xl p-6">
                <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Why we need this</h3>
                    <div className="space-y-2">
                        <div className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                            <p className="text-sm text-gray-700">
                                <span className="font-semibold">Security:</span> Verify it's really you
                            </p>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                            <p className="text-sm text-gray-700">
                                <span className="font-semibold">Personalization:</span> Match you with your photos
                            </p>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                            <p className="text-sm text-gray-700">
                                <span className="font-semibold">One-time:</span> You'll only need to do this once
                            </p>
                        </div>
                    </div>
                </div>

                <SelfieCapture
                    userEmail={userEmail}
                    onComplete={handleSelfieComplete}
                    onError={handleSelfieError}
                />
            </div>

            <p className="text-blue-100 text-xs text-center">
                Your photo is encrypted and stored securely. We never share your biometric data.
            </p>
        </div>
    );
}   