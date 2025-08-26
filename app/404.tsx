import { Suspense } from 'react';

// Component that uses useSearchParams
function NotFoundContent() {
    // Your existing component code that uses useSearchParams
    // const searchParams = useSearchParams();
    // ... rest of your component logic

    return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
            <p className="text-gray-600 mb-8">The page you're looking for doesn't exist.</p>
            <a
                href="/"
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
                Go Home
            </a>
        </div>
    );
}

// Loading component for Suspense fallback
function NotFoundLoading() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
        </div>
    );
}

// Main 404 page component
export default function NotFound() {
    return (
        <Suspense fallback={<NotFoundLoading />}>
            <NotFoundContent />
        </Suspense>
    );
}