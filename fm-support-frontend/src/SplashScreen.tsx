import { useEffect, useState } from "react";

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const leaveTimer = setTimeout(() => setLeaving(true), 1300);
    const doneTimer = setTimeout(onDone, 1750);
    return () => {
      clearTimeout(leaveTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone]);

  return (
    <div className={`splash-screen ${leaving ? "splash-leaving" : ""}`}>
      <div className="splash-glow" />
      <img src="/public/logo/No_BG.png" alt="FM" className="splash-logo" />
      <div className="splash-tagline">Fast &amp; Modern</div>
    </div>
  );
}
