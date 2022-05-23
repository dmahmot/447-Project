
var mapboxAccessToken = 'pk.eyJ1IjoiZG1haG1vdDEiLCJhIjoiY2wyZG9iZWZ0MTBndzNqbzJzdXNzb2h6bSJ9.2BX2tXgNFgi3dpWmam5zTA';

var wasClicked = false;
var countyClickedObj = null;

var clicked_style_options = {
  weight: 5,
  color: 'white',
  fillOpacity: .6,
  dashArray: '1 5 1 5'
};
var highlighted_style_options = {
  weight: 5,
  color: '#3a3b3c',
  dashArray: '',
  fillOpacity: .6
};
var normal_style_options = {
  weight: 2,
  opacity: 1,
  color: 'white',
  dashArray: '',
  fillOpacity: 0.4
};

/*************************************
 * Geojson Layers
 ************************************/

// state layer
geojson_states = L.geoJson(statesData, {
  style: style_states,
  onEachFeature: onEachFeatureStates,
  interactive: true,
  layer_name: "states",

})

// county layer cases
geojson_counties_cases = L.geoJson(countiesData, {
  style: style_cases,
  onEachFeature: onEachFeatureCounties,
  layer_name: "counties_cases"
})

// county layer vaccinations
geojson_counties_vacc = L.geoJson(countiesData, {
  style: style_vaccinations,
  onEachFeature: onEachFeatureCounties,
  layer_name: "counties_vacc"
})

// county layer transmission
geojson_counties_trans = L.geoJson(countiesData, {
  style: style_transmission,
  onEachFeature: onEachFeatureCounties,
  layer_name: "counties_trans"
})

// updated when cases/vacc/transmission data visualization is switched
// checked when user zooms out to states and then back into counties to choose which data to display
// starting layer is counties-cases
var lastStatUp = geojson_counties_cases;


// county layer (overlay)
geojson_counties = L.geoJson(countiesData, {
  // onEachFeature: onEachFeatureCounties
  style: normal_style_options,
  layer_name: "counties"
})


// static base map layer
var baseLayer = L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=' + mapboxAccessToken, {
  id: 'mapbox/light-v9',
  tileSize: 512,
  zoomOffset: -1,
  attribution: 'need to find',
  layer_name: "baseLayer"
})

// static states base layer
var states_background_outline = L.geoJson(statesData, {
  opacity: .5,
  weight: 3,
  color: 'black',
  fillOpacity: 0,
  layer_name: "states-background-outline"
});

// don't add this to map. just used for looping through all possible layers
var geo_layers = L.layerGroup(geojson_states,
  geojson_counties_cases,
  geojson_counties_vacc,
  geojson_counties);


/* *****************************
* Color Key (Legend)
********************************/
var legend_control_options = {
  position: 'bottomright',
};

var vacc_legend = L.control(legend_control_options);
var cases_legend = L.control(legend_control_options);
var trans_legend = L.control(legend_control_options);

/* *****************************
* Color Key (Legend) Functions
********************************/

vacc_legend.onAdd = function (map) {

  var div = L.DomUtil.create('div', 'info legend'),
    grades = [1000, 5000, 50000, 250000, 1000000, 5000000]

  // loop through our density intervals and generate a label with a colored square for each interval
  for (var i = 0; i < grades.length; i++) {
    div.innerHTML +=
      '<i style="background:' + getColorVacc(grades[i] + 1) + '"></i> ' +
      grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+');
  }

  return div;
};

cases_legend.onAdd = function (map) {

  var div = L.DomUtil.create('div', 'info legend'),
    grades = [100, 200, 500, 1000, 2000, 5000, 10000]

  // loop through our density intervals and generate a label with a colored square for each interval
  for (var i = 0; i < grades.length; i++) {
    div.innerHTML +=
      // '<i style="background:' + getColorCases(grades[i] + 1) + '"></i> ' + grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '<');
      '<i style="background:' + getColorCases(grades[i] + 1) + '"></i> ' + (grades[i + 1] ? grades[i] + '&ndash;' + grades[i + 1] + '<br>' : grades[i] + '>');
  }

  return div;
};

trans_legend.onAdd = function (map) {

  var div = L.DomUtil.create('div', 'info legend'),
    grades = [0, 1, 2, 3, 4],
    labels = ['Low', 'Moderate', 'Substantial', 'High', 'Unknown']

  div.innerHTML += 'Risk Level<br>';
  // loop through our density intervals and generate a label with a colored square for each interval
  for (var i = 0; i < grades.length; i++) {
    div.innerHTML += '<i style="background:' + getColorTrans(grades[i]) + '"></i> ' + (grades[i] != null ? grades[i] + ' (' + labels[i] + ')<br>' : '');
  }
  return div;
};

/*************************************
 * Map Definition
 ************************************/

var map = L.map('map', {
  zoomSnap: .25,
  layers: [baseLayer,]
}).setView([37.8, -96], 4);

geojson_counties_cases.addTo(map);
states_background_outline.addTo(map);
geojson_counties_cases.bringToFront();
map.addControl(cases_legend);



var state_bounds = null;

function getStateBounds() {

  if (state_bounds) {
    return state_bounds;
  }
  else {
    for (let i = 0; i < statesData.features.length; i++) {
      if (statesData.features[i].properties.name == state_name) {
        state_bounds = L.geoJson(statesData.features[i]).getBounds();
        return state_bounds;
      }
    }
  }
}

map.fitBounds(getStateBounds(), { animate: true });

/*  
BLUE
#fff7fb  100
#ece7f2   50 
#d0d1e6   20
#a6bddb   10
#74a9cf    5
#3690c0    2
#0570b0    1
#034e7b   <1

PINK
#f1eef6 0 
#d7b5d8 1
#df65b0 2
#dd1c77 3 
#980043 4
*/


// blue
function getColorVacc(d) {
  return d > 5000000 ? '#034e7b' :
    d > 2500000 ? '#0570b0' :
      d > 1000000 ? '#3690c0' :
        d > 250000 ? '#74a9cf' :
          d > 50000 ? '#a6bddb' :
            d > 5000 ? '#d0d1e6' :
              d > 1000 ? '#ece7f2' :
                '#fff7fb';
}

// orangeish
function getColorCases(d) {
  return d > 10000 ? '#800026' :
    d > 5000 ? '#BD0026' :
      d > 2000 ? '#E31A1C' :
        d > 1000 ? '#FC4E2A' :
          d > 500 ? '#FD8D3C' :
            d > 200 ? '#FEB24C' :
              d > 100 ? '#FED976' :
                '#FFEDA0';
}

// PINK
function getColorTrans(d) {
  return d == 0 ? '#d7b5d8' :
    d == 1 ? '#df65b0' :
      d == 2 ? '#dd1c77' :
        d == 3 ? '#980043' :
          '#f1eef6';
}


// orangeish
function getColorStates(d) {
  return d > 10000 ? '#800026' :
    d > 5000 ? '#BD0026' :
      d > 2000 ? '#E31A1C' :
        d > 1000 ? '#FC4E2A' :
          d > 500 ? '#FD8D3C' :
            d > 200 ? '#FEB24C' :
              d > 100 ? '#FED976' :
                '#FFEDA0';
}

function style_states(feature) {
  // console.log('orig states style set.');

  return {
    fillColor: "#cfebfd",
    fillOpacity: .3,
    weight: 2,
    opacity: 1,
    color: 'white',
  };

}

function style_cases(feature) {
  return {
    fillColor: getColorCases(feature.properties.cases),
    weight: 2,
    opacity: 1,
    color: 'white',
    fillOpacity: 0.4
  };
}

function style_vaccinations(feature) {
  return {
    fillColor: getColorVacc(feature.properties.vaccinations),
    weight: 2,
    opacity: 1,
    color: 'white',
    fillOpacity: 0.4
  };
}

function style_transmission(feature) {
  return {
    fillColor: getColorTrans(feature.properties.transmission),
    weight: 2,
    opacity: 1,
    color: 'white',
    fillOpacity: 0.4
  };
}

function highlightFeatureStates(e) {

  // console.log('geojson_states mouseover: ' + e.target.feature.properties.name);

  if (!map.hasLayer(geojson_counties_cases) || !map.hasLayer(geojson_counties_vacc) || !map.hasLayer(geojson_counties_trans)) {

    var layer = e.target;

    layer.setStyle(highlighted_style_options);

    // console.log("zoom level: " + map.getZoom())
    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
      layer.bringToFront();
    }

    if (!wasClicked) {
      info.update(layer.feature.properties);
    }
  }
}

function highlightFeatureCounties(e) {

  // console.log('mouseover counties: ' + e.target.feature.properties.name);

  var layer = e.target;
  if (wasClicked && layer.feature.properties.name == countyClickedObj.feature.properties.name) {
    layer.setStyle(clicked_style_options);
  }
  else {
    layer.setStyle(highlighted_style_options);

    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
      layer.bringToFront();
    }

    if (!wasClicked) {
      info.update(layer.feature.properties);
    }
    else {
      info.update(countyClickedObj.feature.properties);
    }
  }
}


function countyClick(e) {
  zoomToFeature(e);
  var layer = e.target;
  // console.log('countyclick() - layer.feature.properties.name: ' + layer.feature.properties.name);

  // same county was clicked, unhighlight everything and set wasClicked to false
  if (wasClicked && countyClickedObj.feature.properties.name == layer.feature.properties.name) {
    // console.log(clickedCounties.getLayers());
    // console.log('same county clicked, removing ' + layer.feature.properties.name + ' from clicked group.')

    wasClicked = false;

    layer.setStyle(highlighted_style_options);

    // clickedCounties.clearLayers();
    info.update(layer.feature.properties);
    return
  }

  wasClicked = true;
  countyClickedObj = layer;
  // console.log('countyClickedObj set as ' + countyClickedObj)

  // console.log('manual reset highlight counties. : ' + layer.feature.properties.name);
  resetHighlightCounties(e);


  // clickedCounties.clearLayers();
  // clickedCounties.addLayer(L.geoJson(layer.feature));


  if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
    layer.bringToFront();
  }

  info.update(layer.feature.properties);
}


function resetHighlightStates(e) {

  // console.log('mouseout states: ' + e.target.feature.properties.name);

  if (!map.hasLayer(geojson_counties_cases) || !map.hasLayer(geojson_counties_vacc) || !map.hasLayer(geojson_counties_vacc)) {
    geojson_states.resetStyle(e.target);
  }
  if (!wasClicked) {
    info.update();
  }
}


function resetHighlightCounties(e) {

  // console.log('mouseout states: ' + e.target.feature.properties.name);


  if (map.hasLayer(geojson_counties_cases)) {
    geojson_counties_cases.setStyle(normal_style_options);
  }
  else if (map.hasLayer(geojson_counties_vacc)) {
    geojson_counties_vacc.setStyle(normal_style_options);
  }
  else if (map.hasLayer(geojson_counties_trans)) {
    geojson_counties_trans.setStyle(normal_style_options);
  }

  if (wasClicked) {
    countyClickedObj.setStyle(clicked_style_options);
  }
  else {
    info.update();
  }
}


function zoomToFeature(e) {
  map.fitBounds(e.target.getBounds(), { animate: true });
  // console.log('zoomToFeature() - e.target.blah.name: ' + e.target.feature.properties.name);
}

function onEachFeatureStates(feature, layer) {
  layer.on({
    mouseover: highlightFeatureStates,
    mouseout: resetHighlightStates,
    click: zoomToFeature
  });
}

function onEachFeatureCounties(feature, layer) {
  layer.on({
    mouseover: highlightFeatureCounties,
    mouseout: resetHighlightCounties,
    click: countyClick
  });
}

var info = L.control();

info.onAdd = function (map) {
  this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
  this.update();
  return this._div;
};


// method that we will use to update the control based on feature properties passed
info.update = function (props) {

  var style_options = '';
  // any of the county layers
  if (map.hasLayer(geojson_counties_vacc) || map.hasLayer(geojson_counties_cases) || map.hasLayer(geojson_counties_trans)) {
    style_options = 'font-weight:bold';
    var clicked_style_options = 'text-transform:uppercase;font-weight:800;';

    if (wasClicked) {
      style_options += clicked_style_options;
      // console.log('info.update. wasclicked=true - options: ' + style_options);
    }

    this._div.innerHTML = (props ?
      '<h4 style=' + style_options + '>' + props.name + ' County </h4>' + 'Cases: ' + props.cases + '<br>' +
      'Vaccinations: ' + props.vaccinations + '<br>' + 'Transmission Level: ' + props.transmission
      : 'Hover over a County')
  }

  //state layer
  else {
    style_options = 'font-weight:bold';
    this._div.innerHTML = (props ?
      '<h4 style=' + style_options + '>' + props.name + '</h4>' + 'Click to view County Stats'
      : 'Click a state')
  }
};

info.addTo(map);

function swapToStates() {

  // remove correct county layer
  if (map.hasLayer(geojson_counties_vacc)) {
    map.removeLayer(geojson_counties_vacc);
    map.removeControl(vacc_legend);
  }
  else if (map.hasLayer(geojson_counties_cases)) {
    map.removeLayer(geojson_counties_cases);
    map.removeControl(cases_legend);
  }
  else if (map.hasLayer(geojson_counties_trans)) {
    map.removeLayer(geojson_counties_trans);
    map.removeControl(trans_legend);
  }

  states_background_outline.resetStyle();
  //add states layer
  map.addLayer(geojson_states);
  geojson_states.resetStyle();

}


function swapToCounties() {
  if (map.hasLayer(geojson_states)) {

    // add county layer
    // console.log('adding lsatstat: ' + lastStatUp.options.layer_name)
    map.addLayer(lastStatUp);

    map.removeLayer(geojson_states);

    states_background_outline.setStyle({
      weight: 10,
      color: '#808080',
    });

  }

  // make sure counties are in front
  lastStatUp.bringToFront();
}


var zoom_threshold = 5.24;

// checks if map is currently above alaska
function alaska() {
  var cur_map_center = map.getCenter();
  if ((cur_map_center.lat < 76 && cur_map_center.lat > 55) && (cur_map_center.lng < -134 && cur_map_center.lng > -166)) {
    return 1;
  }
  else {
    return 0;
  }
}

map.on('moveend', function (e) {
  var cur_zoom_level = map.getZoom();

  if (alaska()) {
    if (cur_zoom_level > 3.2) { // zoomed in enough

      if (!map.hasLayer(geojson_counties_cases) && !map.hasLayer(geojson_counties_vacc) && !map.hasLayer(geojson_counties_trans)) {
        swapToCounties();
      }
    }
    else { // not zoomed in enough
      swapToStates();
    }
  }
  // if not alaska
  else {
    if (cur_zoom_level > zoom_threshold) {
      // if (!map.hasLayer(geojson_counties_cases) && !map.hasLayer(geojson_counties_vacc) && !map.hasLayer(geojson_counties_trans)) {
      if (map.hasLayer(geojson_states)) {
        swapToCounties();
      }
    }
    else {
      swapToStates();
    }

    // console.log('after moveend, lastStatUp: ' + lastStatUp.options.layer_name);
  }
})


// put cases and vacc here
var baseMaps = {
  "Cases": geojson_counties_cases,
  "Vaccinations": geojson_counties_vacc,
  "Transmission Level": geojson_counties_trans
};

var control_options = {
  "collapsed": false,
  "hideSingleBase": true,
  "position": "bottomleft"
}

var layer_control = L.control.layers(baseMaps, null, control_options).addTo(map);

var scale = L.control.scale({
  position: 'bottomleft'
}).addTo(map);



function resetMapView() {
  map.fitBounds(getStateBounds(), { animate: true });
}


map.on('layeradd', function (e) {

  const layeradded = e.layer.options.layer_name;

  // check which layer was added and save counties geojson obj in lastStatUp
  lastStatUp = layeradded == "counties_cases" ? geojson_counties_cases :
    layeradded == "counties_vacc" ? geojson_counties_vacc :
      layeradded == "counties_trans" ? geojson_counties_trans :
        layeradded == "counties" ? geojson_counties :
          layeradded == "states" ? lastStatUp :
            L.geoJson(null, { layer_name: "null_layer" });


  map.removeControl(vacc_legend);
  map.removeControl(cases_legend);
  map.removeControl(trans_legend);


  // add legend if county layer was added
  var _legend = layeradded == "counties_vacc" ? vacc_legend :
    layeradded == "counties_cases" ? cases_legend :
      layeradded == "counties_trans" ? trans_legend :
        null;

  if (_legend) {
    _legend.addTo(map);
    // console.log('legend added');
  }

  var trans_desc = "<span >Transmission Level represents how transmissable COVID-19 has been in the specified region."
  var cases_desc = "Cases is a cumulative total of reported COVID-19 cases from the specified region."
  var vacc_desc = "Vaccinations is a cumulative total of reported COVID-19 completed vaccinations from the specified region."

  var data_description = document.getElementById('data_description');
  data_description.innerHTML = '';
  data_description.innerHTML = map.hasLayer(geojson_counties_cases) ? cases_desc :
    map.hasLayer(geojson_counties_trans) ? trans_desc :
      map.hasLayer(geojson_counties_vacc) ? vacc_desc :
        map.hasLayer(geojson_states) ? 'Zoom in to view county Data' :
          '';

});








