

/* each "scroller" requires an initiation that tells it:
   (a) which elements to watch (eg. .step)
   (b) what to do when these elements enter and exit.
   although users may have several scrollers in one quarto doc, i think with
   the right syntax we can get away with a single init block for everyone */

console.log("Initialising scrollers...")

// const scroller = scrollama();

// scroller
//   .setup({
//     step: ".step",
//   })
//   .onStepEnter((response) => {
//     // { element, index, direction }
//   })
//   .onStepExit((response) => {
//     // { element, index, direction }
//   });