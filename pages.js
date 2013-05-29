// pages.js
globalOptions = {};
setGlobalOptions();

if( dojo ) { // dojo requires
	dojo.require('dojox.grid.DataGrid');
	dojo.require('dojox.grid.cells');
	dojo.require("dojo.data.ObjectStore");
	dojo.require("dojo.store.Memory");
	dojo.require("dojo.data.ItemFileWriteStore");
	dojo.require("dojox.xml.parser");
	dojo.require("dojo.parser");
	dojo.require("dijit.layout.ContentPane");
	dojo.require("dijit.layout.TabContainer");
	dojo.require("dijit.layout.BorderContainer");
	dojo.require("dojox.data.CsvStore");
	dojo.require('dijit.form.Select');
	dojo.require("dijit.form.DateTextBox");
	dojo.require("dijit.Dialog");
}

var grid;

function _parseKeyFamilyResponse(xmlhttp) {
	// processes the XML for all the category schemes
	// returns a keyFamily JASON object
	var contentHandler = new DefaultHandler2();
	var id = '';
	var currentName = '';
	var elements = Array();
	var data = {};
	var codeList = {}; // the current code list

	// format of key families
	data.name = '';
	data.dimensions = [];
	data.timeDimension = '';
	data.primaryMeasure = '';
	data.codeLists = [];
	/*
	 * <ns4:Header> <ns4:ID>6ec8793c-a1e2-405b-b822-0545b5788590</ns4:ID>
	 * <ns4:Test>false</ns4:Test> <ns4:Prepared>2013-03-08T00:22:45+01:00</ns4:Prepared>
	 * <ns4:Sender id="ECB"> <ns4:Name>European Central Bank</ns4:Name>
	 * <ns4:Contact> <ns4:Email>statistics@ecb.europa.eu</ns4:Email>
	 * </ns4:Contact> </ns4:Sender> </ns4:Header> <ns4:CodeLists> ....
	 * <ns12:CodeList isFinal="true" version="1.0" agencyID="ECB"
	 * id="CL_AREA_EE"> <ns12:Name>Area code list</ns12:Name> <ns12:Code
	 * value="1A"> <ns12:Description>International organisations</ns12:Description>
	 * </ns12:Code> <ns12:Code value="1B"> <ns12:Description>UN organisations</ns12:Description>
	 * </ns12:Code> .....
	 * 
	 * <ns4:Concepts> <ns12:Concept version="1.0" agencyID="ECB" id="BKN_DENOM">
	 * <ns12:Name>BKN denomination breakdown</ns12:Name> </ns12:Concept>
	 * <ns12:Concept version="1.0" agencyID="ECB" id="BKN_ITEM">
	 * <ns12:Name>Banknote &amp; coin related items</ns12:Name> </ns12:Concept>
	 * <ns12:Concept version="1.0" agencyID="ECB" id="BKN_SERIES"> ......
	 * </ns4:Concepts>
	 * 
	 * what is this stuff?
	 * 
	 * <ns4:KeyFamilies> <ns12:KeyFamily isFinal="true"
	 * urn="urn:sdmx:org.sdmx.infomodel.keyfamily.KeyFamily=ECB:ECB_FMD2"
	 * version="1.0" agencyID="ECB" id="ECB_FMD2"> <ns12:Name>Financial market
	 * data (not related to foreign exchange)</ns12:Name> <ns12:Components>
	 * <ns12:Dimension isFrequencyDimension="true" codelistAgency="ECB"
	 * codelist="CL_FREQ" conceptAgency="ECB" conceptVersion="1.0"
	 * conceptRef="FREQ"/> <ns12:Dimension codelistAgency="ECB"
	 * codelist="CL_AREA_EE" conceptAgency="ECB" conceptVersion="1.0"
	 * conceptRef="REF_AREA"/> <ns12:Dimension codelistAgency="ECB"
	 * codelist="CL_CURRENCY" conceptAgency="ECB" conceptVersion="1.0"
	 * conceptRef="CURRENCY"/> <ns12:Dimension codelistAgency="ECB"
	 * codelist="CL_PROVIDER_FM" conceptAgency="ECB" conceptVersion="1.0"
	 * conceptRef="PROVIDER_FM"/> <ns12:Dimension codelistAgency="ECB"
	 * codelist="CL_INSTRUMENT_FM" conceptAgency="ECB" conceptVersion="1.0"
	 * conceptRef="INSTRUMENT_FM"/> <ns12:Dimension codelistAgency="ECB"
	 * codelist="CL_PROVIDER_FM_ID" conceptAgency="ECB" conceptVersion="1.0"
	 * conceptRef="PROVIDER_FM_ID"/> <ns12:Dimension codelistAgency="ECB"
	 * codelist="CL_DATA_TYPE_FM" conceptAgency="ECB" conceptVersion="1.0"
	 * conceptRef="DATA_TYPE_FM"/>
	 * 
	 */
	var hiddenClass = '';
	data.codeLists = []; // array of code lists

	var saxParser = XMLReaderFactory.createXMLReader();
	contentHandler.startElement = function(namespaceURI, localName, qName, atts) {
		// console.log( "startElement : [" + namespaceURI + "], [" + localName +
		// "], [" + qName + "]" );
		currentName = localName;
		elements.push(localName);
		switch ( localName ){
		case 'CodeList':
			codeList = {};
			codeList.code = atts.getValue(atts.getIndex('id'));
			codeList.name = '';
			codeList.codes = [];
			data.codeLists.push(codeList);
			break;
		case 'Code':
			id = atts.getValue(atts.getIndex('value'));
			break;
		case 'Dimension':
			// <ns12:Dimension isFrequencyDimension="true" codelistAgency="ECB"
			// codelist="CL_FREQ" conceptAgency="ECB" conceptVersion="1.0"
			// conceptRef="FREQ"/>
			data.dimensions.push({
				codelist : atts.getValue(atts.getIndex('codelist')),
				concept : atts.getValue(atts.getIndex('conceptRef'))
			});
			break;
		case 'PrimaryMeasure':
			// <ns12:PrimaryMeasure conceptAgency="ECB" conceptVersion="1.0"
			// conceptRef="OBS_VALUE"/>
			data.primaryMeasure = atts.getValue(atts.getIndex('conceptRef'));
			break;
		case 'TimeDimension':
			// <ns12:TimeDimension conceptAgency="ECB" conceptVersion="1.0"
			// conceptRef="TIME_PERIOD"/>
			data.timeDimension = atts.getValue(atts.getIndex('conceptRef'));
			break;
		}

	};
	contentHandler.endElement = function(namespaceURI, localName, qName) {
		// console.log( "startElement : [" + namespaceURI + "], [" + localName +
		// "], [" + qName + "]" );
		currentName = localName;
		var leavingElement = elements.pop();
		switch ( localName ){
		}
	};
	contentHandler.characters = function(ch, start, ch_length) {
		// console.log( "characters : [" + ch + "], [" + start + "], [" +
		// ch_length + "]" );
		switch ( currentName ){
		case 'Name':
			if( elements.indexOf('CodeList') > -1 ) {
				// long name of the code list
				codeList.name = ch;
			}
			break;
		if( elements.indexOf('KeyFamily') == elements.length - 2 ) {
			// long name of the code list
			data.name = ch;
		}
		break;
	case 'Description':
		codeList.codes.push({
			code : id,
			description : ch
		});
		break;
	}
}	;
	saxParser.setHandler(contentHandler);
	saxParser.parseString(xmlhttp.responseText);
	return data;
}

function getKeyfamily(id) {
	var localStorageKey = 'GetKeyfamily {0}'.format(id);
	// see if the code list is already in local storage
	var v = recallJSON(localStorageKey);
	if( v ) {
		return v;
	}

	var soap = '<in><quer:KeyFamily>{0}</quer:KeyFamily><quer:AgencyID>ECB</quer:AgencyID></in>'.format(id);
	var responseText = call_sdmx_ws_sync(soap, 'GetKeyFamily');
	var data = _parseKeyFamilyResponse(responseText);
	storeJSON(localStorageKey, data);
	return data;
}

function getKeyFamilyResponse(xmlhttp) {
	// processes the XML for all the category schemes
	dojo.byId("status").innerHTML = "Formatting results...";
	var div = dojo.byId('results');
	div.innerHTML = '';
	var s = '';
	var contentHandler = new DefaultHandler2();
	var id = '';
	var currentName = '';
	// var currentCodeListId = '';
	var foundCount = 0;
	var elements = Array();
	/*
	 * <ns4:CodeLists> <ns12:CodeList isFinal="true" version="1.0"
	 * agencyID="ECB" id="CL_AREA_EE"> <ns12:Name>Area code list</ns12:Name>
	 * <ns12:Code value="1A"> <ns12:Description>International organisations</ns12:Description>
	 * </ns12:Code> <ns12:Code value="1B"> <ns12:Description>UN organisations</ns12:Description>
	 * </ns12:Code> .....
	 * 
	 * <ns4:Concepts> <ns12:Concept version="1.0" agencyID="ECB" id="BKN_DENOM">
	 * <ns12:Name>BKN denomination breakdown</ns12:Name> </ns12:Concept>
	 * <ns12:Concept version="1.0" agencyID="ECB" id="BKN_ITEM">
	 * <ns12:Name>Banknote &amp; coin related items</ns12:Name> </ns12:Concept>
	 * <ns12:Concept version="1.0" agencyID="ECB" id="BKN_SERIES"> ......
	 * </ns4:Concepts>
	 * 
	 * what is this stuff?
	 * 
	 * <ns4:KeyFamilies> <ns12:KeyFamily isFinal="true"
	 * urn="urn:sdmx:org.sdmx.infomodel.keyfamily.KeyFamily=ECB:ECB_FMD2"
	 * version="1.0" agencyID="ECB" id="ECB_FMD2"> <ns12:Name>Financial market
	 * data (not related to foreign exchange)</ns12:Name> <ns12:Components>
	 * <ns12:Dimension isFrequencyDimension="true" codelistAgency="ECB"
	 * codelist="CL_FREQ" conceptAgency="ECB" conceptVersion="1.0"
	 * conceptRef="FREQ"/> <ns12:Dimension codelistAgency="ECB"
	 * codelist="CL_AREA_EE" conceptAgency="ECB" conceptVersion="1.0"
	 * conceptRef="REF_AREA"/> <ns12:Dimension codelistAgency="ECB"
	 * codelist="CL_CURRENCY" conceptAgency="ECB" conceptVersion="1.0"
	 * conceptRef="CURRENCY"/> <ns12:Dimension codelistAgency="ECB"
	 * codelist="CL_PROVIDER_FM" conceptAgency="ECB" conceptVersion="1.0"
	 * conceptRef="PROVIDER_FM"/> <ns12:Dimension codelistAgency="ECB"
	 * codelist="CL_INSTRUMENT_FM" conceptAgency="ECB" conceptVersion="1.0"
	 * conceptRef="INSTRUMENT_FM"/> <ns12:Dimension codelistAgency="ECB"
	 * codelist="CL_PROVIDER_FM_ID" conceptAgency="ECB" conceptVersion="1.0"
	 * conceptRef="PROVIDER_FM_ID"/> <ns12:Dimension codelistAgency="ECB"
	 * codelist="CL_DATA_TYPE_FM" conceptAgency="ECB" conceptVersion="1.0"
	 * conceptRef="DATA_TYPE_FM"/>
	 * 
	 */
	var hiddenClass = '';
	var saxParser = XMLReaderFactory.createXMLReader();
	contentHandler.startElement = function(namespaceURI, localName, qName, atts) {
		// console.log( "startElement : [" + namespaceURI + "], [" + localName +
		// "], [" + qName + "]" );
		currentName = localName;
		elements.push(localName);
		switch ( localName ){
		case 'Header':
			s += '<h1>';
			break;
		case 'CodeList':
			id = atts.getValue(atts.getIndex('id'));
			s += '<ul class="listHeader">';
			s += '<li><strong>' + id + '</strong> - ';
			break;
		case 'CodeLists':
			s += '<h2>Code lists</h2>';
			break;
		case 'Concepts':
			s += '<h2>Concepts</h2><ul class="categorySchemeHidden">';
			break;
		case 'Concept':
			id = atts.getValue(atts.getIndex('id'));
			foundCount++;
			break;
		case 'Code':
			s += '<li><strong>' + atts.getValue(atts.getIndex('value')) + '</strong> - ';
			break;
		case 'Components':
			s += '<h2>Components</h2><ul>';
			break;
		case 'Dimension':
			// <ns12:Dimension isFrequencyDimension="true" codelistAgency="ECB"
			// codelist="CL_FREQ" conceptAgency="ECB" conceptVersion="1.0"
			// conceptRef="FREQ"/>
			s += '<li>{0} - {1}{2}</li>'.format(atts.getValue(atts.getIndex('conceptRef')), atts.getValue(atts.getIndex('codelist')), (atts
					.getValue(atts.getIndex('isFrequencyDimension')) == 'true' ? ' <strong>Frequency Dimension</strong>' : ''));
			break;
		case 'PrimaryMeasure':
			// <ns12:PrimaryMeasure conceptAgency="ECB" conceptVersion="1.0"
			// conceptRef="OBS_VALUE"/>
			s += '<p>Primary Measure - <strong>{0}</strong></p>'.format(atts.getValue(atts.getIndex('conceptRef')));
			break;
		case 'TimeDimension':
			// <ns12:TimeDimension conceptAgency="ECB" conceptVersion="1.0"
			// conceptRef="TIME_PERIOD"/>
			s += '<p>Time Dimension - <strong>{0}</strong></p>'.format(atts.getValue(atts.getIndex('conceptRef')));
			break;
		}

	};
	contentHandler.endElement = function(namespaceURI, localName, qName) {
		// console.log( "startElement : [" + namespaceURI + "], [" + localName +
		// "], [" + qName + "]" );
		currentName = localName;
		var leavingElement = elements.pop();
		switch ( localName ){
		case 'Header':
			s += '</h1>';
			break;
		case 'CodeList':
			s += '</ul></ul>';
			foundCount++;
			break;
		case 'Concepts':
			s += '</ul>';
			break;
		case 'Code':
			s += '</li>';
			break;
		case 'Components':
			s += '</ul>';
			break;
		}
	};
	contentHandler.characters = function(ch, start, ch_length) {
		// console.log( "characters : [" + ch + "], [" + start + "], [" +
		// ch_length + "]" );
		switch ( currentName ){
		case 'Name':
			if( elements.indexOf('Header') > -1 ) {
				s += ch;
				return;
			}
			if( elements.indexOf('Concept') > -1 ) {
				s += '<li><strong>' + id + '</strong> - ' + ch + '</li>';
				// currentCodeListId = ch;
			}
			if( elements.indexOf('CodeList') == elements.length - 2 )// CodeList
			{
				s += ' ' + ch + '</li><ul class="categorySchemeHidden">';
				if( id.length > 0 )
					s += '<li>&nbsp;<a href="{0}?CodeList.html&objectid={1}">{2} details</a></li>'.format(getRpage(), id, ch);
			}
			id = '';
			break;
		case 'Code':
			s += ch + ' ';
			break;
		case 'Description':
			s += ch;
		}
	};
	saxParser.setHandler(contentHandler);
	saxParser.parseString(xmlhttp.responseText);
	if( foundCount == 0 )
		s = '<p>No results found</p>';
	// console.log( s );
	div.innerHTML = s;
	dojo.byId("status").innerHTML = "Done";
	dojo.query(".listHeader").connect("onclick", expandCollapseLevel);
}

/**
 * process the xml from a dataflow soap response and return a list of codelists
 * 
 * @param responseText
 *            -the xml to process
 * @returns {codeLists}
 */
function getDataflowResponseCodeLists(responseText) {
	var contentHandler = new DefaultHandler2();
	var currentName = '';
	var elements = Array();
	var codeListId = ''; // the id of the current code list
	var codeId = ''; // the id of the current code
	var codeLists = {}; // holds the code lists for this key family
	var codeList = []; // a list of codes and their values
	var saxParser = XMLReaderFactory.createXMLReader();
	/*
	 * <message:KeyFamilies> <KeyFamily id="MERCH_EXP_AHECC4" agencyID="ABS">
	 * <Name xml:lang="en">Merchandise Exports by AHECC 3</Name> <Name
	 * xml:lang="fr">Merchandise Exports by AHECC 3</Name> <Components>
	 * <Dimension conceptRef="COMMODITY"
	 * codelist="CL_MERCH_EXP_AHECC4_COMMODITY"/>
	 * 
	 */
	contentHandler.startElement = function(namespaceURI, localName, qName, atts) {
		// console.log( "startElement : [" + namespaceURI + "], [" + localName +
		// "], [" + qName + "]" );
		currentName = localName;
		elements.push(localName);
		switch ( localName ){
		case 'CodeList':
			codeListId = atts.getValue(atts.getIndex('id'));
			break;
		case 'Code':
			codeId = atts.getValue(atts.getIndex('value'));
			break;
		case 'Dimension':
			// duplicate the codelist with conceptRef to match up to the column
			// name used
			// in the display modules.
			var conceptRef = atts.getValue(atts.getIndex('conceptRef'));
			codeListId = codeId = atts.getValue(atts.getIndex('codelist'));

			for( var cl in codeLists ) {
				if( cl == codeListId ) {
					console.log('getDataflowResponseCodeLists: adding {0} for {1}'.format(conceptRef, cl));
					codeLists[conceptRef] = codeLists[cl];
					break;
				}
			}
			break;
		}
	};
	contentHandler.endElement = function(namespaceURI, localName, qName) {
		// console.log( "startElement : [" + namespaceURI + "], [" + localName +
		// "], [" + qName + "]" );
		elements.pop();

		if( localName == 'CodeList' ) {
			codeLists[codeListId] = codeList;
			codeList = [];
			codeListId = '';
		}
	};
	contentHandler.characters = function(ch, start, ch_length) {
		// console.log( "characters : [" + ch + "], [" + start + "], [" +
		// ch_length + "]" );
		if( currentName == 'Description' ) {
			if( elements[elements.length - 2] == 'Code' && codeId.length > 0 ) {
				// first one should be always xml:lang="en"
				codeList.push({
					code : codeId,
					// some codes have a double quote GKW.
					description : ch.replace('"', '').replace("'", "")
				});
				codeId = '';
			}
		}
	};
	try {
		saxParser.setHandler(contentHandler);
		saxParser.parseString(responseText);
	} catch( e ) {
		alert('problem processing dataflow response:' + e.message);
		return null;
	}
	return codeLists;
}

function call_codelist_ws() {
	dojo.byId('content').value = '';
	var id = dojo.byId('objectid').value;
	var soap = '<in><quer:And><quer:Codelist id="{0}"/><quer:AgencyID>ECB</quer:AgencyID></quer:And></in>'.format(id);
	call_sdmx_ws(soap, 'GetCodeList', 'content', getCodeListResponse);
}
/**
 * return a list of the format - {code,description} for the given codeListId and
 * dataflowid. Stores the given codelistid in local storage
 * 
 * @param codeListId -
 *            name of the code list
 * @param dataflowid -
 *            name of the dataflow containing the codelist
 * @returns - list of the codes and descriptions
 */
function getCodelist(codeListId, dataflowid) {
	// processes the XML of a code list and returns an array of the codes and
	// descriptions
	// code[id] = description
	// where the code is the array key
	console.log('getCodelist( codelistId {0}, dataflowid {1} )'.format(codeListId, dataflowid));
	var data = [];
	// TODO: fix for ECB/ABS
	var soap;// = '<in><quer:And><quer:Codelist
	// id="{0}"/><quer:AgencyID>ECB</quer:AgencyID></quer:And></in>'.format(codeListId);
	var soap_method = 'GetCodeList';

	// for ABS use the dataflow id to return the code lists
	soap = globalOptions.ws_dataFlowScheme.format(dataflowid);
	soap_method = globalOptions.ws_dataFlowScheme_method;

	var localStorageKey = 'GetCodeList {0}{1}'.format(codeListId, dataflowid);
	// see if the code list is already in local storage
	var v = null;

	try {
		v = localStorage[localStorageKey];
	} catch( e ) {
	}

	if( v )
		return JSON.parse(v);

	function getCodeListResponseData(xmlhttp) {
		var contentHandler = new DefaultHandler2();
		var id = '', currentName = '';
		/*
		 * <ns4:CodeLists> <ns12:CodeList isFinal="true" version="1.0"
		 * agencyID="ECB" id="CL_BKN_ITEM"> <ns12:Name>Banknote &amp; coin
		 * related items code list</ns12:Name> <ns12:Code value="A010">
		 * <ns12:Description>Number of ATM with a withdrawal function for euro
		 * banknotes (excluding devices with cash-depositing functionalities)</ns12:Description>
		 * </ns12:Code> <ns12:Code value="A020"> <ns12:Description>Number of
		 * branches of Credit Institutions - Number of Credit Institutions and
		 * their branches providing cash services</ns12:Description>
		 * </ns12:Code ...... </ns12:CodeList> </ns4:CodeLists>
		 */

		var saxParser = XMLReaderFactory.createXMLReader();
		contentHandler.startElement = function(namespaceURI, localName, qName, atts) {
			// console.log( "startElement : [" + namespaceURI + "], [" +
			// localName + "], [" + qName + "]" );
			currentName = localName;
			if( localName == 'Code' ) {
				id = atts.getValue(atts.getIndex('value'));
			}
		};
		contentHandler.characters = function(ch, start, ch_length) {
			// console.log( "characters : [" + ch + "], [" + start + "], [" +
			// ch_length + "]" );
			if( currentName == 'Description' ) {
				data.push({
					code : id,
					description : ch
				});
			}
		};
		saxParser.setHandler(contentHandler);
		saxParser.parseString(xmlhttp.responseText);
	}

	var responseText = call_sdmx_ws_sync(soap, soap_method);
	codeLists = getDataflowResponseCodeLists(responseText);

	try {
		data = codeLists[codeListId];
		if( data == 'undefined' ) {
			alert('codelist:{0} not found in dataflow:{1} response.'.format(codeListId, dataflowid));
			return null;
		}
	} catch( e ) {
		alert('codelist:{0} not found in dataflow:{1} response. Error:{3}'.format(codeListId, dataflowid, e.message));
		return null;
	}

	try {
		v = JSON.stringify(data);
		localStorage[localStorageKey] = v;
	} catch( e ) {
		console.log('error on localStorage:' + e.message);
	}
	return data;
}
function getCodeListResponse(xmlhttp) {
	// processes the XML for all the category schemes
	dojo.byId("status").innerHTML = "Formatting results...";
	var div = dojo.byId('results');
	div.innerHTML = '';
	var s = '';
	var contentHandler = new DefaultHandler2();
	var id = '', description;
	var currentName = '';
	var foundCount = 0;
	var elements = Array();
	var data = [];
	/*
	 * <ns4:CodeLists> <ns12:CodeList isFinal="true" version="1.0"
	 * agencyID="ECB" id="CL_BKN_ITEM"> <ns12:Name>Banknote &amp; coin related
	 * items code list</ns12:Name> <ns12:Code value="A010">
	 * <ns12:Description>Number of ATM with a withdrawal function for euro
	 * banknotes (excluding devices with cash-depositing functionalities)</ns12:Description>
	 * </ns12:Code> <ns12:Code value="A020"> <ns12:Description>Number of
	 * branches of Credit Institutions - Number of Credit Institutions and their
	 * branches providing cash services</ns12:Description> </ns12:Code ......
	 * </ns12:CodeList> </ns4:CodeLists>
	 */
	var hiddenClass = '';
	var saxParser = XMLReaderFactory.createXMLReader();
	contentHandler.startElement = function(namespaceURI, localName, qName, atts) {
		// console.log( "startElement : [" + namespaceURI + "], [" + localName +
		// "], [" + qName + "]" );
		currentName = localName;
		elements.push(localName);
		switch ( localName ){
		case 'Header':
			s += '<h1>';
			break;
		case 'Code':
			id = atts.getValue(atts.getIndex('value'));
			break;
		}
	};
	contentHandler.endElement = function(namespaceURI, localName, qName) {
		// console.log( "startElement : [" + namespaceURI + "], [" + localName +
		// "], [" + qName + "]" );
		currentName = localName;
		var leavingElement = elements.pop();
		switch ( localName ){
		case 'Header':
			s += '</h1><p/>';
			break;
		case 'CodeList':
			foundCount++;
			break;
		case 'Code':
			data.push({
				code : id,
				description : description
			});
			break;
		}
	};
	contentHandler.characters = function(ch, start, ch_length) {
		// console.log( "characters : [" + ch + "], [" + start + "], [" +
		// ch_length + "]" );
		switch ( currentName ){
		case 'Name':
			if( elements.indexOf('Header') > -1 ) {
				s += ch;
				return;
			}
			break;
		case 'Description':
			description = ch;
		}
	};
	saxParser.setHandler(contentHandler);
	saxParser.parseString(xmlhttp.responseText);
	if( foundCount == 0 )
		s = '<p>No results found</p>';
	// console.log( s );
	var store = new dojo.store.Memory({
		data : data
	});
	grid.setStore(dojo.data.ObjectStore({
		objectStore : store
	}));
	div.innerHTML = s;
	dojo.byId("status").innerHTML = "Done";
}

function getCodeListResponseExplore(xmlhttp, grid) {
	// processes the XML for all the code lists - assumes multiple returns
	var contentHandler = new DefaultHandler2();
	var id = '', description, codeListDescription = '', codeList = '';
	var currentName = '';
	var data = [];
	var codeListList = [];
	/*
	 * <ns4:CodeLists> <ns12:CodeList isFinal="true" version="1.0"
	 * agencyID="ECB" id="CL_BKN_ITEM"> <ns12:Name>Banknote &amp; coin related
	 * items code list</ns12:Name> <ns12:Code value="A010">
	 * <ns12:Description>Number of ATM with a withdrawal function for euro
	 * banknotes (excluding devices with cash-depositing functionalities)</ns12:Description>
	 * </ns12:Code> <ns12:Code value="A020"> <ns12:Description>Number of
	 * branches of Credit Institutions - Number of Credit Institutions and their
	 * branches providing cash services</ns12:Description> </ns12:Code ......
	 * </ns12:CodeList> </ns4:CodeLists>
	 */

	var saxParser = XMLReaderFactory.createXMLReader();
	contentHandler.startElement = function(namespaceURI, localName, qName, atts) {
		// console.log( "startElement : [" + namespaceURI + "], [" + localName +
		// "], [" + qName + "]" );
		currentName = localName;
		switch ( localName ){
		case 'CodeList':
			codeList = atts.getValue(atts.getIndex('id'));
			break;
		case 'Code':
			id = atts.getValue(atts.getIndex('value'));
			break;
		}
	};
	contentHandler.endElement = function(namespaceURI, localName, qName) {
		// console.log( "startElement : [" + namespaceURI + "], [" + localName +
		// "], [" + qName + "]" );
		currentName = localName;
		switch ( localName ){
		case 'Code':
			data.push({
				codeList : codeList,
				code : id,
				description : description,
				codeListDescription : codeListDescription
			});
			break;
		}
	};
	contentHandler.characters = function(ch, start, ch_length) {
		// console.log( "characters : [" + ch + "], [" + start + "], [" +
		// ch_length + "]" );
		switch ( currentName ){
		case 'Name':
			codeListDescription = ch;
			codeListList.push({
				code : codeList,
				description : codeListDescription
			});
			console.log(codeList);
			break;
		case 'Description':
			description = ch;
		}
	};
	saxParser.setHandler(contentHandler);
	saxParser.parseString(xmlhttp.responseText);
	storeJSON('allCodeLists', codeListList);
	codeListExplorerSetCodeLists(grid, codeListList);
}

function codeListExplorerSetCodeLists(grid, codeListList) {
	var storeValues = [];
	for( var z in codeListList ) {
		storeValues.push({
			description : codeListList[z].description,
			code : codeListList[z].code
		});
	}
	var codeListGrid = new dojox.grid.DataGrid({
		structure : [ {
			name : "Code List",
			field : "code",
			width : "20%"
		}, {
			name : "Description",
			field : "description",
			width : "60%"
		} ],
		style : {
			height : '200px',
			width : '90%'
		}
	}, "codeListGrid");
	codeListGrid.startup();
	var store = new dojo.store.Memory({
		data : storeValues
	});
	var objectStore = dojo.data.ObjectStore({
		objectStore : store
	});
	codeListGrid.setStore(objectStore);
	codeListGrid.on("RowClick", function(evt) {
		var idx = evt.rowIndex;
		var rowData = codeListGrid.getItem(idx);
		var codeListId = rowData.code;
		var data = getCodelist(codeListId);
		var store = new dojo.store.Memory({
			data : data
		});
		var objectStore = dojo.data.ObjectStore({
			objectStore : store
		});
		grid.setStore(objectStore);
		dojo.byId('codeListName').innerHTML = "{0} - {1} items".format(codeListId, data.length);
	}, true);
	dojo.style(dojo.byId('executing'), 'display', 'none');
}
/**
 * init_codelistExplorer
 */
function init_codelistExplorer() {
	var grid = setup_codelist_grid();
	var codeListList = recallJSON('allCodeLists');
	if( codeListList ) {
		codeListExplorerSetCodeLists(grid, codeListList);
	} else {
		var soap = '<in><quer:And><quer:AgencyID>ECB</quer:AgencyID></quer:And></in>';
		call_sdmx_ws(soap, 'GetCodeList', 'content', getCodeListResponseExplore, grid);
	}
}

function setup_codelist_grid() {
	grid = new dojox.grid.DataGrid({
		query : {
			code : "*"
		},
		structure : [ {
			name : "Code",
			field : "code",
			width : "20%"
		}, {
			name : "Description",
			field : "description",
			width : "60%"
		} ],
		autoHeight : true
	}, "grid");
	grid.startup();
	return grid;
}

function call_keyfamily_ws() {
	dojo.byId('content').value = '';
	var id = dojo.byId('objectid').value;
	var soap = '<in><quer:KeyFamily>' + id + '</quer:KeyFamily><quer:AgencyID>ECB</quer:AgencyID></in>';
	call_sdmx_ws(soap, 'GetKeyFamily', 'content', getKeyFamilyResponse);
}

function expandCollapseLevel(evt) {
	// method for handling expand and collapse of <li> elements
	// show all next hierachy level contained in this <ul> element
	var ul = this;
	var className = ul.className;
	var children = dojo.query('> ul', ul);
	console.log('expandCollapseLevel', className, children.length);
	for( z = 0; z < children.length; z++ ) {
		var c = children[z];
		c.classList.toggle('categorySchemeHidden');
	}
}

function getConceptResponse(xmlhttp) {
	// processes the XML for all the category schemes
	dojo.byId("status").innerHTML = "Formatting results...";
	var div = dojo.byId('results');
	div.innerHTML = '';
	var s = '';
	var contentHandler = new DefaultHandler2();
	var id = '';
	var currentName = '';
	var foundCount = 0;
	var elements = Array();
	/*
	 * <ns4:Header> <ns4:ID>5119b7c5-2b8d-409f-9695-f66a671f1711</ns4:ID><ns4:Test>false</ns4:Test><ns4:Prepared>2013-02-21T06:47:55+01:00</ns4:Prepared><ns4:Sender
	 * id="ECB"><ns4:Name>European Central Bank</ns4:Name><ns4:Contact><ns4:Email>statistics@ecb.europa.eu</ns4:Email></ns4:Contact></ns4:Sender>
	 * </ns4:Header> <ns4:Concepts> <ns12:Concept version="1.0" agencyID="ECB"
	 * id="FREQ"> <ns12:Name>Frequency</ns12:Name> </ns12:Concept>
	 * <ns12:Concept version="1.0" agencyID="EUROSTAT" id="FREQ">
	 * <ns12:Name>Frequency</ns12:Name> </ns12:Concept> </ns4:Concepts>
	 */
	var hiddenClass = '';
	var saxParser = XMLReaderFactory.createXMLReader();
	contentHandler.startElement = function(namespaceURI, localName, qName, atts) {
		// console.log( "startElement : [" + namespaceURI + "], [" + localName +
		// "], [" + qName + "]" );
		currentName = localName;
		elements.push(localName);
		switch ( localName ){
		case 'Header':
			s += '<h1>';
			break;
		case 'Concepts':
			s += '<table><tr><th>Agency</th><th>ID</th><th>Name</th></tr>';
			break;
		case 'Concept':
			id = atts.getValue(atts.getIndex('id'));
			foundCount++;
			s += '<tr><td>' + atts.getValue(atts.getIndex('agencyID')) + '</td><td>' + id + '</td><td>';
			break;
		}
	};
	contentHandler.endElement = function(namespaceURI, localName, qName) {
		// console.log( "startElement : [" + namespaceURI + "], [" + localName +
		// "], [" + qName + "]" ); currentName = localName;
		var leavingElement = elements.pop();
		switch ( localName ){
		case 'Header':
			s += '</h1>';
			break;
		case 'Concepts':
			s += '</table>';
			break;
		}
	};
	contentHandler.characters = function(ch, start, ch_length) {
		// console.log( "characters : [" + ch + "], [" + start + "], [" +
		// ch_length + "]" );
		switch ( currentName ){
		case 'Name':
			if( elements.indexOf('Header') > -1 ) {
				s += ch;
				return;
			}
			if( elements.indexOf('Concept') > -1 ) {
				s += ch + '</td></tr>';
			}
			break;
		}
	};
	try {
		saxParser.setHandler(contentHandler);
		saxParser.parseString(xmlhttp.responseText);
	} catch( e ) {
		console.log('Problem processing response:' + e.message);
	}

	if( foundCount == 0 ) {
		s = '<p>No results found</p>';
	}
	// console.log( s );
	div.innerHTML = s;
	dojo.byId("status").innerHTML = "Done";
}

function call_concept_ws() {
	dojo.byId('content').value = '';
	var id = dojo.byId('objectid').value;
	var soap = '<in><quer:Concept>' + id + '</quer:Concept></in>';
	call_sdmx_ws(soap, 'GetConcept', 'content', getConceptResponse);
}

function storeJSON(key, j) {
	var s = JSON.stringify(j);
	if( s.length < 1000 ) {
		return; // don't store small stuff
	}

	var c = lzw_encode(s);
	console.log('compressed to {0} from {1}'.format(c.length, s.length));
	try {
		localStorage[key] = c;
	} catch( e ) {
		console.log('localStorage storeJSON[{0}] error:{1}'.format(key, e.message));
		// now to try sessionStorage
		try {
			sessionStorage[key] = c;
		} catch( e ) {
			console.log('sessionStorage storeJSON[{0}] error:{1}'.format(key, e.message));
			return false;
		}
	}
	return true;
}

function recallJSON(key) {
	var c = null;

	try {
		c = localStorage[key];
	} catch( err ) {
		console.log('error reading {0} from localStorage:{1}'.format(key, err.message));
		try {
			c = sessionStorage[key];
		} catch( err ) {
			console.log('error reading {0} from sessionStorage:{1}'.format(key, err.message));
		}
	}

	if( c ) {
		try {
			var d = lzw_decode(c);
			var s = JSON.parse(d);
			return s;
		} catch( err ) {
			console.log('error decoding {0} from storage:{1}'.format(key, err.message));
		}
	}
	return null;
}

/*******************************************************************************
 * LZW-compress a string
 * 
 * @param {String}
 *            s - the string to encode
 * @returns {String} the encoded string
 */
function lzw_encode(s) {
	var dict = {};
	var data = (s + "").split("");
	var out = [];
	var currChar;
	var phrase = data[0];
	var code = 256;
	for( var i = 1; i < data.length; i++ ) {
		currChar = data[i];
		if( dict[phrase + currChar] != null ) {
			phrase += currChar;
		} else {
			out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
			dict[phrase + currChar] = code;
			code++;
			phrase = currChar;
		}
	}
	out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
	for( var i = 0; i < out.length; i++ ) {
		out[i] = String.fromCharCode(out[i]);
	}
	return out.join("");
}

/**
 * uncompresses a string
 * 
 * @param s -
 *            encoded string
 * @returns the decoded string
 */
function lzw_decode(s) {
	var dict = {};
	var d = (s + "").split("");
	var currChar = d[0];
	var oldPhrase = currChar;
	var out = [ currChar ];
	var code = 256;
	var phrase = '';

	for( var i = 1; i < d.length; i++ ) {
		var currCode = d[i].charCodeAt(0);
		if( currCode < 256 ) {
			phrase = d[i];
		} else {
			phrase = dict[currCode] ? dict[currCode] : (oldPhrase + currChar);
		}

		out.push(phrase);
		currChar = phrase.charAt(0);
		dict[code] = oldPhrase + currChar;
		code++;
		oldPhrase = phrase;
	}
	return out.join("");
}
/**
 * search a dijit grid using the filter method
 * 
 * @param options -
 *            A JSON object of options as follows:
 *            <dl>
 *            <dt>column</dt>
 *            <dd>grid column - the field with the text in it.</dd>
 *            <dt>grid</dt>
 *            <dd>object of the grid or a string id</dd>
 *            <dt>exact</dt>
 *            <dd>true to search for exact match default is in the field</dd>
 *            <dt>minLength</dt>
 *            <dd>minium length of input before filtering is invoked
 *            (default:2)</dd>
 *            </dl>
 */
function gridFilter(options) {
	var grid = options.grid;

	if( typeof (grid) == 'string' ) {
		// if the grid is a string then get the dijit by using grid as an ID.
		grid = dijit.byId(grid);
	}

	var filterText = options.input.value;
	var filter = {};

	if( options.minLength ) {
		minLength = Number(options.minLength);
	} else {
		minLength = 2;
	}

	// apply the filter
	if( filterText.length >= minLength ) {
		filter[options.column] = '{0}{1}{2}'.format(options.exact ? '' : '*', filterText, options.exact ? '' : '*');
		grid.filter(filter, 1);
	}

	// clear the filter
	if( filterText.length < 1 ) {
		filter[options.column] = '*';
		grid.filter(filter, 1);
	}
}

// returns an array of country populations (1000s) indexed by ISO2 code
// ie: GB,IT
function getPopulation2010() {
	// CountryName,Sovereign,GEORegion,GEOSubregion,GEOID,ISO2Code,ISO3Code,UNCode,Developed,LeastDeveloped,OECD,SubSaharan,SmallIslandDev,ArabWorld,Population
	// Afghanistan,Afghanistan,Asia + Pacific,South
	// Asia,4,AF,AFG,4,0,1,0,0,0,0,29117.5
	var iso2Pop = [];
	var xmlhttp = new XMLHttpRequest();
	xmlhttp.open('GET', 'resources/population2010.csv', false);
	xmlhttp.send();
	var lines = xmlhttp.responseText.split('\n');
	if( lines.length < 2 ) {
		throw('no data found in population');
	}
	var header = [];
	for( var count in lines ) {
		var values = lines[count].split(',');
		if( count == 0 ) {
			header = values;
		} else {
			try {
				var iso2 = values[header.indexOf('ISO2Code')];
				var population = values[header.indexOf('Population')];
				var name = values[header.indexOf('CountryName')];
				iso2Pop[iso2] = {
					name : name,
					code : iso2,
					population : Number(population)
				};
			} catch( e ) {
				console.log('getPopulation2010 error at {0}:{1}'.format(count, e.message));
			}
		}
	}
	return iso2Pop;
}

// var globalPageMangler, globalProxy, globalPageQuery;
function getRpage() {
	return globalOptions.r;
}
function getQuerypage() {
	return globalOptions.query;
}

// finds out what r.php or h.jsp to use to open pages
function getProxyPage() {
	return globalOptions.proxy;
}
/**
 * Comment
 */
function initStoredQueries() {
	var grid = new dojox.grid.DataGrid({
		structure : [ {
			name : "Name",
			field : "name",
			width : "20%"
		}, {
			name : "Dataset Title - Double Click to Show",
			field : "title",
			width : "50%"
		}, {
			name : "Special",
			field : "options.special",
			editable : true,
			cellType : dojox.grid.cells.Bool,
			width : "5%"
		}, {
			name : "Select",
			field : "select",
			editable : true,
			cellType : dojox.grid.cells.Bool,
			width : "5%"
		} ],
		autoHeight : true
	}, "grid");
	grid.startup();
	var xmlhttp = new XMLHttpRequest();
	xmlhttp.open('GET', '{0}?method=list'.format(getQuerypage()), false);
	xmlhttp.send();
	try {
		var queries = JSON.parse(xmlhttp.responseText);
	} catch( e ) {
		alert('Error processing JSON reply ' + e.message);
	}

	var store = new dojo.data.ItemFileWriteStore({
		data : {
			items : queries.queries
		}
	});
	grid.setStore(store);
	grid.on("RowDblClick", function(evt) {
		var idx = evt.rowIndex;
		var rowData = grid.getItem(idx);
		showQuery(rowData.filename[0]);
	}, true);
}
/**
 * open the given query using the fileName in the appropriate window
 * 
 * @param fileName
 *            file with the query definition.
 */
function showQuery(fileName) {
	var xmlhttp = new XMLHttpRequest();
	var url = '{0}?method=get&filename={1}'.format(getQuerypage(), fileName);

	console.log(url);
	xmlhttp.open('GET', url, false);
	xmlhttp.send();
	if( xmlhttp.status == 200 ) {
		try {
			var query = JSON.parse(xmlhttp.responseText);
			var text = '';

			text += "&{0}={1}".format('title', encodeURIComponent(query.name));
			text += "&{0}={1}".format('options', encodeURIComponent(JSON.stringify(query.options)));

			var queries = [ 'query0', 'query1', 'query2' ];

			for( var qname in queries ) {
				var q = query[queries[qname]];
				if( q ) {
					text += "&{0}={1}".format(queries[qname], encodeURIComponent(JSON.stringify(q)));
				}
			}
		} catch( e ) {
			alert('Query {0} could not be read due to error:{1}'.format(fileName, e.message));
			return;
		}
		var url;
		if( query.options.map ) {
			url = "{0}?mapResult.html{1}".format(getRpage(), text);
		} else {
			url = "{0}?queryResult.html{1}".format(getRpage(), text);
		}
		console.log('opening url:' + url);
		window.location = url;
	} else {
		alert('Error getting query:' + xmlhttp.responseText);
	}
}

function confirmDialog(title, message, yesAction) {
	var dialog = new dijit.Dialog({
		title : title,
		style : "width: 400px",
		content : message + "<br>"
	});
	// Creating div element inside dialog
	var div = dojo.create('div', {}, dialog.containerNode);
	dojo.style(dojo.byId(div), "float", "left");
	var noBtn = new dijit.form.Button({
		label : "Cancel",
		onClick : function() {
			dialog.hide();
			dojo.destroy(dialog);
		}
	});
	var yesBtn = new dijit.form.Button({
		label : "Yes",
		style : "width : 60px",
		onClick : function() {
			dialog.hide();
			dojo.destroy(dialog);
			yesAction();
		}
	});
	// adding buttons to the div, created inside the dialog
	dojo.create(yesBtn.domNode, {}, div);
	dojo.create(noBtn.domNode, {}, div);
	dialog.show();
}
function deleteSelectedStoredQueries() {
	var grid = dijit.byId('grid');
	var store = grid.store;
	var itemsToDelete = [];
	// Returns query results from the array that match the given query

	function gotItems(items, request) {
		var i;
		for( i = 0; i < items.length; i++ ) {
			var item = items[i];
			itemsToDelete.push(store.getValue(item, "filename"));
		}
	}

	store.fetch({
		query : {
			select : true
		},
		onComplete : gotItems
	});
	for( var z in itemsToDelete ) {
		deleteQuery(itemsToDelete[z]);
	} // refresh the grid
	var xmlhttp = new XMLHttpRequest();
	xmlhttp.open('GET', '{0}?method=list'.format(getQuerypage()), false);
	xmlhttp.send();
	var queries = JSON.parse(xmlhttp.responseText);
	var store = new dojo.data.ItemFileWriteStore({
		data : {
			items : queries.queries
		}
	});
	grid.setStore(store);
}

function updateStoredQueries() {
	var grid = dijit.byId('grid');
	var store = grid.store;
	var itemsToProcess = [];
	// Returns query results from the array that match the given query

	function gotItems(items, request) {
		var i;
		for( i = 0; i < items.length; i++ ) {
			var item = items[i];
			itemsToProcess.push(item);
		}
	}

	store.fetch({
		query : {
			select : true
		},
		onComplete : gotItems
	});
	for( var z in itemsToProcess ) {
		saveQuery(itemsToProcess[z]);
	}
	// refresh the grid
	var xmlhttp = new XMLHttpRequest();
	xmlhttp.open('GET', '{0}?method=list'.format(getQuerypage()), false);
	xmlhttp.send();
	var queries = JSON.parse(xmlhttp.responseText);
	var store = new dojo.data.ItemFileWriteStore({
		data : {
			items : queries.queries
		}
	});
	grid.setStore(store);
}

function deleteQuery(fileName) {
	var xmlhttp = new XMLHttpRequest();
	var url = '{0}?method=delete&filename={1}'.format(getQuerypage(), fileName);
	console.log(url);
	xmlhttp.open('GET', url, false);
	xmlhttp.send();
	if( xmlhttp.status != 200 ) {
		alert('Error deleting:' + xmlhttp.responseText);
	}
}

// displays the window dimensions on a window to assist with stuff.
function windowDimensions(controlId) {
	var winW = 630, winH = 460;
	if( document.body && document.body.offsetWidth ) {
		winW = document.body.offsetWidth;
		winH = document.body.offsetHeight;
	}
	if( document.compatMode == 'CSS1Compat' && document.documentElement && document.documentElement.offsetWidth ) {
		winW = document.documentElement.offsetWidth;
		winH = document.documentElement.offsetHeight;
	}
	if( window.innerWidth && window.innerHeight ) {
		winW = window.innerWidth;
		winH = window.innerHeight;
	}
	var div = dojo.byId(controlId);
	if( div ) {
		div.innerHTML = '{0} x {1}'.format(winW, winH);
	}
}
/**
 * returns a random string of stuff to be used to thwart IE resource caching.
 * 
 * @param string_length
 *            {int} - the number of characters to return
 * @returns {String}
 */
function randomString(string_length) {
	var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
	var randomstring = '';

	for( var i = 0; i < string_length; i++ ) {
		var rnum = Math.floor(Math.random() * chars.length);
		randomstring += chars.substring(rnum, rnum + 1);
	}
	return randomstring;
}
/**
 * read the options.json file that contains all the options used by the project
 * 
 */
function setGlobalOptions() {
	var xmlhttp;
	var randomJunk = randomString(8); // use randomJunk to defeat IE caching.

	try {
		xmlhttp = new XMLHttpRequest();
		xmlhttp.open('GET', 'resources/options.json?' + randomJunk, false);
		xmlhttp.send();

		globalOptions = JSON.parse(xmlhttp.responseText);

		var key = 'globalOptions.activeVersion';
		var activeVersion = localStorage[key];

		if( activeVersion != globalOptions.activeVersion ) {
			localStorage.clear();
			localStorage[key] = globalOptions.activeVersion;
			console.log('Cleared local storage due to activeVersion change.');
		}
	} catch( err ) {
		alert('GIGANTIC ERROR!!!! Options not specified correctly:' + err.message);
	}
}
