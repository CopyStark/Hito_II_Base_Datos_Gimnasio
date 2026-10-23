/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // URL por defecto del Backend en Render para producción y Vercel
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://gimnasio-backend-c3mu.onrender.com',
  },
};

module.exports = nextConfig;
