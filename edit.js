//CODE
var nodeFileUrl = 'Nodes.json';
var edgeFileUrl = 'Edges.json';

var nodes = []
var edges = []
var sortedNodes = []

var outdoorLevID = -1

function init(){
	loadFiles();
	sortNodes();
	mymap.on('click', function(event){
		latlang = event.latlng;
		main([latlang.lng, latlang.lat]);
	});
	mymap.options.closePopupOnClick = false;
	markerLayer.options.onEachFeature = function(feature, layer) {
		layer.on('click', function(event){
			main(feature);
		});
	}
	drawAllNodes();
	drawAllEdges();
}

//method which loads nodes and edge files
function loadFiles(){
	nodes = loadFile(nodeFileUrl);
	edges = loadFile(edgeFileUrl);
}

//method which sorts the nodes by id
function sortNodes(){
	for(var index in nodes){
		id = nodes[index].properties.id;
		sortedNodes[id] = nodes[index]
	}
}

//fucntion which loads the sepcifed file and returns its contents
function loadFile(url){
	var contents = []
	$.ajax({
		'async': false,
		'global': false,
		'url': url,
		'dataType': "json",
		'success': function (data) {
			contents = data;
		}
	});
	return contents;
}

//draw all nodes on the map
function drawAllNodes(){
	//split the nodes data into levels	
	var levels = [];
	//for each level, check if it is the outdoor level (index -1)
	for(var index in nodes){
		node = nodes[index]
		if(typeof levels[node.properties.Level] === 'undefined'){
			levels[node.properties.Level] = [];
		}
		levels[node.properties.Level].push(node);
	}
	
	for(var level in levels){
		addMarkers(levels[level], level, 
			function(feature, layer) {
				layer.on('click', function(event){
				main(feature);
		});
	});
	}
}

function addNode(newNode){
	level = newNode.properties.Level;
	addMarkers(newNode, level, 
			function(feature, layer) {
				layer.on('click', function(event){
				main(feature);
			});
		});
}

//draw all edges on the map
function drawAllEdges(){
	for(var index in edges){
		edge = edges[index];
		edgeStartLev = sortedNodes[edge.nodes[0]].properties.Level;
		if(edgeStartLev != outdoorLevID){
			drawLine([sortedNodes[edge.nodes[0]], sortedNodes[edge.nodes[1]]], indoorLayer, {'Level': edgeStartLev});
		}else{
			drawLine([sortedNodes[edge.nodes[0]].geometry.coordinates, sortedNodes[edge.nodes[1]].geometry.coordinates], linesLayer, {'Level': edgeStartLev});
		}
	}
}

var selectedNode = null;
var activePopup = null

//main loop
function main(marker){
	
	if (activePopup) {
		console.log("Popup Active");
		return;
	}
	
	if(!selectedNode && !Array.isArray(marker)){
		console.log("Node selected");
		selectedNode = marker;
	} else if (!selectedNode && Array.isArray(marker)){
		createNode(marker, null);
	} else if (selectedNode && !Array.isArray(marker)){
		if(selectedNode == marker){
			console.log("Node deselected");
			selectedNode = null;
		} else {
			createEdge([selectedNode, marker]);
			selectedNode = null;
		}
	} else if (selectedNode && Array.isArray(marker)){
		createNode(marker, function(newNode){
			createEdge([selectedNode, newNode]);
			selectedNode = null;
		});
	}
}

function createNode(latlng, callback){
	//node creation popup
	createPopup([latlng[1], latlng[0]], function(success){
		if (success){
			//TODO: check valid Input
			coords = latlng.slice();
			level = document.getElementById("level").value;
			label = document.getElementById("label").value;
			roomRef = document.getElementById("roomRef").value;
			id = sortedNodes[sortedNodes.length - 1].properties.id + 1;
			
			newNode = 
			{"geometry": 
				{"type": "Point", "coordinates": coords}, 
			"type": "Feature", 
			"properties": 
				{"Level": level, "id": id, "Label": label, "RoomRef": roomRef}
			};
			console.log(newNode);
			nodes.push(newNode);
			sortedNodes[id] = newNode;
			if(typeof callback === 'function' && callback()){
				callback(newNode);
			}
			addNode(newNode);
			selectedNode = null;
			closeActivePopup();
		}else{
			closeActivePopup();
			console.log("canceled");
			selectedNode = null;
		}		
	});
}

function createPopup(latlng, callback){
	var popup = L.popup({closeButton: false});
	popup.setLatLng(latlng);
	popup.setContent(`
		<form id="frm1" action="/action_page.php">
			Label: <input type="text" id="label"><br>
			Level: <input type="text" id="level"><br>
			Room Referenced: <input type="text" id="roomRef"><br><br>
			<input type="button" value="Submit" id="submitbtn">
			<input type="button" value="Cancel" id="cancelbtn">
		</form>`);
	popup.openOn(mymap);
	document.getElementById("cancelbtn").onclick = function() {callback(false);};
	document.getElementById("submitbtn").onclick = function() {callback(true);};
	document.getElementById("level").value = indoorLayer._level;
	activePopup = popup;
}

function closeActivePopup(){
	mymap.closePopup();
	activePopup = null;
}

function createEdge(nodes){
	if (isDuplicateEdge(nodes)){
		console.log("DUPLICATE EDGE!");
	} else {
		console.log("TODO: Create Edge");
	}
}

//method which checks if the edge attempting to create already exists
function isDuplicateEdge(nodes){
	duplicate = false;
	if (nodes[1] != null){
		edges.forEach( function (elem) {
			node1index = elem.nodes.indexOf(nodes[0].properties.id);
			node2index = elem.nodes.indexOf(nodes[1].properties.id);
			if((node1index != -1) && (node2index != -1)){
				duplicate = true;
			}
		});
	}
	return duplicate;
}

//NOTES

/*
$.ajax({
  type: 'POST',
  url: url,//url of receiver file on server
  data: data, //your data
  success: success, //callback when ajax request finishes
  dataType: dataType //text/json...
});
*/