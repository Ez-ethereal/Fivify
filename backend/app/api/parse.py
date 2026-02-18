"""
Parse API endpoints.
Generates micro (syntax) and macro (semantic) representations of formulas.
"""
from fastapi import APIRouter, HTTPException, Request
from app.models.formula import FormulaData, MicroMap, MicroToken, MacroMap, MacroGroup, TestParseResponse
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

# ── Single-pass prompt: IDENTIFY + EXPLAIN ─────────────────────
# Merged from two stages to eliminate a round-trip and let the model
# chain-of-thought across component identification and narrative.

PARSE_PROMPT = """\
You are a STEM tutor. Given LaTeX, break it into semantic components and write an intuitive explanation.

Group symbols by MEANING, not syntax.
WRONG (literal): "∂L/∂w" → "partial derivative of L with respect to w"
RIGHT (semantic): "∂L/∂w" → "total effect of weight on loss"

Return JSON: {"explanation", "components": [{symbol, role, counterpart}]}.
- "explanation": 1 sentence. Styles: imperative narrative, 3Blue1Brown-like geometric/mechanical intuition; according to the formula, what set of instructions must a human or machine perform?
- Example explanation (Sum of squared residuals): To quantify the model's total failure, measure the miss for every data point, amplify the larger mistakes to punish them severely, and sum up the total penalty.
- Example explanation 2 (Backpropagation): To update a weight, trace how a tiny change in that weight ripples forward into the neuron's pre-activation, then into its activation, then into the loss, and multiply the local sensitivities to obtain the weight's total effect on the loss.
- "components": Map the mathematical symbol to the exact verbatim phrase inside your narrative sentence that represents it. Do not define the symbol; locate its proxy in the story. This will be the counterpart.
- Example of role for a component: for symbol ∂L/∂a: "sensitivity of the loss to the neuron's activation (how loss changes if activation changes)"

Full Example:
Input: X_k = \\frac{1}{N} \\sum_{n=0}^{N-1} x_n e^{i2\\pi k\\frac{n}{N}}
Output:
{"explanation": "To find the energy at a particular frequency, spin your signal around a circle at that frequency and average points along the path.",
 "components": [
  {"symbol": "X_k", "role": "output frequency coefficient", "counterpart": "the energy at a particular frequency"},
  {"symbol": "x_n", "role": "input time-domain samples", "counterpart": "your signal"},
  {"symbol": "e^{i...}", "role": "rotation in the complex plane", "counterpart": "spin ... around a circle"},
  {"symbol": "2\\pi k", "role": "rotation speed per frequency", "counterpart": "at that frequency"},
  {"symbol": "\\frac{1}{N} \\sum \\frac{n}{N}", "role": "summing and normalizing", "counterpart": "average points along the path"}]
  
Notice how we don't force a physics-based conceptualization for the sum of squared residuals example, where it's less effective,
But we do for the DFT example, since the formula corresponds to physics-related processes/phenomena.
"""

PARSE_SCHEMA = {
    "type": "json_schema",
    "name": "formula_parse",
    "strict": True,
    "schema": {
        "type": "object",
        "properties": {
            "explanation": {"type": "string"},
            "components": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "symbol": {"type": "string"},
                        "role": {"type": "string"},
                        "counterpart": {"type": "string"},
                    },
                    "required": ["symbol", "role", "counterpart"],
                    "additionalProperties": False,
                },
            },
        },
        "required": ["explanation", "components"],
        "additionalProperties": False,
    },
}

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
            reasoning={"effort": "low"},
        )
        result = json.loads(resp.output_text)
    except Exception as e:
        logger.error("Parse failed for: %s", latex[:80], exc_info=True)
        raise HTTPException(status_code=502, detail=f"Formula parsing failed: {e}")
    t1 = time.monotonic()

    components = result.get("components", [])
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

    return TestParseResponse(
        latex=latex,
        explanation=result["explanation"],
        components=[
            # Pydantic model validation automatically coerces this object into a ComponentBreakdown instance
            {"symbol": c.get("symbol", ""), "counterpart": c.get("counterpart", ""), "role": c.get("role", "")}
            for c in components
        ]
    )



@router.post("/parse", response_model=FormulaData)
async def parse_formula(latex: str):
    """
    Parse a LaTeX formula into micro and macro representations.

    For MVP: Returns mock data for the DFT formula.
    In production: Will use AST parsing for micro and LLM for macro.

    Args:
        latex: LaTeX string to parse

    Returns:
        FormulaData with both micro and macro views
    """
    # Mock response for DFT formula
    # X_k = \frac{1}{N} \sum_{n=0}^{N-1} x_n e^{-\frac{2\pi i}{N}kn}

    micro = MicroMap(
        tokens=[
            MicroToken(
                index=(0, 3),
                symbol="X_k",
                role="variable",
                color_id="var_blue",
                definition="Frequency domain coefficient"
            ),
            MicroToken(
                index=(15, 16),
                symbol="N",
                role="constant",
                color_id="const_red",
                definition="Number of sample points"
            ),
            MicroToken(
                index=(24, 25),
                symbol="n",
                role="variable",
                color_id="var_green",
                definition="Time domain index"
            ),
            MicroToken(
                index=(35, 38),
                symbol="x_n",
                role="variable",
                color_id="var_purple",
                definition="Time domain signal value"
            ),
            MicroToken(
                index=(39, 40),
                symbol="e",
                role="constant",
                color_id="const_orange",
                definition="Euler's number"
            ),
            MicroToken(
                index=(54, 55),
                symbol="i",
                role="constant",
                color_id="const_yellow",
                definition="Imaginary unit"
            ),
            MicroToken(
                index=(59, 60),
                symbol="k",
                role="variable",
                color_id="var_cyan",
                definition="Frequency index"
            ),
        ]
    )

    macro = MacroMap(
        groups=[
            MacroGroup(
                range=(6, 17),
                latex=r"\frac{1}{N}",
                label="Normalization Factor",
                color_id="group_green",
                narrative_span=(0, 48)
            ),
            MacroGroup(
                range=(18, 34),
                latex=r"\sum_{n=0}^{N-1}",
                label="Summation Over Time Samples",
                color_id="group_blue",
                narrative_span=(49, 78)
            ),
            MacroGroup(
                range=(35, 38),
                latex=r"x_n",
                label="Input Signal",
                color_id="group_purple",
                narrative_span=(79, 109)
            ),
            MacroGroup(
                range=(39, 62),
                latex=r"e^{-\frac{2\pi i}{N}kn}",
                label="Complex Rotation (Twiddle Factor)",
                color_id="group_orange",
                narrative_span=(110, 199)
            ),
        ],
        narrative=(
            "The normalization factor ensures proper scaling. "
            "We sum over all time samples, taking each input signal value "
            "and multiplying it by a complex rotation that 'spins' the signal "
            "at a specific frequency."
        )
    )

    spark_chips = [
        "What does the complex exponential do?",
        "Why do we divide by N?",
        "What happens if k increases?",
        "How is this related to sound waves?"
    ]

    return FormulaData(
        id=str(uuid.uuid4()),
        latex=latex,
        micro=micro,
        macro=macro,
        spark_chips=spark_chips
    )


@router.post("/parse/micro", response_model=MicroMap)
async def parse_micro(latex: str):
    """
    Generate only the micro (syntax-level) view.

    Args:
        latex: LaTeX string to parse

    Returns:
        MicroMap with token breakdown
    """
    # For simplicity, call the main parse and return just micro
    result = await parse_formula(latex)
    return result.micro


@router.post("/parse/macro", response_model=MacroMap)
async def parse_macro(latex: str):
    """
    Generate only the macro (semantic-level) view.

    Args:
        latex: LaTeX string to parse

    Returns:
        MacroMap with semantic groups and narrative
    """
    # For simplicity, call the main parse and return just macro
    result = await parse_formula(latex)
    return result.macro
