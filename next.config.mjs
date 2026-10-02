/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // نصوص الصحيحين تُقرأ من القرص في دالة الخادم، فنضمها لحزمة النشر
    outputFileTracingIncludes: { '/api/local': ['./data/sahihayn.json'] },
  },
};

export default nextConfig;
