'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import LoginForm from '@/components/auth/LoginForm';
import styles from "./styles-auth-page.module.css";
import Image from 'next/image';
import img from "@/public/login.png";
import InfoToast from '@/components/infoToast';
import logo from "@/public/logo-white.png";

export default function AuthPage({
    inviteId,
    groupId
}: {
    inviteId?: string;
    groupId?: string;
}) {
    const router = useRouter();
    const [showSuccess, setShowSuccess] = useState(false);

    const handleSignupClick = () => {
        router.push('/signup');
    };

    return (
        <div className={styles.mainWrapper}>
            {showSuccess && (
                <div className='fixed bottom-[50px] right-[50px] z-50'>
                    <InfoToast
                        loading={false}
                        success={true}
                        message='Signup successful! Please login to continue.'
                    />
                </div>
            )}

            <div className={styles.formHolder}>
                <div className={`${styles.left} bg-blue-600 h-full flex flex-col items-center justify-center rounded-md p-8 gap-y-6`}>
                    <Image src={logo} alt="logo" width={300} className="block" />
                    <p className='text-white font-bold text-lg'>Welcome to Snapper!</p>

                    <a href="/snapper/privacy-policy" className='text-white font-bold text-lg hover:underline'>
                        Read Our Privacy Policy
                    </a>
                    <a href="/snapper/terms-of-service" className='text-white font-bold text-lg hover:underline'>
                        Read Our Terms of Service
                    </a>
                    <p className="m-2 text-center text-white">
                        Need Help?{' '}
                        <a href="tel:+918920152023" className='text-white font-semibold hover:underline'>
                            +91-8920152023
                        </a>
                    </p>

                    {/* Divider */}
                    <div className="flex items-center w-full max-w-sm my-6">
                        <div className="flex-grow border-t border-gray-300"></div>
                        <span className="mx-3 text-gray-100 text-sm">Login to continue</span>
                        <div className="flex-grow border-t border-gray-300"></div>
                    </div>

                    {/* Login Form */}
                    <LoginForm />

                    {/* Switch to signup */}
                    <p className="text-white text-sm">
                        Don't have an account?{' '}
                        <span
                            onClick={handleSignupClick}
                            className="text-blue-200 font-semibold cursor-pointer hover:underline"
                        >
                            Sign up
                        </span>
                    </p>
                </div>

                <div className={styles.right}>
                    <Image src={img} alt='login' />
                </div>
            </div>
        </div>
    );
}