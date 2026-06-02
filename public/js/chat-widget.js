/**
 * Chat Widget - Salma AI
 * Widget de chat con formulario de captura de datos inline
 * @version 2.0.0 - Con formulario HTML para captura confiable de leads
 */

(function() {
    'use strict';

    // Configuración
    const CONFIG = {
        apiEndpoint: '/api/chatbot',
        leadFormEndpoint: '/api/chatbot/lead-form',
        welcomeMessage: '¡Hola! Soy Salma, tu asesora personal de BYD. Estoy aquí para ayudarte con información sobre nuestros vehículos eléctricos e híbridos. ¿En qué puedo ayudarte hoy?',
        placeholderText: 'Escribe tu mensaje...',
        errorMessage: 'Lo siento, hubo un problema. Por favor intenta de nuevo.',
        messagesBeforeForm: 2, // Mostrar formulario después de X mensajes del usuario
    };

    // Estado del widget
    let state = {
        isOpen: false,
        isLoading: false,
        sessionId: null,
        conversationId: null,
        messageCount: 0,
        userMessageCount: 0,
        leadCaptured: false,
        leadData: null
    };

    // Generar ID de sesión único
    function generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Guardar estado en localStorage
    function saveState() {
        const dataToSave = {
            sessionId: state.sessionId,
            conversationId: state.conversationId,
            messages: state.messages || [],
            leadCaptured: state.leadCaptured,
            leadData: state.leadData,
            userMessageCount: state.userMessageCount,
            timestamp: Date.now()
        };
        localStorage.setItem('salma_chat_state', JSON.stringify(dataToSave));
    }

    // Cargar estado desde localStorage
    function loadState() {
        try {
            const saved = localStorage.getItem('salma_chat_state');
            if (saved) {
                const data = JSON.parse(saved);
                // Solo restaurar si tiene menos de 24 horas
                const hoursOld = (Date.now() - data.timestamp) / (1000 * 60 * 60);
                if (hoursOld < 24) {
                    state.sessionId = data.sessionId;
                    state.conversationId = data.conversationId;
                    state.messages = data.messages || [];
                    state.leadCaptured = data.leadCaptured || false;
                    state.leadData = data.leadData || null;
                    state.userMessageCount = data.userMessageCount || 0;
                    return true;
                }
            }
        } catch (e) {
            console.log('No se pudo cargar estado previo');
        }
        return false;
    }

    // Restaurar mensajes guardados en el UI
    function restoreMessages() {
        if (state.messages && state.messages.length > 0) {
            const messagesContainer = document.getElementById('chatWidgetMessages');
            state.messages.forEach(msg => {
                if (msg.isForm) {
                    // Si era un formulario, mostrar mensaje de confirmación
                    const messageDiv = document.createElement('div');
                    messageDiv.className = 'chat-message bot';
                    messageDiv.innerHTML = msg.text;
                    messagesContainer.appendChild(messageDiv);
                } else {
                    const messageDiv = document.createElement('div');
                    messageDiv.className = `chat-message ${msg.isBot ? 'bot' : 'user'}`;
                    messageDiv.innerHTML = msg.text;
                    messagesContainer.appendChild(messageDiv);
                }
            });
            state.messageCount = state.messages.length;
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    // Crear el HTML del widget
    function createWidget() {
        const widgetHTML = `
            <!-- Botón flotante -->
            <button class="chat-widget-button" id="chatWidgetButton" aria-label="Abrir chat con Salma">
                <img src="/images/byd/salma.jfif" alt="Salma - Asesora BYD">
                <span class="notification-badge" id="chatNotificationBadge">1</span>
            </button>

            <!-- Contenedor del chat -->
            <div class="chat-widget-container" id="chatWidgetContainer">
                <div class="chat-widget-header">
                    <img src="/images/byd/salma.jfif" alt="Salma" class="avatar">
                    <div class="info">
                        <p class="name">Salma - Asesora BYD</p>
                        <p class="status">En línea</p>
                    </div>
                    <button class="close-btn" id="chatWidgetClose" aria-label="Cerrar chat">&times;</button>
                </div>
                <div class="chat-widget-messages" id="chatWidgetMessages">
                    <!-- Los mensajes se agregan aquí -->
                </div>
                <div class="chat-widget-input">
                    <input type="text" id="chatWidgetInput" placeholder="${CONFIG.placeholderText}" autocomplete="off">
                    <button id="chatWidgetSend" aria-label="Enviar mensaje">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;

        const wrapper = document.createElement('div');
        wrapper.id = 'chatWidgetWrapper';
        wrapper.innerHTML = widgetHTML;
        document.body.appendChild(wrapper);

        // Agregar estilos del formulario inline
        addFormStyles();
    }

    // Agregar estilos CSS para el formulario
    function addFormStyles() {
        const styleId = 'chat-widget-form-styles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .lead-capture-form {
                background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                border-radius: 12px;
                padding: 16px;
                margin: 8px 0;
                border: 1px solid #dee2e6;
            }
            .lead-capture-form h4 {
                margin: 0 0 12px 0;
                color: #1a1a2e;
                font-size: 14px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .lead-capture-form .form-group {
                margin-bottom: 12px;
            }
            .lead-capture-form label {
                display: block;
                font-size: 12px;
                color: #495057;
                margin-bottom: 4px;
                font-weight: 500;
            }
            .lead-capture-form input {
                width: 100%;
                padding: 10px 12px;
                border: 1px solid #ced4da;
                border-radius: 8px;
                font-size: 14px;
                transition: border-color 0.2s, box-shadow 0.2s;
                box-sizing: border-box;
            }
            .lead-capture-form input:focus {
                outline: none;
                border-color: #0066cc;
                box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.15);
            }
            .lead-capture-form input.error {
                border-color: #dc3545;
            }
            .lead-capture-form .error-message {
                color: #dc3545;
                font-size: 11px;
                margin-top: 4px;
            }
            .lead-capture-form button {
                width: 100%;
                padding: 12px;
                background: linear-gradient(135deg, #0066cc 0%, #004499 100%);
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: transform 0.2s, box-shadow 0.2s;
            }
            .lead-capture-form button:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(0, 102, 204, 0.3);
            }
            .lead-capture-form button:disabled {
                opacity: 0.7;
                cursor: not-allowed;
                transform: none;
            }
            .lead-capture-form .skip-link {
                display: block;
                text-align: center;
                margin-top: 10px;
                color: #6c757d;
                font-size: 12px;
                text-decoration: none;
                cursor: pointer;
            }
            .lead-capture-form .skip-link:hover {
                text-decoration: underline;
            }
            .lead-confirmed {
                background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
                border: 1px solid #28a745;
                border-radius: 12px;
                padding: 12px 16px;
                margin: 8px 0;
                color: #155724;
                font-size: 14px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
        `;
        document.head.appendChild(style);
    }

    // Mostrar formulario de captura de lead
    function showLeadForm() {
        if (state.leadCaptured) return;

        const messagesContainer = document.getElementById('chatWidgetMessages');

        const formDiv = document.createElement('div');
        formDiv.className = 'chat-message bot';
        formDiv.id = 'leadFormContainer';
        formDiv.innerHTML = `
            <div class="lead-capture-form">
                <h4>📋 Para atenderte mejor</h4>
                <div class="form-group">
                    <label for="leadName">Tu nombre completo</label>
                    <input type="text" id="leadName" placeholder="Ej: Juan Pérez García" autocomplete="name">
                </div>
                <div class="form-group">
                    <label for="leadPhone">Tu teléfono (10 dígitos)</label>
                    <input type="tel" id="leadPhone" placeholder="Ej: 8112345678" maxlength="14" autocomplete="tel">
                </div>
                <button id="submitLeadForm">Continuar conversación</button>
                <a class="skip-link" id="skipLeadForm">Prefiero no compartir mis datos</a>
            </div>
        `;

        messagesContainer.appendChild(formDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // Event listeners del formulario
        document.getElementById('submitLeadForm').addEventListener('click', handleLeadFormSubmit);
        document.getElementById('skipLeadForm').addEventListener('click', handleSkipForm);

        // Formatear teléfono mientras escribe
        document.getElementById('leadPhone').addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 10) value = value.slice(0, 10);
            e.target.value = value;
        });

        // Enter para enviar
        document.getElementById('leadName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') document.getElementById('leadPhone').focus();
        });
        document.getElementById('leadPhone').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleLeadFormSubmit();
        });
    }

    // Manejar envío del formulario
    async function handleLeadFormSubmit() {
        const nameInput = document.getElementById('leadName');
        const phoneInput = document.getElementById('leadPhone');
        const submitBtn = document.getElementById('submitLeadForm');

        const name = nameInput.value.trim();
        const phone = phoneInput.value.trim();

        // Validar
        let hasError = false;

        // Limpiar errores previos
        nameInput.classList.remove('error');
        phoneInput.classList.remove('error');
        document.querySelectorAll('.error-message').forEach(el => el.remove());

        if (!name || name.length < 2) {
            nameInput.classList.add('error');
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.textContent = 'Por favor ingresa tu nombre';
            nameInput.parentNode.appendChild(errorDiv);
            hasError = true;
        }

        if (phone && phone.length !== 10) {
            phoneInput.classList.add('error');
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.textContent = 'El teléfono debe tener 10 dígitos';
            phoneInput.parentNode.appendChild(errorDiv);
            hasError = true;
        }

        if (hasError) return;

        // Deshabilitar botón
        submitBtn.disabled = true;
        submitBtn.textContent = 'Guardando...';

        try {
            const response = await fetch(CONFIG.leadFormEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name,
                    phone: phone || null,
                    conversationId: state.conversationId,
                    sessionId: state.sessionId
                })
            });

            const data = await response.json();

            if (data.success) {
                state.leadCaptured = true;
                state.leadData = { name, phone };
                saveState();

                // Reemplazar formulario con confirmación
                const formContainer = document.getElementById('leadFormContainer');
                formContainer.innerHTML = `
                    <div class="lead-confirmed">
                        ✅ ${data.message}
                    </div>
                `;

                // Guardar en mensajes
                if (!state.messages) state.messages = [];
                state.messages.push({
                    text: `<div class="lead-confirmed">✅ ${data.message}</div>`,
                    isBot: true,
                    isForm: true
                });
                saveState();

                // Tracking de conversión
                if (window.GoogleAdsTracking) {
                    window.GoogleAdsTracking.trackLead({ name, phone });
                    console.log('📊 Lead form conversion tracked');
                }

                // Continuar conversación automáticamente
                setTimeout(() => {
                    addMessage(`¡Perfecto ${name.split(' ')[0]}! Ahora sí, ¿qué modelo te interesa conocer? Tenemos el Dolphin Mini, Seal, Yuan Pro, y más.`, true);
                }, 500);
            } else {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Continuar conversación';
                alert(data.message || 'Error al guardar datos');
            }
        } catch (error) {
            console.error('Error guardando lead:', error);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Continuar conversación';
            alert('Error de conexión. Por favor intenta de nuevo.');
        }
    }

    // Manejar cuando el usuario salta el formulario
    function handleSkipForm() {
        state.leadCaptured = true; // Marcar como procesado para no volver a mostrar
        state.leadData = { skipped: true };
        saveState();

        const formContainer = document.getElementById('leadFormContainer');
        formContainer.remove();

        addMessage('Sin problema. Puedo ayudarte con información general. Si cambias de opinión, puedo contactarte cuando quieras. ¿Qué modelo te interesa?', true);
    }

    // Resaltar información de contacto
    function highlightContactInfo(text) {
        const phonePattern = /(\d{2,4}[\s.-]?\d{2,4}[\s.-]?\d{2,4}|\d{10})/g;
        return text.replace(phonePattern, '<span class="lead-highlight">$1</span>');
    }

    // Agregar mensaje al chat
    function addMessage(text, isBot = false, skipSave = false) {
        const messagesContainer = document.getElementById('chatWidgetMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${isBot ? 'bot' : 'user'}`;

        let formattedText = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');

        if (!isBot) {
            formattedText = highlightContactInfo(formattedText);
            state.userMessageCount++;
        }

        messageDiv.innerHTML = formattedText;
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        state.messageCount++;

        if (!skipSave) {
            if (!state.messages) state.messages = [];
            state.messages.push({ text: formattedText, isBot: isBot });
            saveState();
        }

        // Mostrar formulario después de X mensajes del usuario
        if (!isBot && !state.leadCaptured && state.userMessageCount === CONFIG.messagesBeforeForm) {
            setTimeout(() => {
                addMessage('¡Gracias por tu interés! Para poder darte información más personalizada y las mejores ofertas...', true);
                setTimeout(showLeadForm, 300);
            }, 500);
        }
    }

    // Mostrar indicador de escritura
    function showTypingIndicator() {
        const messagesContainer = document.getElementById('chatWidgetMessages');
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.id = 'typingIndicator';
        typingDiv.innerHTML = '<span></span><span></span><span></span>';
        messagesContainer.appendChild(typingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Ocultar indicador de escritura
    function hideTypingIndicator() {
        const typing = document.getElementById('typingIndicator');
        if (typing) typing.remove();
    }

    // Enviar mensaje al servidor
    async function sendMessage(message) {
        if (state.isLoading || !message.trim()) return;

        // Si hay formulario visible, no permitir enviar mensajes
        if (document.getElementById('leadFormContainer') && !state.leadCaptured) {
            addMessage('Por favor completa el formulario primero para continuar.', true);
            return;
        }

        state.isLoading = true;
        const sendButton = document.getElementById('chatWidgetSend');
        const input = document.getElementById('chatWidgetInput');

        sendButton.disabled = true;
        input.disabled = true;

        // Verificar si este mensaje activará el formulario
        const willShowForm = !state.leadCaptured && (state.userMessageCount + 1) === CONFIG.messagesBeforeForm;

        addMessage(message, false);
        input.value = '';

        // Si se mostrará el formulario, no enviar a Claude (evitar respuesta duplicada pidiendo datos)
        if (willShowForm) {
            state.isLoading = false;
            sendButton.disabled = false;
            input.disabled = false;
            return;
        }

        showTypingIndicator();

        try {
            const response = await fetch(CONFIG.apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: message,
                    sessionId: state.sessionId,
                    conversationId: state.conversationId
                })
            });

            const data = await response.json();
            hideTypingIndicator();

            if (data.success && data.message) {
                addMessage(data.message, true);
                state.conversationId = data.conversationId;

                if (data.leadCaptured && window.GoogleAdsTracking) {
                    window.GoogleAdsTracking.trackLead({ model: data.interestedModel || 'General' });
                }
            } else {
                addMessage(CONFIG.errorMessage, true);
            }
        } catch (error) {
            console.error('Error al enviar mensaje:', error);
            hideTypingIndicator();
            addMessage(CONFIG.errorMessage, true);
        } finally {
            state.isLoading = false;
            sendButton.disabled = false;
            input.disabled = false;
            input.focus();
        }
    }

    // Abrir/cerrar chat
    function toggleChat() {
        const container = document.getElementById('chatWidgetContainer');
        const badge = document.getElementById('chatNotificationBadge');
        const button = document.getElementById('chatWidgetButton');

        state.isOpen = !state.isOpen;

        if (state.isOpen) {
            container.classList.add('open');
            badge.style.display = 'none';

            if (window.innerWidth <= 480) {
                document.body.style.overflow = 'hidden';
                document.body.style.position = 'fixed';
                document.body.style.width = '100%';
                button.style.display = 'none';
            }

            if (state.messageCount === 0) {
                setTimeout(() => addMessage(CONFIG.welcomeMessage, true), 300);
            }

            if (window.innerWidth > 480) {
                setTimeout(() => document.getElementById('chatWidgetInput').focus(), 400);
            }
        } else {
            container.classList.remove('open');

            if (window.innerWidth <= 480) {
                document.body.style.overflow = '';
                document.body.style.position = '';
                document.body.style.width = '';
                button.style.display = '';
            }
        }
    }

    // Inicializar eventos
    function initEvents() {
        document.getElementById('chatWidgetButton').addEventListener('click', toggleChat);
        document.getElementById('chatWidgetClose').addEventListener('click', toggleChat);

        document.getElementById('chatWidgetSend').addEventListener('click', () => {
            sendMessage(document.getElementById('chatWidgetInput').value);
        });

        document.getElementById('chatWidgetInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(e.target.value);
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && state.isOpen) toggleChat();
        });

        const input = document.getElementById('chatWidgetInput');
        const container = document.getElementById('chatWidgetContainer');
        const messages = document.getElementById('chatWidgetMessages');

        container.addEventListener('touchmove', (e) => e.stopPropagation(), { passive: true });

        input.addEventListener('focus', () => {
            if (window.innerWidth <= 480) {
                document.body.style.overflow = 'hidden';
                document.body.style.position = 'fixed';
                document.body.style.width = '100%';
                document.body.style.height = '100%';
                setTimeout(() => {
                    if (messages) messages.scrollTop = messages.scrollHeight;
                    input.scrollIntoView({ behavior: 'smooth', block: 'end' });
                }, 100);
            }
        });

        input.addEventListener('blur', () => {
            if (window.innerWidth <= 480) {
                document.body.style.overflow = '';
                document.body.style.position = '';
                document.body.style.width = '';
                document.body.style.height = '';
            }
        });
    }

    // Inicializar widget
    function init() {
        const hasExistingState = loadState();

        if (!hasExistingState) {
            state.sessionId = generateSessionId();
            state.messages = [];
            state.userMessageCount = 0;
        }

        createWidget();
        initEvents();

        if (hasExistingState && state.messages && state.messages.length > 0) {
            restoreMessages();
            const badge = document.getElementById('chatNotificationBadge');
            if (badge) badge.style.display = 'none';
        }

        console.log('Chat widget v2.0 inicializado', hasExistingState ? '(sesión restaurada)' : '(nueva sesión)');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
