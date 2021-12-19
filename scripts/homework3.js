
var mapSvg;

var lineSvg;
var lineWidth;
var lineHeight;
var lineInnerHeight;
var lineInnerWidth;
var lineMargin = { top: 20, right: 60, bottom: 60, left: 100 };
var mapData;
var timeData;

// This runs when the page is loaded
document.addEventListener('DOMContentLoaded', function() {
  mapSvg = d3.select('#map');
  lineSvg = d3.select('#linechart');
  lineWidth = +lineSvg.style('width').replace('px','');
  lineHeight = +lineSvg.style('height').replace('px','');;
  lineInnerWidth = lineWidth - lineMargin.left - lineMargin.right;
  lineInnerHeight = lineHeight - lineMargin.top - lineMargin.bottom;

  // Load both files before doing anything else
  Promise.all([d3.json('data/africa.geojson'),
               d3.csv('data/africa_gdp_per_capita.csv')])
          .then(function(values){
    
    mapData = values[0];
    timeData = values[1];
    
   
    drawMap();
  })

});

// Get the min/max values for a year and return as an array
// of size=2. You shouldn't need to update this function.
function getExtentsForYear(yearData) {
  var max = Number.MIN_VALUE;
  var min = Number.MAX_VALUE;
  for(var key in yearData) {
    if(key == 'Year') 
      continue;
    let val = +yearData[key];
    if(val > max)
      max = val;
    if(val < min)
      min = val;
  }
  return [min,max];
}

// Draw the map in the #map svg
function drawMap() {
  mapSvg.select('g').remove();
  
  // create the map projection and geoPath
  let projection = d3.geoMercator()
                      .scale(400)
                      .center(d3.geoCentroid(mapData))
                      .translate([+mapSvg.style('width').replace('px','')/2,
                                  +mapSvg.style('height').replace('px','')/2.3]);
  let path = d3.geoPath()
               .projection(projection);

  // get the selected year based on the input box's value
  let year = d3.select('#year-input').property('value')
  // var year = "2000";

  // get the GDP values for countries for the selected year
  let yearData = timeData.filter( d => d.Year == year)[0];
  // console.log(yearData)
  // get the min/max GDP values for the selected year
  let extent = getExtentsForYear(yearData);

  // get the selected color scale based on the dropdown value
  if(d3.select('#color-scale-select').property('value')=="interpolateRdYlGn")
    {var colorScale = d3.scaleSequential(d3.interpolateRdYlGn)
                     .domain(extent)
    }
  else if(d3.select('#color-scale-select').property('value')=="interpolateViridis")
  {
    var colorScale = d3.scaleSequential(d3.interpolateViridis)
                     .domain(extent);
  }
  else
  {
    var colorScale = d3.scaleSequential(d3.interpolateBrBG)
    .domain(extent);
  }
  // const cAxis = d3.axisBottom(colorScale);
  //   g.append('g').call(cAxis)
  //               .attr('transform',`translate(0,${innerHeight})`)
  // draw the map on the #map svg
  let g = mapSvg.append('g');
  var div = d3.select("body").append("div")
     .attr("class", "tooltip-donut")
     .style("opacity", 0); 
  g.selectAll('path')
    .data(mapData.features)
    .enter()
    .append('path')
    .attr('d', path)
    .attr('id', d => { return d.properties.name})
    .attr('class','countrymap')
    .style('fill', d => {
      let val = +yearData[d.properties.name];
      if(isNaN(val)) 
        return 'white';
      return colorScale(val);
    })
    .on('mouseover', function(d,i) {
        // d3.select(this).classed('highlighted',true)
        // div.transition()
        //        .duration(50)
        //        .style("opacity", 1);
        // let num =  'Country: '+(d.properties.name).toString()+'<br>GDP:'+(yearData[d.properties.name]);
        // div.html(num)
        //        .style("left", (d3.event.pageX + 10) + "px")
        //        .style("top", (d3.event.pageY - 15) + "px");
      console.log('mouseover on ' + d.properties.name);
    })
    .on('mousemove',function(d,i) {
      if(yearData[d.properties.name]=='')
      {
        yearData[d.properties.name]=0;
      }
      d3.select(this).classed('highlighted',true)
        div.transition()
               .duration(50)
               .style("opacity", 1);
        let num =  'Country: '+(d.properties.name).toString()+'<br>GDP: '+(yearData[d.properties.name]);
        div.html(num)
               .style("left", (d3.event.pageX + 10) + "px")
               .style("top", (d3.event.pageY -30) + "px");
      console.log('mousemove on ' + d.properties.name);
    })
    .on('mouseout', function(d,i) {
      d3.select(this).classed('highlighted',false)
      div.transition()
               .duration('50')
               .style("opacity", 0);
      console.log('mouseout on ' + d.properties.name);
    })
    .on('click', function(d,i) {
      drawLineChart(d.properties.name);
      console.log('clicked on ' + d.properties.name);
    });
  const linearGradient = g.append("linearGradient")
                          .attr("id", "linear-gradient")
  linearGradient.selectAll("stop")
    .data(colorScale.ticks().map((t, i, n) => ({ offset: `${100*i/n.length}%`, color: colorScale(t) })))
    .enter().append("stop")
    .attr("offset", d => d.offset)
    .attr("stop-color", d => d.color)
  g.append("rect")
    .attr("x",20)
    .attr("y",lineInnerHeight-15)
	  .attr("width", 200)
	  .attr("height", 20)
	  .style("fill", "url(#linear-gradient)")
    
  axisScale = d3.scaleLinear()
        .domain(colorScale.domain())
        .range([0, 200])

  g.append('g')
    .attr("class","ticks")
    .call(d3.axisBottom(axisScale).ticks(5)
    .tickSize(-20))
    .attr('transform',`translate(20,${lineInnerHeight+5})`)
                
}


// Draw the line chart in the #linechart svg for
// the country argument (e.g., `Egypt').
function drawLineChart(country) {
  lineSvg.select('g').remove();
  if(!country)
     {return;}
  timeData.forEach(d => {
      if(isNaN(d[country]))
      {
        d[country]=0
      }
      d[country] = +d[country]
      d["Year"] = +d["Year"];
  });
  const xScale = d3.scaleLinear()
                    .domain([1960,2011])
                    .range([0,lineInnerWidth])
  max_gdp =  d3.max(timeData, d => d[country])                  
  const yScale = d3.scaleLinear()
                    .domain([0, max_gdp]) 
                    .range([lineInnerHeight, 0]);
    const g = lineSvg.append('g')
                    .attr('transform',`translate(${lineMargin.left},${lineMargin.top})`);

        // Go ahead and add the y-axis and x-axis to the plot
  g.append('g')
        .attr('class','ticks1')
        .call(d3.axisLeft(yScale)
        .tickSize(-lineInnerWidth));      
  g.append('g')
      .attr('transform',`translate(0,${lineInnerHeight})`)
      .attr('class','ticks2')
     .call(d3.axisBottom(xScale)
     .ticks(10)
      .tickFormat(d => d%10==0 ? d:null)
            )
  const singleLine = d3.line()
            .x(d => xScale(d.Year))
            .y(d => yScale(d[country]))            
  g.append('path')
            .datum(timeData)  
            .attr('class','singleLine')      
            .style('fill','none')
            .style('stroke','black')
            .style('stroke-width','2')
            .attr('d', singleLine);          
  g.append('text')
            .attr('transform','rotate(-90)')
            .attr('y','-50px')
            .attr('text-anchor','middle')
            .attr('x',-lineInnerHeight/2)
            .style('font-size','18px')
            .style('fill','gray')
            .text('GDP for '+ country + ' (based on current USD)');
  g.append('text')
            .attr('transform',`translate(${lineInnerWidth/2},${lineInnerHeight+40})`)
            .style('fill','gray')
            .style('font-size','18px')
            .text('Year');
  var focus = g.append('g')
            .append('circle')
              .style("fill", "none")
              .attr("stroke", "black")
              .attr('r', 10)
              .style("opacity", 0)
        
          // Create the text that travels along the curve of chart
  var div = d3.select("body").append("div")
                  .attr("class", "tooltip-donut")
                  .style("opacity", 0);
  // Create a rect on top of the svg area: this rectangle recovers mouse position

  g.append('rect')
    .style("fill", "none")
    .style("pointer-events", "all")
    .attr('width', lineInnerWidth)
    .attr('height', lineInnerHeight)
    .on('mouseover', mouseover)
    .on('mousemove', mousemove)
    .on('mouseout', mouseout);
  function mouseover() {
      focus.style("opacity", 1)
      div.style("opacity",1)
    }
  let arr=[]
  for (let i = 0; i < 2011-1960+1; i++) {
       arr.push(i+1960);
    } 
  //console.log(timeData[0])  
  // console.log(arr)  
  function mousemove() {
      // recover coordinate we need
      var x0 = xScale.invert(d3.mouse(this)[0]);
      // console.log(x0)
      var i = d3.bisect(arr, x0,1);
      // console.log(i)
     selectedData = timeData[i]
    // console.log(selectedData)
      focus
        .attr("cx", xScale(selectedData.Year))
        .attr("cy", yScale(selectedData[country]))
      div
        .html("Year: " + selectedData.Year + "<br>" + "GDP: " + selectedData[country])
        .style("left", (d3.event.pageX + 20) + "px")
        .style("top", (d3.event.pageY - 30) + "px")
        .attr("x", xScale(selectedData.Year))
        .attr("y", yScale(selectedData[country]))
      }
  function mouseout() {
      focus.style("opacity", 0)
      div.style("opacity", 0)
    }
}
