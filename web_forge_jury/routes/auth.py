from flask import Blueprint, request, jsonify, session, current_app
from supabase import create_client
from services.db import authenticate_user

auth_bp = Blueprint('auth', __name__)

def get_supabase():
    try:
        url = current_app.config.get('SUPABASE_URL')
        key = current_app.config.get('SUPABASE_SERVICE_ROLE_KEY')
        if url and key:
            return create_client(url, key)
    except Exception:
        pass
    return None

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    email_or_user = data.get('email', '').strip()
    password = data.get('password', '').strip()

    if not email_or_user or not password:
        return jsonify({'error': 'Username/email and password are required'}), 400

    sb = get_supabase()
    user = authenticate_user(sb, email_or_user, password)
    if not user:
        return jsonify({'error': 'Invalid username or password'}), 401

    session['user_id'] = user['id']
    session['role'] = user['role']
    session['display_name'] = user['display_name']
    session['email'] = user.get('email', email_or_user)

    return jsonify({
        'message': 'Logged in successfully',
        'display_name': user['display_name'],
        'role': user['role']
    })

@auth_bp.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Logged out successfully'})

@auth_bp.route('/me', methods=['GET'])
def me():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthenticated'}), 401
    return jsonify({
        'user_id': session['user_id'],
        'role': session['role'],
        'display_name': session.get('display_name'),
        'email': session.get('email')
    })
