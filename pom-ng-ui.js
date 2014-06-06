
var pomngUI = {};

pomngUI.init = function() {


	// Update the title
	pomng.call("core.getVersion",
		function (response, status, jqXHR) {
			pomng.version = response[0];
			document.title = pomng.title + " - Connected to version " + pomng.version; }
	);

	pomngUI.dialog.init();
	pomngUI.menu.init();
	pomngUI.main.init();
	window.addEventListener("pomng.conn_error", function(event) { document.title = pomng.title + " - CONNECTION ERROR | Reload the page to reconnect"; });

}

pomngUI.timeval_toString = function(tv) {
	var date = new Date();
	date.setTime((tv['sec'] * 1000) + (tv['usec'] / 1000));
	return date.getFullYear()  + "/" + (date.getMonth() + 1) + "/" + date.getDate() + " " + ("0" + date.getHours()).slice(-2) + ":" + ("0" + date.getHours()).slice(-2) + ":" + ("0" + date.getMinutes()).slice(-2) + "." + date.getMilliseconds();
}

/*
 * Menu
 */

pomngUI.menu = {};

pomngUI.menu.init = function() {
	this.elem = $("#menu_toolbar");
	
	var buttons = this.elem.find('button');
	buttons.button();
	this.elem.delegate("button", "click", function () {
		var name = this.id.substring(5);
		if (!(name in pomngUI.main.panels)) {
			var elem = pomngUI.main.addPanel(name, this.textContent);
			var panel = new pomngUI.panel[name](elem);
			pomngUI.main.setPanel(name, panel);
		} else {
			pomngUI.main.activatePanel(name);
		}
	});

}

/*
 * Main tab
 */


pomngUI.main = {};

pomngUI.main.init = function() {
	this.elem = $("#main_content");
	this.elem.tabs({
		activate: this.tabActivate.bind(this),
	});

	this.panels = {};

	var homePanel = this.elem.find("#home");
	var panel = new pomngUI.panel.home(homePanel);

	this.setPanel('home', panel);

	this.elem.delegate("span.ui-icon-close", "click", function() {
		var id = $(this).closest("li").attr("aria-controls");
		pomngUI.main.removePanel(id);
		delete pomngUI.main.panels[id];

	});
}

pomngUI.main.addPanel = function(name, title) {
	
	title = pomng.htmlEscape(title);
		
	this.elem.find(".ui-tabs-nav").append('<li id="li_' + name + '"><a href="#' + name + '">' + title  + '</a><span class="ui-icon ui-icon-close icon-btn"></span></li>');
	this.elem.append('<div id="' + name + '"><p>' + title + ' content</p></div>');
	this.elem.tabs("refresh").tabs("option", "active", 0);

	return this.elem.find("#" + name);
}

pomngUI.main.removePanel = function(id) {

	pomngUI.main.panels[id].deactivate();
	pomngUI.main.panels[id].cleanup();
	pomngUI.main.elem.find('#li_' + id).remove();
	pomngUI.main.elem.find('#' + id).remove();

}

pomngUI.main.activatePanel = function(name) {

	var ul = this.elem.find('#li_' + name);
	var index = ul.index();
	this.elem.tabs('option', 'active', index);

}

pomngUI.main.setPanel = function(name, panel) {

	this.panels[name] = panel;
	this.elem.tabs({ active : -1});

}

pomngUI.main.tabActivate = function(event, ui) {

	if (ui.oldPanel[0]) {
		var oldPanel = ui.oldPanel[0].id;
		if (this.panels[oldPanel])
			this.panels[oldPanel].deactivate();
	}

	var newPanel = ui.newPanel[0].id;
	this.panels[newPanel].activate();
}

/*
 * Panel class
 */

pomngUI.panel = function(elem) {
	this.elem = elem;
}	

pomngUI.panel.prototype.activate = function() {
	console.log("Panel activated : " + this.elem.selector);
}
pomngUI.panel.prototype.deactivate = function() {
	console.log("Panel deactivated : " + this.elem.selector);
}

pomngUI.panel.prototype.cleanup = function() {
	console.log("Panel cleaned up : " + this.elem.selector);
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

	$("#dlg_inst_param tbody > tr").remove();

	for (var i = 0; i < params_name.length; i++) {
		if (params_name[i] == 'type' || params_name[i] == 'uid' || params_name[i] == 'running')
			continue; // No need to display these params

		var param = params[params_name[i]];

		$("#dlg_inst_param tbody").append('<tr><td>' + param.name + '</td><td>' + param.type + '</td><td id="val_' + param.name + '"/></td><td>' + pomng.htmlEscape(param.description) + '</td></tr>');
		$("#dlg_inst_param tbody #val_" + param.name).registryparam(param);

	}
		
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

		var widget = $("#dlg_inst_param #val_" + params_name[i]);
		var value = widget.registryparam("getval");
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

pomngUI.dialog.perfAdd = function(cls_name, inst_name, perf_name) {


	var perfPanel = pomngUI.main.panels.perf;

	var options = '<option value="-1">&lt;New graph&gt;</option>';

	if (perfPanel) {
		for (var i = 0; i < perfPanel.graphs.length; i++) {
			options += '<option value="' + i + '">' + perfPanel.graphs[i].title + '</option>';
		}
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
				var perfPanel = pomngUI.main.panels.perf;

				if (!perfPanel) {

					var elem = pomngUI.main.addPanel("perf", "Performance");
					perfPanel = new pomngUI.panel.perf(elem);
					pomngUI.main.setPanel("perf", perfPanel);

				}

				var graph_id = parseInt($("#dlg_perf_add #graph").val());
				if (graph_id == -1) {
					var name = $("#dlg_perf_add #graph_name input").val();
					if (name == "") {
						alert("You must specify a graph title");
						return;
					}
					graph_id = perfPanel.addGraph({width: "100%", height: "200px", title: pomng.htmlEscape(name) });
				}

				var perf = { class: cls_name, instance: inst_name, name: perf_name };
				perfPanel.addPerfToGraph(graph_id, perf);

				$(this).dialog("close");
			},
			Cancel: function() {
				$(this).dialog("close");
			}
		}
	});

}

