import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  // Закрытые разделы (квиз, рейтинг, продвижение) удалены — старые ссылки ведут на главную.
  async redirects() {
    return [
      { source: "/quiz", destination: "/", permanent: true },
      { source: "/promote", destination: "/", permanent: true },
      { source: "/reyting", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;
