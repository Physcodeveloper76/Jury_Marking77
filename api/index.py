import sys
import os

project_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'web_forge_jury'))
if project_dir not in sys.path:
    sys.path.insert(0, project_dir)

from app import create_app

app = create_app()

class VercelPathMiddleware:
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
