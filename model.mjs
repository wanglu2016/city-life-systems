// An illustrative model, with explicit assumptions. No real-city telemetry.
export const SYSTEMS = [
  {id:'power', name:'电力', en:'ENERGY', color:'#edc66c', icon:'power', unit:'能量', metaphor:'城市的心跳', text:'发电、变电、配电。电流看不见，却让水泵、基站、信号灯和冰箱同时工作。', detail:'负荷随一天变化；备用电源能暂时支撑关键设施。', reserve:0},
  {id:'comms', name:'通信', en:'COMMUNICATION', color:'#aa9df1', icon:'comms', unit:'信息', metaphor:'城市的神经', text:'基站与光纤连接求助、调度、交易和人与人。信号中断时，城市仍在，却很难协作。', detail:'本模型中，基站电池能缓冲约 30 分钟的供电不足。', reserve:30},
  {id:'water', name:'供水', en:'WATER', color:'#66c9ed', icon:'water', unit:'清水', metaphor:'城市的循环', text:'水厂净化，泵站加压，管网送到每一层楼。停电并不意味着水龙头立刻干涸。', detail:'本模型中，蓄水与管压提供约 20 分钟缓冲。', reserve:20},
  {id:'hospital', name:'医疗', en:'HEALTHCARE', color:'#f28f9e', icon:'hospital', unit:'救治', metaphor:'城市的免疫', text:'一次急救依赖接警、通行、供电与清洁用水。医院的韧性来自整条链路的冗余。', detail:'本模型中，医院备用供电提供约 60 分钟缓冲，但无法替代交通与供水。', reserve:60},
  {id:'logistics', name:'物流', en:'LOGISTICS', color:'#e5a574', icon:'logistics', unit:'物资', metaphor:'城市的代谢', text:'仓储、冷链与配送，让一座不生产全部生活必需品的城市每天醒来。', detail:'库存吸收短期波动；交通受阻后，影响会慢慢传到货架。', reserve:40},
  {id:'transport', name:'交通', en:'MOBILITY', color:'#72d1ae', icon:'transport', unit:'出行', metaphor:'城市的血管', text:'道路、轨道和路口组成移动网络。通勤、救护与补货共享同一段路。', detail:'停电影响信号控制，暴雨直接压低道路通行能力。', reserve:8},
  {id:'retail', name:'零售', en:'RETAIL', color:'#df9bc5', icon:'retail', unit:'生活', metaphor:'城市的餐桌', text:'货物抵达、冷柜运转、支付成功，一次看似简单的购买才得以完成。', detail:'库存让供应中断延后显现；人工结算可缓解数字支付故障。', reserve:35},
  {id:'school', name:'学校', en:'EDUCATION', color:'#a8c87b', icon:'school', unit:'成长', metaphor:'城市的记忆', text:'校园需要水电与网络，也依赖学生、教师能安全抵达。它把今天的城市传向明天。', detail:'学校对交通与水电的依赖在上学时段更明显。', reserve:15},
  {id:'finance', name:'支付金融', en:'FINANCE', color:'#7fa6ed', icon:'finance', unit:'信任', metaphor:'城市的信用', text:'一笔交易连接终端、通信、清算与供电。数字效率很高，备用路径也同样重要。', detail:'应急通信和线下人工结算，能为基本生活保留一条通道。', reserve:10}
];
export const DEPS = [
  ['logistics','power',.07,'燃料与检修物资'],['comms','power',.06,'电网监测与调度'],
  ['power','comms',.78,'基站与交换设备供电'],
  ['power','water',.79,'净水与泵站供电'],['comms','water',.08,'水压监测与远程控制'],
  ['power','hospital',.29,'诊疗设备与备用电源'],['water','hospital',.24,'清洁用水与消毒'],['comms','hospital',.2,'接警与医疗协作'],['transport','hospital',.22,'救护车与人员到达'],
  ['transport','logistics',.61,'货车与末端配送'],['comms','logistics',.16,'订单与路线调度'],['power','logistics',.12,'仓储冷链供电'],
  ['power','transport',.36,'信号灯与轨道供电'],['comms','transport',.14,'路网调度与出行信息'],
  ['logistics','retail',.42,'补货与库存'],['finance','retail',.29,'收银与支付'],['power','retail',.2,'照明与冷藏'],
  ['transport','school',.28,'师生到校'],['power','school',.2,'教学设施运行'],['water','school',.28,'饮水与卫生'],['comms','school',.1,'教学与家校联络'],
  ['comms','finance',.69,'交易信息与清算连接'],['power','finance',.23,'终端与数据设施供电']
];
export const FACILITIES = [
  {id:'power', x:2, z:3, h:1.6, name:'北岸变电站', type:'power'},
  {id:'comms', x:10, z:2, h:3.6, name:'云端通信塔', type:'tower'},
  {id:'water', x:1, z:10, h:1.1, name:'清源水厂', type:'water'},
  {id:'hospital', x:10, z:6, h:2.0, name:'城市中心医院', type:'hospital'},
  {id:'logistics', x:13, z:10, h:1.0, name:'东港物流中心', type:'warehouse'},
  {id:'transport', x:6, z:10, h:.8, name:'中央交通枢纽', type:'station'},
  {id:'retail', x:6, z:6, h:1.1, name:'四季生活市场', type:'market'},
  {id:'school', x:2, z:6, h:1.0, name:'梧桐学校', type:'school'},
  {id:'finance', x:10, z:10, h:3.4, name:'城市清算中心', type:'finance'}
];
export const SCENARIOS = [
  {id:'normal', icon:'sun', name:'平常的一天', sub:'九张网络，同步呼吸', text:'从一次寻常的购买开始，看看整座城市如何在背后协作。', impacts:{}},
  {id:'blackout', icon:'power', name:'突发停电', sub:'当心跳突然放慢', text:'主变电站故障。观察电池、蓄水与备用电源，如何让影响分批出现。', impacts:{power:.08}},
  {id:'flood', icon:'water', name:'暴雨内涝', sub:'被切断的最后一公里', text:'低洼道路积水、配送受阻。路网的损伤会传导到医院、学校与货架。', impacts:{transport:.25,water:.68,logistics:.62}},
  {id:'network', icon:'comms', name:'通信中断', sub:'城市失去协调之后', text:'主干通信故障。支付、接警与调度先后受影响，但水电不会立刻消失。', impacts:{comms:.08}},
  {id:'supply', icon:'logistics', name:'物流受阻', sub:'货架会立刻空掉吗', text:'外部货运中断。库存先承担压力，随后零售和电力保障开始承压。', impacts:{logistics:.1}},
  {id:'heat', icon:'sun', name:'高温高峰', sub:'每一度电都在竞争', text:'晚高峰叠加高温，用电与供水需求增长，电网可用能力下降。', impacts:{power:.63,water:.8}}
];
export const ACTIONS = [
  {id:'generator', name:'启动备用电源', cost:3, text:'电力底线 68%，医院额外保障', icon:'power'},
  {id:'mobile', name:'架设应急通信', cost:2, text:'通信底线提升至 72%', icon:'comms'},
  {id:'tank', name:'开放应急水源', cost:2, text:'供水底线提升至 75%', icon:'water'},
  {id:'dispatch', name:'开辟应急通道', cost:2, text:'交通底线 72%，保障配送', icon:'transport'},
  {id:'manual', name:'启用人工结算', cost:1, text:'零售、基本支付各保底 75%', icon:'finance'},
  {id:'repair', name:'组织联动抢修', cost:4, text:'将各故障源恢复至至少 85%', icon:'repair'}
];
export const JOURNEYS = [
  {name:'一顿早餐', icon:'retail', steps:[['power','05:30 · 城市先于你醒来','电力送到水厂、仓库与早餐店。你还没起床，城市已经开始为这顿早餐工作。'],['water','05:45 · 水先走了很长的路','净化、加压、输送。揉面用的一盆水，背后是一整套持续运行的设备。'],['logistics','06:10 · 食材穿过城市','面粉、牛奶与蔬菜从仓库送来。冷链保鲜，路网把它们送到最后一公里。'],['retail','07:20 · 热气升起','商店把远方的物资变成眼前的生活。照明、冷柜与食品加工都需要能源。'],['finance','07:21 · 一次扫码的距离','终端通过通信网络完成支付。这一分钟里，你已经与城市的多张网络发生关系。']]},
  {name:'一次急救', icon:'hospital', steps:[['comms','00:00 · 求助被听见','急救从一条能被传达的消息开始。通信把一个人的困境变成整个系统的行动。'],['transport','00:03 · 让出一条生命通道','车辆、司机、信号灯与路线调度共同决定救护车多久能够抵达。'],['hospital','00:15 · 医院接住一个人','诊疗是眼前发生的事，水、电、信息和物资则在背后维持每一个环节。'],['power','00:16 · 不允许中断的电','备用电源争取时间。冗余的价值，在平常的效率指标里往往难以看见。'],['water','00:20 · 无声的保障','清洁与消毒需要稳定的水。城市的韧性，来自最弱的一环也有第二条路。']]},
  {name:'上学的一天', icon:'school', steps:[['transport','07:00 · 千万人同时出发','每个人的最短路线，汇成全城的拥堵。道路还要同时服务配送与急救。'],['school','08:00 · 一间教室亮起来','学生与教师抵达，饮水与卫生设施运行，今天的学习才有了空间。'],['comms','09:00 · 知识越过围墙','网络传递课程、通知与家校联络。连接既带来便利，也带来新的依赖。'],['retail','12:00 · 一份午餐','食堂与校园周边商店，将物流、能源和供水汇入每一个人的日常。']]}
];
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
export class CityModel {
  constructor(){this.reset();}
  reset(scenario='normal'){
    this.scenario=SCENARIOS.find(s=>s.id===scenario)||SCENARIOS[0]; this.elapsed=0; this.pending=0; this.minute=8*60; this.budget=10; this.actions=new Set(); this.disabled=new Set(); this.values=Object.fromEntries(SYSTEMS.map(s=>[s.id,1])); this.buffers=Object.fromEntries(SYSTEMS.map(s=>[s.id,1])); this.repaired=false; this.history=[1]; this.lastSample=0; this.events=[]; this.lastBand={}; this.completed=false; this.record('city',this.scenario.id==='normal'?'城市正在平稳运行。':this.scenario.text); return this;
  }
  get health(){return SYSTEMS.reduce((s,d)=>s+this.values[d.id],0)/SYSTEMS.length;}
  get affected(){return Math.round(186000*(1-this.health));}
  get hour(){return (this.minute/60)%24;}
  record(id,text){this.events.unshift({id,text,time:this.minute});this.events=this.events.slice(0,30);}
  target(id,previous){
    let source=this.scenario.impacts[id]??1;
    if(this.repaired) source=Math.max(.85,source);
    if(this.disabled.has(id)) source=Math.min(source,.05);
    let penalty=0;
    for(const [from,to,w] of DEPS) if(to===id){
      let service=previous[from];
      // Stored energy/water/inventory absorbs only upstream loss, not direct damage.
      service=service+(1-service)*this.buffers[id]*.83;
      penalty+=w*(1-service);
    }
    let result=source*clamp(1-penalty);
    if(this.scenario.id==='heat'&&!this.repaired)result*=id==='power'?(.97-.06*Math.sin(this.hour/24*Math.PI)**2):1;
    const floor={power:this.actions.has('generator')?.68:0,comms:this.actions.has('mobile')?.72:0,water:this.actions.has('tank')?.75:0,hospital:this.actions.has('generator')?.78:0,transport:this.actions.has('dispatch')?.72:0,logistics:this.actions.has('dispatch')?.6:0,retail:this.actions.has('manual')?.75:0,finance:this.actions.has('manual')?.75:0};
    return clamp(Math.max(result,floor[id]||0));
  }
  tick(minutes){
    if(!Number.isFinite(minutes)||minutes<=0)return;
    this.pending+=Math.min(minutes,1440);
    while(this.pending>=.25-1e-9){const dt=.25;this.pending=Math.max(0,this.pending-dt);this.elapsed+=dt;this.minute+=dt;const prev={...this.values};
      for(const s of SYSTEMS){
        const deps=DEPS.filter(d=>d[1]===s.id);const upstream=deps.length?Math.min(...deps.map(d=>prev[d[0]])):1;
        if(upstream<.8)this.buffers[s.id]=clamp(this.buffers[s.id]-dt/Math.max(s.reserve,1));
        else this.buffers[s.id]=clamp(this.buffers[s.id]+dt/20);
        const target=this.target(s.id,prev);const tau=(this.scenario.impacts[s.id]!==undefined||this.disabled.has(s.id))?3:8;
        this.values[s.id]=clamp(prev[s.id]+(target-prev[s.id])*(1-Math.exp(-dt/tau)));
        const band=this.values[s.id]<.4?2:this.values[s.id]<.75?1:0;
        if(band!==(this.lastBand[s.id]||0)){this.record(s.id,`${s.name}${band===2?'服务严重受损':band===1?'服务能力下降':'服务逐渐恢复'}。`);this.lastBand[s.id]=band;}
      }
    }
    if(this.elapsed-this.lastSample>=.5){this.history.push(this.health);this.history=this.history.slice(-100);this.lastSample=this.elapsed;}
    if(this.scenario.id!=='normal'&&!this.completed&&this.elapsed>=30&&this.actions.size>0&&this.health>=.83){this.completed=true;this.record('city','基本服务已恢复到 83% 以上，应急调度达成。');}
  }
  act(id){const action=ACTIONS.find(a=>a.id===id);if(!action||this.actions.has(id)||this.budget<action.cost)return false;this.actions.add(id);this.budget-=action.cost;if(id==='repair')this.repaired=true;this.record('city',`${action.name}已执行，消耗 ${action.cost} 点资源。`);return true;}
  toggle(id){if(!SYSTEMS.some(s=>s.id===id))return;this.disabled.has(id)?this.disabled.delete(id):this.disabled.add(id);this.record(id,`${SYSTEMS.find(s=>s.id===id).name}主设施已${this.disabled.has(id)?'暂停':'恢复'}。`);}
}
