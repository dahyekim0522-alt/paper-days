import { test, expect, chromium, type Page } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
async function ready(page:Page){
 await page.goto('./');
 await page.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise<void>(resolve=>navigator.serviceWorker.addEventListener('controllerchange',()=>resolve(),{once:true}));});
}
async function settings(page:Page){await page.getByRole('button',{name:'설정 열기',exact:true}).click();return page.getByRole('dialog');}
test('배포 하위 경로 manifest·아이콘·캐시와 오프라인 일기/사진 저장·재실행',async({page,context,request})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await ready(page);
 const href=await page.locator('link[rel=manifest]').getAttribute('href');const manifestURL=new URL(href!,page.url());const response=await request.get(manifestURL.href);expect(response.ok()).toBe(true);const manifest=await response.json();
 expect(new URL(manifest.start_url,manifestURL).pathname).toBe('/paper-days/');expect(new URL(manifest.scope,manifestURL).pathname).toBe('/paper-days/');expect(manifest.display).toBe('standalone');
 for(const icon of manifest.icons){const response=await request.get(new URL(icon.src,manifestURL).href);expect(response.ok()).toBe(true);expect(response.headers()['content-type']).toContain('image/png');}
 expect(await page.evaluate(()=>navigator.serviceWorker.controller?.scriptURL)).toContain('/paper-days/sw.js');
 let dialog=await settings(page);await expect(dialog.locator('.offline-detail')).toContainText('오프라인 준비 완료');await dialog.getByRole('button',{name:'닫기',exact:true}).click();
 await context.setOffline(true);await page.reload();await expect(page.getByRole('button',{name:'다이어리 열기',exact:true})).toBeVisible();await expect(page.getByRole('status')).toContainText('오프라인이에요');
 await page.getByRole('button',{name:'오늘 기록하기'}).click();dialog=page.getByRole('dialog');await dialog.getByLabel('제목',{exact:false}).fill('인터넷 없이 남긴 하루');await dialog.getByLabel('오늘의 이야기').fill('비행기 모드에서도 일기와 사진을 남겨요.');
 const image=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=20;c.height=20;c.getContext('2d')!.fillRect(0,0,20,20);return c.toDataURL().split(',')[1];});
 await dialog.getByLabel('사진 첨부',{exact:true}).setInputFiles({name:'offline.png',mimeType:'image/png',buffer:Buffer.from(image,'base64')});await expect(dialog.locator('.editor-photos img')).toHaveCount(1);await dialog.getByRole('button',{name:'저장하고 닫기'}).click();await expect(dialog).not.toBeVisible();await expect(page.locator('.toolbar-count')).toContainText('1일의 기록');
 await page.reload();await page.getByRole('button',{name:'다이어리 열기',exact:true}).click();await expect(page.locator('.entry-title').filter({hasText:'인터넷 없이 남긴 하루'})).toBeVisible();await expect(page.locator('.polaroid img')).toHaveCount(1);expect(await page.locator('.polaroid img').evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true);
 // Clear the HTTP cache, retain SW/IndexedDB, close the page and launch a new one offline.
 const cdp=await context.newCDPSession(page);await cdp.send('Network.clearBrowserCache');await page.close();const reopened=await context.newPage();await reopened.goto('http://127.0.0.1:5180/paper-days/');await reopened.getByRole('button',{name:'다이어리 열기',exact:true}).click();await expect(reopened.locator('.entry-title').filter({hasText:'인터넷 없이 남긴 하루'})).toBeVisible();expect(errors).toEqual([]);
});
test('새 버전은 편집 도중 재시작하지 않고, 다른 창의 편집도 보호한다',async({page,context,request})=>{
 await ready(page);const second=await context.newPage();await ready(second);
 await second.getByRole('button',{name:'오늘 기록하기'}).click();await second.getByLabel('오늘의 이야기').fill('다른 창에서 쓰는 내용');
 await request.post('http://127.0.0.1:5180/__test-version');await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r!.update();});
 await expect(page.getByRole('button',{name:'업데이트',exact:true})).toBeVisible();await page.getByRole('button',{name:'업데이트',exact:true}).click();await expect(page.getByRole('alert')).toContainText('다른 창');
 await second.getByRole('dialog').getByRole('button',{name:/저장하고 닫기|완료/}).click();await expect(second.getByRole('dialog')).not.toBeVisible();await second.close();
 await page.getByRole('button',{name:'오늘 기록하기'}).click();await expect(page.getByRole('button',{name:'업데이트',exact:true})).toBeDisabled();await page.getByRole('dialog').getByRole('button',{name:'완료',exact:true}).click();
 const navigation=page.waitForEvent('load');await page.getByRole('button',{name:'업데이트',exact:true}).click();await navigation;await expect(page.getByRole('button',{name:'다이어리 열기',exact:true})).toBeVisible();await page.getByRole('button',{name:'오늘 기록하기'}).click();await expect(page.getByLabel('오늘의 이야기')).toHaveValue('다른 창에서 쓰는 내용');
});
test('설치 안내: Android 설치 버튼과 iPhone 홈 화면 추가 방법',async({page,context})=>{
 await ready(page);
 await page.evaluate(()=>{const event=new Event('beforeinstallprompt',{cancelable:true});Object.assign(event,{prompt:()=>{(window as unknown as {installRequested:boolean}).installRequested=true;return Promise.resolve();},userChoice:Promise.resolve({outcome:'accepted'})});dispatchEvent(event);});
 await page.getByRole('button',{name:'설치하기',exact:true}).click();expect(await page.evaluate(()=>(window as unknown as {installRequested:boolean}).installRequested)).toBe(true);
 const iphone=await context.browser()!.newContext({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',viewport:{width:390,height:844},isMobile:true,hasTouch:true});const iosPage=await iphone.newPage();await iosPage.goto('http://127.0.0.1:5180/paper-days/');const dialog=await settings(iosPage);await expect(dialog.locator('.install-help')).toContainText('Safari');await expect(dialog.locator('.install-help')).toContainText('홈 화면에 추가');await iphone.close();
});

test('일반 브라우저 프로필에서 실제 설치 가능 조건을 충족한다',async()=>{
 const profile=await mkdtemp(join(tmpdir(),'paper-days-install-'));
 const context=await chromium.launchPersistentContext(profile,{headless:true,...(existsSync('/usr/bin/chromium')?{executablePath:'/usr/bin/chromium',args:['--no-sandbox']}:{}),baseURL:'http://127.0.0.1:5180/paper-days/'});
 try{const page=await context.newPage();await ready(page);const cdp=await context.newCDPSession(page);await expect.poll(async()=>(await cdp.send('Page.getInstallabilityErrors')).installabilityErrors).toEqual([]);}
 finally{await context.close();await rm(profile,{recursive:true,force:true});}
});
