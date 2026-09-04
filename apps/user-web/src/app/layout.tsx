import type { Metadata } from "next";
import "./globals.css";

// Deliberately using a system-font stack rather than next/font/google:
// it removes a network dependency at build time and keeps the app fast
// and reliable everywhere, including offline/self-hosted setups.

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
  title: {
    default: "Developer Assessment Platform | Practice Coding Skills",
    template: "%s | Developer Assessment Platform",
  },
  description:
    "Practice real programming problems across JavaScript, React, TypeScript, and SQL — MCQs, theory, code-output, and debugging questions. No sign-up. Instant grading. Private progress tracking.",
  openGraph: {
    title: "Developer Assessment Platform",
    description: "Test your knowledge. Practice real programming concepts.",
    url: "/",
    siteName: "Developer Assessment Platform",
    images: [
      {
        url: "/image.png",
        width: 1200,
        height: 630,
        alt: "Developer Assessment Platform",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Developer Assessment Platform",
    description: "Test your knowledge. Practice real programming concepts.",
    images: ["/image.png"],
  },
};

// Prevents a flash of the wrong theme by reading localStorage before paint.
const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem("dap:theme");
    var theme = stored || "dark";
    if (theme === "dark") document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="font-body">
        {children}
      </body>
    </html>
  );
}
