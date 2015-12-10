var w = 700,
    h = w,
    r = w / 2,
    x = d3.scale.linear().range([0, 2 * Math.PI]),
    y = d3.scale.pow().exponent(1.3).domain([0, 1]).range([0, r]),
    p = 5,
    duration = 1000;

var color = d3.scale.category20c();
var maxSize = 0;

var div = d3.select("#vis");

div.select("img").remove();

var vis = div.append("svg")
    .attr("width", w + p * 2)
    .attr("height", h + p * 2)
  .append("g")
    .attr("transform", "translate(" + (r + p) + "," + (r + p) + ")");

div.append("p")
    .attr("id", "intro")
    .text("Click to zoom!");

var partition = d3.layout.partition()
    .sort(null)
//    .value(function(d) { return 5.8 - d.depth; });
    .value(function(d) { return d.size; });

var arc = d3.svg.arc()
    .startAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x))); })
    .endAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x + d.dx))); })
    .innerRadius(function(d) { return Math.max(0, d.y ? y(d.y) : d.y); })
    .outerRadius(function(d) { return Math.max(0, y(d.y + d.dy)); });

d3.json("nxEvidence.json", function(json) {
  var nodes = partition.nodes(json);
    
  var path = vis.selectAll("path").data(nodes);
  maxSize = nodes[0].value;
//    var g = svg.datum(dataResult).selectAll("g")
//    .data(partition.nodes)
//    .enter().append("g");
//    
  path.enter().append("path")
      .attr("id", function(d, i) { return "path-" + i; })
      .attr("d", arc)
      .attr("fill-rule", "evenodd")
//      .style("fill", colour)
      .style("fill", function(d) {return color((d.children ? d : d.parent).name); })
      .on("click", click);

  var text = vis.selectAll("text").data(nodes);
  var textEnter = text.enter().append("text")
      .style("opacity", 1)
      .style("visibility", function(e) {
        return showText(e) ? "visible" : "hidden";
      })
      .style("fill", function(d) {
        return brightness(d3.rgb(colour(d))) < 125 ? "#eee" : "#000";
      })
      .attr("class",function(d){return d.depth === 0 ?"title": d.depth === 1 ? "subtitle" :""})
      .attr("text-anchor", function(d) {
        return x(d.x + d.dx / 2) > Math.PI ? "end" : "start";
      })
      .attr("dy", ".2em")
      .attr("transform", function(d) {
        var multiline = (d.name || "").split(" ").length > 1,
            angle = d.depth <= 0 ? 0 : x(d.x + d.dx / 2) * 180 / Math.PI - 90,
            rotate = d.depth <= 0 ? 0 : angle + (multiline ? -.5 : 0),
            shift = d.depth <= 0 ? "-45,-25" : (y(d.y) + p);
        return "rotate(" + rotate + ")translate(" + shift + ")rotate(" + (angle > 90 ? -180 : 0) + ")";
      })
      .on("click", click)
//      .each(function (d) {
//          d3.select(this).style("visibility", showText(d) ? null : "hidden");
//      })
  ;
  textEnter.append("tspan")
      .attr("x", 0)
      .text(function(d) { return d.depth >=0 ? d.name.split(" ")[0] : ""; });
  textEnter.append("tspan")
      .attr("x", 0)
      .attr("dy", "1em")
      .text(function(d) { return d.depth >=0 ? d.name.split(" ")[1] || "" : ""; });

  textEnter.append("tspan")
      .attr("x", 0)
      .attr("dy", "1.1em")
      .text(function(d) { return d.depth >=0 ? d.name.split(" ")[2] || "" : ""; });

  textEnter.append("tspan")
      .attr("x", 0)
      .attr("dy", "1.2em")
      .text(function(d) { return d.depth >=0 ? d.name.split(" ")[3] || "" : ""; });

  function click(d) {
    maxSize = d.value;
      
    path.transition()
      .duration(duration)
      .attrTween("d", arcTween(d));

    // Somewhat of a hack as we rely on arcTween updating the scales.
    text
      .style("visibility", function(e) {
        return isParentOf(d, e) ? showText(e) ? "visible" : "hidden" : d3.select(this).style("visibility");
      })
      .transition().duration(duration)
      .attrTween("text-anchor", function(d) {
        return function() {
          return d.depth <= 0 ? "start" : x(d.x + d.dx / 2) > Math.PI ? "end" : "start";
        };
      })
      .attrTween("transform", function(d) {
        var multiline = (d.name || "").split(" ").length > 1;
        return function() {
          var angle = d.depth <= 0 ? 0 : x(d.x + d.dx / 2) * 180 / Math.PI - 90,
            rotate = d.depth <=  0 ? 0 : angle + (multiline ? -.5 : 0),
            shift = d.depth <= 0 ? "-45,-25" : (y(d.y) + p);
          return "rotate(" + rotate + ")translate(" + shift + ")rotate(" + (angle > 90 ? -180 : 0) + ")";
        };
      })
      .style("opacity", function(e) { return isParentOf(d, e) ? showText(e) ? 1 : 1e-6 : 1e-6; })
      .each("end", function(e) {
        d3.select(this).style("visibility", isParentOf(d, e) ? showText(e) ? null : "hidden" : "hidden");
      });
  }
});

function showText(a) {
//    console.log(a);
//    console.log("maxSize : " + maxSize + "; value : " + a.value);
    if (a.value < 1/100*maxSize) return false;
    else return true;
}
function isParentOf(p, c) {
  if (p === c) return true;
  if (p.children) {
    return p.children.some(function(d) {
      return isParentOf(d, c);
    });
  }
  return false;
}
function capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
function colour(d) {
  if (d.children) {
    // There is a maximum of two children!
    var colours = d.children.map(colour),
        a = d3.hsl(colours[0]),
        b = d3.hsl(colours[1]);
    // L*a*b* might be better here...
    return d3.hsl((a.h + b.h) / 2, a.s * 1.2, a.l / 1.2);
  }
  return d.colour || "#fff";
}

// Interpolate the scales!
function arcTween(d) {
  var my = maxY(d),
      xd = d3.interpolate(x.domain(), [d.x, d.x + d.dx]),
      yd = d3.interpolate(y.domain(), [d.y, my]),
      yr = d3.interpolate(y.range(), [d.y ? 20 : 0, r]);
  return function(d) {
    return function(t) { x.domain(xd(t)); y.domain(yd(t)).range(yr(t)); return arc(d); };
  };
}

function maxY(d) {
  return d.children ? Math.max.apply(Math, d.children.map(maxY)) : d.y + d.dy;
}

// http://www.w3.org/WAI/ER/WD-AERT/#color-contrast
function brightness(rgb) {
  return rgb.r * .299 + rgb.g * .587 + rgb.b * .114;
}