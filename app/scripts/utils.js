function floatFromString(str) {
    return +str.replace(",",".");
}

var parseDate = d3.time.format("%Y-%m-%d").parse;


function extend(a, b){
    for(var key in b)
        if(b.hasOwnProperty(key))
            a[key] = b[key];
    return a;
}

// Append code to existing function
// Used to handle resize events
function chain(oldFunc, newFunc) {
  if (oldFunc) {
    return function() {
      oldFunc.call(this, arguments);
      newFunc.call(this, arguments);
    }
  } else {
    return newFunc;
  }
}