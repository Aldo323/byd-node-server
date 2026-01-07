// Enhanced Calculator JavaScript with Conversion Optimization
class BYDCalculator {
    constructor() {
        this.gasPrices = {
            magna: 23.76,
            premium: 25.52
        };
        
        this.electricVehicles = {
            dolphin: {
                name: 'BYD Dolphin',
                price: 458800,
                priceText: 'Desde $458,800',
                range: 405,
                consumption: 13.5,
                image: '/images/byd/byd-auto-dolphin_auto_electrico_BYD.png',
                features: ['Compacto urbano', 'Tecnología avanzada', 'Máxima eficiencia']
            },
            atto3: {
                name: 'BYD Atto 3',
                price: 598800,
                priceText: 'Desde $598,800',
                range: 420,
                consumption: 16.6,
                image: '/images/byd/byd-atto-3-1-transformed.png',
                features: ['SUV versátil', 'Amplio espacio', 'Tecnología BYD Blade']
            },
            seal: {
                name: 'BYD Seal',
                price: 888800,
                priceText: 'Desde $888,800',
                range: 460,
                consumption: 15.4,
                image: '/images/byd/byd-auto-seal_auto_electrico_BYD.png',
                features: ['Sedán deportivo', 'Máximo lujo', 'Alto rendimiento']
            }
        };
        
        this.hybridVehicles = {
            dmi: {
                name: 'BYD Song Plus DM-i',
                price: 768800,
                priceText: 'Desde $768,800',
                electricRange: 110,
                fuelConsumption: 4.4,
                electricConsumption: 0.166,
                image: '/images/byd/byd-dmi-song-plus.png',
                features: ['SUV híbrida', '1,200km autonomía', 'Ultra eficiente']
            }
        };
        
        this.userProfile = {
            type: null,
            weeklySpending: 1000,
            dailyKm: 40,
            currentConsumption: 12,
            gasType: 'magna',
            homeElectricity: 300,
            interactionTime: 0,
            abandonPoints: []
        };
        
        this.analytics = {
            startTime: Date.now(),
            interactions: [],
            fieldCompletions: {},
            conversionFunnel: {
                'page_load': true,
                'vehicle_type_selected': false,
                'consumption_entered': false,
                'model_viewed': false,
                'contact_clicked': false
            }
        };
        
        this.init();
    }
    
    init() {
        // Track page load
        this.trackEvent('page_load', { source: document.referrer });
        
        // Initialize tooltips
        this.initializeTooltips();
        
        // Auto-save form data
        this.initializeAutoSave();
        
        // Exit intent detection
        this.initializeExitIntent();
        
        // Scroll depth tracking
        this.initializeScrollTracking();
        
        // Field focus time tracking
        this.initializeFieldTracking();
        
        // Initialize live chat suggestion - DESHABILITADO
        // setTimeout(() => this.showChatSuggestion(), 30000);
    }
    
    trackEvent(eventName, data = {}) {
        const event = {
            name: eventName,
            timestamp: Date.now(),
            timeOnPage: (Date.now() - this.analytics.startTime) / 1000,
            data: data
        };
        
        this.analytics.interactions.push(event);
        
        // Update funnel
        if (this.analytics.conversionFunnel.hasOwnProperty(eventName)) {
            this.analytics.conversionFunnel[eventName] = true;
        }
        
        // Send to analytics (GA4 or custom endpoint)
        if (typeof gtag !== 'undefined') {
            gtag('event', eventName, {
                event_category: 'Calculator',
                event_label: data.label || '',
                value: data.value || 0
            });
        }
        
        console.log('📊 Event tracked:', event);
    }
    
    initializeTooltips() {
        const tooltips = {
            weeklyGasSpending: [
                "💡 El mexicano promedio gasta $1,000/semana",
                "📊 SUVs: $1,200-1,800/semana",
                "🚗 Sedán: $800-1,200/semana",
                "🏙️ Compacto: $600-1,000/semana"
            ],
            dailyKm: [
                "🏠 Solo ciudad: 20-30 km/día",
                "🏢 Casa-trabajo: 40-50 km/día",
                "🛣️ Viajero frecuente: 80+ km/día"
            ],
            currentVehicleType: [
                "⛽ Pickup/SUV grande: 6-8 km/L",
                "🚙 SUV mediano: 9-11 km/L",
                "🚗 Sedán: 11-13 km/L",
                "🚘 Compacto: 13-16 km/L"
            ]
        };
        
        // Rotate tooltips on focus
        Object.entries(tooltips).forEach(([fieldId, tips]) => {
            const field = document.getElementById(fieldId);
            if (field) {
                let tipIndex = 0;
                field.addEventListener('focus', () => {
                    const tooltip = field.nextElementSibling;
                    if (tooltip && tooltip.classList.contains('input-tooltip')) {
                        tooltip.textContent = tips[tipIndex % tips.length];
                        tipIndex++;
                    }
                });
            }
        });
    }
    
    initializeAutoSave() {
        // Load saved data
        const savedData = localStorage.getItem('byd_calculator_data');
        if (savedData) {
            const data = JSON.parse(savedData);
            Object.entries(data).forEach(([key, value]) => {
                const field = document.getElementById(key);
                if (field) {
                    field.value = value;
                }
            });
            
            // Show welcome back message
            this.showNotification('¡Bienvenido de vuelta! Recuperamos tus datos anteriores.', 'info');
        }
        
        // Save on change
        const fields = ['weeklyGasSpending', 'dailyKm', 'currentVehicleType', 'gasType', 'homeElectricity'];
        fields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('change', () => {
                    const data = {};
                    fields.forEach(id => {
                        const f = document.getElementById(id);
                        if (f) data[id] = f.value;
                    });
                    localStorage.setItem('byd_calculator_data', JSON.stringify(data));
                });
            }
        });
    }
    
    initializeExitIntent() {
        let exitIntentShown = false;
        
        document.addEventListener('mouseleave', (e) => {
            if (e.clientY <= 0 && !exitIntentShown) {
                exitIntentShown = true;
                this.trackEvent('exit_intent_triggered');
                
                // Show retention popup
                this.showExitIntentPopup();
            }
        });
    }
    
    showExitIntentPopup() {
        const popup = document.createElement('div');
        popup.className = 'exit-intent-popup';
        popup.innerHTML = `
            <div class="exit-popup-content">
                <button class="close-popup" onclick="this.parentElement.parentElement.remove()">×</button>
                <h3>¡Espera! No te vayas sin tu cálculo</h3>
                <p>Estás a solo <strong>30 segundos</strong> de descubrir cuánto puedes ahorrar</p>
                <div class="exit-benefits">
                    <div class="benefit-item">
                        <i class="fas fa-piggy-bank fa-2x text-success"></i>
                        <p>Ahorro promedio<br><strong>$3,500/mes</strong></p>
                    </div>
                    <div class="benefit-item">
                        <i class="fas fa-leaf fa-2x text-success"></i>
                        <p>Reduce CO2<br><strong>2.5 ton/año</strong></p>
                    </div>
                    <div class="benefit-item">
                        <i class="fas fa-shield-alt fa-2x text-success"></i>
                        <p>Garantía<br><strong>7 años</strong></p>
                    </div>
                </div>
                <button class="btn btn-success btn-lg w-100" onclick="document.querySelector('.exit-intent-popup').remove(); window.scrollTo({top: 0, behavior: 'smooth'});">
                    Continuar calculando
                </button>
                <p class="text-center mt-2 mb-0">
                    <small>O habla directo con Salma: 
                        <a href="https://wa.me/528120272752" class="text-success">
                            <i class="fab fa-whatsapp"></i> WhatsApp
                        </a>
                    </small>
                </p>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        // Add styles
        if (!document.getElementById('exit-intent-styles')) {
            const styles = document.createElement('style');
            styles.id = 'exit-intent-styles';
            styles.textContent = `
                .exit-intent-popup {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.8);
                    z-index: 9999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    animation: fadeIn 0.3s ease;
                }
                
                .exit-popup-content {
                    background: white;
                    border-radius: 20px;
                    padding: 2rem;
                    max-width: 500px;
                    width: 90%;
                    position: relative;
                    animation: slideIn 0.3s ease;
                }
                
                .close-popup {
                    position: absolute;
                    right: 1rem;
                    top: 1rem;
                    background: none;
                    border: none;
                    font-size: 2rem;
                    cursor: pointer;
                    color: #999;
                }
                
                .exit-benefits {
                    display: flex;
                    justify-content: space-around;
                    margin: 2rem 0;
                    text-align: center;
                }
                
                .benefit-item {
                    flex: 1;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes slideIn {
                    from { transform: translateY(-50px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `;
            document.head.appendChild(styles);
        }
    }
    
    initializeScrollTracking() {
        let maxScroll = 0;
        let scrollPoints = [25, 50, 75, 100];
        let triggeredPoints = new Set();
        
        window.addEventListener('scroll', () => {
            const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
            
            if (scrollPercent > maxScroll) {
                maxScroll = scrollPercent;
                
                scrollPoints.forEach(point => {
                    if (scrollPercent >= point && !triggeredPoints.has(point)) {
                        triggeredPoints.add(point);
                        this.trackEvent('scroll_depth', { depth: point });
                    }
                });
            }
        });
    }
    
    initializeFieldTracking() {
        const fields = ['weeklyGasSpending', 'dailyKm', 'currentVehicleType', 'gasType', 'homeElectricity'];
        
        fields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                let focusTime = 0;
                
                field.addEventListener('focus', () => {
                    focusTime = Date.now();
                    this.trackEvent('field_focus', { field: fieldId });
                });
                
                field.addEventListener('blur', () => {
                    if (focusTime) {
                        const duration = (Date.now() - focusTime) / 1000;
                        this.analytics.fieldCompletions[fieldId] = {
                            duration: duration,
                            completed: field.value !== ''
                        };
                        this.trackEvent('field_blur', { 
                            field: fieldId, 
                            duration: duration,
                            completed: field.value !== ''
                        });
                    }
                });
            }
        });
    }
    
    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
            ${message}
        `;
        
        document.body.appendChild(notification);
        
        // Add styles if not exists
        if (!document.getElementById('notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                .notification {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    background: white;
                    padding: 1rem 1.5rem;
                    border-radius: 10px;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    animation: slideInRight 0.3s ease;
                    z-index: 1000;
                }
                
                .notification-success { color: #28a745; border-left: 4px solid #28a745; }
                .notification-info { color: #17a2b8; border-left: 4px solid #17a2b8; }
                
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(styles);
        }
        
        setTimeout(() => notification.remove(), 5000);
    }
    
    showChatSuggestion() {
        if (this.analytics.conversionFunnel.contact_clicked) return;
        
        const suggestion = document.createElement('div');
        suggestion.className = 'chat-suggestion';
        suggestion.innerHTML = `
            <div class="chat-bubble">
                <img src="/images/byd/salma.jfif" alt="Salma" class="chat-avatar">
                <div class="chat-content">
                    <p>¡Hola! Soy Salma 👋</p>
                    <p>¿Necesitas ayuda con el cálculo? Puedo explicarte los beneficios personalizados para ti.</p>
                    <button class="btn btn-sm btn-success" onclick="window.open('https://wa.me/528120272752?text=Hola%20Salma,%20estoy%20usando%20la%20calculadora%20BYD%20y%20tengo%20una%20pregunta', '_blank')">
                        <i class="fab fa-whatsapp"></i> Chatear ahora
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(suggestion);
        
        // Add styles
        if (!document.getElementById('chat-suggestion-styles')) {
            const styles = document.createElement('style');
            styles.id = 'chat-suggestion-styles';
            styles.textContent = `
                .chat-suggestion {
                    position: fixed;
                    bottom: 100px;
                    right: 20px;
                    z-index: 999;
                    animation: bounceIn 0.6s ease;
                }
                
                .chat-bubble {
                    background: white;
                    border-radius: 15px;
                    box-shadow: 0 5px 20px rgba(0,0,0,0.2);
                    padding: 1rem;
                    max-width: 300px;
                    position: relative;
                }
                
                .chat-bubble::after {
                    content: '';
                    position: absolute;
                    bottom: -10px;
                    right: 30px;
                    width: 0;
                    height: 0;
                    border-left: 10px solid transparent;
                    border-right: 10px solid transparent;
                    border-top: 10px solid white;
                }
                
                .chat-avatar {
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    position: absolute;
                    top: -25px;
                    left: 20px;
                    border: 3px solid white;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                }
                
                .chat-content {
                    margin-left: 40px;
                    font-size: 0.9rem;
                }
                
                .chat-content p {
                    margin-bottom: 0.5rem;
                }
            `;
            document.head.appendChild(styles);
        }
        
        setTimeout(() => suggestion.remove(), 15000);
    }
    
    // Gamification elements
    addProgressGamification() {
        const steps = document.querySelectorAll('.progress-step');
        let completedSteps = 0;
        
        steps.forEach((step, index) => {
            if (step.classList.contains('completed')) {
                completedSteps++;
                
                // Add celebration for each completed step
                if (index === completedSteps - 1) {
                    step.querySelector('.progress-step-circle').classList.add('celebrate');
                    setTimeout(() => {
                        step.querySelector('.progress-step-circle').classList.remove('celebrate');
                    }, 1000);
                }
            }
        });
        
        // Milestone rewards
        if (completedSteps === 1) {
            this.showNotification('¡Excelente inicio! 🎯 Ya estás más cerca de tus ahorros');
        } else if (completedSteps === 2) {
            this.showNotification('¡Casi listo! 🚀 Solo falta un paso más');
        } else if (completedSteps === 3) {
            this.showNotification('¡Felicidades! 🎉 Has completado el cálculo');
            this.triggerCelebration();
        }
    }
    
    triggerCelebration() {
        // Enhanced confetti celebration
        const count = 200;
        const defaults = {
            origin: { y: 0.7 }
        };
        
        function fire(particleRatio, opts) {
            confetti(Object.assign({}, defaults, opts, {
                particleCount: Math.floor(count * particleRatio)
            }));
        }
        
        fire(0.25, {
            spread: 26,
            startVelocity: 55,
        });
        fire(0.2, {
            spread: 60,
        });
        fire(0.35, {
            spread: 100,
            decay: 0.91,
            scalar: 0.8
        });
        fire(0.1, {
            spread: 120,
            startVelocity: 25,
            decay: 0.92,
            scalar: 1.2
        });
        fire(0.1, {
            spread: 120,
            startVelocity: 45,
        });
    }
    
    // Social proof elements
    showSocialProof() {
        const proofs = [
            { name: "Carlos M.", vehicle: "BYD Dolphin", saving: "$3,200", time: "hace 2 horas" },
            { name: "María L.", vehicle: "BYD Atto 3", saving: "$4,100", time: "hace 3 horas" },
            { name: "Roberto S.", vehicle: "BYD Seal", saving: "$5,300", time: "hace 5 horas" },
            { name: "Ana G.", vehicle: "BYD DM-i", saving: "$2,800", time: "hace 7 horas" }
        ];
        
        let index = 0;
        
        const showProof = () => {
            if (index >= proofs.length) return;
            
            const proof = proofs[index];
            const notification = document.createElement('div');
            notification.className = 'social-proof-notification';
            notification.innerHTML = `
                <i class="fas fa-user-circle fa-2x"></i>
                <div>
                    <strong>${proof.name}</strong> calculó un ahorro de
                    <span class="text-success fw-bold">${proof.saving}/mes</span>
                    con ${proof.vehicle}
                    <small class="d-block text-muted">${proof.time}</small>
                </div>
            `;
            
            document.body.appendChild(notification);
            
            setTimeout(() => notification.remove(), 5000);
            index++;
        };
        
        // Show first proof after 10 seconds, then every 30 seconds
        setTimeout(showProof, 10000);
        setInterval(showProof, 30000);
        
        // Add styles
        if (!document.getElementById('social-proof-styles')) {
            const styles = document.createElement('style');
            styles.id = 'social-proof-styles';
            styles.textContent = `
                .social-proof-notification {
                    position: fixed;
                    bottom: 20px;
                    left: 20px;
                    background: white;
                    padding: 1rem;
                    border-radius: 10px;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    max-width: 350px;
                    animation: slideInLeft 0.3s ease;
                    z-index: 900;
                }
                
                @keyframes slideInLeft {
                    from { transform: translateX(-100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                
                .celebrate {
                    animation: bounce 0.6s ease;
                }
                
                @keyframes bounce {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.2); }
                }
            `;
            document.head.appendChild(styles);
        }
    }
}

// Initialize calculator when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.bydCalculator = new BYDCalculator();
    window.bydCalculator.showSocialProof();
});