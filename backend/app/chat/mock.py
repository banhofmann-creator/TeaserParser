"""Deterministic mock chat responses for testing without an LLM."""


def mock_chat_response(message: str, user: dict) -> dict:
    """Return a keyword-based mock response with optional actions."""
    msg_lower = message.lower()

    if "archive" in msg_lower or "cancel" in msg_lower:
        # Try to extract an opportunity ID from the message
        opp_id = _extract_id(message)
        if opp_id:
            return {
                "message": f"Done — I've archived opportunity #{opp_id}.",
                "actions": [
                    {"action": "update_status", "opportunity_id": opp_id, "status": "cancelled"}
                ],
            }
        return {
            "message": "Which opportunity would you like to archive? Please provide the ID.",
            "actions": [],
        }

    if "assign" in msg_lower:
        opp_id = _extract_id(message)
        if opp_id:
            return {
                "message": f"Assigned opportunity #{opp_id} to you ({user['username']}).",
                "actions": [
                    {"action": "assign", "opportunity_id": opp_id, "assigned_to": user["id"]}
                ],
            }
        return {
            "message": "Which opportunity should I assign? Please provide the ID.",
            "actions": [],
        }

    if "status" in msg_lower and "active" in msg_lower:
        opp_id = _extract_id(message)
        if opp_id:
            return {
                "message": f"Updated opportunity #{opp_id} to active status.",
                "actions": [
                    {"action": "update_status", "opportunity_id": opp_id, "status": "active"}
                ],
            }

    if any(w in msg_lower for w in ("top", "best", "recommend", "summary", "overview")):
        return {
            "message": (
                "Based on the current portfolio, I'd recommend focusing on opportunities "
                "with cap rates above 6% and occupancy above 90%. "
                "These offer the best risk-adjusted returns in the current market."
            ),
            "actions": [],
        }

    if any(w in msg_lower for w in ("hello", "hi", "hey")):
        return {
            "message": f"Hello {user['display_name']}! I'm BTP, your real estate analysis assistant. How can I help you today?",
            "actions": [],
        }

    return {
        "message": (
            "I can help you analyze opportunities, archive or assign them, "
            "and provide portfolio insights. What would you like to do?"
        ),
        "actions": [],
    }


def _extract_id(text: str) -> int | None:
    """Extract the first integer from a string (likely an opportunity ID)."""
    import re
    match = re.search(r"#?(\d+)", text)
    return int(match.group(1)) if match else None
