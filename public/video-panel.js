// video-panel.js
export function createVideoPanel(container, options = {}) {
  const width = options.width || "min(52vw,1100px)";
  const fileListInput = options.fileList || null;
  const onCurrTChange = options.onCurrTChange || (()=>{});
  const onTstartChange = options.onTstartChange || (()=>{});

  const panel = document.createElement('div');
  panel.className = 'panel';
  panel.style.width = width;
  panel.innerHTML = `
    <div class="title">Videoパネル</div>
    <div class="filegroup">
      <label><b>動画ファイル選択：</b></label>
      <select class="filelist"></select>
      <button class="loadbtn">Load</button>
      <span style="margin-left:2em;">誤差補正:<input type="number" class="terrfield" value="0" step="0.001"> 秒</span>
    </div>
    <div class="fileinfo-row">
      <b>ファイル:</b> <span class="fname"></span>
      <b>先頭時刻:</b> <span class="recordtime"></span>
      <b>長さ:</b> <span class="tlen"></span>秒
    </div>
    <div class="range-bar-bg">
      <canvas class="range-bar-canvas"></canvas>
      <div class="range-bar-flags"></div>
      <div class="range-ofst-memori"></div>
    </div>
    <div class="ttctrlrow">
      <button class="setbtn setstartbtn">setTstart</button>
      <span class="tslabel"><b>Tstart:</b> <span class="tstartcal"></span> (<span class="tstart"></span>)</span>
      <br>
      <button class="setbtn setendbtn" style="margin-top:0.6em;">setTend</button>
      <span class="tslabel"><b>Tend:</b> <span class="tendcal"></span> (<span class="tend"></span>)</span>
    </div>
    <video class="video" preload="auto" controls></video>
    <div class="currt-step-btns"></div>
    <div class="slider-wrap-inner">
      <input type="range" class="slider" min="0" max="10" step="0.001" value="0">
    </div>
    <div class="slider-currt-memori"></div>
    <div class="info-btm">
      <span class="item-btm"><b>ofsT:</b> <span class="sliderpos">0.000</span></span>
      <span class="item-btm"><b>currT:</b> <span class="currtcal"></span> (<span class="currt"></span>)</span>
    </div>
  `;
  container.appendChild(panel);

  // --- スタイル追加 ---
  if (!document.getElementById('video-panel-style')) {
    const style = document.createElement('style');
    style.id = 'video-panel-style';
    style.textContent = `
    .panel { width: min(52vw,1100px); margin: 2em auto 0 auto; padding:1.5em 2em; border-radius: 1.2em; background: #fff; box-shadow: 2px 6px 20px #dde6ef; border: 1.5px solid #aac; }
    .title { font-size: 1.25em; font-weight: bold; margin-bottom:0.6em;}
    .filegroup { margin-bottom: 1em; }
    .filegroup select { font-size:1em; min-width: 16em; }
    .filegroup button { font-size:1em; margin-left: 1.5em; }
    .fileinfo-row { font-size:1em; margin-bottom:0.5em; display: flex; flex-wrap: wrap; gap: 1em; align-items: center; }
    .range-bar-bg { position: relative; width: 100%; height: 6.6em; background: #e2e2ee; border-radius: 0; z-index: 5; }
    .range-bar-canvas { position: absolute; left:0; top:0; width:100%; height:100%; pointer-events:none; }
    .range-bar-flags { position: absolute; left:0; width:100%; height:6.6em; z-index: 20; pointer-events:auto; }
    .slider-flag { position: absolute; width:32px; top:0.2em; cursor:pointer; }
    .range-ofst-memori { position: absolute; left:0; top: 5.2em; width: 100%; height:2.0em; z-index: 15; pointer-events:none; }
    .range-ofst-tick { position:absolute; width:1.3px; height:9px; background:#226; top:0; left:50%; transform:translateX(-50%);}    
    .range-ofst-label { position:absolute; text-align:center; color: #226; font-size:1em; min-width:2.6em; top:16px;}
    .range-ofst-currt { position:absolute; width:2px; height:3.0em; background:#c33; top:0.5em; left:50%; transform:translateX(-50%);}    
    .ttctrlrow { margin: 1.8em 0 0.7em 0; display: flex; flex-wrap: wrap; align-items: center; gap: 1.2em;}
    .ttctrlrow .setbtn { font-size:1em; padding:0.2em 0.9em; border-radius:6px; border:1px solid #aac; background:#e8f0fe; cursor:pointer;}
    .ttctrlrow .setbtn:active { background:#b9d5f8;}
    .ttctrlrow .tslabel { font-size:1em; }
    .video { width: 55%; max-width:720px; min-width:240px; display:block; margin:0.7em auto 1.1em auto; background:#222;}
    .currt-step-btns { margin: 0.7em 0 0.7em 0; text-align:center; }
    .currt-step-btns button { font-size:1em; margin:0 0.28em 0.1em 0; padding:0.25em 0.7em; border-radius:6px; border:1px solid #aac; background:#f0f6fe; cursor:pointer;}
    .currt-step-btns button:active { background:#b9d5f8;}
    .slider-wrap-inner { margin: 0.2em 0; }
    .slider { width: 100%; }
    .slider-currt-memori { position: relative; width: 100%; height:1.3em; pointer-events:none;}
    .slider-currt-label { position:absolute; text-align:center; color: #375; font-size:0.91em; min-width:2.6em; top:13px;}
    .slider-currt-tick { position:absolute; width:1.2px; height:7px; background:#375; top:0; left:50%; transform:translateX(-50%);}
    .info-btm { font-size:1.23em; font-weight: bold; margin-top:0.8em; display:flex; flex-wrap:wrap; gap:2.1em; align-items:center; justify-content: center;}
    .item-btm { min-width:14em;}
    .item-btm b { font-weight:700; }
    .terrfield {width:4em;}
    `;
    document.head.appendChild(style);
  }

  // --- UI部品 ---
  const $ = s => panel.querySelector(s);
  const filelist = $('.filelist');
  const loadbtn = $('.loadbtn');
  const terrInput = $('.terrfield');
  const fnameDisp = $('.fname');
  const recordTimeDisp = $('.recordtime');
  const tlenDisp = $('.tlen');
  const tstartDisp = $('.tstart');
  const tstartCalDisp = $('.tstartcal');
  const tendDisp = $('.tend');
  const tendCalDisp = $('.tendcal');
  const slider = $('.slider');
  const sliderposDisp = $('.sliderpos');
  const currtDisp = $('.currt');
  const currtCalDisp = $('.currtcal');
  const setStartBtn = $('.setstartbtn');
  const setEndBtn = $('.setendbtn');
  const rangeBarBg = $('.range-bar-bg');
  const rangeBarCanvas = $('.range-bar-canvas');
  const rangeBarFlags = $('.range-bar-flags');
  const rangeOfstMemori = $('.range-ofst-memori');
  const currtStepBtns = $('.currt-step-btns');
  const sliderCurrtMemori = $('.slider-currt-memori');
  const video = $('.video');

  // --- 状態 ---
  let videoList = [];
  let Tlen = 8.0, Tstart = 0.0, Tend = 8.0, ofsT = 0.0, currT = 0.0;
  let recordTime = "-", recordTimeSec = 0, framerate = 30.0, terr = 0.0;
  let creationTime = null; // EXIF基準
  let ignoreSliderEvent = false;
  let ignoreSync = false;

  // --- ファイルリスト初期化 ---
  function populateFileList(list) {
    filelist.innerHTML = "";
    list.forEach(v => {
      let opt = document.createElement('option');
      opt.value = v.name;
      opt.textContent = v.name;
      filelist.appendChild(opt);
    });
  }
  if (fileListInput) {
    videoList = fileListInput;
    populateFileList(videoList);
  } else {
    fetch('/videos').then(res=>res.json()).then(list=>{
      videoList = list;
      populateFileList(list);
    });
  }

  // --- Utility ---
  function flagSvg(color="#2375d3") {
    return `<svg viewBox="0 0 32 40" width="32" height="40">
      <rect x="14" y="18" width="4" height="17" fill="#444"/>
      <polygon points="16,3 28,13 16,18" fill="${color}"/>
    </svg>`;
  }
  function calcLabelStep(duration) {
    const approxLabelCount = 18;
    const stepTable = [0.1,0.2,0.5,1,2,5,10,20,30,60,120,300,600];
    let rawStep = duration / approxLabelCount;
    let step = stepTable.find(v=>v>=rawStep) || 1;
    return step;
  }
  function pad(n, w, z='0') { n=n+''; return n.length>=w?n:new Array(w-n.length+1).join(z)+n; }
  function formatCalTime(baseSec, ofs) {
    let t = new Date((baseSec+ofs)*1000);
    return `${t.getFullYear().toString().slice(2)}/${pad(t.getMonth()+1,2)}/${pad(t.getDate(),2)} ` +
           `${pad(t.getHours(),2)}:${pad(t.getMinutes(),2)}:${pad(t.getSeconds(),2)}.${pad(Math.floor((t.getMilliseconds())),3)}`;
  }

  function renderStepBtns() {
    const btns = [
      {label:'-1.0s', step:-1.0}, {label:'-0.1s', step:-0.1},
      {label:'-1Frame', step:'-frame'}, {label:'-0.01s', step:-0.01}, {label:'-0.001s', step:-0.001},
      {label:'+0.001s', step:+0.001}, {label:'+0.01s', step:+0.01}, {label:'+1Frame', step:'+frame'},
      {label:'+0.1s', step:+0.1}, {label:'+1.0s', step:+1.0}
    ];
    currtStepBtns.innerHTML = '';
    btns.forEach(b=>{
      let btn = document.createElement('button');
      btn.textContent = b.label;
      btn.onclick = function(){
        let v = 0;
        if(b.step === '+frame' || b.step === '-frame') {
          v = (b.step==='+frame'?1:-1)*(1.0/framerate);
        } else {
          v = b.step;
        }
        ofsT = Math.max(0, Math.min(ofsT+v, Tlen));
        currT = ofsT - Tstart;
        slider.value = ofsT;
        video.currentTime = Math.max(0, Math.min(ofsT, Tlen));
        updateAllDisp();
      };
      currtStepBtns.appendChild(btn);
    });
  }

  // ★ 有効区間バー(canvas)描画
  function renderRangeBarCanvas() {
    const W = rangeBarBg.offsetWidth || 700;
    const H = rangeBarBg.offsetHeight || 88; // 5.5em=88px基準
    rangeBarCanvas.width = W;
    rangeBarCanvas.height = H;
    const ctx = rangeBarCanvas.getContext('2d');

    // 1. 横線（時間軸）
    ctx.save();
    ctx.strokeStyle = "#555";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, H*0.72);
    ctx.lineTo(W, H*0.72);
    ctx.stroke();
    ctx.restore();

    // 2. 青塗り（有効区間）
    const startX = (Tstart/Tlen)*W, endX = (Tend/Tlen)*W;
    ctx.save();
    ctx.fillStyle = "#74b2fa";
    ctx.fillRect(startX, H*0.65-12, endX-startX, 12);
    ctx.restore();

    // 3. 現在時刻（currT）の縦線
    const currX = ((ofsT)/Tlen)*W;
    ctx.save();
    ctx.strokeStyle = "#c33";
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.moveTo(currX, H*0.19);
    ctx.lineTo(currX, H*0.87);
    ctx.stroke();
    ctx.restore();
  }

  function updateRangeBarUI() {
    renderRangeBarCanvas();

    // 旗竿
    let barW = rangeBarBg.offsetWidth || 700;
    rangeBarFlags.innerHTML = "";
    let FLAG_WIDTH_PX = 32;
    let leftTstart = (Tstart/Tlen)*barW - FLAG_WIDTH_PX/2;
    let f1 = document.createElement("div");
    f1.className="slider-flag";
    f1.style.left = `${leftTstart}px`;
    f1.innerHTML = flagSvg();
    f1.title = "Tstartにジャンプ";
    rangeBarFlags.appendChild(f1);

    let leftTend = (Tend/Tlen)*barW - FLAG_WIDTH_PX/2;
    let f2 = document.createElement("div");
    f2.className="slider-flag";
    f2.style.left = `${leftTend}px`;
    f2.innerHTML = flagSvg();
    f2.title = "Tendにジャンプ";
    rangeBarFlags.appendChild(f2);

    // 目盛線・ラベル
    let labelStep = calcLabelStep(Tlen);
    let tickStep = labelStep/5;
    rangeOfstMemori.innerHTML = "";
    for(let t=0; t<=Tlen+0.0001; t+=tickStep){
      let pos = (t/Tlen)*barW;
      let tick = document.createElement("div");
      tick.className = "range-ofst-tick";
      tick.style.left = `${pos}px`;
      rangeOfstMemori.appendChild(tick);
    }
    for(let t=0; t<=Tlen+0.0001; t+=labelStep){
      let pos = (t/Tlen)*barW;
      let label = document.createElement("div");
      label.className = "range-ofst-label";
      label.style.left = `${pos}px`;
      label.style.transform = "translateX(-50%)";
      label.textContent = t.toFixed(labelStep<1?2:(labelStep<10?1:0));
      rangeOfstMemori.appendChild(label);
    }
  }

function updateSliderUI() {
  let labelStepCurrT = calcLabelStep(Tlen);
  let tickStep = labelStepCurrT / 5;
  let barW = slider.offsetWidth || 700;
  sliderCurrtMemori.innerHTML = "";

  // レンジ: min=-Tstart, max=Tlen-Tstart
  let min = -Tstart, max = Tlen - Tstart, len = max - min;

  // 必ずcurrT=0(原点)を表示
  let zeroPos = ((0 - min) / len) * barW;
  let label0 = document.createElement("div");
  label0.className = "slider-currt-label";
  label0.style.left = `${zeroPos}px`;
  label0.style.transform = "translateX(-50%)";
  label0.textContent = "0";
  sliderCurrtMemori.appendChild(label0);

  for (let t = min; t <= max + 0.0001; t += labelStepCurrT) {
    // 0は既に描画済みなのでskip
    if (Math.abs(t) < 0.0001) continue;
    let pos = ((t - min) / len) * barW;
    let label = document.createElement("div");
    label.className = "slider-currt-label";
    label.style.left = `${pos}px`;
    label.style.transform = "translateX(-50%)";
    label.textContent = t.toFixed(labelStepCurrT < 1 ? 2 : (labelStepCurrT < 10 ? 1 : 0));
    sliderCurrtMemori.appendChild(label);
  }
  for (let t = min; t <= max + 0.0001; t += tickStep) {
    let pos = ((t - min) / len) * barW;
    let tick = document.createElement("div");
    tick.className = "slider-currt-tick";
    tick.style.left = `${pos}px`;
    sliderCurrtMemori.appendChild(tick);
  }
}

  // SYSTIME連携：外部からcurrTをセットする
  function setCurrTFromSystime(newCurrT) {
    if(ignoreSync) return;
    ignoreSync = true;
    ofsT = newCurrT + Tstart;
    video.currentTime = Math.max(0, Math.min(ofsT, Tlen));
    updateAllDisp(false);
    ignoreSync = false;
  }

  // SYSTIME連携：外部からTstartカレンダー時刻（秒）をセットする
  function setTstartFromSystime(newTstartCalSec) {
    if(ignoreSync) return;
    ignoreSync = true;
    terr = creationTime ? (newTstartCalSec - (new Date(creationTime).getTime() / 1000)) : 0;
    if(terrInput) terrInput.value = terr;
    recordTimeSec = creationTime ? (new Date(creationTime).getTime() / 1000) + terr : 0;
    updateAllDisp(false);
    ignoreSync = false;
  }

  // 通知（内部→外部）コール
  function notifyCurrTChange(val) {
    if(ignoreSync) return;
    onCurrTChange(val);
  }
  function notifyTstartChange(val) {
    if(ignoreSync) return;
    onTstartChange(val);
  }

  // 主要UI一括更新
  function updateAllDisp(notify=true) {
    currT = ofsT - Tstart;
    sliderposDisp.textContent = ofsT.toFixed(3);
    currtDisp.textContent = currT.toFixed(3);
    tstartDisp.textContent = Tstart.toFixed(3);
    tendDisp.textContent = Tend.toFixed(3);
    tstartCalDisp.textContent = formatCalTime(recordTimeSec, Tstart);
    tendCalDisp.textContent = formatCalTime(recordTimeSec, Tend);
    currtCalDisp.textContent = formatCalTime(recordTimeSec, ofsT);
    fnameDisp.textContent = filelist.value;
    // --- 先頭時刻カレンダータイム（小数点3桁まで）---
    recordTimeDisp.textContent = recordTimeSec !== 0
      ? formatCalTime(recordTimeSec, 0)
      : "-";
    tlenDisp.textContent = Tlen.toFixed(3);
    slider.min = 0;
    slider.max = Tlen.toFixed(3);
    slider.value = ofsT;
    renderStepBtns();
    updateRangeBarUI();
    updateSliderUI();
    if(notify) {
      notifyCurrTChange(currT);
    }
  }

  function getCreationTimeSec(str) {
    let t = new Date(str);
    return isNaN(t.getTime()) ? 0 : t.getTime()/1000;
  }

  // --- イベントハンドラ・UI操作 ---
  loadbtn.onclick = function() {
    let vmeta = videoList.find(v=>v.name===filelist.value);
    if(!vmeta) return;
    Tlen = Number(vmeta.duration);
    Tstart = 0.0;
    Tend = Tlen;
    ofsT = 0.0;
    currT = ofsT - Tstart;
    framerate = Number(vmeta.frame_rate || 30);
    creationTime = vmeta.creation_time ? vmeta.creation_time : null;
    recordTimeSec = creationTime ? getCreationTimeSec(creationTime) + Number(terr) : 0;
    terr = 0.0;
    if(terrInput) terrInput.value = 0.0;
    video.src = '/video/' + encodeURIComponent(vmeta.name);
    video.currentTime = 0;
    updateAllDisp();
    notifyTstartChange(recordTimeSec);
  };

  slider.oninput = function(){
    if(ignoreSliderEvent) return;
    ofsT = Number(this.value);
    currT = ofsT - Tstart;
    video.currentTime = Math.max(0, Math.min(ofsT, Tlen));
    updateAllDisp();
  };

  setStartBtn.onclick = function(){
    Tstart = Math.max(0, Math.min(Number(slider.value), Tlen));
    if (Tend < Tstart) Tend = Tstart;
    ofsT = Tstart;
    currT = 0.0;
    slider.value = ofsT;
    video.currentTime = Math.max(0, Math.min(ofsT, Tlen));
    updateAllDisp();
  };
  setEndBtn.onclick = function(){
    Tend = Math.max(Tstart, Math.min(Number(slider.value), Tlen));
    ofsT = Tend;
    currT = ofsT - Tstart;
    slider.value = ofsT;
    video.currentTime = Math.max(0, Math.min(ofsT, Tlen));
    updateAllDisp();
  };

  terrInput.oninput = function() {
    terr = Number(this.value);
    recordTimeSec = creationTime ? getCreationTimeSec(creationTime) + terr : 0;
    updateAllDisp();
    notifyTstartChange(recordTimeSec);
  };

  rangeBarFlags.onclick = function(e){
    let target = e.target.closest(".slider-flag");
    if(!target) return;
    let idx = Array.from(rangeBarFlags.children).indexOf(target);
    if(idx === 0) { ofsT = Tstart; }
    else if(idx === 1) { ofsT = Tend; }
    currT = ofsT - Tstart;
    slider.value = ofsT;
    video.currentTime = Math.max(0, Math.min(ofsT, Tlen));
    updateAllDisp();
  };

  video.addEventListener("timeupdate", () => {
    if (video.paused || video.seeking) return;
    ignoreSliderEvent = true;
    ofsT = video.currentTime;
    currT = ofsT - Tstart;
    slider.value = ofsT;
    updateAllDisp();
    ignoreSliderEvent = false;
  });

  window.addEventListener('keydown', e => {
    if(document.activeElement && (
      document.activeElement.tagName === "INPUT" ||
      document.activeElement.tagName === "SELECT" ||
      document.activeElement.isContentEditable)) return;
    if(framerate <= 0) return;
    const dt = 1.0 / framerate;
    if(e.key === 'ArrowRight') {
      ofsT = Math.min(ofsT + dt, Tlen);
      currT = ofsT - Tstart;
      slider.value = ofsT;
      video.currentTime = Math.max(0, Math.min(ofsT, Tlen));
      updateAllDisp();
      e.preventDefault();
    } else if(e.key === 'ArrowLeft') {
      ofsT = Math.max(ofsT - dt, 0);
      currT = ofsT - Tstart;
      slider.value = ofsT;
      video.currentTime = Math.max(0, Math.min(ofsT, Tlen));
      updateAllDisp();
      e.preventDefault();
    }
  });

  setTimeout(() => {
    if (filelist.options.length > 0) loadbtn.onclick();
  }, 500);

  // --- パネルAPI ---
  return {
    dom: panel,
    setCurrTFromSystime,
    setTstartFromSystime,
    getCurrentTime: () => ofsT,
    setCurrentTime: t => { ofsT = t; updateAllDisp(); },
    getTstartCal: () => recordTimeSec,
    setTstartCal: sec => setTstartFromSystime(sec),
    getVideoLength: () => Tlen,
  };
}
