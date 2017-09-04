<?php
switch ($_POST['action']) {
	case "edges":
		$var = file_put_contents(__DIR__ . '/Edges.json', $_POST['data']);
		echo var_export($var, true);
		break;
	case "nodes":
		$var = file_put_contents(__DIR__ . "/Nodes.json", $_POST['data']);
		echo var_export($var, true);
		break;
	case "index":
		file_put_contents(__DIR__ . "/Index.json", $_POST['data']);
		echo "index";
		break;
	default:
		echo "invalid action";		
		break;
}