import sys
import os

# Delegate to web_forge_jury application
project_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'web_forge_jury'))
if project_dir not in sys.path:
    sys.path.insert(0, project_dir)

from app import create_app

app = create_app()

if __name__ == '__main__':
    app.run()
