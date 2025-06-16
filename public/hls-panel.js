// hls-panel.js
export function createHlsPanel(container, options = {}) {
    // master/slave・ChildPanel連携用
    const isMaster = !!options.master;
    const playlistList = options.fileList || [];
    const Hls = window.Hls;

    let onCurrTChange = options.onCurrTChange || (() => {
	console.log("dummy onCurrTChange");
    });
    let onValidRangeChange = options.onValidRangeChange || (() => { 
	console.log("dummy onValidRangeChange");
    });
    
    let fileName = "";
    let startCalTime = 0;     // 誤差補正前 メディアスタート時刻(ms単位)
    let Terr = 0;             // 誤差補正値
    let startCalTimeCorr = 0; // 誤差補正済みメディアスタート時刻 <= startCalTime + Terr
    let lengthMs = 0;	      // メディア長(ms)
    let frameRate = 60;
    let frameDur = 1 / 60;
    let ofsT = 0;		// 現在時刻(メディア先頭からのオフセット秒)
    let Tstart = 0;		// 有効区間開始オフセット(メディア先頭からのオフセット秒)
    let Tend = 0;		// 有効区間終了オフセット(メディア先頭からのオフセット秒)
    
    const panel = document.createElement("div");
    panel.className = "panel";
    panel.style.width = options.width || "min(52vw,1100px)";
    // ★タイトルだけmaster/slave対応
    panel.innerHTML = `
    <div class="title-row">
      <span class="title">HLSパネル${isMaster ? " (master)" : " (slave)"}</span>
      <span >  ファイル:
        <select class="filelist"></select>
        <button class="loadbtn">Load</button>
     </span>
    </div>
    <div class="fileinfo-row">
      <span class="recordtime">-</span>
      <span class="tlen">0</span>
      <span class="framerate">0</span>
      <span>補正:</span>
      <input type="number" class="terrfield" value="0" step="0.001">秒
    </div>
    <div class="ttctrlrow">
      <div class="ttstartblock">
        <button class="setbtn setstartbtn">setTstart</button>
        <span class="tslabel"><b>Tstart:</b> <span class="tstartcal">-</span>
      </div>
      <div class="ttendblock" style="justify-content:space-between; display:flex; width:100%;">
        <div>
          <button class="setbtn setendbtn">setTend</button>
          <span class="tslabel"><b>Tend:</b> <span class="tendcal">-</span>
        </div>
      </div>
    </div>
    <div class="slider-wrap-inner">
      <canvas class="slider-canvas"></canvas>
    </div>
     <video class="video" preload="auto" controls style="width:100%; max-width:100%;"></video>
    <div class="currt-step-btns">
      <button data-step="-1.0">-1.0</button>
      <button data-step="-0.1">-0.1</button>
      <button data-step="-1f">-1Frame</button>
      <button data-step="-0.01">-0.01</button>
      <button data-step="+0.01">+0.01</button>
      <button data-step="+1f">+1Frame</button>
      <button data-step="+0.1">+0.1</button>
      <button data-step="+1.0">+1.0</button>
    </div>
    <div class="info-btm" style="margin-top: 0.5em;">
      <span class="item-btm"><b>T=</b> <span class="currt">00:00:00.000(0.000)</span></span>
    </div>
  `;
    container.appendChild(panel);

    // --- CSS定義部 ---
    if (!document.getElementById("hls-panel-style")) {
	const style = document.createElement("style");
	style.id = "hls-panel-style";
	style.textContent = `
    .panel {
      width: min(52vw,1100px);
      margin: 0.5em auto 0;
      padding: 1.5em 2em 1.5em 1.5em;
      border-radius: 1.2em;
      background: #fff;
      box-shadow: 2px 6px 20px #dde6ef;
      border: 1.5px solid #aac;
    }
    .title {
      font-size: 1.25em;
      font-weight: bold;
      margin-bottom: 0.6em;
    }
    .tlen {
      width: 5em;
    }
    .terrfield {
      width: 5em;  /* 1em=1文字分くらい。5～6emで6桁分 */
    }
    .fileinfo-row {
      font-size: 1em;
      margin-bottom: 0.5em;
      display: flex;
      flex-wrap: wrap;
      gap: 0.4em;
      align-items: center;
    }
    .ttctrlrow {
      margin: 0.5em 0 0.5em;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 1.2em;
    }
    .ttctrlrow {
	  display: flex;
	  flex-direction: column;
	  gap: 0.5em;
	  align-items: flex-start; /* 必要なら */
    }
    .ttctrlrow > div {
	  display: flex;
	  align-items: center;
	  gap: 0.5em;
    }
    .ttendblock {
	  display: flex;
	  justify-content: space-between;
	  align-items: center;
	  width: 100%;
	  gap: 1em;
    }
    .setbtn {
      min-width: 7em;
      font-size: 1em;
      padding: 0.2em 0.9em;
      border-radius: 6px;
      border: 1px solid #aac;
      background: #e8f0fe;
      cursor: pointer;
    }
    .setbtn:active {
      background: #b9d5f8;
    }
    .tslabel {
      font-size: 1em;
    }
    .video {
      width: 100%;
      max-width: 720px;
      display: block;
      margin: 0.7em auto 1.1em;
      background: #222;
    }
    .currt-step-btns {
      margin: 0.7em 0;
      text-align: center;
    }
    .currt-step-btns button {
      font-size: 0.9em;
      margin: 0.1em;
      padding: 0.25em 0.6em;
      border-radius: 6px;
      border: 1px solid #aac;
      background: #f0f6fe;
      cursor: pointer;
    }
    .currt-step-btns button:active {
      background: #b9d5f8;
    }
    .slider-wrap-inner {
      position: relative;
      /*margin: 0.2em 0 1em 0;*/
      height: 5em;
      padding-bottom: 0.5em;        /* ← 下側スペース拡大 */
      z-index: 1000 !important;
      background: #e2e2ee;
    }
    .slider-canvas {
      position: relative;
      width: 100%;
      height: 100%;
      display: block;
      cursor: pointer;
      user-select: none;
      touch-action: none;
     z-index: 1100 !important;
      pointer-events: auto !important;
    }
    .info-btm {
      font-size: 1.23em;
      font-weight: bold;
      display: flex;
      flex-wrap: wrap;
      gap: 2.1em;
      align-items: center;
      justify-content: center;
      margin-top: 0.5em !important; /* ← マージン大きく */
    }
    .info-btm b {
      font-weight: 700;
    }
  `;
	document.head.appendChild(style);
    }

    const selectEl      = panel.querySelector(".filelist");
    const loadBtn       = panel.querySelector(".loadbtn");
    const terrInput     = panel.querySelector(".terrfield");
    const recordDisp    = panel.querySelector(".recordtime");
    const tlenDisp      = panel.querySelector(".tlen");
    const frateDisp     = panel.querySelector(".framerate");
    const setStartBtn   = panel.querySelector(".setstartbtn");
    const setEndBtn     = panel.querySelector(".setendbtn");
    const tstartCalDisp = panel.querySelector(".tstartcal");
    const tendCalDisp   = panel.querySelector(".tendcal");
    const videoEl       = panel.querySelector("video");
    const stepBtns      = panel.querySelectorAll(".currt-step-btns button");
    const sliderCanvas  = panel.querySelector(".slider-canvas");
    const sliderBg      = panel.querySelector(".slider-wrap-inner");
    const currTDisp     = panel.querySelector(".currt");

    playlistList.forEach((url) => {
	const opt = document.createElement("option");
	opt.value = url;
	opt.text = url.split("/").slice(-2, -1)[0];
	selectEl.appendChild(opt);
    });

    terrInput.addEventListener("change", () => {
	Terr = parseFloat(terrInput.value) || 0;
	startCalTimeCorr = startCalTime + Terr * 1000;
	updateAllDisp();
	displayRecordTime();
    });


    function formatCalTime(startCalTimeMs, ofsT, currT) {
	const date = new Date(startCalTimeMs + ofsT*1000);
	const h = String(date.getHours()).padStart(2, "0");
	const m = String(date.getMinutes()).padStart(2, "0");
	const s = String(date.getSeconds()).padStart(2, "0");
	const ms = String(date.getMilliseconds()).padStart(3, "0");
	//return `${h}:${m}:${s}.${ms}(${currT.toFixed(3)})`;
	return `${h}:${m}:${s}.${ms}(${currT.toFixed(3)},${ofsT.toFixed(3)})`;
    }

    function getFrametimeJsonPath(m3u8Path) {
	if (m3u8Path.endsWith("playlist.m3u8")) {
	    return m3u8Path.replace(/playlist\.m3u8$/, "frametime.json");
	}
	return null;
    }

    async function loadFrametimeJson(jsonUrl) {
	try {
	    const res = await fetch(jsonUrl);
	    if (!res.ok) throw new Error("frametime.json取得失敗");
	    const data = await res.json();
	    let startTimeDisp = data.StartTime.replace("T", " ");
	    if (startTimeDisp.includes("+")) {
		startTimeDisp = startTimeDisp.replace(/(\+\d{2}):?(\d{2})?$/, "");
	    }
	    return { startTimeStr: data.StartTime, startTimeDisp };
	} catch (e) {
	    return null;
	}
    }

    function displayRecordTime() {
	const d = new Date(startCalTimeCorr);

	const y  = d.getFullYear();
	const mo = String(d.getMonth() + 1).padStart(2, '0');
	const day= String(d.getDate()).padStart(2, '0');
	const h  = String(d.getHours()).padStart(2, '0');
	const mi = String(d.getMinutes()).padStart(2, '0');
	const s  = String(d.getSeconds()).padStart(2, '0');
	const ms = String(d.getMilliseconds()).padStart(3, '0');
	
	recordDisp.textContent = `${y}/${mo}/${day} ${h}:${mi}:${s}.${ms}`;
    }

    async function loadVideoWithFrametime() {
	const idx = selectEl.selectedIndex;
	fileName = selectEl.value;
	const m3u8Url = playlistList[idx];
	const frametimeJsonUrl = getFrametimeJsonPath(m3u8Url);
	let jsonData = null;

	if (frametimeJsonUrl) {
	    jsonData = await loadFrametimeJson(frametimeJsonUrl);
	}

	if (jsonData && jsonData.startTimeStr) {
	    startCalTime = new Date(jsonData.startTimeStr).getTime();
	} else {
	    const now = Date.now();
	    startCalTime = now;
	    //recordDisp.textContent = new Date(now).toISOString().replace("T", " ").substr(0, 23);
	}
	startCalTimeCorr = startCalTime + Terr * 1000;
	displayRecordTime();	

	frateDisp.textContent = frameRate + " fps";
	if (Hls.isSupported()) {
	    const hls = new Hls();
	    hls.loadSource(m3u8Url);
	    hls.attachMedia(videoEl);
	} else {
	    videoEl.src = m3u8Url;
	}
    }
    loadBtn.addEventListener("click", loadVideoWithFrametime);
    selectEl.addEventListener("change", loadVideoWithFrametime);

    videoEl.addEventListener("loadedmetadata", () => {
	lengthMs = Math.floor(videoEl.duration * 1000)/1000;
	tlenDisp.textContent = lengthMs.toString()+'s';

	ofsT = 0;
	Tstart = 0;
	Tend   = videoEl.duration;
	// ★masterの場合のみ有効区間通知
	if (isMaster) {
	    //console.log("before fire", typeof onValidRangeChange, onValidRangeChange);
	    onValidRangeChange(startCalTime, videoEl.duration );
	}
	updateAllDisp();
    });

    videoEl.addEventListener("timeupdate", () => {
	ofsT = videoEl.currentTime;   // Terrを加えない！
	updateAllDisp();
	// currT = ofsT - Tstart, 必要なら onCurrTChange
	let currT = ofsT - Tstart;
	if (currT < 0) currT = 0;
	if (currT > Tend - Tstart) currT = Tend - Tstart;
	onCurrTChange(currT);
    });

    setStartBtn.onclick = () => {
	Tstart = ofsT;
	if (Tend < Tstart) Tend = Tstart;
	videoEl.currentTime = ofsT;
	// ★masterの場合のみ有効区間通知
	if (isMaster) {
	    const newCalTime = startCalTimeCorr + Tstart;
	    //console.log("startCalTime:", startCalTime , "startCalTimeCorr:",startCalTimeCorr);
	    //console.log("setStartBtn: T=",newCalTime , "L=",Tend - Tstart);
	    onValidRangeChange(newCalTime , Tend - Tstart);
	}
	updateAllDisp();
    };
    
    setEndBtn.onclick = () => {
	Tend = ofsT;
	if (Tstart > Tend) Tstart = Tend;
	videoEl.currentTime = ofsT;
	// ★masterの場合のみ有効区間通知
	if (isMaster) {
	    const newCalTime = startCalTimeCorr + Tstart;
	    //console.log("ofsT:", ofsT , " Tstart:" ,Tstart , " Tend:",Tend);
	    //console.log("setEndBtn: T=",newCalTime , "L=",Tend - Tstart);
	    onValidRangeChange(newCalTime, Tend - Tstart);      
	}
	updateAllDisp();
    };

    stepBtns.forEach((btn) => {
	btn.addEventListener("click", () => {
	    const step = btn.dataset.step;
	    let newT;
	    switch (step) {
            case "-1.0":
		newT = ofsT - 1.0;
		break;
            case "+1.0":
		newT = ofsT + 1.0;
		break;
            case "-0.1":
		newT = ofsT - 0.1;
		break;
            case "+0.1":
		newT = ofsT + 0.1;
		break;
            case "-0.01":
		newT = ofsT - 0.01;
		break;
            case "+0.01":
		newT = ofsT + 0.01;
		break;
            case "-1f":
		newT = ofsT - frameDur;
		break;
            case "+1f":
		newT = ofsT + frameDur;
		break;
            default:
		newT = ofsT;
	    }
	    if (newT < 0) newT = 0;
	    if (newT > videoEl.duration) newT = videoEl.duration;
	    ofsT = newT;
	    videoEl.currentTime = ofsT;
	    updateAllDisp();
	});
    });

    function updateAllDisp() {
	let currT = ofsT - Tstart;
	if (currT < 0) currT = 0;
	if (currT > Tend - Tstart) currT = Tend - Tstart;

	if (options.onTstartCalTimeChange) {
	    options.onTstartCalTimeChange(startCalTimeCorr + Tstart); // ms
	}
	currTDisp.textContent = formatCalTime(startCalTimeCorr, ofsT, currT);

	tstartCalDisp.textContent = formatCalTime(startCalTimeCorr, Tstart, 0);
	tendCalDisp.textContent   = formatCalTime(startCalTimeCorr, Tend, Tend-Tstart);

	renderSliderCanvas();
    }

    /**
     * Tlen, targetLabelsから major/minor間隔を決定
     * tstep = Tlen/targetLabels を 1<=tstep<10 の範囲にスケーリングし、
     * tstep_frac * 10^order の形に分解して [1,2,2.5,5,10]に最も近い値を選択
     * @param {number} Tlen
     * @param {number} targetLabels
     * @returns {object} {major, minor}
     */
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

    function drawFlag(canvas,pos,total,color,LR = "L") {
	const W = canvas.offsetWidth;
	const H = canvas.offsetHeight;
	const ctx = canvas.getContext("2d");
	const baseline =  H * 0.50;

	const poleHeight = H * 0.45;
	const fx1 = (pos / total) * W;
	const flagW = poleHeight / 2.7;
	const flagH = poleHeight / 2.2;

	ctx.strokeStyle = color;
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(fx1, baseline);
	ctx.lineTo(fx1, baseline - poleHeight);
	ctx.stroke();

	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.moveTo(fx1, baseline - poleHeight);
	if (LR == 'L') {
	    ctx.lineTo(fx1 + flagW, baseline - poleHeight + flagH / 2);
	} else {
	    ctx.lineTo(fx1 - flagW, baseline - poleHeight + flagH / 2);
	}
	ctx.lineTo(fx1, baseline - poleHeight + flagH);
	ctx.closePath();
	ctx.fill();
    }



    function renderSliderCanvas() {
	const W = sliderCanvas.offsetWidth;
	const H = sliderCanvas.offsetHeight;
	sliderCanvas.width = W;
	sliderCanvas.height = H;
	const ctx = sliderCanvas.getContext("2d");
	ctx.clearRect(0, 0, W, H);

	const total = videoEl.duration;
	if (total <= 0) return;
	const baseline = H * 0.60;
	const pxPerSec = W / total;

	const sx = (Tstart / total) * W;
	const ex = (Tend   / total) * W;
	ctx.fillStyle = "#74b2fa";
	ctx.fillRect(sx, baseline - 12, ex - sx, 12);

	ctx.strokeStyle = "#555";
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(0, baseline);
	ctx.lineTo(W, baseline);
	ctx.stroke();

	const { major, minor } = calcLabelStep(total);
	let i0 = Math.ceil(-Tstart / major);
	let tStart = Tstart + i0 * major;
	let tEnd   = total;
	ctx.font = "9px sans-serif";
	ctx.textAlign = "center";
	ctx.textBaseline = "top";
	for (let t = tStart; t <= tEnd + 1e-6; t += minor) {
	    const isMajor = Math.abs(((t - Tstart) / major) - Math.round((t - Tstart) / major)) < 1e-6;
	    const x = t * pxPerSec;
	    if (isMajor) {
		ctx.strokeStyle = "#000";
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.moveTo(x, baseline);
		ctx.lineTo(x, baseline + 15);
		ctx.stroke();
		ctx.fillStyle = "#000";
		ctx.fillText(Math.round((t - Tstart)), x, baseline + 20);
	    } else {
		ctx.strokeStyle = "#444";
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(x, baseline);
		ctx.lineTo(x, baseline + 8);
		ctx.stroke();
	    }
	}
	// フラグ表示
	drawFlag(sliderCanvas, Tstart, total, "#0a0", "L");
	drawFlag(sliderCanvas, Tend, total, "#0a0", "R");

	// currTの赤縦線
	const currX = (ofsT / total) * W;
	ctx.strokeStyle = "#e33";
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(currX, 0);
	ctx.lineTo(currX, H);
	ctx.stroke();	
    }

    let dragging = false;
    function sliderX2ofsT(x) {
	const W = sliderCanvas.width;
	const total = videoEl.duration;
	return Math.max(0, Math.min(x / W * total, total));
    }
    sliderCanvas.addEventListener("mousedown", (e) => {
	e.preventDefault();
	const rect = sliderCanvas.getBoundingClientRect();
	const x = (e.clientX - rect.left) * sliderCanvas.width / sliderCanvas.offsetWidth;
	const knobRadius = 8;
	const knobX = ofsT * sliderCanvas.width / videoEl.duration;
	if (Math.abs(x - knobX) < knobRadius + 3) {
	    dragging = true;
	    document.body.style.userSelect = "none";
	} else {
	    ofsT = sliderX2ofsT(x);
	    videoEl.currentTime = ofsT;
	    updateAllDisp();
	}
    });
    window.addEventListener("mousemove", (e) => {
	if (!dragging) return;
	e.preventDefault();
	const rect = sliderCanvas.getBoundingClientRect();
	const x = (e.clientX - rect.left) * sliderCanvas.width / sliderCanvas.offsetWidth;
	ofsT = sliderX2ofsT(x);
	//console.log("HLS: ofsT=",ofsT);
	videoEl.currentTime = ofsT;
	updateAllDisp();
    });
    window.addEventListener("mouseup", (e) => {
	if (dragging) {
	    dragging = false;
	    document.body.style.userSelect = "";
	}
    });
    sliderCanvas.addEventListener("touchstart", (e) => {
	e.preventDefault();
	const rect = sliderCanvas.getBoundingClientRect();
	const x = (e.touches[0].clientX - rect.left) * sliderCanvas.width / sliderCanvas.offsetWidth;
	const knobRadius = 8;
	const knobX = ofsT * sliderCanvas.width / videoEl.duration;
	if (Math.abs(x - knobX) < knobRadius + 3) {
	    dragging = true;
	    document.body.style.userSelect = "none";
	} else {
	    ofsT = sliderX2ofsT(x);
	    videoEl.currentTime = ofsT;
	    updateAllDisp();
	}
    });
    window.addEventListener("touchmove", (e) => {
	if (!dragging) return;
	e.preventDefault();
	const rect = sliderCanvas.getBoundingClientRect();
	const x = (e.touches[0].clientX - rect.left) * sliderCanvas.width / sliderCanvas.offsetWidth;
	ofsT = sliderX2ofsT(x);
	videoEl.currentTime = ofsT;
	updateAllDisp();
    });
    window.addEventListener("touchend", (e) => {
	if (dragging) {
	    dragging = false;
	    document.body.style.userSelect = "";
	}
    });

    sliderBg.addEventListener("click", (e) => {
	const rect = sliderBg.getBoundingClientRect();
	const x = e.clientX - rect.left;
	const W = sliderCanvas.width;
	const total = videoEl.duration;
	if (total <= 0) return;
	const fx1 = (Tstart / total) * W;
	const fx2 = (Tend   / total) * W;
	const fontSizePx = parseFloat(getComputedStyle(panel).fontSize);
	const tol = fontSizePx * 1.2;
	if (Math.abs(x - fx1) <= tol) {
            ofsT = Tstart;
            videoEl.currentTime = ofsT;
            updateAllDisp();
            return;
	}
	if (Math.abs(x - fx2) <= tol) {
            ofsT = Tend;
            videoEl.currentTime = ofsT;
            updateAllDisp();
            return;
	}
    });


    // --- ChildPanel同期API追加 ---
    function setCurrTFromSystime(val) {
	// SYSTIME→HLSパネルの同期
	//console.log("HLS: setCurrTFromSystime val=",val);
	let vt = val;
	if (vt < 0) vt = 0;
	if (vt > Tend - Tstart) vt = Tend - Tstart;
	ofsT = Tstart + vt;
	videoEl.currentTime = ofsT;
	//console.log("HLS: setCurrTFromSystime: vt=",vt," Tstart=",Tstart," ofsT=",ofsT);
	updateAllDisp();
    }
    function setValidRangeFromSystime(newTstartCalTime, newTlen) {
	Tstart = newTstartCalTime - startCalTime;
	Tend = Tstart + newTlen
	//ofsT = Tstart;
	videoEl.currentTime = ofsT;
	updateAllDisp();
    }

    // 公開API: コールバック再設定
    function setOnValidRangeChange(fn) { onValidRangeChange = fn; }
    function setOnCurrTChange(fn) { onCurrTChange = fn; }
    
    // 既存関数
    function getVideoLength() { return videoEl.duration; }
    function getTend() { return Tend; }
    if (playlistList.length) loadVideoWithFrametime();

    // --- ChildPanel用同期APIも返却 ---
    return {
	dom: panel,
	setCurrTFromSystime,
	setValidRangeFromSystime,
	setOnValidRangeChange,
	setOnCurrTChange,      
	getCurrentTime: () => ofsT - Tstart,
	getTstartCal: () => Tstart,
	getTend: () => Tend,
	getVideoLength: getVideoLength
    };
}
