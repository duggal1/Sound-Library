import {serveMcp} from "./mcp.mjs";
const server=Bun.serve({hostname:"127.0.0.1",port:Number(process.env.AGENT_PORT||3131),fetch:req=>new URL(req.url).pathname==="/api/mcp"?serveMcp(req):new Response("Not found",{status:404})});
console.log("Verdant MCP: "+server.url+"api/mcp");
