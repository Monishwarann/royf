import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import axios from 'axios';
import { AlertTriangle, CheckCircle, XCircle, Info, Camera, ListFilter, ShoppingBag, Zap, Maximize } from 'lucide-react';

const Scanner = ({ user }) => {
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const scannerRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const barcode = params.get('barcode');

    if (barcode && user && !scanResult && !loading) {
      handleScan(barcode);
    }

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(err => console.error(err));
      }
    };
  }, [location.search, user]);

  const startCamera = async () => {
    setError(null);
    try {
      // 1. Specify all supported formats for maximum detection accuracy
      const formatsToSupport = [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.CODE_93,
        Html5QrcodeSupportedFormats.ITF,
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.DATA_MATRIX,
        Html5QrcodeSupportedFormats.PDF_417
      ];

      const html5QrCode = new Html5Qrcode("reader", { formatsToSupport });
      scannerRef.current = html5QrCode;
      
      const config = { 
        fps: 25, 
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          // Dynamic box sizing for different screens
          const width = Math.min(viewfinderWidth * 0.85, 450);
          const height = Math.min(viewfinderHeight * 0.35, 250);
          return { width, height };
        },
        aspectRatio: 1.0,
        // Request high resolution for better 1D barcode detection
        videoConstraints: {
          facingMode: "environment",
          width: { min: 1280, ideal: 1920 },
          height: { min: 720, ideal: 1080 }
        }
      };

      await html5QrCode.start(
        { facingMode: "environment" }, 
        config, 
        (decodedText) => {
          if (navigator.vibrate) navigator.vibrate(120);
          stopCamera();
          handleScan(decodedText);
        }, 
        () => {} // Silent on scan failures
      );

      setCameraActive(true);
      
      // Check for torch capability
      const track = html5QrCode.getRunningTrack();
      if (track && track.getCapabilities) {
        const capabilities = track.getCapabilities();
        setHasTorch(!!capabilities.torch);
      }

    } catch (err) {
      console.error("[Scanner] Camera error:", err);
      setError("Could not access camera. Ensure you've granted permissions and are using a secure (HTTPS) connection.");
    }
  };

  const toggleTorch = async () => {
    if (scannerRef.current && hasTorch) {
      try {
        const newState = !torchOn;
        await scannerRef.current.applyVideoConstraints({
          advanced: [{ torch: newState }]
        });
        setTorchOn(newState);
      } catch (err) {
        console.error("Torch error:", err);
      }
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        setCameraActive(false);
        setTorchOn(false);
      } catch (err) {
        console.error("Stop error:", err);
      }
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setLoading(true);
    setError(null);
    setScanResult(null);

    const formData = new FormData();
    formData.append('image', file);
    if (user && user.allergies) {
      formData.append('allergies', user.allergies.join(','));
    }
    if (user && user.diet) {
      formData.append('diet', user.diet);
    }

    try {
      if (cameraActive) await stopCamera();

      console.log("[Scanner] Uploading for intensive backend decoding...");
      const response = await axios.post('/_/backend/scan-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setScanResult(response.data);
      saveToHistory(response.data);

    } catch (err) {
      console.error("[Scanner] Image upload scan error:", err);
      setError(err.response?.data?.message || "No clear barcode detected. Try taking a photo from a different angle or with better lighting.");
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async (barcode) => {
    if (!barcode) return;
    
    setLoading(true);
    setError(null);
    try {
      const allergyList = (user && user.allergies) ? user.allergies.join(',') : '';
      const diet = (user && user.diet) ? user.diet : 'none';
      const response = await axios.get(`/_/backend/scan/${barcode}?allergies=${allergyList}&diet=${diet}`);
      const data = response.data;
      
      if (!data.product || !data.product.name) {
        throw new Error("Product data is incomplete.");
      }

      setScanResult(data);
      saveToHistory(data);
    } catch (err) {
      setError(`Scan failed: ${err.response?.data?.message || err.message}`);
      console.error('[Scanner] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveToHistory = (data) => {
    const history = JSON.parse(localStorage.getItem('trustbite_history') || '[]');
    const newEntry = {
      id: Date.now(),
      name: data.product.name,
      brand: data.product.brand || 'Unknown Brand',
      image: data.product.image,
      ingredients: data.product.ingredients,
      isSafe: data.safety.isSafe,
      safetyMessage: data.safety.message,
      unsafeIngredients: data.safety.unsafeIngredients || [],
      date: new Date().toISOString()
    };
    const updatedHistory = [newEntry, ...history].slice(0, 15);
    localStorage.setItem('trustbite_history', JSON.stringify(updatedHistory));
  };

  const parseIngredients = (text) => {
    if (!text) return [];
    const result = [];
    let current = '';
    let depth = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '(' || char === '[' || char === '{') depth++;
      if (char === ')' || char === ']' || char === '}') depth--;
      if (char === ',' && depth === 0) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    if (current) result.push(current.trim());
    return result;
  };

  const IngredientRow = ({ text, depth = 0 }) => {
    const percentageMatch = text.match(/(\d+(?:\.\d+)?%)/);
    const percentage = percentageMatch ? percentageMatch[0] : null;
    const subMatch = text.match(/^([^(]+)\s*\((.*)\)$/);
    const name = subMatch ? subMatch[1].trim() : text.replace(/(\d+(?:\.\d+)?%)/, '').trim();
    const subText = subMatch ? subMatch[2].trim() : null;

    return (
      <div style={{
        borderBottom: depth === 0 ? '1px solid var(--glass-border)' : 'none',
        padding: depth === 0 ? '0.875rem 0' : '0.4rem 0 0.4rem 1.25rem',
        position: 'relative'
      }}>
        {depth > 0 && (
          <div style={{ position: 'absolute', left: '0.4rem', top: 0, bottom: 0, width: '1px', background: 'var(--glass-border)' }} />
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: depth === 0 ? '6px' : '4px', height: depth === 0 ? '6px' : '4px', borderRadius: '50%', background: depth === 0 ? 'var(--primary)' : 'var(--text-muted)' }}></div>
            <span style={{ fontSize: depth === 0 ? '0.9rem' : '0.8rem', fontWeight: depth === 0 ? 600 : 400, color: depth === 0 ? 'var(--text)' : 'var(--text-muted)' }}>{name}</span>
          </div>
          {percentage && (
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary)', background: 'var(--primary-glow)', padding: '2px 6px', borderRadius: '6px' }}>{percentage}</span>
          )}
        </div>
        {subText && (
          <div style={{ marginTop: '0.2rem' }}>
            {parseIngredients(subText).map((sub, idx) => (
              <IngredientRow key={idx} text={sub} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="scanner-view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0 }}>Scan Product</h2>
        {cameraActive && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {hasTorch && (
              <button className="btn btn-icon" onClick={toggleTorch} style={{ background: torchOn ? 'var(--primary)' : 'rgba(255,255,255,0.1)', padding: '0.5rem', borderRadius: '12px' }}>
                <Zap size={20} color={torchOn ? 'white' : 'var(--text)'} />
              </button>
            )}
            <button className="btn btn-icon" onClick={stopCamera} style={{ background: 'rgba(244, 63, 94, 0.2)', padding: '0.5rem', borderRadius: '12px' }}>
              <XCircle size={20} color="var(--danger)" />
            </button>
          </div>
        )}
      </div>

      {!scanResult && !loading && (
        <>
          <div className="scanner-container" style={{ position: 'relative', overflow: 'hidden' }}>
            <div id="reader" style={{ width: '100%' }}></div>
            {!cameraActive && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
                <button className="btn btn-primary" onClick={startCamera}>
                  <Camera size={24} />
                  Start Camera
                </button>
              </div>
            )}
            {cameraActive && (
              <div className="scanner-overlay">
                <div className="scan-line"></div>
                <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', color: 'white', fontSize: '0.75rem', fontWeight: 600, textShadow: '0 2px 4px rgba(0,0,0,0.5)', background: 'rgba(0,0,0,0.3)', padding: '4px 12px', borderRadius: '20px' }}>
                  Align barcode within the area
                </div>
              </div>
            )}
          </div>

          <div style={{ textAlign: 'center', margin: '1rem 0' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <input type="text" placeholder="Enter barcode manually" id="manual-barcode" className="card" style={{ flex: 1, margin: 0, padding: '0.875rem', borderRadius: 'var(--radius)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white', outline: 'none' }} />
                <button className="btn btn-primary" onClick={() => { const val = document.getElementById('manual-barcode').value; if (val) handleScan(val); }}>Check</button>
              </div>
              <label className="btn" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text)', width: '100%', border: '1px solid var(--glass-border)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                <Maximize size={18} /> Upload Gallery
                <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
              </label>
            </div>
          </div>
        </>
      )}

      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem', position: 'relative', overflow: 'hidden' }}>
          <div className="scan-line" style={{ position: 'absolute', width: '100%', left: 0, top: '10%' }}></div>
          <h3 style={{ marginBottom: '0.5rem', marginTop: '1rem' }}>Analyzing Product...</h3>
          <p className="text-muted">Comparing ingredients with your safety profile</p>
          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
            <div className="spinner"></div>
          </div>
        </div>
      )}

      {error && (
        <div className="card" style={{ textAlign: 'center', border: '1px solid rgba(244, 63, 94, 0.3)' }}>
          <XCircle size={48} color="var(--danger)" style={{ margin: '0 auto 1.5rem', opacity: 0.8 }} />
          <h3 style={{ color: 'var(--text)', marginBottom: '1rem' }}>Scan Error</h3>
          <p className="text-muted" style={{ marginBottom: '2rem' }}>{error}</p>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => { setError(null); startCamera(); }}>Try Again</button>
        </div>
      )}

      {scanResult && !loading && (
        <div className="card" style={{ animation: 'slideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}>
          <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '1.5rem' }}>
            {scanResult.product.image ? (
              <div style={{ background: 'white', padding: '6px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <img src={scanResult.product.image} alt={scanResult.product.name} style={{ width: '70px', height: '70px', objectFit: 'contain' }} />
              </div>
            ) : (
              <div style={{ width: '70px', height: '70px', background: 'var(--glass)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '16px' }}>
                <ShoppingBag size={28} color="var(--text-muted)" />
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.2rem', fontWeight: 700 }}>{scanResult.product.name}</h3>
              <p className="text-muted" style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{scanResult.product.brand}</p>
            </div>
          </div>

          <div className={`safety-badge ${scanResult.safety.isSafe ? 'safety-safe' : 'safety-unsafe'}`} style={{ marginBottom: '1.75rem', padding: '1rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {scanResult.safety.isSafe ? <CheckCircle size={22} /> : <AlertTriangle size={22} />}
            <span style={{ fontWeight: 800, fontSize: '1rem' }}>{scanResult.safety.message.toUpperCase()}</span>
          </div>

          {!scanResult.safety.isSafe && (
            <div style={{ marginBottom: '1.75rem' }}>
              <h4 style={{ color: 'var(--danger)', marginBottom: '0.75rem', fontSize: '0.85rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Info size={14} /> Allergen Alerts Found:
              </h4>
              <div className="tag-list" style={{ marginTop: 0 }}>
                {scanResult.safety.unsafeIngredients.map(ing => (
                  <span key={ing} className="tag" style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#fda4af', border: '1px solid rgba(244, 63, 94, 0.3)', fontWeight: 700, padding: '6px 12px' }}>{ing}</span>
                ))}
              </div>
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
            <h4 style={{ marginBottom: '1rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ListFilter size={16} className="text-primary" />
              Detailed Ingredients
            </h4>
            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '16px', padding: '0 1.25rem', maxHeight: '400px', overflowY: 'auto', border: '1px solid var(--glass-border)' }}>
              {scanResult.product.ingredients ? (
                parseIngredients(scanResult.product.ingredients).map((ing, idx) => (
                  <IngredientRow key={idx} text={ing} />
                ))
              ) : (
                <p className="text-muted" style={{ padding: '1.5rem', textAlign: 'center' }}>No detailed ingredient list available</p>
              )}
            </div>
          </div>

          <button className="btn btn-primary" style={{ width: '100%', marginTop: '2rem', height: '54px' }} onClick={() => { setScanResult(null); startCamera(); }}>Scan Next Product</button>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .btn-icon:hover { transform: scale(1.1); }
        .tag-list { display: flex; flex-wrap: wrap; gap: 0.5rem; }
        .tag { border-radius: 8px; font-size: 0.8rem; }
      `}</style>
    </div>
  );
};

export default Scanner;

