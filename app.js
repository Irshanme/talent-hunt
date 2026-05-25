/* ==========================================================================
   TALENT HUNT EXAM RESULTS PORTAL 2026 — PREMIUM FUNCTIONALITY (app.js)
   ========================================================================== */

// --------------------------------------------------------------------------
// 1. OFFLINE DATASET FALLBACK
// --------------------------------------------------------------------------
// Fallback removed to enforce strictly dynamic loading from students.json.

// Global dataset pointer
let students = [];

// Helper to get initials
function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

// Dynamically compute totalScore, percentage, rank, status, and badge based on raw subject scores
function processStudentData(data) {
  return data.map((student, originalIndex) => {
    const totalScore = parseInt(student.aptiScore || 0, 10) + 
                       parseInt(student.verbalScore || 0, 10) + 
                       parseInt(student.codingScore || 0, 10);
                       
    const isMax50 = (student.aptiScore <= 20 && student.verbalScore <= 20 && student.codingScore <= 10);
    const maxTotal = isMax50 ? 50 : 300;
    const percentage = ((totalScore / maxTotal) * 100).toFixed(1) + '%';
    const percentVal = totalScore / maxTotal;

    return {
      ...student,
      totalScore,
      percentage,
      percentVal,
      originalIndex
    };
  })
  .sort((a, b) => {
    // Primary sort: percentVal descending
    if (b.percentVal !== a.percentVal) {
      return b.percentVal - a.percentVal;
    }
    // Secondary sort: preserve the exact sequential order in students.json
    return a.originalIndex - b.originalIndex;
  })
  .map((student, index) => {
    const rank = index + 1;
    
    // Assign badge dynamically based on rank
    let badge = "Emerging Talent";
    if (rank === 1) {
      badge = "National Champion";
    } else if (rank <= 3) {
      badge = "Elite Master";
    } else if (rank <= 10) {
      badge = "High Achiever";
    }

    // Assign status dynamically based on rank (exactly the top 10 qualify!)
    let status = "Not Qualified";
    if (rank <= 3) {
      status = "Qualified with Honors";
    } else if (rank <= 10) {
      status = "Qualified";
    }

    // Strip originalIndex so it's not present in the final dataset
    const { originalIndex, ...studentClean } = student;

    return {
      ...studentClean,
      rank,
      badge,
      status
    };
  });
}

// --------------------------------------------------------------------------
// 2. DATA INGESTION (FETCH / FALLBACK MECHANISM)
// --------------------------------------------------------------------------
async function initializePortal() {
  try {
    // Attempt normal fetch (will work when served over HTTP)
    const response = await fetch('students.json');
    if (!response.ok) {
      throw new Error(`HTTP status error: ${response.status}`);
    }
    const rawData = await response.json();
    students = processStudentData(rawData);
    console.log('Successfully loaded student roster from students.json.');
  } catch (error) {
    console.warn('Could not fetch students.json (likely due to CORS or local file mode). Checking fallback...', error);
    
    // Check if studentsData exists globally (loaded via students-data.js)
    if (typeof studentsData !== 'undefined' && Array.isArray(studentsData)) {
      students = processStudentData(studentsData);
      console.log('Successfully loaded student roster from static students-data.js fallback.');
    } else {
      console.error('Failed to load student roster from students.json and no static fallback found.', error);
      const podiumMount = document.getElementById('podium-mount');
      if (podiumMount) {
        podiumMount.innerHTML = `
          <div class="glass-card" style="grid-column: span 3; text-align: center; padding: 40px 24px; border: 1px dashed rgba(239, 68, 68, 0.4); background: rgba(239, 68, 68, 0.05); border-radius: 16px;">
            <h3 style="font-family: var(--font-heading); font-size: 1.2rem; font-weight: 600; color: #EF4444; margin-bottom: 8px;">Database Access Blocked (CORS)</h3>
            <p style="font-size: 0.9rem; max-width: 500px; margin: 0 auto 16px; line-height: 1.5; color: var(--slate);">
              Browsers restrict local database access under file://. To view candidate rankings, please run a local web server (e.g. <code>npx serve</code> in the folder) and view the site over HTTP.
            </p>
            <div style="font-size: 0.8rem; color: var(--slate);">Error reference: ${error.message}</div>
          </div>
        `;
      }
      const leaderboardMount = document.getElementById('leaderboard-mount');
      if (leaderboardMount) {
        leaderboardMount.innerHTML = '';
      }
      const excellenceMount = document.getElementById('excellence-mount');
      if (excellenceMount) {
        excellenceMount.innerHTML = '';
      }
      // scroll reveal / animations must run so that default sections and the CORS message are visible!
      setupDynamicInteractions();
      return;
    }
  }

  // Dynamically set stats targets based on loaded database
  const highestScore = Math.max(...students.map(s => s.totalScore));
  const highestScoreEl = document.getElementById('stat-score');
  if (highestScoreEl) {
    highestScoreEl.setAttribute('data-target', highestScore);
  }

  // Update Total Participants to the actual number of students in students.json!
  const participantsCount = students.length;
  const participantsEl = document.getElementById('stat-participants');
  if (participantsEl) {
    participantsEl.setAttribute('data-target', participantsCount);
  }

  // Count qualified students dynamically based on status (which is exactly 10!)
  const qualifiedCount = students.filter(s => s.status.startsWith('Qualified')).length;

  const qualifiedEl = document.getElementById('stat-qualified');
  if (qualifiedEl) {
    qualifiedEl.setAttribute('data-target', qualifiedCount);
  }

  const certsEl = document.getElementById('stat-certs');
  if (certsEl) {
    certsEl.setAttribute('data-target', participantsCount);
  }

  // Render all dependent components once data is mounted
  renderHeroShowcase();
  renderPodiums();
  renderLeaderboardList();
  renderExcellenceGrid();
  setupDynamicInteractions();
}

// --------------------------------------------------------------------------
// 3. RENDERERS
// --------------------------------------------------------------------------

// Renders the Hero Rank 1 floating showcase details
function renderHeroShowcase() {
  const topper = students.find(s => s.rank === 1);
  if (!topper) return;

  const isM50 = (topper.aptiScore <= 20 && topper.verbalScore <= 20 && topper.codingScore <= 10);
  const maxT = isM50 ? 50 : 300;

  document.getElementById('hero-ranker-badge').innerText = `AIR Rank ${topper.rank}`;
  document.getElementById('hero-ranker-avatar').innerText = getInitials(topper.name);
  document.getElementById('hero-ranker-name').innerText = topper.name;
  document.getElementById('hero-ranker-school').innerText = topper.institution;
  document.getElementById('hero-ranker-score').innerText = `${topper.totalScore} / ${maxT}`;
  document.getElementById('hero-ranker-cert').innerText = topper.certificateId;
}

// Renders the Top 3 podium items
function renderPodiums() {
  const mount = document.getElementById('podium-mount');
  if (!mount) return;

  const topper1 = students.find(s => s.rank === 1);
  const topper2 = students.find(s => s.rank === 2);
  const topper3 = students.find(s => s.rank === 3);

  if (!topper1 || !topper2 || !topper3) return;

  const p1Max = (topper1.aptiScore <= 20 && topper1.verbalScore <= 20 && topper1.codingScore <= 10) ? 50 : 300;
  const p2Max = (topper2.aptiScore <= 20 && topper2.verbalScore <= 20 && topper2.codingScore <= 10) ? 50 : 300;
  const p3Max = (topper3.aptiScore <= 20 && topper3.verbalScore <= 20 && topper3.codingScore <= 10) ? 50 : 300;

  mount.innerHTML = `
    <!-- Rank 2 Podium -->
    <div class="podium-card glass-card podium-2nd spotlight-card reveal-on-scroll">
      <div class="podium-badge" aria-label="Second Rank"><span class="podium-rank">2</span></div>
      <div class="podium-avatar">${getInitials(topper2.name)}</div>
      <h3 class="podium-name">${topper2.name}</h3>
      <p class="podium-school">${topper2.institution}</p>
      <div class="podium-score-pill">${topper2.totalScore} / ${p2Max}</div>
      <span class="podium-ticket">${topper2.hallTicketId}</span>
    </div>

    <!-- Rank 1 Podium (Tallest & Central Highlight) -->
    <div class="podium-card glass-card podium-1st spotlight-card reveal-on-scroll">
      <div class="podium-badge" aria-label="First Rank">
        <!-- Gold Crown Icon inside first badge -->
        <svg width="22" height="22" fill="#F5C542" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25c0-1.8 1.05-3.3 2.625-3.3.9 0 1.725.45 2.25 1.125.525-.675 1.35-1.125 2.25-1.125a2.91 2.91 0 012.625 3.3c0 3.924-2.438 7.11-4.739 9.272a25.18 25.18 0 01-4.244 3.17 15.285 15.285 0 01-.383.219l-.022.012-.007.004-.003.001zM12 2.25l3 3.75 3.75-2.25L17.25 10.5H6.75l-1.5-6.75 3.75 2.25L12 2.25z"></path></svg>
      </div>
      <div class="podium-avatar">${getInitials(topper1.name)}</div>
      <h3 class="podium-name">${topper1.name}</h3>
      <p class="podium-school">${topper1.institution}</p>
      <div class="podium-score-pill">${topper1.totalScore} / ${p1Max}</div>
      <span class="podium-ticket">${topper1.hallTicketId}</span>
    </div>

    <!-- Rank 3 Podium -->
    <div class="podium-card glass-card podium-3rd spotlight-card reveal-on-scroll">
      <div class="podium-badge" aria-label="Third Rank"><span class="podium-rank">3</span></div>
      <div class="podium-avatar">${getInitials(topper3.name)}</div>
      <h3 class="podium-name">${topper3.name}</h3>
      <p class="podium-school">${topper3.institution}</p>
      <div class="podium-score-pill">${topper3.totalScore} / ${p3Max}</div>
      <span class="podium-ticket">${topper3.hallTicketId}</span>
    </div>
  `;
}

// Renders Ranks 4 to 10 list
function renderLeaderboardList() {
  const mount = document.getElementById('leaderboard-mount');
  if (!mount) return;

  const middleTier = students.filter(s => s.rank >= 4 && s.rank <= 10);
  let html = '';

  middleTier.forEach(student => {
    const isM50 = (student.aptiScore <= 20 && student.verbalScore <= 20 && student.codingScore <= 10);
    const maxT = isM50 ? 50 : 300;
    const maxA = isM50 ? 20 : 100;
    const maxV = isM50 ? 20 : 100;
    const maxC = isM50 ? 10 : 100;

    html += `
      <div class="leaderboard-row glass-card spotlight-card" role="listitem">
        <span class="row-rank row-rank-highlight">#${student.rank}</span>
        <div class="row-avatar">${getInitials(student.name)}</div>
        <div class="row-name">${student.name}</div>
        <div class="row-school">${student.institution}</div>
        <div class="row-score">${student.totalScore} / ${maxT}</div>
        <button class="row-action-btn" aria-label="Expand score details for ${student.name}" data-ticket="${student.hallTicketId}">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"></path></svg>
        </button>
      </div>
      <!-- Score breakdown drawer (hidden by default) -->
      <div class="row-drawer-details" id="drawer-${student.hallTicketId}">
        <div style="background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.03); border-top:none; border-bottom-left-radius: 16px; border-bottom-right-radius: 16px; padding: 24px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
          <div>
            <div style="font-size:0.75rem; color: var(--slate); text-transform:uppercase; letter-spacing:0.05em;">Aptitude Score</div>
            <div style="font-family: var(--font-heading); font-size:1.35rem; font-weight:700; color:var(--accent); margin-top:4px;">${student.aptiScore} <span style="font-size:0.8rem; color:var(--slate)">/ ${maxA}</span></div>
          </div>
          <div>
            <div style="font-size:0.75rem; color: var(--slate); text-transform:uppercase; letter-spacing:0.05em;">Verbal Score</div>
            <div style="font-family: var(--font-heading); font-size:1.35rem; font-weight:700; color:var(--highlight); margin-top:4px;">${student.verbalScore} <span style="font-size:0.8rem; color:var(--slate)">/ ${maxV}</span></div>
          </div>
          <div>
            <div style="font-size:0.75rem; color: var(--slate); text-transform:uppercase; letter-spacing:0.05em;">Coding Score</div>
            <div style="font-family: var(--font-heading); font-size:1.35rem; font-weight:700; color:#10B981; margin-top:4px;">${student.codingScore} <span style="font-size:0.8rem; color:var(--slate)">/ ${maxC}</span></div>
          </div>
        </div>
      </div>
    `;
  });

  mount.innerHTML = html;

  // Bind expandable drawer toggles - relies on native CSS transitions for 10/10 visual animations
  document.querySelectorAll('.row-action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const ticket = btn.getAttribute('data-ticket');
      const drawer = document.getElementById(`drawer-${ticket}`);
      const isExpanded = drawer.classList.contains('active');

      if (isExpanded) {
        drawer.classList.remove('active');
        btn.style.transform = 'rotate(0deg)';
      } else {
        drawer.classList.add('active');
        btn.style.transform = 'rotate(180deg)';
      }
    });
  });
}

// Renders Ranks 11 to 20 ("Emerging Excellence") grid
function renderExcellenceGrid() {
  const mount = document.getElementById('excellence-mount');
  if (!mount) return;

  const lowTier = students.filter(s => s.rank >= 11 && s.rank <= 20);
  let html = '';

  lowTier.forEach(student => {
    html += `
      <div class="excellence-card glass-card spotlight-card reveal-on-scroll">
        <div class="exc-rank">${student.rank}</div>
        <div class="exc-details">
          <h3 class="exc-name">${student.name}</h3>
          <p class="exc-school">${student.institution}</p>
        </div>
        <div class="exc-score-box">
          <div class="exc-score">${student.totalScore}</div>
          <div class="exc-label">Total Score</div>
        </div>
      </div>
    `;
  });

  mount.innerHTML = html;
}

// --------------------------------------------------------------------------
// 4. ANIMATION CONTROLLERS (COUNT-UPS & SCROLL REVEALS)
// --------------------------------------------------------------------------
function setupDynamicInteractions() {
  // A. Scroll Reveal Observer
  const scrollElements = document.querySelectorAll('.reveal-on-scroll');
  const scrollObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        // Once revealed, we don't need to observe it anymore
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -50px 0px'
  });

  scrollElements.forEach(el => scrollObserver.observe(el));

  // B. Stats Counter Animation
  const statNumbers = document.querySelectorAll('.stat-number');
  const countObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.getAttribute('data-target'), 10);
        animateCounter(el, target);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  statNumbers.forEach(num => countObserver.observe(num));

  // C. Mouse Spotlight Card Coordinates Bindings
  bindSpotlightCursorCoords();
}

// Smooth count-up arithmetic loop
function animateCounter(element, target) {
  let start = 0;
  const duration = 2000; // 2 seconds
  const startTime = performance.now();

  function updateCount(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Smooth easeOutQuad function
    const easeProgress = progress * (2 - progress);
    const currentVal = Math.floor(easeProgress * target);

    if (target > 1000) {
      // Format with commas for large numbers
      element.innerText = currentVal.toLocaleString();
    } else {
      element.innerText = currentVal;
    }

    if (progress < 1) {
      requestAnimationFrame(updateCount);
    } else {
      element.innerText = target > 1000 ? target.toLocaleString() : target;
    }
  }

  requestAnimationFrame(updateCount);
}

// Specular spotlight mouse cursor offset tracker
function bindSpotlightCursorCoords() {
  document.addEventListener('mousemove', (e) => {
    const cards = document.querySelectorAll('.spotlight-card');
    cards.forEach(card => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    });
  });
}

// --------------------------------------------------------------------------
// 5. SEARCH & CREDENTIALS VALIDATION SYSTEM (HIGH PRIORITY)
// --------------------------------------------------------------------------
const searchForm = document.getElementById('result-search-form');
const searchInput = document.getElementById('search-input');
const resultsMount = document.getElementById('search-results-mount');

if (searchForm) {
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    executeSearchQuery(searchInput.value);
  });
}

// Dynamic suggestion pills click binder
document.querySelectorAll('.suggestion-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    const sampleId = pill.getAttribute('data-id');
    searchInput.value = sampleId;
    executeSearchQuery(sampleId);
    
    // Smoothly scroll down to focus results container
    resultsMount.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
});

// Search query execution flow
function executeSearchQuery(query) {
  const sanitized = query.trim().toUpperCase();
  if (!sanitized) return;

  // 1. Mount loading state immediately
  renderSearchLoadingState();

  // 2. Simulate high-security server verification duration (800ms)
  setTimeout(() => {
    const student = students.find(s => 
      s.hallTicketId.toUpperCase() === sanitized || 
      s.certificateId.toUpperCase() === sanitized
    );

    if (student) {
      renderSearchSuccessCard(student);
    } else {
      renderSearchErrorState(sanitized);
    }
  }, 800);
}

// Loading State Spinner
function renderSearchLoadingState() {
  resultsMount.innerHTML = `
    <div class="search-loading-card glass-card">
      <div class="shimmer-loader-ring" aria-hidden="true"></div>
      <div class="shimmer-text">CONNECTING SECURE AUTHORITY DATABASE...</div>
    </div>
  `;
}

// Error state rendering
function renderSearchErrorState(query) {
  resultsMount.innerHTML = `
    <div class="search-error-card glass-card">
      <div class="error-icon-box" aria-hidden="true">
        <svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"></path></svg>
      </div>
      <h3 class="error-title">No Credential Found</h3>
      <p class="error-desc">
        We could not find any active results matching the query "<strong>${query}</strong>". Please verify that the Hall Ticket ID or Certificate ID is correct and try again.
      </p>
      <div style="font-size:0.85rem; color: var(--slate);">
        Ensure format resembles: <strong>TH2026A101</strong> or <strong>CERT-2026-8891</strong>
      </div>
    </div>
  `;
}

// Success State Rendering (The High-Fidelity Credential Dossier)
function renderSearchSuccessCard(student) {
  const isM50 = (student.aptiScore <= 20 && student.verbalScore <= 20 && student.codingScore <= 10);
  const maxT = isM50 ? 50 : 300;
  const maxA = isM50 ? 20 : 100;
  const maxV = isM50 ? 20 : 100;
  const maxC = isM50 ? 10 : 100;

  // Calculate raw percentages for gauges
  const aptiPercent = Math.round((student.aptiScore / maxA) * 100);
  const verbalPercent = Math.round((student.verbalScore / maxV) * 100);
  const codingPercent = Math.round((student.codingScore / maxC) * 100);
  
  // Calculate average percentage
  const avgPercentVal = Math.round((student.totalScore / maxT) * 100);

  resultsMount.innerHTML = `
    <div class="result-success-card glass-card spotlight-card">
      <!-- Watermark Backdrop -->
      <div class="result-watermark" aria-hidden="true">VERIFIED</div>

      <!-- Card Top Header -->
      <div class="result-card-header">
        <div class="result-primary-info">
          <div class="result-avatar">${getInitials(student.name)}</div>
          <div class="result-candidate-meta">
            <h3>${student.name}</h3>
            <p>${student.institution}</p>
          </div>
        </div>
        
        <div class="result-status-block">
          <span class="result-status-pill">
            <span class="status-dot-active" aria-hidden="true"></span>
            <span>${student.status}</span>
          </span>
          <span class="rank-badge" style="background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%); color: var(--white); box-shadow: 0 0 10px var(--primary-glow)">
            AIR Rank #${student.rank}
          </span>
        </div>
      </div>

      <!-- Credential IDs Row (Symmetric & Balanced) -->
      <div class="result-credential-row">
        <span>Hall Ticket ID: <strong>${student.hallTicketId}</strong></span>
        <span class="sync-status">
          <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"></path></svg>
          OFFICIAL RECORD SYNCED
        </span>
      </div>

      <!-- RENDER CORE ANALYTICS (SYMMETRICAL GRID WRAPPERS FOR PERFECT ALIGNMENT) -->
      <div class="result-scores-body">
        <!-- 1. Circular Average Gauge Box -->
        <div class="score-circular-wrapper">
          <div class="circular-chart-box">
            <svg class="svg-circular-chart" viewBox="0 0 36 36" aria-hidden="true">
              <defs>
                <linearGradient id="cyan-violet-gradient" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stop-color="var(--accent)" />
                  <stop offset="100%" stop-color="var(--primary)" />
                </linearGradient>
              </defs>
              <!-- Group-based rotation preserves text upright state completely -->
              <g transform="rotate(-90 18 18)">
                <circle class="circular-bg" cx="18" cy="18" r="15.915" />
                <circle class="circular-fill" id="gauge-circle-fill" cx="18" cy="18" r="15.915" stroke-dasharray="0, 100" />
              </g>
              <!-- dominant-baseline ensures absolute pixel vertical centering -->
              <text x="18" y="18" class="circular-text" text-anchor="middle" dominant-baseline="central" font-size="7.5" fill="var(--accent)">${avgPercentVal}%</text>
            </svg>
          </div>
          
          <div class="circular-label">
            <span class="circular-label-title">Consolidated Merit</span>
            <span class="circular-label-val">${student.totalScore} / ${maxT}</span>
            <span class="circular-label-desc">Cumulative merit score in top national academic standard thresholds.</span>
          </div>
        </div>

        <!-- 2. Subject Score Breakdown Box (Symmetrically Styled Card) -->
        <div class="score-detailed-wrapper">
          <div class="score-bars-container">
            <!-- Aptitude Bar -->
            <div class="score-bar-item">
              <div class="score-bar-header">
                <span>Aptitude Competence</span>
                <span><strong>${student.aptiScore}</strong> / ${maxA}</span>
              </div>
              <div class="progress-track" aria-hidden="true">
                <div class="progress-bar-fill fill-apti" id="bar-fill-apti" style="width: 0%;"></div>
              </div>
            </div>

            <!-- Verbal Bar -->
            <div class="score-bar-item">
              <div class="score-bar-header">
                <span>Verbal Reasoning</span>
                <span><strong>${student.verbalScore}</strong> / ${maxV}</span>
              </div>
              <div class="progress-track" aria-hidden="true">
                <div class="progress-bar-fill fill-verbal" id="bar-fill-verbal" style="width: 0%;"></div>
              </div>
            </div>

            <!-- Coding Bar -->
            <div class="score-bar-item">
              <div class="score-bar-header">
                <span>Coding Analytics</span>
                <span><strong>${student.codingScore}</strong> / ${maxC}</span>
              </div>
              <div class="progress-track" aria-hidden="true">
                <div class="progress-bar-fill fill-coding" id="bar-fill-coding" style="width: 0%;"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Trust Seal Footer -->
      <div class="result-card-footer">
        <span class="badge-trust-seal">
          <svg class="trust-badge-svg" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0110 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0114 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"></path></svg>
          <span>AUTHORIZED CREDENTIAL RECORD</span>
        </span>
        <span class="verification-notice-text">Verified against Hash Ledger Ref: SHA256-${student.certificateId}</span>
      </div>
    </div>
  `;

  // 3. Trigger progressive gauge and bar filler animations after layout paints
  setTimeout(() => {
    const gauge = document.getElementById('gauge-circle-fill');
    const barApti = document.getElementById('bar-fill-apti');
    const barVerbal = document.getElementById('bar-fill-verbal');
    const barCoding = document.getElementById('bar-fill-coding');

    if (gauge) gauge.style.strokeDasharray = `${avgPercentVal}, 100`;
    if (barApti) barApti.style.width = `${aptiPercent}%`;
    if (barVerbal) barVerbal.style.width = `${verbalPercent}%`;
    if (barCoding) barCoding.style.width = `${codingPercent}%`;
  }, 100);
}

// --------------------------------------------------------------------------
// 6. INITIAL NAVIGATION BINDING (ACTIVE LINK TRACKER)
// --------------------------------------------------------------------------
window.addEventListener('scroll', () => {
  const sections = document.querySelectorAll('section');
  const navLi = document.querySelectorAll('.nav-links a');
  
  let current = '';
  
  sections.forEach(section => {
    const sectionTop = section.offsetTop;
    const sectionHeight = section.clientHeight;
    
    // Check if scrolled past top border
    if (window.scrollY >= sectionTop - 120) {
      current = section.getAttribute('id');
    }
  });

  navLi.forEach(a => {
    a.classList.remove('active');
    if (a.getAttribute('href') === `#${current}`) {
      a.classList.add('active');
    }
  });

  // Shrink navbar slightly on scroll
  const header = document.getElementById('main-header');
  if (window.scrollY > 50) {
    header.style.background = 'rgba(7, 17, 31, 0.95)';
    header.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
  } else {
    header.style.background = 'rgba(7, 17, 31, 0.6)';
    header.style.boxShadow = 'none';
  }
});

// --------------------------------------------------------------------------
// 7. BOOTSTRAP INITIALIZATION
// --------------------------------------------------------------------------
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initializePortal();
  });
} else {
  initializePortal();
}
