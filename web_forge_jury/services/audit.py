"""Simple audit logging service for the Jury Scoring portal.

The original code expected a `log_action` function in `services.audit`.
We provide a minimal implementation that inserts an audit record into a
Supabase table named `audit_log`.  If the table does not exist or the
insert fails, we simply ignore the error – this keeps the application
functional without requiring a full audit schema.
"""

from typing import Any

def log_action(supabase: Any, user_id: int, action: str, target_id: Any) -> None:
    """Log an administrative action.

    Parameters
    ----------
    supabase: Supabase client instance.
    user_id: ID of the user performing the action.
    action: A short string describing the action (e.g., 'create_judge').
    target_id: Identifier of the entity the action affected.
    """
    try:
        payload = {
            "user_id": user_id,
            "action": action,
            "target_id": target_id,
        }
        supabase.table("audit_log").insert(payload).execute()
    except Exception:
        # Silently ignore any errors – logging is best‑effort.
        pass
