/**
 * TalkDoc - Chat History Component (ChatHistory.jsx)
 * ---------------------------------------------------
 * Renderiza a lista de sessões anteriores de leitura de PDF:
 * - Indicador visual de item ativo selecionado.
 * - Exibição de título do documento, data da sessão e botão de exclusão.
 * - Card de estado vazio orientativo quando não há conversas registradas.
 */

import React from 'react';

export const ChatHistory = ({ history, activeId, onSelectChat, onDeleteChat }) => {
  return (
    <div className="history-container">
      {/* Título do Histórico */}
      <div className="history-header">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        <span className="history-title">Histórico de Conversas</span>
      </div>

      {/* Estado Vazio ou Lista de Sessões */}
      {(!history || history.length === 0) ? (
        <div className="history-empty-card">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" style={{ margin: '0 auto 6px' }}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <p>Nenhuma conversa salva ainda</p>
          <span>Suba um PDF para iniciar o histórico</span>
        </div>
      ) : (
        <div className="history-list">
          {history.map((item) => (
            <div
              key={item.id}
              className={`history-item ${activeId === item.id ? 'active' : ''}`}
              onClick={() => onSelectChat(item.id)}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
              <div className="history-item-info">
                <span className="history-item-title">{item.title || item.fileName || 'Conversa sem título'}</span>
                <span className="history-item-date">{item.date || 'Hoje'}</span>
              </div>
              <button
                className="history-delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteChat(item.id);
                }}
                title="Excluir do histórico"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
