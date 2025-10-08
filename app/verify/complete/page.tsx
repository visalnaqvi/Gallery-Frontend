'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import SignupStep2 from '@/components/auth/SignupStep2';
import SignupStep3 from '@/components/auth/SignupStep3';
import InfoToast from '@/components/infoToast';
import Image from 'next/image';
import logo from "@/public/logo-white.png";

/**
 * This page handles the case where an existing user needs to complete
 * both phone and face verification
 */
export default function CompleteVerificationPage() {
    const { data: session, update } = useSession();
    const router = useRouter();
    const [step, setStep] = useState(1); // 1 = phone, 2 = face
    const [showSuccess, setShowSuccess] = useState(false);

    if (!session?.user?.id || !session?.user?.email) {
        router.push('/');
        return null;
    }

    // Determine which verifications are needed
    const needsPhone = !session.user.phoneNumber;
    const needsFace = !session.hasFaceImage;

    // If nothing is needed, redirect to home
    if (!needsPhone && !needsFace) {
        router.push('/');
        return null;
    }

    // If only face is needed, redirect to face verification
    if (!needsPhone && needsFace) {
        router.push('/verify/face');
        return null;
    }

    // If only phone is needed, redirect to phone verification
    if (needsPhone && !needsFace) {
        router.push('/verify/phone');
        return null;
    }

    const handlePhoneSuccess = async () => {
        await update({ phoneVerified: true });
        setStep(2);
    };

    const handleFaceSuccess = async () => {
        setShowSuccess(true);
        await update({ hasFaceImage: true });

        setTimeout(() => {
            router.push('/');
            router.refresh();
        }, 2000);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 flex items-center justify-center p-4">
            {showSuccess && (
                <div className='fixed top-4 right-4 z-50 max-w-md'>
                    <InfoToast
                        loading={false}
                        success={true}
                        message='Verification complete! Redirecting...'
                    />
                </div>
            )}

            <div className="w-full max-w-6xl">
                {/* Logo and Header */}
                <div className="text-center mb-8">
                    <Image
                        src={logo}
                        alt="Snapper Logo"
                        width={200}
                        height={60}
                        className="mx-auto mb-4"
                    />

                    <h1 className="text-3xl font-bold text-white mb-2">
                        Complete Your Profile
                    </h1>
                    <p className="text-blue-100">
                        Please complete the following verifications to access all features
                    </p>

                    {/* Progress Indicator */}
                    <div className="flex items-center justify-center gap-2 mt-6">
                        {[1, 2].map((s) => (
                            <div key={s} className="flex items-center">
                                <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${s < step
                                        ? 'bg-green-400 text-white'
                                        : s === step
                                            ? 'bg-white text-blue-600'
                                            : 'bg-white/30 text-white/60'
                                        }`}
                                >
                                    {s < step ? '✓' : s}
                                </div>
                                {s < 2 && (
                                    <div
                                        className={`w-12 h-1 mx-1 ${s < step ? 'bg-green-400' : 'bg-white/30'
                                            }`}
                                    />
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="text-white text-sm font-medium mt-4">
                        Step {step} of 2: {step === 1 ? 'Phone Verification' : 'Face Verification'}
                    </div>
                </div>

                {/* Step Content */}
                <div className="flex justify-center">
                    {step === 1 && (
                        <SignupStep2
                            userId={session.user.id}
                            onSuccess={handlePhoneSuccess}
                        />
                    )}
                    {step === 2 && (
                        <SignupStep3
                            userEmail={session.user.email}
                            userId={session.user.id}
                            onSuccess={handleFaceSuccess}
                            onBack={() => setStep(1)}
                        />
                    )}
                </div>

                {/* Footer */}
                <div className="text-center mt-8">
                    <p className="text-blue-100 text-sm">
                        Need help?{' '}
                        <a href="tel:+918920152023" className="font-semibold hover:underline">
                            +91-8920152023
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}