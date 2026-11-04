import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
interface PWAState {
  online: boolean; offlineReady: boolean; needsUpdate: boolean; installed: boolean;
  canInstall: boolean; secure: boolean; ios: boolean; registrationError: boolean;
  install: () => Promise<void>; update: () => Promise<void>;
}
const Context = createContext<PWAState | null>(null);
export const usePWA = () => { const context = useContext(Context); if (!context) throw new Error('PWAProvider is required'); return context; };
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || !!(navigator as Navigator & {standalone?:boolean}).standalone;

export default function PWAProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState(navigator.onLine);
  const [installed, setInstalled] = useState(isStandalone);
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [registrationError, setRegistrationError] = useState(false);
  const { offlineReady: [offlineReady, setOfflineReady], needRefresh: [needsUpdate] } = useRegisterSW({
    onNeedReload: () => {}, // Reload only after this tab explicitly requests an update.
    onRegisterError: () => setRegistrationError(true),
    onRegisteredSW: (_url, registration) => {
      // Check on the next visit/focus; do not poll or replace a worker mid-edit.
      if (registration?.active && navigator.serviceWorker.controller) setOfflineReady(true);
      if (registration && navigator.onLine) void registration.update().catch(() => {});
    },
  });
  useEffect(() => {
    const media = matchMedia('(display-mode: standalone)');
    const updateOnline = () => setOnline(navigator.onLine);
    const onPrompt = (event:Event) => { event.preventDefault(); setPrompt(event as InstallPrompt); };
    const onInstalled = () => { setInstalled(true); setPrompt(null); };
    const display = () => setInstalled(isStandalone());
    window.addEventListener('online', updateOnline); window.addEventListener('offline', updateOnline);
    window.addEventListener('beforeinstallprompt', onPrompt); window.addEventListener('appinstalled', onInstalled);
    const checkUpdate=(event:MessageEvent)=>{if(event.data?.type==='PAPER_DAYS_CHECK_UPDATE')event.ports[0]?.postMessage(!document.querySelector('dialog[open]'));};
    navigator.serviceWorker?.addEventListener('message',checkUpdate);
    media.addEventListener('change', display);
    return () => {
      window.removeEventListener('online', updateOnline); window.removeEventListener('offline', updateOnline);
      window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled);
      navigator.serviceWorker?.removeEventListener('message',checkUpdate);
      media.removeEventListener('change', display);
    };
  }, []);
  const install = async () => {
    if (!prompt) return;
    try { await prompt.prompt(); const choice = await prompt.userChoice; if (choice.outcome === 'accepted') setPrompt(null); }
    finally { setPrompt(null); }
  };
  const update = async () => {
    // Other open tabs can also be editing. Refuse activation until all controlled
    // tabs are closed/reopened by the user; the SW itself never skips automatically.
    if (document.querySelector('dialog[open]')) return;
    const registration=await navigator.serviceWorker.getRegistration();
    if(!registration?.waiting)throw new Error('업데이트를 준비하지 못했어요. 잠시 후 다시 시도해 주세요.');
    const ready=await new Promise<boolean>(resolve=>{
      const channel=new MessageChannel();
      const timer=setTimeout(()=>{channel.port1.close();resolve(false);},5000);
      channel.port1.onmessage=event=>{clearTimeout(timer);channel.port1.close();resolve(event.data===true);};
      registration.waiting!.postMessage({type:'PAPER_DAYS_CHECK_CLIENTS'},[channel.port2]);
    });
    if(!ready)throw new Error('다른 창에서 쓰던 기록도 저장하고 닫은 뒤 다시 업데이트해 주세요.');
    await new Promise<void>((resolve,reject)=>{
      const changed=()=>{clearTimeout(timer);resolve();window.location.reload();};
      const timer=setTimeout(()=>{navigator.serviceWorker.removeEventListener('controllerchange',changed);reject(new Error('업데이트를 마치지 못했어요. 다른 창을 닫고 다시 시도해 주세요.'));},15000);
      navigator.serviceWorker.addEventListener('controllerchange',changed,{once:true});
      registration.waiting!.postMessage({type:'SKIP_WAITING'});
    });
  };
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return <Context.Provider value={{online,offlineReady,needsUpdate,installed,canInstall:!!prompt,secure:window.isSecureContext,ios,registrationError,install,update}}>{children}</Context.Provider>;
}
