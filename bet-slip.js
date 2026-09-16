(() => {
  const WIDGET_ID = 'live-quick-bet-topbar';
  if (document.getElementById(WIDGET_ID)) return;

  // কনফিগারেশন ও স্টেট (Local Storage)
  let isEnabled = true;
  let soundEnabled = localStorage.getItem('qbi_sound') !== 'false';
  let acceptOddsEnabled = localStorage.getItem('qbi_accept_odds') !== 'false';
  let limitEnabled = localStorage.getItem('qbi_limit_on') === 'true';
  let maxBetLimit = parseInt(localStorage.getItem('qbi_max_limit') || '10', 10);

  let heldStake = localStorage.getItem('qbi_stake_val') || '100';
  let betCount = parseInt(localStorage.getItem('qbi_bet_count') || '0', 10);
  let isExecuting = false;

  // অডিও নোটিফিকেশন (Web Audio API - কোনো এক্সটার্নাল ফাইল ছাড়াই বিপ সাউন্ড)
  function playSuccessBeep() {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {}
  }

  // ফিক্সড টপ বার তৈরি
  const bar = document.createElement('div');
  bar.id = WIDGET_ID;
  bar.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    min-height: 42px !important;
    background: #0f172a !important;
    color: #ffffff !important;
    border-bottom: 2px solid #38bdf8 !important;
    display: flex !important;
    flex-wrap: wrap !important;
    align-items: center !important;
    justify-content: space-between !important;
    padding: 4px 12px !important;
    box-sizing: border-box !important;
    box-shadow: 0 4px 15px rgba(0,0,0,0.6) !important;
    z-index: 2147483647 !important;
    font-family: Arial, sans-serif !important;
    user-select: none !important;
    gap: 8px !important;
  `;

  bar.innerHTML = `
    <!-- সেকশন ১: লোগো ও স্টেক কন্ট্রোল -->
    <div style="display:flex; align-items:center; gap:8px;">
      <span style="font-weight:bold; font-size:12px; color:#38bdf8;">⚡ FAST BET</span>
      <input type="text" id="stake-number" value="${heldStake}" placeholder="Stake" style="width:70px; padding:3px 6px; background:#1e293b; color:#38bdf8; border:1px solid #334155; border-radius:4px; font-size:12px; font-weight:bold; text-align:center; outline:none;" />
      
      <!-- Presets (Starting with 100) -->
      <div style="display:flex; gap:3px;">
        <button class="preset-btn" data-val="100" style="background:#334155; color:#fff; border:none; border-radius:3px; padding:3px 6px; font-size:11px; cursor:pointer;">100</button>
        <button class="preset-btn" data-val="500" style="background:#334155; color:#fff; border:none; border-radius:3px; padding:3px 6px; font-size:11px; cursor:pointer;">500</button>
        <button class="preset-btn" data-val="1000" style="background:#334155; color:#fff; border:none; border-radius:3px; padding:3px 6px; font-size:11px; cursor:pointer;">1K</button>
        <button class="preset-btn" data-val="5000" style="background:#334155; color:#fff; border:none; border-radius:3px; padding:3px 6px; font-size:11px; cursor:pointer;">5K</button>
      </div>
    </div>

    <!-- সেকশন ২: ফিচার টগলসমূহ -->
    <div style="display:flex; align-items:center; gap:10px; font-size:11px;">
      <!-- Sound Toggle -->
      <label style="display:flex; align-items:center; gap:3px; cursor:pointer;">
        <input type="checkbox" id="toggle-sound" ${soundEnabled ? 'checked' : ''}> 🔔 Sound
      </label>

      <!-- Auto Accept Odds Toggle -->
      <label style="display:flex; align-items:center; gap:3px; cursor:pointer;">
        <input type="checkbox" id="toggle-accept" ${acceptOddsEnabled ? 'checked' : ''}> ✅ Auto-Odds
      </label>

      <!-- Safety Limit Toggle -->
      <label style="display:flex; align-items:center; gap:3px; cursor:pointer;">
        <input type="checkbox" id="toggle-limit" ${limitEnabled ? 'checked' : ''}> 🛑 Limit:
      </label>
      <input type="number" id="limit-val" value="${maxBetLimit}" style="width:40px; padding:2px; background:#1e293b; color:#fff; border:1px solid #334155; border-radius:3px; font-size:11px; text-align:center;" />

      <!-- Bet Counter Badge -->
      <div id="bet-counter-badge" title="Click to Reset" style="background:#0284c7; padding:2px 8px; border-radius:10px; font-weight:bold; cursor:pointer;">
        Placed: <span id="count-num">${betCount}</span> ⟲
      </div>
    </div>

    <!-- সেকশন ৩: অ্যাক্টিভেশন ও ক্লোজ -->
    <div style="display:flex; align-items:center; gap:8px;">
      <button id="status-toggle" style="padding:3px 10px; background:#16a34a; color:white; border:none; border-radius:4px; font-size:11px; font-weight:bold; cursor:pointer;">
        ACTIVE
      </button>
      <button id="close-ui" title="Close Bar" style="background:none; border:none; color:#9ca3af; font-size:16px; cursor:pointer; line-height:1;">✕</button>
    </div>
  `;

  document.documentElement.appendChild(bar);

  // এলিমেন্ট রেফারেন্স
  const input = bar.querySelector('#stake-number');
  const toggle = bar.querySelector('#status-toggle');
  const soundCb = bar.querySelector('#toggle-sound');
  const acceptCb = bar.querySelector('#toggle-accept');
  const limitCb = bar.querySelector('#toggle-limit');
  const limitInp = bar.querySelector('#limit-val');
  const counterNum = bar.querySelector('#count-num');
  const counterBadge = bar.querySelector('#bet-counter-badge');

  // ইভেন্ট লিসেনারসমূহ
  bar.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      heldStake = btn.dataset.val;
      input.value = heldStake;
      localStorage.setItem('qbi_stake_val', heldStake);
    });
  });

  input.addEventListener('input', (e) => {
    heldStake = e.target.value.trim();
    localStorage.setItem('qbi_stake_val', heldStake);
  });

  soundCb.addEventListener('change', (e) => {
    soundEnabled = e.target.checked;
    localStorage.setItem('qbi_sound', soundEnabled);
  });

  acceptCb.addEventListener('change', (e) => {
    acceptOddsEnabled = e.target.checked;
    localStorage.setItem('qbi_accept_odds', acceptOddsEnabled);
  });

  limitCb.addEventListener('change', (e) => {
    limitEnabled = e.target.checked;
    localStorage.setItem('qbi_limit_on', limitEnabled);
  });

  limitInp.addEventListener('input', (e) => {
    maxBetLimit = parseInt(e.target.value || '10', 10);
    localStorage.setItem('qbi_max_limit', maxBetLimit);
  });

  counterBadge.addEventListener('click', () => {
    betCount = 0;
    counterNum.innerText = '0';
    localStorage.setItem('qbi_bet_count', '0');
  });

  toggle.addEventListener('click', () => {
    isEnabled = !isEnabled;
    toggle.innerText = isEnabled ? 'ACTIVE' : 'PAUSED';
    toggle.style.background = isEnabled ? '#16a34a' : '#64748b';
  });

  bar.querySelector('#close-ui').addEventListener('click', () => {
    isEnabled = false;
    bar.remove();
  });

  // Native Value Setter (Framework Compatibility)
  function setNativeInputValue(element, value) {
    const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
    const prototype = Object.getPrototypeOf(element);
    const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

    if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
      prototypeValueSetter.call(element, value);
    } else if (valueSetter) {
      valueSetter.call(element, value);
    } else {
      element.value = value;
    }

    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // অটো-অ্যাকশন এক্সিকিউশন
  function executeStakeAndBet() {
    if (!isEnabled || !heldStake || isExecuting) return;

    // সেফটি লিমিট চেক
    if (limitEnabled && betCount >= maxBetLimit) {
      isEnabled = false;
      toggle.innerText = 'LIMIT REACHED';
      toggle.style.background = '#dc2626';
      return;
    }

    // দৃশ্যমান Place Bet বাটন শনাক্তকরণ
    const allButtons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"], div[role="button"], a'));
    const placeBetBtn = allButtons.find(btn => {
      const txt = (btn.innerText || btn.value || '').trim().toLowerCase();
      return (txt.includes('place bet') || txt.includes('place bets')) && btn.offsetWidth > 0 && btn.offsetHeight > 0;
    });

    if (!placeBetBtn) return;

    const container = placeBetBtn.closest('form, tr, tbody, table, div[class*="slip"], div[class*="bet"], div[class*="market"], section') || placeBetBtn.parentElement.parentElement;
    
    // Auto Accept Any Odds চেকবক্স টিক মার্ক দেওয়া
    if (acceptOddsEnabled) {
      const acceptCheckbox = container.querySelector('input[type="checkbox"]');
      if (acceptCheckbox && !acceptCheckbox.checked) {
        acceptCheckbox.click();
      }
    }

    const allInputs = Array.from(container.querySelectorAll('input[type="text"], input[type="number"], input:not([type="checkbox"]):not([type="hidden"])'));
    const targetInput = allInputs.find(inp => inp.offsetWidth > 0 && inp.offsetHeight > 0 && inp.id !== 'stake-number');

    if (targetInput && !targetInput.dataset.fastFilled) {
      isExecuting = true;
      targetInput.dataset.fastFilled = "true";

      targetInput.focus();
      setNativeInputValue(targetInput, heldStake);

      setTimeout(() => {
        if (isEnabled && !placeBetBtn.disabled) {
          placeBetBtn.click();
          
          // সফল বেট কাউন্ট বৃদ্ধি ও বিপ সাউন্ড
          betCount++;
          counterNum.innerText = betCount;
          localStorage.setItem('qbi_bet_count', betCount);
          playSuccessBeep();
        }
        setTimeout(() => {
          delete targetInput.dataset.fastFilled;
          isExecuting = false;
        }, 300);
      }, 50);
    }
  }

  // ইভেন্ট লিসেনার
  document.addEventListener('click', (e) => {
    if (e.target.closest(`#${WIDGET_ID}`)) return;
    setTimeout(executeStakeAndBet, 40);
  }, true);

  const observer = new MutationObserver(() => {
    if (!isExecuting && isEnabled) {
      executeStakeAndBet();
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
