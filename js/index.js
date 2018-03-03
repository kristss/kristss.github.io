
var svg = d3.select("svg"),
    width = +svg.attr("width"),
    height = +svg.attr("height"),
    scale = width * .45;

var formatTime = d3.time.format("%-I %p"),
    formatNumber = d3.format(".1f"),
    formatAngle = function(d) { return formatNumber(d) + "°"; };

var projection = d3.geo.projection(flippedStereographic)
    .scale(scale)
    .clipAngle(130)
    .rotate([0, -90])
    .translate([width / 2 + .5, height / 2 + .5])
    .precision(.1);

var path = d3.geo.path()
    .projection(projection);

svg.append("path")
    .datum(d3.geo.circle().origin([0, 90]).angle(90))
    .attr("class", "horizon")
    .attr("d", path);

svg.append("path")
    .datum(d3.geo.graticule())
    .attr("class", "graticule")
    .attr("d", path);

var ticksAzimuth = svg.append("g")
    .attr("class", "ticks ticks--azimuth");

ticksAzimuth.selectAll("line")
    .data(d3.range(360))
  .enter().append("line")
    .each(function(d) {
      var p0 = projection([d, 0]),
          p1 = projection([d, d % 10 ? -1 : -2]);

      d3.select(this)
          .attr("x1", p0[0])
          .attr("y1", p0[1])
          .attr("x2", p1[0])
          .attr("y2", p1[1]);
    });

ticksAzimuth.selectAll("text")
    .data(d3.range(0, 360, 10))
  .enter().append("text")
    .each(function(d) {
      var p = projection([d, -4]);

      d3.select(this)
          .attr("x", p[0])
          .attr("y", p[1]);
    })
    .attr("dy", ".35em")
    .text(function(d) { return d === 0 ? "N" : d === 90 ? "E" : d === 180 ? "S" : d === 270 ? "W" : d + "°"; });

svg.append("g")
    .attr("class", "ticks ticks--elevation")
  .selectAll("text")
    .data(d3.range(10, 51, 10))
  .enter().append("text")
    .each(function(d) {
      var p = projection([0, d]);

      d3.select(this)
          .attr("x", p[0])
          .attr("y", p[1]);
    })
    .attr("dy", ".35em")
    .text(function(d) { return d + "°"; });

navigator.geolocation.getCurrentPosition(located);

function located(geolocation) {
  var solar = solarCalculator([geolocation.coords.longitude, geolocation.coords.latitude]);

  d3.select("#waiting").transition()
      .style("opacity", 0)
      .remove();

  svg.insert("path", ".sphere")
      .attr("class", "solar-path");

  var sun = svg.insert("g", ".sphere")
      .attr("class", "sun");

  sun.append("circle")
      .attr("r", 6);

  sun.append("text")
      .attr("class", "sun-label sun-label--azimuth")
      .attr("dy", ".71em")
      .attr("y", 10);

  sun.append("text")
      .attr("class", "sun-label sun-label--elevation")
      .attr("dy", "1.81em")
      .attr("y", 10);

  var tickSun = svg.insert("g", ".sphere")
      .attr("class", "ticks ticks--sun")
    .selectAll("g");

  refresh();

  setInterval(refresh, 1000);

  function refresh() {
    var now = new Date,
        start = d3.time.day.floor(now),
        end = d3.time.day.offset(start, 1);

    svg.select(".solar-path")
        .datum({type: "LineString", coordinates: d3.time.minutes(start, end).map(solar.position)})
        .attr("d", path);

    sun
        .datum(solar.position(now))
        .attr("transform", function(d) { return "translate(" + projection(d) + ")"; });

    sun.select(".sun-label--azimuth")
        .text(function(d) { return formatAngle(d[0]) + " φ"; });

    sun.select(".sun-label--elevation")
        .text(function(d) { return formatAngle(d[1]) + " θ"; });

    tickSun = tickSun
      .data(d3.time.hours(start, end), function(d) { return +d; });

    tickSun.exit().remove();

    var tickSunEnter = tickSun.enter().append("g")
        .attr("transform", function(d) { return "translate(" + projection(solar.position(d)) + ")"; });

    tickSunEnter.append("circle")
        .attr("r", 2.5);

    tickSunEnter.append("text")
        .attr("dy", "-.31em")
        .attr("y", -6)
        .text(formatTime);
  }
}

d3.select(self.frameElement).style("height", height + "px");

function flippedStereographic(λ, φ)  {
  var cosλ = Math.cos(λ),
      cosφ = Math.cos(φ),
      k = 1 / (1 + cosλ * cosφ);
  return [
    k * cosφ * Math.sin(λ),
    -k * Math.sin(φ)
  ];
}
