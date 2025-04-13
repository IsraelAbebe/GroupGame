import uuid
import qrcode
import io
import base64
import socket # Added for IP address detection
from flask import Flask, render_template, request, session as flask_session
from flask_socketio import SocketIO, emit, join_room, leave_room

# Initialize Flask app and SocketIO
app = Flask(__name__)
app.config['SECRET_KEY'] = 'your_secret_key_here!' # Replace with a real secret key in production
socketio = SocketIO(app, async_mode='eventlet') # Use eventlet for async operations

# In-memory storage for sessions and answers
# Structure: { session_id: { 'host_sid': None, 'clients': {client_sid: {'answer': None}}, 'answers_revealed': False } }
sessions = {}

def get_local_ip():
    """Attempts to determine the local IP address of the machine."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # Doesn't even have to be reachable
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1' # Fallback if unable to determine
        print("Warning: Could not determine local IP address. Falling back to 127.0.0.1.")
        print("QR Code may not work for other devices on the network.")
    finally:
        s.close()
    return IP

@app.route('/')
def index():
    """Serves the host page, generates session ID and QR code."""
    session_id = str(uuid.uuid4())[:8] # Generate a unique session ID (shortened for QR code)
    sessions[session_id] = {'host_sid': None, 'clients': {}, 'answers_revealed': False}
    print(f"New session created: {session_id}") # Server log

    # Generate the URL for the client page using the detected local IP
    local_ip = get_local_ip()
    # Match the port used in socketio.run() at the bottom of the file
    port = 5050
    client_url = f"http://{local_ip}:{port}/client?session={session_id}"
    print(f"Generated client URL for QR Code: {client_url}") # Log the generated URL

    # Generate QR code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(client_url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")

    # Save QR code to a bytes buffer and encode as base64
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
    qr_code_data = f"data:image/png;base64,{img_str}"

    return render_template('index.html', session_id=session_id, qr_code_data=qr_code_data)

@app.route('/client')
def client():
    """Serves the client page."""
    session_id = request.args.get('session')
    if not session_id or session_id not in sessions:
        return "Invalid or expired session ID", 404
    return render_template('client.html', session_id=session_id)

# --- SocketIO Event Handlers ---

@socketio.on('connect')
def handle_connect():
    """Handles new SocketIO connections."""
    print(f"Client connected: {request.sid}")

@socketio.on('disconnect')
def handle_disconnect():
    """Handles client disconnections."""
    print(f"Client disconnected: {request.sid}")
    # Clean up if a host or client disconnects
    # This needs refinement to handle rooms and session cleanup properly
    for session_id, data in list(sessions.items()):
        if data['host_sid'] == request.sid:
            print(f"Host disconnected from session {session_id}. Cleaning up.")
            # Potentially notify clients or just remove session
            # For now, just remove the session
            del sessions[session_id]
            # Need to also leave the SocketIO room if the host was in one
            break
        elif request.sid in data['clients']:
            print(f"Client {request.sid} disconnected from session {session_id}.")
            del data['clients'][request.sid]
            # Notify host?
            host_sid = data.get('host_sid')
            if host_sid:
                 # Let host know a client left (optional)
                 emit('client_left', {'client_sid': request.sid}, room=host_sid)
            break


@socketio.on('join_host')
def handle_join_host(data):
    """Host joins the session room."""
    session_id = data.get('session_id')
    if session_id in sessions:
        join_room(session_id)
        sessions[session_id]['host_sid'] = request.sid
        print(f"Host {request.sid} joined room {session_id}")
    else:
        print(f"Host {request.sid} tried to join invalid session {session_id}")
        # Handle error - maybe emit back to host?

@socketio.on('join_client')
def handle_join_client(data):
    """Client joins the session room."""
    session_id = data.get('session_id')
    if session_id in sessions:
        join_room(session_id)
        sessions[session_id]['clients'][request.sid] = {'answer': None} # Store client SID
        print(f"Client {request.sid} joined room {session_id}")
        # Notify host that a new client joined
        host_sid = sessions[session_id].get('host_sid')
        if host_sid:
            emit('client_joined', {'client_sid': request.sid}, room=host_sid)
    else:
        print(f"Client {request.sid} tried to join invalid session {session_id}")
        # Handle error - maybe emit back to client?


@socketio.on('submit_answer')
def handle_submit_answer(data):
    """Handles answer submission from a client."""
    session_id = data.get('session_id')
    answer = data.get('answer', '').strip()
    client_sid = request.sid

    if session_id in sessions and client_sid in sessions[session_id]['clients']:
        if not sessions[session_id]['answers_revealed']: # Only accept answers if not revealed yet
            sessions[session_id]['clients'][client_sid]['answer'] = answer
            print(f"Answer received from {client_sid} in session {session_id}: {answer}")

            # Notify the host about the new answer submission
            host_sid = sessions[session_id].get('host_sid')
            if host_sid:
                # Send only the client SID initially, not the answer itself
                emit('answer_received', {'client_sid': client_sid}, room=host_sid)
        else:
             print(f"Answer rejected from {client_sid} in session {session_id}: Answers already revealed.")
             # Optionally notify client that answers are closed
             emit('answers_closed', room=client_sid)

    else:
        print(f"Invalid answer submission from {client_sid} for session {session_id}")


@socketio.on('reveal_answers')
def handle_reveal_answers(data):
    """Handles request from host to reveal answers."""
    session_id = data.get('session_id')
    host_sid = request.sid

    if session_id in sessions and sessions[session_id]['host_sid'] == host_sid:
        sessions[session_id]['answers_revealed'] = True
        answers_data = {sid: client_data['answer'] for sid, client_data in sessions[session_id]['clients'].items()}
        print(f"Revealing answers for session {session_id}: {answers_data}")

        # Emit all answers to the host
        emit('answers_revealed', {'answers': answers_data}, room=host_sid)

        # Optionally notify clients that answers are revealed (e.g., disable their input)
        emit('answers_closed', room=session_id) # Send to all in room (host + clients)
    else:
        print(f"Invalid reveal request from {host_sid} for session {session_id}")


@socketio.on('start_new_round')
def handle_start_new_round(data):
    """Handles request from host to clear answers and start a new round within the same session."""
    session_id = data.get('session_id')
    host_sid = request.sid

    # Basic validation: Check if the requester is indeed the host of the session
    if session_id in sessions and sessions[session_id]['host_sid'] == host_sid:
        print(f"Host {host_sid} requested new round for session {session_id}")

        # Reset answers and revealed status for the session
        sessions[session_id]['answers_revealed'] = False
        for client_sid in sessions[session_id]['clients']:
            sessions[session_id]['clients'][client_sid]['answer'] = None

        print(f"Answers cleared for session {session_id}")

        # Notify all clients (including host) in the room that a new round has started
        emit('new_round_started', {'session_id': session_id}, room=session_id)

    else:
        print(f"Invalid 'start_new_round' request from SID {host_sid} for session {session_id}")


if __name__ == '__main__':
    print("Starting Flask-SocketIO server...")
    # Use socketio.run for development server with WebSocket support
    # Use host='0.0.0.0' to make it accessible on the local network
    socketio.run(app, debug=True, host='0.0.0.0', port=5050)
