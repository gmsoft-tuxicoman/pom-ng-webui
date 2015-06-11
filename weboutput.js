
//
// CORE stuff
//

function weboutput() {
	this.evt_listeners = [];
	this.pload_listeners = [];
}

weboutput.prototype.eventListen = function (evtName, filter, callbackBegin, callbackEnd) {
	pomng.monitor.eventListenerRegister(evtName, filter, callbackBegin, callbackEnd, this, this.eventListenCallback);
}

weboutput.prototype.eventListenCallback = function(id) {
	this.evt_listeners.push(id);
}

weboutput.prototype.ploadListen = function (filter, callback) {
	pomng.monitor.ploadListenerRegister(filter, callback, this, this.ploadListenCallback);
}

weboutput.prototype.ploadListenCallback = function(id) {
	this.pload_listeners.push(id);
}

weboutput.prototype.ploadEventsListen = function (id) {
	this.pload_events_listen = true;
	pomng.monitor.ploadEventsListenStart();
}

weboutput.prototype.activate = pomngUI.panel.prototype.activate;
weboutput.prototype.deactivate = pomngUI.panel.prototype.deactivate;

weboutput.prototype.cleanup = function() {

	while (this.evt_listeners.length > 0) {
		var id = this.evt_listeners.shift();
		pomng.monitor.eventListenerUnregister(id);
	}

	while (this.pload_listeners.length > 0) {
		var id = this.pload_listeners.shift();
		pomng.monitor.ploadListenerUnregister(id);
	}

	if (this.pload_events_listen)
		pomng.monitor.ploadEventsListenStop();

	delete pomngUI.weboutputs[this.elem[0].id];
	console.log("Weboutput cleaned up");

}

weboutput.outputs = [ 'arpwatch', 'wallofsheep', 'images', 'calls' ];

//
// ARPWATCH
//

weboutput.arpwatch = function(elem) {
	this.elem = elem;
	this.elem.html('<h2>Output arpwatch</h2><table class="ui-widget ui-widget-content ui-table"><thead><tr class="ui-widget-header"><td>IP address</td><td>Mac address</td><td>Vlan</td><td>Last change</td></tr></thead><tbody></tbody></table>');
	this.sta = {};

	this.eventListen("arp_new_sta", null, null, weboutput.arpwatch.process_event);
	this.eventListen("arp_sta_changed", null, null, weboutput.arpwatch.process_event);
}

weboutput.arpwatch.description = "Show discovered stations.";
weboutput.arpwatch.prototype = new weboutput();
weboutput.arpwatch.prototype.constructor = weboutput.arpwatch;


weboutput.arpwatch.process_event = function(evt) {

	var data = evt.data;
	var ip = data['ip_addr'];
	var id = 'sta_' + ip.replace(/\./g, '_');

	var vlan = "none";
	if (vlan in data)
		vlan = data['vlan'];

	if (evt.event == "arp_new_sta") {

		if (this.sta[ip] !== undefined)
			return; // We already know about this station

		// Found a new station, add it to our list
		this.sta[ip] = data;



		this.elem.find('tbody').append('<tr id="' + id + '"><td>' + ip + '</td><td>' + data['mac_addr'] + '</td><td>' + vlan + '</td><td>' + pomngUI.timeval_toString(evt.timestamp) + '</td></tr>');

	} else if (evt.event == "arp_sta_changed") {
		var elem = $('#' + id);
		if (!elem.length) {
			this.elem.find('tbody').append('<tr id="' + id + '"><td>' + ip + '</td><td>' + data['new_mac_addr'] + '</td><td>' + vlan + '</td><td>' + pomngUI.timeval_toString(evt.timestamp) + '</td></tr>');
		} else {
			elem.html('<td>' + ip + '</td><td style="color:red">' + data['old_mac_addr'] + ' -> ' + data['new_mac_addr'] + '</td><td>' + vlan + '</td><td>' + pomngUI.timeval_toString(evt.timestamp) + '</td>');
		}
	}

}

//
// WALL OF SHEEP
//


weboutput.wallofsheep = function(elem) {
	this.elem = elem;
	this.elem.html('<h2>Output Wall Of Sheep</h2><table class="ui-widget ui-widget-content ui-table"><thead><tr class="ui-widget-header"><td>Protocol</td><td>Client</td><td>Server</td><td>Username</td><td>Password</td><td>Details</td><td>Timestamp</td></td></tr></thead><tbody></tbody></table>');

	this.eventListen("http_request", "data.username && data.password", null, weboutput.wallofsheep.process_event);
	this.eventListen("smtp_auth", "data.params[username] && data.params[password]", null, weboutput.wallofsheep.process_event);
	this.eventListen("ppp_pap_auth", null, null, weboutput.wallofsheep.process_event);
}


weboutput.wallofsheep.description = "Show unencrypted passwords."
weboutput.wallofsheep.prototype = new weboutput();
weboutput.wallofsheep.prototype.constructor = weboutput.wallofsheep;

weboutput.wallofsheep.process_event = function(evt) {

	var data = evt.data;
	var url = data['server_name'] + data['url'];

	if (evt.event == "http_request") {

		var status = data['status'];
		if (!status)
			status = "unknown";

		this.elem.find('tbody').append('<tr><td>HTTP</td><td>' + data['client_addr'] + '</td><td>' + data['server_name'] + '</td><td>' + data['username'] + '</td><td>' + data['password'] + '</td><td><a href="http://' + data['username'] + ':' + data['password'] + '@' + url + '" target="_blank">http://' + url + '</a> (status : ' + status + ')</td><td>' + pomngUI.timeval_toString(evt.timestamp) + '</td></tr>');

	} else if (evt.event == "smtp_auth") {

		var server = data['server_host'];
		if (typeof server == "undefined")
			server = data['server_addr'];

		var params = data['params'];

		var username, password;

		for (var i = 0; i < params.length; i++) {
			if (params[i].key == "username")
				username = params[i].value;
			else if (params[i].key == "password")
				password = params[i].value;
		}

		var success = "success";
		if (!data['success'])
			success = "auth failure";

		this.elem.find('tbody').append('<tr><td>SMTP</td><td>' + data['client_addr'] + '</td><td>' + server + '</td><td>' + username + '</td><td>' + password  + '</td><td>Method : ' + data['type'] + ', status : ' + success + '</td><td>' + pomngUI.timeval_toString(evt.timestamp) + '</td></tr>');
	} else if (evt.event == "ppp_pap_auth") {
		
		var details = 'Auth';
		if (data['top_proto'])
			details += ' over protocol ' + data['top_proto'];

		if (data['vlan'])
			detail += ' on vlan ' + data['vlan'];

		var success = 'unknown';
		if (data['success'] === true)
			success = 'success';
		else if (data['success'] == false)
			success = 'auth failure';

		details += ' status : ' + success;

		this.elem.find('tbody').append('<tr><td>PPP-PAP</td><td>' + data['client'] + '</td><td>' + data['server'] + '</td><td>' + data['peer_id'] + '</td><td>' + data['password'] + '</td><td>' + details + '</td><td>' + pomngUI.timeval_toString(evt.timestamp) + '</td></tr>');

	}

}


//
// IMAGES
//



weboutput.images = function(elem) {
	this.elem = elem;
	this.elem.html('<h2>Output Images</h2><div id="toolbar"></div><div id="content"></div>');

	this.content = this.elem.find("#content");

	this.content.delegate("img", "click", function() {
		var pn = this.parentNode
		$(pn).find("#details").toggle();
	});

	this.filter = "data.height >= 200 && data.width >= 200";

	this.max_img = 20;
	this.images = [];

	pomng.monitor.ploadEventsListenStart();
	this.ploadListen(this.filter, this.process_pload);

}


weboutput.images.description = "Show captured images.";
weboutput.images.prototype = new weboutput();
weboutput.images.prototype.constructor = weboutput.images;

weboutput.images.prototype.parse_data = function(data) {

	var i;
	var html = "";

	var keys = Object.keys(data).sort();

	for (i = 0; i < keys.length; i++) {
		var key = keys[i];
		var item = data[key];
		if ($.isArray(item)) {
			// Array containing a list of data
			html += key + ' : array (TODO)';
		} else if ($.isPlainObject(item)) {
			// It's a timestamp
			html += key + ' : ' + pomngUI.timeval_toString(item);
		} else {
			html += key + ' : ' + pomng.htmlEscape(item);
		}

		html += '<br/>';

	}

	return html;
}

weboutput.images.prototype.process_pload = function(listener_id, pload) {

	var html = '<div id="img_' + pload.id + '" class="ui-widget ui-widget-content"><img title="Click for details" class="weboutput_images_img" src="/pload/' + pload.id + '"/><div class="weboutput_images_content" id="details">';
	
	html += '<h4>Data :</h4><p>';

	html += this.parse_data(pload.data);

	html += '</p>';
	
	html += '<h4>Event :</h4><p>';

	var evt = pload.rel_event;

	html += this.parse_data(evt.data);

	html += '</p>';

	
	html += '</div></div>';

	this.content.append(html);
	var elem = this.content.find('#img_' + pload.id);
	this.images.push({listener: listener_id, pload: pload, elem: elem });

	if (this.images.length > this.max_img) {
		var img = this.images.shift();
		img.elem.remove();
		pomng.monitor.ploadDiscard(img.listener, img.pload.id);
	}

}

//
// CALLS
//

weboutput.calls = function(elem) {
	this.elem = elem;
	this.elem.html('<h2>Output calls</h2><table class="ui-widget ui-widget-content ui-table"><thead><tr class="ui-widget-header"><td>Timestamp</td><td>From Name</td><td>Fom URI</td><td>To Name</td><td>To URI</td><td>Call-ID</td><td>Complete</td></tr></thead><tbody></tbody></table>');
	this.sta = {};

	this.eventListen("sip_call", null, weboutput.calls.process_event, weboutput.calls.process_event);
}

weboutput.calls.description = "Show VOIP calls.";
weboutput.calls.prototype = new weboutput();
weboutput.calls.prototype.constructor = weboutput.calls;


weboutput.calls.process_event = function(evt) {

	var data = evt.data;

	var from = pomng.htmlEscape(data['from_display']);
	var from_uri = pomng.htmlEscape(data['from_uri']);
	var to = pomng.htmlEscape(data['to_display']);
	var to_uri = pomng.htmlEscape(data['to_uri']);
	var call_id = pomng.htmlEscape(data['call_id']);

	var id = 'call_' + call_id.replace(/[\.:@]/g, '_');


	if (!evt.done) {
		this.elem.find('tbody').append('<tr id="' + id + '"><td>' + pomngUI.timeval_toString(evt.timestamp) + '</td><td>' + from + '</td><td>' + from_uri + '</td><td>' + to + '</td><td>' + to_uri + '</td><td>' + call_id + '</td><td id="complete">No</td></tr>');

	} else {
		var elem = $('#' + id + " #complete");
		if (!elem.length) {
			this.elem.find('tbody').append('<tr id="' + id + '"><td>' + pomngUI.timeval_toString(evt.timestamp) + '</td><td>' + from + '</td><td>' + from_uri + '</td><td>' + to + '</td><td>' + to_uri + '</td><td>' + call_id + '</td><td id="complete">Yes</td></tr>');
		} else {
			elem.text("Yes");
		}
	}

}

