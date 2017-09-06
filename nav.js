//vars for GeoJson data, ordered/not by id.
var GJSONUnOrdered = [];
var GJSONOrdered = [];

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

//get the geojson data from the JSON file specified
function PopulateGJSONVars() {
	var geojson = [];
	$.ajax({
		'async': false,
		'global': false,
		'url': "Index.json",
		'dataType': "json",
		'success': function (data) {
			geojson = data;
		}
	});
	//an unordered list for use in foreach style situations on the data
	GJSONUnOrdered = geojson.slice();
	//creates a ordered list where the data is sorted by 'id', which becomes its array index.
	geojson.forEach(function(elem){
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
				if(currNode.node.properties.Level){
					drawLine([currNode.node.geometry.coordinates, destNode.node.geometry.coordinates], currNode.node.properties.Level);
				}else{
					drawLine([currNode.node.geometry.coordinates, destNode.node.geometry.coordinates], -1);
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
	//for each level, check if it is the outdoor level (index -1)
	for(var key in nodes){
		data = nodes[key];
		addMarkers(data, key, 
			function(feature,layer) {
				var popupText = feature.properties.id + "<br>" + feature.properties.Label + "<br>" + feature.properties.LinkedTo + "<br>"  + feature.properties.RoomRef + "<br>";
				layer.bindPopup(popupText);
			}
		);
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

function getNodeFromRoomRef(roomref){
	for (index in GJSONUnOrdered){
		if (GJSONUnOrdered[index].properties.RoomRef == roomref){
			return GJSONUnOrdered[index];
		}
	}
	return false;
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
	var startNode = getNodeFromRoomRef(startVal);
	startVal = startNode.properties.id;
	var endNode = getNodeFromRoomRef(endVal);
	endVal = endVal = endNode.properties.id;
	priorityQ[0] = {'val': distBetweenCoords(startNode.geometry.coordinates, endNode.geometry.coordinates), 'distTravelled': 0.0, 'node':startNode, 'route':[startVal]}
	//while there are nodes to be explored and the top item isnt a solution
	while(priorityQ.length > 0 && priorityQ[0].route.indexOf(endVal) == -1){
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
				drawLine(currLine,currLev, {'Level': currLev});
				currLev = newNodeLev;
				currLine = [GJSONOrdered[point].geometry.coordinates];
			}
		});
		drawLine(currLine, currLev, {'Level': currLev});
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