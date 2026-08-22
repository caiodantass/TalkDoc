"""
TalkDoc - Backend Application Entrypoint
-----------------------------------------
Este módulo inicializa o servidor FastAPI, configura os middlewares de CORS
para suportar múltiplos navegadores e ambientes (Docker/Localhost), e registra
as rotas de API para upload de documentos e processamento RAG (Retrieval-Augmented Generation).
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.api import upload, chat

# Carrega variáveis de ambiente (.env)
load_dotenv()

app = FastAPI(
    title="TalkDoc API",
    description="API de Inteligência Artificial para leitura, análise e perguntas com RAG em PDFs",
    version="1.0.0"
)

# Configuração de CORS compatível com navegadores modernos (Chromium / Safari / Firefox)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://.*",
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registro dos roteadores de API
app.include_router(upload.router, prefix="/api", tags=["Upload"])
app.include_router(chat.router, prefix="/api", tags=["Chat"])

@app.get("/health", tags=["Monitoramento"])
def health_check():
    """Endpoint de verificação de integridade e liveness do serviço."""
    return {"status": "ok", "app": "TalkDoc API", "version": "1.0.0"}
