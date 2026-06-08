import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getDatabase, ref, get, set, update, onValue, off } from "firebase/database";
import { firebaseConfig } from "./firebaseConfig";

// ─── UID ───
let _id = 200;
function uid() { return ++_id; }

// ─── TABLES ───
const INIT_TABLES = [
  {id:1,label:"№1",cap:12,side:"oglan",x:6,y:8,r:24},
  {id:2,label:"№2",cap:12,side:"oglan",x:14,y:8,r:24},
  {id:3,label:"№3",cap:12,side:"oglan",x:22,y:8,r:24},
  {id:4,label:"№4",cap:12,side:"oglan",x:30,y:8,r:24},
  {id:5,label:"№5",cap:12,side:"oglan",x:38,y:8,r:24},
  {id:6,label:"№6",cap:12,side:"oglan",x:46.5,y:8,r:24},
  {id:7,label:"№7",cap:12,side:"oglan",x:55,y:8,r:24},
  {id:8,label:"№8",cap:12,side:"oglan",x:63,y:8,r:24},
  {id:9,label:"№9",cap:12,side:"oglan",x:71,y:8,r:24},
  {id:100,label:"MUSİ",cap:0,side:"special",x:79,y:8,r:24,special:"musi"},
  {id:10,label:"№10",cap:12,side:"oglan",x:8,y:24,r:24},
  {id:11,label:"№11",cap:12,side:"oglan",x:18,y:24,r:24},
  {id:12,label:"№12",cap:12,side:"oglan",x:28,y:24,r:24},
  {id:13,label:"№13",cap:18,side:"oglan",x:42.5,y:23,r:34},
  {id:14,label:"№14",cap:12,side:"oglan",x:57,y:24,r:24},
  {id:15,label:"№15",cap:12,side:"oglan",x:66,y:24,r:24},
  {id:16,label:"№16",cap:12,side:"oglan",x:75,y:24,r:24},
  {id:17,label:"№17",cap:12,side:"qiz",x:8,y:58,r:24},
  {id:18,label:"№18",cap:12,side:"qiz",x:18,y:58,r:24},
  {id:19,label:"№19",cap:12,side:"qiz",x:28,y:58,r:24},
  {id:20,label:"№20",cap:18,side:"qiz",x:42.5,y:57,r:34},
  {id:21,label:"№21",cap:12,side:"qiz",x:57,y:58,r:24},
  {id:22,label:"№22",cap:12,side:"qiz",x:66,y:58,r:24},
  {id:23,label:"№23",cap:12,side:"qiz",x:75,y:58,r:24},
  {id:24,label:"№24",cap:12,side:"qiz",x:8,y:77,r:24},
  {id:25,label:"№25",cap:12,side:"qiz",x:17,y:77,r:24},
  {id:26,label:"№26",cap:12,side:"qiz",x:26,y:77,r:24},
  {id:27,label:"№27",cap:12,side:"qiz",x:35,y:77,r:24},
  {id:28,label:"№28",cap:12,side:"qiz",x:47,y:77,r:24},
  {id:29,label:"№29",cap:12,side:"qiz",x:56,y:77,r:24},
  {id:30,label:"№30",cap:12,side:"qiz",x:65,y:77,r:24},
  {id:101,label:"REZ",cap:12,side:"special",x:75,y:77,r:24,special:"rez"},
];

// ─── CSV ───
function parseCSV(text) {
  var lines = text.trim().split("\n").filter(function(l){return l.trim();});
  if (lines.length < 2) return [];
  var result = [];
  for (var i = 1; i < lines.length; i++) {
    var p = lines[i].split(",").map(function(s){return s.trim();});
    if (p[0]) {
      var sd = (p[1]||"").toLowerCase();
      result.push({
        id: uid(),
        name: p[0],
        side: sd.indexOf("qız")>=0||sd.indexOf("qiz")>=0 ? "qiz" : "oglan",
        cat: p[2]||"Digər",
        tableId: null,
      });
    }
  }
  return result;
}

// ─── COLORS ───
var CC = {};
var HUES = [210,340,30,160,270,50,190,0,130,300,80,230];
function cCol(c) {
  if (!CC[c]) {
    var h = 0;
    for (var i = 0; i < c.length; i++) h = (h*31+c.charCodeAt(i))%HUES.length;
    CC[c] = "hsl("+HUES[h]+",55%,48%)";
  }
  return CC[c];
}

// ─── BADGE ───
function Badge(props) {
  return (
    <div style={{background:props.a+"12",border:"1px solid "+props.a+"28",borderRadius:12,padding:"12px 16px",textAlign:"center",minWidth:80,boxShadow:"0 1px 4px "+props.a+"10"}}>
      <div style={{fontSize:26,fontWeight:800,color:props.a,fontFamily:"'Playfair Display',serif",lineHeight:1}}>{props.v}</div>
      <div style={{fontSize:9.5,color:"#8a8a8a",marginTop:4,fontWeight:700,letterSpacing:0.6,textTransform:"uppercase"}}>{props.l}</div>
    </div>
  );
}

// ─── FIREBASE INIT ───
const FB_READY = !firebaseConfig.apiKey.startsWith("REPLACE_");
let fbDb = null;
if (FB_READY) {
  try {
    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    fbDb = getDatabase(app);
  } catch (e) { console.error("Firebase init:", e); }
}

// ─── HELPERS ───
function genCode() {
  var c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({length:6}, function(){return c[Math.floor(Math.random()*c.length)];}).join("");
}

var SESSION_ID = Math.random().toString(36).substr(2,9);
var LS_KEY = "wsp_v2";
var BK_KEY = "wsp_backup";

function lsGet() { try { return JSON.parse(localStorage.getItem(LS_KEY)||"{}"); } catch(e){ return {}; } }
function lsSet(d) { try { localStorage.setItem(LS_KEY, JSON.stringify(d)); } catch(e){} }
function bkSave(id, guests, tables, arrived) {
  try {
    var bk = JSON.parse(localStorage.getItem(BK_KEY)||"{}");
    bk[id] = { guests:guests, tables:tables, arrived:arrived, at:Date.now() };
    localStorage.setItem(BK_KEY, JSON.stringify(bk));
  } catch(e){}
}
function bkGet(id) {
  try { var bk = JSON.parse(localStorage.getItem(BK_KEY)||"{}"); return bk[id]||null; } catch(e){ return null; }
}

// ─── MAIN APP ───
export default function WeddingPlanner() {
  var hallRef = useRef(null);
  var writeTimer = useRef(null);
  var fromRemote = useRef(false);

  // ── Navigation state ──
  var ls0 = lsGet();
  var [mode, setMode] = useState(ls0.weddingId ? "app" : "home");
  var [weddingId, setWeddingId] = useState(ls0.weddingId || null);
  var [joinCode, setJoinCode] = useState("");
  var [joinError, setJoinError] = useState("");
  var [loading, setLoading] = useState(false);
  var [copied, setCopied] = useState(false);
  var [onlineCount, setOnlineCount] = useState(null);

  // ── Wedding data ──
  var [step, setStep] = useState(0);
  var [csv, setCsv] = useState("");
  var [csvError, setCsvError] = useState("");
  var [guests, setGuests] = useState([]);
  var [tables, setTables] = useState(INIT_TABLES);

  // ── UI state ──
  var [selTable, setSelTable] = useState(null);
  var [view, setView] = useState("hall");
  var [dragId, setDragId] = useState(null);
  var [dropT, setDropT] = useState(null);
  var [search, setSearch] = useState("");
  var [fSide, setFSide] = useState("all");
  var [fCat, setFCat] = useState("all");
  var [editing, setEditing] = useState(null);
  var [ef, setEf] = useState({name:"",side:"oglan",cat:""});
  var [showAdd, setShowAdd] = useState(false);
  var [nf, setNf] = useState({name:"",side:"oglan",cat:""});
  var [addMode, setAddMode] = useState(false);
  var [newTable, setNewTable] = useState({label:"",cap:12,side:"oglan",size:"normal"});
  var [editTableId, setEditTableId] = useState(null);
  var [etf, setEtf] = useState({label:"",cap:12,side:"oglan"});
  var [confirmDel, setConfirmDel] = useState(null);
  var [showResetConfirm, setShowResetConfirm] = useState(false);
  var [showResetAssignConfirm, setShowResetAssignConfirm] = useState(false);
  var [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  var [weddingInitialized, setWeddingInitialized] = useState(false);
  var [hallZoom, setHallZoom] = useState(1);
  var [layoutMode, setLayoutMode] = useState(false);
  var draggingTRef = useRef(null);
  var [arrived, setArrived] = useState({});
  var [liveSearch, setLiveSearch] = useState("");
  var [showLeftPanel, setShowLeftPanel] = useState(false);

  // ── Undo history ──
  var historyRef = useRef([]);
  var [canUndo, setCanUndo] = useState(false);
  var gSnap = useRef([]);
  var tSnap = useRef(INIT_TABLES);
  var aSnap = useRef({});
  useEffect(function(){ gSnap.current = guests; }, [guests]);
  useEffect(function(){ tSnap.current = tables; }, [tables]);
  useEffect(function(){ aSnap.current = arrived; }, [arrived]);

  function pushHistory() {
    historyRef.current = historyRef.current.slice(-29).concat([{
      guests: gSnap.current, tables: tSnap.current, arrived: aSnap.current
    }]);
    setCanUndo(true);
  }
  function undo() {
    var h = historyRef.current;
    if (!h.length) return;
    var snap = h[h.length-1];
    historyRef.current = h.slice(0,-1);
    setCanUndo(h.length > 1);
    setGuests(snap.guests);
    setTables(snap.tables);
    setArrived(snap.arrived || {});
  }
  useEffect(function() {
    function onKey(e) {
      if ((e.ctrlKey||e.metaKey) && e.key==="z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
    }
    window.addEventListener("keydown", onKey);
    return function(){ window.removeEventListener("keydown", onKey); };
  }, []);

  // ── Apply remote data (from Firebase or localStorage) ──
  function applyData(d) {
    if (!d) return;
    fromRemote.current = true;
    if (Array.isArray(d.guests)) {
      var ids = d.guests.map(function(g){return g.id;});
      if (ids.length) _id = Math.max.apply(null, [_id].concat(ids));
      // Firebase omits null values — normalize undefined tableId back to null
      var healed = d.guests.map(function(g){
        return Object.assign({},g,{tableId: g.tableId != null ? g.tableId : null});
      });
      setGuests(healed);
      // If guests exist, skip CSV screen and go straight to hall view
      var savedStep = d.step != null ? d.step : 0;
      setStep(healed.length > 0 ? Math.max(savedStep, 2) : savedStep);
    } else {
      if (d.step != null) setStep(d.step);
    }
    if (Array.isArray(d.tables)) {
      var tids = d.tables.map(function(t){return t.id;});
      if (tids.length) _id = Math.max.apply(null, [_id].concat(tids));
      setTables(d.tables);
    }
    if (d.arrived && typeof d.arrived === "object" && !Array.isArray(d.arrived)) {
      setArrived(d.arrived);
    }
  }

  // ── Load initial data when weddingId changes ──
  useEffect(function() {
    if (!weddingId || mode !== "app") return;
    setWeddingInitialized(false);
    if (fbDb) {
      get(ref(fbDb, "weddings/"+weddingId)).then(function(snap){
        applyData(snap.val());
        setWeddingInitialized(true);
      }).catch(function(e){ console.error(e); setWeddingInitialized(true); });
    } else {
      var ls = lsGet();
      applyData(ls.weddings && ls.weddings[weddingId]);
      setWeddingInitialized(true);
    }
  }, [weddingId]);

  // ── Firebase real-time subscription ──
  useEffect(function() {
    if (!fbDb || !weddingId || mode !== "app") return;
    var wRef = ref(fbDb, "weddings/"+weddingId);
    onValue(wRef, function(snap) {
      var d = snap.val();
      if (!d) return;
      // Skip echoes of our own recent writes
      if (d.writerId === SESSION_ID && Date.now() - (d.writeAt||0) < 2000) return;
      applyData(d);
    });

    // Online presence counter
    var presRef = ref(fbDb, "presence/"+weddingId+"/"+SESSION_ID);
    set(presRef, {t: Date.now()});
    var allPresRef = ref(fbDb, "presence/"+weddingId);
    onValue(allPresRef, function(snap) {
      var d = snap.val();
      if (!d) { setOnlineCount(1); return; }
      var now = Date.now();
      var active = Object.values(d).filter(function(v){ return now - (v.t||0) < 30000; });
      setOnlineCount(active.length);
    });

    var heartbeat = setInterval(function(){
      set(presRef, {t: Date.now()});
    }, 15000);

    return function() {
      off(wRef);
      off(allPresRef);
      clearInterval(heartbeat);
      set(presRef, null);
    };
  }, [weddingId, mode]);

  // ── Persist all changes ──
  useEffect(function() {
    if (!weddingId || mode !== "app" || !weddingInitialized) return;
    if (fromRemote.current) { fromRemote.current = false; return; }

    var data = { step:step, guests:guests, tables:tables, arrived:arrived };

    // Save local backup whenever there are assigned guests (protect good state)
    var assignedCount = guests.filter(function(g){return g.tableId!=null;}).length;
    if (assignedCount > 0) {
      bkSave(weddingId, guests, tables, arrived);
    }

    if (fbDb) {
      clearTimeout(writeTimer.current);
      writeTimer.current = setTimeout(function() {
        update(ref(fbDb, "weddings/"+weddingId), Object.assign({}, data, {
          writerId: SESSION_ID,
          writeAt: Date.now(),
        }));
      }, 300);
    } else {
      var ls = lsGet();
      ls.weddings = ls.weddings || {};
      ls.weddings[weddingId] = data;
      ls.weddingId = weddingId;
      lsSet(ls);
    }
  }, [step, guests, tables, arrived, weddingId, mode, weddingInitialized]);

  // ── Create new wedding ──
  async function handleCreate() {
    setLoading(true);
    var code = genCode();
    var data = { step:0, guests:[], tables:INIT_TABLES, createdAt:Date.now() };

    if (fbDb) {
      try { await set(ref(fbDb, "weddings/"+code), data); }
      catch(e) { console.error(e); }
    } else {
      var ls = lsGet();
      ls.weddings = ls.weddings || {};
      ls.weddings[code] = data;
      ls.weddingId = code;
      lsSet(ls);
    }

    var ls2 = lsGet();
    ls2.weddingId = code;
    lsSet(ls2);

    setWeddingId(code);
    setStep(0); setGuests([]); setTables(INIT_TABLES);
    setMode("app");
    setLoading(false);
  }

  // ── Join existing wedding ──
  async function handleJoin() {
    var code = joinCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code)) { setJoinError("Düzgün 6 simvollu kod daxil edin"); return; }
    if (!fbDb) { setJoinError("Qoşulmaq üçün Firebase konfiqurasiya edilməlidir"); return; }

    setLoading(true); setJoinError("");
    try {
      var snap = await get(ref(fbDb, "weddings/"+code));
      if (!snap.exists()) { setJoinError("Bu kod tapılmadı. Yoxlayın."); setLoading(false); return; }
      var d = snap.val();

      var ls = lsGet();
      ls.weddingId = code;
      lsSet(ls);

      setWeddingId(code);
      applyData(d);
      setMode("app");
    } catch(e) { setJoinError("Xəta: "+e.message); }
    setLoading(false);
  }

  // ── Leave / reset ──
  function handleLeave() {
    var ls = lsGet();
    delete ls.weddingId;
    lsSet(ls);
    clearTimeout(writeTimer.current);
    setWeddingId(null);
    setMode("home");
    setStep(0); setGuests([]); setTables(INIT_TABLES);
    setJoinCode(""); setJoinError("");
    setSelTable(null); setAddMode(false);
  }

  // ── Copy code ──
  function handleCopy() {
    if (!weddingId) return;
    navigator.clipboard.writeText(weddingId).then(function(){
      setCopied(true);
      setTimeout(function(){setCopied(false);}, 2000);
    }).catch(function(){
      // fallback
      var el = document.createElement("input");
      el.value = weddingId;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(function(){setCopied(false);}, 2000);
    });
  }

  // ── Existing logic ──
  var cats = useMemo(function() {
    var s = new Set(guests.map(function(g){return g.cat;}));
    return Array.from(s).sort();
  }, [guests]);

  var dupCount = useMemo(function() {
    var seen = new Set(); var n = 0;
    guests.forEach(function(g){var k=g.name.trim().toLowerCase();if(seen.has(k))n++;else seen.add(k);});
    return n;
  }, [guests]);

  function removeDuplicates() {
    pushHistory();
    setGuests(function(prev){
      var seen = new Set();
      return prev.filter(function(g){var k=g.name.trim().toLowerCase();if(seen.has(k))return false;seen.add(k);return true;});
    });
  }

  var stats = useMemo(function() {
    var asg = guests.filter(function(g){return g.tableId!=null;});
    return {
      total: guests.length,
      assigned: asg.length,
      unassigned: guests.length-asg.length,
      cap: tables.reduce(function(s,t){return s+t.cap;},0),
    };
  }, [guests, tables]);

  var autoAssign = useCallback(function() {
    pushHistory();
    setGuests(function(prev) {
      var next = prev.map(function(g){return Object.assign({},g,{tableId:null});});
      function doSide(side) {
        var sg = next.filter(function(g){return g.side===side;});
        var st = tables.filter(function(t){return t.side===side&&t.cap>0;});
        var byCat = {};
        sg.forEach(function(g){if(!byCat[g.cat])byCat[g.cat]=[];byCat[g.cat].push(g);});
        var groups = Object.entries(byCat).sort(function(a,b){return b[1].length-a[1].length;});
        var used = {};
        st.forEach(function(t){used[t.id]=0;});
        groups.forEach(function(entry){
          var members=entry[1], seated=0;
          while(seated<members.length){
            var remaining=members.length-seated, bestT=null, bestScore=-1;
            st.forEach(function(t){
              var rem=t.cap-used[t.id];
              if(rem<=0)return;
              var can=Math.min(rem,remaining);
              var score=can===remaining?rem+1000:can;
              if(score>bestScore){bestT=t;bestScore=score;}
            });
            if(!bestT)break;
            var can=Math.min(bestT.cap-used[bestT.id],remaining);
            for(var i=0;i<can;i++){members[seated+i].tableId=bestT.id;used[bestT.id]++;}
            seated+=can;
          }
        });
      }
      doSide("oglan"); doSide("qiz");
      return next;
    });
  }, [tables]);

  var handleDrop = useCallback(function(tid) {
    if (!dragId) return;
    var t = tables.find(function(t){return t.id===tid;});
    if (!t||t.cap===0) return;
    setGuests(function(prev){
      if(prev.filter(function(g){return g.tableId===tid;}).length>=t.cap)return prev;
      return prev.map(function(g){return g.id===dragId?Object.assign({},g,{tableId:tid}):g;});
    });
    setDragId(null); setDropT(null);
  }, [dragId, tables]);

  var handleHallClick = useCallback(function(e) {
    if (!addMode||!hallRef.current) return;
    var rect = hallRef.current.getBoundingClientRect();
    var xPct = ((e.clientX-rect.left)/rect.width)*100;
    var yPct = ((e.clientY-rect.top)/rect.height)*100;
    var nid = uid();
    var nums = tables.map(function(t){var m=t.label.match(/№(\d+)/);return m?parseInt(m[1]):0;});
    var maxN = Math.max.apply(null,[0].concat(nums));
    var lbl = newTable.label||("№"+(maxN+1));
    var r = newTable.size==="big"?34:24;
    setTables(function(prev){
      return prev.concat([{id:nid,label:lbl,cap:newTable.cap,side:newTable.side,
        x:Math.max(3,Math.min(85,xPct)),y:Math.max(5,Math.min(90,yPct)),r:r,special:null}]);
    });
    setNewTable({label:"",cap:12,side:"oglan",size:"normal"});
    setAddMode(false);
  }, [addMode, newTable, tables]);

  function startDragTable(e, tid) {
    if (!layoutMode || addMode) return;
    e.stopPropagation(); e.preventDefault();
    var t = tables.find(function(x){return x.id===tid;});
    if (!t || !hallRef.current) return;
    var rect = hallRef.current.getBoundingClientRect();
    draggingTRef.current = {id:tid,sx:e.clientX,sy:e.clientY,tx:t.x,ty:t.y,rw:rect.width,rh:rect.height};
    function onMove(ev) {
      var dt = draggingTRef.current; if (!dt) return;
      var dx=(ev.clientX-dt.sx)/dt.rw*100, dy=(ev.clientY-dt.sy)/dt.rh*100;
      setTables(function(prev){return prev.map(function(t2){
        return t2.id===dt.id?Object.assign({},t2,{x:Math.max(2,Math.min(92,dt.tx+dx)),y:Math.max(2,Math.min(94,dt.ty+dy))}):t2;
      });});
    }
    function onUp(){draggingTRef.current=null;document.removeEventListener("mousemove",onMove);document.removeEventListener("mouseup",onUp);}
    document.addEventListener("mousemove",onMove); document.addEventListener("mouseup",onUp);
  }

  var deleteTable = useCallback(function(tid) {
    pushHistory();
    setGuests(function(prev){return prev.map(function(g){return g.tableId===tid?Object.assign({},g,{tableId:null}):g;});});
    setTables(function(prev){return prev.filter(function(t){return t.id!==tid;});});
    setSelTable(null); setConfirmDel(null);
  }, []);

  var selTD = tables.find(function(t){return t.id===selTable;});
  var selG = guests.filter(function(g){return g.tableId===selTable;});
  var filtUn = guests.filter(function(g){
    if(g.tableId!=null)return false;
    if(fSide!=="all"&&g.side!==fSide)return false;
    if(fCat!=="all"&&g.cat!==fCat)return false;
    if(search&&g.name.toLowerCase().indexOf(search.toLowerCase())<0)return false;
    return true;
  });

  var s = function(bg,c,ex){
    return Object.assign({padding:"10px 18px",background:bg,color:c,border:"none",borderRadius:8,
      fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"system-ui",letterSpacing:0.5},ex||{});
  };

  // ════════════════════════════════════════
  // HOME SCREEN
  // ════════════════════════════════════════
  if (mode === "home") return (
    <div style={{fontFamily:"system-ui,sans-serif",minHeight:"100vh",background:"linear-gradient(160deg,#0d0d0d 0%,#1a1510 100%)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{width:"100%",maxWidth:440}}>
        {/* Header */}
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:8,marginBottom:16}}>
            <div style={{width:32,height:1,background:"#b8860b"}} />
            <div style={{fontSize:10,letterSpacing:5,color:"#b8860b",fontWeight:700}}>MAKET GALLERY HALL · BAKI</div>
            <div style={{width:32,height:1,background:"#b8860b"}} />
          </div>
          <h1 style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:36,fontWeight:400,color:"#fff",margin:"0 0 6px",letterSpacing:-0.5}}>Oturma Planı</h1>
          <p style={{fontSize:12,color:"#6a6560",letterSpacing:0.5}}>Toy salonu oturma idarəetməsi</p>
        </div>

        {/* Firebase status banner */}
        {!FB_READY && (
          <div style={{background:"rgba(255,248,225,.08)",border:"1px solid rgba(255,224,130,.2)",borderRadius:12,padding:"12px 16px",marginBottom:20}}>
            <div style={{fontSize:12,fontWeight:700,color:"#f6ad55",marginBottom:4}}>⚠ Offline rejim</div>
            <div style={{fontSize:11,color:"#8a8070",lineHeight:1.6}}>
              Real-vaxt sinxronizasiya üçün Firebase konfiqurasiya edin.<br/>
              İndi yalnız bu cihazda saxlanır.
            </div>
          </div>
        )}

        {/* Create card */}
        <div style={{background:"rgba(255,255,255,.04)",borderRadius:16,border:"1px solid rgba(255,255,255,.08)",padding:28,marginBottom:12,backdropFilter:"blur(8px)"}}>
          <div style={{fontSize:11,color:"#6a6560",letterSpacing:0.5,marginBottom:14,textTransform:"uppercase"}}>Yeni toy planı yarat</div>
          <button
            onClick={handleCreate}
            disabled={loading}
            style={{width:"100%",padding:"16px 0",background:"#b8860b",color:"#fff",border:"none",borderRadius:12,
              fontSize:14,fontWeight:700,cursor:"pointer",letterSpacing:1.5,
              opacity:loading?0.6:1,boxShadow:"0 4px 20px rgba(184,134,11,.3)"}}
          >
            {loading ? "Yaradılır..." : "Yeni Toy Yarat →"}
          </button>
        </div>

        {/* Divider */}
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12,fontSize:11,color:"#3a3530"}}>
          <div style={{flex:1,height:1,background:"rgba(255,255,255,.06)"}} />
          <span>ya da</span>
          <div style={{flex:1,height:1,background:"rgba(255,255,255,.06)"}} />
        </div>

        {/* Join card */}
        <div style={{background:"rgba(255,255,255,.04)",borderRadius:16,border:"1px solid rgba(255,255,255,.08)",padding:28,backdropFilter:"blur(8px)"}}>
          <div style={{fontSize:11,color:"#6a6560",letterSpacing:0.5,marginBottom:14,textTransform:"uppercase"}}>Mövcud toya qoşul</div>
          <div style={{display:"flex",gap:8}}>
            <input
              value={joinCode}
              onChange={function(e){setJoinCode(e.target.value.toUpperCase());setJoinError("");}}
              onKeyDown={function(e){if(e.key==="Enter")handleJoin();}}
              placeholder="TOY KODU"
              maxLength={6}
              style={{flex:1,padding:"14px",background:"rgba(255,255,255,.07)",border:"1.5px solid "+(joinError?"#e53e3e":"rgba(255,255,255,.12)"),borderRadius:12,
                fontSize:20,fontWeight:800,letterSpacing:8,textAlign:"center",outline:"none",
                textTransform:"uppercase",color:"#fff"}}
            />
            <button
              onClick={handleJoin}
              disabled={loading||!joinCode.trim()}
              style={{padding:"14px 20px",background:"#2a6f97",color:"#fff",border:"none",borderRadius:12,
                fontSize:13,fontWeight:700,cursor:"pointer",opacity:(loading||!joinCode.trim())?0.4:1,
                boxShadow:"0 4px 16px rgba(42,111,151,.3)"}}
            >
              {loading ? "..." : "Qoşul →"}
            </button>
          </div>
          {joinError && (
            <div style={{color:"#fc8181",fontSize:12,marginTop:12,padding:"10px 14px",background:"rgba(229,62,62,.12)",
              borderRadius:8,border:"1px solid rgba(229,62,62,.2)"}}>⚠ {joinError}</div>
          )}
          {!FB_READY && (
            <div style={{color:"#4a4540",fontSize:11,marginTop:10}}>
              Qoşulmaq üçün Firebase tələb olunur
            </div>
          )}
        </div>

        <div style={{textAlign:"center",marginTop:24,fontSize:10,color:"#3a3530",letterSpacing:0.5}}>
          Maket Gallery Hall · Bakı
        </div>
      </div>
    </div>
  );

  // ════════════════════════════════════════
  // STEP 0 — CSV Input
  // ════════════════════════════════════════
  if (step === 0) return (
    <div style={{fontFamily:"system-ui,sans-serif",maxWidth:640,margin:"0 auto",padding:"20px 16px"}}>
      {/* Wedding code bar */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
        background:"#141414",borderRadius:12,padding:"10px 16px",marginBottom:24,boxShadow:"0 2px 12px rgba(0,0,0,.15)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:9,color:"#555",letterSpacing:1.5,textTransform:"uppercase"}}>Toy Kodu</span>
          <span style={{fontFamily:"monospace",fontSize:17,fontWeight:800,color:"#b8860b",letterSpacing:4}}>{weddingId}</span>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          {fbDb && onlineCount && <span style={{fontSize:10,color:"#48bb78",display:"flex",alignItems:"center",gap:3}}><span style={{width:5,height:5,borderRadius:"50%",background:"#48bb78",display:"inline-block"}} />{onlineCount} onlayn</span>}
          <button onClick={handleCopy} style={{background:copied?"#48bb78":"rgba(255,255,255,.06)",color:copied?"#fff":"#888",border:"none",borderRadius:8,padding:"5px 12px",fontSize:10.5,cursor:"pointer",fontWeight:600}}>
            {copied?"✓ Kopyalandı":"📋 Kopyala"}
          </button>
          <button onClick={handleLeave} style={{background:"rgba(255,255,255,.04)",color:"#555",border:"none",borderRadius:8,padding:"5px 10px",fontSize:10.5,cursor:"pointer"}}>✕ Çıx</button>
        </div>
      </div>

      <div style={{textAlign:"center",marginBottom:28}}>
        <div style={{fontSize:10,letterSpacing:4,color:"#b8860b",fontWeight:700,marginBottom:10}}>MAKET GALLERY HALL · BAKI</div>
        <h1 style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:28,fontWeight:400,color:"#1a1a1a"}}>Oturma Planı</h1>
        <div style={{width:40,height:2,background:"#b8860b",margin:"12px auto",borderRadius:1}} />
        <p style={{color:"#999",fontSize:13}}>Qonaq siyahınızı CSV formatında daxil edin</p>
      </div>

      <div style={{background:"#fff",border:"1px solid #e8e4db",borderRadius:14,padding:24,boxShadow:"0 2px 12px rgba(0,0,0,.04)"}}>
        <div style={{fontSize:11,color:"#aaa",marginBottom:10,padding:"8px 12px",background:"#fafaf7",borderRadius:8,border:"1px solid #f0ede5"}}>
          Format: <b style={{color:"#666"}}>Ad Soyad, Tərəf (oğlan/qız), Kateqoriya</b>
        </div>
        <textarea
          value={csv}
          onChange={function(e){setCsv(e.target.value);setCsvError("");}}
          rows={13}
          placeholder={"Ad Soyad, Tərəf, Kateqoriya\nƏli Həsənov, oğlan, Ailə\nLeyla Həsənova, qız, Ailə\n..."}
          style={{width:"100%",border:"1.5px solid #e8e4db",borderRadius:10,padding:14,fontSize:12.5,
            fontFamily:"monospace",resize:"vertical",background:"#fafaf7",boxSizing:"border-box",lineHeight:1.6}}
        />
        {csvError && (
          <div style={{color:"#e53e3e",fontSize:12,marginTop:10,padding:"10px 14px",background:"#fff5f5",
            borderRadius:8,border:"1px solid #fdd"}}>⚠ {csvError}</div>
        )}
        <button
          onClick={function(){
            var trimmed=csv.trim();
            if(!trimmed){setCsvError("Siyahı boşdur.");return;}
            var p=parseCSV(trimmed);
            if(!p.length){setCsvError("Format düzgün deyil. Nümunəyə baxın.");return;}
            setGuests(function(prev){return prev.concat(p);}); setStep(1); setCsvError("");
          }}
          style={{width:"100%",marginTop:14,padding:"14px 0",background:"#1a1a1a",color:"#fff",border:"none",borderRadius:10,fontSize:13,fontWeight:700,cursor:"pointer",letterSpacing:1.5}}
        >
          SİYAHINI YÜKLƏ →
        </button>
        {guests.length > 0 && (
          <button
            onClick={function(){setStep(guests.some(function(g){return g.tableId!==null;})?2:1);}}
            style={{width:"100%",marginTop:8,padding:"12px 0",background:"#f5f3ee",color:"#555",border:"1px solid #e8e4db",borderRadius:10,fontSize:13,fontWeight:600,cursor:"pointer"}}
          >
            Əvvəlki plana davam et ({guests.length} qonaq) →
          </button>
        )}
      </div>
    </div>
  );

  // ════════════════════════════════════════
  // STEP 1 — Guest list
  // ════════════════════════════════════════
  if (step === 1) return (
    <div style={{fontFamily:"system-ui,sans-serif",maxWidth:700,margin:"0 auto",padding:"20px 16px"}}>
      {/* Code bar */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
        background:"#141414",borderRadius:12,padding:"10px 16px",marginBottom:24,boxShadow:"0 2px 12px rgba(0,0,0,.15)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:9,color:"#555",letterSpacing:1.5,textTransform:"uppercase"}}>Toy Kodu</span>
          <span style={{fontFamily:"monospace",fontSize:16,fontWeight:800,color:"#b8860b",letterSpacing:4}}>{weddingId}</span>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          {fbDb && onlineCount && <span style={{fontSize:10,color:"#48bb78",display:"flex",alignItems:"center",gap:3}}><span style={{width:5,height:5,borderRadius:"50%",background:"#48bb78",display:"inline-block"}} />{onlineCount}</span>}
          <button onClick={handleCopy} style={{background:copied?"#48bb78":"rgba(255,255,255,.06)",color:copied?"#fff":"#888",border:"none",borderRadius:8,padding:"5px 10px",fontSize:11,cursor:"pointer",fontWeight:600}}>
            {copied?"✓":"📋"}
          </button>
        </div>
      </div>

      <div style={{textAlign:"center",marginBottom:24}}>
        <h1 style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:26,fontWeight:400,color:"#1a1a1a"}}>Siyahını Təsdiqləyin</h1>
        <div style={{width:40,height:2,background:"#b8860b",margin:"10px auto 8px",borderRadius:1}} />
        <p style={{color:"#999",fontSize:12}}>{guests.length} qonaq · düzəliş edin, sonra təsdiqləyin</p>
      </div>

      <div style={{display:"flex",gap:10,marginBottom:16,justifyContent:"center",flexWrap:"wrap"}}>
        <Badge l="Oğlan" v={guests.filter(function(g){return g.side==="oglan";}).length} a="#2a6f97" />
        <Badge l="Qız" v={guests.filter(function(g){return g.side==="qiz";}).length} a="#c2528b" />
        <Badge l="Cəmi" v={guests.length} a="#b8860b" />
      </div>

      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16,justifyContent:"center"}}>
        {cats.map(function(c){var n=guests.filter(function(g){return g.cat===c;}).length;
          return <span key={c} style={{fontSize:11,padding:"5px 12px",borderRadius:999,background:cCol(c)+"15",color:cCol(c),fontWeight:700,border:"1px solid "+cCol(c)+"25"}}>{c} · {n}</span>;})}
      </div>

      {showAdd && (
        <div style={{background:"#f5faf5",border:"1px solid #c8e6c8",borderRadius:10,padding:14,marginBottom:10,display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
          <input placeholder="Ad Soyad" value={nf.name} onChange={function(e){setNf(Object.assign({},nf,{name:e.target.value}));}}
            style={{flex:2,padding:"7px 10px",border:"1px solid #ddd",borderRadius:6,fontSize:12,outline:"none",minWidth:110}} />
          <select value={nf.side} onChange={function(e){setNf(Object.assign({},nf,{side:e.target.value}));}}>
            <option value="oglan">Oğlan</option><option value="qiz">Qız</option>
          </select>
          <input placeholder="Kateqoriya" value={nf.cat} onChange={function(e){setNf(Object.assign({},nf,{cat:e.target.value}));}}
            style={{flex:1,padding:"7px 10px",border:"1px solid #ddd",borderRadius:6,fontSize:12,outline:"none",minWidth:80}} />
          <button onClick={function(){if(!nf.name.trim())return;setGuests(function(p){return p.concat([{id:uid(),name:nf.name,side:nf.side,cat:nf.cat||"Digər",tableId:null}]);});setNf({name:"",side:"oglan",cat:""});setShowAdd(false);}}
            style={s("#2a6f97","#fff",{padding:"7px 14px"})}>+</button>
          <button onClick={function(){setShowAdd(false);}} style={s("#eee","#666",{padding:"7px 10px"})}>✕</button>
        </div>
      )}

      <div style={{background:"#fff",border:"1px solid #e8e4da",borderRadius:12,overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,.04)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",borderBottom:"1px solid #f0ede5",background:"#fafaf7"}}>
          <span style={{fontSize:11,fontWeight:700,color:"#aaa",letterSpacing:0.8}}>QONAQ SİYAHISI</span>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            {dupCount>0&&<button onClick={removeDuplicates} style={{fontSize:10.5,background:"#fff5f5",border:"1px solid #fcc",borderRadius:999,padding:"5px 12px",cursor:"pointer",color:"#e53e3e",fontWeight:700}}>✕ {dupCount} dublikat</button>}
            <button onClick={function(){setShowAdd(true);}} style={{fontSize:11,background:"#f0f7ff",border:"1px solid #d0e3f0",borderRadius:999,padding:"5px 12px",cursor:"pointer",color:"#2a6f97",fontWeight:600}}>+ Əlavə et</button>
          </div>
        </div>
        <div style={{maxHeight:400,overflowY:"auto"}}>
          {guests.map(function(g,i){
            return (
              <div key={g.id} style={{display:"flex",alignItems:"center",padding:"10px 16px",borderBottom:"1px solid #f5f5f3",gap:8,background:i%2?"#fafaf8":"#fff"}}>
                {editing===g.id ? (
                  <>
                    <input value={ef.name} onChange={function(e){setEf(Object.assign({},ef,{name:e.target.value}));}}
                      style={{flex:2,padding:"6px 10px",border:"1.5px solid #e0e0e0",borderRadius:7,fontSize:12}} />
                    <select value={ef.side} onChange={function(e){setEf(Object.assign({},ef,{side:e.target.value}));}}
                      style={{padding:"6px 8px",border:"1.5px solid #e0e0e0",borderRadius:7,fontSize:12}}>
                      <option value="oglan">Oğlan</option><option value="qiz">Qız</option>
                    </select>
                    <input value={ef.cat} onChange={function(e){setEf(Object.assign({},ef,{cat:e.target.value}));}}
                      style={{flex:1,padding:"6px 10px",border:"1.5px solid #e0e0e0",borderRadius:7,fontSize:12}} />
                    <button onClick={function(){setGuests(function(p){return p.map(function(x){return x.id===editing?Object.assign({},x,ef):x;});});setEditing(null);}}
                      style={{background:"#2a6f97",color:"#fff",border:"none",borderRadius:7,padding:"6px 12px",cursor:"pointer",fontSize:12,fontWeight:700}}>✓</button>
                    <button onClick={function(){setEditing(null);}} style={{background:"#f0f0f0",border:"none",borderRadius:7,padding:"6px 10px",cursor:"pointer",fontSize:12}}>✕</button>
                  </>
                ) : (
                  <>
                    <div style={{width:8,height:8,borderRadius:"50%",background:g.side==="oglan"?"#2a6f97":"#c2528b",flexShrink:0}} />
                    <div style={{flex:2,fontSize:13,fontWeight:500}}>{g.name}</div>
                    <span style={{fontSize:10,padding:"3px 9px",borderRadius:999,background:cCol(g.cat)+"15",color:cCol(g.cat),fontWeight:700,border:"1px solid "+cCol(g.cat)+"20"}}>{g.cat}</span>
                    <div style={{width:48,fontSize:10,color:"#bbb",textAlign:"right"}}>{g.side==="oglan"?"Oğlan":"Qız"}</div>
                    <button onClick={function(){setEditing(g.id);setEf({name:g.name,side:g.side,cat:g.cat});}}
                      style={{background:"none",border:"1px solid #e8e8e8",borderRadius:6,cursor:"pointer",fontSize:12,padding:"3px 8px",color:"#999"}}>✎</button>
                    <button onClick={function(){setGuests(function(p){return p.filter(function(x){return x.id!==g.id;});});}}
                      style={{background:"none",border:"1px solid #fdd",borderRadius:6,cursor:"pointer",fontSize:12,padding:"3px 8px",color:"#e53e3e"}}>✕</button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{display:"flex",gap:10,marginTop:16}}>
        <button onClick={function(){setStep(0);}} style={{flex:1,padding:"13px",background:"#fff",color:"#555",border:"1.5px solid #e8e4da",borderRadius:10,fontSize:13,fontWeight:600,cursor:"pointer"}}>← Geri</button>
        <button onClick={function(){setStep(2);}} style={{flex:2,padding:"13px",background:"#1a1a1a",color:"#fff",border:"none",borderRadius:10,fontSize:13,fontWeight:700,cursor:"pointer",letterSpacing:1}}>TƏSDİQLƏ →</button>
      </div>
    </div>
  );

  // ════════════════════════════════════════
  // STEP 2 — Hall view
  // ════════════════════════════════════════
  function renderT(t) {
    var asg = guests.filter(function(g){return g.tableId!=null && g.tableId===t.id;});
    var pct = t.cap>0?asg.length/t.cap:0;
    var full = asg.length>=t.cap&&t.cap>0;
    var empty = asg.length===0;
    var sel = selTable===t.id;
    var hov = dropT===t.id;
    var catCnts = {};
    asg.forEach(function(g){catCnts[g.cat]=(catCnts[g.cat]||0)+1;});
    var entries = Object.entries(catCnts).sort(function(a,b){return b[1]-a[1];});
    var dom = entries.length>0?entries[0]:null;

    var bg,border;
    if(t.special==="musi"){bg="#f4a261";border="#e07530";}
    else if(t.special==="rez"){bg="#f0c040";border="#d4a520";}
    else if(full){bg="#d0d0d0";border="#b0b0b0";}
    else if(dom&&!empty){bg=cCol(dom[0])+"20";border=cCol(dom[0]);}
    else if(t.side==="oglan"){bg=empty?"#f0efec":"#dce9f0";border=empty?"#d5d4d0":"#8bb8c9";}
    else if(t.side==="qiz"){bg=empty?"#f2eff5":"#e5ddf0";border=empty?"#d5d0da":"#a888c0";}
    else{bg="#f0efec";border="#d5d4d0";}

    var shadow="0 2px 6px rgba(0,0,0,.06)";
    if(sel)shadow="0 0 0 3px #2a6f97, 0 4px 16px rgba(42,111,151,.25)";
    else if(hov)shadow="0 0 0 3px #48bb78, 0 4px 16px rgba(72,187,120,.25)";

    return (
      <div key={t.id}
        onMouseDown={function(e){if(layoutMode){startDragTable(e,t.id);}}}
        onClick={function(e){e.stopPropagation();if(!addMode&&!layoutMode)setSelTable(t.id);}}
        onDragOver={function(e){if(!layoutMode){e.preventDefault();setDropT(t.id);}}}
        onDragLeave={function(){setDropT(null);}}
        onDrop={function(e){if(!layoutMode){e.preventDefault();handleDrop(t.id);}}}
        style={{position:"absolute",left:t.x+"%",top:t.y+"%",
          width:t.r*2,height:t.r*2,marginLeft:-t.r,marginTop:-t.r,
          borderRadius:"50%",background:bg,border:"2.5px solid "+border,
          boxShadow:layoutMode?"0 0 0 2px #f6ad55,0 2px 8px rgba(0,0,0,.15)":shadow,
          display:"flex",flexDirection:"column",
          alignItems:"center",justifyContent:"center",
          cursor:layoutMode?"move":addMode?"default":"pointer",
          transition:"box-shadow .15s",zIndex:sel?5:1,userSelect:"none",overflow:"visible"}}>
        <div style={{fontSize:t.r>28?13:10.5,fontWeight:800,color:"#333",lineHeight:1}}>{t.label}</div>
        {t.cap>0&&<div style={{fontSize:t.r>28?10:8.5,color:full?"#d33":"#666",marginTop:2,fontWeight:700}}>{asg.length}/{t.cap}</div>}
        {pct>0&&pct<1&&(
          <div style={{position:"absolute",bottom:3,width:"55%",height:3,borderRadius:2,background:"#e0e0e0",overflow:"hidden"}}>
            <div style={{width:(pct*100)+"%",height:"100%",background:border,borderRadius:2}} />
          </div>
        )}
        {asg.map(function(g,i){
          var angle = (i/asg.length)*2*Math.PI - Math.PI/2;
          var dist = t.r+20;
          var cx = Math.cos(angle)*dist;
          var cy = Math.sin(angle)*dist;
          var nm = g.name.split(" ")[0];
          if(nm.length>8) nm=nm.substr(0,7)+"…";
          var isOg = g.side==="oglan";
          return (
            <div key={g.id} style={{
              position:"absolute",left:"50%",top:"50%",
              transform:"translate(calc(-50% + "+cx+"px), calc(-50% + "+cy+"px))",
              fontSize:8,fontWeight:700,lineHeight:1.3,
              background:isOg?"rgba(30,90,150,0.88)":"rgba(150,40,100,0.88)",
              color:"#fff",padding:"1.5px 5px",borderRadius:4,
              whiteSpace:"nowrap",pointerEvents:"none",
              boxShadow:"0 1px 3px rgba(0,0,0,.25)",zIndex:10,
            }}>{nm}</div>
          );
        })}
      </div>
    );
  }

  var activeCats=[];
  var seen={};
  guests.forEach(function(g){if(g.tableId!==null&&!seen[g.cat]){seen[g.cat]=true;activeCats.push(g.cat);}});

  var selCatBreak={};
  selG.forEach(function(g){selCatBreak[g.cat]=(selCatBreak[g.cat]||0)+1;});

  function printHall(){
    var tRows="";
    tables.filter(function(t){return t.cap>0;}).forEach(function(t){
      var tg=guests.filter(function(g){return g.tableId===t.id;});
      var sc=t.side==="oglan"?"#2a6f97":t.side==="qiz"?"#c2528b":"#b8860b";
      tRows+='<div style="position:absolute;left:'+t.x+'%;top:'+t.y+'%;transform:translate(-50%,-50%);'
        +'width:54px;height:54px;border-radius:50%;background:#fff;border:2.5px solid '+sc+';'
        +'display:flex;flex-direction:column;align-items:center;justify-content:center;'
        +'box-shadow:0 1px 4px rgba(0,0,0,.10)">'
        +'<div style="font-size:9px;font-weight:800;color:'+sc+';font-family:Georgia,serif;line-height:1.2;text-align:center;padding:0 3px;word-break:break-word">'+t.label+'</div>'
        +'<div style="font-size:7px;color:#aaa;font-weight:600;margin-top:1px">'+tg.length+'/'+t.cap+'</div>'
        +'</div>';
    });
    var html='<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Oturma Planı — Maket Gallery Hall</title>'
      +'<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:system-ui,sans-serif;background:#fff;padding:14px}'
      +'.hall{position:relative;width:100%;aspect-ratio:1.5/1;border:1px solid #ccc;border-radius:12px;background:#f7f5f1;overflow:hidden}'
      +'@page{size:A4 landscape;margin:8mm}'
      +'@media print{body{padding:6px}}'
      +'</style></head><body>'
      +'<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px">'
      +'<h1 style="font-family:Georgia,serif;font-size:17px;color:#1a1a1a">Maket Gallery Hall — Oturma Planı</h1>'
      +'<span style="font-size:10px;color:#888">'+new Date().toLocaleDateString("az-AZ",{day:"2-digit",month:"long",year:"numeric"})+'</span>'
      +'</div>'
      +'<div class="hall">'
      +'<div style="position:absolute;left:3%;right:5%;top:2%;height:39%;background:rgba(42,111,151,0.05);border-radius:8px"></div>'
      +'<div style="position:absolute;left:3%;right:5%;top:44%;height:54%;background:rgba(194,82,139,0.05);border-radius:8px"></div>'
      +'<div style="position:absolute;top:6px;left:50%;transform:translateX(-50%);font-size:7.5px;letter-spacing:2.5px;color:#b8860b;font-weight:800;white-space:nowrap">MAKET GALLERY HALL</div>'
      +'<div style="position:absolute;left:8px;top:3%;font-size:6.5px;font-weight:800;color:#2a6f97;letter-spacing:0.8px">● OĞLAN EVİ</div>'
      +'<div style="position:absolute;left:8px;top:45%;font-size:6.5px;font-weight:800;color:#c2528b;letter-spacing:0.8px">● QIZ EVİ</div>'
      +'<div style="position:absolute;left:0;top:38%;height:7%;width:5.5%;background:linear-gradient(135deg,#d4eaf7,#b8d8ea);border-radius:0 8px 8px 0;display:flex;align-items:center;justify-content:center">'
      +'<span style="writing-mode:vertical-rl;transform:rotate(180deg);font-size:5.5px;font-weight:800;color:#4a7f98;letter-spacing:1.5px">GƏLİN BAY</span></div>'
      +'<div style="position:absolute;left:0;top:52%;height:10%;width:5%;background:linear-gradient(135deg,#3aad6a,#2a8a50);border-radius:0 8px 8px 0;display:flex;align-items:center;justify-content:center">'
      +'<span style="writing-mode:vertical-rl;transform:rotate(180deg);font-size:5.5px;font-weight:800;color:#fff;letter-spacing:1.5px">GİRİŞ ▲</span></div>'
      +'<div style="position:absolute;left:6%;right:5%;top:43%;height:1px;background:linear-gradient(90deg,transparent,#c8c4bc 15%,#c8c4bc 85%,transparent)"></div>'
      +'<div style="position:absolute;right:0;top:22%;height:50%;width:18px;background:linear-gradient(180deg,#2a6f97,#1a4f77);border-radius:6px 0 0 6px;display:flex;align-items:center;justify-content:center">'
      +'<span style="writing-mode:vertical-rl;color:#fff;font-size:6px;font-weight:800;letter-spacing:3px">SƏHNƏ</span></div>'
      +tRows
      +'</div>'
      +'</body></html>';
    var w=window.open("","_blank");
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(function(){w.print();},500);
  }


  function printTables(){
    var rows="";
    tables.filter(function(t){return t.cap>0;}).forEach(function(t){
      var tg=guests.filter(function(g){return g.tableId===t.id;});
      var sc=t.side==="oglan"?"#2a6f97":t.side==="qiz"?"#c2528b":"#b8860b";
      var sl=t.side==="oglan"?"Oğlan":t.side==="qiz"?"Qız":"Xüsusi";
      var gRows="";
      if(tg.length===0){
        gRows='<div style="padding:8px 12px;font-size:10px;color:#bbb;text-align:center">Boş masa</div>';
      } else {
        tg.forEach(function(g){
          var dc=g.side==="oglan"?"#2a6f97":"#c2528b";
          gRows+='<div style="display:flex;align-items:center;padding:4px 10px;gap:6px;border-bottom:1px solid #f0f0ee;font-size:10.5px;color:#222">'
            +'<span style="width:5px;height:5px;border-radius:50%;background:'+dc+';flex-shrink:0"></span>'
            +g.name
            +'<span style="margin-left:auto;font-size:8.5px;color:#999;white-space:nowrap">'+g.cat+'</span>'
            +'</div>';
        });
      }
      rows+='<div style="border:1px solid #ddd;border-radius:8px;overflow:hidden;break-inside:avoid;margin-bottom:4px">'
        +'<div style="background:#f7f7f5;padding:7px 12px;border-bottom:1px solid #e0e0dc;border-top:3px solid '+sc+';display:flex;justify-content:space-between;align-items:center">'
        +'<div><div style="font-size:14px;font-weight:800;font-family:Georgia,serif">'+t.label+'</div>'
        +'<div style="font-size:8.5px;color:#999;margin-top:1px">'+sl+' · '+t.cap+' nəfər</div></div>'
        +'<div style="font-size:12px;font-weight:700;color:#555">'+tg.length+'/'+t.cap+'</div>'
        +'</div>'+gRows+'</div>';
    });
    var html='<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Oturma Planı — Maket Gallery Hall</title>'
      +'<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:system-ui,sans-serif;background:#fff;padding:20px;color:#1a1a1a}'
      +'h1{font-family:Georgia,serif;font-size:20px;margin-bottom:4px}p{font-size:10px;color:#888;margin-bottom:16px}'
      +'.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}'
      +'@media print{body{padding:12px}.grid{grid-template-columns:repeat(4,1fr)}}'
      +'@page{size:A4 landscape;margin:12mm}'
      +'</style></head><body>'
      +'<h1>Oturma Planı — Maket Gallery Hall</h1>'
      +'<p>'+new Date().toLocaleDateString("az-AZ",{day:"2-digit",month:"long",year:"numeric"})+'</p>'
      +'<div class="grid">'+rows+'</div>'
      +'</body></html>';
    var w=window.open("","_blank");
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(function(){w.print();},500);
  }

  return (
    <div style={{fontFamily:"system-ui,sans-serif",height:"100vh",display:"flex",flexDirection:"column",background:"#f4f2ed",overflow:"hidden"}}>
      {/* TOP BAR */}
      <div style={{background:"#0d0d0d",color:"#fff",padding:"8px 12px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,gap:8,borderBottom:"1px solid #1e1e1e"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,overflow:"hidden",flex:1}}>
          <span className="mob-hide" style={{fontFamily:"'Playfair Display',serif",fontSize:14,color:"#d4a030",flexShrink:0,letterSpacing:0.5}}>Maket Hall</span>
          <div style={{display:"flex",alignItems:"center",gap:4,background:"#1e1e1e",borderRadius:8,padding:"5px 10px",flexShrink:0,border:"1px solid #2a2a2a"}}>
            <span className="mob-hide" style={{fontSize:9,color:"#4a4a4a",letterSpacing:1.5,textTransform:"uppercase"}}>Kod</span>
            <span style={{fontFamily:"monospace",fontSize:13,fontWeight:800,color:"#b8860b",letterSpacing:3}}>{weddingId}</span>
            <button onClick={handleCopy} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:copied?"#48bb78":"#4a4a4a",padding:"0 2px",minHeight:0,lineHeight:1}}>
              {copied?"✓":"⎘"}
            </button>
          </div>
          {fbDb && onlineCount && (
            <span style={{fontSize:10,color:"#48bb78",display:"flex",alignItems:"center",gap:3,flexShrink:0}}>
              <span style={{width:5,height:5,borderRadius:"50%",background:"#48bb78",display:"inline-block",boxShadow:"0 0 4px #48bb78"}} />
              <span className="mob-hide" style={{fontWeight:600}}>{onlineCount} onlayn</span>
            </span>
          )}
          <div className="mob-hide" style={{display:"flex",gap:1,background:"#1e1e1e",borderRadius:8,padding:"3px",border:"1px solid #2a2a2a"}}>
            {[["hall","🏛 Zal"],["list","📋 Siyahı"],["stats","📊 Stat"],["live","🟢 Live"]].map(function(pair){
              return <button key={pair[0]} onClick={function(){setView(pair[0]);setShowLeftPanel(false);}} style={{
                padding:"5px 12px",fontSize:11,border:"none",borderRadius:6,cursor:"pointer",minHeight:0,
                background:view===pair[0]?"#b8860b":"transparent",color:view===pair[0]?"#fff":"#666",
                fontWeight:view===pair[0]?700:400,letterSpacing:0.2
              }}>{pair[1]}</button>;
            })}
          </div>
        </div>

        <div style={{display:"flex",gap:4,alignItems:"center",flexShrink:0}}>
          <span className="mob-hide" style={{fontSize:11,color:"#555",whiteSpace:"nowrap",marginRight:4}}>
            <span style={{color:"#48bb78",fontWeight:700}}>{stats.assigned}</span>{" · "}
            <span style={{color:"#f6ad55",fontWeight:700}}>{stats.unassigned}</span>{" boş"}
          </span>
          <button onClick={autoAssign} style={{background:"#2a6f97",color:"#fff",border:"none",borderRadius:8,padding:"6px 12px",fontSize:11.5,fontWeight:700,cursor:"pointer"}}>⚡<span className="mob-hide"> Böl</span></button>
          {showResetAssignConfirm ? (
            <span style={{display:"flex",gap:4,alignItems:"center"}}>
              <span style={{fontSize:10,color:"#f6ad55",whiteSpace:"nowrap"}}>Hamısını sıfırla?</span>
              <button onClick={function(){pushHistory();setGuests(function(p){return p.map(function(g){return Object.assign({},g,{tableId:null});});});setShowResetAssignConfirm(false);}} style={{background:"#e53e3e",color:"#fff",border:"none",borderRadius:8,padding:"5px 10px",fontSize:11,cursor:"pointer",fontWeight:700}}>Bəli</button>
              <button onClick={function(){setShowResetAssignConfirm(false);}} style={{background:"#1e1e1e",color:"#666",border:"1px solid #2a2a2a",borderRadius:8,padding:"5px 8px",fontSize:11,cursor:"pointer"}}>Xeyr</button>
            </span>
          ) : (
            <button onClick={function(){setShowResetAssignConfirm(true);}} style={{background:"#1e1e1e",color:"#777",border:"1px solid #2a2a2a",borderRadius:8,padding:"6px 10px",fontSize:12,cursor:"pointer"}} title="Hamısını sıfırla">↺</button>
          )}
          {canUndo&&<button onClick={undo} style={{background:"#1e1e1e",color:"#f6ad55",border:"1px solid #3a3000",borderRadius:8,padding:"6px 10px",fontSize:12,cursor:"pointer",fontWeight:700}} title="Geri al (Ctrl+Z)">↶<span className="mob-hide" style={{fontSize:11}}> Geri al</span></button>}
          {(function(){
            var bk = bkGet(weddingId);
            if (!bk) return null;
            var bkAssigned = bk.guests ? bk.guests.filter(function(g){return g.tableId!=null;}).length : 0;
            if (bkAssigned <= stats.assigned) return null;
            var d = new Date(bk.at);
            var label = d.getHours()+":"+(d.getMinutes()<10?"0":"")+d.getMinutes();
            if (showRestoreConfirm) return (
              <span style={{display:"flex",gap:4,alignItems:"center"}}>
                <span style={{fontSize:10,color:"#48bb78",whiteSpace:"nowrap"}} className="mob-hide">{label} — {bkAssigned} oturub</span>
                <button onClick={function(){pushHistory();setGuests(bk.guests);setTables(bk.tables);setArrived(bk.arrived||{});setShowRestoreConfirm(false);}} style={{background:"#276749",color:"#fff",border:"none",borderRadius:8,padding:"5px 10px",fontSize:11,cursor:"pointer",fontWeight:700}}>✓ Bərpa et</button>
                <button onClick={function(){setShowRestoreConfirm(false);}} style={{background:"#1e1e1e",color:"#666",border:"1px solid #2a2a2a",borderRadius:8,padding:"5px 8px",fontSize:11,cursor:"pointer"}}>—</button>
              </span>
            );
            return <button onClick={function(){setShowRestoreConfirm(true);}} style={{background:"#1e1e1e",color:"#48bb78",border:"1px solid #1a3a2a",borderRadius:8,padding:"6px 10px",fontSize:11,cursor:"pointer",fontWeight:700}} title={"Backup: "+label+" ("+bkAssigned+" oturub)"}>⟳<span className="mob-hide"> Bərpa</span></button>;
          })()}
          <button className="mob-hide" onClick={function(){setStep(0);}} style={{background:"#1e1e1e",color:"#666",border:"1px solid #2a2a2a",borderRadius:8,padding:"6px 10px",fontSize:11,cursor:"pointer"}}>📋</button>
          <button className="mob-hide" onClick={function(){setStep(1);}} style={{background:"#1e1e1e",color:"#666",border:"1px solid #2a2a2a",borderRadius:8,padding:"6px 10px",fontSize:11,cursor:"pointer"}}>👥</button>
          {dupCount>0&&<button className="mob-hide" onClick={removeDuplicates} style={{background:"#2a0808",color:"#f87171",border:"1px solid #4a1818",borderRadius:8,padding:"6px 10px",fontSize:11,cursor:"pointer",fontWeight:700}}>✕ {dupCount}</button>}
          {showResetConfirm ? (
            <span style={{display:"flex",gap:4,alignItems:"center"}}>
              <span className="mob-hide" style={{fontSize:10,color:"#f6ad55"}}>Əminsən?</span>
              <button onClick={handleLeave} style={{background:"#e53e3e",color:"#fff",border:"none",borderRadius:8,padding:"6px 10px",fontSize:11,cursor:"pointer",fontWeight:700}}>✕ çıx</button>
              <button onClick={function(){setShowResetConfirm(false);}} style={{background:"#1e1e1e",color:"#666",border:"1px solid #2a2a2a",borderRadius:8,padding:"6px 8px",fontSize:11,cursor:"pointer"}}>—</button>
            </span>
          ) : (
            <button onClick={function(){setShowResetConfirm(true);}} style={{background:"#1e1e1e",color:"#444",border:"1px solid #2a2a2a",borderRadius:8,padding:"6px 9px",fontSize:11,cursor:"pointer"}}>✕</button>
          )}
        </div>
      </div>

      {/* ADD TABLE TOOLBAR */}
      {addMode && (
        <div style={{background:"#2a6f97",padding:"7px 16px",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",flexShrink:0}}>
          <span style={{color:"#fff",fontSize:12,fontWeight:700}}>🎯 Zalda istədiyin yerə klik et</span>
          <input placeholder={"Ad (№"+(tables.length+1)+")"} value={newTable.label} onChange={function(e){setNewTable(Object.assign({},newTable,{label:e.target.value}));}}
            style={{padding:"5px 8px",borderRadius:5,border:"none",fontSize:11,width:100,outline:"none"}} />
          <select value={newTable.cap} onChange={function(e){setNewTable(Object.assign({},newTable,{cap:parseInt(e.target.value)}));}}>
            {[8,10,12,14,18,20].map(function(n){return <option key={n} value={n}>{n} nəfər</option>;})}
          </select>
          <select value={newTable.side} onChange={function(e){setNewTable(Object.assign({},newTable,{side:e.target.value}));}}>
            <option value="oglan">Oğlan</option><option value="qiz">Qız</option><option value="special">Xüsusi</option>
          </select>
          <select value={newTable.size} onChange={function(e){setNewTable(Object.assign({},newTable,{size:e.target.value}));}}>
            <option value="normal">Normal</option><option value="big">Böyük</option>
          </select>
          <button onClick={function(){setAddMode(false);}} style={s("rgba(255,255,255,.2)","#fff",{padding:"5px 12px",fontSize:11})}>✕ Ləğv et</button>
        </div>
      )}

      <div style={{flex:1,display:"flex",overflow:"hidden",position:"relative"}}>
        {/* MOBILE OVERLAY */}
        {showLeftPanel&&<div className="mob-overlay" onClick={function(){setShowLeftPanel(false);}} />}
        {/* LEFT PANEL */}
        <div className={"left-panel"+(showLeftPanel?" open":"")} style={{width:230,background:"#fff",borderRight:"1px solid #ece8e0",display:"flex",flexDirection:"column",flexShrink:0}}>
          <div style={{padding:"12px 12px 8px",borderBottom:"1px solid #f0ede5"}}>
            <input placeholder="Axtar qonaq..." value={search} onChange={function(e){setSearch(e.target.value);}}
              style={{width:"100%",padding:"8px 12px",border:"1.5px solid #e8e4da",borderRadius:8,fontSize:12,boxSizing:"border-box",background:"#fafaf7"}} />
            <div style={{display:"flex",gap:4,marginTop:8}}>
              {[["all","Hamısı"],["oglan","Oğlan"],["qiz","Qız"]].map(function(p){
                var active=fSide===p[0];
                return <button key={p[0]} onClick={function(){setFSide(active&&p[0]!=="all"?"all":p[0]);}} style={{
                  flex:1,padding:"5px 0",fontSize:10.5,border:"1.5px solid "+(active?"#1a1a1a":"#e8e4da"),borderRadius:8,cursor:"pointer",
                  background:active?"#1a1a1a":"#fff",color:active?"#fff":"#666",fontWeight:active?700:500}}>{p[1]}</button>;
              })}
            </div>
            {cats.length>0&&(
              <div style={{display:"flex",gap:3,marginTop:6,flexWrap:"wrap"}}>
                <button onClick={function(){setFCat("all");}} style={{padding:"3px 9px",fontSize:9.5,border:"1.5px solid "+(fCat==="all"?"#1a1a1a":"#e8e4da"),borderRadius:999,cursor:"pointer",flexShrink:0,
                  background:fCat==="all"?"#1a1a1a":"#fff",color:fCat==="all"?"#fff":"#777",fontWeight:600}}>Hamısı</button>
                {cats.map(function(c){
                  var active=fCat===c;
                  return <button key={c} onClick={function(){setFCat(active?"all":c);}} style={{padding:"3px 9px",fontSize:9.5,border:"1.5px solid "+(active?cCol(c):"#e8e4da"),borderRadius:999,cursor:"pointer",flexShrink:0,
                    background:active?cCol(c)+"20":"#fff",color:active?cCol(c):"#888",fontWeight:700}}>{c}</button>;
                })}
              </div>
            )}
          </div>
          <div style={{padding:"6px 14px",fontSize:10.5,color:"#b0a898",borderBottom:"1px solid #f5f2ea",fontWeight:600,letterSpacing:0.4}}>
            Boş: {filtUn.length} qonaq
          </div>
          <div style={{flex:1,overflowY:"auto"}}>
            {filtUn.map(function(g){
              return (
                <div key={g.id} draggable onDragStart={function(){setDragId(g.id);}} onDragEnd={function(){setDragId(null);setDropT(null);}}
                  style={{display:"flex",alignItems:"center",gap:7,padding:"9px 14px",cursor:"grab",
                    borderBottom:"1px solid #f8f6f2",background:dragId===g.id?"#f0f7ff":"transparent",
                    transition:"background .1s"}}>
                  <div style={{width:6,height:6,borderRadius:"50%",background:g.side==="oglan"?"#2a6f97":"#c2528b",flexShrink:0}} />
                  <div style={{flex:1,fontSize:12,fontWeight:500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{g.name}</div>
                  <span style={{fontSize:9,padding:"2px 7px",borderRadius:999,background:cCol(g.cat)+"15",color:cCol(g.cat),fontWeight:700,flexShrink:0,border:"1px solid "+cCol(g.cat)+"20"}}>{g.cat}</span>
                </div>
              );
            })}
            {filtUn.length===0&&<div style={{padding:24,textAlign:"center",color:"#ccc",fontSize:12}}>
              {stats.unassigned===0?"🎉 Hamısı yerləşib!":"Nəticə yoxdur"}</div>}
          </div>
        </div>

        {/* CENTER */}
        <div style={{flex:1,overflow:"auto"}}>
          {view==="hall"&&(
            <div style={{height:"100%",display:"flex",flexDirection:"column",overflow:"hidden"}}>
              {/* Hall toolbar */}
              <div style={{padding:"7px 10px",display:"flex",gap:6,alignItems:"center",borderBottom:"1px solid #ece8e0",flexShrink:0,background:"#fafaf7",flexWrap:"wrap"}}>
                <button className="mob-only" onClick={function(){setShowLeftPanel(!showLeftPanel);}}
                  style={{padding:"6px 12px",fontSize:11,border:"1.5px solid #e0ddd5",borderRadius:999,cursor:"pointer",background:"#fff",color:"#555",fontWeight:700}}>
                  ☰ {filtUn.length} boş
                </button>
                <button onClick={function(){setAddMode(!addMode);setLayoutMode(false);setSelTable(null);}}
                  style={{padding:"6px 14px",fontSize:11,border:"1.5px solid "+(addMode?"#e53e3e":"#b8e0c8"),borderRadius:999,cursor:"pointer",
                    background:addMode?"#fff5f5":"#f0fff4",color:addMode?"#e53e3e":"#2a7a4a",fontWeight:700}}>
                  {addMode?"✕ Ləğv et":"＋ Masa əlavə et"}
                </button>
                <button onClick={function(){setLayoutMode(!layoutMode);setAddMode(false);setSelTable(null);}}
                  style={{padding:"6px 14px",fontSize:11,border:"1.5px solid "+(layoutMode?"#f6ad55":"#e8e4da"),borderRadius:999,cursor:"pointer",
                    background:layoutMode?"#fffbf0":"#fff",color:layoutMode?"#c07800":"#888",fontWeight:layoutMode?700:500}}>
                  {layoutMode?"✓ Mövqe rejimi":"⤢ Mövqe dəyiş"}
                </button>
                <button onClick={printHall}
                  style={{padding:"6px 14px",fontSize:11,border:"1.5px solid #555",borderRadius:999,cursor:"pointer",background:"#1a1a1a",color:"#fff",fontWeight:700}}>
                  PDF
                </button>
                <div style={{flex:1}} />
                <div style={{display:"flex",gap:0,alignItems:"center",background:"#f0ede5",borderRadius:10,padding:"3px 4px",border:"1px solid #e8e4da"}}>
                  <button onClick={function(e){e.stopPropagation();setHallZoom(function(z){return Math.max(0.4,+(z-0.15).toFixed(2));});}}
                    style={{border:"none",background:"none",cursor:"pointer",fontSize:16,fontWeight:700,color:"#666",padding:"2px 7px",lineHeight:1,borderRadius:7}}>−</button>
                  <span style={{fontSize:10.5,fontWeight:700,color:"#666",minWidth:38,textAlign:"center"}}>{Math.round(hallZoom*100)}%</span>
                  <button onClick={function(e){e.stopPropagation();setHallZoom(function(z){return Math.min(3,+(z+0.15).toFixed(2));});}}
                    style={{border:"none",background:"none",cursor:"pointer",fontSize:16,fontWeight:700,color:"#666",padding:"2px 7px",lineHeight:1,borderRadius:7}}>＋</button>
                  <button onClick={function(e){e.stopPropagation();setHallZoom(1);}}
                    style={{border:"none",background:"none",cursor:"pointer",fontSize:11,color:"#bbb",padding:"2px 6px",borderLeft:"1px solid #e0ddd5"}}>↺</button>
                </div>
              </div>

              {/* Scrollable hall area */}
              <div style={{flex:1,overflow:"auto",padding:8,boxSizing:"border-box"}}>
                <div ref={hallRef} onClick={handleHallClick}
                  style={{position:"relative",
                    width:(hallZoom*100)+"%",minWidth:280,
                    aspectRatio:"1.5/1",
                    border:addMode?"2px dashed #48bb78":layoutMode?"2px dashed #f6ad55":"1px solid #d8d5ce",
                    borderRadius:14,background:addMode?"#f0fff4":layoutMode?"#fffcf0":"#f7f5f1",
                    overflow:"visible",minHeight:300,
                    cursor:addMode?"crosshair":layoutMode?"default":"default",
                    transition:"border .15s,background .15s",
                    boxShadow:(addMode||layoutMode)?"none":"inset 0 1px 4px rgba(0,0,0,.04)"}}>
                  {/* Section tinted backgrounds */}
                  <div style={{position:"absolute",left:"3%",right:"5%",top:"2%",height:"39%",background:"rgba(42,111,151,0.05)",borderRadius:8,zIndex:0,pointerEvents:"none"}} />
                  <div style={{position:"absolute",left:"3%",right:"5%",top:"44%",height:"54%",background:"rgba(194,82,139,0.05)",borderRadius:8,zIndex:0,pointerEvents:"none"}} />
                  {/* Hall title */}
                  <div style={{position:"absolute",top:7,left:"50%",transform:"translateX(-50%)",fontSize:10,letterSpacing:3,color:"#b8860b",fontWeight:700,zIndex:10,whiteSpace:"nowrap"}}>MAKET GALLERY HALL</div>
                  {/* Section labels */}
                  <div style={{position:"absolute",left:8,top:"3%",fontSize:7.5,fontWeight:800,color:"#2a6f97",letterSpacing:1,zIndex:10,display:"flex",alignItems:"center",gap:4}}>
                    <span style={{width:5,height:5,borderRadius:"50%",background:"#2a6f97",display:"inline-block"}} />
                    OĞLAN EVİ · {tables.filter(function(t){return t.side==="oglan";}).length} masa
                  </div>
                  <div style={{position:"absolute",left:8,top:"45%",fontSize:7.5,fontWeight:800,color:"#c2528b",letterSpacing:1,zIndex:10,display:"flex",alignItems:"center",gap:4}}>
                    <span style={{width:5,height:5,borderRadius:"50%",background:"#c2528b",display:"inline-block"}} />
                    QIZ EVİ · {tables.filter(function(t){return t.side==="qiz";}).length} masa
                  </div>
                  {/* GƏLIN BAY */}
                  <div style={{position:"absolute",left:0,top:"38%",height:"7%",width:"5.5%",background:"linear-gradient(135deg,#d4eaf7,#b8d8ea)",borderRadius:"0 8px 8px 0",display:"flex",alignItems:"center",justifyContent:"center",zIndex:3,boxShadow:"2px 0 8px rgba(42,111,151,.12)"}}>
                    <span style={{writingMode:"vertical-rl",transform:"rotate(180deg)",fontSize:7,fontWeight:800,color:"#4a7f98",letterSpacing:2}}>GƏLİN BAY</span>
                  </div>
                  {/* GİRİŞ — left wall below GƏLIN BAY */}
                  <div style={{position:"absolute",left:0,top:"52%",height:"10%",width:"5%",background:"linear-gradient(135deg,#3aad6a,#2a8a50)",borderRadius:"0 8px 8px 0",display:"flex",alignItems:"center",justifyContent:"center",zIndex:3,boxShadow:"2px 0 10px rgba(58,173,106,.3)"}}>
                    <span style={{writingMode:"vertical-rl",transform:"rotate(180deg)",fontSize:7,fontWeight:800,color:"#fff",letterSpacing:2}}>GİRİŞ ▲</span>
                  </div>
                  {/* Section divider */}
                  <div style={{position:"absolute",left:"6%",right:"5%",top:"43%",height:1,background:"linear-gradient(90deg,transparent,#c8c4bc 15%,#c8c4bc 85%,transparent)",zIndex:2,pointerEvents:"none"}} />
                  {/* Stage */}
                  <div style={{position:"absolute",right:0,top:"22%",height:"50%",width:24,background:"linear-gradient(180deg,#2a6f97,#1a4f77)",borderRadius:"6px 0 0 6px",display:"flex",alignItems:"center",justifyContent:"center",zIndex:10,boxShadow:"-2px 0 8px rgba(26,79,119,.2)"}}>
                    <span style={{writingMode:"vertical-rl",color:"#fff",fontSize:9,fontWeight:800,letterSpacing:4}}>SƏHNƏ</span>
                  </div>
                  {addMode&&<div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",fontSize:13,color:"#48bb78",fontWeight:700,opacity:0.4,pointerEvents:"none",zIndex:0,textAlign:"center"}}>
                    Masanı yerləşdirmək üçün<br/>klik et</div>}
                  {layoutMode&&<div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",fontSize:13,color:"#c07800",fontWeight:700,opacity:0.3,pointerEvents:"none",zIndex:0,textAlign:"center"}}>
                    Masanı sürüşdür</div>}
                  {tables.map(renderT)}
                </div>

                {activeCats.length>0&&(
                  <div style={{display:"flex",gap:8,justifyContent:"center",marginTop:10,flexWrap:"wrap"}}>
                    {activeCats.map(function(c){
                      return <span key={c} style={{fontSize:10,display:"flex",alignItems:"center",gap:4}}>
                        <span style={{width:10,height:10,borderRadius:"50%",background:cCol(c)+"30",border:"2px solid "+cCol(c),display:"inline-block"}} />
                        <span style={{color:"#666"}}>{c}</span></span>;
                    })}
                  </div>
                )}
                <div style={{display:"flex",gap:10,justifyContent:"center",marginTop:10,flexWrap:"wrap"}}>
                  <Badge l="Masa" v={tables.filter(function(t){return t.cap>0;}).length} a="#555" />
                  <Badge l="Qonaq" v={stats.total} a="#b8860b" />
                  <Badge l="Oturub" v={stats.assigned} a="#48bb78" />
                  <Badge l="Boş" v={stats.unassigned} a="#e53e3e" />
                </div>
              </div>
            </div>
          )}
          {view==="list"&&(
            <div style={{padding:"20px 16px",maxWidth:760,margin:"0 auto"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:20,margin:0,color:"#1a1a1a"}}>Bütün Qonaqlar</h2>
                <span style={{fontSize:11,color:"#aaa",background:"#f5f2ea",borderRadius:999,padding:"4px 12px",fontWeight:600}}>{guests.length} qonaq</span>
              </div>
              <div style={{background:"#fff",borderRadius:12,border:"1px solid #e8e4da",overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,.04)"}}>
                {guests.map(function(g,i){
                  var t=tables.find(function(t){return t.id===g.tableId;});
                  if(editing===g.id) return (
                    <div key={g.id} style={{display:"flex",alignItems:"center",padding:"9px 16px",gap:7,borderBottom:"1px solid #f5f5f3",background:"#f0f7ff",flexWrap:"wrap"}}>
                      <div style={{width:7,height:7,borderRadius:"50%",background:g.side==="oglan"?"#2a6f97":"#c2528b",flexShrink:0}} />
                      <input value={ef.name} onChange={function(e){setEf(Object.assign({},ef,{name:e.target.value}));}}
                        style={{flex:2,padding:"6px 10px",border:"1.5px solid #93c5fd",borderRadius:7,fontSize:12,minWidth:100}} />
                      <input value={ef.cat} onChange={function(e){setEf(Object.assign({},ef,{cat:e.target.value}));}}
                        style={{flex:1,padding:"6px 10px",border:"1.5px solid #93c5fd",borderRadius:7,fontSize:12,minWidth:80}} />
                      <select value={ef.side} onChange={function(e){setEf(Object.assign({},ef,{side:e.target.value}));}}
                        style={{padding:"6px 8px",border:"1.5px solid #93c5fd",borderRadius:7,fontSize:11}}>
                        <option value="oglan">Oğlan</option><option value="qiz">Qız</option>
                      </select>
                      <button onClick={function(){setGuests(function(p){return p.map(function(x){return x.id===editing?Object.assign({},x,ef):x;});});setEditing(null);}}
                        style={{padding:"6px 14px",background:"#2a6f97",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:700}}>✓</button>
                      <button onClick={function(){setEditing(null);}}
                        style={{padding:"6px 10px",background:"#f0f0f0",border:"none",borderRadius:7,cursor:"pointer",fontSize:12}}>✕</button>
                    </div>
                  );
                  return (
                    <div key={g.id} style={{display:"flex",alignItems:"center",padding:"10px 16px",gap:8,borderBottom:"1px solid #f5f2ea",background:i%2?"#fafaf7":"#fff"}}>
                      <div style={{width:7,height:7,borderRadius:"50%",background:g.side==="oglan"?"#2a6f97":"#c2528b",flexShrink:0}} />
                      <div style={{flex:2,fontSize:13,fontWeight:500}}>{g.name}</div>
                      <span style={{fontSize:9.5,padding:"3px 9px",borderRadius:999,background:cCol(g.cat)+"15",color:cCol(g.cat),fontWeight:700,flexShrink:0,border:"1px solid "+cCol(g.cat)+"20"}}>{g.cat}</span>
                      <div style={{width:45,fontSize:10.5,color:"#ccc",textAlign:"right",flexShrink:0}}>{g.side==="oglan"?"Oğlan":"Qız"}</div>
                      <div style={{width:45,fontSize:12,fontWeight:700,color:t?"#2a6f97":"#e0ddd5",textAlign:"right",flexShrink:0}}>{t?t.label:"—"}</div>
                      <button onClick={function(){setEditing(g.id);setEf({name:g.name,side:g.side,cat:g.cat});}}
                        style={{background:"none",border:"1.5px solid #e8e8e8",borderRadius:7,cursor:"pointer",fontSize:12,padding:"4px 8px",color:"#999",flexShrink:0}}>✎</button>
                      <button onClick={function(){setGuests(function(p){return p.filter(function(x){return x.id!==g.id;});});}}
                        style={{background:"none",border:"1.5px solid #fdd",borderRadius:7,cursor:"pointer",fontSize:12,padding:"4px 8px",color:"#e53e3e",flexShrink:0}}>✕</button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {view==="stats"&&(
            <div style={{padding:"20px 16px",maxWidth:600,margin:"0 auto"}}>
              <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:20,marginBottom:16,color:"#1a1a1a"}}>Statistika</h2>
              <div className="stats-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:24}}>
                <Badge l="Qonaq" v={stats.total} a="#b8860b" />
                <Badge l="Tutum" v={stats.cap} a="#555" />
                <Badge l="Boş yer" v={Math.max(0,stats.cap-stats.total)} a={stats.cap>=stats.total?"#48bb78":"#e53e3e"} />
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:24}}>
                {(function(){
                  var norm=function(s){return s.replace(/İ/g,"I").replace(/ı/g,"i").replace(/ə/g,"e").replace(/Ə/g,"E").toLowerCase();};
                  var oglan=guests.filter(function(g){return g.side==="oglan";});
                  var isf=oglan.filter(function(g){return norm(g.cat).indexOf("isfendiyar")>=0;});
                  var other=oglan.filter(function(g){return norm(g.cat).indexOf("isfendiyar")<0;});
                  var row=function(label,list,color,big){return(
                    <div style={{marginTop:10,paddingTop:10,borderTop:"1px solid #d0e3f0"}}>
                      <div style={{fontSize:9.5,color:"#4a7f98",fontWeight:700,letterSpacing:0.5,marginBottom:4,textTransform:"uppercase"}}>{label}</div>
                      <div style={{display:"flex",alignItems:"baseline",gap:8}}>
                        <span style={{fontSize:big?24:20,fontWeight:800,color:color||"#1a4f77",fontFamily:"'Playfair Display',serif"}}>{list.length}</span>
                        <span style={{fontSize:10.5,color:"#6a9fbf"}}>{list.filter(function(g){return g.tableId!==null;}).length} oturub · {list.filter(function(g){return g.tableId===null;}).length} boş</span>
                      </div>
                    </div>
                  );};
                  return(
                    <div style={{background:"linear-gradient(135deg,#eaf3f9,#fff)",borderRadius:12,border:"1px solid #d0e3f0",padding:"16px 18px",boxShadow:"0 1px 6px rgba(42,111,151,.08)"}}>
                      <div style={{fontSize:10,color:"#2a6f97",fontWeight:700,letterSpacing:1,marginBottom:4,textTransform:"uppercase"}}>Oğlan tərəfi</div>
                      <div style={{fontFamily:"'Playfair Display',serif",fontSize:26,fontWeight:800,color:"#2a6f97",lineHeight:1}}>Nicat</div>
                      {other.length>0&&row("Nicat qonaqları",other,"#1a4f77",false)}
                      {isf.length>0&&row("İsfəndiyar M",isf,"#2a7fa0",false)}
                      {isf.length>0&&row("Toplam",oglan,"#0d3a5c",true)}
                    </div>
                  );
                })()}
                <div style={{background:"linear-gradient(135deg,#fdf0f6,#fff)",borderRadius:12,border:"1px solid #e8c8db",padding:"16px 18px",boxShadow:"0 1px 6px rgba(194,82,139,.08)"}}>
                  <div style={{fontSize:10,color:"#c2528b",fontWeight:700,letterSpacing:1,marginBottom:4,textTransform:"uppercase"}}>Qız tərəfi</div>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:26,fontWeight:800,color:"#c2528b",lineHeight:1}}>Talifa</div>
                  <div style={{fontSize:28,fontWeight:800,color:"#8a2060",marginTop:6,fontFamily:"'Playfair Display',serif"}}>{guests.filter(function(g){return g.side==="qiz";}).length}</div>
                  <div style={{fontSize:10.5,color:"#bf6a9f",marginTop:4}}>{guests.filter(function(g){return g.side==="qiz"&&g.tableId!==null;}).length} oturub · {guests.filter(function(g){return g.side==="qiz"&&g.tableId===null;}).length} boş</div>
                </div>
              </div>
              <h3 style={{fontSize:12,fontWeight:700,marginBottom:10,color:"#999",letterSpacing:0.8,textTransform:"uppercase"}}>Kateqoriya üzrə</h3>
              <div style={{background:"#fff",borderRadius:12,border:"1px solid #e8e4da",overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,.04)"}}>
                {cats.map(function(c){var cg=guests.filter(function(g){return g.cat===c;});var seated=cg.filter(function(g){return g.tableId!==null;}).length;var pct=cg.length>0?(seated/cg.length)*100:0;
                  return <div key={c} style={{display:"flex",alignItems:"center",padding:"12px 16px",borderBottom:"1px solid #f5f2ea",gap:12}}>
                    <span style={{width:10,height:10,borderRadius:"50%",background:cCol(c),flexShrink:0}} />
                    <div style={{flex:1,fontSize:13,fontWeight:600}}>{c}</div>
                    <div style={{width:110,height:6,background:"#f0ede5",borderRadius:999,overflow:"hidden"}}>
                      <div style={{width:pct+"%",height:"100%",background:cCol(c),borderRadius:999,transition:"width .4s"}} />
                    </div>
                    <div style={{fontSize:11.5,fontWeight:700,width:52,textAlign:"right",color:seated===cg.length?"#48bb78":"#555"}}>{seated}/{cg.length}</div>
                  </div>;})}
              </div>
            </div>
          )}
          {view==="live"&&(
            <div style={{padding:"20px 16px",maxWidth:960,margin:"0 auto"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,gap:12,flexWrap:"wrap"}}>
                <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:20,margin:0,color:"#1a1a1a"}}>Canlı Qeydiyyat</h2>
                <div style={{display:"flex",gap:8,alignItems:"center",flex:1,maxWidth:300}}>
                  <input placeholder="Ad axtar..." value={liveSearch} onChange={function(e){setLiveSearch(e.target.value);}}
                    style={{flex:1,padding:"8px 12px",border:"1.5px solid #e8e4da",borderRadius:9,fontSize:12,background:"#fafaf7"}} />
                  {liveSearch&&<button onClick={function(){setLiveSearch("");}} style={{background:"#f0f0ee",border:"none",borderRadius:7,cursor:"pointer",color:"#aaa",fontSize:14,padding:"5px 8px"}}>✕</button>}
                </div>
                <div style={{display:"flex",gap:8,flexShrink:0,alignItems:"center"}}>
                  <span style={{fontSize:12,background:"#f0fff4",border:"1.5px solid #9ae6b4",borderRadius:999,padding:"6px 14px",color:"#276749",fontWeight:700}}>
                    ✓ {Object.keys(arrived).length} gəldi
                  </span>
                  <span style={{fontSize:12,background:"#fff5f5",border:"1.5px solid #feb2b2",borderRadius:999,padding:"6px 14px",color:"#c53030",fontWeight:700}}>
                    ⌛ {guests.length-Object.keys(arrived).length} gözlənilir
                  </span>
                  <button onClick={printTables}
                    style={{fontSize:12,background:"#1a1a1a",border:"none",borderRadius:999,padding:"7px 14px",color:"#fff",fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:5,flexShrink:0}}>
                    ⬇ PDF
                  </button>
                </div>
              </div>
              {liveSearch.trim()?(
                <div style={{background:"#fff",borderRadius:10,border:"1px solid #e0ddd5",overflow:"hidden",marginBottom:20}}>
                  {(function(){
                    var q=liveSearch.trim().toLowerCase();
                    var res=guests.filter(function(g){return g.name.toLowerCase().includes(q);});
                    if(!res.length) return <div style={{padding:20,textAlign:"center",color:"#bbb",fontSize:13}}>Tapılmadı</div>;
                    return res.map(function(g){
                      var t=tables.find(function(t){return t.id===g.tableId;});
                      var isA=!!arrived[g.id];
                      return (
                        <div key={g.id} onClick={function(){setArrived(function(p){var n=Object.assign({},p);if(n[g.id])delete n[g.id];else n[g.id]=true;return n;})}}
                          style={{display:"flex",alignItems:"center",padding:"9px 14px",gap:8,borderBottom:"1px solid #f5f5f3",cursor:"pointer",
                            background:isA?"#f0fff4":"#fff"}}>
                          <div style={{width:22,height:22,borderRadius:"50%",border:"2px solid "+(isA?"#48bb78":"#ddd"),
                            background:isA?"#48bb78":"#fff",display:"flex",alignItems:"center",justifyContent:"center",
                            flexShrink:0,fontSize:12,color:"#fff",fontWeight:800,transition:"all .15s"}}>
                            {isA?"✓":""}
                          </div>
                          <div style={{width:6,height:6,borderRadius:"50%",background:g.side==="oglan"?"#2a6f97":"#c2528b",flexShrink:0}} />
                          <div style={{flex:1,fontSize:13,fontFamily:"system-ui",fontWeight:isA?700:400,color:isA?"#276749":"#222"}}>{g.name}</div>
                          <span style={{fontSize:9,padding:"2px 8px",borderRadius:10,background:cCol(g.cat)+"15",color:cCol(g.cat),fontWeight:600,flexShrink:0}}>{g.cat}</span>
                          <div style={{fontSize:11,fontWeight:700,color:t?"#2a6f97":"#bbb",width:40,textAlign:"right",flexShrink:0}}>{t?t.label:"—"}</div>
                        </div>
                      );
                    });
                  })()}
                </div>
              ):(
                <div className="live-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(230px,1fr))",gap:14}}>
                  {tables.filter(function(t){return t.cap>0;}).map(function(t){
                    var tg=guests.filter(function(g){return g.tableId===t.id;});
                    var ac=tg.filter(function(g){return !!arrived[g.id];}).length;
                    var allIn=ac===tg.length&&tg.length>0;
                    var bord=t.side==="oglan"?"#8bb8c9":t.side==="qiz"?"#a888c0":"#d4a520";
                    return (
                      <div key={t.id} style={{background:"#fff",borderRadius:12,border:"1.5px solid "+(allIn?"#9ae6b4":bord+"88"),overflow:"hidden",
                        boxShadow:"0 2px 8px rgba(0,0,0,.06)"}}>
                        <div style={{padding:"10px 14px",borderBottom:"1px solid #f0f0ee",
                          background:allIn?"#f0fff4":t.side==="oglan"?"#f0f6fb":t.side==="qiz"?"#f9f0fb":"#fffbf0",
                          display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <div>
                            <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:800}}>{t.label}</div>
                            <div style={{fontSize:9,color:"#999",marginTop:1}}>{t.side==="oglan"?"Oğlan":"Qız"} · {t.cap} nəfər</div>
                          </div>
                          <div style={{textAlign:"right"}}>
                            <div style={{fontSize:20,fontWeight:800,color:allIn?"#48bb78":ac>0?"#f6ad55":"#ddd",lineHeight:1}}>{ac}</div>
                            <div style={{fontSize:9,color:"#aaa"}}>/ {tg.length} gəldi</div>
                          </div>
                        </div>
                        <div style={{padding:"4px 0"}}>
                          {tg.length===0&&<div style={{padding:"10px 14px",fontSize:11,color:"#ccc",textAlign:"center"}}>Boş masa</div>}
                          {tg.map(function(g){
                            var isA=!!arrived[g.id];
                            return (
                              <div key={g.id} onClick={function(){setArrived(function(p){var n=Object.assign({},p);if(n[g.id])delete n[g.id];else n[g.id]=true;return n;})}}
                                style={{display:"flex",alignItems:"center",padding:"6px 12px",gap:7,cursor:"pointer",
                                  background:isA?"#f0fff4":"transparent",borderBottom:"1px solid #f8f8f8",transition:"background .12s"}}>
                                <div style={{width:18,height:18,borderRadius:"50%",border:"1.5px solid "+(isA?"#48bb78":"#ddd"),
                                  background:isA?"#48bb78":"#fff",display:"flex",alignItems:"center",justifyContent:"center",
                                  flexShrink:0,fontSize:10,color:"#fff",fontWeight:800,transition:"all .15s"}}>
                                  {isA?"✓":""}
                                </div>
                                <div style={{width:5,height:5,borderRadius:"50%",background:g.side==="oglan"?"#2a6f97":"#c2528b",flexShrink:0}} />
                                <div style={{flex:1,fontSize:11.5,fontFamily:"system-ui",fontWeight:isA?700:400,
                                  color:isA?"#276749":"#333"}}>{g.name}</div>
                                <span style={{fontSize:8,padding:"1px 6px",borderRadius:8,background:cCol(g.cat)+"15",
                                  color:cCol(g.cat),fontWeight:600,flexShrink:0}}>{g.cat}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT PANEL */}
        {selTable!==null&&selTD&&(
          <div className="right-panel" style={{width:260,background:"#fff",borderLeft:"1px solid #ece8e0",display:"flex",flexDirection:"column",flexShrink:0}}>
            <div style={{padding:"14px 16px",borderBottom:"1px solid #f0ede5",background:"#fafaf7"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div>
                  {editTableId===selTable?(
                    <input value={etf.label} onChange={function(e){setEtf(Object.assign({},etf,{label:e.target.value}));}}
                      style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:800,border:"1.5px solid #ddd",borderRadius:8,padding:"4px 8px",width:90}} />
                  ):(
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:800,color:"#1a1a1a"}}>{selTD.label}</div>
                  )}
                  <div style={{fontSize:10.5,color:"#aaa",marginTop:2,fontWeight:600}}>{selTD.side==="oglan"?"🔵 Oğlan tərəfi":selTD.side==="qiz"?"🩷 Qız tərəfi":"⭐ Xüsusi"}</div>
                </div>
                <button onClick={function(){setSelTable(null);setEditTableId(null);setConfirmDel(null);}} style={{background:"#f0f0ee",border:"none",borderRadius:8,fontSize:13,cursor:"pointer",color:"#aaa",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
              </div>
              <div style={{display:"flex",gap:6}}>
                {editTableId===selTable?(
                  <>
                    <select value={etf.cap} onChange={function(e){setEtf(Object.assign({},etf,{cap:parseInt(e.target.value)}));}}
                      style={{flex:1,padding:"6px 8px",border:"1.5px solid #e0ddd5",borderRadius:7,fontSize:11}}>
                      {[8,10,12,14,18,20].map(function(n){return <option key={n} value={n}>{n} nəfər</option>;})}
                    </select>
                    <select value={etf.side} onChange={function(e){setEtf(Object.assign({},etf,{side:e.target.value}));}}
                      style={{flex:1,padding:"6px 8px",border:"1.5px solid #e0ddd5",borderRadius:7,fontSize:11}}>
                      <option value="oglan">Oğlan</option><option value="qiz">Qız</option><option value="special">Xüsusi</option>
                    </select>
                    <button onClick={function(){setTables(function(p){return p.map(function(t){return t.id===editTableId?Object.assign({},t,{label:etf.label,cap:etf.cap,side:etf.side}):t;});});setEditTableId(null);}}
                      style={{padding:"6px 11px",fontSize:12,background:"#2a6f97",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontWeight:700}}>✓</button>
                    <button onClick={function(){setEditTableId(null);}} style={{padding:"6px 9px",fontSize:12,background:"#f0f0f0",border:"none",borderRadius:7,cursor:"pointer"}}>✕</button>
                  </>
                ):confirmDel===selTable?(
                  <div style={{display:"flex",gap:6,alignItems:"center",flex:1}}>
                    <span style={{fontSize:11,color:"#e53e3e",fontWeight:700}}>Silmək?</span>
                    <button onClick={function(){deleteTable(selTD.id);}} style={{padding:"6px 12px",fontSize:11,background:"#e53e3e",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontWeight:700}}>Bəli</button>
                    <button onClick={function(){setConfirmDel(null);}} style={{padding:"6px 10px",fontSize:11,background:"#f0f0f0",border:"none",borderRadius:7,cursor:"pointer"}}>Xeyr</button>
                  </div>
                ):(
                  <>
                    <button onClick={function(){setEditTableId(selTable);setEtf({label:selTD.label,cap:selTD.cap,side:selTD.side});}}
                      style={{flex:1,padding:"7px 0",fontSize:11,background:"#f0f7ff",color:"#2a6f97",border:"1.5px solid #d0e3f0",borderRadius:8,cursor:"pointer",fontWeight:700}}>✎ Düzəlt</button>
                    <button onClick={function(){setConfirmDel(selTable);}}
                      style={{flex:1,padding:"7px 0",fontSize:11,background:"#fff5f5",color:"#e53e3e",border:"1.5px solid #fdd",borderRadius:8,cursor:"pointer",fontWeight:700}}>🗑 Sil</button>
                  </>
                )}
              </div>
            </div>
            {selTD.cap>0&&(
              <>
                <div style={{padding:"12px 16px",borderBottom:"1px solid #f0ede5"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                    <span style={{fontSize:11,color:"#aaa",fontWeight:600}}>Tutum</span>
                    <span style={{fontSize:13,fontWeight:800,color:selG.length>=selTD.cap?"#e53e3e":"#1a1a1a"}}>{selG.length} / {selTD.cap}</span>
                  </div>
                  <div style={{height:6,background:"#f0ede5",borderRadius:999,overflow:"hidden"}}>
                    <div style={{width:(selG.length/selTD.cap*100)+"%",height:"100%",
                      background:selG.length>=selTD.cap?"#e53e3e":selG.length>0?"#48bb78":"#e0ddd5",borderRadius:999,transition:"width .3s"}} />
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:10.5}}>
                    <span style={{color:"#48bb78",fontWeight:600}}>✓ {selG.length} oturub</span>
                    <span style={{color:"#f6ad55",fontWeight:600}}>{selTD.cap-selG.length} boş</span>
                  </div>
                </div>
                {selG.length>0&&(
                  <div style={{padding:"8px 16px",borderBottom:"1px solid #f0ede5",display:"flex",gap:4,flexWrap:"wrap"}}>
                    {Object.entries(selCatBreak).map(function(entry){
                      return <span key={entry[0]} style={{fontSize:9.5,padding:"3px 8px",borderRadius:999,background:cCol(entry[0])+"15",color:cCol(entry[0]),fontWeight:700,border:"1px solid "+cCol(entry[0])+"20"}}>{entry[0]}: {entry[1]}</span>;
                    })}
                  </div>
                )}
                <div style={{padding:"7px 16px",fontSize:10,color:"#c0bdb5",fontWeight:700,borderBottom:"1px solid #f0ede5",letterSpacing:0.8}}>QONAQLAR</div>
                <div style={{flex:1,overflowY:"auto"}}>
                  {selG.length===0?(
                    <div style={{padding:24,textAlign:"center",color:"#ccc",fontSize:12}}>Boş masa<br/><span style={{fontSize:10}}>Soldan qonaq sürüşdür</span></div>
                  ):selG.map(function(g){
                    return (
                      <div key={g.id} style={{display:"flex",alignItems:"center",padding:"9px 16px",gap:7,borderBottom:"1px solid #f8f5f0"}}>
                        <div style={{width:6,height:6,borderRadius:"50%",background:g.side==="oglan"?"#2a6f97":"#c2528b"}} />
                        <div style={{flex:1,fontSize:12,fontWeight:500}}>{g.name}</div>
                        <span style={{fontSize:9,padding:"2px 7px",borderRadius:999,background:cCol(g.cat)+"15",color:cCol(g.cat),fontWeight:700}}>{g.cat}</span>
                        <button onClick={function(){setGuests(function(p){return p.map(function(x){return x.id===g.id?Object.assign({},x,{tableId:null}):x;});});}}
                          style={{background:"#fff5f5",border:"none",color:"#e53e3e",cursor:"pointer",fontSize:11,padding:"3px 7px",borderRadius:6}}>✕</button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* MOBILE BOTTOM NAV */}
      <div className="mob-bottom-nav" style={{display:"none"}}>
        {[["hall","🏛","Zal"],["list","📋","Siyahı"],["stats","📊","Stat"],["live","🟢","Live"]].map(function(item){
          var active=view===item[0];
          return (
            <button key={item[0]} onClick={function(){setView(item[0]);setShowLeftPanel(false);}} style={{
              flex:1,padding:"10px 0 6px",background:"transparent",border:"none",cursor:"pointer",minHeight:0,
              display:"flex",flexDirection:"column",alignItems:"center",gap:3,
              color:active?"#b8860b":"#555",
              borderTop:active?"2px solid #b8860b":"2px solid transparent",
              transition:"color .15s,border-top .15s"
            }}>
              <span style={{fontSize:22,lineHeight:1}}>{item[1]}</span>
              <span style={{fontSize:9.5,fontWeight:active?700:500,letterSpacing:0.3}}>{item[2]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
