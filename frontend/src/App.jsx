/**
 * TalkDoc - Main Application Container (App.jsx)
 * ------------------------------------------------
 * Componente raiz que orquestra:
 * 1. Autenticação e isolamento multi-tenant de dados por e-mail do usuário.
 * 2. Persistência e sincronização em tempo real de históricos e mensagens no localStorage.
 * 3. Restauração automática da sessão e documento ativo ao recarregar a página (F5).
 * 4. Integração entre Sidebar de Upload, Histórico de Sessões e Área de Chat RAG.
 */

import React, { useState, useEffect } from 'react';
import './index.css';
import { useDocumentUpload } from './hooks/useDocumentUpload';
import { useChat } from './hooks/useChat';
import { UploadSidebar } from './components/UploadSidebar';
import { ChatArea } from './components/ChatArea';
import { AuthModal } from './components/AuthModal';

function App() {
  // Hook customizado para upload e processamento de documentos PDF
  const { 
    file, 
    uploadStatus, 
    uploadError, 
    handleUpload,
    resetUpload,
    setFileDirectly
  } = useDocumentUpload();
  
  // Hook customizado para gerenciamento do fluxo de mensagens do chat
  const { 
    messages, 
    setMessages,
    isTyping, 
    sendMessage, 
    clearChat 
  } = useChat();

  // Estado de autenticação do usuário (null indica usuário não autenticado)
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('talkdoc_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  });

  const [history, setHistory] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);

  // Carrega o histórico privado do usuário logado e restaura a última sessão ativa (F5)
  useEffect(() => {
    if (!user || !user.email) {
      setHistory([]);
      setActiveChatId(null);
      return;
    }
    try {
      const userEmail = user.email.trim().toLowerCase();
      const userHistoryKey = `talkdoc_history_${userEmail}`;
      const savedHistory = localStorage.getItem(userHistoryKey);
      const parsedHistory = savedHistory ? JSON.parse(savedHistory) : [];
      
      setHistory(parsedHistory);

      // Restauração da sessão aberta antes do refresh
      const activeKey = `talkdoc_active_id_${userEmail}`;
      const savedActiveId = localStorage.getItem(activeKey);
      
      if (savedActiveId && parsedHistory.length > 0) {
        const found = parsedHistory.find(h => h.id === savedActiveId);
        if (found) {
          setActiveChatId(found.id);
          const loadedMessages = (found.messages && found.messages.length > 0)
            ? found.messages
            : [{ type: 'ai', content: `Documento "${found.fileName}" pronto para bate-papo!` }];
          setMessages(loadedMessages);
          setFileDirectly({ name: found.fileName, size: found.fileSize }, 'success');
        }
      }
    } catch (e) {
      setHistory([]);
    }
  }, [user?.email]);

  // Sincroniza a sessão de autenticação no localStorage
  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem('talkdoc_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('talkdoc_user');
      }
    } catch (e) {
      console.error('Erro ao salvar usuario:', e);
    }
  }, [user]);

  // Salva o histórico particionado por usuário sempre que o array de histórico mudar
  useEffect(() => {
    if (!user || !user.email || history.length === 0) return;
    try {
      const userHistoryKey = `talkdoc_history_${user.email.trim().toLowerCase()}`;
      localStorage.setItem(userHistoryKey, JSON.stringify(history));
    } catch (e) {
      console.error('Erro ao salvar histórico:', e);
    }
  }, [history, user?.email]);

  // Salva o ID da sessão ativa para auto-restauração
  useEffect(() => {
    if (!user || !user.email) return;
    try {
      const activeKey = `talkdoc_active_id_${user.email.trim().toLowerCase()}`;
      if (activeChatId) {
        localStorage.setItem(activeKey, activeChatId);
      } else {
        localStorage.removeItem(activeKey);
      }
    } catch (e) {
      console.error('Erro ao salvar chat ativo:', e);
    }
  }, [activeChatId, user?.email]);

  // Sincroniza as mensagens ativas diretamente no item correspondente do histórico
  useEffect(() => {
    if (!activeChatId || !user?.email || messages.length === 0) return;
    
    setHistory(prev => {
      const updated = prev.map(chat => {
        if (chat.id === activeChatId) {
          return { ...chat, messages };
        }
        return chat;
      });

      // Gravação síncrona imediata para imunidade a perda de dados
      try {
        const userHistoryKey = `talkdoc_history_${user.email.trim().toLowerCase()}`;
        localStorage.setItem(userHistoryKey, JSON.stringify(updated));
      } catch (e) {}

      return updated;
    });
  }, [messages, activeChatId, user?.email]);

  // Callback de sucesso no login / cadastro
  const handleLoginSuccess = (userData) => {
    // Salva o histórico do usuário anterior se houver
    if (user && user.email && history.length > 0) {
      try {
        const prevKey = `talkdoc_history_${user.email.trim().toLowerCase()}`;
        localStorage.setItem(prevKey, JSON.stringify(history));
      } catch (e) {}
    }

    setActiveChatId(null);
    clearChat();
    resetUpload();
    setHistory([]);
    setUser(userData);
  };

  // Encerramento de sessão (Logout com persistência garantida)
  const handleLogout = () => {
    if (user && user.email && history.length > 0) {
      try {
        const userEmail = user.email.trim().toLowerCase();
        localStorage.setItem(`talkdoc_history_${userEmail}`, JSON.stringify(history));
        if (activeChatId) {
          localStorage.setItem(`talkdoc_active_id_${userEmail}`, activeChatId);
        }
      } catch (e) {}
    }

    setActiveChatId(null);
    clearChat();
    resetUpload();
    setHistory([]);
    setUser(null);
  };

  // Finalização bem-sucedida do upload e criação de novo histórico
  const onUploadSuccess = async (selectedFile) => {
    const success = await handleUpload(selectedFile);
    if (success) {
      const initialMessages = [
        { 
          type: 'ai', 
          content: `Documento "${selectedFile.name}" processado com sucesso! O que você gostaria de saber sobre ele?` 
        }
      ];
      setMessages(initialMessages);

      const newChatId = Date.now().toString();
      const newHistoryItem = {
        id: newChatId,
        title: selectedFile.name,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        date: new Date().toLocaleDateString('pt-BR'),
        messages: initialMessages
      };

      setHistory(prev => {
        const updated = [newHistoryItem, ...prev];
        if (user && user.email) {
          try {
            const userHistoryKey = `talkdoc_history_${user.email.trim().toLowerCase()}`;
            localStorage.setItem(userHistoryKey, JSON.stringify(updated));
          } catch (e) {}
        }
        return updated;
      });

      setActiveChatId(newChatId);
    }
  };

  // Criação de nova sessão limpa (+ Novo Chat)
  const handleNewChat = () => {
    clearChat();
    resetUpload();
    setActiveChatId(null);
  };

  // Seleção e troca de sessão a partir do histórico
  const handleSelectChat = (id) => {
    const selected = history.find(h => h.id === id);
    if (selected) {
      setActiveChatId(id);
      
      const loadedMessages = (selected.messages && selected.messages.length > 0)
        ? selected.messages
        : [{ 
            type: 'ai', 
            content: `Documento "${selected.fileName}" carregado do histórico! O que você gostaria de saber sobre ele?` 
          }];
          
      setMessages(loadedMessages);
      setFileDirectly({ name: selected.fileName, size: selected.fileSize }, 'success');
    }
  };

  // Exclusão de sessão do histórico
  const handleDeleteChat = (id) => {
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    if (user && user.email) {
      try {
        const userHistoryKey = `talkdoc_history_${user.email.trim().toLowerCase()}`;
        localStorage.setItem(userHistoryKey, JSON.stringify(updated));
      } catch (e) {}
    }
    if (activeChatId === id) {
      handleNewChat();
    }
  };

  // SE NÃO ESTIVER AUTENTICADO: Exibe tela cheia de Login / Cadastro
  if (!user) {
    return (
      <div className="auth-page-container">
        <AuthModal 
          isOpen={true}
          allowClose={false}
          onClose={() => {}}
          onLoginSuccess={handleLoginSuccess}
        />
      </div>
    );
  }

  // SE AUTENTICADO: Exibe workspace completo do TalkDoc
  return (
    <div className="app-container">
      <UploadSidebar 
        file={file}
        uploadStatus={uploadStatus}
        uploadError={uploadError}
        onUpload={onUploadSuccess}
        onNewChat={handleNewChat}
        history={history}
        activeChatId={activeChatId}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        user={user}
        onOpenAuth={() => {}}
        onLogout={handleLogout}
      />
      
      <ChatArea 
        user={user}
        messages={messages}
        isTyping={isTyping}
        onSendMessage={sendMessage}
        documentActive={uploadStatus === 'success'}
        fileName={file?.name}
        onUploadClick={handleNewChat}
      />
    </div>
  );
}

export default App;
