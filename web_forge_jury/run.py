import os
from dotenv import load_dotenv

# Load environment variables from .env in project root
project_root = os.path.abspath(os.path.dirname(__file__))
dotenv_path = os.path.join(project_root, '.env')
load_dotenv(dotenv_path)

from app import create_app

app = create_app()

if __name__ == '__main__':
    host = os.getenv('FLASK_RUN_HOST', '0.0.0.0')
    port = int(os.getenv('FLASK_RUN_PORT', '5000'))
    debug = os.getenv('FLASK_DEBUG', 'true').lower() == 'true'
    app.run(host=host, port=port, debug=debug)
