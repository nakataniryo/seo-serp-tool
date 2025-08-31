/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // ESLint のエラーでビルド失敗しないようにする
    ignoreDuringBuilds: true,
  },
  typescript: {
    // TypeScript の型エラーでビルド失敗しないようにする
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
