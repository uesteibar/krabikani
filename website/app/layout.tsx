import type { Metadata } from 'next';
import Script from 'next/script';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://unai-dogfood-krabikani.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Krabikani — Android app for WaniKani reviews and lessons',
    template: '%s | Krabikani',
  },
  description:
    'Krabikani is a fast Android companion app for WaniKani with offline study, review flow, lessons, search, notifications, and a focused mobile interface.',
  keywords: [
    'WaniKani Android app',
    'Android app for WaniKani',
    'WaniKani mobile app',
    'WaniKani alternative',
    'WaniKani reviews Android',
    'WaniKani lessons Android',
    'Japanese kanji app Android',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Krabikani — Android app for WaniKani',
    description:
      'A mobile-first WaniKani companion for Android, built for focused reviews, lessons, search, and offline study.',
    url: '/',
    siteName: 'Krabikani',
    images: [
      {
        url: '/images/og.png',
        width: 1200,
        height: 630,
        alt: 'Krabikani Android app for WaniKani',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Krabikani — Android app for WaniKani',
    description:
      'A mobile-first WaniKani companion for Android, built for focused reviews, lessons, search, and offline study.',
    images: ['/images/og.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Script
          src="https://rybbit.uesteibar.com/api/script.js"
          data-site-id="cb17772c096c"
          strategy="afterInteractive"
        />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
