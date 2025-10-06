'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import styles from "./styles.module.css"
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { GridLoader } from 'react-spinners';
import { getSession } from 'next-auth/react';
export default function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState<{ email?: string; password?: string; login?: string }>({});
    const [loading, setLoading] = useState(false);
    const router = useRouter();


    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();

        let errs: typeof error = {};
        if (!email) errs.email = "Email is required";
        if (!password) errs.password = "Password is required";
        setError(errs);

        if (Object.keys(errs).length > 0) return;

        setLoading(true);

        const res = await signIn('credentials', {
            redirect: false,
            email,
            password,
        });

        if (res?.ok) {

            router.push('/');

        } else {
            setError({ login: res?.error || "Invalid email or password" });
        }

        setLoading(false);
    }

    return (
        <form onSubmit={handleLogin} className={styles.form}>
            <h2 className={styles.heading}>Hello,</h2>
            <h2 className={styles.heading}>Welcome Back,</h2>
            <p className={styles.tag}>Hey! Welcome back to Snapper, Login to Continue</p>

            {/* Email Field */}
            <div className={styles.inputWrapper}>
                <Mail className={styles.inputIcon} size={18} />
                <input
                    className={styles.input}
                    placeholder="Email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                />
            </div>
            {error.email && <p className={styles.errorMsg}>{error.email}</p>}

            {/* Password Field */}
            <div className={styles.inputWrapper}>
                <Lock className={styles.inputIcon} size={18} />
                <input
                    className={styles.input}
                    placeholder="Password"
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                />
                {showPass ? (
                    <EyeOff className={styles.passToggle} size={18} onClick={() => setShowPass(false)} />
                ) : (
                    <Eye className={styles.passToggle} size={18} onClick={() => setShowPass(true)} />
                )}
            </div>
            {error.password && <p className={styles.errorMsg}>{error.password}</p>}

            {error.login && <p className={styles.errorMsg}>{error.login}: Not Able to login</p>}
            {loading ? (
                <GridLoader
                    className="mr-4"
                    size={10}
                    color="#2b7fff"
                    aria-label="Loading Spinner"
                    data-testid="loader"
                />
            ) : (
                <button
                    type="submit"
                    className={`${styles.submitBtn} ${error.login ? styles.errorBtn : ""}`}
                >
                    Login
                </button>
            )}
        </form>
    );
}
