import { useState } from 'react';
import { Download, Smartphone, WifiOff } from 'lucide-react';
import { usePWA } from './PWAProvider';

export default function InstallCard() {
  const pwa = usePWA();
  const [error, setError] = useState('');
  return <section className="install-card" aria-label="휴대폰 앱 설치">
    <div className="install-title"><Smartphone size={21}/><h3>{pwa.installed ? '앱으로 사용하고 있어요' : '홈 화면에서 바로 열어요'}</h3></div>
    <p>홈 화면에 설치하면 PC를 켜지 않아도 내 다이어리를 열 수 있어요.</p>
    {!pwa.secure ? <p className="install-help">설치는 HTTPS 인터넷 주소에서 가능해요. 지금처럼 PC의 숫자 주소로 접속한 화면에서는 설치할 수 없어요.</p>
      : !pwa.installed && (pwa.canInstall
        ? <button className="button primary" onClick={() => {void pwa.install().catch(() => setError('설치 창을 열지 못했어요. 브라우저 메뉴에서 설치를 선택해 주세요.'));}}><Download size={16}/>앱 설치하기</button>
        : <p className="install-help">{pwa.ios ? '아이폰: Safari에서 아래쪽 공유 버튼을 누른 뒤 ‘홈 화면에 추가’를 선택하세요. 브라우저 버전에 따라 ‘웹 앱으로 열기’를 켜 주세요.' : '안드로이드: Chrome 메뉴(⋮)에서 ‘앱 설치’ 또는 ‘홈 화면에 추가’를 선택하세요. PC에서도 주소창의 설치 아이콘을 사용할 수 있어요.'}</p>)}
    <p className="offline-detail"><WifiOff size={15}/>{pwa.offlineReady ? '오프라인 준비 완료 · 인터넷 없이 열고 기록할 수 있어요.' : pwa.registrationError ? '오프라인 준비에 실패했어요. 인터넷 연결 후 다시 열어 주세요.' : '처음에는 인터넷에 연결해 열어 주세요. 오프라인 준비 완료 후 인터넷 없이도 쓸 수 있어요.'}</p>
    <p className="small-note">이전에 PC 주소로 쓴 기록은 설정에서 백업한 뒤 새 주소에서 복원해 주세요. 기기 간 자동 동기화는 되지 않아요. 아이폰은 설치 전 Safari 기록을 백업하고, 홈 화면 앱에서 기록이 보이지 않으면 복원해 주세요.</p>
    {error && <p className="error" role="alert">{error}</p>}
  </section>;
}
