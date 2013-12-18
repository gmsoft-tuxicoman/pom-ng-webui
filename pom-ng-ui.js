
var pomngUI = {};

pomngUI.init = function () {


	// Update the title
	pomng.call("core.getVersion",
		function (response, status, jqXHR) {
			pomng.version = response[0];
			document.title = pomng.title + " - Connected to version " + pomng.version; }
	);

	pomngUI.summary.init();
	pomngUI.dialog.init();
	pomngUI.registry.init();
	pomngUI.config.init();

	$("#menu").tabs();
	
	$("#menu").addClass("ui-tabs-vertical ui-helper-clearfix");
	$("#menu").removeClass("ui-widget-content");

	window.addEventListener("pomng.conn_error", function(event) { document.title = pomng.title + " - CONNECTION ERROR | Reload the page to reconnect"; });

}


/*
 * Registry view
 */

pomngUI.registry = {};

pomngUI.registry.init = function() {

	window.addEventListener("pomng.registry.ready", pomngUI.registry.evtReady);

}

pomngUI.registry.evtReady = function(event) {

	var clss_name = Object.keys(pomng.registry.classes).sort();

	for (var i = 0; i < clss_name.length; i++) {
		var cls = pomng.registry.classes[clss_name[i]];

		var addButton = "";
		html = '<div id="cls_' + cls.name + '"><span id="cls_icon" class="ui-icon ui-icon-triangle-1-e icon-btn" onclick="pomngUI.registry.instanceToggle(\'' + cls.name + '\')"/><span onclick="pomngUI.registry.classDetail(\'' + cls.name + '\')" style="cursor:pointer">' + cls.name + '</span><div id="cls_inst_' + cls.name + '" class="ui-widget-content ui-corner-all" style="margin-left:16px;display:none;padding-right:3px"></div></div>';
		$("#registry").append(html);

		var instances_name = Object.keys(cls.instances).sort();
		for (var j = 0; j < instances_name.length; j++)
			pomngUI.registry.updateInstance(cls.name, instances_name[j]);

	}

	window.addEventListener("pomng.registry.instance.update", function(event) { pomngUI.registry.updateInstance(event.detail.cls_name, event.detail.instance_name) });
	window.addEventListener("pomng.registry.instance.remove", pomngUI.registry.evtRemoveInstance);
}

pomngUI.registry.instanceToggle = function(cls_name) {

	var inst_elem = $("#registry #cls_inst_" + cls_name);
	var icon_elem = $("#registry #cls_" + cls_name + " #cls_icon");
	if (inst_elem.is(":visible")) {
		inst_elem.hide();
		icon_elem.removeClass("ui-icon-triangle-1-s");
		icon_elem.addClass("ui-icon-triangle-1-e");
	} else {
		inst_elem.show();
		icon_elem.removeClass("ui-icon-triangle-1-e");
		icon_elem.addClass("ui-icon-triangle-1-s");
	}

}

pomngUI.registry.classDetail = function(cls_name) {

	if (!$("#registry #cls_inst_" + cls_name).is(":visible"))
		pomngUI.registry.instanceToggle(cls_name);

	var html = '<h2 class="details">Class ' + cls_name + '</h2>';

	var cls = pomng.registry.classes[cls_name];


	// Show the parameters
	var params_name = Object.keys(cls.parameters).sort();

	html += '<h3 class="details">Parameters :</h3>';

	if (params_name.length > 0) {
		html += '<table class="ui-widget ui-widget-content ui-table"><thead><tr class="ui-widget-header"><td>Name</td><td>Value</td><td>Type</td><td>Description</td></tr></thead><tbody>';
		for (var i = 0; i < params_name.length; i++) {
			var param = cls.parameters[params_name[i]];
			html += '<tr><td>' + param.name + '</td><td>' + param.value + '</td><td>' + param.type + '</td><td>' + param.description + '</td></tr>';
		}

		html += '</tbody></table>';

	} else {
		html += '<div>No parameter for this class</div>';
	}


	// Show the instances
	html += '<h3 class="details">Instances :</h3>';

	var instances_name = Object.keys(cls.instances).sort();

	if (instances_name.length > 0) {
		
		var inst1_params = cls.instances[instances_name[0]].parameters;
		var has_type = false;
		var has_running = false;
		var has_uid = false;

		html += '<table class="ui-widget ui-widget-content ui-table"><thead><tr class="ui-widget-header"><td>Name</td>';
		
		if (inst1_params['type'] !== undefined) {
			html += '<td>Type</td>';
			has_type = true;
		}
			
		if (inst1_params['running'] !== undefined) {
			html += '<td>Running</td>';
			has_running = true;
		}

		if (inst1_params['uid'] !== undefined) {
			html += '<td>UID</td>';
			has_uid = true;
		}
			
		// html += '<td>Description</td>';
		
		html += '</tr></thead><tbody>';

		for (var i = 0; i < instances_name.length; i++) {
			var inst = cls.instances[instances_name[i]];
			html += '<tr><td>' + inst.name + '</td>';

			if (has_type)
				html += '<td>' + inst.parameters['type'].value + '</td>';
			
			if (has_running)
				html += '<td>' + inst.parameters['running'].value + '</td>';
			
			if (has_uid)
				html += '<td>' + inst.parameters['uid'].value + '</td>'
			
			html += '</tr>';
		}

		html += '</tbody></table>';

	} else {
		html += '<div>No instances for this class</div>';
	}

	// Show the performances
	html += '<h3 class="details">Performance objects :</h3>';

	var perfs_name = Object.keys(cls.performances).sort();

	if (perfs_name.length > 0) {
		html += '<table class="ui-widget ui-widget-content ui-table"><thead><tr class="ui-widget-header"><td>Name</td><td>Type</td><td>Unit</td><td>Description</td></tr></thead><tbody>';

		for (var i = 0; i < perfs_name.length; i++) {
			var perf = cls.performances[perfs_name[i]];
			html += '<tr><td>' + perf.name + '</td><td>' + perf.type + '</td><td>' + perf.unit + '</td><td>' + perf.description + '</td></tr>';
		}
		html += '</tbody></table>';

	} else {
		html += '<div>No performance object for this class</div>';
	}

	$("#tab_registry #detail").html(html);

}

pomngUI.registry.instanceDetail = function(cls_name, inst_name) {

	var html = '<h2 class="details">Instance ' + inst_name + ' from class ' + cls_name + '</h2>';

	var inst = pomng.registry.classes[cls_name].instances[inst_name];

	var params_name = Object.keys(inst.parameters).sort();

	html += '<h3 class="details">Parameters :</h3>';

	if (params_name.length > 0) {
		html += '<table class="ui-widget ui-widget-content ui-table"><thead><tr class="ui-widget-header"><td>Name</td><td>Value</td><td>Type</td><td>Description</td></tr></thead><tbody>';
		for (var i = 0; i < params_name.length; i++) {
			var param = inst.parameters[params_name[i]];
			html += '<tr><td>' + param.name + '</td><td>' + param.value + '</td><td>' + param.type + '</td><td>' + param.description + '</td></tr>';
		}

		html += '</tbody></table>';

	} else {
		html += '<div>No parameter for this instance</div>';
	}

	// Show the performances
	html += '<h3 class="details">Performance objects :</h3>';

	var perfs_name = Object.keys(inst.performances).sort();

	if (perfs_name.length > 0) {
		html += '<table class="ui-widget ui-widget-content ui-table"><thead><tr class="ui-widget-header"><td>Name</td><td>Type</td><td>Unit</td><td>Description</td></tr></thead><tbody>';

		for (var i = 0; i < perfs_name.length; i++) {
			var perf = inst.performances[perfs_name[i]];
			html += '<tr><td>' + perf.name + '</td><td>' + perf.type + '</td><td>' + perf.unit + '</td><td>' + perf.description + '</td></tr>';
		}
		html += '</tbody></table>';

	} else {
		html += '<div>No performance object for this class</div>';
	}

	$("#tab_registry #detail").html(html);
}

pomngUI.registry.updateInstance = function(cls_name, inst_name) {

	// Add the instance
	
	var inst_elem = $("#registry #cls_inst_" + cls_name + " #inst_" + inst_name);

	if (inst_elem.length > 0)
		return; // The element already exists

	var instHtml = '<div id="inst_' + inst_name + '"><span class="ui-icon ui-icon-carat-1-e icon-btn"/><span onclick="pomngUI.registry.instanceDetail(\'' + cls_name + '\', \'' + inst_name + '\')" style="cursor:pointer">' + inst_name + '</div>';

	$("#registry #cls_inst_" + cls_name).append(instHtml);

}

pomngUI.registry.evtRemoveInstance = function(event) {

	var cls_name = event.detail.cls_name;
	var inst_name = event.detail.instance_name;

	var elem_str = "#registry #cls_inst_" + cls_name + " #inst_" + inst_name;
	$(elem_str).remove();

}

/*
 * Dialog handling
 */

pomngUI.dialog = {};

pomngUI.dialog.init = function() {

	pomngUI.dialog.config_list = [];

	window.addEventListener("pomng.registry.instance.add", function(event) { pomngUI.dialog.config_list.push({ cls: event.detail.cls_name, instance: event.detail.instance_name})});
	window.addEventListener("pomng.registry.instance.update", pomngUI.dialog.evtUpdateInstance);

	$("#dlg_loading").dialog({
		resizable: false,
		modal: true,
		width: "auto",
		title: "Loading ...",
		dialogClass: "no-close"
	});

	window.addEventListener("pomng.registry.instance.update", pomngUI.dialog.loading);
	window.addEventListener("pomng.registry.ready", function(event) {
		$("#dlg_loading").dialog("close");
		window.removeEventListener("pomng.registry.instance.update", pomngUI.dialog.loading);
		});

}

pomngUI.dialog.loading = function(event) {
	$("#dlg_loading #remaining").html("Remaining instances : " + pomng.registry.loading);
}

pomngUI.dialog.evtUpdateInstance = function(event) {
	
	for (var i = 0; i < pomngUI.dialog.config_list.length; i++) {
		if (pomngUI.dialog.config_list[i].cls == event.detail.cls_name &&
			pomngUI.dialog.config_list[i].instance == event.detail.instance_name) {
			pomngUI.dialog.config_list.splice(i, 1);
			pomngUI.dialog.instanceParameter(event.detail.cls_name, event.detail.instance_name);
			break;
		}
	}

}

pomngUI.dialog.instanceAdd = function(cls_name) {

	
	var options = ""
	var avail_types = Object.keys(pomng.registry.classes[cls_name].available_types);
	for (var i = 0; i < avail_types.length; i++)
		options += '<option value="' + avail_types[i] + '">' + avail_types[i] + '</option>';

	$("#dlg_add #instance_type").html(options);
	$("#dlg_add #instance_name").val("");
	$("#dlg_add").dialog({
		resizable: false,
		modal: true,
		width: "auto",
		title: "Add an instance of " + cls_name,

		buttons: {
			"Add": function() {
				var type = $("#dlg_add #instance_type").val();
				var name = $("#dlg_add #instance_name").val();
				if (name.length == 0) {
					alert("You must specify a name");
					return;
				}
				pomng.registry.addInstance(cls_name, name, type);
				$(this).dialog("close");
			},
			Cancel: function() {
				$(this).dialog("close");
			}
		}
	});

}

pomngUI.dialog.instanceParameter = function(cls_name, inst_name) {

	var params = pomng.registry.classes[cls_name].instances[inst_name].parameters;

	var paramsHtml = "";

	var params_name = Object.keys(params).sort();

	for (var i = 0; i < params_name.length; i++) {
		if (params_name[i] == 'type' || params_name[i] == 'uid' || params_name[i] == 'running')
			continue; // No need to display these params

		var param = params[params_name[i]];

		paramsHtml += '<tr><td>' + param.name + '</td><td>' + param.type + '</td><td><input id="val_' + param.name + '" type="text" value="' + param.value + '"/></td><td>' + param.description + '</td></tr>';

	}
		

	$("#dlg_inst_param tbody").html(paramsHtml);

	$("#dlg_inst_param").dialog({
		resizable: false,
		modal: true,
		width: "auto",
		title: "Parameters of " + cls_name + " " + inst_name,

		buttons: {
			OK: function() {
				pomngUI.dialog.instanceParameterOK(cls_name, inst_name)
					$(this).dialog("close");
			},
			Cancel: function() {
				$(this).dialog("close");
			}
		}
	});
}

pomngUI.dialog.instanceParameterOK = function(cls_name, inst_name) {


	var params = pomng.registry.classes[cls_name].instances[inst_name].parameters;

	var params_name = Object.keys(params).sort();

	for (var i = 0; i < params_name.length; i++) {
		if (params_name[i] == 'type' || params_name[i] == 'uid' || params_name[i] == 'running')
			continue;

		var value = $("#dlg_inst_param #val_" + params_name[i]).val();
		if (value != params[params_name[i]].value)
			pomng.registry.setInstanceParam(cls_name, inst_name, params_name[i], value);
	}
}

pomngUI.dialog.instanceRemove = function(cls_name, inst_name) {

	pomngUI.dialog.confirm("Remove " + cls_name + " " + inst_name + " ?",
		"Are you sure you want to remove " + cls_name + " " + inst_name + " ?",
		{ cls_name: cls_name, inst_name: inst_name },
		function(params) { pomng.registry.removeInstance(params.cls_name, params.inst_name) });

}

pomngUI.dialog.configOpen = function(config_name) {
	pomngUI.dialog.confirm("Open config " + config_name + " ?",
		"Are you sure you want to load configuration '" + config_name + "' ?",
		config_name,
		function(cfg) { pomng.call('registry.load', null, [ cfg ]) });
}

pomngUI.dialog.configOverwrite = function(config_name) {
	pomngUI.dialog.confirm("Overwrite config " + config_name + " ?",
		"Are you sure you want to overwrite configuration '" + config_name + "' ?",
		config_name,
		function(cfg) { pomng.call('registry.save', null, [ cfg ]) });
}

pomngUI.dialog.configDelete = function(config_name) {

	pomngUI.dialog.confirm("Delete config " + config_name + " ?",
		"Are you sure you want to delete configuration '" + config_name + "' ?",
		config_name,
		function(cfg) { pomng.call('registry.delete_config', null, [ cfg ]) });
}

pomngUI.dialog.configReset = function() {

	pomngUI.dialog.confirm("Reset configuration ?",
		"Are you sure you want to reset POM-NG's configuration ?",
		null, function(cfg) { pomng.call('registry.reset') });
}

pomngUI.dialog.confirm = function(title, html, params, yes_function) {


	$("#dlg_confirm").html(html);
	
	$("#dlg_confirm").dialog({
		resizable: false,
		modal: true,
		width: "auto",
		title: title,

		buttons: {
			Yes: function() {
				yes_function(params);
				$(this).dialog("close");
			},
			No: function() {
				$(this).dialog("close");
			}
		}
	});

}

pomngUI.dialog.configSaveAs = function() {

	$("#dlg_config_saveas #config_name").val('');

	$("#dlg_config_saveas").dialog({
		resizable: false,
		modal: true,
		width: "auto",
		title: "Save configuration as",

		buttons: {
			Save: function() {
				var val = $("#dlg_config_saveas #config_name").val();
				if (val == "") {
					alert("You must specify a name");
					return;
				} else if (pomng.registry.configs[val] !== undefined) {
					pomngUI.dialog.configOverwrite(val);
				} else {
					pomng.call('registry.save', null, [ val ]);
				}
				$(this).dialog("close");
			},
			Cancel: function() {
				$(this).dialog("close");
			}
		}
	});

}

/*
 * Summary view
 */
pomngUI.summary = {};

pomngUI.summary.init = function() {

	$("#tab_summary #add_input").button().click(function(event) { pomngUI.dialog.instanceAdd("input"); } );
	$("#tab_summary #add_output").button().click(function(event) { pomngUI.dialog.instanceAdd("output"); } );

	window.addEventListener("pomng.registry.instance.update", pomngUI.summary.evtUpdateInstance);
	window.addEventListener("pomng.registry.instance.remove", pomngUI.summary.evtRemoveInstance);

}

pomngUI.summary.evtUpdateInstance = function(event) {

	var cls = event.detail.cls_name;

	var elem = "#tab_summary #tbl_" + cls + " tbody";

	var tbl = $(elem);

	if (tbl.length == 0)
		return;

	var tr = $(elem + " #tr_" + event.detail.instance_name);

	var instance = pomng.registry.classes[event.detail.cls_name].instances[event.detail.instance_name];

	var html = '<td>' + instance.name + '</td><td>' + instance.parameters['type'].value + '</td><td>';

	var running = instance.parameters['running'].value == "yes";

	if (running)
		html += 'Running';
	else
		html += 'Stopped';

	html += '</td><td>';

	// Start/Stop icon
	if (running)
		html += '<span class="ui-icon ui-icon-stop icon-btn" title="Stop" onclick="pomng.registry.setInstanceParam(\'' + event.detail.cls_name + '\', \'' + event.detail.instance_name + '\', \'running\', \'no\')"/>';
	else
		html += '<span class="ui-icon ui-icon-play icon-btn" title="Start" onclick="pomng.registry.setInstanceParam(\'' + event.detail.cls_name + '\', \'' + event.detail.instance_name + '\', \'running\', \'yes\')"/>';
	
	// Parameter icon
	html += '<span class="ui-icon ui-icon-gear icon-btn" title="Parameters" onclick="pomngUI.dialog.instanceParameter(\'' + event.detail.cls_name + '\', \'' + event.detail.instance_name + '\')"/>';
	
	// Remove icon
	html += '<span class="ui-icon ui-icon-close icon-btn" title="Remove" onclick="pomngUI.dialog.instanceRemove(\'' + event.detail.cls_name + '\', \'' + event.detail.instance_name + '\')"/>';
	
	html += '</td>';


	if (tr.length > 0) {
		// Update existing
		tr.html(html);
		console.log("pomUI.summary: Updated existing instance " + cls + " " + event.detail.instance_name);
	} else {
		// Add new
		html = '<tr id="tr_' + event.detail.instance_name + '">' + html + '</tr>';
		tbl.append(html);
		console.log("pomUI.summary: Added new instance " + cls + " " + event.detail.instance_name);
	}

}

pomngUI.summary.evtRemoveInstance = function(event) {

	var cls = event.detail.cls_name;
	var inst = event.detail.instance_name;

	var elem = "#tab_summary #tbl_" + cls + " tbody #tr_" + inst
	
	$(elem).remove();

	console.log("pomUI.summary: Removed instance " + cls + " " + inst);
}


/*
 * Config view
 */
pomngUI.config = {};

pomngUI.config.init = function() {

	$("#tab_config #save_as").button().click(function(event) { pomngUI.dialog.configSaveAs(); } );
	$("#tab_config #reset").button().click(function(event) { pomngUI.dialog.configReset(); } );

	window.addEventListener("pomng.registry.config.update", pomngUI.config.evtConfigUpdate);

}

pomngUI.config.evtConfigUpdate = function(event) {

	var elem = $("#tab_config #tbl_config tbody");

	var html = "";

	var configs = pomng.registry.configs;
	var configs_name = Object.keys(configs).sort();

	for (var i = 0; i < configs_name.length; i++) {

		var config = configs[configs_name[i]];
		html += '<tr><td>' + config.name + '</td><td>' + config.timestamp + '</td><td>';
		html += '<span class="ui-icon ui-icon-folder-open icon-btn" title="Open configuration" onclick="pomngUI.dialog.configOpen(\'' + config.name + '\')"/>';
		html += '<span class="ui-icon ui-icon-disk icon-btn" title="Save configuration" onclick="pomngUI.dialog.configOverwrite(\'' + config.name + '\')"/>';
		html += '<span class="ui-icon ui-icon-trash icon-btn" title="Delete configuration" onclick="pomngUI.dialog.configDelete(\'' + config.name + '\')"/>';
		html += '</td></tr>';
	}

	elem.html(html);

}


