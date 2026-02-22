from typing import List, Optional
import logging

from app.models.formula import TestParseResponse, ComponentBreakdown, MacroMap, MacroGroup

logger = logging.getLogger("app.services.formulaTranslation")


def assignIndices(component: ComponentBreakdown, latex: str, explanation: str) -> Optional[List[int]]:
    """Return [narrative_start, narrative_end, latex_start, latex_end], or None if either lookup fails."""
    # indices in explanation
    startIndex = explanation.find(component.counterpart)
    if startIndex == -1:
        logger.warning("Counterpart not found in explanation — dropping component. counterpart=%r, explanation=%r", component.counterpart, explanation[:120])
        return None
    endIndex = startIndex + len(component.counterpart)

    # indices in latex
    tex_start = latex.find(component.original_symbol)
    if tex_start == -1:
        logger.warning("Original symbol not found in latex — dropping component. symbol=%r, latex=%r", component.original_symbol, latex[:120])
        return None
    tex_end = tex_start + len(component.original_symbol)

    return [startIndex, endIndex, tex_start, tex_end]


def convertParseResponse(response: TestParseResponse) -> MacroMap:
    latex, explanation, components = response.latex, response.explanation, response.components
    groups = []
    for component in components:
        indices = assignIndices(component, latex, explanation)
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
