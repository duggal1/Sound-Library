import assert from "node:assert/strict";
import {mkdir} from "node:fs/promises";
import {chromium} from "playwright";
const origin="http://127.0.0.1:4173";
const server=Bun.spawn(["bun","src/server/index.ts"],{env:{...process.env,PORT:"4173"},stdout:"ignore",stderr:"inherit"});
let browser;
try{
 for(let i=0;i<100;i++){try{if((await fetch(origin+"/agents")).ok)break}catch{}if(i===99)throw Error("Preview did not start");await Bun.sleep(100)}
 await mkdir(".agent-screenshots",{recursive:true});
 browser=await chromium.launch({headless:true});
 for(const [width,height] of [[1440,1000],[768,1024],[390,844],[320,720]]){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:"reduce",permissions:["clipboard-read","clipboard-write"]});
  const page=await context.newPage();const errors=[];page.on("pageerror",e=>errors.push(e.message));
  try{
   await page.goto(origin+"/agents");
   await page.getByRole("heading",{name:"Give your agents better sound."}).waitFor();
   await page.locator(".agent-count").waitFor();
   await page.getByRole("button",{name:"Codex",exact:true}).click();
   assert.match(await page.locator(".agent-command pre").first().innerText(),/codex mcp add verdant --url/);
   await page.locator(".agent-command").first().getByRole("button").click();
   await page.locator(".agent-command").first().getByText("Copied",{exact:true}).waitFor();
   const copied=await page.evaluate(()=>navigator.clipboard.readText());assert.match(copied,/codex mcp add verdant/);
   await page.getByRole("button",{name:"Dry tactile click under 100 ms"}).click();
   await page.locator(".agent-results").waitFor();
   const count=Number(await page.locator(".agent-count").innerText());if(count===0)assert.match(await page.locator(".agent-results").innerText(),/approved catalog is empty/);
   await page.locator(".agent-markdown").waitFor();
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),"Horizontal overflow at "+width);
   await page.locator(".agent-skill-section").scrollIntoViewIfNeeded();
   assert.ok(await page.evaluate(()=>scrollY>0),"Skill section cannot scroll");
   await page.evaluate(()=>scrollTo(0,0));
   await page.screenshot({path:".agent-screenshots/agents-"+width+".png",fullPage:true,animations:"disabled"});
   assert.deepEqual(errors,[]);
   console.log("Agent UI verified at "+width+"px");
  }finally{await context.close()}
 }
}finally{if(browser)await browser.close();server.kill()}
