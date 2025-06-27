# distriator.ninja

Front-end web application for the Distriator platform, allowing users to log in with Hive Keychain,
view and manage purchase invoice claims, create Hive posts with Markdown and images, and submit them
to earn rewards.

## Features

- Login with Hive Keychain (memo key)
- Fetch and display invoice claims from the Distriator API
- Create and submit Hive posts with claim details and images
- Upload images via Hive Keychain signature to the Hive image service
- Responsive UI built with Bootstrap 5 and EasyMDE Markdown editor

## Prerequisites

- Python 3.13 or higher
- Hive Keychain browser extension
- (Optional) Node.js and npm to run HTML linting tasks

## Installation

1. Clone this repository and enter its directory:

   ```bash
   git clone https://github.com/TheCrazyGM/distr-ninja.git
   cd distr
   ```

2. Create and activate a virtual environment:

   ```bash
   uv sync
   source .venv/bin/activate
   ```

## Running the application

Start the Flask development server on port 8080:

```bash
python app.py
```

Open http://localhost:8080 in your browser.

## Project Structure

```
.
├── app.py                 # Flask application entry point
├── pyproject.toml         # Project metadata (PEP 621)
├── uv.lock                # Locked dependencies for uv tool
├── Makefile               # Maintenance tasks (lint, format, clean, etc.)
├── templates/
│   └── index.html         # Main HTML template
├── static/
│   └── main.js            # Client-side JavaScript
├── data/
│   ├── claim.json         # Sample claim response
│   ├── json_metadata.json # Sample post json_metadata
│   └── post_body.md       # Sample post body template
└── README.md              # This file
```

## Development

Lint and format code with Ruff:

```bash
make lint
make lint-html
make imports
make format
```

Run dependency health check:

```bash
make check
```

Clean build artifacts:

```bash
make clean
```

## Contributing

Contributions are welcome. Feel free to open issues or submit pull requests.
