import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from '@/components/auth/AuthProvider'
import { ToastProvider } from '@/components/ui/toast'
import { UseApplyUISettings } from '@/components/settings/useApplyUISettings'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bmar Movies",
  description: "Your ultimate destination for streaming movies and TV shows with Torrentio and Torbox integration",
};

// Force dynamic rendering to avoid static generation issues encountered during build
export const dynamic = 'force-dynamic'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white`}>
        <AuthProvider>
          <ToastProvider>
            <UseApplyUISettings />
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
