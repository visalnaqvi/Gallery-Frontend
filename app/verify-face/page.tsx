'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import SelfieCapture from "@/components/SelfieCapture";
import InfoToast from '@/components/infoToast';
import { Shield, CheckCircle } from 'lucide-react';

export default function VerifyFacePage() {
    const { data: session, update } = useSession();
    const router = useRouter();
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSelfieComplete = async () => {
        setUploadSuccess(true);

        // Trigger session update with hasFaceImage flag
        // This will cause the JWT callback to re-query the database
        const updatedSession = await update({
            hasFaceImage: true
        });

        console.log('Session updated:', updatedSession);

        // Redirect after session is confirmed updated
        setTimeout(() => {
            router.push('/');
            router.refresh();
        }, 1000);
    };

    const handleSelfieError = (errorMsg: string) => {
        setError(errorMsg);
        setTimeout(() => setError(null), 5000);
    };

    if (!session?.user?.email) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4 sm:px-6 lg:px-8">
            {/* Toast Notifications - Mobile Responsive */}
            {uploadSuccess && (
                <div className='fixed top-4 right-4 left-4 sm:left-auto sm:right-8 sm:top-8 z-50 max-w-md'>
                    <InfoToast
                        loading={false}
                        success={true}
                        message='Face verification successful! Redirecting...'
                    />
                </div>
            )}

            {error && (
                <div className='fixed top-4 right-4 left-4 sm:left-auto sm:right-8 sm:top-8 z-50 max-w-md'>
                    <InfoToast
                        loading={false}
                        success={false}
                        message={error}
                    />
                </div>
            )}

            <div className="max-w-4xl mx-auto">
                {/* Header Section */}
                <div className="text-center mb-8 sm:mb-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4 sm:mb-6 shadow-lg">
                        <Shield className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                    </div>

                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 sm:mb-4">
                        Verify Your Identity
                    </h1>

                    <p className="text-base sm:text-lg text-gray-600 mb-2 max-w-2xl mx-auto px-4">
                        We need to verify your identity for security purposes. This is a one-time process that helps us match you with the right content and ensure account security.
                    </p>

                    <p className="text-sm sm:text-base text-gray-500 max-w-xl mx-auto px-4">
                        Your photo is encrypted and stored securely. We never share your biometric data with third parties.
                    </p>
                </div>

                {/* Why We Need This Section */}
                <div className="mb-8 sm:mb-12 max-w-2xl mx-auto">
                    <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 border border-gray-100">
                        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
                            Why we need this
                        </h2>
                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                                <p className="text-sm sm:text-base text-gray-700">
                                    <span className="font-semibold">Security:</span> Verify it's really you accessing your account
                                </p>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                                <p className="text-sm sm:text-base text-gray-700">
                                    <span className="font-semibold">Personalization:</span> Match you with relevant photos and groups
                                </p>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                                <p className="text-sm sm:text-base text-gray-700">
                                    <span className="font-semibold">One-time process:</span> You'll only need to do this once
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Selfie Capture Component */}
                <div className="mb-8">
                    <SelfieCapture
                        userEmail={session.user.email}
                        onComplete={handleSelfieComplete}
                        onError={handleSelfieError}
                    />
                </div>

                {/* Footer Section */}
                <div className="text-center space-y-4 px-4">
                    <div className="inline-block bg-white rounded-xl shadow-md px-6 py-4 border border-gray-100">
                        <p className="text-sm text-gray-600 mb-1">
                            Having trouble with verification?
                        </p>
                        <p className="text-sm">
                            <span className="text-gray-500">Contact our support team at </span>
                            <a
                                href="tel:+918920152023"
                                className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                            >
                                +91-8920152023
                            </a>
                        </p>
                    </div>

                    <p className="text-xs text-gray-500 max-w-lg mx-auto">
                        By completing this verification, you agree to our biometric data processing as described in our{' '}
                        <a href="/snapper/privacy-policy" className="text-blue-600 hover:underline">Privacy Policy</a>
                    </p>
                </div>
            </div>
        </div>
    );
}