//CODE
var nodeFileUrl = 'Nodes.json';
var edgeFileUrl = 'Edges.json';

var nodes = []
var edges = []
var sortedNodes = []

function editMarkerClick(feature, layer) {
	layer.on('click', function(event){
		main(feature);
	});
}

function init(){
	loadFiles();
	sortNodes();	
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
		addMarkers(levels[level], level, editMarkerClick);
	}
}

function addNode(newNode){
	level = newNode.properties.Level;
	addMarkers([newNode], level, editMarkerClick);
}

//draw all edges on the map
function drawAllEdges(){
	edges.forEach(function(edge){
		edgeStartLev = sortedNodes[edge.nodes[0]].properties.Level;
		drawEdge(edge, edgeStartLev);
	});
}

function drawEdge(edge, edgeStartLev){
	drawLine([sortedNodes[edge.nodes[0]].geometry.coordinates, sortedNodes[edge.nodes[1]].geometry.coordinates], edgeStartLev);
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
			nodes.push(newNode);
			sortedNodes[id] = newNode;
			if(typeof callback === 'function'){
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
	document.getElementById("level").value = getCurrIndoorLev();
	activePopup = popup;
}

function closeActivePopup(){
	mymap.closePopup();
	activePopup = null;
}

function createEdge(edgeNodes){
	if (isDuplicateEdge(edgeNodes)){
		console.log("DUPLICATE EDGE!");
	} else {
		newEdge = {"nodes": [edgeNodes[0].properties.id, edgeNodes[1].properties.id], "weight": 1, "otherProps": {}}
		edges.push(newEdge);
		drawEdge(newEdge, edgeNodes[0].properties.Level)
	}
}

//method which checks if the edge attempting to create already exists
function isDuplicateEdge(edgeNodes){
	duplicate = false;
	if (edgeNodes[1] != null){
		edges.forEach( function (elem) {
			node1index = elem.nodes.indexOf(edgeNodes[0].properties.id);
			node2index = elem.nodes.indexOf(edgeNodes[1].properties.id);
			if((node1index != -1) && (node2index != -1)){
				duplicate = true;
			}
		});
	}
	return duplicate;
}

function saveFiles(){
	save("nodes", JSON.stringify(nodes, null, '\t'));
	save("edges", JSON.stringify(edges, null, '\t'));
	
	var copy = JSON.parse(JSON.stringify(sortedNodes));
	edges.forEach(function(edge){
		linked = edge.nodes;
		if (!copy[linked[0]].properties.LinkedTo){
			copy[linked[0]].properties.LinkedTo = [linked[1]]
		}else{
			copy[linked[0]].properties.LinkedTo.push(linked[1])
		}
		if (!copy[linked[1]].properties.LinkedTo){
			copy[linked[1]].properties.LinkedTo = [linked[0]]
		}else{
			copy[linked[1]].properties.LinkedTo.push(linked[0])
		}
	});
	index = [];
	copy.forEach(function (elem){
		if (elem){
			index.push(elem);
		}
	});
	
	save("index", JSON.stringify(index, null, '\t'))
	
}

function save(item, objdata){
	$.ajax({
		type: "POST",
		url: 'updateFiles.php',//url of receiver file on server
		data: {
			action: item,
			data: objdata
		},
		success: function(data){
			console.log(data);
		}
	});
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