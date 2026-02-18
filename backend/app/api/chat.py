"""
Chat API endpoints.
Handles AI tutor interactions about formulas.
"""
from fastapi import APIRouter
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

    For MVP: Returns mock responses based on common questions.
    In production: Will use GPT-4o or Claude 3.5 Sonnet with context injection.

    Args:
        request: ChatRequest with conversation history and context

    Returns:
        ChatResponse with AI answer and suggested follow-up questions
    """
    # Get the last user message
    last_message = request.messages[-1].content if request.messages else ""

    # Mock responses based on keywords
    if "complex exponential" in last_message.lower() or "exponential" in last_message.lower():
        response_text = (
            "The complex exponential e^(-2πi·kn/N) acts like a 'spinning wheel' "
            "that rotates at frequency k. It helps us detect how much of that "
            "specific frequency exists in the original signal by correlation."
        )
        suggestions = [
            "Why is the exponent negative?",
            "What does the frequency k represent?",
        ]
    elif "divide by n" in last_message.lower() or "normalization" in last_message.lower():
        response_text = (
            "Dividing by N normalizes the result so that the output values "
            "represent the average contribution of each frequency, rather than "
            "the total. This makes the transform scale-independent."
        )
        suggestions = [
            "What if I don't normalize?",
            "Does normalization affect the phase?",
        ]
    elif "k increases" in last_message.lower():
        response_text = (
            "As k increases, you're looking at higher frequencies in your signal. "
            "k=0 represents DC (the average), k=1 is the fundamental frequency, "
            "k=2 is twice that frequency, and so on."
        )
        suggestions = [
            "What's the maximum useful value of k?",
            "How do I interpret negative frequencies?",
        ]
    else:
        # Default response
        response_text = (
            "The Discrete Fourier Transform (DFT) converts a sequence of values "
            "in the time domain into components in the frequency domain. "
            "It answers the question: 'What frequencies are present in my signal?'"
        )
        suggestions = [
            "How is this used in audio processing?",
            "What's the difference from continuous Fourier transform?",
        ]

    return ChatResponse(
        message=response_text,
        suggested_questions=suggestions
    )
