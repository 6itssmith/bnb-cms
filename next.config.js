/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Static export for Cloudflare Pages. There is no server at runtime —
  // auth gating that used to live in middleware.ts now happens client-side
  // (see lib/StaffProfileContext.tsx + components/RequireAuth.tsx), backed
  // by Row Level Security as the actual enforcement layer, same as before.
  output: "export",
  images: {
    // next/image's optimizer needs a server; unoptimized just serves the
    // original file. Not currently used in this app, but safe to have set.
    unoptimized: true,
  },
};

export default nextConfig;
