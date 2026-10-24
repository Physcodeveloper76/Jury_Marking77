from flask import Blueprint, jsonify, session
from .auth import get_supabase
import services.db as db

results_bp = Blueprint('results', __name__)

@results_bp.route('/results', methods=['GET'])
def get_results():
    if 'user_id' not in session or session.get('role') != 'admin':
        return jsonify({'error': 'Admin privileges required'}), 401
    return jsonify(db.get_all_results_matrix(get_supabase()))
