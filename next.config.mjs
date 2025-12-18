/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. Increase the timeout to 300 seconds (5 minutes)
  staticPageGenerationTimeout: 300, 
  
  experimental: {
    serverActions: {
      // 2. Allow large video uploads (50MB)
      bodySizeLimit: '50mb', 
      allowedOrigins: ["localhost:3000"]
    },
  },
};

export default nextConfig;