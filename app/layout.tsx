'use client'

import Image from 'next/image';
import './globals.css';
import { Providers } from './providers'
import { Montserrat } from 'next/font/google';
import logo from "../public/logo-white.png"
import { usePathname, useSearchParams, useRouter } from 'next/navigation';

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-montserrat',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const groupId = searchParams.get("groupId");
  const personId = searchParams.get("personId");
  const hideHeader = pathname.startsWith('/auth');

  const handleNavigate = (target: string) => {
    router.push(target);
  };

  return (
    <html lang="en">
      <body className={montserrat.className}>
        {!hideHeader && (
          <header className="bg-blue-500 flex items-center p-4 justify-between">
            <Image src={logo} alt="logo" width={150} height={600} />

            <div className="flex items-center gap-2">
              {/* All Groups button, hide only on home page */}
              {pathname !== '/' && (
                <button
                  onClick={() => handleNavigate("/")}
                  className="px-4 py-2 bg-white text-blue-500 rounded-lg shadow hover:bg-gray-100"
                >
                  All Groups
                </button>
              )}

              {/* Show People button if on gallery */}
              {pathname.startsWith("/gallery") && groupId && (
                <button
                  onClick={() => handleNavigate(`/persons?groupId=${groupId}`)}
                  className="px-4 py-2 bg-white text-blue-500 rounded-lg shadow hover:bg-gray-100"
                >
                  People
                </button>
              )}
              {pathname.startsWith("/gallery") && groupId && (
                <button
                  onClick={() => handleNavigate(`/similar-faces?groupId=${groupId}`)}
                  className="px-4 py-2 bg-white text-blue-500 rounded-lg shadow hover:bg-gray-100"
                >
                  Similar Faces
                </button>
              )}
              {/* Show Images button if on persons page OR personId exists */}
              {(pathname.startsWith("/persons") || personId) && groupId && (
                <button
                  onClick={() => handleNavigate(`/gallery?groupId=${groupId}`)}
                  className="px-4 py-2 bg-white text-blue-500 rounded-lg shadow hover:bg-gray-100"
                >
                  All Images
                </button>
              )}
            </div>
          </header>
        )}

        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
