"""
TalkDoc - Document & RAG Pipeline Service
-----------------------------------------
Este serviço centraliza todo o pipeline de processamento RAG (Retrieval-Augmented Generation):
1. Extração de texto página a página via PyMuPDF (fitz).
2. Segmentação semântica de texto (Chunking) com RecursiveCharacterTextSplitter.
3. Geração de Embeddings vetoriais locais rápidos usando FastEmbed (BAAI/bge-small-en-v1.5).
4. Armazenamento vetorial persistente e isolamento atômico de sessões no ChromaDB.
5. Interceptador de saudações/cortesias com tolerância a erros ortográficos (0.01s).
6. Recuperação top-k semântica e geração de resposta fundamentada com LLM (Groq / Gemini)
   com prompt anti-alucinação e formatação de gabaritos ocultos para testes.
"""

import os
import shutil
import tempfile
import fitz  # PyMuPDF para extração rápida de PDF
import chromadb
from chromadb.config import Settings
from fastapi import UploadFile, HTTPException
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_community.embeddings.fastembed import FastEmbedEmbeddings
from langchain_groq import ChatGroq
from langchain.prompts import PromptTemplate
from langchain_community.vectorstores import Chroma

# Diretório e nome de coleção para persistência no ChromaDB
CHROMA_DB_DIR = os.environ.get(
    "CHROMA_DB_DIR", 
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "chroma_db")
)
COLLECTION_NAME = "talkdoc_active_doc"

class DocumentService:
    """
    Serviço que gerencia o ciclo de vida completo dos documentos PDF e
    a execução de consultas RAG com modelos de linguagem.
    """

    def __init__(self):
        """Inicializa provedores de embeddings, cliente vetorial e LLM."""
        groq_key = os.environ.get("GROQ_API_KEY")
        api_key = os.environ.get("GEMINI_API_KEY")
        
        # Modelo de embeddings local ultrarrápido (ONNX / CPU multithread)
        self.embeddings = FastEmbedEmbeddings(model_name="BAAI/bge-small-en-v1.5")
        
        # Cliente persistente oficial do ChromaDB com telemetria desativada
        os.makedirs(CHROMA_DB_DIR, exist_ok=True)
        self.chroma_client = chromadb.PersistentClient(
            path=CHROMA_DB_DIR,
            settings=Settings(anonymized_telemetry=False, is_persistent=True)
        )
        
        # Prioriza Groq (Llama 3 / Mixtral) ou Gemini com temperatura 0.0 para respostas 100% determinísticas e factuais
        if groq_key:
            self.llm = ChatGroq(temperature=0.0, groq_api_key=groq_key, model_name="openai/gpt-oss-20b")
        elif api_key:
            self.llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", temperature=0.0, google_api_key=api_key)
        else:
            raise HTTPException(
                status_code=500, 
                detail="Nenhuma chave de API (GROQ_API_KEY ou GEMINI_API_KEY) foi encontrada no arquivo .env"
            )
        
    def _get_vectorstore(self) -> Chroma:
        """Retorna a instância do ChromaDB conectada à coleção ativa."""
        return Chroma(
            client=self.chroma_client,
            collection_name=COLLECTION_NAME,
            embedding_function=self.embeddings
        )
        
    def _clear_vectorstore(self):
        """Limpa a coleção anterior de forma segura e atômica no SQLite sem fechar conexões."""
        try:
            self.chroma_client.delete_collection(COLLECTION_NAME)
        except Exception:
            pass

    async def process_pdf(self, file: UploadFile):
        """
        Processa um arquivo PDF:
        - Extrai o texto preservando metadados de página.
        - Segmenta em chunks otimizados (chunk_size = 3500).
        - Gera embeddings em lotes (batch processing de 100) para máxima velocidade.
        """
        if not file.filename.endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Apenas arquivos no formato PDF são suportados.")
        
        temp_path = None
        try:
            content = await file.read()
            file_size_mb = len(content) / (1024 * 1024)
            print(f"\n📥 [TalkDoc Backend] Recebido upload: '{file.filename}' ({file_size_mb:.2f} MB)", flush=True)
            
            # Limpa documento anterior de forma atômica
            self._clear_vectorstore()
            os.makedirs(CHROMA_DB_DIR, exist_ok=True)
            
            # Salva arquivo temporário para processamento com PyMuPDF
            fd, temp_path = tempfile.mkstemp(suffix=".pdf")
            with os.fdopen(fd, "wb") as f:
                f.write(content)
                
            # Extração de texto página a página
            print(f"📄 [TalkDoc Backend] Abrindo PDF e extraindo texto das páginas...", flush=True)
            docs = []
            doc = fitz.open(temp_path)
            total_pages = len(doc)
            for page_num in range(total_pages):
                page = doc.load_page(page_num)
                text = page.get_text("text")
                if text.strip():
                    docs.append({
                        "content": text,
                        "metadata": {"page": page_num + 1}
                    })
            doc.close()
            
            print(f"📄 [TalkDoc Backend] Extraído texto de {len(docs)} páginas (total de {total_pages} páginas no PDF).", flush=True)
            
            if not docs:
                raise HTTPException(
                    status_code=400, 
                    detail="Não foi possível extrair texto deste PDF. O arquivo pode ser um documento escaneado sem camada de texto."
                )
                
            # Divisão semântica de texto (chunk_size=3500 para reduzir quantidade mantendo alta qualidade)
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=3500,
                chunk_overlap=350,
                length_function=len
            )
            
            chunks = []
            metadatas = []
            for d in docs:
                page_chunks = text_splitter.split_text(d["content"])
                for chunk in page_chunks:
                    chunks.append(chunk)
                    metadatas.append(d["metadata"])
                    
            total_chunks = len(chunks)
            print(f"✂️ [TalkDoc Backend] Dividido em {total_chunks} chunks de texto.", flush=True)
                    
            # Inicializa o vectorstore Chroma usando o cliente persistente compartilhado
            vectorstore = Chroma(
                client=self.chroma_client,
                collection_name=COLLECTION_NAME,
                embedding_function=self.embeddings
            )
            
            # Inserção em Lotes (Batch Processing de 100 em 100) para aceleração de CPU
            batch_size = 100
            total_batches = (total_chunks + batch_size - 1) // batch_size
            
            print(f"🧠 [TalkDoc Backend] Iniciando geração de embeddings e inserção vetorial em {total_batches} lotes...", flush=True)
            
            for idx, i in enumerate(range(0, total_chunks, batch_size)):
                batch_chunks = chunks[i:i + batch_size]
                batch_metadatas = metadatas[i:i + batch_size]
                vectorstore.add_texts(texts=batch_chunks, metadatas=batch_metadatas)
                print(f"   ⚡ [Lote {idx + 1}/{total_batches}] {min(i + batch_size, total_chunks)}/{total_chunks} chunks indexados...", flush=True)
                
            print(f"✅ [TalkDoc Backend] Documento '{file.filename}' indexado com sucesso!\n", flush=True)
            
            return {
                "message": "Documento processado e indexado com sucesso", 
                "chunks": total_chunks, 
                "pages": len(docs)
            }
            
        except Exception as e:
            print(f"❌ [TalkDoc Backend] Erro no processamento do PDF: {str(e)}", flush=True)
            raise HTTPException(status_code=500, detail=f"Erro ao processar o PDF: {str(e)}")
        finally:
            if temp_path and os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except Exception:
                    pass

    async def chat(self, message: str):
        """
        Executa a busca RAG:
        1. Responde saudações/cortesias instantaneamente via interceptor tolerante a erros (0.01s).
        2. Realiza busca vetorial top-k no ChromaDB.
        3. Envia contexto + pergunta com prompt anti-alucinação e regras de escopo para a LLM.
        4. Retorna resposta fundamentada com citações de páginas.
        """
        try:
            col = self.chroma_client.get_collection(COLLECTION_NAME)
            if col.count() == 0:
                raise Exception("Coleção vazia")
        except Exception:
            raise HTTPException(
                status_code=400, 
                detail="Nenhum documento foi enviado ainda. Envie um arquivo PDF na barra lateral para começar."
            )
            
        # 1. Interceptador Inteligente com Tolerância a Erros de Digitação e Grafia (Resposta em 0.01s)
        clean_msg = message.strip().lower().replace("!", "").replace(".", "").replace("?", "").replace(",", "").replace(";", "")
        
        # Saudações de Horário
        if any(w in clean_msg for w in ["bom dia", "bm dia", "bon dia", "bondia"]):
            return {"answer": "Olá! **Bom dia!** Sou o **TalkDoc**, seu assistente de leitura. Como posso te ajudar com o documento ativo hoje?", "sources": []}
        if any(w in clean_msg for w in ["boa tarde", "ba tarde", "boatarde"]):
            return {"answer": "Olá! **Boa tarde!** Sou o **TalkDoc**, seu assistente. O que gostaria de analisar no seu documento?", "sources": []}
        if any(w in clean_msg for w in ["boa noite", "ba noite", "boanoite"]):
            return {"answer": "Olá! **Boa noite!** Sou o **TalkDoc**. Qual dúvida posso tirar do seu arquivo agora?", "sources": []}
            
        # Perguntas Sociais / Cortesia
        if any(w in clean_msg for w in ["como voce esta", "como vc ta", "como vc esta", "como voce ta", "voce esta bem", "vc ta bem", "voce ta bem", "como vai", "tudo bem"]):
            return {"answer": "Estou muito bem, obrigado por perguntar! 😊 Sou o **TalkDoc** e estou pronto para te ajudar a analisar seu documento. O que você gostaria de saber?", "sources": []}
            
        # Capacidades do TalkDoc
        if any(w in clean_msg for w in ["como pode me ajudar", "como vc pode me ajudar", "o que voce faz", "o que vc faz", "funcionalidades", "como me ajuda"]):
            return {
                "answer": "Como assistente **TalkDoc**, posso te ajudar de várias formas com o seu PDF:\n\n- **Resumir capítulos** e extrair pontos centrais;\n- **Tirar dúvidas específicas** sobre conceitos ou termos do texto;\n- **Criar testes/quizzes** com perguntas e respostas para revisão;\n- **Explicar trechos difíceis** de maneira simples e didática.\n\nO que você gostaria de explorar no seu arquivo agora?",
                "sources": []
            }
            
        # Agradecimentos
        if any(w in clean_msg for w in ["obrigad", "obgd", "valeu", "vlw", "agradecid", "tanks", "thanks"]):
            return {"answer": "Por nada! Fico muito feliz em ajudar. 😊 Se precisar de mais alguma informação sobre o documento, é só chamar!", "sources": []}
            
        # Identidade
        if any(w in clean_msg for w in ["quem e voce", "quem vc e", "qual seu nome", "seu nome"]):
            return {"answer": "Meu nome é **TalkDoc**! Sou seu assistente de Inteligência Artificial para leitura e análise profunda de documentos PDF.", "sources": []}

        # Saudações Básicas
        if clean_msg in ["ola", "olá", "oi", "oie", "opa", "hello", "hi", "hey"]:
            return {"answer": "Olá! Sou o **TalkDoc**. Estou pronto para responder qualquer dúvida sobre o documento ativo!", "sources": []}
            
        # 2. Busca Vetorial Semântica Top-K (k=6)
        print(f"\n💬 [TalkDoc Backend] Pergunta recebida: '{message}'", flush=True)
        vectorstore = self._get_vectorstore()
        retriever = vectorstore.as_retriever(search_kwargs={"k": 6})
        
        try:
            print(f"🔍 [TalkDoc Backend] Buscando trechos relevantes no ChromaDB...", flush=True)
            docs = retriever.invoke(message)
        except Exception as e:
            print(f"❌ [TalkDoc Backend] Erro na busca vetorial: {str(e)}", flush=True)
            raise HTTPException(
                status_code=500, 
                detail=f"Erro ao buscar no banco de dados vetorial: {str(e)}"
            )
        
        if not docs:
            print(f"⚠️ [TalkDoc Backend] Nenhum trecho relevante encontrado para a pergunta.", flush=True)
            return {
                "answer": "Não encontrei informações relevantes neste documento para responder à sua pergunta. Tente reformular com palavras-chave relacionadas ao tema do arquivo.",
                "sources": []
            }
            
        print(f"📄 [TalkDoc Backend] Recuperados {len(docs)} trechos relevantes. Gerando resposta com a IA...", flush=True)
            
        # 3. Montagem do Contexto e Citações com Número de Página
        context_parts = []
        sources = []
        for i, doc in enumerate(docs):
            page_num = doc.metadata.get('page', 0)
            context_parts.append(f"[Trecho {i+1} - Página {page_num}]:\n{doc.page_content}")
            sources.append({
                "page": page_num,
                "content": doc.page_content[:220] + "..."  # Snippet para tooltip visual
            })
            
        context_text = "\n\n---\n\n".join(context_parts)
        
        # 4. Prompt Anti-Alucinação Estrito em Português com Regra Rígida de Escopo
        prompt_template = """
Você é o **TalkDoc**, um assistente de Inteligência Artificial especializado exclusivamente na leitura, análise, síntese e geração de testes sobre o documento PDF enviado pelo usuário.

REGRAS DE CONVERSAÇÃO E ESCOPO OBRIGATÓRIAS:

1. **ESCOPO ESTRITO (DOCUMENTO PDF E SAUDAÇÕES/CORTESIAS)**:
   - Você SÓ PODE responder perguntas que tenham relação direta com o CONTEXTO do documento PDF ativo fornecido abaixo (ou saudações e dúvidas sobre você e como você pode ajudar).
   - Se a pergunta do usuário for sobre qualquer outro assunto aleatório do mundo, curiosidades gerais, receitas, fofocas, esportes, política ou temas que **NÃO PERTENCEM AO DOCUMENTO**, você é ESTRITAMENTE PROIBIDO de responder com conhecimento geral da internet.
   - Em caso de pergunta fora do assunto do documento, responda OBRIGATORIAMENTE assim:
     "⚠️ **Pergunta fora do escopo do documento**: Como assistente do **TalkDoc**, só posso responder sobre o conteúdo do documento PDF que você enviou (ou saudações e dúvidas de como posso te ajudar com ele). Por favor, faça uma pergunta relacionada ao arquivo ativo!"

2. **INFORMAÇÃO DO TEMA DO DOCUMENTO NÃO ENCONTRADA**:
   - Se a pergunta for sobre o tema do documento, mas a informação exata solicitada não estiver presente nos trechos fornecidos no CONTEXTO, responda:
     "⚠️ **Informação não encontrada no texto**: Não encontrei essa informação específica nos trechos do documento PDF enviado."

3. **FORMATO RÍGIDO DE MÚLTIPLA ESCOLHA (QUIZZES E TESTES)**:
   - Sempre que o usuário pedir questões, testes ou quizzes, numere cada pergunta (1., 2., 3.) e formate as alternativas OBRIGATORIAMENTE com letras A), B), C), D) e E):
     1. Enunciado da questão?
     A) Primeira alternativa
     B) Segunda alternativa
     C) Terceira alternativa
     D) Quarta alternativa
     E) Quinta alternativa
   - Ao final da mensagem, inclua SEMPRE o gabarito oficial com a resposta de cada questão no formato:
     **Gabarito**
     [Resposta Correta: 1-A, 2-C, 3-D]

4. **TOLERÂNCIA TOTAL A ERROS DE DIGITAÇÃO E ORTOGRAFIA**:
   - Se o usuário digitar termos com erros ortográficos ou letras faltando (ex: "capitlo", "htmll", "explic"), corrija mentalmente e responda perfeitamente sobre o tema correspondente do PDF.

5. **FORMATAÇÃO VISUAL ORGANIZADA**:
   - Destaque conceitos centrais em **negrito**.
   - Use listas com marcadores (- ) para enumerações e passos.
   - Divida o texto em parágrafos claros.

6. **IDIOMA**: Responda SEMPRE em Português do Brasil (pt-BR).

CONTEXTO EXTRAÍDO DO DOCUMENTO PDF:
{context}

PERGUNTA DO USUÁRIO:
{question}

RESPOSTA DO TALKDOC:
"""
        
        prompt = PromptTemplate(
            template=prompt_template,
            input_variables=["context", "question"]
        )
        
        chain = prompt | self.llm
        
        try:
            response = chain.invoke({"context": context_text, "question": message})
            answer_text = response.content
            
            # Se for resposta fora do escopo ou não encontrada, não exibe as fontes de páginas do PDF
            if "fora do escopo" in answer_text.lower() or "não encontrei" in answer_text.lower():
                final_sources = []
            else:
                final_sources = sources
                
            return {
                "answer": answer_text,
                "sources": final_sources
            }
        except Exception as e:
            err_msg = str(e)
            # Mapeamento de erros amigáveis para o usuário
            if "429" in err_msg or "Rate limit" in err_msg:
                user_friendly_error = "O limite de requisições temporário da IA foi atingido. Aguarde alguns segundos e tente novamente."
            elif "401" in err_msg or "403" in err_msg or "API key" in err_msg:
                user_friendly_error = "Chave de API inválida ou sem permissão. Verifique sua chave no arquivo .env."
            elif "404" in err_msg or "not found" in err_msg:
                user_friendly_error = "O modelo de IA configurado não foi encontrado ou está em manutenção."
            else:
                user_friendly_error = f"Erro na comunicação com a IA: {err_msg}"
                
            raise HTTPException(status_code=500, detail=user_friendly_error)

# Instância singleton do serviço
document_service = DocumentService()
