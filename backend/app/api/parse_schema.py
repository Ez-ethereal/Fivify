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
                        "symbol": {
                            "type": "array",
                            "items": {"type": "string"},
                        },
                        "counterpart": {"type": "string"},
                    },
                    "required": ["symbol", "counterpart"],
                    "additionalProperties": False,
                },
            },
        },
        "required": ["explanation", "components"],
        "additionalProperties": False,
    },
}
