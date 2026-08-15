"""Single SQLAlchemy instance shared by app.py and every model file."""

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
