export default function PrivacyPolicy() {
    return (
        <div className="max-w-4xl mx-auto p-6 text-gray-800">
            <h1 className="text-3xl font-bold mb-4">Privacy Policy</h1>
            <p className="mb-4">Last updated: {new Date().toLocaleDateString()}</p>

            <h2 className="text-xl font-semibold mt-6 mb-2">1. Information We Collect</h2>
            <p>
                We collect information you provide, such as photos you upload and account details
                (e.g., email). We may also collect basic usage data to improve the service.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-2">2. How We Use Information</h2>
            <p>
                Your photos are stored securely and displayed only to you (unless you choose to share).
                We may use anonymized data for analytics and app improvement.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-2">3. Sharing of Data</h2>
            <p>
                We do not sell or rent your personal data. We may share limited information with
                trusted service providers (e.g., cloud storage) only as necessary to operate the app.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-2">4. Data Security</h2>
            <p>
                We use reasonable measures to protect your data, but no method of storage is 100%
                secure. You are responsible for keeping your account credentials safe.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-2">5. Your Rights</h2>
            <p>
                Depending on your location (e.g., GDPR, CCPA), you may have rights to access, delete,
                or restrict use of your personal data. Contact us to exercise these rights.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-2">6. Changes to Policy</h2>
            <p>
                We may update this Privacy Policy. Changes will be effective when posted. Continued
                use of the app means you accept the updated policy.
            </p>
        </div>
    );
}
