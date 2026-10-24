import sys
import os

# Add parent directory to sys.path so app and its packages can be imported
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(current_dir, '..'))

if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from app import create_app

# Vercel looks for the WSGI callable named 'app'
app = create_app()

if __name__ == '__main__':
    app.run()
