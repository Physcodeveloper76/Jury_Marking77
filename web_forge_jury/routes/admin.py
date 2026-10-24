import csv
import io
from flask import Blueprint, request, jsonify, session, current_app, Response
from .auth import get_supabase
import services.db as db

admin_bp = Blueprint('admin', __name__)

def _require_admin():
    if 'user_id' not in session or session.get('role') != 'admin':
        return jsonify({'error': 'Admin privileges required'}), 401
    return None

# -------------------- Judges management --------------------
@admin_bp.route('/admin/judges', methods=['GET'])
def list_judges():
    auth_err = _require_admin()
    if auth_err:
        return auth_err
    return jsonify(db.get_judges(get_supabase()))

@admin_bp.route('/admin/judges', methods=['POST'])
def create_judge():
    auth_err = _require_admin()
    if auth_err:
        return auth_err
    data = request.get_json(silent=True) or {}
    if not data.get('email') or not data.get('display_name'):
        return jsonify({'error': 'Email and display name required'}), 400
    try:
        sb = get_supabase()
        new_id = db.add_judge(data, sb)
        db.log_audit_action(session['user_id'], 'create_judge', 'judges', new_id, f"Created judge {data.get('email')}", sb)
        return jsonify({'message': 'Judge created successfully', 'id': new_id})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@admin_bp.route('/admin/judges/<judge_id>', methods=['PATCH', 'PUT'])
def update_judge(judge_id):
    auth_err = _require_admin()
    if auth_err:
        return auth_err
    data = request.get_json(silent=True) or {}
    try:
        sb = get_supabase()
        db.update_judge(judge_id, data, sb)
        db.log_audit_action(session['user_id'], 'update_judge', 'judges', judge_id, str(data), sb)
        return jsonify({'message': 'Judge updated successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# -------------------- Participants (teams) --------------------
@admin_bp.route('/admin/participants', methods=['GET'])
def list_participants():
    auth_err = _require_admin()
    if auth_err:
        return auth_err
    return jsonify(db.get_participants(get_supabase()))

@admin_bp.route('/admin/participants', methods=['POST'])
def create_participant():
    auth_err = _require_admin()
    if auth_err:
        return auth_err
    data = request.get_json(silent=True) or {}
    if not data.get('team_name'):
        return jsonify({'error': 'Team name is required'}), 400
    try:
        sb = get_supabase()
        team_info = db.add_participant(data, sb)
        db.log_audit_action(session['user_id'], 'create_participant', 'participants', team_info['id'], f"Added team {team_info['team_code']}: {team_info['team_name']}", sb)
        return jsonify({
            'message': f"Team {team_info['team_code']} created successfully",
            'id': team_info['id'],
            'team': team_info
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@admin_bp.route('/admin/participants/<pid>', methods=['PATCH', 'PUT'])
def update_participant(pid):
    auth_err = _require_admin()
    if auth_err:
        return auth_err
    data = request.get_json(silent=True) or {}
    try:
        sb = get_supabase()
        db.update_participant(pid, data, sb)
        db.log_audit_action(session['user_id'], 'update_participant', 'participants', pid, str(data), sb)
        return jsonify({'message': 'Participant updated'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# -------------------- Rounds & Criteria --------------------
@admin_bp.route('/admin/rounds', methods=['GET'])
def list_rounds():
    auth_err = _require_admin()
    if auth_err:
        return auth_err
    return jsonify(db.get_rounds(get_supabase()))

@admin_bp.route('/admin/rounds', methods=['POST'])
def create_round():
    auth_err = _require_admin()
    if auth_err:
        return auth_err
    data = request.get_json(silent=True) or {}
    if not data.get('name'):
        return jsonify({'error': 'Round name is required'}), 400
    try:
        sb = get_supabase()
        new_id = db.add_round(data, sb)
        db.log_audit_action(session['user_id'], 'create_round', 'rounds', new_id, data.get('name'), sb)
        return jsonify({'message': 'Round created', 'id': new_id})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@admin_bp.route('/admin/criteria', methods=['GET'])
def list_criteria():
    auth_err = _require_admin()
    if auth_err:
        return auth_err
    round_id = request.args.get('round_id')
    return jsonify(db.get_criteria(round_id, get_supabase()))

@admin_bp.route('/admin/criteria', methods=['POST'])
def create_criterion():
    auth_err = _require_admin()
    if auth_err:
        return auth_err
    data = request.get_json(silent=True) or {}
    if not data.get('name') or not data.get('round_id'):
        return jsonify({'error': 'Name and round_id are required'}), 400
    try:
        sb = get_supabase()
        new_id = db.add_criterion(data, sb)
        db.log_audit_action(session['user_id'], 'create_criterion', 'criteria', new_id, data.get('name'), sb)
        return jsonify({'message': 'Criterion created', 'id': new_id})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@admin_bp.route('/admin/criteria/<cid>', methods=['PATCH', 'PUT'])
def update_criterion(cid):
    auth_err = _require_admin()
    if auth_err:
        return auth_err
    data = request.get_json(silent=True) or {}
    try:
        sb = get_supabase()
        db.update_criterion(cid, data, sb)
        db.log_audit_action(session['user_id'], 'update_criterion', 'criteria', cid, str(data), sb)
        return jsonify({'message': 'Criterion updated'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# -------------------- Results, Reopening, CSV export --------------------
@admin_bp.route('/admin/results', methods=['GET'])
def get_results():
    auth_err = _require_admin()
    if auth_err:
        return auth_err
    sb = get_supabase()
    matrix = db.get_all_results_matrix(sb)
    return jsonify(matrix)

@admin_bp.route('/admin/reopen', methods=['POST'])
def reopen_eval():
    auth_err = _require_admin()
    if auth_err:
        return auth_err
    data = request.get_json(silent=True) or {}
    judge_id = data.get('judge_id')
    round_id = data.get('round_id')
    participant_id = data.get('participant_id') or data.get('team_id')
    erase_scores = bool(data.get('erase_scores', False))
    if not judge_id or not round_id or not participant_id:
        return jsonify({'error': 'Missing judge_id, round_id, or participant_id'}), 400

    sb = get_supabase()
    result = db.reopen_evaluation(session['user_id'], judge_id, participant_id, round_id, erase_scores=erase_scores, supabase=sb)
    return jsonify(result)

@admin_bp.route('/admin/export', methods=['GET'])
def export_csv():
    auth_err = _require_admin()
    if auth_err:
        return auth_err

    sb = get_supabase()
    matrix = db.get_all_results_matrix(sb)

    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow([
        'Team Code',
        'Team Name',
        'Round',
        'Judge 1 Score',
        'Judge 1 Status',
        'Judge 2 Score',
        'Judge 2 Status',
        'Average Total',
        'Sum Total',
        'Completion Status'
    ])

    for row in matrix:
        j1 = row['judges'][0] if len(row['judges']) > 0 else {}
        j2 = row['judges'][1] if len(row['judges']) > 1 else {}
        writer.writerow([
            row.get('team_code'),
            row.get('team_name'),
            row.get('round_name'),
            j1.get('total') if j1.get('total') is not None else 'N/A',
            j1.get('status', 'not started'),
            j2.get('total') if j2.get('total') is not None else 'N/A',
            j2.get('status', 'not started'),
            row.get('average_total') if row.get('average_total') is not None else 'N/A',
            row.get('sum_total') if row.get('sum_total') is not None else 'N/A',
            row.get('completion_status')
        ])

    csv_data = output.getvalue()
    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment;filename=jury_scoring_results.csv"}
    )

@admin_bp.route('/admin/audit', methods=['GET'])
def get_audit_logs():
    auth_err = _require_admin()
    if auth_err:
        return auth_err
    return jsonify(db.get_audit_logs(get_supabase()))

@admin_bp.route('/admin/reset-all', methods=['POST'])
def reset_all_data():
    auth_err = _require_admin()
    if auth_err:
        return auth_err
    data = request.get_json(silent=True) or {}
    reset_teams = bool(data.get('reset_teams', False))
    try:
        sb = get_supabase()
        admin_id = session.get('user_id', 'judge_admin')
        res = db.reset_all_evaluations(admin_id, reset_teams=reset_teams, supabase=sb)
        return jsonify(res)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

