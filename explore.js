// mapResults.js

dojo.require("esri.map");
dojo.require("esri.layers.FeatureLayer");
dojo.require("esri.geometry");
dojo.require("dijit.TooltipDialog");
dojo.require("dijit.form.HorizontalSlider");
dojo.require('dijit.form.HorizontalRule');
dojo.require('dijit.form.HorizontalRuleLabels');

var mapResultsMap, mapLayerId = null, queries = {};
var highlightSymbol, featureLayer, featureLayerOption;
var grid = null, queries = null, previousAreaCode = null, previousAreaCodeClick = null;

function showTableQuery() {
	// show the query that is currently selected.
	var items = grid.selection.getSelected();

	if( items.length ) {
		showQuery(items[0].filename[0]);
	} else {
		alert('No query selected');
	}
}

/**
 * set the global variable queries with all the saved queries so we can show the
 * appropriate one when the mouse moves over an area
 */
function getTableQueries() {
	xmlhttp = new XMLHttpRequest();
	xmlhttp.open('GET', '{0}?method=list&random={1}'.format(globalOptions.query, Math.random()), false);
	xmlhttp.send();
	try {
		queries = JSON.parse(xmlhttp.responseText);
	} catch( e ) {
		alert('Error processing JSON reply ' + e.message);
		return;
	}

	grid.on("RowDblClick", function(evt) {
		var idx = evt.rowIndex;
		var rowData = grid.getItem(idx);
		showQuery(rowData.filename[0]);

	}, true);
}

function initDataQueriesTable() {
	function typeColumnFormatter(cellValue, rowIndex) {
		var altText = '';
		// options={"breakField":"REGION","mapLayerId":"SA3","
		altText = cellValue.mapLayerId[0];

		return '{0}'.format(altText);
	}
	grid = new dojox.grid.DataGrid({
		structure : [ {
			name : "Display",
			field : "select",
			editable : true,
			cellType : dojox.grid.cells.Bool,
			width : "20%"
		}, {
			name : "Name",
			field : "name",
			width : "80%"
		}, {
			name : "Map",
			field : "options",
			formatter : typeColumnFormatter,
			width : "0%"
		} ]
	}, "dataQueries");
	grid.startup();
}

function initExploreLayers() {
	console.log('initExploreLayers');
	if( !mapLayerId ) {
		mapLayerId = globalOptions.defaultExploreLayerId;
	}

	/**
	 * find the options for this map by matching to the correct layer in
	 * mapLayers.json
	 * 
	 * @param mapLayerId
	 *            {string} the id to search for
	 * @returns {object} the layer, null when cannot be found
	 */
	function getFeatureLayerOption(mapLayerId) {

		var xmlhttp, mapLayers = {};

		try {
			xmlhttp = new XMLHttpRequest();
			xmlhttp.open('GET', 'resources/mapLayers.json?' + randomString(8), false);
			xmlhttp.send();

			mapLayers = JSON.parse(xmlhttp.responseText);

		} catch( err ) {
			alert('mapLayers.json not specified correctly:' + err.message);
		}
		for( var m in mapLayers.layers ) {
			if( mapLayers.layers[m].id == mapLayerId ) {
				return mapLayers.layers[m];
			}
		}
		return null;
	}

	featureLayerOption = getFeatureLayerOption(mapLayerId);

	// Europe
	// featureLayerMap =
	// 'https://services.arcgis.com/HuLaMAzbcrbWfOM8/ArcGIS/rest/services/Outline_of_world_countries/FeatureServer/0';
	// are names are their English representation and in the form Capital.
	// "http://sampleserver1.arcgisonline.com/ArcGIS/rest/services/Specialty/ESRI_StateCityHighway_USA/MapServer/1"
	featureLayer = new esri.layers.FeatureLayer(featureLayerOption.featureLayerMap, {
		mode : esri.layers.FeatureLayer.MODE_ONDEMAND,
		outFields : featureLayerOption.outFields
	});

	var defaultSymbol = new esri.symbol.SimpleFillSymbol().setStyle(esri.symbol.SimpleFillSymbol.STYLE_NULL);
	defaultSymbol.outline.setStyle(esri.symbol.SimpleLineSymbol.STYLE_NULL);

	// create renderer
	// var renderer = new esri.renderer.ClassBreaksRenderer(defaultSymbol,
	// featureLayerOption.areaField);

	// renderer.addBreak(0, Infinity, defaultSymbol);

	// close the dialog when the mouse leaves the highlight graphic
	mapResultsMap.graphics.enableMouseEvents();

	// listen for when the onMouseOver event fires on the countiesGraphicsLayer
	// when fired, create a new graphic with the geometry from the event.graphic
	// and add it to the maps graphics layer
	dojo.connect(featureLayer, "onMouseOver", function(evt) {
		_onMouseOver(evt);
	});

	// listen for when the onMouseOver event fires on the countiesGraphicsLayer
	// when fired, create a new graphic with the geometry from the event.graphic
	// and add it to the maps graphics layer
	dojo.connect(featureLayer, "onClick", function(evt) {
		_onMouseClick(evt);
	});

	// featureLayer.setRenderer(renderer);
	mapResultsMap.addLayer(featureLayer);
	_onMapLayerChange();
}

/**
 * called after startup and when the map layer changes will populate the
 * available queries list/table with queries appropriate for this layer.
 */
function _onMapLayerChange() {
	var tableQueries = {};

	tableQueries.queries = [];

	for( z in queries.queries ) {
		var query = queries.queries[z];

		if( query.options.mapLayerId == featureLayerOption.id ) {
			// found a matching query, push a clone of the query
			// into the list, use JSON to clone the query so it is not messed up
			// when it goes
			// into the grid store
			var clonedQuery = JSON.parse(JSON.stringify(query))

			clonedQuery.queryJSON = JSON.stringify(query);
			tableQueries.queries.push(clonedQuery);
		}
	}

	var store = new dojo.data.ItemFileWriteStore({
		data : {
			items : tableQueries.queries
		}
	});
	grid.setStore(store);
}

function displayExploreMap() {
	// Australia
	var extentJSON = globalOptions.map_extent;
	var initialExtent = new esri.geometry.Extent(extentJSON);

	mapResultsMap = new esri.Map("map", {
		basemap : "streets",
		// center: [-95.625, 39.243],
		extent : initialExtent,
		zoom : 4,
		slider : false,
		isPan : false,
		isScrollWheelZoom : false,
		isShiftDoubleClickZoom : false
	});

	dojo.connect(mapResultsMap, "onLoad", initExploreLayers);
}

function initExplore() {
	console.log('initExplore() start');
	initDataQueriesTable();
	// populate the map selection
	var xmlhttp, mapLayers = {}, maps = [], randomJunk = randomString(8);

	try {
		xmlhttp = new XMLHttpRequest();
		xmlhttp.open('GET', 'resources/mapLayers.json', false);
		xmlhttp.send();

		mapLayers = JSON.parse(xmlhttp.responseText);

	} catch( err ) {
		alert('mapLayers.json not specified correctly:' + err.message);
		return;
	}
	for( var m in mapLayers.layers ) {
		maps.push({
			label : mapLayers.layers[m].name,
			id : mapLayers.layers[m].id
		});
	}
	var store = new dojo.store.Memory({
		data : maps
	});
	var select = new dijit.form.Select({
		store : new dojo.data.ObjectStore({
			objectStore : store
		})
	}, "mapLayers");
	select.startup();
	getTableQueries();
	displayExploreMap();
	console.log('initExplore() finished');
}
/**
 * Display information for the given area
 * 
 * @param areaName
 *            {string} name of the area
 * @param areaCode
 *            {string} codelist code of the area
 * @param nameId
 *            {string} id of the place to put the name and area code
 * @param informationId
 *            {string} id of the place to put the informations retrieved.
 */
function displayAreaInformation(areaName, areaCode, nameId, informationId) {

	dojo.byId(nameId).innerHTML = '{0} - {1}'.format(areaName, areaCode);

	var grid = dijit.byId('dataQueries');
	var store = grid.store;
	var queriesToDisplay = [];
	// Returns query results from the array that match the given query

	function gotItems(items, request) {
		for( var i = 0; i < items.length; i++ ) {
			queriesToDisplay.push(JSON.parse(store.getValue(items[i], "queryJSON")));
		}
	}

	store.fetch({
		query : {
			select : true
		},
		onComplete : gotItems
	});

	var s = '<ul>';
	for( var queryNumber in queriesToDisplay ) {
		// run a query for this one
		var query = queriesToDisplay[queryNumber];

		s += '<li>{0}</li>'.format(query.name);

		// replace geographic code for this area in the required query
		var breakField = query.options.breakField, areaSet = false;

		// qOr is presumed to have the break Field
		for( q in query.query0.qOr ) {
			if( query.query0.qOr[q].c == breakField ) {
				query.query0.qOr[q].v = areaCode;
				areaSet = true;
				break;
			}
		}
		if( areaSet ) {
			if( addQueryResults(query.query0, queryNumber, query.options) ) {
				var data = sdmxDataList[queryNumber].data;

				s += '<table><tr><th>{0} Period</th><th>{1}</th></tr>'.format(query.query0.frequency, query.query0.measure);
				for( var d = data.length - 1; d >= Math.max(0, data.length - 5); d-- ) {
					s += '<tr><td>{0}</td><td>{1}</td></tr>'.format(data[d].Time, data[d].Value);
				}
				s += '</table>'
			}
		} else {
			s += '<li>Geography field {0} not found</li>'.format(breakField);
		}

	}
	s += '</ul>'
	var displayPanel = dojo.byId(informationId);

	displayPanel.innerHTML = s;
}

function _onMouseClick(evt) {
	// add the measure value to the attributes for the area graphic
	var areaCode = evt.graphic.attributes[featureLayerOption.areaField];
	var areaName = evt.graphic.attributes[featureLayerOption.nameField];

	console.log('_onMouseClick: areaName: {0}, areaCode: {1}'.format(areaName, areaCode));

	if( areaCode == previousAreaCodeClick ) {
		dojo.byId('primaryArea').innerHTML = '[click on area to select]';
		dojo.byId('primaryInformation').innerHTML = '';
		previousAreaCodeClick = '';
		return;
	}
	previousAreaCodeClick = areaCode;

	displayAreaInformation(areaName, areaCode, 'primaryArea', 'primaryInformation');

}

function _onMouseOver(evt) {
	// add the measure value to the attributes for the area graphic
	var areaCode = evt.graphic.attributes[featureLayerOption.areaField];
	var areaName = evt.graphic.attributes[featureLayerOption.nameField];

	console.log('_onMouseOver: areaName: {0}, areaCode: {1}'.format(areaName, areaCode));

	if( areaCode == previousAreaCode ) {
		return;
	}
	previousAreaCode = areaCode;

	displayAreaInformation(areaName, areaCode, 'currentArea', 'currentInformation');

}
