<%@page session="false"%>
<%@page contentType="application/soap+xml; charset=UTF-8" pageEncoding="UTF-8" %>   
<%@page import="java.net.*,java.io.*" %>
<%
try {
	String reqUrl = request.getQueryString(); //OR:  request.getParameter("url");

	System.out.println( String.format( "proxy.jsp START:%s", reqUrl ) );

	
	URL url = new URL(reqUrl);
	HttpURLConnection con = (HttpURLConnection)url.openConnection();
	con.setDoOutput(true);
	con.setRequestMethod(request.getMethod());
    con.setRequestProperty( "Content-Type", request.getContentType() );

	int clength = request.getContentLength();
	if(clength > 0) {
    	System.out.println( String.format( "Sending POST bytes:%d", clength ) );
		con.setDoInput(true);
		byte[] idata = new byte[clength];
		request.getInputStream().read(idata, 0, clength);
		con.getOutputStream().write(idata, 0, clength);
		
	    System.out.write(idata, 0, clength);
	}
	
	if( con.getContentType() != null ){
    	System.out.println( String.format( "con.getContentType:%s", con.getContentType() ) );
    	String contentType = con.getContentType();
    	
    	response.setContentType(contentType);
    }
    
    if( con.getInputStream() != null ){
    	BufferedReader rd = new BufferedReader(new InputStreamReader(con.getInputStream()));
    	String line;
    	while ((line = rd.readLine()) != null) {
    		out.println(line); 
    	}
    	rd.close();
	}
  	System.out.println( String.format( "proxy.jsp COMPLETE" ) );

} catch(Exception e) {
    System.out.println( String.format( "proxy.jsp error:%s", e.getMessage() ) );
    out.write( String.format( "proxy.jsp error:%s", e.getMessage() ) );
	response.setStatus(500);
}

%>
