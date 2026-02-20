/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push("@node-rs/jieba", "@node-rs/jieba/dict", "better-sqlite3");
    }
    return config;
  },
};

export default nextConfig;
