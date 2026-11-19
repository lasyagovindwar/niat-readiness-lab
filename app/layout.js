import './globals.css';

export const metadata = { title: 'Readiness Lab (unofficial prototype)', description: 'Free aptitude practice in English, Telugu and Hindi.' };

export default function RootLayout({ children }) {
  return (<html lang="en"><body>{children}</body></html>);
}
