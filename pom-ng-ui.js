
var pomngUI = {};

pomngUI.init = function() {


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
	pomngUI.logs.init();
	pomngUI.weboutput.init();
	pomngUI.perf.init();

	var tabs = $("#menu").tabs({
		activate: this.tabActivate,
	});
	

	$("#menu").addClass("ui-tabs-vertical ui-helper-clearfix");
	$("#menu").removeClass("ui-widget-content");

	window.addEventListener("pomng.conn_error", function(event) { document.title = pomng.title + " - CONNECTION ERROR | Reload the page to reconnect"; });

}

pomngUI.timeval_toString = function(tv) {
	var date = new Date();
	date.setTime((tv['sec'] * 1000) + (tv['usec'] / 1000));
	return date.getFullYear()  + "/" + (date.getMonth() + 1) + "/" + date.getDate() + " " + ("0" + date.getHours()).slice(-2) + ":" + ("0" + date.getHours()).slice(-2) + ":" + ("0" + date.getMinutes()).slice(-2) + "." + date.getMilliseconds();
}

pomngUI.tabActivate = function(event, ui) {
	var newPanel = ui.newPanel[0].id;
	var oldPanel = ui.oldPanel[0].id;

	if (newPanel == "tab_performance") {
		pomngUI.perf.activate();
	}

	if (oldPanel == "tab_performance") {
		pomngUI.perf.deactivate();
	}

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
		var html = '<div id="cls_' + cls.name + '"><span id="cls_icon" class="ui-icon ui-icon-triangle-1-e icon-btn" onclick="pomngUI.registry.instanceToggle(\'' + cls.name + '\')"/><span onclick="pomngUI.registry.classDetail(\'' + cls.name + '\')" style="cursor:pointer">' + cls.name + '</span><div id="cls_inst_' + cls.name + '" class="ui-widget-content ui-corner-all" style="margin-left:16px;display:none;padding-right:3px"></div></div>';
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

	// Show the available instance types
	
	var types_name = Object.keys(cls.available_types).sort();
	if (types_name.length > 0) {
		html += '<h3 class="details">Available instance types :</h3><table class="ui-widget ui-widget-content ui-table"><thead><tr class="ui-widget-header"><td>Name</td><td>Description</td></tr></thead><tbody>';
		for (var i = 0; i < types_name.length; i++) {
			var type = cls.available_types[types_name[i]];
			html += '<tr><td><a href="javascript:pomngUI.dialog.instanceAdd(\'' + cls_name + '\', \'' + type.name + '\')">' + type.name + '</a></td><td>' + type.description + '</td></tr>';
		}
		html += '</tbody></table>';

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
	html += '<div><h3 class="details">Performance objects :</h3>';

	var perfs_name = Object.keys(cls.performances).sort();

	var perfs_to_fetch = [];

	if (perfs_name.length > 0) {

		html += '<span class="ui-icon ui-icon-refresh icon-btn" title="Refresh" onclick="pomngUI.registry.refreshPerf(\'' + cls.name + '\')"></span></div>';

		html += '<table class="ui-widget ui-widget-content ui-table"><thead><tr class="ui-widget-header"><td>Name</td><td>Type</td><td>Value</td><td>Unit</td><td>Description</td></tr></thead><tbody>';

		for (var i = 0; i < perfs_name.length; i++) {
			var perf = cls.performances[perfs_name[i]];
			html += '<tr><td>';
			if (perf.type != "timeticks") {
				html += '<a href="javascript:pomngUI.perf.addDialog(\'' + cls_name + '.' + perf.name + '\')">' + perf.name + '</a>';
			} else {
				html += perf.name;
			}
			html += '</td><td>' + perf.type + '</td><td id="td_perf_cls_' + cls.name + '_' + perf.name + '">Fetching ...</td><td>' + perf.unit + '</td><td>' + perf.description + '</td></tr>';
			perfs_to_fetch.push({class: cls.name, perf: perf.name});
		}
		html += '</tbody></table>';

	} else {
		html += '</div><div>No performance object for this class</div>';
	}

	$("#tab_registry #detail").html(html);

	pomng.call("registry.getPerfs", pomngUI.registry.updatePerf, [ perfs_to_fetch ]);

}

pomngUI.registry.refreshPerf = function(cls_name, inst_name) {

	var perfs;

	if (inst_name !== undefined) {
		perfs = pomng.registry.classes[cls_name].instances[inst_name].performances;
	} else {
		perfs = pomng.registry.classes[cls_name].performances;
	}
	
	var perfs_to_fetch = [];

	var perfs_name = Object.keys(perfs).sort();

	if (perfs_name.length < 0)
		return;

	for (var i = 0; i < perfs_name.length; i++) {
		var perf = perfs[perfs_name[i]];

		var elem = '#td_perf_';
		if ('instance' in perf) {
			elem += 'inst_' + perf['class'] + '_' + perf['instance'];
		} else {
			elem += 'cls_' + perf['class'];
		}
		elem += '_' + perf['perf'];

		$(elem).html('Refreshing ...');


		if (inst_name !== undefined) {
			perfs_to_fetch.push({class: cls_name, instance: inst_name, perf: perf.name});
		} else {
			perfs_to_fetch.push({class: cls_name, perf: perf.name});
		}
	}

	pomng.call("registry.getPerfs", pomngUI.registry.updatePerf, [ perfs_to_fetch ]);

}

pomngUI.registry.updatePerf = function(response, status, jqXHR) {
	
	var perfs = response[0];
	var perf_names = Object.keys(perfs);

	for (var i = 0; i < perf_names.length; i++) {
		var perf = perfs[perf_names[i]];
		var elem = '#td_perf_';
		if ('instance' in perf) {
			elem += 'inst_' + perf['class'] + '_' + perf['instance'];
		} else {
			elem += 'cls_' + perf['class'];
		}
		elem += '_' + perf['perf'];

		$(elem).html(perf['value']);
	}

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
	html += '<div><h3 class="details">Performance objects :</h3>';

	var perfs_name = Object.keys(inst.performances).sort();

	var perfs_to_fetch = [];

	if (perfs_name.length > 0) {
		html += '<span class="ui-icon ui-icon-refresh icon-btn" title="Refresh" onclick="pomngUI.registry.refreshPerf(\'' + cls_name + '\',\'' + inst.name + '\')"></span></div>';

		html += '<table class="ui-widget ui-widget-content ui-table"><thead><tr class="ui-widget-header"><td>Name</td><td>Type</td><td>Value</td><td>Unit</td><td>Description</td></tr></thead><tbody>';

		for (var i = 0; i < perfs_name.length; i++) {
			var perf = inst.performances[perfs_name[i]];
			html += '<tr><td>';
			if (perf.type != "timeticks") {
				html += '<a href="javascript:pomngUI.perf.addDialog(\'' + cls_name + '.' + inst.name + '.' + perf.name + '\')">' + perf.name + '</a>';
			} else {
				html += perf.name;
			}
			html += '</td><td>' + perf.type + '</td><td id="td_perf_inst_' + cls_name + '_' + inst.name + '_' + perf.name + '">Fetching ...</td><td>' + perf.unit + '</td><td>' + perf.description + '</td></tr>';
			perfs_to_fetch.push({class: cls_name, instance: inst_name, perf: perf.name});
		}
		html += '</tbody></table>';

	} else {
		html += '</div><div>No performance object for this class</div>';
	}

	$("#tab_registry #detail").html(html);

	pomng.call("registry.getPerfs", pomngUI.registry.updatePerf, [ perfs_to_fetch ]);
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

	window.addEventListener("pomng.conn_error", pomngUI.dialog.conn_error);

}

pomngUI.dialog.conn_error = function(event) {

	if (event.detail.status == 0) {
		$("#dlg_conn_error #msg").text("Connection to POM-NG failed !");
	} else {
		$("#dlg_conn_error #msg").html('Status : ' + event.detail.status + '<br/>Error : ' + event.detail.error);
	}
	$("#dlg_conn_error").dialog({
		resizable: false,
		modal: true,
		width: "auto",
		title: "Connection error !",
		dialogClass: "no-close",
		buttons: {
			Reload: function() { location.reload() }
		}
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

pomngUI.dialog.instanceAdd = function(cls_name, inst_type) {


	if (inst_type === undefined) {
		var options = '<select id="val">';
		var avail_types = Object.keys(pomng.registry.classes[cls_name].available_types);
		for (var i = 0; i < avail_types.length; i++)
			options += '<option value="' + avail_types[i] + '">' + avail_types[i] + '</option>';
		options += "</select>";
		$("#dlg_add #instance_type").html(options);
		$("#dlg_add #description").text(pomng.registry.classes[cls_name].available_types[avail_types[0]].description);

		$("#dlg_add #instance_type #val").change( function () { $("#dlg_add #description").text(pomng.registry.classes[cls_name].available_types[$("#dlg_add #instance_type #val").val()].description); } );

	} else {
		$("#dlg_add #instance_type").html('<input type="hidden" id="val" value="' + inst_type + '"/>' + inst_type);
		$("#dlg_add #description").text(pomng.registry.classes[cls_name].available_types[inst_type].description);

	}
	$("#dlg_add #instance_name").val("");
	$("#dlg_add").dialog({
		resizable: false,
		modal: true,
		width: "auto",
		title: "Add an instance of " + cls_name,

		buttons: {
			"Add": function() {
				var type = $("#dlg_add #instance_type #val").val();
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

/*
 * Logs view
 */

pomngUI.logs = {};

pomngUI.logs.init = function() {

	window.addEventListener("pomng.logs.new", function(event) { pomngUI.logs.append(event.detail.id); });
	$("#logs_content").resize(pomngUI.logs.resize);
	window.addEventListener("pomng.registry.ready", function (event) { $("#logs_content").show(); pomngUI.logs.resize();});

	pomngUI.logs.display_level = 3;
}

pomngUI.logs.append = function(id) {
	

	var log = pomng.logs.entries[id];

	if (log.level > pomngUI.logs.display_level)
		return;

	var cls;
	switch (log.level) {
		case 1:
			cls = "err";
			break;
		case 2:
			cls = "warn";
			break;
		case 3:
			cls = "info";
			break;
		case 4:
			cls = "debug";
			break;
	}

	var date = log.timestamp.getFullYear()  + "/" + (log.timestamp.getMonth() + 1) + "/" + log.timestamp.getDate() + " " + log.timestamp.toLocaleTimeString();

	var html = '<tr class="log_' + cls + '"><td>' + date + '</td><td>'  + log.file + '</td><td>' + log.data + '</td></tr>';

	$("#tbl_logs").append(html);

	$("#logs_content").scrollTop($("#logs_content")[0].scrollHeight);
}

pomngUI.logs.update = function() {

	$("#tbl_logs").html('');

	var log_entries = Object.keys(pomng.logs.entries);
	for (var i = 0; i < log_entries.length; i++) {
		pomngUI.logs.append(log_entries[i]);
	}

}

pomngUI.logs.size = function(size) {


	if (size == 'min') {
		$("#logs").addClass("logs-min");
		$("#logs").removeClass("logs-full");
		$("#log_icon_min").hide();
		$("#log_icon_normal").show();
		$("#log_icon_full").show();
		$("#log_icon_normal2").hide();
		$("#root").show();
	} else if (size == 'normal') {
		$("#logs").removeClass("logs-min");
		$("#logs").removeClass("logs-full");
		$("#log_icon_min").show();
		$("#log_icon_normal").hide();
		$("#log_icon_full").show();
		$("#log_icon_normal2").hide();
		$("#root").show();
	} else { // Full
		$("#logs").removeClass("logs-min");
		$("#logs").addClass("logs-full");
		$("#log_icon_min").show();
		$("#log_icon_normal").hide();
		$("#log_icon_full").hide();
		$("#log_icon_normal2").show();
		$("#root").hide();
	}
	pomngUI.logs.resize();


}

pomngUI.logs.resize = function() {
	
	var height = $("#logs").innerHeight() - $("#logs_hdr").outerHeight();
	$("#logs_content").height(height);

	var wh = $(window).height()
	var lh = $("#logs").outerHeight();
	$("#root").height(wh - lh);

	$("#logs_content").scrollTop($("#logs_content")[0].scrollHeight);
}

pomngUI.logs.paramDialog = function() {

	$("#dlg_log_param #dbg_lvl").val(pomngUI.logs.display_level);

	$("#dlg_log_param").dialog({
		resizable: false,
		modal: true,
		width: "auto",
		title: "Log configuration",

		buttons: {
			Ok: function() {
				pomngUI.logs.display_level = parseInt($("#dlg_log_param #dbg_lvl").val());
				pomngUI.logs.update();
				$(this).dialog("close");
			},
			Cancel: function() {
				$(this).dialog("close");
			}
		}

	});
}

/*
 * Web outputs
 */

pomngUI.weboutput = {};

pomngUI.weboutput.init = function() {
	var tabs = $("#weboutput").tabs();
	tabs.delegate("span.ui-icon-close", "click", function() {
		var id = $(this).closest("li").attr("aria-controls");
		var name = pomngUI.weboutput.outputs[id].output_name;
		pomngUI.dialog.confirm('Remove web output ' + name + ' ?',
			'Are you sure you want to remove web output ' + name + ' ?',
			id, function(id) {
				pomngUI.weboutput.outputs[id].cleanup();
				$("#weboutput li#li_"+id).remove();
				$("#weboutput div#"+id).remove();
				$("#weboutput").tabs("refresh");
				
			});
		});

	var output_names = weboutput.outputs;
	pomngUI.weboutput.outputs = {};

	var html = "";
	for (var i = 0; i < output_names.length; i++) {
		html += '<tr><td><a href="javascript:pomngUI.weboutput.add(\'' + output_names[i] + '\')">' + output_names[i] + '</a></td><td>' + weboutput[output_names[i]].description + '</td></tr>';
	}

	$("#weboutput_list").html(html);
}

pomngUI.weboutput.add = function(type) {


	if ('parameters' in weboutput[type]) {

		var params = Object.keys(weboutput[type].parameters).sort();

		var param_html = "";

		for (var i = 0; i < params.length; i++) {
			var param = weboutput[type].parameters[i];
			param_html += '<tr><td>' + param.name + '</td><td>';

			if (param.values) {
				param_html += '<select>';
				for (var j = 0; j < param.values.length; j++) {
					param_html += '<option value="' + param.values[j] + '">' + param.values[j] + '</option>';
				}
				param_html += '</select>';
			} else {
				param_html += '<input type="text"/>';
			}
		}
		
		$("#dlg_weboutput_add #tbl_param").html(param_html);
		$("#dlg_weboutput_add #parameters").show();
	} else {
		$("#dlg_weboutput_add #parameters").hide();
	}


	// Default the name to the output name
	$("#dlg_weboutput_add #name").val(type);
	$("#dlg_weboutput_add").dialog({
		resizable: false,
		modal: true,
		width: "auto",
		title: "Add a web output",

		buttons: {
			Ok: function() {
				var name = $("#dlg_weboutput_add #name").val();
				
				// Check if an input already exists
				var ids = Object.keys(pomngUI.weboutput.outputs);
				for (var i = 0; i < ids.length; i++) {
					if (pomngUI.weboutput.outputs[ids[i]].output_name == name) {
						alert("A web output with the name '" + name + "' already exists.");
						return;
					}
				}

				var elem_weboutput = $("#weboutput");
				weboutput[type].counter++;
				var id = type + '-' + weboutput[type].counter;
				elem_weboutput.find(".ui-tabs-nav").append('<li id="li_' + id + '"><a href="#' + id + '">Output ' + name + '</a><span class="ui-icon ui-icon-close icon-btn"></span></li>');
				elem_weboutput.append('<div id="' + id + '"><p>' + name + ' output content</p></div>');
				elem_weboutput.tabs("refresh");
				pomngUI.weboutput.outputs[id] = new weboutput[type]($("#weboutput #" + id));
				pomngUI.weboutput.outputs[id].output_name = name;
				
				$(this).dialog("close");
			},
			Cancel: function() {
				$(this).dialog("close");
			}
		}


	});

}


/*
 * Performances
 */
pomngUI.perf = {};
pomngUI.perf.init = function() {

	$("#tab_performance #add_graph").button().click(function(event) {  pomngUI.perf.addTemplateDialog(); } );

	this.graphs = [];
	this.perfs = {};
	this.graph_count = 0;
	this.poll_interval = 1000;
	this.poll_running = false;
	this.max_time = 60 * 5;
	
	window.addEventListener("pomng.registry.instance.remove", pomngUI.perf.evtRemoveInstance);
}

pomngUI.perf.activate = function() {
	this.activated = true;

	for (var i = 0; i < this.graphs.length; i++) {
		this.plot(i);
	}

}

pomngUI.perf.plot = function(id) {

	if (!this.activated)
		return;

	var options = {
		xaxis: {
			mode: "time",
			timezone: "browser",
		},
		yaxis: {
			min: 0,
			position: "right",
		},
		legend: {
			position: "nw",
		}

	};

	var graph = this.graphs[id];
	var elem = $('#' + graph.elem_id);

	var plot_data = [];

	var has_data = false;

	for (var i = 0; i < graph.perfs.length; i++) {
		var perf_id = graph.perfs[i];
		var perf = pomngUI.perf.perfs[perf_id];
		if (perf.series.length > 1)
			has_data = true;
		plot_data.push({ label: perf.label, data: perf.series });
	}

	if (!has_data) {
		elem.text("Fetching initial data ...");
	} else {
		elem.text('');
		$.plot(elem, plot_data, options);
	}
}

pomngUI.perf.deactivate = function() {
	this.activated = false;
}

pomngUI.perf.addGraph = function(graph) {

	// Variable graph is an object with properties height, width, title

	var id = pomngUI.perf.graphs.length;
	graph.elem_id = 'graph-' + this.graph_count;
	this.graph_count++;

	graph.perfs = [];

	this.graphs[id] = graph;


	$("#performance #graphs").append('<div id="' + graph.elem_id + '_container" style="padding-top:1em"><h4>' + graph.title + '</h4><span style="float:right"><span class="ui-icon ui-icon-gear icon-btn" onclick="pomngUI.perf.graphConfig(' + id + ')"></span><span class="ui-icon ui-icon-close icon-btn" onclick="pomngUI.perf.removeGraphDialog(' + id + ')"></span></span><div id="' + graph.elem_id + '" style="width:' + graph.width + ';height:' + graph.height + '"></div></div>');

	if (this.activated)
		this.plot(id);

	return id;
}

pomngUI.perf.addPerfToGraph = function(graph_id, perf) {
	
	var perf_id;
	var perf_reg;
	if (perf.instance === undefined) {
		perf_id = 'cls_' + perf.class + '_' + perf.name;
		perf_reg = pomng.registry.classes[perf.class].performances[perf.name];
		perf.label = 'Class ' + perf.class + ' ' + perf.name;
	} else {
		perf_id = 'inst_' + perf.class + '_' + perf.instance + '_' + perf.name;
		perf_reg = pomng.registry.classes[perf.class].instances[perf.instance].performances[perf.name];
		perf.label = perf.class.charAt(0).toUpperCase() + perf.class.slice(1) + ' ' + perf.instance + ' ' + perf.name;
	}

	if (perf_reg.type == "counter") {
		perf.label += ' (' + perf_reg.unit + '/sec)';
	} else {
		perf.label += ' (' + perf_reg.unit + ')';
	}

	perf.values = [];
	perf.series = [];

	if (this.perfs[perf_id] === undefined) {
		this.perfs[perf_id] = perf;
	}

	this.graphs[graph_id].perfs.push(perf_id);

	if (this.interval === undefined)
		this.interval = setInterval(this.poll, this.poll_interval);
}

pomngUI.perf.poll = function() {

	var perf_array = [];

	for (var perf_id in pomngUI.perf.perfs) {
		var perf = pomngUI.perf.perfs[perf_id];
		var entry = { class: perf.class, perf: perf.name };
		if (perf.instance !== undefined)
			entry.instance = perf.instance;

		perf_array.push(entry);
	}

	if (!pomngUI.perf.poll_running) {
		pomngUI.perf.poll_running = true;
		pomng.call("registry.getPerfs", pomngUI.perf.updatePerf, [ perf_array ]);
	}

}

pomngUI.perf.updatePerf = function(response, status, jqXHR) {

	var perfs = response[0];

	// Add the value for each perf
	for (var i = 0; i < perfs.length; i++) {

		var perf = perfs[i]
		var perf_id;
		var perf_type;
		if (perf.instance === undefined) {
			perf_id = 'cls_' + perf.class + '_' + perf.perf;
			perf_type = pomng.registry.classes[perf.class].performances[perf.perf].type;
		} else {
			perf_id = 'inst_' + perf.class + '_' + perf.instance + '_' + perf.perf;
			perf_type = pomng.registry.classes[perf.class].instances[perf.instance].performances[perf.perf].type;
		}
		var perf_value = { sys_time: perf.sys_time, value: perf.value };

		if (perf.pkt_time !== undefined)
			perf_value.pkt_time = perf.pkt_time;

		var sys_time = (perf.sys_time.sec * 1000) + Math.round(perf.sys_time.usec / 1000);

		// Add the value to the series
		if (pomngUI.perf.perfs[perf_id].values.length > 1) {
			
			if (perf_type == "counter") {
				var last_id = pomngUI.perf.perfs[perf_id].values.length - 2;
				var delta = perf.value - pomngUI.perf.perfs[perf_id].values[last_id].value;
				pomngUI.perf.perfs[perf_id].series.push([sys_time, delta]);
			} else {
				pomngUI.perf.perfs[perf_id].series.push([sys_time, perf.value]);
			}
		}
		

		// Add the value to the values
		pomngUI.perf.perfs[perf_id].values.push(perf_value);

		// Remove old entries
		while ((pomngUI.perf.perfs[perf_id].values.length > 0) && (pomngUI.perf.perfs[perf_id].values[0].sys_time.sec < perf.sys_time.sec - pomngUI.perf.max_time)) {
			pomngUI.perf.perfs[perf_id].values.splice(0,1);
		}

		while ((pomngUI.perf.perfs[perf_id].series.length > 0) && (pomngUI.perf.perfs[perf_id].series[0][0] < sys_time - (pomngUI.perf.max_time * 1000))) {
			pomngUI.perf.perfs[perf_id].series.splice(0,1);
		}
	}
	
	// Update the graphs
	for (var i = 0; i < pomngUI.perf.graphs.length; i++) {
		pomngUI.perf.plot(i);
	}

	pomngUI.perf.poll_running = false;
}

pomngUI.perf.addTemplateDialog = function() {

	var options = '';
	var first;
	for (var i = 0; i < pomngUI.perf.templates.length; i++) {
		if (pomngUI.perf.templates[i].valid !== undefined && !pomngUI.perf.templates[i].valid())
			continue;
		options += '<option value="' + i + '">' + pomngUI.perf.templates[i].name + '</option>';
		if (first === undefined)
			first = i;
	}

	$("#dlg_perf_template_add #template").html(options).change(function() { pomngUI.perf.addTemplateDialogUpdateParam($("#dlg_perf_template_add #template").val()); });

	pomngUI.perf.addTemplateDialogUpdateParam(first);

	$("#dlg_perf_template_add #title").val("Graph " + this.graph_count);

	$("#dlg_perf_template_add").dialog({
		resizable: false,
		modal: true,
		width: "auto",
		title: "Add a performance graph",
		buttons: {
			Ok: function () {
				var title = $("#dlg_perf_template_add #title").val();
				var template_id = $("#dlg_perf_template_add #template").val();
				var template = pomngUI.perf.templates[template_id];
				var params = [];
				if (template.params !== undefined) {
					for (var i = 0; i < template.params.length; i++) {
						var param = template.params[i];
						var value;
						var elem = $("#dlg_perf_template_add #param_" + i + " option:selected");
						if (elem.length != 0) {
							value = [];
							elem.map(function() { value.push($(this).val()); });
						} else {
							value = [ $("#dlg_perf_template_add #param_" + i).val() ];
						}
						params.push(value);
					}
				}

				var perfs = template.perfs(params);
				if (perfs.length == 0)
					return;
				
				var graph_id = pomngUI.perf.addGraph({width: "100%", height: "200px", title: title  });
				for (var i = 0; i < perfs.length; i++) {
					pomngUI.perf.addPerfToGraph(graph_id, perfs[i]);
				}
				$(this).dialog("close");
			},
			Cancel: function() {
				$(this).dialog("close");
			}
		}
	})

}

pomngUI.perf.addTemplateDialogUpdateParam = function(template_id) {

	if (pomngUI.perf.templates[template_id].params === undefined) {
		$("#dlg_perf_template_add #params").hide();
		return;
	}

	var params = '<table>';
	for (var i = 0; i < pomngUI.perf.templates[template_id].params.length; i++) {
		var param = pomngUI.perf.templates[template_id].params[i];
		params += '<tr><td>' + param.name + ' : </td><td>';
		
		var values = param.values();
		if (values.length == 1) {
			params += '<input type="hidden" id="param_' + i + '" value="' + values[0] + '"/>' + values[0];
		} else {
			params += '<select id="param_' + i + '"';
			if (param.type == "multiple")
				params += " multiple";
			params += '>';
			for (var j = 0; j < values.length; j++) {
				params += '<option value="' + values[j] + '">' + values[j] + '</option>';
			}
			params += '</select>';
		}

		params += '</td></tr>';
	}

	params += '</table>';

	$("#dlg_perf_template_add #params").html(params).show();
}

pomngUI.perf.templates = [
	{
		name: "Input bytes per second",
		params: [ {
				name: "Input",
				type: "multiple",
				values: function() { return Object.keys(pomng.registry.classes.input.instances).sort() }

			} ],
		valid: function () {return Object.keys(pomng.registry.classes.input.instances).length > 0},
		perfs: function (params) {
			var perfs = [];
			var param = params[0];
			if (param.length == 0)
				alert("You must select at least one input");
			for (var i = 0; i < param.length; i++)
				perfs.push({ class: 'input', instance: param[i], name: 'bytes_in' });
			return perfs;
		}
	},
	{
		name: "Input packets per second",
		params: [ {
				name: "Input",
				type: "multiple",
				values: function() { return Object.keys(pomng.registry.classes.input.instances).sort() }

			} ],
		valid: function () {return Object.keys(pomng.registry.classes.input.instances).length > 0},
		perfs: function (params) {
			var perfs = [];
			var param = params[0];
			if (param.length == 0)
				alert("You must select at least one input");
			for (var i = 0; i < param.length; i++)
				perfs.push({ class: 'input', instance: param[i], name: 'pkts_in' });
			return perfs;
		}
	},
	{
		name: "Event processed",
		params: [ {
				name: "Event",
				type: "multiple",
				values: function() { return Object.keys(pomng.registry.classes.event.instances).sort() }
			} ],
		perfs: function (params) {
			var perfs = [];
			var param = params[0];
			if (param.length == 0)
				alert("You must select at least one event");
			for (var i = 0; i < param.length; i++)
				perfs.push({ class: 'event', instance: param[i], name: 'processed' });
			return perfs;
		}
	},
	{
		name: "Protocol bytes per second",
		params: [ {
				name: "Protocol",
				type: "multiple",
				values: function() { return Object.keys(pomng.registry.classes.proto.instances).sort() }

			} ],
		perfs: function(params) {
			var perfs = [];
			var param = params[0];
			if (param.length == 0)
				alert("You must select at least one prototocol");
			for (var i = 0; i < param.length; i++)
				perfs.push({ class: 'proto', instance: param[i], name: 'bytes' });
			return perfs;
		}
	},
	{
		name: "Protocol packets per second",
		params: [ {
				name: "Protocol",
				type: "multiple",
				values: function() { return Object.keys(pomng.registry.classes.proto.instances).sort() }

			} ],
		perfs: function(params) {
			var perfs = [];
			var param = params[0];
			if (param.length == 0)
				alert("You must select at least one protocol");
			for (var i = 0; i < param.length; i++)
				perfs.push({ class: 'proto', instance: param[i], name: 'pkts' });
			return perfs;
		}
	},
];


pomngUI.perf.addDialog = function(perf_str) {

	var options = '<option value="-1">&lt;New graph&gt;</option>';
	for (var i = 0; i < pomngUI.perf.graphs.length; i++) {
		options += '<option value="' + i + '">' + pomngUI.perf.graphs[i].title + '</option>';
	}

	$("#dlg_perf_add #graph").html(options);
	$("#dlg_perf_add #graph_name input").val("");
	$("#dlg_perf_add #graph_name").show();

	$("#dlg_perf_add #graph").change(function() {
		if ($("#dlg_perf_add #graph").val() == "-1") {
			$("#dlg_perf_add #graph_name").show();
		} else {
			$("#dlg_perf_add #graph_name").hide();
		}
	});

	$("#dlg_perf_add").dialog({
		resizable: false,
		modal: true,
		width: "auto",
		title: "Add a performance to a graph",
		buttons: {
			Ok: function () {
				var graph_id = parseInt($("#dlg_perf_add #graph").val());
				if (graph_id == -1) {
					var name = $("#dlg_perf_add #graph_name input").val();
					if (name == "") {
						alert("You must specify a graph title");
						return;
					}
					graph_id = pomngUI.perf.addGraph({width: "100%", height: "200px", title: name });
				}

				var perf_val = perf_str.split(".");
				var perf = {class: perf_val[0] };
				if (perf_val.length == 2) {
					perf.name = perf_val[1];
				} else {
					perf.instance = perf_val[1];
					perf.name = perf_val[2];
				}
				pomngUI.perf.addPerfToGraph(graph_id, perf);

				$(this).dialog("close");
			},
			Cancel: function() {
				$(this).dialog("close");
			}
		}
	});

}

pomngUI.perf.removeGraphDialog = function(graph_id) {

	var graph = pomngUI.perf.graphs[graph_id];

	pomngUI.dialog.confirm("Remove graph ?",
		"Are you sure you want to remove the graph '" + graph.title + "' ?",
		graph_id, function(graph_id) {
			pomngUI.perf.removeGraph(graph_id);
		});
}

pomngUI.perf.removePerfFromGraph = function(graph_id, perf) {
	
	var index = pomngUI.perf.graphs[graph_id].perfs.indexOf(perf);
	pomngUI.perf.graphs[graph_id].perfs.splice(index, 1);

	// Check if other graphs are using this perf
	for (var i = 0; i < pomngUI.perf.graphs.length; i++) {
		var graph = pomngUI.perf.graphs[i];
		for (j = 0; j < graph.perfs.length; j++) {
			if (graph.perfs[j] == perf)
				return;
		}
	}

	// Stop polling this perf
	delete pomngUI.perf.perfs[perf];

	if (Object.keys(pomngUI.perf.perfs).length == 0) {
		// No more perf to poll !
		clearInterval(pomngUI.perf.interval);
		delete pomngUI.perf.interval;
	}
}

pomngUI.perf.removeGraph = function(graph_id) {

	var graph = pomngUI.perf.graphs[graph_id];

	for (var i = 0; i < graph.perfs.length; i++) {
		pomngUI.perf.removePerfFromGraph(graph_id, graph.perfs[i]);
	}

	pomngUI.perf.graphs.splice(graph_id, 1);
	$("#" + graph.elem_id + "_container").remove();
}

pomngUI.perf.graphConfig = function(graph_id) {

	var graph = pomngUI.perf.graphs[graph_id];
	$("#dlg_perf_cfg_graph #title").val(graph.title);
	
	var perf_html = '';
	for (var i = 0; i < graph.perfs.length; i++) {
		var perf = pomngUI.perf.perfs[graph.perfs[i]];
		perf_html += '<tr><td>' + perf.label + '</td><td><input type="checkbox" id="' + graph.perfs[i] + '"></input></td></tr>';
	}
	$("#dlg_perf_cfg_graph #perfs").html(perf_html);

	$("#dlg_perf_cfg_graph").dialog({
		resizable: false,
		modal: true,
		width: "auto",
		title: "Add a performance to a graph",
		buttons: {
			Ok: function () {
				var title = $("#dlg_perf_cfg_graph #title").val();
				if (title == "") {
					alert("You must specify a graph title");
					return;
				}

				pomngUI.perf.graphs[graph_id].title = title;
				var graph = pomngUI.perf.graphs[graph_id];
				$("#graphs #" + graph.elem_id + "_container h4").text(title);
				for (var i = 0; i < graph.perfs.length; i++) {
					if ($("#dlg_perf_cfg_graph #" + graph.perfs[i]).prop('checked')) {
						pomngUI.perf.removePerfFromGraph(graph_id, graph.perfs[i]);
						i--;
					}
				}
				$(this).dialog("close");
			},
			Cancel: function() {
				$(this).dialog("close");
			}
		}
	});

}

pomngUI.perf.evtRemoveInstance = function(event) {

	var cls_name = event.detail.cls_name;
	var inst_name = event.detail.instance_name;

	var perf_names = Object.keys(pomngUI.perf.perfs);
	for (var i = 0; i < perf_names.length; i++) {
		var perf_name = perf_names[i];
		var perf = pomngUI.perf.perfs[perf_name];
		if (perf.class == cls_name && perf.instance == inst_name) {
			for (var j = 0; j < pomngUI.perf.graphs.length; j++) {
				var graph = pomngUI.perf.graphs[i];
				if (graph.perfs.indexOf(perf_name) != -1) {
					pomngUI.perf.removePerfFromGraph(j, perf_name);
				}
				if (graph.perfs.length == 0) {
					pomngUI.perf.removeGraph(j);
					j--;
				}
			}
		}
	}
}
