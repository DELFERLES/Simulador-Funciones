import { makeCanvas } from "./utils.js";

const canvasEl = document.getElementById("canvas");
const modeSel = document.getElementById("mode");
const addDomainBtn = document.getElementById("addDomain");
const addRangeBtn = document.getElementById("addRange");
const connectBtn = document.getElementById("connect");
const clearBtn = document.getElementById("clear");
const generateBtn = document.getElementById("generate");
const checkFunctionBtn = document.getElementById("checkFunction");
const numericTop = document.getElementById("numericTop");
const fnTopInput = document.getElementById("fnTopInput");
const applyFnTop = document.getElementById("applyFnTop");

// ordered pairs top controls
const orderedTop = document.getElementById("orderedTop");
const pairAInput = document.getElementById("pairA");
const pairBInput = document.getElementById("pairB");
const addPairBtn = document.getElementById("addPairBtn");
const genSagitalFromPairs = document.getElementById("genSagitalFromPairs");
const pairsDisplayEl = document.getElementById("pairsDisplay");

const domainListEl = document.getElementById("domainList");
const rangeListEl = document.getElementById("rangeList");
const propsEl = document.getElementById("props");
const fnPanel = document.getElementById("numericPanel");
const fnExprInput = document.getElementById("fnExpr");
const applyFnBtn = document.getElementById("applyFn");
const exerciseText = document.getElementById("exerciseText");
const addExerciseBtn = document.getElementById("addExercise");

const app = makeCanvas(canvasEl);

let idCounter = 1;
function nextId(){ return idCounter++; }

function refreshLists(){
  domainListEl.innerHTML = "";
  rangeListEl.innerHTML = "";

  // For each domain item show its label and the linked range value(s) (if any)
  app.domain.forEach(d=>{
    const li = document.createElement("li"); li.className="item";
    // find linked ranges for this domain element
    const linked = app.links.filter(l => l.from === d.id).map(l => {
      const r = app.range.find(rr => rr.id === l.to);
      return r ? r.label : "(?)";
    });
    const linkedText = linked.length ? ` → ${linked.join(", ")}` : "";
    li.innerHTML = `<span>${d.label}${linkedText}</span><div><button data-id="${d.id}" class="del">✕</button></div>`;
    domainListEl.appendChild(li);
  });

  // Show all range items (computed values will appear here too)
  app.range.forEach(r=>{
    const li = document.createElement("li"); li.className="item range";
    // show how many domain preimages map to this range value
    const preimages = app.links.filter(l => l.to === r.id).map(l => {
      const d = app.domain.find(dd => dd.id === l.from);
      return d ? d.label : "(?)";
    });
    const preText = preimages.length ? ` ← ${preimages.join(", ")}` : "";
    li.innerHTML = `<span>${r.label}${preText}</span><div><button data-id="${r.id}" class="del">✕</button></div>`;
    rangeListEl.appendChild(li);
  });

  // delete handlers
  [...document.querySelectorAll(".del")].forEach(b=>{
    b.onclick = ()=>{ const id = +b.dataset.id; app.removeNodeById(id); refreshLists(); renderProps(); updatePairsDisplay(); };
  });

  // update pairs display after building the lists
  updatePairsDisplay();
}

function renderProps(){
  const p = app.evaluateProperties();
  propsEl.innerText = `Inyectiva: ${p.injective ? "Sí":"No"}\nSobreyectiva: ${p.surjective ? "Sí":"No"}\nBiyectiva: ${p.bijective ? "Sí":"No"}`;
}

modeSel.onchange = ()=>{
  const m = modeSel.value;
  app.setMode(m);
  fnPanel.hidden = (m !== "numeric");
  // show top numeric input when in numeric mode
  if(numericTop) numericTop.style.display = (m === "numeric") ? "flex" : "none";
  // show ordered pairs input when in ordered mode
  if(orderedTop) orderedTop.style.display = (m === "ordered") ? "flex" : "none";

  // hide addRange and connect when numeric mode (domain x-values drive range generation)
  if(addRangeBtn) addRangeBtn.style.display = (m === "numeric") ? "none" : "inline-flex";
  if(connectBtn) connectBtn.style.display = (m === "numeric") ? "none" : "inline-flex";

  // when in ordered mode we don't need manual domain/range/connect buttons either
  if(addRangeBtn) addRangeBtn.style.display = (m === "ordered") ? "none" : addRangeBtn.style.display;
  if(connectBtn) connectBtn.style.display = (m === "ordered") ? "none" : connectBtn.style.display;
  if(addDomainBtn) addDomainBtn.style.display = (m === "ordered") ? "none" : "inline-flex";

  // only show the "Comprobar función" button for sagital mode
  if(checkFunctionBtn) checkFunctionBtn.style.display = (m === "sagital") ? "inline-flex" : "none";
  renderProps();
};

addDomainBtn.onclick = ()=>{
  const id = nextId();
  // If numeric mode, prompt specifically for X value and add simple numeric label
  if(modeSel.value === "numeric"){
    let val = prompt("Valor de x (número) para agregar al dominio:", "");
    if(val === null) return;
    val = val.trim();
    if(val === "") { alert("Ingrese un valor válido."); return; }
    // coerce to simple label (preserve string)
    app.addDomain({id, label: val});
  } else {
    let label = prompt("Etiqueta para el elemento del dominio (número, letra o figura: triangle/square/circle):", `a${id}`);
    if(label === null) return;
    label = label.trim() || `a${id}`;
    app.addDomain({id, label});
  }
  refreshLists(); renderProps();
};
addRangeBtn.onclick = ()=>{
  const id = nextId();
  let label = prompt("Etiqueta para el elemento del rango (número, letra o figura: triangle/square/circle):", `b${id}`);
  if(label === null) return;
  label = label.trim() || `b${id}`;
  app.addRange({id, label});
  refreshLists(); renderProps();
};
connectBtn.onclick = ()=>{ app.startConnecting(); };
clearBtn.onclick = ()=>{ app.clear(); refreshLists(); renderProps(); updatePairsDisplay(); };
generateBtn.onclick = ()=>{
  const ex = app.generateExercise();
  exerciseText.value = ex;
};

if(checkFunctionBtn){
  checkFunctionBtn.onclick = ()=>{
    const domain = app.domain;
    const links = app.links;
    if(domain.length === 0){
      alert("No hay elementos en el dominio.");
      return;
    }
    // check "función" status: cada elemento del dominio debe tener exactamente una imagen
    const counts = {};
    links.forEach(l => { counts[l.from] = (counts[l.from]||0) + 1; });
    const noExactlyOne = domain.filter(d => counts[d.id] !== 1);
    const isFunction = noExactlyOne.length === 0;

    // evaluate injective/surjective/bijective from canvas logic
    const props = app.evaluateProperties();
    const inj = props.injective;
    const sur = props.surjective;
    const bij = props.bijective;

    if(!isFunction){
      const list = noExactlyOne.map(d => d.label).join(", ");
      alert(
        "No es función.\n\nTeoría: Una relación es función si TODOS los elementos del dominio están relacionados y CADA elemento del dominio tiene relación con UN SOLO elemento del rango.\n" +
        "No importa si en el rango quedan elementos sin relacionar, ni que varios elementos del dominio apunten al mismo elemento del rango.\n\n" +
        "Elementos del dominio que NO cumplen (no tienen exactamente una imagen): " + (list || "(ninguno listado)") +
        "\n\nNota: Solo si cada elemento del dominio tiene exactamente una imagen puede hablarse de inyectiva/sobreyectiva/biyectiva."
      );
      return;
    }

    // si es función, informar además inyectiva/sobreyectiva/biyectiva con definiciones
    let msg = "Es función.\n\n";
    msg += "Teoría aplicada:\n";
    msg += "- Una relación es función si TODOS los elementos del DOMINIO están relacionados, y cada elemento del DOMINIO tiene relación con UN SOLO elemento del RANGO.\n";
    msg += "- No se requiere que todos los elementos del RANGO estén relacionados; tampoco es problema que varios elementos del DOMINIO apunten al mismo elemento del RANGO.\n\n";
    msg += "Definiciones breves:\n";
    msg += "- Inyectiva: cada elemento del RANGO tiene como máximo una preimagen (ninguna imagen del rango proviene de más de un dominio) — es decir, no hay colisiones en las imágenes cuando eso se requiere.\n";
    msg += "- Sobreyectiva: cada elemento del RANGO tiene al menos una preimagen (todos los elementos del rango están cubiertos).\n";
    msg += "- Biyectiva: inyectiva y sobreyectiva a la vez.\n\n";
    msg += `Resultado: Inyectiva: ${inj ? "Sí" : "No"}  |  Sobreyectiva: ${sur ? "Sí" : "No"}  |  Biyectiva: ${bij ? "Sí" : "No"}`;

    alert(msg);
  };
}


applyFnBtn.onclick = ()=>{
  const expr = fnExprInput.value.trim();
  app.setNumericExpression(expr);
  app.applyNumericFunction();
  refreshLists(); renderProps();
};
if(applyFnTop){
  applyFnTop.onclick = ()=>{
    const expr = fnTopInput.value.trim();
    fnExprInput.value = expr; // keep main panel in sync
    app.setNumericExpression(expr);
    app.applyNumericFunction();
    refreshLists(); renderProps();
  };
  // allow pressing Enter in top input to apply
  fnTopInput.addEventListener("keydown", (e)=>{ if(e.key === "Enter"){ applyFnTop.click(); } });
}

// ordered pairs: add a pair (a,b) creating domain/range nodes and a link
if(addPairBtn){
  addPairBtn.onclick = ()=>{
    const a = (pairAInput.value || "").trim();
    const b = (pairBInput.value || "").trim();
    if(!a || !b){ alert("Ingrese ambos elementos a y b."); return; }
    // check existing domain/range labels
    let dom = app.domain.find(d=> String(d.label) === a);
    if(!dom){
      const id = nextId();
      app.addDomain({ id, label: a });
      dom = app.domain.find(d=>d.id===id);
    }
    let ran = app.range.find(r=> String(r.label) === b);
    if(!ran){
      const id2 = nextId();
      app.addRange({ id: id2, label: b });
      ran = app.range.find(r=>r.id===id2);
    }
    // keep all connections: allow multiple links from the same domain to different ranges (do not remove existing links)
    app.links.push({ from: dom.id, to: ran.id });
    // trigger layout/render and UI updates so arrows show immediately
    app.resize();
    refreshLists(); renderProps(); updatePairsDisplay();
    pairAInput.value = ""; pairBInput.value = "";
  };
  // allow pressing Enter in pairB to add the pair
  pairBInput.addEventListener("keydown", (e)=>{ if(e.key === "Enter"){ addPairBtn.click(); } });
}

// generate the sagital diagram (switch to sagital mode, evaluate and show whether it's a function and its properties)
if(genSagitalFromPairs){
  genSagitalFromPairs.onclick = ()=>{
    // ensure we are in sagital mode view
    modeSel.value = "sagital";
    modeSel.dispatchEvent(new Event("change"));
    // check function status similar to checkFunctionBtn logic
    const domain = app.domain;
    const links = app.links;
    if(domain.length === 0){
      alert("No hay elementos en el dominio.");
      return;
    }
    const counts = {};
    links.forEach(l => { counts[l.from] = (counts[l.from]||0) + 1; });
    const noExactlyOne = domain.filter(d => counts[d.id] !== 1);
    const isFunction = noExactlyOne.length === 0;
    const props = app.evaluateProperties();
    if(!isFunction){
      const list = noExactlyOne.map(d => d.label).join(", ");
      alert(
        "No es función.\n\nTeoría: Una relación es función si TODOS los elementos del dominio están relacionados y CADA elemento del dominio tiene relación con UN SOLO elemento del rango.\n\n" +
        "Elementos del dominio que NO cumplen (no tienen exactamente una imagen): " + (list || "(ninguno listado)")
      );
      return;
    }

    // when it's a valid function, ensure canvas links match the ordered pairs (they already should),
    // then render and show result; arrows will already be present on canvas because links were added when pairs were created.
    app.setMode("sagital");
    app.canvas && app.resize && app.resize(); // ensure layout
    refreshLists(); renderProps(); updatePairsDisplay();

    let msg = "Es función.\n\n";
    msg += `Inyectiva: ${props.injective ? "Sí":"No"}\nSobreyectiva: ${props.surjective ? "Sí":"No"}\nBiyectiva: ${props.bijective ? "Sí":"No"}`;
    alert(msg);
  };
}

addExerciseBtn.onclick = ()=>{
  const t = exerciseText.value.trim();
  if(!t) return;
  exerciseText.value = "";

  // Also export the current diagram as PNG when adding the exercise
  try{
    const data = app.exportPNG();
    const a = document.createElement("a");
    a.href = data;
    // use a filename derived from the exercise text or fallback
    const name = t.replace(/\s+/g,"_").replace(/[^\w\-_.]/g,"") || "diagram";
    a.download = name + ".png";
    a.click();
  }catch(e){
    console.warn("Export failed", e);
  }
};

window.addEventListener("resize", ()=>app.resize());

canvasEl.addEventListener("touchstart", e=>{ e.preventDefault(); }, {passive:false});

/* helper to show ordered-pairs set R = { ... } */
function updatePairsDisplay(){
  if(!pairsDisplayEl) return;
  if(!app.links || app.links.length === 0){ pairsDisplayEl.textContent = "R = {}"; return; }
  const pairs = app.links.map(l=>{
    const a = app.domain.find(d=>d.id===l.from);
    const b = app.range.find(r=>r.id===l.to);
    const A = a ? String(a.label) : "?";
    const B = b ? String(b.label) : "?";
    return `(${A},${B})`;
  }).join(" ");
  pairsDisplayEl.textContent = `R = { ${pairs} }`;
}

// initialize
modeSel.dispatchEvent(new Event("change"));
app.resize();
updatePairsDisplay();