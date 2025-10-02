'use client';

import { useState } from 'react';
import LoginForm from '@/components/auth/LoginForm';
import SignupForm from '@/components/auth/SignUpForm';
import styles from "./styles.module.css"
import Image from 'next/image';
import img from "../../public/login.png"
import InfoToast from '@/components/infoToast';
import { signIn } from 'next-auth/react';
import google from "../../public/google-icon-logo-svgrepo-com.svg"
import logo from "../../public/logo-white.png"
export default function AuthPage() {
    const [mode, setMode] = useState<string>('login');
    const [signUpSuccess, setSignUpSuccess] = useState(false)
    return (
        <div className={styles.mainWrapper}>
            {
                signUpSuccess &&
                <div className='fixed bottom-[50px] right-[50px]'
                ><InfoToast loading={false} success={true} message='Signup successful login to continue' /></div>

            }
            <div className={styles.formHolder}>
                <div className={`${styles.left} bg-blue-600 h-full flex flex-col items-center justify-center rounded-md  p-8 gap-y-6`}>
                    {/* Logo */}
                    <Image src={logo} alt="logo" width={300} className="block" />
                    <p className='text-white font-bold text-lg'>Let's get started!</p>
                    {/* White card with Google button */}
                    <div className="flex flex-col items-center justify-center w-full p-8 bg-white rounded-2xl shadow-lg gap-y-4">
                        {/* Google login button */}
                        <button
                            onClick={() => signIn("google")}
                            className="flex items-center justify-center gap-3 w-full max-w-sm px-6 py-3 border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition"
                        >
                            <Image src={google} alt="Google Logo" width={24} height={24} />
                            <span className="text-gray-700 font-medium">Continue with Google</span>
                        </button>
                    </div>
                    <a href="/snapper/privacy-policy" className='text-white font-bold text-lg'>Read Our Privacy Policy</a>
                    <a href="/snapper/terms-of-service" className='text-white font-bold text-lg'>Read Our Terms of Service</a>
                    <p className="m-2 text-center text-white">Need Help?<span className='text-white font-semibold'>Connect with us at +91-8920152023</span></p>

                    {/* Divider
                        <div className="flex items-center w-full max-w-sm my-6">
                            <div className="flex-grow border-t border-gray-300"></div>
                            <span className="mx-3 text-gray-400 text-sm">or</span>
                            <div className="flex-grow border-t border-gray-300"></div>
                        </div> */}

                    {/* Switch between login and signup */}
                    {/* {mode === "login" ? (
                            <p className="text-gray-600 text-sm">
                                Don’t have an account?{" "}
                                <span
                                    onClick={() => setMode("signup")}
                                    className="text-blue-600 font-semibold cursor-pointer hover:underline"
                                >
                                    Sign up
                                </span>
                            </p>
                        ) : (
                            <p className="text-gray-600 text-sm">
                                Already have an account?{" "}
                                <span
                                    onClick={() => setMode("login")}
                                    className="text-blue-600 font-semibold cursor-pointer hover:underline"
                                >
                                    Log in
                                </span>
                            </p>
                        )} */}
                </div>

                <div className={styles.right}>
                    <Image src={img} alt='login'></Image>
                </div>
            </div>
            <br></br>
            <br></br>

        </div>
    );
}
