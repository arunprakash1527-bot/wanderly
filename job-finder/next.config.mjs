/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.greenhouse.io" },
      { protocol: "https", hostname: "logo.clearbit.com" },
      { protocol: "https", hostname: "**.lever.co" },
      { protocol: "https", hostname: "**.ashbyhq.com" },
    ],
  },
  experimental: { serverActions: { bodySizeLimit: "10mb" } },
};
export default nextConfig;
