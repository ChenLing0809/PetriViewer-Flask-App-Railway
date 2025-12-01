let currentLogId = null;

const fileInput = document.getElementById("fileInput");
const btnUpload = document.getElementById("btnUpload");
const uploadStatus = document.getElementById("uploadStatus");
const levelRange = document.getElementById("levelRange");
const levelLabel = document.getElementById("levelLabel");
const svg = document.getElementById("petriSvg");

const semanticMetric = document.querySelectorAll('input[name="metric"]');
const semanticRange = document.getElementById("semanticRange");
const semanticLabel = document.getElementById("semanticLabel");

btnUpload.addEventListener("click", () => {
  fileInput.click();
});

//==========Data selection and uploading==========
fileInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  uploadStatus.textContent = `Uploading ${file.name}...`;

  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch("/api/discover", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error("Upload failed!");
    const data = await res.json();

    currentLogId = data.logId;
    console.log("✅ Set currentLogId:", currentLogId);
    //console.log("✅ Set semantic metric:", semanticMetric);
    uploadStatus.textContent = `Discovered petri net from ${file.name}`;
    drawPetriNet(data); //change if other graph needed
    //drawAnnotation(data.tree); //draw annotations
  } catch (err) {
    console.error(err);
    uploadStatus.textContent = "Error during discovery!";
  }
});

//==========Petrinet Redering==========
function generateDot(petriNet) {
  let dot = "digraph PetriNet {\n  rankdir=LR;\n";

  dot += "  node [shape=circle, style=filled, fillcolor=lightblue];\n";
  petriNet.nodes
    .filter((n) => n.type === "place")
    .forEach((p) => {
      dot += `  "${p.id}" [label="${p.label}"];\n`;
    });

  dot += "  node [shape=box, style=filled, fillcolor=lightgray];\n";
  petriNet.nodes
    .filter((n) => n.type === "transition")
    .forEach((t) => {
      dot += `  "${t.id}" [label="${t.label}"];\n`;
    });

  petriNet.links.forEach((link) => {
    dot += `  "${link.source}" -> "${link.target}";\n`;
  });

  dot += "}";
  return dot;
}

function drawPetriNet(data) {
  const svg = document.getElementById("petriSvg");
  // compute dot for graph layout
  const dot = generateDot(data);
  const viz = new Viz();

  viz
    .renderSVGElement(dot)
    .then((renderedSvg) => {
      //clear existing content
      while (svg.firstChild) {
        svg.removeChild(svg.firstChild);
      }

      const graphGroup = renderedSvg.querySelector("g.graph");
      const defs = renderedSvg.querySelector("defs");

      if (defs) svg.appendChild(defs.cloneNode(true));
      if (graphGroup) svg.appendChild(graphGroup.cloneNode(true));

      requestAnimationFrame(() => {
        const bb = svg.getBBox();
        svg.setAttribute("viewBox", `${bb.x} ${bb.y} ${bb.width} ${bb.height}`);
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
      });

      // enable zoom and panning
      enablePanZoom(svg);
    })
    .catch((error) => {
      console.error("Viz.js rendering error:", error);
      uploadStatus.textContent = "Error rendering Petri net!";
    });
}

function enablePanZoom(svg) {
  let scale = 1.0;
  const minScale = 0.2;
  const maxScale = 8.0;
  const viewport = document.createElementNS("http://www.w3.org/2000/svg", "g");

  // Move all existing children into the <g> viewport
  while (svg.firstChild) {
    viewport.appendChild(svg.firstChild);
  }
  svg.appendChild(viewport);

  let translate = { x: 0, y: 0 };
  let isDragging = false;
  let last = { x: 0, y: 0 };

  function updateTransform() {
    viewport.setAttribute(
      "transform",
      `translate(${translate.x},${translate.y}) scale(${scale})`
    );
  }

  // Mouse drag panning
  svg.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    isDragging = true;
    last.x = e.clientX;
    last.y = e.clientY;
    svg.setPointerCapture(e.pointerId);
  });

  svg.addEventListener("pointermove", (e) => {
    if (!isDragging) return;
    const dx = e.clientX - last.x;
    const dy = e.clientY - last.y;
    last.x = e.clientX;
    last.y = e.clientY;
    translate.x += dx;
    translate.y += dy;
    updateTransform();
  });

  svg.addEventListener("pointerup", (e) => {
    isDragging = false;
    svg.releasePointerCapture(e.pointerId);
  });
  svg.addEventListener("pointerleave", () => (isDragging = false));

  // Wheel zoom (centered on cursor)
  svg.addEventListener("wheel", (e) => {
    e.preventDefault();
    const rect = svg.getBoundingClientRect();
    const pt = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    const cx = (pt.x - translate.x) / scale;
    const cy = (pt.y - translate.y) / scale;

    const delta = -e.deltaY;
    const zoomFactor = Math.exp(delta * 0.0015);
    const newScale = Math.min(maxScale, Math.max(minScale, scale * zoomFactor));
    const k = newScale / scale;

    translate.x = pt.x - cx * newScale;
    translate.y = pt.y - cy * newScale;
    scale = newScale;
    updateTransform();
  });

  updateTransform();
}
