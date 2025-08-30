'use client';

import { useState } from 'react';
import { Mail, Lock, User, Phone, Calendar, Eye, EyeOff } from "lucide-react";
import styles from "./styles.module.css";
import InfoToast from '../infoToast';
import { GridLoader } from 'react-spinners';

export default function SignupForm() {
    const [form, setForm] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone_number: '',
        password: '',
        date_of_birth: '',
    });
    const [showPass, setShowPass] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [signUpSuccess, setSignUpSuccess] = useState(false)
    const [loading, setLoading] = useState(false)

    function validate() {
        const newErrors: { [key: string]: string } = {};

        if (!form.first_name.trim()) newErrors.first_name = "First name is required";
        if (!form.last_name.trim()) newErrors.last_name = "Last name is required";
        if (!form.email.trim()) newErrors.email = "Email is required";
        if (!form.phone_number.trim()) newErrors.phone_number = "Phone number is required";
        if (!form.date_of_birth.trim()) newErrors.date_of_birth = "Date of birth is required";
        if (!form.password.trim()) newErrors.password = "Password is required";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    async function handleSignup(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true)
        if (!validate()) {
            setLoading(false)
            return;
        }

        const res = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
        });

        const data = await res.json();
        if (res.ok) {
            // redirect or reset form
            setForm({
                first_name: '',
                last_name: '',
                email: '',
                phone_number: '',
                password: '',
                date_of_birth: '',
            });
            setErrors({});
            setSignUpSuccess(true)
            setTimeout(() => {
                setSignUpSuccess(false)
            }, 5000)
        } else {
            setErrors({ api: data.error || "Signup failed" });
        }
        setLoading(false)
    }

    return (
        <form onSubmit={handleSignup} className={styles.form}>
            {
                signUpSuccess &&
                <div className='fixed bottom-[50px] right-[50px]'
                ><InfoToast loading={false} success={true} message='Signup successful login to continue' /></div>

            }
            <h2 className={styles.heading}>Hello,</h2>
            <h2 className={styles.heading}>Welcome to Snapsy</h2>
            <p className={styles.tag}>Your new home for photos, stories, and memories.</p>

            {/* First Name */}
            <div className={styles.inputWrapper}>
                <User className={styles.inputIcon} size={18} />
                <input
                    className={styles.input}
                    placeholder="First Name"
                    value={form.first_name}
                    onChange={e => setForm({ ...form, first_name: e.target.value })}
                />
            </div>
            {errors.first_name && <p className={styles.errorMsg}>{errors.first_name}</p>}

            {/* Last Name */}
            <div className={styles.inputWrapper}>
                <User className={styles.inputIcon} size={18} />
                <input
                    className={styles.input}
                    placeholder="Last Name"
                    value={form.last_name}
                    onChange={e => setForm({ ...form, last_name: e.target.value })}
                />
            </div>
            {errors.last_name && <p className={styles.errorMsg}>{errors.last_name}</p>}

            {/* Email */}
            <div className={styles.inputWrapper}>
                <Mail className={styles.inputIcon} size={18} />
                <input
                    className={styles.input}
                    placeholder="Email"
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                />
            </div>
            {errors.email && <p className={styles.errorMsg}>{errors.email}</p>}

            {/* Phone Number */}
            <div className={styles.inputWrapper}>
                <Phone className={styles.inputIcon} size={18} />
                <input
                    className={styles.input}
                    placeholder="Phone Number"
                    value={form.phone_number}
                    onChange={e => setForm({ ...form, phone_number: e.target.value })}
                />
            </div>
            {errors.phone_number && <p className={styles.errorMsg}>{errors.phone_number}</p>}

            {/* Date of Birth */}
            <div className={styles.inputWrapper}>
                <Calendar className={styles.inputIcon} size={18} />
                <input
                    className={styles.input}
                    type="date"
                    value={form.date_of_birth}
                    onChange={e => setForm({ ...form, date_of_birth: e.target.value })}
                />
            </div>
            {errors.date_of_birth && <p className={styles.errorMsg}>{errors.date_of_birth}</p>}

            {/* Password */}
            <div className={styles.inputWrapper} style={{ position: "relative" }}>
                <Lock className={styles.inputIcon} size={18} />
                <input
                    className={styles.input}
                    placeholder="Password"
                    type={showPass ? "text" : "password"}
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                />
                {showPass ? (
                    <EyeOff
                        className={styles.passToggle}
                        size={18}
                        onClick={() => setShowPass(false)}
                    />
                ) : (
                    <Eye
                        className={styles.passToggle}
                        size={18}
                        onClick={() => setShowPass(true)}
                    />
                )}
            </div>
            {errors.password && <p className={styles.errorMsg}>{errors.password}</p>}

            {/* API error */}
            {errors.api && <p className={styles.errorMsg}>{errors.api}</p>}

            {loading ? <GridLoader
                className="mr-4"
                size={10}
                color="#2b7fff"
                aria-label="Loading Spinner"
                data-testid="loader"
            /> : <button type="submit" className={styles.submitBtn}>
                Sign Up
            </button>}
        </form>
    );
}
