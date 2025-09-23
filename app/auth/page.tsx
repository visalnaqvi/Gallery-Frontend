'use client';

import { useState } from 'react';
import LoginForm from '@/components/auth/LoginForm';
import SignupForm from '@/components/auth/SignUpForm';
import styles from "./styles.module.css"
import Image from 'next/image';
import img from "../../public/login.png"
import InfoToast from '@/components/infoToast';
import { signIn } from 'next-auth/react';
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
                <div className={styles.left}>

                    {mode === 'login' ? <LoginForm /> : <SignupForm setMode={setMode} setSignUpSuccess={setSignUpSuccess} />}
                    <br></br>
                    <button onClick={() => signIn("google")}>Login with Google</button>
                    <br></br>
                    <div className={styles.switch}>

                        {mode === 'login' ? <p>Don't have an account? <span onClick={() => setMode('signup')}>Sign Up</span></p> : <p>Already have an account? <span onClick={() => setMode('login')}>Login</span></p>}
                    </div>

                </div>
                <div className={styles.right}>
                    <Image src={img} alt='login'></Image>
                </div>
            </div>
            <br></br>
            <br></br>
            <p className="fixed bottom-[10px] md:bottom-[50px] m-2 text-center">Not able to login? <span className='text-blue-600 font-semibold'>Connect with us at +91-8920152023</span></p>

        </div>
    );
}
