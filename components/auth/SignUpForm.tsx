'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import SignupStep1 from '@/components/auth/SignupStep1';
import SignupStep2 from '@/components/auth/SignupStep2';
import SignupStep3 from '@/components/auth/SignupStep3';
import InfoToast from '@/components/infoToast';
import Image from 'next/image';
import logo from "@/public/logo-white.png";

export default function SignupFlowPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [userData, setUserData] = useState({
        email: '',
        userId: ''
    });
    const [showSuccess, setShowSuccess] = useState(false);

    const handleStep1Success = (data: { email: string; userId: string }) => {
        setUserData(data);
        setStep(2);
    };

    const handleStep2Success = () => {
        setStep(3);
    };

    const handleStep3Success = async () => {
        setShowSuccess(true);

        // Auto-login after signup completion
        setTimeout(async () => {
            // You might want to auto-login here or just redirect to login
            router.push('/auth');
        }, 2000);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 flex items-center justify-center p-4">
            {showSuccess && (
                <div className='fixed top-4 right-4 left-4 sm:left-auto sm:right-8 sm:top-8 z-50 max-w-md'>
                    <InfoToast
                        loading={false}
                        success={true}
                        message='Account created successfully! Redirecting to login...'
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

                    {/* Progress Indicator */}
                    <div className="flex items-center justify-center gap-2 mb-8">
                        {[1, 2, 3].map((s) => (
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
                                {s < 3 && (
                                    <div
                                        className={`w-12 h-1 mx-1 ${s < step ? 'bg-green-400' : 'bg-white/30'
                                            }`}
                                    />
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="text-white text-sm font-medium">
                        Step {step} of 3: {
                            step === 1 ? 'Basic Information' :
                                step === 2 ? 'Phone Verification' :
                                    'Face Verification'
                        }
                    </div>
                </div>

                {/* Step Content */}
                <div className="flex justify-center">
                    {step === 1 && (
                        <SignupStep1 onSuccess={handleStep1Success} />
                    )}
                    {step === 2 && (
                        <SignupStep2
                            userId={userData.userId}
                            onSuccess={handleStep2Success}
                            onBack={() => setStep(1)}
                        />
                    )}
                    {step === 3 && (
                        <SignupStep3
                            userEmail={userData.email}
                            userId={userData.userId}
                            onSuccess={handleStep3Success}
                            onBack={() => setStep(2)}
                        />
                    )}
                </div>

                {/* Footer Links */}
                <div className="text-center mt-8 space-y-2">
                    {step === 1 && (
                        <p className="text-white text-sm">
                            Already have an account?{' '}
                            <button
                                onClick={() => router.push('/')}
                                className="text-blue-200 font-semibold hover:underline"
                            >
                                Log in
                            </button>
                        </p>
                    )}

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-blue-100 text-sm">
                        <a href="/snapper/privacy-policy" className="hover:text-white transition">
                            Privacy Policy
                        </a>
                        <span className="hidden sm:inline">•</span>
                        <a href="/snapper/terms-of-service" className="hover:text-white transition">
                            Terms of Service
                        </a>
                        <span className="hidden sm:inline">•</span>
                        <a href="tel:+918920152023" className="hover:text-white transition">
                            +91-8920152023
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}