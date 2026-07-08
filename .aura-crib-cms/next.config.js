/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Deliberately NOT output: "export" — the CMS needs a real Next.js server
  // so middleware.ts can enforce auth before a page ever renders. This is
  // the core reason the CMS is a separate deployment from the guest site.
};

export default nextConfig;
