
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

	this.elem.delegate("#inst_start", "click", function() {
		var inst_name = this.parentElement.parentElement.id.substring(3);
		var cls_name = this.parentElement.parentElement.parentElement.parentElement.id.substring(4);

		pomng.registry.setInstanceParam(cls_name, inst_name, "running", "yes");
	});

	this.elem.delegate("#inst_stop", "click", function() {
		var inst_name = this.parentElement.parentElement.id.substring(3);
		var cls_name = this.parentElement.parentElement.parentElement.parentElement.id.substring(4);

		pomng.registry.setInstanceParam(cls_name, inst_name, "running", "no");
	});

	this.elem.delegate("#inst_param", "click", function() {
		var inst_name = this.parentElement.parentElement.id.substring(3);
		var cls_name = this.parentElement.parentElement.parentElement.parentElement.id.substring(4);

		pomngUI.dialog.registryParameter(cls_name, inst_name);
	});

	this.elem.delegate("#inst_rm", "click", function() {
		var inst_name = this.parentElement.parentElement.id.substring(3);
		var cls_name = this.parentElement.parentElement.parentElement.parentElement.id.substring(4);

		pomngUI.dialog.instanceRemove(cls_name, inst_name);
	});

	this.elem.delegate("#cfg_load", "click", function() {
		var cfg_name = $(this.parentElement.parentElement).find("#cfg_name").text();
		pomngUI.dialog.configOpen(cfg_name);

	});

	this.elem.delegate("#cfg_save", "click", function() {
		var cfg_name = $(this.parentElement.parentElement).find("#cfg_name").text();
		pomngUI.dialog.configOverwrite(cfg_name);
	});

	this.elem.delegate("#cfg_rm", "click", function() {
		var cfg_name = $(this.parentElement.parentElement).find("#cfg_name").text();
		pomngUI.dialog.configDelete(cfg_name);
	});
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
		html += '<span class="ui-icon ui-icon-stop icon-btn" id="inst_stop"/>';
	else
		html += '<span class="ui-icon ui-icon-play icon-btn" id="inst_start"/>';
	
	// Parameter icon
	html += '<span class="ui-icon ui-icon-gear icon-btn" title="Parameters" id="inst_param"/>';

	
	// Remove icon
	html += '<span class="ui-icon ui-icon-close icon-btn" title="Remove" id="inst_rm"/>';
	
	html += '</td>';


	if (tr.length > 0) {
		// Update existing
		tr.html(html);
	} else {
		// Add new
		html = '<tr id="tr_' + event.detail.instance_name + '">' + html + '</tr>';
		tbl.append(html);
	}

}

pomngUI.panel.home.prototype.evtRemoveInstance = function(event) {

	var cls = event.detail.cls_name;
	var inst = event.detail.instance_name;

	var elem = this.elem.find("#tbl_" + cls + " tbody #tr_" + inst);

	elem.remove();

}

pomngUI.panel.home.prototype.evtConfigUpdate = function(event) {
	
	var elem = this.elem.find("#tbl_config tbody");

	var html = "";

	var configs = pomng.registry.configs;
	var configs_name = Object.keys(configs).sort();

	for (var i = 0; i < configs_name.length; i++) {

		var config = configs[configs_name[i]];
		var config_name = pomng.htmlEscape(config.name);
		html += '<tr><td id="cfg_name">' + config_name + '</td><td>' + config.timestamp + '</td><td>';
		html += '<span class="ui-icon ui-icon-folder-open icon-btn" title="Open configuration" id="cfg_load"/>';
		html += '<span class="ui-icon ui-icon-disk icon-btn" title="Save configuration" id="cfg_save"/>';
		html += '<span class="ui-icon ui-icon-trash icon-btn" title="Delete configuration" id="cfg_rm"/>';
		html += '</td></tr>';
	}

	elem.html(html);

}
