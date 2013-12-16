
var pomngUI = {};
pomngUI.menu = {};
pomngUI.registry = {};
pomngUI.summary = {};
pomngUI.dialog = {};

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

	$("#menu").tabs();
	
	$("#menu").addClass("ui-tabs-vertical ui-helper-clearfix");
	$("#menu").removeClass("ui-widget-content");

	window.addEventListener("pomng.conn_error", function(event) { document.title = pomng.title + " - CONNECTION ERROR | Reload the page to reconnect"; });

}


/*
 * Registry view
 */

pomngUI.registry.init = function() {

	window.addEventListener("pomng.registry.instance.update", function(event) { pomngUI.registry.evtUpdateInstance(event) });
	window.addEventListener("pomng.registry.instance.remove", function(event) { pomngUI.registry.evtRemoveInstance(event) });
}

pomngUI.registry.evtUpdateInstance = function(event) {

	var cls_name = event.detail.cls_name;

	var cls_elem = $("#registry #cls_" + cls_name);

	var avail_types = Object.keys(pomng.registry.classes[cls_name].available_types);

	if (cls_elem.length <= 0) {
		// We need to add the class

		var addButton = "";
		if (avail_types.length > 0)
			addButton = ' <span class="ui-icon ui-icon-circle-plus" id="btn_add_' + cls_name + '" style="display:inline-block" onclick="pomngUI.dialog.instanceAdd(\'' + cls_name + '\')"/>';
		$("#registry").append('<div id="cls_' + cls_name + '"><span class="ui-icon ui-icon-triangle-1-e" style="display:inline-block"/>' + cls_name + addButton + '<div id="cls_inst_' + cls_name + '" class="ui-widget-content ui-corner-all" style="margin-left:16px"></div></div>');
	}

	// Add the instance
	
	var inst_name = event.detail.instance_name;
	var inst_elem = $("#registry #cls_inst_" + cls_name + " #inst_" + inst_name);

	if (inst_elem.length > 0)
		return; // The element already exists

	var instHtml = '<div id="inst_' + inst_name + '"><span class="ui-icon ui-icon-carat-1-e" style="display:inline-block"/>' + inst_name;
		
	var inst = pomng.registry.classes[cls_name].instances[inst_name];
	var p_type = inst.parameters["type"];

	if (p_type !== undefined)
		instHtml += " (" + p_type.value + ")";

	if (avail_types.length > 0)
		instHtml += '<span class="ui-icon ui-icon-close" style="display:inline-block" onclick="pomngUI.dialog.instanceRemove(\'' + cls_name + '\', \'' + inst_name + '\')"/>';

	instHtml += '</div>';

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

pomngUI.dialog.init = function() {

	pomngUI.dialog.config_list = [];

	window.addEventListener("pomng.registry.instance.add", function(event) { pomngUI.dialog.config_list.push({ cls: event.detail.cls_name, instance: event.detail.instance_name})});
	window.addEventListener("pomng.registry.instance.update", function(event) { pomngUI.dialog.evtUpdateInstance(event) });

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

		paramsHtml += '<tr><td>' + params_name[i] + '</td><td>' + params[params_name[i]].type + '</td><td><input id="val_' + params_name[i] + '" type="text" value="' + params[params_name[i]].value + '"/></td></tr>';

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

	$("#dlg_inst_remove").html("Are you sure you want to remove " + cls_name + " " + inst_name + " ?");
	
	$("#dlg_inst_remove").dialog({
		resizable: false,
		modal: true,
		width: "auto",
		title: "Remove " + cls_name + " " + inst_name + " ?",

		buttons: {
			Yes: function() {
				pomng.registry.removeInstance(cls_name, inst_name);
				$(this).dialog("close");
			},
			No: function() {
				$(this).dialog("close");
			}
		}

	});

}

/*
 * Summary view
 */

pomngUI.summary.init = function() {

	$("#tab_summary #add_input").button().click(function(event) { pomngUI.dialog.instanceAdd("input"); } );
	$("#tab_summary #add_output").button().click(function(event) { pomngUI.dialog.instanceAdd("output"); } );

	window.addEventListener("pomng.registry.instance.update", function(event) { pomngUI.summary.evtUpdateInstance(event) });
	window.addEventListener("pomng.registry.instance.remove", function(event) { pomngUI.summary.evtRemoveInstance(event) });

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
		html += '<span class="ui-icon ui-icon-stop" style="display:inline-block" onclick="pomng.registry.setInstanceParam(\'' + event.detail.cls_name + '\', \'' + event.detail.instance_name + '\', \'running\', \'no\')"/>';
	else
		html += '<span class="ui-icon ui-icon-play" style="display:inline-block" onclick="pomng.registry.setInstanceParam(\'' + event.detail.cls_name + '\', \'' + event.detail.instance_name + '\', \'running\', \'yes\')"/>';
	
	// Parameter icon
	html += '<span class="ui-icon ui-icon-gear" style="display:inline-block" onclick="pomngUI.dialog.instanceParameter(\'' + event.detail.cls_name + '\', \'' + event.detail.instance_name + '\')"/>';
	
	// Remove icon
	html += '<span class="ui-icon ui-icon-close" style="display:inline-block" onclick="pomngUI.dialog.instanceRemove(\'' + event.detail.cls_name + '\', \'' + event.detail.instance_name + '\')"/>';
	
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
