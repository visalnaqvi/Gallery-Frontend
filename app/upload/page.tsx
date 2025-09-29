'use client';

import ImageUploader from '@/components/upload/ImageUploader';
import { Suspense } from 'react';

export default function UploadImages() {
    return (
        <div className="min-h-screen bg-gray-50">
            <Suspense fallback={<div>Loading...</div>}><ImageUploader /></Suspense>
        </div>
    );
}
