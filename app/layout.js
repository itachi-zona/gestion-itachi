import "./globals.css";

export const metadata = {
  title: "Streaming Manager",
  description: "Gestión de clientes, cuentas y renovaciones de streaming."
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;800&family=Rajdhani:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-base text-gray-100 font-body">{children}</body>
    </html>
  );
}
