'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { GridLoader } from 'react-spinners';

/**
 * VerificationGuard checks if user has completed phone and face verification
 * Redirects to appropriate verification page if not completed
 */
export default function VerificationGuard({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const pathname = usePathname();

    // Skip verification check for these routes
    const skipRoutes = [
        '/verify/phone',
        '/verify/face',
        '/signup',
        '/snapper/privacy-policy',
        '/snapper/terms-of-service',
        '/api'
    ];

    const shouldSkip = skipRoutes.some(route => pathname?.startsWith(route));

    useEffect(() => {
        if (status === 'loading' || shouldSkip) return;

        if (status === 'authenticated' && session?.user) {
            // Check phone verification
            if (!session.user.phoneNumber) {
                router.push('/verify/phone');
                return;
            }

            // Check face verification
            if (!session.hasFaceImage) {
                router.push('/verify/face');
                return;
            }
        }
    }, [session, status, router, pathname, shouldSkip]);

    // Show loading while checking
    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
                <div className="text-center">
                    <GridLoader size={15} color="#2b7fff" />
                    <p className="text-gray-600 font-medium mt-4">Loading...</p>
                </div>
            </div>
        );
    }

    // Show loading while redirecting
    if (
        status === 'authenticated' &&
        session?.user &&
        !shouldSkip &&
        (!session.user.phoneNumber || !session.hasFaceImage)
    ) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
                <div className="text-center">
                    <GridLoader size={15} color="#2b7fff" />
                    <p className="text-gray-600 font-medium mt-4">Redirecting to verification...</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}