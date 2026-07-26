/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Batch generation of large CSVs can take a while server-side.
  // Vercel Pro/Enterprise allow longer maxDuration; Hobby caps at 60s,
  // see README "Large CSVs on Vercel Hobby" for guidance.
  experimental: {
    serverActions: {
      bodySizeLimit: '15mb'
    }
  }
};

export default nextConfig;
