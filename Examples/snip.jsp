<%@page session="false"%>
<%@page import="java.net.*,java.io.*" %>
<%
//try {
	String reqUrl = request.getQueryString(); //OR:  request.getParameter("url");

	System.out.println( String.format( "snip.jsp reqUrl:%s", reqUrl ) );

	
	URL url = new URL(reqUrl);
	HttpURLConnection con = (HttpURLConnection)url.openConnection();
	con.setDoOutput(true);
	con.setRequestMethod(request.getMethod());
	int clength = request.getContentLength();
	if(clength > 0) {
		con.setDoInput(true);
		byte[] idata = new byte[clength];
		request.getInputStream().read(idata, 0, clength);
		con.getOutputStream().write(idata, 0, clength);
	}
	//System.out.println( String.format( "con.getContentType:%s", con.getContentType() ) );
	//response.setContentType(con.getContentType());

	BufferedReader rd = new BufferedReader(new InputStreamReader(con.getInputStream()));
	String line;
	while ((line = rd.readLine()) != null) {
		out.println(line); 
	}
	rd.close();

//} catch(Exception e) {
//    System.out.println( String.format( "error:%s", e.getMessage() ) );
//	response.setStatus(500);
//}
%>
