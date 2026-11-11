import {SYSTEMS, DEPS, FACILITIES, SCENARIOS, ACTIONS, JOURNEYS, CityModel} from './model.mjs';

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const byId=id=>SYSTEMS.find(s=>s.id===id), facility=id=>FACILITIES.find(s=>s.id===id);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)), mix=(a,b,t)=>a+(b-a)*t;
const icons={
  power:'M13 2 5 13h6l-1 9 9-13h-6z',
  comms:'M12 13v9M8 22h8M9 10a4 4 0 0 1 6 0M6 7a8 8 0 0 1 12 0M3 4a12 12 0 0 1 18 0M11 12h2',
  water:'M12 2S5 10 5 14a7 7 0 0 0 14 0c0-4-7-12-7-12ZM8 15a4 4 0 0 0 4 4',
  hospital:'M4 6h16v16H4zM9 6V2h6v4M12 10v8M8 14h8',
  logistics:'M3 5h11v13H3zM14 10h4l3 4v4h-7M5 18a2 2 0 1 0 4 0M16 18a2 2 0 1 0 4 0M6 8h5',
  transport:'M6 3h12a2 2 0 0 1 2 2v11a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V5a2 2 0 0 1 2-2ZM4 10h16M8 14h1M15 14h1M7 19l-2 3M17 19l2 3',
  retail:'M3 10h18l-2-7H5zM4 10v12h16V10M9 22v-8h6v8M8 3v7M16 3v7',
  school:'m2 8 10-5 10 5-10 5zM6 10v7l6 3 6-3v-7M22 8v9',
  finance:'M3 5h18v15H3zM3 9h18M6 16h4M15 13h3M15 16h3',
  sun:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 1v3M12 20v3M1 12h3M20 12h3M4 4l2 2M18 18l2 2M4 20l2-2M18 6l2-2',
  repair:'m14 5 5-3a6 6 0 0 1-7 8L5 21l-3-3 11-7a6 6 0 0 1 1-6Z'
};
const icon=id=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${icons[id]||icons.power}"/></svg>`;
const fmt=t=>`${String(Math.floor(t/60)%24).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;
const pct=v=>Math.round(v*100);
const model=new CityModel();
let selected=null, layer='all', mode='explore', view='city', speed=1, paused=false, reduced=matchMedia('(prefers-reduced-motion: reduce)').matches, sound=false, journey=null, storyStep=0, lastUI=0, elapsed=0, lastFrame=0, successShown=false;
let camera={angle:Math.PI/4,zoom:1,x:0,y:0}, targetCamera={...camera}, pointer=null, autoTour=false;
let W=0,H=0,U=30,DPR=1,hovered=null,hitAreas=[],graphHits=[];
const canvas=$('#cityCanvas'), displayCtx=canvas.getContext('2d'), labelRoot=$('#mapLabels');
let ctx=displayCtx, sceneKey='', labelKey='', lastRender=0;
const sceneCanvas=document.createElement('canvas'),sceneCtx=sceneCanvas.getContext('2d');
let toastTimer;
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),4000);}
function setMode(next){mode=next;journey=null;$('#journeyOverlay').hidden=true;$$('[data-mode]').forEach(b=>{b.classList.toggle('active',b.dataset.mode===mode);b.setAttribute('aria-pressed',b.dataset.mode===mode)});if(next==='emergency'&&model.scenario.id==='normal')setScenario('blackout');else renderInspector();$('#stageSubtitle').textContent=next==='emergency'?'用有限的资源，为整座城市争取时间。':next==='story'?'跟随一个日常，穿过看不见的网络。':'每一盏灯亮起，都有一座城在协作。';}
function selectSystem(id,move=true){selected=id;layer=id;$('#allLayer').classList.remove('active');$$('.layer-item').forEach(b=>{b.classList.toggle('active',b.dataset.system===id);b.setAttribute('aria-pressed',b.dataset.system===id)});renderInspector();if(move&&view!=='graph'){const f=facility(id),p=project(f.x+.8,f.z+.8,0);targetCamera.x+=W*.5-p.x;targetCamera.y+=H*.62-p.y;}updateLabels();}
function overview(){selected=null;layer='all';$('#allLayer').classList.add('active');$$('.layer-item').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-pressed','false')});targetCamera.x=0;targetCamera.y=0;renderInspector();}
function setScenario(id){model.reset(id);successShown=false;paused=false;$('#pause').textContent='Ⅱ';$('#pause').setAttribute('aria-label','暂停模拟');$$('[data-scenario]').forEach(b=>b.classList.toggle('active',b.dataset.scenario===id));$('#scenarioName').textContent=model.scenario.name;journey=null;$('#journeyOverlay').hidden=true;renderInspector();updateUI();toast(id==='normal'?'城市已恢复。你可以选择一张网络，或跟随一段日常。':`${model.scenario.name}已发生 · 以 4× / 12× 加速观察连锁反应`);}
$('#layerList').innerHTML=SYSTEMS.map(s=>`<button class="layer-item" data-system="${s.id}" style="--system:${s.color}" aria-pressed="false" aria-label="查看${s.name}网络"><span class="system-icon">${icon(s.icon)}</span><span><strong>${s.name}</strong><small>${s.en}</small><span class="health-bar"><i></i></span></span><span class="percentage">100%</span></button>`).join('');
$('#scenarioList').innerHTML=SCENARIOS.map(s=>`<button class="scenario-card ${s.id==='normal'?'active':''}" data-scenario="${s.id}" title="${s.text}"><span>${icon(s.icon)}</span><div><strong>${s.name}</strong><small>${s.sub}</small></div></button>`).join('');
labelRoot.innerHTML=FACILITIES.map(f=>`<button class="map-label" data-facility="${f.id}" style="--system:${byId(f.id).color}" aria-label="选择${f.name}"><i></i>${f.name}<small>100%</small></button>`).join('');
$$('[data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
$$('[data-system]').forEach(b=>b.onclick=()=>selectSystem(b.dataset.system));
$$('[data-facility]').forEach(b=>b.onclick=()=>selectSystem(b.dataset.facility,false));
$$('[data-scenario]').forEach(b=>b.onclick=()=>setScenario(b.dataset.scenario));
$('#allLayer').onclick=overview;
$('#resetButton').onclick=()=>{setScenario('normal');overview();targetCamera={angle:Math.PI/4,zoom:1,x:0,y:0};};
$$('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;$('.stage').classList.toggle('graph-view',view==='graph');$$('[data-view]').forEach(a=>{a.classList.toggle('active',a===b);a.setAttribute('aria-pressed',a===b)});hitAreas=[];updateLabels();if(view==='underground')toast('透视地下管网 · 选择左侧网络，查看对应的流动');if(view==='graph')toast('箭头从供给方指向依赖方 · 点击节点查看关系');});
function dependencyChips(id){return DEPS.filter(d=>d[1]===id).map(([from,,w,text])=>`<button class="dependency-chip" data-dependency="${from}" style="--system:${byId(from).color}" title="${text}（模型权重 ${pct(w)}%）"><i></i>${byId(from).name}<span>↗</span></button>`).join('');}
function renderInspector(){
  let html='';
  if(mode==='emergency'){
    html=`<section class="inspector-section"><div class="section-label"><span>应急调度台</span><span>第 ${Math.floor(model.elapsed)} 分钟</span></div><div class="resource-head"><span>可用资源</span><div><strong>${model.budget}</strong><span> / 10 点</span></div></div><div class="challenge-goal">目标：模拟 30 分钟后，将全城基本服务恢复到 83%。<br>每种措施只能执行一次，切换情景会重新开始。</div>${model.scenario.id==='normal'?'<p class="detail-text">选择下方的故障情景，开始一场应急实验。</p>':''}${model.completed?'<div class="success"><h3>城市重新呼吸了。</h3><p>应急调度达成。继续观察，或重置城市尝试另一种资源组合。</p></div>':''}<div class="action-list">${ACTIONS.map(a=>`<button class="action-card ${model.actions.has(a.id)?'used':''}" data-action="${a.id}" ${model.actions.has(a.id)||model.budget<a.cost?'disabled':''}><span>${icon(a.icon)}</span><div><strong>${a.name}</strong><small>${model.actions.has(a.id)?'已投入运行':a.text}</small></div><b>${model.actions.has(a.id)?'✓':a.cost}</b></button>`).join('')}</div></section>`;
  }else if(mode==='story'){
    html=`<section class="inspector-section"><div class="section-label"><span>从日常进入城市</span><span>03 段旅程</span></div><h2 style="font-family:serif;font-size:21px;font-weight:400;line-height:1.6;margin:15px 0 8px">看似微小的事，<br>牵动一整座城市。</h2><p class="detail-text">选择一段旅程。镜头会带你走过背后的网络，你也可以随时停下，自由观察。</p>${JOURNEYS.map((j,i)=>`<button class="journey-choice" data-journey="${i}"><span>${icon(j.icon)}</span><div><strong>${j.name}</strong><small>${j.steps.length} 个节点 · ${i===0?'物资如何成为生活':i===1?'一条生命如何被接住':'把今天传递到明天'}</small></div><b>→</b></button>`).join('')}</section>`;
  }else if(selected){
    const s=byId(selected),f=facility(selected);html=`<section class="inspector-section" style="--system:${s.color}"><div class="section-label"><span>正在观察 / ${s.unit}网络</span><span>${String(SYSTEMS.indexOf(s)+1).padStart(2,'0')}</span></div><div class="detail-title"><span class="system-icon">${icon(s.icon)}</span><div><h2>${f.name}</h2><small>${s.metaphor}</small></div></div><p class="detail-text">${s.text}</p><div class="section-label" style="margin-top:18px;letter-spacing:0">${DEPS.some(d=>d[1]===s.id)?'它需要这些网络持续工作':'它向全城输送服务'}</div><div class="dependency-list">${dependencyChips(s.id)}</div><p class="detail-text" style="font-size:10px">${s.detail}</p><div class="facility-info"><span>缓冲储备</span><span id="bufferText">${pct(model.buffers[s.id])}%</span></div><div class="buffer-bar"><i id="bufferValue" style="width:${pct(model.buffers[s.id])}%"></i></div><div class="detail-actions"><button class="outline-button ${model.disabled.has(s.id)?'':'danger'}" id="toggleFacility">${model.disabled.has(s.id)?'恢复主设施':'暂停主设施'}</button><button class="outline-button" id="returnOverview">返回全城</button></div></section>`;
  }else{
    html=`<section class="inspector-section"><div class="section-label"><span>今日城市观察</span><span>FIELD NOTES</span></div><h2 style="font-family:serif;font-size:20px;font-weight:400;line-height:1.65;margin:17px 0 12px">我们住在建筑里，<br>也生活在网络中。</h2><p class="detail-text">点击一座设施，看见它需要谁，又支撑着谁。九张看不见的网络，让 18.6 万人的日常持续发生。</p><div class="insight">城市的韧性，藏在平时用不上的那条备用路径里。</div><button class="outline-button" id="startJourney" style="width:100%;text-align:left">跟随一顿早餐，进入城市 <span style="float:right">→</span></button></section>`;
  }
  html+=`<section class="inspector-section"><div class="section-label"><span>城市回声</span><span id="eventCount">实时记录</span></div><div class="event-list" id="eventList"></div></section>`;
  $('#inspectorBody').innerHTML=html;
  $$('[data-dependency]').forEach(b=>b.onclick=()=>selectSystem(b.dataset.dependency));
  $$('[data-action]').forEach(b=>b.onclick=()=>{if(model.scenario.id==='normal'){toast('先选择一个故障情景，再投入应急资源。');return;}if(model.act(b.dataset.action)){renderInspector();toast(`${ACTIONS.find(a=>a.id===b.dataset.action).name}已启动 · 服务将逐渐恢复`);}});
  $$('[data-journey]').forEach(b=>b.onclick=()=>startJourney(+b.dataset.journey));
  if($('#startJourney'))$('#startJourney').onclick=()=>{setMode('story');startJourney(0);};
  if($('#toggleFacility'))$('#toggleFacility').onclick=()=>{model.toggle(selected);renderInspector();toast(model.disabled.has(selected)?'主设施已暂停 · 加速时间，观察影响怎样传播':'主设施正在恢复');};
  if($('#returnOverview'))$('#returnOverview').onclick=overview;
  updateEvents();
}
function updateEvents(){if(!$('#eventList'))return;$('#eventList').innerHTML=model.events.slice(0,mode==='emergency'?3:4).map(e=>`<div class="event"><time>${fmt(e.time)}</time><span>${e.text}</span></div>`).join('');}
function startJourney(i){journey=JOURNEYS[i];storyStep=0;view='city';$('.stage').classList.remove('graph-view');$$('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));showStoryStep();}
function showStoryStep(){if(!journey)return;const [id,title,text]=journey.steps[storyStep];selectSystem(id,false);const f=facility(id),p=project(f.x+.8,f.z+.8,0);targetCamera.x+=W*.5-p.x;targetCamera.y+=H*.5-p.y;$('#journeyOverlay').hidden=false;$('#journeyOverlay').innerHTML=`<div class="eyebrow"><span>${journey.name} / ${storyStep+1} OF ${journey.steps.length}</span><button id="closeJourney" aria-label="结束旅程">×</button></div><h3>${title}</h3><p>${text}</p><div class="journey-controls"><button id="prevStep" ${storyStep===0?'disabled':''}>← 上一步</button><span class="dots">${journey.steps.map((_,i)=>`<i class="${i===storyStep?'active':''}"></i>`).join('')}</span><button id="nextStep">${storyStep===journey.steps.length-1?'完成旅程 ✓':'继续 →'}</button></div>`;$('#prevStep').onclick=()=>{storyStep--;showStoryStep();};$('#nextStep').onclick=()=>{if(storyStep===journey.steps.length-1){journey=null;$('#journeyOverlay').hidden=true;overview();toast('旅程结束。现在，试试改变城市里的一个条件。');}else{storyStep++;showStoryStep();}};$('#closeJourney').onclick=()=>{journey=null;$('#journeyOverlay').hidden=true;overview();};}
function updateUI(){
  $('#healthNumber').textContent=pct(model.health);$('#affectedNumber').innerHTML=`${model.affected.toLocaleString()} <small>人</small>`;
  const tag=$('#healthTag');tag.textContent=model.health>.85?'运行平稳':model.health>.55?'网络承压':'应急状态';tag.className='status-tag'+(model.health>.85?'':model.health>.55?' warning':' danger');
  $('#clock').textContent=fmt(model.minute);$('#dayPeriod').textContent=model.hour<6?'深夜':model.hour<10?'早高峰':model.hour<17?'日间':model.hour<20?'晚高峰':'夜间';
  $('#timeSlider').value=Math.floor(model.minute%1440);
  for(const s of SYSTEMS){const el=$(`[data-system="${s.id}"]`);el.querySelector('.percentage').textContent=pct(model.values[s.id])+'%';el.querySelector('.health-bar i').style.width=pct(model.values[s.id])+'%';const l=$(`[data-facility="${s.id}"]`);l.querySelector('small').textContent=pct(model.values[s.id])+'%';l.style.opacity=model.values[s.id]<.4?'.75':'1';}
  if(selected&&$('#bufferText')){$('#bufferText').textContent=pct(model.buffers[selected])+'%';$('#bufferValue').style.width=pct(model.buffers[selected])+'%';}
  if(mode==='emergency'){
    const head=$('#inspectorBody .section-label span:last-child');if(head)head.textContent=`第 ${Math.floor(model.elapsed)} 分钟`;
    if(model.completed&&!successShown){successShown=true;renderInspector();toast('应急调度达成 · 城市重新呼吸了。');}
  }
  updateEvents();drawPulse();
}
function drawPulse(){const c=$('#pulseChart'),g=c.getContext('2d');g.clearRect(0,0,130,66);g.strokeStyle='#24423f';g.lineWidth=.7;for(let i=1;i<4;i++){g.beginPath();g.moveTo(0,i*16);g.lineTo(130,i*16);g.stroke();}const h=model.history.length>1?model.history:[1,1];g.strokeStyle=model.health>.7?'#9ee1c8':'#edc66c';g.lineWidth=1.4;g.beginPath();for(let i=0;i<h.length;i++){const x=i/(h.length-1)*128,y=58-h[i]*47;i===0?g.moveTo(x,y):g.lineTo(x,y);}g.stroke();g.lineTo(128,64);g.lineTo(0,64);g.closePath();const grad=g.createLinearGradient(0,0,0,66);grad.addColorStop(0,'#9ee1c825');grad.addColorStop(1,'#9ee1c800');g.fillStyle=grad;g.fill();g.fillStyle='#9ee1c8';g.beginPath();g.arc(128,58-model.health*47,2,0,Math.PI*2);g.fill();}
function setPause(){paused=!paused;$('#pause').textContent=paused?'▶':'Ⅱ';$('#pause').setAttribute('aria-label',paused?'继续模拟':'暂停模拟');}
$('#pause').onclick=setPause;$$('[data-speed]').forEach(b=>b.onclick=()=>{speed=+b.dataset.speed;$$('[data-speed]').forEach(a=>a.classList.toggle('active',a===b));});
$('#timeSlider').oninput=e=>{model.minute=Math.floor(model.minute/1440)*1440+Number(e.target.value);updateUI();};
$('#zoomIn').onclick=()=>targetCamera.zoom=clamp(targetCamera.zoom*1.2,.55,2.5);$('#zoomOut').onclick=()=>targetCamera.zoom=clamp(targetCamera.zoom/1.2,.55,2.5);
$('#rotate').onclick=()=>targetCamera.angle+=Math.PI/2;
$('#homeView').onclick=()=>targetCamera={angle:Math.PI/4,zoom:1,x:0,y:0};
function immersive(on){document.body.classList.toggle('immersive',on);autoTour=on&&!reduced;targetCamera={angle:camera.angle,zoom:on?1.15:1,x:0,y:0};resize();if(on)toast('沉浸漫游已开启 · 拖动可接管镜头 · Esc 退出');}
$('#immersive').onclick=()=>immersive(true);$('#exitImmersive').onclick=()=>immersive(false);
function applyMotion(){document.body.classList.toggle('reduced-motion',reduced);$('#motionButton').textContent='动态 '+(reduced?'减弱':'开');$('#motionButton').setAttribute('aria-pressed',reduced);if(reduced)autoTour=false;}
$('#motionButton').onclick=()=>{reduced=!reduced;applyMotion();toast(reduced?'已减少动态效果，镜头与资源流动改为静态':'已恢复动态效果');};applyMotion();
let audioCtx,gain,oscillators=[];
$('#soundButton').onclick=async()=>{try{if(!audioCtx){audioCtx=new AudioContext();gain=audioCtx.createGain();gain.gain.value=0;gain.connect(audioCtx.destination);[55,82.41,110,164.81].forEach((hz,i)=>{const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type='sine';o.frequency.value=hz;g.gain.value=.018/(i+1);o.connect(g).connect(gain);o.start();oscillators.push(o);});}await audioCtx.resume();sound=!sound;gain.gain.setTargetAtTime(sound?.5:0,audioCtx.currentTime,.6);$('#soundButton').textContent='声音 '+(sound?'开':'关');$('#soundButton').setAttribute('aria-pressed',sound);}catch{toast('当前浏览器无法播放环境音');}};
function openAbout(){$('#aboutDialog').showModal();}$('#aboutButton').onclick=openAbout;$('#modelButton').onclick=openAbout;$('#closeAbout').onclick=()=>$('#aboutDialog').close();$('#aboutDialog').onclick=e=>{if(e.target===$('#aboutDialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}};

// Canvas city: deterministic geometry and a movable axonometric camera.
function hash(a,b=0){const n=Math.sin(a*127.1+b*311.7)*43758.5453;return n-Math.floor(n);}
function project(x,z,y=0){const a=camera.angle,dx=x-7.5,dz=z-7.5;return{x:W*.5+(dx*Math.cos(a)-dz*Math.sin(a))*U+camera.x,y:H*.61+(dx*Math.sin(a)+dz*Math.cos(a))*U*.49-y*U+camera.y};}
function depth(x,z){return (x-7.5)*Math.sin(camera.angle)+(z-7.5)*Math.cos(camera.angle);}
function poly(points,fill,stroke){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=.6;ctx.stroke();}}
function plane(x,z,w,d,y,color,stroke){poly([project(x,z,y),project(x+w,z,y),project(x+w,z+d,y),project(x,z+d,y)],color,stroke);}
function line3(points,color,width=1,glow=0){ctx.beginPath();points.forEach(([x,z,y=0],i)=>{const p=project(x,z,y);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);});ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin='round';ctx.lineCap='round';if(glow){ctx.shadowColor=color;ctx.shadowBlur=glow;}ctx.stroke();ctx.shadowBlur=0;}
function shade(hex,f){const h=hex.replace('#','');const vals=[0,2,4].map(i=>clamp(Math.round(parseInt(h.slice(i,i+2),16)*f),0,255));return`rgb(${vals.join(',')})`;}
function box(x,z,w,d,h,y=0,color='#35525a',windows=false,seed=0){
  const sa=Math.sin(camera.angle),ca=Math.cos(camera.angle),p=(a,b,c)=>project(a,b,c),top=y+h;
  const xf=sa>0?x+w:x,zf=ca>0?z+d:z;
  poly([p(xf,z,y),p(xf,z+d,y),p(xf,z+d,top),p(xf,z,top)],shade(color,sa>0?.63:.72),'#1b313a');
  poly([p(x,zf,y),p(x+w,zf,y),p(x+w,zf,top),p(x,zf,top)],shade(color,ca>0?.85:.7),'#20383f');
  plane(x,z,w,d,top,shade(color,1.23),'#57767a35');
  if(windows&&view!=='underground'){
    const power=model.values.power, night=(model.hour>17||model.hour<6), floors=Math.max(1,Math.floor(h/.28));
    for(let row=0;row<floors;row++){const yy=y+.15+row*.28;if(yy+.1>top)continue;
      for(let col=0;col<3;col++){const rnd=hash(seed+row*5,col),lit=rnd<power*(night?.83:.34);ctx.globalAlpha=lit?.76:.36;
        const colorWin=lit?(rnd<.2?'#e4bb7e':'#9bc5b6'):'#233e48';const q=w/3,rz=z+(col+.2)*d/3;
        poly([p(xf+.005,rz,yy),p(xf+.005,rz+d*.13,yy),p(xf+.005,rz+d*.13,yy+.075),p(xf+.005,rz,yy+.075)],colorWin);
        const rx=x+(col+.2)*q;poly([p(rx,zf+.005,yy),p(rx+w*.13,zf+.005,yy),p(rx+w*.13,zf+.005,yy+.075),p(rx,zf+.005,yy+.075)],colorWin);
      }
    }ctx.globalAlpha=1;
  }
}
function cylinder(x,z,r,h,y,color){const p=project(x,z,y),t=project(x,z,y+h),rx=r*U,ry=r*U*.49;ctx.fillStyle=shade(color,.65);ctx.beginPath();ctx.ellipse(p.x,p.y,rx,ry,0,0,Math.PI);ctx.lineTo(t.x-rx,t.y);ctx.ellipse(t.x,t.y,rx,ry,0,Math.PI,0);ctx.closePath();ctx.fill();ctx.fillStyle=shade(color,1.2);ctx.beginPath();ctx.ellipse(t.x,t.y,rx,ry,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#87aaa855';ctx.lineWidth=.7;ctx.stroke();}
const buildings=[];
for(let x=0;x<15;x++)for(let z=0;z<15;z++){
  if(x%4===0||z%4===0||FACILITIES.some(f=>Math.abs(x-f.x)<1.8&&Math.abs(z-f.z)<1.8))continue;
  const r=hash(x,z),park=(x<5&&z>10)||(x>9&&z<5&&r>.5)||(x>4&&x<8&&z<4);
  buildings.push({x:x+.12,z:z+.12,w:.62+hash(z,x)*.2,d:.62+hash(x+7,z)*.2,h:park?0:.5+r*(x>4&&x<12?3.7:1.8),park,seed:x*29+z,color:r>.6?'#3d5c65':r>.3?'#47636a':'#324e57'});
}
function tree(x,z,s=1){const p=project(x,z,.3),t=project(x,z,.7*s);line3([[x,z,0],[x,z,.6*s]],'#416358',1.5);ctx.fillStyle='#305d4f';ctx.beginPath();ctx.ellipse(t.x,t.y,.17*U*s,.25*U*s,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#477765';ctx.beginPath();ctx.ellipse(t.x-U*.04,t.y-U*.05,.11*U*s,.17*U*s,0,0,Math.PI*2);ctx.fill();}
function drawGround(){
  // Faint atlas grid, a river edge and a raised city plinth.
  ctx.strokeStyle='#23434a20';ctx.lineWidth=.6;for(let i=-10;i<=30;i+=2){line3([[i,-10,-.48],[i,28,-.48]],'#30505819',.5);line3([[-10,i,-.48],[28,i,-.48]],'#30505819',.5);}
  plane(-3,14,24,5,-.6,'#12343f');
  for(let i=0;i<15;i++){const px=-2+hash(i)*20,pz=14.6+hash(i,4)*4;line3([[px,pz,-.58],[px+.7,pz,-.58]],'#78b3b018',.7);}
  box(-.5,-.5,16.2,15.7,.35,-.4,'#253d43');
  plane(-.5,-.5,16.2,15.7,-.045,'#162b31','#375c5d');
  for(let i=0;i<=16;i+=4){plane(i-.26,-.4,.5,15.55,.001,'#1c343c');if(i<16)plane(-.4,i-.26,16,.5,.004,'#1c343c');for(let k=0;k<30;k++){const q=k*.5;line3([[i,q,.012],[i,q+.18,.012]],'#718a7730',.7);if(i<16)line3([[q,i,.012],[q+.18,i,.012]],'#718a7730',.7);}}
  // Waterfront promenade and two small bridges.
  plane(-.4,14.9,16,.28,.04,'#53706a');
  for(const x of[3.9,11.9]){box(x-.35,14.9,.7,3,.15,-.04,'#3a5659');line3([[x-.33,15,.2],[x-.33,17.9,.2]],'#8aa998',1);line3([[x+.33,15,.2],[x+.33,17.9,.2]],'#8aa998',1);}
  for(let i=0;i<10;i++)tree(i*1.45+.6,14.65,.7);
  for(const b of buildings)if(b.park){plane(b.x-.06,b.z-.06,b.w+.12,b.d+.12,.015,'#254436','#5c7f4233');tree(b.x+.2,b.z+.2,.8);tree(b.x+.55,b.z+.5,.65);}
  // A few warm public-space light pools.
  for(let i=0;i<10;i++){const p=project(4*(i%4),4*Math.floor(i/4),.03),r=U*.45;const grad=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r);grad.addColorStop(0,`rgba(213,198,121,${model.values.power*.08})`);grad.addColorStop(1,'transparent');ctx.fillStyle=grad;ctx.beginPath();ctx.ellipse(p.x,p.y,r,r*.5,0,0,Math.PI*2);ctx.fill();}
}
function drawBuilding(b){if(b.park)return;const alpha=view==='underground'?.13:(layer==='all'?1:.6);ctx.globalAlpha=alpha;plane(b.x+.15,b.z+.15,b.w+.25,b.d+.25,.01,'#08181c55');box(b.x,b.z,b.w,b.d,b.h,0,b.color,true,b.seed);box(b.x+.13,b.z+.12,b.w*.43,b.d*.43,.12,b.h,'#587175');ctx.globalAlpha=1;}
function drawFacility(f){
  const s=byId(f.id),active=layer==='all'||layer===f.id,health=model.values[f.id],base=view==='underground'?.12:(active?1:.43);ctx.globalAlpha=base;
  plane(f.x-.15,f.z-.15,1.95,1.95,.012,active?'#28443f':'#1c353a',s.color+'33');
  const color=active?'#4b7375':'#3e5f66';
  if(f.type==='power'){
    box(f.x,f.z,1.6,1.4,.75,0,color);for(let i=0;i<3;i++){box(f.x+.17+i*.42,f.z+.2,.18,.8,.35,.75,'#70938b');line3([[f.x+.26+i*.42,f.z+.3,1.1],[f.x+.26+i*.42,f.z+.3,1.6]],s.color,1.2);}
  }else if(f.type==='water'){
    cylinder(f.x+.35,f.z+.4,.48,.7,.05,'#6b979d');cylinder(f.x+1.3,f.z+1.1,.5,.75,.05,'#6b979d');box(f.x+.8,f.z-.05,.75,.4,.65,0,color);line3([[f.x+.35,f.z+.4,.78],[f.x+.35,f.z+1.3,.78],[f.x+1.3,f.z+1.3,.78]],s.color,2);
  }else if(f.type==='tower'){
    box(f.x,f.z,1.3,1.25,.65,0,color);box(f.x+.38,f.z+.35,.55,.5,2.5,.65,'#658486',true,80);line3([[f.x+.65,f.z+.6,3.1],[f.x+.65,f.z+.6,4.5]],s.color,1.4);
    const p=project(f.x+.65,f.z+.6,4.2);ctx.strokeStyle=s.color;ctx.lineWidth=1;for(let i=0;i<3;i++){ctx.globalAlpha=base*health*(.3-i*.08);ctx.beginPath();ctx.ellipse(p.x,p.y,U*(.22+i*.15),U*(.1+i*.07),0,0,Math.PI*2);ctx.stroke();}ctx.globalAlpha=base;
  }else if(f.type==='hospital'){
    box(f.x,f.z,1.6,1.6,1.5,0,'#76908b',true,70);box(f.x+.3,f.z+.3,1,1,1.0,1.5,'#80938d',true,74);const p=project(f.x+.8,f.z+.8,2.55);ctx.fillStyle=s.color;ctx.fillRect(p.x-7,p.y-2,14,4);ctx.fillRect(p.x-2,p.y-7,4,14);
  }else if(f.type==='warehouse'){
    box(f.x,f.z,1.7,1.6,.8,0,'#6c7669');for(let i=0;i<4;i++)box(f.x+.12+i*.38,f.z+.2,.24,1.15,.08,.8,'#405e62');for(let i=0;i<3;i++)box(f.x+.1+i*.5,f.z+1.67,.34,.3,.25,0,['#a17e59','#57796c','#a17e59'][i]);
  }else if(f.type==='station'){
    plane(f.x-.2,f.z,2,1.6,.04,'#456262');for(let i=0;i<3;i++)line3([[f.x-.4,f.z+.25+i*.5,.1],[f.x+2,f.z+.25+i*.5,.1]],'#8ca79c',1);box(f.x+.2,f.z+.3,1.3,1,.8,.06,'#60847e');box(f.x+.05,f.z+.2,1.6,1.2,.12,.86,'#8eb0a0');
  }else if(f.type==='market'){
    box(f.x,f.z,1.6,1.6,.7,0,'#647d70',true,12);plane(f.x-.1,f.z-.1,1.8,1.8,.76,'#a99074');for(let i=0;i<4;i++)plane(f.x-.1+i*.45,f.z-.1,.21,1.8,.77,i%2?'#d3b995':'#a3816d');
  }else if(f.type==='school'){
    box(f.x,f.z,1.6,.55,1.1,0,'#8c8c6c',true,30);box(f.x,f.z,.5,1.55,1.1,0,'#8c8c6c',true,31);plane(f.x+.65,f.z+.72,.88,.8,.02,'#47735c','#84a58c');line3([[f.x+1.08,f.z+.75,.03],[f.x+1.08,f.z+1.5,.03]],'#b9c9ac',.6);
  }else{
    box(f.x,f.z,1.5,1.5,.4,0,color);box(f.x+.18,f.z+.18,1.1,1.1,3.4,.4,'#63858a',true,20);box(f.x+.3,f.z+.3,.85,.85,.2,3.8,'#96b2ac');line3([[f.x+.32,f.z+.32,4],[f.x+1.15,f.z+.32,4],[f.x+1.15,f.z+1.15,4]],s.color,1.4);
  }
  ctx.globalAlpha=1;
  const y=f.type==='tower'?4.5:f.type==='finance'?4:f.type==='hospital'?2.7:f.h+.2;
  const p=project(f.x+.75,f.z+.75,y+.18);
  hitAreas.push({id:f.id,x:p.x,y:p.y+U*.6,r:Math.max(20,U*1.1)});
  if(active){
    ctx.globalAlpha=.8;ctx.strokeStyle=health<.4?'#f28f9e':s.color;ctx.lineWidth=1;
    const b=project(f.x+.8,f.z+.8,.05);ctx.beginPath();ctx.ellipse(b.x,b.y,U*1.25,U*.61,0,0,Math.PI*2);ctx.stroke();
    if(selected===f.id&&!reduced){ctx.globalAlpha=.25+Math.sin(elapsed*2)*.15;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(b.x,b.y,U*1.43,U*.7,0,0,Math.PI*2);ctx.stroke();}
    ctx.globalAlpha=1;
  }
}
function networkRoute(from,to,index=0){const a=facility(from),b=facility(to),y=view==='underground'?-.12-.05*(index%4):.07;const lane=8.1+(index%5)*.05;return [[a.x+.75,a.z+.75,y],[lane,a.z+.75,y],[lane,b.z+.75,y],[b.x+.75,b.z+.75,y]];}
function pathPoint(points,t){const lens=points.slice(1).map((b,i)=>Math.hypot(b[0]-points[i][0],b[1]-points[i][1]));let n=t*lens.reduce((s,v)=>s+v,0);for(let i=0;i<lens.length;i++){if(n<=lens[i]||i===lens.length-1){const f=lens[i]?n/lens[i]:0;return points[i].map((a,j)=>mix(a,points[i+1][j],f));}n-=lens[i];}return points[0];}
function drawNetworks(){
  const show=DEPS.filter(d=>layer==='all'?['power','water','comms','transport'].includes(d[0]):d[0]===layer||d[1]===layer);
  show.forEach(([from,to,w],index)=>{
    const s=byId(from),health=Math.min(model.values[from],model.values[to]),points=networkRoute(from,to,index),hot=selected===from||selected===to;
    const color=health<.3?'#c4768150':s.color+(hot?'bb':view==='underground'?'99':'44');
    line3(points,color,hot?1.8:view==='underground'?1.5:1,hot?6:0);
    if(!reduced){for(let i=0;i<2;i++){const progress=(elapsed*.05*(.25+health)+i*.5+index*.081)%1,p3=pathPoint(points,progress),p=project(...p3);ctx.globalAlpha=.3+health*.65;ctx.fillStyle=s.color;ctx.shadowColor=s.color;ctx.shadowBlur=5;ctx.beginPath();ctx.arc(p.x,p.y,hot?2:1.4,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.globalAlpha=1;}}
  });
}
function drawTraffic(){if(reduced)return;for(let i=0;i<30;i++){const axis=i%2,lane=4*(1+(i%3)),t=(elapsed*.45*(.15+model.values.transport)+i*1.31)%15,other=(i%4<2?-.1:.1);const p=axis?project(lane+other,t,.08):project(t,lane+other,.08);ctx.fillStyle=i%5===0?'#bfcdb1':i%3===0?'#dcae86':'#8db5aa';ctx.globalAlpha=.65*model.values.transport;ctx.fillRect(p.x-1.5,p.y-.7,3,1.4);ctx.globalAlpha=1;}}
function updateLabels(){
  const key=[W,H,view,layer,selected,camera.angle.toFixed(3),camera.zoom.toFixed(3),camera.x.toFixed(1),camera.y.toFixed(1)].join('|');if(key===labelKey)return;labelKey=key;
  const mobile=W<500,placed=[];const ordered=[...FACILITIES].sort((a,b)=>(a.id===selected?-1:0)-(b.id===selected?-1:0));for(const f of ordered){const l=$(`[data-facility="${f.id}"]`),y=f.type==='tower'?4.6:f.type==='finance'?4.15:f.type==='hospital'?2.8:f.h+.3,p=project(f.x+.75,f.z+.75,y);
    const should=view!=='graph'&&(layer==='all'?(!mobile||['water','hospital','retail','comms'].includes(f.id)):f.id===layer||DEPS.some(d=>d[0]===f.id&&d[1]===layer));
    l.hidden=!should||p.x<35||p.x>W-35||p.y<55||p.y>H-45;
    if(!l.hidden){const width=mobile?80:118;let top=p.y-10,tries=0;while(placed.some(b=>Math.abs(b.x-p.x)<(b.width+width)/2+5&&Math.abs(b.y-top)<29)&&tries++<6)top-=30;placed.push({x:p.x,y:top,width});l.style.left=p.x+'px';l.style.top=top+'px';l.style.setProperty('--stem-length',(p.y-top+2)+'px');}
    l.classList.toggle('selected',selected===f.id);
  }
}
function drawGraph(){
  graphHits=[];const cx=W/2,cy=H*.55,r=Math.min(W*.33,H*.27),positions={};
  SYSTEMS.forEach((s,i)=>{const a=i/9*Math.PI*2-Math.PI/2;positions[s.id]={x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r};});
  for(const[from,to,w]of DEPS){const a=positions[from],b=positions[to],sel=layer==='all'||from===layer||to===layer;ctx.globalAlpha=sel?(layer==='all'?.24:.75):.055;ctx.strokeStyle=byId(from).color;ctx.lineWidth=.7+w*2;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();const ang=Math.atan2(b.y-a.y,b.x-a.x),end={x:b.x-Math.cos(ang)*24,y:b.y-Math.sin(ang)*24};ctx.fillStyle=byId(from).color;poly([end,{x:end.x-Math.cos(ang-.5)*7,y:end.y-Math.sin(ang-.5)*7},{x:end.x-Math.cos(ang+.5)*7,y:end.y-Math.sin(ang+.5)*7}],byId(from).color);if(!reduced&&sel){const t=(elapsed*.11+SYSTEMS.findIndex(s=>s.id===from)*.23)%1;ctx.globalAlpha=sel?.7:.08;ctx.beginPath();ctx.arc(mix(a.x,b.x,t),mix(a.y,b.y,t),1.7,0,Math.PI*2);ctx.fill();}}
  ctx.globalAlpha=1;
  for(const s of SYSTEMS){const p=positions[s.id],hot=selected===s.id;ctx.fillStyle=hot?'#2d4a43':'#12282e';ctx.strokeStyle=s.color;ctx.lineWidth=hot?2:1;ctx.beginPath();ctx.arc(p.x,p.y,22,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle=s.color;ctx.font='12px ui-monospace,monospace';ctx.textAlign='center';ctx.fillText(pct(model.values[s.id])+'%',p.x,p.y+4);ctx.font='11px system-ui';ctx.fillStyle='#c1d6d0';ctx.fillText(s.name,p.x,p.y+39);graphHits.push({id:s.id,x:p.x,y:p.y,r:30});}
  ctx.textAlign='center';ctx.fillStyle='#6c8b92';ctx.font='9px system-ui';ctx.fillText('箭头表示供给方向 · 线宽表示本模型的依赖权重',W/2,H-25);ctx.textAlign='left';
}
function draw(){
  ctx=displayCtx;ctx.clearRect(0,0,W,H);
  if(view==='graph'){drawGraph();return;}
  const key=[W,H,view,layer,selected,camera.angle.toFixed(3),U.toFixed(2),camera.x.toFixed(1),camera.y.toFixed(1),Math.floor(model.hour*2),...SYSTEMS.map(s=>Math.floor(model.values[s.id]*20))].join('|');
  if(key!==sceneKey){
    sceneKey=key;hitAreas=[];ctx=sceneCtx;ctx.clearRect(0,0,W,H);drawGround();
    const items=[...buildings.map(b=>({type:'b',obj:b,d:depth(b.x+.5,b.z+.5)})),...FACILITIES.map(f=>({type:'f',obj:f,d:depth(f.x+.8,f.z+.8)}))].sort((a,b)=>a.d-b.d);
    for(const item of items)item.type==='b'?drawBuilding(item.obj):drawFacility(item.obj);
    ctx=displayCtx;
  }
  ctx.drawImage(sceneCanvas,0,0,sceneCanvas.width,sceneCanvas.height,0,0,W,H);
  drawNetworks();drawTraffic();
  if(model.scenario.id==='flood'&&!reduced){ctx.strokeStyle='#91bdc43a';ctx.lineWidth=.6;for(let i=0;i<80;i++){const x=(hash(i,4)*W+elapsed*8)%W,y=(hash(i,6)*H+elapsed*160)%H;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-3,y+10);ctx.stroke();}}
  if(model.hour>19||model.hour<5){ctx.fillStyle='#07101c18';ctx.fillRect(0,0,W,H);}
}
function resize(){const rect=canvas.getBoundingClientRect();W=rect.width;H=rect.height;DPR=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(W*DPR);canvas.height=Math.round(H*DPR);sceneCanvas.width=canvas.width;sceneCanvas.height=canvas.height;displayCtx.setTransform(DPR,0,0,DPR,0,0);sceneCtx.setTransform(DPR,0,0,DPR,0,0);sceneKey='';labelKey='';U=Math.min(W/23,H/17)*camera.zoom;updateLabels();}
new ResizeObserver(resize).observe($('.stage'));
canvas.addEventListener('pointerdown',e=>{autoTour=false;pointer={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(pointer&&pointer.id===e.pointerId){const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;if(Math.hypot(e.clientX-pointer.startX,e.clientY-pointer.startY)>5)pointer.moved=true;if(pointer.moved){targetCamera.x+=dx;targetCamera.y+=dy;camera.x=targetCamera.x;camera.y=targetCamera.y;}pointer.x=e.clientX;pointer.y=e.clientY;}else{const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;hovered=(view==='graph'?graphHits:hitAreas).slice().reverse().find(p=>Math.hypot(p.x-x,p.y-y)<p.r)?.id;canvas.style.cursor=hovered?'pointer':'grab';}});
canvas.addEventListener('pointerup',e=>{if(pointer&&!pointer.moved){const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;const f=(view==='graph'?graphHits:hitAreas).slice().reverse().find(p=>Math.hypot(p.x-x,p.y-y)<p.r);if(f)selectSystem(f.id,false);}pointer=null;});
canvas.addEventListener('pointercancel',()=>pointer=null);
canvas.addEventListener('wheel',e=>{e.preventDefault();autoTour=false;targetCamera.zoom=clamp(targetCamera.zoom*Math.exp(-e.deltaY*.001),.55,2.5);},{passive:false});
document.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(k==='escape'&&document.body.classList.contains('immersive')){immersive(false);return;}if(['INPUT','BUTTON','TEXTAREA'].includes(e.target.tagName)||$('#aboutDialog').open)return;if(k===' '){e.preventDefault();setPause();}if(k==='q')targetCamera.angle-=Math.PI/4;if(k==='e')targetCamera.angle+=Math.PI/4;if(k.startsWith('arrow')){e.preventDefault();autoTour=false;targetCamera.x+=k==='arrowleft'?30:k==='arrowright'?-30:0;targetCamera.y+=k==='arrowup'?30:k==='arrowdown'?-30:0;}});
document.addEventListener('visibilitychange',()=>{lastFrame=0;if(audioCtx)gain.gain.setTargetAtTime(sound&&!document.hidden?.5:0,audioCtx.currentTime,.2);});
function frame(now){
  if(now-lastRender<32){requestAnimationFrame(frame);return;}lastRender=now;
  const dt=lastFrame?Math.min((now-lastFrame)/1000,.1):0;lastFrame=now;
  if(!paused&&!document.hidden){elapsed+=dt;model.tick(dt*.8*speed);}
  if(autoTour&&!reduced&&!paused)targetCamera.angle+=dt*.025;
  const lerp=reduced?1:1-Math.exp(-dt*7);for(const key of['angle','zoom','x','y'])camera[key]=mix(camera[key],targetCamera[key],lerp);
  U=Math.min(W/23,H/17)*camera.zoom;
  draw();updateLabels();if(now-lastUI>350){updateUI();lastUI=now;}
  requestAnimationFrame(frame);
}
renderInspector();resize();updateUI();requestAnimationFrame(frame);
