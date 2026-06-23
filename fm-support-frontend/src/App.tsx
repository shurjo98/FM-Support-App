import LandingPage from "./pages/LandingPage";
import CustomerApp from "./customer/CustomerApp";
import InternalApp from "./InternalApp";

export default function App() {
  const path = window.location.pathname;

  if (path.startsWith("/customer")) return <CustomerApp />;
  if (path.startsWith("/internal")) return <InternalApp />;
  return <LandingPage />;
}
