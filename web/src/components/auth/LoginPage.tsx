import { useState } from 'react'

type Step = 'email' | 'otp' | 'sent'

export function LoginPage() {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setError('')
    setLoading(true)
    // Redirect to Keycloak OIDC login (it will show our themed OTP flow)
    window.location.href = `/auth/login?login_hint=${encodeURIComponent(email)}`
  }

  function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (otp.length < 6) { setError('Enter the 6-digit code'); return }
    setLoading(true)
    setError('')
    // In production this is handled by Keycloak's OTP form
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0d1117',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      padding: '16px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        background: '#161b22',
        border: '1px solid rgba(240,246,252,0.1)',
        borderRadius: '12px',
        padding: '40px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}>

        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px', gap: '12px' }}>
          <div style={{
            width: '48px', height: '48px',
            background: '#10b981',
            borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
              <path d="M2 12h20"/>
            </svg>
          </div>
          <span style={{ fontSize: '20px', fontWeight: 700, color: '#e6edf3', letterSpacing: '-0.3px' }}>Kube Center</span>
        </div>

        {step === 'email' && (
          <>
            <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#e6edf3', textAlign: 'center', marginBottom: '6px' }}>
              Sign in
            </h1>
            <p style={{ fontSize: '13px', color: '#8b949e', textAlign: 'center', marginBottom: '28px' }}>
              We'll send a one-time code to your email
            </p>

            <form onSubmit={handleEmailSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#8b949e', marginBottom: '6px', letterSpacing: '0.02em' }}>
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  autoFocus
                  required
                  style={{
                    width: '100%', background: '#1c2128', border: '1px solid rgba(240,246,252,0.1)',
                    borderRadius: '8px', color: '#e6edf3', fontSize: '14px', padding: '10px 12px',
                    outline: 'none', boxSizing: 'border-box',
                  }}
                  onFocus={e => e.target.style.borderColor = '#10b981'}
                  onBlur={e => e.target.style.borderColor = 'rgba(240,246,252,0.1)'}
                />
              </div>

              {error && (
                <div style={{ background: 'rgba(248,81,73,0.08)', border: '1px solid rgba(248,81,73,0.25)', borderRadius: '7px', padding: '10px 14px', fontSize: '13px', color: '#ffa198', marginBottom: '14px' }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                style={{
                  width: '100%', background: loading ? '#059669' : '#10b981', color: '#fff',
                  border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600,
                  padding: '11px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.8 : 1,
                  transition: 'background 0.15s',
                }}
              >
                {loading ? 'Redirecting…' : 'Continue with email →'}
              </button>
            </form>

            <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(240,246,252,0.08)', textAlign: 'center', fontSize: '13px', color: '#8b949e' }}>
              No account?{' '}
              <a href="/signup" style={{ color: '#10b981', textDecoration: 'none' }}>Create one</a>
            </div>
          </>
        )}

        {step === 'sent' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>📬</div>
              <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#e6edf3', marginBottom: '8px' }}>Check your email</h1>
              <p style={{ fontSize: '13px', color: '#8b949e', lineHeight: '1.6' }}>
                We sent a 6-digit code to<br/>
                <strong style={{ color: '#e6edf3' }}>{email}</strong>
              </p>
            </div>

            <form onSubmit={handleOtpSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#8b949e', marginBottom: '6px' }}>
                  One-time code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  autoFocus
                  style={{
                    width: '100%', background: '#1c2128', border: '1px solid rgba(240,246,252,0.1)',
                    borderRadius: '8px', color: '#e6edf3', fontSize: '28px', fontWeight: 700,
                    padding: '12px', outline: 'none', boxSizing: 'border-box',
                    textAlign: 'center', letterSpacing: '0.4em',
                  }}
                  onFocus={e => e.target.style.borderColor = '#10b981'}
                  onBlur={e => e.target.style.borderColor = 'rgba(240,246,252,0.1)'}
                />
              </div>

              {error && (
                <div style={{ background: 'rgba(248,81,73,0.08)', border: '1px solid rgba(248,81,73,0.25)', borderRadius: '7px', padding: '10px 14px', fontSize: '13px', color: '#ffa198', marginBottom: '14px' }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || otp.length < 6}
                style={{
                  width: '100%', background: '#10b981', color: '#fff',
                  border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600,
                  padding: '11px', cursor: otp.length < 6 ? 'not-allowed' : 'pointer',
                  opacity: otp.length < 6 ? 0.5 : 1, transition: 'opacity 0.15s',
                }}
              >
                {loading ? 'Verifying…' : 'Sign in'}
              </button>
            </form>

            <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px', color: '#8b949e' }}>
              Wrong email?{' '}
              <button
                onClick={() => { setStep('email'); setOtp(''); setError('') }}
                style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', fontSize: '13px', padding: 0 }}
              >
                Go back
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    window.location.href = `/auth/login?login_hint=${encodeURIComponent(email)}`
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0d1117',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      padding: '16px',
    }}>
      <div style={{
        width: '100%', maxWidth: '400px',
        background: '#161b22', border: '1px solid rgba(240,246,252,0.1)',
        borderRadius: '12px', padding: '40px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px', gap: '12px' }}>
          <div style={{ width: '48px', height: '48px', background: '#10b981', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
              <path d="M2 12h20"/>
            </svg>
          </div>
          <span style={{ fontSize: '20px', fontWeight: 700, color: '#e6edf3', letterSpacing: '-0.3px' }}>Kube Center</span>
        </div>

        <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#e6edf3', textAlign: 'center', marginBottom: '6px' }}>
          Create your account
        </h1>
        <p style={{ fontSize: '13px', color: '#8b949e', textAlign: 'center', marginBottom: '28px' }}>
          Your admin will assign you to a project
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#8b949e', marginBottom: '6px' }}>Full name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Jane Smith"
              required
              style={{ width: '100%', background: '#1c2128', border: '1px solid rgba(240,246,252,0.1)', borderRadius: '8px', color: '#e6edf3', fontSize: '14px', padding: '10px 12px', outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = '#10b981'}
              onBlur={e => e.target.style.borderColor = 'rgba(240,246,252,0.1)'}
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#8b949e', marginBottom: '6px' }}>Work email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              style={{ width: '100%', background: '#1c2128', border: '1px solid rgba(240,246,252,0.1)', borderRadius: '8px', color: '#e6edf3', fontSize: '14px', padding: '10px 12px', outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = '#10b981'}
              onBlur={e => e.target.style.borderColor = 'rgba(240,246,252,0.1)'}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !email || !name}
            style={{ width: '100%', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, padding: '11px', cursor: 'pointer', opacity: (!email || !name) ? 0.5 : 1 }}
          >
            {loading ? 'Redirecting…' : 'Create account →'}
          </button>

          <p style={{ fontSize: '11px', color: '#484f58', textAlign: 'center', marginTop: '14px', lineHeight: '1.5' }}>
            By signing up you'll receive a verification code by email. Your admin approves access.
          </p>
        </form>

        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(240,246,252,0.08)', textAlign: 'center', fontSize: '13px', color: '#8b949e' }}>
          Already have an account?{' '}
          <a href="/login" style={{ color: '#10b981', textDecoration: 'none' }}>Sign in</a>
        </div>
      </div>
    </div>
  )
}

export function PendingApprovalPage() {
  return (
    <div style={{
      minHeight: '100vh', background: '#0d1117',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      padding: '16px',
    }}>
      <div style={{
        width: '100%', maxWidth: '420px', background: '#161b22',
        border: '1px solid rgba(240,246,252,0.1)', borderRadius: '12px',
        padding: '40px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', textAlign: 'center',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
        <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#e6edf3', marginBottom: '10px' }}>
          Waiting for approval
        </h1>
        <p style={{ fontSize: '13px', color: '#8b949e', lineHeight: '1.7', marginBottom: '28px' }}>
          Your account is created. A super admin will assign you to a project — you'll receive an email once access is granted.
        </p>

        <div style={{ textAlign: 'left', background: '#1c2128', borderRadius: '8px', padding: '16px 20px', marginBottom: '24px' }}>
          {[
            ['✓', 'Account created', '#10b981'],
            ['→', 'Admin assigns you to a project', '#f59e0b'],
            ['○', 'You get an email invite', '#484f58'],
            ['○', 'Start using Kube Center', '#484f58'],
          ].map(([icon, label, color]) => (
            <div key={label as string} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', fontSize: '13px' }}>
              <span style={{ color: color as string, width: '16px', flexShrink: 0 }}>{icon}</span>
              <span style={{ color: '#8b949e' }}>{label}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => window.location.reload()}
          style={{ background: '#1c2128', color: '#8b949e', border: '1px solid rgba(240,246,252,0.1)', borderRadius: '8px', fontSize: '13px', padding: '9px 20px', cursor: 'pointer' }}
        >
          Refresh status
        </button>
      </div>
    </div>
  )
}
