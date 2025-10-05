'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AuthPage from '@/components/authPage';
import InfoToast from '@/components/infoToast';

export default function InvitePage({ params }: { params: { id: string } }) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [inviteData, setInviteData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const validateAndJoinGroup = async () => {
            try {
                // Validate invite
                const res = await fetch(`/api/invite-links/validate?inviteId=${params.id}`);
                const data = await res.json();

                if (!res.ok) {
                    setError(data.error || 'Invalid invite link');
                    setLoading(false);
                    return;
                }

                setInviteData(data);

                // If user is already logged in, auto-join the group
                if (status === 'authenticated' && session?.user?.id) {
                    const joinRes = await fetch('/api/invite-links/join', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            inviteId: params.id,
                            userId: session.user.id
                        }),
                    });

                    if (joinRes.ok) {
                        router.push(`/dashboard/gallery-groups?groupId=${data.group_id}`);
                    } else {
                        const joinData = await joinRes.json();
                        setError(joinData.error || 'Failed to join group');
                    }
                }

                setLoading(false);
            } catch (err) {
                console.error('Error validating invite:', err);
                setError('Something went wrong. Please try again.');
                setLoading(false);
            }
        };

        if (status !== 'loading') {
            validateAndJoinGroup();
        }
    }, [params.id, status, session, router]);

    if (loading || status === 'loading') {
        return <InfoToast loading={true} message="Validating invite..." />;
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center p-8 bg-white rounded-lg shadow-lg">
                    <h2 className="text-2xl font-bold text-red-600 mb-4">Invalid Invite</h2>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <button
                        onClick={() => router.push('/')}
                        className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
                    >
                        Go to Home
                    </button>
                </div>
            </div>
        );
    }

    // Show auth page with invite context if not logged in
    if (status === 'unauthenticated' && inviteData) {
        return (
            <div>
                <div className="bg-blue-50 border-b border-blue-200 p-4">
                    <div className="max-w-4xl mx-auto text-center">
                        <h2 className="text-xl font-bold text-blue-800">
                            You've been invited to join "{inviteData.group_name}"
                        </h2>
                        <p className="text-blue-600 mt-1">
                            Please sign up or log in to accept the invitation
                        </p>
                    </div>
                </div>
                <AuthPage />
            </div>
        );
    }

    return null;
}