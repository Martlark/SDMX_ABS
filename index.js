// index.js
prototypeExtensions();

function prototypeExtensions() {
	// extend the base objects for missing methods that are usefull everywhere.

	// http://stackoverflow.com/questions/202605/repeat-string-javascript
	String.prototype.repeat = function(num) {
		return new Array(num + 1).join(this);
	};
	// http://stackoverflow.com/questions/610406/javascript-equivalent-to-printf-string-format
	// example: "{0} is dead, but {1} is alive! {0} {2}".format("ASP",
	// "ASP.NET")
	// first, checks if it isn't implemented yet
	if( !String.prototype.format ) {
		String.prototype.format = function() {
			var args = arguments;
			return this.replace(/{(\d+)}/g, function(match, number) {
				return typeof args[number] != 'undefined' ? args[number] : match;
			});
		};
	}
	// http://stackoverflow.com/questions/646628/javascript-startswith
	if( typeof String.prototype.startsWith != 'function' ) {
		String.prototype.startsWith = function(str) {
			return this.slice(0, str.length) == str;
		};
	}

	if( typeof String.prototype.endsWith != 'function' ) {
		String.prototype.endsWith = function(str) {
			return this.slice(-str.length) == str;
		};
	}

	// bizarrely replace does not replace all of the strFindIn in a string, just
	// the first one
	// strFindIn {string|array} the values to search for
	// strReplace {string} the value to replace it with
	if( typeof String.prototype.replaceAll != 'function' ) {
		String.prototype.replaceAll = function(strFindIn, strReplace) {
			var failSafe = this.length;
			var s = this;
			var strFindArray = [].concat(strFindIn);
			if( strReplace == null ) {
				strReplace = '';
			}

			for( var z in strFindArray ) {
				strFind = strFindArray[z];
				while( s.indexOf(strFind) > -1 && failSafe > 0 ) {
					s = s.replace(strFind, strReplace);
					failSafe--;
				}
			}
			return s;
		};
	}

	Number.prototype.zeroPad = function(digits) {
		var num = this + "";

		while( num.length < digits ) {
			num = '0' + num;
		}
		return(num);
	};

	if( !console ) {
		console = {};
		console.messages = [];

		console.log = function(msg) {
			console.messages.push(msg);
		};

		console.dump = function() {
			alert(console.messages.join('\n'));
			console.messages = [];
		};
	}
/*
    TODO: rowead fix ability to call remote console logging.
	if( console.log ) {
		console.old_log = console.log;

		console.log = function(msg) {
			console.old_log(msg);
			try {
				var xmlhttp = new XMLHttpRequest();
				var uri = '{0}?method=log&text={1}'.format(globalOptions.query, encodeURIComponent(msg));

				xmlhttp.open('POST', uri, true);
				xmlhttp.send();
			} catch( err ) {
				console.old_log(err.message);
			}
			;
		};
	}
	*/
}

function getCategorySchemeResponseABS(responseText) {
	// processes the XML for all the category schemes
	dojo.style(dojo.byId('content'), "display", "none");
	dojo.byId('content').value = responseText;
	var div = dojo.byId('concepts');

	div.innerHTML = '';
	var s = '';
	var contentHandler = new DefaultHandler2();
	var categoryId = '';
	var currentName = '';
	var categoryCount = 0;
	var categorySchemeDepth = 0;

	/*
	 * <ns12:Category id="6513466"> <ns12:Name>ECB non-energy commodity prices</ns12:Name>
	 * <ns12:DataflowRef> <ns12:AgencyID>ECB</ns12:AgencyID>
	 * <ns12:DataflowID>6413551</ns12:DataflowID> <ns12:Version>1.0</ns12:Version>
	 * </ns12:DataflowRef> </ns12:Category>
	 */
	var hiddenClass = '';

	var saxParser = XMLReaderFactory.createXMLReader();
	contentHandler.startElement = function(namespaceURI, localName, qName, atts) {
		// console.log( "startElement : [" + namespaceURI + "], [" + localName +
		// "], [" + qName + "]" );
		currentName = localName;

		if( localName == 'KeyFamilies' ) {
			s += '<ul>';
		}

		if( localName == 'KeyFamily' ) {
			categoryId = atts.getValue(atts.getIndex('id'));
			s += '<li>';
		}
	};
	contentHandler.endElement = function(namespaceURI, localName, qName) {
		// console.log( "startElement : [" + namespaceURI + "], [" + localName +
		// "], [" + qName + "]" );
		currentName = localName;
		if( localName == 'KeyFamily' ) {
			categoryCount++;
			s += '</li>';
		}

		if( localName == 'KeyFamilies' ) {
			categoryCount++;
			s += '</ul>';
		}
	};
	contentHandler.characters = function(ch, start, ch_length) {
		// console.log( "characters : [" + ch + "], [" + start + "], [" +
		// ch_length + "]" );
		if( currentName == 'Name' && categoryId.length > 0 ) {
			s += '<a href="{0}?dataflow.html&objectid={1}">{1} - {2}</a>'.format(getRpage(), categoryId, ch);
			categoryId = '';
		}
	};
	try {

		saxParser.setHandler(contentHandler);
		saxParser.parseString(responseText);

	} catch( e ) {
		alert('problem processing response:' + e.message);
		dojo.style(dojo.byId('content'), "display", "block");
	}

	if( categoryCount == 0 ) {
		s = '<p>No categories found</p>';
	}
	div.innerHTML = s;
}

function requestCompleted() {
	// this does nothing so far
	var reset = function() {
	};
	setTimeout(reset, 2000);
}

function expandCollapseCategory(evt) {
	// method for handling expand and collapse of <li> elements
	// show all next hierachy level contained in this <ul> element
	var ul = this;
	var className = ul.className;

	var level = parseInt(className[className.length - 1]);
	var nextClass = className.replace(level, level + 1);
	var children = dojo.query('> li .' + nextClass, ul);
	console.log('expandCollapseCategory', className, nextClass, children.length);
	for( z = 0; z < children.length; z++ ) {
		var c = children[z];
		c.classList.toggle('categorySchemeHidden');
	}
	// if next child is hidden then expand it
	// if next child is shown the hide it and all children
}

function getCategorySchemeResponse(responseText) {
	// processes the XML for all the category schemes
	dojo.byId("status").innerHTML = "Formatting results...";
	dojo.style(dojo.byId('content'), "display", "none");
	dojo.byId('content').value = responseText;
	var div = dojo.byId('concepts');

	div.innerHTML = '';
	var s = '';
	var contentHandler = new DefaultHandler2();
	var categoryId = '';
	var currentName = '';
	var categoryCount = 0;
	var categorySchemeDepth = 0;

	/*
	 * <ns12:Category id="6513466"> <ns12:Name>ECB non-energy commodity prices</ns12:Name>
	 * <ns12:DataflowRef> <ns12:AgencyID>ECB</ns12:AgencyID>
	 * <ns12:DataflowID>6413551</ns12:DataflowID> <ns12:Version>1.0</ns12:Version>
	 * </ns12:DataflowRef> </ns12:Category>
	 */
	var hiddenClass = '';

	var saxParser = XMLReaderFactory.createXMLReader();
	contentHandler.startElement = function(namespaceURI, localName, qName, atts) {
		// console.log( "startElement : [" + namespaceURI + "], [" + localName +
		// "], [" + qName + "]" );
		currentName = localName;

		if( localName == 'Category' ) {
			categorySchemeDepth += 1;
			if( categorySchemeDepth == 2 )
				hiddenClass = 'categorySchemeHidden ';
			else
				hiddenClass = '';
			categoryId = atts.getValue(atts.getIndex('id'));
			// s += '<div class="imgClosed">+</div>
			s += '<ul class="' + hiddenClass + 'categorySchemeDepth' + categorySchemeDepth + '">';
		}

		if( localName == 'Name' && categoryId.length > 0 ) {
			s += '<li>' + categoryId;
		}
	};
	contentHandler.endElement = function(namespaceURI, localName, qName) {
		// console.log( "startElement : [" + namespaceURI + "], [" + localName +
		// "], [" + qName + "]" );
		currentName = localName;
		if( localName == 'Category' ) {
			categoryCount++;
			categorySchemeDepth -= 1;
			s += '</li></ul>';
		}
	};
	contentHandler.characters = function(ch, start, ch_length) {
		// console.log( "characters : [" + ch + "], [" + start + "], [" +
		// ch_length + "]" );
		if( currentName == 'Name' && categoryId.length > 0 ) {
			s += ' ' + ch;
			categoryId = '';
		}

		if( currentName == 'DataflowID' ) {
			s += '&nbsp;<a href="{0}?dataflow.html&objectid={1}">Data {1}</a>'.format(getRpage(), ch);
		}
	};
	try {

		saxParser.setHandler(contentHandler);
		saxParser.parseString(responseText);

	} catch( e ) {
		alert('problem processing response:' + e.message);
		dojo.style(dojo.byId('content'), "display", "block");
	}

	if( categoryCount == 0 ) {
		s = '<p>No categories found</p>';
	}
	div.innerHTML = s;
	dojo.byId("status").innerHTML = "Done";
	dojo.query(".categorySchemeDepth1").connect("onclick", expandCollapseCategory);
}

function call_GetCategoryScheme_ws() {
	dojo.byId('content').value = '';

	var soap = globalOptions.ws_categoryScheme;
	var soap_method = globalOptions.ws_categoryScheme_method;
	// '<in><quer:AgencyID>ECB</quer:AgencyID><quer:ID>SDW_ECONOMIC_CONCEPTS</quer:ID></in>';

	call_sdmx_ws(soap, soap_method, 'content', getCategorySchemeResponseABS);
	dojo.style(dojo.byId('executing'), 'display', 'none');
}

var responseStartsWithCheck = '<message:';// sanity check for messages

function sdmxFormatBody(ws_query, method) {

	var ws_header = globalOptions.ws_header;
	var ws_footer = globalOptions.ws_footer;
	var ws_method_header = '<sdmx:' + method + '>';
	var ws_method_footer = '</sdmx:' + method + '>';
	var ws_query_header = globalOptions.ws_query_header ? globalOptions.ws_query_header : '';
	var ws_query_footer = globalOptions.ws_query_footer ? globalOptions.ws_query_footer : '';
	var soapBody = ws_header + ws_method_header + ws_query_header + ws_query + ws_query_footer + ws_method_footer + ws_footer;

	return soapBody;
}

function call_sdmx_ws(ws_query, method, responseId, xml_method, query) {
	var cacheKey = method + JSON.stringify(ws_query);
	var s = recallJSON(cacheKey);

	if( s ) {
		console.log('ws local cache ' + cacheKey);
		if( !s.indexOf(method + 'Response') ) {
			// remove the cache entry
			console.log('Cache entry has incorrect format.  Does not contain "{0}"'.format(method + 'Response'));
			localStorage.removeItem(cacheKey);
		} else {
			if( responseId ) {
				var responseControl = dojo.byId(responseId);
				if( responseControl )
					responseControl.value = s;
			}
			xml_method(s, query);
			return;
		}
	}
	var xmlhttp = new XMLHttpRequest();
	var url = globalOptions.ws_url; // 'http://sdw-ws.ecb.europa.eu/services/SDMXQuery';
	var proxy_url = '{0}?{1}'.format(getProxyPage(), url);

	console.log('calling:' + proxy_url);
	xmlhttp.open('POST', proxy_url, true);

	var soapBody = sdmxFormatBody(ws_query, method);

	// build SOAP request

	xmlhttp.onreadystatechange = function() {
		if( xmlhttp.readyState == 4 ) {
			if( xmlhttp.status == 200 ) {
				console.log('soap packet ready');
				var responseText = xmlhttp.responseText;
				if( globalOptions.ws_soap_reply_start ) {
					var i = xmlhttp.responseText.indexOf(globalOptions.ws_soap_reply_start);

					var responseText = xmlhttp.responseText.substring(i);
				}
				if( responseId ) {
					var responseControl = dojo.byId(responseId);
					if( responseControl )
						responseControl.value = responseText;
				}
				storeJSON(cacheKey, responseText);
				xml_method(responseText, query);
			} else {
				var errorText = xmlhttp.status + ' ERROR:' + xmlhttp.responseText;
				if( responseId )
					dojo.byId(responseId).value = errorText;
				console.log(errorText);
			}
		}
	};

	// Send the POST request
	xmlhttp.setRequestHeader('Content-Type', 'text/xml; charset=utf-8');
	xmlhttp.setRequestHeader('SOAPAction', 'http://stats.oecd.org/OECDStatWS/SDMX/' + method);
	console.log('soap:' + soapBody);
	xmlhttp.send(soapBody);
	requestCompleted();
}

function call_sdmx_ws_sync(ws_query, method, errorFunc) {
	var cacheKey = method + JSON.stringify(ws_query);
	var s = recallJSON(cacheKey);

	if( s ) {
		console.log('ws local cache ' + cacheKey);
		if( !s.indexOf(method + 'Response') ) {
			// remove the cache entry
			console.log('Cache entry has incorrect format.  Does not contain "{0}"'.format(method + 'Response'));
			localStorage.removeItem(cacheKey);
		} else {
			return s;
		}
	}

	// returns the xmlhttp text from the query
	var xmlhttp = new XMLHttpRequest();
	var url = globalOptions.ws_url; // 'http://sdw-ws.ecb.europa.eu/services/SDMXQuery';
	var proxy_url = '{0}?{1}'.format(getProxyPage(), url);

	console.log('POST:' + proxy_url);
	xmlhttp.open('POST', proxy_url, false);
	// build SOAP request
	var soapBody = sdmxFormatBody(ws_query, method);

	// Send the POST request
	xmlhttp.setRequestHeader('Content-Type', 'text/xml; charset=utf-8');
	xmlhttp.setRequestHeader('SOAPAction', globalOptions.sdmxWS + method);
	console.log('send:' + soapBody);
	xmlhttp.send(soapBody);
	if( xmlhttp.readyState == 4 ) {
		if( xmlhttp.status == 200 ) {
			console.log('soap packet ready');
		} else {
			var errorText = xmlhttp.status + ' ERROR:' + xmlhttp.responseText;
			console.log(errorText);
			if( errorFunc ) {
				errorFunc(errorText, xmlhttp);
			}
			return null;
		}
	}
	var responseText = xmlhttp.responseText;
	if( globalOptions.ws_soap_reply_start ) {
		var i = xmlhttp.responseText.indexOf(globalOptions.ws_soap_reply_start);

		responseText = xmlhttp.responseText.substring(i);
	}
	storeJSON(cacheKey, responseText);
	return responseText;
}

function clearLocalStorage() {
	localStorage.clear();
	alert('local storage cleared');
	init_localStorage();
}

function deleteLocalStorageEntry() {
	var grid = dijit.byId('localStorageTable');
	var store = grid.store;
	var itemsToDelete = [];
	// Returns query results from the array that match the given query

	function gotItems(items, request) {
		var i;
		for( i = 0; i < items.length; i++ ) {
			var item = items[i];
			itemsToDelete.push(store.getValue(item, "key"));
		}
	}

	store.fetch({
		query : {
			select : true
		},
		onComplete : gotItems
	});

	for( var z in itemsToDelete ) {
		localStorage.removeItem(itemsToDelete[z]);
	}

	localStorageSetStore(grid);
}
/**
 * Comment
 */
function localStorageSetStore(grid) {
	var localItems = [];

	var count = 0, bytes = 0;
	for( var z in localStorage ) {
		localItems.push({
			index : count,
			size : localStorage[z].length,
			key : z,
			query : localStorage[z]
		});
		count++;
		bytes += localStorage[z].length;
	}

	var store = new dojo.data.ItemFileWriteStore({
		data : {
			items : localItems
		}
	});
	grid.setStore(store);
	dojo.byId('foundCount').innerHTML = "found {0}, {1} megabytes used.".format(count, Math.round(bytes / (1024 * 1024)));
}

function viewLocalStorageEntry(entryKey) {
	var item = recallJSON(entryKey);

	myDialog = new dijit.Dialog({
		title : "Query Content",
		content : item.toString(),
		style : "width: 60%, height 50%"
	});
	myDialog.show();

}

function init_localStorage() {
	var grid = new dojox.grid.DataGrid({
		structure : [ {
			name : "Size",
			field : "size",
			width : "10%"
		}, {
			name : "Select",
			field : "select",
			editable : true,
			cellType : dojox.grid.cells.Bool,
			width : "5%"
		}, {
			name : "Key - Click to Show",
			field : "key",
			width : "85%"
		} ],
		autoHeight : true
	}, "localStorageTable");
	grid.startup();

	grid.on("RowClick", function(evt) {
		var idx = evt.rowIndex, rowData = grid.getItem(idx);
		if( evt.cell.field == 'key' ) {
			viewLocalStorageEntry(rowData.key);
		}
	}, true);

	localStorageSetStore(grid);

}

function showHomeGrid() {
	// show the query that is currently selected.
	var grid = dijit.byId('grid');

	var items = grid.selection.getSelected();

	if( items.length ) {
		showQuery(items[0].filename[0]);
	} else {
		alert('No query selected');
	}
}

function refreshHomeGrid(){
    var grid = dijit.byId('grid');
    var xmlhttp = new XMLHttpRequest();
    var queries = {};
    
    xmlhttp.open('GET', '{0}?method=list'.format(globalOptions.query), false);
    xmlhttp.send();
    try {
        queries = JSON.parse(xmlhttp.responseText);
    } catch( e ) {
        console.log( xmlhttp.responseText);
        alert('Error processing JSON reply ' + e.message);
        return;
    }

    if( queries && queries.queries ) {
        for( var q = 0; q < queries.queries.length; q++ ) {
            if( !queries.queries[q].options.map ) {
                queries.queries[q].options.map = false;
            }
        }

        var store = new dojo.data.ItemFileWriteStore({
            data : {
                items : queries.queries
            }
        });
        grid.setStore(store);
    }
}

function init_home() {
	function typeColumnFormatter(cellValue, rowIndex) {
		var img = 'resources/graph.jpg', altText = 'Chart';

		if( cellValue.map[0] ) {
			img = 'resources/map.jpg';
			altText = 'map'
		}

		return '<img src="{0}"/><figcaption>{1}</figcaption>'.format(img, altText);
	}

	var grid = new dojox.grid.DataGrid({
		structure : [ {
			name : "Name",
			field : "name",
			width : "60%"
		}, {
			name : "Dataset",
			field : "title",
			width : "30%"
		}, {
			name : "Type",
			field : "options",
			formatter : typeColumnFormatter,
			width : "10%"
		} ]
	}, "grid");
	grid.startup();
    refreshHomeGrid();
	grid.on("RowDblClick", function(evt) {
		var idx = evt.rowIndex;
		var rowData = grid.getItem(idx);
		showQuery(rowData.filename[0]);

	}, true);
}
