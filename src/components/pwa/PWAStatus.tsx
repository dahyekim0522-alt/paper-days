import { useState } from 'react';
import { Download, RefreshCw, WifiOff, X } from 'lucide-react';
import { usePWA } from './PWAProvider';

export default function PWAStatus({editing}:{editing:boolean}) {
  const pwa=usePWA();const [dismissed,setDismissed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  return <>
    {!pwa.online && <div className="pwa-notice" role="status"><WifiOff size={16}/><span>오프라인이에요. 일기와 사진은 이 기기에 계속 저장돼요.</span></div>}
    {pwa.needsUpdate ? <div className="pwa-notice"><RefreshCw size={16}/><span>{editing?'새 버전이 있어요. 기록을 저장하고 닫은 뒤 업데이트해 주세요.':'새 버전이 준비됐어요. 다른 창에서 쓰던 기록도 저장한 뒤 업데이트해 주세요.'}</span><button className="text-button" disabled={editing||busy} onClick={()=>{if(document.querySelector('dialog[open]'))return;setBusy(true);void pwa.update().catch((e:unknown)=>{setBusy(false);setError(e instanceof Error?e.message:'업데이트하지 못했어요. 인터넷 연결 후 다시 시도해 주세요.');});}}>업데이트</button></div>
    : !dismissed && pwa.canInstall && !pwa.installed && <div className="pwa-notice"><Download size={16}/><span>다이어리를 홈 화면에 설치해 보세요.</span><button className="text-button" onClick={()=>{void pwa.install().catch(()=>setError('설정에서 설치 방법을 확인해 주세요.'));}}>설치하기</button><button className="icon-button" aria-label="설치 안내 닫기" onClick={()=>setDismissed(true)}><X size={16}/></button></div>}
    {error && <p className="error" role="alert">{error}</p>}
  </>;
}
