import {useEffect,useMemo,useState,type ReactNode} from "react";
import {validateRelease,searchSounds,type Release} from "../agent/service";
import {ArrowIcon,DownloadIcon,SearchIcon} from "./icons";
import "./agents-page.css";

const clients=["Claude Code","Codex","Other agents"] as const;
type Client=typeof clients[number];
const ROOT="/agents/v1";
const defaultOrigin="https://sound-library-zeta.vercel.app";
const tools=[
 ["search_sounds","Find the right sound from an interaction, material or duration."],
 ["get_sound","Resolve exact WAV bytes, provenance and checksum."],
 ["resolve_sound_pack","Select a coherent set of sounds across interaction events."],
 ["compare_sounds","Compare measured properties and reviewed characteristics."],
 ["get_catalog","Inspect the current release and machine-readable exports."]
] as const;
const examples=["Dry tactile click under 100 ms","Soft toggle without ringing","Quiet save confirmation"] as const;
function Inline({value}:{value:string}){return <>{value.split(/(`[^`]+`)/g).map((part,i)=>part.startsWith("`")&&part.endsWith("`")?<code key={i}>{part.slice(1,-1)}</code>:<span key={i}>{part}</span>)}</>}
function Markdown({value}:{value:string}){
 const body=value.replace(/^---[\s\S]*?---\s*/,"");
 return <div className="agent-markdown">{body.split(/\n\s*\n/).filter(Boolean).map((block,i)=>{
 if(block.startsWith("# "))return <h2 key={i}>{block.slice(2)}</h2>;
 if(block.startsWith("## "))return <h3 key={i}>{block.slice(3)}</h3>;
 if(block.startsWith("- "))return <ul key={i}>{block.split("\n").map((line,j)=><li key={j}><Inline value={line.replace(/^- /,"")}/></li>)}</ul>;
 return <p key={i}><Inline value={block.replace(/\n/g," ")}/></p>;
 })}</div>;
}
function Copy({value,children="Copy"}:{value:string;children?:ReactNode}){
 const [state,setState]=useState<"idle"|"copied"|"failed">("idle");
 useEffect(()=>{setState("idle")},[value]);
 useEffect(()=>{if(state==="idle")return;const id=window.setTimeout(()=>setState("idle"),1800);return()=>window.clearTimeout(id)},[state]);
 return <button type="button" className="agent-copy" onClick={async()=>{try{await navigator.clipboard.writeText(value);setState("copied")}catch{setState("failed")}}} aria-label={state==="copied"?"Copied to clipboard":"Copy to clipboard"}><span aria-live="polite">{state==="copied"?"Copied":state==="failed"?"Select to copy":children}</span><svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="7" y="7" width="9" height="9" rx="2" stroke="currentColor"/><path d="M12 5V4H4v8h1" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
}
function Command({text,label}:{text:string;label:string}){return <div className="agent-command"><div className="agent-command-top"><span>{label}</span><Copy value={text}/></div><pre><code>{text}</code></pre></div>}
export function AgentsPage(){
 const [client,setClient]=useState<Client>("Claude Code"),[release,setRelease]=useState<Release|null>(null),[skill,setSkill]=useState(""),[error,setError]=useState(""),[attempt,setAttempt]=useState(0),[query,setQuery]=useState(""),[submitted,setSubmitted]=useState("");
 useEffect(()=>{const c=new AbortController();setError("");setRelease(null);setSkill("");Promise.all([fetch(ROOT+"/catalog.json",{signal:c.signal}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(validateRelease),fetch(ROOT+"/SKILL.md",{signal:c.signal}).then(r=>{if(!r.ok)throw Error();return r.text()})]).then(([r,s])=>{if(!c.signal.aborted){setRelease(r);setSkill(s)}}).catch(()=>{if(!c.signal.aborted)setError("Could not read the agent release. Try again.")});return()=>c.abort()},[attempt]);
 const origin=release?new URL(release.catalogUrl).origin:defaultOrigin;
 const endpoint=origin+"/api/mcp";
 const command=client==="Claude Code"?"claude mcp add --transport http verdant "+endpoint:client==="Codex"?"codex mcp add verdant --url "+endpoint:endpoint;
 const matches=useMemo(()=>release&&submitted?searchSounds(release,{query:submitted,limit:5}):null,[release,submitted]);
 return <article className="agent-page">
  <section className="agent-intro">
   <div className="agent-eyebrow"><span className="agent-dot"/>Verdant for coding agents</div>
   <h1>Give your agents<br/>better <span>sound.<svg viewBox="0 0 170 10" preserveAspectRatio="none" aria-hidden="true"><path d="M2 7Q75 1 168 5M36 9Q91 4 139 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></span></h1>
   <p>Find, verify and integrate interface sounds with a skill, MCP and a local installer.</p>
   <div className="agent-actions"><a href="#install" className="agent-primary">Connect an agent <ArrowIcon/></a><a href={ROOT+"/plugin.zip"} download className="agent-link">Download plugin <DownloadIcon/></a></div>
  </section>
  <section className="agent-install" id="install">
   <div className="agent-section-heading"><span>01 · Connect</span><h2>One installation. Three ways to work.</h2><p>Use the skill for judgment, MCP for retrieval, and the CLI for verified files.</p></div>
   <div className="agent-install-grid">
    <div><div className="agent-tabs" role="group" aria-label="Coding agent">{clients.map(c=><button key={c} type="button" aria-pressed={client===c} onClick={()=>setClient(c)}>{c}</button>)}</div>
     <Command label={client==="Other agents"?"Remote MCP endpoint":"Connect MCP"} text={command}/>
     <Command label="Install the portable skill" text="npx skills add duggal1/Sound-Library --skill verdant"/>
     <div className="agent-note"><span className="agent-dot"/>Restart your agent if required. The plugin ZIP includes both the skill and MCP configuration. Client conformance is verified separately.</div>
    </div>
    <aside className="agent-install-aside"><h3>Release status</h3>
      {error?<div role="alert"><p>{error}</p><button className="agent-link" onClick={()=>setAttempt(n=>n+1)}>Retry</button></div>:!release?<p role="status" aria-busy="true">Reading catalog…</p>:<><p className="agent-count">{release.sounds.length}</p><p>{release.status==="ready"?"Rights-cleared, listening-approved sounds":"Awaiting listening approval. No approved sounds are published yet."}</p></>}
      <a className="agent-link" href={ROOT+"/catalog.json"}>JSON catalog <ArrowIcon/></a>
      <a className="agent-link" href={ROOT+"/catalog.jsonl"}>JSONL export <ArrowIcon/></a>
      {release?.packUrl&&<a className="agent-link" href={release.packUrl}>Download approved WAV pack <DownloadIcon/></a>}
      <a className="agent-link" href={ROOT+"/verdant.mjs"} download>Download local CLI <DownloadIcon/></a>
      <Command label="Run the downloaded CLI" text='node verdant.mjs search "dry click"'/>
    </aside>
   </div>
  </section>
  <section className="agent-section" id="tools">
   <div className="agent-section-heading"><span>02 · Retrieve</span><h2>Find sounds by intent.</h2><p>Try the retrieval engine in your browser. The MCP adapter uses the same rules.</p></div>
   <form className="agent-search" onSubmit={e=>{e.preventDefault();setSubmitted(query.trim())}}><SearchIcon/><input aria-label="Describe the sound" placeholder="Describe the sound you need" maxLength={300} value={query} onChange={e=>setQuery(e.target.value)}/><button className="agent-primary" disabled={!release||!query.trim()}>Search</button></form>
   <div className="agent-examples">{examples.map(q=><button type="button" key={q} onClick={()=>{setQuery(q);setSubmitted(q)}}>{q}</button>)}</div>
   {matches&&<div className="agent-results" aria-live="polite">{matches.matches.length?matches.matches.map(({asset,reason})=><div className="agent-result" key={asset.id}><div><h3>{asset.name}</h3><p>{reason} · {asset.durationMs} ms · {asset.license}</p></div><a href={asset.fallbackUrl} download className="agent-link">WAV <DownloadIcon/></a></div>):<p>{matches.status==="awaiting-review"?"The approved catalog is empty. Pending recordings are not returned.":"No approved sound matches these constraints."}</p>}</div>}
   <div className="agent-tool-list">{tools.map(([name,description])=><div className="agent-tool" key={name}><code>{name}</code><p>{description}</p><Copy value={name}/></div>)}</div>
  </section>
  <section className="agent-section agent-skill-section" id="skill">
   <div className="agent-section-heading"><span>03 · Teach</span><h2>The skill, without the noise.</h2><p>Readable instructions for humans. Portable Markdown for agents.</p></div>
   <div className="agent-skill-toolbar"><span>skills / verdant / SKILL.md</span><div>{skill&&<Copy value={skill} children="Copy skill"/>}<a className="agent-link" href={ROOT+"/SKILL.md"} download>Download <DownloadIcon/></a></div></div>
   {skill?<Markdown value={skill}/>:<p role="status">{error?"Skill unavailable.":"Loading skill…"}</p>}
  </section>
  <footer className="agent-footer"><a href="/library">Browse the library <ArrowIcon/></a><a href="https://github.com/duggal1/Sound-Library">Source on GitHub <ArrowIcon/></a></footer>
 </article>
}
