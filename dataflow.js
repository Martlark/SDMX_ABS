/*
    handler for the dataflow.html page
 */

dojo.require("dijit.TooltipDialog");

var valueDialog, valueDialogGrid;

function setup_dataflow_grid(gridNumber) {
	var grid = new dojox.grid.DataGrid({
		structure : [ {
			name : "Constraint",
			field : "constraint",
			width : "20%"
		}, {
			name : "Code List",
			field : "component",
			width : "20%"
		}, {
			name : "Value",
			field : "value",
			width : "20%"
		}, {
			name : "And",
			field : "qAnd",
			editable : true,
			cellType : dojox.grid.cells.Bool,
			width : "10%"
		}, {
			name : "Or",
			field : "qOr",
			editable : true,
			cellType : dojox.grid.cells.Bool,
			width : "10%"
		} ]
	}, "grid{0}".format(gridNumber));
	grid.startup();
	// setup the tool tips by reading the code lists from the key family
	var showTooltip = function(e) {
		// console.log("showTooltip");
		var msg = null;

		if( e.rowIndex >= 0 ) { // header is <0
			if( e.cell.field == 'value' ) {
				// value column of constraints
				var item = e.grid.getItem(e.rowIndex);
				var code = e.grid.store.getValue(item, e.cell.field);
				var concept = item.component[0];
				var codelist = null;

				if( grid.keyFamilyData ) {
					for( z in e.grid.keyFamilyData.dimensions ) {
						// find the concept map to the code list
						if( concept == e.grid.keyFamilyData.dimensions[z].concept ) {
							codelist = e.grid.keyFamilyData.dimensions[z].codelist;
							break;
						}
					}
				}

				if( codelist ) {
					// find the text in the keyFamilyData
					var codeLists = e.grid.keyFamilyData.codeLists;
					for( z in codeLists ) {

						// find right code list
						if( codeLists[z].code == codelist ) {
							// find code in codelist
							for( c in codeLists[z].codes ) {
								if( codeLists[z].codes[c].code == code ) {
									msg = '{0} - {1}'.format(codeLists[z].name, codeLists[z].codes[c].description);
									break;
								}
							}
						}
						if( msg ) {
							break;
						}
					}
				}
			}
		}
		;
		if( msg ) {
			// console.log(msg);
			dijit.showTooltip(msg, e.cellNode);
			// dijit.showTooltip(msg, e.cellNode, ["below", "above", "after",
			// "before"]);
		}
	};
	var hideTooltip = function(e) {
		dijit.hideTooltip(e.cellNode);
	};
	dojo.connect(grid, "onCellMouseOver", showTooltip);
	dojo.connect(grid, "onCellMouseOut", hideTooltip);
	dojo.connect(grid, "onHeaderCellMouseOver", showTooltip);
	dojo.connect(grid, "onHeaderCellMouseOut", hideTooltip);
	return grid;
}
/**
 * called to setup the dataflow page inteface elements.
 */
function init_dataflow() {
	setup_dataflow_grid(0);
	setup_dataflow_grid(1);
	setup_dataflow_grid(2);

	// set time period to five years ago to limit returned data

	var ds, n = new Date();

	ds = dijit.byId('StartTime');

	n.setTime(n.valueOf() - (5 * 365.25 * 24 * 60 * 60 * 1000));
	ds.setValue(n);
	// populate the map selection
	var xmlhttp, mapLayers = {}, maps = [], randomJunk = randomString(8);

	try {
		xmlhttp = new XMLHttpRequest();
		xmlhttp.open('GET', 'resources/mapLayers.json?' + randomJunk, false);
		xmlhttp.send();

		mapLayers = JSON.parse(xmlhttp.responseText);

	} catch( err ) {
		alert('mapLayers.json not specified correctly:' + err.message);
	}
	maps.push({
		label : 'None',
		id : 'None'
	});
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

	// populate the first dataflow table, other dataflows can be added manually
	call_dataflow_ws(0);
}

function call_dataflow_ws(dataflowCount) {
	var dataflowid = dojo.byId('objectid{0}'.format(dataflowCount)).value;
	var soap = '<in><quer:AgencyID>ECB</quer:AgencyID><quer:ID>' + dataflowid + '</quer:ID></in>';

	soap = globalOptions.ws_dataFlowScheme.format(dataflowid);
	soap_method = globalOptions.ws_dataFlowScheme_method;
	// '<in><quer:AgencyID>ECB</quer:AgencyID><quer:ID>SDW_ECONOMIC_CONCEPTS</quer:ID></in>';

	call_sdmx_ws(soap, soap_method, 'content', getDataflowResponseABS, dataflowCount);

	// call_sdmx_ws(soap, 'GetDataflow', 'content', getDataflowResponse,
	// dataflowCount);
}

function getDataflowResponse(responseText, dataflowCount) {
	// processes the XML for all the dataflow schemes
	// dojo.byId("status").innerHTML = "Formatting results...";
	var div = dojo.byId('keyFamilyLinks{0}'.format(dataflowCount));
	var grid = dijit.byId('grid{0}'.format(dataflowCount));
	var s = '&nbsp;';
	var contentHandler = new DefaultHandler2();
	var id = '';
	var currentName = '';
	var foundCount = 0;
	var elements = Array();
	var data = [];
	var keyFamilyId = '';
	var breakValues = [];
	var codeList = '', constaint = '';
	var saxParser = XMLReaderFactory.createXMLReader();
	contentHandler.startElement = function(namespaceURI, localName, qName, atts) {
		// console.log( "startElement : [" + namespaceURI + "], [" + localName +
		// "], [" + qName + "]" );
		currentName = localName;
		elements.push(localName);
		switch ( localName ){
		case 'Dataflow':
			id = atts.getValue(atts.getIndex('id'));
			break;
		case 'KeyFamilyRef':
			s += 'Key family reference';
			break;
		}
	};
	contentHandler.endElement = function(namespaceURI, localName, qName) {
		// console.log( "startElement : [" + namespaceURI + "], [" + localName +
		// "], [" + qName + "]" );
		currentName = localName;
		var leavingElement = elements.pop();
		switch ( localName ){
		case 'Dataflow':
			foundCount++;
			break;
		case 'KeyFamilyRef':
			break;
		}
	};
	contentHandler.characters = function(ch, start, ch_length) {
		// console.log( "characters : [" + ch + "], [" + start + "], [" +
		// ch_length + "]" );
		switch ( currentName ){
		case 'Name':
			dojo.byId('dataFlowTitle{0}'.format(dataflowCount)).innerHTML = '{0} {1}'.format(id, ch);
			break;
		case 'KeyFamilyID':
			keyFamilyId = ch;
			s += '&nbsp;<a href="{0}?KeyFamily.html&objectid={1}">{1}</a> '.format(getRpage(), ch);
			break;
		case 'ConstraintID':
			constraint = ch;
			break;
		case 'CategorySchemeID':
			s += '<strong>{0}</strong>'.format(ch);
			break;
		case 'ComponentRef':
			if( elements.indexOf('Constraint') > -1 )
				codeList = ch;
			break;
		case 'Value':
			if( elements.indexOf('Member') > -1 && elements.indexOf('MemberValue') > -1 ) {
				data.push({
					constraint : constraint,
					component : codeList,
					value : ch,
					qAnd : false,
					qOr : false
				});
				if( breakValues.indexOf(codeList) == -1 ) {
					// add all unique values to be used as the break values for
					// determining chart series
					breakValues.push(codeList);
				}
			}
			break;
		}
	};
	try {
		dojo.byId('content').value = responseText;
		saxParser.setHandler(contentHandler);
		saxParser.parseString(responseText);
	} catch( e ) {
		alert('problem processing response:' + e.message);
		dojo.style(dojo.byId('content'), "display", "block");
		dojo.byId('content').focus();
		return;
	}

	if( foundCount == 0 )
		s = '<p>No results found</p>';
	// http://dojo-toolkit.33424.n3.nabble.com/how-to-change-ItemFileWriteStore-data-or-dojox-grid-DataGrid-td2353208.html
	var store = new dojo.data.ItemFileWriteStore({
		data : {
			items : data
		}
	});
	grid.setStore(store);
	var keyFamilyData = [];// getKeyfamily(keyFamilyId);
	grid.keyFamilyData = keyFamilyData;
	// console.log( s );
	div.innerHTML = s; // key family href
	if( !dijit.byId('breakField') ) {
		var storeValues = [];
		for( z in breakValues ) {
			storeValues.push({
				label : breakValues[z],
				id : breakValues[z]
			});
		}
		var breakStore = new dojo.store.Memory({
			data : storeValues
		});
		var defaultBreakField = breakValues.indexOf("REF_AREA") >= 0 ? "REF_AREA" : breakValues[0];
		var select = new dijit.form.Select({
			id : "breakField",
			label : defaultBreakField,
			value : defaultBreakField,
			store : new dojo.data.ObjectStore({
				objectStore : breakStore
			}),
			searchAttr : "name"
		}, "breakField");
		select.startup();
	} // dojo.byId("status").innerHTML = "Done";
	dojo.style(dojo.byId('executing'), 'display', 'none');
}
/**
 * process the xml from a dataflow soap response
 * 
 * @param responseText -
 *            the xml to process
 * @param dataflowCount -
 *            index of the interface elements to populate, -1 to just return
 *            codelists
 * @returns {codeLists}
 */
function getDataflowResponseABS(responseText, dataflowCount) {
	var s = '&nbsp;';
	var contentHandler = new DefaultHandler2();
	var id = '';
	var currentName = '';
	var foundCount = 0;
	var elements = Array();
	var data = [];
	var keyFamilyId = '';
	var breakValues = [];
	var codeListId = ''; // the id of the current code list
	var codeId = ''; // the id of the current code
	var constaint = '';
	var codeLists = {}; // holds the code lists for this key family
	var codeList = []; // a list of codes and their values
	var saxParser = XMLReaderFactory.createXMLReader();
	var div = dojo.byId('keyFamilyLinks{0}'.format(dataflowCount));
	var grid = dijit.byId('grid{0}'.format(dataflowCount));

	contentHandler.startElement = function(namespaceURI, localName, qName, atts) {
		// console.log( "startElement : [" + namespaceURI + "], [" + localName +
		// "], [" + qName + "]" );
		currentName = localName;
		elements.push(localName);
		switch ( localName ){
		case 'KeyFamily':
			id = atts.getValue(atts.getIndex('id'));
			s += '&nbsp;<a href="{0}?KeyFamily.html&objectid={1}">{1}</a> '.format(getRpage(), id);
			break;
		case 'CodeList':
			codeListId = atts.getValue(atts.getIndex('id'));
			break;
		case 'Code':
			codeId = atts.getValue(atts.getIndex('value'));
			break;
		case 'Dimension':
		// auto set the values when only one code list item.
		    var componentCodeList = codeLists[atts.getValue(atts.getIndex('codelist'))];
		    
			data.push({
				constraint : atts.getValue(atts.getIndex('conceptRef')),
				component : atts.getValue(atts.getIndex('codelist')),
				value : componentCodeList.length == 1 ? componentCodeList[0].code : '',
				qAnd : componentCodeList.length == 1,
				qOr : false,
				isMeasureDimension : atts.getValue(atts.getIndex('isMeasureDimension')) == "true",
				isFrequencyDimension : atts.getValue(atts.getIndex('isFrequencyDimension')) == "true"
			});
			if( breakValues.indexOf(atts.getValue(atts.getIndex('conceptRef'))) == -1 ) {
				// add all unique values to be used as the break values for
				// determining chart series
				breakValues.push(atts.getValue(atts.getIndex('conceptRef')));
			}
			break;
		}
	};
	contentHandler.endElement = function(namespaceURI, localName, qName) {
		// console.log( "startElement : [" + namespaceURI + "], [" + localName +
		// "], [" + qName + "]" );
		var leavingElement = elements.pop();
		currentName = localName;

		switch ( localName ){
		case 'KeyFamily':
			foundCount++;
			break;
		case 'CodeList':
			codeLists[codeListId] = codeList;
			codeList = [];
			codeListId = '';
			break;
		}
	};
	contentHandler.characters = function(ch, start, ch_length) {
		// console.log( "characters : [" + ch + "], [" + start + "], [" +
		// ch_length + "]" );
		switch ( currentName ){
		case 'Name':
			if( elements[elements.length - 2] == 'KeyFamily' && id.length > 0 ) {
				// first one should be always xml:lang="en"
				dojo.byId('dataFlowTitle{0}'.format(dataflowCount)).innerHTML = '{0} - {1}'.format(id, ch);
				id = '';
			}
			break;
		case 'Description':
			if( elements[elements.length - 2] == 'Code' && codeId.length > 0 ) {
				// first one should be always xml:lang="en"
				codeList.push({
					code : codeId,
					description : ch
				});
				codeId = '';
			}
			break;
		}
	};
	try {

		saxParser.setHandler(contentHandler);
		saxParser.parseString(responseText);
	} catch( e ) {
		alert('problem processing dataflow response:' + e.message);
		if( dataflowCount >= 0 ) {
			dojo.style(dojo.byId('content'), "display", "block");
			dojo.byId('content').focus();
		}
		return;
	}

	// http://dojo-toolkit.33424.n3.nabble.com/how-to-change-ItemFileWriteStore-data-or-dojox-grid-DataGrid-td2353208.html
	var store = new dojo.data.ItemFileWriteStore({
		data : {
			items : data
		}
	});
	if( foundCount == 0 ) {
		s = '<p>No results found</p>';
	}
	grid.setStore(store);
	grid.codeLists = codeLists;
	// console.log( s );
	div.innerHTML = s; // key family href
	if( !dijit.byId('breakField') ) {
		var storeValues = [];

		for( z in breakValues ) {
			storeValues.push({
				label : breakValues[z],
				id : breakValues[z]
			});
		}
		var breakStore = new dojo.store.Memory({
			data : storeValues
		});

		var defaultBreakField = breakValues.indexOf("REF_AREA") >= 0 ? "REF_AREA" : breakValues[0];
		var select = new dijit.form.Select({
			id : "breakField",
			label : defaultBreakField,
			value : defaultBreakField,
			store : new dojo.data.ObjectStore({
				objectStore : breakStore
			}),
			searchAttr : "name"
		}, "breakField");
		select.startup();
	}

	// intiate a click handler to add code list values for queries.
	dojo.connect(grid, 'onCellClick', function(e) {
		this.inherited('onCellClick', arguments); // fire default handlers

		if( e.rowIndex >= 0 ) { // header is <0
			if( e.cell.field == 'value' ) {
				onCellClickValue(e);
			}
		}

	});
	dojo.style(dojo.byId('executing'), 'display', 'none');
	if( !valueDialog ) {
		valueDialog = new dijit.TooltipDialog({
			id : "valueDialog",
			style : "position: absolute; height: 400px; width: 550px; font: normal normal normal 10pt Helvetica;z-index:100"
		});
		var content = dojo.byId('dialogContent').innerHTML.replaceAll('__', '');

		valueDialog.setContent(content);
		valueDialog.startup();
	}

}

function onCellClickValue(e) {
	// show a select dialog to add/remove values from the code list for this
	// code list row.
	var item = e.grid.getItem(e.rowIndex);
	var codeList = item.component;

	var store = new dojo.data.ItemFileWriteStore({
		data : {
			items : e.grid.codeLists[codeList]
		}
	});

	dijit.popup.open({
		popup : valueDialog,
		x : 100,
		y : 50
	});

	this._ESCkeyHandler = dojo.connect(valueDialog.containerNode, 'onkeypress', function(evt) {
		var key = evt.keyCode;
		if( key == dojo.keys.ESCAPE ) {
			cancelDialog();
		}
	});
	if( !valueDialogGrid ) {
		valueDialogGrid = new dojox.grid.DataGrid({
			structure : [ {
				name : "Code",
				field : "code",
				width : "25%"
			}, {
				name : "Description",
				field : "description",
				width : "65%"
			}, {
				name : "Select",
				field : "select",
				editable : true,
				cellType : dojox.grid.cells.Bool,
				width : "10%"
			} ],
			style : 'width:525px; height:320px'
		});
		dojo.place(valueDialogGrid.domNode, valueDialog.containerNode, 'last');
		valueDialogGrid.startup();
	}
	valueDialogGrid.setStore(store);
	valueDialogGrid.e_grid_store = e.grid.store;
	valueDialogGrid.e_grid_item = item;
	valueDialogGrid.e_cell_field = e.cell.field;
	dojo.byId('codeFilter').focus();
	dojo.byId('codeListName').innerHTML = '{0}, {1} items.'.format(codeList, valueDialogGrid.rowCount);
}

function clearAllDialog() {
	// de-select all selected checkboxes
	var store = valueDialogGrid.store;
	// Returns query results from the array that match the given query

	function clearAllItems(items, request) {
		for( var i = 0; i < items.length; i++ ) {
			store.setValue(items[i], "select", false);
		}
	}
	store.fetch({
		query : {
			select : true
		},
		onComplete : clearAllItems
	});
}
/*******************************************************************************
 * select all values in the code list selector dialog that are displayed
 */
function selectAllDialog(filterInputs) {
	// get values of input filters
	// get all values that match from the store
	var store = valueDialogGrid.store;
	// Returns query results from the array that match the given query

	function selectAllItems(items, request) {
		for( var i = 0; i < items.length; i++ ) {
			store.setValue(items[i], "select", true);
		}
	}
	store.fetch({
		query : valueDialogGrid.query,
		queryOptions : valueDialogGrid.queryOptions,
		onComplete : selectAllItems
	});
}

function cancelDialog() {
	dojo.disconnect(this._ESCkeyHandler);
	dijit.popup.close(valueDialog);
}
/*******************************************************************************
 * set the selected values from the code list selector to the grid
 * 
 * @returns
 */
function okDialog(options) {
	cancelDialog();

	if( valueDialogGrid.rowCount == 0 )
		return null;

	var codeList = [];
	var store = valueDialogGrid.store;
	// Returns query results from the array that match the given query

	function gotItemsUse(items, request) {
		for( var i = 0; i < items.length; i++ ) {
			codeList.push(store.getValue(items[i], "code"));
		}
	}
	if( options.filterSelect ) {
		codeList.push('=' + valueDialogGrid.query.code);
	} else {
		store.fetch({
			query : {
				select : true
			},
			onComplete : gotItemsUse
		});
	}

	valueDialogGrid.e_grid_store.setValue(valueDialogGrid.e_grid_item, valueDialogGrid.e_cell_field, codeList.join());

	// set the and / or values as seems sensible
	valueDialogGrid.e_grid_store.setValue(valueDialogGrid.e_grid_item, "qAnd", false);
	valueDialogGrid.e_grid_store.setValue(valueDialogGrid.e_grid_item, "qOr", false);

	if( codeList.length > 1 || options.filterSelect ) {
		valueDialogGrid.e_grid_store.setValue(valueDialogGrid.e_grid_item, "qOr", true);
		// should also set the series break selection to this one.
		var constraint = valueDialogGrid.e_grid_item.constraint[0];
		var seriesBreak = dijit.byId('breakField');

		seriesBreak.attr('value', constraint);
	} else if( codeList.length == 1 ) {
		valueDialogGrid.e_grid_store.setValue(valueDialogGrid.e_grid_item, "qAnd", true);
	}
}
/**
 * build query and send to a queryResult page to be charted.
 * 
 * @param methodOptions -
 *            map = true to use the mapResult.html page
 */
function dataset_query(methodOptions) {
	var queries = '';
	var title = '';
	var breakField = dijit.byId('breakField').get('value');

	for( var i = 0; i < 3; i++ ) {
		try {
			var query = build_dataset_query(i);

			if( query && query.qAnd.length + query.qOr.length > 0 ) {
				var encoded = encodeURIComponent(JSON.stringify(query));

				queries += '&{0}={1}'.format('query{0}'.format(i), encoded);
				title += '{0} by {1}. '.format(dojo.byId('dataFlowTitle{0}'.format(i)).innerHTML, breakField);

				if( query.startTime && query.endTime ) {
					title += '{0} to {1}.'.format(query.startTime, query.endTime);
				}
			}
		} catch( e ) {
			alert('Error building query:' + e.message);
			return;
		}

	}

	if( queries == '' ) {
		alert('No And,Or selections made');
		return;
	}

	var options = {};

	options.breakField = breakField;
	options.mapLayerId = dijit.byId('mapLayers').get('value');
	options.perCapita = dojo.byId('perCapita').checked;
	title = encodeURIComponent(title);

	var page = 'queryResult.html';

	if( methodOptions && methodOptions.map ) {
		options.map = true;
		page = 'mapResult.html';
	}

	options = encodeURIComponent(JSON.stringify(options));
	window.open('{0}?{1}&title={2}&options={3}{4}'.format(getRpage(), page, title, options, queries), '_blank');
}
/**
 * build a query object to submit to the query builder from the selections in
 * the dataflow grid
 * 
 * @param queryNumber -
 *            index to the query interface elements
 * @returns - JSON describing the query - null on error
 */
function build_dataset_query(queryNumber) {
	// 
	var grid = dijit.byId('grid{0}'.format(queryNumber));

	if( !grid ) {
		throw 'grid{0} not found'.format(queryNumber);
	}
	if( grid.rowCount == 0 ) {
		// No elements in query selection grid to process
		return null;
	}
	var query = {}, frequencyDimensionCount = 0, measureDimensionCount = 0;

	query.qAnd = [];
	query.qOr = [];
	query.startTime = '';
	query.endTime = '';
	query.dataSetId = dojo.byId('objectid{0}'.format(queryNumber)).value;
	query.measure = 'Value';
	// go through constraints finding all checked and the start and end time.
	// first the AND
	// then time
	// following dataflow id
	// and finally all the OR things

	var store = grid.store;
	// Returns query results from the array that match the given query

	function gotItemsAnd(items, request) {
		var i;
		for( i = 0; i < items.length; i++ ) {
			var item = items[i];

			query.qAnd.push({
				c : store.getValue(item, globalOptions.dataflow_constraint_column),
				v : store.getValue(item, "value")
			});

			// if the concept is a measure concept then add in the description
			// for charting
			// for some reason all item bits are arrays
			if( item.isMeasureDimension[0] ) {
				var codeListId = item.component[0];
				var codeList = grid.codeLists[codeListId];
				var code = store.getValue(item, "value");

				measureDimensionCount++;
				for( c in codeList ) {
					if( codeList[c].code[0] == code ) {
						query.measure = codeList[c].description[0].replaceAll('"', '').replaceAll("'", '');
						break;
					}
				}
			}
			if( item.isFrequencyDimension[0] ) {
				var codeListId = item.component[0];
				var codeList = grid.codeLists[codeListId];
				var code = store.getValue(item, "value");

				frequencyDimensionCount++;
				for( c in codeList ) {
					if( codeList[c].code[0] == code ) {
						query.frequency = codeList[c].description[0].replaceAll('"', '').replaceAll("'", '');
						break;
					}
				}
			}
		}
	}

	function gotItemsOr(items, request) {
		var i;
		if( items.length > 0 ) {
			for( i = 0; i < items.length; i++ ) {
				var item = items[i];

				query.qOr.push({
					c : store.getValue(item, globalOptions.dataflow_constraint_column),
					v : store.getValue(item, "value")
				});
			}
		}
	}
	if( store ) {
		store.fetch({
			query : {
				qAnd : true
			},
			onComplete : gotItemsAnd
		});
		var d;
		d = dijit.byId('StartTime').get('value');
		if( d ) {
			query.startTime = dojo.date.locale.format(d, {
				datePattern : 'yyyy-MM-dd',
				selector : "date"
			});
		}
		d = dijit.byId('EndTime').get('value');
		if( d ) {
			query.endTime = dojo.date.locale.format(d, {
				datePattern : 'yyyy-MM-dd',
				selector : "date"
			});
		}
		store.fetch({
			query : {
				qOr : true
			},
			onComplete : gotItemsOr
		});
	}
	var problems = [];
	if( frequencyDimensionCount > 1 ) {
		problems.push('Too many frequency dimensions {0}.  One only allowed'.format(frequencyDimensionCount));
	}
	if( measureDimensionCount > 1 ) {
		problems.push('Too many measure dimensions {0}.  One only allowed'.format(measureDimensionCount));
	}
	// TODO: ask Jim about the neccesity of measure dimensions. In the mean time
	// disable this check
	if( measureDimensionCount == 0 && false ) {
		problems.push('A measure dimension needs to be selected');
	}
	if( frequencyDimensionCount == 0 ) {
		problems.push('A frequency dimension needs to be selected');
	}
	if( problems.length > 0 ) {
		// stack over flow question: 464359
		throw {
			name : 'query issue',
			message : problems.join('\n')
		};
	}
	return query;
}
