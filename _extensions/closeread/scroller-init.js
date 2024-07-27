

/* each "scroller" requires an initiation that tells it:
   (a) which elements to watch (eg. .step)
   (b) what to do when these elements enter and exit.
   although users may have several scrollers in one quarto doc, i think with
   the right syntax we can get away with a single init block for everyone */

const stepSelector = ["data-focus-on"]

document.addEventListener("DOMContentLoaded", () => {

  // if debugging, add .cr-debug to the body 
  const debugOption = document
    .querySelector("meta[cr-debug-mode]")?.getAttribute("cr-debug-mode")
  const debugMode = debugOption === "true"
  if (debugMode) {
    console.info("Close Read: debug mode ON")
    document.body.classList.add("cr-debug")
  }

  /*
  // define an ojs variable if the connector module is available
  let focusedStickyName = "none";
  const ojsModule = window._ojs?.ojsConnector?.mainModule
  const ojsScrollerName = ojsModule?.variable();
  const ojsScrollerProgress = ojsModule?.variable();
  const ojsScrollerDirection = ojsModule?.variable();
  ojsScrollerName?.define("crScrollerName", focusedStickyName);
  ojsScrollerProgress?.define("crScrollerProgress", 0);
  ojsScrollerDirection?.define("crScrollerDirection", null);
  if (ojsModule === undefined) {
    console.error("Warning: Quarto OJS module not found")
  }
  */
  
  const allStickies = Array.from(document.querySelectorAll("[id^='cr-']"));
  const scroller = scrollama();
  scroller
    .setup({
      step: stepSelector,
      offset: 0.5,
      progress: true,
      debug: debugMode
    })
    .onStepEnter((response) => {
      updateStickies(allStickies, response);
    })
    .onStepProgress((response) => {
      // { element, index, progress }
      /*
      ojsScrollerProgress?.define("crScrollerProgress",
        response.progress);
      ojsScrollerDirection?.define("crScrollerDirection",
        response.direction);
        */
    });

    // also recalc transitions and highlights on window resize
    //window.addEventListener("resize", d => updateStickies(allStickies, allSteps));

 });
 
 /* updateStickies: fill in with description */
function updateStickies(allStickies, response) {
  focusedStickyName = "cr-" + response.element.getAttribute("data-focus-on");
  //ojsScrollerName?.define("crScrollerName", focusedStickyName);
  const focusedSticky = document.querySelectorAll("[id=" + focusedStickyName)[0];
  
  // update which sticky is active
  allStickies.forEach(node => {node.classList.remove("cr-active")});
  focusedSticky.classList.add("cr-active");
        
  // apply additional effects
  highlightSpans(focusedSticky, response.element);
  transformSticky(focusedSticky, response.element);
}


function highlightSpans(stickyEl, stepEl) {
  // remove any previous highlighting
  stickyEl.querySelectorAll("span[id]").forEach(d => d.classList.remove("cr-hl"));
  stickyEl.classList.remove("cr-hl-within");
  
  let highlightIds = stepEl.getAttribute("data-highlight-spans");
  
  // exit function if there's no highlighting
  if (highlightIds === null) {
    return;
  }
  
  // dim enclosing block
  stickyEl.classList.add("cr-hl-within");
  
  // add highlight class to appropriate spans
  highlightIds.split(',').forEach(highlightId => {
    const trimmedId = highlightId.trim(); // Ensure no whitespace issues
    const highlightSpan = stickyEl.querySelector(`#${trimmedId}`);
    if (highlightSpan !== null) {
      highlightSpan.classList.add("cr-hl");
    } else {
    // Handle the case where the ID does not correspond to a span
      console.warn(`Could not find span with ID '${trimmedId}'. Please ensure the ID is correct.`);
    }
  });
  
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


//=================//
// Transform Sticky //
//=================//

function transformSticky(sticky, step) {
  
  // initialize empty strings
  let translateStr = "";
  let scaleStr = "";
  let transformStr = "";
  
  if (step.hasAttribute("data-pan-to")) {
    // get translate attributes from step
    translateStr = "translate(" + step.getAttribute("data-pan-to") + ")";
  }
  
  if (step.hasAttribute("data-scale-by")) {
    // get scale attributes from step
    scaleStr = "scale(" + step.getAttribute("data-scale-by") + ")";
  }
  
  // form transform string
  if (translateStr && scaleStr) {
    transformStr = translateStr + " " + scaleStr;
  } else if (translateStr) {
    transformStr = translateStr;
  } else if (scaleStr) {
    transformStr = scaleStr;
  }
  
  // and use it to scale the sticky
  sticky.style.transform = transformStr;
  
}
