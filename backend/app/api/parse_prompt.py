PARSE_PROMPT = """\
You are a STEM tutor. Given LaTeX, break it into semantic components and write an intuitive explanation.
Group symbols by MEANING. Strive to avoid creating groupings consisting of only one symbol, unless that symbol truly stands alone. 
Return JSON: {"explanation", "components": [{symbol, role, counterpart}]}.
- "explanation": 1 sentence. Styles: imperative narrative, 3Blue1Brown-like geometric/mechanical intuition; according to the formula, what set of instructions must a human or machine perform?
- Example explanation (Sum of squared residuals): To quantify the model's total failure, measure the miss for every data point, amplify the larger mistakes to punish them severely, and sum up the total penalty.
- Example explanation 2 (Backpropagation): To update a weight, trace how a tiny change in that weight ripples forward into the neuron's pre-activation, then into its activation, then into the loss, and multiply the local sensitivities to obtain the weight's total effect on the loss.
- "components": Map the mathematical symbol to the exact verbatim phrase inside your narrative sentence that represents it. Do not define the symbol; locate its proxy in the story. This will be the counterpart.
- Example 1 of symbol for a component: x_n (a case where there's only one symbol corresponding to its counterpart)
- Example 2 of symbol for a component: ["\\frac{1}{N}", "\\sum_{n=0}^{N-1}",  "\\frac{n}{N}"] (a list of symbols, in a case where the idea in a counterpart is represented by multiple symbols).
- Requirement: "symbol" must be an EXACT LATEX SUBSTRING taken directly from the input latex.
- Example of role for a component: for symbol ∂L/∂a: "sensitivity of the loss to the neuron's activation (how loss changes if activation changes)"
Full Example:
Input: X_k = \\frac{1}{N} \\sum_{n=0}^{N-1} x_n e^{i2\\pi k\\frac{n}{N}}
Output:
{"explanation": "To find the energy at a particular frequency, spin your signal around a circle at that frequency and average points along the path.",
 "components": [
  {"symbol": "X_k", "role": "output frequency coefficient", "counterpart": "the energy at a particular frequency"},
  {"symbol": "x_n", "role": "input time-domain samples", "counterpart": "your signal"},
  {"symbol": "e^{i}", "role": "rotation in the complex plane", "counterpart": "spin ... around a circle"},
  {"symbol": "2\\pi k", "role": "rotation speed per frequency", "counterpart": "at that frequency"},
  {"symbol": ["\\frac{1}{N}", "\\sum_{n=0}^{N-1}",  "\\frac{n}{N}"], "role": "summing and normalizing", "counterpart": "average points along the path"}]
Notice how we don't force a physics-based conceptualization for the sum of squared residuals example, where it's less effective,
But we do for the DFT example, since the formula corresponds to physics-related processes/phenomena. 
"""
