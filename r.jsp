<%@page session="false"%>
<%@page import="java.net.*,java.io.*,java.util.UUID" %>
<%!

public static String fileGetContents( String fileName ){
	StringBuilder builder = new StringBuilder();
	
	//System.out.println( String.format( "fileGetContents: %s", fileName ) );
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
		e.printStackTrace();
	}	

	return builder.toString();
}
%>

<%

try {
	String reqUrl = request.getQueryString();
	boolean allowed = false;
	String token = null;

	System.out.println("Request to mangle: " + reqUrl);

	String[] urlParts = reqUrl.split("\\?");
	String targetPath = urlParts[0].split("&")[0];

	//System.out.println("targetpath: " + targetPath);
	//System.out.println(String.format( "Application path %s", application.getRealPath("/") ) );
	
	String contents = fileGetContents( application.getRealPath("/") + targetPath );
	
	// apply all templates.
	
	String templateFolder = application.getRealPath("/") + "templates";
	
	for( int repeats = 0; repeats < 3; repeats++){
		File dir = new File( templateFolder );
		File[] a_files = dir.listFiles();
		int replaceCount = 0;
			
		for( int f = 0; f < a_files.length; f++ ){
			String fileName = a_files[f].getName();
			String replaceString = "<!--#" + fileName.toLowerCase() + "#-->";
			
			//System.out.println( String.format( "template file %s", fileName ) );
	
			if( contents.indexOf( replaceString ) > -1 ){
				replaceCount++;
				String template = fileGetContents( application.getRealPath("/") + "templates/" + fileName );
				contents = contents.replace( replaceString, template );
			}
		}
		if( replaceCount == 0 ){
			break;
		}
	}
	
	// replace the r mangler name	
	String randomQueryString = UUID.randomUUID().toString();
	contents = contents.replace( "rpage?", "r.jsp?" );
	contents = contents.replace( "#random#", randomQueryString );
	String[] parts = reqUrl.split("&");
	//System.out.println( String.format( "parts.length: %d", parts.length ) );
	
	if( parts.length > 1 ){

		// Apply replace on buffer
		for (int i=1; i < parts.length; i++) {
		
			String name = parts[i].split("=")[0];
			String value = parts[i].split("=")[1];
			//System.out.println( String.format( "replace'%s' with '%s'", "#"+name+"#", value ) );
			contents = contents.replace("#"+name+"#", value);
		}
	}
	out.write( contents );
	response.setStatus(200);
} catch(Exception e) {
	e.printStackTrace();
	response.setStatus(400);
}
%>
