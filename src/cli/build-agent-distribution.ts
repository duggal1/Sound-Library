import {readFile,writeFile} from "node:fs/promises";
import {createZip} from "../core/zip";
const folder=".generated-public/agents/v1";
const files=["plugin.json","mcp.json",".mcp.json",".codex-plugin/plugin.json",".claude-plugin/plugin.json","skills/verdant/SKILL.md","skills/verdant/references/integration.md"];
const entries=await Promise.all(files.map(async name=>({name,data:await readFile(name)})));
await writeFile(folder+"/plugin.zip",createZip(entries,new Date(1980,0,1)));
await writeFile(folder+"/SKILL.md",await readFile("skills/verdant/SKILL.md"));
