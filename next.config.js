/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Type-checking and linting run locally / in CI. Skipping them in the Vercel
  // production build avoids the type-checker being OOM-killed on small build
  // machines (clean compile, silent kill at "checking validity of types").
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

module.exports = nextConfig;
