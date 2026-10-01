import type { Metadata, Viewport } from 'next';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import './globals.css';

export const metadata: Metadata = {
  title: 'تثبّت — قبل أن تنشر',
  description:
    'تحقق من الأحاديث والعبارات الدينية المتداولة خلال ثوانٍ، بالاعتماد على مصادر حديثية موثوقة وتقنيات الذكاء الاصطناعي.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f3d2e',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Aref+Ruqaa:wght@400;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>
        <a href="#main" className="sr-only">
          تخطَّ إلى المحتوى
        </a>
        <Navbar />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
