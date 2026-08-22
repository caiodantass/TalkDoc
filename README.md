# 📄 TalkDoc - RAG Document Chat & AI Assistant

Aplicação Web Fullstack com arquitetura **RAG (Retrieval-Augmented Generation)** de alta performance, desenvolvida para o **Desafio Técnico TalkDoc (YAITEC Solutions)**.

O **TalkDoc** permite que usuários façam upload de documentos em formato PDF, processem o conteúdo com extração inteligente e conversem com o documento em tempo real através de Inteligência Artificial generativa fundamentada, com citações explícitas de trechos e páginas de referência.

---

## 🏛️ Arquitetura do Sistema

O projeto adota uma arquitetura desacoplada e modular entre Backend (API REST RAG) e Frontend (Single Page Application moderna):

```
TalkDoc/
├── backend/
│   ├── app/
│   │   ├── api/             # Roteadores REST (/api/upload, /api/chat)
│   │   ├── models/          # Schemas Pydantic tipados (ChatRequest, ChatResponse, SourceInfo)
│   │   ├── services/        # Pipeline RAG, Chunking, Embeddings e Integração com LLMs
│   │   └── main.py          # FastAPI app, Middlewares CORS e Healthcheck
│   ├── Dockerfile           # Imagem Python 3.10-slim otimizada
│   └── requirements.txt     # Dependências (FastAPI, PyMuPDF, LangChain, ChromaDB, FastEmbed)
│
├── frontend/
│   ├── src/
│   │   ├── components/      # ChatArea, UploadSidebar, ChatHistory, AuthModal
│   │   ├── hooks/           # useChat, useDocumentUpload (Custom Hooks React)
│   │   ├── services/        # Camada de comunicação HTTP com Multi-Fallback
│   │   ├── App.jsx          # Container orquestrador, auto-restauração e multi-tenant
│   │   └── index.css        # Design System moderno em CSS Puro (Dark Glassmorphism)
│   ├── Dockerfile           # Imagem Node.js com Vite Dev Server
│   └── vite.config.js       # Proxy reverso /api integrado
│
├── docker-compose.yml       # Orquestração unificada de containers com volume e hot-reload
└── .env.example             # Modelo seguro de variáveis de ambiente
```

---

## ⚙️ Pipeline de IA e RAG (Retrieval-Augmented Generation)

1. **Extração de Texto Precisa**:
   - Utilização da biblioteca `PyMuPDF (fitz)` para leitura rápida e extração de texto preservando metadados exatos de cada página.

2. **Chunking Semântico Otimizado**:
   - `RecursiveCharacterTextSplitter` configurado com `chunk_size = 3500` e `chunk_overlap = 350`, gerando blocos semânticos densos e reduzindo o overhead vetorial.

3. **Embeddings Locais Ultrarrápidos**:
   - Utilização do modelo `FastEmbed (BAAI/bge-small-en-v1.5)` rodando localmente via ONNX Runtime com multithreading em CPU, garantindo geração de embeddings em milissegundos sem custos de API ou limites de taxa externos.

4. **Armazenamento Vetorial e Isolamento de Coleções**:
   - Utilização do **ChromaDB** persistente (`PersistentClient`) com deleção atômica de coleções entre uploads, prevenindo conflitos de concorrência ou bloqueios de SQLite.
   - **Inserção em Lotes (Batch Processing de 100)**: Acelera o processamento de livros pesados (centenas de páginas) em até 10x.

5. **Recuperação Top-K e Geração Fundamentada**:
   - Busca por similaridade vetorial com `k = 6` trechos mais relevantes.
   - Chamada a modelos de ponta com **temperatura 0.0** (`Groq / Llama 3 / Mixtral` ou `Google Gemini 1.5 Flash`) para respostas 100% determinísticas e factuais.

6. **Prompt Engineering & Regras de Escopo**:
   - **Escopo Estrito do Documento**: A IA responde exclusivamente com base no PDF. Perguntas aleatórias fora do assunto são recusadas educadamente.
   - **Tolerância a Erros Ortográficos**: Entende a intenção do usuário mesmo com erros de digitação e typos.
   - **Gabarito Oculto com Efeito Spoiler**: Quizzes e testes gerados contam com o gabarito protegido/borrado, com botão de revelação sob demanda (`👁️ Revelar Gabarito`).

---

## 🛠️ Decisões Técnicas

1. **FastAPI no Backend**: Escolhido pela alta velocidade assíncrona, validação nativa com Pydantic e documentação interativa automática OpenAPI/Swagger.
2. **Proxy Reverso no Vite**: O Frontend encaminha chamadas para `/api` diretamente pela rede interna do Docker, eliminando conflitos de CORS entre navegadores.
3. **Multi-Tenant e Persistência Local**: Históricos, conversas e documentos ativos são isolados por e-mail no `localStorage`, garantindo restauração instantânea após recarregar a página (`F5`).
4. **CSS Puro com Design System Personalizado**: Interface desenvolvida em CSS moderno com variáveis, sombras neon, efeito Glassmorphism e responsividade completa.

---

## ⚠️ Limitações Conhecidas

- **PDFs Escaneados (Imagens)**: Arquivos sem camada de texto (scans fotográficos sem OCR prévio) não possuem caracteres extraíveis pelo PyMuPDF.
- **Contexto Ativo Singular**: A aplicação foca a busca semântica no documento atualmente ativo na sessão. Ao trocar de documento ou iniciar novo chat, o índice da sessão ativa é alternado.

---

## 🤖 Ferramentas de IA Utilizadas no Desenvolvimento

Durante o desenvolvimento do projeto, assistentes de IA baseados em LLMs foram utilizados para:
- Apoio na ideação e refinamento de prompts do sistema RAG.
- Geração de código boilerplate e auxílio no pareamento de regex para detecção de spoilers e formatação de Markdown.

**Decisões que permaneceram sob responsabilidade humana**:
- Definição da arquitetura desacoplada e do pipeline de embeddings locais via FastEmbed.
- Implementação da estratégia de batching para indexação de livros pesados.
- Construção da experiência de usuário (UX), componentes React e Design System em CSS.
- Resolução de concorrência e isolamento atômico de coleções no ChromaDB.

---

## 🚀 Como Executar o Projeto

### Pré-requisitos
- [Docker](https://www.docker.com/) e [Docker Compose](https://docs.docker.com/compose/) instalados.
- Uma chave de API gratuita do **Groq** ([console.groq.com](https://console.groq.com/keys)) ou **Google Gemini** ([aistudio.google.com](https://aistudio.google.com/)).

### Passo a Passo

1. **Clone o repositório**:
   ```bash
   git clone <URL_DO_REPOSITORIO>
   cd TalkDoc
   ```

2. **Configure o arquivo de variáveis de ambiente**:
   Copie o arquivo de exemplo `.env.example` para `.env` (na raiz ou dentro de `backend/`):
   ```bash
   cp .env.example backend/.env
   ```
   Abra o arquivo `backend/.env` e insira sua chave:
   ```env
   GROQ_API_KEY=gsk_sua_chave_aqui
   # OU
   GEMINI_API_KEY=sua_chave_gemini_aqui
   ```

3. **Suba a aplicação com Docker Compose**:
   ```bash
   docker compose up --build
   ```

4. **Acesse no seu navegador**:
   - **Aplicação Web (Frontend)**: [http://localhost:5173](http://localhost:5173)
   - **Documentação da API (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)
   - **Healthcheck**: [http://localhost:8000/health](http://localhost:8000/health)

---

Desenvolvido com foco em excelência técnica, código limpo e arquitetura de IA escalável. 🚀
