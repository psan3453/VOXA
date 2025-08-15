import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Voxa",
  description: "AI-powered podcast platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-900 text-white`}
      >
        {/* Shared Navbar */}
        <nav className="flex justify-between items-center px-8 py-4 bg-gray-800">
          <h1 className="text-2xl font-bold">🎙 Voxa</h1>
          <div className="space-x-6">
            <Link href="/" className="hover:underline">
              Home
            </Link>
            <Link href="/about" className="hover:underline">
              About
            </Link>
            <Link href="/record" className="hover:underline">
              Record
            </Link>
          </div>
        </nav>

        {/* Page Content */}
        <main className="p-8">{children}</main>
      </body>
    </html>
  );
}
