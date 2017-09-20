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


//stairs icon
var stairs = new L.icon({
    iconUrl: 'http://data.southampton.ac.uk/map-icons/Offices/elevator_up.png',
    iconSize:     [32, 32], // size of the icon
    iconAnchor:   [16, 31], // point of the icon which will correspond to marker's location
});

//target icon
var target = new L.icon({
    iconUrl: 'http://data.southampton.ac.uk/map-icons/Culture-and-Entertainment/party-2.png',
    iconSize:     [32, 32], // size of the icon
    iconAnchor:   [16, 31], // point of the icon which will correspond to marker's location
});

//functions for click handling
function roomInfo(feature, layer) {
	//console.log( feature.properties.type);
	// JSON.stringify(feature.properties) + "<br>" +
	layer.bindPopup( '<h2>'+feature.properties.type+'</h2>'+ '<input id="DrawRoute" type="button" value="Set Start" onclick=\'setNavPoint(' + JSON.stringify(feature.properties) + ',true); closePopup();\' />&nbsp;<input id="DrawRoute" type="button" value="Set End" onclick=\'setNavPoint(' + JSON.stringify(feature.properties) + ',false); closePopup();\' />');
}
function markerDebug(feature,layer) {
	layer.bindPopup(feature.properties.id + "<br>" + feature.properties.Label + "<br>" + feature.properties.LinkedTo + "<br>"  + feature.properties.RoomRef + "<br>");
}
function markerEdit(feature, layer) {
	layer.on('click', function(event){
		main(feature);
	});
}
function markerLevelChange(feature, layer) {
	layer.on('click', function(event){
		main(feature);
	});
}
function closePopup() {
	// hacky but quick
	$(".leaflet-popup-close-button")[0].click();
}

//function which draws a line between the specified array of points, on the specified layer
function drawLine(points, level){
	points = genPointsForLinePoly(points);
	var data = {
		"features": [
			{ "type": "Feature", 
				"properties": { 'Level': level,
					"type": "Route" },
				"geometry": { "type": "Polygon", 
					"coordinates": [ points ]}
			}
		]
	}
	if (level == -1){
		linesLayer.addData(data);
	}else{
		indoorLayer.addData(data);
	}
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
function makeMap(navMode, callback){
	//create a new map, centre on soton, using soton maps tiles
	mymap = L.map('map').setView([50.93414, -1.39550], 19);
	//http://tiles.maps.southampton.ac.uk/aer/{z}/{x}/{y}.png
	L.tileLayer('http://tiles.maps.southampton.ac.uk/map/{z}/{x}/{y}.png', {
		attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
		maxZoom: 24
	}).addTo(mymap);
	
	if (!navMode){
		mymap.on('click', function(event){
			latlang = event.latlng;
			main([latlang.lng, latlang.lat]);
		});
		mymap.options.closePopupOnClick = false;
	}
	
	//create layers to add data to
	//when creating the marker layer, add a function to it so that when any new feayres are added a popup is created with the specified html
	markerLayer = L.geoJson([],{
			onEachFeature: (navMode ? markerDebug : markerEdit)
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
	
	makeIndoorLayer(navMode, callback);
}

//get data for the indoorLayer
function makeIndoorLayer(navMode, callback){
	$.getJSON("B37RoomsAll.json", function(roomsJSON) {
		GJSONBuilding = roomsJSON['features'];
		indoorLayer = new L.Indoor(GJSONBuilding, {
			getLevel: function(feature) { 
				
				if (Array.isArray(feature)){
					feature = feature[0];
				}
				
				if (feature.properties.length === 0){
					return null;
				}
				return feature.properties.Level;
			},
			onEachFeature: (navMode ? roomInfo : null),

			pointToLayer: function(feature, latlng) {
				
				if( feature.properties.type == "Marker" ) {
					return L.circle( latlng, { radius:0.5} );
				}
				if( feature.properties.type == "Target" ) {
					var m = L.marker([feature.geometry.coordinates[1],feature.geometry.coordinates[0]], {icon: target});
					return m;
				}
				if( feature.properties.type == "LevelChange" ) {
					var m = L.marker([feature.geometry.coordinates[1],feature.geometry.coordinates[0]], {icon: stairs});
					m.on('click', function(event){
						indoorLayer.setLevel(feature.properties.targetLevel.toString());
					});
					return m;
				}

    				return L.marker(latlng);
			},
			//set the style for the items on the layer
/*
			markerForFeature: function( feature ) {
			},
*/
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
		//if editing, replace the on each function from the indoor layer with a function for adding markers
		if(!navMode){
			indoorLayer.options.onEachFeature = markerEdit;
			for (key in indoorLayer._layers){
				indoorLayer._layers[key].options.onEachFeature = markerEdit;
			}
		}

		var startingLevel = "2";
		//set the current level to show
		indoorLayer.setLevel(startingLevel);
		
		//leaflet-indoor layers are missing these methods, so I stole them from a blank geoJson layer.
		var blankGJson = new L.geoJson();
		indoorLayer._layerAdd = blankGJson._layerAdd;
		indoorLayer.fire = blankGJson.fire;
		indoorLayer.listens = blankGJson.listens;
		
		mymap.addLayer(indoorLayer);
		
		//add a level selector to the screen
		levelControl = new L.Control.Level({
			level: startingLevel,
			levels: indoorLayer.getLevels()
		});
		// Connect the level control to the indoor layer
		levelControl.addEventListener("levelchange", indoorLayer.setLevel, indoorLayer);
		
		//add the level control to the map
		levelControl.addTo(mymap);
		
		//get a copy of the layers so that we can reset them as required
		indoorLayers = indoorLayer.getLayers();
		
		if (typeof callback === 'function'){
			callback();
		}
	});
}

//function to clear all markers from their layer
function clearMarkers(){
	//remove from outdoorlayer
	markerLayer.clearLayers();
	//remove from indoorLayer
	removeTypeLayerFromIndoor("Marker");
}			

//function to clear all lines from their layer
function clearLines(){
	//remove from outdoorlayer
	linesLayer.clearLayers();
	//remove from indoorLayer
	removeTypeLayerFromIndoor("Route");
	removeTypeLayerFromIndoor("Target");
	removeTypeLayerFromIndoor("LevelChange");
}

//function which removes all layers from the specifed indoor layer where the data property 'type' = type
function removeTypeLayerFromIndoor(type){	
	//hacky solution to remove routes from map
	keys = Object.keys(indoorLayers);
	//get all the level layers from the indoorLayer
	for (var keyi in keys){		
		//get the keys to layers
		var key = keys[keyi];
		var listObj = indoorLayers[key]._layers;
		listKeys = Object.keys(listObj);
		for( var lki in listKeys ) {
			var lk = listKeys[lki];
			if( lk.match( /\d+/ ) ) {
				var item = listObj[lk];
				if(!item['feature'] || item.feature.properties.type == type) {
					mymap.removeLayer( item );
					delete listObj[lk];
				}
			}
		}
	}
}

//method for adding markers to the map
function addMarkers(markers, key, type){
	//default val for type
	type =  (typeof type !== 'undefined') ? type : "Marker";
	//make each marker have 'type' property = "Marker"
	markers.forEach(function(elem){
		elem.properties.type = type;
	});
	if(key != -1){
		indoorLayer.addData(markers);
	} else {
		markerLayer.addData(markers);
	}
}

function addTargetMarker(coords, level ) {
	if (level == -1){
		var marker = L.marker([coords[1], coords[0]], {icon: target});
		marker.addTo(linesLayer);
		return;
	}

	var feature = {
		"features": [
			{ "type": "Feature", 
				"properties": { 'Level': level,
					"type": "Target" },
				"geometry": { "type": "Point", 
					"coordinates": coords }
			}
		]
	};
	indoorLayer._layers[level].addData(feature);
}





//method to add a marker which will change level when clicked
function addLevelChangeMarker(coords, startLev, endLev){	
	if (startLev == -1){
		var marker = L.marker([coords[1], coords[0]], {icon: stairs});
		marker.addTo(linesLayer);
		return;
	}

	var feature = {
		"features": [
			{ "type": "Feature", 
				"properties": { 'Level': startLev,
					"targetLevel": endLev,
					"type": "LevelChange" },
				"geometry": { "type": "Point", 
					"coordinates": coords }
			}
		]
	};
	indoorLayer._layers[startLev].addData(feature);
}

//get the indoor level 
function getCurrIndoorLev(){
	return indoorLayer._level;
}

//thing thing thing
function setNavPoint(point, start){
	//TODO: NOT LEAVE THIS HERE, FIX THE DATA TO INCLUDE A THING FOR BULIDING No
	var buildingNo = 37;
	if (start) {
		$("#start")[0].value = "" + buildingNo + point.id;
	}else{
		$("#end")[0].value = "" + buildingNo + point.id;
	}

	var startVal = parseInt($("#start")[0].value);
	var endVal = parseInt($("#end")[0].value);
	if( startVal && endVal ) {
		calcRoute();
	}
}
