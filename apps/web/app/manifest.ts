import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Keeply · 收好",
    short_name: "Keeply · 收好",
    description: "收好网页、文档与灵感，用 AI 整理，随时找回。",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/logo-16.png",
        sizes: "16x16",
        type: "image/png",
      },
      {
        src: "/icons/logo-48.png",
        sizes: "48x48",
        type: "image/png",
      },
      {
        src: "/icons/logo-128.png",
        sizes: "128x128",
        type: "image/png",
      },
      {
        src: "/icons/logo-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/logo-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
    screenshots: [
      {
        src: "/screenshots/desktop.png",
        sizes: "3840x2307",
        type: "image/png",
        form_factor: "wide",
        label: "Keeply 收好桌面收藏库",
      },
      {
        src: "/screenshots/mobile.png",
        sizes: "692x1498",
        type: "image/png",
        form_factor: "narrow",
        label: "Keeply 收好移动收藏库",
      },
    ],
  };
}
