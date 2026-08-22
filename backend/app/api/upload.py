"""
Roteador de Upload de Documentos
--------------------------------
Recebe arquivos no formato PDF via multipart/form-data e delega o processamento
para o DocumentService (extração, chunking, embeddings e indexação vetorial).
"""

from fastapi import APIRouter, UploadFile, File
from app.services.document_service import document_service

router = APIRouter()

@router.post("/upload", summary="Enviar e Indexar Documento PDF")
async def upload_document(file: UploadFile = File(...)):
    """
    Endpoint para envio de documento PDF.
    Extrai o texto, divide em chunks semânticos e indexa os vetores no ChromaDB.
    """
    return await document_service.process_pdf(file)
