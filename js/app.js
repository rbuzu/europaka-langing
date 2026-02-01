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
  // Simulate getting user location (use mock location for demo)
  userLocation = {
    lat: 53.1325 + (Math.random() - 0.5) * 0.05,
    lng: 23.1688 + (Math.random() - 0.5) * 0.05,
  };

  // Start help vehicle from PAKA HQ
  helpVehicleLocation = { ...PAKA_HQ };

  const locationDiv = document.createElement("div");
  locationDiv.className = "location-shared";
  locationDiv.innerHTML = `
    <span class="icon">📍</span>
    <strong>Lokalizacja udostępniona</strong>
    <p style="margin-top: 8px; font-size: 0.85rem; color: #718096;">
      Białystok, okolice centrum
    </p>
  `;
  chatMessages.appendChild(locationDiv);
  scrollToBottom();

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
}

function showLiveTrackingMap() {
  const mapContainer = document.createElement("div");
  mapContainer.className = "live-map-container";
  mapContainer.id = "liveMapContainer";

  // Create map using Google Maps embed with markers
  const userLat = userLocation.lat.toFixed(4);
  const userLng = userLocation.lng.toFixed(4);

  mapContainer.innerHTML = `
    <div class="map-header">
      <span class="map-icon">🗺️</span>
      <strong>Śledzenie na żywo</strong>
    </div>
    <div class="map-wrapper" id="mapWrapper">
      <iframe
        id="trackingMapFrame"
        src="https://www.google.com/maps/embed/v1/directions?key=AIzaSyBFw0Qbyq9zTFTd-tUY6CE-sQOrGn-XXXX&origin=${PAKA_HQ.lat},${PAKA_HQ.lng}&destination=${userLat},${userLng}&mode=driving"
        width="100%"
        height="180"
        style="border:0; border-radius: 8px;"
        allowfullscreen=""
        loading="lazy">
      </iframe>
      <div class="map-fallback" id="mapFallback">
        <div class="map-visual">
          <div class="map-route">
            <div class="map-point user-point" id="userPoint">
              <span>📍</span>
              <small>Ty</small>
            </div>
            <div class="map-line" id="mapLine"></div>
            <div class="map-point vehicle-point" id="vehiclePoint">
              <span>🚚</span>
              <small>PAKA</small>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="map-info">
      <div class="eta-box">
        <span class="eta-icon">⏱️</span>
        <span id="etaText">ETA: 25 min</span>
      </div>
      <div class="distance-box">
        <span class="distance-icon">📏</span>
        <span id="distanceText">~8 km</span>
      </div>
    </div>
  `;

  chatMessages.appendChild(mapContainer);
  scrollToBottom();

  // Start simulating vehicle movement
  startVehicleSimulation();
}

function startVehicleSimulation() {
  let progress = 0;
  const totalSteps = 30;

  mapUpdateInterval = setInterval(() => {
    progress++;
    const progressPercent = (progress / totalSteps) * 100;

    // Update vehicle position visually
    const vehiclePoint = document.getElementById("vehiclePoint");
    const mapLine = document.getElementById("mapLine");
    const etaText = document.getElementById("etaText");
    const distanceText = document.getElementById("distanceText");

    if (vehiclePoint && mapLine) {
      // Move vehicle towards user
      vehiclePoint.style.left = `${progressPercent}%`;
      mapLine.style.width = `${100 - progressPercent}%`;

      // Update ETA and distance
      const remainingMinutes = Math.max(1, Math.round(25 - (progress / totalSteps) * 25));
      const remainingDistance = Math.max(0.5, (8 - (progress / totalSteps) * 8)).toFixed(1);

      if (etaText) etaText.textContent = `ETA: ${remainingMinutes} min`;
      if (distanceText) distanceText.textContent = `~${remainingDistance} km`;
    }

    // Stop when arrived
    if (progress >= totalSteps) {
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
