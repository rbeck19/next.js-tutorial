import '@/app/ui/global.css';
import { inter } from '@/app/ui/fonts';

//Layout for all routes nested inside of app
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  );
}
