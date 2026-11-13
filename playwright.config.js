import {defineConfig} from '@playwright/test';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const clientRoot=fileURLToPath(new URL('.',import.meta.url));
const apiRoot=['../api/','../perfumesmtm-api/'].map(path=>new URL(path,import.meta.url)).find(path=>existsSync(new URL('package.json',path)));
export default defineConfig({testDir:'./tests',timeout:30000,workers:1,use:{baseURL:'http://localhost:5173',browserName:'chromium',launchOptions:{args:['--disable-gpu']},reducedMotion:'reduce'},webServer:[
  ...(apiRoot?[{command:'npm run dev',url:'http://localhost:3001/api/v1/health',cwd:fileURLToPath(apiRoot),reuseExistingServer:!process.env.CI}]:[]),
  {command:'npm run dev',url:'http://localhost:5173',cwd:clientRoot,reuseExistingServer:!process.env.CI}
]});
