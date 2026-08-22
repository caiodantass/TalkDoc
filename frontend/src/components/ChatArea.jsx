/**
 * TalkDoc - Chat Area Component (ChatArea.jsx)
 * ---------------------------------------------
 * Renderiza o painel principal de conversa com a IA:
 * 1. Cabeçalho de status de conexão do documento PDF.
 * 2. Estado de boas-vindas com cards de sugestões rápidas de prompts.
 * 3. Parser e formatador visual de Markdown com suporte a listas, negrito e Gabarito Oculto (Spoiler).
 * 4. Badges de citação de fontes com tooltips interativos mostrando o trecho exato da página original.
 * 5. Barra de entrada de texto com indicador de digitação (typing indicator).
 */

import React, { useState, useRef, useEffect } from 'react';

/**
 * Componente que oculta/desfoca o bloco de Gabarito com efeito de spoiler,
 * permitindo ao usuário resolver testes e revelar as respostas sob demanda.
 */
const GabaritoSpoiler = ({ text }) => {
  const [isRevealed, setIsRevealed] = useState(false);

  return (
    <div className="gabarito-spoiler-card">
      <div className="gabarito-header-bar">
        <span className="gabarito-title">🔑 Gabarito Oficial</span>
        <button 
          type="button"
          className="reveal-gabarito-btn"
          onClick={() => setIsRevealed(!isRevealed)}
        >
          {isRevealed ? '🙈 Ocultar Gabarito' : '👁️ Revelar Gabarito'}
        </button>
      </div>
      <div className={`gabarito-content ${isRevealed ? 'revealed' : 'blurred'}`}>
        {!isRevealed && (
          <div className="gabarito-blur-overlay" onClick={() => setIsRevealed(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            <span>Gabarito Oculto — Clique para Revelar</span>
          </div>
        )}
        <div className="gabarito-text">{text}</div>
      </div>
    </div>
  );
};

export const ChatArea = ({ 
  user,
  messages, 
  isTyping, 
  onSendMessage, 
  documentActive,
  fileName,
  onUploadClick 
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [hoveredSource, setHoveredSource] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const messagesEndRef = useRef(null);

  // Auto-scroll para a mensagem mais recente
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Envio de formulário de pergunta
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isTyping || !documentActive) return;
    onSendMessage(inputMessage);
    setInputMessage('');
  };

  // Clique em cards de sugestões da tela inicial
  const handleSuggestionClick = (promptText) => {
    if (!documentActive) {
      onUploadClick?.();
      return;
    }
    onSendMessage(promptText);
  };

  // Tooltip de citação de fontes (Páginas do PDF)
  const handleSourceHover = (e, source) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({ x: rect.left, y: rect.top - 10 });
    setHoveredSource(source);
  };

  /**
   * Parser customizado para renderizar Markdown com segurança e elegância:
   * - Identifica e renderiza termos em **negrito**.
   * - Identifica listas com marcadores e hífens.
   * - Identifica blocos de Gabarito para encapsular no componente GabaritoSpoiler.
   */
  const renderFormattedContent = (text) => {
    if (!text) return null;

    const parseInline = (lineText) => {
      const parts = lineText.split(/(\*\*.*?\*\*)/g);
      return parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={pIdx}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });
    };

    const paragraphs = text.split(/\n\n+/);

    return paragraphs.map((paragraph, pIndex) => {
      const lines = paragraph.split('\n');
      
      // Detecção de bloco de Gabarito Oficial
      const isGabarito = /^\s*\*?\*?gabarito\*?\*?/i.test(paragraph.trim()) ||
                         /\[(?:resposta correta|gabarito|resposta)[\s:]*.*?\]/i.test(paragraph.trim());

      if (isGabarito) {
        return (
          <GabaritoSpoiler key={pIndex} text={paragraph} />
        );
      }
      
      // Detecção de listas com marcadores
      const isBulletList = lines.length > 1 && lines.every(line => /^\s*[-*•]\s+/.test(line) || /^\s*\d+\.\s+/.test(line));

      if (isBulletList) {
        return (
          <ul key={pIndex} className="chat-bullet-list">
            {lines.map((line, lIdx) => {
              const cleanLine = line.replace(/^\s*[-*•]\s+/, '').replace(/^\s*\d+\.\s+/, '');
              return <li key={lIdx}>{parseInline(cleanLine)}</li>;
            })}
          </ul>
        );
      }

      // Parágrafos e itens de texto padrão
      return (
        <div key={pIndex} className="chat-paragraph">
          {lines.map((line, lIdx) => {
            if (/^\s*[-*•]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
              const cleanLine = line.replace(/^\s*[-*•]\s+/, '').replace(/^\s*\d+\.\s+/, '');
              return (
                <div key={lIdx} className="chat-list-item">
                  <span className="bullet-dot">•</span>
                  <span>{parseInline(cleanLine)}</span>
                </div>
              );
            }
            return (
              <p key={lIdx} style={{ marginBottom: lIdx < lines.length - 1 ? '0.4rem' : '0' }}>
                {parseInline(line)}
              </p>
            );
          })}
        </div>
      );
    });
  };

  return (
    <main className="chat-container">
      {/* Barra de Cabeçalho com Nome do Documento */}
      <header className="chat-header">
        <div className="chat-header-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          <span>{fileName || 'Nenhum documento selecionado'}</span>
        </div>
        {documentActive && (
          <span className="status-tag">Documento Conectado</span>
        )}
      </header>

      {/* Estado Vazio (Boas-Vindas) ou Fluxo de Mensagens */}
      {messages.length === 0 ? (
        <div className="welcome-container">
          <div className="welcome-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            TalkDoc AI Assistant
          </div>

          <h2 className="welcome-title">Como posso ajudar com o seu documento hoje?</h2>
          <p className="welcome-subtitle">
            {documentActive 
              ? `O documento "${fileName}" foi indexado e está pronto para responder qualquer dúvida.`
              : 'Envie um arquivo PDF na barra lateral para iniciar a leitura com Inteligência Artificial.'}
          </p>

          {/* Cards com sugestões inteligentes de perguntas */}
          <div className="suggestions-grid">
            <div className="suggestion-card" onClick={() => handleSuggestionClick("Me faça um resumo dos pontos principais deste documento.")}>
              <div className="suggestion-title">📝 Resumo Executivo</div>
              <div className="suggestion-desc">Gere uma síntese rápida com os tópicos mais importantes.</div>
            </div>

            <div className="suggestion-card" onClick={() => handleSuggestionClick("Crie perguntas de teste com respostas baseadas no livro.")}>
              <div className="suggestion-title">❓ Quiz de Aprendizado</div>
              <div className="suggestion-desc">Gere perguntas de revisão para testar seus conhecimentos.</div>
            </div>

            <div className="suggestion-card" onClick={() => handleSuggestionClick("Quais são as principais conclusões apresentadas?")}>
              <div className="suggestion-title">💡 Principais Conclusões</div>
              <div className="suggestion-desc">Extraia as recomendações e aprendizados centrais.</div>
            </div>

            <div className="suggestion-card" onClick={() => handleSuggestionClick("Explique os conceitos mais complexos citados no texto.")}>
              <div className="suggestion-title">🔍 Explicação Detalhada</div>
              <div className="suggestion-desc">Simplifique trechos técnicos ou difíceis do arquivo.</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="chat-messages">
          {messages.map((msg, idx) => (
            <div key={idx} className={`message-wrapper ${msg.type}`}>
              {/* Avatar Dinâmico com a inicial do usuário ou AI */}
              <div className={`avatar ${msg.type}`}>
                {msg.type === 'user' 
                  ? (user?.name ? user.name.trim().charAt(0).toUpperCase() : 'U') 
                  : 'AI'}
              </div>
              <div className="message-content">
                <div className="message-bubble">
                  {renderFormattedContent(msg.content)}
                </div>
                {/* Badges de Fontes e Citações de Páginas */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="sources-container">
                    {msg.sources.map((source, sIdx) => (
                      <div 
                        key={sIdx} 
                        className="source-badge"
                        onMouseEnter={(e) => handleSourceHover(e, source)}
                        onMouseLeave={() => setHoveredSource(null)}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        </svg>
                        Pág {source.page}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {/* Indicador de carregamento / digitando */}
          {isTyping && (
            <div className="message-wrapper ai">
              <div className="avatar ai">AI</div>
              <div className="message-content">
                <div className="message-bubble">
                  <div className="typing-indicator">
                    <div className="dot"></div><div className="dot"></div><div className="dot"></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Tooltip flutuante de citação de fonte */}
      {hoveredSource && (
        <div 
          className="source-tooltip" 
          style={{ 
            left: tooltipPos.x, 
            top: tooltipPos.y, 
            transform: 'translate(-50%, -100%)'
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '4px', color: 'var(--accent-blue)' }}>Página {hoveredSource.page}</div>
          <div>"{hoveredSource.content}"</div>
        </div>
      )}

      {/* Barra flutuante de envio de mensagens */}
      <div className="chat-input-container">
        <form onSubmit={handleSubmit} className="chat-input-wrapper">
          <input 
            type="text" 
            className="chat-input"
            placeholder={documentActive ? "Faça uma pergunta sobre o documento..." : "Envie um PDF para ativar o chat..."}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={isTyping || !documentActive}
          />
          <button 
            type="submit" 
            className="send-button"
            disabled={!inputMessage.trim() || isTyping || !documentActive}
            title="Enviar pergunta"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </form>
      </div>
    </main>
  );
};
