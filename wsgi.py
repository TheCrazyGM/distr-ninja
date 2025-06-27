"""
WSGI config for distriator.

This module contains the WSGI application used by Gunicorn.
"""

from app import app

# This makes the app available as 'application' for WSGI servers like Gunicorn
application = app

if __name__ == "__main__":
    # This block is for development use only
    # In production, use Gunicorn or another WSGI server
    app.run(debug=False)
