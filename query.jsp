<%@page session="false"%>
<%@page import="java.net.*,java.io.*,java.util.*" %>
<%!
/*
    this is a group of simplistic web service jsp methods to facilitate easy implementation
    of a basic MVC controller for SDMX query visualisation prototyping.
    
    By andrew rowe 2013
*/
%>
<%!
public static Map<String, String> getUrlParameters(HttpServletRequest uri)
    throws UnsupportedEncodingException {
    Map<String, String> params = new HashMap<String, String>();
    for (String param : uri.getQueryString().split("&")) {
        String pair[] = param.split("=");
        String key = URLDecoder.decode(pair[0], "UTF-8");
        String value = "";
        if (pair.length > 1) {
            value = URLDecoder.decode(pair[1], "UTF-8");
        }
        params.put(new String(key), new String(value));
    }
    return params;
}

public static String fileGetContents( String fileName ){
	StringBuilder builder = new StringBuilder();
	
//	System.out.println( String.format( "fileGetContents: %s", fileName ) );
	try {
		BufferedReader reader = new BufferedReader(new FileReader(fileName ));
		String line;
		
		// For every line in the file, append it to the string builder
		while((line = reader.readLine()) != null)
		{
			builder.append(line + "\n" );
		}
		reader.close();
	} catch(Exception e) {
		System.out.println( String.format( "file error:%s", fileName ) );
		e.printStackTrace();
		return "";
	} 
	return builder.toString();
}

public static String queryGet( String dirName, String fileName ) {
	System.out.println( String.format( "queryGet: %s", fileName ) );
	
	StringBuilder json = new StringBuilder();
			
    String query = fileGetContents( dirName + "/" + fileName );
	String[] pairs = query.split( "\n" );
	
	String queryName = "";
	String queryTitle = "";
	Map<String,String> queryJSON = new HashMap<String, String>();
	String options = "{}";
	int valuesRead = 0;
	
	for( int p = 0; p < pairs.length; p++ ){
	    System.out.println( String.format( "pairs[%d]: %s", p, pairs[p] ) );
	    int equals = pairs[p].indexOf( "=" );
        
        String[] values = new String[2];
        
        values[0] = pairs[p].substring(0,equals);
        values[1] = pairs[p].substring(equals+1);
		
		if (values[0].equals( "name") ){
			queryName = values[1];
			valuesRead++;
		}
		if (values[0].equals( "title") ) {
			queryTitle = values[1];
			valuesRead++;
		}
		if (values[0].startsWith( "query")) {
			queryJSON.put( values[0], values[1] );
			valuesRead++;
		}
		if (values[0].equals( "options") ) {
			options = values[1];
			valuesRead++;
		}
	}
	
	//echo "valuesRead == valuesRead<br/>";
	
	if (valuesRead >= 4) {
		json.append( String.format( "{ \"name\": \"%s\", \"filename\": \"%s\", \"title\" : \"%s\",", queryName, fileName, queryTitle ) );
		json.append( String.format( " \"options\" : %s, ", options ) );
		// add all queries
		int q_count = 0;
		
		for( String q_key  : queryJSON.keySet() ) {
			if (q_count > 0) {
				json.append( "," );
			}
			
			String q_value = queryJSON.get( q_key );
			json.append( String.format( "\"%s\" : %s", q_key, q_value ) );
			q_count++;
		}
		json.append( "}" );
	} else {
    	System.out.println( String.format( "queryShow: %s, not enough values: %d", fileName, valuesRead ) );
		//unlink("dirName/entryName");
	}
	return json.toString();
}


public static String queryList( String dirName ) {
//	System.out.println( String.format( "queryList: %s", dirName ) );

// open this directory
	File dir = new File( dirName );
	File[] a_files = dir.listFiles();
	int count = 0;
	
	StringBuilder table = new StringBuilder( "{ \"queries\": [ " );
			
	for( int f = 0; f < a_files.length; f++ ){
		String fileName = a_files[f].getName();
	
		String query = fileGetContents( dirName + "/" + fileName );
		
		if( fileName.endsWith( ".txt" ) ) {
    		
    		String[] pairs = query.split( "\n" );
    		
    		String queryName = "";
    		String queryTitle = "";
    		Map<String,String> queryJSON = new HashMap<String, String>();
    		String options = "{}";
    		int valuesRead = 0;
    		
    		for( int p = 0; p < pairs.length; p++ ){
    			int equals = pairs[p].indexOf( "=" );
    			
    			String[] values = new String[2];
    			
    			values[0] = pairs[p].substring(0,equals);
    			values[1] = pairs[p].substring(equals+1);
    
    			//System.out.println( String.format( "%s=%s", values[0], values[1] ) );
    			
    			if (values[0].equals( "name") ){
    				queryName = values[1];
    				valuesRead++;
    			}
    			if (values[0].equals( "title") ) {
    				queryTitle = values[1];
    				valuesRead++;
    			}
    			if (values[0].startsWith( "query")) {
    				queryJSON.put( values[0], values[1] );
    				valuesRead++;
    			}
    			if (values[0].equals( "options") ) {
    				options = values[1];
    				valuesRead++;
    			}
//                System.out.println( String.format( "valuesRead: %d", valuesRead ) );
    		}
    		
    		//echo "valuesRead == valuesRead<br/>";
    		
    		if (valuesRead >= 4) {
    			if (count > 0) {
    				table.append( "," );
    			}
    			table.append( String.format( "{ \"name\": \"%s\", \"filename\": \"%s\", \"title\" : \"%s\",", queryName, fileName, queryTitle ) );
    			table.append( String.format( " \"options\" : %s, ", options ) );
    			// add all queries
    			int q_count = 0;
    			
    			for( String q_key  : queryJSON.keySet() ) {
    				if (q_count > 0) {
    					table.append( "," );
    				}
    				
    				String q_value = queryJSON.get( q_key );
    				table.append( String.format( "\"%s\" : %s", q_key, q_value ) );
    				q_count++;
    			}
    			table.append( "}" );
    			count++;
    		} else {
    			 System.out.println( String.format( "%s: invalid query, insuffient values found: %d", fileName, valuesRead ) );
    			//unlink("dirName/entryName");
    		}
		}
	}
	table.append(  "] }" );
	return table.toString();
}

public static String queryLog( String dirName, HttpServletRequest request ) {
	//System.out.println( String.format( "queryLog" ) );
    try{            
        Map<String,String> params = getUrlParameters( request );
        //FileOutputStream fileOut = new FileOutputStream( dirName + "/query.log",true);
            
    	int clength = request.getContentLength();
        //System.out.println( String.format( "clength %d", clength ) );
    	if(clength > 0) {
    		byte[] idata = new byte[clength];
    		try {
    		    request.getInputStream().read(idata, 0, clength);
    		} catch(Exception e) {
                System.out.println( String.format( "query.jsp error:%s", e.getMessage() ) );
            }
            System.out.print( "LOG:" );
            System.out.write(idata,0,clength);
    	} else if( params.get( "text" ).length() > 0 ){
            System.out.println( "LOG:" + params.get( "text" ) );
    	}
        return "OK";
    }catch (Exception e) 
    {
        System.out.println("Query log append Error: " + e.getMessage()); 
        return e.getMessage();
    }
}
/**
a crude method of retrieving an input value with given id in a HTML page
*/

public static String readInputValue( String query, String id ){
    int idStart = query.indexOf( String.format( "id='%s'", id ) );
    int valueStart = query.indexOf( "value='", idStart );
    int valueStop = query.indexOf( "'", valueStart+7 );

    String value = query.substring( valueStart+7, valueStop );
	return value;
}
/**
a crude method of retrieving a JSON value with given key in string query
*/
public static String getJSONValue( String query, String key ){
	String searchKey = String.format( "\"%s\":\"", key );
    int idStart = query.indexOf( searchKey ) + searchKey.length();
    int valueStop = query.indexOf( "\"", idStart );
    
    if( idStart < valueStop ){
        return query.substring( idStart, valueStop );
    }
    return "-";
}

/**
	makes a page of the saved queries that can be indexed by web search tools
*/
public static String makeQueryPage( String dirName, String baseDir ) {
//	System.out.println( String.format( "makeQueryPage: %s, %s", dirName, baseDir ) );

    // open this directory
	File dir = new File( dirName );
	File[] a_files = dir.listFiles();
	int count = 0;
	File file = new File( dirName + "/savedQueries.html" );
	
	// read the page template
	
	String templateFolder = baseDir + "templates";
	String template = fileGetContents( templateFolder + "/savedQueries.html" );
	
	// build a table to put in the template
	
	StringBuilder table = new StringBuilder( "<table>\n" );
			
	table.append( "<tr><th>Name</th><th>Data Set Id</th><th>From</th><th>To</th><th>Frequency</th><th>Measure</th><th>Query</th></tr>\n" );
	// process every html file to get out the bits that are important.
	for( int f = 0; f < a_files.length; f++ ){
		String fileName = a_files[f].getName();
	
		String query = fileGetContents( dirName + "/" + fileName );
		
		if( fileName.endsWith( ".html" ) && !fileName.toLowerCase().equals( "savedqueries.html" ) ) {
    		int titleStart = query.indexOf( "<title>" );
    		int titleStop = query.indexOf( "</title>" );
    		
    		if( titleStart < titleStop ){
    			String queryTitle = query.substring( titleStart + 7, titleStop );
    		
				table.append( String.format( "<tr><td><a href='rpage?query/%s'>%s</a></td>", fileName, queryTitle ) );
    		}
			count++;
			
			String query0 = readInputValue( query, "query0");
		    String[] jpairs = query.split( ":" );
		    String[] dataItems = "dataSetId,startTime,endTime,frequency,measure".split(",");
		    
            for( int d = 0; d < dataItems.length; d++ ){
            	String value = getJSONValue( query0, dataItems[d] );
            	
                table.append( String.format( "<td>%s</td>", value ) );
            }			
            table.append( String.format( "<td>%s</td>", query0 ) );
			table.append( "</tr>\n" );
		}
	}
	table.append(  "</table>\n" );
	template = template.replace( "#table#", table.toString() );
    try{	
		PrintWriter pw = new PrintWriter(new FileWriter(file));
		pw.println( template );
		pw.close();
    }
    catch (Exception e) 
    {
        System.out.println("makeQueryPage error: " + e.getMessage()); 
    }
    return template;
}


public static String queryCreate(String dirName, String baseDir, Map<String,String> params ) {
//    System.out.println( String.format( "queryCreate() START: %s", dirName ) ); 
/*
	if (file_exists("$dirName/disable-create.txt")) {
		sendResponse(403, 'file not found');
		return;
	}
	if (disk_free_space('.') < 1000000000) {
		sendResponse(403, 'Insufficient storage space');
		return;
	}
*/
    int valuesRead = 0;
	String templateFolder = baseDir + "templates";
	String template = fileGetContents( templateFolder + "/queryStub.html" );
	
    // check parameters are valid
        
	for (Map.Entry<String, String> entry : params.entrySet()) {
		if (entry.getKey().equals( "name") ){
			valuesRead++;
		}
		if (entry.getKey().equals( "title") ) {
			valuesRead++;
		}
		if (entry.getKey().startsWith( "query")) {
			valuesRead++;
		}
		if (entry.getKey().equals( "options") ) {
			valuesRead++;
		}
    }
    try{
        if( valuesRead < 4 ){
            throw new Exception( "Insufficient values to create query" );
        }
        
        File dir = new File( dirName );
    	File tempFile = File.createTempFile("query", ".txt", dir );
    	PrintWriter pw = new PrintWriter(new FileWriter(tempFile));
    	for (Map.Entry<String, String> entry : params.entrySet()) {
            System.out.println(String.format( "%s=%s", entry.getKey(), entry.getValue() ) ); 
            pw.println( String.format( "%s=%s", entry.getKey(), entry.getValue() ) );
        }
        pw.close();
        
        File stub = File.createTempFile("query", ".html", dir );
        
        String contents = template;
        
    	for (Map.Entry<String, String> entry : params.entrySet()) {
            contents = contents.replace( "#" + entry.getKey() + "#", entry.getValue() );
        }
        contents = contents.replace( "#filename#", tempFile.getName() );

		PrintWriter pwStub = new PrintWriter(new FileWriter(stub));
		pwStub.println( contents );
		pwStub.close();

    }catch (Exception e) 
    {
        System.out.println("Query create error: " + e.getMessage()); 
        return e.getMessage();
    }
	makeQueryPage(dirName, baseDir);
//    System.out.println("queryCreate() OK"); 
    return "OK";
}

%>
<%

//System.out.println("query.jsp"); 

String reqUrl = request.getQueryString();
boolean allowed = false;
String token = null;

Map<String,String> params = getUrlParameters( request );
/*
for (Map.Entry<String, String> entry : params.entrySet())
{
    out.println(entry.getKey() + "=" + entry.getValue());
}
*/

//System.out.println("method=" + params.get("method"));
/*
	set header parameters to prevent IE caching any service call.
	refer to: http://stackoverflow.com/questions/1953431/how-to-control-cache-in-jsp-page
*/
HttpServletResponse httpResponse = (HttpServletResponse)response;
httpResponse.setHeader("Cache-Control", "no-cache, no-store, must-revalidate"); // HTTP 1.1.
httpResponse.setHeader("Pragma", "no-cache"); // HTTP 1.0.
httpResponse.setDateHeader("Expires", 0); // Proxies.
httpResponse.setDateHeader("Last-Modified", (new Date()).getTime() ); // Set last modified to right now.

if( params.get("method").equals( "list" ) ){
	//out.println("method=" + params.get("method"));
	String table = queryList( application.getRealPath("/") + "query" );
	response.setContentType("application/json");
	out.write( table );
}
else if( params.get("method").equals( "get" ) ){
	//out.println("method=" + params.get("method"));
	String table = queryGet( application.getRealPath("/") + "query", params.get("filename") );
	response.setContentType("application/json");
	out.write( table );
}
else if( params.get("method").equals( "create" ) ){
	String r = queryCreate( application.getRealPath("/") + "query", application.getRealPath("/"), params );
	out.write( r );
	if( r.equals( "OK" ) ){
  	    response.setStatus(200);
  	}else{
  	    response.setStatus(404);
  	}
}
else if( params.get("method").equals( "log" ) ){
	//out.println("method=" + params.get("method"));
	String r = queryLog( application.getRealPath("/"), request );
	out.write( r );
  	response.setStatus(200);
}
else if( params.get("method").equals( "makeQueryPage" ) ) {
	out.println( makeQueryPage( application.getRealPath("/") + "query", application.getRealPath("/") ) );
  	response.setStatus(200);
}
else {
    out.println( String.format( "unknown parameters", reqUrl ) );
	response.setStatus(404);
}
%>