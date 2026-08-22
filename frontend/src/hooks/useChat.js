import { useState } from 'react';
import { documentService } from '../services/api';

export const useChat = () => {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);

  const initChat = () => {
    setMessages([
      { 
        type: 'ai', 
        content: 'Documento processado com sucesso! O que você gostaria de saber sobre ele?' 
      }
    ]);
  };

  const clearChat = () => {
    setMessages([]);
  };

  const sendMessage = async (messageText) => {
    if (!messageText.trim()) return;

    const userMsg = { type: 'user', content: messageText };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const data = await documentService.sendChatMessage(messageText);
      
      setMessages(prev => [...prev, {
        type: 'ai',
        content: data.answer,
        sources: data.sources
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        type: 'ai',
        content: `Desculpe, ocorreu um erro: ${err.message}`
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return {
    messages,
    setMessages,
    isTyping,
    sendMessage,
    initChat,
    clearChat
  };
};
