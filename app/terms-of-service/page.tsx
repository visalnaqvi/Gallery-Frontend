export default function TermsOfService() {
    return (
        <div className="max-w-4xl mx-auto p-6 text-gray-800">
            <h1 className="text-3xl font-bold mb-4">Terms of Service</h1>
            <p className="mb-4">Last updated: {new Date().toLocaleDateString()}</p>

            <h2 className="text-xl font-semibold mt-6 mb-2">1. Acceptance of Terms</h2>
            <p>
                By accessing or using <strong>PhotoGalleryApp</strong>, you agree to be bound by these
                Terms of Service. If you do not agree, you may not use our service.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-2">2. Use of Service</h2>
            <p>
                You may use the app to upload, view, and manage your photos. You agree not to misuse
                the service by uploading unlawful, harmful, or copyrighted content that you do not
                own the rights to.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-2">3. User Content</h2>
            <p>
                You retain all rights to the photos you upload. By uploading, you grant us a limited
                license to store and display your photos solely for the purpose of providing the
                service.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-2">4. Termination</h2>
            <p>
                We reserve the right to suspend or terminate accounts that violate these terms or
                engage in abusive behavior.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-2">5. Disclaimer</h2>
            <p>
                The service is provided “as is.” We do not guarantee that it will be error-free,
                uninterrupted, or secure at all times.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-2">6. Changes to Terms</h2>
            <p>
                We may update these Terms of Service from time to time. Continued use of the app after
                changes constitutes acceptance of the new terms.
            </p>
        </div>
    );
}
