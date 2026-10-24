import sys
import os

# Add parent directory to sys.path so app and its packages can be imported
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(current_dir, '..'))

if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from app import create_app

app = create_app()

class VercelPathMiddleware:
    """WSGI Middleware ensuring Flask routes the original request path on Vercel."""
    def __init__(self, wsgi_app):
        self.wsgi_app = wsgi_app

    def __call__(self, environ, start_response):
        matched = environ.get('HTTP_X_MATCHED_PATH')
        path = environ.get('PATH_INFO', '')

        if matched and matched not in ('/api/index', '/api/index.py', '/api'):
            environ['PATH_INFO'] = matched
        elif path in ('/api/index', '/api/index.py', '/api'):
            environ['PATH_INFO'] = '/'

        return self.wsgi_app(environ, start_response)

app.wsgi_app = VercelPathMiddleware(app.wsgi_app)
