
var pomng = {};
pomng.registry = {};

pomng.title = "POM-NG WebUI";
pomng.url = "/RPC2";
pomng.call = function(method, success, params = null, context = null) {
	$.xmlrpc({
		url: this.url,
		methodName: method,
		success: success,
		params: params,
		context: context,
		error: function(jqXHR, status, error) { alert("An error occured : " + error); }
	});
}

pomng.registry.nameMap = function(lst, key_str = "name") {

	if (typeof(lst) == "undefined")
		return [];

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

//	pomngUI.registry.updateClass("#tab_registry", cls);

}

pomng.registry.addInstance = function (cls_name, instance_name, instance_type) {

	pomng.call("registry.addInstance", function(response, status, jqXHR) {

	//	pomng.registry.updateInstance(pomng.registry.classes[cls_name], instance_name);
	//
		var event = new CustomEvent("pomng.registry.instance.new", { detail: { cls_name: cls_name, instance_name: instance_name }});
		window.dispatchEvent(event);
	
		}, [ cls_name, instance_name , instance_type]);

}

pomng.registry.update = function() {

	pomng.call("registry.list",
		function (response, status, jqXHR) {
			var rsp = response[0]


			if (pomng.serials["configs"] != rsp.configs_serial) {
				// Update the config list
				pomng.registry.configs = pomng.registry.nameMap(rsp["configs"]);
				pomng.serials["configs"] = rsp.configs_serial;

			}

			if (pomng.serials["classes"] != rsp.classes_serial) {

				var classes = rsp["classes"];

				for (var i = 0; i < classes.length; i++) {

					var cls = classes[i];

					if (pomng.registry.classes[cls.name] === undefined) {
						pomng.registry.classes[cls.name] = {};
						pomng.registry.classes[cls.name].name = cls.name;
					}


					if (cls.serial == pomng.registry.classes[cls.name].serial)
						continue;

					if (pomng.registry.classes[cls.name].instances === undefined)
						pomng.registry.classes[cls.name].instances = {};

					for (var j = 0; j < cls.instances.length; j++) {
						var instance = cls.instances[j];
						if (pomng.registry.classes[cls.name].instances[instance.name] === undefined ||
							pomng.registry.classes[cls.name].instances[instance.name].serial != instance.serial)
							pomng.registry.updateInstance(pomng.registry.classes[cls.name], instance.name);
					}

					pomng.registry.classes[cls.name].available_types = pomng.registry.nameMap(cls.available_types);
					pomng.registry.classes[cls.name].parameters = pomng.registry.nameMap(cls.parameters);
					pomng.registry.classes[cls.name].performances = pomng.registry.nameMap(cls.performances);
					pomng.registry.classes[cls.name].serial = cls.serial;

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
	pomng.registry.ui_need_init = true;

	// Start polling
	pomng.poll();

}

pomng.poll = function() {

	pomng.call("core.serialPoll",
		function (response, status, jqXHR) {
			var serials = response[0];

			if (pomng.serials["registry"] != serials["registry"]) {
				pomng.registry.update();
			}

			pomng.serials = serials;


			pomng.poll();

		},
		[ pomng.serials["main"] ]

	);
}

$(document).ready( function() {
	pomngUI.init();
	pomng.init();
});

