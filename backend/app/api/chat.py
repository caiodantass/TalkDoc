"""
Roteador de Conversação RAG (Chat)
----------------------------------
Processa perguntas do usuário utilizando o pipeline RAG do DocumentService,
retornando a resposta gerada pela LLM com as fontes e páginas referenciadas.
"""

from fastapi import APIRouter
from app.models.schemas import ChatRequest, ChatResponse
from app.services.document_service import document_service

router = APIRouter()

@router.post("/chat", response_model=ChatResponse, summary="Conversar com o Documento Ativo")
async def chat_with_document(request: ChatRequest):
    """
    Recebe a mensagem/pergunta do usuário, busca os trechos semânticos mais
    relevantes no ChromaDB e gera a resposta fundamentada com IA.
    """
    return await document_service.chat(request.message)
