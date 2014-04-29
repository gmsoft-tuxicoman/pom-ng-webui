
pomngUI.panel.home = function(elem) {

	this.elem = elem;
	
	this.elem.find('#add_input').button().click(function(event) { pomngUI.dialog.instanceAdd("input"); } );
	this.elem.find('#add_output').button().click(function(event) { pomngUI.dialog.instanceAdd("output"); } );
	this.elem.find('#save_as').button().click(function(event) { pomngUI.dialog.configSaveAs(); } );

	this.elem.find('#reset').button().click(function(event) {
		pomngUI.dialog.confirm("Reset configuration ?",
			"Are you sure you want to reset POM-NG's configuration ?",
			null, function(cfg) { pomng.call('registry.reset') });
		} );

	window.addEventListener("pomng.registry.instance.update", this.evtUpdateInstance.bind(this));
	window.addEventListener("pomng.registry.instance.remove", this.evtRemoveInstance.bind(this));
	window.addEventListener("pomng.registry.config.update", this.evtConfigUpdate.bind(this));
}

pomngUI.panel.home.prototype = new pomngUI.panel();
pomngUI.panel.home.prototype.constructor = pomngUI.panel.home;


pomngUI.panel.home.prototype.evtUpdateInstance = function(event) {
	var cls = event.detail.cls_name;
	var tbl = this.elem.find("#tbl_" + cls + " tbody");

	if (tbl.length == 0)
		return;

	var instance = pomng.registry.classes[cls].instances[event.detail.instance_name];
	var tr = tbl.find("#tr_" + instance.name);

	var html = '<td>' + instance.name + '</td><td>' + instance.parameters['type'].value + '</td><td>';

	var running = instance.parameters['running'].value == "yes";

	if (running)
		html += 'Running';
	else
		html += 'Stopped';
	html += '</td><td>';

	// Start/Stop icon
	if (running)
		html += '<span class="ui-icon ui-icon-stop icon-btn" title="Stop" onclick="pomng.registry.setInstanceParam(\'' + cls + '\', \'' + instance.name + '\', \'running\', \'no\')"/>';
	else
		html += '<span class="ui-icon ui-icon-play icon-btn" title="Start" onclick="pomng.registry.setInstanceParam(\'' + cls + '\', \'' + instance.name + '\', \'running\', \'yes\')"/>';
	
	// Parameter icon
	html += '<span class="ui-icon ui-icon-gear icon-btn" title="Parameters" onclick="pomngUI.dialog.instanceParameter(\'' + cls + '\', \'' + instance.name + '\')"/>';

	
	// Remove icon
	html += '<span class="ui-icon ui-icon-close icon-btn" title="Remove" onclick="pomngUI.dialog.instanceRemove(\'' + cls + '\', \'' + instance.name + '\')"/>';
	
	html += '</td>';


	if (tr.length > 0) {
		// Update existing
		tr.html(html);
		console.log("pomUI.summary: Updated existing instance " + cls + " " + instance.name);
	} else {
		// Add new
		html = '<tr id="tr_' + event.detail.instance_name + '">' + html + '</tr>';
		tbl.append(html);
		console.log("pomUI.summary: Added new instance " + cls + " " + instance.name);
	}

}

pomngUI.panel.home.prototype.evtRemoveInstance = function(event) {

	var cls = event.detail.cls_name;
	var inst = event.detail.instance_name;

	var elem = this.elem.find("#tbl_" + cls + " tbody #tr_" + inst);

	elem.remove();

	console.log("pomUI.summary: Removed instance " + cls + " " + inst);

}

pomngUI.panel.home.prototype.evtConfigUpdate = function(event) {
	
	var elem = this.elem.find("#tbl_config tbody");

	var html = "";

	var configs = pomng.registry.configs;
	var configs_name = Object.keys(configs).sort();

	for (var i = 0; i < configs_name.length; i++) {

		var config = configs[configs_name[i]];
		var config_name = pomng.htmlEscape(config.name);
		html += '<tr><td>' + config_name + '</td><td>' + config.timestamp + '</td><td>';
		html += '<span class="ui-icon ui-icon-folder-open icon-btn" title="Open configuration" onclick="pomngUI.dialog.configOpen(\'' + config_name + '\')"/>';
		html += '<span class="ui-icon ui-icon-disk icon-btn" title="Save configuration" onclick="pomngUI.dialog.configOverwrite(\'' + config_name + '\')"/>';
		html += '<span class="ui-icon ui-icon-trash icon-btn" title="Delete configuration" onclick="pomngUI.dialog.configDelete(\'' + config_name + '\')"/>';
		html += '</td></tr>';
	}

	elem.html(html);

}
