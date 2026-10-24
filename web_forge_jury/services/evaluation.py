"""services/evaluation.py
Helper functions for draft saving, submitting, and loading evaluations.
All DB interactions go through the Supabase client passed in.
"""

from datetime import datetime, timezone


def get_evaluation(supabase, judge_id, round_id, participant_id):
    """Return the evaluation (draft or submitted) for the given judge/round/team."""
    # Load status record
    try:
        status_resp = (
            supabase.table('evaluation_status')
            .select('*')
            .eq('judge_id', judge_id)
            .eq('round_id', round_id)
            .eq('team_id', participant_id)
            .single()
            .execute()
        )
        status = status_resp.data
    except Exception:
        status = {'status': 'draft'}

    # Load scores for this evaluation
    try:
        scores_resp = (
            supabase.table('scores')
            .select('criterion_id, marks, remarks')
            .eq('judge_id', judge_id)
            .eq('round_id', round_id)
            .eq('participant_id', participant_id)
            .execute()
        )
        scores = scores_resp.data or []
    except Exception:
        scores = []
    return {'status': status.get('status'), 'scores': scores}


def save_draft(supabase, judge_id, data):
    """Save a draft evaluation.
    Expected ``data`` keys: ``round_id``, ``participant_id``, ``scores`` (list of
    {criterion_id, marks, remarks}).
    """
    round_id = data.get('round_id')
    participant_id = data.get('participant_id')
    scores = data.get('scores', [])
    if not round_id or not participant_id:
        return {'error': True, 'message': 'Missing round or participant ID'}

    now = datetime.now(timezone.utc).isoformat()

    # Upsert each score
    for s in scores:
        payload = {
            'judge_id': judge_id,
            'participant_id': participant_id,
            'round_id': round_id,
            'criterion_id': s['criterion_id'],
            'marks': s.get('marks'),
            'remarks': s.get('remarks'),
            'updated_at': now,
        }
        try:
            supabase.table('scores').upsert(payload, on_conflict='judge_id,participant_id,round_id,criterion_id').execute()
        except Exception:
            pass

    # Ensure a status row exists (draft)
    try:
        supabase.table('evaluation_status').upsert({
            'judge_id': judge_id,
            'team_id': participant_id,
            'round_id': round_id,
            'status': 'draft',
            'updated_at': now,
        }, on_conflict='judge_id,team_id,round_id').execute()
    except Exception:
        pass

    return {'error': False, 'message': 'Draft saved'}


def submit_evaluation(supabase, judge_id, data):
    """Validate and lock a submitted evaluation."""
    round_id = data.get('round_id')
    participant_id = data.get('participant_id')
    scores = data.get('scores', [])
    if not round_id or not participant_id:
        return {'error': True, 'message': 'Missing round or participant ID'}

    # Load criteria for the round to validate max marks
    try:
        crit_resp = (
            supabase.table('criteria')
            .select('id, max_marks')
            .eq('round_id', round_id)
            .execute()
        )
        crit_map = {c['id']: c['max_marks'] for c in (crit_resp.data or [])}
    except Exception:
        return {'error': True, 'message': 'Failed to load criteria'}

    # Validate each score
    for s in scores:
        cid = s['criterion_id']
        marks = s.get('marks')
        if marks is None:
            return {'error': True, 'message': f'Criterion {cid} missing marks'}
        if not isinstance(marks, (int, float)):
            return {'error': True, 'message': f'Criterion {cid} marks must be numeric'}
        if marks < 0:
            return {'error': True, 'message': f'Criterion {cid} marks cannot be negative'}
        max_allowed = crit_map.get(cid)
        if max_allowed is not None and marks > max_allowed:
            return {'error': True, 'message': f'Criterion {cid} exceeds maximum ({max_allowed})'}

    now = datetime.now(timezone.utc).isoformat()

    # All good – upsert scores
    for s in scores:
        payload = {
            'judge_id': judge_id,
            'participant_id': participant_id,
            'round_id': round_id,
            'criterion_id': s['criterion_id'],
            'marks': s.get('marks'),
            'remarks': s.get('remarks'),
            'updated_at': now,
        }
        try:
            supabase.table('scores').upsert(payload, on_conflict='judge_id,participant_id,round_id,criterion_id').execute()
        except Exception:
            pass

    # Mark evaluation as submitted and lock it
    try:
        supabase.table('evaluation_status').upsert({
            'judge_id': judge_id,
            'team_id': participant_id,
            'round_id': round_id,
            'status': 'submitted',
            'submitted_at': now,
            'locked_at': now,
            'updated_at': now,
        }, on_conflict='judge_id,team_id,round_id').execute()
    except Exception:
        pass

    return {'error': False, 'message': 'Evaluation submitted'}
