/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
  },
  transpilePackages: ['antd', '@ant-design/icons'],
  experimental: {
    // Отключаем статическую генерацию для страниц, требующих клиентского рендеринга
    workerThreads: false,
    cpus: 1
  }
}

module.exports = nextConfig 