
//
// Main logic for rendering UML diagrams
//

function encode64(data)
{
	r = "";
	for (i=0; i<data.length; i+=3)
	{
 		if (i+2==data.length)
 		{
			r +=append3bytes(data.charCodeAt(i), data.charCodeAt(i+1), 0);
		}
		else if (i+1==data.length)
		{
			r += append3bytes(data.charCodeAt(i), 0, 0);
		} else
		{
			r += append3bytes(data.charCodeAt(i), data.charCodeAt(i+1),
				data.charCodeAt(i+2));
		}
	}
	return r;
}

function append3bytes(b1, b2, b3)
{
	c1 = b1 >> 2;
	c2 = ((b1 & 0x3) << 4) | (b2 >> 4);
	c3 = ((b2 & 0xF) << 2) | (b3 >> 6); 
	c4 = b3 & 0x3F;
	r = "";
	r += encode6bit(c1 & 0x3F);
	r += encode6bit(c2 & 0x3F);
	r += encode6bit(c3 & 0x3F);
	r += encode6bit(c4 & 0x3F);
	return r;
}

function encode6bit(b)
{
	if (b < 10)
	{
 		return String.fromCharCode(48 + b);
	}
	b -= 10;
	if (b < 26)
	{
 		return String.fromCharCode(65 + b);
	}
	b -= 26;
	if (b < 26)
	{
 		return String.fromCharCode(97 + b);
	}
	b -= 26;
	if (b == 0)
	{
 		return '-';
	}
	if (b == 1) {
 		return '_';
	}
	return '?';
}

// host as client settings via options page
const PlantUMLResourceURL = "https://www.plantuml.com/plantuml/svg/";
// const PlantUMLResourceURL = "http://www.plantuml.com/plantuml/svg/";
const zipMaxCompressionLevel = 9;

// NOTE - this could be cached on our side - to avoid duplication
function RenderUMLandGetURL(s) {
  try
  {
      // UTF8
      s = unescape(encodeURIComponent(s));
      return PlantUMLResourceURL + encode64(zip_deflate(s, zipMaxCompressionLevel));
  }
  catch (err)
  {
    alert("exception: " + err.message);
  }
}

const UMLStartMarker        = '@startuml';
const UMLEndMarker          = '@enduml';
const ConfluenceEditUrlArg  = "editpage.action";

function getHTMLFromScript(scriptRow)
{
    scriptRow = scriptRow.replace(new RegExp("<br>",    "g"), "@n");
    scriptRow = scriptRow.replace(new RegExp("</br>",   "g"), "@n");
    scriptRow = scriptRow.replace(new RegExp("<p>",     "g"), "@n");
    scriptRow = scriptRow.replace(new RegExp("</p>",    "g"), "@n");
    scriptRow = scriptRow.replace(new RegExp("&gt;",    "g"), ">");
    scriptRow = scriptRow.replace(new RegExp("&lt;",    "g"), "<");
    scriptRow = scriptRow.replace(new RegExp("@n",      "g"), "\n");
    //
    // !!! AP|TODO .. continue here to handle all operators required for class diagrams etc ...
    //
    return scriptRow;
}

function GetUMLHTMLfromScript(scriptRow)
{
    scriptRow = getHTMLFromScript(scriptRow);
    // Request the PlantUML server to convert the UML string to a corresponding image file
    var PlantUMLURL = RenderUMLandGetURL(scriptRow);
    return "<object type='image/svg+xml' data='" + PlantUMLURL + "'/>";
}

function parseHTMLAndRenderDiagrams()
{
    var inUMLCode = false;
    var UMLScript = [];
    var UMLScripts = [];
    var imgUrlHTML = "";
    // for each paragraph-element - assumption: on paragraph per script row
    $("p").filter(function (index)
    {
        var strLine = $(this).html();

        if (strLine.indexOf(UMLStartMarker) != -1)
            inUMLCode = true;
        if (inUMLCode)
        {
            strLine = getHTMLFromScript(strLine);
            UMLScript.push(strLine);
        }
        if (strLine.indexOf(UMLEndMarker) != -1)
        {
            var scriptRow = "<p>" + UMLScript.join("</p><p>") + "</p>";
            imgUrlHTML = GetUMLHTMLfromScript(scriptRow);
            var s = $(this).html();
            UMLScripts.push(imgUrlHTML);
            $(this).html(imgUrlHTML);
            s = $(this).html();
            inUMLCode = false;
            UMLScript = [];
            UMLScripts = [];
        }
        return inUMLCode;
    }).remove();
}

//
// Main entry point for the PlantUML rendering content script
//
$(document).ready(function ()
{
    try
    {
        $('body').each(function()
        {
            var html = $(this).html();
            // Skip if we're in Confluence edit mode
            containsResult = window.location.href.indexOf(ConfluenceEditUrlArg);
            if (containsResult == -1)
            {
                parseHTMLAndRenderDiagrams();
            }
        })
    }
    catch (ex)
    {
        console.log("Unexpected error in UMLRenderer: " + ex);
        alert("Unexpected error in UMLRenderer: " + ex);
    }
});
