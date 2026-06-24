export default function LandingPage() {
  return (
    <div className="landing-page">
      <img src="/public/logo/No_BG.png" alt="FM" className="landing-logo" />
      <h1>FM Support</h1>
      <p className="subtitle">Choose where you'd like to go</p>
      <div className="landing-links">
        <a className="landing-card" href="/customer">
          <h2>Customer Portal</h2>
          <p>Select your machine, describe an issue, get an AI answer</p>
        </a>
        <a className="landing-card" href="/internal">
          <h2>Internal Team Dashboard</h2>
          <p>See issues raised per factory/worker and who's assigned what</p>
        </a>
      </div>
    </div>
  );
}
