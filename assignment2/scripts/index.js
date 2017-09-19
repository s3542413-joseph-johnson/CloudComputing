/*******************************************************
		GOOGLE MAP AND ROUTING
********************************************************/
var map;
var directionsService;
var directionsDisplay;
var start_lat;
var start_lng;
var dest_lat;
var dest_lng;

function initMap() {
	directionsService = new google.maps.DirectionsService;
	directionsDisplay = new google.maps.DirectionsRenderer;
	var melbourne = {
		lat: -37.813,
		lng: 144.963
	};
	map = new google.maps.Map(document.getElementById('map'), {
		zoom: 10,
		center: melbourne
	});

	setupStartAutoComplete(map);
	setupDestinationAutoComplete(map);

	directionsDisplay.setMap(map);
}

function setupDestinationAutoComplete(map) {
	var input = document.getElementById('destination_input');

	var autocomplete = new google.maps.places.Autocomplete(input);

	autocomplete.addListener('place_changed', function() {
		var place = autocomplete.getPlace();
		if (!place.geometry) {
			window.alert("No details available for: '" + place.name + "'");
			return;
		}
		dest_lat = place.geometry.location.lat();
		dest_lng = place.geometry.location.lng();
	});
}

function setupStartAutoComplete(map) {
	var container = document.getElementById('main');
	var input = document.getElementById('start_input');

	map.controls[google.maps.ControlPosition.TOP_RIGHT].push(container);

	var autocomplete = new google.maps.places.Autocomplete(input);

	autocomplete.addListener('place_changed', function() {
		var place = autocomplete.getPlace();
		if (!place.geometry) {
			window.alert("No details available for: '" + place.name + "'");
			return;
		}
		start_lat = place.geometry.location.lat();
		start_lng = place.geometry.location.lng();
	});
}

function planRoute() {
	var start = document.getElementById('start_input').value;
	var dest = document.getElementById('destination_input').value;

	var request = {
		origin: start,
		destination: dest,
		provideRouteAlternatives: true,
		travelMode: 'BICYCLING',
		unitSystem: google.maps.UnitSystem.METRIC
	}

	directionsService.route(request, function(response, status) {
		if (status == 'OK') {
			directionsDisplay.setDirections(response);
		} else {
			window.alert("Directions failed due to " + status);
		}
	});
	getDistance(start, dest);
	// getWeather(start_lat, start_lng);
	document.getElementById('info').style.display = "block";
	document.getElementById('history').style.display = "block";
}

function getDistance(start, dest) {
	var service = new google.maps.DistanceMatrixService();
	service.getDistanceMatrix(
		{
			origins: [start],
			destinations: [dest],
			travelMode: 'BICYCLING'
		}, distanceCallback);

}

function distanceCallback(response, status) {
	if (status == 'OK') {
		var origins = response.originAddresses;
		var destinations = response.destinationAddresses;

		for (var i = 0; i < origins.length; i++) {
			var results = response.rows[i].elements;

			for (var j = 0; j < results.length; j++) {
				var element = results[j];
				var distance = element.distance.text;
				var duration = element.duration.text;
				$("#distance").append('\t\t '+distance);
				$("#duration").append('\t\t '+duration);
			}
		}
	}
}

/***************************************************
		GOOGLE USER SIGN IN
****************************************************/
function onSignIn(googleUser) {
	var profile = googleUser.getBasicProfile();
	// console.log('ID: ' + profile.getId()); // Do not send to your backend! Use an ID token instead.
	// console.log('Name: ' + profile.getName());
	// console.log('Image URL: ' + profile.getImageUrl());
	// console.log('Email: ' + profile.getEmail()); // This is null if the 'email' scope is not present.
}

// Not currently used
function signOut() {
	var auth2 = gapi.auth2.getAuthInstance();
	auth2.signOut().then(function () {
		console.log('signed out');
	});
}


/************************************************************
		API-DATASTORE FUNCTIONS
*************************************************************/
function initApi() {
	gapi.client.load('rideendpoint', 'v1', null, 'https://cycleplan-s3542413.appspot.com/_ah/api');

	document.getElementById('save_route').onclick = function() {
		saveRide();
	}
}

function saveRide() {
	var _id = document.getElementById('user_id').value;
	var _s_lat = document.getElementById('s_lat').value;
	var _s_lng = document.getElementById('s_lng').value;
	var _d_lat = document.getElementById('d_lat').value;
	var _d_lng = document.getElementById('d_lng').value;


	var request = {};
	request.user_id = _id;
	request.start_lat = _s_lat;
	request.start_lng = _s_lng;
	request.dest_lat = _d_lat;
	request.dest_lng = _d_lng;

	gapi.client.rideendpoint.insertRide(request).execute(function (resp) {
			if (!resp.code) {
				console.log(_id);
				console.log(_s_lat);
				console.log(_s_lng);
				console.log(_d_lat);
				console.log(_d_lng);
				alert('ride saved');
			}
			else {
				alert('error');
			}
	});
}

/*********************************************************************
		WEATHER FUNCTIONS
**********************************************************************/
function getWeather(lat, long) {
	var url = "https://api.darksky.net/forecast/9eb9c37070bfd11b8f7dd8f0de01c1ca/" + lat + "," + long;
	$.getJSON(url, function(forecast) {
		console.log(forecast);
	});
}

/***********************************************************************
		VIC ROADS COLLISIONS DATA FUNCTIONS
************************************************************************/
function getData() {
	var start_suburb = $("#start_input").val();
	var dest_suburb = $("#destination_input").val();
	start_suburb = start_suburb.match(/[a-zA-Z\s]*(?=,)/);
	dest_suburb = dest_suburb.match(/[a-zA-Z\s]*(?=,)/);
	start_suburb = start_suburb[0].toUpperCase();
	dest_suburb = dest_suburb[0].toUpperCase();
	$.ajax(
		{
			url: 'https://services2.arcgis.com/18ajPSI0b3ppsmMt/arcgis/rest/services/Crashes_Last_Five_Years/FeatureServer/0/query?where=1%3D1&outFields=INJ_OR_FATAL,BICYCLIST,LGA_NAME_ALL&outSR=4326&f=json',
			dataType: 'json',
			success: function(data) {
				var names = data;
				var total_accidents = 0;
				$.each(names.features, function(k,v) {
						// console.log(v.attributes.LGA_NAME_ALL);
						if(v.attributes.LGA_NAME_ALL == start_suburb && v.attributes.BICYCLIST > 0) {
							total_accidents++;
						}
						if(v.attributes.LGA_NAME_ALL == dest_suburb && v.attributes.BICYCLIST > 0) {
							total_accidents++;
						}
				});
				total_accidents = total_accidents/5/52;
				$("#accidents").append('\t\t '+total_accidents.toFixed(2));
			}
		});
}
