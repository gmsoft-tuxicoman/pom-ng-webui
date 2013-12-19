
var pomng = {};
pomng.registry = {};

pomng.title = "POM-NG WebUI";
pomng.url = "/RPC2";
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
	alert("An error occured : " + error);
}

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

pomng.init = function() {


	pomng.serials = [];
	pomng.serials["main"] = 0;
	pomng.registry.classes = {};
	pomng.registry.loading = 0;

	pomng.poll_failed = 0;

	// Start polling
	pomng.poll();

}

pomng.poll = function() {

	$.xmlrpc({
		url: pomng.url,
		methodName: "core.serialPoll",
		success: function (response, status, jqXHR) {

			pomng.poll_failed = 0;

			var serials = response[0];

			if (pomng.serials["registry"] != serials["registry"]) {
				pomng.registry.update();
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

	if (jqXHR.status == 0) {
		// The request was aborted
		// Happens when the page is reloaded
		return;
	}

	
	var event = new CustomEvent("pomng.conn_error", { detail: { status: jqXHR.status, error: error }});
	window.dispatchEvent(event);

	alert("Polling failed ! Status : " + jqXHR.status + " | " + error);
}

$(document).ready( function() {
	pomngUI.init();
	pomng.init();
});

