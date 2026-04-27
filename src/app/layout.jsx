import './globals.css';

export const metadata = {
  title: 'CVC Academy — Cycle frigorifique',
  description: 'Application d’apprentissage CVC avec simulateur 3D et diagramme Mollier.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
