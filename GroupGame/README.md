# GroupGame (Python/Flask Version)

A simple web application where a host displays a QR code, and clients can scan it with their phones to connect. Clients get a text area to submit an answer, and the host can reveal all submitted answers to compare within the group.

Built with Python (Flask, Flask-SocketIO) and standard web technologies (HTML, CSS, JavaScript).

## Features

*   Real-time communication using WebSockets (via Flask-SocketIO).
*   Dynamic QR code generation for easy client connection.
*   Host view to manage the session and reveal answers.
*   Client view for submitting answers.
*   Basic styling and user feedback.

## Setup and Running

1.  **Clone or download the repository.**

2.  **Navigate to the project directory:**
    ```bash
    cd GroupGame
    ```

3.  **Create and activate a Python environment (Recommended):**

    *   **Using `venv` (standard Python):**
        *   On macOS/Linux:
            ```bash
            python3 -m venv venv
            source venv/bin/activate
            ```
        *   On Windows:
            ```bash
            python -m venv venv
            .\venv\Scripts\activate
            ```

    *   **Using `conda`:**
        *   Create the environment (replace `groupgame-env` with your desired name and `3.x` with your Python version like `3.9`, `3.10`, etc.):
            ```bash
            conda create --name groupgame-env python=3.x
            ```
        *   Activate the environment:
            ```bash
            conda activate groupgame-env
            ```

4.  **Install the required dependencies:**
    *   If using `venv` or `conda` with pip:
        ```bash
        pip install -r requirements.txt
    ```
    *   (Optional) If using `conda` and prefer conda packages where possible (might require searching for equivalent packages):
        ```bash
        # Example - you might need to adjust package names for conda channels
        # conda install flask flask-socketio qrcode pillow eventlet
        # pip install python-engineio python-socketio # If conda packages aren't suitable/available
        ```
        *Using `pip install -r requirements.txt` within a conda environment is generally the most straightforward.*
    ```

5.  **Run the Flask application:**
    ```bash
    python app.py
    ```
    The server will start, typically listening on `http://0.0.0.0:5000/`.

6.  **Access the application:**
    *   **Host:** Open a web browser and navigate to `http://localhost:5000` (or `http://<your-computer's-ip-address>:5000` if accessing from another device on your network).
    *   **Clients:** Scan the QR code displayed on the host page using a phone or tablet. This will open the client page in the device's browser.

## How it Works

*   The host page (`/`) generates a unique session ID and displays a QR code containing a link to the client page (`/client?session=<session_id>`).
*   Clients scan the QR code, which directs them to the client page with the correct session ID.
*   Both host and clients establish WebSocket connections using Socket.IO.
*   Clients join a specific "room" based on the session ID.
*   When a client submits an answer, it's sent via WebSocket to the server.
*   The server stores the answer temporarily and notifies the host (in the same room) that an answer was received.
*   The host can click "Reveal Answers", triggering the server to send all collected answers for that session back to the host's browser for display.

## File Structure

```
GroupGame/
├── app.py              # Main Flask application logic, SocketIO handlers
├── requirements.txt    # Python dependencies (for pip)
├── README.md           # This file
├── templates/
│   ├── index.html      # HTML template for the host view
│   └── client.html     # HTML template for the client view
└── static/
    ├── style.css       # Basic CSS styling
    ├── host.js         # JavaScript for the host page (SocketIO, UI updates)
    └── client.js       # JavaScript for the client page (SocketIO, form submission)
