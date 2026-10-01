(() => {
  const RIDER_NAMES = [
    "Marco Villareal", "Jenny Cruz", "Ramil Santos", "Aira Domingo",
    "Kevin Bautista", "Liza Manalo", "Dennis Reyes", "Shaira Torres"
  ];
  const BASE_FARE = 45;
  const PER_UNIT = 9;

  const pickupInput = document.getElementById("pickup");
  const dropoffInput = document.getElementById("dropoff");
  const fareAmountEl = document.getElementById("fare-amount");
  const routeText = document.getElementById("route-text");
  const form = document.getElementById("booking-form");
  const requestBtn = document.getElementById("request-btn");

  const matchingPanel = document.getElementById("matching-panel");
  const matchingStatus = document.getElementById("matching-status");
  const riderCard = document.getElementById("rider-card");
  const riderName = document.getElementById("rider-name");
  const riderPlate = document.getElementById("rider-plate");
  const riderEta = document.getElementById("rider-eta");
  const cancelBtn = document.getElementById("cancel-ride");

  const rideList = document.getElementById("ride-list");
  const ridersEmpty = document.getElementById("riders-empty");

  let matchTimer = null;

  // Deterministic pseudo-distance from two strings, so the same pair of
  // addresses always produces the same fare.
  function seedFromText(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
    }
    return hash;
  }

  function currentMultiplier() {
    const checked = form.querySelector('input[name="ride-type"]:checked');
    return parseFloat(checked.dataset.multiplier);
  }

  function estimateDistanceKm(pickup, dropoff) {
    if (!pickup.trim() || !dropoff.trim()) return 0;
    const seed = seedFromText(pickup.trim().toLowerCase() + "|" + dropoff.trim().toLowerCase());
    return 1.5 + (seed % 900) / 100; // 1.5km to ~10.5km
  }

  function updateFare() {
    const distance = estimateDistanceKm(pickupInput.value, dropoffInput.value);
    if (distance === 0) {
      fareAmountEl.textContent = "₱—";
      return;
    }
    const fare = Math.round((BASE_FARE + distance * PER_UNIT) * currentMultiplier());
    fareAmountEl.textContent = "₱" + fare.toLocaleString();
  }

  function updateRouteText() {
    const pickup = pickupInput.value.trim();
    const dropoff = dropoffInput.value.trim();
    if (!pickup || !dropoff) {
      routeText.textContent = "Enter a pickup and drop-off to see your route.";
      return;
    }
    const distance = estimateDistanceKm(pickup, dropoff);
    routeText.textContent = pickup + " to " + dropoff + " (about " + distance.toFixed(1) + " km)";
  }

  [pickupInput, dropoffInput].forEach((el) => {
    el.addEventListener("input", () => {
      updateFare();
      updateRouteText();
    });
  });
  form.querySelectorAll('input[name="ride-type"]').forEach((el) => {
    el.addEventListener("change", updateFare);
  });

  // ---------- ride history storage ----------
  function loadRides() {
    try {
      return JSON.parse(localStorage.getItem("hatid-rides") || "[]");
    } catch {
      return [];
    }
  }

  function saveRide(ride) {
    const rides = loadRides();
    rides.unshift(ride);
    localStorage.setItem("hatid-rides", JSON.stringify(rides.slice(0, 20)));
    renderRides();
  }

  function renderRides() {
    const rides = loadRides();
    rideList.innerHTML = "";
    if (rides.length === 0) {
      ridersEmpty.hidden = false;
      return;
    }
    ridersEmpty.hidden = true;
    rides.forEach((ride) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(ride.pickup)} to ${escapeHtml(ride.dropoff)}</td>
        <td>${escapeHtml(ride.type)}</td>
        <td>₱${ride.fare.toLocaleString()}</td>
        <td>${escapeHtml(ride.rider)}</td>
        <td>${ride.date}</td>
      `;
      rideList.appendChild(tr);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ---------- matching simulation ----------
  function startMatching(pickup, dropoff, type, fare) {
    matchingPanel.hidden = false;
    riderCard.hidden = true;
    matchingStatus.textContent = "Looking for a nearby rider...";
    requestBtn.disabled = true;
    requestBtn.textContent = "Finding a rider...";

    const seed = seedFromText(pickup + dropoff + Date.now());
    const name = RIDER_NAMES[seed % RIDER_NAMES.length];
    const plate = "MC " + (1000 + (seed % 8999));
    const etaMin = 2 + (seed % 7);

    matchTimer = setTimeout(() => {
      matchingStatus.textContent = "Rider found!";
      riderCard.hidden = false;
      riderName.textContent = name;
      riderPlate.textContent = plate;
      riderEta.textContent = etaMin + " min away";
      requestBtn.disabled = false;
      requestBtn.textContent = "Request a Ride";

      saveRide({
        pickup, dropoff, type, fare, rider: name,
        date: new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" })
      });
    }, 1500);
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const pickup = pickupInput.value.trim();
    const dropoff = dropoffInput.value.trim();
    if (!pickup || !dropoff) return;
    const type = form.querySelector('input[name="ride-type"]:checked').closest(".radio-line").textContent.split("-")[0].trim();
    const distance = estimateDistanceKm(pickup, dropoff);
    const fare = Math.round((BASE_FARE + distance * PER_UNIT) * currentMultiplier());
    startMatching(pickup, dropoff, type, fare);
  });

  cancelBtn.addEventListener("click", () => {
    clearTimeout(matchTimer);
    matchingPanel.hidden = true;
    requestBtn.disabled = false;
    requestBtn.textContent = "Request a Ride";
  });

  renderRides();
})();
