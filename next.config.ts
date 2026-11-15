import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  // Routes were renamed from Spanish to English; keep old links working.
  async redirects() {
    return [
      { source: "/mapa/resultados", destination: "/map/results", permanent: true },
      { source: "/mapa", destination: "/map", permanent: true },
      { source: "/comparar", destination: "/compare", permanent: true },
      { source: "/datos", destination: "/data", permanent: true },
      { source: "/metodologia", destination: "/methodology", permanent: true },
      { source: "/analogos/:reference/:id", destination: "/analogs/:reference/:id", permanent: true },
      { source: "/api/datos/archivo", destination: "/api/data/archive", permanent: true },
    ];
  },
};

export default nextConfig;
