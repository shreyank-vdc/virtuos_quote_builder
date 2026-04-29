import { useState, useMemo } from "react";
import LOGO_SRC from "./logoData.js";

// JSX component — actual Virtuos Digital logo
const VirtuosLogo = ({ height = 44 }) => (
  <img src={LOGO_SRC} alt="Virtuos Digital" style={{height:`${height}px`,display:"block"}}/>
);

// Plain HTML string for use inside exportQuoteHTML / exportQuoteWord template literals
const LOGO_HTML = (h=44) => `<img src="${LOGO_SRC}" alt="Virtuos Digital" style="height:${h}px;display:block;"/>`;

// ─── DATA ────────────────────────────────────────────────────────────────────
const PRODUCTS = {
  asana: {
    label: "Asana", color: "#FC636B", bgColor: "#FFF0F0",
    tiers: [
      { id: "asana-starter",         name: "Asana Starter",      unitPrice: 131.88, description: "$10.99/user/mo × 12" },
      { id: "asana-advanced",        name: "Asana Advanced",     unitPrice: 299.88, description: "$24.99/user/mo × 12" },
      { id: "asana-enterprise",      name: "Asana Enterprise",   unitPrice: 540.00, description: "$45.00/user/mo × 12" },
      { id: "asana-enterprise-plus", name: "Asana Enterprise+",  unitPrice: 660.00, description: "$55.00/user/mo × 12" },
    ],
    addOns: [],
    tc: `For all payments in INR, USD to INR exchange rates shall be applicable 'as on date' at the time of payment by customer. This order is non-cancellable & non-refundable. The Customer acknowledges that they are bound by the Asana Subscriber Agreement for all matters related to licensing, security, privacy, and use of the software available at https://asana.com/terms/subscriber-agreement. *Government Taxes Are Extra.`
  },
  smartsheet: {
    label: "Smartsheet", color: "#0073EA", bgColor: "#EFF6FF",
    tiers: [
      { id: "ss-pro",        name: "Smartsheet Pro",        unitPrice: 108.00, description: "$9.00/user/mo × 12" },
      { id: "ss-business",   name: "Smartsheet Business",   unitPrice: 228.00, description: "$19.00/user/mo × 12" },
      { id: "ss-enterprise", name: "Smartsheet Enterprise", unitPrice: 540.00, description: "$45.00/user/mo × 12" },
    ],
    addOns: [
      { id: "ss-standard-support", name: "Standard Support Package", unitPrice: 6.00,   description: "$6.00/user/yr" },
      { id: "ss-premium-support",  name: "Premium Support Package",  unitPrice: 6.00,   description: "$6.00/user/yr" },
      { id: "ss-advance",          name: "Smartsheet Advance (AWM)", unitPrice: 144.00, description: "$12.00/user/mo × 12" },
      { id: "ss-dynamic-view",     name: "Dynamic View",             unitPrice: 48.00,  description: "$4.00/user/mo × 12" },
    ],
    tc: `For all payments in INR, USD to INR exchange rates shall be applicable 'as on date' at the time of payment by customer. This order is non-cancellable & non-refundable. The Customer acknowledges that they are bound by the Smartsheet Subscriber Agreement for all matters related to licensing, security, privacy, and use of the software available at https://www.smartsheet.com/legal/user-agreement. *Government Taxes Are Extra.`
  },
  professional_services: {
    label: "Professional Services", color: "#7C3AED", bgColor: "#F5F3FF",
    tiers: [
      { id: "ps-implementation", name: "Implementation Package", unitPrice: 2500.00, description: "Guided setup and configuration", perUnit: "engagement" },
      { id: "ps-training",       name: "Training Package",       unitPrice: 1200.00, description: "End-user and admin training",   perUnit: "session" },
      { id: "ps-consulting",     name: "Strategic Consulting",   unitPrice: 250.00,  description: "Senior consultant",            perUnit: "hour" },
      { id: "ps-migration",      name: "Data Migration",         unitPrice: 3500.00, description: "Full data migration & validation", perUnit: "engagement" },
      { id: "ps-integration",    name: "Custom Integration",     unitPrice: 5000.00, description: "API integration with third-party systems", perUnit: "engagement" },
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
  { code: "SGD", symbol: "S$",  name: "Singapore Dollar", rate: 1.34 },
];
const TAX_RATES = [
  { label: "None (0%)", rate: 0 },
  { label: "GST 18%",   rate: 0.18 },
  { label: "VAT 20%",   rate: 0.20 },
  { label: "VAT 5%",    rate: 0.05 },
];

// ─── UTILS ───────────────────────────────────────────────────────────────────
const fmt$ = n => `$${n.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const fmtC = (n, sym) => `${sym}${n.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const fmtDate = s => s ? new Date(s).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}) : "—";

function generateQuoteId() {
  const c="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const r=n=>Array.from({length:n},()=>c[Math.floor(Math.random()*c.length)]).join("");
  return `QUO-${r(5)}-${r(6)}`;
}
function daysBetween(a,b){if(!a||!b)return 0;return Math.max(0,Math.ceil((new Date(b)-new Date(a))/86400000));}
function proRataFactor(s,e,cycle){
  const d=daysBetween(s,e);if(!d)return 1;
  // Annual: autoEndDate subtracts 1 day, so a full year = 364 days. Return exactly 1.
  if(cycle==="annual")return d>=364 ? 1 : d/365;
  // Quarterly: full quarter = 89-92 days. Return exactly 1.
  if(cycle==="quarterly")return d>=89 ? 1 : d/91;
  // Monthly: fraction of annual price (can exceed 1 for multi-month).
  return d/365;
}
function autoEndDate(start,cycle,months){
  if(!start)return "";
  const d=new Date(start);
  if(cycle==="annual"){d.setFullYear(d.getFullYear()+1);d.setDate(d.getDate()-1);}
  else if(cycle==="quarterly"){d.setMonth(d.getMonth()+3);d.setDate(d.getDate()-1);}
  else{d.setMonth(d.getMonth()+months);d.setDate(d.getDate()-1);}
  return d.toISOString().split("T")[0];
}
function computeLines(lines, startDate, endDate, billingCycle) {
  return lines.map(line => {
    const p = PRODUCTS[line.productCategory];
    const all = [...(p?.tiers||[]),...(p?.addOns||[])];
    const item = all.find(i=>i.id===line.itemId);
    const usd = item?.unitPrice||0;
    const isPro = line.productCategory==="professional_services";
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
const IS = {border:`1.5px solid ${V.border}`,borderRadius:"8px",padding:"8px 11px",fontSize:"13.5px",color:V.ink,background:V.white,outline:"none",width:"100%",boxSizing:"border-box",fontFamily:"inherit"};

function Inp({label,type="text",value,onChange,min,max,placeholder,readOnly}){
  return(
    <div style={{display:"flex",flexDirection:"column",gap:"3px"}}>
      {label&&<Label>{label}</Label>}
      <input type={type} value={value} onChange={e=>onChange&&onChange(e.target.value)}
        min={min} max={max} placeholder={placeholder} readOnly={readOnly}
        style={{...IS,background:readOnly?"#F1F5F9":V.white,color:readOnly?V.muted:V.ink}}
        onFocus={e=>{if(!readOnly)e.target.style.borderColor=V.pink}}
        onBlur={e=>e.target.style.borderColor=V.border}/>
    </div>
  );
}
function Sel({label,value,onChange,options}){
  return(
    <div style={{display:"flex",flexDirection:"column",gap:"3px"}}>
      {label&&<Label>{label}</Label>}
      <select value={value} onChange={e=>onChange(e.target.value)}
        style={{...IS,cursor:"pointer",appearance:"none",backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath fill='%2364748B' d='M5 7L0 2h10z'/%3E%3C/svg%3E")`,backgroundRepeat:"no-repeat",backgroundPosition:"right 11px center",paddingRight:"28px"}}>
        {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
function Badge({children,color}){
  return <span style={{background:color+"18",color,border:`1px solid ${color}33`,borderRadius:"5px",padding:"2px 7px",fontSize:"10.5px",fontWeight:700,letterSpacing:"0.05em",textTransform:"uppercase"}}>{children}</span>;
}
function Panel({title,icon,children}){
  return(
    <div style={{background:V.white,borderRadius:"12px",padding:"18px",border:`1px solid ${V.border}`,boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
      <div style={{fontSize:"11px",fontWeight:800,color:V.ink,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"13px",display:"flex",alignItems:"center",gap:"6px"}}>
        {icon&&<span style={{fontSize:"14px"}}>{icon}</span>}{title}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:"9px"}}>{children}</div>
    </div>
  );
}

// ─── PRODUCT LINE ─────────────────────────────────────────────────────────────
function ProductLine({line,onUpdate,onRemove,billingCycle,startDate,endDate}){
  const p=PRODUCTS[line.productCategory];
  const all=[...(p?.tiers||[]),...(p?.addOns||[])];
  const item=all.find(i=>i.id===line.itemId);
  const usd=item?.unitPrice||0;
  const isPro=line.productCategory==="professional_services";
  const pr=isPro?1:proRataFactor(startDate,endDate,billingCycle);
  const effective=isPro?usd*line.qty:usd*line.qty*pr;
  const disc=line.discountType==="percent"?effective*(line.discount/100):Math.min(line.discount,effective);
  const net=Math.max(0,effective-disc);
  const full=pr>=0.9972;

  return(
    <div style={{background:V.white,border:`1px solid ${V.border}`,borderLeft:`3px solid ${p?.color}`,borderRadius:"10px",padding:"14px",display:"flex",flexDirection:"column",gap:"10px",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",gap:"7px",alignItems:"center",flexWrap:"wrap"}}>
          <Badge color={p?.color}>{p?.label}</Badge>
          {item&&<span style={{fontSize:"13px",fontWeight:600,color:V.ink}}>{item.name}</span>}
          {!isPro&&!full&&<Badge color="#D97706">Pro-rata {(pr*100).toFixed(1)}%</Badge>}
        </div>
        <button onClick={onRemove} style={{background:"none",border:"none",cursor:"pointer",color:"#EF4444",fontSize:"18px",padding:"0 4px",lineHeight:1}}>×</button>
      </div>
      <div className="pl-grid">
        <Sel label="Product / Service" value={line.itemId} onChange={v=>onUpdate({...line,itemId:v})}
          options={all.map(i=>({value:i.id,label:i.name}))}/>
        <Inp label={isPro?(item?.perUnit?`Qty (${item.perUnit})`:"Qty"):"Seats"} type="number" min="1"
          value={line.qty} onChange={v=>onUpdate({...line,qty:Math.max(1,parseInt(v)||1)})}/>
        <div style={{display:"flex",flexDirection:"column",gap:"3px"}}>
          <Label>Discount</Label>
          <div style={{display:"flex"}}>
            <input type="number" min="0" value={line.discount}
              onChange={e=>onUpdate({...line,discount:parseFloat(e.target.value)||0})}
              style={{...IS,borderRadius:"8px 0 0 8px",width:"60%"}}
              onFocus={e=>e.target.style.borderColor=V.pink} onBlur={e=>e.target.style.borderColor=V.border}/>
            <select value={line.discountType} onChange={e=>onUpdate({...line,discountType:e.target.value})}
              style={{border:`1.5px solid ${V.border}`,borderLeft:"none",borderRadius:"0 8px 8px 0",padding:"8px 4px",fontSize:"12px",background:V.white,outline:"none",cursor:"pointer",width:"40%",fontFamily:"inherit"}}>
              <option value="percent">%</option>
              <option value="fixed">USD</option>
            </select>
          </div>
        </div>
        <div>
          <Label>Unit (USD/yr)</Label>
          <div style={{fontSize:"13px",color:V.muted,padding:"8px 0",fontWeight:500}}>{fmt$(usd)}</div>
        </div>
        <div>
          <Label>Net (USD)</Label>
          <div style={{fontSize:"15px",fontWeight:700,color:V.ink,padding:"8px 0"}}>{fmt$(net)}</div>
        </div>
      </div>
      {item?.description&&<p style={{fontSize:"11.5px",color:"#94A3B8",margin:0}}>{item.description}</p>}
    </div>
  );
}

// ─── HTML EXPORT ─────────────────────────────────────────────────────────────
function exportQuoteWord({cl,annualList,discTotal,subUSD,subLocal,taxLocal,grandLocal,customer,qd,currency,billingCycle,monthCount,startDate,endDate,taxConfig,paymentTerms,cats,sym}) {
  const f$ = n => `$${n.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const fC = (n,s) => `${s}${n.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const fD = s => s ? new Date(s).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}) : "—";
  const cycleLabel = billingCycle==="monthly"?`Monthly (${monthCount} mo)`:billingCycle.charAt(0).toUpperCase()+billingCycle.slice(1);

  const tableRows = cl.map(l=>`
    <tr>
      <td style="border:1px solid #ccc;padding:6px 10px;">${l.item?.name||""}<br/><small style="color:#666;">${l.item?.description||""}</small></td>
      <td style="border:1px solid #ccc;padding:6px 10px;text-align:center;">${l.qty}</td>
      <td style="border:1px solid #ccc;padding:6px 10px;text-align:right;">${f$(l.item?.unitPrice||0)}</td>
      <td style="border:1px solid #ccc;padding:6px 10px;text-align:right;">${l.disc>0?`-${f$(l.disc)}`:"—"}</td>
      <td style="border:1px solid #ccc;padding:6px 10px;text-align:right;font-weight:bold;">${f$(l.net)}</td>
    </tr>`).join("");

  const tcBlocks = cats.map(cat=>`
    <p><strong>${PRODUCTS[cat].label}</strong><br/>${PRODUCTS[cat].tc}</p>`).join("");

  const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>Quote ${qd.quoteId}</title>
<style>
  body{font-family:Arial,sans-serif;font-size:11pt;color:#1E293B;margin:2cm;}
  h1{color:#0D1B3E;} h2{color:#0D1B3E;border-bottom:1px solid #E2E8F0;padding-bottom:4px;}
  table{border-collapse:collapse;width:100%;margin-bottom:16pt;}
  th{background:#0D1B3E;color:#fff;padding:6px 10px;border:1px solid #0D1B3E;text-align:left;}
  .sig-box{border:1px solid #ccc;height:60px;margin-top:6px;}
  .field-line{border-bottom:1px solid #ccc;margin-top:4px;min-height:20px;}
</style></head>
<body>
<p>${LOGO_HTML(44)}</p>
<h1>Sales Quotation — ${qd.quoteId}</h1>
<table style="border:none;width:100%;margin-bottom:20pt;">
  <tr><td style="border:none;width:50%;vertical-align:top;">
    <strong>Prepared For</strong><br/>
    ${customer.name||"—"}<br/>${customer.company||"—"}<br/>${customer.email||""}${customer.phone?" · "+customer.phone:""}
  </td><td style="border:none;width:50%;vertical-align:top;">
    <table style="border:none;font-size:10pt;">
      ${[["Quote Name",qd.quoteName||"—"],["Prepared By",qd.owner||"—"],["Issue Date",qd.createdOn],["Valid Until",qd.validUntil?fD(qd.validUntil):"30 days"],["Period",`${fD(startDate)} → ${fD(endDate)}`],["Billing",cycleLabel],["Payment Terms",paymentTerms]].map(([k,v])=>`<tr><td style="border:none;color:#64748B;padding:1px 8px 1px 0;font-size:9pt;">${k}</td><td style="border:none;font-weight:600;padding:1px 0;">${v}</td></tr>`).join("")}
    </table>
  </td></tr>
</table>

<h2>Products &amp; Services</h2>
<table><thead><tr>
  <th>Product / Description</th><th style="text-align:center;">Seats</th>
  <th style="text-align:right;">Unit Price (USD/yr)</th>
  <th style="text-align:right;">Discount</th>
  <th style="text-align:right;">Net Amount (USD)</th>
</tr></thead><tbody>${tableRows}</tbody>
<tfoot>
  <tr><td colspan="4" style="border:1px solid #ccc;padding:6px 10px;text-align:right;">Sub-Total (USD)</td><td style="border:1px solid #ccc;padding:6px 10px;text-align:right;font-weight:bold;">${f$(subUSD)}</td></tr>
  ${currency.code!=="USD"?`<tr><td colspan="4" style="border:1px solid #ccc;padding:6px 10px;text-align:right;">Sub-Total (${currency.code}) @ ${currency.rate.toFixed(2)}</td><td style="border:1px solid #ccc;padding:6px 10px;text-align:right;font-weight:bold;">${fC(subLocal,sym)}</td></tr>`:""}
  ${taxConfig.rate>0?`<tr><td colspan="4" style="border:1px solid #ccc;padding:6px 10px;text-align:right;">${taxConfig.label}</td><td style="border:1px solid #ccc;padding:6px 10px;text-align:right;">${fC(taxLocal,sym)}</td></tr>`:""}
  <tr style="background:#0D1B3E;color:#fff;"><td colspan="4" style="border:1px solid #0D1B3E;padding:8px 10px;text-align:right;font-weight:bold;">TOTAL (${currency.code})</td><td style="border:1px solid #0D1B3E;padding:8px 10px;text-align:right;font-size:14pt;font-weight:bold;">${fC(grandLocal,sym)}</td></tr>
</tfoot></table>

<h2>Terms &amp; Conditions</h2>
${tcBlocks}
${qd.notes?`<h2>Notes</h2><p>${qd.notes}</p>`:""}

<h2>Acceptance &amp; Authorisation</h2>
<p>By signing below, both parties agree to the terms and pricing set forth in this quotation (${qd.quoteId}). Payment Terms: <strong>${paymentTerms}</strong>.</p>
<table style="border:none;"><tr>
  <td style="border:none;width:48%;vertical-align:top;padding-right:20px;">
    <strong style="color:#0D1B3E;">Customer Authorisation</strong>
    <p class="field-label" style="font-size:9pt;color:#64748B;margin:12px 0 2px;">Authorised Signatory Name</p><div class="field-line"></div>
    <p class="field-label" style="font-size:9pt;color:#64748B;margin:12px 0 2px;">Title / Designation</p><div class="field-line"></div>
    <p class="field-label" style="font-size:9pt;color:#64748B;margin:12px 0 2px;">Company Name</p><div class="field-line">${customer.company||""}</div>
    <p class="field-label" style="font-size:9pt;color:#64748B;margin:12px 0 2px;">Signature</p><div class="sig-box"></div>
    <p class="field-label" style="font-size:9pt;color:#64748B;margin:12px 0 2px;">Date</p><div class="field-line"></div>
  </td>
  <td style="border:none;width:48%;vertical-align:top;padding-left:20px;">
    <strong style="color:#0D1B3E;">Virtuos Digital — Authorisation</strong>
    <p class="field-label" style="font-size:9pt;color:#64748B;margin:12px 0 2px;">Authorised Signatory Name</p><div class="field-line"></div>
    <p class="field-label" style="font-size:9pt;color:#64748B;margin:12px 0 2px;">Title / Designation</p><div class="field-line"></div>
    <p class="field-label" style="font-size:9pt;color:#64748B;margin:12px 0 2px;">Company Name</p><div class="field-line">Virtuos Digital</div>
    <p class="field-label" style="font-size:9pt;color:#64748B;margin:12px 0 2px;">Signature</p><div class="sig-box"></div>
    <p class="field-label" style="font-size:9pt;color:#64748B;margin:12px 0 2px;">Date</p><div class="field-line"></div>
  </td>
</tr></table>

<p style="margin-top:30px;font-size:9pt;color:#64748B;text-align:center;">Questions? Contact your Virtuos Digital representative · sales@virtuos.com · www.virtuos.com</p>
</body></html>`;

  const blob = new Blob([html],{type:"application/msword;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href=url; a.download=`Quote-${qd.quoteId}.doc`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url),10000);
}

function exportQuoteHTML({cl,annualList,discTotal,subUSD,subLocal,taxLocal,grandLocal,customer,qd,currency,billingCycle,monthCount,startDate,endDate,taxConfig,paymentTerms,cats,sym}) {
  const f$ = n => `$${n.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const fC = (n,s) => `${s}${n.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const fD = s => s ? new Date(s).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}) : "—";
  const cycleLabel = billingCycle==="monthly" ? `Monthly (${monthCount} mo)` : billingCycle.charAt(0).toUpperCase()+billingCycle.slice(1);
  const days = daysBetween(startDate,endDate);

  const logoSVG  = LOGO_HTML(44);
  const logoSVGDark = LOGO_HTML(36);

  const tableRows = cl.map((l,i) => `
    <tr style="background:${i%2===0?"#fff":"#F8FAFC"}">
      <td style="padding:10px 13px;border-bottom:1px solid #F1F5F9;">
        <div style="display:flex;align-items:flex-start;gap:8px;">
          <div style="width:3px;min-height:28px;border-radius:2px;background:${l.p?.color};flex-shrink:0;margin-top:2px;"></div>
          <div>
            <div style="font-weight:700;color:#1E293B;font-size:13px;">${l.item?.name||""}</div>
            <div style="font-size:10.5px;color:#94A3B8;margin-top:1px;">${l.item?.description||""}</div>
            ${!l.isFullPeriod&&!l.isPro ? `<span style="font-size:10px;background:#FEF3C7;color:#92400E;padding:1px 5px;border-radius:4px;font-weight:700;display:inline-block;margin-top:2px;">Pro-rata ${(l.pr*100).toFixed(1)}% · ${days} days</span>` : ""}
          </div>
        </div>
      </td>
      <td style="padding:10px 13px;text-align:right;color:#64748B;font-weight:500;border-bottom:1px solid #F1F5F9;">${l.qty}</td>
      <td style="padding:10px 13px;text-align:right;color:#64748B;border-bottom:1px solid #F1F5F9;">${f$(l.item?.unitPrice||0)}</td>
      <td style="padding:10px 13px;text-align:right;color:${l.disc>0?"#DC2626":"#94A3B8"};border-bottom:1px solid #F1F5F9;">
        ${l.disc>0?`-${f$(l.disc)}${l.discountType==="percent"?`<div style="font-size:9.5px;color:#94A3B8">${l.discount}% off</div>`:""}`:"—"}
      </td>
      <td style="padding:10px 13px;text-align:right;font-weight:800;color:#1E293B;font-size:14px;border-bottom:1px solid #F1F5F9;">${f$(l.net)}</td>
    </tr>`).join("");

  const summaryRows = cl.map((l,i) => `
    <tr style="background:${i%2===0?"#F8FAFC":"#fff"}">
      <td style="padding:8px 16px;font-weight:600;color:#1E293B;font-size:12px;border-bottom:1px solid #E2E8F0;">${l.item?.name||""}</td>
      <td style="padding:8px 16px;text-align:right;color:#64748B;font-size:12px;border-bottom:1px solid #E2E8F0;">${l.qty}</td>
      <td style="padding:8px 16px;text-align:right;font-weight:700;color:#1E293B;font-size:12px;border-bottom:1px solid #E2E8F0;">${f$(l.net)}</td>
    </tr>`).join("");

  const tcBlocks = cats.map(cat => `
    <div style="background:${PRODUCTS[cat].bgColor};border-radius:8px;padding:12px 14px;border-left:3px solid ${PRODUCTS[cat].color};margin-bottom:8px;">
      <div style="font-size:10.5px;font-weight:800;color:${PRODUCTS[cat].color};text-transform:uppercase;letter-spacing:0.07em;margin-bottom:5px;">${PRODUCTS[cat].label}</div>
      <p style="font-size:11px;color:#475569;line-height:1.65;margin:0;">${PRODUCTS[cat].tc}</p>
    </div>`).join("");

  const conversionRows = currency.code!=="USD" ? `
    <tr style="background:#EFF6FF">
      <td colspan="2" style="padding:4px 14px;font-size:12px;color:#64748B;">FX Rate (1 USD → ${currency.code})</td>
      <td style="padding:4px 14px;text-align:right;font-weight:600;color:#1E293B;font-size:12px;">${currency.rate.toFixed(2)}</td>
    </tr>
    <tr style="background:#EFF6FF">
      <td colspan="2" style="padding:4px 14px 10px;font-size:12px;color:#64748B;">Sub-Total (${currency.code})</td>
      <td style="padding:4px 14px 10px;text-align:right;font-weight:700;color:#1E293B;font-size:13px;">${fC(subLocal,sym)}</td>
    </tr>` : "";

  const taxRow = taxConfig.rate>0 ? `
    <tr style="background:#0D1B3E">
      <td colspan="2" style="padding:6px 14px;color:rgba(255,255,255,0.6);font-size:12px;">${taxConfig.label}</td>
      <td style="padding:6px 14px;text-align:right;color:rgba(255,255,255,0.8);font-weight:600;font-size:12px;">${fC(taxLocal,sym)}</td>
    </tr>` : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Quote ${qd.quoteId} — Virtuos Digital</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'DM Sans', Arial, sans-serif; background: #fff; color: #1E293B; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { width: 210mm; min-height: 297mm; margin: 0 auto; background: #fff; }
    @media print {
      body { margin: 0; }
      .page { width: 100%; margin: 0; }
      .page-break { page-break-before: always; }
      .no-print { display: none !important; }
    }
    @media screen {
      body { background: #E2E8F0; padding: 20px; }
      .page { box-shadow: 0 4px 30px rgba(0,0,0,0.15); margin-bottom: 20px; }
    }
    @media screen and (max-width: 700px) {
      body { padding: 8px; }
      .page { width: 100%; min-height: auto; }
      .page-body { padding: 16px !important; }
      .hide-mobile { display: none !important; }
      .sig-grid { grid-template-columns: 1fr !important; }
      .hdr-grid  { grid-template-columns: 1fr !important; gap: 12px !important; }
    }
    table { border-collapse: collapse; width: 100%; }
    .table-wrap { overflow-x: auto; border-radius: 10px; border: 1px solid #E2E8F0; }
    .table-wrap table { min-width: 420px; border: none; }
    .sig-box { border: 2px dashed #CBD5E1; border-radius: 8px; height: 60px; display: flex; align-items: center; justify-content: center; background: #F8FAFC; position: relative; }
    .sig-label { font-size: 10px; color: #CBD5E1; letter-spacing: 0.08em; text-transform: uppercase; }
    .docu-badge { position: absolute; bottom: 5px; right: 8px; display: flex; align-items: center; gap: 3px; }
    .docu-dot { width: 8px; height: 8px; border-radius: 50%; background: #FFD700; }
    .docu-text { font-size: 9px; color: #94A3B8; font-weight: 700; }
    .field-line { border-bottom: 1.5px solid #CBD5E1; padding: 4px 2px; min-height: 24px; font-size: 13px; color: #1E293B; }
    .field-label { font-size: 10px; color: #94A3B8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 3px; margin-top: 12px; }
  </style>
</head>
<body>

<!-- ══ PAGE 1 ══ -->
<div class="page">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#0D1B3E 0%,#162447 55%,#1A2C55 100%);padding:0;position:relative;overflow:hidden;">
    <div style="position:absolute;right:0;top:0;opacity:0.07;pointer-events:none;">
      <svg width="300" height="150" viewBox="0 0 300 150"><circle cx="300" cy="0" r="150" fill="none" stroke="#E84B9C" stroke-width="38"/><circle cx="300" cy="0" r="100" fill="none" stroke="#F97316" stroke-width="18"/><circle cx="300" cy="0" r="60" fill="none" stroke="#0EA5E9" stroke-width="9"/></svg>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;padding:22px 36px 16px;">
      <div style="background:#fff;border-radius:10px;padding:8px 16px;display:inline-flex;align-items:center;">${logoSVG}</div>
      <div style="text-align:right;">
        <div style="font-size:10px;color:rgba(255,255,255,0.45);letter-spacing:0.12em;text-transform:uppercase;margin-bottom:4px;">Quote Reference</div>
        <div style="font-size:16px;font-weight:800;font-family:monospace;color:#fff;background:rgba(255,255,255,0.1);padding:5px 13px;border-radius:7px;border:1px solid rgba(255,255,255,0.15);display:inline-block;">${qd.quoteId}</div>
      </div>
    </div>
    <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(232,75,156,0.6),rgba(249,115,22,0.6),transparent);margin:0 36px;"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;padding:16px 36px 24px" class="hdr-grid">
      <div>
        <div style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">Prepared For</div>
        <div style="font-size:18px;font-weight:800;color:#fff;line-height:1.2;">${customer.name||"—"}</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.65);margin-top:3px;">${customer.company||"—"}</div>
        <div style="font-size:12px;color:rgba(255,255,255,0.4);margin-top:2px;">${customer.email||""}${customer.phone?" · "+customer.phone:""}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 18px;align-content:start;">
        ${[["Quote Name",qd.quoteName||"—"],["Prepared By",qd.owner||"—"],["Issue Date",qd.createdOn],["Valid Until",qd.validUntil?fD(qd.validUntil):"30 days"],["Period",`${fD(startDate)} → ${fD(endDate)}`],["Billing",cycleLabel],["Payment Terms",paymentTerms]].map(([k,v])=>`
          <div><div style="font-size:9.5px;font-weight:700;color:rgba(255,255,255,0.38);text-transform:uppercase;letter-spacing:0.09em;">${k}</div><div style="font-size:12px;font-weight:600;color:rgba(255,255,255,0.82);margin-top:1px;">${v}</div></div>`).join("")}
      </div>
    </div>
  </div>

  <!-- Accent bar -->
  <div style="height:4px;background:linear-gradient(90deg,#E84B9C,#F97316,#0EA5E9,#7C3AED);"></div>

  <!-- Body -->
  <div class="page-body" style="padding:26px 36px;">

    <!-- Section header -->
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
      <div style="height:1px;flex:1;background:linear-gradient(90deg,#E2E8F0,transparent);"></div>
      <span style="font-size:10px;font-weight:800;color:#94A3B8;text-transform:uppercase;letter-spacing:0.1em;white-space:nowrap;">Product &amp; Services Summary</span>
      <div style="height:1px;flex:1;background:linear-gradient(90deg,transparent,#E2E8F0);"></div>
    </div>

    <!-- Products table -->
    <div class="table-wrap" style="margin-bottom:22px;"><table>
      <thead>
        <tr style="background:#0D1B3E;">
          <th style="padding:9px 13px;text-align:left;font-weight:700;color:#fff;font-size:10px;text-transform:uppercase;letter-spacing:0.06em;">Product / Description</th>
          <th style="padding:9px 13px;text-align:right;font-weight:700;color:#fff;font-size:10px;text-transform:uppercase;letter-spacing:0.06em;">Seats</th>
          <th style="padding:9px 13px;text-align:right;font-weight:700;color:#fff;font-size:10px;text-transform:uppercase;letter-spacing:0.06em;">Unit Price (USD/yr)</th>
          <th style="padding:9px 13px;text-align:right;font-weight:700;color:#fff;font-size:10px;text-transform:uppercase;letter-spacing:0.06em;">Discount</th>
          <th style="padding:9px 13px;text-align:right;font-weight:700;color:#fff;font-size:10px;text-transform:uppercase;letter-spacing:0.06em;">Net Amount (USD)</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table></div>

    <!-- Totals -->
    <div style="display:flex;justify-content:flex-end;margin-bottom:26px;">
      <div style="width:310px;background:#F8FAFC;border-radius:12px;overflow:hidden;border:1px solid #E2E8F0;">
        <div style="padding:13px 14px;border-bottom:1px solid #E2E8F0;">
          <div style="font-size:10px;font-weight:800;color:#94A3B8;text-transform:uppercase;letter-spacing:0.09em;margin-bottom:7px;">USD Summary</div>
          <table>
            <tr><td style="padding:3px 0;font-size:12.5px;color:#64748B;">Annual List Price</td><td style="padding:3px 0;text-align:right;font-size:12.5px;font-weight:600;color:#1E293B;">${f$(annualList)}</td></tr>
            <tr><td style="padding:3px 0;font-size:12.5px;color:#64748B;">Total Discount</td><td style="padding:3px 0;text-align:right;font-size:12.5px;font-weight:600;color:#DC2626;">-${f$(discTotal)}</td></tr>
            <tr style="border-top:1px dashed #E2E8F0;"><td style="padding:7px 0 3px;font-size:13px;font-weight:700;color:#1E293B;">Sub-Total (USD)</td><td style="padding:7px 0 3px;text-align:right;font-size:14px;font-weight:800;color:#1E293B;">${f$(subUSD)}</td></tr>
          </table>
        </div>
        ${currency.code!=="USD" ? `<div style="padding:12px 14px;border-bottom:1px solid #E2E8F0;background:#EFF6FF;">
          <div style="font-size:10px;font-weight:800;color:#94A3B8;text-transform:uppercase;letter-spacing:0.09em;margin-bottom:7px;">Currency Conversion</div>
          <table>
            <tr><td style="padding:3px 0;font-size:12.5px;color:#64748B;">FX Rate (1 USD → ${currency.code})</td><td style="padding:3px 0;text-align:right;font-size:12.5px;font-weight:600;color:#1E293B;">${currency.rate.toFixed(2)}</td></tr>
            <tr><td style="padding:3px 0;font-size:12.5px;color:#64748B;">Sub-Total (${currency.code})</td><td style="padding:3px 0;text-align:right;font-size:13px;font-weight:700;color:#1E293B;">${fC(subLocal,sym)}</td></tr>
          </table>
        </div>` : ""}
        <div style="padding:14px;background:#0D1B3E;">
          ${taxConfig.rate>0 ? `<table style="margin-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.12);padding-bottom:8px;"><tr><td style="font-size:12px;color:rgba(255,255,255,0.6);padding:0 0 6px;">${taxConfig.label}</td><td style="text-align:right;font-size:12px;font-weight:600;color:rgba(255,255,255,0.8);padding:0 0 6px;">${fC(taxLocal,sym)}</td></tr></table>` : ""}
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.65);text-transform:uppercase;letter-spacing:0.05em;">Total Amount (${currency.code})</span>
            <span style="font-size:22px;font-weight:900;color:#fff;">${fC(grandLocal,sym)}</span>
          </div>
          ${currency.code!=="USD" ? `<div style="font-size:11px;color:rgba(255,255,255,0.35);text-align:right;margin-top:2px;">≈ ${f$(subUSD)} USD excl. tax</div>` : ""}
        </div>
      </div>
    </div>

    <!-- T&C -->
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
      <div style="height:1px;flex:1;background:linear-gradient(90deg,#E2E8F0,transparent);"></div>
      <span style="font-size:10px;font-weight:800;color:#94A3B8;text-transform:uppercase;letter-spacing:0.1em;white-space:nowrap;">Terms &amp; Conditions</span>
      <div style="height:1px;flex:1;background:linear-gradient(90deg,transparent,#E2E8F0);"></div>
    </div>
    ${tcBlocks}
    ${qd.notes ? `<div style="background:#FFFBEB;border-radius:8px;padding:11px 14px;border-left:3px solid #F59E0B;margin-top:10px;"><div style="font-size:10.5px;font-weight:800;color:#B45309;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:4px;">Notes</div><p style="font-size:11.5px;color:#78350F;line-height:1.6;">${qd.notes}</p></div>` : ""}

    <!-- Footer -->
    <div style="display:flex;justify-content:space-between;align-items:center;padding-top:16px;border-top:1px solid #E2E8F0;margin-top:16px;">
      <div style="font-size:10px;color:#94A3B8;">This quote is confidential and prepared exclusively for ${customer.company||"the named customer"}.</div>
      <div style="font-size:10px;color:#94A3B8;font-weight:600;">Page 1 of 2</div>
    </div>
  </div>
</div>

<!-- ══ PAGE 2 ══ -->
<div class="page page-break">
  <div style="padding:32px 36px 36px;" class="page-body">

    <!-- Page 2 header -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:22px;">
      <div>
        ${logoSVGDark}
        <div style="font-size:10px;color:#94A3B8;margin-top:4px;letter-spacing:0.06em;text-transform:uppercase;">Order Acceptance &amp; Signature Page</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:11px;font-family:monospace;font-weight:700;color:#1E293B;background:#F1F5F9;padding:4px 10px;border-radius:6px;border:1px solid #E2E8F0;display:inline-block;">${qd.quoteId}</div>
        <div style="font-size:10px;color:#94A3B8;margin-top:3px;">Page 2 of 2</div>
      </div>
    </div>

    <!-- Summary divider -->
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
      <div style="height:1px;flex:1;background:linear-gradient(90deg,#E2E8F0,transparent);"></div>
      <span style="font-size:10px;font-weight:800;color:#94A3B8;text-transform:uppercase;letter-spacing:0.1em;white-space:nowrap;">Quote Summary</span>
      <div style="height:1px;flex:1;background:linear-gradient(90deg,transparent,#E2E8F0);"></div>
    </div>

    <!-- Page 2 summary table -->
    <div style="background:#F8FAFC;border-radius:10px;border:1px solid #E2E8F0;overflow:hidden;margin-bottom:22px;">
      <table>
        <thead><tr style="background:#0D1B3E;">
          <th style="padding:9px 16px;text-align:left;font-size:10px;font-weight:700;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:0.07em;">Product</th>
          <th style="padding:9px 16px;text-align:right;font-size:10px;font-weight:700;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:0.07em;">Seats</th>
          <th style="padding:9px 16px;text-align:right;font-size:10px;font-weight:700;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:0.07em;">Net (USD)</th>
        </tr></thead>
        <tbody>${summaryRows}</tbody>
        <tfoot><tr style="background:#0D1B3E;">
          <td colspan="2" style="padding:11px 16px;font-size:12px;font-weight:700;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:0.05em;">TOTAL (${currency.code})</td>
          <td style="padding:11px 16px;text-align:right;font-size:18px;font-weight:900;color:#fff;">${fC(grandLocal,sym)}</td>
        </tr></tfoot>
      </table>
    </div>

    <!-- Acceptance divider -->
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
      <div style="height:1px;flex:1;background:linear-gradient(90deg,#E2E8F0,transparent);"></div>
      <span style="font-size:10px;font-weight:800;color:#94A3B8;text-transform:uppercase;letter-spacing:0.1em;white-space:nowrap;">Acceptance &amp; Authorisation</span>
      <div style="height:1px;flex:1;background:linear-gradient(90deg,transparent,#E2E8F0);"></div>
    </div>

    <p style="font-size:12px;color:#475569;line-height:1.7;margin-bottom:22px;">By signing below, both parties agree to the terms and pricing set forth in this quotation (reference <strong>${qd.quoteId}</strong>), subject to the Terms &amp; Conditions on Page 1. This document constitutes a binding order upon counter-signature by an authorised Virtuos Digital representative. The subscription period will commence on <strong>${fD(startDate)}</strong> and expire on <strong>${fD(endDate)}</strong>. All pricing is in USD unless otherwise stated.</p>

    <!-- Signature blocks -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:28px;">

      <!-- Customer sig -->
      <div>
        <div style="font-size:11px;font-weight:800;color:#1E293B;text-transform:uppercase;letter-spacing:0.07em;padding-bottom:7px;border-bottom:2px solid #E84B9C;margin-bottom:4px;">Customer Authorisation</div>
        ${["Authorised Signatory Name","Title / Designation",`Company Name`].map((l,i)=>`
          <div class="field-label">${l}</div>
          <div class="field-line">${i===2?(customer.company||""):""}</div>`).join("")}
        <div class="field-label">Signature</div>
        <div class="sig-box">
          <span class="sig-label">Sign Here</span>
        </div>
        <div class="field-label">Date</div>
        <div class="field-line"></div>
      </div>

      <!-- Virtuos sig -->
      <div>
        <div style="font-size:11px;font-weight:800;color:#1E293B;text-transform:uppercase;letter-spacing:0.07em;padding-bottom:7px;border-bottom:2px solid #0EA5E9;margin-bottom:4px;">Virtuos Digital — Authorisation</div>
        ${["Authorised Signatory Name","Title / Designation","Company Name"].map((l,i)=>`
          <div class="field-label">${l}</div>
          <div class="field-line">${i===2?"Virtuos Digital":""}</div>`).join("")}
        <div class="field-label">Signature</div>
        <div class="sig-box">
          <span class="sig-label">Sign Here</span>
        </div>
        <div class="field-label">Date</div>
        <div class="field-line"></div>
      </div>
    </div>

    <!-- Contact footer -->
    <div style="background:linear-gradient(135deg,#0D1B3E,#162447);border-radius:10px;padding:14px 20px;display:flex;justify-content:space-between;align-items:center;">
      <div>
        <div style="font-size:10.5px;font-weight:700;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:0.07em;margin-bottom:3px;">Questions? Contact your Virtuos Digital representative</div>
        <div style="font-size:12px;color:rgba(255,255,255,0.8);">sales@virtuos.com · www.virtuos.com</div>
      </div>
      <div style="background:rgba(255,255,255,0.12);border-radius:8px;padding:5px 12px;display:inline-flex;align-items:center;">${logoSVG}</div>
    </div>

  </div>
</div>

<!-- Print trigger -->
<div class="no-print" style="text-align:center;padding:16px;">
  <button onclick="window.print()" style="background:linear-gradient(135deg,#0D1B3E,#1A2C55);color:#fff;border:none;padding:12px 32px;border-radius:8px;cursor:pointer;font-size:14px;font-weight:700;font-family:'DM Sans',Arial,sans-serif;box-shadow:0 4px 14px rgba(13,27,62,0.4);">🖨 Print / Save as PDF</button>
  <p style="font-size:11px;color:#94A3B8;margin-top:8px;">Use your browser's Print dialog → select "Save as PDF" as the destination</p>
</div>

</body>
</html>`;

  // Always use direct download — window.open is blocked in sandboxed environments
  const blob = new Blob([html], {type:"text/html;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Quote-${qd.quoteId}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url), 10000);
}

// ─── QUOTE PREVIEW / EXPORT ──────────────────────────────────────────────────
function QuotePreview({data,onClose}){
  const {lines,customer,qd,currency,billingCycle,monthCount,startDate,endDate,taxConfig,paymentTerms}=data;
  const sym=currency.symbol;
  const cl=computeLines(lines,startDate,endDate,billingCycle);

  const annualList  = cl.reduce((s,l)=>s+l.annual,0);
  const discTotal   = cl.reduce((s,l)=>s+l.disc,0);
  const subUSD      = cl.reduce((s,l)=>s+l.net,0);
  const subLocal    = subUSD*currency.rate;
  const taxLocal    = subLocal*taxConfig.rate;
  const grandLocal  = subLocal+taxLocal;

  const cats=[...new Set(lines.map(l=>l.productCategory))];

  const sectionHeader = (txt) => (
    <div style={{display:"flex",alignItems:"center",gap:"10px",margin:"0 0 14px"}}>
      <div style={{height:"1px",flex:1,background:"linear-gradient(90deg,#E2E8F0,transparent)"}}/>
      <span style={{fontSize:"10px",fontWeight:800,color:"#94A3B8",textTransform:"uppercase",letterSpacing:"0.1em",whiteSpace:"nowrap"}}>{txt}</span>
      <div style={{height:"1px",flex:1,background:"linear-gradient(90deg,transparent,#E2E8F0)"}}/>
    </div>
  );

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(13,27,62,0.75)",zIndex:1000,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"12px",backdropFilter:"blur(6px)",overflowY:"auto"}}>
      <div className="qp-modal-inner">

        {/* ══ PAGE 1 ══════════════════════════════════════════════════════════ */}

        {/* Header band — Virtuos brand */}
        <div style={{background:"linear-gradient(135deg,#0D1B3E 0%,#162447 55%,#1A2C55 100%)",padding:"0",position:"relative",overflow:"hidden"}}>
          {/* Decorative arcs */}
          <svg style={{position:"absolute",right:0,top:0,opacity:0.07}} width="320" height="160" viewBox="0 0 320 160">
            <circle cx="320" cy="0" r="160" fill="none" stroke="#E84B9C" strokeWidth="40"/>
            <circle cx="320" cy="0" r="110" fill="none" stroke="#F97316" strokeWidth="20"/>
            <circle cx="320" cy="0" r="70" fill="none" stroke="#0EA5E9" strokeWidth="10"/>
          </svg>

          {/* Top strip: logo left, quote ID right */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"clamp(12px,3vw,22px) clamp(16px,4vw,36px) 14px",flexWrap:"wrap",gap:"10px"}}>
            <div style={{background:"#fff",borderRadius:"10px",padding:"8px 16px",display:"inline-flex",alignItems:"center"}}>
              <VirtuosLogo height={36}/>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:"10px",color:"rgba(255,255,255,0.5)",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:"3px"}}>Quote Reference</div>
              <div style={{fontSize:"16px",fontWeight:800,fontFamily:"monospace",color:"#fff",background:"rgba(255,255,255,0.1)",padding:"4px 12px",borderRadius:"7px",border:"1px solid rgba(255,255,255,0.15)"}}>{qd.quoteId}</div>
            </div>
          </div>

          {/* Divider */}
          <div style={{height:"1px",background:"linear-gradient(90deg,transparent,rgba(232,75,156,0.6),rgba(249,115,22,0.6),transparent)",margin:"0 36px"}}/>

          {/* Customer + meta row */}
          <div className="qp-header-grid">
            <div>
              <div style={{fontSize:"10px",fontWeight:700,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:"6px"}}>Prepared For</div>
              <div style={{fontSize:"clamp(14px,3vw,18px)",fontWeight:800,color:"#fff",lineHeight:1.2}}>{customer.name||"—"}</div>
              <div style={{fontSize:"13px",color:"rgba(255,255,255,0.65)",marginTop:"3px"}}>{customer.company||"—"}</div>
              <div style={{fontSize:"12px",color:"rgba(255,255,255,0.45)",marginTop:"2px"}}>{customer.email}{customer.phone?` · ${customer.phone}`:""}</div>
            </div>
            <div className="qp-meta-grid">
              {[
                ["Quote Name",    qd.quoteName||"—"],
                ["Prepared By",   qd.owner||"—"],
                ["Issue Date",    qd.createdOn],
                ["Valid Until",   qd.validUntil ? fmtDate(qd.validUntil) : "30 days"],
                ["Period",        `${fmtDate(startDate)} → ${fmtDate(endDate)}`],
                ["Billing",       billingCycle==="monthly"?`Monthly (${monthCount} mo)`:billingCycle.charAt(0).toUpperCase()+billingCycle.slice(1)],
                ["Payment Terms", paymentTerms],
              ].map(([k,v])=>(
                <div key={k}>
                  <div style={{fontSize:"9.5px",fontWeight:700,color:"rgba(255,255,255,0.4)",textTransform:"uppercase",letterSpacing:"0.09em"}}>{k}</div>
                  <div style={{fontSize:"12px",fontWeight:600,color:"rgba(255,255,255,0.85)",marginTop:"1px"}}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Accent bar — brand colors */}
        <div style={{height:"4px",background:"linear-gradient(90deg,#E84B9C,#F97316,#0EA5E9,#7C3AED)"}}/>

        {/* Body */}
        <div className="qp-body">

          {sectionHeader("Product & Services Summary")}

          {/* Table */}
          <div style={{overflowX:"auto",marginBottom:"24px",borderRadius:"10px",border:"1px solid #E2E8F0"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:"clamp(10px,1.5vw,12.5px)",minWidth:"480px"}}>
            <thead>
              <tr style={{background:"#0D1B3E"}}>
                {["Product / Description","Seats","Unit Price (USD/yr)","Discount","Net Amount (USD)"].map((h,i)=>(
                  <th key={h} style={{padding:"10px 13px",textAlign:i===0?"left":"right",fontWeight:700,color:"#fff",fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.06em",whiteSpace:"nowrap"}} className={h==="Unit Price (USD/yr)"?"qp-table-hide":""}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cl.map((l,i)=>{
                const rowBg = i%2===0?"#fff":"#F8FAFC";
                return(
                  <tr key={i} style={{background:rowBg,borderBottom:"1px solid #F1F5F9"}}>
                    <td style={{padding:"11px 13px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                        <div style={{width:"3px",height:"28px",borderRadius:"2px",background:l.p?.color,flexShrink:0}}/>
                        <div>
                          <div style={{fontWeight:700,color:V.ink,fontSize:"13px"}}>{l.item?.name}</div>
                          <div style={{fontSize:"10.5px",color:"#94A3B8",marginTop:"1px"}}>{l.item?.description}</div>
                          {!l.isFullPeriod&&!l.isPro&&(
                            <span style={{fontSize:"10px",background:"#FEF3C7",color:"#92400E",padding:"1px 5px",borderRadius:"4px",fontWeight:700,marginTop:"2px",display:"inline-block"}}>
                              Pro-rata {(l.pr*100).toFixed(1)}% · {daysBetween(startDate,endDate)} days
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{padding:"11px 13px",textAlign:"right",color:V.muted,fontWeight:500}}>{l.qty}</td>
                    <td style={{padding:"11px 13px",textAlign:"right",color:V.muted}} className="qp-table-hide">{fmt$(l.item?.unitPrice||0)}</td>
                    <td style={{padding:"11px 13px",textAlign:"right",color:l.disc>0?"#DC2626":"#94A3B8"}}>
                      {l.disc>0?`-${fmt$(l.disc)}`:"-"}
                      {l.disc>0&&l.discountType==="percent"&&<div style={{fontSize:"9.5px",color:"#94A3B8"}}>{l.discount}% off</div>}
                    </td>
                    <td style={{padding:"11px 13px",textAlign:"right",fontWeight:800,color:V.ink,fontSize:"14px"}}>{fmt$(l.net)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Totals + conversion */}
          <div style={{display:"flex",justifyContent:"flex-end",marginBottom:"28px"}}>
            <div style={{width:"min(320px,100%)",background:"#F8FAFC",borderRadius:"12px",overflow:"hidden",border:"1px solid #E2E8F0"}}>
              {/* USD section */}
              <div style={{padding:"14px 16px",borderBottom:"1px solid #E2E8F0"}}>
                <div style={{fontSize:"10px",fontWeight:800,color:"#94A3B8",textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:"8px"}}>USD Summary</div>
                {[
                  ["Annual List Price", fmt$(annualList)],
                  ["Total Discount",    `-${fmt$(discTotal)}`, "#DC2626"],
                ].map(([l,v,c])=>(
                  <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}>
                    <span style={{fontSize:"12.5px",color:V.muted}}>{l}</span>
                    <span style={{fontSize:"12.5px",fontWeight:600,color:c||V.ink}}>{v}</span>
                  </div>
                ))}
                <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0 0",borderTop:"1px dashed #E2E8F0",marginTop:"4px"}}>
                  <span style={{fontSize:"13px",fontWeight:700,color:V.ink}}>Sub-Total (USD)</span>
                  <span style={{fontSize:"14px",fontWeight:800,color:V.ink}}>{fmt$(subUSD)}</span>
                </div>
              </div>

              {/* Conversion section */}
              {currency.code!=="USD"&&(
                <div style={{padding:"14px 16px",borderBottom:"1px solid #E2E8F0",background:"#EFF6FF"}}>
                  <div style={{fontSize:"10px",fontWeight:800,color:"#94A3B8",textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:"8px"}}>Currency Conversion</div>
                  {[
                    [`FX Rate (1 USD → ${currency.code})`, currency.rate.toFixed(2)],
                    [`Sub-Total (${currency.code})`, fmtC(subLocal,sym)],
                  ].map(([l,v])=>(
                    <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}>
                      <span style={{fontSize:"12.5px",color:V.muted}}>{l}</span>
                      <span style={{fontSize:"12.5px",fontWeight:600,color:V.ink}}>{v}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Tax + grand total */}
              <div style={{padding:"14px 16px",background:"#0D1B3E"}}>
                {taxConfig.rate>0&&(
                  <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0 8px",borderBottom:"1px solid rgba(255,255,255,0.12)",marginBottom:"8px"}}>
                    <span style={{fontSize:"12.5px",color:"rgba(255,255,255,0.6)"}}>{taxConfig.label}</span>
                    <span style={{fontSize:"12.5px",fontWeight:600,color:"rgba(255,255,255,0.8)"}}>{fmtC(taxLocal,sym)}</span>
                  </div>
                )}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:"12px",fontWeight:700,color:"rgba(255,255,255,0.7)",textTransform:"uppercase",letterSpacing:"0.05em"}}>Total Amount ({currency.code})</span>
                  <span style={{fontSize:"22px",fontWeight:900,color:"#fff"}}>{fmtC(grandLocal,sym)}</span>
                </div>
                {currency.code!=="USD"&&<div style={{fontSize:"11px",color:"rgba(255,255,255,0.4)",textAlign:"right",marginTop:"2px"}}>≈ {fmt$(subUSD)} USD excl. tax</div>}
              </div>
            </div>
          </div>

          {/* T&C */}
          {sectionHeader("Terms & Conditions")}
          <div style={{display:"flex",flexDirection:"column",gap:"10px",marginBottom:"20px"}}>
            {cats.map(cat=>(
              <div key={cat} style={{background:PRODUCTS[cat].bgColor,borderRadius:"8px",padding:"12px 14px",borderLeft:`3px solid ${PRODUCTS[cat].color}`}}>
                <div style={{fontSize:"10.5px",fontWeight:800,color:PRODUCTS[cat].color,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"5px"}}>{PRODUCTS[cat].label}</div>
                <p style={{fontSize:"11px",color:"#475569",lineHeight:1.65,margin:0}}>{PRODUCTS[cat].tc}</p>
              </div>
            ))}
          </div>

          {qd.notes&&(
            <div style={{background:"#FFFBEB",borderRadius:"8px",padding:"12px 14px",borderLeft:"3px solid #F59E0B",marginBottom:"20px"}}>
              <div style={{fontSize:"10.5px",fontWeight:800,color:"#B45309",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"5px"}}>Notes</div>
              <p style={{fontSize:"11.5px",color:"#78350F",margin:0,lineHeight:1.6}}>{qd.notes}</p>
            </div>
          )}

          {/* Page footer */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:"16px",borderTop:"1px solid #E2E8F0"}}>
            <div style={{fontSize:"10px",color:"#94A3B8"}}>This quote is confidential and prepared exclusively for {customer.company||"the named customer"}.</div>
            <div style={{fontSize:"10px",color:"#94A3B8",fontWeight:600}}>Page 1 of 2</div>
          </div>
        </div>

        {/* ══ PAGE BREAK (print) ═══════════════════════════════════════════════ */}
        <div style={{borderTop:"3px dashed #E2E8F0",margin:"0 36px",display:"flex",alignItems:"center",justifyContent:"center",padding:"8px 0"}}>
          <span style={{fontSize:"10px",color:"#CBD5E1",letterSpacing:"0.12em",textTransform:"uppercase",background:"#fff",padding:"0 12px"}}>— Page Break / DocuSign Signature Page —</span>
        </div>

        {/* ══ PAGE 2 — SIGNING PAGE ════════════════════════════════════════════ */}
        <div style={{padding:"clamp(16px,4vw,32px) clamp(16px,4vw,36px) clamp(20px,4vw,36px)"}}>

          {/* Page 2 header */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"24px"}}>
            <div>
              <VirtuosLogo height={32}/>
              <div style={{fontSize:"10px",color:"#94A3B8",marginTop:"4px",letterSpacing:"0.06em",textTransform:"uppercase"}}>Order Acceptance & Signature Page</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:"11px",fontFamily:"monospace",fontWeight:700,color:V.ink,background:"#F1F5F9",padding:"4px 10px",borderRadius:"6px",border:"1px solid #E2E8F0"}}>{qd.quoteId}</div>
              <div style={{fontSize:"10px",color:"#94A3B8",marginTop:"3px"}}>Page 2 of 2</div>
            </div>
          </div>

          {sectionHeader("Quote Summary")}

          {/* Compact summary table for page 2 */}
          <div style={{background:"#F8FAFC",borderRadius:"10px",border:"1px solid #E2E8F0",overflow:"auto",marginBottom:"24px"}}>
            <div style={{background:"#0D1B3E",padding:"10px 16px",display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:"8px",minWidth:0}}>
              {["Product","Seats","Net (USD)"].map(h=>(
                <div key={h} style={{fontSize:"10px",fontWeight:700,color:"rgba(255,255,255,0.6)",textTransform:"uppercase",letterSpacing:"0.07em",textAlign:h==="Product"?"left":"right"}}>{h}</div>
              ))}
            </div>
            {cl.map((l,i)=>(
              <div key={i} style={{padding:"8px 16px",display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:"8px",minWidth:0,borderBottom:"1px solid #E2E8F0",background:i%2?"#fff":"#F8FAFC"}}>
                <div style={{fontSize:"12px",fontWeight:600,color:V.ink}}>{l.item?.name}</div>
                <div style={{fontSize:"12px",color:V.muted,textAlign:"right"}}>{l.qty}</div>
                <div style={{fontSize:"12px",fontWeight:700,color:V.ink,textAlign:"right"}}>{fmt$(l.net)}</div>
              </div>
            ))}
            <div style={{padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",background:"#0D1B3E"}}>
              <span style={{fontSize:"12px",fontWeight:700,color:"rgba(255,255,255,0.7)"}}>TOTAL ({currency.code})</span>
              <span style={{fontSize:"18px",fontWeight:900,color:"#fff"}}>{fmtC(grandLocal,sym)}</span>
            </div>
          </div>

          {sectionHeader("Acceptance & Authorisation")}

          <p style={{fontSize:"12px",color:"#475569",lineHeight:1.7,marginBottom:"24px"}}>
            By signing below, both parties agree to the terms and pricing set forth in this quotation (reference <strong>{qd.quoteId}</strong>), subject to the Terms & Conditions on Page 1. This document constitutes a binding order upon counter-signature by an authorised Virtuos Digital representative. The subscription period will commence on <strong>{fmtDate(startDate)}</strong> and expire on <strong>{fmtDate(endDate)}</strong>. All pricing is in USD unless otherwise stated.
          </p>

          {/* Signature blocks */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:"24px",marginBottom:"32px"}}>
            {/* Customer sig */}
            <div>
              <div style={{fontSize:"11px",fontWeight:800,color:V.ink,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"14px",paddingBottom:"6px",borderBottom:`2px solid ${V.pink}`}}>
                Customer Authorisation
              </div>
              {[["Authorised Signatory Name",""],["Title / Designation",""],["Company Name", customer.company||""]].map(([l,v])=>(
                <div key={l} style={{marginBottom:"14px"}}>
                  <div style={{fontSize:"10px",color:"#94A3B8",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"3px"}}>{l}</div>
                  <div style={{borderBottom:"1.5px solid #CBD5E1",padding:"4px 2px",minHeight:"22px",fontSize:"13px",color:V.ink}}>{v}</div>
                </div>
              ))}
              <div style={{marginBottom:"14px"}}>
                <div style={{fontSize:"10px",color:"#94A3B8",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"3px"}}>Signature</div>
                <div style={{border:"2px dashed #E2E8F0",borderRadius:"8px",height:"56px",display:"flex",alignItems:"center",justifyContent:"center",background:"#F8FAFC"}}>
                  <span style={{fontSize:"10px",color:"#CBD5E1",letterSpacing:"0.08em",textTransform:"uppercase"}}>Sign Here</span>
                </div>
              </div>
              <div>
                <div style={{fontSize:"10px",color:"#94A3B8",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"3px"}}>Date</div>
                <div style={{borderBottom:"1.5px solid #CBD5E1",padding:"4px 2px",minHeight:"22px"}}/>
              </div>
            </div>

            {/* Virtuos sig */}
            <div>
              <div style={{fontSize:"11px",fontWeight:800,color:V.ink,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"14px",paddingBottom:"6px",borderBottom:`2px solid #0EA5E9`}}>
                Virtuos Digital — Authorisation
              </div>
              {[["Authorised Signatory Name",""],["Title / Designation",""],["Company Name","Virtuos Digital"]].map(([l,v])=>(
                <div key={l} style={{marginBottom:"14px"}}>
                  <div style={{fontSize:"10px",color:"#94A3B8",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"3px"}}>{l}</div>
                  <div style={{borderBottom:"1.5px solid #CBD5E1",padding:"4px 2px",minHeight:"22px",fontSize:"13px",color:V.ink}}>{v}</div>
                </div>
              ))}
              <div style={{marginBottom:"14px"}}>
                <div style={{fontSize:"10px",color:"#94A3B8",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"3px"}}>Signature</div>
                <div style={{border:"2px dashed #E2E8F0",borderRadius:"8px",height:"56px",display:"flex",alignItems:"center",justifyContent:"center",background:"#F8FAFC"}}>
                  <span style={{fontSize:"10px",color:"#CBD5E1",letterSpacing:"0.08em",textTransform:"uppercase"}}>Sign Here</span>
                </div>
              </div>
              <div>
                <div style={{fontSize:"10px",color:"#94A3B8",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"3px"}}>Date</div>
                <div style={{borderBottom:"1.5px solid #CBD5E1",padding:"4px 2px",minHeight:"22px"}}/>
              </div>
            </div>
          </div>

          {/* Contact footer */}
          <div style={{background:"linear-gradient(135deg,#0D1B3E,#162447)",borderRadius:"10px",padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:"10.5px",fontWeight:700,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"3px"}}>Questions? Contact your Virtuos Digital representative</div>
              <div style={{fontSize:"12px",color:"rgba(255,255,255,0.8)"}}>sales@virtuos.com · www.virtuos.com</div>
            </div>
            <div style={{background:"rgba(255,255,255,0.12)",borderRadius:"8px",padding:"5px 12px",display:"inline-flex",alignItems:"center"}}>
              <VirtuosLogo height={26}/>
            </div>
          </div>
        </div>

        {/* Modal action bar */}
        <div className="qp-action-bar">
          <button onClick={onClose} style={{padding:"9px 20px",border:`1.5px solid ${V.border}`,borderRadius:"8px",background:"#fff",cursor:"pointer",fontSize:"13px",fontWeight:600,color:V.ink,fontFamily:"inherit"}}>Close</button>
          <button onClick={()=>exportQuoteWord({cl,annualList,discTotal,subUSD,subLocal,taxLocal,grandLocal,customer,qd,currency,billingCycle,monthCount,startDate,endDate,taxConfig,paymentTerms,cats,sym})}
            style={{padding:"9px 22px",background:"linear-gradient(135deg,#1D4ED8,#2563EB)",color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",fontSize:"13px",fontWeight:700,boxShadow:"0 4px 12px rgba(29,78,216,0.35)",fontFamily:"inherit"}}>
            📄 Export Word (.doc)
          </button>
          <button onClick={()=>exportQuoteHTML({cl,annualList,discTotal,subUSD,subLocal,taxLocal,grandLocal,customer,qd,currency,billingCycle,monthCount,startDate,endDate,taxConfig,paymentTerms,cats,sym})}
            style={{padding:"9px 22px",background:"linear-gradient(135deg,#0D1B3E,#1A2C55)",color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",fontSize:"13px",fontWeight:700,boxShadow:"0 4px 12px rgba(13,27,62,0.35)",fontFamily:"inherit"}}>
            🖨 Export / Print PDF
          </button>
        </div>
      </div>
    </div>
  </div>
  );
}

// ─── QUOTE STORAGE ────────────────────────────────────────────────────────────
const STORAGE_KEY = "virtuos_quotes_v1";
function loadSavedQuotes() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]"); } catch{ return []; }
}
function persistQuote(snapshot) {
  const all = loadSavedQuotes();
  const idx = all.findIndex(q=>q.id===snapshot.id);
  if(idx>=0) all[idx]=snapshot; else all.unshift(snapshot);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}
function deleteQuote(id) {
  const all = loadSavedQuotes().filter(q=>q.id!==id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

// ─── QUOTE HISTORY VIEW ───────────────────────────────────────────────────────
function QuoteHistory({onNewQuote, onLoadQuote}){
  const [quotes,setQuotes]=useState(loadSavedQuotes);
  const [search,setSearch]=useState("");
  const [sortBy,setSortBy]=useState("savedAt");
  const [confirm,setConfirm]=useState(null);

  const filtered=quotes
    .filter(q=>{
      const s=search.toLowerCase();
      return !s||q.customer?.company?.toLowerCase().includes(s)||q.customer?.name?.toLowerCase().includes(s)||q.id?.toLowerCase().includes(s)||q.quoteName?.toLowerCase().includes(s)||q.owner?.toLowerCase().includes(s);
    })
    .sort((a,b)=>{
      if(sortBy==="savedAt") return new Date(b.savedAt)-new Date(a.savedAt);
      if(sortBy==="total") return (b.grandLocal||0)-(a.grandLocal||0);
      if(sortBy==="company") return (a.customer?.company||"").localeCompare(b.customer?.company||"");
      return 0;
    });

  function handleDelete(id){
    deleteQuote(id);
    setQuotes(loadSavedQuotes());
    setConfirm(null);
  }

  const totalValue=quotes.reduce((s,q)=>s+(q.subUSD||0),0);
  const fmt$=n=>`$${n.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;

  return(
    <div className="qb-shell">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        .qb-shell { min-height:100vh; background:#F1F5F9; font-family:'DM Sans',system-ui,sans-serif; }
        .qb-nav { background:linear-gradient(90deg,#0D1B3E,#162447); height:58px; display:flex; align-items:center; justify-content:space-between; padding:0 20px; position:sticky; top:0; z-index:100; box-shadow:0 2px 12px rgba(13,27,62,0.4); gap:10px; }
        .qb-nav-left { display:flex; align-items:center; gap:12px; min-width:0; }
        .qb-nav-right { display:flex; gap:8px; align-items:center; flex-shrink:0; }
        .qh-table { width:100%; border-collapse:collapse; }
        .qh-table th { padding:10px 14px; text-align:left; font-size:10.5px; font-weight:800; color:#64748B; text-transform:uppercase; letter-spacing:0.07em; border-bottom:2px solid #E2E8F0; cursor:pointer; white-space:nowrap; }
        .qh-table th:hover { color:#0D1B3E; }
        .qh-table td { padding:12px 14px; border-bottom:1px solid #F1F5F9; font-size:13px; color:#1E293B; vertical-align:middle; }
        .qh-table tr:last-child td { border-bottom:none; }
        .qh-table tr:hover td { background:#F8FAFC; }
        .qh-badge { display:inline-block; padding:2px 8px; border-radius:5px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; }
        @media (max-width:700px) {
          .qh-hide { display:none; }
          .qh-table td, .qh-table th { padding:9px 8px; }
        }
      `}</style>

      {/* Nav */}
      <div className="qb-nav">
        <div className="qb-nav-left">
          <div style={{background:"#fff",borderRadius:"8px",padding:"5px 12px",display:"inline-flex",alignItems:"center",flexShrink:0}}>
            <VirtuosLogo height={26}/>
          </div>
          <div style={{width:"1px",height:"28px",background:"rgba(255,255,255,0.12)",flexShrink:0}}/>
          <div style={{color:"#fff",fontWeight:700,fontSize:"14px"}}>Quote History</div>
        </div>
        <div className="qb-nav-right">
          <button onClick={onNewQuote}
            style={{background:"linear-gradient(135deg,#E84B9C,#F97316)",color:"#fff",border:"none",padding:"8px 16px",borderRadius:"8px",cursor:"pointer",fontSize:"13px",fontWeight:700,fontFamily:"inherit",whiteSpace:"nowrap"}}>
            + New Quote
          </button>
        </div>
      </div>

      <div style={{maxWidth:"1100px",margin:"0 auto",padding:"24px 20px"}}>

        {/* Stats bar */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:"12px",marginBottom:"20px"}}>
          {[
            ["Total Quotes",quotes.length,"#0D1B3E"],
            ["Pipeline (USD)",fmt$(totalValue),"#E84B9C"],
            ["This Month",quotes.filter(q=>q.savedAt&&new Date(q.savedAt).getMonth()===new Date().getMonth()).length,"#0EA5E9"],
          ].map(([label,val,color])=>(
            <div key={label} style={{background:"#fff",borderRadius:"12px",padding:"16px 20px",border:"1px solid #E2E8F0",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
              <div style={{fontSize:"10px",fontWeight:800,color:"#94A3B8",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"6px"}}>{label}</div>
              <div style={{fontSize:"22px",fontWeight:900,color}}>{val}</div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div style={{display:"flex",gap:"10px",marginBottom:"14px",flexWrap:"wrap"}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by company, contact, quote ID, owner…"
            style={{flex:1,minWidth:"200px",border:"1.5px solid #E2E8F0",borderRadius:"8px",padding:"8px 12px",fontSize:"13px",outline:"none",fontFamily:"inherit"}}
            onFocus={e=>e.target.style.borderColor="#E84B9C"} onBlur={e=>e.target.style.borderColor="#E2E8F0"}/>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
            style={{border:"1.5px solid #E2E8F0",borderRadius:"8px",padding:"8px 12px",fontSize:"13px",outline:"none",fontFamily:"inherit",background:"#fff",cursor:"pointer"}}>
            <option value="savedAt">Sort: Latest first</option>
            <option value="total">Sort: Highest value</option>
            <option value="company">Sort: Company A–Z</option>
          </select>
        </div>

        {/* Table */}
        <div style={{background:"#fff",borderRadius:"14px",border:"1px solid #E2E8F0",boxShadow:"0 1px 4px rgba(0,0,0,0.05)",overflow:"hidden"}}>
          {filtered.length===0?(
            <div style={{padding:"60px 24px",textAlign:"center"}}>
              <div style={{fontSize:"36px",marginBottom:"10px"}}>{quotes.length===0?"📋":"🔍"}</div>
              <div style={{fontSize:"15px",fontWeight:700,color:"#1E293B"}}>{quotes.length===0?"No quotes saved yet":"No quotes match your search"}</div>
              <div style={{fontSize:"12px",color:"#94A3B8",marginTop:"4px"}}>{quotes.length===0?"Create a quote and preview it to save it here.":"Try a different search term."}</div>
              {quotes.length===0&&<button onClick={onNewQuote} style={{marginTop:"16px",background:"linear-gradient(135deg,#E84B9C,#F97316)",color:"#fff",border:"none",padding:"10px 22px",borderRadius:"8px",cursor:"pointer",fontSize:"13px",fontWeight:700,fontFamily:"inherit"}}>Create your first quote</button>}
            </div>
          ):(
            <div style={{overflowX:"auto"}}>
              <table className="qh-table">
                <thead>
                  <tr>
                    <th onClick={()=>setSortBy("company")}>Company / Contact</th>
                    <th>Quote ID</th>
                    <th className="qh-hide">Products</th>
                    <th className="qh-hide" onClick={()=>setSortBy("company")}>Owner</th>
                    <th className="qh-hide">Payment</th>
                    <th onClick={()=>setSortBy("total")}>Total (USD)</th>
                    <th onClick={()=>setSortBy("savedAt")}>Saved</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(q=>{
                    const cats=[...new Set((q.lines||[]).map(l=>l.productCategory))];
                    const catColors={asana:"#FC636B",smartsheet:"#0073EA",professional_services:"#7C3AED"};
                    const catLabels={asana:"Asana",smartsheet:"Smartsheet",professional_services:"Prof. Services"};
                    return(
                      <tr key={q.id}>
                        <td>
                          <div style={{fontWeight:700,color:"#1E293B"}}>{q.customer?.company||"—"}</div>
                          <div style={{fontSize:"11.5px",color:"#94A3B8",marginTop:"1px"}}>{q.customer?.name||""}{q.customer?.email?` · ${q.customer.email}`:""}</div>
                        </td>
                        <td>
                          <div style={{fontFamily:"monospace",fontSize:"12px",fontWeight:700,color:"#0D1B3E",background:"#F1F5F9",padding:"2px 7px",borderRadius:"5px",display:"inline-block"}}>{q.id}</div>
                          {q.quoteName&&<div style={{fontSize:"11px",color:"#64748B",marginTop:"3px"}}>{q.quoteName}</div>}
                        </td>
                        <td className="qh-hide">
                          <div style={{display:"flex",flexWrap:"wrap",gap:"4px"}}>
                            {cats.map(c=>(
                              <span key={c} className="qh-badge" style={{background:catColors[c]+"18",color:catColors[c],border:`1px solid ${catColors[c]}33`}}>{catLabels[c]}</span>
                            ))}
                          </div>
                        </td>
                        <td className="qh-hide" style={{color:"#64748B"}}>{q.owner||"—"}</td>
                        <td className="qh-hide" style={{fontSize:"12px",color:"#64748B"}}>{q.paymentTerms||"—"}</td>
                        <td>
                          <div style={{fontWeight:800,color:"#1E293B"}}>{fmt$(q.subUSD||0)}</div>
                          {q.currency?.code&&q.currency.code!=="USD"&&<div style={{fontSize:"11px",color:"#94A3B8"}}>{q.currency.symbol}{((q.subUSD||0)*q.currency.rate).toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:0})} {q.currency.code}</div>}
                        </td>
                        <td style={{color:"#94A3B8",fontSize:"12px",whiteSpace:"nowrap"}}>{q.savedAt?new Date(q.savedAt).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}):q.createdOn||"—"}</td>
                        <td>
                          <div style={{display:"flex",gap:"6px",justifyContent:"flex-end"}}>
                            <button onClick={()=>onLoadQuote(q)}
                              style={{padding:"5px 12px",background:"#0D1B3E",color:"#fff",border:"none",borderRadius:"6px",cursor:"pointer",fontSize:"12px",fontWeight:600,fontFamily:"inherit",whiteSpace:"nowrap"}}>
                              Load
                            </button>
                            {confirm===q.id?(
                              <>
                                <button onClick={()=>handleDelete(q.id)} style={{padding:"5px 10px",background:"#EF4444",color:"#fff",border:"none",borderRadius:"6px",cursor:"pointer",fontSize:"12px",fontWeight:600,fontFamily:"inherit"}}>Confirm</button>
                                <button onClick={()=>setConfirm(null)} style={{padding:"5px 10px",background:"#F1F5F9",color:"#64748B",border:"1px solid #E2E8F0",borderRadius:"6px",cursor:"pointer",fontSize:"12px",fontFamily:"inherit"}}>Cancel</button>
                              </>
                            ):(
                              <button onClick={()=>setConfirm(q.id)} style={{padding:"5px 10px",background:"#FEF2F2",color:"#EF4444",border:"1px solid #FECACA",borderRadius:"6px",cursor:"pointer",fontSize:"12px",fontFamily:"inherit"}}>Delete</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div style={{marginTop:"10px",fontSize:"11px",color:"#94A3B8",textAlign:"right"}}>{filtered.length} of {quotes.length} quotes · stored in browser localStorage</div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function QuoteBuilder(){
  const today=new Date().toISOString().split("T")[0];
  const [view,setView]=useState("builder"); // "builder" | "history"
  const [customer,setCustomer]=useState({name:"",company:"",email:"",phone:""});
  const [paymentTerms,setPaymentTerms]=useState("100% Advance");
  const [qd,setQd]=useState({quoteId:generateQuoteId(),quoteName:"",createdOn:new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}),owner:"",notes:"",validUntil:""});
  const [lines,setLines]=useState([]);
  const [currency,setCurrency]=useState(CURRENCIES[0]);
  const [billingCycle,setBillingCycle]=useState("annual");
  const [monthCount,setMonthCount]=useState(12);
  const [startDate,setStartDate]=useState(today);
  const [endDate,setEndDate]=useState(autoEndDate(today,"annual",12));
  const [taxConfig,setTaxConfig]=useState(TAX_RATES[0]);
  const [showPreview,setShowPreview]=useState(false);

  const handleCycle=c=>{setBillingCycle(c);setEndDate(autoEndDate(startDate,c,monthCount));};
  const handleStart=d=>{setStartDate(d);setEndDate(autoEndDate(d,billingCycle,monthCount));};
  const handleMonths=n=>{const m=Math.max(1,parseInt(n)||1);setMonthCount(m);setEndDate(autoEndDate(startDate,"monthly",m));};

  function saveCurrentQuote(){
    const cl=computeLines(lines,startDate,endDate,billingCycle);
    const subUSD=cl.reduce((s,l)=>s+l.net,0);
    persistQuote({
      id:qd.quoteId, quoteName:qd.quoteName, createdOn:qd.createdOn, validUntil:qd.validUntil,
      owner:qd.owner, notes:qd.notes,
      customer, currency, billingCycle, monthCount, startDate, endDate, taxConfig, paymentTerms,
      lines, subUSD, grandLocal:subUSD*currency.rate,
      savedAt:new Date().toISOString(),
    });
  }

  function loadQuote(q){
    setCustomer(q.customer||{name:"",company:"",email:"",phone:""});
    setPaymentTerms(q.paymentTerms||"100% Advance");
    setQd({quoteId:q.id,quoteName:q.quoteName||"",createdOn:q.createdOn||"",owner:q.owner||"",notes:q.notes||"",validUntil:q.validUntil||""});
    setLines(q.lines||[]);
    setCurrency(q.currency||CURRENCIES[0]);
    setBillingCycle(q.billingCycle||"annual");
    setMonthCount(q.monthCount||12);
    setStartDate(q.startDate||today);
    setEndDate(q.endDate||autoEndDate(today,"annual",12));
    setTaxConfig(q.taxConfig||TAX_RATES[0]);
    setView("builder");
  }

  const addLine=cat=>{
    const p=PRODUCTS[cat];if(!p)return;
    setLines(prev=>[...prev,{productCategory:cat,itemId:p.tiers[0].id,qty:1,discount:0,discountType:"percent"}]);
  };

  const totals=useMemo(()=>{
    const cl=computeLines(lines,startDate,endDate,billingCycle);
    const annualList=cl.reduce((s,l)=>s+l.annual,0);
    const discTotal=cl.reduce((s,l)=>s+l.disc,0);
    const subUSD=cl.reduce((s,l)=>s+l.net,0);
    const subLocal=subUSD*currency.rate;
    const taxLocal=subLocal*taxConfig.rate;
    return{annualList,discTotal,subUSD,subLocal,taxLocal,grand:subLocal+taxLocal};
  },[lines,startDate,endDate,billingCycle,currency,taxConfig]);

  const days=daysBetween(startDate,endDate);
  const prPct=billingCycle!=="annual"?`Pro-rata: ${(proRataFactor(startDate,endDate,billingCycle)*100).toFixed(1)}%`:null;

  if(view==="history") return <QuoteHistory onNewQuote={()=>{setQd(q=>({...q,quoteId:generateQuoteId()}));setLines([]);setView("builder");}} onLoadQuote={loadQuote}/>;

  return(
    <div className="qb-shell">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }

        /* ── Responsive layout ────────────────────────────────── */
        .qb-shell   { min-height:100vh; background:#F1F5F9; font-family:'DM Sans',system-ui,sans-serif; }

        /* Nav */
        .qb-nav     { background:linear-gradient(90deg,#0D1B3E,#162447); height:58px; display:flex; align-items:center; justify-content:space-between; padding:0 20px; position:sticky; top:0; z-index:100; box-shadow:0 2px 12px rgba(13,27,62,0.4); gap:10px; }
        .qb-nav-left  { display:flex; align-items:center; gap:12px; min-width:0; }
        .qb-nav-title { line-height:1.2; min-width:0; }
        .qb-nav-right { display:flex; gap:8px; align-items:center; flex-shrink:0; }
        .qb-nav-subtitle { display:block; }

        /* Body grid */
        .qb-body    { max-width:1160px; margin:0 auto; padding:20px; }
        .qb-grid    { display:grid; grid-template-columns:310px 1fr; gap:18px; align-items:start; }

        /* Product line row */
        .pl-grid    { display:grid; grid-template-columns:2fr 1fr 1fr 1fr 1fr; gap:8px; align-items:end; }

        /* Add products buttons */
        .add-grid   { display:grid; grid-template-columns:1fr 1fr 1fr; gap:9px; }

        /* Quote preview modal */
        .qp-header-grid  { display:grid; grid-template-columns:1fr 1fr; gap:0; padding:18px 36px 24px; }
        .qp-meta-grid    { display:grid; grid-template-columns:1fr 1fr; gap:10px 20px; align-content:start; }
        .qp-body         { padding:28px 36px; }
        .qp-modal-inner  { background:#fff; width:100%; max-width:860px; border-radius:20px; overflow:hidden; box-shadow:0 32px 80px rgba(0,0,0,0.35); margin-bottom:20px; }
        .qp-action-bar   { padding:14px 36px; display:flex; gap:10px; justify-content:flex-end; border-top:1px solid #E2E8F0; background:#F8FAFC; }

        /* ── Tablet (≤ 900px) ─────────────────────────────────── */
        @media (max-width:900px) {
          .qb-grid   { grid-template-columns:1fr; }
          .qb-nav    { padding:0 14px; height:auto; min-height:58px; flex-wrap:wrap; padding-top:8px; padding-bottom:8px; }
          .qb-nav-subtitle { display:none; }
          .add-grid  { grid-template-columns:1fr 1fr 1fr; }
          .pl-grid   { grid-template-columns:1fr 1fr 1fr; }
          .qp-body   { padding:20px 20px; }
          .qp-header-grid { padding:14px 20px 18px; }
          .qp-action-bar  { padding:12px 20px; }
          .qp-modal-inner { border-radius:14px; }
        }

        /* ── Mobile (≤ 600px) ─────────────────────────────────── */
        @media (max-width:600px) {
          .qb-nav    { height:auto; min-height:52px; padding:8px 12px; }
          .qb-nav-left { gap:8px; }
          .qb-body   { padding:12px; }
          .add-grid  { grid-template-columns:1fr 1fr; }
          .pl-grid   { grid-template-columns:1fr 1fr; }
          .qp-header-grid  { grid-template-columns:1fr; gap:12px; padding:14px 16px 14px; }
          .qp-meta-grid    { grid-template-columns:1fr 1fr; }
          .qp-body         { padding:14px 16px; }
          .qp-action-bar   { padding:10px 16px; flex-direction:column-reverse; }
          .qp-modal-inner  { border-radius:10px; }
          .qp-table-hide   { display:none; }
        }

        /* ── Extra-small (≤ 400px) ────────────────────────────── */
        @media (max-width:400px) {
          .add-grid  { grid-template-columns:1fr; }
          .pl-grid   { grid-template-columns:1fr; }
          .qp-meta-grid { grid-template-columns:1fr; }
          .qb-nav-right .qb-quoteref { display:none; }
        }

        @media print {
          body>*:not(.print-root){display:none!important;}
          .print-root{display:block!important;position:static!important;background:#fff!important;}
        }
      `}</style>

      {/* Top nav */}
      <div className="qb-nav">
        <div className="qb-nav-left">
          <div style={{background:"#fff",borderRadius:"8px",padding:"5px 12px",display:"inline-flex",alignItems:"center",flexShrink:0}}>
            <VirtuosLogo height={26}/>
          </div>
          <div style={{width:"1px",height:"28px",background:"rgba(255,255,255,0.12)",flexShrink:0}}/>
          <div className="qb-nav-title">
            <div style={{color:"#fff",fontWeight:700,fontSize:"14px",letterSpacing:"-0.01em",whiteSpace:"nowrap"}}>Quote Builder</div>
            <div className="qb-nav-subtitle" style={{color:"rgba(255,255,255,0.4)",fontSize:"10.5px",letterSpacing:"0.03em"}}>Asana · Smartsheet · Professional Services</div>
          </div>
        </div>
        <div className="qb-nav-right">
          <button onClick={()=>setView("history")}
            style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",color:"rgba(255,255,255,0.75)",padding:"6px 12px",borderRadius:"6px",cursor:"pointer",fontSize:"12px",fontWeight:600,fontFamily:"inherit",flexShrink:0,whiteSpace:"nowrap"}}>
            📋 History
          </button>
          <span className="qb-quoteref" style={{color:"rgba(255,255,255,0.4)",fontSize:"11px",fontFamily:"monospace"}}>{qd.quoteId}</span>
          <button onClick={()=>setQd(q=>({...q,quoteId:generateQuoteId()}))}
            style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",color:"rgba(255,255,255,0.7)",padding:"5px 10px",borderRadius:"6px",cursor:"pointer",fontSize:"11.5px",fontFamily:"inherit",flexShrink:0}}>
            ↻
          </button>
          <button onClick={()=>{if(lines.length>0){saveCurrentQuote();setShowPreview(true);}}} disabled={lines.length===0}
            style={{background:lines.length>0?"linear-gradient(135deg,#E84B9C,#F97316)":"#374151",color:"#fff",border:"none",padding:"8px 16px",borderRadius:"8px",cursor:lines.length>0?"pointer":"not-allowed",fontSize:"13px",fontWeight:700,boxShadow:lines.length>0?"0 4px 14px rgba(232,75,156,0.45)":"none",fontFamily:"inherit",transition:"all 0.2s",whiteSpace:"nowrap"}}>
            Preview →
          </button>
        </div>
      </div>

      <div className="qb-body">
        <div className="qb-grid">

          {/* LEFT */}
          <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
            <Panel title="Customer" icon="👤">
              <Inp label="Company / Account" value={customer.company} onChange={v=>setCustomer(c=>({...c,company:v}))} placeholder="Acme Corp"/>
              <Inp label="Contact Name" value={customer.name} onChange={v=>setCustomer(c=>({...c,name:v}))} placeholder="Jane Smith"/>
              <Inp label="Email" type="email" value={customer.email} onChange={v=>setCustomer(c=>({...c,email:v}))} placeholder="jane@acme.com"/>
              <Inp label="Phone" value={customer.phone} onChange={v=>setCustomer(c=>({...c,phone:v}))} placeholder="+91 98765 43210"/>
            </Panel>

            <Panel title="Quote Details" icon="📄">
              <Inp label="Quote Name" value={qd.quoteName} onChange={v=>setQd(q=>({...q,quoteName:v}))} placeholder="Q1 2026 Proposal"/>
              <Inp label="Owner / Sales Rep" value={qd.owner} onChange={v=>setQd(q=>({...q,owner:v}))} placeholder="Your Name"/>
              <Inp label="Valid Until" type="date" value={qd.validUntil} onChange={v=>setQd(q=>({...q,validUntil:v}))}/>
              <Sel label="Payment Terms" value={paymentTerms} onChange={setPaymentTerms}
                options={["100% Advance","Net 15 days","Net 30 days"].map(v=>({value:v,label:v}))}/>
            </Panel>

            <Panel title="Subscription Period" icon="📅">
              <Sel label="Billing Cycle" value={billingCycle} onChange={handleCycle}
                options={[{value:"monthly",label:"Monthly (custom duration)"},{value:"quarterly",label:"Quarterly"},{value:"annual",label:"Annual"}]}/>
              {billingCycle==="monthly"&&(
                <Inp label="Number of Months" type="number" min="1" max="36" value={monthCount} onChange={handleMonths}/>
              )}
              <Inp label="Start Date" type="date" value={startDate} onChange={handleStart}/>
              <div style={{display:"flex",flexDirection:"column",gap:"3px"}}>
                <Label>End Date (auto-calculated)</Label>
                <div style={{background:"#F1F5F9",borderRadius:"8px",padding:"8px 11px",fontSize:"13.5px",color:V.ink,fontWeight:600,border:`1px solid ${V.border}`}}>{endDate||"—"}</div>
              </div>
              {days>0&&(
                <div style={{background:"#EFF6FF",borderRadius:"8px",padding:"8px 11px",fontSize:"12px",color:"#1D4ED8",fontWeight:600,border:"1px solid #BFDBFE"}}>
                  📆 {days} days {billingCycle==="annual"&&days>=364?" · Full annual period":""}{prPct?` · ${prPct}`:""}
                </div>
              )}
            </Panel>

            <Panel title="Currency & Tax" icon="💱">
              <Sel label="Currency" value={currency.code} onChange={v=>setCurrency(CURRENCIES.find(c=>c.code===v))}
                options={CURRENCIES.map(c=>({value:c.code,label:`${c.code} — ${c.name} (${c.symbol})`}))}/>
              {currency.code!=="USD"&&(
                <Inp label={`FX Rate (1 USD → ${currency.code})`} type="number" min="0.01"
                  value={currency.rate} onChange={v=>setCurrency(c=>({...c,rate:parseFloat(v)||c.rate}))}/>
              )}
              <Sel label="Tax" value={taxConfig.label} onChange={v=>setTaxConfig(TAX_RATES.find(t=>t.label===v))}
                options={TAX_RATES.map(t=>({value:t.label,label:t.label}))}/>
            </Panel>

            <Panel title="Notes" icon="📝">
              <textarea value={qd.notes} onChange={e=>setQd(q=>({...q,notes:e.target.value}))}
                placeholder="Additional notes, special conditions..."
                rows={3} style={{width:"100%",border:`1.5px solid ${V.border}`,borderRadius:"8px",padding:"9px 11px",fontSize:"13px",resize:"vertical",outline:"none",fontFamily:"inherit",color:V.ink}}/>
            </Panel>
          </div>

          {/* RIGHT */}
          <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>

            {/* Add products */}
            <div style={{background:V.white,borderRadius:"12px",padding:"16px",border:`1px solid ${V.border}`,boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
              <div style={{fontSize:"11px",fontWeight:800,color:V.ink,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"11px"}}>Add Products & Services</div>
              <div className="add-grid">
                {Object.entries(PRODUCTS).map(([key,p])=>(
                  <button key={key} onClick={()=>addLine(key)}
                    style={{background:p.color+"0d",border:`2px dashed ${p.color}44`,borderRadius:"10px",padding:"12px",cursor:"pointer",textAlign:"left",transition:"all 0.15s",fontFamily:"inherit"}}
                    onMouseEnter={e=>{e.currentTarget.style.background=p.color+"1a";e.currentTarget.style.borderColor=p.color;}}
                    onMouseLeave={e=>{e.currentTarget.style.background=p.color+"0d";e.currentTarget.style.borderColor=p.color+"44";}}>
                    <div style={{fontSize:"12.5px",fontWeight:700,color:p.color}}>+ {p.label}</div>
                    <div style={{fontSize:"10.5px",color:"#94A3B8",marginTop:"2px"}}>
                      {p.tiers.length} tiers{p.addOns.length>0?` · ${p.addOns.length} add-ons`:""}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {lines.length===0?(
              <div style={{background:V.white,borderRadius:"12px",padding:"48px 24px",textAlign:"center",border:`2px dashed ${V.border}`}}>
                <div style={{fontSize:"36px",marginBottom:"8px"}}>🛒</div>
                <div style={{fontSize:"14px",fontWeight:700,color:V.ink}}>No products added yet</div>
                <div style={{fontSize:"12px",color:"#94A3B8",marginTop:"3px"}}>Click above to add Asana, Smartsheet, or Professional Services</div>
              </div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                {lines.map((line,i)=>(
                  <ProductLine key={i} line={line}
                    onUpdate={u=>setLines(prev=>prev.map((l,idx)=>idx===i?u:l))}
                    onRemove={()=>setLines(prev=>prev.filter((_,idx)=>idx!==i))}
                    billingCycle={billingCycle} startDate={startDate} endDate={endDate}/>
                ))}
              </div>
            )}

            {/* Summary */}
            {lines.length>0&&(
              <div style={{background:"linear-gradient(135deg,#0D1B3E,#1A2C55)",borderRadius:"12px",padding:"20px 22px",color:"#fff",boxShadow:"0 6px 20px rgba(13,27,62,0.3)"}}>
                <div style={{fontSize:"11px",fontWeight:800,color:"rgba(255,255,255,0.4)",textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:"12px"}}>Quote Summary</div>
                <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
                  {[
                    ["Annual List (USD)", `$${totals.annualList.toLocaleString("en-US",{minimumFractionDigits:2})}`, "#94A3B8"],
                    ["Discount (USD)",    `-$${totals.discTotal.toLocaleString("en-US",{minimumFractionDigits:2})}`, "#FCA5A5"],
                    ["Sub-Total (USD)",   `$${totals.subUSD.toLocaleString("en-US",{minimumFractionDigits:2})}`, "#E2E8F0"],
                    currency.code!=="USD"?[`Sub-Total (${currency.code})`, fmtC(totals.subLocal,currency.symbol), "#BAE6FD"]:null,
                    taxConfig.rate>0?[taxConfig.label, fmtC(totals.taxLocal,currency.symbol), "#FDE68A"]:null,
                  ].filter(Boolean).map(([l,v,c])=>(
                    <div key={l} style={{display:"flex",justifyContent:"space-between",paddingBottom:"6px",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
                      <span style={{fontSize:"12.5px",color:"rgba(255,255,255,0.5)"}}>{l}</span>
                      <span style={{fontSize:"12.5px",fontWeight:600,color:c}}>{v}</span>
                    </div>
                  ))}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:"4px"}}>
                    <span style={{fontSize:"13px",fontWeight:700,color:"rgba(255,255,255,0.7)"}}>Total ({currency.code})</span>
                    <span style={{fontSize:"clamp(18px,5vw,22px)",fontWeight:900,color:"#fff"}}>{fmtC(totals.grand,currency.symbol)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showPreview&&(
        <QuotePreview
          data={{lines,customer,qd,currency,billingCycle,monthCount,startDate,endDate,taxConfig,paymentTerms}}
          onClose={()=>setShowPreview(false)}/>
      )}
    </div>
  );
}
