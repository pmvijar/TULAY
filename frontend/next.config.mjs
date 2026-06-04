/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.module.rules.push({
      test: /\.geojson$/,
      type: "json", // Use the built-in JSON loader
    });
    return config;
  },
  // TULAY ships as a focused GIS app; open on the accessibility map.
  // (The legacy login at "/" is preserved in code; this redirect is reversible.)
  async redirects() {
    return [{ source: "/", destination: "/pam", permanent: false }];
  },
};

export default nextConfig;
