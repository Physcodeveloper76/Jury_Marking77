import os
from flask import Flask, render_template, session, redirect, url_for
from routes.auth import auth_bp
from routes.judge import judge_bp
from routes.admin import admin_bp
from routes.results import results_bp

def create_app():
    base_dir = os.path.abspath(os.path.dirname(__file__))
    app = Flask(
        __name__,
        template_folder=os.path.join(base_dir, 'templates'),
        static_folder=os.path.join(base_dir, 'static')
    )
    app.config.from_object('config.Config')

    # Home route - checks session or renders login
    @app.route('/', methods=['GET'])
    @app.route('/login', methods=['GET'])
    @app.route('/index.html', methods=['GET'])
    @app.route('/index', methods=['GET'])
    def home():
        role = session.get('role')
        if role == 'admin':
            return redirect(url_for('admin_page'))
        elif role in ('judge', 'judge1', 'judge2'):
            return redirect(url_for('judge_page'))
        return render_template('login.html')

    # Register API blueprints
    app.register_blueprint(auth_bp, url_prefix='/api')
    app.register_blueprint(judge_bp, url_prefix='/api')
    app.register_blueprint(admin_bp, url_prefix='/api')
    app.register_blueprint(results_bp, url_prefix='/api')

    # Role-based page routes
    @app.route('/judge', methods=['GET'])
    def judge_page():
        role = session.get('role')
        if not role or role not in ('judge', 'judge1', 'judge2', 'admin'):
            return redirect(url_for('home'))
        return render_template('judge_dashboard.html')

    @app.route('/scoring/<round_id>/<team_id>', methods=['GET'])
    def scoring_page(round_id, team_id):
        role = session.get('role')
        if not role or role not in ('judge', 'judge1', 'judge2', 'admin'):
            return redirect(url_for('home'))
        return render_template('scoring.html', round_id=round_id, team_id=team_id)

    @app.route('/admin', methods=['GET'])
    def admin_page():
        role = session.get('role')
        if role != 'admin':
            return redirect(url_for('home'))
        return render_template('admin_dashboard.html')

    return app

if __name__ == '__main__':
    application = create_app()
    host = os.getenv('FLASK_RUN_HOST', '0.0.0.0')
    port = int(os.getenv('FLASK_RUN_PORT', '5000'))
    debug = os.getenv('FLASK_DEBUG', 'true').lower() == 'true'
    application.run(host=host, port=port, debug=debug)
