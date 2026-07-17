/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@hoodwire/sdk"],
  webpack: (config) => {
    // wagmi's connector barrel re-exports the Base Account connector, whose transitive
    // @coinbase/cdp-sdk imports optional @x402/* packages that are not installed. Only
    // injected() is used here, so resolve those to empty modules rather than fail the build.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@x402/core": false,
      "@x402/evm": false,
      "@x402/svm": false,
    };
    return config;
  },
};
export default nextConfig;
