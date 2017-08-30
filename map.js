//var for geojsondata used in drawing rooms on the map
var GJSONBuilding = [];

//var for the leaflet map element
var mymap = {};

//vars for the layers of information on the map
var markerLayer = {};
var indoorMarkerLayers = [];
var linesLayer = {};
var indoorLayer = {};

//create a level controller for internal nav
var levelControl = {};

//intial contents of the indoorLayer
var indoorLayers = [];

//function which draws a line between the specified array of points, on the specified layer
function drawLine(points, layer, opts){
	points = genPointsForLinePoly(points);
	var data = {
		"features": [
			{ "type": "Feature", 
				"properties": { 'Level': -1,
					"type": "Route" },
				"geometry": { "type": "Polygon", 
					"coordinates": [ points ]}
			}
		]
	}

	if (opts.hasOwnProperty("Level")){
		data.features[0].properties.Level = opts.Level;
	}
	layer.addData(data);
}

//method which creates a polgon in the shape of a line with the points specified
function genPointsForLinePoly(points){
	originalLen = points.length;
	for (i = originalLen - 2; i > 0;i = i - 1){
		points.push(points[i]);
	}
	return points;
}

//function for initalising map based variables
function makeMap(){
	//create a new map, centre on soton, using soton maps tiles
	mymap = L.map('map').setView([50.93564, -1.39614], 17);
	//http://tiles.maps.southampton.ac.uk/aer/{z}/{x}/{y}.png
	L.tileLayer('http://tiles.maps.southampton.ac.uk/map/{z}/{x}/{y}.png', {
		attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
		maxZoom: 20
	}).addTo(mymap);
	
	//create layers to add data to
	//when creating the marker layer, add a function to it so that when any new feayres are added a popup is created with the specified html
	markerLayer = L.geoJson([],{
			onEachFeature: function(feature,layer) {
				var popupText = feature.properties.id + "<br>" + feature.properties.Label + "<br>" + feature.properties.LinkedTo + "<br>";
				layer.bindPopup(popupText);
			}
		}).addTo(mymap);
		
	linesLayer = L.geoJson([],{
		style: function(feature) {
			return {
				fillColor: 'white',
				weight: 5,
				color: 'red',
				opacity: 1,
				fillOpacity: 1
			};
	}}).addTo(mymap);
	
	makeIndoorLayer();
}

//get data for the indoorLayer
function makeIndoorLayer(){
	$.getJSON("B37RoomsAll.json", function(roomsJSON) {
		GJSONBuilding = roomsJSON['features'];
		indoorLayer = new L.Indoor(GJSONBuilding, {
			getLevel: function(feature) { 
				if (feature.properties.length === 0){
					return null;
				}
				return feature.properties.Level;
			},
			onEachFeature: function(feature, layer) {
				layer.bindPopup(JSON.stringify(feature.properties) + "<br>" + '<input id="DrawRoute" type="button" value="Set Start" onclick=\'setNavPoint(' + JSON.stringify(feature.properties) + ',true)\' /><br><input id="DrawRoute" type="button" value="Set End" onclick=\'setNavPoint(' + JSON.stringify(feature.properties) + ',false)\' />');
			},
			//set the style for the items on the layer
			style: function(feature) {
				var fill = 'white';
				if (feature.properties.type === 'Way') {
					fill = '#169EC6';
				} else if ((feature.properties.type === 'Stairs') || (feature.properties.type === 'Lift') ) {
					fill = '#0A485B';
				} else if (feature.properties.type === 'Route')  {
					return {
						fillColor: 'white',
						weight: 5,
						color: 'red',
						opacity: 1,
						fillOpacity: 1
					}
				}
				return {
					fillColor: fill,
					weight: 1,
					color: '#666',
					fillOpacity: 1
				};
		}});
		//set the current level to show
		indoorLayer.setLevel("1");
		
		//leaflet-indoor layers are missing these methods, so I stole them from a blank geoJson layer.
		var blankGJson = new L.geoJson();
		indoorLayer._layerAdd = blankGJson._layerAdd;
		indoorLayer.fire = blankGJson.fire;
		indoorLayer.listens = blankGJson.listens;
		
		mymap.addLayer(indoorLayer);
		
		levelControl = new L.Control.Level({
			level: "1",
			levels: indoorLayer.getLevels()
		});
		// Connect the level control to the indoor layer
		levelControl.addEventListener("levelchange", indoorLayer.setLevel, indoorLayer);
		
		//add the level control to the map
		levelControl.addTo(mymap);
		
		//get a copy of the layers so that we can reset them as required
		indoorLayers = indoorLayer.getLayers();
	});
}

//TODO: make this more efficent, as this task is not very scaleable
//function to clear all markers from their layer
function clearMarkers(){
	markerLayer.clearLayers();
	for (var key in indoorMarkerLayers){
		indoorLayer._layers[key].removeLayer(indoorMarkerLayers[key]);
	}
	indoorMarkerLayers = [];
}			
//function to clear all lines from their layer
function clearLines(){
	linesLayer.clearLayers();
	
	//hacky solution to remove routes from map
	keys = Object.keys(indoorLayers);
	//get all the level layers from the indoorLayer
	for (var key in keys){		
		//get the keys to layers
		var currLayer = indoorLayers[keys[key]];
		var layerKeys = Object.keys(currLayer._layers)
		//search through all the layers from last to first to find any with the "Route" tag
		for (var y = layerKeys.length -1; y > 0 ; y = y - 1){
			//all the "Route" tagged features should have been added last and therefore are at the end of the list.
			if(currLayer._layers[layerKeys[y]].feature.properties.type == "Route"){
				//to remove the route, need to remove the layer, and the feature, so that it isnt redrawn when the layer is redrawn
				mymap.removeLayer(currLayer._layers[layerKeys[y]]);
				delete currLayer._layers[layerKeys[y]];
			}else{
				break;
			}
		}
	}
}
function addMarkerToMap(data){
	markerLayer.addData(data);
}
function addIndoorMarkerLayer(newLayer, key){
	indoorMarkerLayers[key] = newLayer;
	indoorLayer._layers[key].addLayer(newLayer);
}

//thing thing thing
function setNavPoint(point, start){
	
	//TODO: NOT LEAVE THIS HERE, FIX THE DATA TO INCLUDE A THING FOR BULIDING No
	var buildingNo = 23;
	if (start) {
		$("#start")[0].value = "" + buildingNo + point.id;
	}else{
		$("#end")[0].value = "" + buildingNo + point.id;
	}
}