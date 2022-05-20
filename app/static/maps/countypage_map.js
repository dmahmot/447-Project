
var mapboxAccessToken = 'pk.eyJ1IjoiZG1haG1vdDEiLCJhIjoiY2wyZG9iZWZ0MTBndzNqbzJzdXNzb2h6bSJ9.2BX2tXgNFgi3dpWmam5zTA';

var wasClicked = false;
var countyClickedObj = null;

var clicked_style_options = {
  weight: 7,
  color: '#e40505',
  fillOpacity: .7
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
  dashArray: '3',
  fillOpacity: 0.4
};

// base map layer
var baseLayer = L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=' + mapboxAccessToken, {
  id: 'mapbox/light-v9',
  tileSize: 512,
  zoomOffset: -1,
  attribution: 'need to find'
})

// state layer
geojson_states = L.geoJson(statesData, {
  style: style,
  onEachFeature: onEachFeatureStates
})

// county layer
geojson_counties = L.geoJson(countiesData, {
  style: style,
  onEachFeature: onEachFeatureCounties
})

var map = L.map('map', {
  zoomSnap: .25,
  layers: [baseLayer, geojson_states]
}).setView([37.8, -96], 4);

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

map.fitBounds(getStateBounds());

function getColor(d) {
  return d > 10000 ? '#800026' :
    d > 5000 ? '#BD0026' :
      d > 2000 ? '#E31A1C' :
        d > 1000 ? '#FC4E2A' :
          d > 500 ? '#FD8D3C' :
            d > 200 ? '#FEB24C' :
              d > 100 ? '#FED976' :
                '#FFEDA0';
}

function style(feature) {
  return {
    fillColor: getColor(feature.properties.cases),
    weight: 2,
    opacity: 1,
    color: 'white',
    dashArray: '3',
    fillOpacity: 0.4
  };
}

function highlightFeatureStates(e) {

  if (!map.hasLayer(geojson_counties)) {

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
  }
}


function countyClick(e) {

  var layer = e.target;

  // same county was clicked, unhighlight everything and set wasClicked to false
  if (wasClicked && countyClickedObj.feature.properties.name == layer.feature.properties.name) {



    // console.log(clickedCounties.getLayers());
    console.log('same county clicked, removing ' + layer.feature.properties.name + ' from clicked group.')


    wasClicked = false;

    layer.setStyle(highlighted_style_options);

    // clickedCounties.clearLayers();
    info.update(layer.feature.properties);
    return
  }

  wasClicked = true;
  countyClickedObj = layer;
  console.log('countyClickedObj set as ' + countyClickedObj)

  resetHighlightCounties(e);


  // clickedCounties.clearLayers();
  // clickedCounties.addLayer(L.geoJson(layer.feature));


  if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
    layer.bringToFront();
  }

  info.update(layer.feature.properties);
}


function resetHighlightStates(e) {
  if (!map.hasLayer(geojson_counties)) {
    geojson_states.resetStyle(e.target);
  }
  if (!wasClicked) {
    info.update();
  }
}


function resetHighlightCounties(e) {
  geojson_counties.setStyle(normal_style_options);

  if (wasClicked) {
    countyClickedObj.setStyle(clicked_style_options);
  }
  else {
    info.update();
  }
}


function zoomToFeature(e) {
  map.fitBounds(e.target.getBounds());
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

  // county layer
  if (map.hasLayer(geojson_counties)) {
    this._div.innerHTML = (props ?
      '<h4>' + props.name + ' County </h4>' + 'Cases: ' + props.cases + '<br>' +
      'Vaccinations: ' + props.vaccinations
      : 'Hover over a County')
  }

  //state layer
  else {
    this._div.innerHTML = (props ?
      '<h4>' + props.name + '</h4>' + 'Click to view County Stats'
      : 'Click a state')
  }
};

info.addTo(map);

function swapToStates() {
  if (map.hasLayer(geojson_counties)) {
    map.removeLayer(geojson_counties);
    geojson_states.resetStyle();

  }
}

function swapToCounties() {
  if (map.hasLayer(geojson_states)) {
    // sets state outline to be grey instead of black, and slightly more bold
    geojson_states.setStyle({
      weight: 10,
      color: '#808080',
      dashArray: '',
      fillOpacity: .6

    });
    // add county layer
    map.addLayer(geojson_counties);
  }
  // make sure counties are in front
  geojson_counties.bringToFront();
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

map.on('moveend', function () {
  var cur_zoom_level = map.getZoom();
  var cur_map_center = map.getCenter();

  if (alaska()) {
    if (cur_zoom_level > 3.2) { // zoomed in enough
      swapToCounties();
    }
    else { // not zoomed in enough
      swapToStates();
    }
  }
  // if not alaska
  else {
    if (cur_zoom_level > zoom_threshold) {
      swapToCounties();
    }
    else {
      swapToStates();
    }
  }


})



var baseMaps = {
  "baseLayer": baseLayer,
};

var overlayMaps = {
  "counties": geojson_counties,
  "states": geojson_states
};

var control_options = {

  "collapsed": false,
  "hideSingleBase": true,
  "position": "bottomleft"
}

L.control.layers(baseMaps, overlayMaps, control_options).addTo(map);

function resetMapView() {
  map.fitBounds(getStateBounds());
}



