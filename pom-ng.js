
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
	pomng.serials["main"] = 0;
	pomng.serials["log"] = 0;
	pomng.registry.classes = {};
	pomng.registry.loading = 0;

	pomng.logs.entries = {};

	pomng.poll_failed = 0;

	// Start polling
	pomng.poll();

}

pomng.call = function(method, success, params, context) {
	$.xmlrpc({
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
		methodName: "core.serialPoll",
		success: function (response, status, jqXHR) {

			pomng.poll_failed = 0;

			var serials = response[0];

			if (pomng.serials["main"] > serials["main"]) {
				// We need to reload everything since main serial decreased
				// It means the program was restarted 
				// Throw a connection error event
				var event = new CustomEvent("pomng.conn_error", { detail: { status: jqXHR.status, error: error }});
				window.dispatchEvent(event);
				return;
			}

			if (pomng.serials["registry"] != serials["registry"]) {
				pomng.registry.update();
			}

			if (pomng.serials["log"] != serials["log"]) {
				pomng.logs.update();
			}

			pomng.serials = serials;


			pomng.poll();

		},
		params: [ pomng.serials["main"] ],
		error: pomng.poll_error,
	});
}

pomng.poll_error = function(jqXHR, status, error) {

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
						pomng.registry.classes[cls.name].instances[old_instances[j]] = undefined;
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
pomng.logs.update = function() {

	pomng.call("core.getLog",
		function (response, status, jqXHR) {
			var logs = response[0];

			for (var i = 0; i < logs.length; i++) {
				var log = logs[i];
				pomng.logs.entries[log.id] = log;
				var event = new CustomEvent("pomng.logs.new", { detail: { id: log.id } });
				window.dispatchEvent(event);
			}

		},
		[ pomng.serials["log"] ]);

}



/*
 * Monitoring stuff
 */

pomng.monitor = {};
pomng.monitor.poll_timeout = 60;
pomng.monitor.evt_listeners = {};
pomng.monitor.sess_id = -1;
pomng.monitor.eventListenerRegister = function(name, callback, context) {

	if (pomng.monitor.sess_id == -1) {
		// Start a monitor session
		pomng.monitor.sess_id = -2;
		pomng.call("evtmon.start", 
			function(response, status, jqXHR) {
				pomng.monitor.sess_id = response[0];
				// Register all the events
				var event_names = Object.keys(pomng.monitor.evt_listeners);
				for (var i = 0; i < event_names.length; i++) {
					var evt_listeners = pomng.monitor.evt_listeners[event_names[i]];
					for (var j = 0; j < evt_listeners.length; j++) {
						pomng.call("evtmon.add", null, [ pomng.monitor.sess_id, evt_listeners[j].name]);
					}
				}
				pomng.monitor.poll();

			}, [ pomng.monitor.poll_timeout ]);

	} else if (pomng.monitor.sess_id >= 0) {
		pomng.call("evtmon.add", null, [ pomng.monitor.sess_id, name]);
	}


	
	if (!(name in pomng.monitor.evt_listeners))
		pomng.monitor.evt_listeners[name] = [];

	pomng.monitor.evt_listeners[name].push({name: name, callback: callback, context: context});

}

pomng.monitor.eventListenerUnregister = function(name, context) {

	var listeners = pomng.monitor.evt_listeners[name];

	for (var i = 0; i < listeners.length; i++) {
		if (listeners[i].context == context) {
			listeners.splice(i, 1);
			break;
		}
	}

	if (listeners.length == 0) {
		// Remove the event from the monitoring list
		delete pomng.monitor.evt_listeners[name];
		pomng.call("evtmon.remove", null, [ pomng.monitor.sess_id, name]);
	}

	if (Object.keys(pomng.monitor.evt_listeners).length == 0) {
		// Nothing is being monitored. Stop polling
		pomng.call("evtmon.stop", null, [ pomng.monitor.sess_id ]);
		pomng.monitor.sess_id = -1;		
	}


}

pomng.monitor.poll = function() {
	$.xmlrpc({
		url: pomng.url,
		methodName: "evtmon.poll",
		success: function (response, status, jqXHR) {
			var rsp = response[0];
			for (var i = 0; i < rsp.length; i++) {
				var rspevt = rsp[i];
				var evt_listeners = pomng.monitor.evt_listeners[rspevt['event']];
				for (var j = 0; j < evt_listeners.length; j++)
					evt_listeners[j].callback.call(evt_listeners[j].context, rspevt);
			}

			// Restart polling if we are monitoring stuff
			if (Object.keys(pomng.monitor.evt_listeners).length > 0)
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
	alert("Monitor polling failed !");

}
