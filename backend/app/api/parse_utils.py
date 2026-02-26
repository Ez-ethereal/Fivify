"""Post-processing utilities for LLM parse responses."""
import logging
import re

logger = logging.getLogger("app.api.parse_utils")

# Bare operators that should never be standalone components
_SYNTACTIC_GLUE = {
    "+", "-", "=", "\\cdot", "\\times", "\\div", "\\pm", "\\mp",
    "\\longleftarrow", "\\leftarrow", "\\rightarrow", "\\longrightarrow",
    "\\Longleftarrow", "\\Rightarrow", "\\Longrightarrow",
    "\\approx", "\\neq", "\\leq", "\\geq", "\\equiv", "\\sim", "\\propto",
}

# Bare exponents/subscripts: ^{...} or _{...} with nothing else
_BARE_MODIFIER_RE = re.compile(
    r'^[\^_]\{[^{}]*\}$'   # ^{2}, _{i}, ^{n+1}, etc.
    r'|^[\^_][a-zA-Z0-9]$' # ^2, _i, etc.
)


def _is_syntactic_glue(symbol: str) -> bool:
    """Check if a symbol is syntactic glue (bare operator or bare modifier)."""
    stripped = symbol.strip()
    return stripped in _SYNTACTIC_GLUE or bool(_BARE_MODIFIER_RE.match(stripped))


def _normalize_symbol(sym) -> list[str]:
    """Ensure symbol is a list of strings, handling both old (str) and new (list) formats."""
    if isinstance(sym, list):
        return sym
    if isinstance(sym, str):
        return [sym]
    return []


def _merge_duplicate_counterparts(components: list[dict]) -> list[dict]:
    """
    Merge components that share the same counterpart text.

    The LLM sometimes splits what should be one multi-symbol component into
    separate entries with identical counterparts — e.g.:
      {"symbol": ["s_{1}^{2}"], "counterpart": "their individual spreads"}
      {"symbol": ["s_{2}^{2}"], "counterpart": "their individual spreads"}

    These get merged into a single component with a combined symbol list:
      {"symbol": ["s_{1}^{2}", "s_{2}^{2}"], "counterpart": "their individual spreads"}

    The first occurrence's non-symbol fields (role, etc.) are preserved.
    """
    seen: dict[str, int] = {}  # counterpart → index in merged list
    merged: list[dict] = []

    for comp in components:
        key = comp.get("counterpart", "").strip()
        if not key:
            merged.append(comp)
            continue

        if key in seen:
            # Append this component's symbols to the existing entry
            existing = merged[seen[key]]
            existing_syms = _normalize_symbol(existing.get("symbol", []))
            new_syms = _normalize_symbol(comp.get("symbol", []))
            # Deduplicate while preserving order
            combined = list(existing_syms)
            for s in new_syms:
                if s not in combined:
                    combined.append(s)
            existing["symbol"] = combined
            logger.info("Merged duplicate counterpart %r: %s", key, combined)
        else:
            seen[key] = len(merged)
            merged.append(dict(comp))  # shallow copy to avoid mutating input

    return merged


def merge_fragmented_components(components: list[dict], latex: str) -> list[dict]:
    """
    Post-process LLM components:
    1. Merge components with identical counterpart text into one (combining symbol lists)
    2. Remove components that are syntactic glue (bare operators, bare exponents/subscripts)
    """
    # Step 1: merge duplicate counterparts
    components = _merge_duplicate_counterparts(components)

    if len(components) < 2:
        return components

    # Step 2: drop syntactic glue
    glue_indices: set[int] = set()
    for i, comp in enumerate(components):
        syms = _normalize_symbol(comp.get("symbol", []))
        if not syms or not all(_is_syntactic_glue(s) for s in syms):
            continue
        for j, other in enumerate(components):
            if j == i:
                continue
            other_syms = _normalize_symbol(other.get("symbol", []))
            other_joined = " ".join(other_syms)
            if all(s.strip() in other_joined for s in syms):
                glue_indices.add(i)
                break

    if glue_indices:
        dropped = [_normalize_symbol(components[i].get("symbol", [])) for i in glue_indices]
        logger.info("Dropping %d glue component(s): %s", len(dropped), dropped)

    return [c for i, c in enumerate(components) if i not in glue_indices]
