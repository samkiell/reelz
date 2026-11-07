import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  typescript: {
    // Ignore build errors during rapid local iteration
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
