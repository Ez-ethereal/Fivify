from typing import List, Optional, Tuple
import re
import logging

from app.models.formula import TestParseResponse, ComponentBreakdown, MacroMap, MacroGroup

logger = logging.getLogger("app.services.formulaTranslation")

# Matches LaTeX commands: \mathrm, \mathop, \frac, etc.
_COMMAND_RE = re.compile(r'\\[a-zA-Z@]+')


def _build_command_mask(latex: str) -> list[bool]:
    """Return a boolean mask where True = this position is inside a LaTeX command name."""
    mask = [False] * len(latex)
    for m in _COMMAND_RE.finditer(latex):
        for i in range(m.start(), m.end()):
            mask[i] = True
    return mask


def _find_symbol_in_latex(symbol: str, latex: str, command_mask: list[bool]) -> int:
    """
    Find symbol in latex, skipping matches that overlap with LaTeX command interiors.

    For example, searching for "m" in "\\mathrm{...}^{m}" will skip the "m" inside
    "\\mathrm" and return the position of the standalone "m" in "^{m}".

    Symbols containing \\ are LaTeX expressions that intentionally reference
    commands, so they bypass the mask entirely.
    """
    if "\\" in symbol:
        return latex.find(symbol)

    start = 0
    while start <= len(latex) - len(symbol):
        pos = latex.find(symbol, start)
        if pos == -1:
            return -1
        if not any(command_mask[pos : pos + len(symbol)]):
            return pos
        start = pos + 1
    return -1


def assignIndices(component: ComponentBreakdown, latex: str, explanation: str,
                  command_mask: Optional[list[bool]] = None) -> Optional[dict]:
    """
    Return {narrative_span, ranges, latex_parts} or None if the narrative lookup fails.

    Each symbol in the component's symbol list is located independently
    in the LaTeX string. Symbols that can't be found are skipped (warned).
    """
    startIndex = explanation.find(component.counterpart)
    if startIndex == -1:
        logger.warning("Counterpart not found in explanation — dropping component. counterpart=%r, explanation=%r", component.counterpart, explanation[:120])
        return None
    endIndex = startIndex + len(component.counterpart)

    if command_mask is None:
        command_mask = _build_command_mask(latex)

    ranges: List[Tuple[int, int]] = []
    latex_parts: List[str] = []
    for sym in component.symbol:
        tex_start = _find_symbol_in_latex(sym, latex, command_mask)
        if tex_start == -1:
            logger.warning("Symbol not found in latex — skipping. symbol=%r, latex=%r", sym, latex[:120])
            continue
        tex_end = tex_start + len(sym)
        ranges.append((tex_start, tex_end))
        latex_parts.append(latex[tex_start:tex_end])

    if not ranges:
        logger.warning("No symbols found in latex for component — dropping. symbols=%r", component.symbol)
        return None

    return {
        "narrative_span": (startIndex, endIndex),
        "ranges": ranges,
        "latex_parts": latex_parts,
    }


def _range_contains(parent: Tuple[int, int], child: Tuple[int, int]) -> bool:
    """True if parent range strictly contains child range (not equal)."""
    return parent[0] <= child[0] and child[1] <= parent[1] and (parent[1] - parent[0]) > (child[1] - child[0])


def _compute_children(groups: List[MacroGroup]) -> None:
    """
    Compute parent→children relationships based on range containment.

    A group B is a child of group A if ANY of B's ranges is contained within
    ANY of A's ranges. Only DIRECT children are recorded — if B is inside A
    and C is inside B, then C is NOT a child of A (it's a grandchild).
    """
    n = len(groups)
    # For each group, find all groups whose ranges are contained within it
    # contains[i] = set of group indices whose ranges are inside group i
    contains: list[set[int]] = [set() for _ in range(n)]

    for i in range(n):
        for j in range(n):
            if i == j:
                continue
            # Check if any of j's ranges is inside any of i's ranges
            for pr in groups[i].ranges:
                for cr in groups[j].ranges:
                    if _range_contains(pr, cr):
                        contains[i].add(j)
                        break
                if j in contains[i]:
                    break

    # Filter to direct children only: remove grandchildren
    for i in range(n):
        direct = set(contains[i])
        for child in list(contains[i]):
            # If child itself contains other members of contains[i],
            # those are grandchildren — remove them from i's direct set
            grandchildren = contains[child] & contains[i]
            direct -= grandchildren
        groups[i].children = sorted(direct)


def convertParseResponse(response: TestParseResponse) -> MacroMap:
    latex, explanation, components = response.latex, response.explanation, response.components
    command_mask = _build_command_mask(latex)
    groups = []
    for component in components:
        indices = assignIndices(component, latex, explanation, command_mask)
        if indices is None:
            continue
        group = MacroGroup(
            ranges=indices["ranges"],
            latex=indices["latex_parts"],
            label=component.counterpart,
            narrative_span=indices["narrative_span"],
        )
        groups.append(group)

    # Compute parent→children nesting from range containment
    _compute_children(groups)

    return MacroMap(
        groups=groups,
        narrative=explanation
    )
