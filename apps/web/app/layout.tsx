import type { Metadata } from "next";
import { NuqsAdapter } from "nuqs/adapters/next/app";

import "@karakeep/tailwind-config/globals.css";
import "@karakeep/tailwind-config/keeply.css";
import "./keeply.css";

import type { Viewport } from "next";
import React from "react";
import Providers from "@/lib/providers";
import { getUserLocalSettings } from "@/lib/userLocalSettings/userLocalSettings";
import { getServerAuthSession } from "@/server/auth";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "sonner";

import { clientConfig } from "@karakeep/shared/config";

export const metadata: Metadata = {
  title: "Keeply · 收好",
  applicationName: "Keeply · 收好",
  description: "收好网页、文档与灵感，用 AI 整理，随时找回。",
  icons: {
    icon: [
      {
        url: "/favicon.ico?v=20261030-flat",
        type: "image/x-icon",
        sizes: "16x16 32x32",
      },
      {
        url: "/icons/logo-icon.svg?v=20261030-flat",
        type: "image/svg+xml",
        sizes: "any",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icons/logo-icon-dark.svg?v=20261030-flat",
        type: "image/svg+xml",
        sizes: "any",
        media: "(prefers-color-scheme: dark)",
      },
    ],
    apple: "/apple-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "Keeply · 收好",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Values match the `--background` token in tooling/tailwind/keeply.css.
  // These follow the OS color scheme only. An in-app theme override via
  // next-themes is not reflected here, so chrome can differ from the page
  // when a user picks a theme opposite to their system preference.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf9f5" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1b18" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerAuthSession();
  const userSettings = await getUserLocalSettings();
  const translations = {
    en: {
      translation: (await import("@/lib/i18n/locales/en/translation.json"))
        .default,
    },
    [userSettings.lang]: {
      translation: (
        await import(`@/lib/i18n/locales/${userSettings.lang}/translation.json`)
      ).default,
    },
  };
  const isRTL = userSettings.lang === "ar";
  return (
    <html
      lang={userSettings.lang}
      dir={isRTL ? "rtl" : "ltr"}
      suppressHydrationWarning
    >
      <body>
        <NuqsAdapter>
          <Providers
            session={session}
            clientConfig={clientConfig}
            userLocalSettings={userSettings}
            translations={translations}
          >
            {children}
            <ReactQueryDevtools initialIsOpen={false} />
          </Providers>
          <Toaster />
        </NuqsAdapter>
      </body>
    </html>
  );
}
