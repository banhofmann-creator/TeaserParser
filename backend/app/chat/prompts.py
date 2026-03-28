"""System prompt and opportunity context builder for the chat assistant."""

from app.db.connection import get_conn

SYSTEM_PROMPT = """You are BTP (Ban's TeaserParser), an AI real estate analysis assistant.

You help users analyze real estate investment opportunities. You can:
- Answer questions about opportunities in the portfolio
- Provide analysis and comparisons
- Execute database actions when asked (archive, assign, update status, modify fields)

When the user asks you to perform an action, include it in the "actions" array of your response.

Available actions:
- {"action": "update_status", "opportunity_id": <int>, "status": "<new|active|inactive|completed|cancelled>"}
- {"action": "assign", "opportunity_id": <int>, "assigned_to": <user_id or null>}
- {"action": "update_fields", "opportunity_id": <int>, "fields": {"field_name": "value", ...}}

Always respond with valid JSON containing:
- "message": Your response text to the user
- "actions": Array of actions to execute (empty array if no actions needed)

Be concise, professional, and data-driven in your analysis. Reference specific numbers when discussing opportunities.

Here is the current portfolio context:

{context}
"""


def build_opportunity_context() -> str:
    """Build a summary of all opportunities for the LLM context."""
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT o.id, o.property_name, o.city, o.state, o.asking_price,
                   o.property_type, o.cap_rate, o.noi, o.occupancy_rate,
                   o.status, o.assigned_to, u.username,
                   COALESCE(vs.score, 0) AS vote_score
            FROM opportunities o
            LEFT JOIN users u ON u.id = o.assigned_to
            LEFT JOIN (
                SELECT opportunity_id, SUM(vote) AS score
                FROM votes GROUP BY opportunity_id
            ) vs ON vs.opportunity_id = o.id
            ORDER BY o.created_at DESC
            LIMIT 50
            """
        ).fetchall()

        users = conn.execute("SELECT id, username, display_name FROM users").fetchall()

    if not rows:
        return "No opportunities in the portfolio yet."

    lines = ["## Current Opportunities\n"]
    for r in rows:
        price_str = f"${r[4]:,.0f}" if r[4] else "N/A"
        cap_str = f"{r[6]}%" if r[6] else "N/A"
        assigned = f"assigned to {r[11]}" if r[11] else "unassigned"
        lines.append(
            f"- **#{r[0]} {r[1] or 'Unnamed'}** ({r[5] or 'unknown'}) — "
            f"{r[2] or '?'}, {r[3] or '?'} — "
            f"Price: {price_str}, Cap: {cap_str}, Status: {r[9]}, "
            f"{assigned}, Votes: {r[12]}"
        )

    lines.append("\n## Users\n")
    for u in users:
        lines.append(f"- ID {u[0]}: {u[1]} ({u[2]})")

    return "\n".join(lines)


def get_system_prompt() -> str:
    """Return the full system prompt with current portfolio context."""
    context = build_opportunity_context()
    return SYSTEM_PROMPT.format(context=context)
