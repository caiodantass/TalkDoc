"""
Esquemas de Dados (Pydantic Models)
-----------------------------------
Define os contratos de entrada e saída (Request/Response) da API TalkDoc,
garantindo tipagem estrita, validação automática e documentação OpenAPI/Swagger.
"""

from pydantic import BaseModel, Field
from typing import List

class ChatRequest(BaseModel):
    """Payload de envio de pergunta do usuário."""
    message: str = Field(..., description="Pergunta ou instrução enviada pelo usuário")
    
class SourceInfo(BaseModel):
    """Metadados dos trechos recuperados do documento que fundamentam a resposta."""
    page: int = Field(..., description="Número da página original no PDF")
    content: str = Field(..., description="Trecho do texto extraído para citação")

class ChatResponse(BaseModel):
    """Resposta gerada pela IA fundamentada no documento com fontes."""
    answer: str = Field(..., description="Texto da resposta gerada pelo modelo")
    sources: List[SourceInfo] = Field(default=[], description="Lista de trechos e páginas de referência")
