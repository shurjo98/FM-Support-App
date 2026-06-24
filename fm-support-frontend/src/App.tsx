import { useState } from "react";
import LandingPage from "./pages/LandingPage";
import CustomerApp from "./customer/CustomerApp";
import InternalApp from "./InternalApp";
import SplashScreen from "./SplashScreen";

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const path = window.location.pathname;

  if (showSplash) {
    return <SplashScreen onDone={() => setShowSplash(false)} />;
  }

  if (path.startsWith("/customer")) return <CustomerApp />;
  if (path.startsWith("/internal")) return <InternalApp />;
  return <LandingPage />;
}
