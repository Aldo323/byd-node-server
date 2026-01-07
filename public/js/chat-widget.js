/**
 * Chat Widget - Salma AI
 * Widget de chat para comunicarse con el chatbot de Salma
 */

(function() {
    'use strict';

    // Configuración
    const CONFIG = {
        apiEndpoint: '/api/chatbot',
        welcomeMessage: '¡Hola! Soy Salma, tu asesora personal de BYD. Estoy aquí para ayudarte con información sobre nuestros vehículos eléctricos e híbridos. ¿En qué puedo ayudarte hoy?',
        placeholderText: 'Escribe tu mensaje...',
        errorMessage: 'Lo siento, hubo un problema. Por favor intenta de nuevo.',
    };

    // Estado del widget
    let state = {
        isOpen: false,
        isLoading: false,
        sessionId: null,
        conversationId: null,
        messageCount: 0
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
                const messageDiv = document.createElement('div');
                messageDiv.className = `chat-message ${msg.isBot ? 'bot' : 'user'}`;
                messageDiv.innerHTML = msg.text;
                messagesContainer.appendChild(messageDiv);
            });
            state.messageCount = state.messages.length;
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    // Crear el HTML del widget
    function createWidget() {
        // Contenedor principal
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

        // Insertar en el body
        const wrapper = document.createElement('div');
        wrapper.id = 'chatWidgetWrapper';
        wrapper.innerHTML = widgetHTML;
        document.body.appendChild(wrapper);
    }

    // Agregar mensaje al chat
    function addMessage(text, isBot = false, skipSave = false) {
        const messagesContainer = document.getElementById('chatWidgetMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${isBot ? 'bot' : 'user'}`;

        // Procesar markdown básico
        let formattedText = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');

        messageDiv.innerHTML = formattedText;
        messagesContainer.appendChild(messageDiv);

        // Scroll al final
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        state.messageCount++;

        // Guardar mensaje en el estado y localStorage (si no es restauración)
        if (!skipSave) {
            if (!state.messages) state.messages = [];
            state.messages.push({ text: formattedText, isBot: isBot });
            saveState();
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
        if (typing) {
            typing.remove();
        }
    }

    // Enviar mensaje al servidor
    async function sendMessage(message) {
        if (state.isLoading || !message.trim()) return;

        state.isLoading = true;
        const sendButton = document.getElementById('chatWidgetSend');
        const input = document.getElementById('chatWidgetInput');

        sendButton.disabled = true;
        input.disabled = true;

        // Agregar mensaje del usuario
        addMessage(message, false);
        input.value = '';

        // Mostrar indicador de escritura
        showTypingIndicator();

        try {
            const response = await fetch(CONFIG.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
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

            // En movil, bloquear scroll del body y ocultar boton
            if (window.innerWidth <= 480) {
                document.body.style.overflow = 'hidden';
                document.body.style.position = 'fixed';
                document.body.style.width = '100%';
                button.style.display = 'none';
            }

            // Mostrar mensaje de bienvenida si es la primera vez
            if (state.messageCount === 0) {
                setTimeout(() => {
                    addMessage(CONFIG.welcomeMessage, true);
                }, 300);
            }

            // Focus en el input (no en movil para evitar teclado automatico)
            if (window.innerWidth > 480) {
                setTimeout(() => {
                    document.getElementById('chatWidgetInput').focus();
                }, 400);
            }
        } else {
            container.classList.remove('open');

            // En movil, restaurar scroll del body y mostrar boton
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
        // Botón de abrir chat
        document.getElementById('chatWidgetButton').addEventListener('click', toggleChat);

        // Botón de cerrar
        document.getElementById('chatWidgetClose').addEventListener('click', toggleChat);

        // Botón de enviar
        document.getElementById('chatWidgetSend').addEventListener('click', () => {
            const input = document.getElementById('chatWidgetInput');
            sendMessage(input.value);
        });

        // Enter para enviar
        document.getElementById('chatWidgetInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(e.target.value);
            }
        });

        // Cerrar con Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && state.isOpen) {
                toggleChat();
            }
        });

        // Manejar teclado virtual en móviles - Solucion simplificada
        const input = document.getElementById('chatWidgetInput');
        const container = document.getElementById('chatWidgetContainer');
        const messages = document.getElementById('chatWidgetMessages');

        // Prevenir scroll del body cuando el chat esta abierto en movil
        container.addEventListener('touchmove', (e) => {
            e.stopPropagation();
        }, { passive: true });

        // Focus en input - scroll mensajes al final
        input.addEventListener('focus', () => {
            if (window.innerWidth <= 480) {
                // Prevenir que el body haga scroll
                document.body.style.overflow = 'hidden';
                document.body.style.position = 'fixed';
                document.body.style.width = '100%';
                document.body.style.height = '100%';

                setTimeout(() => {
                    if (messages) {
                        messages.scrollTop = messages.scrollHeight;
                    }
                    // Asegurar que el input sea visible
                    input.scrollIntoView({ behavior: 'smooth', block: 'end' });
                }, 100);
            }
        });

        // Blur del input - restaurar body
        input.addEventListener('blur', () => {
            if (window.innerWidth <= 480) {
                document.body.style.overflow = '';
                document.body.style.position = '';
                document.body.style.width = '';
                document.body.style.height = '';
            }
        });

        // Cuando se abre el chat en movil, bloquear scroll del body
        const originalToggleChat = toggleChat;
    }

    // Inicializar widget cuando el DOM esté listo
    function init() {
        // Intentar cargar estado previo
        const hasExistingState = loadState();

        if (!hasExistingState) {
            state.sessionId = generateSessionId();
            state.messages = [];
        }

        createWidget();
        initEvents();

        // Si hay mensajes previos, restaurarlos
        if (hasExistingState && state.messages && state.messages.length > 0) {
            restoreMessages();
            // Ocultar badge de notificación si ya hay conversación
            const badge = document.getElementById('chatNotificationBadge');
            if (badge) badge.style.display = 'none';
        }

        console.log('Chat widget inicializado', hasExistingState ? '(sesión restaurada)' : '(nueva sesión)');
    }

    // Ejecutar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
