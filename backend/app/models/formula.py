"""
Formula data models.
These models define the structure for formula parsing results.
"""
from typing import List, Optional, Tuple
from pydantic import BaseModel, Field
from datetime import datetime


class MicroToken(BaseModel):
    """
    Represents a single token in the micro (syntax-level) view.

    Attributes:
        index: Position range in the LaTeX string [start, end]
        symbol: The LaTeX symbol (e.g., "x_i", "N", "\\sum")
        role: Syntactic role ("variable", "constant", "operator", "function")
        color_id: Color identifier for highlighting (e.g., "var_blue")
        definition: Optional human-readable definition
    """
    index: Tuple[int, int] = Field(..., description="Position in LaTeX string")
    symbol: str = Field(..., description="LaTeX symbol")
    role: str = Field(..., description="Syntactic role")
    color_id: str = Field(..., description="Color identifier")
    definition: Optional[str] = Field(None, description="Symbol definition")


class MicroMap(BaseModel):
    """
    Collection of micro tokens representing syntax-level breakdown.
    """
    tokens: List[MicroToken] = Field(..., description="List of syntax tokens")


class MacroGroup(BaseModel):
    """
    Represents a semantic group in the macro (meaning-level) view.

    Attributes:
        ranges: List of LaTeX string ranges [[start, end], ...] for each symbol in the group
        latex: The LaTeX substrings for this group
        label: Semantic label (e.g., "Normalization Constant")
        narrative_span: Position in narrative text [start, end]
    """
    ranges: List[Tuple[int, int]] = Field(..., description="LaTeX string ranges for each symbol")
    latex: List[str] = Field(..., description="LaTeX substrings")
    label: str = Field(..., description="Semantic label")
    narrative_span: Tuple[int, int] = Field(..., description="Position in narrative text")
    children: List[int] = Field(default_factory=list, description="Indices of direct child groups")


class MacroMap(BaseModel):
    """
    Collection of semantic groups with narrative explanation.
    """
    groups: List[MacroGroup] = Field(..., description="Semantic groups")
    narrative: str = Field(..., description="Plain English explanation")


class FormulaData(BaseModel):
    """
    Complete formula data structure with both micro and macro views.
    """
    id: str = Field(..., description="Unique formula identifier")
    latex: str = Field(..., description="Original LaTeX string")
    micro: Optional[MicroMap] = Field(None, description="Syntax-level breakdown")
    macro: MacroMap = Field(..., description="Semantic grouping")
    spark_chips: Optional[List[str]] = Field(
        None,
        description="Suggested questions"
    )
    timestamp: str = Field(
        default_factory=lambda: datetime.utcnow().isoformat(),
        description="Creation timestamp"
    )
    
class ComponentBreakdown(BaseModel):
    """A single component of a formula."""
    symbol: List[str] = Field(..., description="LaTeX substrings for this component (1 or more disjoint spans)")
    counterpart: str = Field(..., description="Exact substring from explanation this symbol maps to")
    role: str = Field(..., description="What this component does, in plain English")
    children: List[int] = Field(default_factory=list, description="Indices of direct child components (into the components array)")
    
class TestParseResponse(BaseModel):
    latex: str = Field(..., description="Original Latex String")
    explanation: str = Field(..., description="1-2 sentence intuitive explanation")
    components: List[ComponentBreakdown] = Field(..., description="Major component breakdown")


class OCRRequest(BaseModel):
    """Request model for OCR endpoint."""
    image_base64: str = Field(..., description="Base64 encoded image")


class OCRResponse(BaseModel):
    """Response model for OCR endpoint."""
    latex: str = Field(..., description="Extracted LaTeX")
    confidence: Optional[float] = Field(None, description="OCR confidence score")


class ChatMessage(BaseModel):
    """Chat message model."""
    role: str = Field(..., description="Message role (user/assistant)")
    content: str = Field(..., description="Message content")


class ChatRequest(BaseModel):
    """Request model for chat endpoint."""
    formula_id: str = Field(..., description="Formula identifier")
    messages: List[ChatMessage] = Field(..., description="Conversation history")
    focused_term: Optional[str] = Field(None, description="Currently focused term")


class ChatResponse(BaseModel):
    """Response model for chat endpoint."""
    message: str = Field(..., description="AI response")
    suggested_questions: Optional[List[str]] = Field(
        None,
        description="Follow-up question suggestions"
    )




    

