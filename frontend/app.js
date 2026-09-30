(function () {
  "use strict";

  if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }
  window.scrollTo(0, 0);

  var MAX_BYTES = 5242880;

  var form = document.getElementById("scan-form");
  var cityInput = document.getElementById("city");
  var fileInput = document.getElementById("file-input");
  var cameraInput = document.getElementById("camera-input");
  var dropZone = document.getElementById("drop-zone");
  var dropCopy = document.getElementById("drop-copy");
  var previewWrap = document.getElementById("preview-wrap");
  var preview = document.getElementById("preview");
  var chooseFile = document.getElementById("choose-file");
  var openCamera = document.getElementById("open-camera");
  var submitBtn = document.getElementById("submit");
  var formError = document.getElementById("form-error");
  var loading = document.getElementById("loading");
  var results = document.getElementById("results");
  var itemNameEl = document.getElementById("item-name");
  var badgeEl = document.getElementById("recyclability-badge");
  var adviceEl = document.getElementById("advice");
  var labelsWrap = document.getElementById("labels-wrap");
  var labelsList = document.getElementById("labels-list");

  var selectedFile = null;
  var previewUrl = null;

  function config() {
    return window.ECOScoutConfig || {};
  }

  function showError(message) {
    formError.textContent = message;
    formError.classList.remove("hidden");
  }

  function clearError() {
    formError.textContent = "";
    formError.classList.add("hidden");
  }

  function isAllowedType(file) {
    if (!file) {
      return false;
    }
    if (file.type === "image/jpeg" || file.type === "image/png") {
      return true;
    }
    var name = (file.name || "").toLowerCase();
    return name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".png");
  }

  function mimeFor(file) {
    if (file.type === "image/png" || (file.name || "").toLowerCase().endsWith(".png")) {
      return "image/png";
    }
    return "image/jpeg";
  }

  function setFile(file) {
    if (!file) {
      return;
    }
    if (!isAllowedType(file)) {
      showError("Please choose a JPEG or PNG photo.");
      selectedFile = null;
      submitBtn.disabled = true;
      return;
    }
    if (file.size > MAX_BYTES) {
      showError("That photo is larger than 5 MB. Compress it or take a closer shot.");
      selectedFile = null;
      submitBtn.disabled = true;
      return;
    }

    clearError();
    selectedFile = file;
    submitBtn.disabled = false;

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    previewUrl = URL.createObjectURL(file);
    preview.src = previewUrl;
    previewWrap.classList.remove("hidden");
    dropCopy.classList.add("hidden");
  }

  function readFileAsBase64(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var result = String(reader.result || "");
        var comma = result.indexOf(",");
        resolve(comma === -1 ? result : result.slice(comma + 1));
      };
      reader.onerror = function () {
        reject(new Error("Could not read that file."));
      };
      reader.readAsDataURL(file);
    });
  }

  function normalizeImageForAnalysis(file) {
    return new Promise(function (resolve, reject) {
      var image = new Image();
      var objectUrl = URL.createObjectURL(file);
      var mimeType = mimeFor(file);

      image.onload = function () {
        var scale = Math.min(1, 4096 / Math.max(image.naturalWidth, image.naturalHeight));
        var canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(function (blob) {
          URL.revokeObjectURL(objectUrl);
          if (!blob) {
            reject(new Error("Could not prepare that image. Please choose another JPEG or PNG."));
            return;
          }
          resolve(new File([blob], file.name, { type: mimeType }));
        }, mimeType, mimeType === "image/jpeg" ? 0.92 : undefined);
      };

      image.onerror = function () {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Could not decode that image. Please choose another JPEG or PNG."));
      };
      image.src = objectUrl;
    });
  }

  function badgeClass(recyclability) {
    if (recyclability === "recyclable") {
      return "is-yes";
    }
    if (recyclability === "not_recyclable") {
      return "is-no";
    }
    return "is-maybe";
  }

  function badgeLabel(recyclability, isRecyclable) {
    if (
      recyclability === "recyclable" ||
      (isRecyclable &&
        recyclability !== "not_recyclable" &&
        recyclability !== "conditionally_recyclable")
    ) {
      return "✓ Recyclable";
    }
    if (recyclability === "not_recyclable") {
      return "✗ Not recyclable";
    }
    return "⚠ Check local rules";
  }

  var copyBtn = document.getElementById("copy-advice-btn");
  var activeTypewriter = null;
  var statusBanner = document.getElementById("status-banner");
  var bannerIcon = document.getElementById("banner-icon");
  var bannerText = document.getElementById("banner-text");

  function streamText(el, text) {
    if (activeTypewriter) {
      clearInterval(activeTypewriter);
    }
    el.textContent = "";
    var i = 0;
    activeTypewriter = setInterval(function () {
      if (i < text.length) {
        el.textContent += text.charAt(i);
        i++;
      } else {
        clearInterval(activeTypewriter);
        activeTypewriter = null;
      }
    }, 10);
  }

  function triggerSparkles(targetEl) {
    var rect = targetEl.getBoundingClientRect();
    for (var i = 0; i < 20; i++) {
      var sparkle = document.createElement("span");
      sparkle.className = "sparkle-particle";
      sparkle.textContent = ["✨", "🌿", "♻️", "🌱"][Math.floor(Math.random() * 4)];
      sparkle.style.left = (rect.left + rect.width / 2 + (Math.random() - 0.5) * 120) + "px";
      sparkle.style.top = (rect.top + rect.height / 2 + (Math.random() - 0.5) * 60) + "px";
      document.body.appendChild(sparkle);
      setTimeout((function (s) {
        return function () { s.remove(); };
      })(sparkle), 1200);
    }
  }

  function triggerDangerShake(targetEl) {
    targetEl.classList.add("shake-danger");
    setTimeout(function() {
      targetEl.classList.remove("shake-danger");
    }, 800);
  }

  function renderResults(data) {
    itemNameEl.textContent = data.itemName || "Unknown item";
    var labelText = badgeLabel(data.recyclability, data.isRecyclable);
    var bClass = badgeClass(data.recyclability);

    badgeEl.textContent = labelText;
    badgeEl.className = "badge " + bClass;

    // Apply danger/success class to entire results card
    var resultsCard = document.querySelector(".glass-card");
    if (resultsCard) {
      resultsCard.classList.remove("danger-card", "success-card");
      if (data.recyclability === "not_recyclable") {
        resultsCard.classList.add("danger-card");
        triggerDangerShake(badgeEl);
      } else if (data.recyclability === "recyclable" || (data.isRecyclable && data.recyclability !== "not_recyclable")) {
        resultsCard.classList.add("success-card");
        triggerSparkles(badgeEl);
      }
    }

    // Show/hide status banner with appropriate message
    if (statusBanner) {
      if (data.recyclability === "not_recyclable") {
        bannerIcon.textContent = "✗";
        bannerText.textContent = "This item should NOT go in recycling bin";
        statusBanner.className = "status-banner not-recyclable";
      } else if (data.recyclability === "recyclable" || (data.isRecyclable && data.recyclability !== "not_recyclable")) {
        bannerIcon.textContent = "✓";
        bannerText.textContent = "This item is recyclable";
        statusBanner.className = "status-banner recyclable";
      } else {
        bannerIcon.textContent = "⚠";
        bannerText.textContent = "Check local rules for this item";
        statusBanner.className = "status-banner";
      }
      statusBanner.classList.remove("hidden");
    }

    if (data.recyclability === "recyclable" || (data.isRecyclable && data.recyclability !== "not_recyclable")) {
      triggerSparkles(badgeEl);
    }

    // Typewriter text streaming for advice
    streamText(adviceEl, data.advice || "");

    // Render Vision AI Labels
    if (labelsList && data.labels && Array.isArray(data.labels) && data.labels.length > 0) {
      labelsList.innerHTML = "";
      data.labels.forEach(function (lbl) {
        var pill = document.createElement("span");
        pill.className = "label-pill";
        pill.textContent = lbl.name + " (" + Math.round(lbl.confidence || 0) + "%)";
        labelsList.appendChild(pill);
      });
      labelsWrap.classList.remove("hidden");
    } else if (labelsWrap) {
      labelsWrap.classList.add("hidden");
    }

    results.classList.remove("hidden");
    results.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      var fullText = (itemNameEl.textContent || "") + "\n" + (badgeEl.textContent || "") + "\n\n" + (adviceEl.textContent || "");
      navigator.clipboard.writeText(fullText).then(function () {
        var orig = copyBtn.textContent;
        copyBtn.textContent = "✓ Copied!";
        copyBtn.classList.add("copied");
        setTimeout(function () {
          copyBtn.textContent = orig;
          copyBtn.classList.remove("copied");
        }, 2000);
      });
    });
  }

  var scanLaser = document.getElementById("scan-laser");

  function setBusy(busy) {
    loading.classList.toggle("hidden", !busy);
    if (scanLaser) {
      scanLaser.classList.toggle("hidden", !busy);
    }
    submitBtn.disabled = busy || !selectedFile;
    chooseFile.disabled = busy;
    openCamera.disabled = busy;
    cityInput.disabled = busy;
  }

  // ── 1. Cyber-Eco Canvas Particle Background ───────────────
  (function initBgCanvas() {
    var canvas = document.getElementById("bg-canvas");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    var width, height;
    var particles = [];

    function resize() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    }
    window.addEventListener("resize", resize);
    resize();

    for (var i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 2 + 1,
        alpha: Math.random() * 0.4 + 0.15
      });
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);

      // Light beam connections between nearby particles
      for (var i = 0; i < particles.length; i++) {
        for (var j = i + 1; j < particles.length; j++) {
          var dx = particles[i].x - particles[j].x;
          var dy = particles[i].y - particles[j].y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            ctx.beginPath();
            ctx.strokeStyle = "rgba(34, 197, 94, " + (0.12 * (1 - dist / 130)) + ")";
            ctx.lineWidth = 0.8;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      particles.forEach(function (p) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(34, 197, 94, " + p.alpha + ")";
        ctx.shadowBlur = 6;
        ctx.shadowColor = "#22c55e";
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      requestAnimationFrame(draw);
    }
    draw();
  })();

  // ── Hero Card Carousel: Card Shatters to Crystals, Drizzles Down ───
  (function initCarousel() {
    var heroCard = document.querySelector(".hero-card");
    if (!heroCard) return;

    var cardData = [
      { icon: "🥫", label: "Aluminum can", status: "✓ Recyclable — rinse and remove cap", location: "Blue recycling bin" },
      { icon: "🧴", label: "Plastic bottle", status: "✓ Recyclable — rinse and cap off", location: "Clear recycling bin" },
      { icon: "🍾", label: "Glass jar", status: "✓ Recyclable — rinse thoroughly", location: "Glass recycling bin" },
      { icon: "📦", label: "Cardboard box", status: "✓ Recyclable — flatten before disposal", location: "Brown recycling bin" },
      { icon: "☕", label: "Paper coffee cup", status: "⚠ Not recyclable — plastic lining", location: "General trash bin" }
    ];

    var currentIndex = 0;
    var isAnimating = false;

    function createShatteringCrystals() {
      var rect = heroCard.getBoundingClientRect();
      var particleCount = 60; // More particles for better coverage
      var cardWidth = rect.width;
      var cardHeight = rect.height;
      var animationDuration = 2.0; // Longer duration for smooth motion

      for (var i = 0; i < particleCount; i++) {
        var particle = document.createElement("div");
        particle.className = "shatter-crystal";
        
        // Position particle within card bounds
        var randomX = Math.random() * cardWidth;
        var randomY = Math.random() * cardHeight;
        var randomDelay = Math.random() * 80; // Shorter stagger for cohesive effect
        var randomRotation = Math.random() * 360;
        var randomSize = 0.4 + Math.random() * 0.6; // 0.4 - 1.0 scale
        
        particle.style.left = (rect.left + randomX) + "px";
        particle.style.top = (rect.top + randomY) + "px";
        particle.style.setProperty("--rotation", randomRotation + "deg");
        particle.style.setProperty("--drift", (Math.random() - 0.5) * 150 + "px");
        particle.style.setProperty("--size", randomSize);
        particle.style.animation = `shatterDrizzle ${animationDuration}s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${randomDelay}ms forwards`;
        
        document.body.appendChild(particle);

        setTimeout(function(p) {
          p.remove();
        }, (animationDuration * 1000) + randomDelay, particle);
      }
    }

    function updateCardContent(index) {
      var data = cardData[index];
      var iconEl = heroCard.querySelector(".hero-card-icon");
      var labelEl = heroCard.querySelector(".hero-card-label");
      var statusEl = heroCard.querySelector(".hero-card-status");
      var locationEl = heroCard.querySelectorAll(".hero-card-status")[1];

      iconEl.textContent = data.icon;
      labelEl.textContent = data.label;
      statusEl.textContent = data.status;
      locationEl.textContent = "Drop off: " + data.location;
    }

    function advanceCard() {
      if (isAnimating) return;
      isAnimating = true;

      // Create shattering crystal overlay covering entire card
      createShatteringCrystals();

      // Shatter the card
      heroCard.classList.add("is-shattering");

      // Start content update and fade-in transition at 800ms (crystals still falling)
      setTimeout(function() {
        currentIndex = (currentIndex + 1) % cardData.length;
        updateCardContent(currentIndex);
        
        heroCard.classList.remove("is-shattering");
        heroCard.classList.add("is-entering");

        setTimeout(function() {
          heroCard.classList.remove("is-entering");
          isAnimating = false;
        }, 600); // Smooth 600ms fade-in while crystals finish falling
      }, 800); // Start transition at 800ms (crystals still have 1.2s left)
    }

    // Click handler
    heroCard.addEventListener("click", advanceCard);

    // Keyboard support
    document.addEventListener("keydown", function(e) {
      if (e.key === "ArrowRight") {
        advanceCard();
      }
    });
  })();
  document.addEventListener("mousemove", function (e) {
    document.querySelectorAll(".glass-card, .material-card, .coverage-box").forEach(function (card) {
      var rect = card.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      card.style.setProperty("--mouse-x", x + "px");
      card.style.setProperty("--mouse-y", y + "px");
    });
  });

  // ── 3. 3D Card Tilt Effect on Hover ───────────────────────
  document.querySelectorAll(".glass-card, .material-card").forEach(function (card) {
    card.addEventListener("mousemove", function (e) {
      var rect = card.getBoundingClientRect();
      var x = e.clientX - rect.left - rect.width / 2;
      var y = e.clientY - rect.top - rect.height / 2;
      var tiltX = (y / (rect.height / 2)) * -3;
      var tiltY = (x / (rect.width / 2)) * 3;
      card.style.transform = "perspective(1000px) rotateX(" + tiltX + "deg) rotateY(" + tiltY + "deg) translateY(-2px)";
    });

    card.addEventListener("mouseleave", function () {
      card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)";
    });
  });

  // Material Guide Filter Bar Listener
  document.querySelectorAll(".filter-tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      document.querySelectorAll(".filter-tab").forEach(function (t) { t.classList.remove("active"); });
      tab.classList.add("active");

      var filter = tab.getAttribute("data-filter");
      document.querySelectorAll(".material-card").forEach(function (card) {
        if (filter === "all" || card.getAttribute("data-cat") === filter) {
          card.style.display = "block";
          card.style.opacity = "1";
        } else {
          card.style.display = "none";
          card.style.opacity = "0";
        }
      });
    });
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    clearError();
    results.classList.add("hidden");

    var cfg = config();
    if (!cfg.apiUrl || cfg.apiUrl.indexOf("REPLACE") !== -1) {
      showError(
        "Frontend is not configured. Copy config.example.js to config.js and paste the API URL from sam deploy."
      );
      return;
    }

    var city = cityInput.value.trim();

    if (!/^[A-Za-z][A-Za-z\s.'-]{0,79}$/.test(city)) {
      showError("Enter a valid city name.");
      return;
    }
    if (!selectedFile) {
      showError("Add a JPEG or PNG photo first.");
      return;
    }

    setBusy(true);

    normalizeImageForAnalysis(selectedFile)
      .then(function (normalizedFile) {
        return readFileAsBase64(normalizedFile).then(function (imageBase64) {
          return fetch(cfg.apiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": cfg.apiKey,
            },
            body: JSON.stringify({
              imageBase64: imageBase64,
              mimeType: mimeFor(normalizedFile),
              city: city,
            }),
          });
        });
      })
      .then(function (response) {
        return response.text().then(function (text) {
          var payload = {};
          if (text) {
            try {
              payload = JSON.parse(text);
            } catch {
              payload = { error: text };
            }
          }
          if (!response.ok) {
            var message = payload.error || "Upload failed (" + response.status + ").";
            if (response.status === 429) {
              message = "Daily request limit reached. Try again tomorrow.";
            }
            throw new Error(message);
          }
          return payload;
        });
      })
      .then(renderResults)
      .catch(function (err) {
        showError(err.message || "Something went wrong. Check your connection and try again.");
      })
      .finally(function () {
        setBusy(false);
      });
  });

  chooseFile.addEventListener("click", function () {
    fileInput.click();
  });

  openCamera.addEventListener("click", function () {
    cameraInput.click();
  });

  fileInput.addEventListener("change", function () {
    if (fileInput.files[0]) {
      setFile(fileInput.files[0]);
    }
  });

  cameraInput.addEventListener("change", function () {
    if (cameraInput.files[0]) {
      setFile(cameraInput.files[0]);
    }
  });

  dropZone.addEventListener("click", function (event) {
    if (event.target.closest("button")) {
      return;
    }
    fileInput.click();
  });

  dropZone.addEventListener("keydown", function (event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      fileInput.click();
    }
  });

  ["dragenter", "dragover"].forEach(function (type) {
    dropZone.addEventListener(type, function (event) {
      event.preventDefault();
      dropZone.classList.add("is-drag");
    });
  });

  ["dragleave", "drop"].forEach(function (type) {
    dropZone.addEventListener(type, function (event) {
      event.preventDefault();
      dropZone.classList.remove("is-drag");
    });
  });

  dropZone.addEventListener("drop", function (event) {
    var file = event.dataTransfer && event.dataTransfer.files[0];
    setFile(file);
  });
})();
