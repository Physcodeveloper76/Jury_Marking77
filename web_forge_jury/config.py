import os
from dotenv import load_dotenv

project_root = os.path.abspath(os.path.dirname(__file__))
load_dotenv(os.path.join(project_root, '.env'))

class Config:
    """Flask configuration loaded from environment variables."""
    SECRET_KEY = os.getenv('FLASK_SECRET_KEY', 'web-forge-jury-secret-production-key-2026')
    SUPABASE_URL = os.getenv('SUPABASE_URL', '')
    SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY', '')
    SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY', '')
    DEBUG = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
