/**
 * Google Ads Conversion Tracking
 * Para BYD Salma - salmabydriver.com
 *
 * INSTRUCCIONES:
 * 1. Reemplazar 'AW-XXXXXXXXXX' con tu ID de conversión de Google Ads
 * 2. Reemplazar 'XXXXXXXXXXX' con la etiqueta de conversión específica
 */

// Configuración de Google Ads
const GOOGLE_ADS_CONFIG = {
    conversionId: 'AW-17851391804',
    conversionLabels: {
        lead: 'G2gMCOnxgucbELy-msBC',           // Etiqueta para Lead capturado
        whatsappClick: 'G2gMCOnxgucbELy-msBC',  // Etiqueta para clic WhatsApp
        phoneClick: 'G2gMCOnxgucbELy-msBC',     // Etiqueta para clic teléfono
        calculatorComplete: 'G2gMCOnxgucbELy-msBC' // Etiqueta para calculadora
    }
};

/**
 * Enviar evento de conversión a Google Ads
 */
function sendGoogleAdsConversion(conversionLabel, value = 0, currency = 'MXN') {
    if (typeof gtag === 'function') {
        gtag('event', 'conversion', {
            'send_to': `${GOOGLE_ADS_CONFIG.conversionId}/${conversionLabel}`,
            'value': value,
            'currency': currency
        });
        console.log('📊 Google Ads conversion sent:', conversionLabel);
    }
}

/**
 * Tracking: Lead capturado en chatbot (Salma AI)
 */
function trackLeadConversion(leadData = {}) {
    // Disparo directo de conversión Google Ads
    if (typeof gtag === 'function') {
        gtag('event', 'conversion', {
            'send_to': 'AW-17851391804/G2gMCOnxgucbELy-msBC',
            'value': 200,
            'currency': 'MXN'
        });
        console.log('📊 Google Ads Lead conversion sent: AW-17851391804/G2gMCOnxgucbELy-msBC');
    }

    // También enviar a Google Analytics
    if (typeof gtag === 'function') {
        gtag('event', 'generate_lead', {
            'event_category': 'Chatbot',
            'event_label': leadData.model || 'General',
            'value': 200
        });
    }
}

/**
 * Tracking: Clic en WhatsApp
 */
function trackWhatsAppClick() {
    sendGoogleAdsConversion(GOOGLE_ADS_CONFIG.conversionLabels.whatsappClick, 100);

    if (typeof gtag === 'function') {
        gtag('event', 'contact', {
            'event_category': 'WhatsApp',
            'event_label': 'Click'
        });
    }
}

/**
 * Tracking: Clic en teléfono
 */
function trackPhoneClick() {
    sendGoogleAdsConversion(GOOGLE_ADS_CONFIG.conversionLabels.phoneClick, 100);

    if (typeof gtag === 'function') {
        gtag('event', 'contact', {
            'event_category': 'Phone',
            'event_label': 'Click'
        });
    }
}

/**
 * Tracking: Calculadora completada
 */
function trackCalculatorComplete(model = '') {
    sendGoogleAdsConversion(GOOGLE_ADS_CONFIG.conversionLabels.calculatorComplete, 200);

    if (typeof gtag === 'function') {
        gtag('event', 'calculator_complete', {
            'event_category': 'Calculator',
            'event_label': model
        });
    }
}

/**
 * Auto-attach tracking a enlaces de WhatsApp y teléfono
 */
document.addEventListener('DOMContentLoaded', function() {
    // Track WhatsApp clicks
    document.querySelectorAll('a[href*="wa.me"], a[href*="whatsapp"]').forEach(function(link) {
        link.addEventListener('click', function() {
            trackWhatsAppClick();
        });
    });

    // Track phone clicks
    document.querySelectorAll('a[href^="tel:"]').forEach(function(link) {
        link.addEventListener('click', function() {
            trackPhoneClick();
        });
    });

    console.log('✅ Google Ads tracking initialized');
});

// Exponer funciones globalmente para uso desde otros scripts
window.GoogleAdsTracking = {
    trackLead: trackLeadConversion,
    trackWhatsApp: trackWhatsAppClick,
    trackPhone: trackPhoneClick,
    trackCalculator: trackCalculatorComplete
};
