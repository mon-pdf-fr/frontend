import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Mon PDF",
  description: "Fractionner, fusionner, convertir images en PDF - Tout sur votre navigateur",
  icons: {
    icon: [
      {
        url: "/favicon.png",
        type: "image/png",
      },
    ],
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return children
}
