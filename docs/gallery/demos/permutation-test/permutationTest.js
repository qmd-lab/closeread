// Ensure refresh starts at top (so scrolly stuff doesn't get weird)
window.onbeforeunload = function () {
  window.scrollTo(0, 0);
};

//////////////////////////
////// util funcs ////////
//////////////////////////

function loop() {
  // loop through async func calls
  var args = arguments;
  if (args.length <= 0) return;
  (function chain(i) {
    if (i >= args.length || typeof args[i] !== "function") return;
    window.setTimeout(function () {
      args[i]();
      chain(i + 1);
    }, 300);
  })(0);
}

//////////////////////////
/////// constants ////////
//////////////////////////

let madeNodes = 0;

const svgD3 = d3.select("svg");
const width = svgD3.node().getBoundingClientRect().width;
const height = svgD3.node().getBoundingClientRect().height;
const margin = 20;
const mobileWidth = 390;
const roundPath =
  "M251.249,127.907c17.7,0,32.781-6.232,45.254-18.7c12.467-12.467,18.699-27.554,18.699-45.253 c0-17.705-6.232-32.783-18.699-45.255C284.029,6.233,268.948,0,251.249,0c-17.705,0-32.79,6.23-45.254,18.699 c-12.465,12.469-18.699,27.55-18.699,45.255c0,17.703,6.23,32.789,18.699,45.253C218.462,121.671,233.549,127.907,251.249,127.907 z";
const trtCenter = width / 5;
const cntrlCenter = width / 1.5;
const heightMuCenter = height / 1.8;
let scaleWidth = width > mobileWidth ? 0.6 : 0.35;

//////////////////////////
///// node functions /////
//////////////////////////

const nodeTreatmentWidth = (d) => {
  if (d.nodeGroup === "resp" || d.nodeGroup === "dsn") {
    return width / 2;
  } else if (d.index % 2 == 0) {
    if (width > mobileWidth) {
      return trtCenter;
    } else {
      return trtCenter / 2;
    }
  } else {
    if (width > mobileWidth) {
      return cntrlCenter;
    } else {
      return width / 1.35;
    }
  }
};

const nodeTreatmentHeight = (d) => {
  if (d.nodeGroup == "resp") {
    return height / 1.1;
  } else if (d.nodeGroup == "llama") {
    return height / 3.5;
  } else {
    return height / 1.1;
  }
};

const nodeGroupInitialForceCollide = (d) => {
  // return d.nodeGroup === 'llama' ? 35 : 10;
  if ((d.nodeGroup === "llama") & (width > mobileWidth)) {
    return 35;
  } else if (d.nodeGroup === "llama") {
    return 18; // mobile cluster of llama
  } else {
    return 10;
  }
};

const nodeGroupMoveForceCollide = (d) => {
  if ((d.nodeGroup === "llama") & (width > mobileWidth)) {
    return 29;
  } else if (d.nodeGroup === "llama") {
    return 14;
  } else {
    return 0;
  }
};

const nodeGroupMoveForceCollideUp = (d) => {
  if (d.nodeGroup == "resp") {
    return 15;
  } else if (d.nodeGroup == "llama") {
    return 37;
  } else {
    return 15;
  }
};

const nodeInitialXPlacement = (d) => {
  if (d.nodeGroup === "llama") {
    if (width > mobileWidth) {
      return width / 2;
    } else {
      return width / 4;
    }
  } else if (d.nodeGroup === "resp") {
    return width / 5;
  } else {
    // dsn
    return width / 5;
  }
};

const nodeInitialYPlacement = (d) => {
  if (d.nodeGroup === "llama") {
    if (width > mobileWidth) {
      return height / 3;
    } else {
      return height;
    }
  } else if (d.nodeGroup === "resp") {
    return height / 1.1;
  } else {
    // dsn
    return height / 1.1;
  }
};

const centPositions = { x: width / 2, y: height / 3 };

const roleScale = d3.scaleOrdinal().range(["coral", "olive", "skyblue"]);

// dsn dots need to live off-screen, until the final dsn build (so don't mess w/ other nodes)
let sampleData = d3
  .range(250)
  .map((d, i) => ({
    r: 40 - i * 0.5,
    value: width / 2 + d3.randomNormal(0, 1.5)() * 50,
    nodeGroup: i <= 23 ? "llama" : i <= 39 ? "resp" : "dsn",
    dotValue:
      i % 2 === 0
        ? d3.randomNormal(7, 2.5)().toFixed(1)
        : d3.randomNormal(4.5, 0.75)().toFixed(1),
    permDsn: d3.randomNormal(0, 1)().toFixed(1),
  }));

const center = d3.forceCenter().x(centPositions.x).y(centPositions.y);

const manyBody = d3.forceManyBody().strength(1);

let force = d3.forceSimulation().force("charge", manyBody);
force.force("x", d3.forceX().strength(1.5).x(nodeInitialXPlacement));
force
  .force("y", d3.forceY().strength(5.5).y(nodeInitialYPlacement))
  .force("collision", d3.forceCollide(nodeGroupInitialForceCollide))
  .alphaDecay(0.3)
  .nodes(sampleData)
  .on("tick", changeNetwork);

let dots = svgD3
  .selectAll(".dot")
  .data(sampleData)
  .enter()
  .append("g")
  .attr("class", (d) => (d.nodeGroup === "llama" ? "dot" : "dotResponse"))
  .attr("group", (d, i) => (i % 2 == 0 ? "true" : "false"));

function changeNetwork() {
  d3.selectAll("g.dot").attr("transform", (d) => `translate(${d.x}, ${d.y})`);
}

function loadRoughsvgD3(svgD3Data) {
  d3.selectAll(".dot").each(function (d, i) {
    let gParent = this;
    d3.select(svgD3Data)
      .selectAll("path")
      .each(function () {
        gParent.appendChild(
          rc.path(d3.select(this).node().getAttribute("d"), {
            stroke: "black",
            fillStyle: "hachure",
            strokeWidth: 0.35,
            fill: "rgba(131,131,131, .15)",
            roughness: 0.54,
          })
        );
      });
  });

  d3.selectAll("g.dot")
    .selectAll("path")
    .attr("transform", `scale(${scaleWidth})`);
}

var rc = rough.svg(svg);

d3.html("../assets/noun_28240_cc.svg", loadRoughsvgD3);

function nodeRandomPos(d) {
  if (d.nodeGroup === "llama") {
    if (width > mobileWidth) {
      return d.index <= 12 ? trtCenter : cntrlCenter;
    } else {
      return d.index <= 12 ? trtCenter : width / 1.35;
    }
  } else {
    return width / 2;
  }
}

function nodeRandomPosTwo(d) {
  if (d.nodeGroup === "llama") {
    return d.index > 12 ? trtCenter : cntrlCenter;
  } else {
    return width / 2;
  }
}

function nodeRandomPosThree(d) {
  if (d.nodeGroup === "llama") {
    return [1, 4, 7, 10, 11, 12, 13, 14, 15, 22, 21, 20].indexOf(d.index) > -1
      ? trtCenter
      : cntrlCenter;
  } else {
    return width / 2;
  }
}

function nodeRandomPosFour(d) {
  if (d.nodeGroup === "llama") {
    return [2, 4, 6, 9, 11, 16, 17, 18, 19, 22, 21, 20].indexOf(d.index) > -1
      ? trtCenter
      : cntrlCenter;
  } else {
    return width / 2;
  }
}

function nodeRandomPosFive(d) {
  if (d.nodeGroup === "llama") {
    return [3, 4, 7, 10, 11, 14, 15, 16, 19, 22, 21, 20].indexOf(d.index) > -1
      ? trtCenter
      : cntrlCenter;
  } else {
    return width / 2;
  }
}

function nodeRandomPosSix(d) {
  if (d.nodeGroup === "llama") {
    return [2, 4, 6, 9, 11, 16, 17, 1, 5, 8, 21, 20].indexOf(d.index) > -1
      ? trtCenter
      : cntrlCenter;
  } else {
    return width / 2;
  }
}

function nodeRandomPosSeven(d) {
  if (d.nodeGroup === "llama") {
    // randomly assign i-th llamas to treatment center, others to control center
    return [2, 4, 6, 9, 11, 16, 17, 18, 19, 3, 5, 7].indexOf(d.index) > -1
      ? trtCenter
      : cntrlCenter;
  } else {
    return width / 2;
  }
}

function nodeRandomPosEight(d) {
  if (d.nodeGroup === "llama") {
    return [1, 2, 3, 9, 11, 16, 17, 12, 14, 15, 21, 20].indexOf(d.index) > -1
      ? trtCenter
      : cntrlCenter;
  } else {
    return width / 2;
  }
}

function nodeRandomPosNine(d) {
  if (d.nodeGroup === "llama") {
    return [12, 14, 6, 9, 11, 16, 17, 18, 19, 22, 21, 20].indexOf(d.index) > -1
      ? trtCenter
      : cntrlCenter;
  } else {
    return width / 2;
  }
}

function nodeRandomPosTen(d) {
  if (d.nodeGroup === "llama") {
    return [12, 14, 5, 8, 12, 15, 14, 18, 19, 22, 2, 20].indexOf(d.index) > -1
      ? trtCenter
      : cntrlCenter;
  } else {
    return width / 2;
  }
}

function nodeRandomPosition(d) {
  if (d.nodeGroup === "llama") {
    return d.index > 12 ? trtCenter : cntrlCenter;
  } else {
    return width / 2;
  }
}

function shuffleTestStat(nodePositions, responseNode) {
  randomizeNodes(nodePositions);
  showTestStatisticNode(responseNode);
}

function moveNodes() {
  // move nodes to treatment groups
  force.force("center", null).alphaDecay(0.0005).velocityDecay(0.5);
  force.force("x", d3.forceX().strength(1).x(nodeTreatmentWidth));
  force
    .force("y", d3.forceY().strength(1).y(nodeTreatmentHeight))
    .force("collision", d3.forceCollide(nodeGroupMoveForceCollide));
  force.alpha(0.1).restart();
}

function showAllTestDsnNodes() {
  d3.selectAll(".testStatDsn")
    .transition()
    .duration(100) //1000
    .attr("r", 10);

  force
    .force("center", null)
    .force(
      "collision",
      d3.forceCollide((d) => 33)
    )
    .alphaDecay(0.02)
    .velocityDecay(0.5);
  force.force("x", d3.forceX().strength(1).x(nodeTreatmentWidth));
  force
    .force("y", d3.forceY().strength(1).y(nodeTreatmentHeight))
    .force("collision", d3.forceCollide(nodeGroupMoveForceCollideUp))
    .on("tick", changeNetwork);
  force.alpha(0.1).restart();
}

function randomizeNodes(nodePositions) {
  // shuffle ('permute') nodes
  force
    .force("center", null)
    .force("collision", d3.forceCollide(nodeGroupMoveForceCollide))
    .alphaDecay(0.0005)
    .velocityDecay(0.5)
    .force("x", d3.forceX().strength(1).x(nodePositions))
    .alpha(0.1)
    .restart();
}

function randomizeNodes2(nodePositions) {
  // shuffle ('permute') nodes
  force
    .force("center", null)
    .force("collision", d3.forceCollide(nodeGroupMoveForceCollide))
    .alphaDecay(0.0005)
    .velocityDecay(0.5)
    .force("x", d3.forceX().strength(1).x(nodePositions))
    .alpha(0.6)
    .restart();
}

function moveToCenter() {
  // move nodes to center (initial state)
  force.force("center", null).alphaDecay(0.045).velocityDecay(0.7);
  force.force("x", d3.forceX().strength(1.5).x(nodeInitialXPlacement));
  force
    .force("y", d3.forceY().strength(5.5).y(nodeInitialYPlacement))
    .force("collision", d3.forceCollide(nodeGroupInitialForceCollide));
  force.alpha(0.1).restart();
}

// group titles (transition 1 -> beyond)
const treatmentTitleCenter = trtCenter;
const controlTitleCenter = cntrlCenter;
let treatmentTitle = svgD3
  .append("text")
  .html("TREATMENT")
  .attr("x", trtCenter - 30)
  .attr("y", width > mobileWidth ? margin : margin * 6.05)
  .attr("class", "groupTitle")
  .style("fill", "black")
  .attr("text-align", "right")
  .attr("visibility", "hidden");
let controlTitle = svgD3
  .append("text")
  .html("CONTROL")
  .attr("x", controlTitleCenter)
  .attr("y", width > mobileWidth ? margin : margin * 6.05)
  .attr("class", "groupTitle")
  .style("fill", "black")
  .attr("visibility", "hidden");

// stuff for distribution
let dotDistRangeStart = width > mobileWidth ? width / 4 : width / 8;
let dotDistRangeEnd = width > mobileWidth ? width / 1.5 : width / 1.15;
let dotDistHeight = width > mobileWidth ? height : height + height / 1.05;
if (700 > width && width > mobileWidth && height > 550) {
  dotDistRangeStart = width / 8;
  dotDistRangeEnd = width / 1.15;
}
//x scales
const x = d3
  .scaleLinear()
  .domain(
    d3.extent(
      sampleData.filter((d) => d.nodeGroup === "dsn"),
      (d) => +d.permDsn
    )
  )
  .rangeRound([dotDistRangeStart, dotDistRangeEnd]); // hist width(left, right)

const nbins = 18;

function assignResponseNodes(d, i) {
  "testStat".concat(i);
  if (i < 1 && d.dataIndex < 15) {
    d3.select(this).classed("resonse".concat(d.dataIndex), true);
  }
}

function dotDistribution() {
  let data = sampleData.filter((d) => d.nodeGroup === "dsn");

  //histogram binning
  const histogram = d3
    .histogram()
    .domain(x.domain())
    .thresholds(x.ticks(nbins))
    .value((d) => d.permDsn);

  //binning data and filtering out empty bins
  const bins = histogram(data);

  //g container for each bin
  let binContainer = svgD3.append("g").selectAll(".gBin").data(bins);

  let binContainerEnter = binContainer
    .enter()
    .append("g")
    .attr("class", "gBin")
    .attr("transform", (d) => `translate(${x(d.x0)}, ${dotDistHeight})`);

  //need to populate the bin containers with data the first time
  binContainerEnter
    .selectAll(".preHistPosit")
    .data((d, i) =>
      d.map((p, j) => {
        return {
          idx: j,
          dataIndex: i,
          value: p.Value,
          radius: (x(d.x1) - x(d.x0)) / 1.9,
        };
      })
    )
    .enter()
    .append("g")
    .attr("class", "distributionCircleG")
    .attr("", function (d, i) {
      if (i < 1 && d.dataIndex == 20) {
        d3.select(this).classed("response1", true);
      } else if (i < 1 && d.dataIndex == 9) {
        d3.select(this).classed("response2", true);
      } else if (i < 1 && d.dataIndex == 5) {
        d3.select(this).classed("response3", true);
      } else if (i < 1 && d.dataIndex == 11) {
        d3.select(this).classed("response4", true);
      } else if (i < 1 && d.dataIndex == 7) {
        d3.select(this).classed("response5", true);
      } else if (i < 1 && d.dataIndex == 6) {
        d3.select(this).classed("response6", true);
      } else if (i < 1 && d.dataIndex == 13) {
        d3.select(this).classed("response7", true);
      } else if (i < 1 && d.dataIndex == 8) {
        d3.select(this).classed("response8", true);
      } else if (i < 1 && d.dataIndex == 2) {
        d3.select(this).classed("response9", true);
      } else {
        d3.select(this).classed("histogramNode", true);
      }
    })
    .attr("", function (d) {
      if (d.dataIndex > 19) {
        // determine which test-stat nodes to highlight
        d3.select(this).classed("extreme", true);
      } else {
        d3.select(this).classed("notExtreme", true);
      }
    })
    .attr(
      "transform",
      (d) =>
        `translate(-20, ${
          -d.idx * 2 * d.radius - d.radius - dotDistHeight / 8
        })`
    );
} //update

dotDistribution();

//////////////////////////////////////////////////
////////// Transition Functions /////////////////
//////////////////////////////////////////////////

function initRoughDistribution() {
  d3.selectAll(".distributionCircleG").each(function (d, i) {
    d3.select(this)
      .node()
      .appendChild(
        rc.path(roundPath, {
          stroke: "black",
          fillStyle: "hachure",
          strokeWidth: 2.25,
          fill: "pink",
          roughness: 5.85,
        })
      );
  });
  d3.selectAll(".distributionCircleG")
    .selectAll("path")
    .attr("transform", "scale(0.0,0.0)");
  d3.selectAll(".distributionCircleG")
    .selectAll("path")
    .style("fill", "pink")
    .style("opacity", 1);
}

function transitionZeroUp() {
  // initial position for dots
  moveToCenter();
  d3.selectAll(".groupTitle").each(function () {
    d3.select(this).transition().delay(100).attr("visibility", "hidden");
  });

  d3.selectAll(".dot")
    .select("path")
    .transition()
    .style("fill", "rgba(131, 131, 131, .05)");
}

function transitionZeroDown() {
  // initial position for dots

  d3.selectAll(".groupTitle").each(function () {
    d3.select(this).transition().delay(100).attr("visibility", "hidden");
  });
}

function transitionOneUp() {
  d3.selectAll("text.responseText").remove();

  d3.selectAll("g.responseStuff").transition().duration(1100).remove();
}

function transitionOneDown() {
  // color based on eatment assignment
  d3.selectAll(".dot")
    .select("path")
    .transition()
    .style("fill", (d, i) =>
      d.index % 2 == 0 ? "rgba(248,131,121, .3)" : "rgba(131, 238, 248, .3)"
    );

  // position llamas in treatment groups
  moveNodes();

  // // show titles
  d3.selectAll(".groupTitle").each(function () {
    d3.select(this).transition().delay(800).attr("visibility", "visible");
  });
}

function transitionTwoUp() {
  // move node back to original position
  d3.selectAll(".testStat0")
    .transition()
    .duration(2000)
    .attr("transform", "translate(0, 0)")
    .attr("r", 0);

  // hide response node
  d3.selectAll("circle.response1")
    .transition()
    .attr("r", (d) => 0);

  d3.selectAll(".distributionCircleG.response1")
    .selectAll("path")
    .transition()
    .duration(500)
    .attr("transform", "scale(0, 0)");

  // remove axis
  d3.select(".axis--x").remove();
}

let responseTextSize = width > mobileWidth ? "0.95rem" : "0.5rem";
let responseTextX = width > mobileWidth ? 1.8 : 1;
let responseTextY = width > mobileWidth ? 45.2 : 24;

function transitionTwoDown() {
  let respGroups = dots
    .filter((d) => d.nodeGroup === "llama")
    .append("g")
    .attr("class", "responseStuff");

  respGroups
    .append("text")
    .attr("class", "responseText")
    .html((d) => {
      if (d.dotValue == 9.4) {
        return 4.4;
      } else if (d.dotValue == 8.2) {
        return 5.8;
      } else if (d.dotValue == 9.1) {
        return 4.1;
      } else if (d.dotValue == 8.7) {
        return 7.7;
      } else {
        return d.dotValue;
      }
    })
    .attr("fill", "rgba(0, 0, 0, .3)")
    .attr("font-size", responseTextSize)
    .attr("stroke", "black")
    .attr("stroke-width", 0.25)
    .attr("x", responseTextX)
    .attr("y", responseTextY)
    .style("font-family", "Gaegu")
    .attr("visibility", "hidden")
    .raise();

  d3.selectAll(".responseText")
    .transition()
    .delay(100)
    .attr("visibility", "visible")
    .attr("font-size", "1.2rem")
    .transition()
    .attr("font-size", `${responseTextSize}`);

  // place test-statistic nodes for later reveal (one-by-one)
  initRoughDistribution();
}

function transitionThreeUp() {
  // move llamas back to original group
  moveNodes();

  d3.selectAll(".distributionCircleG.response2")
    .selectAll("path")
    .transition()
    .attr("transform", "scale(0, 0)");
}

let distributionDotScale = width > mobileWidth ? 0.11 : 0.055;

function showTestStatisticNode(response) {
  d3.selectAll(`.distributionCircleG${response}`)
    .selectAll("path")
    .transition()
    .duration(500)
    .attr("transform", "scale(0.125, 0.125)")
    .transition()
    .duration(500)
    .attr(
      "transform",
      `scale(${distributionDotScale}, ${distributionDotScale})`
    );
}

function transitionThreeDown() {
  // reveal response1 test-statistic
  showTestStatisticNode(".response1");

  svgD3
    .append("g")
    .attr("class", "axis axis--x")
    .attr("transform", "translate(0," + dotDistHeight / 1.12 + ")")
    .call(d3.axisBottom(x));
}

function transitionFourUp() {
  shuffleTestStat(nodeRandomPosTwo, ".response3");
  Array.from(Array(10).keys())
    .slice(3, 10)
    .map((i) => ".response".concat(i))
    .map((responseNode) => {
      d3.selectAll(responseNode)
        .selectAll("path")
        .transition()
        .duration(700)
        .attr("transform", "scale(0, 0)");
    });
}

function transitionFourDown() {
  // shuffle ('permute') nodes
  randomizeNodes(nodeRandomPos);
  showTestStatisticNode(".response2");
}

function transitionFiveUp() {
  // return llamas to their positions
  d3.selectAll(".dot")
    .selectAll("path")
    .transition()
    .duration(1600)
    .attr("transform", `translate(0, 0) scale(${scaleWidth})`);
  d3.selectAll(".responseText")
    .transition()
    .duration(1600)
    .attr("y", responseTextY);
  // re-add group titles
  d3.selectAll(".groupTitle")
    .transition()
    .delay(1400)
    .attr("visibility", "visible");

  d3.selectAll(".distributionCircleG.histogramNode")
    .selectAll("path")
    .transition()
    .duration(1000)
    .attr("transform", "scale(0, 0)");

  force
    .force("center", null)
    .force(
      "collision",
      d3.forceCollide((d) => 33)
    )
    .alphaDecay(0.0005)
    .velocityDecay(0.5);
  force.force("x", d3.forceX().strength(1).x(nodeTreatmentWidth));
  force
    .force("y", d3.forceY().strength(1).y(nodeTreatmentHeight))
    .force("collision", d3.forceCollide(nodeGroupMoveForceCollide))
    .on("tick", changeNetwork);
  force.alpha(0.1).restart();
  shuffleTestStat(nodeRandomPosFive, ".response6");
}

function transitionFiveDown() {
  // permute llama groupings multiple times
  loop(
    function () {
      shuffleTestStat(nodeRandomPosTwo, ".response3");
    },
    function () {
      shuffleTestStat(nodeRandomPosThree, ".response4");
    },
    function () {
      shuffleTestStat(nodeRandomPosFour, ".response5");
    },
    function () {
      shuffleTestStat(nodeRandomPosFive, ".response6");
    },
    function () {
      shuffleTestStat(nodeRandomPosSix, ".response7");
    },
    function () {
      shuffleTestStat(nodeRandomPosSeven, ".response8");
    },
    function () {
      shuffleTestStat(nodeRandomPosEight, ".response9");
    }
  );
}

function transitionSixUp() {
  d3.selectAll("circle.extreme").attr("fill", "pink").attr("stroke-width", 0.2);

  d3.selectAll(".distributionCircleG.extreme")
    .selectAll("path")
    .style("fill", "pink");
}

// hacky way to ensure smallest node keeps relative size (idk why this is a problem, but this solves it!)
let small_node_size_force = 5.5;

function transitionSixDown() {
  // move llamas off-screen, test-statistics off-screen & hide titles
  d3.selectAll(".dot")
    .selectAll("path")
    .transition()
    .duration(2000)
    .attr("transform", `translate(0, ${-height})`);
  d3.selectAll(".responseText").transition().duration(2000).attr("y", -2000);
  d3.selectAll(".groupTitle")
    .transition()
    .delay(700)
    .attr("visibility", "hidden");

  d3.selectAll(`.distributionCircleG.histogramNode`)
    .selectAll("path")
    .transition()
    .duration(800)
    .attr("transform", "scale(0.12, 0.12)")
    .transition()
    .duration(500)
    .attr(
      "transform",
      `scale(${distributionDotScale}, ${distributionDotScale})`
    );
}

function transitionSevenDown() {
  d3.selectAll(".distributionCircleG.extreme")
    .selectAll("path")
    .style("fill", "coral")
    .transition()
    .duration(500)
    .attr("transform", "scale(0.125, 0.125)")
    .transition()
    .duration(250)
    .attr(
      "transform",
      `scale(${distributionDotScale}, ${distributionDotScale})`
    );
}

function transitionSevenUp() {
  svgD3
    .append("g")
    .attr("class", "axis axis--x")
    .attr("transform", "translate(0," + dotDistHeight / 1.12 + ")")
    .call(d3.axisBottom(x));

  d3.selectAll(".distributionCircleG.extreme")
    .transition()
    .duration(1500)
    .attr(
      "transform",
      (d) =>
        `translate(-20, ${
          -d.idx * 2 * d.radius - d.radius - dotDistHeight / 8
        })`
    );

  d3.selectAll(".finalText").remove();
}

let finalTextSize = width > mobileWidth ? 20 : 14;

function transitionEightDown() {
  d3.selectAll(".distributionCircleG.response1")
    .append("text")
    .attr("x", width > mobileWidth ? 25 : 15)
    .attr("y", width > mobileWidth ? 35 : 20)
    .attr("class", "finalText")
    .text("n = 16")
    .attr("font-family", "Gaegu")
    .attr("font-size", 0)
    .attr("font-weight", "bold")
    .style("opacity", 0.7)
    .transition()
    .duration(1500)
    .attr("font-size", finalTextSize);

  // remove axis
  d3.select(".axis--x").remove();

  // split dot distribution into two
  let splitValue = width > mobileWidth ? 75 : 20;

  d3.selectAll(".distributionCircleG.extreme")
    .transition()
    .duration(1500)
    .attr(
      "transform",
      (d) =>
        `translate(${splitValue}, ${
          -d.idx * 2 * d.radius - d.radius - dotDistHeight / 8
        })`
    );
}

function transitionEightUp() {}
