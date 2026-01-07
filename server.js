require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3001;

// Chatbot services
let claudeService;
let abuseDetector;
let templateResponses;

try {
    claudeService = require('./services/claudeService');
    abuseDetector = require('./services/abuseDetector');
    templateResponses = require('./services/templateResponses');
    console.log('✅ Chatbot services loaded successfully');
} catch (err) {
    console.log('⚠️ Chatbot services not available:', err.message);
}

// Timestamp helper function for logging
function getTimestamp() {
    const now = new Date();
    const date = now.toLocaleDateString('es-MX', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
    });
    const time = now.toLocaleTimeString('es-MX', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: false 
    });
    return `[${date} ${time}]`;
}

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'public')));
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// Set EJS as template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// BYD Vehicle Data (imported from Interactive App)
const vehicleSpecs = {
    king: {
        name: 'BYD King',
        displayName: 'BYD KING DM-i',
        type: 'hybrid',
        description: 'Híbrido avanzado de alto rendimiento',
        badge: 'Híbrido PHEV',
        badgeClass: 'hybrid',
        image: '/images/byd/byd-auto-king_auto_electrico_BYD.png',
        gallery: [
            '/images/byd/Vhiculos/King/King_1.jpeg',
            '/images/byd/Vhiculos/King/King_2.jpeg',
            '/images/byd/Vhiculos/King/King_3.jpeg',
            '/images/byd/Vhiculos/King/King_4.jpeg',
            '/images/byd/Vhiculos/King/King_6.jpeg'
        ],
        price: 'Desde $485,000 MXN',
        power: { 
            kw: 132, // Motor eléctrico 132 kW
            hp: 177, // 132 kW = ~177 HP
            gasEngine: { kw: 81, hp: 109 } // Motor de gasolina 81 kW
        },
        torque: 316, // Motor eléctrico 316 N.m
        maxSpeed: 185,
        acceleration: '0-100 km/h en 7.9s',
        weight: 1580,
        dimensions: { 
            length: 4780, 
            width: 1837, 
            height: 1495, 
            wheelbase: 2718 
        },
        seats: 5,
        cargoVolume: 450,
        fuelTankCapacity: 48, // litros
        batteryCapacity: 8.3, // kWh
        electricRange: 50, // km en modo EV
        range: 1175, // km autonomía combinada
        consumption: 3.9, // L/100km consumo NEDC
        fuelConsumption: 3.9, // L/100km - Corrected from table
        electricConsumption: 0.166, // kWh/km - Corrected from table (166 converted to kWh/km)
        chargingAC: 3.3, // kW
        tireSize: '215/55 R17',
        features: [
            'Sistema híbrido eléctrico innovador (EHS)',
            'Autonomía combinada de 1,175 km (NEDC)',
            'Autonomía eléctrica de 50 km',
            'Consumo ultra bajo 3.9L/100km',
            'Batería Blade Ultra Segura Híbrida',
            'Pantalla inteligente rotativa de 12.8"',
            'Sistema de control por voz "Hi BYD"',
            'Carga inalámbrica de teléfonos'
        ],
        safetyFeatures: [
            'Bolsas de aire frontales para conductor y pasajero',
            'Bolsas de aire laterales delanteras',
            'Bolsas de aire de cortina frontales y traseras',
            'Sistema de monitoreo de presión de neumáticos (TPMS)',
            'Sistema de freno inteligente',
            'Control dinámico del vehículo (VDC)',
            'Sistema de control de tracción (TCS)',
            'Asistencia de frenado hidráulico (HBA)'
        ],
        comfort: [
            'Asiento del conductor ajustable eléctricamente (6 posiciones)',
            'Aire acondicionado automático con filtro PM2.5',
            'Volante multifuncional',
            'Instrumento LCD completo de 8.8 pulgadas',
            'CarPlay y Android Auto',
            '6 altavoces',
            'Conexión 4G y actualización OTA'
        ],
        exterior: [
            'Luces delanteras LED',
            'Luces traseras LED consecutivas',
            'Luces de circulación diurna (DRL)',
            'Llantas de aleación de 17" de doble color',
            'Espejos exteriores con calefacción eléctrica'
        ]
    },
    dolphin: {
        name: 'Dolphin Mini',
        displayName: 'BYD DOLPHIN MINI',
        type: 'electric',
        description: 'Hatchback 100% eléctrico inteligente, eficiente y divertido',
        badge: '100% Eléctrico',
        badgeClass: 'electric',
        image: '/images/byd/byd-auto-dolphin-mini_auto_electrico_BYD.webp',
        gallery: [
            '/images/byd/Vhiculos/Dolphine/Dolphine1.jpg',
            '/images/byd/Vhiculos/Dolphine/Dolphine2.jpg',
            '/images/byd/Vhiculos/Dolphine/Dolphine3.jpg'
        ],
        price: 'Desde $358,800 MXN',
        power: { kw: 55, hp: 74 }, // Motor frontal
        torque: 135, // N·m
        maxSpeed: 130,
        acceleration: '0-50 km/h en 4.9s',
        weight: 1160,
        dimensions: { 
            length: 3780, 
            width: 1715, 
            height: 1580, 
            wheelbase: 2500,
            groundClearance: 120
        },
        seats: 4,
        cargoVolume: 230,
        minTurningRadius: 4.95, // metros
        tireSize: '175/55 R16',
        wheelSize: '16 pulgadas aleación aluminio',
        variants: {
            standard: {
                batteryCapacity: 30.08, // kWh
                range: 300, // km NEDC
                chargingTime: '30%-80% en 30 min'
            },
            plus: {
                batteryCapacity: 38, // kWh  
                range: 380, // km NEDC
                chargingTime: '30%-80% en 30 min'
            }
        },
        batteryCapacity: 30.08, // kWh (Base version from table)
        range: 300, // km NEDC (Base version from table)
        consumption: 10, // kWh/100km NEDC
        chargingAC: 6, // kW estándar AC
        chargingDC: 40, // kW estándar DC (Plus version supports 40kW, standard 30kW)
        chargingTimeAC: '6.3 horas (AC 6kW)',
        chargingTimeDC: '30%-80% en 30 min',
        vtol: true, // Función de carga reversible
        features: [
            'Plataforma e-Platform 3.0',
            'Autonomía 300/380 km (NEDC)',
            'Cabina Ocean Chic',
            'Ultra-Safe Batería Blade',
            'Sistema de Cabina Inteligente BYD',
            'Pantalla inteligente 10.1" con rotación eléctrica',
            'Carga inalámbrica de teléfonos',
            'Función de carga reversible (VTOL)'
        ],
        safetyFeatures: [
            'Bolsas de aire frontales (conductor y pasajero)',
            'Bolsas de aire laterales delanteras',
            'Bolsas de aire de cortina (delanteras y traseras)',
            'Sistema de frenos de potencia inteligente (IPB)',
            'Sistema de control dinámico del vehículo (VDC)',
            'Sistema de control de tracción (TCS)',
            'Asistencia de frenado hidráulico (HBA)',
            'Control de crucero (CC)',
            'Sistema de monitoreo presión neumáticos (TPMS)'
        ],
        comfort: [
            'Asientos de cuero sintético',
            'Asiento conductor ajustable 6 direcciones (Plus)',
            'Aire acondicionado eléctrico',
            'Volante multifunción',
            'Sistema control por voz "Hi BYD"',
            'CarPlay + Android Auto',
            'Actualización remota OTA',
            '4 altavoces'
        ],
        exterior: [
            'Luces delanteras LED',
            'Luces circulación diurna LED',
            'Luces combinadas traseras LED',
            'Encendido automático faros',
            'Limpia parabrisas',
            'Desbloqueo eléctrico cajuela'
        ],
        colors: [
            'Sprout Green',
            'Light Blue', 
            'Polar Night Black',
            'Dark Blue',
            'Peach Pink',
            'Apricity White'
        ]
    },
    dolphinplus: {
        name: 'Dolphin Mini Plus',
        displayName: 'BYD DOLPHIN MINI PLUS',
        type: 'electric',
        description: 'Hatchback 100% eléctrico con mayor autonomía',
        badge: '100% Eléctrico Plus',
        badgeClass: 'electric',
        image: '/images/byd/byd-auto-dolphin-mini_auto_electrico_BYD.webp',
        price: 'Desde $398,800 MXN',
        power: { kw: 55, hp: 74 }, // Motor frontal
        torque: 135, // N·m
        maxSpeed: 130,
        acceleration: '0-50 km/h en 4.9s',
        weight: 1180,
        dimensions: { 
            length: 3780, 
            width: 1715, 
            height: 1580, 
            wheelbase: 2500,
            groundClearance: 120
        },
        seats: 4,
        cargoVolume: 230,
        minTurningRadius: 4.95, // metros
        tireSize: '175/55 R16',
        wheelSize: '16 pulgadas aleación aluminio',
        batteryCapacity: 38, // kWh - Plus version from table
        range: 380, // km NEDC - Plus version from table
        consumption: 10, // kWh/100km - Same as base version
        chargingAC: 6, // kW estándar AC
        chargingDC: 40, // kW estándar DC
        chargingTimeAC: '6.3 horas (AC 6kW)',
        chargingTimeDC: '30%-80% en 30 min',
        vtol: true, // Función de carga reversible
        features: [
            'Plataforma e-Platform 3.0',
            'Autonomía 380 km (NEDC)',
            'Cabina Ocean Chic',
            'Ultra-Safe Batería Blade',
            'Sistema de Cabina Inteligente BYD',
            'Pantalla inteligente 10.1" con rotación eléctrica',
            'Carga inalámbrica de teléfonos',
            'Función de carga reversible (VTOL)'
        ],
        safetyFeatures: [
            'Bolsas de aire frontales (conductor y pasajero)',
            'Bolsas de aire laterales delanteras',
            'Bolsas de aire de cortina (delanteras y traseras)',
            'Sistema de frenos de potencia inteligente (IPB)',
            'Sistema de control dinámico del vehículo (VDC)',
            'Sistema de control de tracción (TCS)',
            'Asistencia de frenado hidráulico (HBA)',
            'Control de crucero (CC)',
            'Sistema de monitoreo presión neumáticos (TPMS)'
        ],
        comfort: [
            'Asientos de cuero sintético',
            'Asiento conductor ajustable 6 direcciones',
            'Aire acondicionado eléctrico',
            'Volante multifunción',
            'Sistema control por voz "Hi BYD"',
            'CarPlay + Android Auto',
            'Actualización remota OTA',
            '4 altavoces'
        ],
        exterior: [
            'Luces delanteras LED',
            'Luces circulación diurna LED',
            'Luces combinadas traseras LED',
            'Encendido automático faros',
            'Limpia parabrisas',
            'Desbloqueo eléctrico cajuela'
        ],
        colors: [
            'Sprout Green',
            'Light Blue', 
            'Polar Night Black',
            'Dark Blue',
            'Peach Pink',
            'Apricity White'
        ]
    },
    shark: {
        name: 'BYD Shark',
        displayName: 'BYD SHARK',
        type: 'hybrid',
        description: 'La pickup híbrida enchufable del futuro',
        badge: 'Próximamente',
        badgeClass: 'coming-soon',
        image: '/images/byd/byd-shark-new.webp',
        price: 'Desde $899,980 MXN',
        power: { 
            kw: 170, // Estimado para pickup híbrida
            hp: 228, // 170 kW = ~228 HP
            gasEngine: { kw: 100, hp: 134 } // Motor de gasolina estimado
        },
        torque: 400, // Torque típico para pickup híbrida
        maxSpeed: 180,
        acceleration: '0-100 km/h en 8.5s',
        weight: 2200,
        dimensions: { 
            length: 5457, 
            width: 1971, 
            height: 1925, 
            wheelbase: 3260 
        },
        seats: 5,
        payloadCapacity: 1200, // kg - capacidad de carga
        towingCapacity: 2500, // kg - capacidad de remolque estimada
        fuelTankCapacity: 60, // litros estimado
        batteryCapacity: 29, // kWh - Corrected from table
        electricRange: 100, // km en modo EV estimado
        range: 840, // km autonomía combinada
        consumption: 7.5, // L/100km - Corrected from table
        fuelConsumption: 7.5, // L/100km - Corrected from table
        electricConsumption: 0.29, // kWh/km - Corrected from table
        chargingAC: 6.6, // kW
        driveType: 'AWD', // All-wheel drive
        tireSize: '265/65 R18',
        groundClearance: 230, // mm
        wadingDepth: 700, // mm - profundidad de vadeo
        approachAngle: 24, // grados
        departureAngle: 30, // grados
        features: [
            'Pickup híbrida enchufable (PHEV)',
            'Autonomía total de 840 km',
            'Capacidad de carga 1,200 kg',
            'Tracción integral (AWD)',
            'Tecnología BYD Blade Battery',
            'Sistema híbrido inteligente',
            'Modo todoterreno avanzado',
            'Pantalla táctil de gran formato'
        ],
        safetyFeatures: [
            'Estructura reforzada para pickup',
            'Sistema de frenos ABS con EBD',
            'Control de estabilidad (ESC)',
            'Asistencia en pendientes (HSA)',
            'Cámaras 360° para maniobras',
            'Sensores de proximidad',
            'Airbags múltiples',
            'Monitoreo presión neumáticos'
        ],
        workFeatures: [
            'Plataforma de carga reforzada',
            'Ganchos de amarre múltiples',
            'Iluminación LED en caja',
            'Toma de corriente 220V (VTOL)',
            'Protección anticorrosión',
            'Suspensión para carga pesada'
        ],
        comfort: [
            'Cabina premium para 5 pasajeros',
            'Asientos de cuero sintético',
            'Aire acondicionado automático',
            'Sistema multimedia avanzado',
            'Carga inalámbrica smartphone',
            'Múltiples puertos USB',
            'Volante multifuncional'
        ],
        terrain: [
            'Ángulo de aproximación 24°',
            'Ángulo de salida 30°',
            'Altura libre 230mm',
            'Profundidad vadeo 700mm',
            'Tracción AWD inteligente',
            'Modos de manejo off-road'
        ]
    },
    seal: {
        name: 'BYD Seal',
        displayName: 'BYD SEAL',
        type: 'electric',
        description: 'Sedán deportivo de lujo 100% eléctrico',
        badge: 'Más Popular',
        badgeClass: 'hot',
        image: '/images/byd/byd-auto-seal_auto_electrico_BYD.png',
        price: 'Desde $888,800 MXN',
        power: { kw: 230, hp: 308 }, // Versión de alto rendimiento
        torque: 360, // N·m
        maxSpeed: 180,
        acceleration: '0-100 km/h en 3.8s',
        weight: 1875,
        dimensions: { 
            length: 4800, 
            width: 1875, 
            height: 1460, 
            wheelbase: 2920 
        },
        seats: 5,
        cargoVolume: 402,
        batteryCapacity: 61.44, // kWh - RWD version from table
        range: 460, // km NEDC - RWD version from table
        consumption: 15.4, // kWh/100km - RWD version from table
        chargingAC: 11, // kW
        chargingDC: 110, // kW
        chargingTimeAC: '7.5 horas (AC 11kW)',
        chargingTimeDC: '30 minutos (10-80%)',
        vtol: true,
        tireSize: '235/45 R19',
        features: [
            'Sedan deportivo 100% eléctrico',
            'Autonomía hasta 700 km NEDC',
            'Aceleración 0-100 km/h en 3.8s',
            'Tecnología e-Platform 3.0',
            'Batería Blade de 82.5 kWh',
            'Carga rápida DC hasta 110kW',
            'Interior premium con cuero Nappa',
            'Pantalla rotativa de 15.6"'
        ],
        safetyFeatures: [
            'Bolsas de aire frontales y laterales',
            'Bolsas de aire de cortina',
            'Sistema de frenos IPB inteligente',
            'Control dinámico del vehículo (VDC)',
            'Asistente de mantenimiento de carril',
            'Frenado automático de emergencia',
            'Monitoreo de punto ciego',
            'Control de crucero adaptativo'
        ],
        comfort: [
            'Asientos deportivos de cuero Nappa',
            'Asiento conductor con memoria eléctrica',
            'Climatización automática dual',
            'Volante deportivo multifuncional',
            'Sistema de sonido premium',
            'Iluminación ambiental LED',
            'Techo panorámico',
            'Carga inalámbrica para smartphone'
        ],
        exterior: [
            'Faros LED adaptativos',
            'Luces traseras LED con animación',
            'Llantas deportivas de 19"',
            'Spoiler trasero integrado',
            'Manijas de puerta retráctiles',
            'Espejos exteriores con plegado eléctrico'
        ]
    },
    sealawd: {
        name: 'BYD Seal AWD',
        displayName: 'BYD SEAL AWD',
        type: 'electric',
        description: 'Sedán deportivo de lujo 100% eléctrico con tracción integral',
        badge: 'Deportivo AWD',
        badgeClass: 'hot',
        image: '/images/byd/byd-seal-new.png',
        price: 'Desde $988,800 MXN',
        power: { kw: 390, hp: 523 }, // AWD version with dual motors
        torque: 670, // N·m
        maxSpeed: 180,
        acceleration: '0-100 km/h en 3.8s',
        weight: 2015,
        dimensions: { 
            length: 4800, 
            width: 1875, 
            height: 1460, 
            wheelbase: 2920 
        },
        seats: 5,
        cargoVolume: 402,
        batteryCapacity: 82.56, // kWh - AWD version from table
        range: 520, // km NEDC - AWD version from table
        consumption: 18.2, // kWh/100km - AWD version from table
        chargingAC: 11, // kW
        chargingDC: 110, // kW
        chargingTimeAC: '7.5 horas (AC 11kW)',
        chargingTimeDC: '30 minutos (10-80%)',
        vtol: true,
        driveType: 'AWD',
        tireSize: '235/45 R19',
        features: [
            'Sedan deportivo 100% eléctrico AWD',
            'Autonomía hasta 520 km NEDC',
            'Aceleración 0-100 km/h en 3.8s',
            'Tecnología e-Platform 3.0',
            'Batería Blade de 82.56 kWh',
            'Tracción integral inteligente',
            'Carga rápida DC hasta 110kW',
            'Interior premium con cuero Nappa',
            'Pantalla rotativa de 15.6"'
        ],
        safetyFeatures: [
            'Bolsas de aire frontales y laterales',
            'Bolsas de aire de cortina',
            'Sistema de frenos IPB inteligente',
            'Control dinámico del vehículo (VDC)',
            'Asistente de mantenimiento de carril',
            'Frenado automático de emergencia',
            'Monitoreo de punto ciego',
            'Control de crucero adaptativo'
        ],
        comfort: [
            'Asientos deportivos de cuero Nappa',
            'Asiento conductor con memoria eléctrica',
            'Climatización automática dual',
            'Volante deportivo multifuncional',
            'Sistema de sonido premium',
            'Iluminación ambiental LED',
            'Techo panorámico',
            'Carga inalámbrica para smartphone'
        ],
        exterior: [
            'Faros LED adaptativos',
            'Luces traseras LED con animación',
            'Llantas deportivas de 19"',
            'Spoiler trasero integrado',
            'Manijas de puerta retráctiles',
            'Espejos exteriores con plegado eléctrico',
            'Insignias AWD distintivas'
        ]
    },
    sealion7: {
        name: 'BYD Sea Lion 7',
        displayName: 'BYD SEA LION 7',
        type: 'electric',
        description: 'SUV eléctrica premium de 7 plazas',
        badge: 'SUV Premium',
        badgeClass: 'electric',
        image: '/images/byd/byd-auto-sealion7_auto_electrico_BYD.png',
        price: 'Desde $748,800 MXN',
        power: { kw: 160, hp: 214 }, // Motor frontal
        torque: 310, // N·m
        maxSpeed: 175,
        acceleration: '0-100 km/h en 8.5s',
        weight: 2140,
        dimensions: { 
            length: 4830, 
            width: 1925, 
            height: 1620, 
            wheelbase: 2930 
        },
        seats: 7,
        cargoVolume: 193, // Con 7 asientos
        cargoVolumeMax: 1694, // Con asientos plegados
        batteryCapacity: 71.8, // kWh
        range: 610, // km NEDC
        consumption: 11.8, // kWh/100km
        chargingAC: 11, // kW
        chargingDC: 150, // kW
        chargingTimeAC: '6.5 horas (AC 11kW)',
        chargingTimeDC: '30 minutos (10-80%)',
        vtol: true,
        driveType: 'FWD', // AWD opcional
        tireSize: '255/50 R20',
        features: [
            'SUV eléctrica de 7 plazas',
            'Autonomía hasta 610 km NEDC',
            'Tecnología e-Platform 3.0',
            'Batería Blade de 71.8 kWh',
            'Carga rápida DC hasta 150kW',
            'Interior premium de 7 plazas',
            'Pantalla central de 12.3"',
            'Sistema DiPilot de conducción asistida'
        ],
        safetyFeatures: [
            '6 bolsas de aire',
            'Sistema de frenos IPB',
            'Control dinámico VDC',
            'Asistente de mantenimiento de carril',
            'Frenado de emergencia automático',
            'Monitor de punto ciego',
            'Control crucero adaptativo',
            'Cámaras 360°'
        ],
        comfort: [
            'Configuración 2+2+3 plazas',
            'Asientos de cuero premium',
            'Climatización tri-zona',
            'Techo panorámico',
            'Sistema de entretenimiento posterior',
            'Múltiples puertos USB-C',
            'Iluminación ambiental',
            'Control por voz "Hi BYD"'
        ],
        exterior: [
            'Diseño Dragon Face 3.0',
            'Faros LED adaptativos',
            'Luces traseras LED conectadas',
            'Llantas de aleación 20"',
            'Rieles de techo',
            'Estribos laterales eléctricos'
        ]
    },
    songplus: {
        name: 'BYD Song Plus',
        displayName: 'BYD SONG PLUS',
        type: 'hybrid',
        description: 'SUV híbrido familiar versátil y eficiente',
        badge: 'Familiar Híbrido',
        badgeClass: 'hybrid',
        image: '/images/byd/byd-song-plus.webp',
        gallery: [
            '/images/byd/Vhiculos/Song Plus/Song_Plus_1.jpg',
            '/images/byd/Vhiculos/Song Plus/Song_Plus_2.jpg',
            '/images/byd/Vhiculos/Song Plus/Song_Plus_3.jpg',
            '/images/byd/Vhiculos/Song Plus/Song_Plus_4.jpeg',
            '/images/byd/Vhiculos/Song Plus/Song_Plus_5.jpeg',
            '/images/byd/Vhiculos/Song Plus/Song_Plus_6.jpeg',
            '/images/byd/Vhiculos/Song Plus/Song_Plus_7.jpeg',
            '/images/byd/Vhiculos/Song Plus/Song_Plus_8.jpeg',
            '/images/byd/Vhiculos/Song Plus/Song_Plus_9.jpeg',
            '/images/byd/Vhiculos/Song Plus/Song_Plus_10.jpeg',
            '/images/byd/Vhiculos/Song Plus/Song_Plus_11.jpeg'
        ],
        price: 'Desde $598,800 MXN',
        power: { 
            kw: 135, // Motor eléctrico 135 kW
            hp: 181, // 135 kW = ~181 HP
            gasEngine: { kw: 110, hp: 147 } // Motor de gasolina 1.5T
        },
        torque: 280, // N·m
        maxSpeed: 160,
        acceleration: '0-100 km/h en 8.5s',
        weight: 1785,
        dimensions: { 
            length: 4705, 
            width: 1890, 
            height: 1680, 
            wheelbase: 2765 
        },
        seats: 5,
        cargoVolume: 520,
        cargoVolumeMax: 1340, // Con asientos traseros plegados
        batteryCapacity: 18.3, // kWh - Corrected from table
        electricRange: 105, // km autonomía eléctrica
        range: 605, // km autonomía total
        consumption: 5.1, // L/100km - Corrected from table
        fuelConsumption: 5.1, // L/100km consumo híbrido
        electricConsumption: 0.174, // kWh/km - Corrected from table
        chargingAC: 6.6, // kW
        chargingDC: 80, // kW
        chargingTimeAC: '11 horas (AC 6.6kW)',
        chargingTimeDC: '40 minutos (10-80%)',
        vtol: true,
        tireSize: '225/65 R17',
        features: [
            'SUV familiar de 5 plazas',
            'Autonomía hasta 605 km NEDC',
            'Calificación 5 estrellas C-NCAP',
            'Batería Blade de 71.7 kWh',
            'Tecnología e-Platform 3.0',
            'Sistema DiPilot inteligente',
            'Pantalla rotativa de 12.8"',
            'Función VTOL (carga externa)'
        ],
        safetyFeatures: [
            'Calificación 5 estrellas C-NCAP',
            'Sistema de frenos IPB',
            'Control dinámico VDC',
            'Frenado automático de emergencia',
            'Asistente de cambio de carril',
            'Monitor de fatiga del conductor',
            'Sistema de alerta de colisión',
            'Control de crucero adaptativo'
        ],
        comfort: [
            'Asientos de cuero sintético',
            'Asiento conductor eléctrico 6 vías',
            'Climatización automática',
            'Volante calefaccionable',
            'Sistema de sonido Dirac',
            'Techo corredizo panorámico',
            'Filtro PM2.5',
            'Múltiples modos de conducción'
        ],
        exterior: [
            'Diseño Dragon Face',
            'Faros LED tipo dragón',
            'Luces traseras LED conectadas',
            'Llantas de aleación 18"',
            'Barras de techo integradas',
            'Cromados en ventanas'
        ]
    },
    songpro: {
        name: 'BYD Song Pro',
        displayName: 'BYD SONG PRO',
        type: 'hybrid',
        description: 'SUV híbrido compacto con máxima eficiencia',
        badge: 'Eficiente',
        badgeClass: 'hybrid',
        image: '/images/byd/byd-auto-song-pro_auto_electrico_BYD.webp',
        price: 'Desde $548,800 MXN',
        power: { 
            kw: 120, // Motor eléctrico 120 kW
            hp: 161, // 120 kW = ~161 HP
            gasEngine: { kw: 90, hp: 121 } // Motor de gasolina 1.5T
        },
        torque: 260, // N·m
        maxSpeed: 160,
        acceleration: '0-100 km/h en 8.8s',
        weight: 1650,
        dimensions: { 
            length: 4650, 
            width: 1860, 
            height: 1700, 
            wheelbase: 2712 
        },
        seats: 5,
        cargoVolume: 480,
        cargoVolumeMax: 1200, // Con asientos traseros plegados
        batteryCapacity: 12.9, // kWh - From table
        electricRange: 71, // km autonomía eléctrica - From table
        range: 900, // km autonomía total estimada
        consumption: 4.5, // L/100km - From table
        fuelConsumption: 4.5, // L/100km consumo híbrido
        electricConsumption: 0.18, // kWh/km - From table
        chargingAC: 3.3, // kW
        chargingTimeAC: '4 horas (AC 3.3kW)',
        vtol: false,
        tireSize: '215/65 R17',
        features: [
            'SUV híbrido compacto de 5 plazas',
            'Consumo ultra bajo 4.5L/100km',
            'Autonomía eléctrica de 71 km',
            'Batería Blade de 12.9 kWh',
            'Sistema híbrido DM-i avanzado',
            'Pantalla central de 12.8"',
            'Control por voz inteligente',
            'Máxima eficiencia en ciudad'
        ],
        safetyFeatures: [
            'Estructura reforzada híbrida',
            'Sistema de frenos ABS/EBD',
            'Control de estabilidad ESP',
            'Asistencia de frenado de emergencia',
            'Cámaras de estacionamiento',
            'Sensores de proximidad',
            'Airbags frontales y laterales',
            'Monitoreo presión neumáticos'
        ],
        comfort: [
            'Asientos de cuero sintético',
            'Climatización automática',
            'Volante multifuncional',
            'Sistema multimedia touchscreen',
            'Conectividad smartphone',
            'Múltiples puertos USB',
            'Luces LED ambiente',
            'Modo silencioso EV'
        ],
        exterior: [
            'Diseño aerodinámico eficiente',
            'Faros LED adaptativos',
            'Luces traseras LED',
            'Llantas de aleación 17"',
            'Espejos plegables eléctricos',
            'Antena tipo aleta de tiburón'
        ]
    },
    yuanpro: {
        name: 'BYD Yuan Pro',
        displayName: 'BYD YUAN PRO',
        type: 'electric',
        description: 'Crossover urbano inteligente y eficiente',
        badge: 'Compacto',
        badgeClass: 'electric',
        image: '/images/byd/byd-auto-yuan-pro_auto_electrico_BYD.png',
        price: 'Desde $458,800 MXN',
        power: { kw: 70, hp: 94 },
        torque: 180, // N·m
        maxSpeed: 130,
        acceleration: '0-50 km/h en 5.5s',
        weight: 1405,
        dimensions: { 
            length: 4375, 
            width: 1785, 
            height: 1680, 
            wheelbase: 2535 
        },
        seats: 5,
        cargoVolume: 370,
        cargoVolumeMax: 1120, // Con asientos traseros plegados
        batteryCapacity: 45, // kWh - Corrected from table
        range: 380, // km NEDC - Corrected from table
        consumption: 11.9, // kWh/100km - Corrected from table
        chargingAC: 6.6, // kW
        chargingDC: 60, // kW
        chargingTimeAC: '8 horas (AC 6.6kW)',
        chargingTimeDC: '35 minutos (30-80%)',
        vtol: true,
        tireSize: '215/60 R17',
        features: [
            'Crossover urbano compacto',
            'Autonomía hasta 401 km NEDC',
            'Sistema DiLink 3.0 inteligente',
            'Batería Blade de 50.1 kWh',
            'Pantalla rotativa de 10.1"',
            'Control por voz "Hi BYD"',
            'Función VTOL para camping',
            'Diseño juvenil y dinámico'
        ],
        safetyFeatures: [
            'Estructura de carrocería de alta resistencia',
            'Sistema de frenos ABS/EBD',
            'Control de estabilidad ESP',
            'Asistencia de arranque en pendiente',
            'Sistema de monitoreo TPMS',
            'Anclajes ISOFIX',
            'Freno de mano eléctrico',
            'Cámaras de reversa'
        ],
        comfort: [
            'Interior moderno y colorido',
            'Asientos deportivos',
            'Aire acondicionado automático',
            'Volante multifuncional',
            'Sistema de audio de 8 altavoces',
            'Conectividad smartphone',
            'Carga inalámbrica',
            'Iluminación LED interior'
        ],
        exterior: [
            'Diseño SUV compacto',
            'Faros LED con DRL',
            'Parrilla cerrada aerodinámica',
            'Llantas de aleación 17"',
            'Cromados en manijas y ventanas',
            'Antena tipo aleta de tiburón'
        ]
    }
};

// CFE Rates and Gas Prices
const cfeRates = {
    residential: {
        basic: 0.793,      // 0-300 kWh (tarifa 1)
        intermediate1: 0.956,  // 301-600 kWh (tarifa 1B) 
        intermediate2: 2.859,  // 601-750 kWh (tarifa 1C)
        excess: 3.506      // 751+ kWh (tarifa 1D)
    },
    limits: {
        basic: 300,
        intermediate1: 600,
        intermediate2: 750
    },
    iva: 0.16
};

const gasPrices = {
    magna: 23.76,
    premium: 26.83
};

// Routes

// Mockup Premium Route
app.get('/mockup', (req, res) => {
    res.render('mockup-premium');
});

app.get('/', (req, res) => {
    // Convert vehicle specs to display format
    const vehicleData = [
        {
            ...vehicleSpecs.king,
            features: [`${vehicleSpecs.king.range} km autonomía combinada`, `${vehicleSpecs.king.electricRange} km modo eléctrico`, `${vehicleSpecs.king.seats} pasajeros`]
        },
        {
            ...vehicleSpecs.dolphin,
            features: [`${vehicleSpecs.dolphin.range} km autonomía`, `${vehicleSpecs.dolphin.chargingTimeDC}`, `${vehicleSpecs.dolphin.seats} pasajeros`]
        },
        {
            ...vehicleSpecs.shark,
            features: [`${vehicleSpecs.shark.range} km autonomía total`, `${vehicleSpecs.shark.payloadCapacity} kg capacidad carga`, `${vehicleSpecs.shark.seats} pasajeros`]
        },
        {
            name: 'Seal',
            displayName: 'BYD SEAL',
            type: 'electric',
            description: 'Sedán deportivo de lujo 100% eléctrico',
            badge: 'Más Popular',
            badgeClass: 'hot',
            image: '/images/byd/byd-auto-seal_auto_electrico_BYD.png',
            price: 'Desde $888,800 MXN',
            range: 700,
            acceleration: '0-100 km/h en 3.8s',
            seats: 5,
            features: ['700 km autonomía NEDC', '0-100 km/h en 3.8s', '5 pasajeros premium']
        },
        {
            name: 'Sea Lion 7',
            displayName: 'BYD SEA LION 7',
            type: 'electric',
            description: 'SUV eléctrica premium de 7 plazas',
            badge: 'SUV Premium',
            badgeClass: 'electric',
            image: '/images/byd/byd-auto-sealion7_auto_electrico_BYD.png',
            price: 'Desde $748,800 MXN',
            range: 610,
            seats: 7,
            features: ['610 km autonomía NEDC', 'AWD inteligente', '7 pasajeros']
        },
        {
            name: 'Song Plus',
            displayName: 'BYD SONG PLUS',
            type: 'electric',
            description: 'SUV familiar versátil y eficiente',
            badge: 'Familiar',
            badgeClass: 'electric',
            image: '/images/byd/byd-song-plus.webp',
            price: 'Desde $598,800 MXN',
            range: 605,
            seats: 5,
            safetyRating: '5 estrellas',
            features: ['605 km autonomía NEDC', '5 estrellas seguridad', '5 pasajeros']
        },
        {
            name: 'Yuan Pro',
            displayName: 'BYD YUAN PRO',
            type: 'electric',
            description: 'Crossover urbano inteligente',
            badge: 'Compacto',
            badgeClass: 'electric',
            image: '/images/byd/byd-auto-yuan-pro_auto_electrico_BYD.png',
            price: 'Desde $458,800 MXN',
            range: 401,
            seats: 5,
            features: ['401 km autonomía NEDC', 'DiLink 3.0 inteligente', '5 pasajeros']
        }
    ];

    // Estadísticas reales basadas en la flota BYD y datos globales
    const statsData = [
        { 
            icon: 'fas fa-battery-full', 
            value: 1175, // BYD King autonomía combinada máxima
            unit: 'km Máxima Autonomía'
        },
        { 
            icon: 'fas fa-bolt', 
            value: 30, // Carga rápida DC estándar 10-80%
            unit: 'Min Carga Rápida'
        },
        { 
            icon: 'fas fa-trophy', 
            value: 1, // BYD es #1 mundial en EVs
            unit: 'Marca Global en EVs'
        },
        { 
            icon: 'fas fa-shield-alt', 
            value: 8, // Garantía batería BYD Blade
            unit: 'Años Garantía Batería'
        }
    ];

    const whyBydFeatures = [
        {
            icon: 'fas fa-globe-americas',
            title: 'Líder Global',
            description: '#1 en ventas de vehículos eléctricos a nivel mundial con más de 3 millones de unidades vendidas'
        },
        {
            icon: 'fas fa-microscope',
            title: 'Innovación Constante',
            description: 'Más de 28 años de experiencia en tecnología de baterías y 20,000 ingenieros en I+D'
        },
        {
            icon: 'fas fa-certificate',
            title: 'Calidad Garantizada',
            description: 'Certificaciones internacionales y garantía de hasta 8 años en baterías'
        },
        {
            icon: 'fas fa-charging-station',
            title: 'Red de Carga',
            description: 'Acceso a más de 10,000 puntos de carga en México y creciendo'
        },
        {
            icon: 'fas fa-tools',
            title: 'Servicio Premium',
            description: 'Red de servicio autorizado con técnicos especializados en vehículos eléctricos'
        },
        {
            icon: 'fas fa-leaf',
            title: 'Compromiso Verde',
            description: 'Cero emisiones locales y producción sustentable con energía renovable'
        }
    ];

    res.render('index', { 
        vehicles: vehicleData,
        stats: statsData,
        whyBydFeatures: whyBydFeatures
    });
});

// Route for individual vehicle pages (Spanish URL)
app.get('/vehiculo/:vehicleName', (req, res) => {
    const vehicleName = req.params.vehicleName.toLowerCase();
    let vehicle;

    // Map URL paths to vehicle specs
    if (vehicleName === 'king') {
        vehicle = vehicleSpecs.king;
    } else if (vehicleName === 'dolphin-mini' || vehicleName === 'dolphin') {
        vehicle = vehicleSpecs.dolphin;
    } else if (vehicleName === 'shark') {
        vehicle = vehicleSpecs.shark;
    } else if (vehicleName === 'seal') {
        vehicle = vehicleSpecs.seal;
    } else if (vehicleName === 'sea-lion-7' || vehicleName === 'sealion7') {
        vehicle = vehicleSpecs.sealion7;
    } else if (vehicleName === 'song-plus' || vehicleName === 'songplus') {
        vehicle = vehicleSpecs.songplus;
    } else if (vehicleName === 'yuan-pro' || vehicleName === 'yuanpro') {
        vehicle = vehicleSpecs.yuanpro;
    } else {
        return res.status(404).send('Vehículo no encontrado');
    }

    console.log(getTimestamp() + " - Loading vehicle: " + vehicleName + " Mapped to: " + (vehicle ? vehicle.name : 'NOT FOUND'));

    res.render('vehicle-detail', {
        vehicle: vehicle,
        cfeRates: cfeRates,
        gasPrices: gasPrices
    });
});

// Route for individual vehicle pages (English URL - legacy support)
app.get('/vehicle/:vehicleName', (req, res) => {
    const vehicleName = req.params.vehicleName.toLowerCase();
    let vehicle;
    
    // Map URL paths to vehicle specs
    if (vehicleName === 'king') {
        vehicle = vehicleSpecs.king;
    } else if (vehicleName === 'dolphin-mini' || vehicleName === 'dolphin') {
        vehicle = vehicleSpecs.dolphin;
    } else if (vehicleName === 'shark') {
        vehicle = vehicleSpecs.shark;
    } else if (vehicleName === 'seal') {
        vehicle = vehicleSpecs.seal;
    } else if (vehicleName === 'sea-lion-7' || vehicleName === 'sealion7') {
        vehicle = vehicleSpecs.sealion7;
    } else if (vehicleName === 'song-plus' || vehicleName === 'songplus') {
        vehicle = vehicleSpecs.songplus;
    } else if (vehicleName === 'yuan-pro' || vehicleName === 'yuanpro') {
        vehicle = vehicleSpecs.yuanpro;
    } else {
        return res.status(404).send('Vehículo no encontrado');
    }
    
    console.log(getTimestamp() + " - Loading vehicle: " + vehicleName + " Mapped to: " + (vehicle ? vehicle.name : 'NOT FOUND'));
    
    res.render('vehicle-detail', { 
        vehicle: vehicle,
        cfeRates: cfeRates,
        gasPrices: gasPrices
    });
});

// Nueva ruta para la calculadora de ahorros
// New enhanced calculator route
app.get('/calculadora', (req, res) => {
    console.log(getTimestamp() + " - " +'🧮 Enhanced calculator page accessed');
    res.render('calculatusahorros-v2', { gasPrices });
});

app.get('/calculatusahorros', (req, res) => {
    console.log(getTimestamp() + " - " +'🧮 Calculator page accessed');
    
    // Filtrar vehículos por tipo
    const electricVehicles = {};
    const hybridVehicles = {};
    
    Object.entries(vehicleSpecs).forEach(([key, vehicle]) => {
        if (vehicle.type === 'electric') {
            electricVehicles[key] = {
                name: vehicle.displayName,
                consumption: vehicle.consumption,
                range: vehicle.range,
                batteryCapacity: vehicle.batteryCapacity
            };
        } else if (vehicle.type === 'hybrid') {
            hybridVehicles[key] = {
                name: vehicle.displayName,
                electricRange: vehicle.electricRange,
                consumption: vehicle.consumption,
                fuelConsumption: vehicle.fuelConsumption,
                electricConsumption: vehicle.electricConsumption
            };
        }
    });
    
    console.log(getTimestamp() + " - " +'⚡ Electric vehicles available:', Object.keys(electricVehicles));
    console.log(getTimestamp() + " - " +'🔋 Hybrid vehicles available:', Object.keys(hybridVehicles));
    
    res.render('calculatusahorros', {
        electricVehicles,
        hybridVehicles,
        gasPrices,
        cfeRates
    });
});

// API endpoints
app.post('/api/contact', (req, res) => {
    const { name, email, phone, model, message } = req.body;
    
    // Here you would typically save to database or send email
    console.log(getTimestamp() + " - " +'Contact form submission:', { name, email, phone, model, message });
    
    res.json({ 
        success: true, 
        message: 'Gracias por tu mensaje. Te contactaremos pronto.' 
    });
});

app.post('/api/quote', (req, res) => {
    const { name, email, phone, city, contactMethod, vehicleModel } = req.body;
    
    // Here you would typically save to database or send email
    console.log(getTimestamp() + " - " +'Quote request:', { name, email, phone, city, contactMethod, vehicleModel });
    
    res.json({ 
        success: true, 
        message: 'Cotización solicitada exitosamente. Te contactaremos pronto.' 
    });
});

app.post('/api/calculate-savings', (req, res) => {
    const { 
        kmPerYear, 
        gasPrice, 
        currentConsumption, 
        electricityPrice,
        vehicleType = 'electric',
        homeConsumption = 300,
        gasType = 'magna',
        vehicleName, // Important: get the selected model
        calculationMode = 'kilometers', // New: calculation mode
        weeklySpending, // New: weekly spending in pesos
        estimatedConsumption, // New: estimated consumption for spending mode
        dailyDistance, // New: daily distance for hybrid calculations
        chargingAvailability // New: charging scenario for hybrids
    } = req.body;
    
    // Use real gas prices from Monterrey
    const realGasPrice = gasPrices[gasType] || gasPrices.magna;
    
    let annualFuelCost;
    let effectiveKmPerYear;
    let effectiveConsumption;
    
    // Hybrid-specific variables (declare here to ensure scope availability)
    let annualElectricKm = 0;
    let annualGasKm = 0;
    
    if (calculationMode === 'spending') {
        // Calculate from weekly spending
        const annualSpending = weeklySpending * 52; // 52 weeks per year
        const annualLiters = annualSpending / realGasPrice;
        effectiveConsumption = estimatedConsumption;
        effectiveKmPerYear = annualLiters * effectiveConsumption;
        annualFuelCost = annualSpending;
        
        console.log(getTimestamp() + " - " +'💰 === UNIFIED SPENDING-BASED CALCULATION ===');
        console.log(getTimestamp() + " - " +'💵 Your example logic implementation:');
        console.log(getTimestamp() + " - " +`  Example: $${weeklySpending} ÷ $${realGasPrice}/L = ${Math.round(annualLiters/52 * 100) / 100} litros semanales`);
        console.log(getTimestamp() + " - " +`  Example: ${Math.round(annualLiters/52 * 100) / 100}L × ${effectiveConsumption}km/L = ${Math.round(effectiveKmPerYear/52)} km semanales`);
        console.log(getTimestamp() + " - " +'');
        console.log(getTimestamp() + " - " +'💵 Input data:');
        console.log(getTimestamp() + " - " +'  - Weekly spending: $', weeklySpending, 'MXN');
        console.log(getTimestamp() + " - " +'  - Gas type:', gasType, '($', realGasPrice, 'MXN/L)');
        console.log(getTimestamp() + " - " +'  - Vehicle consumption:', effectiveConsumption, 'km/L');
        console.log(getTimestamp() + " - " +'');
        console.log(getTimestamp() + " - " +'🧮 Step-by-step calculation (exactly as you described):');
        console.log(getTimestamp() + " - " +'  1. Annual spending: $', weeklySpending, '× 52 weeks = $', Math.round(annualSpending), 'MXN');
        console.log(getTimestamp() + " - " +'  2. Annual liters: $', Math.round(annualSpending), '÷ $', realGasPrice, '= ', Math.round(annualLiters * 100) / 100, 'L');
        console.log(getTimestamp() + " - " +'  3. Annual kilometers: ', Math.round(annualLiters * 100) / 100, 'L ×', effectiveConsumption, 'km/L =', Math.round(effectiveKmPerYear), 'km');
        console.log(getTimestamp() + " - " +'  4. Weekly liters: ', Math.round(annualLiters * 100) / 100, 'L ÷ 52 =', Math.round(annualLiters/52 * 100) / 100, 'L/week');
        console.log(getTimestamp() + " - " +'  5. Weekly kilometers: ', Math.round(effectiveKmPerYear), 'km ÷ 52 =', Math.round(effectiveKmPerYear/52), 'km/week');
        console.log(getTimestamp() + " - " +'');
    } else {
        // Traditional calculation from kilometers
        effectiveKmPerYear = kmPerYear;
        effectiveConsumption = currentConsumption;
        annualFuelCost = (kmPerYear / currentConsumption) * realGasPrice;
        
        console.log(getTimestamp() + " - " +'🛣️ === KILOMETERS MODE CALCULATION ===');
        console.log(getTimestamp() + " - " +'📏 Input data:');
        console.log(getTimestamp() + " - " +'  - Annual kilometers:', effectiveKmPerYear, 'km');
        console.log(getTimestamp() + " - " +'  - Vehicle consumption:', effectiveConsumption, 'km/L');
        console.log(getTimestamp() + " - " +'  - Gas type:', gasType, '($', realGasPrice, 'MXN/L)');
        console.log(getTimestamp() + " - " +'');
        console.log(getTimestamp() + " - " +'🧮 Calculation:');
        console.log(getTimestamp() + " - " +'  Annual fuel cost: ', effectiveKmPerYear, 'km ÷', effectiveConsumption, 'km/L ×', realGasPrice, 'MXN/L = $', Math.round(annualFuelCost), 'MXN');
        console.log(getTimestamp() + " - " +'');
    }
    
    let annualElectricityCost = 0;
    let co2Reduction = 0;
    
    if (vehicleType === 'electric') {
        // Get the specific electric vehicle selected
        const selectedVehicle = vehicleSpecs[vehicleName];
        if (!selectedVehicle) {
            return res.status(400).json({ error: 'Vehículo no encontrado' });
        }
        
        const vehicleConsumption = selectedVehicle.consumption; // kWh/100km for each model
        const vehicleElectricityUsagePerMonth = ((effectiveKmPerYear / 12) / 100) * vehicleConsumption;
        
        console.log(getTimestamp() + " - " +'⚡ === ELECTRIC VEHICLE CALCULATION ===');
        console.log(getTimestamp() + " - " +'🔋 Vehicle specs:');
        console.log(getTimestamp() + " - " +'  - Consumption:', vehicleConsumption, 'kWh/100km');
        console.log(getTimestamp() + " - " +'  - Battery capacity:', selectedVehicle.batteryCapacity, 'kWh');
        console.log(getTimestamp() + " - " +'  - Range:', selectedVehicle.range, 'km');
        console.log(getTimestamp() + " - " +'');
        console.log(getTimestamp() + " - " +'⚡ Electricity usage calculation:');
        console.log(getTimestamp() + " - " +'  - Monthly km:', Math.round(effectiveKmPerYear / 12), 'km');
        console.log(getTimestamp() + " - " +'  - Monthly consumption:', Math.round(vehicleElectricityUsagePerMonth * 100) / 100, 'kWh');
        console.log(getTimestamp() + " - " +'  - Home consumption:', homeConsumption, 'kWh/month');
        console.log(getTimestamp() + " - " +'  - Total monthly consumption:', Math.round((homeConsumption + vehicleElectricityUsagePerMonth) * 100) / 100, 'kWh');
        
        // Calculate CFE cost with tiered rates
        const totalMonthlyConsumption = homeConsumption + vehicleElectricityUsagePerMonth;
        const costWithVehicle = calculateCFECost(totalMonthlyConsumption);
        const costWithoutVehicle = calculateCFECost(homeConsumption);
        const monthlyCostIncrease = costWithVehicle - costWithoutVehicle;
        annualElectricityCost = monthlyCostIncrease * 12;
        
        console.log(getTimestamp() + " - " +'💡 CFE cost calculation:');
        console.log(getTimestamp() + " - " +'  - Monthly cost without EV: $', Math.round(costWithoutVehicle), 'MXN');
        console.log(getTimestamp() + " - " +'  - Monthly cost with EV: $', Math.round(costWithVehicle), 'MXN');
        console.log(getTimestamp() + " - " +'  - Monthly increase: $', Math.round(monthlyCostIncrease), 'MXN');
        console.log(getTimestamp() + " - " +'  - Annual increase: $', Math.round(annualElectricityCost), 'MXN');
        console.log(getTimestamp() + " - " +'');
        
        // CO2 reduction (2.3 kg per liter)
        const annualLitersReplaced = effectiveKmPerYear / effectiveConsumption;
        co2Reduction = Math.round(annualLitersReplaced * 2.3);
        
        console.log(getTimestamp() + " - " +'🌱 Environmental impact:');
        console.log(getTimestamp() + " - " +'  - Annual liters replaced:', Math.round(annualLitersReplaced * 100) / 100, 'L');
        console.log(getTimestamp() + " - " +'  - CO2 reduction:', co2Reduction, 'kg/year');
        console.log(getTimestamp() + " - " +'');
        
    } else if (vehicleType === 'hybrid') {
        // Get the specific hybrid vehicle selected
        const selectedVehicle = vehicleSpecs[vehicleName];
        if (!selectedVehicle) {
            return res.status(400).json({ error: 'Vehículo no encontrado' });
        }
        
        const hybridFuelConsumption = selectedVehicle.fuelConsumption; // L/100km
        const hybridElectricConsumption = selectedVehicle.electricConsumption; // kWh/km
        const electricRange = selectedVehicle.electricRange;
        
        console.log(getTimestamp() + " - " +'🔋 === HYBRID VEHICLE CALCULATION ===');
        console.log(getTimestamp() + " - " +'🚗 Vehicle specs:');
        console.log(getTimestamp() + " - " +'  - Fuel consumption:', hybridFuelConsumption, 'L/100km');
        console.log(getTimestamp() + " - " +'  - Electric consumption:', hybridElectricConsumption, 'kWh/km');
        console.log(getTimestamp() + " - " +'  - Battery capacity:', selectedVehicle.batteryCapacity, 'kWh');
        console.log(getTimestamp() + " - " +'  - Electric range:', selectedVehicle.electricRange, 'km');
        console.log(getTimestamp() + " - " +'');
        
        // Calculate based on daily usage pattern
        // Variables already declared at function scope
        
        if (dailyDistance && chargingAvailability) {
            console.log(getTimestamp() + " - " +'📍 Daily usage pattern:');
            console.log(getTimestamp() + " - " +'  - Daily distance:', dailyDistance, 'km');
            console.log(getTimestamp() + " - " +'  - Charging availability:', chargingAvailability);
            
            const workDaysPerYear = 250; // Typical work days
            const weekendDaysPerYear = 115; // Weekends + holidays
            
            if (chargingAvailability === 'both') {
                // Can charge at home and work
                if (dailyDistance <= electricRange) {
                    // 100% electric usage
                    annualElectricKm = effectiveKmPerYear;
                    annualGasKm = 0;
                    console.log(getTimestamp() + " - " +'  ✅ 100% electric mode possible!');
                } else {
                    // Can do double the electric range per day (charge at work)
                    const dailyElectricKm = Math.min(dailyDistance, electricRange * 2);
                    const dailyGasKm = Math.max(0, dailyDistance - dailyElectricKm);
                    annualElectricKm = dailyElectricKm * 365;
                    annualGasKm = dailyGasKm * 365;
                    console.log(getTimestamp() + " - " +'  ⚡ Electric km/day:', dailyElectricKm);
                    console.log(getTimestamp() + " - " +'  ⛽ Gas km/day:', dailyGasKm);
                }
            } else if (chargingAvailability === 'home') {
                // Only home charging
                const dailyElectricKm = Math.min(dailyDistance, electricRange);
                const dailyGasKm = Math.max(0, dailyDistance - dailyElectricKm);
                annualElectricKm = dailyElectricKm * 365;
                annualGasKm = dailyGasKm * 365;
                console.log(getTimestamp() + " - " +'  ⚡ Electric km/day:', dailyElectricKm);
                console.log(getTimestamp() + " - " +'  ⛽ Gas km/day:', dailyGasKm);
            } else {
                // No charging - works as regular hybrid
                annualElectricKm = 0;
                annualGasKm = effectiveKmPerYear;
                console.log(getTimestamp() + " - " +'  ❌ No charging available - regular hybrid mode');
            }
            
            // Adjust if calculated km exceed actual usage
            const totalCalculatedKm = annualElectricKm + annualGasKm;
            if (totalCalculatedKm > effectiveKmPerYear) {
                const ratio = effectiveKmPerYear / totalCalculatedKm;
                annualElectricKm *= ratio;
                annualGasKm *= ratio;
            }
        } else {
            // Default calculation without usage pattern
            annualGasKm = effectiveKmPerYear;
            annualElectricKm = 0;
        }
        
        console.log(getTimestamp() + " - " +'');
        console.log(getTimestamp() + " - " +'📊 Annual breakdown:');
        console.log(getTimestamp() + " - " +'  - Electric km:', Math.round(annualElectricKm), 'km (', Math.round(annualElectricKm/effectiveKmPerYear*100), '%)');
        console.log(getTimestamp() + " - " +'  - Gasoline km:', Math.round(annualGasKm), 'km (', Math.round(annualGasKm/effectiveKmPerYear*100), '%)');
        console.log(getTimestamp() + " - " +'');
        
        // Calculate costs based on actual usage
        const hybridFuelCost = (annualGasKm / 100) * hybridFuelConsumption * realGasPrice;
        const hybridElectricUsagePerMonth = (annualElectricKm / 12) * hybridElectricConsumption;
        const totalMonthlyConsumption = homeConsumption + hybridElectricUsagePerMonth;
        const hybridElectricityCostPerMonth = calculateCFECost(totalMonthlyConsumption) - calculateCFECost(homeConsumption);
        const annualElectricCost = hybridElectricityCostPerMonth * 12;
        
        console.log(getTimestamp() + " - " +'⛽ Hybrid fuel cost calculation:');
        console.log(getTimestamp() + " - " +'  - Annual fuel liters:', Math.round((effectiveKmPerYear / 100) * hybridFuelConsumption * 100) / 100, 'L');
        console.log(getTimestamp() + " - " +'  - Annual fuel cost: $', Math.round(hybridFuelCost), 'MXN');
        console.log(getTimestamp() + " - " +'');
        console.log(getTimestamp() + " - " +'⚡ Hybrid electricity cost calculation:');
        console.log(getTimestamp() + " - " +'  - Monthly electric usage:', Math.round(hybridElectricUsagePerMonth * 100) / 100, 'kWh');
        console.log(getTimestamp() + " - " +'  - Monthly electricity increase: $', Math.round(hybridElectricityCostPerMonth), 'MXN');
        console.log(getTimestamp() + " - " +'  - Annual electricity cost: $', Math.round(annualElectricCost), 'MXN');
        console.log(getTimestamp() + " - " +'');
        
        annualElectricityCost = hybridFuelCost + annualElectricCost;
        
        console.log(getTimestamp() + " - " +'💰 Total hybrid operating cost:');
        console.log(getTimestamp() + " - " +'  - Fuel cost: $', Math.round(hybridFuelCost), 'MXN');
        console.log(getTimestamp() + " - " +'  - Electricity cost: $', Math.round(annualElectricCost), 'MXN');
        console.log(getTimestamp() + " - " +'  - Total annual cost: $', Math.round(annualElectricityCost), 'MXN');
        console.log(getTimestamp() + " - " +'');
        
        // CO2 reduction (much higher for hybrid due to lower fuel consumption)
        const originalCO2 = (effectiveKmPerYear / effectiveConsumption) * 2.3;
        const hybridCO2 = (effectiveKmPerYear / 100) * hybridFuelConsumption * 2.3;
        co2Reduction = Math.round(originalCO2 - hybridCO2);
        
        console.log(getTimestamp() + " - " +'🌱 Environmental impact comparison:');
        console.log(getTimestamp() + " - " +'  - Original vehicle CO2:', Math.round(originalCO2), 'kg/year');
        console.log(getTimestamp() + " - " +'  - Hybrid vehicle CO2:', Math.round(hybridCO2), 'kg/year');
        console.log(getTimestamp() + " - " +'  - CO2 reduction:', co2Reduction, 'kg/year');
        console.log(getTimestamp() + " - " +'');
    }
    
    // Calculate savings
    const annualSavings = Math.round(annualFuelCost - annualElectricityCost);
    const monthlySavings = Math.round(annualSavings / 12);
    const fiveYearSavings = Math.round(annualSavings * 5);
    
    // Debug logging
    console.log(getTimestamp() + " - " +'=== CALCULATION DEBUG ===');
    console.log(getTimestamp() + " - " +'📝 Request data:', { 
        vehicleName, vehicleType, calculationMode, 
        ...(calculationMode === 'spending' ? { weeklySpending, estimatedConsumption } : { kmPerYear, currentConsumption }),
        gasType, homeConsumption 
    });
    console.log(getTimestamp() + " - " +'🚗 Selected vehicle specs:', vehicleSpecs[vehicleName] ? {
        name: vehicleSpecs[vehicleName].displayName,
        type: vehicleSpecs[vehicleName].type,
        consumption: vehicleSpecs[vehicleName].consumption,
        fuelConsumption: vehicleSpecs[vehicleName].fuelConsumption,
        electricConsumption: vehicleSpecs[vehicleName].electricConsumption
    } : 'VEHICLE NOT FOUND');
    console.log(getTimestamp() + " - " +'🧮 Effective values:', { 
        effectiveKmPerYear: Math.round(effectiveKmPerYear), 
        effectiveConsumption 
    });
    console.log(getTimestamp() + " - " +'💰 === FINAL SAVINGS CALCULATION ===');
    console.log(getTimestamp() + " - " +'💸 Current costs (annual):');
    console.log(getTimestamp() + " - " +'  - Current fuel cost: $', Math.round(annualFuelCost), 'MXN');
    console.log(getTimestamp() + " - " +'  - BYD operating cost: $', Math.round(annualElectricityCost), 'MXN');
    console.log(getTimestamp() + " - " +'');
    console.log(getTimestamp() + " - " +'🎉 Savings summary:');
    console.log(getTimestamp() + " - " +'  - Annual savings: $', annualSavings, 'MXN');
    console.log(getTimestamp() + " - " +'  - Monthly savings: $', monthlySavings, 'MXN');
    console.log(getTimestamp() + " - " +'  - Weekly savings: $', Math.round(annualSavings / 52), 'MXN');
    console.log(getTimestamp() + " - " +'  - Daily savings: $', Math.round(annualSavings / 365), 'MXN');
    console.log(getTimestamp() + " - " +'  - 5-year savings: $', Math.round(annualSavings * 5), 'MXN');
    
    if (calculationMode === 'spending') {
        const weeklySavings = Math.round(annualSavings / 52);
        const currentWeeklyBydCost = Math.round(annualElectricityCost / 52);
        console.log(getTimestamp() + " - " +'');
        console.log(getTimestamp() + " - " +'📊 Weekly comparison (spending mode):');
        console.log(getTimestamp() + " - " +'  - Current weekly gas spending: $', weeklySpending, 'MXN');
        console.log(getTimestamp() + " - " +'  - BYD weekly operating cost: $', currentWeeklyBydCost, 'MXN');
        console.log(getTimestamp() + " - " +'  - Weekly savings: $', weeklySavings, 'MXN');
        console.log(getTimestamp() + " - " +'  - Savings percentage:', Math.round((weeklySavings / weeklySpending) * 100), '%');
    }
    
    console.log(getTimestamp() + " - " +'=== END CALCULATION ===');
    
    // Prepare hybrid-specific details
    let hybridDetails = null;
    if (vehicleType === 'hybrid' && dailyDistance && chargingAvailability) {
        const electricPercentage = Math.round((annualElectricKm / effectiveKmPerYear) * 100);
        const gasPercentage = 100 - electricPercentage;
        const electricKmDaily = annualElectricKm / 365;
        const gasKmDaily = annualGasKm / 365;
        
        // Calculate total efficiency (equivalent km/L considering electric usage)
        const totalAnnualCost = annualElectricityCost + (annualGasKm * vehicleSpecs[vehicleName].fuelConsumption / 100 * realGasPrice);
        const equivalentLitersPerYear = totalAnnualCost / realGasPrice;
        const totalEfficiency = effectiveKmPerYear / equivalentLitersPerYear;
        
        hybridDetails = {
            dailyDistance,
            chargingAvailability,
            electricRange: vehicleSpecs[vehicleName].electricRange,
            annualElectricKm: Math.round(annualElectricKm),
            annualGasKm: Math.round(annualGasKm),
            electricUsagePercent: electricPercentage,
            gasUsagePercent: gasPercentage,
            electricKmDaily: Math.round(electricKmDaily * 10) / 10,
            gasKmDaily: Math.round(gasKmDaily * 10) / 10,
            totalEfficiency: Math.round(totalEfficiency * 10) / 10,
            scenarioDescription: getHybridScenarioDescription(chargingAvailability, dailyDistance, vehicleSpecs[vehicleName].electricRange)
        };
    }
    
    res.json({
        annualSavings,
        monthlySavings, // Added monthly savings
        fiveYearSavings,
        co2Reduction,
        details: {
            annualFuelCost: Math.round(annualFuelCost),
            annualElectricityCost: Math.round(annualElectricityCost),
            annualGasCost: vehicleType === 'hybrid' ? Math.round(annualGasKm * vehicleSpecs[vehicleName].fuelConsumption / 100 * realGasPrice) : 0,
            vehicleElectricityCostOnly: Math.round(annualElectricityCost),
            gasPrice: realGasPrice,
            vehicleType,
            vehicleModel: vehicleName
        },
        hybridDetails
    });
});

// Helper function to get hybrid scenario description
function getHybridScenarioDescription(chargingAvailability, dailyDistance, electricRange) {
    if (chargingAvailability === 'both') {
        if (dailyDistance <= electricRange) {
            return 'Escenario óptimo: 100% modo eléctrico posible';
        } else {
            return 'Uso mixto optimizado con carga en casa y trabajo';
        }
    } else if (chargingAvailability === 'home') {
        if (dailyDistance <= electricRange) {
            return 'Buen escenario: recorrido diario completo en modo eléctrico';
        } else {
            return 'Uso mixto con carga en casa';
        }
    } else {
        return 'Modo híbrido tradicional sin carga externa';
    }
}

// Helper function to calculate CFE cost with tiered rates (returns MONTHLY cost)
function calculateCFECost(monthlyKwh) {
    let monthlyCost = 0;
    
    if (monthlyKwh <= 300) {
        // Basic rate
        monthlyCost = monthlyKwh * cfeRates.residential.basic;
    } else if (monthlyKwh <= 600) {
        // Basic + Intermediate 1
        monthlyCost = (300 * cfeRates.residential.basic) + 
                     ((monthlyKwh - 300) * cfeRates.residential.intermediate1);
    } else if (monthlyKwh <= 750) {
        // Basic + Intermediate 1 + Intermediate 2
        monthlyCost = (300 * cfeRates.residential.basic) + 
                     (300 * cfeRates.residential.intermediate1) +
                     ((monthlyKwh - 600) * cfeRates.residential.intermediate2);
    } else {
        // All tiers + Excess
        monthlyCost = (300 * cfeRates.residential.basic) + 
                     (300 * cfeRates.residential.intermediate1) +
                     (150 * cfeRates.residential.intermediate2) +
                     ((monthlyKwh - 750) * cfeRates.residential.excess);
    }
    
    // Add IVA
    return monthlyCost * (1 + cfeRates.iva);
}

// ===================================================
// CHATBOT API ENDPOINTS - SALMA AI
// ===================================================

// POST /api/chatbot - Main chatbot endpoint
app.post('/api/chatbot', async (req, res) => {
    if (!claudeService) {
        return res.status(503).json({
            success: false,
            message: 'El servicio de chat no está disponible en este momento.'
        });
    }

    try {
        const { message, conversationId, sessionId } = req.body;

        if (!message || message.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Por favor escribe un mensaje.'
            });
        }

        const sessionData = {
            ip: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            sessionId: sessionId
        };

        // Create conversation if doesn't exist
        let currentConversationId = conversationId;
        if (!currentConversationId) {
            currentConversationId = await claudeService.createConversation(sessionData);
        }

        // Process message through 5-layer system
        const response = await claudeService.sendMessage(
            currentConversationId,
            message,
            sessionData
        );

        console.log(getTimestamp() + ` - 💬 Chat [${response.source}]: "${message.substring(0, 50)}..."`);

        res.json({
            success: true,
            conversationId: currentConversationId,
            message: response.message,
            source: response.source,
            tokensUsed: response.tokensUsed || 0,
            canHandoff: response.canHandoff || false,
            processingTime: response.processingTime,
            leadCaptured: !!(response.entities && Object.keys(response.entities).length > 0),
            leadScore: response.leadScore || null
        });

    } catch (error) {
        console.error(getTimestamp() + ' - ❌ Error en chatbot:', error.message);
        res.status(500).json({
            success: false,
            message: 'Lo siento, tuve un problema técnico. ¿Podrías intentar de nuevo?',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/chatbot/stats - Statistics endpoint
app.get('/api/chatbot/stats', async (req, res) => {
    if (!claudeService) {
        return res.status(503).json({ error: 'Chatbot service not available' });
    }

    try {
        const stats = {
            abuseDetector: abuseDetector ? abuseDetector.getStats() : null,
            templateResponses: templateResponses ? templateResponses.getStats() : null,
            claudeService: claudeService.getStats()
        };

        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/chatbot/conversation/:id - Get conversation history
app.get('/api/chatbot/conversation/:id', async (req, res) => {
    if (!claudeService) {
        return res.status(503).json({ error: 'Chatbot service not available' });
    }

    try {
        const history = await claudeService.getConversationHistory(req.params.id, 50);
        res.json({
            success: true,
            conversationId: req.params.id,
            messages: history
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/chatbot/handoff - Request human handoff
app.post('/api/chatbot/handoff', async (req, res) => {
    const { conversationId, preferredContact } = req.body;

    console.log(getTimestamp() + ` - 🤝 Handoff solicitado: ${conversationId}, preferencia: ${preferredContact}`);

    // Here you would integrate with your CRM or notification system
    res.json({
        success: true,
        message: 'Un asesor te contactará pronto.',
        estimatedWaitTime: '5-10 minutos'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(getTimestamp() + " - BYD Landing Page server running on http://localhost:" + PORT);
    if (claudeService) {
        console.log(getTimestamp() + " - 🤖 Salma AI chatbot ready");
    }
});

module.exports = app;