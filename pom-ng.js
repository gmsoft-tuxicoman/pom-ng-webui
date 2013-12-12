
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

	pomng.registry.classes[cls].instances[instance.name] = instance;
	pomng.registry.classes[cls].instances[instance.name].parameters = pomng.registry.nameMap(instance.parameters);
	pomng.registry.classes[cls].instances[instance.name].performances = pomng.registry.nameMap(instance.performances);

	pomngUI.registry.updateClass("div#registry", cls);

}

pomng.registry.addInstance = function (cls_name, instance_name, instance_type) {

	pomng.call("registry.addInstance", function(response, status, jqXHR) {
		pomng.registry.updateInstance(pomng.registry.classes[cls_name], instance_name);
		alert("instance " + instance_name + " added");
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

				var cls = rsp["classes"];



				for (var i = 0; i < cls.length; i++) {

		
					if (pomng.registry.classes[cls[i].name] !== undefined && cls.serial == pomng.registry.classes[cls[i].name].serial)
						continue;

					var instances = cls[i].instances;
					cls[i].instances = {};

					for (var j = 0; j < instances.length; j++) {
						pomng.registry.updateInstance(cls[i], instances[j].name);
					}

					cls[i].available_types = pomng.registry.nameMap(cls[i].available_types);
					cls[i].parameters = pomng.registry.nameMap(cls[i].parameters);
					cls[i].performances = pomng.registry.nameMap(cls[i].performances);

				}

				pomng.registry.classes = pomng.registry.nameMap(cls);
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

