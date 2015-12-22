LineChart = (function() {
    function LineChart(selector, data, opts) {
        var self = this;
        self.container = d3.select(selector);
        self.tooltipId = selector.replace("#","") + "-tip";
        defaultOpts = {
            tooltipContent: function(d) { return d; },
            yAxisTitle: "value",
            interpolate: "linear"
        }
        self.opts = extend(defaultOpts, opts);
        self.data = data;

        // Init
        self.drawChart();

        console.log(self.data)

        // Make responsize
        var existing_resize_fn = d3.select(window).on('resize');
        var new_resize_fn = chain(existing_resize_fn, function() {
            self.resize();
        })
        d3.select(window).on('resize', new_resize_fn);
    }

    LineChart.prototype.drawChart = function() {
        var self = this;
        var containerWidth = self.container[0][0].offsetWidth;

        // Setup sizing
        self.margins = m = {
            top: containerWidth * 0.02,
            right: containerWidth * 0.05,
            bottom: containerWidth * 0.1,
            left: Math.max(containerWidth * 0.12, 50)
        };
        self.width = w = containerWidth - m.left - m.right;
        self.height = h = w * 0.5;
        self.pointRadius = containerWidth * 0.012;
        self.clickablePointRadius = w / (self.data.length - 1) / 2;
        var fontSize = function(factor) { 
            factor = factor || 1;
            var minFontSize = 11;
            return Math.max(minFontSize, factor * containerWidth * 0.025) + "px";
        };

        // Create SVG container
        self.svg = self.container.append('svg')
            .attr('width', w + m.left + m.right)
            .attr('height', h + m.top + m.bottom)
            .attr("class", "linechart");
            
        self.chart = self.svg.append('g')
            .attr('transform', 'translate(' + m.left + ', ' + m.top + ')');


        // Functions for calculations
        self.x = d3.time.scale()
            .range([0, w])
            .domain(d3.extent(self.data, function(d) { return d.date; }));


        self.y = d3.scale.linear()
            .range([h, 0])
            .domain([d3.min(self.data, function(d) { return d.value; }), 5])
            //.domain([0, d3.max(self.data, function(d) { return d.value; })]);

        self.line = d3.svg.line()
            .x(function(d) { return self.x(d.date); })
            .y(function(d) { return self.y(d.value); })
            .interpolate(self.opts.interpolate);

        var yAxis = d3.svg.axis()
            .scale(self.y)
            .orient("left")
            .tickSize(-w)
            .ticks(5);


        // Define the axes
        var xAxis = d3.svg.axis().scale(self.x)
            .orient("bottom")
            .ticks(10);

        // Init tooltips
        self.tooltip = d3.tip()
            .attr('class', 'd3-tip linechart-tip')
            .attr('id', self.tooltipId)
            .html(self.opts.tooltipContent)
            .offset([self.clickablePointRadius - self.pointRadius - 10, 0]);
        self.chart.call(self.tooltip);
            
                
        // Draw y axis
        var yAxisGroup = self.chart.append("g")
              .attr("class", "y axis")
              .call(yAxis)

        // Yaxis title 
        yAxisGroup.append("text")
              .attr("class", "title")
              .attr("transform", "rotate(-90)")
              .attr("x", -h / 2)
              .attr("y", -m.left * 0.9)
              .attr("dy", ".7em")
              .style("text-anchor", "middle")
              .attr("font-size", fontSize(1.2))
              .text(self.opts.yAxisTitle);

        yAxisGroup.selectAll(".tick text")
            .attr("x", -6)
            .attr("font-size", fontSize());

        var xAxisGroup = self.chart.append("g")
              .attr("class", "x axis")
              .attr("transform", "translate(0," + self.height + ")")
              .call(xAxis)

        // Draw line chart
        self.chart.append("path")
            .datum(self.data)
            .attr("class", "line actual")
            .attr("d", self.line);
    }

    LineChart.prototype.addForecast = function(forecastData) {
        var self = this;
        var errorScale = d3.scale.linear()
            .domain([0, 2])
            .range(["green", "red"]);
        
        self.forecastLine = d3.svg.line()
            .x(function(d) { return self.x(d.forecastDate); })
            .y(function(d) { return self.y(d.value); })
            //.interpolate("step-after");

        self.forecastGroup = self.chart.selectAll("g.forecast-group")
            .data(forecastData)
            .enter()
            .append("g")
            .attr("class", "forecast-group hidden");

            console.log(forecastData)

        self.forecastGroup.append("path")
            .datum(function(d) { 
                return self._getActual(d.values[0].date).concat(d.values); 
            })
            .attr("class", "forecast line")
            .attr("d", self.forecastLine);

        var forecastErrorGroup = self.forecastGroup.selectAll("g.forecast-error")
            .data(function(d) { 
                return d.values.map(function(_d) {
                    var actual = self._getActual(_d.forecastDate);
                    _d.actual = actual.length ? actual[0].value : null;
                    _d.error = _d.value - _d.actual;
                    return _d;
                });
            })
            .enter()
            .append("g")
            .attr("class","forecast-error-group")
            .attr('transform', function(d) {
                var x = self.x(d.forecastDate);
                var y = self.y(d.value);
                return 'translate(' + x + ', ' + y + ')';
            });

        forecastErrorGroup.append("line")
            .attr("class","forecast-error line")
            .attr("x1", 0)
            .attr("x2", 0)
            .attr("y1", 0)
            .attr("y2", function(d) {
                return self.y(d.actual) - self.y(d.value);
            })
            .attr("stroke", function(d) { 
                return d.error > 0 ? "green" : "red";
                //return errorScale(Math.abs(d.error)); 
            })

        forecastErrorGroup.append("text")
            .text(function(d) { return formatNumber(d.error) + " %-enh. fel"; })
            .attr("dy", ".35em")
            .attr("x", 5);
    }

    LineChart.prototype.showForecast = function(date) {
        var self = this;
        self.forecastGroup.classed("hidden", function(d) {
            return !_isSameMonth(date, d.values[0].date);
        })
    }

    LineChart.prototype.resize = function() {
        var self = this;
        self.svg.remove();
        d3.select("#" + self.tooltipId).remove();

        self.drawChart();
    }

    function _isSameMonth(date0, date1) {
        return date0.getMonth() == date1.getMonth() && date0.getFullYear() == date1.getFullYear();
    }
    LineChart.prototype._getActual = function(date) {
        var self = this;
        return self.data.filter(function(d) {
            return _isSameMonth(d.date, date);   
        })
        .map(function(d) {
            d['forecastDate'] = new Date(d.date.getFullYear(), date.getMonth(), 1);
            return d;
        })
    } 

    return LineChart;
})();