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

function genPointsForLinePoly(points){
	originalLen = points.length;
	for (i = originalLen - 2; i > 0;i = i - 1){
		points.push(points[i]);
	}
	
	return points;
}

//convert an array of strings into an array of integers ["1"] -> [1]
function convertStrArrToIntArr(strArr){
	intArr = []
	if(strArr == ""){
		return [];
	}
	for(var i = 0; i < strArr.length; i++) {
		intArr[i] = parseInt(strArr[i], 10);
	}
	return intArr;
}
//vars for GeoJson data, ordered/not by id.
var GJSONUnOrdered = [];
var GJSONOrdered = [];
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

//function for initalising map based variables
function makeMap(){
	//create a new map, centre on soton, using soton maps tiles
	mymap = L.map('map').setView([50.93564, -1.39614], 17);
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
	$.getJSON("B23&25RoomsAll.json", function(roomsJSON) {
		GJSONBuilding = roomsJSON;
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
//get the geojson data from the JSON file specified
function PopulateGJSONVars() {
	var geojson = [];
	$.ajax({
		'async': false,
		'global': false,
		'url': "/testNodes.json",
		'dataType': "json",
		'success': function (data) {
			geojson = data;
		}
	});
	//convert the string of property LinkedTo to an array of ints
	geojson.features.forEach(function(elem){
		elem.properties.LinkedTo = convertStrArrToIntArr(elem.properties.LinkedTo.split(','));
	});
	//an unordered list for use in foreach style situations on the data
	GJSONUnOrdered = geojson["features"].slice();
	//creates a ordered list where the data is sorted by 'id', which becomes its array index.
	geojson["features"].forEach(function(elem){
		GJSONOrdered[elem.properties.id] = elem;
	});
}

//function which draws all walkable lines
function drawAllLines(){
	clearLines();
	var nodesToBeDrawn = [];
	//create new array of objects ordered by id, with int list of indexes of linked nodes
	var val = GJSONOrdered;
	GJSONOrdered.forEach(function(elem){
		nodesToBeDrawn[elem.properties.id] = {
			'node': elem, 
			'linesToDo': elem.properties.LinkedTo.slice()
		}
	});	
	//draw the lines between nodes
	nodesToBeDrawn.forEach(function(currNode){
		if(currNode.linesToDo.length != 0){
			currNode.linesToDo.forEach(function(dest){
				var destNode = nodesToBeDrawn[dest];
				var index = destNode.linesToDo.indexOf(currNode.node.properties.id);
				//if the link is two-way, remove the other pointer, to prevent drawing the line twice
				if(index != -1){
					destNode.linesToDo.splice(index, 1);
				}
				//draw a line respresnting this edge
				console.log(currNode);
				if(currNode.node.properties.Level){
					drawLine([currNode.node.geometry.coordinates, destNode.node.geometry.coordinates], indoorLayer, {'Level': currNode.node.properties.Level});
				}else{
					drawLine([currNode.node.geometry.coordinates, destNode.node.geometry.coordinates], linesLayer, {});
				}
			});
		}
	});
}

//function to draw all nodes as markers.
function drawAllMarkers(){
	//clear the map of exisiting markers
	clearMarkers();
	//split the nodes data into levels
	var nodes = splitMarkerData();
	//add all the markers from the data
	indoorMarkerLayers = [];
	//for each level, check if it is the outdoor level (index -1)
	for(var key in nodes){
		if(key != -1){
			//for indoor layers create a new layer and add it to the correct indoor level layer
			indoorMarkerLayers[key] = new L.geoJson(nodes[key],{
				onEachFeature: function(feature,layer) {
					var popupText = feature.properties.id + "<br>" + feature.properties.Label + "<br>" + feature.properties.LinkedTo + "<br>";
					layer.bindPopup(popupText);
				}
			});
			indoorLayer._layers[key].addLayer(indoorMarkerLayers[key]);
		}else{
			markerLayer.addData(nodes[-1]);
		}
	}
}

//a function which splits marker data into levels
function splitMarkerData(){
	//split the GJSON into groups for floors and outdoor
	var splitNodes = [];
	//add the external markers to the external map
	splitNodes[-1] = [];
	//add each of the internal markers to their own layergroup, then add that group to the right 
	GJSONUnOrdered.forEach( function (elem) {
		if (elem.properties.hasOwnProperty("Level")){
			splitNodes[elem.properties.Level] ? splitNodes[elem.properties.Level].push(elem) : splitNodes[elem.properties.Level] = [elem];
		}else{
			splitNodes[-1].push(elem);
		}
	});
	return splitNodes;
}

//method for calculating the route between two specified nodes
function calcRoute(){
	//clear the map of exisiting lines
	clearLines();
	//get the inputs from the forms
	var startVal = parseInt($("#start")[0].value);
	var endVal = parseInt($("#end")[0].value);
	var routefound = false;
	var priorityQ = [];
	var startNode = GJSONOrdered[startVal];
	var endNode = GJSONOrdered[endVal];
	priorityQ[0] = {'val': distBetweenCoords(startNode.geometry.coordinates, endNode.geometry.coordinates), 'distTravelled': 0.0, 'node':startNode, 'route':[startVal]}
	//while there are nodes to be explored and the top item isnt a solution
	while(priorityQ.length > 0 &&priorityQ[0].route.indexOf(endVal) == -1){
		doOneNode(priorityQ, endNode);
	}
	//if there are no items in the list, there is no path, sorry.
	if(priorityQ.length == 0){
		console.log("No Route found");
	}else{
		//if there is an item on the list, then it is a solution, so we return that, yay.
		console.log("route: " + priorityQ[0].route);
		var routeCoordsInternal = [];
		var routeCoordsExternal = [];
		var currLev = getLevel(GJSONOrdered[priorityQ[0].route[0]]);
		var currLine = [];
		priorityQ[0].route.forEach(function(point){
		//split the route into levels
			var newNodeLev = getLevel(GJSONOrdered[point]);
			if (newNodeLev == currLev){
				currLine.push(GJSONOrdered[point].geometry.coordinates);
			}else{
				if(currLev == -1){
					drawLine(currLine,linesLayer, {'Level': currLev});
				}else{
					drawLine(currLine,indoorLayer, {'Level': currLev});
				}
				currLev = newNodeLev;
				currLine = [GJSONOrdered[point].geometry.coordinates];
			}
		});
		if(currLev == -1){
			drawLine(currLine,linesLayer, {'Level': currLev});
		}else{
			drawLine(currLine,indoorLayer, {'Level': currLev});
		}
	}
}

function getLevel(node){
	if(node.properties.hasOwnProperty("Level")){
		return node.properties.Level;
	}else{
		return -1;
	}
}
//method for calculating the nodes which can be navigated to from the top node in the index array.
//removes top node from index and adds new nodes to it
function doOneNode(index, dest){
	var currNode = index[0];
	index.splice(0,1);
	currNode.node.properties.LinkedTo.forEach(function(elem){
		if(currNode.route.indexOf(elem) == -1){
			//calc new index val, the 10000 is arbitrary to make the numbers not tiny.
			var currNodeCoords = currNode.node.geometry.coordinates;
			var destNodeCoords = GJSONOrdered[elem].geometry.coordinates;
			//calc the new dist travelled
			var newDist = currNode.distTravelled + distBetweenCoords(currNodeCoords, destNodeCoords);
			//calc the dist travelled + minimum dist to travel to destination
			var newVal = newDist + distBetweenCoords(currNodeCoords, dest.geometry.coordinates);
			//make new index object
			var newRoute = currNode.route.slice();
			newRoute.push(elem);
			var newIndexObj = {'val': newVal, 'distTravelled': newDist, 'node':GJSONOrdered[elem], 'route': newRoute};
			//find the first element of index which val is more than the val of the new object and insert the new object at that location
			if(index.length != 0){
				for(var i = 0; i < index.length; i++){
					if(index[i].val > newIndexObj.val){
						index.splice(i,0,newIndexObj);
						break;
					//if the new object would be added to the end of the list
					//so if we still havent 'break' by the end of the final loop, add it there.
					}else if(i == index.length - 1){
						index[index.length] = newIndexObj;
						break;
					}
				}
			}else{
				index[0] = newIndexObj;
			}
		}else{
			//would be a cycle, so we're not adding that node.
		}
	});
}

function distBetweenCoords(coord1, coord2){
	return Math.sqrt(Math.pow(coord1[0] - coord2[0] ,2) + Math.pow(coord1[1] - coord2[1],2))*10000;
}

//TODO: make this more efficent, as this task is not very scaleable
//function to clear all markers from their layer
function clearMarkers(){
	markerLayer.clearLayers();
	for (var key in indoorMarkerLayers){
		indoorLayer._layers[key].removeLayer(indoorMarkerLayers[key]);
	}
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

//function which returns all edges which are only unidirectionaly
function findOnewayLinks(){
	var foundone = false;
	//for each node, check all LinkedTo nodes have this node's ID in their LinkedTo property
	GJSONUnOrdered.forEach(function(point){
		if(point.properties.LinkedTo.length != 0){
			point.properties.LinkedTo.forEach(function(link){
				if(GJSONOrdered[link].properties.LinkedTo.indexOf(point.properties.id) == -1){
					//if the currNode is not linked back to by the other node, output the oneway link
					console.log(point.properties.id + ":::" + point.properties.LinkedTo);
					console.log(point.properties.id + " -\-> " + link + "\n");
					console.log(GJSONOrdered[link].properties.id + ":::" + GJSONOrdered[link].properties.LinkedTo);
					console.log("\n");
					foundone = true;
				}
			});
		}
	});
	//if no-one way links are discovered then tell the user this.
	if (!foundone){
		console.log("No one way links found!");
	}
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