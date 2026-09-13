import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Default position (bottom-left) sits directly on top of Excalidraw's own
  // bottom-left controls (undo/redo, zoom) in local dev, making them look
  // broken when they're just occluded. Dev-only — doesn't render in prod.
  devIndicators: {
    position: 'top-right',
  },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'cdn.sanity.io' }],
  },
  async redirects() {
    return [
      // /library was the original URL for the public lesson catalog, renamed
      // to /public-lessons to match the "Public Lessons" naming used in the UI.
      { source: '/library', destination: '/public-lessons', permanent: true },
      // /programs was a short-lived standalone catalog page, folded into a
      // "Programs" tab on /public-lessons instead. Does not affect
      // /programs/share/[token], which is a separate, unrelated route.
      { source: '/programs', destination: '/public-lessons?tab=programs', permanent: true },
    ]
  },
};

export default nextConfig;
