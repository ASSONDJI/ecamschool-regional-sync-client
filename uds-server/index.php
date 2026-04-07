<?php

// Allow any origin
header("Access-Control-Allow-Origin: *");

echo file_get_contents("./enseignements.json");
