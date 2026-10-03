/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // متون الكتب الستة ونص المصحف تُقرأ من القرص في دالة الخادم، فنضمها لحزمة النشر
    outputFileTracingIncludes: { '/api/local': ['./data/books.json'], '/api/quran': ['./data/quran.json'] },
  },
};

export default nextConfig;
