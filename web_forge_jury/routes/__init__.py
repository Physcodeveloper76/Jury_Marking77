from flask import Blueprint

# Blueprints are defined in each module; import them here for convenient exposure
from .auth import auth_bp
from .judge import judge_bp
from .admin import admin_bp
from .results import results_bp
