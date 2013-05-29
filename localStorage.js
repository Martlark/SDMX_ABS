// code to view and manage local storage entries

/**
 * removes all local storage items
 * 
 * @returns {undefined} null
 */

function clearLocalStorage() {
	localStorage.clear();
	alert('local storage cleared');
	localStorageSetStore(dijit.byId('localStorageTable'));
}
/*******************************************************************************
 * remove all selected items from the local storage
 * 
 * @returns {undefined} null
 */
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
 * Set the grid of the local storage with the key and size of local storage
 * entries
 * 
 * @param {object}
 *            grid dijit grid
 */
function localStorageSetStore(grid) {
	var count = 0, bytes = 0, localItems = [];

	for( var z = 0; z < localStorage.length; z++ ) {
		var key = localStorage.key(z);

		localItems.push({
			index : count,
			size : localStorage.getItem(key).length,
			key : key,
			query : localStorage.getItem(key)
		});
		count++;
		bytes += localStorage.getItem(key).length;
	}

	var store = new dojo.data.ItemFileWriteStore({
		data : {
			items : localItems
		}
	});
	grid.setStore(store);
	var megaBytesUsed = bytes > 0 ? 1 + Math.round(bytes / (1024 * 1024)) : 0;
	dojo.byId('foundCount').innerHTML = "{0} found, {1} megabyte{2} used.".format(count, megaBytesUsed, megaBytesUsed == 1 ? '' : 's');
}
/*******************************************************************************
 * 
 * @param {type}
 *            entryKey key to be shown
 * @returns {undefined} null
 */

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
