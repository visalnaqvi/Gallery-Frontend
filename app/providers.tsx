// app/layout.tsx or app/providers.tsx if using a dedicated providers file
'use client';

import VerificationGuard from '@/components/VerificationGuard';
import { UserProvider } from '@/context/UserContext';
import { SessionProvider } from 'next-auth/react';

export function Providers({ children }: { children: React.ReactNode }) {
    return <SessionProvider>
        <UserProvider>
            <VerificationGuard>
                {children}
            </VerificationGuard>
        </UserProvider>
    </SessionProvider>;
}
