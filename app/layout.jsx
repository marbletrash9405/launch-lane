import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { site } from "@/lib/site";

export const metadata = {
  title: { default: `${site.name} — ${site.community}`, template: `%s · ${site.name}` },
  description: `${site.tagline} A neighborhood board where ${site.community} students offer services and residents post requests.`,
};

export const viewport = { themeColor: "#144d48" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Alfa+Slab+One&family=Lexend:wght@300;400;500&display=swap"
        />
      </head>
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
