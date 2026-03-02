import './globals.css';
import Navbar from '../components/Navbar';
import { AppProvider } from '../context/AppContext';

export const metadata = {
  title: 'FindH | Match with the best Rental Agents',
  description: 'Geo-location based matching connecting nearby rental agents with tenants seamlessly.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AppProvider>
          <Navbar />
          <main className="page-wrapper animate-fade-in">
            {children}
          </main>
        </AppProvider>
      </body>
    </html>
  );
}
