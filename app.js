document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const voiceBtn = document.getElementById('voice-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettings = document.getElementById('close-settings');
    const apiModelSelect = document.getElementById('api-model');
    const responseLength = document.getElementById('response-length');
    const lengthValue = document.getElementById('length-value');
    
    // Hugging Face API Configuration
    // YOUR NEW API KEY WITH WRITE PERMISSIONS
    const API_TOKEN = "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"; 
    
    // Set the initial model to BlenderBot for better reliability and consistency
    let currentModel = "facebook/blenderbot-400M-distill"; 
    let maxLength = 50; // Default response length
    
    // Update length value display and parameter
    responseLength.addEventListener('input', function() {
        maxLength = this.value;
        lengthValue.textContent = `${maxLength} tokens`;
    });
    
    // Model selection handler
    apiModelSelect.addEventListener('change', function() {
        currentModel = this.value;
    });
    
    // Settings modal display
    settingsBtn.addEventListener('click', function() {
        settingsModal.style.display = 'flex';
    });
    
    closeSettings.addEventListener('click', function() {
        settingsModal.style.display = 'none';
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === settingsModal) {
            settingsModal.style.display = 'none';
        }
    });
    
    // Send message on button click
    sendBtn.addEventListener('click', sendMessage);
    
    // Send message on Enter key press
    userInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // Voice input (placeholder - not implemented)
    voiceBtn.addEventListener('click', function() {
        addMessage("Voice input is not implemented in this demo", false);
    });
    
    // Main function to send user message and get AI response
    async function sendMessage() {
        const userMessage = userInput.value.trim();
        if (!userMessage) return; // Don't send empty messages
        
        addMessage(userMessage, true); // Add user message to chat
        userInput.value = ''; // Clear input field
        
        showTypingIndicator(); // Show "AI is typing..."
        
        try {
            const aiResponse = await getAIResponse(userMessage);
            hideTypingIndicator(); // Hide typing indicator
            addMessage(aiResponse, false); // Add AI response to chat
        } catch (error) {
            hideTypingIndicator();
            console.error("API Error:", error);
            
            // Provide user-friendly error messages based on API status
            if (error.message.includes("404")) {
                addMessage("The AI model might be currently unavailable or the model ID is incorrect. Please try a different model from settings, or wait and retry.", false);
            } else if (error.message.includes("401")) {
                addMessage("Authentication failed. Please check your Hugging Face API token in app.js.", false);
            } else if (error.message.includes("503")) {
                addMessage("The AI service is temporarily unavailable. Please try again in a moment (model might be warming up).", false);
            } else {
                addMessage("Sorry, I'm having trouble connecting to the AI service. Please try again later.", false);
            }
        }
    }
    
    // Function to make API call to Hugging Face
    async function getAIResponse(input) {
        const API_URL = `https://api-inference.huggingface.co/models/${currentModel}`;
        
        let payload = {}; // Initialize payload based on model type
        
        // Special handling for conversational models (BlenderBot, DialoGPT)
        if (currentModel.includes("blenderbot") || currentModel.includes("dialogpt")) {
            payload = {
                inputs: {
                    text: input,
                    // For a simple demo, we're not maintaining past conversation context.
                    // In a full chat app, you'd push previous messages here.
                    past_user_inputs: [], 
                    generated_responses: []
                },
                parameters: {
                    max_length: maxLength 
                }
            };
        } else {
            // Default payload for general text generation models (like GPT-2)
            payload = {
                inputs: input,
                parameters: {
                    max_length: maxLength,
                    return_full_text: false // Don't return the input text in the response
                }
            };
        }
        
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });
        
        // Handle non-OK HTTP responses (e.g., 404, 503, 401)
        if (!response.ok) {
            // Throw an error with the status code for better error handling in sendMessage
            throw new Error(`API request failed with status ${response.status}`);
        }
        
        const result = await response.json();
        
        // Parse the response based on the model's expected output format
        if (Array.isArray(result) && result[0]?.generated_text) {
            // For models like GPT-2
            return result[0].generated_text.trim();
        } else if (result?.generated_text) {
            // Some models might return direct object
            return result.generated_text.trim();
        } else if (result?.conversation?.generated_responses) {
            // For conversational models like BlenderBot/DialoGPT
            // Get the latest response from the conversation history
            return result.conversation.generated_responses.slice(-1)[0].trim();
        } else if (result?.text) { 
            // Fallback for models that might return directly under 'text'
            return result.text.trim();
        } else {
            // Log unrecognized formats for debugging
            console.log("Raw API response (unrecognized format):", result);
            return "I received a response but couldn't understand the format. The model might still be loading or responded in an unexpected way.";
        }
    }
    
    // Helper function to add a message bubble to the chat interface
    function addMessage(text, isUser) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.innerHTML = `<p>${text}</p>`; // Use innerHTML for potential rich text later
        
        const timeSpan = document.createElement('span');
        timeSpan.className = 'message-time';
        timeSpan.textContent = getCurrentTime();
        
        messageDiv.appendChild(contentDiv);
        messageDiv.appendChild(timeSpan);
        chatMessages.appendChild(messageDiv);
        
        // Scroll to the bottom of the chat
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Helper function to show the typing indicator
    function showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.id = 'typing-indicator'; // Assign an ID for easy removal
        
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('div');
            dot.className = 'typing-dot';
            typingDiv.appendChild(dot);
        }
        
        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Helper function to hide the typing indicator
    function hideTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
    
    // Helper function to get current time for message timestamps
    function getCurrentTime() {
        const now = new Date();
        return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
});
