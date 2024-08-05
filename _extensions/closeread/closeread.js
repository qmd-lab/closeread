//==============//
// closeread.js //
//==============//

// set params
const triggerSelector = '.new-trigger'
const progressBlockSelector = '.progress-block'


//=================//
// Event Listeners //
//=================//
/* the interactive nature of closeread docs is enabled by event listeners that
   execute code when the user loads the doc, scrolls, presses keys, etc. 
*/

// == Run upon the HTML file loaded === //
document.addEventListener("DOMContentLoaded", () => {

  // attach meta classes to <body>
  document.body.classList.add("closeread")
  const debugMode         = getBooleanConfig("cr-debug-mode")
  const removeHeaderSpace = getBooleanConfig("cr-remove-header-space")
  if (debugMode) {
    document.body.classList.add("cr-debug")
  } 
  if (removeHeaderSpace) {
    document.body.classList.add("cr-removeheaderspace")
  }

  // define ojs variables if the connector module is available
  const ojsModule = window._ojs?.ojsConnector?.mainModule
  const ojsStickyName = ojsModule?.variable()
  const ojsTriggerIndex = ojsModule?.variable()
  const ojsTriggerProgress = ojsModule?.variable()
  const ojsDirection = ojsModule?.variable()
  const ojsProgressBlock = ojsModule?.variable()

  let focusedSticky = "none";
  ojsStickyName?.define("crStickyName", focusedSticky);
  ojsTriggerIndex?.define("crTriggerIndex", 0);
  ojsTriggerProgress?.define("crTriggerProgress", 0);
  ojsDirection?.define("crDirection", null);
  ojsProgressBlock?.define("crProgressBlock", 0);

  if (ojsModule === undefined) {
    console.error("Warning: Quarto OJS module not found")
  }
  
  // collect all sticky elements
  const allStickies = Array.from(document.querySelectorAll(".sticky"));
  
  
  // === Set up scrolling event listeners === //
  // scrollama() is accessible because scrollama.min.js is attached via closeread.lua
  
  const triggerScroller = scrollama();
  triggerScroller
    .setup({
      step: triggerSelector,
      offset: 0.5,
      progress: true,
      debug: debugMode
    })
    .onStepEnter((trigger) => {
      
      focusedStickyName = trigger.element.getAttribute("data-focus-on");
      
      // update ojs variables
      ojsTriggerIndex?.define("crTriggerIndex", trigger.index);
      ojsStickyName?.define("crStickyName", focusedStickyName);
        
      updateStickies(allStickies, focusedStickyName, trigger);
      
    })
    .onStepProgress((trigger) => {
      
      // update ojs variables
      ojsTriggerProgress?.define("crTriggerProgress", trigger.progress);
      ojsDirection?.define("crDirection", trigger.direction);
      
    });
    
    const progressBlockScroller = scrollama();
    progressBlockScroller
      .setup({
        step: progressBlockSelector,
        offset: 0.5,
        progress: true,
        debug: debugMode
      })
      .onStepProgress((progressBlock) => {
      // update ojs variable
      ojsProgressBlock?.define("crProgressBlock", progressBlock.progress);
    });
    
    // Add a listener for scrolling between new triggers
    let currentIndex = -1; // Start before the first element
    
    function scrollToNewTrigger(direction) {
      const triggers = document.querySelectorAll('.new-trigger');
      
      if (triggers.length === 0) return; // do nothing if there's no triggers
      
      if (direction === "next") {
        if (currentIndex >= triggers.length - 1) return; // exit if at end
        currentIndex += 1;
      }
      
      if (direction === "previous") {
        if (currentIndex === 0) return; // exit if at start
        currentIndex -= 1;
      }
      
      const nextTrigger = triggers[currentIndex];
      nextTrigger.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    document.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowRight') {
          scrollToNewTrigger("next");
      }
      if (event.key === 'ArrowLeft') {
          scrollToNewTrigger("previous");
      }
    });

 });
 
// === Hotkey Listeners === //

// toggle presentation mode
document.addEventListener('keydown', (event) => {
  const crSections = document.querySelectorAll('.cr-section');
  crSections.forEach((el) => {
    if (event.key === "p") {
      if (el.classList.contains("presentation-mode")) {
          el.classList.remove("presentation-mode");
      } else {
          el.classList.add("presentation-mode");
      }
    }
  });
});

 
 
//===========//
// Functions //
//===========//
 
 /* updateStickies: triggers effects and transformations of the focused sticky */
function updateStickies(allStickies, focusedStickyName, trigger) {
  const focusedSticky = document.querySelectorAll("[id=" + focusedStickyName)[0];
  
  // update which sticky is active
  allStickies.forEach(node => {node.classList.remove("cr-active")});
  focusedSticky.classList.add("cr-active");
        
  // apply additional effects
  transformSticky(focusedSticky, trigger.element);
  
  if (focusedSticky.classList.contains("cr-poem")) {
    scalePoemFull(focusedSticky);
  }
  
  highlightSpans(focusedSticky, trigger.element);

}


function highlightSpans(focusedSticky, triggerEl) {
  // remove any previous highlighting from sticky
  focusedSticky.querySelectorAll("span[id]").forEach(d => d.classList.remove("cr-hl"));
  focusedSticky.classList.remove("cr-hl-within");
  
  // get hightlighted spans from trigger
  let highlightIds = triggerEl.getAttribute("data-highlight-spans");
  
  // exit function if there's no highlighting
  if (highlightIds === null) {
    return;
  }
  
  // dim enclosing block
  focusedSticky.classList.add("cr-hl-within");
  
  // add highlight class to appropriate spans
  highlightIds.split(',').forEach(highlightId => {
    const trimmedId = highlightId.trim(); // Ensure no whitespace issues
    const highlightSpan = focusedSticky.querySelector(`#${trimmedId}`);
    if (highlightSpan !== null) {
      highlightSpan.classList.add("cr-hl");
    } else {
    // Handle the case where the ID does not correspond to a span
      console.warn(`Could not find span with ID '${trimmedId}'. Please ensure the ID is correct.`);
    }
  });
  
  if (focusedSticky.classList.contains("cr-poem")) {
    // scale to span using transform
    scalePoemToSpan(focusedSticky, highlightIds);
  }
  
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
   given a sticky and a span `focusEl` within it, rescales and translates
   sticky so that `focusEl` is vertically centerd and its line fills the
   containing .sticky-col-stack */
function scalePoemToSpan(focusedSticky, highlightIds, paddingX = 75, paddingY = 50) {
  
  // for now just get first span
  const focusedSpan = focusedSticky.querySelector(`#${highlightIds.trim()}`);
  
  // get dimensions of element and its container
  const container = focusedSticky.closest(".sticky-col-stack")
  
  const focusedStickyHeight = focusedSticky.scrollHeight
  const focusedStickyWidth = focusedSticky.scrollWidth
  const containerHeight = container.offsetHeight - (paddingY * 2)
  const containerWidth = container.offsetWidth - (paddingX * 2)

  const focusHeight = focusedSpan.offsetHeight
  const focusTop = focusedSpan.offsetTop
  const focusCenterY = focusTop + (focusHeight / 2)
  
  // note scaleWidth uses the whole line, not just the span width
  const scaleWidth = focusedStickyWidth / containerWidth
  const scaleHeight = focusHeight / containerHeight
  const scale = 1 / Math.max(scaleHeight, scaleWidth)
  
  const centerDeltaY = (focusCenterY - (focusedSticky.offsetHeight / 2)) * -1

  // apply styles
  focusedSticky.style.setProperty("transform",
    `matrix(${scale}, 0, 0, ${scale}, 0, ${centerDeltaY})`)
}


//==================//
// Transform Sticky //
//==================//

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

/* getBooleanConfig: checks for a <meta> with named attribute `cr-[metaFlag]`
   and returns true if its value is "true" or false otherwise */
function getBooleanConfig(metaFlag) {
  const option = document
    .querySelector("meta[" + metaFlag + "]")?.getAttribute(metaFlag)
  return option === "true"
}

