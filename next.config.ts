import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/room/:code",
        destination: "/draw-n-guess/room/:code",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;