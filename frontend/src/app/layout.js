import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata = {
  title: "LakbAI Analytics",
  description:
    "A NextJS Application for Bus Transportation Analytics in Metro Manila",
  icons: {
    icon: "/lakbai-logo.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang='en'>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <link rel='icon' href='/lakbai-logo.png' type='image/png' sizes='any' />
        {children}
      </body>
    </html>
  );
}
