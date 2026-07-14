import { Routes, Route } from 'react-router-dom';
import { useTheme } from './context/ThemeContext.jsx';
import './index.css';

import Navbar from './components/Navbar';
import Hero from './components/Hero';
import TrustedBy from './components/TrustedBy';
import Features from './components/Features';
import HowItWorks from './components/HowItWorks';
import DashboardShowcase from './components/DashboardShowcase';
import Benefits from './components/Benefits';
import Pricing from './components/Pricing';
import Testimonials from './components/Testimonials';
import FAQ from './components/FAQ';
import FinalCTA from './components/FinalCTA';
import Footer from './components/Footer';

import SignUp from './pages/SignUp';
import Login from './pages/Login';

function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  return (
    <>
      <Navbar theme={theme} toggleTheme={toggleTheme} />
      <main>
        <Hero />
        <TrustedBy />
        <Features />
        <HowItWorks />
        <DashboardShowcase />
        <Benefits />
        <Pricing />
        <Testimonials />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/"        element={<LandingPage />} />
      <Route path="/signup"  element={<SignUp />} />
      <Route path="/login"   element={<Login />} />
    </Routes>
  );
}
