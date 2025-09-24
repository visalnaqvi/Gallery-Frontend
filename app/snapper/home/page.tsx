'use client'

import React, { useState } from 'react';
import { Camera, Users, Share2, Smartphone, FolderPlus, Download, Menu, X, ArrowRight, Star, Shield, Zap } from 'lucide-react';

const HomePage = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const features = [
        {
            icon: <Users className="w-8 h-8" />,
            title: "Smart People Grouping",
            description: "Automatically groups photos by the people in them using advanced AI recognition technology"
        },
        {
            icon: <Share2 className="w-8 h-8" />,
            title: "Shareable Links",
            description: "Create secure, shareable links for your images that you can send to friends and family"
        },
        {
            icon: <Smartphone className="w-8 h-8" />,
            title: "Device Optimization",
            description: "Images are automatically optimized for different devices ensuring fast loading times"
        },
        {
            icon: <FolderPlus className="w-8 h-8" />,
            title: "Album Creation",
            description: "Organize your memories into beautiful albums with custom names and descriptions"
        },
        {
            icon: <Download className="w-8 h-8" />,
            title: "Google Drive Import",
            description: "Seamlessly import your photos directly from Google Drive with just a few clicks"
        }
    ];

    const testimonials = [
        {
            name: "Sarah Johnson",
            role: "Photography Enthusiast",
            content: "Snapper has revolutionized how I organize and share my photos. The people grouping feature is absolutely incredible!",
            rating: 5
        },
        {
            name: "Mike Chen",
            role: "Family Dad",
            content: "Finally, a photo app that makes sense. I can easily share family moments without worrying about privacy.",
            rating: 5
        },
        {
            name: "Emma Davis",
            role: "Travel Blogger",
            content: "The device optimization is a game-changer. My photos load instantly on any device, anywhere in the world.",
            rating: 5
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            {/* Navigation */}
            <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center space-x-2">
                            <Camera className="w-8 h-8 text-blue-600" />
                            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                Snapper
                            </span>
                        </div>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center space-x-8">
                            <a href="#features" className="text-gray-700 hover:text-blue-600 transition-colors">Features</a>
                            <a href="#about" className="text-gray-700 hover:text-blue-600 transition-colors">About</a>
                            <a href="/snapper/privacy-policy" className="text-gray-700 hover:text-blue-600 transition-colors">Privacy Policy</a>
                            <a href="/snapper/terms-of-service" className="text-gray-700 hover:text-blue-600 transition-colors">Terms of Service</a>
                            <a href="/auth"><button className="bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700 transition-colors">
                                Get Started
                            </button>
                            </a>
                        </div>

                        {/* Mobile menu button */}
                        <button
                            className="md:hidden"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                        >
                            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>

                    {/* Mobile Navigation */}
                    {isMenuOpen && (
                        <div className="md:hidden py-4 border-t border-gray-200">
                            <div className="flex flex-col space-y-4">
                                <a href="#features" className="text-gray-700 hover:text-blue-600 transition-colors">Features</a>
                                <a href="#about" className="text-gray-700 hover:text-blue-600 transition-colors">About</a>
                                <a href="/snapper/privacy-policy" className="text-gray-700 hover:text-blue-600 transition-colors">Privacy Policy</a>
                                <a href="/snapper/terms-of-service" className="text-gray-700 hover:text-blue-600 transition-colors">Terms of Service</a>
                                <a href="/auth"><button className="bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700 transition-colors w-fit">
                                    Get Started
                                </button></a>
                            </div>
                        </div>
                    )}
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                    <div className="text-center">
                        <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6">
                            Your Photos,
                            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                                {" "}Perfectly Organized
                            </span>
                        </h1>
                        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
                            Snapper uses cutting-edge AI to automatically organize your photos by people,
                            create stunning albums, and share your memories with optimized performance across all devices.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
                            <a href="/auth">
                                <button className="bg-blue-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-blue-700 transition-all transform hover:scale-105 flex items-center gap-2 shadow-lg">
                                    Start Organizing Now
                                    <ArrowRight className="w-5 h-5" />
                                </button>
                            </a>
                            <button className="border-2 border-blue-600 text-blue-600 px-8 py-4 rounded-full text-lg font-semibold hover:bg-blue-50 transition-colors">
                                Watch Demo
                            </button>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
                            <div className="text-center">
                                <div className="text-4xl font-bold text-blue-600 mb-2">10M+</div>
                                <div className="text-gray-600">Photos Organized</div>
                            </div>
                            <div className="text-center">
                                <div className="text-4xl font-bold text-purple-600 mb-2">50K+</div>
                                <div className="text-gray-600">Happy Users</div>
                            </div>
                            <div className="text-center">
                                <div className="text-4xl font-bold text-pink-600 mb-2">99.9%</div>
                                <div className="text-gray-600">Uptime</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Background decoration */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
                    <div className="absolute top-40 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse animation-delay-2000"></div>
                    <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse animation-delay-4000"></div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-gray-900 mb-4">
                            Powerful Features for Your Photos
                        </h2>
                        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                            Everything you need to organize, optimize, and share your photo collection with ease
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {features.map((feature, index) => (
                            <div key={index} className="bg-gradient-to-br from-gray-50 to-white p-8 rounded-2xl border border-gray-200 hover:border-blue-200 hover:shadow-lg transition-all duration-300 group">
                                <div className="text-blue-600 mb-4 group-hover:scale-110 transition-transform duration-300">
                                    {feature.icon}
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                                    {feature.title}
                                </h3>
                                <p className="text-gray-600 leading-relaxed">
                                    {feature.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Testimonials Section */}
            <section className="py-20 bg-gradient-to-br from-blue-50 to-purple-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-gray-900 mb-4">
                            Loved by Photographers Everywhere
                        </h2>
                        <p className="text-xl text-gray-600">
                            See what our users are saying about Snapper
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {testimonials.map((testimonial, index) => (
                            <div key={index} className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300">
                                <div className="flex items-center mb-4">
                                    {[...Array(testimonial.rating)].map((_, i) => (
                                        <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                                    ))}
                                </div>
                                <p className="text-gray-700 mb-6 italic">
                                    "{testimonial.content}"
                                </p>
                                <div>
                                    <div className="font-semibold text-gray-900">{testimonial.name}</div>
                                    <div className="text-gray-600">{testimonial.role}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Trust Section */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                        <div className="flex flex-col items-center">
                            <Shield className="w-12 h-12 text-green-600 mb-4" />
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Privacy First</h3>
                            <p className="text-gray-600">Your photos are encrypted and stored securely with industry-leading protection</p>
                        </div>
                        <div className="flex flex-col items-center">
                            <Zap className="w-12 h-12 text-yellow-600 mb-4" />
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Lightning Fast</h3>
                            <p className="text-gray-600">Optimized performance ensures your photos load instantly on any device</p>
                        </div>
                        <div className="flex flex-col items-center">
                            <Star className="w-12 h-12 text-purple-600 mb-4" />
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">5-Star Support</h3>
                            <p className="text-gray-600">Our dedicated team is here to help you 24/7 with any questions</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
                <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
                    <h2 className="text-4xl font-bold text-white mb-6">
                        Ready to Transform Your Photo Experience?
                    </h2>
                    <p className="text-xl text-blue-100 mb-8">
                        Join thousands of users who have already revolutionized their photo management with Snapper
                    </p>
                    <a href="/auth"><button className="bg-white text-blue-600 px-8 py-4 rounded-full text-lg font-semibold hover:bg-gray-50 transition-colors transform hover:scale-105 shadow-lg">
                        Get Started for Free
                    </button>
                    </a>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 text-white py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div>
                            <div className="flex items-center space-x-2 mb-4">
                                <Camera className="w-8 h-8 text-blue-400" />
                                <span className="text-2xl font-bold">Snapper</span>
                            </div>
                            <p className="text-gray-400">
                                The ultimate photo organization and sharing platform powered by AI.
                            </p>
                        </div>

                        {/* <div>
                            <h4 className="font-semibold mb-4">Product</h4>
                            <ul className="space-y-2 text-gray-400">
                                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
                            </ul>
                        </div> */}

                        {/* <div>
                            <h4 className="font-semibold mb-4">Support</h4>
                            <ul className="space-y-2 text-gray-400">
                                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
                            </ul>
                        </div> */}

                        <div>
                            <h4 className="font-semibold mb-4">Legal</h4>
                            <ul className="space-y-2 text-gray-400">
                                <li><a href="/snapper/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</a></li>
                                <li><a href="/snapper/terms-of-service" className="hover:text-white transition-colors">Terms of Service</a></li>
                                {/* <li><a href="#" className="hover:text-white transition-colors">Cookie Policy</a></li> */}
                            </ul>
                        </div>
                    </div>

                    <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
                        <p>&copy; 2025 Snapper. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default HomePage;