'use client';

import { useEffect, useState } from 'react';
import CreateGroupModal from './CreateGroupModal';
import { useRouter } from 'next/navigation';
import styles from "./styles.module.css"
import { useSession } from "next-auth/react";


interface Group {
    id: number;
    name: string;
    total_images: number;
    total_size: number;
    admin_user: string;
    last_image_uploaded_at: string;
    profile_pic_bytes: string;
}

export default function GroupsList() {
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const router = useRouter()
    const { data: session } = useSession();
    async function fetchGroups() {
        try {
            setLoading(true);
            const res = await fetch(`/api/groups?userId=${session?.user?.id}`);
            const data = await res.json();
            setGroups(data.groups || []);
        } catch (err) {
            console.error('Failed to fetch groups', err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (session?.user?.id) { fetchGroups(); }
    }, [session?.user?.id]);

    return (
        <div className={styles.mainWrapper}>
            <div className={styles.header}>
                <h2 className="text-xl font-semibold">Your Groups</h2>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded"
                >
                    + New Group
                </button>
            </div>

            <div>
                {loading ? (
                    <p>Loading...</p>
                ) : groups.length === 0 ? (
                    <p>No groups found.</p>
                ) : (
                    <div className={styles.groupCardsWrapper}>

                        {groups.map(group => (
                            <div key={group.id} className={styles.groupCard}>
                                {
                                    group.profile_pic_bytes == undefined || group.profile_pic_bytes == null || group.profile_pic_bytes == "" ?
                                        <div className={styles.groupImage} onClick={() => {
                                            router.push("/gallery-groups?groupId=" + group.id)
                                        }}>
                                            <div className={styles.innerWordWrapper}>{group.name.charAt(0)}</div>
                                        </div> : <div className={styles.cardThumWrapper} onClick={() => {
                                            router.push("/gallery-groups?groupId=" + group.id)
                                        }}><img className={styles.img} src={group.profile_pic_bytes} alt="group image"></img></div>
                                }
                                <div className={styles.groupDetails}>
                                    <p className={styles.groupName}>{group.name}</p>
                                    <p className={styles.groupData}>Images: {group.total_images}</p>
                                    <div className='flex mt-2'><button className="cursor-pointer bg-blue-500 mr-2 text-white px-2 py-1 rounded" onClick={() => {
                                        router.push("/gallery-groups?groupId=" + group.id)
                                    }}>View Images</button>
                                        {group.admin_user == session?.user?.id &&
                                            <div className={styles.adminPanel}>
                                                <button className="bg-blue-400 text-white px-2 py-1 rounded cursor-pointer" onClick={() => {
                                                    router.push(`/upload?groupId=${group.id}`)
                                                }}>Upload Images</button>

                                            </div>}</div>
                                </div>

                            </div>
                        ))}

                    </div>
                )}
            </div>
            {showModal && session?.user?.id && (
                <CreateGroupModal
                    userId={session?.user?.id}
                    onClose={() => setShowModal(false)}
                    onGroupCreated={fetchGroups}
                />
            )}
        </div>
    );
}
