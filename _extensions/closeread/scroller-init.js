

/* each "scroller" requires an initiation that tells it:
   (a) which elements to watch (eg. .step)
   (b) what to do when these elements enter and exit.
   although users may have several scrollers in one quarto doc, i think with
   the right syntax we can get away with a single init block for everyone */

const stepSelector = "[data-cr-from], [data-cr-to], [data-cr-in]"
let currentIndex

document.addEventListener("DOMContentLoaded", () => {

  // if debugging, add .cr-debug to the body 
  const debugOption = document
    .querySelector("meta[cr-debug-mode]")?.getAttribute("cr-debug-mode")
  const debugMode = debugOption === "true"
  if (debugMode) {
    console.info("Close Read: debug mode ON")
    document.body.classList.add("cr-debug")
  }

  // define an ojs variable if the connector module is available
  const ojsModule = window._ojs?.ojsConnector?.mainModule
  const ojsScrollerSection = ojsModule?.variable();
  const ojsScrollerProgress = ojsModule?.variable();
  ojsScrollerSection?.define("crScrollerSection", 0);
  ojsScrollerProgress?.define("crScrollerProgress", 0);
  if (ojsModule === undefined) {
    console.error("Warning: Quarto OJS module not found")
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
      
      if (response.direction == "down") {
        ojsScrollerSection?.define("crScrollerSection", response.index);
        currentIndex = response.index + 1
        recalculateActiveSteps()
      }
    })
    .onStepExit((response) => {
      
      if (response.direction == "up") {
        // as above, but up to the _previous_ element
        ojsScrollerSection?.define("crScrollerSection", response.index - 1);
        currentIndex = response.index
        recalculateActiveSteps()
      }

    })
    .onStepProgress((response) => {
      // { element, index, progress }
      ojsScrollerProgress?.define("crScrollerProgress", response.progress);
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

}

// make the given element active. if it's a poem, rescale it
function updateActivePoem(el, priorSteps) {

  const elId = el.getAttribute("data-cr-id")

  // active highlight is the most recent step with `cr-in` of this sticky

  const activeHighlight = priorSteps
    .filter(d => d.getAttribute("data-cr-in") == elId)
    .at(-1)
    ?.getAttribute("data-cr-highlight")

  // no active highlight?
  if (activeHighlight === undefined) {
    rescaleElement(el);
  } else {
    // Split the `activeHighlight` value on commas to support multiple IDs
    const highlightIds = activeHighlight.split(',');
    
    // Call rescaleElement with the first found id for focusing,
    // or without a specific focus if no ids are found 
    if (highlightIds) {
      rescaleElement(el, highlightIds);
    } else {
      rescaleElement(el);
    }
  }
}

/* rescaleElement:
   given a poem element `el` (and potentially a contained ids `highlightIds`),
   resets the focus status of a poem's highlight spans, then rescales (and
   potentially translates) the poem so that either the whole thing is visible
   or the  line containing `highlightIds` is visible and centerd */
function rescaleElement(el, highlightIds) {
  
  // find ALL spans within the `el` and remove `.cr-hl`
  el.querySelectorAll("span[id]").forEach(d => d.classList.remove("cr-hl"))

  if (highlightIds == undefined) {
    scalePoemFull(el)
  } else {
    scalePoemToSpan(el, highlightIds)
  }    
}

/* scalePoemFull:
  given an element `el`, rescales it to fill its containing .sticky-col-stack */
function scalePoemFull(el, paddingX = 75, paddingY = 50) {

  console.log("Focusing on whole poem")

  el.classList.remove("cr-hl-within")

  // get dimensions of element and its container
  const container = el.closest(".sticky-col-stack")
  
  const elHeight = el.scrollHeight
  const elWidth = el.scrollWidth
  const containerHeight = container.offsetHeight - (paddingY * 2)
  const containerWidth = container.offsetWidth - (paddingX * 2)

  const scaleHeight = elHeight / containerHeight
  const scaleWidth = elWidth / containerWidth
  const scale = 1 / Math.max(scaleHeight, scaleWidth)
  
  const centerDeltaY = (elHeight - el.offsetHeight) * scale / -2

  // apply styles
  el.style.setProperty("transform",
    `matrix(${scale}, 0, 0, ${scale}, 0, ${centerDeltaY})`)
}

/* scalePoemToSpan:
   given an element `el` and a span `focusEl` within it, rescales and translates
   `el` so that `focusEl` is vertically centerd and its line fills the
   containing .sticky-col-stack */
function scalePoemToSpan(el, highlightIds, paddingX = 75, paddingY = 50) {

  el.classList.add("cr-hl-within")
  //focusEl.classList.add("cr-hl")
  
  highlightIds.forEach(highlightId => {
    const trimmedId = highlightId.trim(); // Ensure no whitespace issues
    const highlightSpan = el.querySelector(`#${trimmedId}`);
    if (highlightSpan !== null) {
      highlightSpan.classList.add("cr-hl");
    } else {
    // Handle the case where the ID does not correspond to a span
      console.warn(`Could not find span with ID '${trimmedId}'. Please ensure the ID is correct.`);
    }
  });
  
  // for now just get first span
  const focusEl = el.querySelector(`#${highlightIds[0].trim()}`);
  
  // get dimensions of element and its container
  const container = el.closest(".sticky-col-stack")
  
  const elHeight = el.scrollHeight
  const elWidth = el.scrollWidth
  const containerHeight = container.offsetHeight - (paddingY * 2)
  const containerWidth = container.offsetWidth - (paddingX * 2)

  const focusHeight = focusEl.offsetHeight
  const focusTop = focusEl.offsetTop
  const focusCentreY = focusTop + (focusHeight / 2)
  
  // note scaleWidth uses the whole line, not just the span width
  const scaleWidth = elWidth / containerWidth
  const scaleHeight = focusHeight / containerHeight
  const scale = 1 / Math.max(scaleHeight, scaleWidth)
  
  const centerDeltaY = (focusCentreY - (el.offsetHeight / 2)) * -1

  // apply styles
  el.style.setProperty("transform",
    `matrix(${scale}, 0, 0, ${scale}, 0, ${centerDeltaY})`)

}