/**
 * TalkDoc - API Client Service
 * -----------------------------
 * Camada de comunicação HTTP entre o Frontend e o Backend FastAPI.
 * Implementa estratégia de multi-fallback transparente para garantir conectividade
 * mesmo com variações de rede (Proxy Reverso do Vite / Localhost / 127.0.0.1).
 */

const URLS = [
  '/api',                       // Prioridade 1: Proxy interno do Vite (same-origin, imune a CORS)
  'http://localhost:8000/api',  // Prioridade 2: Backend direto via localhost
  'http://127.0.0.1:8000/api'   // Prioridade 3: Backend direto via IPv4 loopback
];

/**
 * Executa requisição HTTP com tentativa sequencial de endpoints caso haja falha de rede.
 */
async function fetchWithFallback(endpoint, options) {
  let lastError = null;
  for (const baseUrl of URLS) {
    try {
      const fullUrl = `${baseUrl}${endpoint}`;
      const res = await fetch(fullUrl, options);
      return res;
    } catch (err) {
      console.warn(`[TalkDoc API] Falha de rede em ${baseUrl}${endpoint}, tentando próximo...`, err);
      lastError = err;
    }
  }
  throw lastError || new Error('Não foi possível estabelecer conexão com o backend.');
}

export const documentService = {
  /**
   * Envia um arquivo PDF para extração e indexação vetorial.
   * @param {File} file - Arquivo PDF selecionado pelo usuário.
   */
  async uploadDocument(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetchWithFallback('/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || 'Falha ao processar o arquivo.');
    }
    return data;
  },

  /**
   * Envia mensagem de chat e executa busca semântica RAG no documento ativo.
   * @param {string} message - Pergunta do usuário.
   */
  async sendChatMessage(message) {
    const response = await fetchWithFallback('/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || 'Erro na comunicação com a API.');
    }
    return data;
  }
};
