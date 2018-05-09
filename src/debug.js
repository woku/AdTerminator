var safeToleave = false;
function doDebugInfo(msg){
	var startCapture = localStorage["startCapture"];
	if (startCapture === "true") {
		$("#debugInfo").append('<span class="'+msg.debugInfo+'">'+msg.content+'</span>')
		$('#debugInfo').scrollTop($('#debugInfo')[0].scrollHeight);
	};
}
function selectText() {
    var doc = document;
    var text = doc.getElementById("debugInfo");    

    if (doc.body.createTextRange) { // ms
        var range = doc.body.createTextRange();
        range.moveToElementText(text);
        range.select();
    } else if (window.getSelection) { // moz, opera, webkit
        var selection = window.getSelection();            
        var range = doc.createRange();
        range.selectNodeContents(text);
        selection.removeAllRanges();
        selection.addRange(range);
    }
}


chrome.runtime.onConnect.addListener(function(port) {
  console.assert(port.name == "debug");
  port.onMessage.addListener(function(msg) {
  	switch (msg.type){
  		case "debugInfo":
  		doDebugInfo(msg);
  		break;
  	}
  });
});

$(function(){
	if (localStorage["startCapture"] === "true") {
		$("#stop-capture").show();
		$("#start-capture").hide();
	}else{
		$("#stop-capture").hide();
		$("#start-capture").show();
	}
	$("#close-debug").click(function(){
		safeToleave = true;
		localStorage["debug"] = false;
		chrome.runtime.reload();
	})

	$("#stop-capture").click(function(){
		$("#stop-capture").toggle();
		$("#start-capture").toggle();
		localStorage["startCapture"] = "false";
	})

	$("#start-capture").click(function(){
		$("#stop-capture").toggle();
		$("#start-capture").toggle();
		localStorage["startCapture"] = "true";
	})

	$("#clearcontent").click(function(){
		$("#debugInfo").html("");
	})

	$("#selecttext").click(function(){
		selectText();
	})
});
