from flask import Blueprint, request, jsonify, session, current_app
from .auth import get_supabase
import services.db as db

judge_bp = Blueprint('judge', __name__)

def _require_judge():
    if 'user_id' not in session or session.get('role') not in ('judge', 'judge1', 'judge2', 'admin'):
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
    eval_map = db.get_judge_evaluations_summary(judge_id, sb)

    eval_status = []
    for p in participants:
        for r in rounds:
            st = eval_map.get((p['id'], r['id']), {})
            eval_status.append({
                'team_id': p['id'],
                'team_code': p.get('team_code', ''),
                'team_name': p.get('team_name', ''),
                'round_id': r['id'],
                'round_name': r['name'],
                'status': st.get('status', 'not started'),
                'submitted_at': st.get('submitted_at'),
                'locked_at': st.get('locked_at')
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
    # Any mark save is immediately treated as final
    result = db.save_evaluation(judge_id, round_id, participant_id, scores, status='submitted', supabase=sb)
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
    crit_list = db.get_criteria(round_id, sb)
    crit_map = {c['id']: c for c in crit_list}
    scores_dict = {s.get('criterion_id'): s for s in scores}

    # Ensure every criterion is accounted for; default empty marks to 0.0
    final_scores = []
    for c in crit_list:
        cid = c['id']
        s_entry = scores_dict.get(cid, {})
        marks = s_entry.get('marks')
        if marks is None or marks == '':
            m_val = 0.0
        else:
            try:
                m_val = float(marks)
            except (ValueError, TypeError):
                m_val = 0.0

        max_m = c.get('max_marks', 20)
        m_val = max(0.0, min(float(max_m), m_val))

        final_scores.append({
            'criterion_id': cid,
            'marks': m_val,
            'remarks': str(s_entry.get('remarks', '') or '')
        })

    judge_id = session['user_id']
    result = db.save_evaluation(judge_id, round_id, participant_id, final_scores, status='submitted', supabase=sb)
    if result.get('error'):
        return jsonify(result), 400
    return jsonify(result)

# -------------------- On-Spot Team Addition --------------------
@judge_bp.route('/teams/next-code', methods=['GET'])
def get_next_code():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    sb = get_supabase()
    next_code = db.get_next_team_code(sb)
    return jsonify({'next_code': next_code})

@judge_bp.route('/teams/add', methods=['POST'])
@judge_bp.route('/participants/add', methods=['POST'])
def add_team_on_spot():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.get_json(silent=True) or {}
    team_name = (data.get('team_name') or '').strip()
    team_code = (data.get('team_code') or '').strip()

    if not team_name:
        return jsonify({'error': 'Team name is required'}), 400

    try:
        sb = get_supabase()
        team_info = db.add_participant({'team_code': team_code, 'team_name': team_name}, sb)
        db.log_audit_action(
            session['user_id'],
            'create_participant_on_spot',
            'participants',
            team_info['id'],
            f"On-spot registered team {team_info['team_code']}: {team_info['team_name']}",
            sb
        )
        return jsonify({
            'message': f"Team {team_info['team_code']} ({team_info['team_name']}) added successfully!",
            'team': team_info
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

