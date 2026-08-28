import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Admin — Developer Assessment Platform",
  description: "Manage subjects, topics, questions, and assessments.",
};

const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem("dap:admin:theme");
    var theme = stored || "light";
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
      <body className="font-body">{children}</body>
    </html>
  );
}
