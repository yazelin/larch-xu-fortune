/* Standalone Playwright acceptance. Uses local files, so no HTTP server needed.
   Run: node tools/browser_check.cjs
   PW_MODULE=/path/to/playwright CHROME_PATH=/path/to/chrome override discovery. */
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..');
let pw;for(const loc of [process.env.PW_MODULE,'playwright','/home/ct/line-sticker-studio/node_modules/playwright']){if(!loc)continue;try{pw=require(loc);break;}catch{}}
if(!pw)throw Error('找不到 Playwright，請設定 PW_MODULE。');
const out='/tmp/fortune/shots';fs.mkdirSync(out,{recursive:true});
const methods=['cezi','bird','tarot','zodiac','face','day','wheel'];
(async()=>{
 let browser;const report={viewports:[],methods:[],embed:[],errors:[],shots:[]};
 try{
  browser=await pw.chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
  for(const config of [{name:'desktop-light',viewport:{width:1440,height:1100},isMobile:false,hasTouch:false,colorScheme:'light'},{name:'mobile-dark',viewport:{width:390,height:844},isMobile:true,hasTouch:true,colorScheme:'dark'}]){
   const context=await browser.newContext(config),page=await context.newPage();
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(pathToFileURL(path.join(root,'index.html')).href);await page.locator('[data-method="cezi"]').waitFor();
   assert.equal(await page.locator('[data-method]').count(),7);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   const shot=path.join(out,config.name+'.png');await page.screenshot({path:shot,fullPage:true});report.shots.push(shot);
   for(const m of methods){
    await page.locator(`[data-method="${m}"]`).click();await page.locator('#cast').click();
    if(m==='bird')await page.getByRole('button',{name:'展開卦箋'}).click();
    if(m==='tarot')for(let i=0;i<3;i++)await page.locator('.tarot-card').nth(i).click();
    await page.locator('#answer').waitFor({state:'visible'});assert.ok(await page.locator('#result-title').textContent());
    if(m==='tarot'){await page.locator('#again').click();assert.equal(await page.locator('#scene').isVisible(),true);await page.locator('#cast').click();for(let i=0;i<3;i++)await page.locator('.tarot-card').nth(i).click();}
    await page.locator('#leave').click();report.methods.push(config.name+':'+m);
   }
   assert.deepEqual(errors,[]);report.viewports.push(config.name);await context.close();
  }
  // Serve the real card and game through Playwright routing, avoiding a listening socket.
  const context=await browser.newContext({reducedMotion:'reduce'});
  await context.route('https://fortune.test/**',async route=>{
   const url=new URL(route.request().url());const relative=url.pathname.slice(1)||'index.html';const file=path.resolve(root,relative);
   if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});
   const ext=path.extname(file);await route.fulfill({body:fs.readFileSync(file),contentType:({'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json'})[ext]||'text/plain'});
  });
  for(const m of methods){
   const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('https://fortune.test/tests/embed_host.html?method='+m);
   const game=page.frameLocator('#card').frameLocator('#game');await game.locator('#cast:enabled').waitFor();
   assert.equal(await game.locator('.yz-cluster').count(),0);await game.locator('#cast').click();
   if(m==='bird')await game.getByRole('button',{name:'展開卦箋'}).click();
   if(m==='tarot')for(let i=0;i<3;i++)await game.locator('.tarot-card').nth(i).click();
   await game.locator('#answer').waitFor({state:'visible'});await game.locator('#leave').click();
   await page.waitForFunction(()=>window.events.some(e=>e.type==='larch:complete'));
   const events=await page.evaluate(()=>window.events);const sets=events.filter(e=>e.type==='larch:set');assert.equal(sets.length,2);
   assert.equal(sets[0].name,'fortune_'+m+'_count');assert.equal(sets[0].value,m==='cezi'?4:1);
   const complete=events.find(e=>e.type==='larch:complete');assert.equal(complete.payload.complete,true);assert.equal(complete.payload.result.method,m);assert.deepEqual(errors,[]);
   report.embed.push(m);await page.close();
  }
  await context.close();console.log(JSON.stringify(report,null,2));fs.writeFileSync('/tmp/fortune/browser-results.json',JSON.stringify(report,null,2)+'\n');
 }catch(e){report.errors.push(e.message);fs.writeFileSync('/tmp/fortune/browser-results.json',JSON.stringify(report,null,2)+'\n');console.error(e.message);process.exitCode=1;}
 finally{if(browser)await browser.close();}
})();
