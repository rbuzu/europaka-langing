/**
 * PAKA Landing Page - JavaScript
 * Chatbot widget with hardcoded conversation flow + Live Map
 */

// ===================================
// DOM Elements
// ===================================
const chatToggle = document.getElementById("chatToggle");
const chatWindow = document.getElementById("chatWindow");
const chatClose = document.getElementById("chatClose");
const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");
const openChatBtn = document.getElementById("openChat");

// ===================================
// Chatbot State
// ===================================
let chatStep = 0;
let userLocation = null;
let helpVehicleLocation = null;
let mapUpdateInterval = null;

// PAKA HQ Location (Trawiasta 30, Białystok)
const PAKA_HQ = { lat: 53.15625, lng: 23.20702 };

// ===================================
// Conversation Flow
// ===================================
const conversationFlow = {
  0: {
    bot: "Cześć! 👋 Jestem asystentem PAKA. Jak mogę Ci pomóc?",
    options: [
      { id: "car_broken", text: "🚗 Mój samochód nie jedzie", next: 1 },
      { id: "appointment", text: "📞 Chcę umówić wizytę", next: "appointment" },
      { id: "other", text: "❓ Mam inne pytanie", next: "other" },
    ],
  },
  1: {
    bot: "Rozumiem, że potrzebujesz pomocy drogowej. Czy możesz opisać problem?",
    options: [
      { id: "no_start", text: "🔑 Samochód nie odpala", next: 2 },
      { id: "flat_tire", text: "🛞 Mam przebitą oponę", next: 2 },
      { id: "breakdown", text: "⚠️ Samochód się zepsuł w trasie", next: 2 },
      { id: "tow_needed", text: "🚛 Potrzebuję holowania", next: 2 },
    ],
  },
  2: {
    bot: "Dziękuję za informację. Abyśmy mogli przyjechać, potrzebujemy Twojej lokalizacji. 📍",
    options: [
      { id: "share_location", text: "📍 Udostępnij lokalizację", next: 3, action: "location" },
    ],
  },
  3: {
    bot: "Świetnie! Otrzymaliśmy Twoją lokalizację. 🚚 Nasz mechanik jest w drodze!\n\n⏱️ Szacowany czas przyjazdu: **20-30 minut**\n\nCzy chcesz opłacić usługę teraz i otrzymać 10% zniżki?",
    options: [
      { id: "pay_now", text: "💳 Zapłać teraz (-10%)", next: 4, action: "payment" },
      { id: "pay_later", text: "💵 Zapłacę na miejscu", next: 5 },
    ],
  },
  4: {
    // Payment step - handled separately
  },
  5: {
    bot: "Świetnie! ✅\n\n**Podsumowanie:**\n• Pomoc drogowa w drodze\n• Czas przyjazdu: 20-30 min\n• Płatność: na miejscu\n\nNasz kierowca zadzwoni do Ciebie przed przyjazdem.\n\n📞 W razie pytań: **+48 535 500 583**",
    options: [{ id: "thanks", text: "Dziękuję! 👍", next: "end" }],
  },
  appointment: {
    bot: "Świetnie! Aby umówić wizytę w naszym serwisie, zadzwoń pod numer:\n\n📞 **+48 535 500 583**\n\nLub odwiedź nas:\n📍 Trawiasta 30, 15-161 Białystok\n\n🕐 Pon-Pt: 7:00 - 17:00",
    options: [
      { id: "call", text: "📞 Zadzwoń teraz", next: "call" },
      { id: "back", text: "Wróć do menu", next: 0 },
    ],
  },
  other: {
    bot: "Rozumiem! W przypadku innych pytań, najlepiej skontaktuj się z nami bezpośrednio:\n\n📞 **+48 535 500 583**\n📧 kontakt@paka-serwis.pl\n\nOdpowiadamy szybko! 😊",
    options: [
      { id: "call2", text: "📞 Zadzwoń teraz", next: "call" },
      { id: "back2", text: "Wróć do menu", next: 0 },
    ],
  },
  end: {
    bot: "Dziękujemy za skorzystanie z pomocy PAKA! 🚗✨\n\nŻyczymy bezpiecznej podróży!",
    options: [{ id: "restart", text: "Nowa rozmowa", next: 0 }],
  },
};

// ===================================
// Chat Functions
// ===================================

function openChat() {
  chatWindow.classList.add("active");
  chatToggle.style.display = "none";
  if (chatMessages.children.length === 0) {
    startConversation();
  }
}

function closeChat() {
  chatWindow.classList.remove("active");
  chatToggle.style.display = "flex";
  // Clear map interval if active
  if (mapUpdateInterval) {
    clearInterval(mapUpdateInterval);
    mapUpdateInterval = null;
  }
}

function startConversation() {
  chatStep = 0;
  chatMessages.innerHTML = "";
  userLocation = null;
  helpVehicleLocation = null;
  showBotMessage(conversationFlow[0].bot);
  setTimeout(() => {
    showOptions(conversationFlow[0].options);
  }, 500);
}

function showBotMessage(text) {
  const messageDiv = document.createElement("div");
  messageDiv.className = "chat-message bot";
  messageDiv.innerHTML = formatMessage(text);
  chatMessages.appendChild(messageDiv);
  scrollToBottom();
}

function showUserMessage(text) {
  const messageDiv = document.createElement("div");
  messageDiv.className = "chat-message user";
  messageDiv.textContent = text;
  chatMessages.appendChild(messageDiv);
  scrollToBottom();
}

function formatMessage(text) {
  // Convert **text** to bold
  return text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
}

function showOptions(options) {
  chatInput.innerHTML = "";
  const optionsDiv = document.createElement("div");
  optionsDiv.className = "chat-options";

  options.forEach((option) => {
    const btn = document.createElement("button");
    btn.className = "chat-option-btn";
    btn.setAttribute("data-option-id", option.id);
    if (option.action === "payment" || option.action === "location") {
      btn.className += " accent";
    }
    btn.textContent = option.text;
    btn.onclick = () => handleOptionClick(option, btn);
    optionsDiv.appendChild(btn);
  });

  chatInput.appendChild(optionsDiv);
}

function handleOptionClick(option, clickedBtn) {
  // Disable all buttons and highlight the clicked one
  const allBtns = chatInput.querySelectorAll(".chat-option-btn");
  allBtns.forEach((btn) => {
    btn.disabled = true;
    btn.style.opacity = "0.5";
    btn.style.pointerEvents = "none";
  });
  clickedBtn.style.opacity = "1";
  clickedBtn.style.background = "var(--color-success)";
  clickedBtn.style.color = "white";

  // Show user's selected message
  showUserMessage(option.text);

  // Clear options after short delay
  setTimeout(() => {
    chatInput.innerHTML = '<div style="text-align: center; color: #718096; font-size: 0.9rem;">...</div>';
  }, 300);

  // Handle special actions
  if (option.action === "location") {
    setTimeout(() => {
      showLocationShared();
    }, 800);
    return;
  }

  if (option.action === "payment") {
    setTimeout(() => {
      showPaymentForm();
    }, 800);
    return;
  }

  if (option.next === "call") {
    window.location.href = "tel:+48535500583";
    return;
  }

  // Move to next step
  const nextStep = conversationFlow[option.next];
  if (nextStep) {
    setTimeout(() => {
      showBotMessage(nextStep.bot);
      setTimeout(() => {
        showOptions(nextStep.options);
      }, 500);
    }, 1000);
    chatStep = option.next;
  }
}

function showLocationShared() {
  // Show loading state
  const loadingDiv = document.createElement("div");
  loadingDiv.className = "location-shared";
  loadingDiv.innerHTML = `
    <span class="icon">📍</span>
    <strong>Pobieranie lokalizacji...</strong>
    <p style="margin-top: 8px; font-size: 0.85rem; color: #718096;">
      Proszę zaakceptować uprawnienia lokalizacji
    </p>
  `;
  chatMessages.appendChild(loadingDiv);
  scrollToBottom();

  // Request real location from browser
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Success - got real location
        userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        // Update loading message to success
        loadingDiv.innerHTML = `
          <span class="icon">📍</span>
          <strong>Lokalizacja udostępniona!</strong>
          <p style="margin-top: 8px; font-size: 0.85rem; color: #718096;">
            Współrzędne: ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}
          </p>
        `;

        // Start help vehicle from PAKA HQ
        helpVehicleLocation = { ...PAKA_HQ };

        // Move to next step with map
        const nextStep = conversationFlow[3];
        setTimeout(() => {
          showBotMessage(nextStep.bot);

          // Show live tracking map
          setTimeout(() => {
            showLiveTrackingMap();
          }, 500);

          setTimeout(() => {
            showOptions(nextStep.options);
          }, 800);
        }, 1000);
        chatStep = 3;
      },
      (error) => {
        // Error or denied - use fallback location (Białystok center)
        console.log("Geolocation error:", error.message);
        userLocation = {
          lat: 53.1325,
          lng: 23.1688,
        };

        loadingDiv.innerHTML = `
          <span class="icon">📍</span>
          <strong>Lokalizacja ustawiona</strong>
          <p style="margin-top: 8px; font-size: 0.85rem; color: #718096;">
            Używamy przybliżonej lokalizacji (Białystok)
          </p>
        `;

        helpVehicleLocation = { ...PAKA_HQ };

        const nextStep = conversationFlow[3];
        setTimeout(() => {
          showBotMessage(nextStep.bot);
          setTimeout(() => {
            showLiveTrackingMap();
          }, 500);
          setTimeout(() => {
            showOptions(nextStep.options);
          }, 800);
        }, 1000);
        chatStep = 3;
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  } else {
    // Browser doesn't support geolocation
    userLocation = { lat: 53.1325, lng: 23.1688 };
    helpVehicleLocation = { ...PAKA_HQ };

    loadingDiv.innerHTML = `
      <span class="icon">📍</span>
      <strong>Lokalizacja ustawiona</strong>
      <p style="margin-top: 8px; font-size: 0.85rem; color: #718096;">
        Używamy przybliżonej lokalizacji
      </p>
    `;

    const nextStep = conversationFlow[3];
    setTimeout(() => {
      showBotMessage(nextStep.bot);
      setTimeout(() => {
        showLiveTrackingMap();
      }, 500);
      setTimeout(() => {
        showOptions(nextStep.options);
      }, 800);
    }, 1000);
    chatStep = 3;
  }
}

// Store map and markers globally for updates
let trackingMap = null;
let vehicleMarker = null;
let routeLine = null;

function showLiveTrackingMap() {
  const mapContainer = document.createElement("div");
  mapContainer.className = "live-map-container";
  mapContainer.id = "liveMapContainer";

  mapContainer.innerHTML = `
    <div class="map-header">
      <span class="map-icon">🗺️</span>
      <strong>Śledzenie na żywo</strong>
    </div>
    <div class="map-wrapper">
      <div id="leafletMap" style="height: 200px; border-radius: 8px;"></div>
    </div>
    <div class="map-info">
      <div class="eta-box">
        <span class="eta-icon">⏱️</span>
        <span id="etaText">ETA: obliczanie...</span>
      </div>
      <div class="distance-box">
        <span class="distance-icon">📏</span>
        <span id="distanceText">Dystans: obliczanie...</span>
      </div>
    </div>
  `;

  chatMessages.appendChild(mapContainer);
  scrollToBottom();

  // Initialize Leaflet map after DOM is ready
  setTimeout(() => {
    initLeafletMap();
  }, 100);
}

function initLeafletMap() {
  // Calculate center point between user and PAKA
  const centerLat = (userLocation.lat + PAKA_HQ.lat) / 2;
  const centerLng = (userLocation.lng + PAKA_HQ.lng) / 2;

  // Create map
  trackingMap = L.map("leafletMap").setView([centerLat, centerLng], 13);

  // Add OpenStreetMap tiles
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap",
  }).addTo(trackingMap);

  // Custom icons
  const userIcon = L.divIcon({
    className: "custom-marker user-marker",
    html: '<div style="background: #e53e3e; color: white; padding: 8px; border-radius: 50%; font-size: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">📍</div>',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });

  const vehicleIcon = L.divIcon({
    className: "custom-marker vehicle-marker",
    html: '<div style="background: #1a365d; color: white; padding: 8px; border-radius: 50%; font-size: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">🚚</div>',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });

  // Add user marker
  L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
    .addTo(trackingMap)
    .bindPopup("📍 Twoja lokalizacja");

  // Add vehicle marker (will be animated)
  vehicleMarker = L.marker([PAKA_HQ.lat, PAKA_HQ.lng], { icon: vehicleIcon })
    .addTo(trackingMap)
    .bindPopup("🚚 Pomoc PAKA");

  // Fetch route from OSRM and draw it
  fetchRouteFromOSRM();
}

// Store route points for animation
let routePoints = [];
let routeDistance = 0;
let routeDuration = 0;

async function fetchRouteFromOSRM() {
  const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${PAKA_HQ.lng},${PAKA_HQ.lat};${userLocation.lng},${userLocation.lat}?overview=full&geometries=geojson`;

  try {
    const response = await fetch(osrmUrl);
    const data = await response.json();

    if (data.code === "Ok" && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      
      // Get route geometry (array of [lng, lat] coordinates)
      const coordinates = route.geometry.coordinates;
      
      // Convert to Leaflet format [lat, lng]
      routePoints = coordinates.map(coord => [coord[1], coord[0]]);
      
      // Get distance (in meters) and duration (in seconds)
      routeDistance = route.distance / 1000; // Convert to km
      routeDuration = Math.round(route.duration / 60); // Convert to minutes

      // Draw the route on the map
      routeLine = L.polyline(routePoints, {
        color: "#d4a039",
        weight: 5,
        opacity: 0.8,
      }).addTo(trackingMap);

      // Fit map to route bounds
      trackingMap.fitBounds(routeLine.getBounds(), { padding: [30, 30] });

      // Update distance and ETA display
      document.getElementById("distanceText").textContent = `~${routeDistance.toFixed(1)} km`;
      document.getElementById("etaText").textContent = `ETA: ${routeDuration} min`;

      // Start vehicle animation along the route
      startVehicleSimulation();
    } else {
      // Fallback to straight line if OSRM fails
      console.log("OSRM routing failed, using straight line");
      fallbackToStraightLine();
    }
  } catch (error) {
    console.error("Error fetching route:", error);
    fallbackToStraightLine();
  }
}

function fallbackToStraightLine() {
  // Draw straight line as fallback
  routePoints = [
    [PAKA_HQ.lat, PAKA_HQ.lng],
    [userLocation.lat, userLocation.lng],
  ];
  
  routeLine = L.polyline(routePoints, {
    color: "#d4a039",
    weight: 4,
    dashArray: "10, 10",
  }).addTo(trackingMap);

  const bounds = L.latLngBounds(
    [userLocation.lat, userLocation.lng],
    [PAKA_HQ.lat, PAKA_HQ.lng]
  );
  trackingMap.fitBounds(bounds, { padding: [30, 30] });

  routeDistance = calculateDistance(PAKA_HQ.lat, PAKA_HQ.lng, userLocation.lat, userLocation.lng);
  routeDuration = Math.round(routeDistance * 3);

  document.getElementById("distanceText").textContent = `~${routeDistance.toFixed(1)} km`;
  document.getElementById("etaText").textContent = `ETA: ${routeDuration} min`;

  startVehicleSimulation();
}

function calculateDistance(lat1, lng1, lat2, lng2) {
  // Haversine formula
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function startVehicleSimulation() {
  if (routePoints.length < 2) return;

  let currentPointIndex = 0;
  const totalPoints = routePoints.length;
  
  // Calculate how many points to skip per interval for smooth animation
  // We want the animation to complete in about 60 seconds (30 intervals of 2 seconds)
  const pointsPerStep = Math.max(1, Math.floor(totalPoints / 30));

  mapUpdateInterval = setInterval(() => {
    currentPointIndex += pointsPerStep;

    if (currentPointIndex >= totalPoints) {
      currentPointIndex = totalPoints - 1;
    }

    const currentPos = routePoints[currentPointIndex];

    // Update vehicle marker position
    if (vehicleMarker) {
      vehicleMarker.setLatLng(currentPos);
    }

    // Update route line to show remaining path
    if (routeLine && currentPointIndex < totalPoints) {
      const remainingRoute = routePoints.slice(currentPointIndex);
      routeLine.setLatLngs(remainingRoute);
    }

    // Calculate progress percentage
    const progress = currentPointIndex / totalPoints;
    
    // Update ETA and distance
    const remainingDistance = routeDistance * (1 - progress);
    const remainingEta = Math.max(1, Math.round(routeDuration * (1 - progress)));

    const etaText = document.getElementById("etaText");
    const distanceText = document.getElementById("distanceText");

    if (etaText) etaText.textContent = `ETA: ${remainingEta} min`;
    if (distanceText) distanceText.textContent = `~${remainingDistance.toFixed(1)} km`;

    // Stop when arrived
    if (currentPointIndex >= totalPoints - 1) {
      clearInterval(mapUpdateInterval);
      mapUpdateInterval = null;
      if (etaText) etaText.textContent = "Już prawie!";
      if (distanceText) distanceText.textContent = "< 500m";
    }
  }, 2000);
}

function showPaymentForm() {
  chatInput.innerHTML = "";

  const formDiv = document.createElement("div");
  formDiv.className = "payment-form";
  formDiv.innerHTML = `
    <h4>💳 Płatność za usługę</h4>
    <div class="payment-amount">180 PLN <s style="font-size: 0.9rem; color: #718096;">200 PLN</s></div>
    <input type="text" class="payment-input" placeholder="Numer karty" value="4242 4242 4242 4242">
    <div style="display: flex; gap: 8px;">
      <input type="text" class="payment-input" placeholder="MM/RR" value="12/28" style="flex: 1;">
      <input type="text" class="payment-input" placeholder="CVC" value="123" style="flex: 1;">
    </div>
    <button class="chat-option-btn accent" style="width: 100%; margin-top: 8px;" id="payBtn">
      Zapłać 180 PLN
    </button>
  `;

  chatInput.appendChild(formDiv);

  document.getElementById("payBtn").onclick = () => {
    processPayment();
  };
}

function processPayment() {
  chatInput.innerHTML = '<div style="text-align: center; padding: 20px;">Przetwarzanie płatności...</div>';

  setTimeout(() => {
    const successDiv = document.createElement("div");
    successDiv.className = "success-message";
    successDiv.innerHTML = `
      <span class="icon">✅</span>
      <h4>Płatność zakończona!</h4>
      <p>Otrzymasz potwierdzenie SMS</p>
    `;
    chatMessages.appendChild(successDiv);
    scrollToBottom();

    // Show final message
    setTimeout(() => {
      showBotMessage(
        "Dziękujemy za płatność! ✅\n\n**Podsumowanie:**\n• Pomoc drogowa w drodze\n• Czas przyjazdu: 20-30 min\n• Płatność: opłacona (180 PLN)\n\n📞 W razie pytań: **+48 535 500 583**"
      );
      setTimeout(() => {
        showOptions([{ id: "final_thanks", text: "Dziękuję! 👍", next: "end" }]);
      }, 500);
    }, 1000);
  }, 1500);
}

function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ===================================
// Mobile Menu
// ===================================
const mobileMenuBtn = document.querySelector(".mobile-menu-btn");
const nav = document.querySelector(".nav");

if (mobileMenuBtn) {
  mobileMenuBtn.addEventListener("click", () => {
    nav.classList.toggle("active");
  });
}

// ===================================
// Smooth Scroll for Navigation
// ===================================
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute("href"));
    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  });
});

// ===================================
// Header Scroll Effect
// ===================================
let lastScrollTop = 0;
const header = document.querySelector(".header");

window.addEventListener("scroll", () => {
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

  if (scrollTop > 100) {
    header.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.1)";
  } else {
    header.style.boxShadow = "0 1px 2px rgba(0, 0, 0, 0.05)";
  }

  lastScrollTop = scrollTop;
});

// ===================================
// Event Listeners
// ===================================
chatToggle.addEventListener("click", openChat);
chatClose.addEventListener("click", closeChat);
openChatBtn.addEventListener("click", openChat);

// Close chat on escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && chatWindow.classList.contains("active")) {
    closeChat();
  }
});

// ===================================
// Initialize
// ===================================
console.log("PAKA Landing Page loaded successfully! 🚗");
