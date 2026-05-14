import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@arc-jumpcoin/contracts"]
};

export default nextConfig;
