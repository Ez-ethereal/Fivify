"""Post-processing utilities for LLM parse responses."""
import logging
import re

logger = logging.getLogger("app.api.parse_utils")

_TOKEN_RE = re.compile(r'\\[a-zA-Z@]+|[{}()\[\]]|[a-zA-Z0-9]|[^\s]')

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


def _tokenize(latex: str) -> list[str]:
    """Split LaTeX into atomic tokens: commands (\\sum), brackets, single chars."""
    return _TOKEN_RE.findall(latex)


def _find_sublist_pos(needle: list[str], haystack: list[str]) -> int | None:
    """Return start index if needle appears contiguously in haystack (strict), else None."""
    n, h = len(needle), len(haystack)
    if n == 0 or n >= h:
        return None
    for i in range(h - n + 1):
        if haystack[i : i + n] == needle:
            return i
    return None


def _tokens_to_latex(tokens: list[str]) -> str:
    """Rejoin tokens, inserting a space after LaTeX commands before alpha chars."""
    out = []
    for i, tok in enumerate(tokens):
        out.append(tok)
        if tok.startswith("\\") and i + 1 < len(tokens) and tokens[i + 1][0].isalpha():
            out.append(" ")
    return "".join(out)


def _is_syntactic_glue(symbol: str) -> bool:
    """Check if a symbol is syntactic glue (bare operator or bare modifier)."""
    stripped = symbol.strip()
    return stripped in _SYNTACTIC_GLUE or bool(_BARE_MODIFIER_RE.match(stripped))


def merge_fragmented_components(components: list[dict], latex: str) -> list[dict]:
    """
    Remove components that are syntactic glue (bare operators, bare exponents/subscripts).

    A glue component is dropped if any other component's symbol already contains
    it as a substring — the parent component captures its meaning. If no parent
    exists, the glue component is kept as a conservative fallback.

    Must run BEFORE resolve_nested_symbols() to avoid corrupting \\cdot placeholders.
    """
    if len(components) < 2:
        return components

    glue_indices: set[int] = set()
    for i, comp in enumerate(components):
        sym = comp.get("symbol", "")
        if not _is_syntactic_glue(sym):
            continue
        # Check if any other component's symbol contains this glue symbol
        stripped = sym.strip()
        for j, other in enumerate(components):
            if j == i:
                continue
            if stripped in other.get("symbol", ""):
                glue_indices.add(i)
                break

    if glue_indices:
        dropped = [components[i].get("symbol", "") for i in glue_indices]
        logger.info("Dropping %d glue component(s): %s", len(dropped), dropped)

    return [c for i, c in enumerate(components) if i not in glue_indices]


def resolve_nested_symbols(components: list[dict]) -> list[dict]:
    """
    Detect symbol containment and build a component tree.

    When component A's token sequence is a strict sub-sequence of B's:
    - Replace A's tokens in B with a \\cdot placeholder
    - Record A as a direct child of B (filling one \\cdot slot)

    Processing order: largest parents first, with a "direct children only"
    filter that excludes grandchildren (tokens already inside a larger child's
    range). This prevents transitive leakage — e.g., y_i won't individually
    replace inside (y_i - f(x_i))^{2} when the whole residual is a child.

    Each component gets a `children` list of symbol strings (post-modification)
    matching the left-to-right order of \\cdot placeholders in the parent symbol.
    """
    if len(components) < 2:
        return [{**c, "children": []} for c in components]

    syms = [c["symbol"] for c in components]
    orig_tokens = [_tokenize(s) for s in syms]
    result_tokens = [list(t) for t in orig_tokens]
    children_indices: list[list[int]] = [[] for _ in components]

    # Process each component as a potential parent, largest first
    for parent_i in sorted(range(len(components)), key=lambda i: len(orig_tokens[i]), reverse=True):
        # Find all children whose original tokens appear in the parent's current tokens
        potential: list[tuple[int, int, int]] = []  # (pos, length, child_idx)
        for child_j in range(len(components)):
            if child_j == parent_i:
                continue
            pos = _find_sublist_pos(orig_tokens[child_j], result_tokens[parent_i])
            if pos is not None:
                potential.append((pos, len(orig_tokens[child_j]), child_j))

        if not potential:
            continue

        # Keep only DIRECT children: filter out any child whose matched range
        # falls entirely inside another child's matched range (= grandchild)
        direct = []
        for i, (pi, li, ci) in enumerate(potential):
            is_grandchild = any(
                pj <= pi and pi + li <= pj + lj
                for j, (pj, lj, _) in enumerate(potential) if j != i
            )
            if not is_grandchild:
                direct.append((pi, li, ci))

        # Sort left-to-right, then replace right-to-left to preserve positions
        direct.sort(key=lambda x: x[0])
        for pos, length, _ in reversed(direct):
            result_tokens[parent_i] = (
                result_tokens[parent_i][:pos]
                + [r"\cdot"]
                + result_tokens[parent_i][pos + length :]
            )

        children_indices[parent_i] = [ci for _, _, ci in direct]

    # Build result with both original and display symbols
    result = [dict(c) for c in components]
    for i, comp in enumerate(result):
        comp["original_symbol"] = syms[i]
        new_sym = _tokens_to_latex(result_tokens[i])
        if new_sym != syms[i]:
            comp["symbol"] = new_sym
        # Children reference the display (possibly modified) symbol of each child component
        comp["children"] = [
            _tokens_to_latex(result_tokens[j]) for j in children_indices[i]
        ]

    # Sort: components with the most children first (outermost → innermost)
    result.sort(key=lambda c: len(c["children"]), reverse=True)

    return result
