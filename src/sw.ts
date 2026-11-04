/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{url:string;revision:string|null}> };
// Only versioned application files are cached. Diaries/photos remain in IndexedDB.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
const scope = new URL(self.registration.scope).pathname;
registerRoute(new NavigationRoute(createHandlerBoundToURL(`${scope}index.html`), {
  allowlist: [new RegExp(`^${scope.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)],
}));
async function clientsReady() {
  const tabs = (await self.clients.matchAll({type:'window',includeUncontrolled:true})).filter(tab=>tab.url.startsWith(self.registration.scope));
  return (await Promise.all(tabs.map(tab=>new Promise<boolean>(resolve=>{
    const channel=new MessageChannel();
    const timer=setTimeout(()=>{channel.port1.close();resolve(false);},2000);
    channel.port1.onmessage=event=>{clearTimeout(timer);channel.port1.close();resolve(event.data===true);};
    tab.postMessage({type:'PAPER_DAYS_CHECK_UPDATE'},[channel.port2]);
  })))).every(Boolean);
}
// Never force a reload while somebody is writing. A waiting worker is activated
// only by the explicit update button after the editor has closed.
self.addEventListener('message', event => {
  if (event.data?.type === 'PAPER_DAYS_CHECK_CLIENTS') {
    event.waitUntil(clientsReady().then(ready=>event.ports[0]?.postMessage(ready)));
  }
  if (event.data?.type === 'SKIP_WAITING') event.waitUntil(clientsReady().then(async ready=>{if(ready)await self.skipWaiting();}));
});
clientsClaim();
