// BYD Landing Page JavaScript

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            // Close mobile menu if open
            const navbarCollapse = document.querySelector('.navbar-collapse');
            const navbarToggler = document.querySelector('.navbar-toggler');
            if (navbarCollapse.classList.contains('show')) {
                navbarToggler.click();
            }
            
            // Add offset for mobile to account for navbar
            const isMobile = window.innerWidth < 768;
            const offset = isMobile ? 80 : 70;
            const targetPosition = target.offsetTop - offset;
            
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// Navbar scroll effect
window.addEventListener('scroll', function() {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('navbar-scrolled');
    } else {
        navbar.classList.remove('navbar-scrolled');
    }
});

// Simple counter animation
const animateCounter = (counter) => {
    const target = parseInt(counter.getAttribute('data-target'), 10);
    if (!target || isNaN(target)) {
        console.log('Invalid target for counter:', counter, 'target:', target);
        counter.innerText = counter.getAttribute('data-target') || '0';
        return;
    }
    
    console.log('Animating counter to:', target);
    
    let current = 0;
    const increment = target / 60; // 60 steps for smooth animation
    
    const updateCounter = () => {
        current += increment;
        if (current < target) {
            counter.innerText = Math.ceil(current);
            requestAnimationFrame(updateCounter);
        } else {
            counter.innerText = target;
        }
    };
    
    updateCounter();
};

// Initialize all counters immediately
const initCounters = () => {
    const counters = document.querySelectorAll('.counter');
    console.log('Initializing', counters.length, 'counters');
    
    counters.forEach((counter, index) => {
        const target = counter.getAttribute('data-target');
        console.log(`Counter ${index}: data-target="${target}"`);
        
        if (!counter.classList.contains('animated')) {
            counter.classList.add('animated');
            // Start animation after a small delay for visual effect
            setTimeout(() => {
                animateCounter(counter);
            }, index * 200);
        }
    });
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing counters...');
    initCounters();
});

// Fallback initialization
window.addEventListener('load', () => {
    setTimeout(() => {
        console.log('Window loaded, checking counters...');
        // Force start animation if not already started
        const counters = document.querySelectorAll('.counter');
        console.log('Found counters:', counters.length);
        
        counters.forEach((counter, index) => {
            const target = counter.getAttribute('data-target');
            console.log(`Counter ${index}: target=${target}, animated=${counter.classList.contains('animated')}`);
            
            if (!counter.classList.contains('animated')) {
                counter.classList.add('animated');
                animateCounter(counter);
            }
        });
    }, 500);
});

// Floating animation for hero car
const heroCarAnimation = () => {
    const heroCar = document.querySelector('.floating');
    if (heroCar) {
        heroCar.style.animation = 'float 6s ease-in-out infinite';
    }
};

// Add floating keyframes to CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-20px); }
    }
`;
document.head.appendChild(style);
heroCarAnimation();

// Create animated electrons
function createElectrons() {
    const container = document.querySelector('.electric-container');
    if (!container) return;
    
    // Create electron paths
    for (let i = 0; i < 4; i++) {
        const path = document.createElement('div');
        path.className = 'electron-path';
        path.style.width = `${300 + i * 100}px`;
        path.style.height = `${300 + i * 100}px`;
        path.style.left = '50%';
        path.style.top = '50%';
        path.style.transform = 'translate(-50%, -50%)';
        path.style.position = 'absolute';
        
        // Create electron
        const electron = document.createElement('div');
        electron.className = 'electron';
        electron.style.position = 'absolute';
        electron.style.top = '0';
        electron.style.left = '50%';
        electron.style.transform = 'translateX(-50%)';
        
        path.appendChild(electron);
        container.appendChild(path);
    }
}

// Create particle effects
function createParticles() {
    const container = document.querySelector('.electric-container');
    if (!container) return;
    
    setInterval(() => {
        const particle = document.createElement('div');
        particle.style.position = 'absolute';
        particle.style.width = '4px';
        particle.style.height = '4px';
        particle.style.background = '#00D4FF';
        particle.style.borderRadius = '50%';
        particle.style.boxShadow = '0 0 6px #00D4FF';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.animation = 'particleFade 2s ease-out forwards';
        
        container.appendChild(particle);
        
        setTimeout(() => particle.remove(), 2000);
    }, 300);
}

// Add particle animation
const particleStyle = document.createElement('style');
particleStyle.textContent = `
    @keyframes particleFade {
        0% { opacity: 1; transform: translateY(0); }
        100% { opacity: 0; transform: translateY(-50px); }
    }
`;
document.head.appendChild(particleStyle);

// Initialize electric effects
window.addEventListener('load', () => {
    createElectrons();
    createParticles();
});

// Modal functions
function openQuoteModal(vehicleModel) {
    // En lugar de abrir el modal, enviar directamente a WhatsApp
    const phoneNumber = '528120272752';
    const message = `Hola! Me interesa obtener información y cotización del *BYD ${vehicleModel}*. ¿Me pueden ayudar con los detalles y precio?`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    
    // Abrir WhatsApp en una nueva pestaña
    window.open(whatsappUrl, '_blank');
}

// Vehicle Details function
function openVehicleDetails(vehicleName, vehicleType) {
    // Convert vehicle name to URL format
    let vehicleUrl = vehicleName.toLowerCase().replace(' ', '-');
    
    // Map specific names to URL paths
    if (vehicleName === 'BYD King') {
        vehicleUrl = 'king';
    } else if (vehicleName === 'Dolphin Mini') {
        vehicleUrl = 'dolphin-mini';
    } else if (vehicleName === 'BYD Shark') {
        vehicleUrl = 'shark';
    } else if (vehicleName === 'Seal') {
        vehicleUrl = 'seal';
    } else if (vehicleName === 'Sea Lion 7') {
        vehicleUrl = 'sea-lion-7';
    } else if (vehicleName === 'Song Plus') {
        vehicleUrl = 'song-plus';
    } else if (vehicleName === 'Yuan Pro') {
        vehicleUrl = 'yuan-pro';
    }
    
    // Redirect to vehicle detail page
    window.location.href = `/vehicle/${vehicleUrl}`;
}

// Form submissions
const contactForm = document.getElementById('contactForm');
if (contactForm) {
    contactForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const data = Object.fromEntries(formData);
    
    try {
        const response = await fetch('/api/contact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(result.message);
            this.reset();
        } else {
            alert('Error al enviar el mensaje. Inténtalo de nuevo.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al enviar el mensaje. Inténtalo de nuevo.');
    }
});
}

// Quote form no longer needed - redirecting to WhatsApp
// document.getElementById('quoteForm').addEventListener('submit', async function(e) {
//     e.preventDefault();
//     ...
// });

// Savings Calculator
const savingsCalculator = document.getElementById('savingsCalculator');
if (savingsCalculator) {
    savingsCalculator.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const kmPerYear = document.getElementById('kmPerYear').value;
    const currentConsumption = document.getElementById('currentConsumption').value;
    const homeConsumption = document.getElementById('homeConsumption').value;
    const gasType = document.getElementById('gasType').value;
    const vehicleType = document.getElementById('modalVehicleType').value;
    
    try {
        const response = await fetch('/api/calculate-savings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                kmPerYear: parseFloat(kmPerYear),
                currentConsumption: parseFloat(currentConsumption),
                homeConsumption: parseFloat(homeConsumption),
                gasType: gasType,
                vehicleType: vehicleType
            })
        });
        
        const result = await response.json();
        
        // Update results
        document.getElementById('annualSavings').textContent = result.annualSavings.toLocaleString();
        document.getElementById('fiveYearSavings').textContent = result.fiveYearSavings.toLocaleString();
        document.getElementById('co2Reduction').textContent = result.co2Reduction.toLocaleString();
        
        // Show results
        document.getElementById('savingsResult').style.display = 'block';
        
        // Log details for debugging
        console.log('Cálculo realizado para:', {
            vehicleType,
            vehicleName: document.getElementById('modalVehicleName').textContent,
            details: result.details
        });
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error al calcular los ahorros. Inténtalo de nuevo.');
    }
});
}

// Vehicle card hover effects (only for non-touch devices)
if (!('ontouchstart' in window)) {
    document.querySelectorAll('.vehicle-card').forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
            this.style.transition = 'all 0.3s ease';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
}

// Scroll reveal animations
const revealElements = document.querySelectorAll('.vehicle-card, .feature-box, .tech-feature');

const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, { threshold: 0.1 });

revealElements.forEach(element => {
    element.style.opacity = '0';
    element.style.transform = 'translateY(30px)';
    element.style.transition = 'all 0.6s ease';
    revealObserver.observe(element);
});

// Optimize animations for mobile devices
function optimizeForMobile() {
    const isMobile = window.innerWidth < 768;
    const isLowPowerDevice = navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4;
    
    if (isMobile || isLowPowerDevice) {
        // Reduce particle generation frequency
        const particles = document.querySelectorAll('.electron-path');
        particles.forEach(particle => {
            particle.style.animationDuration = '30s'; // Slower animation
        });
        
        // Reduce floating animation
        const floatingElements = document.querySelectorAll('.floating');
        floatingElements.forEach(element => {
            element.style.animationDuration = '8s';
        });
        
        // Disable complex animations on very small screens
        if (window.innerWidth < 480) {
            const electricGrid = document.querySelector('.electric-grid');
            const energyRing = document.querySelector('.energy-ring');
            
            if (electricGrid) electricGrid.style.display = 'none';
            if (energyRing) energyRing.style.display = 'none';
        }
    }
}

// Touch-friendly button feedback
function addTouchFeedback() {
    document.querySelectorAll('.btn').forEach(button => {
        button.addEventListener('touchstart', function() {
            this.style.transform = 'scale(0.95)';
        });
        
        button.addEventListener('touchend', function() {
            this.style.transform = 'scale(1)';
        });
    });
}

// Initialize mobile optimizations
window.addEventListener('load', () => {
    optimizeForMobile();
    addTouchFeedback();
});

// Re-optimize on resize
window.addEventListener('resize', () => {
    optimizeForMobile();
});

// Prevent zoom on form inputs in iOS
document.querySelectorAll('input, select, textarea').forEach(element => {
    element.addEventListener('focus', function() {
        if (window.innerWidth < 768) {
            const viewport = document.querySelector('meta[name="viewport"]');
            viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1');
        }
    });
    
    element.addEventListener('blur', function() {
        if (window.innerWidth < 768) {
            const viewport = document.querySelector('meta[name="viewport"]');
            viewport.setAttribute('content', 'width=device-width, initial-scale=1');
        }
    });
});

console.log('BYD Landing Page JavaScript loaded successfully with mobile optimizations');