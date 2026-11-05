// Back-button guard for the installed app (Android back / browser back).
// Keeps one history entry above the page so "back" runs onBack() instead of leaving.
// onBack() returns true when it handled the press (closed a sheet, went to the previous
// screen…); false lets the press leave the page as normal.
// Chrome ignores history entries pushed without a user gesture, so the guard is armed
// on the first tap/keypress and re-armed after each handled back.
export function installBackGuard(onBack){
  if(window.__GAS||!("pushState" in history))return; // Apps Script runs in a sandboxed frame: leave back alone
  try{history.replaceState({...(history.state||{}),bg:0},"");}catch{return;}
  let armed=false,leaving=false;
  const arm=()=>{if(armed||leaving)return;armed=true;try{history.pushState({bg:1},"");}catch{}};
  addEventListener("pointerdown",arm,true);addEventListener("keydown",arm,true);
  addEventListener("popstate",e=>{
    if(leaving||e.state?.bg!==0)return;
    armed=false;
    let handled=false;try{handled=!!onBack();}catch{}
    if(handled)arm();else{leaving=true;history.back();}
  });
}
