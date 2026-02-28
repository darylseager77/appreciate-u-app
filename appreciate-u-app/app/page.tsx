import Link from 'next/link'

export default function Home() {
  return (
    <div className="container" style={{ minHeight: '100vh', paddingTop: '60px' }}>
      {/* Hero Section */}
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <svg
          className="logo-bounce"
          viewBox="0 0 100 100"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            width: '100px',
            height: '100px',
            margin: '0 auto 16px',
            filter: 'drop-shadow(0 4px 12px rgba(79, 70, 229, 0.2))'
          }}
        >
          <circle cx="50" cy="50" r="48" fill="#4f46e5" opacity="0.1"/>
          <path d="M 30 45 Q 30 35, 35 35 Q 40 35, 40 45 Q 40 55, 35 55 Q 30 55, 30 45 Z" fill="#4f46e5"/>
          <path d="M 60 45 Q 60 35, 65 35 Q 70 35, 70 45 Q 70 55, 65 55 Q 60 55, 60 45 Z" fill="#4f46e5"/>
          <path d="M 25 60 Q 50 75, 75 60" stroke="#4f46e5" strokeWidth="4" fill="none" strokeLinecap="round"/>
        </svg>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '700',
          marginBottom: '16px',
          lineHeight: '1.2'
        }}>
          Appreciate U
        </h1>
        <p style={{
          fontSize: '18px',
          color: 'var(--text-secondary)',
          marginBottom: '32px'
        }}>
          Understand how your people want to be valued
        </p>
      </div>

      {/* Welcome Card */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h2 style={{
          fontSize: '22px',
          fontWeight: '600',
          marginBottom: '12px'
        }}>
          Welcome to Your Test Environment
        </h2>
        <p style={{
          color: 'var(--text-secondary)',
          marginBottom: '16px',
          fontSize: '15px'
        }}>
          This is a private testing space for your organization. Your data is completely isolated and secure.
        </p>
        <p style={{
          color: 'var(--text-secondary)',
          fontSize: '15px'
        }}>
          Ready to help your people feel valued at work?
        </p>
      </div>

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        marginBottom: '32px'
      }}>
        <Link href="/signup" className="btn btn-primary" style={{ width: '100%' }}>
          Get Started
        </Link>
        <Link
          href="/login"
          className="btn"
          style={{
            width: '100%',
            background: 'white',
            border: '2px solid var(--border)',
            color: 'var(--text-primary)'
          }}
        >
          I Already Have an Account
        </Link>
      </div>

      {/* Info Section */}
      <div style={{
        textAlign: 'center',
        padding: '24px',
        background: '#fef3c7',
        borderRadius: '12px',
        border: '2px solid #fcd34d'
      }}>
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚙️</div>
        <p style={{ fontSize: '14px', color: '#78350f' }}>
          <strong>Test Mode Active</strong><br />
          This is your private testing environment
        </p>
      </div>
    </div>
  );
}
