import assert from "node:assert/strict";
import {Client,StreamableHTTPClientTransport} from "@modelcontextprotocol/client";
import {serveMcp} from "./mcp.mjs";
const server=Bun.serve({hostname:"127.0.0.1",port:0,fetch:serveMcp});
const endpoint=new URL("/api/mcp",server.url);
try{
 for(const mode of ["legacy","auto"]){
  const client=new Client({name:"verdant-smoke",version:"0.1.0"},{versionNegotiation:{mode}});
  try{
   await client.connect(new StreamableHTTPClientTransport(endpoint));
   assert.equal(client.getProtocolEra(),mode==="legacy"?"legacy":"modern");
   const {tools}=await client.listTools();
   assert.deepEqual(tools.map(t=>t.name).sort(),["compare_sounds","get_catalog","get_sound","resolve_sound_pack","search_sounds"]);
   const catalog=await client.callTool({name:"get_catalog",arguments:{}});
   assert.ok(!catalog.isError);
   assert.equal(catalog.structuredContent.schemaVersion,1);
   const result=await client.callTool({name:"search_sounds",arguments:{query:"dry click under 100 ms",limit:3}});
   assert.ok(!result.isError);assert.ok(Array.isArray(result.structuredContent.matches));
   const get=await client.callTool({name:"get_sound",arguments:{id:"missing-fixture"}});
   assert.ok(!get.isError);assert.equal(get.structuredContent.asset,null);
   const pack=await client.callTool({name:"resolve_sound_pack",arguments:{slots:[{name:"impossible",search:{query:"elephant trumpet",event:"nonexistent"}}]}});
   assert.ok(!pack.isError);assert.equal(pack.structuredContent.complete,false);
   const invalid=await client.callTool({name:"search_sounds",arguments:{query:"click",limit:99}});
   assert.ok(invalid.isError);
   console.log(mode+" MCP smoke passed");
  }finally{await client.close()}
 }
 const denied=await fetch(endpoint,{method:"POST",headers:{origin:"https://untrusted.example"},body:"{}"});
 assert.equal(denied.status,403);
 const oversized=await fetch(endpoint,{method:"POST",body:"x".repeat(32769)});
 assert.equal(oversized.status,413);
 console.log("Origin and body limits passed");
}finally{server.stop(true)}
