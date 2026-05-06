import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Scan, History, ShieldCheck, HeartPulse } from 'lucide-react';

const Dashboard = ({ user }) => {
  const navigate = useNavigate();
  const [history, setHistory] = React.useState([]);

  React.useEffect(() => {
    const savedHistory = JSON.parse(localStorage.getItem('trustbite_history') || '[]');
    setHistory(savedHistory.slice(0, 3));
  }, []);

  const stats = [
    { label: 'Total Scans', value: history.length, icon: <History className="text-primary" /> },
    { label: 'Safety Rating', value: 'High', icon: <ShieldCheck className="text-success" /> },
    { label: 'Allergies', value: user?.allergies?.length || 0, icon: <HeartPulse className="text-danger" /> }
  ];

  return (
    <div className="dashboard-view">
      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', fontWeight: 800 }}>Hey, {user?.name?.split(' ')[0] || 'User'}!</h1>
      <p className="text-muted" style={{ marginBottom: '2.5rem' }}>Check your food safety instantly.</p>

      <div className="dashboard-grid">
        <div className="dashboard-main">
          <div style={{ 
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
            padding: '2.5rem 2rem',
            borderRadius: 'var(--radius)',
            color: 'white',
            marginBottom: '2rem',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 10px 40px rgba(99, 102, 241, 0.4)'
          }}>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <h2 style={{ marginBottom: '0.75rem', fontSize: '1.5rem' }}>AI Safety Scan</h2>
              <p style={{ opacity: 0.9, marginBottom: '1.75rem', fontSize: '0.9rem', maxWidth: '240px' }}>Real-time allergen detection from Open Food Facts.</p>
              <button 
                className="btn" 
                style={{ background: 'rgba(255,255,255,0.2)', color: 'white', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.3)' }}
                onClick={() => navigate('/scan')}
              >
                <Scan size={20} />
                Start Scanning
              </button>
            </div>
            <Scan size={160} style={{ 
              position: 'absolute', 
              right: '-30px', 
              bottom: '-30px', 
              opacity: 0.15,
              transform: 'rotate(-15deg)',
              filter: 'blur(1px)'
            }} />
          </div>

          <div className="stat-grid">
            {stats.map((stat, i) => (
              <div key={i} className="card" style={{ marginBottom: 0, padding: '1.25rem' }}>
                <div style={{ marginBottom: '0.75rem' }}>{stat.icon}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stat.value}</div>
                <div className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
              </div>
            ))}
          </div>

          <h3 style={{ marginBottom: '1rem' }}>Quick Test Barcodes</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            {[
              { name: 'Nutella (Has Milk/Nuts)', code: '3017620422003' },
              { name: 'Coca-Cola (Soda)', code: '5449000000996' },
              { name: 'Oreo (Has Wheat/Soy)', code: '7622210449283' }
            ].map((item, i) => (
              <div 
                key={i} 
                className="card" 
                onClick={() => navigate(`/scan?barcode=${item.code}`)}
                style={{ 
                  marginBottom: 0, 
                  padding: '1rem', 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(255,255,255,0.03)',
                  cursor: 'pointer'
                }}
              >
                <span style={{ fontSize: '0.85rem', color: 'var(--text)', fontWeight: 500 }}>{item.name}</span>
                <code style={{ 
                  background: 'rgba(99, 102, 241, 0.1)', 
                  color: '#818cf8', 
                  padding: '4px 8px', 
                  borderRadius: '6px', 
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  border: '1px solid rgba(99, 102, 241, 0.2)'
                }}>
                  {item.code}
                </code>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-side">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Recent Activity</h3>
            {history.length > 0 && (
              <button 
                onClick={() => navigate('/history')}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', textTransform: 'uppercase' }}
              >
                View All
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {history.length > 0 ? (
              history.map((item) => (
                <div key={item.id} className="card" style={{ 
                  marginBottom: 0, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1rem',
                  padding: '0.875rem'
                }}>
                  {item.image ? (
                    <img src={item.image} alt={item.name} style={{ width: '44px', height: '44px', objectFit: 'contain', borderRadius: '10px', background: 'white', padding: '2px' }} />
                  ) : (
                    <div style={{ width: '44px', height: '44px', background: 'var(--glass)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                       <ShieldCheck size={20} className="text-muted" />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ fontSize: '0.85rem', marginBottom: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }}>{item.name}</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ 
                        fontSize: '0.65rem', 
                        padding: '1px 6px', 
                        borderRadius: '6px',
                        background: item.isSafe ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                        color: item.isSafe ? 'var(--success)' : 'var(--danger)',
                        fontWeight: 700
                      }}>
                        {item.isSafe ? 'SAFE' : 'WARNING'}
                      </span>
                      <span className="text-muted" style={{ fontSize: '0.65rem' }}>
                        {new Date(item.date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="card" style={{ textAlign: 'center', padding: '4rem 1.5rem', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ background: 'var(--glass)', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                  <ShieldCheck size={20} className="text-muted" />
                </div>
                <p className="text-muted" style={{ fontSize: '0.85rem' }}>No recent scans. Your history will appear here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
