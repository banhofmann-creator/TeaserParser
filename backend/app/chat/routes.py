"""Chat routes: send message, get history."""

import json
import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth.dependencies import get_current_user
from app.config import settings
from app.db.connection import get_conn

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatRequest(BaseModel):
    message: str


def _execute_actions(actions: list[dict], user: dict) -> list[dict]:
    """Execute database actions from the LLM response. Returns list of results."""
    results = []

    for act in actions:
        action_type = act.get("action")
        opp_id = act.get("opportunity_id")

        if not action_type or not opp_id:
            results.append({"action": action_type, "status": "skipped", "reason": "missing fields"})
            continue

        try:
            with get_conn() as conn:
                if action_type == "update_status":
                    new_status = act.get("status")
                    valid = {"new", "active", "inactive", "completed", "cancelled"}
                    if new_status not in valid:
                        results.append({"action": action_type, "opportunity_id": opp_id, "status": "failed", "reason": f"invalid status: {new_status}"})
                        continue
                    conn.execute(
                        "UPDATE opportunities SET status = %s, updated_at = NOW() WHERE id = %s",
                        (new_status, opp_id),
                    )
                    conn.commit()
                    results.append({"action": action_type, "opportunity_id": opp_id, "status": "done", "new_status": new_status})

                elif action_type == "assign":
                    assigned_to = act.get("assigned_to")
                    conn.execute(
                        "UPDATE opportunities SET assigned_to = %s, updated_at = NOW() WHERE id = %s",
                        (assigned_to, opp_id),
                    )
                    conn.commit()
                    results.append({"action": action_type, "opportunity_id": opp_id, "status": "done", "assigned_to": assigned_to})

                elif action_type == "update_fields":
                    fields = act.get("fields", {})
                    if not fields:
                        results.append({"action": action_type, "opportunity_id": opp_id, "status": "skipped", "reason": "no fields"})
                        continue
                    # Only allow safe field updates
                    allowed = {
                        "property_name", "address", "city", "state", "country",
                        "asking_price", "property_type", "size_sqft", "year_built",
                        "cap_rate", "noi", "occupancy_rate", "rent_roll_summary",
                        "debt_terms", "irr_projection", "seller_info",
                    }
                    safe_fields = {k: v for k, v in fields.items() if k in allowed}
                    if not safe_fields:
                        results.append({"action": action_type, "opportunity_id": opp_id, "status": "skipped", "reason": "no allowed fields"})
                        continue
                    set_clauses = [f"{k} = %s" for k in safe_fields]
                    set_clauses.append("updated_at = NOW()")
                    values = list(safe_fields.values()) + [opp_id]
                    conn.execute(
                        f"UPDATE opportunities SET {', '.join(set_clauses)} WHERE id = %s",
                        values,
                    )
                    conn.commit()
                    results.append({"action": action_type, "opportunity_id": opp_id, "status": "done", "fields": list(safe_fields.keys())})

                else:
                    results.append({"action": action_type, "status": "skipped", "reason": "unknown action"})

        except Exception as e:
            logger.exception("Failed to execute action %s on opp %s", action_type, opp_id)
            results.append({"action": action_type, "opportunity_id": opp_id, "status": "failed", "reason": str(e)})

    return results


@router.post("")
async def chat(body: ChatRequest, user: dict = Depends(get_current_user)):
    if not body.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    # Load recent conversation history for context
    with get_conn() as conn:
        history_rows = conn.execute(
            """
            SELECT role, content FROM chat_messages
            WHERE user_id = %s ORDER BY created_at DESC LIMIT 20
            """,
            (user["id"],),
        ).fetchall()

    # Build messages list (oldest first)
    messages = [{"role": r[0], "content": r[1]} for r in reversed(history_rows)]
    messages.append({"role": "user", "content": body.message.strip()})

    # Get response (mock or real LLM)
    if settings.llm_mock:
        from app.chat.mock import mock_chat_response
        response_data = mock_chat_response(body.message, user)
    else:
        from app.chat.llm import call_chat_llm
        response_data = call_chat_llm(messages)

    ai_message = response_data.get("message", "")
    actions = response_data.get("actions", [])

    # Execute any actions
    action_results = []
    if actions:
        action_results = _execute_actions(actions, user)

    # Persist both messages
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO chat_messages (user_id, role, content) VALUES (%s, %s, %s)",
            (user["id"], "user", body.message.strip()),
        )
        conn.execute(
            "INSERT INTO chat_messages (user_id, role, content, actions) VALUES (%s, %s, %s, %s)",
            (user["id"], "assistant", ai_message, json.dumps(action_results) if action_results else None),
        )
        conn.commit()

    return {
        "message": ai_message,
        "actions": action_results,
    }


@router.get("/history")
async def get_history(user: dict = Depends(get_current_user)):
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT id, role, content, actions, created_at
            FROM chat_messages
            WHERE user_id = %s
            ORDER BY created_at DESC LIMIT 50
            """,
            (user["id"],),
        ).fetchall()

    return [
        {
            "id": r[0],
            "role": r[1],
            "content": r[2],
            "actions": r[3],
            "created_at": r[4].isoformat(),
        }
        for r in reversed(rows)
    ]
