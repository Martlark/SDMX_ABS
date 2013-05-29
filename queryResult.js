// queries
// requires
dojo.require("dojox.charting.Chart");
dojo.require("dojox.charting.Chart2D");
dojo.require("dojox.charting.axis2d.Default");
dojo.require("dojox.charting.plot2d.Lines");
dojo.require("dojox.charting.widget.SelectableLegend");
dojo.require("dojox.charting.themes.Claro");
dojo.require('dojox.charting.action2d.Tooltip');
dojo.require("dojox.charting.action2d.Magnify");
dojo.require("dijit.form.HorizontalSlider");
dojo.require('dijit.form.HorizontalRule');
dojo.require('dijit.form.HorizontalRuleLabels');

// var sdmxData = {};
var queryOptions = {};
var sdmxDataList = [];

/**
 * translate the code to a proper description
 * 
 * @param translationCodeList
 * @param code
 * @param defaultName
 * @returns
 */
function translateCodeName(translationCodeList, code, defaultName) {
	var name = defaultName;

	for( var t in translationCodeList ) {
		if( translationCodeList[t].code == code ) {
			name = translationCodeList[t].description;
			break;
		}
	}
	return name;
}

function parseQueryDataResponse(xmlhttp, breakValue) {
	/*
	 * <ns9:DataSet action="Replace"
	 * keyFamilyURI="http://sdw-ws.ecb.europa.eu/KeyFamily/ECB_EXR1">
	 * <ns9:KeyFamilyRef>ECB_EXR1</ns9:KeyFamilyRef> <ns9:Group type="Group">
	 * <ns9:GroupKey> <ns9:Value value="AUD" concept="CURRENCY"/> <ns9:Value
	 * value="EUR" concept="CURRENCY_DENOM"/> <ns9:Value value="SP00"
	 * concept="EXR_TYPE"/> <ns9:Value value="A" concept="EXR_SUFFIX"/>
	 * </ns9:GroupKey> <ns9:Attributes> <ns9:Value value="4"
	 * concept="DECIMALS"/> <ns9:Value value="0" concept="UNIT_MULT"/>
	 * <ns9:Value value="AUD" concept="UNIT"/> <ns9:Value value="ECB reference
	 * exchange rate, Australian dollar/Euro, 2:15 pm (C.E.T.)"
	 * concept="TITLE_COMPL"/> <ns9:Value value="4F0" concept="SOURCE_AGENCY"/>
	 * </ns9:Attributes> <ns9:Series> <ns9:SeriesKey> <ns9:Value value="Q"
	 * concept="FREQ"/> <ns9:Value value="AUD" concept="CURRENCY"/> <ns9:Value
	 * value="EUR" concept="CURRENCY_DENOM"/> <ns9:Value value="SP00"
	 * concept="EXR_TYPE"/> <ns9:Value value="A" concept="EXR_SUFFIX"/>
	 * </ns9:SeriesKey> <ns9:Attributes> <ns9:Value value="MOB.T0802"
	 * concept="PUBL_PUBLIC"/> <ns9:Value value="A" concept="COLLECTION"/>
	 * <ns9:Value value="P3M" concept="TIME_FORMAT"/> </ns9:Attributes>
	 * <ns9:Obs> <ns9:Time>1999-Q1</ns9:Time> <ns9:ObsValue value="1.7699"/>
	 * <ns9:Attributes> <ns9:Value value="A" concept="OBS_STATUS"/>
	 * </ns9:Attributes> </ns9:Obs> <ns9:Obs> <ns9:Time>1999-Q2</ns9:Time>
	 * <ns9:ObsValue value="1.618"/> <ns9:Attributes> <ns9:Value value="A"
	 * concept="OBS_STATUS"/> </ns9:Attributes> </ns9:Obs>
	 * 
	 */

	var contentHandler = new DefaultHandler2();
	var series_vals = {}, vals = {};
	var columns = [ 'Time', 'Value' ];
	var column_descriptions = [ 'Time period', 'Observation Value' ];
	var elements = [];
	var columnsFound = false;
	var time_period = '', obs_value = '', currentName, previousName, last_time_period = '';
	var latestData = []; // holds the last observation for each REF_AREA
	// (breakField)

	var saxParser = XMLReaderFactory.createXMLReader();
	var sdmxData = {};
	var data = [];
	sdmxData.data = data;
	contentHandler.startElement = function(namespaceURI, localName, qName, atts) {
		// console.log( "startElement : [" + namespaceURI + "], [" + localName +
		// "], [" + qName + "]" );
		/*
		 * These are the query table column + OBS_VALUE <ns9:SeriesKey>
		 * <ns9:Value value="A" concept="FREQ"/> <ns9:Value value="I6"
		 * concept="REF_AREA"/> <ns9:Value value="N" concept="ADJUSTMENT"/>
		 * <ns9:Value value="5" concept="DATA_TYPE_BOP"/> <ns9:Value
		 * value="988D" concept="BOP_ITEM"/> <ns9:Value value="N"
		 * concept="CURR_BRKDWN"/> <ns9:Value value="A1" concept="COUNT_AREA"/>
		 * <ns9:Value value="E" concept="SERIES_DENOM"/>
		 * 
		 * <ns9:Obs> <ns9:Time>1999-Q2</ns9:Time> <ns9:ObsValue value="1.618"/>
		 * <ns9:Attributes> <ns9:Value value="A" concept="OBS_STATUS"/>
		 * </ns9:Attributes> </ns9:Obs>
		 * 
		 * <ns9:Attributes> <ns9:Value value="ECB reference exchange rate,
		 * Australian dollar/Euro, 2:15 pm (C.E.T.)" concept="TITLE_COMPL"/>
		 */
		if( elements.length > 0 )
			previousName = elements[elements.length - 1];
		currentName = localName;
		elements.push(localName);
		switch ( localName ){
		case 'ObsValue':
			obs_value = atts.getValue(atts.getIndex('value'));
			break;
		case 'Obs':
			time_period = '';
			obs_value = '';
			break;
		case 'Value':
			if( !columnsFound ) {
				if( 'Attributes' == previousName && elements.indexOf('Group') == elements.length - 3 ) {
					if( atts.getValue(atts.getIndex('concept')) == 'TITLE_COMPL' ) {
						column_descriptions.push(atts.getValue(atts.getIndex('value')));
					}
				}

				if( 'SeriesKey' == previousName && elements.indexOf('Series') == elements.length - 3 ) {
					columns.push(atts.getValue(atts.getIndex('concept')));
				}
			}
			if( 'SeriesKey' == previousName && elements.indexOf('Series') == elements.length - 3 ) {
				series_vals[atts.getValue(atts.getIndex('concept'))] = atts.getValue(atts.getIndex('value'));
			}
			break;
		}
	};
	contentHandler.endElement = function(namespaceURI, localName, qName) {
		// console.log( "endElement : [" + namespaceURI + "], [" + localName +
		// "], [" + qName + "]" );
		elements.pop();
		switch ( localName ){
		case 'SeriesKey':
			columnsFound = true;
			break;
		case 'Series':
			series_vals = {};
			vals = {};
			break;
		case 'Obs':
			// add the time and the observation value
			vals['Value'] = Number(obs_value);
			vals['Time'] = time_period;
			// add the series values to the data array
			for( z in series_vals ) {
				vals[z] = series_vals[z];
			}

			var latestDataFound = false;
			for( z in latestData ) {
				if( latestData[z][breakValue] == vals[breakValue] ) {
					latestDataFound = true;
					latestData[z] = vals;
					break;
				}
			}
			if( !latestDataFound ) {
				latestData.push(vals);
			}
			data.push(vals);
			vals = {};
			break;
		}
	};
	contentHandler.characters = function(ch, start, ch_length) {
		switch ( currentName ){
		case 'Time':
			if( 'Obs' == previousName )
				time_period = ch;
			break;
		}
	};
	dojo.byId('content').innerHTML = xmlhttp.responseText;
	try {
		saxParser.setHandler(contentHandler);
		saxParser.parseString(xmlhttp.responseText);
	} catch( e ) {
		alert('Error parsing SDMX XML stream: {0}'.format(e.message));
		dojo.style(dojo.byId('content'), "display", "block");
		dojo.byId('content').focus();
		return null;
	}
	sdmxData.data = data;
	sdmxData.latestData = latestData;
	sdmxData.columns = columns;
	sdmxData.column_descriptions = column_descriptions;
	sdmxData.timePeriods = [];
	// add all time periods so we can animate stuff
	for( var v in sdmxData.data ) {
		if( sdmxData.timePeriods.indexOf(sdmxData.data[v].Time) == -1 ) {
			sdmxData.timePeriods.push(sdmxData.data[v].Time);
		}
	}
	return sdmxData;
}

function parseQueryDataResponseABS(responseText, breakValue) {

	var contentHandler = new DefaultHandler2();
	var series_vals = {}, vals = {};
	var columns = [ 'Time', 'Value' ];
	var column_descriptions = [ 'Time period', 'Observation Value' ];
	var elements = [];
	var columnsFound = false;
	var time_period = '', obs_value = '', currentName = '', previousName = '';
	var latestData = []; // holds the last observation for each REF_AREA
	// (breakField)
	var saxParser = XMLReaderFactory.createXMLReader();
	var sdmxData = {};
	var data = [];

	sdmxData.data = data;
	contentHandler.startElement = function(namespaceURI, localName, qName, atts) {
		// console.log( "startElement : [" + namespaceURI + "], [" + localName +
		// "], [" + qName + "]" );
		if( elements.length > 0 )
			previousName = elements[elements.length - 1];
		currentName = localName;
		elements.push(localName);
		switch ( localName ){
		case 'ObsValue':
			obs_value = atts.getValue(atts.getIndex('value'));
			break;
		case 'Obs':
			time_period = '';
			obs_value = '';
			break;
		case 'Value':
			if( 'SeriesKey' == previousName && elements.indexOf('Series') == elements.length - 3 ) {
				if( !columnsFound ) {
					columns.push(atts.getValue(atts.getIndex('concept')));
				}
				series_vals[atts.getValue(atts.getIndex('concept'))] = atts.getValue(atts.getIndex('value'));
			}
			break;
		}
	};
	contentHandler.endElement = function(namespaceURI, localName, qName) {
		// console.log( "endElement : [" + namespaceURI + "], [" + localName +
		// "], [" + qName + "]" );
		elements.pop();
		switch ( localName ){
		case 'SeriesKey':
			columnsFound = true;
			break;
		case 'Series':
			series_vals = {};
			vals = {};
			break;
		case 'Obs':
			// only include observations with values
			if( obs_value.length > 0 ) {
				// add the time and the observation value
				vals['Value'] = Number(obs_value);
				vals['Time'] = time_period;
				// add the series values to the data array
				for( z in series_vals ) {
					vals[z] = series_vals[z];
				}

				var latestDataFound = false;
				for( z in latestData ) {
					if( latestData[z][breakValue] == vals[breakValue] ) {
						latestDataFound = true;
						latestData[z] = vals;
						break;
					}
				}
				if( !latestDataFound ) {
					latestData.push(vals);
				}
				data.push(vals);
				vals = {};
			}
			break;
		}
	};
	contentHandler.characters = function(ch, start, ch_length) {
		switch ( currentName ){
		case 'Time':
			if( 'Obs' == previousName )
				time_period = ch;
			break;
		}
	};
	var debugContent = dojo.byId('content');
	if( debugContent ) {
		debugContent.innerHTML = responseText;
	}

	try {
		saxParser.setHandler(contentHandler);
		saxParser.parseString(responseText);
	} catch( e ) {
		alert('Error parsing SDMX XML stream: {0}'.format(e.message));
		var content = dojo.byId('content');

		if( debugContent ) {
			dojo.style(content, "display", "block");
			debugContent.focus();
		}
		return null;
	}
	sdmxData.data = data;
	sdmxData.latestData = latestData;
	sdmxData.columns = columns;
	sdmxData.column_descriptions = column_descriptions;
	sdmxData.timePeriods = [];
	// add all time periods so we can animate stuff
	for( var v in sdmxData.data ) {
		if( sdmxData.timePeriods.indexOf(sdmxData.data[v].Time) == -1 ) {
			sdmxData.timePeriods.push(sdmxData.data[v].Time);
		}
	}
	return sdmxData;
}
/**
 * check the contents and structure of the sdmxData object to determine if it is
 * correctly filled
 * 
 * @param sdmxData
 * @returns {Boolean}
 */
function dataSeemsOk(sdmxData) {
	if( !sdmxData )
		return false;
	if( !sdmxData.data )
		return false;
	if( sdmxData.data.length <= 0 )
		return false;
	if( !sdmxData.latestData )
		return false;
	if( sdmxData.latestData.length <= 0 )
		return false;
	if( !sdmxData.timePeriods )
		return false;
	return true;
}
/**
 * adds a chart to idLocation using breakValue label, to be used when one row of
 * observations per breakValue data is an array of SDMX-ML object rows { Time,
 * Value, SDMX_CONCEPTS, .... }
 * 
 * @param idLocation
 * @param breakValue
 * @param latestData
 */
function chartResultsBar(idLocation, breakValue, latestData) {
	// 
	var chart1 = new dojox.charting.Chart(idLocation);
	var labels = [];

	chart1.setTheme(dojox.charting.themes.Claro);
	chart1.addPlot("default", {
		type : "Columns",
		markers : true
	});
	var xLabelFunc = function(text, value, precision) {
		try {
			var label = labels[value - 1];
			// console.log( label, ':', text, value, precision );
			return label;
		} catch( err ) {
			// console.log( 'xLabelFunc', err.message );
		}
		return null;
	};
	// add values for each column, one per breakValue
	var series = [], firstIndex = '';
	for( z in latestData ) {
		// console.log( z );
		// console.log( latestData[z]);
		firstIndex = z;
		series.push(latestData[z].Value);
		labels.push(latestData[z][breakValue]);
	}

	chart1.addAxis("x", {
		labelFunc : xLabelFunc,
		majorLabels : true,
		minorLabels : true,
		gap : 5,
		title : '{0} - {1}'.format(breakValue, latestData[firstIndex].Time),
		titleOrientation : "away"
	});
	chart1.addAxis("y", {
		vertical : true,
		includeZero : true
	});
	// console.log( 'series', series );
	chart1.addSeries('bar', series);
	// Create the tooltip

	new dojox.charting.action2d.Tooltip(chart1, "default", {
		text : function(o) {
			return('{0}'.format(o.y));
		}
	});
	chart1.render();
}

function chartResultsLine(idLocation, breakValue, data) {
	// adds a chart to idLocation and legend to idLocation+'Legend' using
	// breakValue as the value to split the series in data
	// data is an array of SDMX-ML object rows { Time, Value, SDMX_CONCEPTS,
	// .... }
	var seriesCount = 0;
	var fillColors = [ 'red', 'green', 'blue', 'yellow', 'orange', 'purple', 'pink', 'brown', 'black' ];
	var chart1 = new dojox.charting.Chart(idLocation);

	chart1.setTheme(dojox.charting.themes.Claro);
	chart1.addPlot("default", {
		type : dojox.charting.plot2d.Lines,
		markers : true
	});
	var xLabelFunc = function(text, value, precision) {
		try {
			var label = sdmxDataList[0].timePeriods[Number(text) - 1];
			// console.log( label, ':', text, value, precision );
			return label;
		} catch( err ) {
			// console.log( 'xLabelFunc', err.message );
			return '';
		}
	};
	chart1.addAxis("x", {
		title : dojo.byId('xAxis').value,
		titleOrientation : "away",
		labelFunc : xLabelFunc,
		majorLabels : true,
		majorTickStep : 4
	});
	chart1.addAxis("y", {
		vertical : true,
		title : dojo.byId('yAxis').value,
		includeZero : true,
		majorTickStep : 4
	});

	// determine the by break series
	var series = [];
	var seriesBreakName = ''; // the break for the series
	var seriesName = '';

	for( z in data ) {
		var d = data[z][breakValue];
		if( seriesBreakName == '' )
			seriesBreakName = d;
		if( seriesBreakName != d ) {
			seriesName = translateCodeName(sdmxDataList[0].translationCodeList, seriesBreakName, seriesBreakName);

			chart1.addSeries(seriesName, series, {
				stroke : fillColors[seriesCount]
			});
			seriesCount++;
			if( seriesCount >= fillColors.length )
				seriesCount = 0;
			seriesBreakName = d;
			series = [];
		}

		series.push(data[z].Value);
	}
	seriesName = translateCodeName(sdmxDataList[0].translationCodeList, seriesBreakName, seriesBreakName);
	chart1.addSeries(seriesName, series, {
		stroke : fillColors[seriesCount]
	});
	// Create the tooltip
	new dojox.charting.action2d.Tooltip(chart1, "default", {
		text : function(o) {
			if( o.chart.series.length > 1 )
				return('{0}<br>{1}<br>{2}'.format(o.run.name, o.y, xLabelFunc(o.x)));
			else
				return('{0}<br>{1}'.format(o.y, xLabelFunc(o.x)));
		}
	});
	// Highlights an area: use the "chart" chart, and "default" plot
	new dojox.charting.action2d.Highlight(chart1, "default");
	chart1.render();
	// http://dojo-toolkit.33424.n3.nabble.com/dojox-charting-wrong-size-when-chart-s-div-is-hidden-td2000025.html
	new dojox.charting.widget.SelectableLegend({
		chart : chart1,
		horizontal : true
	}, idLocation + "Legend");
}

function queryResultsCountDataPoints(breakValue, data) {
	// count the data points for the first breakValue series
	// to determine what chart to use.
	var dataPoints = 0;
	var ref_area = data[0][breakValue]; // the break for the series

	for( z in data ) {
		var d = data[z][breakValue];
		if( ref_area != d ) {
			return dataPoints;
		}

		dataPoints++;
	}
	return dataPoints;
}
/*******************************************************************************
 * load from stored result using query as a key otherwise build a soap packet
 * and query the service
 * 
 * @param {object}
 *            query the JSON query definition.
 * @param {int}
 *            queryNumber number of the query to be used to find controls
 * @param {object}
 *            options - optional query options to use, otherwise use global
 *            variable queryOptions
 * @returns {Boolean} true when results are set.
 */
function addQueryResults(query, queryNumber, options) {
	var key = JSON.stringify(query);
	var breakField;

	if( typeof(options) != 'undefined' ) {
		breakField = options.breakField;
	} else {
		breakField = queryOptions.breakField;
	}
	var recalledData = recallJSON(key);

	if( dataSeemsOk(recalledData) ) {
		console.log('recalled query from local storage');
		sdmxDataList[queryNumber] = recalledData;
	} else {
		var soap = build_dataflow_soap_ABS(query);

		if( soap ) {
			var responseText = call_sdmx_ws_sync(soap, 'GetGenericData', function(errorText, xmlhttp) {
				alert('Error occured during query processing. ' + errorText);
			});
			if( !responseText ) {
				return false;
			}
			sdmxDataList[queryNumber] = parseQueryDataResponseABS(responseText, breakField);
			sdmxDataList[queryNumber].translationCodeList = getCodelist(breakField, query.dataSetId);
			sdmxDataList[queryNumber].query = query; // save query used to
			// allow
			// set breakDescription in the sdmxDataList
			for( var d in sdmxDataList[queryNumber].data ) {
				var item = sdmxDataList[queryNumber].data[d];

				item.breakDescription = translateCodeName(sdmxDataList[queryNumber].translationCodeList, item[breakField], item[breakField])
			}
			storeJSON(key, sdmxDataList[queryNumber]);
		} else {
			return false;
		}
	}
	return true;
}
/*******************************************************************************
 * populate the table grid with the results in the sdmxDataList
 * 
 * @param {int}
 *            queryNumber the query result index to be used
 * @param {object}
 *            data - DATA is passed as parameter and not in the global
 *            sdmxDataList object
 * @returns {Boolean} true when it worked
 */
function tableResults(queryNumber, data) {
	// if the xmlhttp is a XMLHttpRequest object then parse the result
	// otherwise it is probably a stored data object.
	if( !dojo.byId("queryResultsGrid{0}".format(queryNumber)) ) {
		return false;
	}

	var sdmxData = data ? data : sdmxDataList[queryNumber];

	if( !sdmxData || !sdmxData.data || sdmxData.data.length == 0 ) {
		alert('No results found');
		return false;
	}
	// http://dojo-toolkit.33424.n3.nabble.com/how-to-change-ItemFileWriteStore-data-or-dojox-grid-DataGrid-td2353208.html

	var storeItems = JSON.parse(JSON.stringify(sdmxData.data)); // clone the
	// data as the
	// setStore on
	// the grid
	// changes the
	// original
	// data.
	var store = new dojo.data.ItemFileWriteStore({
		data : {
			items : storeItems
		}
	});
	var structure = [];
	for( i in sdmxData.columns ) {
		structure.push({
			name : sdmxData.columns[i],
			field : sdmxData.columns[i],
			width : '10%'
		});
	}
	var gridResults = new dojox.grid.DataGrid({
		structure : structure
	}, "queryResultsGrid{0}".format(queryNumber));
	gridResults.startup();
	gridResults.setStore(store);
	return true;
}

function chartResults(queryNumber) {
	// chart the given result index
	var sdmxData = sdmxDataList[queryNumber];
	var breakField = queryOptions.breakField;

	if( queryResultsCountDataPoints(breakField, sdmxData.data) == 1 || queryOptions.latestData )
		chartResultsBar("resultsChart{0}".format(queryNumber), breakField, sdmxData.latestData);
	else
		chartResultsLine("resultsChart{0}".format(queryNumber), breakField, sdmxData.data);
	// chartLineGoogle("resultsChart{0}".format(queryNumber), breakField,
	// sdmxData.data, sdmxData.timePeriods);
}

function queryJSONInit() {
	// calls the response functions and web service
	try {
		queryOptions = JSON.parse(decodeURIComponent(dojo.byId('options').value));
	} catch( e ) {
		queryOptions = {};
	}

	// add all dataflows

	for( var queryNumber = 0; queryNumber < 2; queryNumber++ ) {
		var queryId = 'query{0}'.format(queryNumber);
		var queryControl = dojo.byId(queryId);
		if( queryControl ) {
			var value = queryControl.value;
			if( value[0] != '#' ) {
				console.log('addding results for {0}'.format(queryId));
				var query = JSON.parse(decodeURIComponent(value));
				// see if a result seems valid for this
				if( query && query.dataSetId ) {
					if( !addQueryResults(query, queryNumber) ) {
						return;
					}
				} else {
					console.log('{0} not valid'.format(queryId));
					break;
				}
			}
		}
	}
	dojo.query('.hideOnLoad').forEach("dojo.removeClass(item, 'hideOnLoad')");
	dojo.byId('JSON').innerHTML = JSON.stringify(sdmxDataList);
}
function queryResultsInit() {
	// calls the response functions and web service
	try {
		queryOptions = JSON.parse(decodeURIComponent(dojo.byId('options').value));
	} catch( e ) {
		queryOptions = {};
	}

	var title = decodeURIComponent(dojo.byId('title').value);
	try {
		dojo.byId('h1Title').innerHTML = title;
		dojo.byId('headTitle').innerHTML = title;
		dojo.byId('name').value = title;
	} catch( e ) {
	}
	// add all dataflows

	for( var queryNumber = 0; queryNumber < 3; queryNumber++ ) {
		var queryId = 'query{0}'.format(queryNumber);
		var queryControl = dojo.byId(queryId);

		if( queryControl ) {
			var value = queryControl.value;
			if( value[0] != '#' ) {
				console.log('addding results for {0}'.format(queryId));
				var query = JSON.parse(decodeURIComponent(value));

				try {
					dojo.byId('xAxis').value = query.frequency;
					dojo.byId('yAxis').value = query.measure;
				} catch( e ) {
				}
				// see if a result seems valid for this
				if( query && query.dataSetId ) {
					if( !addQueryResults(query, queryNumber) ) {
						return;
					}
					if( !tableResults(queryNumber) ) {
						break;
					}
				} else {
					console.log('{0} not valid'.format(queryId));
					break;
				}
				// TODO: add data description to the query results
				// if( queryNumber == 0 ) {
				// describeData('chartDescription', {
				// templateName : globalOptions.descriptionTemplate
				// }, query, sdmxDataList[0], sdmxDataList[0].data);
				// }
			}
		}
	}
	dojo.query('.hideOnLoad').forEach("dojo.removeClass(item, 'hideOnLoad')");
	dojo.style(dojo.byId('executing'), 'display', 'none');

	if( dojo.byId('embed') && dojo.byId('embed').value == 'true' ) {
		// add hideOnLoad to all with class = hideOnEmbed

		dojo.query('.hideOnEmbed').forEach("dojo.addClass(item, 'hideOnLoad')");
		// dojo charts do not use the height from a css class.
		var chartDiv = dojo.byId('resultsChart0');

		dojo.style(chartDiv, 'height', '400px');
	}

	if( sdmxDataList[0].data.length > 0 ) {
		if( sdmxDataList.length > 1 ) {
			multiAddControls();
			dojo.style(dojo.byId('chart0'), 'display', 'none');
		} else {
			dojo.style(dojo.byId('multiControls'), 'display', 'none');
			chartResults(0);
		}
		if( dojo.byId('embedCode') ) {
			dojo.byId('embedCode').value = '<iframe src="{0}&embed=true" width="75%" height="650px"></iframe>'.format(document.URL);
			dojo.byId('embedCode').value += "<br/><a href='{0}'>View this chart and data on the ABS website</a>".format(document.URL);
		}

	}
}

/*******************************************************************************
 * 
 * @param {Stirng}
 *            url that you want shown in FaceBook like
 * @returns {null} Nothing
 */
function setFaceBookUrl(url) {
	// http://stackoverflow.com/questions/2764129/update-fblike-url-dynamically-using-javascript
	// https://developers.facebook.com/docs/reference/plugins/like/

	var frame = '<iframe id="face" name="face" \
				src="http://www.facebook.com/plugins/like.php?href=#http#&layout=button_count&show_faces=false&width=400&action=like&font=arial&colorscheme=light"\\n\
				allowtransparency="true" \
				style="border: medium none; overflow: auto; width: 400px; height: 21px;" frameborder="0" scrolling="no"> \
		</iframe>';

	frame = frame.replace('#http#', url);
	document.getElementById('facebookFrame').innerHTML = frame;
	// alert("url : "+url);
}

function shareQuery(href) {
	var uri = encodeURIComponent(href); // make sure the name is encoded.
	var url = '{0}?method=shorten&uri={1}'.format(getQuerypage(), uri);

	// console.log(url);
	var xmlhttp = new XMLHttpRequest();
	xmlhttp.open('GET', url, false);
	xmlhttp.send();
	if( xmlhttp.status == 200 ) {
		var short = xmlhttp.responseText;
		var shortUrl = globalOptions.baseURL + short;

		setFaceBookUrl(shortUrl);
		dojo.style(dojo.byId('shareFrame'), 'display', 'block');
		// dojo.style(dojo.byId('shareButton'), 'display', 'none');
	} else {
		alert('Error shorten:' + xmlhttp.responseText);
	}
}

/**
 * Comment
 */
function multiAddControls() {
	/*
	 * <div id="multiChart" style="height: 80%;"></div> <div
	 * id="multiChartLegend"></div>
	 * 
	 * <div id='multiControls' data-style="display:none"> <div id='yAxis'>y</div>
	 * <div id='xAxis'>x</div> <div id='bubble'>b</div> <input type='button'
	 * value='Redraw' onclick='multiRedraw();'/> </div>
	 */
	chartOptions = queryOptions.chartOptions;
	if( chartOptions ) {
		dojo.byId('title0').value = chartOptions.title0;
		dojo.byId('title1').value = chartOptions.title1;
		dojo.byId('title2').value = chartOptions.title2;
	}

	var store = new dojo.store.Memory({
		data : [ {
			label : getResultsLabel(0),
			id : '0'
		}, {
			label : getResultsLabel(1),
			id : '1'
		}, {
			label : getResultsLabel(2),
			id : '2'
		} ]
	});
	var select = new dijit.form.Select({
		id : "yAxis",
		label : 'Y Axis',
		value : chartOptions ? chartOptions.xAxis : '0',
		store : new dojo.data.ObjectStore({
			objectStore : store
		})
	}, "yAxis");
	select.startup();
	store.put({
		label : 'Frequency',
		id : 'freq'
	});
	select = new dijit.form.Select({
		id : "xAxis",
		label : 'X Axis',
		value : chartOptions ? chartOptions.yAxis : 'freq',
		store : new dojo.data.ObjectStore({
			objectStore : store
		})
	}, "xAxis");
	select.startup();
	store = new dojo.store.Memory({
		data : [ {
			label : '{0} - {1}'.format(getAxisLabel('x'), getAxisLabel('y')),
			id : 'xMinusy'
		}, {
			label : '{0} - {1}'.format(getAxisLabel('y'), getAxisLabel('x')),
			id : 'yMinusx'
		}, {
			label : 'Results 3 Value',
			id : '2'
		}, // add none value to the bubble
		{
			label : 'none',
			id : 'none'
		} /*
			 * TODO: fix this , { label : 'Population', id : 'pop' }
			 */
		]
	});
	select = new dijit.form.Select({
		id : "bubble",
		label : 'Bubble Value',
		value : chartOptions ? chartOptions.bubble : 'none',
		store : new dojo.data.ObjectStore({
			objectStore : store
		})
	}, "bubble");
	select.startup();
	// create options to be saved with stuff.

	if( chartOptions ) {
		dijit.byId('bubble').value = chartOptions.bubble;
		multiRedraw();
	}
	dojo.style(dojo.byId('multiButtons'), 'display', 'block');
}

function getResultsLabel(resultsNumber) {
	if( dojo.byId('title{0}'.format(resultsNumber)).value ) {
		return dojo.byId('title{0}'.format(resultsNumber)).value;
	} else {
		return 'Results Value {0}'.format(resultsNumber + 1);
	}
}

/**
 * return the name of the label for the bubble in the 3 way chart
 * 
 * @returns {string} the label
 */
function getBubbleLabel() {
	var select = dijit.byId('bubble');
	var v = select.value;
	var label = select.get("displayedValue");

	if( v == '2' ) {
		// query result 3 selected
		if( dojo.byId('title{0}'.format(v)).value ) {
			label = dojo.byId('title{0}'.format(v)).value;
		}
	}
	return label;
}

/**
 * return the name of the axis label for this query result
 * 
 * @param xy
 *            {int} the number of the query result to return [0,1]
 * @returns {string} the label
 */
function getAxisLabel(xy) {
	var select = dijit.byId('{0}Axis'.format(xy));
	var v = select.value;
	var label = select.get("displayedValue");

	if( !isNaN(v) ) {
		// is is a number then points to a query result axis label
		// otherwise it is a calculation.
		var n = Number(v);

		if( dojo.byId('title{0}'.format(n)).value ) {
			label = dojo.byId('title{0}'.format(n)).value;
		}
	}
	return label;
}
/**
 * redraw the chart based upon user selectable inputs TODO: make this work later
 * on if needed.
 */
function chartRedraw() {
	dojo.empty('resultsChart0');
	dojo.empty('resultsChart0Legend');
	chartResults(0);
}

function lookupSeriesValue(data, timePeriod, breakValue) {
	for( z in data ) {
		if( data[z].Time == timePeriod && data[z][queryOptions.breakField] == breakValue ) {
			return data[z].Value
		}
	}
	return 0;
}

/**
 * global variables for use with multivalue charting
 */
var multiChart, multiLegend;
var series = [];
var multiChartOptions, sliderDecrement;
/**
 * adds a chart to idLocation and legend to idLocation+'Legend' using breakValue
 * as the value to split the series in data. Data is an array of SDMX-ML object
 * rows { Time, Value, SDMX_CONCEPTS, .... }
 * 
 */
function multiRedraw() {
	/**
	 * return the label of the x or y axis
	 */
	var chartOptions = {};
	var idLocation = 'multiChart';
	var breakValue = queryOptions.breakField;
	var labelList = sdmxDataList[0].timePeriods;
	var chartType = 'Default';
	series = [];
	/**
	 * Comment
	 */
	function getChartOptions() {
		var chartOptions = {};
		// create options to be saved with stuff.

		chartOptions.xAxis = dijit.byId('xAxis').value;
		chartOptions.yAxis = dijit.byId('yAxis').value;
		chartOptions.bubble = dijit.byId('bubble').value;
		chartOptions.title0 = dojo.byId('title0').value;
		chartOptions.title1 = dojo.byId('title1').value;
		chartOptions.title2 = dojo.byId('title2').value;
		return chartOptions;
	}
	chartOptions = getChartOptions();

	var vx = chartOptions.xAxis;
	var vy = chartOptions.yAxis;
	var bubbleChoice = chartOptions.bubble;
	var data_x = null, data_y = null;

	if( !isNaN(vx) ) {
		chartType = 'Bubble';
		if( Number(vx) > sdmxDataList.length ) {
			alert('X axis {0} value not available'.format(vx));
			return;
		}
		data_x = sdmxDataList[Number(vx)].data;
	} else if( vx == 'freq' ) {
		labelList = sdmxDataList[0].timePeriods;
	} else {
		alert('choose x axis value');
		return;
	}
	// y axis values

	if( !isNaN(vy) ) {
		if( Number(vy) > sdmxDataList.length ) {
			alert('Y axis {0} value not available'.format(vy));
			return;
		}
		data_y = sdmxDataList[Number(vy)].data;
	} else {
		alert('choose y axis value');
		return;
	}

	// save the options to the hidden input so they may be saved as a saved
	// query
	queryOptions.chartOptions = chartOptions;
	dojo.byId('options').value = encodeURIComponent(JSON.stringify(queryOptions));
	if( chartType == 'Bubble' ) {
		// Buggle plot required.
		// freq plot
		// determine the by break series
		// data needs to be [time : {x: value, y: value, label: breakValue}]
		var currentBreak = ''; // the break for the series
		var xlabel = getAxisLabel('x');
		var ylabel = getAxisLabel('y');
		var timePeriods = sdmxDataList[0].timePeriods;
		var countryPopulationList = [];

		if( bubbleChoice == 'pop' ) {
			countryPopulationList = getPopulation2010();
		}

		// build a x,y data list by time period
		for( var t in timePeriods ) {
			var timePeriod = timePeriods[t];
			for( x in data_x ) {
				if( data_x[x].Time == timePeriod ) {
					currentBreak = data_x[x][breakValue];

					for( y in data_y ) {
						if( data_y[y].Time == timePeriod && currentBreak == data_y[y][breakValue] ) {
							var bubbleValue = 100;

							switch ( bubbleChoice ){
							case 'xMinusy':
								bubbleValue = data_x[x].Value - data_y[y].Value;
								break;
							case 'yMinusx':
								bubbleValue = data_y[y].Value - data_x[x].Value;
								break;
							case '2':
								bubbleValue = lookupSeriesValue(sdmxDataList[2].data, timePeriod, currentBreak);
								break;
							case 'pop':
								// TO-DO: fix up this for ABS
								var area = data_x[x].REF_AREA;
								if( countryPopulationList[area] ) {
									bubbleValue = countryPopulationList[area].population;
								}
								break;
							}
							series.push({
								Time : timePeriod,
								x : Number(data_x[x].Value),
								y : Number(data_y[y].Value),
								label : data_x[x].breakDescription,
								bubbleValue : bubbleValue
							});
							break;
						}
					}
				}
			}
		}
		sliderInitQuery('slider', timePeriods);
		// show the sliders and stuff
		dojo.style(dojo.byId('sliderStuff'), 'display', 'block');
		dojo.style(dojo.byId('sliderPlay'), 'display', 'block');
		chartBubble(idLocation, xlabel, ylabel);
		var tableData = bubblePrepareData(series, xlabel, ylabel, timePeriods[timePeriods.length - 1], bubbleChoice);
		if( tableData.getNumberOfRows() > 0 ) {
			dojo.byId('sliderStatus').innerHTML = timePeriods[timePeriods.length - 1];
			multiChart.draw(tableData, multiChartOptions);
		} else {
			// no data for this time period
			dojo.byId('sliderStatus').innerHTML = 'no data for this time period';
		}
	} else {
		// hide the sliders and stuff
		dojo.style(dojo.byId('sliderStuff'), 'display', 'none');
		// freq plot
		// chartResultsLine(idLocation, breakValue, data_y);
		chartLineGoogle('multiChart', breakValue, sdmxDataList[0].data, sdmxDataList[0].timePeriods);
	}
	dojo.style(dojo.byId('multiInstructions'), 'display', 'none');
}

function chartLineGoogle(idLocation, breakValue, data, timePeriods) {
	// ['x', 'Cats', 'Blanket 1', 'Blanket 2'],
	// ['A', 1, 1, 0.5],
	var breakSeries = [];
	var series = [];
	var ref_area = ''; // the break for the series

	for( z in data ) {
		var d = data[z][breakValue];
		if( ref_area == '' )
			ref_area = d;
		if( ref_area != d ) {
			breakSeries.push({
				title : ref_area,
				data : series
			});
			ref_area = d;
			series = [];
		}

		series.push({
			Value : Number(data[z].Value),
			Time : data[z].Time
		});
	}
	breakSeries.push({
		title : ref_area,
		data : series
	});
	var table = [];
	var line = [ 'x' ];
	for( var b in breakSeries ) {
		line.push(breakSeries[b].title);
	}

	table.push(line);
	for( var t in timePeriods ) {
		var timePeriod = timePeriods[t];
		line = [ timePeriod ];
		for( var b in breakSeries ) {
			var found = false;

			for( var d in breakSeries[b].data ) {
				if( breakSeries[b].data[d].Time == timePeriod ) {
					line.push(breakSeries[b].data[d].Value);
					found = true;
					break;
				}
			}
			if( !found ) {
				line.push(null); // add missing values
			}
		}

		table.push(line);
	}
	var data = google.visualization.arrayToDataTable(table);
	// Create and draw the visualization.
	new google.visualization.LineChart(document.getElementById(idLocation)).draw(data);
}
/**
 * prepare the data so that it is appropriate for a google x/y bubble chart
 * 
 * @param data
 *            {object list} list of the data items
 * @param xTitle
 *            {string} the title of the x Axis
 * @param yTitle
 *            {string} the title of the y axis
 * @param timeSeriesIndex
 *            {string} date to be displayed
 * @param bubbleChoice
 *            {string} method of calculating the bubble dimensions
 * @returns
 */
function bubblePrepareData(data, xTitle, yTitle, timeSeriesIndex, bubbleChoice) {
	var table = [];
	var bubbleOption = dijit.byId('bubble').get('displayedValue');
	var title = '';

	if( bubbleOption != 'none' ) {
		table.push([ 'ID', xTitle, yTitle, 'Legend', bubbleOption ]);
		title = '{0} '.format(getBubbleLabel());
	} else {
		table.push([ 'ID', xTitle, yTitle ]);
	}
	// var data = google.visualization.arrayToDataTable([
	// ['ID', 'Life Expectancy', 'Fertility Rate', 'Population'],
	// ['CAN', 80.66, 1.67, 33739900],
	for( var z in data ) {
		if( data[z].Time == timeSeriesIndex ) {
			if( bubbleOption != 'none' ) {
				var bv = data[z].bubbleValue;
				var sign = bv ? bv < 0 ? -1 : 1 : 0;
				// TODO : fix group color legends
				var legend = '';
				switch ( bubbleChoice ){
				case 'xMinusy':
				case 'yMinusx':
					legend = sign > 0 ? 'Postive' : sign < 0 ? "Negative" : "Same";
					break;
				case 'pop':
					legend = 'Population';
					break;
				case '2':
					legend = getBubbleLabel();
					break;
				case 'none':
					break;
				}
				table.push([ data[z].label, data[z].x, data[z].y, legend, Math.abs(bv) ]);
			} else {
				table.push([ data[z].label, data[z].x, data[z].y ]);
			}
		}
	}

	multiChartOptions.title = title + timeSeriesIndex;
	var tableData = google.visualization.arrayToDataTable(table);
	return tableData;
}

function chartBubble(idLocation, xTitle, yTitle, timeSeriesIndex) {
	// https://code.google.com/apis/ajax/playground/?type=visualization#bubble_chart
	multiChartOptions = {
		title : timeSeriesIndex,
		hAxis : {
			title : xTitle
		},
		vAxis : {
			title : yTitle
		},
		bubble : {
			textStyle : {
				fontSize : 11
			}
		},
		colorAxis : {
			minValue : -1,
			maxValue : 1,
			colors : [ 'red', 'green' ],
			legend : {
				position : 'right'
			}
		}
	};
	multiChart = new google.visualization.BubbleChart(document.getElementById(idLocation));
}

function sliderInitQuery(controlId, timePeriods) {
	if( dijit.byId('slider') ) {
		return; // already created.
	}

	var sliderNode = dojo.byId(controlId);
	// add slider labels
	// http://dojo-toolkit.33424.n3.nabble.com/Programmatic-HorizontalRuleLabels-td964780.html
	var rulesNode = document.createElement('div');
	sliderNode.appendChild(rulesNode);
	var rulesNodeLabels = document.createElement('div');
	sliderNode.appendChild(rulesNodeLabels);
	// use at most 7 time periods.
	var labels = [];
	for( var q = 0; q < timePeriods.length; q += Math.round(timePeriods.length / 7) ) {
		if( q < timePeriods.length )
			labels.push(timePeriods[q]);
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
		value : timePeriods.length - 1,
		minimum : 0,
		maximum : timePeriods.length - 1,
		intermediateChanges : false,
		discreteValues : timePeriods.length,
		onChange : function(value) {
			var timePeriod;
			try {
				timePeriod = timePeriods[value]; // value is the index;
			} catch( e ) {
				return;
			}

			if( !timePeriod ) {
				return;
			}
			var bubbleChoice = dijit.byId('bubble').value;
			var tableData = bubblePrepareData(series, multiChartOptions.hAxis.title, multiChartOptions.vAxis.title, timePeriod,
					bubbleChoice);
			if( tableData.getNumberOfRows() > 0 ) {
				dojo.byId('sliderStatus').innerHTML = timePeriod;
				multiChart.draw(tableData, multiChartOptions);
			} else {
				// no data for this time period
				dojo.byId('sliderStatus').innerHTML = 'no data for this time period';
			}
		}

	}, sliderNode);
	slider.startup();
}

// makes the slider go back and forth
function sliderPlayQuery() {
	// http://stackoverflow.com/questions/9150850/setinterval-dojo-example
	var playTitle = dojo.byId('sliderPlay').value;
	var slider = dijit.byId('slider');
	var intervalTime = 250;
	var minPlayTime = 10000;
	var timePeriods = sdmxDataList[0].timePeriods;
	if( timePeriods.length * intervalTime < minPlayTime )
		intervalTime = Math.round(minPlayTime / timePeriods.length);
	function doIt() {
		if( sliderDecrement )
			slider.decrement(1);
		else
			slider.increment(1);
		if( slider.value >= slider.maximum || slider.value <= slider.minimum )
			stop();
	}

	function stop() {
		clearInterval(sliderPlayInterval); // stop timer
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
		stop(); // stop timer
	}
}
/**
 * Export the contents fo the given grid
 */
function exportData(sdmxData) {
	var s = sdmxData.columns.join(',');

	s += '\n';

	function JSONjoin(o, delim) {
		var text = [];

		for( var v in o ) {
			var itemValue = o[v];

			if( typeof (itemValue) == 'string' ) {
				itemValue = itemValue.indexOf(delim) > -1 ? '"' + itemValue + '"' : itemValue;
			}
			text.push(itemValue);
		}
		return text.join(delim);
	}

	for( var d in sdmxData.data ) {
		s += JSONjoin(sdmxData.data[d], ',') + '\n';
	}
	// http://stackoverflow.com/questions/3499597/javascript-jquery-to-download-file-via-post-with-json-data?lq=1
	var http = new XMLHttpRequest();

	var url = "query.php?method=download&filetype=csv";
	http.open("POST", url, true);

	// Send the proper header information along with the request
	http.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

	http.onreadystatechange = function() {// Call a function when the state
		// changes.
		if( http.readyState == 4 && http.status == 200 ) {
			// next bit will initiate a download
			var iframe = document.createElement("iframe");
			iframe.setAttribute("src", http.responseText);
			iframe.setAttribute("style", "display: none");
			document.body.appendChild(iframe);
		}
	};
	http.send(s);
}

function build_dataflow_soap_ABS(query) {
	// builds a soap packet from the query
	/*
	 * query.qAnd = []; query.qOr = []; query.startTime = ''; query.endTime =
	 * ''; query.dataSetId = dojo.byId( 'objectid' ).value;
	 */
	// go through constraints finding all checked and the start and end time.
	// first the AND
	// then time
	// following dataflow id
	// and finally all the OR things
	var soap = '{0}<And>'.format(globalOptions.ws_query_dataflow_header);
	var frequency = 'M'; // A B Q M
	// Returns query results from the array that match the given query
	var constraintsAdded = 0;
	var i;
	for( i = 0; i < query.qAnd.length; i++ ) {
		var item = query.qAnd[i];
		var values = item.v.split(',');

		for( var z in values ) {
			soap += '<Dimension id="{0}">{1}</Dimension>'.format(item.c, values[z]);
			constraintsAdded++;
			if( item.c == 'FREQUENCY' ) {
				frequency = values[z];
			}
		}
	}

	if( query.startTime.length > 0 || query.endTime.length > 0 ) {
		/*
		 * <Attribute id="TIME_FORMAT">P1M</Attribute> <Time>
		 * <StartTime>2004-10</StartTime> <EndTime>2005-10</EndTime> </Time>
		 * 
		 * TIME_FORMAT attribute should have the following value: 'P1Y' for
		 * annual, 'P6M' for bi-annual, 'P3M' for quarterly and 'P1M' for
		 * monthly data.
		 */

		function toDate(dateString) {
			var a = dateString.split('-');
			var y = Number(a[0]), m = Number(a[1]), day = Number(a[2]);

			var d = new Date(y, m, day);

			return d;
		}
		// http://stackoverflow.com/questions/1267283/how-can-i-create-a-zerofilled-value-using-javascript
		/** Pad a number with 0 on the left */
		function zeroPad(number, digits) {
			var num = number + "";
			while( num.length < digits ) {
				num = '0' + num;
			}
			return num;
		}
		var TIME_FORMAT = 'P1M', ts = toDate(query.startTime), te = toDate(query.endTime);
		var tStart = query.startTime, tEnd = query.endTime;

		/* format according to frequency */

		switch ( frequency ){
		case 'A':
			TIME_FORMAT = 'P1Y';
			tStart = '{0}'.format(ts.getFullYear());
			tEnd = '{0}'.format(te.getFullYear());
			break;
		case 'B':
			TIME_FORMAT = 'P6M';
			break;
		case 'Q':
			TIME_FORMAT = 'P3M';
			break;
		case 'M':
			TIME_FORMAT = 'P1M';
			tStart = '{0}-{1}'.format(ts.getFullYear(), zeroPad(ts.getMonth(), 2));
			tEnd = '{0}-{1}'.format(te.getFullYear(), zeroPad(te.getMonth(), 2));
			break;
		}

		soap += '<Attribute id="TIME_FORMAT">{0}</Attribute>'.format(TIME_FORMAT);
		soap += '<Time>';
		if( query.startTime.length > 0 ) {
			soap += '<StartTime>{0}</StartTime>'.format(tStart);
		}
		if( query.endTime.length > 0 ) {
			soap += '<EndTime>{0}</EndTime>'.format(tEnd);
		}
		soap += '</Time>';
	}
	soap += '<{0}>{1}</{0}>'.format(globalOptions.ws_query_dataflow, query.dataSetId);
	if( query.qOr.length > 0 ) {
		soap += '<Or>';
		for( i = 0; i < query.qOr.length; i++ ) {
			var item = query.qOr[i];
			var values = item.v.split(',');

			for( var z in values ) {
				if( values[z][0] == '=' ) {
					// this is a filter on the code list
					var codeList = getCodelist(item.c, query.dataSetId);
					var queryString = values[z].slice(1);

					if( codeList ) {
						// http://stackoverflow.com/questions/1367386/how-do-i-retrieve-values-from-dojo-data-itemfilereadstore
						var queryStore = new dojo.data.ItemFileReadStore({
							data : {
								items : codeList
							}
						});

						// query using the code.
						queryStore.fetch({
							query : {
								code : queryString
							},
							onItem : function(queryItem) {
								soap += '<Dimension id="{0}">{1}</Dimension>'.format(item.c, queryStore.getValue(queryItem, 'code'));
							}
						});
					} else {
						alert('code list could not be found:{0}'.format(item.c));
						return null;
					}
				} else {
					soap += '<Dimension id="{0}">{1}</Dimension>'.format(item.c, values[z]);
				}
				constraintsAdded++;
			}
		}
		soap += '</Or>';
	}
	soap += '</And>{0}'.format(globalOptions.ws_query_dataflow_footer);
	if( constraintsAdded == 0 ) {
		alert('No query constraints found in {0}'.format(JSON.stringify(query)));
		return null;
	}
	return soap;
}

/**
 * call_create_query - save the query in the active mapResult.html or
 * queryResult.html page for later viewing
 */
function call_create_query() {
	// list every node with class saveQuery:
	var values = '';
	var nodes = dojo.query(".saveQuery");

	for( var x = 0; x < nodes.length; x++ ) {
		var k, v;

		k = nodes[x].id;
		v = nodes[x].value;
		if( k == 'name' ) {
			v = encodeURIComponent(v); // make sure the name is encoded.
		}
		if( v[0] != '#' ) {
			// console.log(k, v);
			values += "&{0}={1}".format(k, v);
		}
	}

	var xmlhttp = new XMLHttpRequest();
	var url = '{0}?method=create{1}&random={3}'.format(getQuerypage(), values, randomString(5));
	// console.log(url);
	xmlhttp.open('GET', url, false);
	xmlhttp.send();
	if( xmlhttp.status == 200 ) {
		alert('Saved');
	} else {
		alert('Error creating:' + xmlhttp.responseText);
	}
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
 */
function describeData(textId, options, query, sdmxData) {
	// TODO: make this more sensible
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

	// average, max value and total
	var maxValue = 0, minValue = 0, total = 0.0;

	var data = sdmxData.data;

	for( var z in data ) {
		var v = data[z].Value;

		if( v > data[maxValue].Value )
			maxValue = z;
		if( v < data[minValue].value )
			minValue = z;

		var s = "" + v;

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

	var stdDeviationList = [];
	for( var z in data ) {
		var v = data[z].Value;

		if( v > avg && v > (avg + (stdDeviation * 2)) || v < avg && v < (avg - (stdDeviation * 2)) ) {
			stdDeviationList.push('{0} - {1}'.format(data[z].breakDescription, v));
		}
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
	templateReplace('{previousValue}', previousValues.value);
	templateReplace('{previousPrev}', previousValues.prev);
	templateReplace('{previousName}', previousValues.name);
	templateReplace('{previousDiff}', previousValues.diff.toFixed(decimalPlaces));
	templateReplace('{previousPeriod}', previousValues.period);

	textarea.value = template;
}
