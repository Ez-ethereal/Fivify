"""
Parse API endpoints.
Generates micro (syntax) and macro (semantic) representations of formulas.
"""
from fastapi import APIRouter, HTTPException, Request
from app.models.formula import FormulaData, TestParseResponse
from app.api.parse_prompt import PARSE_PROMPT
from app.api.parse_schema import PARSE_SCHEMA
from app.api.parse_utils import merge_fragmented_components, resolve_nested_symbols
from app.services.formulaTranslation import convertParseResponse
import uuid
import json
import logging
import time
from pathlib import Path

router = APIRouter()
logger = logging.getLogger("app.api.parse")

_DEBUG_LOG = Path(__file__).parent.parent.parent / "logs" / "parse_debug.jsonl"


def _write_debug_log(entry: dict) -> None:
    _DEBUG_LOG.parent.mkdir(exist_ok=True)
    with _DEBUG_LOG.open("a") as f:
        f.write(json.dumps(entry, indent=None) + "\n")


def extract_raw_text(resp) -> str:
    """Extract text from response output items, even if truncated."""
    parts = []
    for item in resp.output:
        content = getattr(item, "content", None)
        if not content:
            continue
        for block in content:
            text = getattr(block, "text", None)
            if text:
                parts.append(text)
    return "".join(parts) or "(empty)"

@router.post("/parse_new", response_model=TestParseResponse)
async def parse_formula_test(latex: str, request: Request):
    client = request.app.state.openai

    t0 = time.monotonic()
    try:
        resp = await client.responses.create(
            model="gpt-5-mini",
            instructions=PARSE_PROMPT,
            input=f"Return JSON for: {latex}",
            text={"format": PARSE_SCHEMA},
            reasoning={"effort": "low"}
        )
        result = json.loads(resp.output_text)
    except Exception as e:
        logger.error("Parse failed for: %s", latex[:80], exc_info=True)
        raise HTTPException(status_code=502, detail=f"Formula parsing failed: {e}")
    t1 = time.monotonic()

    components = merge_fragmented_components(result.get("components", []), latex)
    components = resolve_nested_symbols(components)
    if not components:
        raise HTTPException(status_code=422, detail="No components identified — LaTeX may be malformed.")

    usage = resp.usage
    out_details = getattr(usage, "output_tokens_details", None)
    reasoning_tokens = getattr(out_details, "reasoning_tokens", None)

    logger.info(
        "Parse: %.1fs | %d components | in=%d out=%d%s tokens",
        t1 - t0, len(components),
        usage.input_tokens, usage.output_tokens,
        f" (reasoning={reasoning_tokens})" if reasoning_tokens else "",
    )

    """
    _write_debug_log({
        "ts": time.time(),
        "latex": latex,
        "elapsed_s": round(t1 - t0, 2),
        "usage": {
            "input_tokens": usage.input_tokens,
            "output_tokens": usage.output_tokens,
            "reasoning_tokens": reasoning_tokens,
        },
        "output_text": resp.output_text,
        "parsed": result,
    })
    """

    response = TestParseResponse(
        latex=latex,
        explanation=result["explanation"],
        components=[
            # Pydantic model validation automatically coerces this object into a ComponentBreakdown instance
            {"symbol": c.get("symbol", ""), "original_symbol": c.get("original_symbol", c.get("symbol", "")), "counterpart": c.get("counterpart", ""), "role": c.get("role", ""), "children": c.get("children", [])}
            for c in components
        ]
    )

    _write_debug_log({
        "ts": time.time(),
        "type": "response",
        "response": response.model_dump(),
    })
    

    return response


@router.post("/parse", response_model=FormulaData)
async def parse_formula(response: TestParseResponse):
    """Convert a TestParseResponse (from /parse_new) into a FormulaData object with macro view."""
    latex = response.latex
    macro = convertParseResponse(response)
    return FormulaData(
        id=str(uuid.uuid4()),
        latex=latex,
        macro=macro
    )
    
