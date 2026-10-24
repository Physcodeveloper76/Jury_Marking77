from flask import Blueprint, request, jsonify, session, current_app
from .auth import get_supabase
import services.db as db

judge_bp = Blueprint('judge', __name__)

def _require_judge():
    if 'user_id' not in session or session.get('role') not in ('judge', 'judge1', 'judge2'):
        return jsonify({'error': 'Judge access required'}), 401
    return None

@judge_bp.route('/judge/dashboard', methods=['GET'])
def dashboard():
    auth_err = _require_judge()
    if auth_err:
        return auth_err

    sb = get_supabase()
    judge_id = session['user_id']
    rounds = db.get_rounds(sb)
    participants = db.get_participants(sb)

    eval_status = []
    for p in participants:
        for r in rounds:
            ev = db.get_evaluation(judge_id, r['id'], p['id'], sb)
            eval_status.append({
                'team_id': p['id'],
                'team_code': p.get('team_code', ''),
                'team_name': p.get('team_name', ''),
                'round_id': r['id'],
                'round_name': r['name'],
                'status': ev.get('status', 'not started'),
                'submitted_at': ev.get('submitted_at'),
                'locked_at': ev.get('locked_at')
            })

    return jsonify({
        'rounds': rounds,
        'participants': participants,
        'evaluations': eval_status,
        'judge_name': session.get('display_name', 'Judge')
    })

@judge_bp.route('/criteria/<round_id>', methods=['GET'])
@judge_bp.route('/judge/criteria/<round_id>', methods=['GET'])
def get_criteria_for_round(round_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    sb = get_supabase()
    crits = db.get_criteria(round_id, sb)
    return jsonify(crits)

@judge_bp.route('/evaluations/<round_id>/<participant_id>', methods=['GET'])
def get_single_evaluation(round_id, participant_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    sb = get_supabase()
    judge_id = session['user_id']

    # Judges can only view their own; Admin can view any
    if session.get('role') == 'admin':
        requested_judge = request.args.get('judge_id', judge_id)
        ev = db.get_evaluation(requested_judge, round_id, participant_id, sb)
    else:
        ev = db.get_evaluation(judge_id, round_id, participant_id, sb)

    # Also include criteria and participant info for convenient rendering
    criteria = db.get_criteria(round_id, sb)
    participants = db.get_participants(sb)
    team = next((p for p in participants if p['id'] == participant_id), None)
    rounds = db.get_rounds(sb)
    rnd = next((r for r in rounds if r['id'] == round_id), None)

    return jsonify({
        'evaluation': ev,
        'criteria': criteria,
        'participant': team,
        'round': rnd
    })

@judge_bp.route('/evaluations/draft', methods=['PUT', 'POST'])
def save_draft_route():
    auth_err = _require_judge()
    if auth_err:
        return auth_err

    data = request.get_json(silent=True) or {}
    round_id = data.get('round_id')
    participant_id = data.get('participant_id') or data.get('team_id')
    scores = data.get('scores', [])

    if not round_id or not participant_id:
        return jsonify({'error': 'Missing round_id or participant_id'}), 400

    judge_id = session['user_id']
    sb = get_supabase()
    result = db.save_evaluation(judge_id, round_id, participant_id, scores, status='draft', supabase=sb)
    if result.get('error'):
        return jsonify(result), 400
    return jsonify(result)

@judge_bp.route('/evaluations/submit', methods=['POST'])
def submit_evaluation_route():
    auth_err = _require_judge()
    if auth_err:
        return auth_err

    data = request.get_json(silent=True) or {}
    round_id = data.get('round_id')
    participant_id = data.get('participant_id') or data.get('team_id')
    scores = data.get('scores', [])

    if not round_id or not participant_id:
        return jsonify({'error': 'Missing round_id or participant_id'}), 400

    sb = get_supabase()
    # Validate each score against criterion max marks
    crit_list = db.get_criteria(round_id, sb)
    crit_map = {c['id']: c for c in crit_list}

    if not scores or len(scores) < len(crit_list):
        return jsonify({'error': f'All {len(crit_list)} criteria must be scored before submitting.'}), 400

    for s in scores:
        cid = s.get('criterion_id')
        marks = s.get('marks')
        if marks is None or marks == '':
            return jsonify({'error': f'Criterion {crit_map.get(cid, {}).get("name", cid)} is missing marks.'}), 400
        try:
            m_val = float(marks)
        except (ValueError, TypeError):
            return jsonify({'error': f'Marks must be a valid number for criterion {crit_map.get(cid, {}).get("name", cid)}.'}), 400

        c_obj = crit_map.get(cid)
        if c_obj:
            max_m = c_obj.get('max_marks', 20)
            if m_val < 0 or m_val > max_m:
                return jsonify({'error': f'Marks for "{c_obj.get("name")}" must be between 0 and {max_m}.'}), 400

    judge_id = session['user_id']
    result = db.save_evaluation(judge_id, round_id, participant_id, scores, status='submitted', supabase=sb)
    if result.get('error'):
        return jsonify(result), 400
    return jsonify(result)
