import {defineConfig} from '@playwright/test';
import {existsSync} from 'node:fs';
export default defineConfig({testDir:'./tests/pwa',workers:1,timeout:60000,use:{baseURL:'http://127.0.0.1:5180/paper-days/',headless:true,serviceWorkers:'allow',launchOptions:existsSync('/usr/bin/chromium')?{executablePath:'/usr/bin/chromium',args:['--no-sandbox']}:{}},webServer:{command:'node tests/serve-production.mjs',url:'http://127.0.0.1:5180/paper-days/',reuseExistingServer:false},reporter:'list'});
