

/* each "scroller" requires an initiation that tells it:
   (a) which elements to watch (eg. .step)
   (b) what to do when these elements enter and exit.
   although users may have several scrollers in one quarto doc, i think with
   the right syntax we can get away with a single init block for everyone */

console.log("Initialising scrollers...")

document.addEventListener("DOMContentLoaded", () => {
   
   // TODO - scroller events don't trigger if an elements starts
   // visible on page load, so we need to initialise the .scrolledby
   // classes on page load too
   
   const scroller = scrollama();
   
   scroller
     .setup({
       step: ".cr-crossfade",
       offset: 0.5
     })
     .onStepEnter((response) => {
       // { element, index, direction }
       // console.log(response.element)

      // if we're going DOWN and something comes IN, we're activating that step
      //   (DOWN and OUT we ignore)
      // if we're going UP and something goes OUT, we're need to undo that step
      //   (so )
      // (UP and IN we ignore)

       let allStickies = Array.from(document.querySelectorAll("[cr-id]"));
       
       /* unfortunately i'm noticing that scrollama sometimes misses events when
       scrolling fast. so all sticky elements need to be touched when we're
       receiving an update */
       
       if (response.direction == "down") {

         // down and in: activate the step being scrolled in:
         // 1. get this step 
         let thisStep = element;
         
         // 2. get the ids of the things to crossfade to and from
         if (!thisStep.hasAttributes()) {
            throw new Error("Close Read error: step " + index +
               "requires either a `cr-from` attribute or a `cr-to` " +
               "attribute (or both).")
         }
         let idFrom = thisStep.getAttribute("cr-from");
         let idTo = thisStep.getAttribute("cr-to");

         transitionElement(idFrom, add = false);
         transitionElement(idTo, add = true);

         // TODO - focus effects
         
      } else {
         console.log("Up and in event ignored")
      }

      

     })
     .onStepExit((response) => {
       // { element, index, direction }
       //  console.log(response.element)
       
       if (response.direction == "up") {
         
         // down and in: activate the step being scrolled in:
         // 1. get the previous step
         let thisStep = element;
         
         // 2. get the ids of the things to crossfade to and from
         if (!thisStep.hasAttributes()) {
            throw new Error("Close Read error: step " + index +
               "requires either a `cr-from` attribute or a `cr-to` " +
               "attribute (or both).")
         }
         let idFrom = thisStep.getAttribute("cr-from");
         let idTo = thisStep.getAttribute("cr-to");

         // we "undo" the step by reversing the cr-from and cr-to transitions...
         transitionElement(idFrom, add = false);
         transitionElement(idTo, add = true);

         // TODO - focus effects

       } else {
         console.log("Down and out event ignored")
       }

     });
 });


// transitionElement: given an element id (`idTransition`), either add (if
// `add` = true) or remove (if `add` = false) the `.cr-active` class. throw an
// error if the specified target is not in the sticky list
function transitionElement(idTransition, add = true) {
   if (idTransition !== null) {
      // 3. find the element
      let nodesTransition = document.querySelectorAll(
         "[cr-id=" + idTransition + "]")

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