<%@page session="false"%>
<%@page import="java.net.*,java.io.*,java.util.UUID" %>
<%
	// an experiment page
	String requestURL = request.getRequestURL().toString();

    String redirectURL = "";
    int lastSlash = requestURL.lastIndexOf( "/" );
    
    redirectURL = "%s/%s".format( requestURL.substring( 0, lastSlash ), "r.jsp/home.html" );
    response.sendRedirect(redirectURL);
%>