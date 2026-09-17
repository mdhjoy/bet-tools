(() => {
  const WIDGET_ID = 'live-quick-bet-topbar';
  if (window.self !== window.top || document.getElementById(WIDGET_ID)) return;

  let isEnabled = true;
  let soundEnabled = localStorage.getItem('qbi_sound') !== 'false';
  let acceptOddsEnabled = localStorage.getItem('qbi_accept_odds') !== 'false';
  let limitEnabled = localStorage.getItem('qbi_limit_on') === 'true';
  let maxBetLimit = parseInt(localStorage.getItem('qbi_max_limit') || '10', 10);
  let heldStake = localStorage.getItem('qbi_stake_val') || '100';
  let betCount = parseInt(localStorage.getItem('qbi_bet_count') || '0', 10);
  let isExecuting = false;

  function playSuccessBeep() {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {}
  }

  // মোবাইল অপ্টিমাইজড রেসপন্সিভ সিএসএস
  const style = document.createElement('style');
  style.id = 'qbi-custom-styles';
  style.innerHTML = `
    #${WIDGET_ID} {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      background: #090d16 !important;
      color: #ffffff !important;
      border-bottom: 2px solid #38bdf8 !important;
      box-shadow: 0 4px 20px rgba(0,0,0,0.85) !important;
      z-index: 2147483647 !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      user-select: none !important;
      box-sizing: border-box !important;
      padding: 6px 10px !important;
      display: flex !important;
      flex-wrap: wrap !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 6px !important;
    }
    .qbi-group {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    .qbi-btn-preset {
      background: #1e293b;
      color: #f8fafc;
      border: 1px solid #334155;
      border-radius: 4px;
      padding: 5px 8px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      touch-action: manipulation;
    }
    .qbi-btn-preset:active {
      background: #38bdf8;
      color: #000;
    }
    .qbi-label-item {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 11px;
      cursor: pointer;
      color: #cbd5e1;
    }

    /* মোবাইল স্ক্রিন অপ্টিমাইজেশন (Max Width: 768px) */
    @media (max-width: 768px) {
      #${WIDGET_ID} {
        padding: 6px 8px !important;
        gap: 5px !important;
      }
      .qbi-row-main {
        width: 100% !important;
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
      }
      .qbi-row-sub {
        width: 100% !important;
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        border-top: 1px solid #1e293b;
        padding-top: 4px;
      }
      .qbi-btn-preset {
        padding: 4px 6px !important;
        font-size: 10px !important;
      }
      #qbi-stake-number {
        width: 58px !important;
      }
    }
  `;
  document.head.appendChild(style);

  const bar = document.createElement('div');
  bar.id = WIDGET_ID;

  bar.innerHTML = `
    <!-- লাইন ১ (মোবাইলে উপরের লাইন): লোগো, ইনপুট, প্রি-সেট ও অ্যাক্টিভ বাটন -->
    <div class="qbi-group qbi-row-main">
      <div style="display:flex; align-items:center; gap:5px;">
        <span style="font-weight:900; font-size:12px; color:#38bdf8;">⚡FAST</span>
        <input type="text" id="qbi-stake-number" value="${heldStake}" placeholder="Stake" style="width:65px; padding:4px; background:#1e293b; color:#38bdf8; border:1px solid #334155; border-radius:4px; font-size:12px; font-weight:bold; text-align:center; outline:none;" />
        <div style="display:flex; gap:3px;">
          <button class="qbi-btn-preset" data-val="100">100</button>
          <button class="qbi-btn-preset" data-val="500">500</button>
          <button class="qbi-btn-preset" data-val="1000">1K</button>
          <button class="qbi-btn-preset" data-val="5000">5K</button>
        </div>
      </div>
      <div style="display:flex; align-items:center; gap:6px;">
        <button id="qbi-status-toggle" style="padding:4px 8px; background:#16a34a; color:white; border:none; border-radius:4px; font-size:10px; font-weight:bold; cursor:pointer;">ACTIVE</button>
        <button id="qbi-close-ui" title="Close" style="background:none; border:none; color:#94a3af; font-size:15px; cursor:pointer; line-height:1;">✕</button>
      </div>
    </div>

    <!-- লাইন ২ (মোবাইলে নিচের লাইন): টগল, লিমিট এবং কাউন্টার -->
    <div class="qbi-group qbi-row-sub">
      <div style="display:flex; align-items:center; gap:8px;">
        <label class="qbi-label-item">
          <input type="checkbox" id="qbi-toggle-sound" ${soundEnabled ? 'checked' : ''}> 🔔
        </label>
        <label class="qbi-label-item">
          <input type="checkbox" id="qbi-toggle-accept" ${acceptOddsEnabled ? 'checked' : ''}> ✅ Odds
        </label>
        <label class="qbi-label-item">
          <input type="checkbox" id="qbi-toggle-limit" ${limitEnabled ? 'checked' : ''}> 🛑 Limit
        </label>
        <input type="number" id="qbi-limit-val" value="${maxBetLimit}" style="width:34px; padding:2px; background:#1e293b; color:#fff; border:1px solid #334155; border-radius:3px; font-size:10px; text-align:center;" />
      </div>
      <div id="qbi-bet-counter" title="Reset Counter" style="background:#0284c7; padding:2px 6px; border-radius:10px; font-size:10px; font-weight:bold; cursor:pointer;">
        Bets: <span id="qbi-count-num">${betCount}</span> ⟲
      </div>
    </div>
  `;

  document.documentElement.appendChild(bar);

  // রেফারেন্স ও কন্ট্রোল লজিক
  const input = bar.querySelector('#qbi-stake-number');
  const toggle = bar.querySelector('#qbi-status-toggle');
  const soundCb = bar.querySelector('#qbi-toggle-sound');
  const acceptCb = bar.querySelector('#qbi-toggle-accept');
  const limitCb = bar.querySelector('#qbi-toggle-limit');
  const limitInp = bar.querySelector('#qbi-limit-val');
  const counterNum = bar.querySelector('#qbi-count-num');
  const counterBadge = bar.querySelector('#qbi-bet-counter');

  bar.querySelectorAll('.qbi-btn-preset').forEach(btn => {
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

  bar.querySelector('#qbi-close-ui').addEventListener('click', () => {
    isEnabled = false;
    bar.remove();
  });

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

  function executeStakeAndBet() {
    if (!isEnabled || !heldStake || isExecuting) return;

    if (limitEnabled && betCount >= maxBetLimit) {
      isEnabled = false;
      const t = document.querySelector('#qbi-status-toggle');
      if (t) {
        t.innerText = 'LIMIT';
        t.style.background = '#dc2626';
      }
      return;
    }

    const allButtons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"], div[role="button"], a'));
    const placeBetBtn = allButtons.find(btn => {
      const txt = (btn.innerText || btn.value || '').trim().toLowerCase();
      return (txt.includes('place bet') || txt.includes('place bets')) && btn.offsetWidth > 0 && btn.offsetHeight > 0;
    });

    if (!placeBetBtn) return;

    const container = placeBetBtn.closest('form, tr, tbody, table, div[class*="slip"], div[class*="bet"], div[class*="market"], section') || placeBetBtn.parentElement.parentElement;

    if (acceptOddsEnabled) {
      const acceptCheckbox = container.querySelector('input[type="checkbox"]');
      if (acceptCheckbox && !acceptCheckbox.checked) {
        acceptCheckbox.click();
      }
    }

    const allInputs = Array.from(container.querySelectorAll('input[type="text"], input[type="number"], input:not([type="checkbox"]):not([type="hidden"])'));
    const targetInput = allInputs.find(inp => inp.offsetWidth > 0 && inp.offsetHeight > 0 && inp.id !== 'qbi-stake-number');

    if (targetInput && !targetInput.dataset.fastFilled) {
      isExecuting = true;
      targetInput.dataset.fastFilled = "true";

      targetInput.focus();
      setNativeInputValue(targetInput, heldStake);

      setTimeout(() => {
        if (isEnabled && !placeBetBtn.disabled) {
          placeBetBtn.click();
          betCount++;
          const cNum = document.querySelector('#qbi-count-num');
          if (cNum) cNum.innerText = betCount;
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
