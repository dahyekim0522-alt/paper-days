// StPageFlip 2.0.7 doesn't cancel its render loop on destroy. Scope only its
// synchronous frame scheduling and cancel outstanding frames on unmount.
export function animationScope() {
 const native=window.requestAnimationFrame.bind(window);const ids=new Set<number>();let stopped=false;
 const request=(callback:FrameRequestCallback):number=>{
  if(stopped)return 0;
  const id=native(time=>{ids.delete(id);if(stopped)return;run(()=>callback(time));});ids.add(id);return id;
 };
 function run<T>(work:()=>T):T {const previous=window.requestAnimationFrame;window.requestAnimationFrame=request;try{return work();}finally{window.requestAnimationFrame=previous;}}
 return {run,stop:()=>{stopped=true;ids.forEach(id=>cancelAnimationFrame(id));ids.clear();}};
}
