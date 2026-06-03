import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
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
  metadataBase: new URL('https://edugine.app'),
  title: 'Edugine — Interactive Lessons for Online Tutors',
  description: 'Create interactive multiplayer lessons for small groups. Activity library, lesson builder and live sessions for ESL tutors and educators.',
  keywords: 'interactive lessons, collaborative learning, online tutoring tools, speaking activities, lesson builder, small group learning',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    url: 'https://edugine.app',
    siteName: 'Edugine',
    title: 'Edugine — Interactive Lessons for Online Tutors',
    description: 'Create interactive multiplayer lessons for small groups. Activity library, lesson builder and live sessions for ESL tutors.',
    images: [{ url: 'https://edugine.app/og-image.png', width: 1200, height: 630, alt: 'Edugine' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Edugine — Interactive Lessons for Online Tutors',
    description: 'Create interactive multiplayer lessons for small groups. Activity library, lesson builder and live sessions for ESL tutors.',
    images: ['https://edugine.app/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased">
        {children}
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
