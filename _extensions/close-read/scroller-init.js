

/* each "scroller" requires an initiation that tells it:
   (a) which elements to watch (eg. .step)
   (b) what to do when these elements enter and exit.
   although users may have several scrollers in one quarto doc, i think with
   the right syntax we can get away with a single init block for everyone */

console.log("Initialising scrollers...")

document.addEventListener("DOMContentLoaded", () => {
   const scroller = scrollama();
   
   scroller
     .setup({
       step: ".cr-step",
     })
     .onStepEnter((response) => {
       // { element, index, direction }

      console.log("Element " + response.index +
         " scrolled IN " + response.direction + ": " +
         response.element.textContent)
      // console.log(response.element)

      /* unfortunately i'm noticing that scrollama sometimes misses events when
         scrolling fast. so all sticky elements need to be touched when we're
         receiving an update */
      
      if (response.direction == "down") {
         let allStickies = Array.from(
            document.querySelectorAll(".cr-sticky, [data-cr=\"sticky\"]"));
         let pastStickies = allStickies.slice(0, response.index + 1);
         let futureStickies = allStickies.slice(response.index + 1);
         
         console.log(pastStickies.length + " back from here; " +
            futureStickies.length + " ahead")
   
         pastStickies.forEach(e => e.classList.add("cr-scrolledby"));
         futureStickies.forEach(e => e.classList.remove("cr-scrolledby"));
         
      }

      

     })
     .onStepExit((response) => {
       // { element, index, direction }
       console.log("Element " + response.index +
         " scrolled OUT " + response.direction + ": " +
         response.element.textContent)
      //  console.log(response.element)

       if (response.direction == "up") {
         // do the same as above, but response.index - 1
         let allStickies = Array.from(
            document.querySelectorAll(".cr-sticky, [data-cr=\"sticky\"]"));
         let pastStickies = allStickies.slice(0, response.index);
         let futureStickies = allStickies.slice(response.index);
         
         console.log(pastStickies.length + " back from here; " +
            futureStickies.length + " ahead")
   
         pastStickies.forEach(e => e.classList.add("cr-scrolledby"));
         futureStickies.forEach(e => e.classList.remove("cr-scrolledby"));
       }

     });
 });
