import type { Metadata, Viewport } from 'next';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { LanguageProvider } from '../lib/i18n/index.tsx';
import './globals.css';

export const metadata: Metadata = {
  title: 'بيّنة | Bayyinah — قبل أن تنشر… تبيّن',
  description:
    'تحقق من الأحاديث والعبارات الدينية المتداولة خلال ثوانٍ، بالاعتماد على الموسوعة الحديثية في الدرر السنية وتقنيات الذكاء الاصطناعي. ست لغات.',
  manifest: '/manifest.webmanifest',
  applicationName: 'بيّنة',
  appleWebApp: { capable: true, title: 'بيّنة', statusBarStyle: 'black-translucent' },
  icons: { icon: '/favicon.png', apple: '/apple-touch-icon.png' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#2e2452',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" data-lang="ar">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=Noto+Kufi+Arabic:wght@600;800&family=Noto+Naskh+Arabic:wght@400;600;700&display=swap"
        />
      </head>
      <body>
        <LanguageProvider>
          <a href="#main" className="sr-only skip">
            Skip / تخطَّ
          </a>
          <Navbar />
          <main id="main">{children}</main>
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  );
}
