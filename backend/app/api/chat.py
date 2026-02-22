"""
Chat API endpoints.
Handles AI tutor interactions about formulas.
"""
from fastapi import APIRouter, HTTPException, status
from app.models.formula import ChatRequest, ChatResponse

router = APIRouter()


# TODO: Security — This endpoint will proxy to GPT-4o/Claude and should be
# protected with authentication + per-user rate limiting. Also enforce
# server-side limits on request payload size (max messages per conversation,
# max characters per message) to prevent token-cost abuse via inflated context.
@router.post("/chat", response_model=ChatResponse)
async def chat_with_tutor(request: ChatRequest):
    """
    Chat with the AI tutor about a formula.

    Will use GPT-4o or Claude 3.5 Sonnet with context injection.

    Args:
        request: ChatRequest with conversation history and context

    Returns:
        ChatResponse with AI answer and suggested follow-up questions
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Chat endpoint requires LLM integration. See CLAUDE.md for implementation guidance."
    )
