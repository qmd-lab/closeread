

/* each "scroller" requires an initiation that tells it:
   (a) which elements to watch (eg. .step)
   (b) what to do when these elements enter and exit.
   although users may have several scrollers in one quarto doc, i think with
   the right syntax we can get away with a single init block for everyone */

console.log("Initialising scrollers...")

document.addEventListener("DOMContentLoaded", () => {


  // first, let's read our options in from the dom
  const debugMode =
    document
      .querySelector("meta[cr-debug-mode]")?.getAttribute("cr-debug-mode")
        === "true";

  // if debugging, add .cr-debug to .cr-section divs
  // so we can add some of our own css
  if (debugMode) {
    document.querySelectorAll(".cr-sidebar").forEach(
      node => node.classList.add("cr-debug")
    )
  }

  // define an ojs variable if the connector module is available
  const ojsModule = window._ojs?.ojsConnector?.mainModule
  const ojsScrollerSection = ojsModule?.variable();
  const ojsScrollerProgress = ojsModule?.variable();
  ojsScrollerSection?.define("crScrollerSection", null);
  ojsScrollerProgress?.define("crScrollerProgress", null);
  if (ojsModule === undefined) {
    console.log("Warning: Quarto OJS module not found")
  }

  const scroller = scrollama();
  scroller
    .setup({
      step: ".cr-crossfade",
      offset: 0.5,
      progress: true,
      debug: debugMode
    })
    .onStepEnter((response) => {
      // { element, index, direction }

      console.log("Element " + response.index + "entering as we scroll " +
      response.direction);
      
      if (response.direction == "down") {
        ojsScrollerSection?.define("crScrollerSection", response.index);
        recalculateActiveSteps(response.index + 1);
         // TODO - focus effects
      } else {
         // console.log("Up and in event ignored")
      }
    })
    .onStepExit((response) => {
      // { element, index, direction }

      
      console.log("Element " + response.index + "exiting as we scroll " +
      response.direction);
      
      if (response.direction == "up") {
        // as above, but up to the _prevoius_ element
        ojsScrollerSection?.define("crScrollerSection", response.index - 1);
        recalculateActiveSteps(response.index);
        // TODO - focus effects
      } else {
        // console.log("Down and out event ignored")
      }

    })
    .onStepProgress((response) => {
      // { element, index, progress }
      console.log("Progress: ", response.progress + " " + response.direction)
      ojsScrollerProgress?.define("crScrollerProgress",
        response.progress.toLocaleString("en-US", {
          style: "percent"
        }) + " " +
        (response.direction == "down" ? "↓" : "↑"));

    });

    // TODO - also need a window resize watcher to rescale poems that are active
    window.addEventListener("resize", rescaleActivePoem)

 });

/* recalculateActiveSteps: recalculates which sticky elements (between the first
   and the one before `indexTo`) need to be displayed, and gives them the class
   `.cr-active`. All elements first have that class removed regardless of
   position.
   (note that sticky elements use the `cr-id` attribute on the user side, but it
   appears in the rendered html as `data-cr-id`.) */
function recalculateActiveSteps(indexTo) {

  let allStickies = Array.from(document.querySelectorAll("[data-cr-id]"));
  let allSteps = Array.from(document.querySelectorAll(".cr-crossfade"));

  // 1. reset all elements
  allStickies.forEach(node => node.classList.remove("cr-active"));

  // we need to turn back on elements that most recently featured in a
  // "to" block rather than a "from" block (or nothing)

  // focus on steps up to `indexTo`
  const priorSteps = allSteps.slice(0, indexTo);

  // start with an empty set of ids to enable
  stickiesToEnable = new Set();

  // for each step, remove the ones that feature in the "from" and add
  // NOTE - why is this only triggering once when priorSteps.length > 1?
  priorSteps.forEach(node => {

    const nodeFromIDs = node.getAttribute("data-cr-from");
    if (nodeFromIDs !== null) {
      const fromIDSet = new Set(nodeFromIDs.split(/,\s*/));
      fromIDSet.forEach(id => stickiesToEnable.delete(id));
    }
    const nodeToIDs = node.getAttribute("data-cr-to");
    if (nodeToIDs !== null) {
      const toIDSet = new Set(nodeToIDs.split(/,\s*/));
      toIDSet.forEach(id => stickiesToEnable.add(id));
    }
  });

  // now we enable whichever ids are left on stickiesToEnable
  stickiesToEnable.forEach(id => {
    const el = document.getElementById(id)
    const targets = document.querySelectorAll("[data-cr-id=" + id + "]")
    if (targets.length == 1) {
      targets.forEach(el => updateVisibleElement(el))
    } else if (targets.length > 1) {
      console.error("Multiple elements with cr-id=" + id +
        ". Please ensure cr-id attributes are unique.")
    } else {
      console.error("Can't find cr-id=" + id)
    }
  });

  console.log("Active list: " + Array.from(stickiesToEnable).join(", "))
}

function rescaleElement(el, paddingX = 50, paddingY = 50) {

  console.log("Rescaling element:", el)
  
  // get dimensions of element and its container
  const container = el.closest(".sticky-col-stack")
  
  const elHeight = el.offsetHeight
  const elWidth = el.offsetWidth
  const containerHeight = container.offsetHeight - paddingY
  const containerWidth = container.offsetWidth - paddingX

  const scaleHeight = elHeight / containerHeight
  const scaleWidth = elWidth / containerWidth

  const maxScale = Math.max(scaleHeight, scaleWidth)

  console.log("Changing size by x" + (1 / maxScale))

  // apply transform
  // el.style.transform = `translateY(5%) scale(${1 / maxScale});`
  el.setAttribute("style", `transform: scale(${1 / maxScale});`)

}

// make the given element active. if it's a poem, rescale it
function updateVisibleElement(el) {
  el.classList.add("cr-active")
  if (el.classList.contains("cr-poem")) {
    rescaleElement(el)
  }
}

// on window resize, look up the .cr-active element. if it's a poem, rescale it
function rescaleActivePoem() {
  document.querySelectorAll(".cr-active").forEach(
    el => {
      if (el.classList.contains("cr-poem")) {
        rescaleElement(el)
      }
    }
  )
}
