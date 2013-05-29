// mapResults.js

dojo.require("esri.map");
dojo.require("esri.layers.FeatureLayer");
dojo.require("esri.geometry");
dojo.require("dijit.TooltipDialog");
dojo.require("dijit.form.HorizontalSlider");
dojo.require('dijit.form.HorizontalRule');
dojo.require('dijit.form.HorizontalRuleLabels');

var mapResultsMap, translationCodeList, mapToolTipDialog, mapChart1, heatMapColors;
var currentArea, mapChart1Legend, currentData, highlightSymbol, featureLayer, breakField, query, featureLayerOption;
var completedOperations = false, chartDialogPosition = 'left';
var currentIndex = 0;

function _onExtentChange(extent) {
	if( extent && queryOptions ) {
		// store the extent in the optionsField for saving
		queryOptions.extent = {
			xmax : extent.xmax,
			ymax : extent.ymax,
			ymin : extent.ymin,
			xmin : extent.xmin,
			spatialReference : {
				wkid : extent.spatialReference.wkid
			}
		};
		dojo.byId('options').value = encodeURIComponent(JSON.stringify(queryOptions));
	}
}

function mapChartResultsAddSeries(data, breakValue, seriesKey, seriesName) {
	// determine the by break series
	// breakValue as the value to split the series in data
	// data is an array of SDMX-ML object rows { Time, Value, SDMX_CONCEPTS,
	// .... }
	if( !currentArea )
		return;

	var seriesCount = mapChart1.series.length;

	for( var s in mapChart1.series ) {
		if( mapChart1.series[s].name == seriesName ) {
			mapChart1.removeSeries(seriesName);
			mapChart1.render();
			sliderRemoveTimeLine();
			mapChart1Legend.refresh();
			sliderUpdateTimeLine(sdmxData.timePeriods, sdmxData.timePeriods[dijit.byId('slider').value]);
			return;
		}
	}

	var fillColors = [ 'red', 'green', 'blue', 'lime', 'orange', 'purple', 'pink', 'brown', 'black' ];
	var series = [];

	for( var z in data ) {
		if( data[z][breakValue] == seriesKey ) {
			series.push(data[z].Value);
		}
	}
	seriesCount++;
	if( seriesCount >= fillColors.length )
		seriesCount = 0;
	mapChart1.addSeries(seriesName, series, {
		stroke : fillColors[seriesCount]
	});
	mapChart1.render();
	sliderRemoveTimeLine();
	mapChart1Legend.refresh();
	sliderUpdateTimeLine(sdmxData.timePeriods, sdmxData.timePeriods[dijit.byId('slider').value]);
}

function mapChartResultsInit(idLocation) {
	// adds a chart to idLocation and legend to idLocation+'Legend' using

	mapChart1 = new dojox.charting.Chart(idLocation);

	mapChart1.setTheme(dojox.charting.themes.Claro);
	mapChart1.addPlot("default", {
		type : dojox.charting.plot2d.Lines,
		markers : false
	});

	// http://stackoverflow.com/questions/7450690/add-a-line-not-a-series-to-a-dojo-chart
	mapChart1.addAxis("y2", {
		vertical : true,
		fontColor : "red",
		min : 0,
		max : 1.0,
		minorTicks : false,
		minorLabels : false,
		microTicks : false,
		majorLabels : false,
		leftBottom : false
	});
	mapChart1.addPlot("verticalLine", {
		type : "Columns",
		gap : 1,
		minBarSize : 1,
		maxBarSize : 1,
		vAxis : "y2"
	});

	var xLabelFunc = function(text, value, precision) {
		try {
			var label = sdmxData.timePeriods[Number(text) - 1];
			// console.log( label, ':', text, value, precision );
			return label;
		} catch( err ) {
			// console.log( 'xLabelFunc', err.message );
			return '';
		}
	};

	mapChart1.addAxis("x", {
		title : "Time",
		titleOrientation : "away",
		labelFunc : xLabelFunc,
		majorLabels : true,
		majorTickStep : 4,
		includeZero : true
	});
	mapChart1.addAxis("y", {
		vertical : true,
		includeZero : true,
		majorTickStep : 4
	});

	// Create the tooltip
	new dojox.charting.action2d.Tooltip(mapChart1, "default", {
		text : function(o) {
			var value = Number(o.y).toFixed(2);
			if( o.chart.series.length > 1 )
				return('{0}<br>{1}<br>{2}'.format(o.run.name, value, xLabelFunc(o.x)));
			else
				return('{0}<br>{1}'.format(value, xLabelFunc(o.x)));

		}
	});
	// Highlights an area: use the "chart" chart, and "default" plot
	new dojox.charting.action2d.Highlight(mapChart1, "default");
	mapChart1Legend = new dojox.charting.widget.SelectableLegend({
		chart : mapChart1,
		horizontal : true
	}, idLocation + "Legend");
	mapChart1.render();
}

// alter the value according to any options
function _performCalculations(data) {
	var perCapita = queryOptions.perCapita;

	for( var z in data ) {
		if( perCapita ) {
			data[z].Value = data[z].Value / data[z].population;
		}
	}
}

// adds the heat map key table to the map and returns a heat map for the
// renderer
// performs per captia calculations.

function _addHeatMapKey(data) {
	console.log('_addHeatMapKey: {0}'.format(data.length));

	var heatmap = new Rainbow();

	try {

		var maxValue = data[0].Value, minValue = data[0].Value;

		for( var z in data ) {
			var v = data[z].Value;

			if( v > maxValue )
				maxValue = v;
			if( v < minValue )
				minValue = v;
		}

		heatmap.setSpectrum(globalOptions.minHeatMapColor, globalOptions.maxHeatMapColor);
		if( minValue == maxValue ) {
			maxValue++; // cheating here.
		}
		heatmap.setNumberRange(minValue, maxValue);

		// make a key table of the color range

		var table = '<table>';
		for( z = 0; z < 5; z++ ) {
			var colorPos = minValue + (z * (maxValue - minValue) / 5);

			if( z == 4 )
				colorPos = maxValue;
			var hexColour = '#' + heatmap.colourAt(colorPos);
			table += '<td style="background-color:{0}">{1}</td></tr>'.format(hexColour, colorPos.toFixed(2));
		}
		table += '</table>';
		var keyTable = dojo.byId('keyTable');
		keyTable.innerHTML = table;
	} catch( e ) {
		console.log('_addHeatMapKey error:' + e.message);
		heatMap = null
	}
	return heatmap;
}

// creates the renderers for the data. returns new renderer
function _renderData(data) {
	console.log('_renderData()');
	heatMapColors = _addHeatMapKey(data);

	currentData = data;
	// merge map code and map name - find range for pretty colors

	for( var z in data ) {
		data[z].area = data[z][breakField];
		data[z].breakDescription = data[z][breakField];
		for( c in translationCodeList ) {
			if( translationCodeList[c].code == data[z][breakField] ) {
				data[z].breakDescription = translationCodeList[c].description;
				break;
			}
		}
	}

	// colour them shades of yellow to red.
	for( z in data ) {
		var v = data[z].Value;
		var hexColour = '#FFFFFF';

		if( !isNaN(v) ) {
			hexColour = '#{0}'.format(heatMapColors ? heatMapColors.colourAt(v) : 'FFFFFF');
		}

		data[z].areaColor = new dojo.Color(hexColour);
		data[z].areaColor.a = 0.5; // transparency
	}

	var defaultSymbol = new esri.symbol.SimpleFillSymbol().setStyle(esri.symbol.SimpleFillSymbol.STYLE_NULL);
	defaultSymbol.outline.setStyle(esri.symbol.SimpleLineSymbol.STYLE_NULL);

	// create renderer
	var renderer = new esri.renderer.UniqueValueRenderer(defaultSymbol, featureLayerOption.areaField);

	// add symbol for each possible value
	for( z in data ) {
		// console.log( '_renderData area {0} = {1} [{3}]'.format(
		// data[z].area,data[z].Value, z ) );
		var symbol = new esri.symbol.SimpleFillSymbol().setColor(data[z].areaColor);
		// symbol[globalOptions.breakField] = data[z][globalOptions.breakField];
		renderer.addValue(data[z].area, symbol);
	}
	mapDescribeData('mapDescription', {
		templateName : featureLayerOption.descriptionTemplate
	}, query, sdmxData, data);
	return renderer;
}
/**
 * adds a chart to the mouse over dialog of the highest and lowest breakField
 * values
 * 
 * @param where
 *            to place the chart
 * @param currentIndex -
 *            the index in the data of the area we are over.
 * @param data -
 *            the data to use to draw the chart
 */
function _dialogCompareChart(idLocation, currentIndex, data) {
	var chart1 = new dojox.charting.Chart(idLocation);
	var labels = [];

	chart1.setTheme(dojox.charting.themes.Claro);
	chart1.addPlot("default", {
		type : "Columns",
		markers : false
	});

	var xLabelFunc = function(text, value, precision) {
		try {
			var label = labels[value - 1];
			// console.log( label, ':', text, value, precision );
			return label.slice(0, 3);
		} catch( err ) {
			// console.log( 'xLabelFunc', err.message );
		}
		return null;
	};
	// add values for each column, one per breakValue
	var series = [], highest = 0, lowest = 0;
	for( var z in data ) {
		if( data[z].Value > data[highest].Value ) {
			highest = z;
		}
		if( data[z].Value < data[lowest].Value ) {
			lowest = z;
		}
	}

	series.push(data[highest].Value);
	labels.push(data[highest].breakDescription);
	if( currentIndex != highest && currentIndex != lowest ) {
		// don't include current twice
		series.push(data[currentIndex].Value);
		labels.push(data[currentIndex].breakDescription);
	}
	if( highest != lowest ) {
		series.push(data[lowest].Value);
		labels.push(data[lowest].breakDescription);
	}

	chart1.addAxis("x", {
		labelFunc : xLabelFunc,
		majorLabels : true,
		minorLabels : false,
		// rotation : -45,
		titleOrientation : "away"
	});
	chart1.addAxis("y", {
		vertical : true,
		includeZero : true
	});
	// console.log( 'series', series );
	chart1.addSeries('bar', series);
	chart1.render();
}

function _chartDialogMove() {
	if( chartDialogPosition == 'left' ) {
		chartDialogPosition = 'right';
	} else {
		chartDialogPosition = 'left';
	}
	closeDialog();
}

function _onMouseOver(evt) {
	var t = "<input type='button' onclick='_chartDialogMove();' value='{2}'/><strong>${{0}}</strong> - (${{1}})<br/>${DISPLAY_VALUE}<div id='littleChart' style='width:200px;height:150px'></div>"
			.format(featureLayerOption.nameField, breakField, chartDialogPosition == 'left' ? "--&gt;" : "&lt;--");

	if( !dojo.byId('compareChart').checked ) {
		return;
	}

	if( evt ) {
		// add the measure value to the attributes for the area graphic
		var areaName = evt.graphic.attributes[featureLayerOption.areaField];

		// console.log('_onMouseOver: areaName: {0}'.format(areaName));

		for( z in currentData ) {
			if( currentData[z].area == areaName ) {
				var displayValue = Number(currentData[z].Value).toFixed(2);
				evt.graphic.attributes.DISPLAY_VALUE = displayValue;
				evt.graphic.attributes.TIME_PERIOD = currentData[z].Time;
				evt.graphic.attributes[breakField] = currentData[z][breakField];
				currentIndex = z;
				break;
			}
		}

		var content = esri.substitute(evt.graphic.attributes, t);
		var highlightGraphic = new esri.Graphic(evt.graphic.geometry, highlightSymbol);
		mapResultsMap.graphics.add(highlightGraphic);

		mapToolTipDialog.setContent(content);
		currentArea = evt.graphic.attributes[breakField];
		dojo.style(mapToolTipDialog.domNode, "opacity", 0.90);
	}
	// attempt to place at bottom left of map, rather than over the top of
	// everything
	// may not work if it is not ocean.
	var map = dojo.byId('map');
	var dialogX = chartDialogPosition == 'left' ? 10 : map.clientWidth - 200;
	dialogY = map.clientHeight - 150;

	dijit.popup.open({
		popup : mapToolTipDialog,
		x : dialogX,
		y : dialogY
	});
	// display the highest and lowest values of the current time series data.
	_dialogCompareChart('littleChart', currentIndex, currentData);
}

function _onClick(evt) {
	// on click add the current map to the chart
	for( var z in currentData ) {
		if( currentData[z].area == currentArea ) {
			// series key will become the data label.
			var seriesKey = currentData[z][breakField];
			// console.log( seriesKey );
			// add or remove the series for this area code
			mapChartResultsAddSeries(sdmxData.data, breakField, seriesKey, currentData[z].breakDescription);
		}
	}
}

function closeDialog() {
	mapResultsMap.graphics.clear();
	dijit.popup.close(mapToolTipDialog);
	currentArea = null;
}

function initOperationalLayers() {
	console.log('initOperationalLayers');

	var data = sdmxData.latestData;

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

	featureLayerOption = getFeatureLayerOption(queryOptions.mapLayerId);

	var renderer = _renderData(data);

	dojo.byId('currentTimePeriod').innerHTML = data[0].Time;

	// Europe
	// featureLayerMap =
	// 'https://services.arcgis.com/HuLaMAzbcrbWfOM8/ArcGIS/rest/services/Outline_of_world_countries/FeatureServer/0';
	// are names are their English representation and in the form Capital.
	// "http://sampleserver1.arcgisonline.com/ArcGIS/rest/services/Specialty/ESRI_StateCityHighway_USA/MapServer/1"
	featureLayer = new esri.layers.FeatureLayer(featureLayerOption.featureLayerMap, {
		mode : esri.layers.FeatureLayer.MODE_ONDEMAND,
		outFields : featureLayerOption.outFields
	});

	featureLayer.setRenderer(renderer);

	// http://help.arcgis.com/en/webapi/javascript/arcgis/jssamples/#sample/fl_hover
	// sample code start
	mapToolTipDialog = new dijit.TooltipDialog({
		id : "tooltipDialog",
		style : "position: absolute; width: 250px; font: normal normal normal 10pt Helvetica;z-index:100"
	});
	mapToolTipDialog.startup();

	highlightSymbol = new esri.symbol.SimpleFillSymbol(esri.symbol.SimpleFillSymbol.STYLE_SOLID, new esri.symbol.SimpleLineSymbol(
			esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color([ 255, 0, 0 ]), 3), new dojo.Color([ 125, 125, 125, 0.35 ]));

	// close the dialog when the mouse leaves the highlight graphic
	mapResultsMap.graphics.enableMouseEvents();
	dojo.connect(mapResultsMap.graphics, "onMouseOut", closeDialog);

	// listen for when the onMouseOver event fires on the countiesGraphicsLayer
	// when fired, create a new graphic with the geometry from the event.graphic
	// and add it to the maps graphics layer
	dojo.connect(featureLayer, "onMouseOver", function(evt) {
		_onMouseOver(evt);
	});

	dojo.connect(mapResultsMap, "onClick", function(evt) {
		_onClick(evt);
	});
	// record when the extent is changing
	dojo.connect(mapResultsMap, "onExtentChange", _onExtentChange);
	mapResultsMap.addLayer(featureLayer);
	mapSliderInit('slider');
	mapChartResultsInit('chart');

	if( queryOptions.extent ) {
		// add a call back to set the extent after 2 seconds
		setTimeout(function() {
			console.log('Setting delayed extent');
			var extent = new esri.geometry.Extent(queryOptions.extent);
			mapResultsMap.setExtent(extent);
		}, 2000);
	}

	dojo.query('.hideOnLoad').forEach("dojo.removeClass(item, 'hideOnLoad')");
	dojo.style(dojo.byId('executing'), "display", "none");
	completedOperations = true;
}

/**
 * handler method for when the slider is changing value
 * 
 * @param value
 *            {int} index into the sdmxData.timePeriods array for the new time
 *            period to display
 */
function sliderOnChange(value) {
	// value is the index;
	// so select latestData as thing to map.
	var timePeriod = null;

	try {
		timePeriod = sdmxData.timePeriods[value];

	} catch( e ) {
	}
	;
	if( !timePeriod ) {
		return;
	}

	var data = []; // build the data for this time period

	for( var z in sdmxData.data ) {
		if( sdmxData.data[z].Time == timePeriod ) {
			data.push(sdmxData.data[z]);
		}
	}
	if( data.length ) {
		currentData = data;

		closeDialog();
		dojo.byId('currentTimePeriod').innerHTML = timePeriod;
		var renderer = _renderData(currentData);

		var oldRenderer = featureLayer.renderer;
		featureLayer.setRenderer(renderer);
		featureLayer.redraw();
		delete (oldRenderer);
		// put a vertical line on the chart where the time period is.
		sliderUpdateTimeLine(sdmxData.timePeriods, timePeriod);
	}
}

function mapSliderInit(controlId) {
	console.log('mapSliderInit');
	var sliderNode = dojo.byId(controlId);

	// add slider labels
	// http://dojo-toolkit.33424.n3.nabble.com/Programmatic-HorizontalRuleLabels-td964780.html
	var rulesNode = document.createElement('div');
	sliderNode.appendChild(rulesNode);
	var rulesNodeLabels = document.createElement('div');
	sliderNode.appendChild(rulesNodeLabels);

	// use at most 7 time periods.
	var labels = [], increment = Math.max(1, Math.round(sdmxData.timePeriods.length / 7));

	for( var q = 0; q < sdmxData.timePeriods.length; q += increment ) {
		if( q < sdmxData.timePeriods.length )
			labels.push(sdmxData.timePeriods[q]);
	}

	new dijit.form.HorizontalRule({
		count : labels.length,
		style : "height:1em;font-size:75%;color:gray;"
	}, rulesNode);

	new dijit.form.HorizontalRuleLabels({
		container : "topDecoration",
		count : labels.length,
		labels : labels,
		style : "height:2em;font-size:75%;color:gray;"
	}, rulesNodeLabels);

	var slider = new dijit.form.HorizontalSlider({
		name : "slider",
		value : sdmxData.timePeriods.length - 1,
		minimum : 0,
		maximum : sdmxData.timePeriods.length - 1,
		intermediateChanges : false,
		discreteValues : sdmxData.timePeriods.length,
		// style: "width:400px;",
		onChange : sliderOnChange
	}, sliderNode);

	slider.startup();
}

function mapResultResponse(xmlhttp, query) {
	var key = JSON.stringify(query);

	if( xmlhttp.responseText ) {
		sdmxData = parseQueryDataResponse(xmlhttp, breakField);
		// save the results of query to localStorage
		if( query && dataSeemsOk(sdmxData) && sdmxData.data.length > 0 ) {
			// only store proper results.

			storeJSON(key, sdmxData);
		}
	} else {
		sdmxData = xmlhttp;
	}

	if( !dataSeemsOk(sdmxData) ) {
		alert('Data read from sources apears to be invalid.  Please resubmit query.');
		localStorage.removeItem(key);
		return;
	}

	var areaPopulationList = getPopulation2010();

	function _addPopulationToData(areaPopulationList, data) {
		// add population to the area code list.
		for( var d in data ) {
			var area = data[d][breakField];
			if( areaPopulationList[area] ) {
				data[d].population = areaPopulationList[area].population;
			} else {
				console.log('population match not found {0}'.format(area));
				data[d].population = data[d].Value; // TODO: think how to deal
				// with this
			}
			if( data[d].population <= 0 ) {
				data[d].population = data[d].Value; // prevent divide by stupid
				// errors
			}
		}
	}
	_addPopulationToData(areaPopulationList, sdmxData.data);
	_addPopulationToData(areaPopulationList, sdmxData.latestData);

	_performCalculations(sdmxData.data);
	_performCalculations(sdmxData.latestData);
	// Australia
	var extentJSON = globalOptions.map_extent;
	var initialExtent = new esri.geometry.Extent(extentJSON);

	mapResultsMap = new esri.Map("map", {
		basemap : "streets",
		// center: [-95.625, 39.243],
		extent : initialExtent,
		zoom : 4,
		slider : true,
		isPan : false,
		isScrollWheelZoom : true,
		isShiftDoubleClickZoom : false
	});

	dojo.style(dojo.byId('executing'), "display", "none");

	dojo.connect(mapResultsMap, "onLoad", initOperationalLayers);
}

function mapResultResponseABS(response, query) {

	if( typeof (response) == 'string' ) {
		sdmxData = parseQueryDataResponseABS(response, breakField);
		// save the results of query to localStorage
		if( query && dataSeemsOk(sdmxData) && sdmxData.data.length > 0 ) {
			// only store proper results.
			var queryKey = JSON.stringify(query);

			storeJSON(queryKey, sdmxData);
		} else {
			alert('No data found');
			return;
		}
	} else {
		sdmxData = response;
	}

	if( !dataSeemsOk(sdmxData) ) {
		alert('Data read from sources apears to be invalid.  Please resubmit query.');
		localStorage.removeItem(key);
		return;
	}

	if( sdmxData.data.length <= 1 ) {
		alert('There are insufficient data points to map')
		return;
	}

	/*
	 * var areaPopulationList = getPopulation2010();
	 * 
	 * function _addPopulationToData(areaPopulationList, data) { // add
	 * population to the area code list. for (var d in data) { var area =
	 * data[d][globalOptions.breakField]; if (areaPopulationList[area]) {
	 * data[d].population = areaPopulationList[area].population; } else {
	 * console.log('population match not found {0}'.format(area));
	 * data[d].population = data[d].Value; // TODO: think how to deal with this }
	 * if (data[d].population <= 0) { data[d].population = data[d].Value; //
	 * prevent divide by stupid errors } } }
	 * _addPopulationToData(areaPopulationList, sdmxData.data);
	 * _addPopulationToData(areaPopulationList, sdmxData.latestData);
	 */

	tableResults(0, sdmxData);

	// add a handler to the table for double clicks

	// intiate a click handler to add code list values for queries.
	var grid = dijit.byId('queryResultsGrid0');

	grid.on("RowDblClick", function(evt) {
		var idx = evt.rowIndex;
		var rowData = grid.getItem(idx);

		// find index of the Time

		for( z in sdmxData.timePeriods ) {
			if( sdmxData.timePeriods[z] == rowData.Time[0] ) {
				var slider = dijit.byId('slider');
				slider.setValue(z);
				break;
			}
		}
	}, true);

	_performCalculations(sdmxData.data);
	_performCalculations(sdmxData.latestData);
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

	console.log('map loaded?:{0}'.format(mapResultsMap.loaded));

	dojo.connect(mapResultsMap, "onLoad", initOperationalLayers);
	// TODO: a horrible hack to load the layers if "onLoad" seems not to work.
	setTimeout(function() {
		if( !completedOperations ) {
			console.log('Delayed initOperationalLayers()');
			initOperationalLayers();
		}
	}, 5000);
}

function initMapResults() {
	// calls the response functions and web service
	try {
		query = JSON.parse(decodeURIComponent(dojo.byId('query0').value));
		queryOptions = JSON.parse(decodeURIComponent(dojo.byId('options').value));
		queryOptions.map = true;
		dojo.byId('options').value = encodeURIComponent(JSON.stringify(queryOptions));

		var title = decodeURIComponent(dojo.byId('title').value);

		dojo.byId('h1Title').innerHTML = '{0} {1}'.format(title, queryOptions.perCapita ? 'per Capita' : '');
		dojo.byId('headTitle').innerHTML = title;
		dojo.byId('name').value = title;
		breakField = queryOptions.breakField;
	} catch( e ) {
		alert('Error setting up query parameters.' + e.message);
		return;
	}

	translationCodeList = getCodelist(queryOptions.breakField, query.dataSetId);
	var k = JSON.stringify(query);

	var responseText = recallJSON(k);

	if( responseText ) {
		console.log('reading query from local storage');
	} else {
		var soap = build_dataflow_soap_ABS(query);
		if( soap ) {
			responseText = call_sdmx_ws_sync(soap, 'GetGenericData');
		}
	}
	if( responseText ) {
		mapResultResponseABS(responseText, query);
	} else {
		alert('Results could not be read');
	}
	windowDimensions('windowDimensions');
}

var sliderPlayInterval, sliderDecrement = true;

// makes the slider go back and forth
function sliderPlay() {
	// http://stackoverflow.com/questions/9150850/setinterval-dojo-example
	var playTitle = dojo.byId('sliderPlay').value;
	var slider = dijit.byId('slider');
	var intervalTime = 250;
	var minPlayTime = 10000;

	if( sdmxData.timePeriods.length * intervalTime < minPlayTime )
		intervalTime = Math.round(minPlayTime / sdmxData.timePeriods.length);

	function doIt() {
		if( sliderDecrement )
			slider.decrement(1);
		else
			slider.increment(1);
		if( slider.value >= slider.maximum || slider.value <= slider.minimum )
			stop();
	}

	function stop() {
		// stop timer
		clearInterval(sliderPlayInterval);
		dojo.byId('sliderPlay').value = 'Play';
	}

	if( playTitle == 'Play' ) {
		dojo.byId('sliderPlay').value = 'Stop';
		// start timer
		if( slider.value == slider.minimum )
			sliderDecrement = false;
		if( slider.value == slider.maximum )
			sliderDecrement = true;

		sliderPlayInterval = setInterval(doIt, intervalTime);
	} else {
		// stop timer
		stop();
	}
}

function sliderRemoveTimeLine() {
	var seriesName = 'verticalLine';

	for( var s in mapChart1.series ) {
		if( mapChart1.series[s].name == seriesName ) {
			mapChart1.removeSeries(seriesName);
		}
	}
}

// add a vertical line to the chart where the current time period is located.
function sliderUpdateTimeLine(data, timePeriod) {
	// data is an array of timePeriods

	var seriesName = 'verticalLine';

	for( var s in mapChart1.series ) {
		if( mapChart1.series[s].name == seriesName ) {
			mapChart1.removeSeries(seriesName);
		}
	}
	if( mapChart1.series.length == 0 ) {
		return;
	}

	var verticalLineData = [], linePos = 0;

	for( var v in data ) {
		if( data[v] == timePeriod ) {
			linePos = v;
			verticalLineData.push(1);
		} else {
			verticalLineData.push(0);
		}
	}
	if( linePos > 0 && linePos < data.length - 1 ) {
		// only draw when line not at the end
		mapChart1.addSeries(seriesName, verticalLineData, {
			plot : "verticalLine"
		});
		// Bring it to the front and render:

		mapChart1.movePlotToFront("verticalLine");
	}
	mapChart1.render();
}

/**
 * produce a textual description of the data for use with visually impaired
 * viewers. Template has {maxValue} {maxName} {minValue} {minName}
 * {averageValue} {startTime} {endTime} {dataCount} {seriesCount} {name}
 * {dataSetId}
 * 
 * @param textId
 *            {string} id of the description field.
 * @param options
 *            {JSON} options for controlling display
 * @param query
 *            {JSON} object describing the query that built this data
 * @param sdmxData
 *            {object} the list of data objects for all time series
 * @param data
 *            {object list} list of currently displayed data
 * 
 */
function mapDescribeData(textId, options, query, sdmxData, data) {
	var textarea = dojo.byId(textId);
	var template = ''
	var xmlhttp = new XMLHttpRequest();
	var url = 'resources/{0}?{1}'.format(options.templateName, randomString(10));
	var decimalPlaces = 0;

	// console.log(url);
	xmlhttp.open('GET', url, false);
	xmlhttp.send();
	if( xmlhttp.status == 200 ) {
		template = xmlhttp.responseText;
	} else {
		template = 'Description template for {0} not found'.format(options.templateName);
		textarea.value = template;
		return;
	}

	// average with minimum and maximum
	var maxValue = 0, minValue = 0, total = 0.0;

	for( var z = 0; z < data.length; z++ ) {
		var v = Number(data[z].Value);

		if( v > Number(data[maxValue].Value) ) {
			maxValue = z;
		}
		if( v < Number(data[minValue].Value) ) {
			minValue = z;
		}

		var s = "" + v;

		// calculate maximum decimal places for display
		if( s.indexOf('.') > 0 ) {
			var places = s.slice(s.indexOf('.') + 1).length;

			if( places > decimalPlaces ) {
				decimalPlaces = places;
			}

		}
		total += v;
	}
	// std deviation.
	var avg = total / data.length;
	total = 0.0;
	for( var z in data ) {
		var v = data[z].Value;

		total += Math.pow(v - avg, 2);
	}
	var stdDeviation = Math.sqrt(total / data.length);

	// list all outside 2 std deviations + average

	var stdDeviationList = [], valuesDescriptions = [];
	for( var z in data ) {
		var v = data[z].Value;

		if( v > avg && v > (avg + (stdDeviation * 2)) || v < avg && v < (avg - (stdDeviation * 2)) ) {
			stdDeviationList.push('{0} {1}'.format(data[z].breakDescription, v));
		}
		valuesDescriptions.push('{0} {1}'.format(data[z].breakDescription, v));
	}

	// previous period
	var previousPeriod = data[0].Time, previousData = [];

	for( var t in sdmxData.timePeriods ) {
		if( Number(t) >= sdmxData.timePeriods.length ) {
			break;
		}

		if( sdmxData.timePeriods[Number(t) + 1] == data[0].Time ) {
			previousPeriod = sdmxData.timePeriods[t];
			for( var z in sdmxData.data ) {
				if( sdmxData.data[z].Time == previousPeriod ) {
					previousData.push(sdmxData.data[z]);
				}
			}
			break;
		}
	}
	// find largest difference
	var previousValues = {
		name : '',
		prev : 0,
		value : 0,
		diff : 0,
		period : ''
	}, largestDifference = 0;

	if( previousPeriod != data[0].Time ) {
		for( var z in data ) {
			var v = data[z].Value;

			for( l in previousData ) {
				var vl = previousData[l].Value;

				if( data[z][breakField] == previousData[l][breakField] ) {
					var diff = Math.abs(v - vl);

					if( diff > largestDifference ) {
						largestDifference = diff;
						previousValues = {
							name : data[z].breakDescription,
							prev : vl,
							value : v,
							diff : v - vl,
							period : previousPeriod
						};
					}
				}
			}
		}
	} else {
		// no previous period
	}

	/**
	 * replace tokens in the template for describing the chart/map
	 * 
	 * @param token
	 *            {string} a token from the allowable values use {if {token}}
	 *            with {endif {token}} to include things if there are values in
	 *            {token}
	 * @param value
	 *            {string/number} the value to replace
	 */
	function templateReplace(token, value) {
		var ifToken = '{if {0}}'.format(token);
		var endifToken = '{endif {0}}'.format(token);

		if( value == null || value == '' ) {
			// remove between if and endif token

			while( template.indexOf(ifToken) >= 0 ) {
				var a = template.indexOf(ifToken);
				var b = template.indexOf(endifToken) + endifToken.length;

				template = template.slice(0, a) + template.slice(b);
			}
		} else {
			template = template.replaceAll([ ifToken, endifToken ]);
		}

		template = template.replaceAll(token, value);
	}

	templateReplace('{maxValue}', data[maxValue].Value);
	templateReplace('{minValue}', data[minValue].Value);
	templateReplace('{maxName}', data[maxValue].breakDescription);
	templateReplace('{minName}', data[minValue].breakDescription);
	templateReplace('{averageValue}', avg.toFixed(decimalPlaces));
	templateReplace('{dataCount}', data.length);
	templateReplace('{name}', decodeURIComponent(dojo.byId('title').value));
	templateReplace('{dataSetId}', query.dataSetId);
	templateReplace('{seriesTime}', data[0].Time);
	templateReplace('{stdDeviation}', stdDeviation.toFixed(decimalPlaces));
	templateReplace('{stdDeviationList}', stdDeviationList.join('.\n'));
	templateReplace('{valuesDescriptionsList}', valuesDescriptions.join('.\n'));
	templateReplace('{previousValue}', previousValues.value);
	templateReplace('{previousPrev}', previousValues.prev);
	templateReplace('{previousName}', previousValues.name);
	templateReplace('{previousDiff}', previousValues.diff.toFixed(decimalPlaces));
	templateReplace('{previousPeriod}', previousValues.period);

	textarea.value = template;
}
