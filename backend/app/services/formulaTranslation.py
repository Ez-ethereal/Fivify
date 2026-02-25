from typing import List, Optional
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
    # LaTeX expressions (contain \) should match normally — they intentionally
    # reference commands, so the mask must not block them.
    if "\\" in symbol:
        return latex.find(symbol)

    # For bare symbols (no \), skip matches inside command names
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
                  command_mask: Optional[list[bool]] = None) -> Optional[List[int]]:
    """Return [narrative_start, narrative_end, latex_start, latex_end], or None if either lookup fails."""
    # indices in explanation
    startIndex = explanation.find(component.counterpart)
    if startIndex == -1:
        logger.warning("Counterpart not found in explanation — dropping component. counterpart=%r, explanation=%r", component.counterpart, explanation[:120])
        return None
    endIndex = startIndex + len(component.counterpart)

    # indices in latex — skip matches inside LaTeX command names
    if command_mask is None:
        command_mask = _build_command_mask(latex)
    tex_start = _find_symbol_in_latex(component.original_symbol, latex, command_mask)
    if tex_start == -1:
        logger.warning("Original symbol not found in latex — dropping component. symbol=%r, latex=%r", component.original_symbol, latex[:120])
        return None
    tex_end = tex_start + len(component.original_symbol)

    return [startIndex, endIndex, tex_start, tex_end]


def convertParseResponse(response: TestParseResponse) -> MacroMap:
    latex, explanation, components = response.latex, response.explanation, response.components
    command_mask = _build_command_mask(latex)
    groups = []
    for component in components:
        indices = assignIndices(component, latex, explanation, command_mask)
        if indices is None:
            continue
        group = MacroGroup(
            range=(indices[2], indices[3]),
            latex=latex[indices[2]:indices[3]],
            label=component.role,
            narrative_span=(indices[0], indices[1])
        )
        groups.append(group)

    return MacroMap(
        groups=groups,
        narrative=explanation
    )
