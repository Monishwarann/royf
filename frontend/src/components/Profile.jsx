import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Plus, Heart, ShieldAlert, User as UserIcon, Mail, Settings, Bell, LogOut, ChevronRight, Activity } from 'lucide-react';

const Profile = ({ user }) => {
  const [newAllergy, setNewAllergy] = useState('');
  const [newCondition, setNewCondition] = useState('');
  const [loading, setLoading] = useState(false);
  const { updateUserData, logout } = useAuth();

  const addAllergy = async (e) => {
    e.preventDefault();
    if (!newAllergy.trim()) return;
    const updatedAllergies = [...(user?.allergies || []), newAllergy.trim().toLowerCase()];
    handleUpdate({ allergies: updatedAllergies });
    setNewAllergy('');
  };

  const removeAllergy = (index) => {
    const updatedAllergies = (user?.allergies || []).filter((_, i) => i !== index);
    handleUpdate({ allergies: updatedAllergies });
  };

  const addCondition = async (e) => {
    e.preventDefault();
    if (!newCondition.trim()) return;
    const updatedConditions = [...(user?.conditions || []), newCondition.trim().toLowerCase()];
    handleUpdate({ conditions: updatedConditions });
    setNewCondition('');
  };

  const removeCondition = (index) => {
    const updatedConditions = (user?.conditions || []).filter((_, i) => i !== index);
    handleUpdate({ conditions: updatedConditions });
  };

  const handleUpdate = async (updates) => {
    setLoading(true);
    try {
      await updateUserData(updates);
    } catch (err) {
      console.error(err);
      alert('Failed to update profile. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      logout();
    }
  };

  const [editMode, setEditMode] = useState(false);
  const [tempName, setTempName] = useState(user?.name || '');
  const [tempPhone, setTempPhone] = useState(user?.phoneNumber || '');

  React.useEffect(() => {
    if (user) {
      setTempName(user.name || '');
      setTempPhone(user.phoneNumber || '');
    }
  }, [user]);

  const savePersonalInfo = async (e) => {
    e.preventDefault();
    await handleUpdate({ name: tempName, phoneNumber: tempPhone });
    setEditMode(false);
  };

  return (
    <div className="profile-view fade-in">
      {/* User Header */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <div style={{
          width: '100px',
          height: '100px',
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
          borderRadius: '35px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          margin: '0 auto 1.5rem',
          boxShadow: '0 20px 40px var(--primary-glow)',
          border: '4px solid rgba(255, 255, 255, 0.1)',
          transform: 'rotate(-5deg)'
        }}>
          <UserIcon size={48} strokeWidth={1.5} style={{ transform: 'rotate(5deg)' }} />
        </div>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.25rem' }}>{user?.name || 'User'}</h2>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
          <Mail size={16} />
          <span style={{ fontSize: '0.9rem' }}>{user?.email || 'No email available'}</span>
        </div>
      </div>

      {/* Personal Info Section */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(99, 102, 241, 0.15)', padding: '0.5rem', borderRadius: '12px' }}>
              <UserIcon size={20} color="var(--primary)" />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Personal Information</h3>
          </div>
          {!editMode ? (
            <button
              onClick={() => {
                setTempName(user?.name || '');
                setTempPhone(user?.phoneNumber || '');
                setEditMode(true);
              }}
              className="btn-link"
              style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 700 }}
            >
              Edit
            </button>
          ) : (
            <button
              onClick={() => setEditMode(false)}
              className="btn-link"
              style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 700 }}
            >
              Cancel
            </button>
          )}
        </div>

        {editMode ? (
          <form onSubmit={savePersonalInfo} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="input-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block' }}>Full Name</label>
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '1rem 1.25rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--glass-border)',
                  color: 'white',
                  fontSize: '1rem',
                  outline: 'none'
                }}
              />
            </div>
            <div className="input-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block' }}>Phone Number</label>
              <input
                type="tel"
                placeholder="+1 234 567 890"
                value={tempPhone}
                onChange={(e) => setTempPhone(e.target.value)}
                style={{
                  width: '100%',
                  padding: '1rem 1.25rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--glass-border)',
                  color: 'white',
                  fontSize: '1rem',
                  outline: 'none'
                }}
              />
            </div>
            <button className="btn-primary" type="submit" disabled={loading} style={{ height: '50px', borderRadius: '12px' }}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Name</div>
              <div style={{ fontWeight: 600 }}>{user?.name || 'Not set'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Phone</div>
              <div style={{ fontWeight: 600 }}>{user?.phoneNumber || 'Not set'}</div>
            </div>
          </div>
        )}
      </div>

      {/* Allergies Section */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(244, 63, 94, 0.15)', padding: '0.5rem', borderRadius: '12px' }}>
              <ShieldAlert size={20} color="var(--danger)" />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Personal Allergy Profile</h3>
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--danger)', fontWeight: 800, background: 'rgba(244, 63, 94, 0.1)', padding: '2px 8px', borderRadius: '8px' }}>CRITICAL</span>
        </div>

        <form onSubmit={addAllergy} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <input
            type="text"
            placeholder="Add allergy (e.g. Peanuts, Milk)..."
            value={newAllergy}
            onChange={(e) => setNewAllergy(e.target.value)}
            style={{
              flex: 1,
              padding: '1rem 1.25rem',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--glass-border)',
              color: 'white',
              fontSize: '1rem',
              outline: 'none'
            }}
          />
          <button className="btn btn-primary" style={{ padding: '0 1.25rem' }}>
            <Plus size={24} strokeWidth={3} />
          </button>
        </form>

        <div className="tag-list" style={{ marginTop: 0 }}>
          {(user?.allergies || []).map((allergy, index) => (
            <span key={index} className="tag" style={{
              padding: '0.6rem 1.2rem',
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '14px',
              fontSize: '0.95rem',
              fontWeight: 600,
              textTransform: 'capitalize',
              border: '1px solid var(--glass-border)'
            }}>
              {allergy}
              <X
                className="tag-remove"
                size={16}
                onClick={() => removeAllergy(index)}
                style={{ marginLeft: '0.75rem', color: 'var(--danger)' }}
              />
            </span>
          ))}
        </div>
      </div>

      {/* Health Conditions Section */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(99, 102, 241, 0.15)', padding: '0.5rem', borderRadius: '12px' }}>
              <Activity size={20} color="var(--primary)" />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Health Conditions</h3>
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 800, background: 'rgba(99, 102, 241, 0.1)', padding: '2px 8px', borderRadius: '8px' }}>STABLE</span>
        </div>

        <form onSubmit={addCondition} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <input
            type="text"
            placeholder="Add condition (e.g. Diabetes, Asthma)..."
            value={newCondition}
            onChange={(e) => setNewCondition(e.target.value)}
            style={{
              flex: 1,
              padding: '1rem 1.25rem',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--glass-border)',
              color: 'white',
              fontSize: '1rem',
              outline: 'none'
            }}
          />
          <button className="btn" style={{ padding: '0 1.25rem', background: 'var(--glass)', color: 'white' }}>
            <Plus size={24} strokeWidth={3} />
          </button>
        </form>

        <div className="tag-list" style={{ marginTop: 0 }}>
          {(user?.conditions || []).map((condition, index) => (
            <span key={index} className="tag" style={{
              padding: '0.6rem 1.2rem',
              background: 'rgba(99, 102, 241, 0.1)',
              color: 'var(--primary)',
              borderRadius: '14px',
              fontSize: '0.95rem',
              fontWeight: 600,
              textTransform: 'capitalize',
              border: '1px solid rgba(99, 102, 241, 0.2)'
            }}>
              {condition}
              <X
                className="tag-remove"
                size={16}
                onClick={() => removeCondition(index)}
                style={{ marginLeft: '0.75rem' }}
              />
            </span>
          ))}
        </div>
      </div>

      {/* Settings Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
        {[
          { icon: <Bell size={20} color="var(--warning)" />, title: 'Notification Settings', count: 'Active', color: 'rgba(251, 191, 36, 0.15)' },
          { icon: <Settings size={20} color="var(--text-muted)" />, title: 'App Configuration', count: 'v1.0.4', color: 'rgba(255, 255, 255, 0.1)' }
        ].map((item, i) => (
          <div key={i} className="card" style={{
            marginBottom: 0,
            padding: '1.25rem 1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: item.color, padding: '0.5rem', borderRadius: '12px' }}>
                {item.icon}
              </div>
              <span style={{ fontWeight: 600 }}>{item.title}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span className="text-muted" style={{ fontSize: '0.85rem' }}>{item.count}</span>
              <ChevronRight size={18} className="text-muted" />
            </div>
          </div>
        ))}
      </div>

      <button className="btn" onClick={handleSignOut} style={{
        width: '100%',
        marginTop: '3rem',
        background: 'rgba(244, 63, 94, 0.1)',
        color: 'var(--danger)',
        border: '1px solid rgba(244, 63, 94, 0.2)',
        height: '60px'
      }}>
        <LogOut size={20} />
        Sign Out Securely
      </button>
    </div>
  );
};

export default Profile;
