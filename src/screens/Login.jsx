import { useState } from 'react';
import { Icon } from '../components/icons.jsx';
import { Logo } from '../components/Shell.jsx';

const DOMAIN = '@futurefactor360.com';

export function Login({ onSignIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!clean.endsWith(DOMAIN)) { setError(`Use your ${DOMAIN} work email to enter the workspace.`); return; }
    if (!password) { setError('Enter your password.'); return; }
    onSignIn({ email: clean });
  };

  return (
    <main className="login">
      <section className="login-visual">
        <div className="brand" style={{ margin: 0, alignSelf: "flex-start" }}><Logo height={48} /></div>
        <div className="login-copy">
          <span className="eyebrow">GCC Business Case Builder</span>
          <h1>Build the case<br /><em>for what comes next.</em></h1>
          <p>Model headcount, compensation, real estate, technology and center operations for a new Global Capability Center, then compare scenarios and decide with confidence.</p>
        </div>
        <div className="login-steps"><span>Build</span><span>Model</span><span>Compare</span><span>Decide</span></div>
      </section>
      <section className="login-panel">
        <div className="login-card">
          <span className="eyebrow">Sign in</span>
          <h2>Welcome back.</h2>
          <p className="sub">Open your workspace to continue building the business case.</p>
          <form onSubmit={submit}>
            <label className="field">Work email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={`you${DOMAIN}`} autoComplete="username" required /></label>
            <label className="field">Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" autoComplete="current-password" required /></label>
            {error && <div className="form-error">{error}</div>}
            <button className="btn primary lg" type="submit">Enter workspace <Icon name="arrowRight" size={18} /></button>
          </form>
          <p className="login-note">Access is limited to Future Factor 360 accounts. This prototype checks the email domain only; connect it to your identity provider before wider rollout.</p>
        </div>
      </section>
    </main>
  );
}
