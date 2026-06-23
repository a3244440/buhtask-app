import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    '/api/document-export': ['./templates/**/*'],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
