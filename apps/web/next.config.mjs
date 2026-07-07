/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow importing the workspace shared package.
  transpilePackages: ["@erp/shared"],
};

export default nextConfig;
