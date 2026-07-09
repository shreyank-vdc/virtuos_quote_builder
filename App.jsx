import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabase.js";
import LOGO_SRC from "./logoData.js";
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, ShadingType,
  ImageRun, convertInchesToTwip, VerticalAlign,
} from "docx";

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
      { id: "asana-advanced",        name: "Asana Advanced",     unitPrice: 299.88, description: "$24.99/user/mo × 12" },
      { id: "asana-enterprise",      name: "Asana Enterprise",   unitPrice: 540.00, description: "$45.00/user/mo × 12" },
      { id: "asana-enterprise-plus", name: "Asana Enterprise+",  unitPrice: 660.00, description: "$55.00/user/mo × 12" },
    ],
    addOns: [
      { id: "asana-timesheet",              name: "Timesheet Add-on",              unitPrice: 72.00, description: "$6.00/user/mo × 12" },
      { id: "asana-enterprise-compliance",  name: "Enterprise & Compliance Add-On", unitPrice: 72.00, description: "$6.00/user/mo × 12" },
    ],
    tc: `For all payments in INR, USD to INR exchange rates shall be applicable 'as on date' at the time of payment by customer. This order is non-cancellable & non-refundable. The Customer acknowledges that they are bound by the Asana Subscriber Agreement for all matters related to licensing, security, privacy, and use of the software available at https://asana.com/terms/subscriber-agreement. *Government Taxes Are Extra.`
  },
  smartsheet: {
    label: "Smartsheet", color: "#0073EA", bgColor: "#EFF6FF",
    tiers: [
      { id: "ss-pro",        name: "Smartsheet Pro",        unitPrice: 108.00, description: "$9.00/user/mo × 12" },
      { id: "ss-business",   name: "Smartsheet Business",   unitPrice: 228.00, description: "$19.00/user/mo × 12" },
      { id: "ss-enterprise",         name: "Smartsheet Enterprise",                        unitPrice: 540.00, description: "$45.00/user/mo × 12" },
      { id: "ss-enterprise-premium", name: "Smartsheet Enterprise with Premium Support",    unitPrice: 540.00, description: "$45.00/user/mo × 12 · Premium Support incl." },
    ],
    addOns: [
      { id: "ss-standard-support", name: "Standard Support Package", unitPrice: 6.00,   description: "$6.00/user/yr" },
      { id: "ss-premium-support",  name: "Premium Support Package",  unitPrice: 6.00,   description: "$6.00/user/yr" },
      { id: "ss-advance",          name: "Smartsheet Advance (AWM)", unitPrice: 144.00, description: "$12.00/user/mo × 12" },
      { id: "ss-dynamic-view",     name: "Dynamic View",             unitPrice: 1500.00, description: "$1,500.00/unit/yr" },
    ],
    tc: `For all payments in INR, USD to INR exchange rates shall be applicable 'as on date' at the time of payment by customer. This order is non-cancellable & non-refundable. The Customer acknowledges that they are bound by the Smartsheet Subscriber Agreement for all matters related to licensing, security, privacy, and use of the software available at https://www.smartsheet.com/legal/user-agreement. *Government Taxes Are Extra.`
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
const numLocale = code => code === "INR" ? "en-IN" : "en-US";
const fmtC = (n, sym, code="USD") => `${sym}${n.toLocaleString(numLocale(code),{minimumFractionDigits:2,maximumFractionDigits:2})}`;
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
function autoEndDate(start,cycle,months,contractYears=1){
  if(!start)return "";
  const d=new Date(start);
  if(cycle==="annual"){d.setFullYear(d.getFullYear()+contractYears);d.setDate(d.getDate()-1);}
  else if(cycle==="quarterly"){d.setMonth(d.getMonth()+3);d.setDate(d.getDate()-1);}
  else if(cycle==="monthly"){
    // Day-based so fractional months (e.g. 6.5) work precisely
    const days=Math.round(parseFloat(months)*30.4375);
    d.setDate(d.getDate()+days-1);
  }
  // "custom" — caller manages endDate directly, return empty
  else return "";
  return d.toISOString().split("T")[0];
}
function computeLines(lines, startDate, endDate, billingCycle) {
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
const IS = {border:`1.5px solid ${V.border}`,borderRadius:"8px",padding:"8px 11px",fontSize:"13.5px",color:V.ink,background:V.white,outline:"none",width:"100%",boxSizing:"border-box",fontFamily:"inherit"};

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
            <Inp label="Qty" type="number" min="1"
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

// ─── HTML EXPORT ─────────────────────────────────────────────────────────────
async function exportQuoteWord({cl,annualList,discTotal,subUSD,subLocal,taxLocal,grandLocal,customer,qd,currency,billingCycle,monthCount,startDate,endDate,taxConfig,paymentTerms,cats,sym,contractYears=1,yearEscalation=0,yearlyTotals=[],totalContractValue=0}) {
  const f$ = n => `$${n.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const fC = (n,s) => `${s}${n.toLocaleString(numLocale(currency.code),{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const fD = s => s ? new Date(s).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}) : "—";
  const cycleLabel = billingCycle==="monthly"?`Monthly (${monthCount} mo)`:billingCycle==="custom"?"Custom Period":billingCycle.charAt(0).toUpperCase()+billingCycle.slice(1);
  const hasDiscount = cl.some(l=>l.disc>0);

  // ── helpers ──────────────────────────────────────────────────────────────
  const NAVY = "0D1B3E", SLATE = "64748B", INK = "1E293B", BORDER_C = "CBD5E1";
  const twip = n => convertInchesToTwip(n);
  const cm = n => Math.round(n * 567); // 1 cm ≈ 567 twips

  const run = (text, opts={}) => new TextRun({
    text: String(text), font: "Calibri", size: (opts.size||11)*2,
    bold: opts.bold||false, italics: opts.italics||false,
    color: opts.color||INK, break: opts.break||0,
  });

  const para = (children, opts={}) => new Paragraph({
    children: Array.isArray(children) ? children : [children],
    alignment: opts.align || AlignmentType.LEFT,
    spacing: { before: (opts.spaceBefore||0)*20, after: (opts.spaceAfter||6)*20 },
    ...(opts.heading ? { heading: opts.heading } : {}),
  });

  const cell = (children, opts={}) => new TableCell({
    children: Array.isArray(children) ? children : [children],
    columnSpan: opts.span||1,
    width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    shading: opts.bg ? { fill: opts.bg, type: ShadingType.CLEAR } : undefined,
    borders: opts.noBorder ? {
      top:{style:BorderStyle.NONE,size:0},bottom:{style:BorderStyle.NONE,size:0},
      left:{style:BorderStyle.NONE,size:0},right:{style:BorderStyle.NONE,size:0},
    } : {
      top:{style:BorderStyle.SINGLE,size:4,color:BORDER_C},
      bottom:{style:BorderStyle.SINGLE,size:4,color:BORDER_C},
      left:{style:BorderStyle.SINGLE,size:4,color:BORDER_C},
      right:{style:BorderStyle.SINGLE,size:4,color:BORDER_C},
    },
    verticalAlign: opts.vAlign || VerticalAlign.TOP,
    margins: { top:cm(0.1), bottom:cm(0.1), left:cm(0.18), right:cm(0.18) },
  });

  // Page width (A4) in twips minus margins → usable = 11906 - 2×1134 = 9638
  const PAGE_W = 9638;

  // ── logo (base64 PNG) ────────────────────────────────────────────────────
  let logoRun = null;
  try {
    const b64 = LOGO_SRC.split(",")[1];
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
    logoRun = new ImageRun({
      data: bytes.buffer,
      transformation: { width: 120, height: 32 },
      type: "png",
    });
  } catch(_) { logoRun = null; }

  // ── header row (logo left, quote ID right) ────────────────────────────────
  const headerTable = new Table({
    width: { size: PAGE_W, type: WidthType.DXA },
    borders: { top:{style:BorderStyle.NONE},bottom:{style:BorderStyle.NONE},left:{style:BorderStyle.NONE},right:{style:BorderStyle.NONE},insideH:{style:BorderStyle.NONE},insideV:{style:BorderStyle.NONE} },
    rows: [new TableRow({ children: [
      cell([
        para(logoRun ? [logoRun] : [run("Virtuos Digital",{bold:true,size:14})], {spaceAfter:2}),
        para([run("Sales Quotation",{bold:true,size:18,color:NAVY})], {spaceAfter:0}),
        para([run(qd.quoteId,{size:9,color:SLATE})], {spaceAfter:0}),
      ], {noBorder:true, width:Math.round(PAGE_W*0.58)}),
      cell([
        ...[
          ["Quote Name",    qd.quoteName||"—"],
          ["Prepared By",   qd.owner||"—"],
          ["Issue Date",    qd.createdOn||"—"],
          ["Valid Until",   qd.validUntil?fD(qd.validUntil):"30 days"],
          ["Period",        `${fD(startDate)} → ${fD(endDate)}`],
          ["Billing",       cycleLabel],
          ["Payment",       paymentTerms],
        ].map(([k,v]) => para([
          run(k+":  ",{size:9,color:SLATE}),
          run(v,{size:9,bold:true}),
        ], {spaceAfter:2})),
      ], {noBorder:true, width:Math.round(PAGE_W*0.42)}),
    ]})],
  });

  // ── bill-to box ───────────────────────────────────────────────────────────
  const billToTable = new Table({
    width: { size: PAGE_W, type: WidthType.DXA },
    borders: { top:{style:BorderStyle.NONE},bottom:{style:BorderStyle.NONE},left:{style:BorderStyle.NONE},right:{style:BorderStyle.NONE},insideH:{style:BorderStyle.NONE},insideV:{style:BorderStyle.NONE} },
    rows: [new TableRow({ children: [
      cell([
        para([run("PREPARED FOR",{size:8,color:SLATE,bold:true})], {spaceAfter:2}),
        para([run(customer.company||"—",{bold:true,size:13,color:NAVY})], {spaceAfter:2}),
        para([run([customer.name,customer.email,customer.phone].filter(Boolean).join("  ·  "),{size:10,color:SLATE})], {spaceAfter:0}),
      ], {bg:"F8FAFC", noBorder:false, width:PAGE_W}),
    ]})],
  });

  // ── products table header ─────────────────────────────────────────────────
  const colWidths = hasDiscount
    ? [Math.round(PAGE_W*0.44),Math.round(PAGE_W*0.08),Math.round(PAGE_W*0.16),Math.round(PAGE_W*0.14),Math.round(PAGE_W*0.18)]
    : [Math.round(PAGE_W*0.50),Math.round(PAGE_W*0.09),Math.round(PAGE_W*0.19),Math.round(PAGE_W*0.22)];

  const thCell = (text, align=AlignmentType.LEFT, w) => new TableCell({
    children: [new Paragraph({ children:[run(text,{bold:true,size:9.5,color:"FFFFFF"})], alignment:align, spacing:{before:100,after:100} })],
    width: { size:w, type:WidthType.DXA },
    shading: { fill:NAVY, type:ShadingType.CLEAR },
    borders: {
      top:{style:BorderStyle.SINGLE,size:4,color:NAVY},
      bottom:{style:BorderStyle.SINGLE,size:4,color:NAVY},
      left:{style:BorderStyle.SINGLE,size:4,color:NAVY},
      right:{style:BorderStyle.SINGLE,size:4,color:NAVY},
    },
    margins:{top:cm(0.1),bottom:cm(0.1),left:cm(0.18),right:cm(0.18)},
  });

  const theadRow = new TableRow({ children: [
    thCell("Product / Service", AlignmentType.LEFT, colWidths[0]),
    thCell("Qty", AlignmentType.CENTER, colWidths[1]),
    thCell("Unit Price", AlignmentType.RIGHT, colWidths[2]),
    ...(hasDiscount ? [thCell("Discount", AlignmentType.RIGHT, colWidths[3])] : []),
    thCell("Net (USD)", AlignmentType.RIGHT, colWidths[hasDiscount?4:3]),
  ]});

  const dataRows = cl.map(l => {
    const isPro = l.productCategory==="professional_services";
    const unitLabel = isPro ? `${f$(l.ratePerHour||0)}/hr` : f$(l.item?.unitPrice||0);
    const qtyLabel  = isPro ? `${l.qty} hrs` : `${l.qty}`;
    return new TableRow({ children: [
      cell([para([
        run(l.item?.name||"",{bold:true,size:10}),
        ...(l.item?.description ? [run("\n"+l.item.description,{size:8.5,color:SLATE})] : []),
      ])], {width:colWidths[0]}),
      cell([para([run(qtyLabel,{size:10})],{align:AlignmentType.CENTER})], {width:colWidths[1]}),
      cell([para([run(unitLabel,{size:10})],{align:AlignmentType.RIGHT})], {width:colWidths[2]}),
      ...(hasDiscount ? [cell([para([run(l.disc>0?`-${f$(l.disc)}`:"—",{size:10,color:l.disc>0?"DC2626":SLATE})],{align:AlignmentType.RIGHT})], {width:colWidths[3]})] : []),
      cell([para([run(f$(l.net),{bold:true,size:10})],{align:AlignmentType.RIGHT})], {width:colWidths[hasDiscount?4:3]}),
    ]});
  });

  const subtotalRow = (label, value, bg="F8FAFC") => {
    const cols = hasDiscount ? 5 : 4;
    return new TableRow({ children: [
      new TableCell({
        children:[new Paragraph({children:[run(label,{size:10,bold:true})],alignment:AlignmentType.RIGHT,spacing:{before:80,after:80}})],
        columnSpan:cols-1,
        shading:{fill:bg,type:ShadingType.CLEAR},
        borders:{top:{style:BorderStyle.SINGLE,size:4,color:BORDER_C},bottom:{style:BorderStyle.SINGLE,size:4,color:BORDER_C},left:{style:BorderStyle.SINGLE,size:4,color:BORDER_C},right:{style:BorderStyle.SINGLE,size:4,color:BORDER_C}},
        margins:{top:cm(0.08),bottom:cm(0.08),left:cm(0.18),right:cm(0.18)},
      }),
      new TableCell({
        children:[new Paragraph({children:[run(value,{size:10,bold:true})],alignment:AlignmentType.RIGHT,spacing:{before:80,after:80}})],
        shading:{fill:bg,type:ShadingType.CLEAR},
        borders:{top:{style:BorderStyle.SINGLE,size:4,color:BORDER_C},bottom:{style:BorderStyle.SINGLE,size:4,color:BORDER_C},left:{style:BorderStyle.SINGLE,size:4,color:BORDER_C},right:{style:BorderStyle.SINGLE,size:4,color:BORDER_C}},
        margins:{top:cm(0.08),bottom:cm(0.08),left:cm(0.18),right:cm(0.18)},
      }),
    ]});
  };

  const totalCols = hasDiscount ? 5 : 4;
  const grandTotalRow = new TableRow({ children: [
    new TableCell({
      children:[new Paragraph({children:[run(`TOTAL (${currency.code})`,{size:12,bold:true,color:"FFFFFF"})],alignment:AlignmentType.RIGHT,spacing:{before:100,after:100}})],
      columnSpan:totalCols-1,
      shading:{fill:NAVY,type:ShadingType.CLEAR},
      borders:{top:{style:BorderStyle.SINGLE,size:4,color:NAVY},bottom:{style:BorderStyle.SINGLE,size:4,color:NAVY},left:{style:BorderStyle.SINGLE,size:4,color:NAVY},right:{style:BorderStyle.SINGLE,size:4,color:NAVY}},
      margins:{top:cm(0.1),bottom:cm(0.1),left:cm(0.18),right:cm(0.18)},
    }),
    new TableCell({
      children:[new Paragraph({children:[run(fC(grandLocal,sym),{size:13,bold:true,color:"FFFFFF"})],alignment:AlignmentType.RIGHT,spacing:{before:100,after:100}})],
      shading:{fill:NAVY,type:ShadingType.CLEAR},
      borders:{top:{style:BorderStyle.SINGLE,size:4,color:NAVY},bottom:{style:BorderStyle.SINGLE,size:4,color:NAVY},left:{style:BorderStyle.SINGLE,size:4,color:NAVY},right:{style:BorderStyle.SINGLE,size:4,color:NAVY}},
      margins:{top:cm(0.1),bottom:cm(0.1),left:cm(0.18),right:cm(0.18)},
    }),
  ]});

  const productsTable = new Table({
    width:{size:PAGE_W,type:WidthType.DXA},
    rows:[
      theadRow,
      ...dataRows,
      subtotalRow("Sub-Total (USD)", f$(subUSD)),
      ...(currency.code!=="USD"?[subtotalRow(`Sub-Total (${currency.code}) @ ${currency.rate.toFixed(4)}`,fC(subLocal,sym))]:[]),
      ...(taxConfig.rate>0?[subtotalRow(`${taxConfig.label} (${taxConfig.rate}%)`,fC(taxLocal,sym))]:[]),
      grandTotalRow,
    ],
  });

  // ── multi-year table ─────────────────────────────────────────────────────
  const multiYearSection = contractYears > 1 ? [
    para([run("Multi-Year Investment Summary", {bold:true, size:12})], {spaceBefore:16, spaceAfter:6}),
    new Table({
      width:{size:PAGE_W, type:WidthType.DXA},
      rows:[
        new TableRow({ children: [
          new TableCell({children:[para([run("Year",{bold:true,size:10,color:"FFFFFF"})],{align:AlignmentType.CENTER})],shading:{fill:NAVY,type:ShadingType.CLEAR},borders:{top:{style:BorderStyle.SINGLE,size:4,color:NAVY},bottom:{style:BorderStyle.SINGLE,size:4,color:NAVY},left:{style:BorderStyle.SINGLE,size:4,color:NAVY},right:{style:BorderStyle.SINGLE,size:4,color:NAVY}},margins:{top:cm(0.1),bottom:cm(0.1),left:cm(0.18),right:cm(0.18)},width:{size:1800,type:WidthType.DXA}}),
          new TableCell({children:[para([run(`Sub-Total (${currency.code})`,{bold:true,size:10,color:"FFFFFF"})],{align:AlignmentType.RIGHT})],shading:{fill:NAVY,type:ShadingType.CLEAR},borders:{top:{style:BorderStyle.SINGLE,size:4,color:NAVY},bottom:{style:BorderStyle.SINGLE,size:4,color:NAVY},left:{style:BorderStyle.SINGLE,size:4,color:NAVY},right:{style:BorderStyle.SINGLE,size:4,color:NAVY}},margins:{top:cm(0.1),bottom:cm(0.1),left:cm(0.18),right:cm(0.18)},width:{size:3000,type:WidthType.DXA}}),
          ...(taxConfig.rate > 0 ? [new TableCell({children:[para([run(`${taxConfig.label}`,{bold:true,size:10,color:"FFFFFF"})],{align:AlignmentType.RIGHT})],shading:{fill:NAVY,type:ShadingType.CLEAR},borders:{top:{style:BorderStyle.SINGLE,size:4,color:NAVY},bottom:{style:BorderStyle.SINGLE,size:4,color:NAVY},left:{style:BorderStyle.SINGLE,size:4,color:NAVY},right:{style:BorderStyle.SINGLE,size:4,color:NAVY}},margins:{top:cm(0.1),bottom:cm(0.1),left:cm(0.18),right:cm(0.18)},width:{size:2500,type:WidthType.DXA}})] : []),
          new TableCell({children:[para([run(`Total (${currency.code})`,{bold:true,size:10,color:"FFFFFF"})],{align:AlignmentType.RIGHT})],shading:{fill:NAVY,type:ShadingType.CLEAR},borders:{top:{style:BorderStyle.SINGLE,size:4,color:NAVY},bottom:{style:BorderStyle.SINGLE,size:4,color:NAVY},left:{style:BorderStyle.SINGLE,size:4,color:NAVY},right:{style:BorderStyle.SINGLE,size:4,color:NAVY}},margins:{top:cm(0.1),bottom:cm(0.1),left:cm(0.18),right:cm(0.18)}}),
        ]}),
        ...yearlyTotals.map((y, idx) => {
          const bg = idx % 2 === 0 ? "FFFFFF" : "F8FAFC";
          const taxAmt = y.subtotal * taxConfig.rate;
          const label = y.year === 1 ? "Year 1" : `Year ${y.year}${yearEscalation > 0 ? ` (+${yearEscalation}%)` : ""}`;
          return new TableRow({ children: [
            new TableCell({children:[para([run(label,{bold:true,size:10})],{align:AlignmentType.CENTER})],shading:{fill:bg,type:ShadingType.CLEAR},borders:{top:{style:BorderStyle.SINGLE,size:4,color:BORDER_C},bottom:{style:BorderStyle.SINGLE,size:4,color:BORDER_C},left:{style:BorderStyle.SINGLE,size:4,color:BORDER_C},right:{style:BorderStyle.SINGLE,size:4,color:BORDER_C}},margins:{top:cm(0.08),bottom:cm(0.08),left:cm(0.18),right:cm(0.18)},width:{size:1800,type:WidthType.DXA}}),
            new TableCell({children:[para([run(fC(y.subtotal,sym),{size:10})],{align:AlignmentType.RIGHT})],shading:{fill:bg,type:ShadingType.CLEAR},borders:{top:{style:BorderStyle.SINGLE,size:4,color:BORDER_C},bottom:{style:BorderStyle.SINGLE,size:4,color:BORDER_C},left:{style:BorderStyle.SINGLE,size:4,color:BORDER_C},right:{style:BorderStyle.SINGLE,size:4,color:BORDER_C}},margins:{top:cm(0.08),bottom:cm(0.08),left:cm(0.18),right:cm(0.18)},width:{size:3000,type:WidthType.DXA}}),
            ...(taxConfig.rate > 0 ? [new TableCell({children:[para([run(fC(taxAmt,sym),{size:10})],{align:AlignmentType.RIGHT})],shading:{fill:bg,type:ShadingType.CLEAR},borders:{top:{style:BorderStyle.SINGLE,size:4,color:BORDER_C},bottom:{style:BorderStyle.SINGLE,size:4,color:BORDER_C},left:{style:BorderStyle.SINGLE,size:4,color:BORDER_C},right:{style:BorderStyle.SINGLE,size:4,color:BORDER_C}},margins:{top:cm(0.08),bottom:cm(0.08),left:cm(0.18),right:cm(0.18)},width:{size:2500,type:WidthType.DXA}})] : []),
            new TableCell({children:[para([run(fC(y.grand,sym),{bold:true,size:10})],{align:AlignmentType.RIGHT})],shading:{fill:bg,type:ShadingType.CLEAR},borders:{top:{style:BorderStyle.SINGLE,size:4,color:BORDER_C},bottom:{style:BorderStyle.SINGLE,size:4,color:BORDER_C},left:{style:BorderStyle.SINGLE,size:4,color:BORDER_C},right:{style:BorderStyle.SINGLE,size:4,color:BORDER_C}},margins:{top:cm(0.08),bottom:cm(0.08),left:cm(0.18),right:cm(0.18)}}),
          ]});
        }),
        new TableRow({ children: [
          new TableCell({children:[para([run("TOTAL CONTRACT VALUE",{bold:true,size:11,color:"FFFFFF"})],{align:AlignmentType.RIGHT})],columnSpan: taxConfig.rate > 0 ? 3 : 2,shading:{fill:NAVY,type:ShadingType.CLEAR},borders:{top:{style:BorderStyle.SINGLE,size:4,color:NAVY},bottom:{style:BorderStyle.SINGLE,size:4,color:NAVY},left:{style:BorderStyle.SINGLE,size:4,color:NAVY},right:{style:BorderStyle.SINGLE,size:4,color:NAVY}},margins:{top:cm(0.1),bottom:cm(0.1),left:cm(0.18),right:cm(0.18)}}),
          new TableCell({children:[para([run(fC(totalContractValue,sym),{bold:true,size:13,color:"FFFFFF"})],{align:AlignmentType.RIGHT})],shading:{fill:NAVY,type:ShadingType.CLEAR},borders:{top:{style:BorderStyle.SINGLE,size:4,color:NAVY},bottom:{style:BorderStyle.SINGLE,size:4,color:NAVY},left:{style:BorderStyle.SINGLE,size:4,color:NAVY},right:{style:BorderStyle.SINGLE,size:4,color:NAVY}},margins:{top:cm(0.1),bottom:cm(0.1),left:cm(0.18),right:cm(0.18)}}),
        ]}),
      ],
    }),
  ] : [];

  // ── signature table ───────────────────────────────────────────────────────
  const sigFields = ["Authorised Signatory Name","Title / Designation","Company Name","Date","Signature"];
  const sigTable = new Table({
    width:{size:PAGE_W,type:WidthType.DXA},
    borders:{top:{style:BorderStyle.NONE},bottom:{style:BorderStyle.NONE},left:{style:BorderStyle.NONE},right:{style:BorderStyle.NONE},insideH:{style:BorderStyle.NONE},insideV:{style:BorderStyle.NONE}},
    rows:[new TableRow({children:[
      cell(sigFields.reduce((acc,lbl)=>{
        acc.push(para([run(lbl,{size:8.5,color:SLATE})],{spaceAfter:2}));
        acc.push(para([run(lbl==="Company Name"?(customer.company||""):lbl==="Signature"?" ":" ",{size:10})],{spaceAfter:8}));
        return acc;
      },[para([run("Customer Authorisation",{bold:true,size:11,color:NAVY})],{spaceAfter:6})]),
      {noBorder:true,width:Math.round(PAGE_W*0.47)}),
      cell([para([run("",{size:9})],{})],{noBorder:true,width:Math.round(PAGE_W*0.06)}),
      cell(sigFields.reduce((acc,lbl)=>{
        acc.push(para([run(lbl,{size:8.5,color:SLATE})],{spaceAfter:2}));
        acc.push(para([run(lbl==="Company Name"?"Virtuos Digital":lbl==="Signature"?" ":" ",{size:10})],{spaceAfter:8}));
        return acc;
      },[para([run("Virtuos Digital — Authorisation",{bold:true,size:11,color:NAVY})],{spaceAfter:6})]),
      {noBorder:true,width:Math.round(PAGE_W*0.47)}),
    ]})],
  });

  // ── T&C paragraphs ────────────────────────────────────────────────────────
  const tcParas = cats.flatMap(cat=>[
    para([run(PRODUCTS[cat].label,{bold:true,size:10,color:NAVY})],{spaceBefore:8,spaceAfter:2}),
    para([run(PRODUCTS[cat].tc,{size:9,color:SLATE})],{spaceAfter:4}),
  ]);

  // ── assemble doc ──────────────────────────────────────────────────────────
  const sectionChildren = [
    headerTable,
    para([run(""),],{spaceBefore:4,spaceAfter:4}),
    billToTable,
    para([run("Products & Services",{bold:true,size:13,color:NAVY})],{spaceBefore:12,spaceAfter:4}),
    productsTable,
    ...multiYearSection,
    para([run("Terms & Conditions",{bold:true,size:13,color:NAVY})],{spaceBefore:12,spaceAfter:4}),
    ...tcParas,
    ...(qd.notes?[
      para([run("Notes",{bold:true,size:13,color:NAVY})],{spaceBefore:12,spaceAfter:4}),
      para([run(qd.notes,{size:10})]),
    ]:[]),
    para([run("Acceptance & Authorisation",{bold:true,size:13,color:NAVY})],{spaceBefore:12,spaceAfter:4}),
    para([run(`By signing below, both parties agree to the terms and pricing in quotation ${qd.quoteId}. Payment Terms: ${paymentTerms}. Subscription period: ${fD(startDate)} to ${fD(endDate)}.`,{size:9.5,color:SLATE})],{spaceAfter:8}),
    sigTable,
    para([run("Questions? Contact your Virtuos Digital representative  ·  sales@virtuos.com  ·  www.virtuos.com",{size:8,color:"94A3B8"})],{spaceBefore:12,align:AlignmentType.CENTER}),
  ];

  const doc = new Document({
    creator: "Virtuos Digital Quote Builder",
    title: `Quote ${qd.quoteId}`,
    sections:[{
      properties:{
        page:{
          size:{ width:cm(21), height:cm(29.7) },
          margin:{ top:cm(2),bottom:cm(2.5),left:cm(2),right:cm(2) },
        },
      },
      children: sectionChildren,
    }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href=url; a.download=`Quote-${qd.quoteId}.docx`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url),10000);
}

async function exportQuoteHTML({cl,annualList,discTotal,subUSD,subLocal,taxLocal,grandLocal,customer,qd,currency,billingCycle,monthCount,startDate,endDate,taxConfig,paymentTerms,cats,sym,contractYears=1,yearEscalation=0,yearlyTotals=[],totalContractValue=0}) {
  const f$ = n => `$${n.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const fC = (n,s) => `${s}${n.toLocaleString(numLocale(currency.code),{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const fD = s => s ? new Date(s).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}) : "—";
  const cycleLabel = billingCycle==="monthly" ? `Monthly (${monthCount} mo)` : billingCycle==="custom" ? "Custom Period" : billingCycle.charAt(0).toUpperCase()+billingCycle.slice(1);
  const days = daysBetween(startDate,endDate);

  await transparentLogoPromise; // ensure transparent version is ready
  const logoSVG  = LOGO_HTML(44);
  const logoSVGDark = LOGO_HTML(36);

  const hasDiscount = cl.some(l=>l.disc>0);
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
      ${hasDiscount?`<td style="padding:10px 13px;text-align:right;color:${l.disc>0?"#DC2626":"#94A3B8"};border-bottom:1px solid #F1F5F9;">
        ${l.disc>0?`-${f$(l.disc)}${l.discountType==="percent"?`<div style="font-size:9.5px;color:#94A3B8">${l.discount}% off</div>`:""}`:"—"}
      </td>`:""}
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
    .page { width: 210mm; margin: 0 auto; background: #fff; }
    @media print {
      @page { margin: 0.8cm; size: A4; }
      body { margin: 0; background: #fff; }
      .page { width: 100%; min-height: 0 !important; margin: 0; box-shadow: none !important; }
      .page-body { padding: 16px 28px !important; }
      .page-break { page-break-before: always; break-before: page; }
      .no-print { display: none !important; }
      table { page-break-inside: avoid; break-inside: avoid; }
      tr { page-break-inside: avoid; break-inside: avoid; }
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
    <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 36px 12px;">
      <div style="display:inline-flex;align-items:center;">${logoSVG}</div>
      <div style="text-align:right;">
        <div style="font-size:10px;color:rgba(255,255,255,0.45);letter-spacing:0.12em;text-transform:uppercase;margin-bottom:4px;">Quote Reference</div>
        <div style="font-size:16px;font-weight:800;font-family:monospace;color:#fff;background:rgba(255,255,255,0.1);padding:5px 13px;border-radius:7px;border:1px solid rgba(255,255,255,0.15);display:inline-block;">${qd.quoteId}</div>
      </div>
    </div>
    <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(232,75,156,0.6),rgba(249,115,22,0.6),transparent);margin:0 36px;"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;padding:12px 36px 16px" class="hdr-grid">
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
  <div class="page-body" style="padding:20px 36px;">

    <!-- Section header -->
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
      <div style="height:1px;flex:1;background:linear-gradient(90deg,#E2E8F0,transparent);"></div>
      <span style="font-size:10px;font-weight:800;color:#94A3B8;text-transform:uppercase;letter-spacing:0.1em;white-space:nowrap;">Product &amp; Services Summary</span>
      <div style="height:1px;flex:1;background:linear-gradient(90deg,transparent,#E2E8F0);"></div>
    </div>

    <!-- Products table -->
    <div class="table-wrap" style="margin-bottom:14px;"><table>
      <thead>
        <tr style="background:#0D1B3E;">
          <th style="padding:9px 13px;text-align:left;font-weight:700;color:#fff;font-size:10px;text-transform:uppercase;letter-spacing:0.06em;">Product / Description</th>
          <th style="padding:9px 13px;text-align:right;font-weight:700;color:#fff;font-size:10px;text-transform:uppercase;letter-spacing:0.06em;">Qty</th>
          <th style="padding:9px 13px;text-align:right;font-weight:700;color:#fff;font-size:10px;text-transform:uppercase;letter-spacing:0.06em;">Unit Price (USD/yr)</th>
          ${hasDiscount?`<th style="padding:9px 13px;text-align:right;font-weight:700;color:#fff;font-size:10px;text-transform:uppercase;letter-spacing:0.06em;">Discount</th>`:""}
          <th style="padding:9px 13px;text-align:right;font-weight:700;color:#fff;font-size:10px;text-transform:uppercase;letter-spacing:0.06em;">Net Amount (USD)</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table></div>

    <!-- Totals -->
    <div style="display:flex;justify-content:flex-end;margin-bottom:16px;">
      <div style="width:310px;background:#F8FAFC;border-radius:12px;overflow:hidden;border:1px solid #E2E8F0;">
        <div style="padding:13px 14px;border-bottom:1px solid #E2E8F0;">
          <div style="font-size:10px;font-weight:800;color:#94A3B8;text-transform:uppercase;letter-spacing:0.09em;margin-bottom:7px;">USD Summary</div>
          <table>
            <tr><td style="padding:3px 0;font-size:12.5px;color:#64748B;">Annual List Price</td><td style="padding:3px 0;text-align:right;font-size:12.5px;font-weight:600;color:#1E293B;">${f$(annualList)}</td></tr>
            ${hasDiscount?`<tr><td style="padding:3px 0;font-size:12.5px;color:#64748B;">Total Discount</td><td style="padding:3px 0;text-align:right;font-size:12.5px;font-weight:600;color:#DC2626;">-${f$(discTotal)}</td></tr>`:""}
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

    ${contractYears > 1 ? `
    <!-- Multi-Year Summary -->
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
      <div style="height:1px;flex:1;background:linear-gradient(90deg,#E2E8F0,transparent);"></div>
      <span style="font-size:10px;font-weight:800;color:#94A3B8;text-transform:uppercase;letter-spacing:0.1em;white-space:nowrap;">${contractYears}-Year Investment Summary</span>
      <div style="height:1px;flex:1;background:linear-gradient(90deg,transparent,#E2E8F0);"></div>
    </div>
    <div style="border-radius:10px;overflow:hidden;border:1px solid #E2E8F0;margin-bottom:14px;">
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#0D1B3E;">
            <th style="padding:10px 14px;text-align:left;color:#fff;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:0.06em;">Year</th>
            <th style="padding:10px 14px;text-align:right;color:#fff;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:0.06em;">Sub-Total (${currency.code})</th>
            ${taxConfig.rate > 0 ? `<th style="padding:10px 14px;text-align:right;color:#fff;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:0.06em;">${taxConfig.label}</th>` : ""}
            <th style="padding:10px 14px;text-align:right;color:#fff;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:0.06em;">Total (${currency.code})</th>
          </tr>
        </thead>
        <tbody>
          ${yearlyTotals.map((y, idx) => `
          <tr style="background:${idx%2===0?"#fff":"#F8FAFC"};border-bottom:1px solid #F1F5F9;">
            <td style="padding:11px 14px;font-weight:700;color:#1E293B;">Year ${y.year}${yearEscalation > 0 && y.year > 1 ? `<span style="font-size:10px;font-weight:600;color:#0EA5E9;margin-left:6px;background:#EFF6FF;padding:1px 6px;border-radius:4px;">+${yearEscalation}%</span>` : ""}</td>
            <td style="padding:11px 14px;text-align:right;color:#64748B;">${fC(y.subtotal,sym)}</td>
            ${taxConfig.rate > 0 ? `<td style="padding:11px 14px;text-align:right;color:#64748B;">${fC(y.subtotal*taxConfig.rate,sym)}</td>` : ""}
            <td style="padding:11px 14px;text-align:right;font-weight:800;color:#1E293B;font-size:14px;">${fC(y.grand,sym)}</td>
          </tr>`).join("")}
        </tbody>
        <tfoot>
          <tr style="background:#0D1B3E;">
            <td colspan="${taxConfig.rate > 0 ? 3 : 2}" style="padding:12px 14px;text-align:right;font-weight:700;color:rgba(255,255,255,0.7);font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">Total Contract Value (${contractYears} years)</td>
            <td style="padding:12px 14px;text-align:right;font-weight:900;color:#fff;font-size:18px;">${fC(totalContractValue,sym)}</td>
          </tr>
        </tfoot>
      </table>
    </div>` : ""}

    <!-- Footer -->
    <div style="display:flex;justify-content:space-between;align-items:center;padding-top:10px;border-top:1px solid #E2E8F0;margin-top:8px;">
      <div style="font-size:10px;color:#94A3B8;">This quote is confidential and prepared exclusively for ${customer.company||"the named customer"}.</div>
      <div style="font-size:10px;color:#94A3B8;font-weight:600;">Page 1 of 2</div>
    </div>
  </div>
</div>

<!-- ══ PAGE 2 ══ -->
<div class="page page-break">
  <div style="padding:20px 36px 24px;" class="page-body">

    <!-- Page 2 header -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;">
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
    <div style="background:#F8FAFC;border-radius:10px;border:1px solid #E2E8F0;overflow:hidden;margin-bottom:16px;">
      <table>
        <thead><tr style="background:#0D1B3E;">
          <th style="padding:9px 16px;text-align:left;font-size:10px;font-weight:700;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:0.07em;">Product</th>
          <th style="padding:9px 16px;text-align:right;font-size:10px;font-weight:700;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:0.07em;">Qty</th>
          <th style="padding:9px 16px;text-align:right;font-size:10px;font-weight:700;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:0.07em;">Net (USD)</th>
        </tr></thead>
        <tbody>${summaryRows}</tbody>
        <tfoot><tr style="background:#0D1B3E;">
          <td colspan="2" style="padding:11px 16px;font-size:12px;font-weight:700;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:0.05em;">TOTAL (${currency.code})</td>
          <td style="padding:11px 16px;text-align:right;font-size:18px;font-weight:900;color:#fff;">${fC(grandLocal,sym)}</td>
        </tr></tfoot>
      </table>
    </div>

    <!-- T&C on page 2 -->
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
      <div style="height:1px;flex:1;background:linear-gradient(90deg,#E2E8F0,transparent);"></div>
      <span style="font-size:10px;font-weight:800;color:#94A3B8;text-transform:uppercase;letter-spacing:0.1em;white-space:nowrap;">Terms &amp; Conditions</span>
      <div style="height:1px;flex:1;background:linear-gradient(90deg,transparent,#E2E8F0);"></div>
    </div>
    ${tcBlocks}
    ${qd.notes ? `<div style="background:#FFFBEB;border-radius:8px;padding:10px 14px;border-left:3px solid #F59E0B;margin-top:8px;"><div style="font-size:10.5px;font-weight:800;color:#B45309;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:4px;">Notes</div><p style="font-size:11px;color:#78350F;line-height:1.5;">${qd.notes}</p></div>` : ""}

    <!-- Acceptance divider -->
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;margin-top:16px;">
      <div style="height:1px;flex:1;background:linear-gradient(90deg,#E2E8F0,transparent);"></div>
      <span style="font-size:10px;font-weight:800;color:#94A3B8;text-transform:uppercase;letter-spacing:0.1em;white-space:nowrap;">Acceptance &amp; Authorisation</span>
      <div style="height:1px;flex:1;background:linear-gradient(90deg,transparent,#E2E8F0);"></div>
    </div>

    <p style="font-size:12px;color:#475569;line-height:1.7;margin:0 0 16px;">By signing below, both parties agree to the terms and pricing set forth in this quotation (reference <strong>${qd.quoteId}</strong>), subject to the Terms &amp; Conditions above. This document constitutes a binding order upon counter-signature by an authorised Virtuos Digital representative. The subscription period will commence on <strong>${fD(startDate)}</strong> and expire on <strong>${fD(endDate)}</strong>. All pricing is in USD unless otherwise stated.</p>

    <!-- Signature blocks -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;">

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
      <div style="display:inline-flex;align-items:center;">${logoSVG}</div>
    </div>

  </div>
</div>


</body>
</html>`;

  // Open a popup and print directly — no file download
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) { alert("Please allow popups for this site to print quotes."); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); win.close(); }, 600);
  a.click();
  document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url), 10000);
}

// ─── QUOTE PREVIEW / EXPORT ──────────────────────────────────────────────────
function QuotePreview({data,onClose}){
  const {lines,customer,qd,currency,billingCycle,monthCount,startDate,endDate,taxConfig,paymentTerms,contractYears=1,yearEscalation=0,yearlyTotals=[],totalContractValue=0}=data;
  const sym=currency.symbol;
  const lcl = n => fmtC(n, sym, currency.code);
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
            <div style={{display:"inline-flex",alignItems:"center"}}>
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
                ["Contract Term", contractYears > 1 ? `${contractYears} Years${yearEscalation > 0 ? ` · ${yearEscalation}% escalation` : ""}` : "1 Year"],
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
                {["Product / Description","Qty","Unit Price (USD/yr)","Discount","Net Amount (USD)"].map((h,i)=>(
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
                    [`Sub-Total (${currency.code})`, lcl(subLocal)],
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
                    <span style={{fontSize:"12.5px",fontWeight:600,color:"rgba(255,255,255,0.8)"}}>{lcl(taxLocal)}</span>
                  </div>
                )}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:"12px",fontWeight:700,color:"rgba(255,255,255,0.7)",textTransform:"uppercase",letterSpacing:"0.05em"}}>Total Amount ({currency.code})</span>
                  <span style={{fontSize:"22px",fontWeight:900,color:"#fff"}}>{lcl(grandLocal)}</span>
                </div>
                {currency.code!=="USD"&&<div style={{fontSize:"11px",color:"rgba(255,255,255,0.4)",textAlign:"right",marginTop:"2px"}}>≈ {fmt$(subUSD)} USD excl. tax</div>}
              </div>
            </div>
          </div>

          {/* Multi-Year Summary */}
          {contractYears > 1 && (
            <div style={{marginBottom:"28px"}}>
              {sectionHeader(`${contractYears}-Year Investment Summary`)}
              <div style={{borderRadius:"10px",overflow:"hidden",border:"1px solid #E2E8F0"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:"13px"}}>
                  <thead>
                    <tr style={{background:"#0D1B3E"}}>
                      <th style={{padding:"10px 14px",textAlign:"left",color:"#fff",fontWeight:700,fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.06em"}}>Year</th>
                      <th style={{padding:"10px 14px",textAlign:"right",color:"#fff",fontWeight:700,fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.06em"}}>Sub-Total ({currency.code})</th>
                      {taxConfig.rate > 0 && <th style={{padding:"10px 14px",textAlign:"right",color:"#fff",fontWeight:700,fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.06em"}}>{taxConfig.label}</th>}
                      <th style={{padding:"10px 14px",textAlign:"right",color:"#fff",fontWeight:700,fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.06em"}}>Total ({currency.code})</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yearlyTotals.map((y, idx) => (
                      <tr key={y.year} style={{background:idx%2===0?"#fff":"#F8FAFC",borderBottom:"1px solid #F1F5F9"}}>
                        <td style={{padding:"11px 14px",fontWeight:700,color:V.ink}}>
                          Year {y.year}
                          {yearEscalation > 0 && y.year > 1 && <span style={{fontSize:"10.5px",fontWeight:600,color:"#0EA5E9",marginLeft:"6px",background:"#EFF6FF",padding:"1px 6px",borderRadius:"4px"}}>+{yearEscalation}%</span>}
                        </td>
                        <td style={{padding:"11px 14px",textAlign:"right",color:V.muted}}>{lcl(y.subtotal)}</td>
                        {taxConfig.rate > 0 && <td style={{padding:"11px 14px",textAlign:"right",color:V.muted}}>{lcl(y.subtotal*taxConfig.rate)}</td>}
                        <td style={{padding:"11px 14px",textAlign:"right",fontWeight:800,color:V.ink,fontSize:"14px"}}>{lcl(y.grand)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{background:"#0D1B3E"}}>
                      <td colSpan={taxConfig.rate > 0 ? 3 : 2} style={{padding:"12px 14px",textAlign:"right",fontWeight:700,color:"rgba(255,255,255,0.7)",fontSize:"11px",textTransform:"uppercase",letterSpacing:"0.05em"}}>Total Contract Value ({contractYears} years)</td>
                      <td style={{padding:"12px 14px",textAlign:"right",fontWeight:900,color:"#fff",fontSize:"18px"}}>{lcl(totalContractValue)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
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
        <div style={{padding:"16px clamp(16px,4vw,36px) 24px"}}>

          {/* Page 2 header */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"16px"}}>
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
          <div style={{background:"#F8FAFC",borderRadius:"10px",border:"1px solid #E2E8F0",overflow:"auto",marginBottom:"16px"}}>
            <div style={{background:"#0D1B3E",padding:"10px 16px",display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:"8px",minWidth:0}}>
              {["Product","Qty","Net (USD)"].map(h=>(
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
              <span style={{fontSize:"18px",fontWeight:900,color:"#fff"}}>{lcl(grandLocal)}</span>
            </div>
          </div>

          {sectionHeader("Terms & Conditions")}
          <div style={{display:"flex",flexDirection:"column",gap:"8px",marginBottom:"14px"}}>
            {cats.map(cat=>(
              <div key={cat} style={{background:PRODUCTS[cat].bgColor,borderRadius:"8px",padding:"10px 14px",borderLeft:`3px solid ${PRODUCTS[cat].color}`}}>
                <div style={{fontSize:"10.5px",fontWeight:800,color:PRODUCTS[cat].color,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"4px"}}>{PRODUCTS[cat].label}</div>
                <p style={{fontSize:"11px",color:"#475569",lineHeight:1.5,margin:0}}>{PRODUCTS[cat].tc}</p>
              </div>
            ))}
          </div>
          {qd.notes&&(
            <div style={{background:"#FFFBEB",borderRadius:"8px",padding:"10px 14px",borderLeft:"3px solid #F59E0B",marginBottom:"12px"}}>
              <div style={{fontSize:"10.5px",fontWeight:800,color:"#B45309",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"4px"}}>Notes</div>
              <p style={{fontSize:"11px",color:"#78350F",margin:0,lineHeight:1.5}}>{qd.notes}</p>
            </div>
          )}

          {sectionHeader("Acceptance & Authorisation")}

          <p style={{fontSize:"12px",color:"#475569",lineHeight:1.7,margin:"0 0 16px"}}>
            By signing below, both parties agree to the terms and pricing set forth in this quotation (reference <strong>{qd.quoteId}</strong>), subject to the Terms & Conditions above. This document constitutes a binding order upon counter-signature by an authorised Virtuos Digital representative. The subscription period will commence on <strong>{fmtDate(startDate)}</strong> and expire on <strong>{fmtDate(endDate)}</strong>. All pricing is in USD unless otherwise stated.
          </p>

          {/* Signature blocks */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:"20px",marginBottom:"20px"}}>
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
            <div style={{display:"inline-flex",alignItems:"center"}}>
              <VirtuosLogo height={26}/>
            </div>
          </div>
        </div>

        {/* Modal action bar */}
        <div className="qp-action-bar">
          <button onClick={onClose} style={{padding:"9px 20px",border:`1.5px solid ${V.border}`,borderRadius:"8px",background:"#fff",cursor:"pointer",fontSize:"13px",fontWeight:600,color:V.ink,fontFamily:"inherit"}}>Close</button>
          <button onClick={()=>exportQuoteWord({cl,annualList,discTotal,subUSD,subLocal,taxLocal,grandLocal,customer,qd,currency,billingCycle,monthCount,startDate,endDate,taxConfig,paymentTerms,cats,sym,contractYears,yearEscalation,yearlyTotals,totalContractValue})}
            style={{padding:"9px 22px",background:"linear-gradient(135deg,#1D4ED8,#2563EB)",color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",fontSize:"13px",fontWeight:700,boxShadow:"0 4px 12px rgba(29,78,216,0.35)",fontFamily:"inherit"}}>
            📄 Export Word (.doc)
          </button>
          <button onClick={()=>exportQuoteHTML({cl,annualList,discTotal,subUSD,subLocal,taxLocal,grandLocal,customer,qd,currency,billingCycle,monthCount,startDate,endDate,taxConfig,paymentTerms,cats,sym,contractYears,yearEscalation,yearlyTotals,totalContractValue})}
            style={{padding:"9px 22px",background:"linear-gradient(135deg,#0D1B3E,#1A2C55)",color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",fontSize:"13px",fontWeight:700,boxShadow:"0 4px 12px rgba(13,27,62,0.35)",fontFamily:"inherit"}}>
            🖨 Export / Print PDF
          </button>
        </div>
      </div>
    </div>
  </div>
  );
}

// ─── QUOTE STORAGE (Supabase) ─────────────────────────────────────────────────
async function fetchAllQuotes() {
  const { data, error } = await supabase
    .from("quotes")
    .select("*")
    .order("saved_at", { ascending: false });
  if (error) { console.error(error); return []; }
  return (data||[]).map(r=>({...r.payload, id:r.id, savedAt:r.saved_at, ownerEmail:r.owner_email, ownerName:r.owner_name}));
}
async function upsertQuote(snapshot, user, accountId) {
  const { error } = await supabase.from("quotes").upsert({
    id: snapshot.id,
    user_id: user.id,
    owner_email: user.email,
    owner_name: user.user_metadata?.full_name || user.email,
    saved_at: new Date().toISOString(),
    payload: snapshot,
    account_id: accountId || null,
  }, { onConflict: "id" });
  if (error) console.error(error);
}
async function removeQuote(id) {
  const { error } = await supabase.from("quotes").delete().eq("id", id);
  if (error) console.error(error);
}

// ─── ACCOUNT / CONTACT API ────────────────────────────────────────────────────
async function searchAccounts(query) {
  const { data } = await supabase
    .from("accounts")
    .select("id, name, industry, country")
    .ilike("name", `%${query}%`)
    .order("name")
    .limit(10);
  return data || [];
}

async function fetchAccountWithContacts(accountId) {
  const [{ data: acc }, { data: contacts }] = await Promise.all([
    supabase.from("accounts").select("*").eq("id", accountId).single(),
    supabase.from("contacts").select("*").eq("account_id", accountId).order("is_primary", { ascending: false }),
  ]);
  return { account: acc, contacts: contacts || [] };
}

async function createAccountWithContact({ name, industry, country, website, notes, contactName, contactEmail, contactPhone, contactDesignation }, user) {
  const { data: acc, error: aErr } = await supabase.from("accounts").insert({
    name, industry: industry || null, country: country || null, website: website || null,
    notes: notes || null, created_by: user.id, owner_id: user.id,
  }).select().single();
  if (aErr) {
    console.error("Account insert error:", aErr);
    throw new Error(aErr.message + (aErr.details ? ` — ${aErr.details}` : "") + (aErr.hint ? ` (${aErr.hint})` : ""));
  }
  let contact = null;
  if (contactName && contactName.trim()) {
    const { data: c, error: cErr } = await supabase.from("contacts").insert({
      account_id: acc.id, name: contactName.trim(), email: contactEmail || null,
      phone: contactPhone || null, designation: contactDesignation || null,
      is_primary: true, created_by: user.id,
    }).select().single();
    if (cErr) {
      console.error("Contact insert error:", cErr);
      throw new Error(cErr.message + (cErr.details ? ` — ${cErr.details}` : ""));
    }
    contact = c;
  }
  return { account: acc, contact };
}

async function fetchAllAccounts() {
  const { data, error } = await supabase
    .from("accounts")
    .select("id, name, industry, country, website, notes, created_at, contacts(id, name, email, phone, designation, is_primary)")
    .order("name");
  if (error) { console.error(error); return []; }
  return data || [];
}

async function fetchAccountQuotes(accountId) {
  const { data } = await supabase
    .from("quotes")
    .select("id, saved_at, owner_email, owner_name, payload")
    .eq("account_id", accountId)
    .order("saved_at", { ascending: false });
  return (data || []).map(r => ({ ...r.payload, id: r.id, savedAt: r.saved_at, ownerEmail: r.owner_email, ownerName: r.owner_name }));
}

// ─── ACCOUNT COMBOBOX ─────────────────────────────────────────────────────────
const INDUSTRIES = ["Technology","BFSI","Retail","Manufacturing","Healthcare","Education","Media & Entertainment","Government","Real Estate","Logistics","Other"];
const COUNTRIES  = ["India","United States","United Kingdom","UAE","Singapore","Australia","Germany","France","Japan","Canada","Other"];

function AccountCombobox({ value, onChange, onAccountSelect, user }) {
  const [query, setQuery]       = useState(value || "");
  const [results, setResults]   = useState([]);
  const [open, setOpen]         = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => { setQuery(value || ""); }, [value]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(() => { searchAccounts(query).then(setResults); }, 200);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    function away(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, []);

  async function pickAccount(acc) {
    setQuery(acc.name); onChange(acc.name); setOpen(false);
    const { contacts } = await fetchAccountWithContacts(acc.id);
    const primary = contacts.find(c => c.is_primary) || contacts[0] || null;
    onAccountSelect(acc, primary);
  }

  const exactMatch = results.some(r => r.name.toLowerCase() === query.toLowerCase());

  return (
    <>
      <div ref={wrapRef} style={{ display: "flex", flexDirection: "column", gap: "3px", position: "relative" }}>
        <Label>Company / Account</Label>
        <input
          type="text" value={query}
          placeholder="Search or create…"
          style={{ ...IS }}
          onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
          onFocus={e => { e.target.style.borderColor = V.pink; if (query.trim()) setOpen(true); }}
          onBlur={e => e.target.style.borderColor = V.border}
        />
        {open && (results.length > 0 || query.trim()) && (
          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: `1.5px solid ${V.border}`, borderRadius: "10px", boxShadow: "0 8px 28px rgba(0,0,0,0.13)", zIndex: 300, marginTop: "4px", overflow: "hidden", maxHeight: "240px", overflowY: "auto" }}>
            {results.map(acc => (
              <div key={acc.id} onMouseDown={() => pickAccount(acc)}
                style={{ padding: "9px 13px", cursor: "pointer", borderBottom: `1px solid ${V.border}` }}
                onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: V.ink }}>{acc.name}</div>
                {(acc.industry || acc.country) && (
                  <div style={{ fontSize: "11px", color: V.muted }}>{[acc.industry, acc.country].filter(Boolean).join(" · ")}</div>
                )}
              </div>
            ))}
            {!exactMatch && query.trim() && (
              <div onMouseDown={() => { setShowDrawer(true); setOpen(false); }}
                style={{ padding: "9px 13px", cursor: "pointer", fontSize: "13px", color: V.pink, fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}
                onMouseEnter={e => e.currentTarget.style.background = "#FFF0F8"}
                onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                + Create "{query}"
              </div>
            )}
          </div>
        )}
      </div>
      {showDrawer && (
        <AccountDrawer
          initialName={query} user={user}
          onSave={result => { setQuery(result.account.name); onChange(result.account.name); onAccountSelect(result.account, result.contact); setShowDrawer(false); }}
          onClose={() => setShowDrawer(false)}
        />
      )}
    </>
  );
}

// ─── ACCOUNT CREATION DRAWER ──────────────────────────────────────────────────
function AccountDrawer({ initialName, user, onSave, onClose }) {
  const [name,     setName]     = useState(initialName || "");
  const [industry, setIndustry] = useState("");
  const [country,  setCountry]  = useState("");
  const [website,  setWebsite]  = useState("");
  const [notes,    setNotes]    = useState("");
  const [cName,    setCName]    = useState("");
  const [cEmail,   setCEmail]   = useState("");
  const [cPhone,   setCPhone]   = useState("");
  const [cDesig,   setCDesig]   = useState("");
  const [saving,   setSaving]   = useState(false);
  const [err,      setErr]      = useState("");

  async function save() {
    if (!name.trim()) { setErr("Account name is required."); return; }
    setSaving(true); setErr("");
    try {
      const result = await createAccountWithContact({
        name: name.trim(), industry, country, website, notes,
        contactName: cName, contactEmail: cEmail, contactPhone: cPhone, contactDesignation: cDesig,
      }, user);
      onSave(result);
    } catch(e) {
      const msg = e.message || "Failed to create account.";
      const hint = msg.includes("does not exist")
        ? " — The accounts table may not be set up yet. Please run supabase_phase2_migration.sql in your Supabase SQL editor."
        : "";
      setErr(msg + hint);
      setSaving(false);
    }
  }

  const selStyle = { ...IS, background: V.white, cursor: "pointer" };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.38)", zIndex: 400 }}/>
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "min(440px,100vw)", background: "#fff", zIndex: 401, display: "flex", flexDirection: "column", boxShadow: "-12px 0 48px rgba(0,0,0,0.18)", fontFamily: "'DM Sans',system-ui,sans-serif" }}>
        <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${V.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "15px", fontWeight: 800, color: V.navy }}>New Account</div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "22px", cursor: "pointer", color: V.muted, lineHeight: 1, padding: "0 4px" }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ fontSize: "10.5px", fontWeight: 800, color: V.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Account Details</div>
          <Inp label="Account Name *" value={name} onChange={setName} placeholder="Acme Corp"/>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              <Label>Industry</Label>
              <select value={industry} onChange={e => setIndustry(e.target.value)} style={selStyle}
                onFocus={e => e.target.style.borderColor = V.pink} onBlur={e => e.target.style.borderColor = V.border}>
                <option value="">— Select —</option>
                {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              <Label>Country</Label>
              <select value={country} onChange={e => setCountry(e.target.value)} style={selStyle}
                onFocus={e => e.target.style.borderColor = V.pink} onBlur={e => e.target.style.borderColor = V.border}>
                <option value="">— Select —</option>
                {COUNTRIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <Inp label="Website" value={website} onChange={setWebsite} placeholder="https://acme.com"/>

          <div style={{ borderTop: `1px solid ${V.border}`, paddingTop: "14px", marginTop: "2px" }}>
            <div style={{ fontSize: "10.5px", fontWeight: 800, color: V.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>Primary Contact <span style={{ color: "#CBD5E1", fontWeight: 400 }}>(optional)</span></div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <Inp label="Name" value={cName} onChange={setCName} placeholder="Jane Smith"/>
              <Inp label="Email" type="email" value={cEmail} onChange={setCEmail} placeholder="jane@acme.com"/>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <Inp label="Phone" value={cPhone} onChange={setCPhone} placeholder="+91 98765 43210"/>
                <Inp label="Designation" value={cDesig} onChange={setCDesig} placeholder="IT Manager"/>
              </div>
            </div>
          </div>

          <div style={{ borderTop: `1px solid ${V.border}`, paddingTop: "14px", marginTop: "2px" }}>
            <Inp label="Internal Notes" value={notes} onChange={setNotes} placeholder="Any internal notes…"/>
          </div>
        </div>
        {err && <div style={{ padding: "8px 24px", background: "#FEF2F2", color: "#DC2626", fontSize: "12px", fontFamily: "inherit" }}>{err}</div>}
        <div style={{ padding: "16px 24px", borderTop: `1px solid ${V.border}`, display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "9px 18px", background: "#F1F5F9", color: V.muted, border: `1px solid ${V.border}`, borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontFamily: "inherit" }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ padding: "9px 22px", background: saving ? "#94A3B8" : "linear-gradient(135deg,#E84B9C,#F97316)", color: "#fff", border: "none", borderRadius: "8px", cursor: saving ? "not-allowed" : "pointer", fontSize: "13px", fontWeight: 700, fontFamily: "inherit" }}>
            {saving ? "Saving…" : "Create Account"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── ACCOUNTS VIEW ────────────────────────────────────────────────────────────
function AccountsView({ onLoadQuote, user }) {
  const [accounts,      setAccounts]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState("");
  const [selected,      setSelected]      = useState(null);
  const [acctQuotes,    setAcctQuotes]    = useState([]);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [showDrawer,    setShowDrawer]    = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    fetchAllAccounts().then(a => { setAccounts(a); setLoading(false); });
  }, []);

  useEffect(() => { reload(); }, [reload]);

  function openAccount(acc) {
    setSelected(acc); setQuotesLoading(true);
    fetchAccountQuotes(acc.id).then(q => { setAcctQuotes(q); setQuotesLoading(false); });
  }

  const filtered = accounts.filter(a => {
    const s = search.toLowerCase();
    return !s || a.name.toLowerCase().includes(s) || (a.industry||"").toLowerCase().includes(s) || (a.country||"").toLowerCase().includes(s);
  });

  if (selected) {
    return (
      <div style={{ padding: "28px 32px", maxWidth: "960px" }}>
        <button onClick={() => setSelected(null)}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: V.muted, cursor: "pointer", fontSize: "13px", fontFamily: "inherit", marginBottom: "20px", padding: 0 }}>
          ← Back to Accounts
        </button>

        {/* Account header */}
        <div style={{ background: "linear-gradient(135deg,#0D1B3E,#1A2C55)", borderRadius: "16px", padding: "24px 28px", color: "#fff", marginBottom: "18px" }}>
          <div style={{ fontSize: "22px", fontWeight: 800, marginBottom: "8px" }}>{selected.name}</div>
          <div style={{ display: "flex", gap: "18px", flexWrap: "wrap" }}>
            {selected.industry && <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", gap: "5px" }}>⬡ {selected.industry}</span>}
            {selected.country  && <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>📍 {selected.country}</span>}
            {selected.website  && <a href={selected.website} target="_blank" rel="noreferrer" style={{ fontSize: "12px", color: "#93C5FD" }}>{selected.website}</a>}
          </div>
          {selected.notes && <div style={{ marginTop: "12px", fontSize: "12.5px", color: "rgba(255,255,255,0.4)", fontStyle: "italic" }}>{selected.notes}</div>}
        </div>

        {/* Contacts */}
        <div style={{ background: "#fff", borderRadius: "12px", border: `1px solid ${V.border}`, overflow: "hidden", marginBottom: "16px" }}>
          <div style={{ padding: "14px 20px", borderBottom: `1px solid ${V.border}`, fontSize: "11px", fontWeight: 800, color: V.ink, textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Contacts · {(selected.contacts||[]).length}
          </div>
          {(selected.contacts||[]).length === 0 ? (
            <div style={{ padding: "24px 20px", textAlign: "center", color: V.muted, fontSize: "13px" }}>No contacts on record</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F8FAFC" }}>
                  {["Name","Designation","Email","Phone"].map(h => (
                    <th key={h} style={{ padding: "9px 18px", textAlign: "left", fontSize: "10.5px", fontWeight: 700, color: V.muted, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${V.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(selected.contacts||[]).map(c => (
                  <tr key={c.id} style={{ borderBottom: `1px solid ${V.border}` }}>
                    <td style={{ padding: "11px 18px" }}>
                      <div style={{ fontWeight: 600, fontSize: "13px", color: V.ink, display: "flex", alignItems: "center", gap: "7px" }}>
                        {c.name}
                        {c.is_primary && <span style={{ fontSize: "9px", fontWeight: 700, background: "#E84B9C18", color: "#E84B9C", padding: "1px 7px", borderRadius: "99px", textTransform: "uppercase" }}>Primary</span>}
                      </div>
                    </td>
                    <td style={{ padding: "11px 18px", fontSize: "12px", color: V.muted }}>{c.designation || "—"}</td>
                    <td style={{ padding: "11px 18px", fontSize: "12px", color: V.muted }}>{c.email || "—"}</td>
                    <td style={{ padding: "11px 18px", fontSize: "12px", color: V.muted }}>{c.phone || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Quote history */}
        <div style={{ background: "#fff", borderRadius: "12px", border: `1px solid ${V.border}`, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: `1px solid ${V.border}`, fontSize: "11px", fontWeight: 800, color: V.ink, textTransform: "uppercase", letterSpacing: "0.07em" }}>Quote History</div>
          {quotesLoading ? (
            <div style={{ padding: "24px 20px", textAlign: "center", color: V.muted, fontSize: "13px" }}>Loading…</div>
          ) : acctQuotes.length === 0 ? (
            <div style={{ padding: "24px 20px", textAlign: "center", color: V.muted, fontSize: "13px" }}>No quotes linked to this account yet</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F8FAFC" }}>
                  {["Quote ID","Name","Value (USD)","Date","Owner"].map(h => (
                    <th key={h} style={{ padding: "9px 18px", textAlign: "left", fontSize: "10.5px", fontWeight: 700, color: V.muted, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${V.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {acctQuotes.map(q => (
                  <tr key={q.id} style={{ borderBottom: `1px solid ${V.border}`, cursor: "pointer" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                    onMouseLeave={e => e.currentTarget.style.background = "#fff"}
                    onClick={() => onLoadQuote(q)}>
                    <td style={{ padding: "11px 18px", fontFamily: "monospace", fontSize: "11.5px", color: V.muted }}>{q.id}</td>
                    <td style={{ padding: "11px 18px", fontSize: "13px", fontWeight: 600, color: V.ink }}>{q.quoteName || "—"}</td>
                    <td style={{ padding: "11px 18px", fontSize: "13px", color: V.ink }}>${(q.subUSD||0).toLocaleString("en-US",{minimumFractionDigits:2})}</td>
                    <td style={{ padding: "11px 18px", fontSize: "12px", color: V.muted }}>{q.savedAt ? new Date(q.savedAt).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}) : "—"}</td>
                    <td style={{ padding: "11px 18px", fontSize: "12px", color: V.muted }}>{q.owner || q.ownerName || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "28px 32px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "22px", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: "20px", fontWeight: 800, color: V.navy }}>Accounts</div>
          <div style={{ fontSize: "12px", color: V.muted, marginTop: "2px" }}>Customer database</div>
        </div>
        <button onClick={() => setShowDrawer(true)}
          style={{ background: "linear-gradient(135deg,#E84B9C,#F97316)", border: "none", color: "#fff", padding: "9px 18px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 700, fontFamily: "inherit", boxShadow: "0 4px 14px rgba(232,75,156,0.3)" }}>
          + New Account
        </button>
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "16px", alignItems: "center" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, industry, country…"
          style={{ flex: 1, ...IS }} onFocus={e => e.target.style.borderColor = V.pink} onBlur={e => e.target.style.borderColor = V.border}/>
        <span style={{ fontSize: "12px", color: V.muted, whiteSpace: "nowrap" }}>{filtered.length} account{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      <div style={{ background: "#fff", borderRadius: "12px", border: `1px solid ${V.border}`, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "60px", textAlign: "center", color: V.muted }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "60px 24px", textAlign: "center" }}>
            <div style={{ fontSize: "36px", marginBottom: "8px" }}>🏢</div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: V.ink }}>No accounts yet</div>
            <div style={{ fontSize: "12px", color: V.muted, marginTop: "4px" }}>Create an account or select one while building a quote</div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F8FAFC" }}>
                {["Account","Industry","Country","Contacts",""].map((h,i) => (
                  <th key={i} style={{ padding: "10px 18px", textAlign: "left", fontSize: "10.5px", fontWeight: 700, color: V.muted, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${V.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(acc => (
                <tr key={acc.id} style={{ borderBottom: `1px solid ${V.border}`, cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                  onMouseLeave={e => e.currentTarget.style.background = "#fff"}
                  onClick={() => openAccount(acc)}>
                  <td style={{ padding: "13px 18px" }}>
                    <div style={{ fontWeight: 700, fontSize: "13px", color: V.ink }}>{acc.name}</div>
                    {acc.website && <div style={{ fontSize: "11px", color: "#93C5FD", marginTop: "1px" }}>{acc.website}</div>}
                  </td>
                  <td style={{ padding: "13px 18px", fontSize: "12px", color: V.muted }}>{acc.industry || "—"}</td>
                  <td style={{ padding: "13px 18px", fontSize: "12px", color: V.muted }}>{acc.country || "—"}</td>
                  <td style={{ padding: "13px 18px", fontSize: "12px", color: V.muted }}>{(acc.contacts||[]).length}</td>
                  <td style={{ padding: "13px 18px", textAlign: "right" }}>
                    <span style={{ fontSize: "12px", color: V.pink, fontWeight: 600 }}>View →</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showDrawer && (
        <AccountDrawer initialName="" user={user}
          onSave={() => { setShowDrawer(false); reload(); }}
          onClose={() => setShowDrawer(false)}/>
      )}
    </div>
  );
}

// ─── SIDEBAR NAV ─────────────────────────────────────────────────────────────
// ─── USER PROFILE / ROLES ─────────────────────────────────────────────────────
async function fetchUserProfile(userId) {
  const { data } = await supabase.from("user_profiles").select("*").eq("id", userId).single();
  return data;
}
async function fetchAllProfiles() {
  const { data } = await supabase.from("user_profiles").select("*").order("full_name");
  return data || [];
}
async function updateProfileRole(profileId, role) {
  return supabase.from("user_profiles").update({ role, updated_at: new Date().toISOString() }).eq("id", profileId);
}
async function updateProfileManager(profileId, managerId) {
  return supabase.from("user_profiles").update({ manager_id: managerId || null, updated_at: new Date().toISOString() }).eq("id", profileId);
}

const ROLE_LABELS = { admin: "Admin", hr_admin: "HR-Admin", manager: "Manager", contributor: "Contributor" };
const ROLE_COLORS = { admin: "#7C3AED", hr_admin: "#0EA5E9", manager: "#10B981", contributor: "#94A3B8" };
const ALL_ROLES   = ["admin", "hr_admin", "manager", "contributor"];

// ─── USERS VIEW (Admin / HR-Admin only) ───────────────────────────────────────
function UsersView({ currentUser, userProfile }) {
  const [profiles, setProfiles] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole,  setInviteRole]  = useState("contributor");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState(null);

  const canManage = ["admin","hr_admin"].includes(userProfile?.role);
  const isAdmin   = userProfile?.role === "admin";

  useEffect(() => {
    fetchAllProfiles().then(p => { setProfiles(p); setLoading(false); });
  }, []);

  async function handleRoleChange(profileId, newRole) {
    setSaving(profileId + "_role");
    await updateProfileRole(profileId, newRole);
    setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, role: newRole } : p));
    setSaving(null);
  }

  async function handleManagerChange(profileId, managerId) {
    setSaving(profileId + "_mgr");
    await updateProfileManager(profileId, managerId || null);
    setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, manager_id: managerId || null } : p));
    setSaving(null);
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) return;
    setInviting(true); setInviteMsg(null);
    const { error } = await supabase.auth.signInWithOtp({ email: inviteEmail.trim(), options: { shouldCreateUser: true } });
    if (error) { setInviteMsg({ type: "error", text: error.message }); }
    else {
      setInviteMsg({ type: "ok", text: `Invite link sent to ${inviteEmail.trim()}. After they sign in, set their role below.` });
      setInviteEmail(""); setInviteRole("contributor");
      setTimeout(() => fetchAllProfiles().then(setProfiles), 2000);
    }
    setInviting(false);
  }

  const managers = profiles.filter(p => p.role === "manager");

  const Sel = ({ value, options, onChange, disabled }) => (
    <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
      style={{ padding:"4px 8px", borderRadius:"6px", border:`1px solid ${V.border}`, fontSize:"12px", background:"#fff", fontFamily:"inherit", cursor:"pointer", color: V.ink }}>
      {options.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );

  return (
    <div style={{ padding:"28px 32px", maxWidth:960 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"20px", flexWrap:"wrap", gap:"12px" }}>
        <div>
          <div style={{ fontSize:"20px", fontWeight:800, color:V.navy }}>Users & Roles</div>
          <div style={{ fontSize:"12px", color:V.muted, marginTop:"2px" }}>{profiles.length} user{profiles.length !== 1 ? "s" : ""} · your role: <b>{ROLE_LABELS[userProfile?.role] || "—"}</b></div>
        </div>
      </div>

      {/* Invite panel */}
      {canManage && (
        <div style={{ background:"#F8FAFC", border:`1px solid ${V.border}`, borderRadius:"12px", padding:"16px 20px", marginBottom:"24px" }}>
          <div style={{ fontSize:"13px", fontWeight:700, color:V.navy, marginBottom:"10px" }}>Invite New User</div>
          <div style={{ display:"flex", gap:"10px", flexWrap:"wrap", alignItems:"center" }}>
            <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="email@virtuos.com"
              onKeyDown={e => e.key === "Enter" && handleInvite()}
              style={{ flex:1, minWidth:"220px", padding:"8px 12px", border:`1px solid ${V.border}`, borderRadius:"8px", fontSize:"13px", fontFamily:"inherit" }}/>
            <button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}
              style={{ padding:"8px 18px", background:V.pink, color:"#fff", border:"none", borderRadius:"8px", cursor:"pointer", fontSize:"13px", fontWeight:700, fontFamily:"inherit", opacity:inviteEmail.trim()?1:0.5 }}>
              {inviting ? "Sending…" : "Send Invite"}
            </button>
          </div>
          {inviteMsg && (
            <div style={{ marginTop:"8px", fontSize:"12px", color: inviteMsg.type==="ok" ? "#10B981" : "#EF4444" }}>{inviteMsg.text}</div>
          )}
          <div style={{ marginTop:"8px", fontSize:"11px", color:V.muted }}>A magic-link sign-in email will be sent. Once they log in, assign their role below.</div>
        </div>
      )}

      {/* Users table */}
      {loading ? (
        <div style={{ color:V.muted, fontSize:"13px" }}>Loading…</div>
      ) : (
        <div style={{ background:"#fff", border:`1px solid ${V.border}`, borderRadius:"12px", overflow:"hidden" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ background:"#F8FAFC" }}>
                {["User","Email","Role","Reports To"].map(h => (
                  <th key={h} style={{ padding:"10px 16px", textAlign:"left", fontSize:"11px", fontWeight:700, color:V.muted, textTransform:"uppercase", letterSpacing:"0.06em", borderBottom:`1px solid ${V.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {profiles.map((p, i) => {
                const isCurrentUser = p.id === currentUser.id;
                const managerName = p.manager_id ? (profiles.find(m => m.id === p.manager_id)?.full_name || "—") : "—";
                return (
                  <tr key={p.id} style={{ borderBottom: i < profiles.length-1 ? `1px solid ${V.border}` : "none", background: isCurrentUser ? "#FAFBFF" : "#fff" }}>
                    <td style={{ padding:"12px 16px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                        <div style={{ width:"32px", height:"32px", borderRadius:"50%", background: ROLE_COLORS[p.role] + "22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"13px", fontWeight:700, color: ROLE_COLORS[p.role], flexShrink:0 }}>
                          {(p.full_name||p.email||"?").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize:"13px", fontWeight:600, color:V.ink }}>{p.full_name || "—"}{isCurrentUser && <span style={{ fontSize:"10px", color:V.muted, marginLeft:"6px" }}>(you)</span>}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding:"12px 16px", fontSize:"12.5px", color:V.muted }}>{p.email}</td>
                    <td style={{ padding:"12px 16px" }}>
                      {canManage && !isCurrentUser ? (
                        <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                          <Sel value={p.role} onChange={v => handleRoleChange(p.id, v)}
                            disabled={saving === p.id+"_role"}
                            options={ALL_ROLES.map(r => [r, ROLE_LABELS[r]])}/>
                          {saving === p.id+"_role" && <span style={{ fontSize:"11px", color:V.muted }}>saving…</span>}
                        </div>
                      ) : (
                        <span style={{ display:"inline-block", padding:"2px 10px", borderRadius:"20px", fontSize:"11.5px", fontWeight:700, background: ROLE_COLORS[p.role]+"18", color: ROLE_COLORS[p.role] }}>
                          {ROLE_LABELS[p.role]}
                        </span>
                      )}
                    </td>
                    <td style={{ padding:"12px 16px" }}>
                      {canManage && p.role === "contributor" && !isCurrentUser ? (
                        <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                          <Sel value={p.manager_id || ""} onChange={v => handleManagerChange(p.id, v)}
                            disabled={saving === p.id+"_mgr"}
                            options={[["","— No Manager —"], ...managers.map(m => [m.id, m.full_name || m.email])]}/>
                          {saving === p.id+"_mgr" && <span style={{ fontSize:"11px", color:V.muted }}>saving…</span>}
                        </div>
                      ) : (
                        <span style={{ fontSize:"12.5px", color: p.manager_id ? V.ink : V.muted }}>{managerName}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Role legend */}
      <div style={{ marginTop:"24px", display:"flex", gap:"16px", flexWrap:"wrap" }}>
        {[
          ["admin",       "Can see all data, import, assign roles"],
          ["hr_admin",    "Can see all data, assign roles & invite users — no imports"],
          ["manager",     "Sees own quotes + their team's quotes"],
          ["contributor", "Sees only their own quotes"],
        ].map(([role, desc]) => (
          <div key={role} style={{ display:"flex", alignItems:"center", gap:"8px", fontSize:"12px", color:V.muted }}>
            <span style={{ display:"inline-block", padding:"1px 9px", borderRadius:"20px", fontSize:"11px", fontWeight:700, background: ROLE_COLORS[role]+"18", color: ROLE_COLORS[role] }}>{ROLE_LABELS[role]}</span>
            <span>{desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Sidebar({ view, setView, user, onSignOut, navItems, userProfile }) {
  const items = navItems || NAV_ITEMS;
  return (
    <aside className="qb-sidebar">
      {/* Logo */}
      <div className="qb-sidebar-logo" style={{ padding: "22px 20px 14px" }}>
        <VirtuosLogo height={26}/>
        <div style={{ color: "rgba(255,255,255,0.25)", fontSize: "9px", marginTop: "8px", textTransform: "uppercase", letterSpacing: "0.14em" }}>Quote Builder</div>
      </div>
      <div style={{ height: "1px", background: "rgba(255,255,255,0.07)", margin: "0 0" }}/>

      {/* Nav */}
      <nav className="qb-sidebar-nav">
        {items.map(item => {
          const active = view === item.id;
          return (
            <button key={item.id} onClick={() => setView(item.id)} className="qb-nav-item" data-active={active ? "1" : "0"}
              style={{
                display: "flex", alignItems: "center", gap: "11px",
                padding: "10px 14px", borderRadius: "9px", width: "100%",
                background: active ? "rgba(232,75,156,0.14)" : "transparent",
                border: active ? "1px solid rgba(232,75,156,0.28)" : "1px solid transparent",
                color: active ? "#E84B9C" : "rgba(255,255,255,0.52)",
                fontWeight: active ? 700 : 500, fontSize: "13.5px",
                cursor: "pointer", textAlign: "left", fontFamily: "inherit", transition: "all 0.12s",
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.82)"; } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.52)"; } }}>
              <span className="qb-sidebar-icon" style={{ fontSize: "17px", width: "20px", textAlign: "center", flexShrink: 0 }}>{item.icon}</span>
              <span className="qb-sidebar-label">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User / role badge / sign out */}
      <div className="qb-sidebar-user" style={{ padding: "14px 16px", borderTop: "1px solid rgba(255,255,255,0.07)", marginTop: "auto" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"6px", marginBottom:"8px" }}>
          <div style={{ flex:1, fontSize: "11px", color: "rgba(255,255,255,0.38)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user?.user_metadata?.full_name || user?.email}
          </div>
          {userProfile?.role && (
            <span style={{ flexShrink:0, fontSize:"9px", fontWeight:700, padding:"2px 6px", borderRadius:"20px", background: ROLE_COLORS[userProfile.role]+"35", color: ROLE_COLORS[userProfile.role], textTransform:"uppercase", letterSpacing:"0.05em" }}>
              {ROLE_LABELS[userProfile.role]}
            </span>
          )}
        </div>
        <button onClick={onSignOut}
          style={{ width: "100%", padding: "8px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "8px", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "12px", fontFamily: "inherit", transition: "all 0.12s" }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}>
          Sign Out
        </button>
      </div>
    </aside>
  );
}

// ─── HOME VIEW ────────────────────────────────────────────────────────────────
function HomeView({ user, onLoadQuote, onNewQuote }) {
  const [quotes,  setQuotes]  = useState([]);
  const [loading, setLoading] = useState(true);
  const name = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  useEffect(() => {
    fetchAllQuotes().then(all => {
      setQuotes(all.filter(q => q.ownerEmail === user.email));
      setLoading(false);
    });
  }, [user.email]);

  const fmt$ = n => `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  const now = new Date();
  const thisMonth  = quotes.filter(q => q.savedAt && new Date(q.savedAt).getMonth() === now.getMonth() && new Date(q.savedAt).getFullYear() === now.getFullYear());
  const totalUSD   = quotes.reduce((s, q) => s + (q.subUSD||0), 0);
  const recent     = quotes.slice(0, 8);

  return (
    <div style={{ padding: "32px 36px", maxWidth: "1000px" }}>
      {/* Welcome */}
      <div style={{ marginBottom: "28px" }}>
        <div style={{ fontSize: "24px", fontWeight: 800, color: V.navy }}>{greeting}, {name} 👋</div>
        <div style={{ fontSize: "13px", color: V.muted, marginTop: "4px" }}>
          {now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "14px", marginBottom: "24px" }}>
        {[
          { label: "My Quotes",       value: loading ? "—" : quotes.length,       color: V.navy,    sub: "all time" },
          { label: "This Month",      value: loading ? "—" : thisMonth.length,    color: "#7C3AED", sub: `quote${thisMonth.length !== 1 ? "s" : ""} created` },
          { label: "Pipeline (USD)",  value: loading ? "—" : fmt$(totalUSD),      color: "#E84B9C", sub: "net value" },
        ].map(s => (
          <div key={s.label} style={{ background: "#fff", borderRadius: "14px", padding: "18px 22px", border: `1px solid ${V.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize: "10px", fontWeight: 800, color: V.muted, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: "8px" }}>{s.label}</div>
            <div style={{ fontSize: "26px", fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: "11px", color: V.muted, marginTop: "3px" }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* New quote CTA */}
      <div style={{ background: "linear-gradient(135deg,#0D1B3E,#1A2C55)", borderRadius: "14px", padding: "20px 26px", marginBottom: "24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
        <div>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: "15px" }}>Ready to build a new quote?</div>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", marginTop: "3px" }}>Asana · Smartsheet · Professional Services</div>
        </div>
        <button onClick={onNewQuote}
          style={{ background: "linear-gradient(135deg,#E84B9C,#F97316)", color: "#fff", border: "none", padding: "10px 22px", borderRadius: "9px", cursor: "pointer", fontSize: "13px", fontWeight: 700, fontFamily: "inherit", whiteSpace: "nowrap", boxShadow: "0 4px 14px rgba(232,75,156,0.4)" }}>
          + New Quote
        </button>
      </div>

      {/* Recent quotes */}
      <div style={{ background: "#fff", borderRadius: "14px", border: `1px solid ${V.border}`, overflow: "hidden" }}>
        <div style={{ padding: "16px 22px", borderBottom: `1px solid ${V.border}` }}>
          <div style={{ fontSize: "13px", fontWeight: 800, color: V.navy }}>My Recent Quotes</div>
        </div>
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: V.muted, fontSize: "13px" }}>Loading…</div>
        ) : recent.length === 0 ? (
          <div style={{ padding: "48px", textAlign: "center" }}>
            <div style={{ fontSize: "32px", marginBottom: "8px" }}>📋</div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: V.ink }}>No quotes yet</div>
            <div style={{ fontSize: "12px", color: V.muted, marginTop: "4px" }}>Your quotes will appear here after you create and save them</div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F8FAFC" }}>
                {["Company", "Quote ID / Name", "Value (USD)", "Date"].map(h => (
                  <th key={h} style={{ padding: "10px 20px", textAlign: "left", fontSize: "10.5px", fontWeight: 700, color: V.muted, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${V.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map(q => (
                <tr key={q.id} onClick={() => onLoadQuote(q)} style={{ cursor: "pointer", borderBottom: `1px solid #F1F5F9` }}
                  onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                  onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                  <td style={{ padding: "12px 20px" }}>
                    <div style={{ fontWeight: 700, fontSize: "13px", color: V.ink }}>{q.customer?.company || "—"}</div>
                    <div style={{ fontSize: "11px", color: V.muted, marginTop: "1px" }}>{q.customer?.name || ""}</div>
                  </td>
                  <td style={{ padding: "12px 20px" }}>
                    <div style={{ fontFamily: "monospace", fontSize: "11.5px", color: V.muted }}>{q.id}</div>
                    {q.quoteName && <div style={{ fontSize: "11px", color: V.ink, marginTop: "2px" }}>{q.quoteName}</div>}
                  </td>
                  <td style={{ padding: "12px 20px", fontWeight: 700, fontSize: "13px", color: V.ink }}>{fmt$(q.subUSD || 0)}</td>
                  <td style={{ padding: "12px 20px", fontSize: "12px", color: V.muted }}>{q.savedAt ? new Date(q.savedAt).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── QUOTE HISTORY VIEW ───────────────────────────────────────────────────────
function QuoteHistory({ onNewQuote, onLoadQuote, user }) {
  const [quotes,   setQuotes]  = useState([]);
  const [loading,  setLoading] = useState(true);
  const [search,   setSearch]  = useState("");
  const [sortBy,   setSortBy]  = useState("savedAt");
  const [confirm,  setConfirm] = useState(null);

  useEffect(() => { fetchAllQuotes().then(q => { setQuotes(q); setLoading(false); }); }, []);

  const filtered = quotes
    .filter(q => {
      const s = search.toLowerCase();
      return !s || q.customer?.company?.toLowerCase().includes(s) || q.customer?.name?.toLowerCase().includes(s) || q.id?.toLowerCase().includes(s) || q.quoteName?.toLowerCase().includes(s) || q.owner?.toLowerCase().includes(s);
    })
    .sort((a, b) => {
      if (sortBy === "savedAt") return new Date(b.savedAt) - new Date(a.savedAt);
      if (sortBy === "total")   return (b.subUSD||0) - (a.subUSD||0);
      if (sortBy === "company") return (a.customer?.company||"").localeCompare(b.customer?.company||"");
      return 0;
    });

  async function handleDelete(id) { await removeQuote(id); setQuotes(q => q.filter(x => x.id !== id)); setConfirm(null); }

  const fmt$ = n => `$${n.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const totalValue = quotes.reduce((s, q) => s + (q.subUSD||0), 0);

  return (
    <div style={{ padding: "28px 32px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "22px", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: "20px", fontWeight: 800, color: V.navy }}>All Quotes</div>
          <div style={{ fontSize: "12px", color: V.muted, marginTop: "2px" }}>Every quote across your team</div>
        </div>
        <button onClick={onNewQuote}
          style={{ background: "linear-gradient(135deg,#E84B9C,#F97316)", color: "#fff", border: "none", padding: "9px 18px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 700, fontFamily: "inherit", boxShadow: "0 4px 14px rgba(232,75,156,0.3)" }}>
          + New Quote
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "12px", marginBottom: "20px" }}>
        {[
          ["Total Quotes", quotes.length, V.navy],
          ["Pipeline (USD)", fmt$(totalValue), "#E84B9C"],
          ["This Month", quotes.filter(q => q.savedAt && new Date(q.savedAt).getMonth() === new Date().getMonth()).length, "#0EA5E9"],
        ].map(([label, val, color]) => (
          <div key={label} style={{ background: "#fff", borderRadius: "12px", padding: "16px 20px", border: `1px solid ${V.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize: "10px", fontWeight: 800, color: V.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>{label}</div>
            <div style={{ fontSize: "22px", fontWeight: 900, color }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "14px", flexWrap: "wrap" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by company, contact, quote ID, owner…"
          style={{ flex: 1, minWidth: "200px", ...IS }}
          onFocus={e => e.target.style.borderColor = V.pink} onBlur={e => e.target.style.borderColor = V.border}/>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          style={{ ...IS, width: "auto", background: "#fff", cursor: "pointer" }}>
          <option value="savedAt">Latest first</option>
          <option value="total">Highest value</option>
          <option value="company">Company A–Z</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: "14px", border: `1px solid ${V.border}`, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "60px", textAlign: "center", color: V.muted, fontSize: "13px" }}>Loading quotes…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "60px 24px", textAlign: "center" }}>
            <div style={{ fontSize: "36px", marginBottom: "10px" }}>{quotes.length === 0 ? "📋" : "🔍"}</div>
            <div style={{ fontSize: "15px", fontWeight: 700, color: V.ink }}>{quotes.length === 0 ? "No quotes saved yet" : "No quotes match your search"}</div>
            {quotes.length === 0 && <button onClick={onNewQuote} style={{ marginTop: "16px", background: "linear-gradient(135deg,#E84B9C,#F97316)", color: "#fff", border: "none", padding: "10px 22px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 700, fontFamily: "inherit" }}>Create your first quote</button>}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="qh-table">
              <thead>
                <tr>
                  <th onClick={() => setSortBy("company")}>Company / Contact</th>
                  <th>Quote ID</th>
                  <th className="qh-hide">Products</th>
                  <th className="qh-hide">Owner</th>
                  <th className="qh-hide">Payment</th>
                  <th onClick={() => setSortBy("total")}>Total (USD)</th>
                  <th onClick={() => setSortBy("savedAt")}>Saved</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(q => {
                  const cats = [...new Set((q.lines||[]).map(l => l.productCategory))];
                  const catColors = { asana: "#FC636B", smartsheet: "#0073EA", professional_services: "#7C3AED" };
                  const catLabels = { asana: "Asana", smartsheet: "Smartsheet", professional_services: "Prof. Svcs" };
                  return (
                    <tr key={q.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: V.ink }}>{q.customer?.company || "—"}</div>
                        <div style={{ fontSize: "11.5px", color: V.muted, marginTop: "1px" }}>{q.customer?.name || ""}{q.customer?.email ? ` · ${q.customer.email}` : ""}</div>
                      </td>
                      <td>
                        <div style={{ fontFamily: "monospace", fontSize: "12px", fontWeight: 700, color: V.navy, background: "#F1F5F9", padding: "2px 7px", borderRadius: "5px", display: "inline-block" }}>{q.id}</div>
                        {q.quoteName && <div style={{ fontSize: "11px", color: V.muted, marginTop: "3px" }}>{q.quoteName}</div>}
                      </td>
                      <td className="qh-hide">
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                          {cats.map(c => <span key={c} className="qh-badge" style={{ background: catColors[c]+"18", color: catColors[c], border: `1px solid ${catColors[c]}33` }}>{catLabels[c]}</span>)}
                        </div>
                      </td>
                      <td className="qh-hide">
                        <div style={{ fontSize: "12.5px", fontWeight: 600, color: V.ink }}>{q.ownerName || q.owner || "—"}</div>
                        <div style={{ fontSize: "11px", color: V.muted }}>{q.ownerEmail || ""}</div>
                      </td>
                      <td className="qh-hide" style={{ fontSize: "12px", color: V.muted }}>{q.paymentTerms || "—"}</td>
                      <td>
                        <div style={{ fontWeight: 800, color: V.ink }}>{fmt$(q.subUSD || 0)}</div>
                        {q.currency?.code && q.currency.code !== "USD" && <div style={{ fontSize: "11px", color: V.muted }}>{q.currency.symbol}{((q.subUSD||0)*q.currency.rate).toLocaleString(numLocale(q.currency.code),{maximumFractionDigits:0})} {q.currency.code}</div>}
                      </td>
                      <td style={{ color: V.muted, fontSize: "12px", whiteSpace: "nowrap" }}>{q.savedAt ? new Date(q.savedAt).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}) : q.createdOn || "—"}</td>
                      <td>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                          <button onClick={() => onLoadQuote(q)} style={{ padding: "5px 12px", background: V.navy, color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 600, fontFamily: "inherit" }}>Load</button>
                          {confirm === q.id ? (
                            <>
                              <button onClick={() => handleDelete(q.id)} style={{ padding: "5px 10px", background: "#EF4444", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontFamily: "inherit" }}>Confirm</button>
                              <button onClick={() => setConfirm(null)} style={{ padding: "5px 10px", background: "#F1F5F9", color: V.muted, border: `1px solid ${V.border}`, borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontFamily: "inherit" }}>Cancel</button>
                            </>
                          ) : (
                            <button onClick={() => setConfirm(q.id)} style={{ padding: "5px 10px", background: "#FEF2F2", color: "#EF4444", border: "1px solid #FECACA", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontFamily: "inherit" }}>Delete</button>
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
      <div style={{ marginTop: "10px", fontSize: "11px", color: V.muted, textAlign: "right" }}>{filtered.length} of {quotes.length} quotes</div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function QuoteBuilder({ user, onSignOut }) {
  const today = new Date().toISOString().split("T")[0];
  const [view,         setView]         = useState("home");
  const [dbReady,      setDbReady]      = useState(null);
  const [userProfile,  setUserProfile]  = useState(null);
  const [customer,     setCustomer]     = useState({ name: "", company: "", email: "", phone: "" });
  const [accountId,    setAccountId]    = useState(null);
  const [paymentTerms, setPaymentTerms] = useState("100% Advance");
  const [qd,           setQd]           = useState({ quoteId: generateQuoteId(), quoteName: "", createdOn: new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}), owner: "", notes: "", validUntil: "" });
  const [lines,        setLines]        = useState([]);
  const [currency,     setCurrency]     = useState(CURRENCIES[0]);
  const [billingCycle, setBillingCycle] = useState("annual");
  const [monthCount,   setMonthCount]   = useState(12);
  const [startDate,    setStartDate]    = useState(today);
  const [endDate,      setEndDate]      = useState(autoEndDate(today, "annual", 12));
  const [taxConfig,      setTaxConfig]      = useState(TAX_RATES[0]);
  const [contractYears,  setContractYears]  = useState(1);
  const [yearEscalation, setYearEscalation] = useState(0);
  const [showPreview,    setShowPreview]    = useState(false);

  useEffect(() => {
    supabase.from("accounts").select("id").limit(1)
      .then(({ error }) => setDbReady(!error || error.code !== "42P01"));
  }, []);

  useEffect(() => {
    fetchUserProfile(user.id).then(p => setUserProfile(p || { role: "contributor" }));
  }, [user.id]);

  const userRole = userProfile?.role || "contributor";
  const canManageRoles = userRole === "admin" || userRole === "hr_admin";

  const navItems = [
    { id: "home",     label: "Home",       icon: "⌂" },
    { id: "builder",  label: "New Quote",  icon: "✦" },
    { id: "accounts", label: "Accounts",   icon: "◈" },
    { id: "history",  label: "All Quotes", icon: "≡" },
    ...(canManageRoles ? [{ id: "users", label: "Users & Roles", icon: "◉" }] : []),
  ];

  const handleCycle        = c => { setBillingCycle(c); if(c!=="custom") setEndDate(autoEndDate(startDate,c,monthCount,contractYears)); };
  const handleStart        = d => { setStartDate(d); if(billingCycle!=="custom") setEndDate(autoEndDate(d,billingCycle,monthCount,contractYears)); };
  const handleMonths       = n => { const m=Math.max(0.5,parseFloat(n)||0.5); setMonthCount(m); setEndDate(autoEndDate(startDate,"monthly",m,contractYears)); };
  const handleContractYears = y => { setContractYears(y); if(billingCycle==="annual") setEndDate(autoEndDate(startDate,"annual",12,y)); };

  function resetQuote() {
    setCustomer({ name: "", company: "", email: "", phone: "" });
    setAccountId(null); setLines([]); setPaymentTerms("100% Advance");
    setQd({ quoteId: generateQuoteId(), quoteName: "", createdOn: new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}), owner: "", notes: "", validUntil: "" });
    setCurrency(CURRENCIES[0]); setBillingCycle("annual"); setMonthCount(12);
    setStartDate(today); setEndDate(autoEndDate(today,"annual",12)); setTaxConfig(TAX_RATES[0]);
  }

  function saveCurrentQuote() {
    const cl = computeLines(lines, startDate, endDate, billingCycle);
    const subUSD = cl.reduce((s, l) => s + l.net, 0);
    const snapshot = {
      id: qd.quoteId, quoteName: qd.quoteName, createdOn: qd.createdOn, validUntil: qd.validUntil,
      owner: qd.owner || user?.user_metadata?.full_name || user?.email, notes: qd.notes,
      customer, currency, billingCycle, monthCount, startDate, endDate, taxConfig, paymentTerms,
      lines, subUSD, grandLocal: subUSD * currency.rate, accountId,
    };
    upsertQuote(snapshot, user, accountId);
  }

  function loadQuote(q) {
    setCustomer(q.customer || { name: "", company: "", email: "", phone: "" });
    setAccountId(q.accountId || null);
    setPaymentTerms(q.paymentTerms || "100% Advance");
    setQd({ quoteId: q.id, quoteName: q.quoteName||"", createdOn: q.createdOn||"", owner: q.owner||"", notes: q.notes||"", validUntil: q.validUntil||"" });
    setLines(q.lines || []);
    setCurrency(q.currency || CURRENCIES[0]);
    setBillingCycle(q.billingCycle || "annual");
    setMonthCount(q.monthCount || 12);
    setStartDate(q.startDate || today);
    setEndDate(q.endDate || autoEndDate(today, "annual", 12));
    setTaxConfig(q.taxConfig || TAX_RATES[0]);
    setView("builder");
  }

  const addLine = cat => {
    const p = PRODUCTS[cat]; if (!p) return;
    setLines(prev => [...prev, { productCategory: cat, itemId: p.tiers[0].id, qty: 1, discount: 0, discountType: "percent" }]);
  };

  const totals = useMemo(() => {
    const cl = computeLines(lines, startDate, endDate, billingCycle);
    const annualList = cl.reduce((s,l) => s+l.annual, 0);
    const discTotal  = cl.reduce((s,l) => s+l.disc, 0);
    const subUSD     = cl.reduce((s,l) => s+l.net, 0);
    const subLocal   = subUSD * currency.rate;
    const taxLocal   = subLocal * taxConfig.rate;
    return { annualList, discTotal, subUSD, subLocal, taxLocal, grand: subLocal + taxLocal };
  }, [lines, startDate, endDate, billingCycle, currency, taxConfig]);

  const yearlyTotals = useMemo(() => {
    const taxMult = 1 + taxConfig.rate;
    return Array.from({length: contractYears}, (_, i) => {
      const factor = Math.pow(1 + yearEscalation / 100, i);
      return {
        year: i + 1,
        subtotal: totals.subLocal * factor,
        grand:    totals.subLocal * factor * taxMult,
        subtotalUSD: totals.subUSD * factor,
      };
    });
  }, [contractYears, yearEscalation, totals.subUSD, totals.subLocal, taxConfig.rate]);
  const totalContractValue = yearlyTotals.reduce((s, y) => s + y.grand, 0);
  const totalContractUSD   = yearlyTotals.reduce((s, y) => s + y.subtotalUSD, 0);

  const days  = daysBetween(startDate, endDate);
  const prPct = billingCycle !== "annual" ? `Pro-rata: ${(proRataFactor(startDate,endDate,billingCycle)*100).toFixed(2)}%` : null;

  const handleNav = v => {
    if (v === "builder") { resetQuote(); }
    setView(v);
  };

  return (
    <div className="qb-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        .qb-root         { display:flex; min-height:100vh; font-family:'DM Sans',system-ui,sans-serif; background:#F1F5F9; }
        .qb-sidebar      { width:224px; min-width:224px; background:linear-gradient(180deg,#0D1B3E 0%,#09111f 100%); display:flex; flex-direction:column; position:sticky; top:0; height:100vh; flex-shrink:0; overflow:hidden; transition:width 0.2s; }
        .qb-sidebar-nav  { flex:1; padding:12px; display:flex; flex-direction:column; gap:3px; overflow:hidden; }
        .qb-content      { flex:1; overflow:auto; min-height:100vh; }
        .qb-builder-bar  { background:#fff; border-bottom:1px solid #E2E8F0; padding:12px 22px; display:flex; align-items:center; justify-content:space-between; gap:12px; position:sticky; top:0; z-index:50; flex-wrap:wrap; }
        .qb-body         { max-width:1160px; margin:0 auto; padding:20px; }
        .qb-grid         { display:grid; grid-template-columns:300px 1fr; gap:18px; align-items:start; }
        .pl-grid         { display:grid; grid-template-columns:2fr 1fr 1fr 1fr 1fr; gap:8px; align-items:end; }
        .add-grid        { display:grid; grid-template-columns:1fr 1fr 1fr; gap:9px; }
        .qh-table        { width:100%; border-collapse:collapse; }
        .qh-table th     { padding:10px 16px; text-align:left; font-size:10.5px; font-weight:800; color:#64748B; text-transform:uppercase; letter-spacing:0.07em; border-bottom:2px solid #E2E8F0; cursor:pointer; white-space:nowrap; }
        .qh-table th:hover { color:#0D1B3E; }
        .qh-table td     { padding:12px 16px; border-bottom:1px solid #F1F5F9; font-size:13px; color:#1E293B; vertical-align:middle; }
        .qh-table tr:last-child td { border-bottom:none; }
        .qh-table tr:hover td { background:#F8FAFC; }
        .qh-badge        { display:inline-block; padding:2px 8px; border-radius:5px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; }
        .qp-header-grid  { display:grid; grid-template-columns:1fr 1fr; padding:18px 36px 24px; }
        .qp-meta-grid    { display:grid; grid-template-columns:1fr 1fr; gap:10px 20px; align-content:start; }
        .qp-body         { padding:28px 36px; }
        .qp-modal-inner  { background:#fff; width:100%; max-width:860px; border-radius:20px; overflow:hidden; box-shadow:0 32px 80px rgba(0,0,0,0.35); margin-bottom:20px; }
        .qp-action-bar   { padding:14px 36px; display:flex; gap:10px; justify-content:flex-end; border-top:1px solid #E2E8F0; background:#F8FAFC; }
        @media (max-width:1100px) {
          .qb-sidebar-label { display:none; }
          .qb-sidebar { width:64px; min-width:64px; }
          .qb-sidebar-logo { display:none; }
          .qb-sidebar-user { padding:8px; }
          .qb-sidebar-user div { display:none; }
          .qb-sidebar-user button { padding:8px; }
          .qb-sidebar-nav { padding:8px 6px; }
        }
        @media (max-width:900px) {
          .qb-grid { grid-template-columns:1fr; }
          .pl-grid { grid-template-columns:1fr 1fr 1fr; }
          .add-grid { grid-template-columns:1fr 1fr 1fr; }
          .qp-body { padding:20px; }
          .qp-header-grid { padding:14px 20px 18px; }
          .qp-action-bar { padding:12px 20px; }
          .qp-modal-inner { border-radius:14px; }
        }
        @media (max-width:600px) {
          .qb-sidebar { width:100%; min-width:100%; height:auto; position:fixed; bottom:0; top:auto; z-index:200; flex-direction:row; border-top:1px solid rgba(255,255,255,0.08); }
          .qb-sidebar-logo, .qb-sidebar-user { display:none; }
          .qb-sidebar-nav { flex-direction:row; padding:4px 6px; gap:2px; }
          .qb-sidebar-label { display:none; }
          .qb-content { padding-bottom:68px; }
          .qb-body { padding:12px; }
          .pl-grid { grid-template-columns:1fr 1fr; }
          .add-grid { grid-template-columns:1fr 1fr; }
          .qh-hide { display:none; }
          .qp-header-grid { grid-template-columns:1fr; gap:12px; padding:14px 16px; }
          .qp-meta-grid { grid-template-columns:1fr 1fr; }
          .qp-body { padding:14px 16px; }
          .qp-action-bar { padding:10px 16px; flex-direction:column-reverse; }
          .qp-modal-inner { border-radius:10px; }
          .qp-table-hide { display:none; }
        }
        @media (max-width:400px) {
          .add-grid { grid-template-columns:1fr; }
          .pl-grid { grid-template-columns:1fr; }
          .qp-meta-grid { grid-template-columns:1fr; }
        }
        @media print {
          body>*:not(.print-root){display:none!important;}
          .print-root{display:block!important;position:static!important;background:#fff!important;}
        }
      `}</style>

      <Sidebar view={view} setView={handleNav} user={user} onSignOut={onSignOut} navItems={navItems} userProfile={userProfile}/>

      {dbReady === false && (
        <div style={{ position:"fixed", top:0, left:0, right:0, zIndex:9999, background:"#FEF3C7", borderBottom:"2px solid #F59E0B", padding:"10px 20px", display:"flex", alignItems:"center", gap:"12px", flexWrap:"wrap" }}>
          <span style={{ fontSize:"16px" }}>⚠️</span>
          <span style={{ fontSize:"13px", fontWeight:600, color:"#92400E", flex:1 }}>
            Database setup required — the Accounts &amp; Contacts tables are missing.
            Run <code style={{ background:"rgba(0,0,0,0.08)", padding:"1px 5px", borderRadius:"4px", fontFamily:"monospace" }}>supabase_phase2_migration.sql</code> in your{" "}
            <a href="https://supabase.com/dashboard/project/_/sql" target="_blank" rel="noreferrer" style={{ color:"#92400E", textDecoration:"underline" }}>Supabase SQL Editor</a> to fix this.
          </span>
          <button onClick={async () => { const { error } = await supabase.from("accounts").select("id").limit(1); setDbReady(!error || error.code !== "42P01"); }}
            style={{ padding:"4px 12px", background:"#F59E0B", color:"#fff", border:"none", borderRadius:"6px", cursor:"pointer", fontSize:"12px", fontWeight:700, fontFamily:"inherit" }}>
            Re-check
          </button>
        </div>
      )}

      <main className="qb-content" style={dbReady === false ? { paddingTop:"52px" } : undefined}>
        {view === "home" && (
          <HomeView user={user} onLoadQuote={loadQuote} onNewQuote={() => { resetQuote(); setView("builder"); }}/>
        )}

        {view === "accounts" && (
          <AccountsView onLoadQuote={q => { loadQuote(q); }} user={user}/>
        )}

        {view === "history" && (
          <QuoteHistory onNewQuote={() => { resetQuote(); setView("builder"); }} onLoadQuote={loadQuote} user={user}/>
        )}

        {view === "users" && (
          <UsersView currentUser={user} userProfile={userProfile}/>
        )}

        {view === "builder" && (
          <>
            {/* Builder top bar */}
            <div className="qb-builder-bar">
              <div>
                <div style={{ fontSize: "15px", fontWeight: 800, color: V.navy }}>
                  {customer.company ? `Quote · ${customer.company}` : "New Quote"}
                </div>
                <div style={{ fontSize: "11px", color: V.muted, fontFamily: "monospace", marginTop: "1px" }}>{qd.quoteId}</div>
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                <button onClick={() => setQd(q => ({ ...q, quoteId: generateQuoteId() }))}
                  style={{ background: "#F1F5F9", border: `1px solid ${V.border}`, color: V.muted, padding: "6px 11px", borderRadius: "7px", cursor: "pointer", fontSize: "13px", fontFamily: "inherit" }}>
                  ↻ New ID
                </button>
                <button onClick={() => { if (lines.length > 0) { saveCurrentQuote(); setShowPreview(true); } }} disabled={lines.length === 0}
                  style={{ background: lines.length > 0 ? "linear-gradient(135deg,#E84B9C,#F97316)" : "#CBD5E1", color: "#fff", border: "none", padding: "8px 20px", borderRadius: "8px", cursor: lines.length > 0 ? "pointer" : "not-allowed", fontSize: "13px", fontWeight: 700, boxShadow: lines.length > 0 ? "0 4px 14px rgba(232,75,156,0.4)" : "none", fontFamily: "inherit", transition: "all 0.2s", whiteSpace: "nowrap" }}>
                  Preview & Export →
                </button>
              </div>
            </div>

            <div className="qb-body">
              <div className="qb-grid">

                {/* LEFT panels */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <Panel title="Customer" icon="👤">
                    <AccountCombobox
                      value={customer.company}
                      onChange={v => setCustomer(c => ({ ...c, company: v }))}
                      onAccountSelect={(acc, contact) => {
                        setAccountId(acc.id);
                        setCustomer(c => ({ ...c, company: acc.name, name: contact?.name||c.name, email: contact?.email||c.email, phone: contact?.phone||c.phone }));
                      }}
                      user={user}
                    />
                    <Inp label="Contact Name" value={customer.name} onChange={v => setCustomer(c => ({ ...c, name: v }))} placeholder="Jane Smith"/>
                    <Inp label="Email" type="email" value={customer.email} onChange={v => setCustomer(c => ({ ...c, email: v }))} placeholder="jane@acme.com"/>
                    <Inp label="Phone" value={customer.phone} onChange={v => setCustomer(c => ({ ...c, phone: v }))} placeholder="+91 98765 43210"/>
                  </Panel>

                  <Panel title="Quote Details" icon="📄">
                    <Inp label="Quote Name" value={qd.quoteName} onChange={v => setQd(q => ({ ...q, quoteName: v }))} placeholder="Q1 2026 Proposal"/>
                    <Inp label="Owner / Sales Rep" value={qd.owner} onChange={v => setQd(q => ({ ...q, owner: v }))} placeholder="Your Name"/>
                    <Inp label="Valid Until" type="date" value={qd.validUntil} onChange={v => setQd(q => ({ ...q, validUntil: v }))}/>
                    <Sel label="Payment Terms" value={paymentTerms} onChange={setPaymentTerms}
                      options={["100% Advance","Net 15 days","Net 30 days"].map(v => ({ value: v, label: v }))}/>
                  </Panel>

                  <Panel title="Subscription Period" icon="📅">
                    <Sel label="Billing Cycle" value={billingCycle} onChange={handleCycle}
                      options={[
                        {value:"annual",   label:"Annual (12 months)"},
                        {value:"quarterly",label:"Quarterly (3 months)"},
                        {value:"monthly",  label:"Monthly / Fractional"},
                        {value:"custom",   label:"Custom — pick end date"},
                      ]}/>
                    {billingCycle==="monthly"&&(
                      <div style={{display:"flex",flexDirection:"column",gap:"3px"}}>
                        <Label>Duration (months — decimals OK, e.g. 6.5)</Label>
                        <input type="number" min="0.5" step="0.5" value={monthCount}
                          onChange={e=>handleMonths(e.target.value)}
                          style={{...IS}}
                          onFocus={e=>{e.target.style.borderColor=V.pink;e.target.select();}}
                          onBlur={e=>e.target.style.borderColor=V.border}/>
                      </div>
                    )}
                    <Inp label="Start Date" type="date" value={startDate} onChange={handleStart}/>
                    {billingCycle==="custom"?(
                      <Inp label="End Date (set manually)" type="date" value={endDate} onChange={setEndDate}/>
                    ):(
                      <div style={{display:"flex",flexDirection:"column",gap:"3px"}}>
                        <Label>End Date (auto-calculated)</Label>
                        <div style={{background:"#F1F5F9",borderRadius:"8px",padding:"8px 11px",fontSize:"13.5px",color:V.ink,fontWeight:600,border:`1px solid ${V.border}`}}>{endDate||"—"}</div>
                      </div>
                    )}
                    {days>0&&(
                      <div style={{background:"#EFF6FF",borderRadius:"8px",padding:"8px 11px",fontSize:"12px",color:"#1D4ED8",fontWeight:600,border:"1px solid #BFDBFE"}}>
                        📆 {days} days{billingCycle==="annual"&&days>=364?" · Full annual period":""}{prPct?` · ${prPct}`:""}
                      </div>
                    )}
                    <div style={{height:"1px",background:V.border,margin:"4px 0"}}/>
                    <Sel label="Contract Term" value={contractYears} onChange={v => handleContractYears(Number(v))}
                      options={[
                        {value:1, label:"1 Year"},
                        {value:2, label:"2 Years"},
                        {value:3, label:"3 Years"},
                      ]}/>
                    {contractYears > 1 && (
                      <Sel label="Annual Price Escalation" value={yearEscalation} onChange={v => setYearEscalation(Number(v))}
                        options={[
                          {value:0,  label:"0% — Flat (no escalation)"},
                          {value:3,  label:"3% per year"},
                          {value:5,  label:"5% per year"},
                          {value:10, label:"10% per year"},
                        ]}/>
                    )}
                  </Panel>

                  <Panel title="Currency & Tax" icon="💱">
                    <Sel label="Currency" value={currency.code} onChange={v => setCurrency(CURRENCIES.find(c => c.code === v))}
                      options={CURRENCIES.map(c => ({ value: c.code, label: `${c.code} — ${c.name} (${c.symbol})` }))}/>
                    {currency.code !== "USD" && (
                      <Inp label={`FX Rate (1 USD → ${currency.code})`} type="number" min="0.01"
                        value={currency.rate} onChange={v => setCurrency(c => ({ ...c, rate: parseFloat(v)||c.rate }))}/>
                    )}
                    <Sel label="Tax" value={taxConfig.label} onChange={v => setTaxConfig(TAX_RATES.find(t => t.label === v))}
                      options={TAX_RATES.map(t => ({ value: t.label, label: t.label }))}/>
                  </Panel>

                  <Panel title="Notes" icon="📝">
                    <textarea value={qd.notes} onChange={e => setQd(q => ({ ...q, notes: e.target.value }))}
                      placeholder="Additional notes, special conditions…" rows={3}
                      style={{ width: "100%", border: `1.5px solid ${V.border}`, borderRadius: "8px", padding: "9px 11px", fontSize: "13px", resize: "vertical", outline: "none", fontFamily: "inherit", color: V.ink }}/>
                  </Panel>
                </div>

                {/* RIGHT products + summary */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ background: V.white, borderRadius: "12px", padding: "16px", border: `1px solid ${V.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                    <div style={{ fontSize: "11px", fontWeight: 800, color: V.ink, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "11px" }}>Add Products & Services</div>
                    <div className="add-grid">
                      {Object.entries(PRODUCTS).map(([key, p]) => (
                        <button key={key} onClick={() => addLine(key)}
                          style={{ background: p.color+"0d", border: `2px dashed ${p.color}44`, borderRadius: "10px", padding: "12px", cursor: "pointer", textAlign: "left", transition: "all 0.15s", fontFamily: "inherit" }}
                          onMouseEnter={e => { e.currentTarget.style.background = p.color+"1a"; e.currentTarget.style.borderColor = p.color; }}
                          onMouseLeave={e => { e.currentTarget.style.background = p.color+"0d"; e.currentTarget.style.borderColor = p.color+"44"; }}>
                          <div style={{ fontSize: "12.5px", fontWeight: 700, color: p.color }}>+ {p.label}</div>
                          <div style={{ fontSize: "10.5px", color: "#94A3B8", marginTop: "2px" }}>{p.tiers.length} tiers{p.addOns.length > 0 ? ` · ${p.addOns.length} add-ons` : ""}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {lines.length === 0 ? (
                    <div style={{ background: V.white, borderRadius: "12px", padding: "48px 24px", textAlign: "center", border: `2px dashed ${V.border}` }}>
                      <div style={{ fontSize: "36px", marginBottom: "8px" }}>🛒</div>
                      <div style={{ fontSize: "14px", fontWeight: 700, color: V.ink }}>No products added yet</div>
                      <div style={{ fontSize: "12px", color: "#94A3B8", marginTop: "3px" }}>Click above to add Asana, Smartsheet, or Professional Services</div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {lines.map((line, i) => (
                        <ProductLine key={i} line={line}
                          onUpdate={u => setLines(prev => prev.map((l, idx) => idx === i ? u : l))}
                          onRemove={() => setLines(prev => prev.filter((_, idx) => idx !== i))}
                          billingCycle={billingCycle} startDate={startDate} endDate={endDate}/>
                      ))}
                    </div>
                  )}

                  {lines.length > 0 && (
                    <div style={{ background: "linear-gradient(135deg,#0D1B3E,#1A2C55)", borderRadius: "12px", padding: "20px 22px", color: "#fff", boxShadow: "0 6px 20px rgba(13,27,62,0.3)" }}>
                      <div style={{ fontSize: "11px", fontWeight: 800, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: "12px" }}>Quote Summary</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {[
                          ["Annual List (USD)", `$${totals.annualList.toLocaleString("en-US",{minimumFractionDigits:2})}`, "#94A3B8"],
                          ["Discount (USD)",   `-$${totals.discTotal.toLocaleString("en-US",{minimumFractionDigits:2})}`, "#FCA5A5"],
                          ["Sub-Total (USD)",   `$${totals.subUSD.toLocaleString("en-US",{minimumFractionDigits:2})}`, "#E2E8F0"],
                          currency.code !== "USD" ? [`Sub-Total (${currency.code})`, fmtC(totals.subLocal, currency.symbol, currency.code), "#BAE6FD"] : null,
                          taxConfig.rate > 0 ? [taxConfig.label, fmtC(totals.taxLocal, currency.symbol, currency.code), "#FDE68A"] : null,
                        ].filter(Boolean).map(([l, v, c]) => (
                          <div key={l} style={{ display: "flex", justifyContent: "space-between", paddingBottom: "6px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                            <span style={{ fontSize: "12.5px", color: "rgba(255,255,255,0.5)" }}>{l}</span>
                            <span style={{ fontSize: "12.5px", fontWeight: 600, color: c }}>{v}</span>
                          </div>
                        ))}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "4px" }}>
                          <span style={{ fontSize: "13px", fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>Year 1 Total ({currency.code})</span>
                          <span style={{ fontSize: "clamp(18px,5vw,22px)", fontWeight: 900, color: "#fff" }}>{fmtC(totals.grand, currency.symbol, currency.code)}</span>
                        </div>
                        {contractYears > 1 && (
                          <div style={{ marginTop: "12px", borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: "12px" }}>
                            <div style={{ fontSize: "10px", fontWeight: 800, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: "8px" }}>Multi-Year Commitment</div>
                            {yearlyTotals.map(y => (
                              <div key={y.year} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                                <span style={{ fontSize: "12.5px", color: "rgba(255,255,255,0.55)" }}>Year {y.year}{yearEscalation > 0 && y.year > 1 ? ` (+${yearEscalation}%)` : ""}</span>
                                <span style={{ fontSize: "12.5px", fontWeight: 700, color: "#93C5FD" }}>{fmtC(y.grand, currency.symbol, currency.code)}</span>
                              </div>
                            ))}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "8px" }}>
                              <span style={{ fontSize: "12px", fontWeight: 700, color: "rgba(255,255,255,0.8)" }}>Total Contract Value</span>
                              <span style={{ fontSize: "17px", fontWeight: 900, color: "#A78BFA" }}>{fmtC(totalContractValue, currency.symbol, currency.code)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {showPreview && (
        <QuotePreview
          data={{ lines, customer, qd, currency, billingCycle, monthCount, startDate, endDate, taxConfig, paymentTerms, contractYears, yearEscalation, yearlyTotals, totalContractValue }}
          onClose={() => setShowPreview(false)}/>
      )}
    </div>
  );
}
