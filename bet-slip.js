(() => {
  const WIDGET_ID = 'live-quick-bet-holder';
  if (document.getElementById(WIDGET_ID)) return;

  let isEnabled = true;
  let heldStake = localStorage.getItem('qbi_stake_val') || '1000';
  let isExecuting = false;

  // ১. UI প্যানেল
  const box = document.createElement('div');
  box.id = WIDGET_ID;
  box.style.cssText = `
    position: fixed !important;
    top: 15px !important;
    right: 15px !important;
    width: 170px !important;
    background: #0f172a !important;
    color: #ffffff !important;
    border: 2px solid #38bdf8 !important;
    border-radius: 8px !important;
    padding: 8px !important;
    box-shadow: 0 10px 25px rgba(0,0,0,0.7) !important;
    z-index: 2147483647 !important;
    font-family: Arial, sans-serif !important;
    user-select: none !important;
  `;

  box.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
      <span id="drag-bar" style="cursor:move; font-weight:bold; font-size:11px; color:#38bdf8;">⚡ Fast Stake</span>
      <button id="close-ui" style="background:none; border:none; color:#94a3af; font-size:13px; cursor:pointer;">✕</button>
    </div>
    <input type="text" id="stake-number" value="${heldStake}" placeholder="Stake..." style="width:100%; box-sizing:border-box; padding:5px; background:#1e293b; color:#38bdf8; border:1px solid #334155; border-radius:4px; font-size:13px; font-weight:bold; text-align:center; margin-bottom:5px; outline:none;" />
    <button id="status-toggle" style="width:100%; padding:5px; background:#16a34a; color:white; border:none; border-radius:4px; font-size:10px; font-weight:bold; cursor:pointer;">
      ACTIVE
    </button>
  `;

  document.documentElement.appendChild(box);

  const input = box.querySelector('#stake-number');
  const toggle = box.querySelector('#status-toggle');

  input.addEventListener('input', (e) => {
    heldStake = e.target.value.trim();
    localStorage.setItem('qbi_stake_val', heldStake);
  });

  toggle.addEventListener('click', () => {
    isEnabled = !isEnabled;
    toggle.innerText = isEnabled ? 'ACTIVE' : 'PAUSED';
    toggle.style.background = isEnabled ? '#16a34a' : '#64748b';
  });

  box.querySelector('#close-ui').addEventListener('click', () => {
    isEnabled = false;
    box.remove();
  });

  // Dragging
  const dragBar = box.querySelector('#drag-bar');
  let isDragging = false, startX, startY, initLeft, initTop;

  const onStart = (e) => {
    isDragging = true;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    startX = clientX;
    startY = clientY;
    const rect = box.getBoundingClientRect();
    initLeft = rect.left;
    initTop = rect.top;
  };

  const onMove = (e) => {
    if (!isDragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    box.style.left = `${initLeft + (clientX - startX)}px`;
    box.style.top = `${initTop + (clientY - startY)}px`;
    box.style.right = 'auto';
  };

  const onEnd = () => { isDragging = false; };

  dragBar.addEventListener('mousedown', onStart);
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onEnd);
  dragBar.addEventListener('touchstart', onStart, { passive: true });
  document.addEventListener('touchmove', onMove, { passive: true });
  document.addEventListener('touchend', onEnd);

  // ২. Fast Form Filler
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

    const allButtons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"], div[role="button"], a'));
    const placeBetBtn = allButtons.find(btn => {
      const txt = (btn.innerText || btn.value || '').trim().toLowerCase();
      return (txt.includes('place bet') || txt.includes('place bets')) && btn.offsetWidth > 0 && btn.offsetHeight > 0;
    });

    if (!placeBetBtn) return;

    const container = placeBetBtn.closest('form, tr, tbody, table, div[class*="slip"], div[class*="bet"], div[class*="market"], section') || placeBetBtn.parentElement.parentElement;
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
