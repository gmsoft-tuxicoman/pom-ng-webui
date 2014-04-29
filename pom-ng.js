$(document).ready( function() {
	pomngUI.init();
	pomng.init();
});

/*
 * Core stuff
 */
var pomng = {};
pomng.title = "POM-NG WebUI";
pomng.url = "/RPC2";

pomng.init = function() {


	pomng.serials = [];
	pomng.serials["registry"] = 0;
	pomng.serials["log"] = 0;
	pomng.registry.classes = {};
	pomng.registry.loading = 0;

	pomng.logs.last_id = 0;

	pomng.poll_failed = 0;

	// Start polling
	pomng.poll();

}

pomng.call = function(method, success, params, context) {
	return $.xmlrpc({
		url: this.url,
		methodName: method,
		success: success,
		params: params,
		context: context,
		error: pomng.call_error
	});
}

pomng.call_error = function(jqXHR, status, error) {

	if (jqXHR.status == 0) {
		// The request was aborted
		// Happens when the page is reloaded
		return;}

	alert("An error occurred : " + error);
}

pomng.poll = function() {

	$.xmlrpc({
		url: pomng.url,
		methodName: "registry.poll",
		success: function (response, status, jqXHR) {

			pomng.poll_failed = 0;

			var serial = response[0];

			if (pomng.serials["registry"] > serial) {
				// We need to reload everything since main serial decreased
				// It means the program was restarted 
				// Throw a connection error event
				var event = new CustomEvent("pomng.conn_error", { detail: { status: jqXHR.status, error: "Server side restarted" }});
				window.dispatchEvent(event);
				return;
			}

			if (pomng.serials["registry"] != serial) {
				pomng.registry.update();
			}

			pomng.serials["registry"] = serial;


			pomng.poll();

		},
		params: [ pomng.serials["registry"] ],
		error: pomng.poll_error,
	});
}

pomng.poll_error = function(jqXHR, status, error) {

	// If we aborted ourselfs, there is no cause for alarm !
	if (status == "abort")
		return;

	if ((jqXHR.status == 502 || jqXHR.status == 503) && pomng.poll_failed < 10) {
		// Most probably a timeout, restart polling after some time
		pomng.poll_failed++;
		setTimeout(pomng.poll, 1000);

		// If there is no answer in 30 sec, it means the polling is not returning
		setTimeout(function() { pomng.poll_failed = 0; }, 30000);
		return;
	}

	
	var event = new CustomEvent("pomng.conn_error", { detail: { status: jqXHR.status, error: error }});
	window.dispatchEvent(event);
}

/*
 * Registry related functions
 */
pomng.registry = {};
pomng.registry.nameMap = function(lst, key_str) {

	if (lst === undefined)
		return [];
	
	key_str = key_str || "name";

	var res = {};
	for (var i = 0; i < lst.length; i++) {
		var item = lst[i];
		res[item[key_str]] = item;
	}

	return res;
}

pomng.registry.updateInstance = function(cls, instance_name) {

	pomng.call("registry.getInstance", function(response, status, jqXHR) { pomng.registry.updateInstanceCB(this.name, response[0])}, [ cls.name, instance_name], cls);
}

pomng.registry.updateInstanceCB = function(cls, instance) {

	instance.parameters = pomng.registry.nameMap(instance.parameters);
	instance.performances = pomng.registry.nameMap(instance.performances);
	pomng.registry.classes[cls].instances[instance.name] = instance;

	var event = new CustomEvent("pomng.registry.instance.update", { detail: { cls_name: cls, instance_name: instance.name }});
	window.dispatchEvent(event);

	if (pomng.registry.loading !== undefined) {
		pomng.registry.loading--;
		if (pomng.registry.loading == 0) {
			event = new Event("pomng.registry.ready")
			window.dispatchEvent(event);
			delete pomng.registry.loading;
		}
	}

}

pomng.registry.addInstance = function (cls_name, instance_name, instance_type) {

	pomng.call("registry.addInstance", function(response, status, jqXHR) {

		var event = new CustomEvent("pomng.registry.instance.add", { detail: { cls_name: cls_name, instance_name: instance_name }});
		window.dispatchEvent(event);
	
		}, [ cls_name, instance_name , instance_type]);

}

pomng.registry.setInstanceParam = function(cls_name, instance_name, param_name, param_value) {
	pomng.call("registry.setInstanceParam", null, [ cls_name, instance_name, param_name, param_value ]);
}

pomng.registry.removeInstance = function(cls_name, instance_name) {
	pomng.call("registry.removeInstance", null, [ cls_name, instance_name ]);
}

pomng.registry.update = function() {

	pomng.call("registry.list",
		function (response, status, jqXHR) {
			var rsp = response[0]


			if (pomng.serials["configs"] != rsp.configs_serial) {
				// Update the config list
				pomng.registry.configs = pomng.registry.nameMap(rsp["configs"]);
				pomng.serials["configs"] = rsp.configs_serial;
				
				var event = new Event("pomng.registry.config.update");
				window.dispatchEvent(event);
			}

			if (pomng.serials["classes"] != rsp.classes_serial) {
				// Check the classes if the global classes serial changed

				var classes = rsp["classes"];

				for (var i = 0; i < classes.length; i++) {

					var cls = classes[i];

					if (pomng.registry.classes[cls.name] === undefined) {
						pomng.registry.classes[cls.name] = {};
						pomng.registry.classes[cls.name].name = cls.name;
					}

					// Don't check this class if it serial did not change
					if (cls.serial == pomng.registry.classes[cls.name].serial)
						continue;

					if (pomng.registry.classes[cls.name].instances === undefined)
						pomng.registry.classes[cls.name].instances = {};

					// Keep trace of all the instances we know about
					var old_instances = Object.keys(pomng.registry.classes[cls.name].instances);

					for (var j = 0; j < cls.instances.length; j++) {
						var instance = cls.instances[j];
						if (pomng.registry.classes[cls.name].instances[instance.name] === undefined ||
							pomng.registry.classes[cls.name].instances[instance.name].serial != instance.serial) {

							if (pomng.registry.loading !== undefined)
								pomng.registry.loading++;
							pomng.registry.updateInstance(pomng.registry.classes[cls.name], instance.name);
						}

						// Remove this instance from the known list
						var idx = old_instances.indexOf(instance.name);
						if (idx != -1)
							old_instances.splice(idx, 1);
					}

					pomng.registry.classes[cls.name].available_types = pomng.registry.nameMap(cls.available_types);
					pomng.registry.classes[cls.name].parameters = pomng.registry.nameMap(cls.parameters);
					pomng.registry.classes[cls.name].performances = pomng.registry.nameMap(cls.performances);
					pomng.registry.classes[cls.name].serial = cls.serial;

					// Send a delete item for all the intances that were not present in this update
					for (var j = 0; j < old_instances.length; j++) {
						delete pomng.registry.classes[cls.name].instances[old_instances[j]];
						var event = new CustomEvent("pomng.registry.instance.remove", { detail: { cls_name: cls.name, instance_name: old_instances[j] }});
						window.dispatchEvent(event);
					}

				}

				pomng.serials["classes"] = response[0].classes_serial;

			}
			

		}
	);
}


/*
 * Log related stuff
 */

pomng.logs = {};


pomng.logs.pollStart = function(log_level, max_results) {

	pomng.logs.ajax_req = $.xmlrpc({
		url: pomng.url,
		methodName: 'core.pollLog',
		success: function(response, status, jqXHR) {
			delete pomng.logs.ajax_req;
			var logs = response[0];

			for (var i = 0; i < logs.length; i++) {
				var log = logs[i];
				var event = new CustomEvent("pomng.logs.new", { detail: { entry: log } });
				window.dispatchEvent(event);
				if (pomng.logs.last_id < log.id)
					pomng.logs.last_id = log.id;
			}
			// Restart polling
			pomng.logs.pollStart(log_level, max_results);
		},

		params: [ pomng.logs.last_id, log_level, max_results ],
		error: pomng.poll_error
	});

}

pomng.logs.pollStop = function() {

	if (pomng.logs.ajax_req) {
		pomng.logs.ajax_req.abort();
		delete pomng.logs.ajax_req;
	}
	pomng.logs.entries = {};
	pomng.logs.last_id = 0;
}

/*
 * Monitoring stuff
 */

pomng.monitor = {};
pomng.monitor.poll_timeout = 60;
pomng.monitor.evt_listeners = {};
pomng.monitor.evt_listeners_pending = [];
pomng.monitor.pload_listeners = {};
pomng.monitor.pload_listeners_pending = [];
pomng.monitor.pload_events_listen = 0;
pomng.monitor.sess_id = -1;

pomng.monitor.start = function() {

	if (pomng.monitor.sess_id != -1)
		return;

	pomng.monitor.sess_id = -2;
	pomng.call("monitor.start", 
		function(response, status, jqXHR) {
			pomng.monitor.sess_id = response[0];

			// Register all the event listeners one by one
			pomng.monitor.eventListenerRegisterPending();

			// Register all pload listeners one by one
			pomng.monitor.ploadListenerRegisterPending();

			// Listen to the payload generating events if requested
			if (pomng.monitor.pload_events_listen)
				pomng.call("monitor.ploadEventsListen", null, [ pomng.monitor.sess_id, true ]);

			// Start polling
			pomng.monitor.poll();

	}, [ pomng.monitor.poll_timeout ]);
}

pomng.monitor.eventListenerRegisterPending = function() {

	
	var listener = pomng.monitor.evt_listeners_pending.shift();

	if (!listener)
		return;
	pomng.call("monitor.eventAddListener",
	
		function(response, status, jqXHR) {
			var id = response[0];
			pomng.monitor.evt_listeners[id] = { evt: listener.evt, callback: listener.callback, context: listener.context, enabled: true };
			listener.idCallback.call(listener.context, id);

			pomng.monitor.eventListenerRegisterPending();
		},
		
		[ pomng.monitor.sess_id, listener.evt, listener.filter ]);

}

pomng.monitor.eventListenerRegister = function(evt, filter, callback, context, idCallback) {

	if (typeof filter != "string")
		filter = "";

	
	if (pomng.monitor.sess_id >= 0) {
		pomng.call("monitor.eventAddListener", function(response, status, jqXHR) {
				var id = response[0];
				pomng.monitor.evt_listeners[id] = { evt: evt, callback: callback, context: context, idCallback: idCallback, enabled: true };
				idCallback.call(context, id);
			}, [ pomng.monitor.sess_id, evt, filter ]);
	} else {

		// Add the listener to the pending list
		pomng.monitor.evt_listeners_pending.push({evt: evt, filter: filter, callback: callback, context: context, idCallback: idCallback });

		pomng.monitor.start();
	}

}

pomng.monitor.ploadListenerRegisterPending = function() {

	var listener = pomng.monitor.pload_listeners_pending.shift();

	if (!listener)
		return;

	pomng.call("monitor.ploadAddListener",

		function(response, status, jqXHR) {
			var id = response[0];
			pomng.monitor.pload_listeners[id] = { callback: listener.callback, context : listener.context, enabled : true };
			listener.idCallback.call(listener.context, id);

			pomng.monitor.ploadListenerRegisterPending();
		},

		[ pomng.monitor.sess_id, listener.filter ]);

}

pomng.monitor.ploadListenerRegister = function(filter, callback, context, idCallback) {

	if (typeof filter != "string")
		filter = "";

	if (pomng.monitor.sess_id >= 0) {
		pomng.call("monitor.ploadAddListener", function(response, status, jqXHR) {
				var id = response[0];
				pomng.monitor.pload_listeners[id] = { callback: callback, context: context, idCallback: idCallback, enabled: true };
			}, [ pomng.monitor.sess_id, filter ]);

	} else {
		// Add the listener to the pending list
		pomng.monitor.pload_listeners_pending.push({filter: filter, callback: callback, context: context, idCallback: idCallback });

		pomng.monitor.start();

	}

}

pomng.monitor.eventListenerUnregister = function(id) {

	pomng.monitor.evt_listeners[id].enabled = false;

	pomng.call("monitor.eventRemoveListener", 
		function (response, status, jqXHR) {
			delete pomng.monitor.evt_listeners[id];

			// Stop if nothing is monitored
			pomng.monitor.stop();

		}, [ pomng.monitor.sess_id, $.xmlrpc.force('i8', id) ]);

}

pomng.monitor.ploadEventsListenStart = function() {

	if (!pomng.monitor.pload_events_listen && pomng.monitor.sess_id >= 0)
		pomng.call("monitor.ploadEventsListen", null, [ pomng.monitor.sess_id, true ]);

	pomng.monitor.pload_events_listen++;

}

pomng.monitor.ploadEventsListenStop = function() {

	pomng.monitor.pload_events_listen--;

	if (!pomng.monitor.pload_events_listen && pomng.monitor.sess_id >= 0)
		pomng.call("monitor.ploadEventsListen", null, [ pomng.monitor.sess_id, false ]);


}

pomng.monitor.ploadListenerUnregister = function(id) {

	pomng.monitor.pload_listeners[id].enabled = false;

	pomng.call("monitor.ploadRemoveListener",
		function (response, status, jqXHR) {
			delete pomng.monitor.pload_listeners[id];

			// Stop if nothing is being monitored
			pomng.monitor.stop();

		}, [ pomng.monitor.sess_id, $.xmlrpc.force('i8', id) ]);
}

pomng.monitor.stop = function() {

	if (Object.keys(pomng.monitor.evt_listeners).length == 0 &&
		Object.keys(pomng.monitor.pload_listeners).length == 0) {
		
		pomng.call("monitor.stop", null, [ pomng.monitor.sess_id ]);
		pomng.monitor.sess_id = -1;
	}	
}


pomng.monitor.poll = function() {
	$.xmlrpc({
		url: pomng.url,
		methodName: "monitor.poll",
		success: function (response, status, jqXHR) {
			var rsp = response[0];
			var evts = rsp.events || [];
			for (var i = 0; i < evts.length; i++) {
				var evt = evts[i];
				var evt_listeners_id = evt.listeners;
				for (var j = 0; j < evt_listeners_id.length; j++) {
					var id = evt_listeners_id[j];
					if (!id in pomng.monitor.evt_listeners)
						// Listener not found
						continue;
					var listener = pomng.monitor.evt_listeners[id];
					if (listener.enabled)
						listener.callback.call(listener.context, evt);
				}
			}

			var ploads = rsp.ploads || [];
			for (var i = 0; i < ploads.length; i++) {
				var pload = ploads[i];
				var pload_listeners_id = pload.listeners;
				for (var j = 0; j < pload_listeners_id.length; j++) {
					var id = pload_listeners_id[j];
					if (!id in pomng.monitor.pload_listeners)
						// Listener not found
						continue;
					var listener = pomng.monitor.pload_listeners[id];
					if (listener.enabled)
						listener.callback.call(listener.context, pload);
				}
			}

			// Restart polling if we are monitoring stuff
			if (Object.keys(pomng.monitor.evt_listeners).length > 0 || Object.keys(pomng.monitor.pload_listeners).length > 0)
				pomng.monitor.poll();
		},

		params: [ pomng.monitor.sess_id ],
		error: pomng.monitor.poll_error
	});

}

pomng.monitor.poll_error = function(jqXHR, status, error) {


	if ((jqXHR.status == 502 || jqXHR.status == 503) && pomng.poll_failed < 10) {
		// Most probably a timeout, restart polling after some time
		// Error handling will be dealt by the main polling connection
		setTimeout(pomng.monitor.poll, 1000);
		return;

	} else if (jqXHR.status == 0) {
		// The request was aborted
		// Happens when the page is reloaded
		return;
	}

	// TODO improve error message and handling
	alert("Monitor polling failed ! Status : " + status);

}

pomng.htmlEscape = function(str) {
	var div = document.createElement('div');
	div.appendChild(document.createTextNode(str));
	return div.innerHTML;
}
