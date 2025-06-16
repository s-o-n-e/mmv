export function createSystimePanel(container, options = {}) {
    //const ChildPanels = options.ChildPanels || [];
    const ChildPanels = [];
    const panel = document.createElement("div");
    panel.className = "systime-panel";
    panel.style.width = options.width || "90%";
    container.appendChild(panel);

    // 状態
    let TstartCal = 0.0;
    let TlenVal = 10.0;
    let currOffset = 0;

    // DOM
    panel.innerHTML = `
    <div class="systime-title" style="font-size:1.1em;font-weight:bold;">SYSTIME パネル</div>
    <div class="systime-cal-row" style="display:flex;align-items:baseline;gap:1.2em;margin-bottom:0.3em;">
      <span id="systime-cal-line" style="font-size:1.3em;min-width:7.5em;text-align:left;margin-right:1.4em;">-</span>
      <span id="systime-currt-offset" style="font-size:1.3em;min-width:6em;text-align:right;">-</span>
    </div>
    <div id="systime-bar-bg" style="position:relative;width:100%;height:4em;">
      <input type="range" id="systime-slider" min="0" max="10000" value="0" step="1"
        style="position:absolute;top:0;left:0px;width:100%;height:100%;background:transparent;z-index:3;">
      <canvas id="systime-bar-canvas" 
	style="position:absolute;left:0;top:0em;width:100%;height:100%;"></canvas>
    </div>
    <div style="display:flex;gap:0.7em;justify-content:center;margin-top:0.7em;">
      <button class="stbtn setzero">set-0</button>
      <button class="stbtn" data-delta="-1.0">-1s</button>
      <button class="stbtn" data-delta="-0.1">-100ms</button>
      <button class="stbtn" data-delta="-0.01">-10ms</button>
      <button class="stbtn" data-delta="-0.001">-1ms</button>
      <button class="stbtn" data-delta="0.001">+1ms</button>
      <button class="stbtn" data-delta="0.01">+10ms</button>
      <button class="stbtn" data-delta="0.1">+100ms</button>
      <button class="stbtn" data-delta="1.0">+1s</button>
      <button class="stbtn setTend">setTend</button>
    </div>
  `;

    // -- Canvas --
    const systimeBarBg = panel.querySelector('#systime-bar-bg');
    const canvas = panel.querySelector('#systime-bar-canvas');
    canvas.width = systimeBarBg.offsetWidth;   // Actual canvas pixels.
    canvas.height = 150;                       // Use defaul value.
    console.log('[systime-bar-canvas] width=',canvas.width,' height=',canvas.height,']');
    const systimeSlider = panel.querySelector('#systime-slider');
    const systimeSliderMax = parseFloat(systimeSlider.max);
    console.log("[systime-slider] width=",systimeSlider.offsetWidth, " height=",systimeSlider.offsetHeight, "max=",systimeSliderMax);

    // -- Slider ---
    const knobRadius = 5;
    const barWidth = systimeBarBg.offsetWidth;
    const sliderMoveblWidth = barWidth + knobRadius * 2;
    console.log("sliderMoveblWidth = ",sliderMoveblWidth);
    systimeSlider.style.left  = -knobRadius + 'px';
    systimeSlider.style.width = sliderMoveblWidth + 'px';

    const systimeCalLine = panel.querySelector('#systime-cal-line');
    const systimeCurrtOff = panel.querySelector('#systime-currt-offset');
    
    const setZeroBtn = panel.querySelector('.setzero');
    const stbtns = panel.querySelectorAll('.stbtn[data-delta]');
    const setTendBtn = panel.querySelector('.setTend');

    function calcLabelStep(Tlen, targetLabels = 25) {
	const bases = [1, 2, 2.5, 5, 10];

	// tstep = Tlen / targetLabels
	let tstep = Tlen / targetLabels;
	if (tstep <= 0) return { major: 1, minor: 0.2 };

	// 10進スケールへ正規化
	let order = Math.floor(Math.log10(tstep));
	let tstep_frac = tstep / Math.pow(10, order);

	// 最も近い系列値を選ぶ
	let tstep_base = bases.reduce((prev, curr) =>
	    Math.abs(curr - tstep_frac) < Math.abs(prev - tstep_frac) ? curr : prev
	);

	// major/minor確定
	let major = tstep_base * Math.pow(10, order);
	let minor = major / 5;

	return { major, minor };
    }

    // SYSTIMEバー描画関数
    function getBarX(t,W) {
	if (TlenVal <= 0) return;
	const pxPerSec = (W - knobRadius) / TlenVal;
	const x = knobRadius + t * pxPerSec;
	return x;
    }
    
    function renderSystimeBar() {
	const W = canvas.width;
	const H = canvas.height;
	//console.log("[renderSystimeBar] W:",W," H:",H," canvas:",canvas.width,canvas.height);
	const ctx = canvas.getContext('2d');
	ctx.clearRect(0, 0, W, H);

	//--- Canvas 赤枠 for debug -----
	//ctx.strokeStyle = "#F00";
	//ctx.lineWidth = 4;
	//ctx.beginPath();
	//ctx.moveTo(0,0); ctx.lineTo(W,0);ctx.lineTo(W,H);ctx.lineTo(0,H); ctx.lineTo(0,0);
	//ctx.stroke();
	//------------------------------

	const baseline = H * 0.55;
	ctx.strokeStyle = "#555";
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(0, baseline);
	ctx.lineTo(W, baseline);
	ctx.stroke();

	if (TlenVal <= 0) return;

	// 短い目盛 (minor)
	const {major:labelStep,minor:tickStep}  = calcLabelStep(TlenVal);
	//console.log("Tlen:",TlenVal, "labelStep:",labelStep, "tickStep:",tickStep);

	for (let t = 0; t <= TlenVal; t += tickStep) {
	    const x = getBarX(t,W);
	    ctx.strokeStyle = "#444";
	    ctx.lineWidth = ((t % labelStep) < 1e-6) ? 1.5 : 1.0;
	    ctx.beginPath();
	    ctx.moveTo(x, baseline);
	    ctx.lineTo(x, baseline + (t % labelStep < 1e-6 ? 20 : 10));
	    ctx.stroke();
	}
	// ラベル
	ctx.font = "14px sans-serif";
	ctx.fillStyle = "#111";
	ctx.textAlign = "center";
	for (let t = 0; t <= TlenVal; t += labelStep) {
	    const x = getBarX(t,W);
	    ctx.fillText(t.toFixed(labelStep < 1 ? 2 : (labelStep < 10 ? 1 : 0)), x, baseline + 40);
	}
	// ノブの位置
	const knobX = getBarX(currOffset,W);
	//console.log("[knobX = ",knobX,"]");
	ctx.save();
	ctx.fillStyle = "#c33";
	ctx.beginPath();
	ctx.arc(knobX, baseline, knobRadius, 0, Math.PI * 2);
	ctx.fill();
	ctx.restore();

	// 赤線（現在位置）
	ctx.strokeStyle = "#c33";
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(knobX, baseline - baseline + 5);
	ctx.lineTo(knobX, baseline + 10);
	ctx.stroke();
    }


    function updateSystimeDisplay() {
	const co = Math.max(0, Math.min(currOffset, TlenVal));
	systimeCurrtOff.textContent = co.toFixed(3) + " s";
	// カレンダータイム
	if (TstartCal !== null) {
	    const ms = TstartCal  + co ;
	    const d = new Date(ms);
	    const y = d.getFullYear();
	    const mo = ('0' + (d.getMonth() + 1)).slice(-2);
	    const da = ('0' + d.getDate()).slice(-2);
	    const h = ('0' + d.getHours()).slice(-2);
	    const mi = ('0' + d.getMinutes()).slice(-2);
	    const s = ('0' + d.getSeconds()).slice(-2);
	    const msec = '.' + ('00' + d.getMilliseconds()).slice(-3);
	    systimeCalLine.textContent = `${y}/${mo}/${da} ${h}:${mi}:${s}${msec}`;
	} else {
	    systimeCalLine.textContent = "-";
	}
	systimeSlider.value = co * systimeSliderMax / TlenVal;;
	//console.log("co = ",co, "systimeSlider.value  = ",systimeSlider.value);
	renderSystimeBar();
    }

    function setCurrT(newCurrT, srcPanel = null) {
	if (Math.abs(currOffset - newCurrT) < 1e-5) return;

	//console.log("SYSTIME:  setCurrT=",newCurrT, " panel=",panel);
	currOffset = newCurrT;
	updateSystimeDisplay();
	// srcPanel以外の全ChildPanelへcurrTを通知
	for (const p of ChildPanels) {
	    if (p !== srcPanel && p.setCurrTFromSystime) {
		p.setCurrTFromSystime(currOffset);
	    }
	}
	if (onCurrTChange) onCurrTChange(currOffset, srcPanel);
    }

    function setValidRange(newTstartCal,  newTlen = null, srcPanel = null) {
	console.log("SYSTIME.setValidRange(newTstartCal:",newTstartCal,",newTlen:",newTlen);
	TstartCal = newTstartCal;
	TlenVal = newTlen
	updateSystimeDisplay();
	// srcPanel以外の全ChildPanelへ有効区間を通知
	for (const p of ChildPanels) {
	    if (p !== srcPanel && p.setValidRangeFromSystime) {
		p.setValidRangeFromSystime(TstartCal, TlenVal);
	    }
	}
	if (onValidRangeChange) onValidRangeChange(TstartCal,  TlenVal, srcPanel);
    }

    function setTstartCal(val) {
	TstartCal = val;
	updateSystimeDisplay();
    }

    function setPanelWidth(w) { panel.style.width = w; }
    function setChildPanels(newPanels) {
	ChildPanels.length = 0;
	for (const p of newPanels) ChildPanels.push(p);
    }

    // スライダー操作
    systimeSlider.oninput = function () {
	let newCurrT  = parseFloat(this.value)/systimeSliderMax * TlenVal;
	//console.log("[SYSTIME.systimeSlider] currT=",newCurrT, "TlenVal=",TlenVal);
	setCurrT(newCurrT);
    };
    setZeroBtn.onclick = () => setCurrT(0);
    setTendBtn.onclick = () => setCurrT(TlenVal);

    stbtns.forEach(btn => {
	btn.onclick = () => {
	    let delta = parseFloat(btn.dataset.delta);
	    setCurrT(currOffset + delta);
	};
    });

    // 公開API
    let onValidRangeChange = options.onValidRangeChange || null;
    let onCurrTChange = options.onCurrTChange || null;
    return {
	setCurrT,                // ChildPanelから呼び出しOK
	setValidRange,
	setTstartCal,
	getCurrT: () => currOffset,
	setPanelWidth,
	setChildPanels,
	onValidRange: setValidRange,
	onCurrT: setCurrT,
	setOnValidRangeChange: fn => { onValidRangeChange = fn; },
	setOnCurrTChange: fn => { onCurrTChange = fn; }
    };
}
