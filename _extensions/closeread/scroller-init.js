

/* each "scroller" requires an initiation that tells it:
   (a) which elements to watch (eg. .step)
   (b) what to do when these elements enter and exit.
   although users may have several scrollers in one quarto doc, i think with
   the right syntax we can get away with a single init block for everyone */

console.log("Initialising scrollers...")

document.addEventListener("DOMContentLoaded", () => {

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
      debug: true
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
      targets.forEach(el => el.classList.add("cr-active"))
    } else if (targets.length > 1) {
      console.error("Multiple elements with cr-id=" + id +
        ". Please ensure cr-id attributes are unique.")
    } else {
      console.error("Can't find cr-id=" + id)
    }
  });

  console.log("Active list: " + Array.from(stickiesToEnable).join(", "))
}

/* transitionElement: given an element id (`idTransition`), either add (if
   `add` = true) or remove (if `add` = false) the `.cr-active` class. throw an
   error if the specified target is not in the sticky list */
function transitionElement(idTransition, add = true) {
  if (idTransition !== null) {
    // 3. find the element
    let nodesTransition = document.querySelectorAll(
      "[data-cr-id=" + idTransition + "]")

    // throw error if target not found
    if (nodesTransition.length == 0 ) {
      throw new Error("Close Read error: step " + index +
        "specified element " + idTransition + " for `cr-from` or " +
        "`cr-to`, but no target element has `cr-id= " + isTransition +
        "`.")
    } 
      
    // 1 (or more?) elements found: add or remove .cr-active to them
    nodesTransition.forEach(node => node.classList.toggle("cr-active", add))  
  }
}
