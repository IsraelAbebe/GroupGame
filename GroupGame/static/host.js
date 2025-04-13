document.addEventListener('DOMContentLoaded', () => {
    // Connect to the Socket.IO server
    // The server URL will be the same origin (host and port)
    const socket = io();

    const clientList = document.getElementById('client-list');
    const answerList = document.getElementById('answer-list');
    const revealButton = document.getElementById('reveal-button');
    const newRoundButton = document.getElementById('new-game-button'); // Keep ID, but treat as "New Round"
    const sessionIdSpan = document.getElementById('session-id');
    const qrCodeImg = document.getElementById('qr-code-img');

    // Use a mutable variable for session ID
    let currentSessionId = SESSION_ID; // Initialized from HTML

    // Change button text
    newRoundButton.textContent = 'Start New Round';

    // --- Emit event to join the host room ---
    socket.emit('join_host', { session_id: currentSessionId });
    console.log(`Host joining session: ${currentSessionId}`);

    // --- Helper function to reset answer list display ---
    function resetAnswerList() {
        answerList.innerHTML = ''; // Clear previous answers
        // Re-populate with placeholders for currently connected clients
        const clientItems = clientList.getElementsByTagName('li');
        for (let item of clientItems) {
            if (item.id.startsWith('client-')) {
                const clientId = item.id.substring('client-'.length);
                const playerName = item.textContent.split(' ')[1]; // Extract player name/ID part

                const answerLi = document.createElement('li');
                answerLi.id = `answer-${clientId}`;
                answerLi.textContent = `${playerName} : Waiting...`;
                answerLi.classList.add('hidden-answer');
                answerList.appendChild(answerLi);
            }
        }
    }

    // --- Event Listeners for SocketIO ---

    socket.on('connect', () => {
        console.log('Host connected to server with SID:', socket.id);
    });

    socket.on('disconnect', () => {
        console.log('Host disconnected from server.');
        // Optionally display a message or attempt reconnection
    });

    socket.on('client_joined', (data) => {
        console.log('Client joined:', data.client_sid);
        const li = document.createElement('li');
        li.id = `client-${data.client_sid}`;
        li.textContent = `Player ${data.client_sid.substring(0, 6)}... connected`; // Display partial SID
        clientList.appendChild(li);

        // Also add a placeholder for their answer
        const answerLi = document.createElement('li');
        answerLi.id = `answer-${data.client_sid}`;
        answerLi.textContent = `Player ${data.client_sid.substring(0, 6)}... : Waiting...`;
        answerLi.classList.add('hidden-answer'); // Add class for styling/hiding
        answerList.appendChild(answerLi);
    });

    socket.on('client_left', (data) => {
        console.log('Client left:', data.client_sid);
        const clientLi = document.getElementById(`client-${data.client_sid}`);
        if (clientLi) {
            clientLi.textContent += ' (disconnected)';
            clientLi.style.color = 'grey'; // Indicate disconnected
        }
        // Keep the answer placeholder, maybe mark it as disconnected too?
        const answerLi = document.getElementById(`answer-${data.client_sid}`);
         if (answerLi) {
             answerLi.textContent += ' (disconnected)';
             answerLi.style.color = 'grey';
         }
    });

    socket.on('answer_received', (data) => {
        console.log('Answer received notification from:', data.client_sid);
        const answerLi = document.getElementById(`answer-${data.client_sid}`);
        if (answerLi) {
            answerLi.textContent = `Player ${data.client_sid.substring(0, 6)}... : Answer Submitted!`;
            answerLi.style.fontWeight = 'bold'; // Indicate submission
        } else {
            console.warn("Received answer notification for unknown client:", data.client_sid);
            // Might happen if client connects/submits before host UI is fully ready
            // Could create the list item here if needed
        }
    });

    socket.on('answers_revealed', (data) => {
        console.log('Revealing answers:', data.answers);
        revealButton.disabled = true; // Disable button after revealing
        revealButton.textContent = 'Answers Revealed';

        // Clear existing placeholders/status messages
        answerList.innerHTML = '';

        // Display actual answers
        for (const [clientSid, answer] of Object.entries(data.answers)) {
             const answerLi = document.createElement('li');
             answerLi.id = `answer-${clientSid}`;
             // Check if answer is null or empty (client might have disconnected before answering)
             const displayAnswer = answer !== null && answer !== undefined ? answer : '(No answer submitted)';
             answerLi.textContent = `Player ${clientSid.substring(0, 6)}... : ${displayAnswer}`;
             answerLi.classList.remove('hidden-answer'); // Ensure it's visible
             answerList.appendChild(answerLi);
        }
         // Handle clients who joined but didn't submit an answer if needed
         // The current loop handles this via the null check
    });

     socket.on('answers_closed', () => {
        console.log('Answer submission is now closed.');
        revealButton.disabled = true;
        // Optionally add a message to the host UI
    });

    socket.on('new_round_started', (data) => {
        console.log(`New round started for session: ${data.session_id}`);
        // Reset the UI for the new round
        revealButton.disabled = false;
        revealButton.textContent = 'Reveal Answers';
        newRoundButton.disabled = false; // Re-enable button
        resetAnswerList(); // Reset the answer display area
    });

    // --- Event Listener for Reveal Button ---
    revealButton.addEventListener('click', () => {
        console.log('Reveal answers button clicked.');
        socket.emit('reveal_answers', { session_id: currentSessionId }); // Use currentSessionId
    });

    // --- Event Listener for New Round Button ---
    newRoundButton.addEventListener('click', () => {
        console.log('New round button clicked.');
        newRoundButton.disabled = true; // Disable button temporarily
        socket.emit('start_new_round', { session_id: currentSessionId }); // Use currentSessionId
    });

});
