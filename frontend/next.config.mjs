/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.module.rules.push({
      test: /\.geojson$/,
      type: "json", // Use the built-in JSON loader
    });
    return config;
  },
};

export default nextConfig;
