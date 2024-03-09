

/* each "scroller" requires an initiation that tells it:
   (a) which elements to watch (eg. .step)
   (b) what to do when these elements enter and exit.
   although users may have several scrollers in one quarto doc, i think with
   the right syntax we can get away with a single init block for everyone */

console.log("Initialising scrollers...")
const stepSelector = "[data-cr-from], [data-cr-to], [data-cr-in]"
let currentIndex

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

  // let currentIndex;

  const scroller = scrollama();
  scroller
    .setup({
      step: stepSelector,
      offset: 0.5,
      progress: true,
      debug: debugMode
    })
    .onStepEnter((response) => {

      console.log("Element " + response.index + "entering as we scroll " +
      response.direction);
      
      if (response.direction == "down") {
        ojsScrollerSection?.define("crScrollerSection", response.index);
        currentIndex = response.index + 1
        recalculateActiveSteps();
      } else {
         // console.log("Up and in event ignored")
      }
    })
    .onStepExit((response) => {

      console.log("Element " + response.index + "exiting as we scroll " +
      response.direction);
      
      if (response.direction == "up") {
        // as above, but up to the _previous_ element
        ojsScrollerSection?.define("crScrollerSection", response.index - 1);
        currentIndex = response.index
        recalculateActiveSteps();
      } else {
        // console.log("Down and out event ignored")
      }

    })
    .onStepProgress((response) => {
      // { element, index, progress }
      ojsScrollerProgress?.define("crScrollerProgress",
        response.progress.toLocaleString("en-US", {
          style: "percent"
        }) + " " +
        (response.direction == "down" ? "↓" : "↑"));

    });

    // also recalc transitions and highlights on window resize
    window.addEventListener("resize", d => recalculateActiveSteps())

 });

/* recalculateActiveSteps: recalculates which sticky elements (between the first
   and the one before `indexTo`) need to be displayed, and gives them the class
   `.cr-active`. All elements first have that class removed regardless of
   position.
   (note that sticky elements use the `cr-id` attribute on the user side, but it
   appears in the rendered html as `data-cr-id`.) */
function recalculateActiveSteps() {

  const allStickies = Array.from(document.querySelectorAll("[data-cr-id]"));
  const allSteps = Array.from(document.querySelectorAll(stepSelector));
  // TODO - how to handle anchor links, where page load may not be at top?
  const priorSteps = allSteps.slice(0, currentIndex || 0);

  // reset all elements
  allStickies.forEach(node => node.classList.remove("cr-active"));

  
  // replay the vertical transition progress: remove sticky targets if they've
  // been transitioned `from` and add them back if they're transitioned `to`
  // NOTE - why is this only triggering once when
  /// priorSteps.length > 1?
  stickiesToEnable = new Set();
  priorSteps.forEach(node => {

    // from/to comma-sep strings -> arrays -> sets -> remove/add stickies
    const nodeFromIDs = node.getAttribute("data-cr-from");
    const nodeToIDs   = node.getAttribute("data-cr-to");
    (new Set(nodeFromIDs?.split(/,\s*/)))
      .forEach(id => stickiesToEnable.delete(id));
    (new Set(nodeToIDs?.split(/,\s*/)))
      .forEach(id => stickiesToEnable.add(id));

  });

  // each sticky left post-replay needs to be enabled, if it is valid, and then
  // focus effects need to be applied
  stickiesToEnable.forEach(stickyId => {
    const targets = document.querySelectorAll("[data-cr-id=" + stickyId + "]")

    if (targets.length == 0) {
      throw Error("Can't find cr-id=" + stickyId +
        ". Please ensure the element you're transitioning to exists.")
    }
    if (targets.length > 1) {
      throw Error("Multiple elements with cr-id=" + stickyId +
        ". Please ensure cr-id attributes are unique.")
    }

    // do the visibility update
    targets[0].classList.add("cr-active")
    if (targets[0].classList.contains("cr-poem")) {
      updateActivePoem(targets[0], priorSteps)
    }


  })

  console.log("Active list: " + Array.from(stickiesToEnable).join(", "))
}

// make the given element active. if it's a poem, rescale it
function updateActivePoem(el, priorSteps) {
  console.log("Updating poem")

  const elId = el.getAttribute("data-cr-id")

  // move work looking for focus element here
  // TODO - now we've found the sticky to make visible, we need to determine
  // its highlight state
  // * traverse from the target's index (???) to
  //   the index that triggered this update (indexTo)

  // active highlight is the most recent step with `cr-in` of this sticky
  // console.log("Prior steps:", priorSteps)
  // priorSteps.map(d => console.log("cr-id of d is ", d.getAttribute("data-cr-in")))

  const activeHighlight = priorSteps
    .filter(d => {
      console.log("Filtering prior step d:", d)
      return d.getAttribute("data-cr-in") == elId
    })
    .at(-1)
    ?.getAttribute("data-cr-highlight")

  console.log("Active highlight:", activeHighlight)

  // no active highlight? 
  if (activeHighlight == undefined) {
    console.log("No active poem highlight; rescale to full view")
    rescaleElement(el)
  } else {
    console.log("Found a highlight; searching")
    // highlights can currently be span ids. planning line num sets in future
    const highlightedSpan = el.querySelector("#" + activeHighlight)
    if (highlightedSpan != null) {
      console.log("Valid span found; zooming in")
      rescaleElement(el, highlightedSpan)
    } else if (false) {
      // TODO - could activeHighlight be a set of line numbers?
    } else {
      throw Error("Could not identify `cr-in` as either a span ID or " +
        "a set of comma-separated line numbers. If you are specifying an ID, " +
        "please ensure you omit the preceding #." )
    }
  }
}

/* Sets transform properties on an `el` to either:
   (if focusEl is not given) make the entire `el` visible within its container
   (if focusEl is given) make the entire `focusEl` visible within the cntnr */
function rescaleElement(el, focusEl, paddingX = 50, paddingY = 50) {

    console.log("Rescaling element:", el)
    
    // get dimensions of element and its container
    const container = el.closest(".sticky-col-stack")
    
    // TODO - use scrollWidth and scrollHeight here instead?
    const elHeight = el.offsetHeight
    const elWidth = el.offsetWidth
    const containerHeight = container.offsetHeight - (paddingY * 2)
    const containerWidth = container.offsetWidth - (paddingX * 2)

    // find ALL spans within the `el` and remove `.cr-hl`
    el.querySelectorAll("span[id]")
      .forEach(d => d.classList.remove("cr-hl"))
  
    /* if there's no focusEl, base the scale factor on el's container
    // if there IS a focusEl, scale is based poem width but not height, and
    // anchor is based on the span's location */
    
    if (focusEl == undefined) {
      el.classList.remove("cr-hl-within")
      
      const scaleHeight = elHeight / containerHeight
      const scaleWidth = elWidth / containerWidth

      const scale = 1 / Math.max(scaleHeight, scaleWidth)

      // apply styles
      el.style.setProperty("transform-origin", "center center")
      el.style.setProperty("transform", `scale(${scale})`)
  
    } else {
      
      el.classList.add("cr-hl-within")
      focusEl.classList.add("cr-hl")
      
      const focusHeight = focusEl.offsetHeight
      const focusTop = focusEl.offsetTop
      
      const anchorY = (focusTop + (focusHeight / 2))
      const centreDeltaY = (elHeight / 2) - anchorY

      // note scaleWidth uses the whole line, not just the span width
      const scaleWidth = elWidth / containerWidth
      const scaleHeight = focusHeight / containerHeight
      const scale = 1 / Math.max(scaleHeight, scaleWidth)

      // apply styles
      el.style.setProperty("transform-origin", `50% ${anchorY}px`)
      el.style.setProperty("transform",
        `matrix(${scale}, 0, 0, ${scale}, 0, ${centreDeltaY})`)
  
    }    
  }
  