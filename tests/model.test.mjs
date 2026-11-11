import assert from 'node:assert/strict';
import {CityModel,SYSTEMS,SCENARIOS,ACTIONS,DEPS,FACILITIES,JOURNEYS} from '../model.mjs';

// A healthy city stays stable; outages travel over time rather than changing every network instantly.
const stable=new CityModel();stable.tick(1440);assert.equal(stable.health,1);
const blackout=new CityModel().reset('blackout');blackout.tick(5);
assert(blackout.values.power<.3,'Power should fail before downstream networks');
assert(blackout.values.hospital>.95,'Hospital backup should initially absorb upstream loss');
assert(blackout.values.water>.9,'Water storage should initially absorb upstream loss');
blackout.tick(60);assert(blackout.values.water<.3,'Water should be affected after storage is depleted');assert(blackout.values.hospital<.5,'Backup must not make hospitals independent indefinitely');

// A targeted communications fault should be different from a power fault.
const network=new CityModel().reset('network');network.tick(75);
assert(network.values.finance<.4);assert(network.values.power>.85);assert(network.values.water>.85);

// Resources are finite; replay and frame rate cannot change the simulated dynamics.
const rescue=new CityModel().reset('blackout');rescue.tick(50);const injured=rescue.health;
assert(rescue.act('generator'));assert(!rescue.act('generator'));assert(rescue.act('repair'));assert(rescue.act('mobile'));assert.equal(rescue.budget,1);assert(!rescue.act('tank'));rescue.tick(100);assert(rescue.health>injured+.4);assert(rescue.completed);
const a=new CityModel().reset('flood'),b=new CityModel().reset('flood');a.tick(60);for(let i=0;i<6000;i++)b.tick(.01);for(const s of SYSTEMS)assert(Math.abs(a.values[s.id]-b.values[s.id])<1e-9);
const interrupted=new CityModel();interrupted.toggle('power');interrupted.tick(70);assert(interrupted.health<.5);interrupted.toggle('power');interrupted.tick(120);assert(interrupted.health>.95);

// Every scenario has at least one successful resource allocation within the budget.
for(const sc of SCENARIOS.filter(s=>s.id!=='normal')){
  let solvable=false;
  for(let mask=1;mask<(1<<ACTIONS.length);mask++){
    const actions=ACTIONS.filter((_,i)=>mask&(1<<i));if(actions.reduce((s,a)=>s+a.cost,0)>10)continue;
    const m=new CityModel().reset(sc.id);m.tick(45);for(const action of actions)m.act(action.id);m.tick(180);
    for(const value of Object.values(m.values))assert(Number.isFinite(value)&&value>=0&&value<=1);
    if(m.completed)solvable=true;
  }
  assert(solvable,`${sc.id} should offer a successful rescue path`);
}
const ids=new Set(SYSTEMS.map(s=>s.id));for(const[a,b]of DEPS)assert(ids.has(a)&&ids.has(b));assert.equal(FACILITIES.length,9);for(const j of JOURNEYS)for(const[id]of j.steps)assert(ids.has(id));
rescue.reset();assert.equal(rescue.budget,10);assert.equal(rescue.health,1);assert.equal(rescue.actions.size,0);assert.equal(rescue.disabled.size,0);assert(!rescue.completed);
console.log('Passed: stability, delayed cascades, fault differentiation, recovery, resource limits, fixed-step replay, all scenario rescue paths, reset and content integrity.');
