//function which draws a line between the specified array of points, on the specified layer
function drawLine(points, layer){
	layer.addData(
		{
			"type": "LineString",
			"coordinates": points
		});
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

//var for the leaflet map element
var mymap = {};

//vars for the layers of information on the map
var markerLayer = {};
var linesLayer = {};
//var indoorLayer = {};

//create a level controller for internal nav
var levelControl = {};

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
			onEachFeature: function(feature,layer) {layer.bindPopup(feature.properties.id + "<br>" + feature.properties.Label + "<br>" + feature.properties.LinkedTo);}
		}).addTo(mymap);
		
	linesLayer = L.geoJson().addTo(mymap);
	
	//get data for the indoorLayer
	$.getJSON("testInternals.json", function(geoJSON) {
		var indoorLayer = new L.Indoor(geoJSON, {
			getLevel: function(feature) { 
				if (feature.properties.length === 0)
					return null;
				return feature.properties.level;
			},
		});
		
		//set the current level to show
		indoorLayer.setLevel("0");
		mymap.addLayer(indoorLayer);
		
		levelControl = new L.Control.Level({
			level: "0",
			levels: indoorLayer.getLevels()
		});
		
		// Connect the level control to the indoor layer
		levelControl.addEventListener("levelchange", indoorLayer.setLevel, indoorLayer);
		
		//add the level control to the map
		levelControl.addTo(mymap);
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
				drawLine([currNode.node.geometry.coordinates, destNode.node.geometry.coordinates], linesLayer);
			});
		}
	});
}

//function to draw all nodes as markers.
function drawAllMarkers(){
	//clear the map of exisiting markers
	clearMarkers();
	//add all the markers from the data
	markerLayer.addData(GJSONUnOrdered);
}

//method for calculating the route between two specified nodes
function calcRoute(){
	//clear the map of exisiting lines
	clearLines();
	//get the inputs from the forms
	var startVal = parseInt($("#start")[0].value);
	var endVal = parseInt($("#end")[0].value);
	var routefound = false;
	var priorityQ = []
	priorityQ[0] = {'val': 0.0, 'node':GJSONOrdered[startVal], 'route':[startVal]}
	//while there are nodes to be explored and the top item isnt a solution
	while(priorityQ.length > 0 &&priorityQ[0].route.indexOf(endVal) == -1){
		doOneNode(priorityQ);
	}
	//if there are no items in the list, there is no path, sorry.
	if(priorityQ.length == 0){
		console.log("No Route found");
	}else{
		//if there is an item on the list, then it is a solution, so we return that, yay.
		console.log("route: " + priorityQ[0].route);
		var routeCoords = [];
		priorityQ[0].route.forEach(function(point){
			routeCoords.push(GJSONOrdered[point].geometry.coordinates);
		});
		//and draw the solution as a line
		drawLine(routeCoords,linesLayer);
	}
	
}

//method for calculating the nodes which can be navigated to from the top node in the index array.
//removes top node from index and adds new nodes to it
function doOneNode(index){
	var currNode = index[0];
	index.splice(0,1);
	currNode.node.properties.LinkedTo.forEach(function(elem){
		if(currNode.route.indexOf(elem) == -1){
			//calc new index val, the 10000 is arbitrary to make the numbers not tiny.
			var currNodeCoords = currNode.node.geometry.coordinates;
			var destNodeCoords = GJSONOrdered[elem].geometry.coordinates;
			var newDist = currNode.val + Math.sqrt(Math.pow(currNodeCoords[0] - destNodeCoords[0] ,2) + Math.pow(currNodeCoords[1] - destNodeCoords[1],2))*10000;
			//make new index object
			var newRoute = currNode.route.slice();
			newRoute.push(elem);
			var newIndexObj = {'val':newDist, 'node':GJSONOrdered[elem], 'route': newRoute};
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

//TODO: make this more efficent, as this task is not very scaleable
//function to clear all markers from their layer
function clearMarkers(){
	markerLayer.clearLayers();
}			
//function to clear all lines from their layer
function clearLines(){
	linesLayer.clearLayers();
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
					console.log(point.properties.id + " -\-> " + link + "\n");
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

