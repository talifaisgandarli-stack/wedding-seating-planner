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
    <div style={{background:props.a+"10",border:"1px solid "+props.a+"25",borderRadius:10,padding:"10px 14px",textAlign:"center",minWidth:72}}>
      <div style={{fontSize:22,fontWeight:800,color:props.a,fontFamily:"'Playfair Display',serif"}}>{props.v}</div>
      <div style={{fontSize:9,color:"#8a8a8a",marginTop:1,fontWeight:600,letterSpacing:0.4,textTransform:"uppercase"}}>{props.l}</div>
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

function lsGet() { try { return JSON.parse(localStorage.getItem(LS_KEY)||"{}"); } catch(e){ return {}; } }
function lsSet(d) { try { localStorage.setItem(LS_KEY, JSON.stringify(d)); } catch(e){} }

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
  var [weddingInitialized, setWeddingInitialized] = useState(false);

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

    var data = { step:step, guests:guests, tables:tables };

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
  }, [step, guests, tables, weddingId, mode, weddingInitialized]);

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

  var deleteTable = useCallback(function(tid) {
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
    <div style={{fontFamily:"'Playfair Display',Georgia,serif",minHeight:"100vh",background:"#f4f2ed",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{width:"100%",maxWidth:460}}>
        {/* Header */}
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{fontSize:10,letterSpacing:5,color:"#b8860b",fontWeight:700,fontFamily:"system-ui",marginBottom:8}}>MAKET GALLERY HALL · BAKI</div>
          <h1 style={{fontSize:34,fontWeight:400,color:"#1a1a1a",margin:"0 0 12px"}}>Oturma Planı</h1>
          <div style={{width:50,height:1,background:"#b8860b",margin:"0 auto"}} />
        </div>

        {/* Firebase status banner */}
        {!FB_READY && (
          <div style={{background:"#fff8e1",border:"1px solid #ffe082",borderRadius:10,padding:"12px 16px",marginBottom:20,fontFamily:"system-ui"}}>
            <div style={{fontSize:12,fontWeight:700,color:"#f57c00",marginBottom:4}}>⚠ Firebase konfiqurasiya edilməyib</div>
            <div style={{fontSize:11,color:"#795548",lineHeight:1.5}}>
              Real-vaxt sinxronizasiya üçün <b>src/firebaseConfig.js</b> faylını doldurun.<br/>
              İndi yalnız <b>offline rejim</b> işləyir (yalnız bu cihazda saxlanır).
            </div>
          </div>
        )}

        {/* Create card */}
        <div style={{background:"#fff",borderRadius:14,border:"1px solid #e8e4db",padding:28,marginBottom:16,boxShadow:"0 2px 12px rgba(0,0,0,.04)"}}>
          <div style={{fontSize:12,color:"#888",fontFamily:"system-ui",marginBottom:12}}>Yeni toy planı yarat</div>
          <button
            onClick={handleCreate}
            disabled={loading}
            style={{width:"100%",padding:"15px 0",background:"#1a1a1a",color:"#fff",border:"none",borderRadius:10,
              fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"system-ui",letterSpacing:1.5,
              opacity:loading?0.6:1}}
          >
            {loading ? "Yaradılır..." : "🆕 Yeni Toy Yarat"}
          </button>
        </div>

        {/* Divider */}
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16,fontFamily:"system-ui",fontSize:11,color:"#bbb"}}>
          <div style={{flex:1,height:1,background:"#e0ddd5"}} />
          <span>ya da</span>
          <div style={{flex:1,height:1,background:"#e0ddd5"}} />
        </div>

        {/* Join card */}
        <div style={{background:"#fff",borderRadius:14,border:"1px solid #e8e4db",padding:28,boxShadow:"0 2px 12px rgba(0,0,0,.04)"}}>
          <div style={{fontSize:12,color:"#888",fontFamily:"system-ui",marginBottom:12}}>Mövcud toya qoşul</div>
          <div style={{display:"flex",gap:8}}>
            <input
              value={joinCode}
              onChange={function(e){setJoinCode(e.target.value.toUpperCase());setJoinError("");}}
              onKeyDown={function(e){if(e.key==="Enter")handleJoin();}}
              placeholder="TOY KODU"
              maxLength={6}
              style={{flex:1,padding:"13px 14px",border:"2px solid "+(joinError?"#e53e3e":"#ddd"),borderRadius:10,
                fontSize:18,fontWeight:800,letterSpacing:6,textAlign:"center",outline:"none",fontFamily:"system-ui",
                textTransform:"uppercase",color:"#1a1a1a"}}
            />
            <button
              onClick={handleJoin}
              disabled={loading||!joinCode.trim()}
              style={{padding:"13px 20px",background:"#2a6f97",color:"#fff",border:"none",borderRadius:10,
                fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"system-ui",opacity:(loading||!joinCode.trim())?0.5:1}}
            >
              {loading ? "..." : "Qoşul →"}
            </button>
          </div>
          {joinError && (
            <div style={{color:"#e53e3e",fontSize:11.5,marginTop:10,padding:"8px 12px",background:"#fff5f5",
              borderRadius:6,border:"1px solid #fdd",fontFamily:"system-ui"}}>⚠ {joinError}</div>
          )}
          {!FB_READY && (
            <div style={{color:"#aaa",fontSize:10.5,marginTop:10,fontFamily:"system-ui"}}>
              Qoşulmaq üçün Firebase tələb olunur
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ════════════════════════════════════════
  // STEP 0 — CSV Input
  // ════════════════════════════════════════
  if (step === 0) return (
    <div style={{fontFamily:"'Playfair Display',Georgia,serif",maxWidth:640,margin:"0 auto",padding:28}}>
      {/* Wedding code bar */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
        background:"#1a1a1a",borderRadius:10,padding:"10px 16px",marginBottom:20}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontFamily:"system-ui",fontSize:10,color:"#666",letterSpacing:1}}>TOY KODU</span>
          <span style={{fontFamily:"monospace",fontSize:18,fontWeight:800,color:"#b8860b",letterSpacing:4}}>{weddingId}</span>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {fbDb && onlineCount && <span style={{fontSize:10,color:"#48bb78",fontFamily:"system-ui"}}>● {onlineCount} onlayn</span>}
          <button onClick={handleCopy} style={s(copied?"#48bb78":"#333",copied?"#fff":"#aaa",{padding:"5px 12px",fontSize:10})}>
            {copied?"✓ Kopyalandı":"📋 Kodu kopyala"}
          </button>
          <button onClick={handleLeave} style={s("#333","#666",{padding:"5px 10px",fontSize:10})}>✕ Çıx</button>
        </div>
      </div>

      <div style={{textAlign:"center",marginBottom:28}}>
        <div style={{fontSize:10,letterSpacing:5,color:"#b8860b",fontWeight:700,fontFamily:"system-ui"}}>MAKET GALLERY HALL · BAKI</div>
        <h1 style={{fontSize:30,fontWeight:400,color:"#1a1a1a",margin:"8px 0 0"}}>Oturma Planı</h1>
        <div style={{width:50,height:1,background:"#b8860b",margin:"14px auto"}} />
        <p style={{color:"#888",fontSize:13,fontFamily:"system-ui"}}>Qonaq siyahınızı CSV formatında daxil edin</p>
      </div>

      <div style={{background:"#fafaf7",border:"1px solid #e8e4db",borderRadius:12,padding:22}}>
        <div style={{fontSize:11,color:"#aaa",marginBottom:6,fontFamily:"system-ui"}}>Format: <b>Ad Soyad, Tərəf (oğlan/qız), Kateqoriya</b></div>
        <textarea
          value={csv}
          onChange={function(e){setCsv(e.target.value);setCsvError("");}}
          rows={14}
          placeholder={"Ad Soyad, Tərəf, Kateqoriya\nƏli Həsənov, oğlan, Ailə\nLeyla Həsənova, qız, Ailə\n..."}
          style={{width:"100%",border:"1px solid #ddd",borderRadius:8,padding:14,fontSize:12.5,
            fontFamily:"monospace",resize:"vertical",outline:"none",background:"#fff",boxSizing:"border-box"}}
        />
        {csvError && (
          <div style={{color:"#e53e3e",fontSize:11.5,marginTop:8,padding:"8px 12px",background:"#fff5f5",
            borderRadius:6,border:"1px solid #fdd",fontFamily:"system-ui"}}>⚠ {csvError}</div>
        )}
        <button
          onClick={function(){
            var trimmed=csv.trim();
            if(!trimmed){setCsvError("Siyahı boşdur.");return;}
            var p=parseCSV(trimmed);
            if(!p.length){setCsvError("Format düzgün deyil. Nümunəyə baxın.");return;}
            setGuests(p); setStep(1); setCsvError("");
          }}
          style={Object.assign({},s("#1a1a1a","#fff"),{width:"100%",marginTop:14,padding:"13px 0",letterSpacing:1.5})}
        >
          SİYAHINI YÜKLƏ →
        </button>
        {guests.length > 0 && (
          <button
            onClick={function(){setStep(guests.some(function(g){return g.tableId!==null;})?2:1);}}
            style={Object.assign({},s("#f0f0f0","#444"),{width:"100%",marginTop:8,border:"1px solid #ddd"})}
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
    <div style={{fontFamily:"'Playfair Display',Georgia,serif",maxWidth:700,margin:"0 auto",padding:24}}>
      {/* Code bar */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
        background:"#1a1a1a",borderRadius:10,padding:"8px 16px",marginBottom:20}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontFamily:"system-ui",fontSize:10,color:"#666",letterSpacing:1}}>TOY KODU</span>
          <span style={{fontFamily:"monospace",fontSize:16,fontWeight:800,color:"#b8860b",letterSpacing:4}}>{weddingId}</span>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          {fbDb && onlineCount && <span style={{fontSize:10,color:"#48bb78",fontFamily:"system-ui"}}>● {onlineCount}</span>}
          <button onClick={handleCopy} style={s(copied?"#48bb78":"#333",copied?"#fff":"#aaa",{padding:"4px 10px",fontSize:10})}>
            {copied?"✓":"📋"}
          </button>
        </div>
      </div>

      <div style={{textAlign:"center",marginBottom:20}}>
        <h1 style={{fontSize:24,fontWeight:400}}>Siyahını Təsdiqləyin</h1>
        <div style={{width:50,height:1,background:"#b8860b",margin:"10px auto 8px"}} />
        <p style={{color:"#888",fontSize:12,fontFamily:"system-ui"}}>{guests.length} qonaq · düzəliş edin, sonra təsdiqləyin</p>
      </div>

      <div style={{display:"flex",gap:8,marginBottom:14,justifyContent:"center",flexWrap:"wrap"}}>
        <Badge l="Oğlan" v={guests.filter(function(g){return g.side==="oglan";}).length} a="#2a6f97" />
        <Badge l="Qız" v={guests.filter(function(g){return g.side==="qiz";}).length} a="#c2528b" />
        <Badge l="Cəmi" v={guests.length} a="#b8860b" />
      </div>

      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14,justifyContent:"center"}}>
        {cats.map(function(c){var n=guests.filter(function(g){return g.cat===c;}).length;
          return <span key={c} style={{fontSize:11,padding:"4px 10px",borderRadius:20,background:cCol(c)+"18",color:cCol(c),fontWeight:600,fontFamily:"system-ui"}}>{c}: {n}</span>;})}
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

      <div style={{background:"#fff",border:"1px solid #e5e2da",borderRadius:10,overflow:"hidden"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",borderBottom:"1px solid #eee"}}>
          <span style={{fontSize:11,fontWeight:700,color:"#999",fontFamily:"system-ui"}}>QONAQ SİYAHISI</span>
          <button onClick={function(){setShowAdd(true);}} style={{fontSize:11,background:"none",border:"1px solid #ddd",borderRadius:6,padding:"3px 10px",cursor:"pointer",color:"#555"}}>+ Əlavə et</button>
        </div>
        <div style={{maxHeight:380,overflowY:"auto"}}>
          {guests.map(function(g,i){
            return (
              <div key={g.id} style={{display:"flex",alignItems:"center",padding:"9px 14px",borderBottom:"1px solid #f5f5f3",gap:8,background:i%2?"#fafaf7":"#fff"}}>
                {editing===g.id ? (
                  <>
                    <input value={ef.name} onChange={function(e){setEf(Object.assign({},ef,{name:e.target.value}));}}
                      style={{flex:2,padding:"5px 8px",border:"1px solid #ccc",borderRadius:4,fontSize:12,outline:"none"}} />
                    <select value={ef.side} onChange={function(e){setEf(Object.assign({},ef,{side:e.target.value}));}}>
                      <option value="oglan">Oğlan</option><option value="qiz">Qız</option>
                    </select>
                    <input value={ef.cat} onChange={function(e){setEf(Object.assign({},ef,{cat:e.target.value}));}}
                      style={{flex:1,padding:"5px 8px",border:"1px solid #ccc",borderRadius:4,fontSize:12,outline:"none"}} />
                    <button onClick={function(){setGuests(function(p){return p.map(function(x){return x.id===editing?Object.assign({},x,ef):x;});});setEditing(null);}}
                      style={{background:"#2a6f97",color:"#fff",border:"none",borderRadius:4,padding:"5px 10px",cursor:"pointer",fontSize:11}}>✓</button>
                    <button onClick={function(){setEditing(null);}} style={{background:"#eee",border:"none",borderRadius:4,padding:"5px 8px",cursor:"pointer",fontSize:11}}>✕</button>
                  </>
                ) : (
                  <>
                    <div style={{width:7,height:7,borderRadius:"50%",background:g.side==="oglan"?"#2a6f97":"#c2528b",flexShrink:0}} />
                    <div style={{flex:2,fontSize:12.5,fontFamily:"system-ui"}}>{g.name}</div>
                    <span style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:cCol(g.cat)+"15",color:cCol(g.cat),fontWeight:600,fontFamily:"system-ui"}}>{g.cat}</span>
                    <div style={{width:50,fontSize:10,color:"#aaa",fontFamily:"system-ui",textAlign:"right"}}>{g.side==="oglan"?"Oğlan":"Qız"}</div>
                    <button onClick={function(){setEditing(g.id);setEf({name:g.name,side:g.side,cat:g.cat});}}
                      style={{background:"none",border:"none",cursor:"pointer",fontSize:13,padding:"1px 5px",color:"#888"}}>✎</button>
                    <button onClick={function(){setGuests(function(p){return p.filter(function(x){return x.id!==g.id;});});}}
                      style={{background:"none",border:"none",cursor:"pointer",fontSize:13,padding:"1px 5px",color:"#e53e3e"}}>✕</button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{display:"flex",gap:10,marginTop:16}}>
        <button onClick={function(){setStep(0);}} style={Object.assign({},s("#fff","#555"),{flex:1,border:"1px solid #ddd"})}>← Geri</button>
        <button onClick={function(){setStep(2);}} style={Object.assign({},s("#1a1a1a","#fff"),{flex:2,letterSpacing:1})}>TƏSDİQLƏ →</button>
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
        onClick={function(e){e.stopPropagation();if(!addMode)setSelTable(t.id);}}
        onDragOver={function(e){e.preventDefault();setDropT(t.id);}}
        onDragLeave={function(){setDropT(null);}}
        onDrop={function(e){e.preventDefault();handleDrop(t.id);}}
        style={{position:"absolute",left:t.x+"%",top:t.y+"%",
          width:t.r*2,height:t.r*2,marginLeft:-t.r,marginTop:-t.r,
          borderRadius:"50%",background:bg,border:"2.5px solid "+border,
          boxShadow:shadow,display:"flex",flexDirection:"column",
          alignItems:"center",justifyContent:"center",cursor:addMode?"default":"pointer",
          transition:"box-shadow .2s",zIndex:sel?5:1,userSelect:"none",overflow:"visible"}}>
        <div style={{fontSize:t.r>28?13:10.5,fontWeight:800,color:"#333",lineHeight:1}}>{t.label}</div>
        {t.cap>0&&<div style={{fontSize:t.r>28?10:8.5,color:full?"#d33":"#666",marginTop:2,fontWeight:700}}>{asg.length}/{t.cap}</div>}
        {pct>0&&pct<1&&(
          <div style={{position:"absolute",bottom:3,width:"55%",height:3,borderRadius:2,background:"#e0e0e0",overflow:"hidden"}}>
            <div style={{width:(pct*100)+"%",height:"100%",background:border,borderRadius:2}} />
          </div>
        )}
        {asg.map(function(g,i){
          var angle = (i/asg.length)*2*Math.PI - Math.PI/2;
          var dist = t.r+14;
          var cx = Math.cos(angle)*dist;
          var cy = Math.sin(angle)*dist;
          var nm = g.name.split(" ")[0];
          if(nm.length>9) nm=nm.substr(0,8)+"…";
          return (
            <div key={g.id} style={{
              position:"absolute",left:"50%",top:"50%",
              transform:"translate(calc(-50% + "+cx+"px), calc(-50% + "+cy+"px))",
              fontSize:6.5,fontWeight:700,
              color:g.side==="oglan"?"#1a5a8a":"#a03070",
              whiteSpace:"nowrap",pointerEvents:"none",lineHeight:1,
              textShadow:"0 0 3px #fff,0 0 3px #fff,0 0 3px #fff",
              zIndex:10,
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

  return (
    <div style={{fontFamily:"system-ui,sans-serif",height:"100vh",display:"flex",flexDirection:"column",background:"#f4f2ed",overflow:"hidden"}}>
      {/* TOP BAR */}
      <div style={{background:"#141414",color:"#fff",padding:"6px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,flexWrap:"wrap",gap:6}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontFamily:"'Playfair Display',serif",fontSize:14}}>Maket Gallery Hall</span>
          {/* Wedding code chip */}
          <div style={{display:"flex",alignItems:"center",gap:6,background:"#2a2a2a",borderRadius:6,padding:"3px 10px"}}>
            <span style={{fontSize:9,color:"#666",letterSpacing:1}}>KOD</span>
            <span style={{fontFamily:"monospace",fontSize:13,fontWeight:800,color:"#b8860b",letterSpacing:3}}>{weddingId}</span>
            <button onClick={handleCopy} style={{background:"none",border:"none",cursor:"pointer",fontSize:11,color:copied?"#48bb78":"#555",padding:"0 2px"}}>
              {copied?"✓":"📋"}
            </button>
          </div>
          {fbDb && onlineCount && (
            <span style={{fontSize:10,color:"#48bb78",display:"flex",alignItems:"center",gap:3}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:"#48bb78",display:"inline-block"}} />
              {onlineCount} onlayn
            </span>
          )}
          <div style={{display:"flex",gap:2,background:"#2a2a2a",borderRadius:6,padding:2}}>
            {[["hall","Zal"],["list","Siyahı"],["stats","Stat"]].map(function(pair){
              return <button key={pair[0]} onClick={function(){setView(pair[0]);}} style={{
                padding:"4px 10px",fontSize:11,border:"none",borderRadius:5,cursor:"pointer",
                background:view===pair[0]?"#b8860b":"transparent",color:view===pair[0]?"#fff":"#888",fontWeight:view===pair[0]?700:400
              }}>{pair[1]}</button>;
            })}
          </div>
        </div>

        <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
          <span style={{fontSize:11,color:"#888"}}>
            <span style={{color:"#48bb78",fontWeight:700}}>{stats.assigned}</span>{" oturub · "}
            <span style={{color:"#f6ad55",fontWeight:700}}>{stats.unassigned}</span>{" boş"}
          </span>
          <button onClick={autoAssign} style={s("#2a6f97","#fff",{padding:"4px 10px",fontSize:11})}>⚡ Böl</button>
          <button onClick={function(){setGuests(function(p){return p.map(function(g){return Object.assign({},g,{tableId:null});});});}} style={s("#333","#aaa",{padding:"4px 10px",fontSize:11})}>↺</button>
          <button onClick={function(){setStep(0);}} style={s("#333","#aaa",{padding:"4px 10px",fontSize:11})}>📋 Siyahı əlavə et</button>
          <button onClick={function(){setStep(1);}} style={s("#333","#aaa",{padding:"4px 10px",fontSize:11})}>👥 Qonaqlar</button>
          {showResetConfirm ? (
            <span style={{display:"flex",gap:4,alignItems:"center"}}>
              <span style={{fontSize:10,color:"#f6ad55"}}>Əminsən?</span>
              <button onClick={handleLeave} style={s("#e53e3e","#fff",{padding:"4px 10px",fontSize:10})}>Bəli, çıx</button>
              <button onClick={function(){setShowResetConfirm(false);}} style={s("#333","#aaa",{padding:"4px 8px",fontSize:10})}>Xeyr</button>
            </span>
          ) : (
            <button onClick={function(){setShowResetConfirm(true);}} style={s("#1a1a1a","#555",{padding:"4px 10px",fontSize:10,border:"1px solid #333"})}>✕ Çıxış</button>
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

      <div style={{flex:1,display:"flex",overflow:"hidden"}}>
        {/* LEFT PANEL */}
        <div style={{width:220,background:"#fff",borderRight:"1px solid #e0ddd5",display:"flex",flexDirection:"column",flexShrink:0}}>
          <div style={{padding:"10px 12px",borderBottom:"1px solid #eee"}}>
            <input placeholder="Axtar..." value={search} onChange={function(e){setSearch(e.target.value);}}
              style={{width:"100%",padding:"7px 10px",border:"1px solid #ddd",borderRadius:6,fontSize:11.5,outline:"none",boxSizing:"border-box"}} />
            <div style={{display:"flex",gap:3,marginTop:6}}>
              {[["all","Hamısı"],["oglan","Oğlan"],["qiz","Qız"]].map(function(p){
                return <button key={p[0]} onClick={function(){setFSide(p[0]);}} style={{
                  flex:1,padding:"4px 0",fontSize:10,border:"none",borderRadius:4,cursor:"pointer",
                  background:fSide===p[0]?"#1a1a1a":"#f0f0f0",color:fSide===p[0]?"#fff":"#777"}}>{p[1]}</button>;
              })}
            </div>
            {cats.length>0&&(
              <div style={{display:"flex",gap:3,marginTop:5,flexWrap:"wrap",maxHeight:52,overflowY:"auto",paddingBottom:2}}>
                <button onClick={function(){setFCat("all");}} style={{padding:"3px 7px",fontSize:9,border:"none",borderRadius:10,cursor:"pointer",flexShrink:0,
                  background:fCat==="all"?"#1a1a1a":"#f0f0f0",color:fCat==="all"?"#fff":"#888"}}>Hamısı</button>
                {cats.map(function(c){
                  return <button key={c} onClick={function(){setFCat(c);}} style={{padding:"3px 7px",fontSize:9,border:"none",borderRadius:10,cursor:"pointer",flexShrink:0,
                    background:fCat===c?cCol(c):cCol(c)+"12",color:fCat===c?"#fff":cCol(c),fontWeight:600}}>{c}</button>;
                })}
              </div>
            )}
          </div>
          <div style={{padding:"5px 12px",fontSize:10,color:"#aaa",borderBottom:"1px solid #f5f5f5",fontWeight:600}}>
            Yerləşdirilməmiş: {filtUn.length}
          </div>
          <div style={{flex:1,overflowY:"auto"}}>
            {filtUn.map(function(g){
              return (
                <div key={g.id} draggable onDragStart={function(){setDragId(g.id);}} onDragEnd={function(){setDragId(null);setDropT(null);}}
                  style={{display:"flex",alignItems:"center",gap:6,padding:"7px 12px",cursor:"grab",
                    borderBottom:"1px solid #f8f8f6",background:dragId===g.id?"#f0f7ff":"transparent"}}>
                  <div style={{width:5,height:5,borderRadius:"50%",background:g.side==="oglan"?"#2a6f97":"#c2528b",flexShrink:0}} />
                  <div style={{flex:1,fontSize:11.5,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{g.name}</div>
                  <span style={{fontSize:8.5,padding:"1px 6px",borderRadius:8,background:cCol(g.cat)+"15",color:cCol(g.cat),fontWeight:600,flexShrink:0}}>{g.cat}</span>
                </div>
              );
            })}
            {filtUn.length===0&&<div style={{padding:20,textAlign:"center",color:"#ccc",fontSize:11}}>
              {stats.unassigned===0?"Hamısı yerləşib! 🎉":"Nəticə yoxdur"}</div>}
          </div>
        </div>

        {/* CENTER */}
        <div style={{flex:1,overflow:"auto"}}>
          {view==="hall"&&(
            <div style={{padding:"14px 20px",minHeight:"100%"}}>
              <div style={{display:"flex",justifyContent:"center",marginBottom:10}}>
                <button onClick={function(){setAddMode(!addMode);setSelTable(null);}}
                  style={Object.assign({},s(addMode?"#e53e3e":"#48bb78","#fff"),{padding:"6px 16px",fontSize:11,borderRadius:20})}>
                  {addMode?"✕ Ləğv et":"+ Yeni Masa"}
                </button>
              </div>
              <div ref={hallRef} onClick={handleHallClick}
                style={{position:"relative",maxWidth:780,margin:"0 auto",aspectRatio:"1.5/1",
                  border:addMode?"2px dashed #48bb78":"1px solid #d8d5ce",
                  borderRadius:14,background:addMode?"#f0fff4":"#f7f5f1",overflow:"visible",minHeight:400,
                  cursor:addMode?"crosshair":"default",transition:"border .2s,background .2s",
                  boxShadow:addMode?"none":"inset 0 1px 4px rgba(0,0,0,.04)"}}>
                {/* Section tinted backgrounds */}
                <div style={{position:"absolute",left:"3%",right:"5%",top:"2%",height:"39%",background:"rgba(42,111,151,0.05)",borderRadius:8,zIndex:0,pointerEvents:"none"}} />
                <div style={{position:"absolute",left:"3%",right:"5%",top:"44%",height:"54%",background:"rgba(194,82,139,0.05)",borderRadius:8,zIndex:0,pointerEvents:"none"}} />
                {/* Hall title */}
                <div style={{position:"absolute",top:7,left:"50%",transform:"translateX(-50%)",fontSize:10,letterSpacing:3,color:"#b8860b",fontWeight:700,zIndex:10,whiteSpace:"nowrap"}}>MAKET GALLERY HALL</div>
                {/* Section labels - left aligned */}
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
                {/* Section divider */}
                <div style={{position:"absolute",left:"6%",right:"5%",top:"43%",height:1,background:"linear-gradient(90deg,transparent,#c8c4bc 15%,#c8c4bc 85%,transparent)",zIndex:2,pointerEvents:"none"}} />
                {/* Stage */}
                <div style={{position:"absolute",right:0,top:"22%",height:"50%",width:24,background:"linear-gradient(180deg,#2a6f97,#1a4f77)",borderRadius:"6px 0 0 6px",display:"flex",alignItems:"center",justifyContent:"center",zIndex:10,boxShadow:"-2px 0 8px rgba(26,79,119,.2)"}}>
                  <span style={{writingMode:"vertical-rl",color:"#fff",fontSize:9,fontWeight:800,letterSpacing:4}}>SƏHNƏ</span>
                </div>
                {/* GİRİŞ - bottom center, away from tables */}
                <div style={{position:"absolute",left:"50%",transform:"translateX(-50%)",bottom:8,display:"flex",alignItems:"center",gap:5,background:"#3aad6a",color:"#fff",padding:"4px 16px 4px 12px",borderRadius:16,fontSize:9,fontWeight:800,zIndex:10,letterSpacing:1,boxShadow:"0 2px 10px rgba(58,173,106,.4)",whiteSpace:"nowrap"}}>
                  <span>▲</span><span>GİRİŞ</span>
                </div>
                {addMode&&<div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",fontSize:13,color:"#48bb78",fontWeight:700,opacity:0.4,pointerEvents:"none",zIndex:0,textAlign:"center"}}>
                  Masanı yerləşdirmək üçün<br/>klik et</div>}
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
          )}
          {view==="list"&&(
            <div style={{padding:20,maxWidth:700,margin:"0 auto"}}>
              <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:18,marginBottom:14}}>Bütün Qonaqlar</h2>
              <div style={{background:"#fff",borderRadius:10,border:"1px solid #e0ddd5",overflow:"hidden"}}>
                {guests.map(function(g,i){var t=tables.find(function(t){return t.id===g.tableId;});
                  return <div key={g.id} style={{display:"flex",alignItems:"center",padding:"9px 14px",gap:8,borderBottom:"1px solid #f5f5f3",background:i%2?"#fafaf7":"#fff"}}>
                    <div style={{width:6,height:6,borderRadius:"50%",background:g.side==="oglan"?"#2a6f97":"#c2528b"}} />
                    <div style={{flex:2,fontSize:12.5}}>{g.name}</div>
                    <span style={{fontSize:9,padding:"2px 8px",borderRadius:10,background:cCol(g.cat)+"15",color:cCol(g.cat),fontWeight:600}}>{g.cat}</span>
                    <div style={{width:45,fontSize:10.5,color:"#aaa",textAlign:"right"}}>{g.side==="oglan"?"Oğlan":"Qız"}</div>
                    <div style={{width:45,fontSize:11,fontWeight:700,color:t?"#2a6f97":"#ddd",textAlign:"right"}}>{t?t.label:"—"}</div>
                  </div>;})}
              </div>
            </div>
          )}
          {view==="stats"&&(
            <div style={{padding:20,maxWidth:600,margin:"0 auto"}}>
              <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:18,marginBottom:16}}>Statistika</h2>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:20}}>
                <Badge l="Qonaq" v={stats.total} a="#b8860b" />
                <Badge l="Tutum" v={stats.cap} a="#555" />
                <Badge l="Boş yer" v={Math.max(0,stats.cap-stats.total)} a={stats.cap>=stats.total?"#48bb78":"#e53e3e"} />
              </div>
              <h3 style={{fontSize:13,fontWeight:700,marginBottom:8}}>Kateqoriya üzrə</h3>
              <div style={{background:"#fff",borderRadius:10,border:"1px solid #e0ddd5",overflow:"hidden",marginBottom:20}}>
                {cats.map(function(c){var cg=guests.filter(function(g){return g.cat===c;});var seated=cg.filter(function(g){return g.tableId!==null;}).length;
                  return <div key={c} style={{display:"flex",alignItems:"center",padding:"10px 14px",borderBottom:"1px solid #f5f5f3",gap:10}}>
                    <span style={{width:10,height:10,borderRadius:"50%",background:cCol(c),flexShrink:0}} />
                    <div style={{flex:1,fontSize:12.5,fontWeight:600}}>{c}</div>
                    <div style={{width:100,height:7,background:"#eee",borderRadius:4,overflow:"hidden"}}>
                      <div style={{width:(cg.length>0?(seated/cg.length)*100:0)+"%",height:"100%",background:cCol(c),borderRadius:4}} />
                    </div>
                    <div style={{fontSize:11,fontWeight:700,width:50,textAlign:"right"}}>{seated}/{cg.length}</div>
                  </div>;})}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL */}
        {selTable!==null&&selTD&&(
          <div style={{width:255,background:"#fff",borderLeft:"1px solid #e0ddd5",display:"flex",flexDirection:"column",flexShrink:0}}>
            <div style={{padding:"14px 16px",borderBottom:"1px solid #eee"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  {editTableId===selTable?(
                    <input value={etf.label} onChange={function(e){setEtf(Object.assign({},etf,{label:e.target.value}));}}
                      style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:800,border:"1px solid #ddd",borderRadius:4,padding:"2px 6px",width:90,outline:"none"}} />
                  ):(
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:800}}>{selTD.label}</div>
                  )}
                  <div style={{fontSize:10,color:"#999",marginTop:1}}>{selTD.side==="oglan"?"Oğlan tərəfi":selTD.side==="qiz"?"Qız tərəfi":"Xüsusi"}</div>
                </div>
                <button onClick={function(){setSelTable(null);setEditTableId(null);setConfirmDel(null);}} style={{background:"none",border:"none",fontSize:16,cursor:"pointer",color:"#bbb"}}>✕</button>
              </div>
              <div style={{display:"flex",gap:6,marginTop:10}}>
                {editTableId===selTable?(
                  <>
                    <select value={etf.cap} onChange={function(e){setEtf(Object.assign({},etf,{cap:parseInt(e.target.value)}));}}>
                      {[8,10,12,14,18,20].map(function(n){return <option key={n} value={n}>{n} nəfər</option>;})}
                    </select>
                    <select value={etf.side} onChange={function(e){setEtf(Object.assign({},etf,{side:e.target.value}));}}>
                      <option value="oglan">Oğlan</option><option value="qiz">Qız</option><option value="special">Xüsusi</option>
                    </select>
                    <button onClick={function(){setTables(function(p){return p.map(function(t){return t.id===editTableId?Object.assign({},t,{label:etf.label,cap:etf.cap,side:etf.side}):t;});});setEditTableId(null);}}
                      style={{padding:"4px 10px",fontSize:10,background:"#2a6f97",color:"#fff",border:"none",borderRadius:4,cursor:"pointer",fontWeight:700}}>✓</button>
                    <button onClick={function(){setEditTableId(null);}} style={{padding:"4px 8px",fontSize:10,background:"#eee",border:"none",borderRadius:4,cursor:"pointer"}}>✕</button>
                  </>
                ):confirmDel===selTable?(
                  <div style={{display:"flex",gap:6,alignItems:"center",flex:1}}>
                    <span style={{fontSize:10,color:"#e53e3e",fontWeight:600}}>Silmək?</span>
                    <button onClick={function(){deleteTable(selTD.id);}} style={{padding:"4px 10px",fontSize:10,background:"#e53e3e",color:"#fff",border:"none",borderRadius:4,cursor:"pointer",fontWeight:700}}>Bəli</button>
                    <button onClick={function(){setConfirmDel(null);}} style={{padding:"4px 8px",fontSize:10,background:"#eee",border:"none",borderRadius:4,cursor:"pointer"}}>Xeyr</button>
                  </div>
                ):(
                  <>
                    <button onClick={function(){setEditTableId(selTable);setEtf({label:selTD.label,cap:selTD.cap,side:selTD.side});}}
                      style={{flex:1,padding:"6px 0",fontSize:10,background:"#f0f7ff",color:"#2a6f97",border:"1px solid #d0e3f0",borderRadius:5,cursor:"pointer",fontWeight:600}}>✎ Düzəlt</button>
                    <button onClick={function(){setConfirmDel(selTable);}}
                      style={{flex:1,padding:"6px 0",fontSize:10,background:"#fff5f5",color:"#e53e3e",border:"1px solid #fdd",borderRadius:5,cursor:"pointer",fontWeight:600}}>🗑 Sil</button>
                  </>
                )}
              </div>
            </div>
            {selTD.cap>0&&(
              <>
                <div style={{padding:"12px 16px",borderBottom:"1px solid #f5f5f5"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                    <span style={{fontSize:11,color:"#999"}}>Tutumluluq</span>
                    <span style={{fontSize:12,fontWeight:800}}>{selG.length} / {selTD.cap}</span>
                  </div>
                  <div style={{height:6,background:"#eee",borderRadius:3,overflow:"hidden"}}>
                    <div style={{width:(selG.length/selTD.cap*100)+"%",height:"100%",
                      background:selG.length>=selTD.cap?"#e53e3e":"#48bb78",borderRadius:3,transition:"width .3s"}} />
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:10}}>
                    <span style={{color:"#48bb78"}}>✓ {selG.length} oturub</span>
                    <span style={{color:"#f6ad55"}}>{selTD.cap-selG.length} boş</span>
                  </div>
                </div>
                {selG.length>0&&(
                  <div style={{padding:"8px 16px",borderBottom:"1px solid #f5f5f5",display:"flex",gap:4,flexWrap:"wrap"}}>
                    {Object.entries(selCatBreak).map(function(entry){
                      return <span key={entry[0]} style={{fontSize:9,padding:"2px 7px",borderRadius:8,background:cCol(entry[0])+"15",color:cCol(entry[0]),fontWeight:600}}>{entry[0]}: {entry[1]}</span>;
                    })}
                  </div>
                )}
                <div style={{padding:"6px 16px",fontSize:10,color:"#bbb",fontWeight:700,borderBottom:"1px solid #f5f5f5",letterSpacing:0.5}}>QONAQLAR</div>
                <div style={{flex:1,overflowY:"auto"}}>
                  {selG.length===0?(
                    <div style={{padding:20,textAlign:"center",color:"#ccc",fontSize:11}}>Boş masa — soldan sürüşdür</div>
                  ):selG.map(function(g){
                    return (
                      <div key={g.id} style={{display:"flex",alignItems:"center",padding:"8px 16px",gap:6,borderBottom:"1px solid #f8f8f6"}}>
                        <div style={{width:5,height:5,borderRadius:"50%",background:g.side==="oglan"?"#2a6f97":"#c2528b"}} />
                        <div style={{flex:1,fontSize:11.5}}>{g.name}</div>
                        <span style={{fontSize:8,padding:"1px 6px",borderRadius:8,background:cCol(g.cat)+"15",color:cCol(g.cat),fontWeight:600}}>{g.cat}</span>
                        <button onClick={function(){setGuests(function(p){return p.map(function(x){return x.id===g.id?Object.assign({},x,{tableId:null}):x;});});}}
                          style={{background:"none",border:"none",color:"#e53e3e",cursor:"pointer",fontSize:12,padding:"0 3px"}}>✕</button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
