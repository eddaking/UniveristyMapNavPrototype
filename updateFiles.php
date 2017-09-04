<?php
switch ($_POST['action']) {
	case "edges":
		$var = file_put_contents(__DIR__ . '/Edges.json', $_POST['data']);
		echo "edges " . var_export($var, true);
		break;
	case "nodes":
		$var = file_put_contents(__DIR__ . "/Nodes.json", $_POST['data']);
		echo "nodes " . var_export($var, true);
		break;
	case "index":
		$var = file_put_contents(__DIR__ . "/Index.json", $_POST['data']);
		echo "index " . var_export($var, true);
		break;
	default:
		echo "invalid action";		
		break;
}