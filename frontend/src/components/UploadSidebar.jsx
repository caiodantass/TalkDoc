/**
 * TalkDoc - Upload Sidebar Component (UploadSidebar.jsx)
 * ------------------------------------------------------
 * Painel lateral que gerencia:
 * 1. Logotipo da aplicação e botão de criação de nova conversa (+ Novo Chat).
 * 2. Zona de Drag-and-Drop e seleção de arquivos PDF com validação visual de status.
 * 3. Card de documento ativo com opção de substituição rápida.
 * 4. Listagem e gerenciamento de sessões de histórico isoladas por usuário.
 * 5. Perfil de usuário com avatar, e-mail truncado e botão de Logout seguro.
 */

import React, { useRef } from 'react';
import { ChatHistory } from './ChatHistory';

export const UploadSidebar = ({ 
  file, 
  uploadStatus, 
  uploadError, 
  onUpload, 
  onNewChat,
  history,
  activeChatId,
  onSelectChat,
  onDeleteChat,
  user,
  onOpenAuth,
  onLogout
}) => {
  const fileInputRef = useRef(null);

  // Manipuladores de Drag and Drop
  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('drag-active');
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-active');
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-active');
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      onUpload(droppedFile);
    }
  };

  // Manipulador de seleção convencional de arquivos
  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      onUpload(selectedFile);
    }
    // Reseta o valor do input para permitir reenvio imediato do mesmo arquivo se necessário
    e.target.value = '';
  };

  return (
    <aside className="sidebar">
      {/* Cabeçalho da Marca TalkDoc */}
      <div className="brand-container">
        <div className="brand">
          <div className="brand-icon-wrapper">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
          </div>
          <h1>TalkDoc</h1>
        </div>
      </div>

      {/* Botão de Novo Chat */}
      <button className="new-chat-btn" onClick={onNewChat}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        Novo Chat
      </button>

      {/* Seção de Upload / Card de Documento Ativo */}
      <div className="upload-section">
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileSelect} 
          accept="application/pdf" 
          style={{ display: 'none' }} 
        />

        {file && uploadStatus === 'success' ? (
          <div className="active-doc-card">
            <div className="doc-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
            </div>
            <div className="doc-details">
              <h4>{file.name}</h4>
              <p>{(file.size / 1024 / 1024).toFixed(2)} MB • Ativo</p>
            </div>
            <button 
              className="change-doc-btn" 
              onClick={() => fileInputRef.current?.click()}
              title="Trocar PDF"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
            </button>
          </div>
        ) : (
          <div 
            className={`upload-zone ${uploadStatus === 'success' ? 'success' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploadStatus === 'uploading' ? (
              <div>
                <div className="typing-indicator" style={{ justifyContent: 'center', margin: '0 auto 8px' }}>
                  <div className="dot"></div><div className="dot"></div><div className="dot"></div>
                </div>
                <p>Indexando documento...</p>
              </div>
            ) : (
              <div>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="2" style={{ margin: '0 auto' }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                <p>Arraste um PDF ou clique para enviar</p>
              </div>
            )}
          </div>
        )}

        {uploadError && (
          <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '0.5rem', textAlign: 'center' }}>
            {uploadError}
          </div>
        )}
      </div>

      {/* Lista de Histórico de Sessões */}
      <ChatHistory 
        history={history}
        activeId={activeChatId}
        onSelectChat={onSelectChat}
        onDeleteChat={onDeleteChat}
      />

      {/* Rodapé de Perfil e Sessão de Usuário */}
      <div className="sidebar-footer">
        {user ? (
          <>
            <div className="user-avatar">{user.name.charAt(0).toUpperCase()}</div>
            <div className="user-info" style={{ flex: 1 }}>
              <span className="user-name">{user.name}</span>
              <span className="user-status">{user.email}</span>
            </div>
            <button 
              className="change-doc-btn"
              onClick={onLogout}
              title="Sair da conta"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
          </>
        ) : (
          <button 
            className="new-chat-btn" 
            onClick={onOpenAuth}
            style={{ margin: 0, background: 'var(--bg-glass-card)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            Entrar / Cadastrar
          </button>
        )}
      </div>
    </aside>
  );
};
