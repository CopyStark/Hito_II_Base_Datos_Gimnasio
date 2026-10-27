/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // URL por defecto del Backend en Render para producción y Vercel
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.VERCEL || !process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL.includes('localhost')
        ? 'https://gimnasio-backend-c3mu.onrender.com'
        : process.env.NEXT_PUBLIC_API_URL,
  },
};

module.exports = nextConfig;
