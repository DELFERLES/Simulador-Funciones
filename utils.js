export function makeCanvas(canvas){
  const ctx = canvas.getContext("2d");
  let w=0,h=0;
  let mode = "sagital";
  const state = {
    domain: [], range: [], links: [], selected: null, connecting: null,
    numericExpr: null,
    seenConnectHint: false
  };

  function resize(){
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.floor(rect.width*devicePixelRatio);
    canvas.height = Math.floor(rect.height*devicePixelRatio);
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";
    ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
    w = rect.width; h = rect.height;
    layoutNodes();
    render();
  }

  function setMode(m){
    mode = m;
    layoutNodes();
    render();
  }

  function addDomain(node){
    state.domain.push({ ...node, x:0,y:0,r:22 });
    layoutNodes();
    render();
  }
  function addRange(node){
    state.range.push({ ...node, x:0,y:0,r:22 });
    layoutNodes();
    render();
  }
  function removeNodeById(id){
    // remove domain node(s) in-place
    for (let i = state.domain.length - 1; i >= 0; i--) {
      if (state.domain[i].id === id) state.domain.splice(i, 1);
    }
    // remove range node(s) in-place
    for (let i = state.range.length - 1; i >= 0; i--) {
      if (state.range[i].id === id) state.range.splice(i, 1);
    }
    // remove links referring to this id in-place
    for (let i = state.links.length - 1; i >= 0; i--) {
      if (state.links[i].from === id || state.links[i].to === id) state.links.splice(i, 1);
    }
  }

  function layoutNodes(){
    const leftX = 60;
    // Move the right column closer to the left, keeping a modest right margin.
    // Constrain it between leftX + 60 and leftX + 120, and no further right than (w - 40).
    const rightX = Math.max(leftX + 60, Math.min(leftX + 120, w - 40));
    const top = 40;
    const gap = Math.max(48, (h - 80) / Math.max(1, Math.max(state.domain.length, state.range.length)));
    state.domain.forEach((n,i)=>{ n.x = leftX; n.y = top + i*gap; });
    state.range.forEach((n,i)=>{ n.x = rightX; n.y = top + i*gap; });
  }

  function clear(){
    // clear arrays in-place so external references (app.domain/app.range/app.links) remain valid
    state.domain.length = 0;
    state.range.length = 0;
    state.links.length = 0;
    state.numericExpr = null;
    render();
  }

  function startConnecting(){
    // toggle connecting mode: next tap on domain then tap on range to connect
    state.connecting = {step:1, from:null};
    canvas.style.cursor = "crosshair";
    // show guiding hint only once
    if(!state.seenConnectHint){
      alert("Toque un elemento del dominio y luego uno del rango para crear una relación.");
      state.seenConnectHint = true;
    }
  }

  canvas.addEventListener("pointerdown", (e)=>{
    const p = pointerPos(e);
    const node = findNodeAt(p);
    if(state.connecting){
      if(state.connecting.step===1 && node && isDomain(node)){ state.connecting.from = node.id; state.connecting.step=2; return; }
      if(state.connecting.step===2 && node && isRange(node)){ // create link
        state.links.push({from: state.connecting.from, to: node.id});
        state.connecting = null;
        canvas.style.cursor = "default";
        render();
        return;
      }
    } else {
      // allow dragging nodes
      if(node){
        state.selected = { id: node.id, type: isDomain(node) ? "d" : "r", ox: p.x - node.x, oy: p.y - node.y };
      }
    }
  });

  canvas.addEventListener("pointermove", (e)=>{
    if(!state.selected) return;
    const p = pointerPos(e);
    const nid = state.selected.id;
    const list = state.selected.type==="d" ? state.domain : state.range;
    const node = list.find(n=>n.id===nid);
    if(node){
      node.x = p.x - state.selected.ox;
      node.y = p.y - state.selected.oy;
      render();
    }
  });

  canvas.addEventListener("pointerup", ()=>{ state.selected = null; });

  function pointerPos(e){
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left), y: (e.clientY - r.top) };
  }

  function findNodeAt(p){
    for(const n of [...state.domain, ...state.range]){
      const dx = p.x - n.x, dy = p.y - n.y;
      if(Math.hypot(dx,dy) <= n.r) return n;
    }
    return null;
  }
  function isDomain(n){ return state.domain.some(d=>d.id===n.id); }
  function isRange(n){ return state.range.some(r=>r.id===n.id); }

  function render(){
    ctx.clearRect(0,0,w,h);
    // draw arrows
    ctx.lineWidth = 2;
    state.links.forEach(l=>{
      const from = state.domain.find(d=>d.id===l.from);
      const to = state.range.find(r=>r.id===l.to);
      if(!from || !to) return;
      drawArrow(from.x+20, from.y, to.x-20, to.y);
    });
    // draw nodes
    state.domain.forEach(d=>drawNode(d, "#e9c46a"));
    state.range.forEach(r=>drawNode(r, "#2a9d8f"));
    // mode-specific overlays
    if(mode === "ordered"){
      // show pairs
      ctx.fillStyle = "#111"; ctx.font = "13px Inter";
      let y = h - 14;
      const pairs = state.links.map(l=>`(${labelOf(l.from)}, ${labelOf(l.to)})`).join("  ");
      ctx.fillText(pairs, 14, y);
    }
  }

  function drawNode(n, color){
    // nicer colored border: create a soft gradient stroke based on the fill color
    const borderWidth = 3;
    const outerR = n.r + borderWidth/2;

    // Draw white fill circle
    ctx.beginPath();
    ctx.fillStyle = "#fff";
    ctx.lineWidth = 1;
    ctx.ellipse(n.x, n.y, n.r, n.r, 0, 0, Math.PI*2);
    ctx.fill();

    // compute a complementary border color from the provided color
    // simple approach: if color is green-ish use a darker green, if yellow-ish use warm pink/brown, else darken
    let strokeColor = "#ccc";
    if(color === "#e9c46a") strokeColor = "#d38f48"; // warm amber border for domain
    else if(color === "#2a9d8f") strokeColor = "#1f7d68"; // deeper teal for range
    else strokeColor = color;

    // draw outer stroke ring
    ctx.beginPath();
    ctx.lineWidth = borderWidth;
    ctx.strokeStyle = strokeColor;
    ctx.ellipse(n.x, n.y, outerR, outerR, 0, 0, Math.PI*2);
    ctx.stroke();

    // inner subtle shadow ring for depth
    ctx.beginPath();
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = "rgba(0,0,0,0.06)";
    ctx.ellipse(n.x, n.y, n.r - 1, n.r - 1, 0, 0, Math.PI*2);
    ctx.stroke();

    // inside content: numbers/letters or simple shapes
    const txt = String(n.label || "");
    const lower = txt.toLowerCase();
    const padding = 6;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // helper: draw small filled shape centered at node
    function drawSmallShape(kind){
      ctx.fillStyle = color;
      const s = Math.max(8, n.r - padding);
      ctx.beginPath();
      if(kind === "circle"){
        ctx.ellipse(n.x, n.y, s/2, s/2, 0, 0, Math.PI*2);
        ctx.fill();
      } else if(kind === "square"){
        const sz = s;
        ctx.fillRect(n.x - sz/2, n.y - sz/2, sz, sz);
      } else if(kind === "triangle"){
        const sz = s;
        ctx.moveTo(n.x, n.y - sz/2);
        ctx.lineTo(n.x - sz/2, n.y + sz/2);
        ctx.lineTo(n.x + sz/2, n.y + sz/2);
        ctx.closePath();
        ctx.fill();
      } else if(kind === "diamond"){
        const sz = s;
        ctx.moveTo(n.x, n.y - sz/2);
        ctx.lineTo(n.x - sz/2, n.y);
        ctx.lineTo(n.x, n.y + sz/2);
        ctx.lineTo(n.x + sz/2, n.y);
        ctx.closePath();
        ctx.fill();
      }
    }

    // decide rendering: keywords or single-character labels render as shapes or text
    if(["triangle","tri","▲","△"].includes(lower)){
      drawSmallShape("triangle");
    } else if(["square","rect","■","▢"].includes(lower)){
      drawSmallShape("square");
    } else if(["circle","circ","●","○"].includes(lower)){
      drawSmallShape("circle");
    } else if(["diamond","♦","◇"].includes(lower)){
      drawSmallShape("diamond");
    } else if(txt.length === 1){
      // single character: render larger (numbers/letters/symbol)
      ctx.fillStyle = color;
      ctx.font = `${Math.max(14, n.r)}px Inter`;
      ctx.fillText(txt, n.x, n.y);
    } else {
      // longer labels: render smaller text
      ctx.fillStyle = color;
      ctx.font = "14px Inter";
      // wrap if contains space or comma - show first line only to keep fit
      const drawText = txt.split(/\s|,/)[0];
      ctx.fillText(drawText, n.x, n.y);
    }
  }

  function drawArrow(x1,y1,x2,y2){
    ctx.strokeStyle = "#264653";
    ctx.beginPath();
    ctx.moveTo(x1,y1);
    const mx = (x1+x2)/2;
    ctx.quadraticCurveTo(mx, (y1+y2)/2, x2, y2);
    ctx.stroke();
    // head
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const hx = x2 - Math.cos(ang)*10;
    const hy = y2 - Math.sin(ang)*10;
    ctx.beginPath();
    ctx.moveTo(x2,y2);
    ctx.lineTo(hx - Math.sin(ang)*6, hy + Math.cos(ang)*6);
    ctx.lineTo(hx + Math.sin(ang)*6, hy - Math.cos(ang)*6);
    ctx.closePath();
    ctx.fillStyle = "#264653";
    ctx.fill();
  }

  function labelOf(id){
    const d = state.domain.find(x=>x.id===id);
    if(d) return d.label;
    const r = state.range.find(x=>x.id===id);
    if(r) return r.label;
    return "?";
  }

  function evaluateProperties(){
    // injective: each range element has at most one preimage
    const mapToRange = {};
    state.links.forEach(l=>{
      mapToRange[l.to] = mapToRange[l.to] || new Set();
      mapToRange[l.to].add(l.from);
    });
    const injective = Object.values(mapToRange).every(s=>s.size <= 1) && state.links.every(l=> state.domain.some(d=>d.id===l.from) && state.range.some(r=>r.id===l.to));
    // surjective: every range node has >=1 preimage
    const surjective = state.range.length === 0 ? false : state.range.every(r=> state.links.some(l=>l.to===r.id));
    return { injective, surjective, bijective: injective && surjective };
  }

  function generateExercise(){
    // Create a short exercise based on current mode
    if(mode==="sagital"){
      return "Dibuja el diagrama sagital y determina si la relación es función. (conecta elementos del dominio con el rango)";
    }
    if(mode==="injective") return "Construye una función inyectiva desde A hacia B y explica por qué es inyectiva.";
    if(mode==="surjective") return "Construye una función sobreyectiva desde A hacia B y explica por qué es sobreyectiva.";
    if(mode==="bijective") return "Construye una función biyectiva entre A y B y escribe su inversa si existe.";
    if(mode==="numeric") return "Define la expresión f(x) y calcula f(a) para los elementos del dominio.";
    if(mode==="ordered") return "Escribe los pares ordenados que representan la relación según el diagrama.";
    return "";
  }

  function exportPNG(){
    // render to an offscreen canvas at device pixel ratio for good quality
    const off = document.createElement("canvas");
    off.width = canvas.width; off.height = canvas.height;
    const octx = off.getContext("2d");
    // white bg
    octx.fillStyle = "#fff"; octx.fillRect(0,0,off.width,off.height);
    // draw simple snapshot: reuse existing render but scaled
    // We draw nodes and links again scaled for pixel ratio
    const scale = devicePixelRatio;
    octx.setTransform(scale,0,0,scale,0,0);
    state.links.forEach(l=>{
      const from = state.domain.find(d=>d.id===l.from);
      const to = state.range.find(r=>r.id===l.to);
      if(!from||!to) return;
      octx.strokeStyle = "#264653"; octx.lineWidth = 2;
      octx.beginPath();
      octx.moveTo(from.x+20,from.y);
      const mx = (from.x+to.x)/2;
      octx.quadraticCurveTo(mx,(from.y+to.y)/2,to.x-20,to.y);
      octx.stroke();
    });
    // domain nodes with warm amber border
    state.domain.forEach(d=>{
      octx.fillStyle = "#fff";
      octx.lineWidth = 1;
      octx.beginPath(); octx.ellipse(d.x,d.y,d.r,d.r,0,0,Math.PI*2); octx.fill();
      // border
      octx.beginPath(); octx.lineWidth = 3; octx.strokeStyle = "#d38f48"; octx.ellipse(d.x,d.y,d.r+1.5,d.r+1.5,0,0,Math.PI*2); octx.stroke();
      octx.fillStyle = "#e9c46a"; octx.font="14px Inter"; octx.textAlign="center"; octx.textBaseline="middle";
      octx.fillText(d.label,d.x,d.y);
    });
    // range nodes with deeper teal border
    state.range.forEach(r=>{
      octx.fillStyle = "#fff";
      octx.lineWidth = 1;
      octx.beginPath(); octx.ellipse(r.x,r.y,r.r,r.r,0,0,Math.PI*2); octx.fill();
      // border
      octx.beginPath(); octx.lineWidth = 3; octx.strokeStyle = "#1f7d68"; octx.ellipse(r.x,r.y,r.r+1.5,r.r+1.5,0,0,Math.PI*2); octx.stroke();
      octx.fillStyle = "#2a9d8f"; octx.font="14px Inter"; octx.textAlign="center"; octx.textBaseline="middle";
      octx.fillText(r.label,r.x,r.y);
    });
    return off.toDataURL("image/png");
  }

  function setNumericExpression(expr){
    try{
      if(!expr) { state.numericExpr = null; return; }
      // create a safe function using Function (basic)
      const fn = new Function("x","return ("+expr+")");
      // test
      fn(0);
      state.numericExpr = fn;
    }catch(e){
      alert("Expresión inválida");
      state.numericExpr = null;
    }
  }

  function applyNumericFunction(){
    if(!state.numericExpr) return;
    // for each domain element, compute value and try to match to existing range label (or create)
    state.domain.forEach(d=>{
      try{
        const val = state.numericExpr(Number(d.label.replace(/[^\d\-\.]/g,"")) || 0);
        // find or create range node with label = val
        let existing = state.range.find(r=> r.label == String(val) );
        if(!existing){
          const nid = Date.now() + Math.floor(Math.random()*1000);
          const label = String(val);
          existing = { id: nid, label, x: w-60, y: d.y, r:22 };
          state.range.push(existing);
        }
        // add link from d to existing
        // remove previous links from d
        state.links = state.links.filter(l=> l.from !== d.id );
        state.links.push({ from: d.id, to: existing.id });
      }catch(e){}
    });
    layoutNodes();
    render();
  }

  return {
    canvas, ctx, domain: state.domain, range: state.range, links: state.links,
    resize, setMode, addDomain, addRange, removeNodeById, clear, startConnecting,
    generateExercise, exportPNG, evaluateProperties, setNumericExpression, applyNumericFunction
  };
}