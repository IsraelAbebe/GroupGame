document.addEventListener('DOMContentLoaded', () => {
    // Connect to the Socket.IO server
    const socket = io();

    const answerInput = document.getElementById('answer-input');
    const submitButton = document.getElementById('submit-button');
    const statusMessage = document.getElementById('status-message');

    // --- Emit event to join the client room ---
    // SESSION_ID is available globally from the script tag in client.html
    socket.emit('join_client', { session_id: SESSION_ID });
    console.log(`Client joining session: ${SESSION_ID}`);

    // --- Event Listeners for SocketIO ---

    socket.on('connect', () => {
        console.log('Client connected to server with SID:', socket.id);
        statusMessage.textContent = 'Connected to session.';
        statusMessage.style.color = 'green';
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected from server.');
        statusMessage.textContent = 'Disconnected. Please refresh.';
        statusMessage.style.color = 'red';
        submitButton.disabled = true;
        answerInput.disabled = true;
    });

    socket.on('answers_closed', () => {
        console.log('Answer submission is now closed by the host.');
        statusMessage.textContent = 'Answers are closed for this session.';
        statusMessage.style.color = 'orange';
        submitButton.disabled = true;
        answerInput.disabled = true;
    });

    // Remove session_ended handler as it's replaced by new_round_started
    /*
    socket.on('session_ended', (data) => {
        console.log('Session ended by host:', data.message);
        statusMessage.textContent = `Session ended: ${data.message || 'Host started a new game.'}`;
        statusMessage.style.color = 'red';
        submitButton.disabled = true;
        answerInput.disabled = true;
    });
    */

    socket.on('new_round_started', (data) => {
        console.log(`New round started for session: ${data.session_id}`);
        statusMessage.textContent = 'New round started! Enter your answer.';
        statusMessage.style.color = 'green';
        answerInput.value = ''; // Clear previous answer
        answerInput.disabled = false; // Re-enable input
        submitButton.disabled = false; // Re-enable button
    });

    // --- Event Listener for Submit Button ---
    submitButton.addEventListener('click', () => {
        const answer = answerInput.value.trim();
        if (answer) {
            console.log(`Submitting answer: ${answer}`);
            socket.emit('submit_answer', { session_id: SESSION_ID, answer: answer });
            statusMessage.textContent = 'Answer submitted!';
            statusMessage.style.color = 'blue';
            // Optionally disable input after submission?
            // answerInput.disabled = true;
            // submitButton.disabled = true;
        } else {
            statusMessage.textContent = 'Please enter an answer before submitting.';
            statusMessage.style.color = 'red';
        }
    });

});
