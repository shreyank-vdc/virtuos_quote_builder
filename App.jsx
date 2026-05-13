import { useState, useMemo, useEffect, useRef } from "react";
import { supabase } from "./supabase.js";
import LOGO_SRC from "./logoData.js";

// Strip white background from logo PNG using Canvas (runs once, cached)
let _transparentLogo = null;
function getTransparentLogo() {
  if (_transparentLogo) return Promise.resolve(_transparentLogo);
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < d.data.length; i += 4) {
        if (d.data[i] > 230 && d.data[i+1] > 230 && d.data[i+2] > 230)
          d.data[i+3] = 0;
      }
      ctx.putImageData(d, 0, 0);
      _transparentLogo = canvas.toDataURL("image/png");
      resolve(_transparentLogo);
    };
    img.src = LOGO_SRC;
  });
}

// Pre-process on module load
const transparentLogoPromise = typeof window !== "undefined" ? getTransparentLogo() : Promise.resolve(LOGO_SRC);

function VirtuosLogo({ height = 44 }) {
  const [src, setSrc] = useState(_transparentLogo || LOGO_SRC);
  useEffect(() => { transparentLogoPromise.then(setSrc); }, []);
  return <img src={src} alt="Virtuos Digital" style={{height:`${height}px`,display:"block"}}/>;
}

// For HTML/Word exports — returns transparent src (falls back to original if not yet processed)
const LOGO_HTML = (h=44) => `<img src="${_transparentLogo||LOGO_SRC}" alt="Virtuos Digital" style="height:${h}px;display:block;"/>`;

// ─── DATA ────────────────────────────────────────────────────────────────────
const PRODUCTS = {
  asana: {
    label: "Asana", color: "#FC636B", bgColor: "#FFF0F0",
    tiers: [
      { id: "asana-starter",         name: "Asana Starter",      unitPrice: 131.88, description: "$10.99/user/mo × 12" },
      { id: "asana-advanced",        name: "Asana Advanced",     unitPrice: 239.88, description: "$19.99/user/mo × 12" },
      { id: "asana-enterprise",      name: "Asana Enterprise",   unitPrice: 0,      description: "Custom pricing — contact sales" },
      { id: "asana-enterprise-plus", name: "Asana Enterprise+",  unitPrice: 0,      description: "Custom pricing — contact sales" },
    ],
    addOns: [
      { id: "asana-timesheet",              name: "Timesheet Add-on",              unitPrice: 72.00, description: "$6.00/user/mo × 12" },
      { id: "asana-enterprise-compliance",  name: "Enterprise & Compliance Add-On", unitPrice: 72.00, description: "$6.00/user/mo × 12" },
    ],
    tc: `Asana subscriptions are billed annually in advance. Seat counts cannot be reduced mid-term. Additional seats purchased mid-term will be pro-rated for the remainder of the current term. Renewals are subject to then-current list pricing unless a multi-year agreement is in place. Add-ons must be licensed for all users in the workspace.`
  },
  smartsheet: {
    label: "Smartsheet", color: "#0073EA", bgColor: "#EFF6FF",
    tiers: [
      { id: "ss-pro",        name: "Smartsheet Pro",        unitPrice: 168.00,  description: "$14/user/mo × 12" },
      { id: "ss-business",   name: "Smartsheet Business",   unitPrice: 300.00,  description: "$25/user/mo × 12" },
      { id: "ss-enterprise", name: "Smartsheet Enterprise", unitPrice: 0,       description: "Custom pricing — contact sales" },
    ],
    addOns: [
      { id: "ss-dynamic-view",      name: "Dynamic View",          unitPrice: 60.00,  description: "$5/user/mo × 12" },
      { id: "ss-datashuttle",       name: "Data Shuttle",           unitPrice: 60.00,  description: "$5/user/mo × 12" },
      { id: "ss-workapps",          name: "WorkApps",               unitPrice: 60.00,  description: "$5/user/mo × 12" },
      { id: "ss-brandfolder",       name: "Brandfolder",            unitPrice: 0,      description: "Custom pricing — contact sales" },
      { id: "ss-bridge",            name: "Bridge by Smartsheet",   unitPrice: 0,      description: "Custom pricing — contact sales" },
      { id: "ss-resource-mgmt",     name: "Resource Management",   unitPrice: 0,      description: "Custom pricing — contact sales" },
    ],
    tc: `Smartsheet subscriptions renew automatically on an annual basis. Named user licences are non-transferable except where permitted under the Smartsheet EULA. Downgrade of plan tier requires 30 days written notice prior to renewal. Premium add-ons are subject to separate terms and may require minimum seat thresholds.`
  },
  professional_services: {
    label: "Professional Services", color: "#7C3AED", bgColor: "#F5F3FF",
    tiers: [
      { id: "ps-professional", name: "Professional Services", unitPrice: 0, description: "Custom hours-based engagement", perUnit: "hour" },
    ],
    addOns: [],
    tc: `Professional Services engagements are governed by the Virtuos Digital Professional Services Agreement. Services must be scheduled within 90 days of purchase. Unused hours expire at end of engagement period. Travel and expenses billed separately where applicable. All professional services are non-refundable once delivery has commenced. Statement of Work (SOW) required for all fixed-fee engagements.`
  }
};

const CURRENCIES = [
  { code: "USD", symbol: "$",    name: "US Dollar",        rate: 1 },
  { code: "INR", symbol: "₹",   name: "Indian Rupee",     rate: 90 },
  { code: "EUR", symbol: "€",   name: "Euro",             rate: 0.92 },
  { code: "GBP", symbol: "£",   name: "British Pound",    rate: 0.79 },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham",       rate: 3.67 },
  { code: "SGD", symbol: "S$",  name: "Singapore Dollar", rate: 1.35 },
  { code: "AUD", symbol: "A$",  name: "Australian Dollar", rate: 1.55 },
];

const TAX_OPTIONS = [
  { label: "No Tax",  rate: 0 },
  { label: "GST 18%", rate: 18 },
  { label: "GST 9%",  rate: 9  },
  { label: "VAT 5%",  rate: 5  },
  { label: "VAT 20%", rate: 20 },
  { label: "VAT 15%", rate: 15 },
];

const PAYMENT_TERMS_OPTIONS = [
  "Net 30", "Net 45", "Net 60", "Due on Receipt", "50% Upfront, 50% on Completion",
];

function daysBetween(a,b){
  if(!a||!b) return 365;
  const d=new Date(b)-new Date(a);
  return Math.max(1,Math.round(d/(1000*60*60*24)));
}
function proRataFactor(start,end,cycle){
  if(cycle==="annual"||cycle==="multi-year") return 1;
  const days=daysBetween(start,end);
  if(cycle==="monthly") return days/365;
  return 1;
}

function computeLines(lines, billingCycle, startDate, endDate) {
  return lines.map(line => {
    const p = PRODUCTS[line.productCategory];
    const all = [...(p?.tiers||[]),...(p?.addOns||[])];
    const item = all.find(i=>i.id===line.itemId);
    const isPro = line.productCategory==="professional_services";
    const usd = isPro ? (line.ratePerHour||0) : (item?.unitPrice||0);
    const pr = isPro ? 1 : proRataFactor(startDate,endDate,billingCycle);
    const annual = usd*line.qty;
    const effective = isPro ? annual : annual*pr;
    const disc = line.discountType==="percent" ? effective*(line.discount/100) : Math.min(line.discount,effective);
    const net = Math.max(0,effective-disc);
    return {...line,item,p,annual,effective,disc,net,pr,isPro,isFullPeriod:pr>=0.9972};
  });
}

// ─── BUILDER UI PRIMITIVES ───────────────────────────────────────────────────
const V = {
  navy:    "#0D1B3E",
  pink:    "#E84B9C",
  orange:  "#F97316",
  teal:    "#0EA5E9",
  ink:     "#1E293B",
  muted:   "#64748B",
  border:  "#E2E8F0",
  surface: "#F8FAFC",
  white:   "#FFFFFF",
};

function Label({children}){
  return <label style={{fontSize:"10.5px",fontWeight:700,color:V.muted,textTransform:"uppercase",letterSpacing:"0.07em"}}>{children}</label>;
}
const IS = {border:`1.5px solid ${V.border}`,borderRadius:"8px",padding:"8px 10px",fontSize:"13px",outline:"none",width:"100%",boxSizing:"border-box",fontFamily:"inherit",color:V.ink};
function Inp({label,type="text",value,onChange,min,max,placeholder,readOnly,onFocusSelect}){
  return(
    <div style={{display:"flex",flexDirection:"column",gap:"3px"}}>
      {label&&<Label>{label}</Label>}
      <input type={type} value={value} onChange={e=>onChange&&onChange(e.target.value)}
        min={min} max={max} placeholder={placeholder} readOnly={readOnly}
        style={{...IS,background:readOnly?"#F1F5F9":V.white,color:readOnly?V.muted:V.ink}}
        onFocus={e=>{if(!readOnly){e.target.style.borderColor=V.pink;if(onFocusSelect)e.target.select();}}}
        onBlur={e=>e.target.style.borderColor=V.border}/>
    </div>
  );
}
function Sel({label,value,onChange,options}){
  return(
    <div style={{display:"flex",flexDirection:"column",gap:"3px"}}>
      {label&&<Label>{label}</Label>}
      <select value={value} onChange={e=>onChange(e.target.value)}
        style={{...IS,background:V.white,cursor:"pointer"}}
        onFocus={e=>e.target.style.borderColor=V.pink} onBlur={e=>e.target.style.borderColor=V.border}>
        {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
function Badge({color,children}){
  return <span style={{display:"inline-flex",alignItems:"center",padding:"2px 8px",borderRadius:"99px",fontSize:"10.5px",fontWeight:700,background:`${color}18`,color,letterSpacing:"0.04em"}}>{children}</span>;
}
function fmt$(n){return "$"+n.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});}

// ─── PRODUCT LINE ─────────────────────────────────────────────────────────────
function ProductLine({line,onUpdate,onRemove,billingCycle,startDate,endDate}){
  const p=PRODUCTS[line.productCategory];
  const all=[...(p?.tiers||[]),...(p?.addOns||[])];
  const item=all.find(i=>i.id===line.itemId);
  const isPro=line.productCategory==="professional_services";
  const pr=isPro?1:proRataFactor(startDate,endDate,billingCycle);
  const ratePerHour=line.ratePerHour||0;
  const usd=isPro?ratePerHour:(item?.unitPrice||0);
  const effective=isPro?ratePerHour*line.qty:usd*line.qty*pr;
  const disc=line.discountType==="percent"?effective*(line.discount/100):Math.min(line.discount,effective);
  const net=Math.max(0,effective-disc);
  const full=pr>=0.9972;

  return(
    <div style={{background:V.white,border:`1px solid ${V.border}`,borderLeft:`3px solid ${p?.color}`,borderRadius:"10px",padding:"14px",display:"flex",flexDirection:"column",gap:"10px",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",gap:"7px",alignItems:"center",flexWrap:"wrap"}}>
          <Badge color={p?.color}>{p?.label}</Badge>
          {!isPro&&item&&<span style={{fontSize:"13px",fontWeight:600,color:V.ink}}>{item.name}</span>}
          {!isPro&&!full&&<Badge color="#D97706">Pro-rata {(pr*100).toFixed(1)}%</Badge>}
        </div>
        <button onClick={onRemove} style={{background:"none",border:"none",cursor:"pointer",color:"#EF4444",fontSize:"18px",padding:"0 4px",lineHeight:1}}>×</button>
      </div>
      <div className="pl-grid">
        {isPro?(
          <>
            <Inp label="Hours" type="number" min="1"
              value={line.qty} onChange={v=>onUpdate({...line,qty:Math.max(1,parseInt(v)||1)})} onFocusSelect/>
            <Inp label="Rate per Hour (USD)" type="number" min="0"
              value={ratePerHour} onChange={v=>onUpdate({...line,ratePerHour:parseFloat(v)||0})} onFocusSelect/>
          </>
        ):(
          <>
            <Sel label="Product / Service" value={line.itemId} onChange={v=>onUpdate({...line,itemId:v})}
              options={all.map(i=>({value:i.id,label:i.name}))}/>
            <Inp label="Seats" type="number" min="1"
              value={line.qty} onChange={v=>onUpdate({...line,qty:Math.max(1,parseInt(v)||1)})} onFocusSelect/>
          </>
        )}
        <div style={{display:"flex",flexDirection:"column",gap:"3px"}}>
          <Label>Discount</Label>
          <div style={{display:"flex"}}>
            <input type="number" min="0" value={line.discount}
              onChange={e=>onUpdate({...line,discount:parseFloat(e.target.value)||0})}
              style={{...IS,borderRadius:"8px 0 0 8px",width:"60%"}}
              onFocus={e=>{e.target.style.borderColor=V.pink;e.target.select();}} onBlur={e=>e.target.style.borderColor=V.border}/>
            <select value={line.discountType} onChange={e=>onUpdate({...line,discountType:e.target.value})}
              style={{border:`1.5px solid ${V.border}`,borderLeft:"none",borderRadius:"0 8px 8px 0",padding:"8px 4px",fontSize:"12px",background:V.white,outline:"none",cursor:"pointer",width:"40%",fontFamily:"inherit"}}>
              <option value="percent">%</option>
              <option value="fixed">USD</option>
            </select>
          </div>
        </div>
        {isPro?(
          <div>
            <Label>Total (USD)</Label>
            <div style={{fontSize:"13px",color:V.muted,padding:"8px 0",fontWeight:500}}>{fmt$(effective)}</div>
          </div>
        ):(
          <div>
            <Label>Unit (USD/yr)</Label>
            <div style={{fontSize:"13px",color:V.muted,padding:"8px 0",fontWeight:500}}>{fmt$(usd)}</div>
          </div>
        )}
        <div>
          <Label>Net (USD)</Label>
          <div style={{fontSize:"15px",fontWeight:700,color:V.ink,padding:"8px 0"}}>{fmt$(net)}</div>
        </div>
      </div>
      {!isPro&&item?.description&&<p style={{fontSize:"11.5px",color:"#94A3B8",margin:0}}>{item.description}</p>}
    </div>
  );
}