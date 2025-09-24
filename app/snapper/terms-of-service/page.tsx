import React from 'react';
import { Camera, ArrowLeft, FileText, Shield, AlertTriangle, Users, Gavel, Globe } from 'lucide-react';

const TermsOfService = () => {
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navigation */}
            <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center space-x-2">
                            <Camera className="w-8 h-8 text-blue-600" />
                            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                Snapper
                            </span>
                        </div>

                        <a
                            href="/snapper/home"
                            className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>Back to Home</span>
                        </a>
                    </div>
                </div>
            </nav>

            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 py-16">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <FileText className="w-16 h-16 text-white mx-auto mb-6" />
                    <h1 className="text-4xl font-bold text-white mb-4">Terms of Service</h1>
                    <p className="text-xl text-purple-100">
                        The rules and guidelines for using Snapper
                    </p>
                    <p className="text-purple-200 mt-4">
                        Last updated: September 24, 2025
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="bg-white rounded-lg shadow-lg p-8">

                    {/* Introduction */}
                    <section className="mb-12">
                        <div className="flex items-center mb-6">
                            <FileText className="w-8 h-8 text-purple-600 mr-3" />
                            <h2 className="text-2xl font-bold text-gray-900">Agreement to Terms</h2>
                        </div>
                        <p className="text-gray-700 leading-relaxed mb-4">
                            These Terms of Service ("Terms") govern your use of Snapper, a photo organization and sharing service operated by Snapper Inc. ("we," "us," or "our"). By accessing or using our service, you agree to be bound by these Terms.
                        </p>
                        <p className="text-gray-700 leading-relaxed mb-4">
                            If you disagree with any part of these terms, then you may not access or use our service. These Terms apply to all visitors, users, and others who access or use the service.
                        </p>
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-6">
                            <div className="flex items-center">
                                <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
                                <p className="text-sm text-yellow-800">
                                    <strong>Important:</strong> By using Snapper, you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Eligibility */}
                    <section className="mb-12">
                        <div className="flex items-center mb-6">
                            <Users className="w-8 h-8 text-purple-600 mr-3" />
                            <h2 className="text-2xl font-bold text-gray-900">Eligibility</h2>
                        </div>
                        <div className="space-y-4">
                            {/* <div className="border border-gray-200 rounded-lg p-6">
                                <h3 className="font-semibold text-gray-900 mb-3">Age Requirements</h3>
                                <p className="text-gray-700">
                                    You must be at least 13 years old to use our service. If you are between 13 and 18 years old, you must have permission from a parent or guardian.
                                </p>
                            </div> */}
                            <div className="border border-gray-200 rounded-lg p-6">
                                <h3 className="font-semibold text-gray-900 mb-3">Account Responsibility</h3>
                                <p className="text-gray-700">
                                    You are responsible for maintaining the security of your account and password. You must notify us immediately of any unauthorized use of your account.
                                </p>
                            </div>
                            <div className="border border-gray-200 rounded-lg p-6">
                                <h3 className="font-semibold text-gray-900 mb-3">Accurate Information</h3>
                                <p className="text-gray-700">
                                    You must provide accurate, current, and complete information when creating your account and keep it updated.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Service Description */}
                    <section className="mb-12">
                        <div className="flex items-center mb-6">
                            <Camera className="w-8 h-8 text-purple-600 mr-3" />
                            <h2 className="text-2xl font-bold text-gray-900">Service Description</h2>
                        </div>
                        <p className="text-gray-700 leading-relaxed mb-6">
                            Snapper provides a photo organization and sharing platform that includes:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-purple-50 p-6 rounded-lg">
                                <h3 className="font-semibold text-gray-900 mb-3">Core Features</h3>
                                <ul className="text-gray-700 space-y-2">
                                    <li>• Photo upload and storage</li>
                                    <li>• AI-powered people grouping</li>
                                    <li>• Album creation and management</li>
                                    <li>• Image optimization for devices</li>
                                </ul>
                            </div>
                            <div className="bg-pink-50 p-6 rounded-lg">
                                <h3 className="font-semibold text-gray-900 mb-3">Advanced Features</h3>
                                <ul className="text-gray-700 space-y-2">
                                    <li>• Shareable links creation</li>
                                    <li>• Google Drive integration</li>
                                    <li>• Batch photo processing</li>
                                    <li>• Privacy controls</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    {/* User Content and Rights */}
                    <section className="mb-12">
                        <div className="flex items-center mb-6">
                            <Shield className="w-8 h-8 text-purple-600 mr-3" />
                            <h2 className="text-2xl font-bold text-gray-900">User Content and Rights</h2>
                        </div>

                        <div className="space-y-6">
                            <div className="border-l-4 border-blue-500 pl-6">
                                <h3 className="text-xl font-semibold text-gray-900 mb-3">Your Content Ownership</h3>
                                <p className="text-gray-700 leading-relaxed">
                                    You retain all rights to the photos and content you upload to Snapper. We do not claim ownership of your content.
                                    You grant us a limited license to store, process, and display your content solely to provide our services.
                                </p>
                            </div>

                            <div className="border-l-4 border-green-500 pl-6">
                                <h3 className="text-xl font-semibold text-gray-900 mb-3">License to Use</h3>
                                <p className="text-gray-700 leading-relaxed mb-4">
                                    By uploading content to Snapper, you grant us a worldwide, non-exclusive, royalty-free license to:
                                </p>
                                <ul className="list-disc list-inside text-gray-700 space-y-1">
                                    <li>Store and backup your photos</li>
                                    <li>Process images for optimization and organization</li>
                                    <li>Display your content back to you through our service</li>
                                    <li>Enable sharing features when you choose to use them</li>
                                </ul>
                            </div>

                            <div className="border-l-4 border-red-500 pl-6">
                                <h3 className="text-xl font-semibold text-gray-900 mb-3">Content Restrictions</h3>
                                <p className="text-gray-700 leading-relaxed mb-4">
                                    You agree not to upload content that:
                                </p>
                                <ul className="list-disc list-inside text-gray-700 space-y-1">
                                    <li>Violates any applicable law or regulation</li>
                                    <li>Infringes on intellectual property rights of others</li>
                                    <li>Contains malware, viruses, or harmful code</li>
                                    <li>Is offensive, abusive, or violates others' privacy</li>
                                    <li>Contains nudity involving minors</li>
                                    <li>Promotes violence, discrimination, or illegal activities</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    {/* Acceptable Use */}
                    <section className="mb-12">
                        <div className="flex items-center mb-6">
                            <AlertTriangle className="w-8 h-8 text-purple-600 mr-3" />
                            <h2 className="text-2xl font-bold text-gray-900">Acceptable Use Policy</h2>
                        </div>

                        <p className="text-gray-700 leading-relaxed mb-6">
                            You agree to use our service responsibly and in accordance with these guidelines:
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                                <h3 className="font-semibold text-gray-900 mb-3 text-green-800">✓ Permitted Uses</h3>
                                <ul className="text-gray-700 space-y-2">
                                    <li>• Personal photo organization</li>
                                    <li>• Sharing with family and friends</li>
                                    <li>• Creating photo albums and collections</li>
                                    <li>• Using sharing features as intended</li>
                                    <li>• Reasonable storage and bandwidth usage</li>
                                </ul>
                            </div>
                            <div className="bg-red-50 p-6 rounded-lg border border-red-200">
                                <h3 className="font-semibold text-gray-900 mb-3 text-red-800">✗ Prohibited Uses</h3>
                                <ul className="text-gray-700 space-y-2">
                                    <li>• Attempting to hack or breach security</li>
                                    <li>• Using automated tools to scrape content</li>
                                    <li>• Excessive bandwidth or storage abuse</li>
                                    <li>• Reselling or redistributing our service</li>
                                    <li>• Creating fake accounts or impersonating others</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    {/* Privacy and Google Drive */}
                    <section className="mb-12">
                        <div className="flex items-center mb-6">
                            <Globe className="w-8 h-8 text-purple-600 mr-3" />
                            <h2 className="text-2xl font-bold text-gray-900">Third-Party Integration</h2>
                        </div>

                        <div className="bg-blue-50 p-6 rounded-lg">
                            <h3 className="font-semibold text-gray-900 mb-4">Google Drive Integration</h3>
                            <p className="text-gray-700 leading-relaxed mb-4">
                                When you choose to import photos from Google Drive:
                            </p>
                            <ul className="list-disc list-inside text-gray-700 space-y-2">
                                <li>You authorize us to access only the photos you select for import</li>
                                <li>We comply with Google's API Services User Data Policy</li>
                                <li>You can revoke this access at any time through your Google account settings</li>
                                <li>Store your Google Drive credentials securely and encrypted as long as necessary to provide our services.</li>
                                <li>Your Google Drive access is used solely for the import functionality</li>
                            </ul>
                        </div>
                    </section>

                    {/* Payment Terms */}
                    <section className="mb-12">
                        <div className="flex items-center mb-6">
                            <Gavel className="w-8 h-8 text-purple-600 mr-3" />
                            <h2 className="text-2xl font-bold text-gray-900">Payment Terms</h2>
                        </div>

                        <div className="space-y-4">
                            <div className="border border-gray-200 rounded-lg p-6">
                                <h3 className="font-semibold text-gray-900 mb-3">Free Tier</h3>
                                <p className="text-gray-700">
                                    We offer a free tier with limited storage and features. Free accounts are subject to usage limits and may include advertisements.
                                </p>
                            </div>
                            <div className="border border-gray-200 rounded-lg p-6">
                                <h3 className="font-semibold text-gray-900 mb-3">Premium Subscriptions</h3>
                                <p className="text-gray-700 mb-3">
                                    Premium subscriptions provide additional storage, features, and ad-free experience. Subscription terms:
                                </p>
                                <ul className="list-disc list-inside text-gray-700 space-y-1">
                                    <li>Billed monthly or annually in advance</li>
                                    <li>Auto-renewal unless cancelled</li>
                                    <li>Changes to pricing with 30 days notice</li>
                                    <li>No refunds for partial months</li>
                                </ul>
                            </div>
                            <div className="border border-gray-200 rounded-lg p-6">
                                <h3 className="font-semibold text-gray-900 mb-3">Cancellation</h3>
                                <p className="text-gray-700">
                                    You may cancel your subscription at any time. Service continues until the end of your current billing period.
                                    After cancellation, your account may be downgraded to the free tier with applicable limitations.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Service Availability */}
                    <section className="mb-12">
                        <div className="flex items-center mb-6">
                            <Shield className="w-8 h-8 text-purple-600 mr-3" />
                            <h2 className="text-2xl font-bold text-gray-900">Service Availability</h2>
                        </div>

                        <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
                            <h3 className="font-semibold text-gray-900 mb-4">Service Level</h3>
                            <p className="text-gray-700 leading-relaxed mb-4">
                                While we strive to provide reliable service, we cannot guarantee 100% uptime. Our service may be temporarily unavailable due to:
                            </p>
                            <ul className="list-disc list-inside text-gray-700 space-y-2">
                                <li>Scheduled maintenance and updates</li>
                                <li>Technical issues or system failures</li>
                                <li>Third-party service dependencies</li>
                                <li>Force majeure events beyond our control</li>
                            </ul>
                            <p className="text-gray-700 leading-relaxed mt-4">
                                We will provide reasonable notice for scheduled maintenance when possible and work to minimize service disruptions.
                            </p>
                        </div>
                    </section>

                    {/* Termination */}
                    <section className="mb-12">
                        <div className="flex items-center mb-6">
                            <AlertTriangle className="w-8 h-8 text-purple-600 mr-3" />
                            <h2 className="text-2xl font-bold text-gray-900">Account Termination</h2>
                        </div>

                        <div className="space-y-4">
                            <div className="border border-gray-200 rounded-lg p-6">
                                <h3 className="font-semibold text-gray-900 mb-3">Termination by You</h3>
                                <p className="text-gray-700">
                                    You may delete your account at any time through your account settings. Upon deletion, your photos and data will be permanently removed after 24 hours, except where retention is required by law.
                                </p>
                            </div>
                            <div className="border border-gray-200 rounded-lg p-6">
                                <h3 className="font-semibold text-gray-900 mb-3">Termination by Us</h3>
                                <p className="text-gray-700 mb-3">
                                    We may suspend or terminate your account if you:
                                </p>
                                <ul className="list-disc list-inside text-gray-700 space-y-1">
                                    <li>Violate these Terms of Service</li>
                                    <li>Engage in prohibited activities</li>
                                    <li>Fail to pay subscription fees</li>
                                    <li>Use the service in a way that harms our systems or other users</li>
                                </ul>
                            </div>
                            <div className="border border-gray-200 rounded-lg p-6">
                                <h3 className="font-semibold text-gray-900 mb-3">Data Retrieval</h3>
                                <p className="text-gray-700">
                                    Before account termination, you have 24 hours to download your photos and data. After this period, all data will be permanently deleted and cannot be recovered.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Disclaimers and Limitations */}
                    <section className="mb-12">
                        <div className="flex items-center mb-6">
                            <Gavel className="w-8 h-8 text-purple-600 mr-3" />
                            <h2 className="text-2xl font-bold text-gray-900">Disclaimers and Limitations</h2>
                        </div>

                        <div className="bg-gray-50 p-6 rounded-lg space-y-4">
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-3">Service "As Is"</h3>
                                <p className="text-gray-700">
                                    Our service is provided "as is" without warranties of any kind, either express or implied. We do not guarantee that the service will be uninterrupted, secure, or error-free.
                                </p>
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-3">Limitation of Liability</h3>
                                <p className="text-gray-700">
                                    To the maximum extent permitted by law, Snapper shall not be liable for any indirect, incidental, special, or consequential damages, including but not limited to loss of profits, data, or business interruption.
                                </p>
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-3">Data Backup Responsibility</h3>
                                <p className="text-gray-700">
                                    While we implement backup procedures, you are responsible for maintaining your own backups of important photos and data. We are not liable for any data loss.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Intellectual Property */}
                    <section className="mb-12">
                        <div className="flex items-center mb-6">
                            <Shield className="w-8 h-8 text-purple-600 mr-3" />
                            <h2 className="text-2xl font-bold text-gray-900">Intellectual Property</h2>
                        </div>

                        <div className="space-y-4">
                            <div className="border border-gray-200 rounded-lg p-6">
                                <h3 className="font-semibold text-gray-900 mb-3">Our Rights</h3>
                                <p className="text-gray-700">
                                    The Snapper service, including its design, features, software, and branding, is owned by Snapper Inc. and protected by intellectual property laws. You may not copy, modify, or redistribute our service without permission.
                                </p>
                            </div>
                            <div className="border border-gray-200 rounded-lg p-6">
                                <h3 className="font-semibold text-gray-900 mb-3">DMCA Compliance</h3>
                                <p className="text-gray-700 mb-3">
                                    We respect intellectual property rights and comply with the Digital Millennium Copyright Act (DMCA). If you believe your copyrighted work has been infringed, please contact us with:
                                </p>
                                <ul className="list-disc list-inside text-gray-700 space-y-1">
                                    <li>Description of the copyrighted work</li>
                                    <li>Location of the infringing material</li>
                                    <li>Your contact information</li>
                                    <li>A statement of good faith belief</li>
                                    <li>A statement of accuracy under penalty of perjury</li>
                                    <li>Your physical or electronic signature</li>
                                </ul>
                            </div>
                            <div className="border border-gray-200 rounded-lg p-6">
                                <h3 className="font-semibold text-gray-900 mb-3">Trademark Policy</h3>
                                <p className="text-gray-700">
                                    "Snapper" and our logos are trademarks of Snapper Inc. You may not use our trademarks without prior written consent, except as necessary to identify our service.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Indemnification */}
                    <section className="mb-12">
                        <div className="flex items-center mb-6">
                            <Gavel className="w-8 h-8 text-purple-600 mr-3" />
                            <h2 className="text-2xl font-bold text-gray-900">Indemnification</h2>
                        </div>

                        <div className="bg-red-50 p-6 rounded-lg border border-red-200">
                            <p className="text-gray-700 leading-relaxed">
                                You agree to indemnify, defend, and hold harmless Snapper Inc., its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses arising out of or in any way connected with:
                            </p>
                            <ul className="list-disc list-inside text-gray-700 mt-4 space-y-2">
                                <li>Your use of our service</li>
                                <li>Your violation of these Terms</li>
                                <li>Your violation of any rights of another person or entity</li>
                                <li>Your content uploaded to our service</li>
                                <li>Any breach of your representations and warranties</li>
                            </ul>
                        </div>
                    </section>

                    {/* Governing Law */}
                    <section className="mb-12">
                        <div className="flex items-center mb-6">
                            <Globe className="w-8 h-8 text-purple-600 mr-3" />
                            <h2 className="text-2xl font-bold text-gray-900">Governing Law and Disputes</h2>
                        </div>

                        <div className="space-y-4">
                            <div className="border border-gray-200 rounded-lg p-6">
                                <h3 className="font-semibold text-gray-900 mb-3">Applicable Law</h3>
                                <p className="text-gray-700">
                                    These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to conflict of law principles.
                                </p>
                            </div>
                            <div className="border border-gray-200 rounded-lg p-6">
                                <h3 className="font-semibold text-gray-900 mb-3">Dispute Resolution</h3>
                                <p className="text-gray-700 mb-3">
                                    Any disputes arising from these Terms or your use of our service will be resolved through:
                                </p>
                                <ol className="list-decimal list-inside text-gray-700 space-y-1">
                                    <li>Good faith negotiations between the parties</li>
                                    <li>Binding arbitration if negotiations fail</li>
                                    <li>Jurisdiction in Delaware state or federal courts for any court proceedings</li>
                                </ol>
                            </div>
                            <div className="border border-gray-200 rounded-lg p-6">
                                <h3 className="font-semibold text-gray-900 mb-3">Class Action Waiver</h3>
                                <p className="text-gray-700">
                                    You agree that any arbitration or court proceeding shall be limited to the dispute between you and Snapper Inc. individually. You waive any right to participate in class action lawsuits or class-wide arbitrations.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Changes to Terms */}
                    <section className="mb-12">
                        <div className="flex items-center mb-6">
                            <FileText className="w-8 h-8 text-purple-600 mr-3" />
                            <h2 className="text-2xl font-bold text-gray-900">Changes to Terms</h2>
                        </div>

                        <div className="bg-blue-50 p-6 rounded-lg">
                            <p className="text-gray-700 leading-relaxed mb-4">
                                We reserve the right to modify these Terms at any time. When we make changes, we will:
                            </p>
                            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                                <li>Update the "Last updated" date at the top of these Terms</li>
                                <li>Post the revised Terms on our website</li>
                                <li>Send email notifications for significant changes</li>
                                <li>Provide in-app notifications when you next use our service</li>
                                <li>Allow a 30-day period for you to review changes before they take effect</li>
                            </ul>
                            <p className="text-gray-700 leading-relaxed">
                                Your continued use of our service after any modifications constitutes acceptance of the updated Terms. If you disagree with the changes, you must stop using our service and may delete your account.
                            </p>
                        </div>
                    </section>

                    {/* Contact Information */}
                    <section className="mb-12">
                        <div className="flex items-center mb-6">
                            <Users className="w-8 h-8 text-purple-600 mr-3" />
                            <h2 className="text-2xl font-bold text-gray-900">Contact Information</h2>
                        </div>

                        <div className="bg-purple-50 p-6 rounded-lg">
                            <p className="text-gray-700 leading-relaxed mb-4">
                                If you have any questions about these Terms of Service, please contact us:
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-700">
                                <div>
                                    <h4 className="font-semibold mb-2">General Inquiries / Legal Matters</h4>
                                    <p>Email: visalnaqvi@gmail.com</p>
                                    <p>Phone: +91-8920152023</p>
                                    <p>Hours: Monday-Friday, 9 AM - 6 PM IST</p>
                                </div>
                                {/* <div>
                                    <h4 className="font-semibold mb-2">Legal Matters</h4>
                                    <p>Email: legal@snapper.com</p>
                                    <p>Address: Snapper Inc., 123 Tech Street, Digital City, DC 12345</p>
                                    <p>Response Time: Within 5 business days</p>
                                </div> */}
                            </div>
                        </div>
                    </section>

                    {/* Severability */}
                    <section className="mb-12">
                        <div className="flex items-center mb-6">
                            <Gavel className="w-8 h-8 text-purple-600 mr-3" />
                            <h2 className="text-2xl font-bold text-gray-900">Miscellaneous</h2>
                        </div>

                        <div className="space-y-4">
                            <div className="border border-gray-200 rounded-lg p-6">
                                <h3 className="font-semibold text-gray-900 mb-3">Severability</h3>
                                <p className="text-gray-700">
                                    If any provision of these Terms is held to be unenforceable, the remaining provisions will continue in full force and effect.
                                </p>
                            </div>
                            <div className="border border-gray-200 rounded-lg p-6">
                                <h3 className="font-semibold text-gray-900 mb-3">Entire Agreement</h3>
                                <p className="text-gray-700">
                                    These Terms, together with our Privacy Policy, constitute the entire agreement between you and Snapper Inc. regarding your use of our service.
                                </p>
                            </div>
                            <div className="border border-gray-200 rounded-lg p-6">
                                <h3 className="font-semibold text-gray-900 mb-3">Assignment</h3>
                                <p className="text-gray-700">
                                    We may assign our rights and obligations under these Terms to any party at any time without notice to you. You may not assign your rights under these Terms without our prior written consent.
                                </p>
                            </div>
                            <div className="border border-gray-200 rounded-lg p-6">
                                <h3 className="font-semibold text-gray-900 mb-3">Waiver</h3>
                                <p className="text-gray-700">
                                    Our failure to enforce any provision of these Terms shall not constitute a waiver of that provision or any other provision of these Terms.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Summary */}
                    <section className="border-t border-gray-200 pt-8">
                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-8 rounded-lg">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">Terms Summary</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                                <div>
                                    <Users className="w-12 h-12 text-purple-600 mx-auto mb-3" />
                                    <h3 className="font-semibold text-gray-900 mb-2">Your Rights</h3>
                                    <p className="text-gray-700">You own your photos and control your privacy</p>
                                </div>
                                <div>
                                    <Shield className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                                    <h3 className="font-semibold text-gray-900 mb-2">Our Commitment</h3>
                                    <p className="text-gray-700">We provide secure, reliable photo organization</p>
                                </div>
                                <div>
                                    <Gavel className="w-12 h-12 text-pink-600 mx-auto mb-3" />
                                    <h3 className="font-semibold text-gray-900 mb-2">Fair Usage</h3>
                                    <p className="text-gray-700">Use our service responsibly and legally</p>
                                </div>
                            </div>
                            <div className="text-center mt-6">
                                <p className="text-gray-600 text-sm">
                                    By using Snapper, you agree to these terms. Questions? Contact us anytime.
                                </p>
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            {/* Footer */}
            <footer className="bg-gray-900 text-white py-8">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="flex items-center justify-center space-x-2 mb-4">
                        <Camera className="w-6 h-6 text-purple-400" />
                        <span className="text-xl font-bold">Snapper</span>
                    </div>
                    <div className="flex justify-center space-x-6 text-gray-400">
                        <a href="/snapper" className="hover:text-white transition-colors">Home</a>
                        <a href="/snapper/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</a>
                        <a href="/snapper/terms-of-service" className="hover:text-white transition-colors">Terms of Service</a>
                    </div>
                    <p className="text-gray-400 mt-4">&copy; 2025 Snapper Inc. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
};

export default TermsOfService;