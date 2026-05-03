import { useState, FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff } from 'lucide-react';

type Tab = 'therapist' | 'client';

export function Login() {
  const { signIn } = useAuth();
  const [tab, setTab] = useState<Tab>('therapist');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      setError('E-mail ou senha incorretos. Tente novamente.');
    }
  };

  const handleTabChange = (t: Tab) => {
    setTab(t);
    setEmail('');
    setPassword('');
    setError('');
  };

  const features = [
    'Diário diário com perguntas estruturadas',
    'Painel clínico para o terapeuta',
    'Relatórios semanais com apoio de IA',
    'Dados isolados por cliente',
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#1B4B5A' }}>
      <div className="w-full max-w-4xl rounded-xl overflow-hidden shadow-2xl flex flex-col md:flex-row" style={{ minHeight: '520px' }}>

        {/* Left column */}
        <div className="md:w-5/12 flex flex-col justify-center px-10 py-12" style={{ background: '#153d49' }}>
          {/* Logo placeholder */}
          <div
            className="flex items-center justify-center mb-8 self-start"
            style={{
              width: 200,
              height: 200,
              border: '1.5px dashed #C9A84C',
              borderRadius: 8,
            }}
          >
            <span style={{ color: '#8aacb5', fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>
              Logo aqui
            </span>
          </div>

          {/* Name & title */}
          <p style={{ fontFamily: "'Playfair Display', serif", color: '#E8DCC8', fontSize: 20, fontWeight: 400, margin: '0 0 4px' }}>
            Núbia Januzzi
          </p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", color: '#8aacb5', fontSize: 14, fontWeight: 400, margin: '0 0 2px' }}>
            Psicoterapeuta
          </p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", color: '#8aacb5', fontSize: 13, fontWeight: 300, margin: 0 }}>
            Especialista em Desbloqueio Comportamental
          </p>

          {/* Divider */}
          <div style={{ width: 32, height: 1, background: '#C9A84C', opacity: 0.6, margin: '28px 0' }} />

          {/* Features */}
          <ul className="space-y-4" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2.5">
                <span style={{ width: 6, height: 6, background: '#C9A84C', borderRadius: '50%', marginTop: 6, flexShrink: 0, display: 'block' }} />
                <span style={{ fontFamily: "'DM Sans', sans-serif", color: '#8aacb5', fontSize: 12, lineHeight: 1.5 }}>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Right column */}
        <div className="flex-1 flex flex-col justify-center px-10 py-12" style={{ background: '#E8DCC8' }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", color: '#1B4B5A', fontSize: 24, fontWeight: 400, margin: '0 0 6px' }}>
            Acesso ao portal
          </h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", color: '#7a6e60', fontSize: 13, margin: '0 0 28px' }}>
            Entre com suas credenciais para continuar
          </p>

          {/* Tabs */}
          <div className="flex" style={{ borderBottom: '1.5px solid #c8bca8', marginBottom: 28 }}>
            {(['therapist', 'client'] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleTabChange(t)}
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13,
                  padding: '8px 20px',
                  color: tab === t ? '#1B4B5A' : '#9a8e80',
                  fontWeight: tab === t ? 500 : 400,
                  borderBottom: tab === t ? '2px solid #C9A84C' : '2px solid transparent',
                  marginBottom: -1.5,
                  background: 'none',
                  border: 'none',
                  borderBottomStyle: 'solid',
                  cursor: 'pointer',
                  transition: 'color 0.15s',
                }}
              >
                {t === 'therapist' ? 'Terapeuta' : 'Cliente'}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col">
            {/* Email */}
            <label style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7a6e60', fontWeight: 500, marginBottom: 6 }}>
              E-mail
            </label>
            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                padding: '10px 14px',
                border: '1px solid #c8bca8',
                borderRadius: 6,
                background: '#f5ede0',
                color: '#2C2C2C',
                marginBottom: 16,
                outline: 'none',
                width: '100%',
              }}
              onFocus={(e) => { e.target.style.borderColor = '#1B4B5A'; e.target.style.background = '#fff'; }}
              onBlur={(e) => { e.target.style.borderColor = '#c8bca8'; e.target.style.background = '#f5ede0'; }}
            />

            {/* Password (therapist only) */}
            {tab === 'therapist' && (
              <>
                <label style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7a6e60', fontWeight: 500, marginBottom: 6 }}>
                  Senha
                </label>
                <div style={{ position: 'relative', marginBottom: 16 }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 14,
                      padding: '10px 40px 10px 14px',
                      border: '1px solid #c8bca8',
                      borderRadius: 6,
                      background: '#f5ede0',
                      color: '#2C2C2C',
                      outline: 'none',
                      width: '100%',
                    }}
                    onFocus={(e) => { e.target.style.borderColor = '#1B4B5A'; e.target.style.background = '#fff'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#c8bca8'; e.target.style.background = '#f5ede0'; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9a8e80', display: 'flex', alignItems: 'center' }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </>
            )}

            {/* Error */}
            {error && (
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#c0392b', background: '#fdf0ed', border: '1px solid #f5c6be', borderRadius: 6, padding: '8px 12px', marginBottom: 16 }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                fontWeight: 500,
                letterSpacing: '0.03em',
                padding: '12px',
                background: loading ? '#2d6a84' : '#1B4B5A',
                color: '#E8DCC8',
                border: 'none',
                borderRadius: 6,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
                opacity: loading ? 0.8 : 1,
              }}
            >
              {loading ? 'Entrando...' : tab === 'therapist' ? 'Entrar' : 'Receber link de acesso'}
            </button>

            {/* Client info box */}
            {tab === 'client' && (
              <div style={{ marginTop: 16, padding: '12px 14px', background: '#f5ede0', borderRadius: 6, borderLeft: '3px solid #C9A84C' }}>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#7a6e60', lineHeight: 1.5, margin: 0 }}>
                  <strong style={{ color: '#1B4B5A' }}>Acesso por link mágico.</strong> Você receberá um e-mail com um link de acesso. Não é necessário senha.
                </p>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
