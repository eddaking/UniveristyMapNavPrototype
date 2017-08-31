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
		data = levels[level];
		if(level != -1){
			//for indoor layers create a new layer and add it to the correct indoor level layer
			data = new L.geoJson(data,{
				onEachFeature: main(data)
			});
		}
		addMarkers(data, level);
	}
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

//main loop
function main(marker){
	if(!selectedNode && !Array.isArray(marker)){
		console.log("Node selected");
		selectedNode = marker;
	} else if (!selectedNode && Array.isArray(marker)){
		createNode();
	} else if (selectedNode && !Array.isArray(marker)){
		if(selectedNode == marker){
			console.log("Node deselected");
			selectedNode = null;
		} else {
			createEdge([selectedNode, marker]);
			selectedNode = null;
		}
	} else if (selectedNode && Array.isArray(marker)){
		createNode();
		createEdge([selectedNode, null]);
		selectedNode = null;
	}
}

function createNode(){
	console.log("TODO: Create Node");
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
	edges.forEach( function (elem) {
		node1index = elem.nodes.indexOf(nodes[0].properties.id);
		node2index = elem.nodes.indexOf(nodes[1].properties.id);
		if((node1index != -1) && (node2index != -1)){
			duplicate = true;
		}
	});
	return duplicate;
}

//NOTES

/*
<form id="frm1" action="/action_page.php">
  First name: <input type="text" name="fname"><br>
  Last name: <input type="text" name="lname"><br><br>
  <input type="button" onclick="myFunction()" value="Submit">
</form>
<script>
function myFunction() {
    var x = document.getElementById("frm1");
    var text = "";
    var i;
    for (i = 0; i < x.length ;i++) {
        text += x.elements[i].value + "<br>";
    }
    document.getElementById("demo").innerHTML = text;
}
</script>
*/

/*
$.ajax({
  type: 'POST',
  url: url,//url of receiver file on server
  data: data, //your data
  success: success, //callback when ajax request finishes
  dataType: dataType //text/json...
});
*/


//focus problem
/*
Maybe map.options.closePopupOnClick = false

Ok, I see. This only happens if you take a shortcut and create the popup using mymarker.bindPopup("SomeText") instead of using let mypopup = leaflet.popup(); mymarker.bindPopup(mypopup)
*/

////on map click, create a marker
/*
openmap.on('click',function(event){
    var coordinates = event.latlng;
    placeMarker(coordinates);
    alert("Single click");
});
*/