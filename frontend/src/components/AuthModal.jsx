/**
 * TalkDoc - Authentication Modal Component (AuthModal.jsx)
 * ---------------------------------------------------------
 * Gerencia todo o fluxo de autenticação e contas de usuário:
 * 1. Visualização de Login (Validação de credenciais e entrada).
 * 2. Visualização de Cadastro (Criação e persistência de novas contas).
 * 3. Recuperação e Redefinição de Senha em 2 etapas sem dependências externas.
 * 4. Isolamento multi-tenant seguro baseado em localStorage (`talkdoc_registered_users`).
 */

import React, { useState } from 'react';

export const AuthModal = ({ isOpen, onClose, onLoginSuccess, allowClose = true }) => {
  const [view, setView] = useState('login'); // 'login' | 'register' | 'forgot' | 'new_password'
  
  // Estados dos campos de formulário
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  // Estados de feedback visual e carregamento
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  // Recupera a lista de contas salvas no localStorage
  const getRegisteredUsers = () => {
    try {
      const users = localStorage.getItem('talkdoc_registered_users');
      return users ? JSON.parse(users) : [
        { name: 'Caio Dantas', email: 'caio@talkdoc.com', password: '123456' } // Conta padrão inicial
      ];
    } catch (e) {
      return [{ name: 'Caio Dantas', email: 'caio@talkdoc.com', password: '123456' }];
    }
  };

  // Salva a lista atualizada de usuários no localStorage
  const saveRegisteredUsers = (usersList) => {
    try {
      localStorage.setItem('talkdoc_registered_users', JSON.stringify(usersList));
    } catch (e) {
      console.error('Erro ao salvar usuarios:', e);
    }
  };

  // 1. MANIPULADOR DE LOGIN
  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const registeredUsers = getRegisteredUsers();
      const cleanEmail = email.trim().toLowerCase();
      
      const foundUser = registeredUsers.find(u => u.email.toLowerCase() === cleanEmail);

      if (!foundUser) {
        setError('Conta não encontrada com este e-mail. Por favor, crie uma conta primeiro.');
        return;
      }

      if (foundUser.password !== password) {
        setError('Senha incorreta. Verifique sua senha e tente novamente.');
        return;
      }

      // Sucesso na autenticação
      const userData = { name: foundUser.name, email: foundUser.email };
      onLoginSuccess(userData);
      onClose();
    }, 500);
  };

  // 2. MANIPULADOR DE CADASTRO
  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (!name || !email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const registeredUsers = getRegisteredUsers();
      const cleanEmail = email.trim().toLowerCase();

      const existingUser = registeredUsers.find(u => u.email.toLowerCase() === cleanEmail);

      if (existingUser) {
        setError('Este e-mail já está cadastrado. Faça login ou clique em "Esqueceu a senha?".');
        return;
      }

      // Cria e persiste nova conta
      const newUser = { name: name.trim(), email: cleanEmail, password };
      const updatedUsers = [...registeredUsers, newUser];
      saveRegisteredUsers(updatedUsers);

      // Efetua login automático
      onLoginSuccess({ name: newUser.name, email: newUser.email });
      onClose();
    }, 500);
  };

  // 3. MANIPULADOR DE RECUPERAÇÃO DE SENHA (ETAPA 1 - VERIFICAR E-MAIL)
  const handleForgotSubmit = (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (!email) {
      setError('Informe seu e-mail para redefinir a senha.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const registeredUsers = getRegisteredUsers();
      const cleanEmail = email.trim().toLowerCase();

      const foundUser = registeredUsers.find(u => u.email.toLowerCase() === cleanEmail);

      if (!foundUser) {
        setError('Este e-mail não possui uma conta cadastrada. Verifique o e-mail ou crie uma conta.');
        return;
      }

      setView('new_password');
    }, 400);
  };

  // 4. MANIPULADOR DE DEFINIÇÃO DE NOVA SENHA (ETAPA 2)
  const handleNewPasswordSubmit = (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (!newPassword || newPassword.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const registeredUsers = getRegisteredUsers();
      const cleanEmail = email.trim().toLowerCase();

      // Atualiza a senha exclusivamente para a conta correspondente
      const updatedUsers = registeredUsers.map(u => {
        if (u.email.toLowerCase() === cleanEmail) {
          return { ...u, password: newPassword };
        }
        return u;
      });

      saveRegisteredUsers(updatedUsers);
      setInfo('Senha atualizada com sucesso! A partir de agora, use apenas a nova senha para entrar.');
      setPassword('');
      setNewPassword('');
      setView('login');
    }, 500);
  };

  return (
    <div className="modal-overlay">
      <div className="auth-card">
        {/* Botão de Fechar Modal (quando permitido) */}
        {allowClose && (
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        )}

        {/* Logotipo e Cabeçalho */}
        <div className="auth-brand">
          <div className="brand-icon-wrapper" style={{ width: 42, height: 42 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
          </div>
          <h2>TalkDoc</h2>
        </div>

        {/* Banners de Alerta e Feedback */}
        {error && <div className="auth-alert error">{error}</div>}
        {info && <div className="auth-alert info">{info}</div>}

        {/* TELA 1: LOGIN */}
        {view === 'login' && (
          <form onSubmit={handleLoginSubmit} className="auth-form">
            <h3 className="auth-title">Entrar na sua conta</h3>
            <p className="auth-subtitle">Acesse seus documentos e conversas com IA</p>

            <div className="form-group">
              <label>E-mail</label>
              <input 
                type="email" 
                placeholder="caio@talkdoc.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <div className="label-row">
                <label>Senha</label>
                <button 
                  type="button" 
                  className="link-btn"
                  onClick={() => { setError(''); setInfo(''); setView('forgot'); }}
                >
                  Esqueceu a senha?
                </button>
              </div>
              <input 
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="auth-submit-btn" disabled={isLoading}>
              {isLoading ? 'Autenticando...' : 'Entrar no TalkDoc'}
            </button>

            <div className="auth-footer-text">
              Não tem uma conta?{' '}
              <button 
                type="button" 
                className="link-btn highlight"
                onClick={() => { setError(''); setInfo(''); setView('register'); }}
              >
                Criar conta
              </button>
            </div>
          </form>
        )}

        {/* TELA 2: CADASTRO */}
        {view === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="auth-form">
            <h3 className="auth-title">Criar nova conta</h3>
            <p className="auth-subtitle">Comece a conversar com seus PDFs em segundos</p>

            <div className="form-group">
              <label>Nome Completo</label>
              <input 
                type="text" 
                placeholder="Caio Dantas"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>E-mail</label>
              <input 
                type="email" 
                placeholder="seu.email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Senha</label>
              <input 
                type="password" 
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="auth-submit-btn" disabled={isLoading}>
              {isLoading ? 'Cadastrando...' : 'Criar Conta e Entrar'}
            </button>

            <div className="auth-footer-text">
              Já tem uma conta?{' '}
              <button 
                type="button" 
                className="link-btn highlight"
                onClick={() => { setError(''); setInfo(''); setView('login'); }}
              >
                Fazer Login
              </button>
            </div>
          </form>
        )}

        {/* TELA 3: RECUPERAR SENHA (ETAPA 1) */}
        {view === 'forgot' && (
          <form onSubmit={handleForgotSubmit} className="auth-form">
            <h3 className="auth-title">Recuperar Senha</h3>
            <p className="auth-subtitle">Digite seu e-mail para redefinir a sua senha</p>

            <div className="form-group">
              <label>E-mail cadastrado</label>
              <input 
                type="email" 
                placeholder="seu.email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="auth-submit-btn" disabled={isLoading}>
              {isLoading ? 'Verificando...' : 'Continuar'}
            </button>

            <div className="auth-footer-text">
              Lembrou a senha?{' '}
              <button 
                type="button" 
                className="link-btn highlight"
                onClick={() => { setError(''); setInfo(''); setView('login'); }}
              >
                Voltar para Login
              </button>
            </div>
          </form>
        )}

        {/* TELA 4: DEFINIR NOVA SENHA (ETAPA 2) */}
        {view === 'new_password' && (
          <form onSubmit={handleNewPasswordSubmit} className="auth-form">
            <h3 className="auth-title">Definir Nova Senha</h3>
            <p className="auth-subtitle">Redefinindo senha para <strong>{email}</strong></p>

            <div className="form-group">
              <label>Nova Senha</label>
              <input 
                type="password" 
                placeholder="Mínimo 6 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="auth-submit-btn" disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Salvar Nova Senha'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
