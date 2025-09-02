'use client'
import Image from 'next/image';
import './globals.css';
import { Providers } from './providers'
import { Montserrat } from 'next/font/google';
import logo from "../public/logo-white.png"
import { usePathname, useRouter } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Menu, User } from "lucide-react";
import { SideDrawer } from '@/components/SideDrawer';
import Logo from '@/components/getLogo';

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-montserrat',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(true);

  const hideHeader = pathname.startsWith('/auth');
  const isPublic = pathname.startsWith('/public')
  const isHomePage = pathname === '/';

  const handleNavigate = (target: string) => {
    router.push(target);
  };

  return (
    <html lang="en">
      <body className={`${montserrat.className} flex h-screen`}>
        <Providers>
          <Suspense fallback={<div>Loading</div>}>
            {!hideHeader && (
              <>
                {/* Header always on top */}
                <header className="bg-blue-500 flex items-center justify-between p-4 fixed w-full z-20">
                  {/* Left: ham menu + logo */}
                  <div className="flex items-center gap-4">
                    {!isHomePage && !isPublic && (
                      <button
                        onClick={() => setDrawerOpen(!drawerOpen)}
                        className="text-white hover:bg-blue-600 p-1 rounded"
                      >
                        <Menu />
                      </button>
                    )}
                    <Logo />
                  </div>

                  {/* Right: user icon */}
                  {!isPublic && <button
                    onClick={() => handleNavigate("/profile")}
                    className="text-white hover:text-gray-200 hover:bg-blue-600 p-2 rounded-full transition-colors"
                  >
                    <User size={24} />
                  </button>}
                </header>

                {/* Sidebar Drawer - only show when not on home page */}
                {!isHomePage && !isPublic && (
                  <SideDrawer
                    isOpen={drawerOpen}
                    onClose={() => setDrawerOpen(false)}
                  />
                )}

                {/* Main Content Area */}
                <main
                  className={`flex-1 overflow-y-auto pt-16 transition-all duration-300 ${!isHomePage && !isPublic && drawerOpen ? "ml-72" : "ml-0"
                    }`}
                >
                  {children}
                </main>
              </>
            )}

            {hideHeader && children}
          </Suspense>
        </Providers>
      </body>
    </html>
  );
}