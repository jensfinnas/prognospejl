// Format data for chart
function getChartData(data, key, dateStart) {
    return data
    .filter(function(d) {
        return d.date >= dateStart;
    })
    .map(function(d) {
        d.value = d[key];
        return d;
    })
}

function getForecastData(data, company, measure) {
    // Filter data
    var _data = data
    .filter(function(d) {
        return d.name == company && d[measure] != "";
    })
    .map(function(d) {
        d.value = d[measure];
        return d;
    })

    // Nest
    return d3.nest()
        .key(function(d) { return d.date; })
        .entries(_data)
        .sort(function(a,b) {
            return a.values[0].date - b.values[0].date;
        });
}