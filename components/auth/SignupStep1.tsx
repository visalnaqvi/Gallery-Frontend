'use client';

import { useState } from 'react';
import { Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { GridLoader } from 'react-spinners';
import { signIn } from 'next-auth/react';
import Image from 'next/image';
import google from "@/public/google-icon-logo-svgrepo-com.svg";

type Props = {
    onSuccess: (userData: { email: string; userId: string }) => void;
};

export default function SignupStep1({ onSuccess }: Props) {
    const [form, setForm] = useState({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
    });
    const [showPass, setShowPass] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [loading, setLoading] = useState(false);

    function validate() {
        const newErrors: { [key: string]: string } = {};

        if (!form.first_name.trim()) newErrors.first_name = "First name is required";
        if (!form.last_name.trim()) newErrors.last_name = "Last name is required";
        if (!form.email.trim()) newErrors.email = "Email is required";
        else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = "Invalid email format";
        if (!form.password.trim()) newErrors.password = "Password is required";
        else if (form.password.length < 8) newErrors.password = "Password must be at least 8 characters";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    async function handleSignup(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setErrors({});

        if (!validate()) {
            setLoading(false);
            return;
        }

        try {
            const res = await fetch('/api/auth/signup/step1', {
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });

            const data = await res.json();

            if (res.ok) {
                onSuccess({
                    email: form.email,
                    userId: data.userId
                });
            } else {
                setErrors({ api: data.error || "Signup failed" });
            }
        } catch (error) {
            setErrors({ api: "Network error. Please try again." });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="w-full max-w-md space-y-6">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">Create Account</h2>
                <p className="text-blue-100">Join Snapper today</p>
            </div>

            {/* Google Sign In */}
            <button
                onClick={() => signIn("google")}
                className="flex items-center justify-center gap-3 w-full px-6 py-3 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition"
            >
                <Image src={google} alt="Google" width={20} height={20} />
                <span className="text-gray-700 font-medium">Continue with Google</span>
            </button>

            {/* Divider */}
            <div className="flex items-center">
                <div className="flex-grow border-t border-blue-300"></div>
                <span className="mx-3 text-blue-200 text-sm">or sign up with email</span>
                <div className="flex-grow border-t border-blue-300"></div>
            </div>

            {/* Form */}
            <form onSubmit={handleSignup} className="space-y-4">
                {/* First Name */}
                <div>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="First Name"
                            value={form.first_name}
                            onChange={e => setForm({ ...form, first_name: e.target.value })}
                        />
                    </div>
                    {errors.first_name && <p className="text-red-300 text-sm mt-1">{errors.first_name}</p>}
                </div>

                {/* Last Name */}
                <div>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Last Name"
                            value={form.last_name}
                            onChange={e => setForm({ ...form, last_name: e.target.value })}
                        />
                    </div>
                    {errors.last_name && <p className="text-red-300 text-sm mt-1">{errors.last_name}</p>}
                </div>

                {/* Email */}
                <div>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Email"
                            type="email"
                            value={form.email}
                            onChange={e => setForm({ ...form, email: e.target.value })}
                        />
                    </div>
                    {errors.email && <p className="text-red-300 text-sm mt-1">{errors.email}</p>}
                </div>

                {/* Password */}
                <div>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            className="w-full pl-10 pr-12 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Password (min 8 characters)"
                            type={showPass ? "text" : "password"}
                            value={form.password}
                            onChange={e => setForm({ ...form, password: e.target.value })}
                        />
                        {showPass ? (
                            <EyeOff
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer hover:text-gray-600"
                                size={18}
                                onClick={() => setShowPass(false)}
                            />
                        ) : (
                            <Eye
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer hover:text-gray-600"
                                size={18}
                                onClick={() => setShowPass(true)}
                            />
                        )}
                    </div>
                    {errors.password && <p className="text-red-300 text-sm mt-1">{errors.password}</p>}
                </div>

                {/* API error */}
                {errors.api && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                        <p className="text-sm">{errors.api}</p>
                    </div>
                )}

                {/* Submit Button */}
                {loading ? (
                    <div className="flex justify-center py-3">
                        <GridLoader size={10} color="#ffffff" />
                    </div>
                ) : (
                    <button
                        type="submit"
                        className="w-full bg-white text-blue-600 font-semibold py-3 rounded-lg hover:bg-blue-50 transition shadow-md"
                    >
                        Continue
                    </button>
                )}
            </form>

            <p className="text-blue-100 text-sm text-center">
                By signing up, you agree to our{' '}
                <a href="/snapper/terms-of-service" className="underline hover:text-white">Terms</a>
                {' '}and{' '}
                <a href="/snapper/privacy-policy" className="underline hover:text-white">Privacy Policy</a>
            </p>
        </div>
    );
}