import { useEffect, useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

type PageState = 'loading' | 'ready' | 'saving' | 'done' | 'error';

export function ResetPassword() {
  const navigate = useNavigate();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldError, setFieldError] = useState('');

  // Supabase emits PASSWORD_RECOVERY when the user lands from the reset link.
  // The client automatically exchanges the token in the URL for a session.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPageState('ready');
      }
    });

    // Also check if there's already an active recovery session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setPageState('ready');
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFieldError('');

    if (password.length < 8) {
      setFieldError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      setFieldError('As senhas não coincidem.');
      return;
    }

    setPageState('saving');
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setFieldError(error.message);
      setPageState('ready');
      return;
    }

    setPageState('done');
    // Sign out so the user logs in fresh with the new password
    await supabase.auth.signOut();
    setTimeout(() => navigate('/login'), 3000);
  };

  const inputStyle = {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 14,
    padding: '10px 14px',
    border: '1px solid #c8bca8',
    borderRadius: 6,
    background: '#f5ede0',
    color: '#2C2C2C',
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
      <div className="w-full max-w-md rounded-xl overflow-hidden shadow-2xl" style={{ background: '#E8DCC8' }}>
        <div className="px-10 py-12">

          {pageState === 'loading' && (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-petrol-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p style={{ fontFamily: "'DM Sans', sans-serif", color: '#7a6e60', fontSize: 14 }}>
                Validando link de recuperação...
              </p>
            </div>
          )}

          {pageState === 'done' && (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={28} className="text-emerald-600" />
              </div>
              <h2 style={{ fontFamily: "'Playfair Display', serif", color: '#1B4B5A', fontSize: 22, fontWeight: 400, margin: '0 0 8px' }}>
                Senha atualizada!
              </h2>
              <p style={{ fontFamily: "'DM Sans', sans-serif", color: '#7a6e60', fontSize: 13, lineHeight: 1.6 }}>
                Você será redirecionado para o login em instantes...
              </p>
            </div>
          )}

          {(pageState === 'ready' || pageState === 'saving') && (
            <>
              <h1 style={{ fontFamily: "'Playfair Display', serif", color: '#1B4B5A', fontSize: 24, fontWeight: 400, margin: '0 0 6px' }}>
                Nova senha
              </h1>
              <p style={{ fontFamily: "'DM Sans', sans-serif", color: '#7a6e60', fontSize: 13, margin: '0 0 28px' }}>
                Escolha uma senha segura para sua conta.
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label style={labelStyle}>Nova senha</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mínimo 8 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoFocus
                      style={{ ...inputStyle, paddingRight: 40 }}
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
                </div>

                <div>
                  <label style={labelStyle}>Confirmar senha</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Repita a senha"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    style={inputStyle}
                    onFocus={(e) => { e.target.style.borderColor = '#1B4B5A'; e.target.style.background = '#fff'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#c8bca8'; e.target.style.background = '#f5ede0'; }}
                  />
                </div>

                {fieldError && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#c0392b', background: '#fdf0ed', border: '1px solid #f5c6be', borderRadius: 6, padding: '8px 12px' }}>
                    <AlertCircle size={15} style={{ marginTop: 1, flexShrink: 0 }} />
                    {fieldError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={pageState === 'saving'}
                  style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500, letterSpacing: '0.03em', padding: '12px', background: pageState === 'saving' ? '#2d6a84' : '#1B4B5A', color: '#E8DCC8', border: 'none', borderRadius: 6, cursor: pageState === 'saving' ? 'not-allowed' : 'pointer', opacity: pageState === 'saving' ? 0.8 : 1 }}
                >
                  {pageState === 'saving' ? 'Salvando...' : 'Definir nova senha'}
                </button>
              </form>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
