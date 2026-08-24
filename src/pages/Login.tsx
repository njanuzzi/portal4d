import { useState, FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, CheckCircle } from 'lucide-react';
import { supabase, resetPasswordUrl } from '../lib/supabase';

type Tab = 'therapist' | 'client';
type View = 'login' | 'forgot' | 'forgot_sent';

export function Login() {
  const { signIn } = useAuth();
  const [tab, setTab] = useState<Tab>('client');
  const [view, setView] = useState<View>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Confere o e-mail contra a aba escolhida antes de autenticar — evita
      // deixar uma conta de terapeuta entrar pela aba de cliente (ou vice
      // versa) só porque o redirecionamento depois olha o role de qualquer jeito.
      const { data: accountRole, error: roleError } = await supabase.rpc('check_account_role', {
        p_email: email.trim(),
      });

      if (!roleError) {
        if (!accountRole) {
          setError('Não encontramos uma conta com esse e-mail.');
          return;
        }
        if (accountRole !== tab) {
          setError(
            accountRole === 'therapist'
              ? 'Esse e-mail é de uma conta de terapeuta. Selecione a aba "Terapeuta" para entrar.'
              : 'Esse e-mail é de uma conta de cliente. Selecione a aba "Cliente" para entrar.'
          );
          return;
        }
      }

      const { error } = await signIn(email, password);
      if (error) {
        setError('E-mail ou senha incorretos. Tente novamente.');
      }
    } catch {
      // Falha de rede (conexão bloqueada, instável, etc.) — sem isso o botão
      // ficava girando pra sempre, porque nada abaixo chegava a rodar.
      setError('Não foi possível conectar. Verifique sua conexão e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: resetPasswordUrl,
      });
      if (error) {
        setError('Não foi possível enviar o e-mail. Verifique o endereço e tente novamente.');
      } else {
        setView('forgot_sent');
      }
    } catch {
      setError('Não foi possível conectar. Verifique sua conexão e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (t: Tab) => {
    setTab(t);
    setEmail('');
    setPassword('');
    setError('');
    setView('login');
  };

  const inputStyle = {
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
  };

  const labelStyle = {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 11,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    color: '#7a6e60',
    fontWeight: 500,
    marginBottom: 6,
    display: 'block',
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#1B4B5A' }}>
      <div className="w-full max-w-4xl rounded-xl overflow-hidden shadow-2xl flex flex-col md:flex-row" style={{ minHeight: '520px' }}>

        {/* Left column */}
        <div className="md:w-5/12 flex flex-col justify-center px-10 py-12" style={{ background: '#032a3c' }}>
          <img
            src="/logosistema.png"
            alt="Logo Portal Núbia Januzzi"
            className="mb-8 self-start"
            style={{ width: 140, height: 140, objectFit: 'cover', borderRadius: '50%' }}
          />

          <p style={{ fontFamily: "'Playfair Display', serif", color: '#E8DCC8', fontSize: 20, fontWeight: 400, margin: '0 0 4px' }}>
            Núbia Januzzi
          </p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", color: '#8aacb5', fontSize: 14, fontWeight: 400, margin: '0 0 2px' }}>
            Portal Núbia Januzzi
          </p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", color: '#8aacb5', fontSize: 13, fontWeight: 300, margin: 0 }}>
            Especialista em Desbloqueio Comportamental
          </p>

          <div style={{ width: 32, height: 1, background: '#C9A84C', opacity: 0.6, margin: '28px 0' }} />
        </div>

        {/* Right column */}
        <div className="flex-1 flex flex-col justify-center px-10 py-12" style={{ background: '#E8DCC8' }}>

          {/* Forgot password — confirmation */}
          {view === 'forgot_sent' ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={28} className="text-emerald-600" />
              </div>
              <h2 style={{ fontFamily: "'Playfair Display', serif", color: '#1B4B5A', fontSize: 22, fontWeight: 400, margin: '0 0 8px' }}>
                E-mail enviado
              </h2>
              <p style={{ fontFamily: "'DM Sans', sans-serif", color: '#7a6e60', fontSize: 13, margin: '0 0 24px', lineHeight: 1.6 }}>
                Verifique sua caixa de entrada em <strong>{email}</strong> e clique no link para redefinir sua senha.
              </p>
              <button
                type="button"
                onClick={() => { setView('login'); setEmail(''); }}
                style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#1B4B5A', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Voltar ao login
              </button>
            </div>
          ) : view === 'forgot' ? (
            <>
              <h1 style={{ fontFamily: "'Playfair Display', serif", color: '#1B4B5A', fontSize: 24, fontWeight: 400, margin: '0 0 6px' }}>
                Recuperar senha
              </h1>
              <p style={{ fontFamily: "'DM Sans', sans-serif", color: '#7a6e60', fontSize: 13, margin: '0 0 28px' }}>
                Informe seu e-mail para receber um link de redefinição.
              </p>

              <form onSubmit={handleForgot} className="flex flex-col">
                <label style={labelStyle}>E-mail</label>
                <input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={inputStyle}
                  onFocus={(e) => { e.target.style.borderColor = '#1B4B5A'; e.target.style.background = '#fff'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#c8bca8'; e.target.style.background = '#f5ede0'; }}
                />

                {error && (
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#c0392b', background: '#fdf0ed', border: '1px solid #f5c6be', borderRadius: 6, padding: '8px 12px', marginBottom: 16 }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500, letterSpacing: '0.03em', padding: '12px', background: loading ? '#2d6a84' : '#1B4B5A', color: '#E8DCC8', border: 'none', borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.8 : 1, marginBottom: 12 }}
                >
                  {loading ? 'Enviando...' : 'Enviar link de recuperação'}
                </button>

                <button
                  type="button"
                  onClick={() => { setView('login'); setError(''); }}
                  style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#7a6e60', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center' }}
                >
                  Voltar ao login
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 style={{ fontFamily: "'Playfair Display', serif", color: '#1B4B5A', fontSize: 24, fontWeight: 400, margin: '0 0 6px' }}>
                Acesso ao portal
              </h1>
              <p style={{ fontFamily: "'DM Sans', sans-serif", color: '#7a6e60', fontSize: 13, margin: '0 0 28px' }}>
                Entre com suas credenciais para continuar
              </p>

              {/* Tabs */}
              <div className="flex" style={{ borderBottom: '1.5px solid #c8bca8', marginBottom: 28 }}>
                {(['client', 'therapist'] as Tab[]).map((t) => (
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
                <label style={labelStyle}>E-mail</label>
                <input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={inputStyle}
                  onFocus={(e) => { e.target.style.borderColor = '#1B4B5A'; e.target.style.background = '#fff'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#c8bca8'; e.target.style.background = '#f5ede0'; }}
                />

                <label style={labelStyle}>Senha</label>
                <div style={{ position: 'relative', marginBottom: 8 }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{ ...inputStyle, marginBottom: 0, paddingRight: 40 }}
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

                {/* Forgot password link */}
                <div style={{ textAlign: 'right', marginBottom: 16 }}>
                  <button
                    type="button"
                    onClick={() => { setView('forgot'); setError(''); }}
                    style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#7a6e60', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Esqueci minha senha
                  </button>
                </div>

                {error && (
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#c0392b', background: '#fdf0ed', border: '1px solid #f5c6be', borderRadius: 6, padding: '8px 12px', marginBottom: 16 }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500, letterSpacing: '0.03em', padding: '12px', background: loading ? '#2d6a84' : '#1B4B5A', color: '#E8DCC8', border: 'none', borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.15s', opacity: loading ? 0.8 : 1 }}
                >
                  {loading ? 'Entrando...' : 'Entrar'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
