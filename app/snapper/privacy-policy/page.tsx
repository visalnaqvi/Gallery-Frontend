import React from 'react';
import { Camera, ArrowLeft, Shield, Eye, Lock, Users, Database, Globe } from 'lucide-react';

const PrivacyPolicy = () => {
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
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 py-16">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <Shield className="w-16 h-16 text-white mx-auto mb-6" />
                    <h1 className="text-4xl font-bold text-white mb-4">Privacy Policy</h1>
                    <p className="text-xl text-blue-100">
                        Your privacy is our priority. Here's how we protect your data.
                    </p>
                    <p className="text-blue-200 mt-4">
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
                            <Eye className="w-8 h-8 text-blue-600 mr-3" />
                            <h2 className="text-2xl font-bold text-gray-900">Introduction</h2>
                        </div>
                        <p className="text-gray-700 leading-relaxed mb-4">
                            At Snapper, we respect your privacy and are committed to protecting your personal data.
                            This Privacy Policy explains how we collect, use, process, and share information about you
                            when you use our photo organization and sharing service.
                        </p>
                        <p className="text-gray-700 leading-relaxed">
                            By using Snapper, you agree to the collection and use of information in accordance with this policy.
                            We will not use or share your information with anyone except as described in this Privacy Policy.
                        </p>
                    </section>

                    {/* Information We Collect */}
                    <section className="mb-12">
                        <div className="flex items-center mb-6">
                            <Database className="w-8 h-8 text-blue-600 mr-3" />
                            <h2 className="text-2xl font-bold text-gray-900">Information We Collect</h2>
                        </div>

                        <div className="space-y-6">
                            <div className="border-l-4 border-blue-500 pl-6">
                                <h3 className="text-xl font-semibold text-gray-900 mb-3">Photos and Media</h3>
                                <p className="text-gray-700 leading-relaxed">
                                    We collect and store the photos and media files you upload to our service. This includes:
                                </p>
                                <ul className="list-disc list-inside text-gray-700 mt-2 space-y-1">
                                    <li>Image files you directly upload</li>
                                    <li>Images imported from Google Drive (with your permission)</li>
                                    <li>Metadata associated with your photos (EXIF data, location, date taken)</li>
                                    <li>Albums and organizational structures you create</li>
                                </ul>
                            </div>

                            <div className="border-l-4 border-green-500 pl-6">
                                <h3 className="text-xl font-semibold text-gray-900 mb-3">Account Information</h3>
                                <p className="text-gray-700 leading-relaxed">
                                    When you create an account, we collect:
                                </p>
                                <ul className="list-disc list-inside text-gray-700 mt-2 space-y-1">
                                    <li>Your email address</li>
                                    <li>Your name (if provided)</li>
                                    <li>Profile picture (if uploaded)</li>
                                    <li>Account preferences and settings</li>
                                </ul>
                            </div>

                            <div className="border-l-4 border-purple-500 pl-6">
                                <h3 className="text-xl font-semibold text-gray-900 mb-3">Usage Data</h3>
                                <p className="text-gray-700 leading-relaxed">
                                    We automatically collect information about how you use our service:
                                </p>
                                <ul className="list-disc list-inside text-gray-700 mt-2 space-y-1">
                                    <li>Device information (type, operating system, browser)</li>
                                    <li>IP address and location data</li>
                                    <li>Usage patterns and feature interactions</li>
                                    <li>Performance data and error logs</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    {/* How We Use Your Information */}
                    <section className="mb-12">
                        <div className="flex items-center mb-6">
                            <Lock className="w-8 h-8 text-blue-600 mr-3" />
                            <h2 className="text-2xl font-bold text-gray-900">How We Use Your Information</h2>
                        </div>

                        <p className="text-gray-700 leading-relaxed mb-6">
                            We use the information we collect to provide, maintain, and improve our services.
                            Specifically, we use your information to:
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-blue-50 p-6 rounded-lg">
                                <h3 className="font-semibold text-gray-900 mb-3">Core Service Functions</h3>
                                <ul className="text-gray-700 space-y-2">
                                    <li>• Organize and display your photos</li>
                                    <li>• Group photos by people using AI</li>
                                    <li>• Optimize images for different devices</li>
                                    <li>• Create and manage albums</li>
                                </ul>
                            </div>
                            <div className="bg-green-50 p-6 rounded-lg">
                                <h3 className="font-semibold text-gray-900 mb-3">Communication & Support</h3>
                                <ul className="text-gray-700 space-y-2">
                                    <li>• Send service-related notifications</li>
                                    <li>• Provide customer support</li>
                                    <li>• Respond to your inquiries</li>
                                    <li>• Send important updates</li>
                                </ul>
                            </div>
                            <div className="bg-purple-50 p-6 rounded-lg">
                                <h3 className="font-semibold text-gray-900 mb-3">Security & Safety</h3>
                                <ul className="text-gray-700 space-y-2">
                                    <li>• Protect against fraud and abuse</li>
                                    <li>• Monitor for security threats</li>
                                    <li>• Enforce our terms of service</li>
                                    <li>• Maintain service integrity</li>
                                </ul>
                            </div>
                            <div className="bg-orange-50 p-6 rounded-lg">
                                <h3 className="font-semibold text-gray-900 mb-3">Service Improvement</h3>
                                <ul className="text-gray-700 space-y-2">
                                    <li>• Analyze usage patterns</li>
                                    <li>• Develop new features</li>
                                    <li>• Improve AI algorithms</li>
                                    <li>• Enhance user experience</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    {/* Data Sharing */}
                    <section className="mb-12">
                        <div className="flex items-center mb-6">
                            <Users className="w-8 h-8 text-blue-600 mr-3" />
                            <h2 className="text-2xl font-bold text-gray-900">Data Sharing and Disclosure</h2>
                        </div>

                        <p className="text-gray-700 leading-relaxed mb-6">
                            We do not sell, rent, or trade your personal information to third parties. We may share your information only in these limited circumstances:
                        </p>

                        <div className="space-y-4">
                            <div className="border border-gray-200 rounded-lg p-6">
                                <h3 className="font-semibold text-gray-900 mb-3">With Your Consent</h3>
                                <p className="text-gray-700">
                                    When you explicitly share photos through our sharing features or grant us permission to access your Google Drive.
                                </p>
                            </div>
                            <div className="border border-gray-200 rounded-lg p-6">
                                <h3 className="font-semibold text-gray-900 mb-3">Service Providers</h3>
                                <p className="text-gray-700">
                                    With trusted third-party services that help us operate our platform (cloud storage, analytics, customer support).
                                </p>
                            </div>
                            <div className="border border-gray-200 rounded-lg p-6">
                                <h3 className="font-semibold text-gray-900 mb-3">Legal Requirements</h3>
                                <p className="text-gray-700">
                                    When required by law, court order, or to protect the rights, property, or safety of Snapper, our users, or others.
                                </p>
                            </div>
                            <div className="border border-gray-200 rounded-lg p-6">
                                <h3 className="font-semibold text-gray-900 mb-3">Business Transfers</h3>
                                <p className="text-gray-700">
                                    In connection with a merger, acquisition, or sale of assets (users will be notified via email and/or prominent notice).
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Data Security */}
                    <section className="mb-12">
                        <div className="flex items-center mb-6">
                            <Shield className="w-8 h-8 text-blue-600 mr-3" />
                            <h2 className="text-2xl font-bold text-gray-900">Data Security</h2>
                        </div>

                        <p className="text-gray-700 leading-relaxed mb-6">
                            We implement industry-standard security measures to protect your personal information:
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-gray-50 p-6 rounded-lg">
                                <h3 className="font-semibold text-gray-900 mb-3">Encryption</h3>
                                <p className="text-gray-700">All data is encrypted in transit (TLS 1.3) and at rest (AES-256)</p>
                            </div>
                            <div className="bg-gray-50 p-6 rounded-lg">
                                <h3 className="font-semibold text-gray-900 mb-3">Access Controls</h3>
                                <p className="text-gray-700">Strict access controls and authentication for all team members</p>
                            </div>
                            <div className="bg-gray-50 p-6 rounded-lg">
                                <h3 className="font-semibold text-gray-900 mb-3">Regular Audits</h3>
                                <p className="text-gray-700">Regular security audits and vulnerability assessments</p>
                            </div>
                            <div className="bg-gray-50 p-6 rounded-lg">
                                <h3 className="font-semibold text-gray-900 mb-3">Monitoring</h3>
                                <p className="text-gray-700">24/7 monitoring for suspicious activities and threats</p>
                            </div>
                        </div>
                    </section>

                    {/* Your Rights */}
                    <section className="mb-12">
                        <div className="flex items-center mb-6">
                            <Globe className="w-8 h-8 text-blue-600 mr-3" />
                            <h2 className="text-2xl font-bold text-gray-900">Your Rights and Choices</h2>
                        </div>

                        <p className="text-gray-700 leading-relaxed mb-6">
                            You have several rights regarding your personal data:
                        </p>

                        <div className="space-y-4">
                            <div className="flex items-start space-x-4 p-4 bg-blue-50 rounded-lg">
                                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-2">Access and Download</h3>
                                    <p className="text-gray-700">You can access, download, or export your photos and data at any time through your account settings.</p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-4 p-4 bg-green-50 rounded-lg">
                                <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-2">Correction and Updates</h3>
                                    <p className="text-gray-700">You can update or correct your account information and photo metadata through the app interface.</p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-4 p-4 bg-purple-50 rounded-lg">
                                <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-2">Deletion</h3>
                                    <p className="text-gray-700">You can delete individual photos, albums, or your entire account. Deleted data is permanently removed within 30 days.</p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-4 p-4 bg-orange-50 rounded-lg">
                                <div className="w-2 h-2 bg-orange-600 rounded-full mt-2"></div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-2">Privacy Controls</h3>
                                    <p className="text-gray-700">Control who can view your shared photos and manage your sharing preferences in account settings.</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Google Drive Integration */}
                    <section className="mb-12">
                        <div className="flex items-center mb-6">
                            <Database className="w-8 h-8 text-blue-600 mr-3" />
                            <h2 className="text-2xl font-bold text-gray-900">Google Drive Integration</h2>
                        </div>

                        <p className="text-gray-700 leading-relaxed mb-6">
                            When you choose to import photos from Google Drive, we:
                        </p>

                        <div className="bg-gray-50 p-6 rounded-lg space-y-4">
                            <div className="flex items-center space-x-3">
                                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                <p className="text-gray-700">Request only the minimum permissions necessary to access your photos</p>
                            </div>
                            <div className="flex items-center space-x-3">
                                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                <p className="text-gray-700">Only access files you explicitly select for import</p>
                            </div>
                            <div className="flex items-center space-x-3">
                                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                <p className="text-gray-700">Store your Google Drive credentials securely and encrypted as long as necessary to provide our services.</p>
                            </div>
                            <div className="flex items-center space-x-3">
                                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                <p className="text-gray-700">Allow you to revoke access at any time through your Google account settings</p>
                            </div>
                        </div>
                    </section>

                    {/* Data Retention */}
                    <section className="mb-12">
                        <div className="flex items-center mb-6">
                            <Lock className="w-8 h-8 text-blue-600 mr-3" />
                            <h2 className="text-2xl font-bold text-gray-900">Data Retention</h2>
                        </div>

                        <p className="text-gray-700 leading-relaxed mb-6">
                            We retain your information for as long as necessary to provide our services:
                        </p>

                        <div className="space-y-4">
                            <div className="border border-gray-200 rounded-lg p-6">
                                <h3 className="font-semibold text-gray-900 mb-3">Active Accounts</h3>
                                <p className="text-gray-700">
                                    Photos and account data are retained while your account is active and for a reasonable period thereafter.
                                </p>
                            </div>
                            <div className="border border-gray-200 rounded-lg p-6">
                                <h3 className="font-semibold text-gray-900 mb-3">Deleted Accounts</h3>
                                <p className="text-gray-700">
                                    When you delete your account, all photos and personal data are permanently deleted within 30 days, except where we're required to retain data by law.
                                </p>
                            </div>
                            <div className="border border-gray-200 rounded-lg p-6">
                                <h3 className="font-semibold text-gray-900 mb-3">Inactive Accounts</h3>
                                <p className="text-gray-700">
                                    Accounts inactive for more than 2 years may be deleted after providing 30 days notice to your email address.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Children's Privacy */}
                    {/* <section className="mb-12">
                        <div className="flex items-center mb-6">
                            <Users className="w-8 h-8 text-blue-600 mr-3" />
                            <h2 className="text-2xl font-bold text-gray-900">Children's Privacy</h2>
                        </div>

                        <p className="text-gray-700 leading-relaxed mb-4">
                            Our service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.
                        </p>
                        <p className="text-gray-700 leading-relaxed">
                            If we discover that we have collected personal information from a child under 13, we will promptly delete such information from our servers.
                        </p>
                    </section> */}

                    {/* International Users */}
                    <section className="mb-12">
                        <div className="flex items-center mb-6">
                            <Globe className="w-8 h-8 text-blue-600 mr-3" />
                            <h2 className="text-2xl font-bold text-gray-900">International Data Transfers</h2>
                        </div>

                        <p className="text-gray-700 leading-relaxed mb-4">
                            Your information may be transferred to and processed in countries other than your country of residence. These countries may have different data protection laws than your country.
                        </p>
                        <p className="text-gray-700 leading-relaxed">
                            We ensure that such transfers are made in accordance with applicable data protection laws and that appropriate safeguards are in place to protect your personal information.
                        </p>
                    </section>

                    {/* Changes to Privacy Policy */}
                    <section className="mb-12">
                        <div className="flex items-center mb-6">
                            <Eye className="w-8 h-8 text-blue-600 mr-3" />
                            <h2 className="text-2xl font-bold text-gray-900">Changes to This Privacy Policy</h2>
                        </div>

                        <p className="text-gray-700 leading-relaxed mb-4">
                            We may update this Privacy Policy from time to time. We will notify you of any changes by:
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                            <li>Posting the new Privacy Policy on this page</li>
                            <li>Updating the "Last updated" date at the top of this policy</li>
                            <li>Sending you an email notification for significant changes</li>
                            <li>Displaying an in-app notification when you next use our service</li>
                        </ul>
                        <p className="text-gray-700 leading-relaxed">
                            You are advised to review this Privacy Policy periodically for any changes. Your continued use of the service after any modifications indicates your acceptance of the updated Privacy Policy.
                        </p>
                    </section>

                    {/* Contact Information */}
                    <section className="mb-12">
                        <div className="flex items-center mb-6">
                            <Shield className="w-8 h-8 text-blue-600 mr-3" />
                            <h2 className="text-2xl font-bold text-gray-900">Contact Us</h2>
                        </div>

                        <div className="bg-blue-50 p-6 rounded-lg">
                            <p className="text-gray-700 leading-relaxed mb-4">
                                If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
                            </p>
                            <div className="space-y-2 text-gray-700">
                                <p><strong>Email:</strong>visalnaqvi@gmail.com</p>
                                <p><strong>Phone:</strong>+91 8920152023</p>
                                <p><strong>Response Time:</strong> We aim to respond to all privacy inquiries within 72 hours</p>
                            </div>
                        </div>
                    </section>

                    {/* Summary */}
                    <section className="border-t border-gray-200 pt-8">
                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-8 rounded-lg">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">Privacy Summary</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                                <div>
                                    <Shield className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                                    <h3 className="font-semibold text-gray-900 mb-2">We Protect</h3>
                                    <p className="text-gray-700">Your photos are encrypted and stored securely</p>
                                </div>
                                <div>
                                    <Eye className="w-12 h-12 text-green-600 mx-auto mb-3" />
                                    <h3 className="font-semibold text-gray-900 mb-2">We're Transparent</h3>
                                    <p className="text-gray-700">Clear policies about what we collect and why</p>
                                </div>
                                <div>
                                    <Users className="w-12 h-12 text-purple-600 mx-auto mb-3" />
                                    <h3 className="font-semibold text-gray-900 mb-2">You Control</h3>
                                    <p className="text-gray-700">Full control over your data and privacy settings</p>
                                </div>
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

export default PrivacyPolicy;