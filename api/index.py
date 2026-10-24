import sys
import os
from urllib.parse import parse_qs, urlparse

project_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'web_forge_jury'))
if project_dir not in sys.path:
    sys.path.insert(0, project_dir)

from app import create_app

app = create_app()

class VercelPathMiddleware:
    """WSGI Middleware ensuring Flask routes the original request path on Vercel."""
    def __init__(self, wsgi_app):
        self.wsgi_app = wsgi_app

    def __call__(self, environ, start_response):
        qs = parse_qs(environ.get('QUERY_STRING', ''), keep_blank_values=True)
        target_path = None

        # 1. Check if Vercel rewrite provided original path in __path query param
        if '__path' in qs:
            val = qs['__path'][0] if qs['__path'] else ''
            target_path = '/' + val.lstrip('/')
            # Clean up __path from QUERY_STRING
            del qs['__path']
            pairs = []
            for k, vals in qs.items():
                for v in vals:
                    pairs.append(f"{k}={v}")
            environ['QUERY_STRING'] = '&'.join(pairs)
        # 2. Check HTTP_X_MATCHED_PATH header
        elif environ.get('HTTP_X_MATCHED_PATH') and environ.get('HTTP_X_MATCHED_PATH') not in ('/api/index', '/api/index.py', '/api'):
            target_path = environ.get('HTTP_X_MATCHED_PATH').split('?')[0]
        # 3. Check RAW_URI or REQUEST_URI if present
        elif environ.get('RAW_URI'):
            parsed = urlparse(environ.get('RAW_URI'))
            if parsed.path and parsed.path not in ('/api/index', '/api/index.py', '/api'):
                target_path = parsed.path
        elif environ.get('REQUEST_URI'):
            parsed = urlparse(environ.get('REQUEST_URI'))
            if parsed.path and parsed.path not in ('/api/index', '/api/index.py', '/api'):
                target_path = parsed.path

        if target_path:
            environ['PATH_INFO'] = target_path
        elif environ.get('PATH_INFO', '') in ('/api/index', '/api/index.py', '/api', ''):
            environ['PATH_INFO'] = '/'

        return self.wsgi_app(environ, start_response)

app.wsgi_app = VercelPathMiddleware(app.wsgi_app)
