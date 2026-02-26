"""
Parse API endpoints.
Generates micro (syntax) and macro (semantic) representations of formulas.
"""
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from app.models.formula import FormulaData, TestParseResponse
from app.api.parse_prompt import PARSE_PROMPT
from app.api.parse_schema import PARSE_SCHEMA
from app.api.parse_utils import merge_fragmented_components
from app.services.formulaTranslation import convertParseResponse
import asyncio
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
            model="gpt-5.1",
            instructions=PARSE_PROMPT,
            input=f"Return JSON for: {latex}",
            text={"format": PARSE_SCHEMA},
            reasoning={"effort": "none"}
        )
        result = json.loads(resp.output_text)
    except Exception as e:
        logger.error("Parse failed for: %s", latex[:80], exc_info=True)
        raise HTTPException(status_code=502, detail=f"Formula parsing failed: {e}")
    t_llm = time.monotonic()

    components = merge_fragmented_components(result.get("components", []), latex)
    if not components:
        raise HTTPException(status_code=422, detail="No components identified — LaTeX may be malformed.")

    response = TestParseResponse(
        latex=latex,
        explanation=result["explanation"],
        components=[
            {
                "symbol": c.get("symbol", []),
                "counterpart": c.get("counterpart", ""),
                "role": c.get("role", ""),
            }
            for c in components
        ],
    )
    t_post = time.monotonic()

    usage = resp.usage
    out_details = getattr(usage, "output_tokens_details", None)
    reasoning_tokens = getattr(out_details, "reasoning_tokens", None)
    llm_s = t_llm - t0
    post_s = t_post - t_llm
    tok_per_s = usage.output_tokens / llm_s if llm_s > 0 else 0

    logger.info(
        "Parse: total=%.2fs (llm=%.2fs post=%.3fs) | %.0f tok/s | %d components | in=%d out=%d%s",
        t_post - t0, llm_s, post_s, tok_per_s, len(components),
        usage.input_tokens, usage.output_tokens,
        f" (reasoning={reasoning_tokens})" if reasoning_tokens else "",
    )

    _write_debug_log({
        "ts": time.time(),
        "type": "response",
        "timing": {
            "total_s": round(t_post - t0, 3),
            "llm_s": round(llm_s, 3),
            "post_processing_s": round(post_s, 3),
            "tok_per_s": round(tok_per_s, 1),
        },
        "usage": {
            "input_tokens": usage.input_tokens,
            "output_tokens": usage.output_tokens,
            "reasoning_tokens": reasoning_tokens,
        },
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


# ---------------------------------------------------------------------------
# Streaming endpoint — SSE wrapper around the same parsing pipeline
# ---------------------------------------------------------------------------

_STREAM_LOG = Path(__file__).parent.parent.parent / "logs" / "parse_stream.jsonl"


def _write_stream_log(entry: dict) -> None:
    _STREAM_LOG.parent.mkdir(exist_ok=True)
    with _STREAM_LOG.open("a") as f:
        f.write(json.dumps(entry, indent=None) + "\n")


@router.post("/parse_new/stream")
async def parse_formula_stream(latex: str, request: Request):
    """
    SSE streaming version of /parse_new.
    Streams raw token chunks as they arrive from the LLM, then emits the
    final processed TestParseResponse as a 'complete' event.
    """
    client = request.app.state.openai

    async def event_stream():
        t0 = time.monotonic()
        accumulated = ""
        chunk_count = 0
        t_first_token = None   # TTFT: time of first content chunk
        t_last_token = None    # time of last content chunk

        logger.info("STREAM START | latex=%s", latex[:80])
        _write_stream_log({
            "ts": time.time(), "event": "start", "latex": latex,
        })

        try:
            stream = await client.responses.create(
                model="gpt-5-mini",
                instructions=PARSE_PROMPT,
                input=f"Return JSON for: {latex}",
                text={"format": PARSE_SCHEMA},
                reasoning={"effort": "low"},
                stream=True,
            )

            async for event in stream:
                event_type = event.type

                # Text delta — the main content chunks
                if event_type == "response.output_text.delta":
                    now = time.monotonic()
                    delta = event.delta
                    accumulated += delta
                    chunk_count += 1

                    if t_first_token is None:
                        t_first_token = now
                    t_last_token = now

                    elapsed = now - t0

                    logger.info(
                        "STREAM CHUNK #%d | +%d chars | %.2fs | snippet: %s",
                        chunk_count, len(delta), elapsed,
                        repr(delta[:60]),
                    )

                    # SSE: send each chunk as a 'chunk' event
                    sse_data = json.dumps({
                        "chunk": delta,
                        "chunk_number": chunk_count,
                        "elapsed_s": round(elapsed, 3),
                    })
                    yield f"event: chunk\ndata: {sse_data}\n\n"

                # Response completed — process the full result
                elif event_type == "response.completed":
                    t_stream_done = time.monotonic()
                    resp = event.response
                    usage = resp.usage
                    out_details = getattr(usage, "output_tokens_details", None)
                    reasoning_tokens = getattr(out_details, "reasoning_tokens", None)

                    # Parse and post-process exactly like /parse_new
                    result = json.loads(accumulated)
                    components = merge_fragmented_components(
                        result.get("components", []), latex
                    )

                    if not components:
                        err = json.dumps({"error": "No components identified"})
                        yield f"event: error\ndata: {err}\n\n"
                        return

                    response = TestParseResponse(
                        latex=latex,
                        explanation=result["explanation"],
                        components=[
                            {
                                "symbol": c.get("symbol", []),
                                "counterpart": c.get("counterpart", ""),
                                "role": c.get("role", ""),
                            }
                            for c in components
                        ],
                    )
                    t_post = time.monotonic()

                    # Latency breakdown
                    ttft_s = (t_first_token - t0) if t_first_token else 0
                    gen_s = (t_last_token - t_first_token) if (t_first_token and t_last_token) else 0
                    post_s = t_post - t_stream_done
                    total_s = t_post - t0
                    tok_per_s = usage.output_tokens / gen_s if gen_s > 0 else 0

                    logger.info(
                        "STREAM DONE | total=%.2fs (ttft=%.3fs gen=%.2fs post=%.3fs) | "
                        "%.0f tok/s | %d chunks | %d components | in=%d out=%d%s",
                        total_s, ttft_s, gen_s, post_s,
                        tok_per_s, chunk_count, len(components),
                        usage.input_tokens, usage.output_tokens,
                        f" (reasoning={reasoning_tokens})" if reasoning_tokens else "",
                    )

                    complete_data = json.dumps(response.model_dump())
                    yield f"event: complete\ndata: {complete_data}\n\n"

                    _write_stream_log({
                        "ts": time.time(),
                        "event": "complete",
                        "latex": latex,
                        "timing": {
                            "total_s": round(total_s, 3),
                            "ttft_s": round(ttft_s, 3),
                            "generation_s": round(gen_s, 3),
                            "post_processing_s": round(post_s, 3),
                            "tok_per_s": round(tok_per_s, 1),
                        },
                        "chunk_count": chunk_count,
                        "total_chars": len(accumulated),
                        "usage": {
                            "input_tokens": usage.input_tokens,
                            "output_tokens": usage.output_tokens,
                            "reasoning_tokens": reasoning_tokens,
                        },
                        "response": response.model_dump(),
                    })

        except Exception as e:
            elapsed = time.monotonic() - t0
            logger.error(
                "STREAM ERROR | %.2fs | %s", elapsed, str(e), exc_info=True
            )
            _write_stream_log({
                "ts": time.time(), "event": "error",
                "latex": latex, "elapsed_s": round(elapsed, 2),
                "error": str(e),
            })
            err = json.dumps({"error": str(e)})
            yield f"event: error\ndata: {err}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering if proxied
        },
    )
