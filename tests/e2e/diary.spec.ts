import {test,expect, type Page} from '@playwright/test';
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
async function open(page:Page){await page.goto('/');await page.getByRole('button',{name:'다이어리 열기',exact:true}).click();await expect(page.locator('.book-stage')).toBeVisible();await page.waitForTimeout(250);}
async function editor(page:Page){await page.getByRole('button',{name:/이 날의 기록/}).click();return page.getByRole('dialog');}
test('작성·자동 저장·새로고침·수정·사진·검색·백업 복원',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await open(page);let dialog=await editor(page);
 await dialog.getByLabel('제목',{exact:false}).fill('산책하며 만난 가을');
 await dialog.getByLabel('오늘의 이야기').fill('따뜻한 커피를 마셨다.\n바람이 참 좋았다. <script>window.bad=true</script>');
 await dialog.getByRole('button',{name:'행복해요'}).click();
 await dialog.getByLabel('사진 첨부',{exact:true}).setInputFiles({name:'memory.png',mimeType:'image/png',buffer:Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=40;c.height=40;c.getContext('2d')!.fillRect(0,0,40,40);return c.toDataURL('image/png').split(',')[1];}),'base64')});
 await expect(dialog.locator('.editor-photos img')).toHaveCount(1);await expect(dialog.getByRole('status')).toHaveText('저장 완료');
 await dialog.getByRole('button',{name:'완료',exact:true}).click();await expect(dialog).not.toBeVisible();
 await page.reload();await page.getByRole('button',{name:'다이어리 열기',exact:true}).click();await expect(page.locator('.entry-title').filter({hasText:'산책하며 만난 가을'})).toBeVisible();
 await expect(page.locator('.polaroid img')).toHaveCount(1);expect(await page.evaluate(()=>('bad' in window))).toBe(false);
 dialog=await editor(page);await dialog.getByLabel('오늘의 이야기').fill('수정한 하루, 산책의 기억');await dialog.getByRole('button',{name:'저장하고 닫기'}).click();
 await expect(page.locator('.toolbar-count')).toContainText('1일의 기록');
 await page.getByRole('button',{name:'기록 찾기',exact:true}).click();await page.getByLabel('기록 검색',{exact:true}).fill('산책');await page.getByRole('button',{name:/산책하며 만난 가을/}).click();
 await expect(page.locator('.entry-content').filter({hasText:'수정한 하루'})).toBeVisible();
 await page.getByRole('button',{name:'설정 및 백업'}).click();const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'모든 기록 백업'}).click();const download=await downloadPromise;const path=await download.path();expect(path).toBeTruthy();
 await page.getByRole('button',{name:'닫기',exact:true}).click();dialog=await editor(page);page.once('dialog',d=>d.accept());await dialog.getByRole('button',{name:'기록 삭제',exact:true}).click();await expect(dialog).not.toBeVisible();await expect(page.locator('.toolbar-count')).toContainText('0일의 기록');
 await page.getByRole('button',{name:'설정 및 백업'}).click();await page.getByLabel('백업 파일 가져오기',{exact:true}).setInputFiles(path!);await expect(page.locator('.restore-confirm')).toContainText('일기 1개 · 사진 1장');await page.getByRole('button',{name:'확인하고 복원'}).click();await expect(page.getByRole('status')).toContainText('복원했어요');
 await page.getByRole('button',{name:'닫기',exact:true}).click();await expect(page.locator('.polaroid img')).toHaveCount(1);await expect(page.locator('.toolbar-count')).toContainText('1일의 기록');
 await page.getByRole('button',{name:'달력으로 보기'}).click();await expect(page.getByRole('dialog').getByRole('button',{name:`${today()} 기록 있음`})).toBeVisible();await page.getByRole('dialog').getByRole('button',{name:`${today()} 기록 있음`}).click();
 expect(errors).toEqual([]);
});
for(const width of [360,390,768,1280,1920])test(`${width}px 반응형 · 앞뒤 페이지`,async({page})=>{
 await page.setViewportSize({width,height:1000});await open(page);
 const before=await page.locator('.book-toolbar>span').first().innerText();
 await page.getByRole('button',{name:'다음 페이지',exact:true}).click();await page.waitForTimeout(1500);
 if(width<600){await page.getByRole('button',{name:'다음 페이지',exact:true}).click();await page.waitForTimeout(1500);}
 await expect(page.locator('.book-toolbar>span').first()).not.toHaveText(before);
 await page.getByRole('button',{name:'이전 페이지',exact:true}).click();await page.waitForTimeout(1500);
 await expect(page.locator('.book-toolbar>span').first()).toHaveText(before);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`test-results/layout-${width}.png`,fullPage:true});
});
test('키보드·모션 감소·반복 넘김과 편집 중 보호',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await open(page);const before=await page.locator('.book-toolbar>span').first().innerText();await page.keyboard.press('ArrowRight');await expect(page.locator('.book-toolbar>span').first()).not.toHaveText(before);await page.keyboard.press('ArrowLeft');await expect(page.locator('.book-toolbar>span').first()).toHaveText(before);
 const dialog=await editor(page);await dialog.getByLabel('오늘의 이야기').fill('커서를 움직여도 책은 그대로');await page.keyboard.press('ArrowRight');await expect(page.locator('.book-toolbar>span').first()).toHaveText(before);await dialog.getByRole('button',{name:/저장하고 닫기|완료/}).click();
 for(let i=0;i<8;i++)await page.getByRole('button',{name:'다음 페이지',exact:true}).click();await page.waitForTimeout(100);expect(await page.locator('.paper-page').count()).toBe(6);
});
test('모바일 터치 정방향·역방향과 화면 회전',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const page=await context.newPage();await open(page);
 const client=await context.newCDPSession(page);
 const swipe=async(from:number,to:number)=>{const box=await page.locator('.book-stage').boundingBox();const y=box!.y+box!.height*.65;await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:from,y}]});for(let i=1;i<=8;i++){await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:from+(to-from)*i/8,y}]});await page.waitForTimeout(20);}await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(1500);};
 const before=await page.locator('.book-toolbar>span').first().innerText();await swipe(350,40);await swipe(350,40);await expect(page.locator('.book-toolbar>span').first()).not.toHaveText(before);await swipe(40,350);await expect(page.locator('.book-toolbar>span').first()).toHaveText(before);
 await page.setViewportSize({width:844,height:390});await page.waitForTimeout(500);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await context.close();
});
test('저장 실패 안내와 입력 보존 후 재시도',async({page})=>{
 await open(page);const dialog=await editor(page);
 await page.evaluate(()=>{const proto=IDBObjectStore.prototype;const original=proto.put;Object.defineProperty(window,'restorePut',{value:()=>{proto.put=original;}});proto.put=function(){throw new DOMException('Quota exceeded','QuotaExceededError');};});
 await dialog.getByLabel('오늘의 이야기').fill('저장 실패해도 남아야 하는 내용');await expect(dialog.getByRole('alert')).toContainText('저장 공간');await expect(dialog.getByLabel('오늘의 이야기')).toHaveValue('저장 실패해도 남아야 하는 내용');
 await page.evaluate(()=>{(window as unknown as {restorePut:()=>void}).restorePut();});await dialog.getByRole('button',{name:'다시 저장'}).click();await expect(dialog.getByRole('status')).toHaveText('저장 완료');await dialog.getByRole('button',{name:'완료',exact:true}).click();
});
test('PC 모서리 마우스 드래그',async({page})=>{
 await page.setViewportSize({width:1280,height:1000});await open(page);const before=await page.locator('.book-toolbar>span').first().innerText();const b=await page.locator('.stf__block').boundingBox();expect(b).toBeTruthy();const x=b!.x+b!.width-10,y=b!.y+b!.height-20;await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(b!.x+20,y-60,{steps:20});await page.mouse.up();await expect(page.locator('.book-toolbar>span').first()).not.toHaveText(before,{timeout:5000});
});
test('날짜별 기존 기록 열기·자동 저장 전 새로고침 복구·첨부 오류',async({page})=>{
 await open(page);let dialog=await editor(page);await dialog.getByLabel('오늘의 이야기').fill('새로고침 전에 쓴 초안');await page.waitForTimeout(100);page.once('dialog',d=>d.accept());await page.reload();await page.getByRole('button',{name:'다이어리 열기',exact:true}).click();dialog=await editor(page);await expect(dialog.getByLabel('오늘의 이야기')).toHaveValue('새로고침 전에 쓴 초안');await expect(dialog.getByRole('status')).toHaveText('저장 완료');
 await dialog.getByLabel('사진 첨부',{exact:true}).setInputFiles({name:'invalid.png',mimeType:'image/png',buffer:Buffer.from('not an image')});await expect(dialog.getByRole('alert')).toContainText('사진을 읽지 못했어요');
 await dialog.getByLabel('기록할 날짜').fill('2026-10-01');await expect(dialog.getByLabel('오늘의 이야기')).toBeEmpty();await dialog.getByLabel('오늘의 이야기').fill('10월의 기록');await dialog.getByRole('button',{name:'저장하고 닫기'}).click();await expect(page.locator('.toolbar-count')).toContainText('2일의 기록');
 dialog=await editor(page);await expect(dialog.getByLabel('오늘의 이야기')).toHaveValue('10월의 기록');await dialog.getByRole('button',{name:'완료',exact:true}).click();
});
test('취소는 자동 저장된 변경도 편집 전 상태로 되돌린다',async({page})=>{
 await open(page);let dialog=await editor(page);await dialog.getByLabel('오늘의 이야기').fill('원래 기록');await dialog.getByRole('button',{name:'저장하고 닫기'}).click();dialog=await editor(page);await dialog.getByLabel('오늘의 이야기').fill('취소할 변경');await expect(dialog.getByRole('status')).toHaveText('저장 완료');page.once('dialog',d=>d.accept());await dialog.getByRole('button',{name:'취소',exact:true}).click();await expect(dialog).not.toBeVisible();await expect(page.locator('.entry-content').filter({hasText:'원래 기록'})).toBeVisible();
});
