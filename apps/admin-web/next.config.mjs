/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@dap/types", "@dap/shared"],
};

export default nextConfig;
