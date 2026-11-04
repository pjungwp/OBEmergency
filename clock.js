// SessionClock: one interface over the real-time and simulation clocks.
// The live clock is wall time since start; its write methods throw.
// Session fields used: mode, elapsedBase, running, lastTickAt.

export class LiveClockError extends Error{}

export function createSessionClock(session,wall=()=>Date.now()){
  const simulated=session.mode==="simulation";
  const guard=()=>{if(!simulated)throw new LiveClockError("The live clock cannot be paused or advanced. Start a separate simulation.");};
  const clock={
    isSimulated:simulated,
    now(){return session.elapsedBase+(session.running?wall()-session.lastTickAt:0);},
    pause(){guard();if(session.running){session.elapsedBase=clock.now();session.running=false;session.lastTickAt=wall();}},
    resume(){guard();if(!session.running){session.running=true;session.lastTickAt=wall();}},
    advance(ms){guard();if(!(ms>=0))throw new RangeError("Advance must be zero or more");session.elapsedBase=clock.now()+ms;session.lastTickAt=wall();},
    stop(){session.elapsedBase=clock.now();session.running=false;session.lastTickAt=wall();}
  };
  return clock;
}

// Events the simulation clock passed when it jumped from `fromMs` to `toMs`.
export function crossed(items,fromMs,toMs){return items.filter(x=>x.atMs>fromMs&&x.atMs<=toMs).sort((a,b)=>a.atMs-b.atMs);}
